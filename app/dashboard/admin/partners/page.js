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

export default function AdminPartnersPage() {
  const router = useRouter()
  const [token, setToken] = useState(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [tab, setTab] = useState('active') // 'active' | 'add'
  const [partners, setPartners] = useState([])
  const [loadingPartners, setLoadingPartners] = useState(true)

  // Search for adding
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)

  // Modals
  const [addModal, setAddModal] = useState(null) // majstor object
  const [addRefCode, setAddRefCode] = useState('')
  const [addCommission, setAddCommission] = useState('6')
  const [editModal, setEditModal] = useState(null) // partner object
  const [editCommission, setEditCommission] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

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

  // Live search majstora
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

  return (
    <div className="min-h-screen bg-slate-900 p-4 sm:p-6">
      <div className="max-w-5xl mx-auto space-y-6">

        <div className="flex items-center justify-between">
          <h1 className="text-white text-xl font-bold">🤝 Partner-Verwaltung</h1>
          <button onClick={() => router.push('/admin')} className="text-slate-400 hover:text-white text-sm">
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
                      <th className="text-right px-4 py-3">Aktionen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {partners.map(p => (
                      <tr key={p.id} className="border-t border-slate-700/50 hover:bg-slate-700/20">
                        <td className="px-4 py-3">
                          <div className="text-white text-xs font-medium">{p.full_name || '—'}</div>
                          <div className="text-slate-500 text-xs">{p.email}</div>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => copyLink(p.ref_code)}
                            className="text-blue-400 hover:text-blue-300 text-xs font-mono"
                            title="Link kopieren"
                          >
                            {p.ref_code} 📋
                          </button>
                        </td>
                        <td className="px-4 py-3 text-center text-green-400 font-medium">{p.commission_rate}€</td>
                        <td className="px-4 py-3 text-center text-slate-300">{p.total}</td>
                        <td className="px-4 py-3 text-center text-yellow-400">{p.trial}</td>
                        <td className="px-4 py-3 text-center text-green-400 font-bold">{p.active}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex gap-2 justify-end">
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
