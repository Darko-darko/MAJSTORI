// app/dashboard/regieberichte/page.js — Regieberichte Übersicht (Solo + Team Owner)
'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

export default function RegieberichtePage() {
  const [berichte, setBerichte] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState(null)
  const [filterWorker, setFilterWorker] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [search, setSearch] = useState('')
  const [workers, setWorkers] = useState([])
  const [isTeamOwner, setIsTeamOwner] = useState(false)

  useEffect(() => { loadAll() }, [])

  const getHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return { Authorization: `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' }
  }

  const loadAll = async () => {
    try {
      const headers = await getHeaders()

      // Load berichte
      const res = await fetch('/api/regieberichte', { headers })
      const json = await res.json()
      if (json.regieberichte) setBerichte(json.regieberichte)

      // Check if team owner (has workers)
      const teamRes = await fetch('/api/team', { headers })
      const teamJson = await teamRes.json()
      if (teamJson.members?.length > 0) {
        setIsTeamOwner(true)
        setWorkers(teamJson.members.filter(m => m.status === 'active'))
      }
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Regiebericht wirklich löschen?')) return
    try {
      const headers = await getHeaders()
      await fetch('/api/regieberichte', {
        method: 'DELETE', headers,
        body: JSON.stringify({ id })
      })
      setBerichte(prev => prev.filter(b => b.id !== id))
    } catch (err) { alert(err.message) }
  }

  const formatDate = (iso) => new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })

  // Filter + Search
  const filtered = berichte.filter(b => {
    if (filterWorker !== 'all') {
      if (filterWorker === 'self' && b.worker_id) return false
      if (filterWorker !== 'self' && b.worker_id !== filterWorker) return false
    }
    if (filterStatus !== 'all' && b.status !== filterStatus) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      const match = [b.objekt, b.mieter_name, b.customer_name, b.beschreibung, b.worker_name]
        .filter(Boolean).join(' ').toLowerCase()
      if (!match.includes(q)) return false
    }
    return true
  })

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-purple-500 border-t-transparent mx-auto"></div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold text-white">Regieberichte</h1>

      {/* Search + Filters */}
      <div className="space-y-3">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Suche nach Adresse, Mieter, Beschreibung..."
          className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500"
        />

        <div className="flex gap-2 flex-wrap">
          {/* Status filter */}
          {[
            { key: 'all', label: 'Alle' },
            { key: 'draft', label: 'Entwurf' },
            { key: 'signed', label: 'Unterschrieben' },
            { key: 'attached', label: 'An Rechnung' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilterStatus(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filterStatus === f.key ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}

          {/* Worker filter (nur für Team Owner) */}
          {isTeamOwner && (
            <select
              value={filterWorker}
              onChange={e => setFilterWorker(e.target.value)}
              className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
            >
              <option value="all">Alle Mitarbeiter</option>
              <option value="self">Nur meine</option>
              {workers.map(w => (
                <option key={w.worker_id} value={w.worker_id}>{w.worker_name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Count */}
      <p className="text-slate-500 text-sm">{filtered.length} Regiebericht{filtered.length !== 1 ? 'e' : ''}</p>

      {/* List */}
      {filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map(b => (
            <div key={b.id} className={`border rounded-xl overflow-hidden ${
              b.status === 'attached' ? 'bg-slate-800/30 border-green-500/30' :
              b.status === 'signed' ? 'bg-slate-800/50 border-blue-500/30' :
              'bg-slate-800/50 border-slate-700'
            }`}>
              <div className="p-4 cursor-pointer" onClick={() => setExpandedId(expandedId === b.id ? null : b.id)}>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white bg-blue-600">📋</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm truncate">{b.objekt || 'Ohne Adresse'}</p>
                    <p className="text-slate-500 text-xs">
                      {formatDate(b.datum)}
                      {b.uhrzeit && ` · ${b.uhrzeit}`}
                      {b.worker_name && <span className="text-purple-400"> · 👷 {b.worker_name}</span>}
                      {isTeamOwner && !b.worker_id && <span className="text-orange-400"> · 👔 Ich</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {b.status === 'signed' && <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-0.5 rounded">Unterschrieben</span>}
                    {b.status === 'attached' && <span className="bg-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded">An Rechnung</span>}
                    {b.status === 'draft' && <span className="bg-slate-500/20 text-slate-400 text-xs px-2 py-0.5 rounded">Entwurf</span>}
                  </div>
                </div>
                {b.mieter_name && <p className="text-slate-400 text-xs ml-10">Mieter: {b.mieter_name}</p>}
                {b.customer_name && <p className="text-slate-400 text-xs ml-10">Kunde: {b.customer_name}</p>}
              </div>

              {expandedId === b.id && (
                <div className="border-t border-slate-700/50 p-4 space-y-3">
                  {b.beschreibung && (
                    <div>
                      <p className="text-slate-500 text-xs font-semibold mb-1">Durchgeführte Arbeiten:</p>
                      <p className="text-slate-300 text-sm whitespace-pre-line">{b.beschreibung}</p>
                    </div>
                  )}
                  {b.wohnungsnummer && <p className="text-slate-400 text-xs">Wohnung: {b.wohnungsnummer}</p>}
                  {b.signature_url && (
                    <div>
                      <p className="text-slate-500 text-xs font-semibold mb-1">Unterschrift:</p>
                      <img src={b.signature_url} alt="Unterschrift" className="h-16 object-contain rounded border border-slate-600" style={{ backgroundColor: '#ffffff' }} />
                    </div>
                  )}
                  <div className="flex gap-2 pt-1">
                    {b.pdf_url && (
                      <a href={b.pdf_url} target="_blank" rel="noopener noreferrer"
                        className="px-3 py-2 bg-slate-700 text-white rounded-lg text-xs hover:bg-slate-600 transition-colors">
                        📄 PDF öffnen
                      </a>
                    )}
                    {b.pdf_url && (
                      <button
                        onClick={async () => {
                          try {
                            const link = document.createElement('a')
                            link.href = b.pdf_url
                            link.target = '_blank'
                            // For email sharing
                            if (navigator.share) {
                              await navigator.share({ title: `Regiebericht ${formatDate(b.datum)}`, url: b.pdf_url })
                            } else {
                              await navigator.clipboard.writeText(b.pdf_url)
                              alert('PDF-Link kopiert!')
                            }
                          } catch (err) { /* user cancelled share */ }
                        }}
                        className="px-3 py-2 bg-purple-600/20 text-purple-400 rounded-lg text-xs hover:bg-purple-600/30 transition-colors">
                        📤 Teilen
                      </button>
                    )}
                    <button onClick={() => handleDelete(b.id)}
                      className="px-3 py-2 bg-red-900/30 text-red-400 rounded-lg text-xs hover:bg-red-900/50 transition-colors ml-auto">
                      🗑 Löschen
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-slate-500">
          <p className="text-4xl mb-3">📋</p>
          <p>Keine Regieberichte gefunden</p>
          {search || filterStatus !== 'all' || filterWorker !== 'all' ? (
            <p className="text-sm mt-1">Versuchen Sie andere Filtereinstellungen</p>
          ) : (
            <p className="text-sm mt-1">Regieberichte werden über Rechnungen oder vom Team erstellt</p>
          )}
        </div>
      )}
    </div>
  )
}
