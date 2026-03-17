'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import QRCode from 'qrcode'

export default function PartnerPage() {
  const [majstor, setMajstor] = useState(null)
  const [referred, setReferred] = useState([])
  const [payouts, setPayouts] = useState([])
  const [monthlyStats, setMonthlyStats] = useState([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [copiedSignup, setCopiedSignup] = useState(false)
  const [showQRLanding, setShowQRLanding] = useState(false)
  const [showQRSignup, setShowQRSignup] = useState(false)
  const [qrLanding, setQrLanding] = useState('')
  const [qrSignup, setQrSignup] = useState('')
  const [showAllMonths, setShowAllMonths] = useState(false)
  const [confirmingMonth, setConfirmingMonth] = useState(null)
  const [sessionToken, setSessionToken] = useState(null)
  const [clickStats, setClickStats] = useState(null)

  // Sub-partner state
  const [isTopLevelPartner, setIsTopLevelPartner] = useState(false)
  const [subPartners, setSubPartners] = useState([])
  const [activeTab, setActiveTab] = useState('uebersicht')
  const [spSearch, setSpSearch] = useState('')
  const [spSearchResults, setSpSearchResults] = useState([])
  const [spSearching, setSpSearching] = useState(false)
  const [spAddModal, setSpAddModal] = useState(null)
  const [spAddRefCode, setSpAddRefCode] = useState('')
  const [spAddCommission, setSpAddCommission] = useState('')
  const [spDetailModal, setSpDetailModal] = useState(null)
  const [spSaving, setSpSaving] = useState(false)
  const [spError, setSpError] = useState('')
  const [spEditCommission, setSpEditCommission] = useState('')
  const [spShowAllMonths, setSpShowAllMonths] = useState(false)
  const [spMarkingMonth, setSpMarkingMonth] = useState(null)

  const canShare = typeof navigator !== 'undefined' && !!navigator.share

  // Keep detail modal in sync after data refresh
  useEffect(() => {
    if (spDetailModal && subPartners.length > 0) {
      const fresh = subPartners.find(sp => sp.id === spDetailModal.id)
      if (fresh && fresh !== spDetailModal) setSpDetailModal(fresh)
    }
  }, [subPartners])

  const loadData = useCallback(async (token) => {
    const t = token || sessionToken
    if (!t) return
    const res = await fetch('/api/partner/stats', {
      headers: { Authorization: `Bearer ${t}` }
    })
    if (!res.ok) return
    const data = await res.json()
    if (!data.profile?.is_partner) return
    setMajstor(data.profile)
    setReferred(data.referred || [])
    setPayouts(data.payouts || [])
    setMonthlyStats(data.monthlyStats || [])
    setClickStats(data.clickStats || null)
    setIsTopLevelPartner(data.isTopLevelPartner ?? false)
    setSubPartners(data.subPartners || [])
  }, [sessionToken])

  useEffect(() => {
    async function load() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return
        setSessionToken(session.access_token)
        await loadData(session.access_token)
      } catch {} finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function handleConfirm(month) {
    if (!confirm('Zahlungsempfang bestätigen? Diese Aktion kann nicht rückgängig gemacht werden.')) return
    setConfirmingMonth(month)
    await fetch('/api/partner/stats', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${sessionToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ month })
    })
    await loadData()
    setConfirmingMonth(null)
  }

  useEffect(() => {
    if (!majstor?.ref_code) return
    const opts = { width: 220, margin: 1, color: { dark: '#1e293b', light: '#ffffff' } }
    QRCode.toDataURL(`https://pro-meister.de/?ref=${majstor.ref_code}&source=qr`, opts).then(setQrLanding)
    QRCode.toDataURL(`https://pro-meister.de/signup?ref=${majstor.ref_code}&source=qr`, opts).then(setQrSignup)
  }, [majstor])

  // Sub-partner search (debounced)
  useEffect(() => {
    if (!spSearch.trim() || spSearch.length < 2) { setSpSearchResults([]); return }
    const timeout = setTimeout(async () => {
      setSpSearching(true)
      const { data } = await supabase
        .from('majstors')
        .select('id, full_name, email, is_partner')
        .or(`full_name.ilike.%${spSearch}%,email.ilike.%${spSearch}%`)
        .limit(10)
      setSpSearchResults(data || [])
      setSpSearching(false)
    }, 300)
    return () => clearTimeout(timeout)
  }, [spSearch])

  function slugify(name) {
    return (name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').substring(0, 30)
  }

  async function handleAddSubPartner() {
    setSpSaving(true)
    setSpError('')
    try {
      const res = await fetch('/api/partner/sub-partners', {
        method: 'POST',
        headers: { Authorization: `Bearer ${sessionToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          majstor_id: spAddModal.id,
          ref_code: spAddRefCode.trim(),
          commission_rate: parseFloat(spAddCommission) || 0
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSpAddModal(null)
      setSpSearch('')
      setSpSearchResults([])
      await loadData()
    } catch (err) {
      setSpError(err.message)
    } finally {
      setSpSaving(false)
    }
  }

  async function handleUpdateSubPartner() {
    if (!spDetailModal) return
    setSpSaving(true)
    setSpError('')
    try {
      const res = await fetch('/api/partner/sub-partners', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${sessionToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sub_partner_id: spDetailModal.id,
          commission_rate: parseFloat(spEditCommission) || 0
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSpDetailModal(null)
      await loadData()
    } catch (err) {
      setSpError(err.message)
    } finally {
      setSpSaving(false)
    }
  }

  async function handleRemoveSubPartner(id) {
    if (!confirm('Sub-Partner wirklich entfernen? Der Nutzer verliert seinen Partnerstatus.')) return
    setSpSaving(true)
    try {
      const res = await fetch('/api/partner/sub-partners', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${sessionToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ sub_partner_id: id })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSpDetailModal(null)
      await loadData()
    } catch (err) {
      alert(err.message)
    } finally {
      setSpSaving(false)
    }
  }

  async function handleMarkSubPartnerPaid(subPartnerId, month, action) {
    setSpMarkingMonth(month)
    try {
      const res = await fetch('/api/partner/sub-partners', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${sessionToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ sub_partner_id: subPartnerId, month, action })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      await loadData()
    } catch (err) {
      alert(err.message)
    } finally {
      setSpMarkingMonth(null)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-slate-900">
      <div className="text-slate-400">Wird geladen...</div>
    </div>
  )

  if (!majstor?.is_partner) return (
    <div className="flex items-center justify-center min-h-screen bg-slate-900">
      <div className="text-slate-400">Kein Zugriff.</div>
    </div>
  )

  const refLink = `https://pro-meister.de/?ref=${majstor.ref_code}`
  const signupLink = `https://pro-meister.de/signup?ref=${majstor.ref_code}`
  const commissionRate = majstor.commission_rate || 0

  function getStatus(u) {
    const subs = u.user_subscriptions || []
    const latest = [...subs].sort((a, b) =>
      new Date(b.created_at || 0) - new Date(a.created_at || 0)
    )[0]
    return latest?.status ?? null
  }

  const total = referred.length
  const trial = referred.filter(u => getStatus(u) === 'trial').length
  const active = referred.filter(u => getStatus(u) === 'active').length
  const freemium = referred.filter(u => getStatus(u) === null).length
  const currentMonthStats = monthlyStats[0]
  const monthlyEarning = currentMonthStats?.amount ?? (active * commissionRate)

  const allMonths = monthlyStats.map(m => {
    const [year, mon] = m.month.split('-').map(Number)
    const d = new Date(year, mon - 1, 1)
    const label = d.toLocaleDateString('de-DE', { month: 'short', year: '2-digit' })
    return { ...m, label, key: m.month }
  })
  const months = showAllMonths ? allMonths : allMonths.slice(0, 6)

  function copyLink() {
    navigator.clipboard.writeText(refLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function copySignupLink() {
    navigator.clipboard.writeText(signupLink)
    setCopiedSignup(true)
    setTimeout(() => setCopiedSignup(false), 2000)
  }

  function shareVia(url, title) {
    navigator.share({ title, url }).catch(err => {
      if (err.name !== 'AbortError') console.error(err)
    })
  }

  function downloadQR(dataUrl, filename) {
    if (!dataUrl) return
    const parts = dataUrl.split(',')
    const mime = parts[0].match(/:(.*?);/)[1]
    const bstr = atob(parts[1])
    const u8arr = new Uint8Array(bstr.length)
    for (let i = 0; i < bstr.length; i++) u8arr[i] = bstr.charCodeAt(i)
    const blob = new Blob([u8arr], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()
    setTimeout(() => {
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }, 100)
  }

  function getLatestSub(u) {
    const subs = u.user_subscriptions || []
    return [...subs].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))[0] || null
  }

  const statusBadge = (u) => {
    const s = getStatus(u)
    const sub = getLatestSub(u)
    const isCancelled = sub?.cancel_at_period_end === true || s === 'cancelled'
    const periodEnd = sub?.current_period_end ? new Date(sub.current_period_end).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' }) : null

    if (isCancelled) return (
      <span className="px-2 py-0.5 rounded-full text-xs bg-red-500/20 text-red-400">
        {periodEnd || 'Gekündigt'}
      </span>
    )
    if (s === 'active') return <span className="px-2 py-0.5 rounded-full text-xs bg-green-500/20 text-green-400">Aktiv</span>
    if (s === 'trial') return <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-500/20 text-yellow-400">Trial</span>
    return <span className="px-2 py-0.5 rounded-full text-xs bg-slate-600 text-slate-400">Freemium</span>
  }

  return (
    <div className="min-h-screen bg-slate-900 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-6">

        <div>
          <h1 className="text-white text-xl font-bold">🤝 Mein ProMeister Partner</h1>
          <p className="text-slate-400 text-sm mt-1">Dein persönlicher Partnerbereich</p>
        </div>

        {/* Tab bar — only for top-level partners */}
        {isTopLevelPartner && (
          <div className="flex gap-1 border-b border-slate-700">
            {[
              ['uebersicht', '📊 Übersicht'],
              ['meine-partner', '🤝 Meine Partner'],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === key
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                {label}
                {key === 'meine-partner' && subPartners.length > 0 && (
                  <span className="ml-1.5 text-xs bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-full">{subPartners.length}</span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* ==================== ÜBERSICHT TAB ==================== */}
        {(!isTopLevelPartner || activeTab === 'uebersicht') && (
          <>
            {/* Links */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
              <h2 className="text-white font-semibold">🔗 Dein Empfehlungslink</h2>

              {/* Landing Page */}
              <div>
                <p className="text-slate-500 text-xs mb-1">Landing Page</p>
                <div className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2">
                  <span className="text-blue-400 text-sm">{refLink}</span>
                </div>
                <div className="flex gap-1.5 mt-1.5 w-full">
                  {canShare && (
                    <button onClick={() => shareVia(refLink, 'Pro-Meister – Landing Page')} className="flex-1 text-xs py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors whitespace-nowrap">
                      📤 Teilen
                    </button>
                  )}
                  <button onClick={copyLink} className="flex-1 text-xs py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors whitespace-nowrap">
                    {copied ? '✅ Kopiert!' : '📋 Kopieren'}
                  </button>
                  <button onClick={() => { setShowQRLanding(v => !v); setShowQRSignup(false) }} className="flex-1 text-xs py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors whitespace-nowrap">
                    {showQRLanding ? '🔼 QR Code' : '📱 QR Code'}
                  </button>
                </div>
                {showQRLanding && (
                  <div className="flex flex-col items-center gap-2 mt-3">
                    {qrLanding
                      ? <img src={qrLanding} alt="QR Landing" className="rounded-lg w-[180px]" />
                      : <div className="w-[180px] h-[180px] bg-slate-700 rounded-lg animate-pulse" />
                    }
                    <button onClick={() => downloadQR(qrLanding, `qr-landing-${majstor.ref_code}.png`)} disabled={!qrLanding} className="text-xs px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors disabled:opacity-40">
                      📥 Herunterladen
                    </button>
                  </div>
                )}
              </div>

              {/* Direkt-Registrierung */}
              <div>
                <p className="text-slate-500 text-xs mb-1">Direkt-Registrierung</p>
                <div className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2">
                  <span className="text-blue-400 text-sm">{signupLink}</span>
                </div>
                <div className="flex gap-1.5 mt-1.5 w-full">
                  {canShare && (
                    <button onClick={() => shareVia(signupLink, 'Pro-Meister – Jetzt registrieren')} className="flex-1 text-xs py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors whitespace-nowrap">
                      📤 Teilen
                    </button>
                  )}
                  <button onClick={copySignupLink} className="flex-1 text-xs py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors whitespace-nowrap">
                    {copiedSignup ? '✅ Kopiert!' : '📋 Kopieren'}
                  </button>
                  <button onClick={() => { setShowQRSignup(v => !v); setShowQRLanding(false) }} className="flex-1 text-xs py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors whitespace-nowrap">
                    {showQRSignup ? '🔼 QR Code' : '📱 QR Code'}
                  </button>
                </div>
                {showQRSignup && (
                  <div className="flex flex-col items-center gap-2 mt-3">
                    {qrSignup
                      ? <img src={qrSignup} alt="QR Signup" className="rounded-lg w-[180px]" />
                      : <div className="w-[180px] h-[180px] bg-slate-700 rounded-lg animate-pulse" />
                    }
                    <button onClick={() => downloadQR(qrSignup, `qr-signup-${majstor.ref_code}.png`)} disabled={!qrSignup} className="text-xs px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors disabled:opacity-40">
                      📥 Herunterladen
                    </button>
                  </div>
                )}
              </div>

              <p className="text-slate-400 text-xs">
                Teile diesen Link mit potenziellen Kunden. Wenn sie sich registrieren, werden sie dir zugeordnet.
              </p>

              <div className="bg-slate-700/50 rounded-lg px-3 py-2 text-sm">
                <span className="text-slate-400">Deine Provision: </span>
                <span className="text-green-400 font-semibold">{commissionRate}€</span>
                <span className="text-slate-400"> pro aktivem Kunden / Monat</span>
              </div>
            </div>

            {/* Stats kartice */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Registrierungen', value: total, color: 'text-blue-400' },
                { label: 'Trial', value: trial, color: 'text-yellow-400' },
                { label: 'Aktiv', value: active, color: 'text-green-400' },
                { label: 'Freemium', value: freemium, color: 'text-slate-400' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-center">
                  <div className={`text-2xl font-bold ${color}`}>{value}</div>
                  <div className="text-slate-400 text-xs mt-1">{label}</div>
                </div>
              ))}
            </div>

            {/* Click Stats */}
            {clickStats && (
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
                <h2 className="text-white font-semibold mb-4">📊 Link-Statistik</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-white">{clickStats.total}</div>
                    <div className="text-slate-400 text-xs mt-1">Klicks gesamt</div>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-blue-400">{clickStats.qr}</div>
                    <div className="text-slate-400 text-xs mt-1">QR-Scans</div>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-purple-400">{clickStats.conversions}</div>
                    <div className="text-slate-400 text-xs mt-1">Registrierungen</div>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-green-400">{clickStats.conversionRate}%</div>
                    <div className="text-slate-400 text-xs mt-1">Konversionsrate</div>
                  </div>
                </div>
              </div>
            )}

            {/* Finanzübersicht */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white font-semibold">💶 Finanzübersicht</h2>
                <div className="text-right">
                  <span className="text-slate-400 text-sm">Aktueller Monat: </span>
                  <span className="text-green-400 font-bold text-lg">{monthlyEarning.toFixed(2)}€</span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-700">
                      <th className="text-left pb-2">Monat</th>
                      <th className="text-center pb-2">Reg.</th>
                      <th className="text-center pb-2">Aktiv</th>
                      <th className="text-right pb-2">Betrag</th>
                      <th className="text-right pb-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {months.map(m => {
                      const payout = payouts.find(p => p.month === m.key)
                      const isPaid = !!payout?.paid_at
                      const isConfirmed = !!payout?.confirmed_at
                      const isConfirming = confirmingMonth === m.key
                      return (
                        <tr key={m.key} className={`border-b border-slate-700/50 ${isConfirmed ? 'bg-green-500/5' : ''}`}>
                          <td className="py-2 text-slate-300">
                            {m.label}
                            {m.isCurrent && <span className="text-slate-500 text-xs ml-1">(Vorschau)</span>}
                          </td>
                          <td className="py-2 text-center text-slate-300">{m.registrations}</td>
                          <td className="py-2 text-center text-green-400">{m.activeCount}</td>
                          <td className="py-2 text-right text-green-400 font-medium">{m.amount.toFixed(2)}€</td>
                          <td className="py-2 text-right">
                            {m.isCurrent ? (
                              <span className="text-slate-600 text-xs">—</span>
                            ) : isConfirmed ? (
                              <span className="text-green-400 text-xs">✅ Bestätigt</span>
                            ) : isPaid ? (
                              <button
                                onClick={() => handleConfirm(m.key)}
                                disabled={isConfirming}
                                className="text-xs px-2 py-1 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-lg disabled:opacity-50 transition-colors"
                              >
                                {isConfirming ? '...' : '💰 Bestätigen'}
                              </button>
                            ) : (
                              <span className="text-slate-700 text-xs">—</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {!showAllMonths && (
                <button
                  onClick={() => setShowAllMonths(true)}
                  className="text-slate-500 hover:text-slate-300 text-xs mt-3 w-full text-center transition-colors"
                >
                  ▼ Alle 12 Monate anzeigen
                </button>
              )}

              {/* Breakdown for top-level partner with sub-partners */}
              {isTopLevelPartner && subPartners.length > 0 && currentMonthStats && (() => {
                const directAmt = currentMonthStats.directAmount ?? 0
                const subActive = currentMonthStats.subActiveCount ?? 0
                const grossFromAdmin = directAmt + subActive * commissionRate
                const subPayoutTotal = subPartners.reduce((sum, sp) => {
                  const spActive = sp.monthlyStats?.[0]?.activeCount ?? 0
                  return sum + spActive * (sp.commission_rate || 0)
                }, 0)
                const netForMe = currentMonthStats.amount ?? 0
                return (
                  <div className="mt-3 p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg text-xs space-y-2">
                    <p className="text-slate-300 font-medium">📊 Aufschlüsselung aktueller Monat:</p>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Auszahlung vom Admin (brutto)</span>
                        <span className="text-white font-medium">{grossFromAdmin.toFixed(2)}€</span>
                      </div>
                      <div className="flex justify-between pl-3">
                        <span className="text-slate-400">├─ Direkt-Kunden: {currentMonthStats.directActiveCount ?? 0} aktiv × {commissionRate}€</span>
                        <span className="text-green-400">{directAmt.toFixed(2)}€</span>
                      </div>
                      <div className="flex justify-between pl-3">
                        <span className="text-slate-400">├─ Sub-Partner-Kunden: {subActive} aktiv × {commissionRate}€</span>
                        <span className="text-green-400">{(subActive * commissionRate).toFixed(2)}€</span>
                      </div>
                      {subPayoutTotal > 0 && (
                        <div className="flex justify-between pt-1 border-t border-blue-500/20">
                          <span className="text-orange-400">Auszahlung an Sub-Partner</span>
                          <span className="text-orange-400">−{subPayoutTotal.toFixed(2)}€</span>
                        </div>
                      )}
                      <div className="flex justify-between pt-1 border-t border-blue-500/20">
                        <span className="text-slate-300 font-medium">Dein Anteil (netto)</span>
                        <span className="text-green-400 font-bold">{netForMe.toFixed(2)}€</span>
                      </div>
                    </div>
                  </div>
                )
              })()}

              <div className="mt-4 p-3 bg-slate-700/30 border border-slate-600/50 rounded-lg text-xs text-slate-400 space-y-1">
                <p>ℹ️ <strong className="text-slate-300">So wird deine Provision berechnet:</strong></p>
                <p>Deine monatliche Provision ergibt sich aus der Anzahl deiner aktiven Kunden <strong className="text-slate-300">am letzten Tag des jeweiligen Monats</strong> multipliziert mit deiner vereinbarten Provision pro Kunde.</p>
                <p>Der aktuelle Monat wird als <em>Vorschau</em> angezeigt und kann sich täglich ändern. Der endgültige Betrag wird am letzten Tag des Monats festgesetzt.</p>
              </div>
            </div>

            {/* Lista korisnika */}
            {referred.length > 0 && (
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
                <h2 className="text-white font-semibold mb-4">👥 Deine Kunden ({total})</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-700">
                        <th className="text-left pb-2">Name / E-Mail</th>
                        <th className="text-center pb-2">Status</th>
                        <th className="text-right pb-2">Registriert</th>
                      </tr>
                    </thead>
                    <tbody>
                      {referred.map(u => (
                        <tr key={u.id} className="border-b border-slate-700/50">
                          <td className="py-2">
                            <div className="text-white text-xs">{u.full_name || '—'}</div>
                            <div className="text-slate-500 text-xs">{u.email}</div>
                          </td>
                          <td className="py-2 text-center">{statusBadge(u)}</td>
                          <td className="py-2 text-right text-slate-400 text-xs">
                            {new Date(u.created_at).toLocaleDateString('de-DE')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {referred.length === 0 && (
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center">
                <p className="text-slate-400 text-sm">Noch keine Registrierungen über deinen Link.</p>
                <p className="text-slate-500 text-xs mt-1">Teile deinen Link, um Kunden zu gewinnen!</p>
              </div>
            )}
          </>
        )}

        {/* ==================== MEINE PARTNER TAB ==================== */}
        {isTopLevelPartner && activeTab === 'meine-partner' && (
          <>
            {/* Sub-partner table */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <h2 className="text-white font-semibold mb-4">👥 Meine Partner ({subPartners.length})</h2>
              {subPartners.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-6">Noch keine Sub-Partner hinzugefügt.</p>
              ) : (
                <div className="space-y-3">
                  {subPartners.map(sp => {
                    const currentStats = sp.monthlyStats?.[0]
                    const spActive = currentStats?.activeCount ?? 0
                    const spAmount = currentStats?.amount ?? 0
                    const myNet = spActive * (commissionRate - (sp.commission_rate || 0))
                    return (
                      <div
                        key={sp.id}
                        onClick={() => { setSpDetailModal(sp); setSpEditCommission(String(sp.commission_rate || 0)); setSpShowAllMonths(false); setSpError('') }}
                        className="bg-slate-700/30 border border-slate-600/50 rounded-xl p-4 cursor-pointer hover:bg-slate-700/50 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="text-white font-medium text-sm">{sp.full_name || '—'}</div>
                            <div className="text-slate-500 text-xs">{sp.email}</div>
                          </div>
                          <span className="text-blue-400 text-xs font-mono bg-blue-500/10 px-2 py-0.5 rounded">{sp.ref_code}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="text-center">
                            <div className="text-green-400 font-bold text-lg">{sp.commission_rate || 0}€</div>
                            <div className="text-slate-500 text-xs">Provision</div>
                          </div>
                          <div className="text-center">
                            <div className="text-green-400 font-bold text-lg">{spActive}</div>
                            <div className="text-slate-500 text-xs">Aktive Kunden</div>
                          </div>
                          <div className="text-center">
                            <div className="text-green-400 font-bold text-lg">{spAmount.toFixed(2)}€</div>
                            <div className="text-slate-500 text-xs">Monatl. Betrag</div>
                          </div>
                        </div>
                        {sp.clickStats && sp.clickStats.total > 0 && (
                          <div className="mt-3 pt-3 border-t border-slate-600/30 grid grid-cols-4 gap-2 text-center">
                            <div>
                              <div className="text-white text-sm font-medium">{sp.clickStats.total}</div>
                              <div className="text-slate-500 text-xs">Klicks</div>
                            </div>
                            <div>
                              <div className="text-blue-400 text-sm font-medium">{sp.clickStats.qr}</div>
                              <div className="text-slate-500 text-xs">QR</div>
                            </div>
                            <div>
                              <div className="text-purple-400 text-sm font-medium">{sp.clickStats.conversions}</div>
                              <div className="text-slate-500 text-xs">Reg.</div>
                            </div>
                            <div>
                              <div className="text-green-400 text-sm font-medium">{sp.clickStats.conversionRate}%</div>
                              <div className="text-slate-500 text-xs">Rate</div>
                            </div>
                          </div>
                        )}
                        <div className={`${sp.clickStats?.total > 0 ? 'mt-2 pt-2' : 'mt-3 pt-3'} border-t border-slate-600/30 text-xs space-y-1`}>
                          <div className="flex justify-between">
                            <span className="text-slate-400">{sp.referred?.length ?? 0} Kunden gesamt</span>
                            <span className="text-blue-400">Dein Netto: {myNet.toFixed(2)}€/Monat</span>
                          </div>
                          {spAmount > 0 && (() => {
                            const now = new Date()
                            const prevMonth = `${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}`
                            const prevPayout = (sp.payouts || []).find(p => p.month === prevMonth)
                            const prevConfirmed = !!prevPayout?.confirmed_at
                            const prevPaid = !!prevPayout?.paid_at
                            return (
                              <div className="flex justify-between items-center">
                                <span className="text-slate-400">Auszahlung an {sp.full_name?.split(' ')[0] || 'Sub-Partner'}</span>
                                <span className="flex items-center gap-2">
                                  <span className="text-orange-400">{spAmount.toFixed(2)}€/Mo.</span>
                                  {prevConfirmed && <span className="text-green-400" title="Letzter Monat bestätigt">✅</span>}
                                  {prevPaid && !prevConfirmed && <span className="text-yellow-400" title="Letzter Monat gesendet">⏳</span>}
                                </span>
                              </div>
                            )
                          })()}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Add sub-partner search */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <h2 className="text-white font-semibold mb-3">➕ Sub-Partner hinzufügen</h2>
              <input
                type="text"
                value={spSearch}
                onChange={e => setSpSearch(e.target.value)}
                placeholder="Name oder E-Mail suchen..."
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm"
              />
              {spSearching && <p className="text-slate-500 text-xs mt-2">Suche...</p>}
              {spSearchResults.length > 0 && (
                <div className="mt-2 space-y-1 max-h-60 overflow-y-auto">
                  {spSearchResults.map(u => (
                    <div key={u.id} className="flex items-center justify-between bg-slate-700/30 rounded-lg px-3 py-2">
                      <div>
                        <div className="text-white text-xs">{u.full_name || '—'}</div>
                        <div className="text-slate-500 text-xs">{u.email}</div>
                      </div>
                      {u.is_partner ? (
                        <span className="text-xs text-slate-500">Bereits Partner</span>
                      ) : u.id === majstor.id ? (
                        <span className="text-xs text-slate-500">Du</span>
                      ) : (
                        <button
                          onClick={() => {
                            setSpAddModal(u)
                            setSpAddRefCode(slugify(u.full_name))
                            setSpAddCommission(String(Math.min(3, commissionRate)))
                            setSpError('')
                          }}
                          className="text-xs px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
                        >
                          Als Partner
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ==================== ADD SUB-PARTNER MODAL ==================== */}
        {spAddModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-xl w-full max-w-md border border-slate-700">
              <div className="flex justify-between items-center p-5 border-b border-slate-700">
                <h3 className="text-white font-semibold">Sub-Partner hinzufügen</h3>
                <button onClick={() => setSpAddModal(null)} className="text-slate-400 hover:text-white text-2xl leading-none">×</button>
              </div>
              <div className="p-5 space-y-4">
                <div className="bg-slate-700/30 rounded-lg p-3">
                  <div className="text-white text-sm font-medium">{spAddModal.full_name || '—'}</div>
                  <div className="text-slate-400 text-xs">{spAddModal.email}</div>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Ref-Code</label>
                  <input
                    type="text"
                    value={spAddRefCode}
                    onChange={e => setSpAddRefCode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Provision (€ pro Aktivem / Monat)</label>
                  <input
                    type="number"
                    min="0"
                    max={commissionRate}
                    step="0.5"
                    value={spAddCommission}
                    onChange={e => setSpAddCommission(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm"
                  />
                  <p className="text-slate-500 text-xs mt-1">Max. {commissionRate}€ (deine eigene Provision)</p>
                </div>
                {spError && <p className="text-red-400 text-sm">{spError}</p>}
                <div className="flex gap-2">
                  <button onClick={() => setSpAddModal(null)} className="flex-1 py-2 bg-slate-700 text-slate-300 rounded-lg text-sm">
                    Abbrechen
                  </button>
                  <button
                    onClick={handleAddSubPartner}
                    disabled={spSaving || !spAddRefCode.trim()}
                    className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    {spSaving ? 'Wird gespeichert...' : 'Hinzufügen'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== SUB-PARTNER DETAIL MODAL ==================== */}
        {spDetailModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-xl w-full max-w-lg border border-slate-700 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center p-5 border-b border-slate-700 sticky top-0 bg-slate-800 z-10">
                <div>
                  <h3 className="text-white font-semibold">{spDetailModal.full_name || '—'}</h3>
                  <p className="text-slate-400 text-xs">{spDetailModal.email} · {spDetailModal.ref_code}</p>
                </div>
                <button onClick={() => setSpDetailModal(null)} className="text-slate-400 hover:text-white text-2xl leading-none">×</button>
              </div>
              <div className="p-5 space-y-4">
                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                    <div className="text-xl font-bold text-blue-400">{spDetailModal.referred?.length ?? 0}</div>
                    <div className="text-slate-400 text-xs">Kunden</div>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                    <div className="text-xl font-bold text-green-400">{spDetailModal.monthlyStats?.[0]?.activeCount ?? 0}</div>
                    <div className="text-slate-400 text-xs">Aktiv</div>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                    <div className="text-xl font-bold text-green-400">{(spDetailModal.monthlyStats?.[0]?.amount ?? 0).toFixed(2)}€</div>
                    <div className="text-slate-400 text-xs">Monatl.</div>
                  </div>
                </div>

                {/* Commission info */}
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-xs text-slate-300 space-y-1">
                  <div>
                    Provision: <span className="text-green-400 font-medium">{spDetailModal.commission_rate || 0}€</span> pro aktivem Kunden
                    · Dein Netto: <span className="text-blue-400 font-medium">{commissionRate - (spDetailModal.commission_rate || 0)}€</span> pro aktivem Kunden
                  </div>
                  {(spDetailModal.monthlyStats?.[0]?.activeCount ?? 0) > 0 && (
                    <div className="pt-1 border-t border-blue-500/20">
                      Auszahlung an {spDetailModal.full_name?.split(' ')[0] || 'Sub-Partner'}:
                      <span className="text-orange-400 font-medium ml-1">
                        {(spDetailModal.monthlyStats?.[0]?.amount ?? 0).toFixed(2)}€/Monat
                      </span>
                      <span className="text-slate-500 ml-1">
                        ({spDetailModal.monthlyStats?.[0]?.activeCount ?? 0} × {spDetailModal.commission_rate || 0}€)
                      </span>
                    </div>
                  )}
                </div>

                {/* Click stats */}
                {spDetailModal.clickStats && (
                  <div className="grid grid-cols-4 gap-3">
                    <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                      <div className="text-lg font-bold text-white">{spDetailModal.clickStats.total}</div>
                      <div className="text-slate-400 text-xs">Klicks</div>
                    </div>
                    <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                      <div className="text-lg font-bold text-blue-400">{spDetailModal.clickStats.qr}</div>
                      <div className="text-slate-400 text-xs">QR-Scans</div>
                    </div>
                    <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                      <div className="text-lg font-bold text-purple-400">{spDetailModal.clickStats.conversions}</div>
                      <div className="text-slate-400 text-xs">Reg.</div>
                    </div>
                    <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                      <div className="text-lg font-bold text-green-400">{spDetailModal.clickStats.conversionRate}%</div>
                      <div className="text-slate-400 text-xs">Rate</div>
                    </div>
                  </div>
                )}

                {/* Monthly stats with payout tracking */}
                {spDetailModal.monthlyStats?.length > 0 && (
                  <div>
                    <h4 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Monatsübersicht & Auszahlung</h4>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-slate-500 border-b border-slate-700">
                          <th className="text-left pb-1">Monat</th>
                          <th className="text-center pb-1">Aktiv</th>
                          <th className="text-right pb-1">Betrag</th>
                          <th className="text-right pb-1">Auszahlung</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(spShowAllMonths ? spDetailModal.monthlyStats : spDetailModal.monthlyStats.slice(0, 6)).map(m => {
                          const [year, mon] = m.month.split('-').map(Number)
                          const d = new Date(year, mon - 1, 1)
                          const label = d.toLocaleDateString('de-DE', { month: 'short', year: '2-digit' })
                          const payout = (spDetailModal.payouts || []).find(p => p.month === m.month)
                          const isPaid = !!payout?.paid_at
                          const isConfirmed = !!payout?.confirmed_at
                          const isMarking = spMarkingMonth === m.month
                          return (
                            <tr key={m.month} className={`border-b border-slate-700/50 ${isConfirmed ? 'bg-green-500/5' : ''}`}>
                              <td className="py-1.5 text-slate-300">{label}{m.isCurrent && <span className="text-slate-500 ml-1">(V)</span>}</td>
                              <td className="py-1.5 text-center text-green-400">{m.activeCount}</td>
                              <td className="py-1.5 text-right text-green-400">{m.amount.toFixed(2)}€</td>
                              <td className="py-1.5 text-right">
                                {m.isCurrent ? (
                                  <span className="text-slate-600">—</span>
                                ) : m.amount === 0 ? (
                                  <span className="text-slate-700">—</span>
                                ) : isConfirmed ? (
                                  <span className="text-green-400">✅ Bestätigt</span>
                                ) : isPaid ? (
                                  <span className="text-yellow-400">⏳ Gesendet</span>
                                ) : (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleMarkSubPartnerPaid(spDetailModal.id, m.month) }}
                                    disabled={isMarking}
                                    className="px-2 py-0.5 bg-blue-600/30 hover:bg-blue-600/50 text-blue-400 rounded disabled:opacity-50 transition-colors"
                                  >
                                    {isMarking ? '...' : 'Als bezahlt'}
                                  </button>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                    {!spShowAllMonths && spDetailModal.monthlyStats.length > 6 && (
                      <button onClick={() => setSpShowAllMonths(true)} className="text-slate-500 hover:text-slate-300 text-xs mt-2 w-full text-center">
                        ▼ Alle anzeigen
                      </button>
                    )}
                  </div>
                )}

                {/* Referred users */}
                {spDetailModal.referred?.length > 0 && (
                  <div>
                    <h4 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Kunden ({spDetailModal.referred.length})</h4>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {spDetailModal.referred.map(u => (
                        <div key={u.id} className="flex items-center justify-between bg-slate-700/20 rounded px-2 py-1.5">
                          <div>
                            <span className="text-white text-xs">{u.full_name || '—'}</span>
                            <span className="text-slate-500 text-xs ml-2">{u.email}</span>
                          </div>
                          {statusBadge(u)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Edit commission */}
                <div className="border-t border-slate-700 pt-4">
                  <h4 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Provision ändern</h4>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0"
                      max={commissionRate}
                      step="0.5"
                      value={spEditCommission}
                      onChange={e => setSpEditCommission(e.target.value)}
                      className="flex-1 px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm"
                    />
                    <button
                      onClick={handleUpdateSubPartner}
                      disabled={spSaving || parseFloat(spEditCommission) === (spDetailModal.commission_rate || 0)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-sm transition-colors"
                    >
                      {spSaving ? '...' : 'Speichern'}
                    </button>
                  </div>
                  <p className="text-slate-500 text-xs mt-1">Max. {commissionRate}€</p>
                  {spError && <p className="text-red-400 text-xs mt-1">{spError}</p>}
                </div>

                {/* Remove */}
                <button
                  onClick={() => handleRemoveSubPartner(spDetailModal.id)}
                  disabled={spSaving}
                  className="w-full py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-lg text-sm transition-colors"
                >
                  Partner entfernen
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
