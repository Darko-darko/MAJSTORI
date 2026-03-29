// app/components/WorkerBerichteTab.js — Regiebericht Tab für Worker Dashboard
'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

export default function WorkerBerichteTab({ worker }) {
  const [berichte, setBerichte] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [expandedId, setExpandedId] = useState(null)

  // Form state
  const today = new Date()
  const [formData, setFormData] = useState({
    datum: today.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    uhrzeit: today.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
    objekt: '',
    beschreibung: '',
    mieterName: '',
    wohnungsnummer: '',
  })
  const [saving, setSaving] = useState(false)

  // Signature state
  const [signatureDataUrl, setSignatureDataUrl] = useState(null)
  const [signatureRawDataUrl, setSignatureRawDataUrl] = useState(null)
  const [showSignatureModal, setShowSignatureModal] = useState(false)
  const fullscreenCanvasRef = useRef(null)
  const isDrawingRef = useRef(false)
  const lastPosRef = useRef({ x: 0, y: 0 })
  const hasDrawnRef = useRef(false)

  useEffect(() => { loadBerichte() }, [])

  useEffect(() => {
    if (!showSignatureModal) return
    const timer = setTimeout(() => {
      const canvas = fullscreenCanvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      ctx.strokeStyle = '#1e293b'
      ctx.lineWidth = 3
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      hasDrawnRef.current = false
      if (signatureRawDataUrl) {
        const img = new Image()
        img.onload = () => {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
          hasDrawnRef.current = true
        }
        img.src = signatureRawDataUrl
      }
    }, 50)
    return () => clearTimeout(timer)
  }, [showSignatureModal])

  const getHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return { Authorization: `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' }
  }

  const loadBerichte = async () => {
    try {
      const headers = await getHeaders()
      const res = await fetch('/api/regieberichte', { headers })
      const json = await res.json()
      if (json.regieberichte) setBerichte(json.regieberichte)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  // Canvas drawing
  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if (e.touches) {
      return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY }
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY }
  }

  const startDraw = (e) => { e.preventDefault(); isDrawingRef.current = true; lastPosRef.current = getPos(e, fullscreenCanvasRef.current) }
  const draw = (e) => {
    e.preventDefault()
    if (!isDrawingRef.current) return
    const canvas = fullscreenCanvasRef.current
    const ctx = canvas.getContext('2d')
    const pos = getPos(e, canvas)
    ctx.beginPath()
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    lastPosRef.current = pos
    hasDrawnRef.current = true
  }
  const endDraw = (e) => { e?.preventDefault(); isDrawingRef.current = false }

  const clearFullSignature = () => {
    const canvas = fullscreenCanvasRef.current
    if (!canvas) return
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
    hasDrawnRef.current = false
  }

  const confirmSignature = () => {
    const canvas = fullscreenCanvasRef.current
    if (!canvas || !hasDrawnRef.current) {
      setSignatureDataUrl(null)
      setSignatureRawDataUrl(null)
      setShowSignatureModal(false)
      return
    }
    // Rotate 90° CW for PDF
    const rotated = document.createElement('canvas')
    rotated.width = canvas.height
    rotated.height = canvas.width
    const rctx = rotated.getContext('2d')
    rctx.translate(0, canvas.width)
    rctx.rotate(-Math.PI / 2)
    rctx.drawImage(canvas, 0, 0)

    setSignatureDataUrl(rotated.toDataURL('image/png'))
    setSignatureRawDataUrl(canvas.toDataURL('image/png'))
    setShowSignatureModal(false)
  }

  // Generate PDF blob (same layout as RegieberichtForm)
  const generatePDFBlob = async () => {
    const { default: jsPDF } = await import('jspdf')
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const pageW = 210, margin = 20, colW = pageW - 2 * margin, halfW = colW / 2 - 5
    let y = 20

    // Title
    doc.setFontSize(20); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 64, 175)
    doc.text('REGIEBERICHT', pageW / 2, y, { align: 'center' })
    y += 4
    doc.setDrawColor(30, 64, 175); doc.setLineWidth(0.8)
    doc.line(margin, y + 2, pageW - margin, y + 2)
    y += 10

    // Auftragnehmer
    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(120, 120, 120)
    doc.text('AUFTRAGNEHMER', margin, y)
    y += 5
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(30, 30, 30)
    const auftragnehmer = [worker?.full_name || '', worker?.business_name || ''].filter(Boolean)
    auftragnehmer.forEach((line, i) => doc.text(line, margin, y + i * 5.5))
    y += auftragnehmer.length * 5.5 + 8

    // Divider
    doc.setDrawColor(220, 220, 220); doc.setLineWidth(0.3)
    doc.line(margin, y, pageW - margin, y)
    y += 7

    // Objekt + Datum + Uhrzeit
    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(120, 120, 120)
    doc.text('OBJEKT / LEISTUNGSORT', margin, y)
    doc.text('DATUM', margin + halfW + 10, y)
    doc.text('UHRZEIT', pageW - margin - 22, y)
    y += 5
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(30, 30, 30)
    const objektLines = doc.splitTextToSize(formData.objekt || '—', halfW)
    doc.text(objektLines, margin, y)
    doc.text(formData.datum || '—', margin + halfW + 10, y)
    doc.text(formData.uhrzeit || '—', pageW - margin - 22, y)
    y += Math.max(objektLines.length, 1) * 5.5 + 8

    doc.setDrawColor(220, 220, 220); doc.line(margin, y, pageW - margin, y); y += 7

    // Arbeiten
    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(120, 120, 120)
    doc.text('DURCHGEFÜHRTE ARBEITEN', margin, y); y += 5
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(30, 30, 30)
    const arbeitenLines = doc.splitTextToSize(formData.beschreibung || '—', colW)
    doc.text(arbeitenLines, margin, y)
    y += arbeitenLines.length * 5.5 + 8

    doc.setDrawColor(220, 220, 220); doc.line(margin, y, pageW - margin, y); y += 7

    // Mieter + Wohnung
    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(120, 120, 120)
    doc.text('MIETER / BEWOHNER', margin, y)
    doc.text('WOHNUNGSNR.', margin + halfW + 10, y); y += 5
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(30, 30, 30)
    doc.text(formData.mieterName || '—', margin, y)
    doc.text(formData.wohnungsnummer || '—', margin + halfW + 10, y)
    y += 12

    doc.setDrawColor(220, 220, 220); doc.line(margin, y, pageW - margin, y); y += 7

    // Signature
    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(120, 120, 120)
    doc.text('UNTERSCHRIFT MIETER / BEWOHNER', margin + halfW + 10, y); y += 5
    if (signatureDataUrl) {
      doc.addImage(signatureDataUrl, 'PNG', margin + halfW + 10, y, halfW, 35)
    }
    doc.setDrawColor(0, 0, 0); doc.setLineWidth(0.4)
    doc.line(margin + halfW + 10, y + 37, pageW - margin, y + 37)

    // Footer
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(180, 180, 180)
    doc.text(`Erstellt mit Pro-Meister.de · ${formData.datum}`, pageW / 2, 288, { align: 'center' })

    return doc.output('blob')
  }

  // Save: upload signature + PDF to storage, create DB record
  const handleSave = async () => {
    if (!formData.objekt?.trim()) {
      alert('Bitte Objekt / Leistungsort eingeben')
      return
    }
    setSaving(true)
    try {
      const headers = await getHeaders()
      const { data: { session } } = await supabase.auth.getSession()

      // Upload signature if exists
      let signatureStorageUrl = null
      if (signatureDataUrl) {
        const [header, base64] = signatureDataUrl.split(',')
        const mime = header.match(/:(.*?);/)[1]
        const binary = atob(base64)
        const arr = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i)
        const blob = new Blob([arr], { type: mime })
        const sigPath = `${session.user.id}/${Date.now()}_signature.png`
        const { error: sigErr } = await supabase.storage.from('regieberichte').upload(sigPath, blob, { contentType: 'image/png' })
        if (!sigErr) {
          const { data: { publicUrl } } = supabase.storage.from('regieberichte').getPublicUrl(sigPath)
          signatureStorageUrl = publicUrl
        }
      }

      // Generate and upload PDF
      const pdfBlob = await generatePDFBlob()
      const safeName = (formData.mieterName || 'Bericht').replace(/[^a-zA-Z0-9äöüÄÖÜß]/g, '_')
      const pdfFileName = `Regiebericht_${formData.datum.replace(/\./g, '-')}_${safeName}.pdf`
      const pdfPath = `${session.user.id}/${Date.now()}_${pdfFileName}`
      let pdfStorageUrl = null

      const { error: pdfErr } = await supabase.storage.from('regieberichte').upload(pdfPath, pdfBlob, { contentType: 'application/pdf' })
      if (!pdfErr) {
        const { data: { publicUrl } } = supabase.storage.from('regieberichte').getPublicUrl(pdfPath)
        pdfStorageUrl = publicUrl
      }

      // Parse datum from DD.MM.YYYY to YYYY-MM-DD for DB
      const datumParts = formData.datum.split('.')
      const datumISO = datumParts.length === 3 ? `${datumParts[2]}-${datumParts[1]}-${datumParts[0]}` : new Date().toISOString().split('T')[0]

      // Save to DB
      const res = await fetch('/api/regieberichte', {
        method: 'POST', headers,
        body: JSON.stringify({
          datum: datumISO,
          uhrzeit: formData.uhrzeit,
          objekt: formData.objekt.trim(),
          beschreibung: formData.beschreibung.trim(),
          mieter_name: formData.mieterName.trim(),
          wohnungsnummer: formData.wohnungsnummer.trim(),
          signature_url: signatureStorageUrl,
          pdf_url: pdfStorageUrl,
        })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)

      // Reset form and reload
      setFormData({
        datum: new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        uhrzeit: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
        objekt: '', beschreibung: '', mieterName: '', wohnungsnummer: '',
      })
      setSignatureDataUrl(null)
      setSignatureRawDataUrl(null)
      setShowForm(false)
      await loadBerichte()
    } catch (err) { alert(err.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Regiebericht wirklich löschen?')) return
    try {
      const headers = await getHeaders()
      await fetch('/api/regieberichte', {
        method: 'DELETE', headers,
        body: JSON.stringify({ id })
      })
      await loadBerichte()
    } catch (err) { alert(err.message) }
  }

  const formatDate = (iso) => new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-purple-500 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <>
      {/* Fullscreen signature modal */}
      {showSignatureModal && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ touchAction: 'none', backgroundColor: '#ffffff' }}>
          <div className="flex items-center justify-between px-4 py-2 border-b shrink-0" style={{ backgroundColor: '#f1f5f9', borderColor: '#e2e8f0' }}>
            <span className="font-semibold text-sm" style={{ color: '#1e293b' }}>✍️ Unterschrift</span>
            <button type="button" onClick={() => setShowSignatureModal(false)} className="text-slate-500 hover:text-slate-800 text-2xl leading-none w-8 h-8 flex items-center justify-center">×</button>
          </div>
          <div className="px-4 py-2 border-b shrink-0" style={{ backgroundColor: '#eff6ff', borderColor: '#dbeafe' }}>
            <p className="text-blue-600 text-xs text-center">Kunde unterschreibt hier mit Finger oder Stift · Gerät quer halten für mehr Platz</p>
          </div>
          <div className="flex-1 flex flex-row min-h-0 overflow-hidden p-3 gap-3">
            <div className="flex flex-col gap-3 justify-center shrink-0" style={{ width: 64 }}>
              <button type="button" onClick={clearFullSignature} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium text-sm transition-colors" style={{ writingMode: 'vertical-lr', minHeight: 80 }}>
                <span style={{ display: 'inline-block', transform: 'rotate(90deg)' }}>🗑</span> Löschen
              </button>
              <button type="button" onClick={confirmSignature} className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-sm transition-colors" style={{ writingMode: 'vertical-lr', minHeight: 120 }}>
                <span style={{ display: 'inline-block', transform: 'rotate(90deg)' }}>✅</span> Bestätigen
              </button>
            </div>
            <canvas
              ref={fullscreenCanvasRef} width={500} height={900}
              className="border-2 border-dashed border-slate-300 rounded-xl"
              style={{ backgroundColor: '#ffffff', cursor: 'crosshair', touchAction: 'none', display: 'block', height: '100%', width: 'auto', maxWidth: 'calc(100% - 76px)' }}
              onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
              onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw}
            />
          </div>
        </div>
      )}

      {/* Create button */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold hover:from-blue-500 hover:to-indigo-500 transition-all"
        >
          + Neuer Regiebericht
        </button>
      )}

      {/* Create form */}
      {showForm && (
        <div className="bg-slate-800/50 border border-blue-500/30 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-white font-semibold text-sm">📋 Neuer Regiebericht</span>
            <button onClick={() => setShowForm(false)} className="text-slate-500 hover:text-slate-300 text-xl leading-none px-1">×</button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Datum</label>
              <input type="text" value={formData.datum} onChange={e => setFormData(p => ({ ...p, datum: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Uhrzeit</label>
              <input type="text" value={formData.uhrzeit} onChange={e => setFormData(p => ({ ...p, uhrzeit: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm" />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Objekt / Leistungsort *</label>
            <input type="text" value={formData.objekt} onChange={e => setFormData(p => ({ ...p, objekt: e.target.value }))}
              placeholder="z.B. Musterstraße 5, 80333 München"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500" />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Durchgeführte Arbeiten</label>
            <textarea value={formData.beschreibung} onChange={e => setFormData(p => ({ ...p, beschreibung: e.target.value }))}
              rows={3} placeholder="Beschreibung der Arbeiten..."
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm resize-none placeholder-slate-500" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Mieter / Bewohner</label>
              <input type="text" value={formData.mieterName} onChange={e => setFormData(p => ({ ...p, mieterName: e.target.value }))}
                placeholder="Name" className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Wohnung</label>
              <input type="text" value={formData.wohnungsnummer} onChange={e => setFormData(p => ({ ...p, wohnungsnummer: e.target.value }))}
                placeholder="z.B. 2. OG links" className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500" />
            </div>
          </div>

          {/* Signature */}
          <div>
            <label className="block text-xs text-slate-400 mb-1">Unterschrift Kunde</label>
            {signatureDataUrl ? (
              <div className="relative group cursor-pointer" onClick={() => setShowSignatureModal(true)}>
                <img src={signatureDataUrl} alt="Unterschrift" className="w-full h-20 object-contain rounded-lg border border-slate-400" style={{ backgroundColor: '#ffffff' }} />
                <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/0 hover:bg-black/10 active:bg-black/20 transition-colors">
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 text-slate-700 text-xs px-2 py-1 rounded shadow">✏️ Ändern</span>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setShowSignatureModal(true)}
                className="w-full h-20 rounded-lg border-2 border-dashed border-slate-400 hover:border-blue-400 active:border-blue-500 flex items-center justify-center transition-colors" style={{ backgroundColor: '#ffffff' }}>
                <div className="text-center pointer-events-none">
                  <div className="text-2xl mb-0.5">✍️</div>
                  <div className="text-slate-500 text-xs">Tippen zum Unterschreiben</div>
                </div>
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-colors disabled:opacity-50">
              {saving ? '...' : '📋 Speichern'}
            </button>
            <button onClick={() => { setShowForm(false); setSignatureDataUrl(null); setSignatureRawDataUrl(null) }}
              className="px-4 py-2.5 bg-slate-700 text-slate-300 rounded-lg text-sm">Abbrechen</button>
          </div>
        </div>
      )}

      {/* List */}
      {berichte.length > 0 ? (
        <div className="space-y-2">
          {berichte.map(b => (
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
                    <p className="text-slate-500 text-xs">{formatDate(b.datum)} {b.uhrzeit && `· ${b.uhrzeit}`}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {b.status === 'signed' && <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-0.5 rounded">Unterschrieben</span>}
                    {b.status === 'attached' && <span className="bg-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded">An Rechnung</span>}
                    {b.status === 'draft' && <span className="bg-slate-500/20 text-slate-400 text-xs px-2 py-0.5 rounded">Entwurf</span>}
                  </div>
                </div>
                {b.mieter_name && <p className="text-slate-400 text-xs ml-10">Mieter: {b.mieter_name}</p>}
              </div>

              {expandedId === b.id && (
                <div className="border-t border-slate-700/50 p-4 space-y-2">
                  {b.beschreibung && (
                    <div>
                      <p className="text-slate-500 text-xs font-semibold mb-1">Arbeiten:</p>
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
                  <div className="flex gap-2 pt-2">
                    {b.pdf_url && (
                      <a href={b.pdf_url} target="_blank" rel="noopener noreferrer"
                        className="px-3 py-2 bg-slate-700 text-white rounded-lg text-xs hover:bg-slate-600 transition-colors">
                        📄 PDF öffnen
                      </a>
                    )}
                    <button onClick={() => handleDelete(b.id)}
                      className="px-3 py-2 bg-red-900/30 text-red-400 rounded-lg text-xs hover:bg-red-900/50 transition-colors">
                      🗑 Löschen
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : !showForm && (
        <div className="text-center py-8 text-slate-500">
          <p className="text-4xl mb-3">📋</p>
          <p>Noch keine Regieberichte</p>
          <p className="text-sm mt-1">Erstellen Sie einen Bericht nach getaner Arbeit</p>
        </div>
      )}
    </>
  )
}
