// app/dashboard/worker/reports/page.js — Tagesbericht (Worker)
'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

// Compress image on client before upload
function compressImage(file, maxWidth = 1920, quality = 0.8) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      let w = img.width, h = img.height
      if (w > maxWidth) { h = (maxWidth / w) * h; w = maxWidth }
      canvas.width = w; canvas.height = h
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, w, h)
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality)
    }
    img.src = URL.createObjectURL(file)
  })
}

export default function WorkerReportsPage() {
  const [report, setReport] = useState(null)
  const [text, setText] = useState('')
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [tab, setTab] = useState('today') // today, gallery
  const [allReports, setAllReports] = useState([])
  const fileRef = useRef(null)
  const saveTimeout = useRef(null)

  useEffect(() => { loadReport() }, [])

  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return { Authorization: `Bearer ${session?.access_token}` }
  }

  const loadReport = async () => {
    try {
      const headers = await getAuthHeaders()
      const today = new Date().toISOString().split('T')[0]
      const res = await fetch(`/api/team/reports?date=${today}`, { headers })
      const json = await res.json()

      if (json.reports?.length > 0) {
        setReport(json.reports[0])
        setText(json.reports[0].text || '')
        setPhotos(json.reports[0].photos || [])
      }

      // Load all reports for gallery
      const allRes = await fetch('/api/team/reports', { headers })
      const allJson = await allRes.json()
      if (allJson.reports) setAllReports(allJson.reports)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleTextChange = (newText) => {
    setText(newText)
    // Auto-save after 1s pause
    if (saveTimeout.current) clearTimeout(saveTimeout.current)
    saveTimeout.current = setTimeout(() => saveText(newText), 1000)
  }

  const saveText = async (textToSave) => {
    setSaving(true)
    try {
      const headers = await getAuthHeaders()
      const res = await fetch('/api/team/reports', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToSave })
      })
      const json = await res.json()
      if (json.report) {
        setReport(json.report)
        setPhotos(json.report.photos || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    // Ensure report exists first
    if (!report) {
      await saveText(text)
      // Wait a tick for state update
      await new Promise(r => setTimeout(r, 500))
    }

    setUploading(true)
    try {
      const headers = await getAuthHeaders()

      // Get latest report ID
      const today = new Date().toISOString().split('T')[0]
      const checkRes = await fetch(`/api/team/reports?date=${today}`, { headers })
      const checkJson = await checkRes.json()
      const reportId = checkJson.reports?.[0]?.id

      if (!reportId) throw new Error('Bericht konnte nicht erstellt werden')

      for (const file of files) {
        if (photos.length >= 10) {
          alert('Tageslimit erreicht (max. 10 Fotos)')
          break
        }

        // Compress
        const compressed = await compressImage(file)
        const formData = new FormData()
        formData.append('photo', compressed, `photo_${Date.now()}.jpg`)
        formData.append('report_id', reportId)

        const res = await fetch('/api/team/reports', {
          method: 'POST',
          headers: { Authorization: headers.Authorization },
          body: formData
        })
        const json = await res.json()
        if (json.photo) {
          setPhotos(prev => [...prev, { url: json.photo, uploaded_at: new Date().toISOString() }])
        }
      }
    } catch (err) {
      alert(err.message)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleDeletePhoto = async (photoUrl) => {
    if (!confirm('Foto löschen?')) return
    try {
      const headers = await getAuthHeaders()
      const res = await fetch(`/api/team/reports?report_id=${report.id}&photo_url=${encodeURIComponent(photoUrl)}`, {
        method: 'DELETE',
        headers,
      })
      if (res.ok) {
        setPhotos(prev => prev.filter(p => p.url !== photoUrl))
      }
    } catch (err) {
      console.error(err)
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-orange-500 border-t-transparent mx-auto"></div>
      </div>
    )
  }

  const isLocked = report?.locked === true

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white">Tagesbericht</h1>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab('today')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            tab === 'today' ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          📝 Heute
        </button>
        <button
          onClick={() => setTab('gallery')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            tab === 'gallery' ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          📸 Galerie
        </button>
      </div>

      {/* Today Tab */}
      {tab === 'today' && (
        <div className="space-y-4">
          {isLocked && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
              <p className="text-yellow-400 text-sm">🔒 Dieser Bericht ist gesperrt und kann nicht mehr bearbeitet werden.</p>
            </div>
          )}

          {/* Text */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <label className="text-white font-semibold">Was wurde heute gemacht?</label>
              {saving && <span className="text-slate-500 text-xs">Speichert...</span>}
            </div>
            <textarea
              value={text}
              onChange={(e) => handleTextChange(e.target.value)}
              disabled={isLocked}
              placeholder="z.B. Badezimmer gefliest, 2. Stock verputzt..."
              rows={4}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder-slate-500 disabled:opacity-50"
            />
          </div>

          {/* Photos */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <label className="text-white font-semibold">Fotos ({photos.length}/10)</label>
              {!isLocked && photos.length < 10 && (
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="px-3 py-1.5 bg-orange-600 text-white rounded-lg text-sm font-semibold hover:bg-orange-500 transition-colors disabled:opacity-50"
                >
                  {uploading ? 'Lädt...' : '📷 Foto hinzufügen'}
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                capture="environment"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </div>

            {photos.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {photos.map((photo, idx) => (
                  <div key={idx} className="relative group">
                    <img
                      src={photo.url}
                      alt={`Foto ${idx + 1}`}
                      className="w-full h-24 object-cover rounded-lg"
                    />
                    {!isLocked && (
                      <button
                        onClick={() => handleDeletePhoto(photo.url)}
                        className="absolute top-1 right-1 bg-red-600 text-white w-6 h-6 rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-sm text-center py-4">Noch keine Fotos heute</p>
            )}
          </div>
        </div>
      )}

      {/* Gallery Tab */}
      {tab === 'gallery' && (
        <div className="space-y-6">
          {allReports.filter(r => r.photos?.length > 0).map(r => (
            <div key={r.id}>
              <h3 className="text-slate-400 text-sm font-semibold mb-2">
                {new Date(r.report_date).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {r.photos.map((photo, idx) => (
                  <img
                    key={idx}
                    src={photo.url}
                    alt=""
                    className="w-full h-24 object-cover rounded-lg"
                  />
                ))}
              </div>
              {r.text && <p className="text-slate-400 text-sm mt-2">{r.text}</p>}
            </div>
          ))}

          {allReports.filter(r => r.photos?.length > 0).length === 0 && (
            <p className="text-slate-500 text-center py-8">Noch keine Fotos vorhanden</p>
          )}
        </div>
      )}
    </div>
  )
}
