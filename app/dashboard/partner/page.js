'use client'
import { useState, useEffect } from 'react'
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

  const canShare = typeof navigator !== 'undefined' && !!navigator.share

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      setSessionToken(session.access_token)

      const res = await fetch('/api/partner/stats', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      })
      if (!res.ok) { setLoading(false); return }
      const data = await res.json()

      if (!data.profile?.is_partner) { setLoading(false); return }
      setMajstor(data.profile)
      setReferred(data.referred || [])
      setPayouts(data.payouts || [])
      setMonthlyStats(data.monthlyStats || [])
      setLoading(false)
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
    // Refresh payouts
    const res = await fetch('/api/partner/stats', { headers: { Authorization: `Bearer ${sessionToken}` } })
    const data = await res.json()
    setPayouts(data.payouts || [])
    setConfirmingMonth(null)
  }

  useEffect(() => {
    if (!majstor?.ref_code) return
    const opts = { width: 220, margin: 1, color: { dark: '#1e293b', light: '#ffffff' } }
    QRCode.toDataURL(`https://pro-meister.de/?ref=${majstor.ref_code}`, opts).then(setQrLanding)
    QRCode.toDataURL(`https://pro-meister.de/signup?ref=${majstor.ref_code}`, opts).then(setQrSignup)
  }, [majstor])

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
  const currentMonthStats = monthlyStats[0] // newest first, isCurrent=true
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
    if (/iPhone|iPad/i.test(navigator.userAgent)) {
      window.open(dataUrl) // iOS: opens in new tab → long-press → Bild sichern
    } else {
      const link = document.createElement('a')
      link.download = filename
      link.href = dataUrl
      link.click()
    }
  }

  const statusBadge = (u) => {
    const s = getStatus(u)
    if (s === 'active') return <span className="px-2 py-0.5 rounded-full text-xs bg-green-500/20 text-green-400">Aktiv</span>
    if (s === 'trial') return <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-500/20 text-yellow-400">Trial</span>
    if (s === 'cancelled') return <span className="px-2 py-0.5 rounded-full text-xs bg-red-500/20 text-red-400">Gekündigt</span>
    return <span className="px-2 py-0.5 rounded-full text-xs bg-slate-600 text-slate-400">Freemium</span>
  }

  return (
    <div className="min-h-screen bg-slate-900 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-6">

        <div>
          <h1 className="text-white text-xl font-bold">🤝 Mein ProMeister Partner</h1>
          <p className="text-slate-400 text-sm mt-1">Dein persönlicher Partnerbereich</p>
        </div>

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
                  ⬇️ Herunterladen
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
                  ⬇️ Herunterladen
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

        {/* Finansijski pregled */}
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
          <p className="text-slate-500 text-xs mt-3">* Auszahlung erfolgt außerhalb der Plattform nach Absprache.</p>
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

      </div>
    </div>
  )
}
