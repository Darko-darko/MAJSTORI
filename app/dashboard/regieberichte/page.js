// app/dashboard/regieberichte/page.js — Regieberichte Übersicht (Solo + Team Owner)
'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import RegieberichtForm from '@/app/components/RegieberichtForm'

function dataUrlToBlob(dataUrl) {
  const [header, base64] = dataUrl.split(',')
  const mime = header.match(/:(.*?);/)[1]
  const binary = atob(base64)
  const arr = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i)
  return new Blob([arr], { type: mime })
}

export default function RegieberichtePage() {
  const [berichte, setBerichte] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [berichteOffset, setBerichteOffset] = useState(0)
  const PAGE_SIZE = 20
  const scrollRef = useRef(null)
  const [expandedId, setExpandedId] = useState(null)
  const [filterWorker, setFilterWorker] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [search, setSearch] = useState('')
  const [workers, setWorkers] = useState([])
  const [isTeamOwner, setIsTeamOwner] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [majstor, setMajstor] = useState(null)

  useEffect(() => { loadAll() }, [])

  const getHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return { Authorization: `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' }
  }

  const loadAll = async () => {
    try {
      const headers = await getHeaders()

      // Load berichte
      await loadBerichte(true)

      // Load majstor profile
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: m } = await supabase.from('majstors').select('*').eq('id', user.id).single()
        if (m) setMajstor(m)
      }

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

  const loadBerichte = async (reset = true) => {
    const headers = await getHeaders()
    const currentOffset = reset ? 0 : berichteOffset
    const res = await fetch(`/api/regieberichte?limit=${PAGE_SIZE}&offset=${currentOffset}`, { headers })
    const json = await res.json()
    if (json.regieberichte) {
      if (reset) {
        setBerichte(json.regieberichte)
        setBerichteOffset(PAGE_SIZE)
      } else {
        setBerichte(prev => [...prev, ...json.regieberichte])
        setBerichteOffset(currentOffset + PAGE_SIZE)
      }
      setHasMore(json.hasMore || false)
    }
    setLoadingMore(false)
  }

  useEffect(() => {
    if (!scrollRef.current) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && hasMore && !loadingMore) { setLoadingMore(true); loadBerichte(false) } },
      { threshold: 0.1 }
    )
    observer.observe(scrollRef.current)
    return () => observer.disconnect()
  }, [hasMore, loadingMore])

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
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Regieberichte</h1>
        <button
          onClick={() => setShowCreateForm(true)}
          className="px-4 py-2 bg-purple-600 text-white rounded-xl font-semibold text-sm hover:bg-purple-500 transition-colors"
        >
          + Neuer Regiebericht
        </button>
      </div>

      {/* Create Form Modal */}
      {showCreateForm && majstor && (
        <div className="fixed inset-0 bg-black/60 z-40 flex items-start justify-center overflow-y-auto pt-8 pb-8" onClick={() => !uploading && setShowCreateForm(false)}>
          <div className="bg-slate-800 rounded-xl w-full max-w-lg mx-4 border border-slate-700 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <RegieberichtForm
              majstor={majstor}
              invoiceFormData={null}
              onGenerated={null}
              onSaveOnly={async (file, formData) => {
                setUploading(true)
                try {
                  // Upload PDF
                  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
                  const storagePath = `${majstor.id}/${Date.now()}_${safeName}`
                  const { error: uploadErr } = await supabase.storage.from('regieberichte').upload(storagePath, file, { contentType: 'application/pdf' })
                  if (uploadErr) throw uploadErr
                  const { data: { publicUrl } } = supabase.storage.from('regieberichte').getPublicUrl(storagePath)

                  // Upload signature if exists
                  let signatureStorageUrl = null
                  if (formData?.signatureDataUrl) {
                    const sigBlob = dataUrlToBlob(formData.signatureDataUrl)
                    const sigPath = `${majstor.id}/${Date.now()}_signature.png`
                    const { error: sigErr } = await supabase.storage.from('regieberichte').upload(sigPath, sigBlob, { contentType: 'image/png' })
                    if (!sigErr) {
                      const { data: { publicUrl: sigUrl } } = supabase.storage.from('regieberichte').getPublicUrl(sigPath)
                      signatureStorageUrl = sigUrl
                    }
                  }

                  // Convert datum DD.MM.YYYY → YYYY-MM-DD
                  const dp = formData?.datum?.split('.') || []
                  const datumISO = dp.length === 3 ? `${dp[2]}-${dp[1]}-${dp[0]}` : new Date().toISOString().split('T')[0]

                  const headers = await getHeaders()
                  await fetch('/api/regieberichte', {
                    method: 'POST', headers,
                    body: JSON.stringify({
                      datum: datumISO,
                      uhrzeit: formData?.uhrzeit || null,
                      objekt: formData?.objekt || null,
                      beschreibung: formData?.beschreibung || null,
                      mieter_name: formData?.mieterName || null,
                      wohnungsnummer: formData?.wohnungsnummer || null,
                      signature_url: signatureStorageUrl,
                      pdf_url: publicUrl,
                    })
                  })
                  setShowCreateForm(false)
                  loadBerichte(true)
                  alert('✅ Regiebericht erstellt!')
                } catch (err) {
                  console.error('Regiebericht create error:', err)
                  alert('❌ Fehler: ' + (err.message || 'Unbekannter Fehler'))
                } finally {
                  setUploading(false)
                }
              }}
              onClose={() => !uploading && setShowCreateForm(false)}
            />
            {uploading && (
              <div className="p-4 text-center">
                <p className="text-blue-400 text-sm animate-pulse">⏳ Wird hochgeladen...</p>
              </div>
            )}
          </div>
        </div>
      )}

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
                    {b.status === 'draft' && (
                      <button
                        onClick={async () => {
                          try {
                            const headers = await getHeaders()
                            await fetch('/api/regieberichte', {
                              method: 'PATCH', headers,
                              body: JSON.stringify({ id: b.id, status: 'signed' })
                            })
                            setBerichte(prev => prev.map(r => r.id === b.id ? { ...r, status: 'signed' } : r))
                          } catch (err) { alert(err.message) }
                        }}
                        className="px-3 py-2 bg-blue-600/20 text-blue-400 rounded-lg text-xs hover:bg-blue-600/30 transition-colors">
                        ✅ Extern unterschrieben
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
            <p className="text-sm mt-1">Erstellen Sie einen neuen Regiebericht mit dem Button oben</p>
          )}
        </div>
      )}

      {/* Infinite scroll sentinel */}
      <div ref={scrollRef} className="h-4" />
      {loadingMore && (
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-purple-500 border-t-transparent"></div>
        </div>
      )}
    </div>
  )
}
