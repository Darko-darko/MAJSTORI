'use client'
import { useState, useRef, useEffect } from 'react'
// jsPDF loaded dynamically on demand (saves ~564 KB initial bundle)

function buildObjekt(fd) {
  if (fd?.weg_street) {
    const parts = [
      fd.weg_property_name,
      fd.weg_street,
      `${fd.weg_postal_code || ''} ${fd.weg_city || ''}`.trim(),
      fd.weg_country && fd.weg_country !== 'Deutschland' ? fd.weg_country : '',
    ].filter(Boolean)
    return parts.join(', ')
  }
  return fd?.place_of_service || ''
}

function buildBeschreibung(fd) {
  if (!fd?.items) return ''
  return fd.items
    .filter(i => i.description?.trim())
    .map(i => {
      const qty = i.quantity !== 1 ? `${i.quantity}× ` : ''
      const unit = i.unit ? ` ${i.unit}` : ''
      return `${qty}${i.description}${unit}`
    })
    .join('\n')
}

export default function RegieberichtForm({ majstor, invoiceFormData, onGenerated, onSaveOnly, onClose }) {
  const today = new Date()

  const [data, setData] = useState({
    datum: today.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    uhrzeit: today.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
    objekt: buildObjekt(invoiceFormData),
    beschreibung: buildBeschreibung(invoiceFormData),
    mieterName: '',
    wohnungsnummer: '',
  })

  const [signatureDataUrl, setSignatureDataUrl] = useState(null)
  const [signatureRawDataUrl, setSignatureRawDataUrl] = useState(null)
  const [showSignatureModal, setShowSignatureModal] = useState(false)
  const [generatedFile, setGeneratedFile] = useState(null)

  // Fullscreen canvas refs
  const fullscreenCanvasRef = useRef(null)
  const isDrawingRef = useRef(false)
  const lastPosRef = useRef({ x: 0, y: 0 })
  const hasDrawnRef = useRef(false)

  useEffect(() => {
    if (!showSignatureModal) return
    // Small delay to ensure canvas is mounted
    const timer = setTimeout(() => {
      const canvas = fullscreenCanvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      ctx.strokeStyle = '#1e293b'
      ctx.lineWidth = 3
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      hasDrawnRef.current = false
      // Restore existing unrotated signature if any
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

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if (e.touches) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      }
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  const startDraw = (e) => {
    e.preventDefault()
    isDrawingRef.current = true
    lastPosRef.current = getPos(e, fullscreenCanvasRef.current)
  }

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

  const endDraw = (e) => {
    e?.preventDefault()
    isDrawingRef.current = false
  }

  const clearFullSignature = () => {
    const canvas = fullscreenCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
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

    // Rotate 90° clockwise: landscape drawing → portrait-friendly for PDF right-side area
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

  const [validationError, setValidationError] = useState('')

  const generatePDF = async () => {
    if (!data.objekt?.trim()) {
      setValidationError('Objekt / Leistungsort ist ein Pflichtfeld')
      return
    }
    setValidationError('')
    const { default: jsPDF } = await import('jspdf')
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const pageW = 210
    const margin = 20
    const colW = pageW - 2 * margin
    const halfW = colW / 2 - 5
    let y = 20

    // Title
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 64, 175)
    doc.text('REGIEBERICHT', pageW / 2, y, { align: 'center' })
    y += 4

    doc.setDrawColor(30, 64, 175)
    doc.setLineWidth(0.8)
    doc.line(margin, y + 2, pageW - margin, y + 2)
    y += 10

    // Auftragnehmer | Auftraggeber
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(120, 120, 120)
    doc.text('AUFTRAGNEHMER', margin, y)
    doc.text('AUFTRAGGEBER', margin + halfW + 10, y)
    y += 5

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(30, 30, 30)

    const auftragnehmer = [
      majstor?.business_name || majstor?.full_name || '',
      majstor?.address || '',
      majstor?.city || '',
      majstor?.phone ? `Tel: ${majstor.phone}` : '',
      majstor?.business_email || majstor?.email || '',
    ].filter(Boolean)

    const auftraggeber = [
      invoiceFormData?.customer_name || '',
      invoiceFormData?.customer_street || '',
      `${invoiceFormData?.customer_postal_code || ''} ${invoiceFormData?.customer_city || ''}`.trim(),
      invoiceFormData?.customer_phone ? `Tel: ${invoiceFormData.customer_phone}` : '',
    ].filter(Boolean)

    const maxLines = Math.max(auftragnehmer.length, auftraggeber.length)
    for (let i = 0; i < maxLines; i++) {
      if (auftragnehmer[i]) doc.text(auftragnehmer[i], margin, y + i * 5.5)
      if (auftraggeber[i]) doc.text(auftraggeber[i], margin + halfW + 10, y + i * 5.5)
    }
    y += maxLines * 5.5 + 8

    // Divider
    doc.setDrawColor(220, 220, 220)
    doc.setLineWidth(0.3)
    doc.line(margin, y, pageW - margin, y)
    y += 7

    // Objekt + Datum + Uhrzeit
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(120, 120, 120)
    doc.text('OBJEKT / LEISTUNGSORT', margin, y)
    doc.text('DATUM', margin + halfW + 10, y)
    doc.text('UHRZEIT', pageW - margin - 22, y)
    y += 5

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(30, 30, 30)
    const objektLines = doc.splitTextToSize(data.objekt || '—', halfW)
    doc.text(objektLines, margin, y)
    doc.text(data.datum || '—', margin + halfW + 10, y)
    doc.text(data.uhrzeit || '—', pageW - margin - 22, y)
    y += Math.max(objektLines.length, 1) * 5.5 + 8

    // Divider
    doc.setDrawColor(220, 220, 220)
    doc.line(margin, y, pageW - margin, y)
    y += 7

    // Durchgeführte Arbeiten
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(120, 120, 120)
    doc.text('DURCHGEFÜHRTE ARBEITEN', margin, y)
    y += 5

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(30, 30, 30)
    const arbeitenLines = doc.splitTextToSize(data.beschreibung || '—', colW)
    doc.text(arbeitenLines, margin, y)
    y += arbeitenLines.length * 5.5 + 8

    // Divider
    doc.setDrawColor(220, 220, 220)
    doc.line(margin, y, pageW - margin, y)
    y += 7

    // Mieter + Wohnungsnr
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(120, 120, 120)
    doc.text('MIETER / BEWOHNER', margin, y)
    doc.text('WOHNUNGSNR.', margin + halfW + 10, y)
    y += 5

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(30, 30, 30)
    doc.text(data.mieterName || '—', margin, y)
    doc.text(data.wohnungsnummer || '—', margin + halfW + 10, y)
    y += 12

    // Divider
    doc.setDrawColor(220, 220, 220)
    doc.line(margin, y, pageW - margin, y)
    y += 7

    // Signature (right side only)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(120, 120, 120)
    doc.text('UNTERSCHRIFT MIETER / BEWOHNER', margin + halfW + 10, y)
    y += 5

    if (signatureDataUrl) {
      doc.addImage(signatureDataUrl, 'PNG', margin + halfW + 10, y, halfW, 35)
    }

    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.4)
    doc.line(margin + halfW + 10, y + 37, pageW - margin, y + 37)

    // Footer
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(180, 180, 180)
    doc.text(`Erstellt mit Pro-Meister.de · ${data.datum}`, pageW / 2, 288, { align: 'center' })

    const pdfBlob = doc.output('blob')
    const safeName = (data.mieterName || 'Mieter').replace(/[^a-zA-Z0-9äöüÄÖÜß]/g, '_')
    const fileName = `Regiebericht_${data.datum.replace(/\./g, '-')}_${safeName}.pdf`
    const file = new File([pdfBlob], fileName, { type: 'application/pdf' })

    setGeneratedFile(file)
  }

  return (
    <>
      {/* Fullscreen signature modal */}
      {showSignatureModal && (
        <div
          className="fixed inset-0 z-50 flex flex-col"
          style={{ touchAction: 'none', backgroundColor: '#ffffff' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2 border-b shrink-0" style={{ backgroundColor: '#f1f5f9', borderColor: '#e2e8f0' }}>
            <span className="font-semibold text-sm" style={{ color: '#1e293b' }}>✍️ Unterschrift</span>
            <button
              type="button"
              onClick={() => setShowSignatureModal(false)}
              className="text-slate-500 hover:text-slate-800 text-2xl leading-none w-8 h-8 flex items-center justify-center"
            >
              ×
            </button>
          </div>

          {/* Hint */}
          <div className="px-4 py-2 border-b shrink-0" style={{ backgroundColor: '#eff6ff', borderColor: '#dbeafe' }}>
            <p className="text-blue-600 text-xs text-center">
              Mieter unterschreibt hier mit Finger oder Stift &nbsp;·&nbsp; Gerät quer halten für mehr Platz
            </p>
          </div>

          {/* Buttons left (rotated 90°) + canvas right — reads correctly when phone turned landscape */}
          <div className="flex-1 flex flex-row min-h-0 overflow-hidden p-3 gap-3">

            {/* Buttons on left side, rotated 90° — readable when phone turned landscape */}
            <div className="flex flex-col gap-3 justify-center shrink-0" style={{ width: 64 }}>
              <button
                type="button"
                onClick={clearFullSignature}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium text-sm transition-colors"
                style={{ writingMode: 'vertical-lr', minHeight: 80 }}
              >
                <span style={{ display: 'inline-block', transform: 'rotate(90deg)' }}>🗑</span> Löschen
              </button>
              <button
                type="button"
                onClick={confirmSignature}
                className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-sm transition-colors"
                style={{ writingMode: 'vertical-lr', minHeight: 120 }}
              >
                <span style={{ display: 'inline-block', transform: 'rotate(90deg)' }}>✅</span> Bestätigen
              </button>
            </div>

            {/* Canvas fills full height on the right */}
            <canvas
              ref={fullscreenCanvasRef}
              width={500}
              height={900}
              className="border-2 border-dashed border-slate-300 rounded-xl"
              style={{
                backgroundColor: '#ffffff',
                cursor: 'crosshair',
                touchAction: 'none',
                display: 'block',
                height: '100%',
                width: 'auto',
                maxWidth: 'calc(100% - 76px)',
              }}
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={endDraw}
              onMouseLeave={endDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={endDraw}
            />

          </div>
        </div>
      )}

      {/* Main form */}
      <div className="bg-slate-800/80 border border-blue-500/30 rounded-lg p-4 mt-2">
        <div className="flex items-center justify-between mb-4">
          <span className="text-white font-medium text-sm">📋 Regiebericht erstellen</span>
          <button type="button" onClick={onClose} className="text-slate-500 hover:text-slate-300 text-xl leading-none px-1">×</button>
        </div>

        {generatedFile ? (
          <div className="space-y-3 py-2">
            <p className="text-green-400 font-medium text-sm text-center">✅ Regiebericht wurde erstellt</p>
            <p className="text-slate-400 text-xs text-center truncate">📄 {generatedFile.name}</p>
            <button
              type="button"
              onClick={() => {
                const url = URL.createObjectURL(generatedFile)
                const a = document.createElement('a')
                a.href = url
                a.target = '_blank'
                document.body.appendChild(a)
                a.click()
                document.body.removeChild(a)
              }}
              className="w-full py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              👁 Vorschau öffnen
            </button>
            {onGenerated && (
              <button
                type="button"
                onClick={() => { onGenerated(generatedFile, { ...data, signatureDataUrl }) }}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                ✅ Als Anhang hinzufügen
              </button>
            )}
            {onSaveOnly && (
              <button
                type="button"
                onClick={() => { onSaveOnly(generatedFile, { ...data, signatureDataUrl }) }}
                className={`w-full py-2.5 ${onGenerated ? 'bg-slate-700 hover:bg-slate-600' : 'bg-green-600 hover:bg-green-700'} text-white rounded-lg text-sm font-medium transition-colors`}
              >
                {onGenerated ? '💾 Nur speichern (ohne Anhang)' : '✅ Regiebericht speichern'}
              </button>
            )}
            <button
              type="button"
              onClick={() => setGeneratedFile(null)}
              className="w-full text-xs text-slate-500 hover:text-slate-300 underline"
            >
              ✏️ Bearbeiten
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Datum + Uhrzeit */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Datum</label>
                <input
                  type="text"
                  value={data.datum}
                  onChange={e => setData(p => ({ ...p, datum: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Uhrzeit</label>
                <input
                  type="text"
                  value={data.uhrzeit}
                  onChange={e => setData(p => ({ ...p, uhrzeit: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                />
              </div>
            </div>

            {/* Objekt */}
            <div>
              <label className="block text-xs text-slate-400 mb-1">Objekt / Leistungsort <span className="text-red-400">*</span></label>
              <input
                type="text"
                value={data.objekt}
                onChange={e => { setData(p => ({ ...p, objekt: e.target.value })); setValidationError('') }}
                placeholder="z.B. Musterstraße 5, 80333 München"
                className={`w-full px-3 py-2 bg-slate-700 border rounded text-white text-sm placeholder-slate-500 ${validationError && !data.objekt?.trim() ? 'border-red-500' : 'border-slate-600'}`}
              />
            </div>

            {/* Arbeiten */}
            <div>
              <label className="block text-xs text-slate-400 mb-1">Durchgeführte Arbeiten</label>
              <textarea
                value={data.beschreibung}
                onChange={e => setData(p => ({ ...p, beschreibung: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm resize-none"
              />
            </div>

            {/* Mieter + Wohnung */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Mieter / Bewohner</label>
                <input
                  type="text"
                  value={data.mieterName}
                  onChange={e => setData(p => ({ ...p, mieterName: e.target.value }))}
                  placeholder="Name des Mieters"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm placeholder-slate-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Wohnung</label>
                <input
                  type="text"
                  value={data.wohnungsnummer}
                  onChange={e => setData(p => ({ ...p, wohnungsnummer: e.target.value }))}
                  placeholder="z.B. 2. OG links"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm placeholder-slate-500"
                />
              </div>
            </div>

            {/* Signature — tap to open fullscreen */}
            <div>
              <label className="block text-xs text-slate-400 mb-1">Unterschrift Mieter</label>
              {signatureDataUrl ? (
                <div className="relative group">
                  <img
                    src={signatureDataUrl}
                    alt="Unterschrift"
                    className="w-full h-20 object-contain rounded-lg border border-slate-400"
                    style={{ backgroundColor: '#ffffff' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignatureModal(true)}
                    className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/0 hover:bg-black/10 active:bg-black/20 transition-colors"
                  >
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 text-slate-700 text-xs px-2 py-1 rounded shadow">
                      ✏️ Ändern
                    </span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowSignatureModal(true)}
                  className="w-full h-20 rounded-lg border-2 border-dashed border-slate-400 hover:border-blue-400 active:border-blue-500 flex items-center justify-center transition-colors"
                  style={{ backgroundColor: '#ffffff' }}
                >
                  <div className="text-center pointer-events-none">
                    <div className="text-2xl mb-0.5">✍️</div>
                    <div className="text-slate-500 text-xs">Tippen zum Unterschreiben</div>
                  </div>
                </button>
              )}
            </div>

            {/* Generate */}
            <button
              type="button"
              onClick={generatePDF}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              📄 Regiebericht erstellen &amp; anhängen
            </button>

            {validationError && (
              <p className="text-xs text-red-400 text-center -mt-1">{validationError}</p>
            )}
            {!signatureDataUrl && !validationError && (
              <p className="text-xs text-slate-500 text-center -mt-1">
                Ohne Unterschrift wird das PDF trotzdem erstellt
              </p>
            )}
          </div>
        )}
      </div>
    </>
  )
}
