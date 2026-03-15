'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const ADMIN_EMAILS = ['darko.jocic.ns@gmail.com', 'novakovicdusan555@gmail.com']

function slugify(name) {
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .substring(0, 20)
}

function getStatus(u) {
  const subs = u.user_subscriptions || []
  const latest = [...subs].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))[0]
  return latest?.status ?? null
}

function getLatestSub(u) {
  const subs = u.user_subscriptions || []
  return [...subs].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))[0] || null
}

export default function AdminPartnersPage() {
  const router = useRouter()
  const [token, setToken] = useState(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [tab, setTab] = useState('active')
  const [partners, setPartners] = useState([])
  const [loadingPartners, setLoadingPartners] = useState(true)

  // Search for adding
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)

  // Modals
  const [addModal, setAddModal] = useState(null)
  const [addRefCode, setAddRefCode] = useState('')
  const [addCommission, setAddCommission] = useState('6')
  const [editModal, setEditModal] = useState(null)
  const [editCommission, setEditCommission] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Detail panel
  const [detailData, setDetailData] = useState(null) // { partner, referred, payouts }
  const [detailLoading, setDetailLoading] = useState(false)
  const [showAllMonths, setShowAllMonths] = useState(false)
  const [markingPaid, setMarkingPaid] = useState(null)

  // Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user || !ADMIN_EMAILS.includes(session.user.email)) {
        router.replace('/dashboard')
      } else {
        setToken(session.access_token)
        setAuthChecked(true)
      }
    })
  }, [router])

  useEffect(() => {
    if (authChecked && token) fetchPartners()
  }, [authChecked, token])

  async function fetchPartners() {
    setLoadingPartners(true)
    const res = await fetch('/api/admin/partners', {
      headers: { Authorization: `Bearer ${token}` }
    })
    const data = await res.json()
    setPartners(data.partners || [])
    setLoadingPartners(false)
  }

  async function fetchPartnerDetail(partner) {
    setDetailData({ partner, referred: [], payouts: [] })
    setDetailLoading(true)
    setShowAllMonths(false)
    const res = await fetch(`/api/admin/partner-detail?partner_id=${partner.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    const data = await res.json()
    setDetailData(data)
    setDetailLoading(false)
  }

  async function refreshDetail() {
    if (!detailData?.partner) return
    const res = await fetch(`/api/admin/partner-detail?partner_id=${detailData.partner.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    const data = await res.json()
    setDetailData(data)
  }

  async function handleMarkPaid(month, amount) {
    setMarkingPaid(month)
    await fetch('/api/admin/partner-detail', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ partner_id: detailData.partner.id, month, amount })
    })
    await refreshDetail()
    setMarkingPaid(null)
  }

  async function handleUnmarkPaid(month) {
    setMarkingPaid(month)
    await fetch('/api/admin/partner-detail', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ partner_id: detailData.partner.id, month })
    })
    await refreshDetail()
    setMarkingPaid(null)
  }

  // Live search
  useEffect(() => {
    if (!search.trim() || search.length < 2) { setSearchResults([]); return }
    const t = setTimeout(async () => {
      setSearching(true)
      const { data } = await supabase
        .from('majstors')
        .select('id, full_name, email, is_partner')
        .or(`full_name.ilike.%${search}%,email.ilike.%${search}%`)
        .limit(10)
      setSearchResults(data || [])
      setSearching(false)
    }, 300)
    return () => clearTimeout(t)
  }, [search])

  async function handleAddPartner() {
    if (!addRefCode.trim()) { setError('Bitte ref_code eingeben'); return }
    setSaving(true); setError('')
    const res = await fetch('/api/admin/partners', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ majstor_id: addModal.id, ref_code: addRefCode.trim(), commission_rate: parseFloat(addCommission) || 0 })
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setSaving(false); return }
    setAddModal(null); setSearch(''); setSearchResults([])
    await fetchPartners()
    setTab('active')
    setSaving(false)
  }

  async function handleEditCommission() {
    setSaving(true); setError('')
    const res = await fetch('/api/admin/partners', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ majstor_id: editModal.id, commission_rate: parseFloat(editCommission) || 0 })
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setSaving(false); return }
    setEditModal(null)
    await fetchPartners()
    setSaving(false)
  }

  async function handleRemovePartner(id) {
    if (!confirm('Partner wirklich entfernen?')) return
    await fetch('/api/admin/partners', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ majstor_id: id })
    })
    if (detailData?.partner?.id === id) setDetailData(null)
    await fetchPartners()
  }

  function copyLink(ref_code) {
    navigator.clipboard.writeText(`https://pro-meister.de/?ref=${ref_code}`)
  }

  if (!authChecked) return (
    <div className="flex items-center justify-center min-h-screen bg-slate-900">
      <div className="text-slate-400">Wird geladen...</div>
    </div>
  )

  const detailPartner = detailData?.partner
  const detailReferred = detailData?.referred || []
  const detailPayouts = detailData?.payouts || []
  const totalCount = detailReferred.length
  const trialCount = detailReferred.filter(u => getStatus(u) === 'trial').length
  const activeCount = detailReferred.filter(u => getStatus(u) === 'active').length
  const inactiveCount = detailReferred.filter(u => !getStatus(u) || getStatus(u) === 'cancelled').length
  const allMonths = (detailData?.monthlyStats || []).map(m => {
    const [year, mon] = m.month.split('-').map(Number)
    const d = new Date(year, mon - 1, 1)
    const label = d.toLocaleDateString('de-DE', { month: 'short', year: '2-digit' })
    return { ...m, label, key: m.month, earning: m.amount }
  })
  const displayMonths = showAllMonths ? allMonths : allMonths.slice(0, 6)

  return (
    <div className="min-h-screen bg-slate-900 p-4 sm:p-6">
      <div className="max-w-5xl mx-auto space-y-6">

        <div className="flex items-center justify-between">
          <h1 className="text-white text-xl font-bold">🤝 Partner-Verwaltung</h1>
          <button onClick={() => router.push('/dashboard/admin')} className="text-slate-400 hover:text-white text-sm">
            ← Admin
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-slate-700 pb-0">
          {[['active', '📋 Aktive Partner'], ['add', '➕ Partner hinzufügen']].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === key
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tab: Aktive Partner */}
        {tab === 'active' && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            {loadingPartners ? (
              <div className="p-8 text-center text-slate-400">Wird geladen...</div>
            ) : partners.length === 0 ? (
              <div className="p-8 text-center text-slate-400">Noch keine Partner vorhanden.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-700/50">
                    <tr className="text-slate-400">
                      <th className="text-left px-4 py-3">Name</th>
                      <th className="text-left px-4 py-3">Ref-Code</th>
                      <th className="text-center px-4 py-3">Prov.</th>
                      <th className="text-center px-4 py-3">Reg.</th>
                      <th className="text-center px-4 py-3">Trial</th>
                      <th className="text-center px-4 py-3">Aktiv</th>
                      <th className="text-center px-4 py-3">Sub-P.</th>
                      <th className="text-right px-4 py-3">Aktionen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {partners.map(p => (
                      <tr key={p.id} className="border-t border-slate-700/50 hover:bg-slate-700/20">
                        <td className="px-4 py-3">
                          <button
                            onClick={() => fetchPartnerDetail(p)}
                            className="text-left group"
                          >
                            <div className="text-white text-xs font-medium group-hover:text-blue-400 transition-colors underline-offset-2 group-hover:underline">
                              {p.full_name || '—'}
                            </div>
                            <div className="text-slate-500 text-xs">{p.email}</div>
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => fetchPartnerDetail(p)} className="text-blue-400 hover:text-blue-300 text-xs font-mono underline underline-offset-2">
                            {p.ref_code}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-center text-green-400 font-medium">{p.commission_rate}€</td>
                        <td className="px-4 py-3 text-center text-slate-300">{p.total}</td>
                        <td className="px-4 py-3 text-center text-yellow-400">{p.trial}</td>
                        <td className="px-4 py-3 text-center text-green-400 font-bold">{p.active}</td>
                        <td className="px-4 py-3 text-center text-slate-400">{p.sub_partner_count || 0}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => copyLink(p.ref_code)}
                              className="text-xs px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg"
                              title="Ref-Link kopieren"
                            >
                              🔗
                            </button>
                            <button
                              onClick={() => { setEditModal(p); setEditCommission(String(p.commission_rate)) }}
                              className="text-xs px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleRemovePartner(p.id)}
                              className="text-xs px-2 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg"
                            >
                              ❌
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab: Partner hinzufügen */}
        {tab === 'add' && (
          <div className="space-y-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <label className="text-slate-300 text-sm mb-2 block">Nutzer suchen</label>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Name oder E-Mail eingeben..."
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            {searching && <div className="text-slate-400 text-sm px-1">Suche...</div>}

            {searchResults.length > 0 && (
              <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
                {searchResults.map(u => (
                  <div key={u.id} className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50 last:border-0">
                    <div>
                      <div className="text-white text-sm">{u.full_name || '—'}</div>
                      <div className="text-slate-400 text-xs">{u.email}</div>
                    </div>
                    {u.is_partner ? (
                      <span className="text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded-lg">Bereits Partner</span>
                    ) : (
                      <button
                        onClick={() => {
                          setAddModal(u)
                          setAddRefCode(slugify(u.full_name || u.email.split('@')[0]))
                          setAddCommission('6')
                          setError('')
                        }}
                        className="text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                      >
                        ➕ Als Partner
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Detail Modal */}
      {detailData && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 overflow-y-auto">
          <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-3xl my-4 space-y-5 p-5">

            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-white font-bold text-lg">{detailPartner?.full_name || '—'}</h2>
                <div className="text-slate-400 text-sm">{detailPartner?.email}</div>
                <div className="text-slate-500 text-xs font-mono mt-1">
                  ref: {detailPartner?.ref_code} · {detailPartner?.commission_rate}€/Aktiv
                </div>
              </div>
              <button
                onClick={() => setDetailData(null)}
                className="text-slate-400 hover:text-white text-2xl leading-none px-2"
              >
                ×
              </button>
            </div>

            {detailLoading ? (
              <div className="text-center text-slate-400 py-12">Wird geladen...</div>
            ) : (
              <>
                {/* Stat cards */}
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: 'Gesamt', value: totalCount, color: 'text-slate-300' },
                    { label: 'Trial', value: trialCount, color: 'text-yellow-400' },
                    { label: 'Aktiv', value: activeCount, color: 'text-green-400' },
                    { label: 'Inaktiv', value: inactiveCount, color: 'text-slate-500' },
                  ].map(c => (
                    <div key={c.label} className="bg-slate-700/50 rounded-lg p-3 text-center">
                      <div className={`text-2xl font-bold ${c.color}`}>{c.value}</div>
                      <div className="text-slate-400 text-xs mt-1">{c.label}</div>
                    </div>
                  ))}
                </div>

                {/* Click stats */}
                {detailData?.clickStats && (
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { label: 'Klicks', value: detailData.clickStats.total, color: 'text-slate-300' },
                      { label: 'QR-Scans', value: detailData.clickStats.qr, color: 'text-blue-400' },
                      { label: 'Konv.', value: detailData.clickStats.conversions, color: 'text-purple-400' },
                      { label: 'Rate %', value: `${detailData.clickStats.conversionRate}%`, color: 'text-teal-400' },
                    ].map(c => (
                      <div key={c.label} className="bg-slate-700/50 rounded-lg p-3 text-center">
                        <div className={`text-xl font-bold ${c.color}`}>{c.value}</div>
                        <div className="text-slate-400 text-xs mt-1">{c.label}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Finanzübersicht */}
                <div className="bg-slate-900/50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-white font-semibold text-sm">💶 Finanzübersicht</h3>
                    <span className="text-green-400 font-bold text-sm">
                      {(allMonths[0]?.amount ?? 0).toFixed(2)}€ akt. Monat
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
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
                        {displayMonths.map(m => {
                          const payout = detailPayouts.find(p => p.month === m.key)
                          const isPaid = !!payout?.paid_at
                          const isMarking = markingPaid === m.key
                          return (
                            <tr key={m.key} className={`border-b border-slate-700/30 ${isPaid ? 'bg-green-500/5' : ''}`}>
                              <td className="py-2 text-slate-300">
                                {m.label}
                                {m.isCurrent && <span className="text-slate-500 text-xs ml-1">(Vorschau)</span>}
                              </td>
                              <td className="py-2 text-center text-slate-400">{m.registrations}</td>
                              <td className="py-2 text-center text-slate-300">{m.activeCount}</td>
                              <td className={`py-2 text-right font-medium ${m.amount > 0 ? 'text-green-400' : 'text-slate-600'}`}>
                                {m.amount.toFixed(2)}€
                              </td>
                              <td className="py-2 text-right">
                                {m.isCurrent ? (
                                  <span className="text-slate-600 text-xs">—</span>
                                ) : isPaid ? (
                                  <div className="flex items-center justify-end gap-2">
                                    <span className="text-green-400 font-medium">✅ Bezahlt</span>
                                    <button
                                      onClick={() => handleUnmarkPaid(m.key)}
                                      disabled={isMarking}
                                      className="text-slate-500 hover:text-red-400 text-xs px-1 disabled:opacity-50"
                                      title="Rückgängig"
                                    >
                                      ↩
                                    </button>
                                  </div>
                                ) : m.amount > 0 ? (
                                  <button
                                    onClick={() => handleMarkPaid(m.key, m.amount)}
                                    disabled={isMarking}
                                    className="text-xs px-2 py-1 bg-blue-600/30 hover:bg-blue-600/50 text-blue-400 hover:text-blue-300 rounded-lg disabled:opacity-50 transition-colors"
                                  >
                                    {isMarking ? '...' : 'Als bezahlt'}
                                  </button>
                                ) : (
                                  <span className="text-slate-700">—</span>
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
                </div>

                {/* Sub-Partners (read-only) */}
                {detailData?.subPartners?.length > 0 && (
                  <div>
                    <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
                      Sub-Partner ({detailData.subPartners.length})
                    </h3>
                    <div className="space-y-1">
                      {detailData.subPartners.map(sp => {
                        const spActive = sp.monthlyStats?.[0]?.activeCount ?? 0
                        return (
                          <div key={sp.id} className="bg-slate-900/50 rounded-lg px-3 py-3">
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <div className="text-white text-xs font-medium">{sp.full_name || '—'}</div>
                                <div className="text-slate-500 text-xs">{sp.email} · ref: <span className="font-mono text-blue-400">{sp.ref_code}</span></div>
                              </div>
                              <div className="text-right">
                                <div className="text-green-400 text-xs font-medium">{sp.commission_rate || 0}€/Aktiv</div>
                                <div className="text-slate-400 text-xs">{sp.referred?.length ?? 0} Kunden · {spActive} aktiv</div>
                              </div>
                            </div>
                            {sp.clickStats && sp.clickStats.total > 0 && (
                              <div className="grid grid-cols-4 gap-2 text-center pt-2 border-t border-slate-700/50">
                                <div>
                                  <div className="text-white text-xs font-medium">{sp.clickStats.total}</div>
                                  <div className="text-slate-500 text-xs">Klicks</div>
                                </div>
                                <div>
                                  <div className="text-blue-400 text-xs font-medium">{sp.clickStats.qr}</div>
                                  <div className="text-slate-500 text-xs">QR</div>
                                </div>
                                <div>
                                  <div className="text-purple-400 text-xs font-medium">{sp.clickStats.conversions}</div>
                                  <div className="text-slate-500 text-xs">Reg.</div>
                                </div>
                                <div>
                                  <div className="text-green-400 text-xs font-medium">{sp.clickStats.conversionRate}%</div>
                                  <div className="text-slate-500 text-xs">Rate</div>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    <p className="text-slate-500 text-xs mt-2">
                      ℹ️ Betrag in Finanzübersicht enthält Kunden aller Sub-Partner (Brutto-Provision)
                    </p>
                  </div>
                )}

                {/* Users list */}
                {detailReferred.length > 0 && (
                  <div>
                    <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
                      Registrierte Nutzer ({detailReferred.length})
                    </h3>
                    <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
                      {detailReferred.map(u => {
                        const s = getStatus(u)
                        const sub = getLatestSub(u)
                        const isCancelled = sub?.cancel_at_period_end === true || s === 'cancelled'
                        const periodEnd = sub?.current_period_end ? new Date(sub.current_period_end).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' }) : null
                        return (
                          <div key={u.id} className="flex items-center justify-between px-3 py-2 bg-slate-900/50 rounded-lg">
                            <div>
                              <div className="text-white text-xs">{u.full_name || '—'}</div>
                              <div className="text-slate-500 text-xs">{u.email}</div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                isCancelled ? 'bg-red-500/20 text-red-400' :
                                s === 'active' ? 'bg-green-500/20 text-green-400' :
                                s === 'trial' ? 'bg-yellow-500/20 text-yellow-400' :
                                'bg-slate-700 text-slate-400'
                              }`}>
                                {isCancelled ? (periodEnd || 'Gekündigt') : (s || 'Freemium')}
                              </span>
                              <span className="text-slate-600 text-xs">
                                {new Date(u.created_at).toLocaleDateString('de-DE')}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {detailReferred.length === 0 && (
                  <div className="text-center text-slate-500 text-sm py-4">
                    Noch keine Registrierungen über diesen Partner.
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal: Partner hinzufügen */}
      {addModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 w-full max-w-md space-y-4">
            <h3 className="text-white font-semibold">➕ Als Partner hinzufügen</h3>
            <div>
              <div className="text-slate-300 text-sm">{addModal.full_name}</div>
              <div className="text-slate-500 text-xs">{addModal.email}</div>
            </div>
            <div>
              <label className="text-slate-400 text-xs mb-1 block">Ref-Code</label>
              <input
                type="text"
                value={addRefCode}
                onChange={e => setAddRefCode(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-blue-500"
              />
              <p className="text-slate-500 text-xs mt-1">Link: pro-meister.de/?ref={addRefCode}</p>
            </div>
            <div>
              <label className="text-slate-400 text-xs mb-1 block">Provision (€ pro aktivem Kunden/Monat)</label>
              <input
                type="number"
                value={addCommission}
                onChange={e => setAddCommission(e.target.value)}
                min="0"
                step="0.5"
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => setAddModal(null)}
                className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm"
              >
                Abbrechen
              </button>
              <button
                onClick={handleAddPartner}
                disabled={saving}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {saving ? 'Wird gespeichert...' : '✅ Bestätigen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Provision bearbeiten */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 w-full max-w-sm space-y-4">
            <h3 className="text-white font-semibold">✏️ Provision ändern</h3>
            <div>
              <div className="text-slate-300 text-sm">{editModal.full_name}</div>
              <div className="text-slate-500 text-xs">ref: {editModal.ref_code}</div>
            </div>
            <div>
              <label className="text-slate-400 text-xs mb-1 block">Provision (€ / Monat pro aktivem Kunden)</label>
              <input
                type="number"
                value={editCommission}
                onChange={e => setEditCommission(e.target.value)}
                min="0"
                step="0.5"
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => setEditModal(null)}
                className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm"
              >
                Abbrechen
              </button>
              <button
                onClick={handleEditCommission}
                disabled={saving}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {saving ? 'Wird gespeichert...' : '✅ Speichern'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
