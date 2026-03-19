'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import FirstVisitHint from '@/app/components/FirstVisitHint'
import { pdfToImages } from '@/lib/pdfToImages'

// Client-side image compression (same pattern as AvatarUpload)
function compressImage(file, maxWidth = 1600) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      let { width, height } = img
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width)
        width = maxWidth
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d').drawImage(img, 0, 0, width, height)
      canvas.toBlob(resolve, 'image/jpeg', 0.82)
    }
    img.src = URL.createObjectURL(file)
  })
}

function groupByMonth(ausgaben) {
  const groups = {}
  for (const a of ausgaben) {
    const d = new Date(a.created_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
    if (!groups[key]) groups[key] = { key, label, items: [] }
    groups[key].items.push(a)
  }
  return Object.values(groups).sort((a, b) => b.key.localeCompare(a.key))
}

export default function AusgabenPage() {
  const [ausgaben, setAusgaben] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [previewUrl, setPreviewUrl] = useState(null)
  const [previewItem, setPreviewItem] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewImages, setPreviewImages] = useState([])
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [zipModal, setZipModal] = useState(false)
  const [zipLoading, setZipLoading] = useState(false)
  const [zipResult, setZipResult] = useState(null)
  const [bookkeeperEmail, setBookkeeperEmail] = useState('')
  const [majstor, setMajstor] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      // Profile + expenses in parallel
      const [profileResult, expensesRes] = await Promise.all([
        supabase.from('majstors').select('id, full_name, business_name, bookkeeper_email').eq('id', session.user.id).single(),
        fetch('/api/ausgaben', { headers: { Authorization: `Bearer ${session.access_token}` } }),
      ])

      const profile = profileResult.data
      setMajstor(profile)
      setBookkeeperEmail(profile?.bookkeeper_email || '')

      if (expensesRes.ok) {
        const data = await expensesRes.json()
        setAusgaben(data.ausgaben || [])
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleFiles(files) {
    if (!files?.length) return
    setUploading(true)
    setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      for (const file of Array.from(files)) {
        const isPDF = file.type === 'application/pdf'
        let uploadBlob = file
        let ext = 'pdf'

        if (!isPDF) {
          const compressed = await compressImage(file)
          uploadBlob = compressed
          ext = 'jpg'
        }

        const timestamp = Date.now()
        const path = `${session.user.id}/${timestamp}_${Math.random().toString(36).slice(2)}.${ext}`

        const { error: uploadError } = await supabase.storage
          .from('ausgaben')
          .upload(path, uploadBlob, {
            contentType: isPDF ? 'application/pdf' : 'image/jpeg',
            upsert: false
          })

        if (uploadError) { setError('Upload fehlgeschlagen: ' + uploadError.message); continue }

        // Save metadata
        await fetch('/api/ausgaben', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            storage_path: path,
            filename: file.name.replace(/\.[^.]+$/, '') + '.' + ext
          })
        })
      }
      await loadData()
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Beleg löschen?')) return
    const { data: { session } } = await supabase.auth.getSession()
    await fetch('/api/ausgaben', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ id })
    })
    setAusgaben(prev => prev.filter(a => a.id !== id))
    setSelectedIds(prev => { const s = new Set(prev); s.delete(id); return s })
  }

  async function handleBulkDelete() {
    if (!selectedIds.size) return
    if (!confirm(`${selectedIds.size} Beleg${selectedIds.size > 1 ? 'e' : ''} löschen?`)) return
    const { data: { session } } = await supabase.auth.getSession()
    const ids = [...selectedIds]
    for (const id of ids) {
      await fetch('/api/ausgaben', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ id })
      })
    }
    setAusgaben(prev => prev.filter(a => !selectedIds.has(a.id)))
    setSelectedIds(new Set())
  }

  async function openPreview(item) {
    const { data } = await supabase.storage.from('ausgaben').createSignedUrl(item.storage_path, 300)
    if (!data?.signedUrl) return
    setPreviewItem(item)
    setPreviewImages([])
    if (item.storage_path?.endsWith('.pdf')) {
      setPreviewLoading(true)
      setPreviewUrl(null)
      try {
        const imgs = await pdfToImages(data.signedUrl, { scale: 2, quality: 0.85, maxPages: 5 })
        setPreviewImages(imgs)
      } catch { /* fallback: no images */ }
      setPreviewLoading(false)
    } else {
      setPreviewLoading(false)
      setPreviewUrl(data.signedUrl)
    }
  }

  function toggleSelect(id) {
    setSelectedIds(prev => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })
  }

  function toggleMonth(items) {
    const ids = items.map(i => i.id)
    const allSelected = ids.every(id => selectedIds.has(id))
    setSelectedIds(prev => {
      const s = new Set(prev)
      ids.forEach(id => allSelected ? s.delete(id) : s.add(id))
      return s
    })
  }

  useEffect(() => {
    if (zipModal) generateZip()
  }, [zipModal])

  async function generateZip() {
    setZipLoading(true)
    setZipResult(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const businessSlug = (majstor?.business_name || majstor?.full_name || 'Ausgaben')
        .replace(/\s+/g, '_').substring(0, 30)
      const now = new Date()
      const periodLabel = now.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
      const zipFilename = `Ausgaben_${periodLabel.replace(/\s+/g, '_')}_${businessSlug}.zip`

      const res = await fetch('/api/ausgaben/bulk-zip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          ausgabenIds: [...selectedIds],
          majstorId: majstor.id,
          zipFilename
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setZipResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setZipLoading(false)
    }
  }

  function getEmailBody() {
    const businessName = majstor?.business_name || majstor?.full_name || ''
    const now = new Date()
    const period = now.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
    const link = zipResult?.shortUrl || zipResult?.zipUrl || ''
    return `Sehr geehrte Damen und Herren,\n\nanbei finden Sie die Ausgabenbelege für ${period} zum Download:\n\n${link}\n\n(Link gültig 14 Tage)\n\nMit freundlichen Grüßen\n${businessName}`
  }

  const groups = groupByMonth(ausgaben)

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-slate-900">
      <div className="text-slate-400">Wird geladen...</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-900 p-4 sm:p-6">
      <div className={`max-w-3xl mx-auto space-y-6 ${selectedIds.size > 0 ? 'pb-36' : 'pb-32'}`}>

        <FirstVisitHint pageKey="ausgaben" />

        {/* Header */}
        <div>
          <a href="/dashboard" className="text-slate-400 hover:text-white text-sm mb-2 inline-block">← Zurück zum Dashboard</a>
          <h1 className="text-white text-xl font-bold">🧾 Ausgaben</h1>
          <p className="text-slate-400 text-sm mt-1">Belege fotografieren und archivieren</p>
        </div>

        {/* Upload area */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files) }}
          className="border-2 border-dashed border-slate-600 hover:border-blue-500 rounded-xl p-8 text-center cursor-pointer transition-colors"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            multiple
            className="hidden"
            onChange={e => handleFiles(e.target.files)}
          />
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-slate-400 text-sm">Wird hochgeladen...</p>
            </div>
          ) : (
            <>
              <div className="text-4xl mb-2">📷</div>
              <p className="text-white font-medium">Foto aufnehmen oder Datei auswählen</p>
              <p className="text-slate-500 text-xs mt-1">JPG, PNG · wird komprimiert · PDF möglich</p>
            </>
          )}
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">{error}</div>
        )}

        {/* Ausgaben grouped by month */}
        {groups.length === 0 && !loading && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center">
            <p className="text-slate-400 text-sm">Noch keine Belege vorhanden.</p>
            <p className="text-slate-500 text-xs mt-1">Fotografiere deinen ersten Beleg oben.</p>
          </div>
        )}

        {groups.map(group => {
          const allSelected = group.items.every(i => selectedIds.has(i.id))
          return (
            <div key={group.key} className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
                <h2 className="text-white font-semibold text-sm">{group.label}</h2>
                <button
                  onClick={() => toggleMonth(group.items)}
                  className="text-xs text-slate-400 hover:text-white transition-colors"
                >
                  {allSelected ? 'Alle abwählen' : 'Alle auswählen'}
                </button>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 p-3">
                {group.items.map(item => {
                  const selected = selectedIds.has(item.id)
                  const isPDF = item.storage_path?.endsWith('.pdf')
                  return (
                    <div key={item.id} className="relative group">
                      <div
                        onClick={() => openPreview(item)}
                        className={`aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-colors ${selected ? 'border-blue-500' : 'border-transparent'} bg-slate-700 flex items-center justify-center`}
                      >
                          <StorageThumbnail path={item.storage_path} isPdf={isPDF} />
                      </div>
                      {/* Select checkbox */}
                      <button
                        onClick={() => toggleSelect(item.id)}
                        className={`absolute top-1 left-1 w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs transition-colors ${selected ? 'bg-blue-500 border-blue-500 text-white' : 'bg-slate-900/70 border-slate-500'}`}
                      >
                        {selected && '✓'}
                      </button>
                      {/* Delete — always visible on mobile, hover on desktop */}
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500/80 text-white text-xs flex items-center justify-center"
                      >
                        ×
                      </button>
                      <p className="text-slate-500 text-xs mt-1 truncate px-0.5">
                        {new Date(item.created_at).toLocaleDateString('de-DE')}
                        {item.uploaded_by && item.uploaded_by !== majstor?.id && (
                          <span className="ml-1 text-[9px] text-teal-400">Buchhalter</span>
                        )}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Floating action bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60]">
          <div className="bg-slate-800 border border-slate-600 rounded-xl shadow-xl px-4 py-3 flex items-center gap-4">
            <span className="text-white text-sm">
              <span className="font-semibold">{selectedIds.size}</span> Beleg{selectedIds.size > 1 ? 'e' : ''} ausgewählt
            </span>
            <button
              onClick={() => setZipModal(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors"
            >
              📤 An Buchhalter senden
            </button>
            <button
              onClick={handleBulkDelete}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors"
            >
              🗑️ Löschen
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-slate-400 hover:text-white text-sm px-2 py-2 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Preview modal */}
      {previewItem && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setPreviewItem(null)}>
          <div className="max-w-2xl w-full" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3">
              <span className="text-slate-400 text-sm">{new Date(previewItem.created_at).toLocaleDateString('de-DE')}</span>
              <button onClick={() => setPreviewItem(null)} className="text-slate-400 hover:text-white text-2xl leading-none">×</button>
            </div>
            {previewLoading
              ? <div className="w-full h-64 bg-slate-800 rounded-xl animate-pulse flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              : previewImages.length > 0
                ? <div className="space-y-3 max-h-[70vh] overflow-y-auto rounded-xl">
                    {previewImages.map((src, i) => (
                      <img key={i} src={src} alt={`Seite ${i + 1}`} className="w-full rounded-xl object-contain bg-white" />
                    ))}
                  </div>
                : <img src={previewUrl} alt="Beleg" className="w-full rounded-xl max-h-[70vh] object-contain bg-slate-900" />
            }
          </div>
        </div>
      )}

      {/* ZIP modal */}
      {zipModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl w-full max-w-md border border-slate-700">
            <div className="flex justify-between items-center p-5 border-b border-slate-700">
              <div>
                <h3 className="text-white font-semibold text-lg">📤 An Buchhalter senden</h3>
                <p className="text-slate-400 text-sm mt-0.5">{selectedIds.size} Belege ausgewählt</p>
              </div>
              <button onClick={() => setZipModal(false)} className="text-slate-400 hover:text-white text-2xl leading-none">×</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">E-Mail Buchhalter</label>
                <input
                  type="email"
                  value={bookkeeperEmail}
                  onChange={e => setBookkeeperEmail(e.target.value)}
                  placeholder="buchhalter@beispiel.de"
                  className="w-full px-3 py-2 bg-slate-900/60 border border-slate-600 rounded-lg text-white text-sm"
                />
              </div>

              {zipLoading && (
                <div className="flex items-center gap-3 bg-slate-700/40 rounded-lg p-4">
                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin shrink-0" />
                  <span className="text-slate-300 text-sm">ZIP wird erstellt...</span>
                </div>
              )}

              {zipResult && !zipLoading && (
                <>
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 flex items-center gap-2">
                    <span className="text-green-400">✅</span>
                    <span className="text-green-300 text-sm">ZIP erstellt — {zipResult.count} Belege</span>
                  </div>
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        const subject = `Ausgaben – ${majstor?.business_name || majstor?.full_name || ''}`
                        const url = `https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(bookkeeperEmail)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(getEmailBody())}`
                        window.open(url, '_blank')
                      }}
                      disabled={!bookkeeperEmail}
                      className="hidden sm:flex w-full py-3 bg-red-600/80 hover:bg-red-600 disabled:opacity-40 text-white rounded-lg font-medium transition-colors items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
                      In Gmail öffnen
                    </button>
                    <button
                      onClick={() => {
                        const subject = `Ausgaben – ${majstor?.business_name || majstor?.full_name || ''}`
                        const mailto = `mailto:${encodeURIComponent(bookkeeperEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(getEmailBody())}`
                        window.open(mailto, '_self')
                      }}
                      disabled={!bookkeeperEmail}
                      className="w-full py-3 bg-slate-600 hover:bg-slate-500 disabled:opacity-40 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      📧 Im E-Mail-Programm öffnen
                    </button>
                    <button
                      onClick={() => window.open(zipResult.zipUrl, '_blank')}
                      className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 border border-slate-600"
                    >
                      📥 ZIP herunterladen
                    </button>
                  </div>
                  <p className="text-slate-500 text-xs text-center">Link gültig 14 Tage · {zipResult.count} Dateien</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Thumbnail component — loads signed URL on mount, renders PDF first page as image
function StorageThumbnail({ path, isPdf }) {
  const [url, setUrl] = useState(null)
  const canvasRef = useRef(null)
  const [pdfReady, setPdfReady] = useState(false)

  useEffect(() => {
    supabase.storage.from('ausgaben').createSignedUrl(path, 300).then(({ data }) => {
      if (data?.signedUrl) setUrl(data.signedUrl)
    })
  }, [path])

  useEffect(() => {
    if (!isPdf || !url || !canvasRef.current) return
    let cancelled = false
    pdfToImages(url, { scale: 1, quality: 0.7, maxPages: 1 }).then(imgs => {
      if (cancelled || !imgs.length || !canvasRef.current) return
      const img = new Image()
      img.onload = () => {
        if (cancelled || !canvasRef.current) return
        const canvas = canvasRef.current
        canvas.width = img.width
        canvas.height = img.height
        canvas.getContext('2d').drawImage(img, 0, 0)
        setPdfReady(true)
      }
      img.src = imgs[0]
    }).catch(() => {})
    return () => { cancelled = true }
  }, [isPdf, url])

  if (!url) return <div className="w-full h-full bg-slate-600 animate-pulse" />

  if (isPdf) {
    return (
      <div className="relative w-full h-full">
        <canvas ref={canvasRef} className="w-full h-full object-cover" style={pdfReady ? {} : { display: 'none' }} />
        {!pdfReady && <div className="w-full h-full bg-slate-600 animate-pulse" />}
        <span className="absolute bottom-1 left-1 bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ color: '#fff', backgroundColor: '#dc2626' }}>PDF</span>
      </div>
    )
  }

  return <img src={url} alt="Beleg" className="w-full h-full object-cover" />
}
