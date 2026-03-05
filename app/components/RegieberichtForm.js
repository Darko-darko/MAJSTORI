'use client'
import { useState, useRef, useEffect } from 'react'
import jsPDF from 'jspdf'

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

export default function RegieberichtForm({ majstor, invoiceFormData, onGenerated, onClose }) {
  const today = new Date()

  const [data, setData] = useState({
    datum: today.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    uhrzeit: today.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
    objekt: buildObjekt(invoiceFormData),
    beschreibung: buildBeschreibung(invoiceFormData),
    mieterName: '',
    wohnungsnummer: '',
  })

  const [signatureEmpty, setSignatureEmpty] = useState(true)
  const [generatedFile, setGeneratedFile] = useState(null)
  const canvasRef = useRef(null)
  const isDrawingRef = useRef(false)
  const lastPosRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [])

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
    lastPosRef.current = getPos(e, canvasRef.current)
  }

  const draw = (e) => {
    e.preventDefault()
    if (!isDrawingRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const pos = getPos(e, canvas)
    ctx.beginPath()
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    lastPosRef.current = pos
    setSignatureEmpty(false)
  }

  const endDraw = (e) => {
    e?.preventDefault()
    isDrawingRef.current = false
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setSignatureEmpty(true)
  }

  const generatePDF = () => {
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

    // Signature (Mieter only — right side)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(120, 120, 120)
    doc.text('UNTERSCHRIFT MIETER / BEWOHNER', margin + halfW + 10, y)
    y += 5

    if (!signatureEmpty) {
      const canvas = canvasRef.current
      const sigDataUrl = canvas.toDataURL('image/png')
      doc.addImage(sigDataUrl, 'PNG', margin + halfW + 10, y, halfW, 25)
    }

    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.4)
    doc.line(margin + halfW + 10, y + 27, pageW - margin, y + 27)

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
          <button
            type="button"
            onClick={() => { onGenerated(generatedFile) }}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            ✅ Als Anhang hinzufügen
          </button>
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
            <label className="block text-xs text-slate-400 mb-1">Objekt / Leistungsort</label>
            <input
              type="text"
              value={data.objekt}
              onChange={e => setData(p => ({ ...p, objekt: e.target.value }))}
              placeholder="z.B. Musterstraße 5, 80333 München"
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm placeholder-slate-500"
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

          {/* Canvas Unterschrift */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs text-slate-400">Unterschrift Mieter</label>
              {!signatureEmpty && (
                <button
                  type="button"
                  onClick={clearSignature}
                  className="text-xs text-slate-500 hover:text-red-400"
                >
                  Löschen
                </button>
              )}
            </div>
            <div
              className="bg-white rounded-lg overflow-hidden border border-slate-400"
              style={{ touchAction: 'none' }}
            >
              <canvas
                ref={canvasRef}
                width={600}
                height={130}
                className="w-full block"
                style={{ cursor: 'crosshair' }}
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={endDraw}
                onMouseLeave={endDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={endDraw}
              />
            </div>
            {signatureEmpty && (
              <p className="text-xs text-slate-500 mt-1 text-center">
                Mieter unterschreibt hier mit Finger oder Stift
              </p>
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

          {signatureEmpty && (
            <p className="text-xs text-slate-500 text-center -mt-1">
              Ohne Unterschrift wird das PDF trotzdem erstellt
            </p>
          )}
        </div>
      )}
    </div>
  )
}
