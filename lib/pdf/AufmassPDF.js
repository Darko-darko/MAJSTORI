import jsPDF from 'jspdf'

/**
 * Generiše Aufmaß PDF i pokreće download.
 */
export async function generateAufmassPDF(aufmass, majstor, signatureDataUrl = null) {
  const doc = buildDoc(aufmass, majstor, signatureDataUrl, true)
  const blob = doc.output('blob')
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}

/**
 * Generiše Aufmaß PDF i vraća Blob (za attachment u InvoiceCreator).
 */
export async function generateAufmassPDFBlob(aufmass, majstor) {
  const doc = buildDoc(aufmass, majstor, null, false)
  return doc.output('blob')
}

// ─── Core builder ─────────────────────────────────────────────────────────────

function buildDoc(aufmass, majstor, signatureDataUrl, includeSignatureSection) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = 210
  const pageH = 297
  const margin = 15
  const contentW = pageW - margin * 2

  let y = margin

  const checkBreak = (needed = 10) => {
    if (y + needed > pageH - 20) {
      doc.addPage()
      y = margin
    }
  }

  // --- HEADER ---
  const businessName = majstor?.business_name || majstor?.full_name || ''
  const addressLine = [majstor?.address, majstor?.city].filter(Boolean).join(', ')
  const contactLine = [majstor?.phone, majstor?.email].filter(Boolean).join(' · ')

  if (businessName) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(30)
    doc.text(businessName, margin, y)
    y += 5
  }
  if (addressLine || contactLine) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(100)
    if (addressLine) { doc.text(addressLine, margin, y); y += 4 }
    if (contactLine) { doc.text(contactLine, margin, y); y += 4 }
  }

  y += 2
  doc.setDrawColor(200)
  doc.line(margin, y, pageW - margin, y)
  y += 6

  // --- TITLE ---
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30)
  doc.text('AUFMASS', margin, y)
  y += 8

  // Meta
  const metaItems = [
    ['Bauvorhaben', aufmass.title],
    ['Datum', formatDate(aufmass.date)],
    aufmass.customer_name ? ['Kunde', aufmass.customer_name] : null,
  ].filter(Boolean)

  for (const [label, value] of metaItems) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(80)
    doc.text(label + ':', margin, y)
    doc.setFont('helvetica', 'normal')
    doc.text(value, margin + 28, y)
    y += 5
  }
  y += 4

  // --- ROOMS ---
  const rooms = aufmass.rooms || []

  for (const room of rooms) {
    checkBreak(20)

    // Room header bar
    doc.setFillColor(240, 240, 240)
    doc.rect(margin, y - 4, contentW, 7, 'F')
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30)
    doc.text(room.name || 'Raum', margin + 2, y)
    y += 6

    const items = room.items || []
    if (items.length === 0) {
      doc.setFontSize(8)
      doc.setFont('helvetica', 'italic')
      doc.setTextColor(150)
      doc.text('Keine Positionen erfasst', margin + 2, y)
      y += 6
      continue
    }

    // Table header
    const col = { bez: margin, ber: margin + 68, ein: margin + 120, erg: margin + 148 }
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(80)
    doc.text('Bezeichnung', col.bez, y)
    doc.text('Berechnung', col.ber, y)
    doc.text('Einheit', col.ein, y)
    doc.text('Ergebnis', col.erg, y, { align: 'left' })
    y += 1
    doc.setDrawColor(180)
    doc.line(margin, y, pageW - margin, y)
    y += 4

    // Table rows
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(30)

    for (const item of items) {
      checkBreak(6)
      const isAbzug = !!item.subtract
      const isForm = !!item.isForm
      const desc = (item.description || '—') + (isAbzug ? ' (Abzug)' : isForm ? ' (Ergänzung)' : '')
      const calc = (item.calculation || '-').replace(/π/g, 'pi')
      const unit = (item.unit === 'Wand' || item.unit === 'Bogen' || item.unit === 'Trap') ? 'm²' : (item.unit || '')
      const resultStr = item.result != null ? (isAbzug ? `- ${formatNum(item.result)}` : isForm ? `+ ${formatNum(item.result)}` : formatNum(item.result)) : '-'

      const descLines = doc.splitTextToSize(desc, 60)
      doc.setFontSize(9)
      if (isAbzug) doc.setTextColor(200, 80, 50)
      else if (isForm) doc.setTextColor(0, 140, 120)
      else doc.setTextColor(30)
      doc.text(descLines, col.bez, y)
      if (!isAbzug && !isForm) doc.setTextColor(30)
      doc.text(calc, col.ber, y)
      doc.text(unit, col.ein, y)
      doc.text(resultStr, col.erg, y)
      doc.setTextColor(30)

      const rowH = Math.max(descLines.length * 5, 9)
      doc.setDrawColor(220)
      doc.line(margin, y + rowH - 6, pageW - margin, y + rowH - 6)
      y += rowH
    }

    // Netto line if room has subtract or form items
    const subtractItems = items.filter(i => (i.subtract || i.isForm) && i.result != null)
    if (subtractItems.length > 0) {
      const nettoByUnit = {}
      for (const item of items) {
        if (item.result == null) continue
        const u = (item.unit === 'Wand' || item.unit === 'Bogen' || item.unit === 'Trap') ? 'm²' : item.unit
        if (!u) continue
        const sign = item.subtract ? -1 : 1
        nettoByUnit[u] = (nettoByUnit[u] || 0) + item.result * sign
      }
      checkBreak(7)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(30)
      doc.text('Netto:', col.ber, y)
      const nettoStr = Object.entries(nettoByUnit)
        .filter(([, v]) => Math.abs(v) > 0.001)
        .map(([u, v]) => `${formatNum(v)} ${u}`)
        .join(' | ')
      doc.text(nettoStr, col.erg, y)
      doc.setFont('helvetica', 'normal')
      y += 6
    }

    y += 3

    // --- SKETCH (forms integrated above rect in drawRoomSketch) ---
    if (hasSketchData(room)) {
      checkBreak(100)
      y += 3
      y = drawRoomSketch(doc, room, margin, y, contentW)
      y += 5
    }
  }

  // --- SUMMARY ---
  const totals = computeTotals(rooms)
  const totalEntries = Object.entries(totals).filter(([, v]) => v > 0)

  if (totalEntries.length > 0) {
    checkBreak(20)
    y += 2
    doc.setDrawColor(200)
    doc.line(margin, y, pageW - margin, y)
    y += 5

    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30)
    doc.text('Zusammenfassung', margin, y)
    y += 5

    doc.setFont('helvetica', 'normal')
    for (const [unit, total] of totalEntries) {
      doc.text(`Gesamt ${unit}:`, margin + 2, y)
      doc.setFont('helvetica', 'bold')
      doc.text(`${formatNum(total)} ${unit}`, margin + 40, y)
      doc.setFont('helvetica', 'normal')
      y += 5
    }
  }

  // --- MATERIALIEN ---
  if (aufmass.materials?.length > 0) {
    checkBreak(20)
    y += 4
    doc.setDrawColor(200)
    doc.line(margin, y, pageW - margin, y)
    y += 5

    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30)
    doc.text('Materialien', margin, y)
    y += 5

    // Header
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(100)
    doc.text('Bezeichnung', margin + 2, y)
    doc.text('Menge', margin + 110, y, { align: 'right' })
    doc.text('Einheit', margin + 125, y)
    y += 1
    doc.setDrawColor(180)
    doc.line(margin, y, margin + 145, y)
    y += 4

    // Rows
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(30)
    for (const mat of aufmass.materials) {
      if (!mat.description) continue
      checkBreak(6)
      const descLines = doc.splitTextToSize(mat.description, 100)
      doc.setFontSize(9)
      doc.text(descLines, margin + 2, y)
      doc.text(mat.quantity != null && mat.quantity !== '' ? String(mat.quantity) : '—', margin + 110, y, { align: 'right' })
      doc.text(mat.unit || '', margin + 125, y)
      const rowH = Math.max(descLines.length * 5, 6)
      doc.setDrawColor(220)
      doc.line(margin, y + rowH - 3, margin + 145, y + rowH - 3)
      y += rowH
    }
    y += 3
  }

  // --- NOTES ---
  if (aufmass.notes?.trim()) {
    checkBreak(20)
    y += 4
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(80)
    doc.text('Notizen:', margin, y)
    y += 5

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(30)
    const noteLines = doc.splitTextToSize(aufmass.notes.trim(), contentW)
    doc.text(noteLines, margin, y)
    y += noteLines.length * 4.5 + 4
  }

  // --- SIGNATURE SECTION ---
  if (includeSignatureSection) {
    checkBreak(45)
    y += 6
    doc.setDrawColor(180)
    doc.line(margin, y, pageW - margin, y)
    y += 5

    if (signatureDataUrl) {
      doc.addImage(signatureDataUrl, 'PNG', margin, y, 70, 30)
      y += 32
    } else {
      y += 20
    }

    const sigY = y
    doc.setDrawColor(100)
    doc.line(margin, sigY, margin + 70, sigY)
    doc.line(pageW - margin - 70, sigY, pageW - margin, sigY)
    y += 4

    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(120)
    doc.text('Unterschrift Auftragnehmer', margin, y)
    doc.text('Unterschrift Auftraggeber', pageW - margin - 70, y)
  }

  // --- FOOTER ---
  const today = new Date().toLocaleDateString('de-DE')
  doc.setFontSize(7)
  doc.setTextColor(170)
  doc.text(`Erstellt mit Pro-Meister.de · ${today}`, pageW / 2, pageH - 8, { align: 'center' })

  return doc
}

// ─── Sketch ───────────────────────────────────────────────────────────────────

/**
 * Crta red malih skica za Form stavke (isForm=true).
 * Oblici: rect (▭), tri (△), elli (◖)
 */
function drawFormSketches(doc, formItems, margin, startY, contentW) {
  const valid = formItems.filter(i => i.length && i.width)
  if (valid.length === 0) return startY

  let y = startY
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(80)
  doc.text('Ergänzungen:', margin, y)
  doc.setFont('helvetica', 'normal')
  y += 5

  // Per sketch cell: topLabel(5) + shape(skSH) + bottomLabel(5) = skH total
  const skW = 42
  const skSH = 26  // shape area height
  const lblTop = 5
  const lblBot = 5
  const skH = lblTop + skSH + lblBot
  const gap = 8
  const hLblW = 14  // width reserved for H label on right
  const cols = Math.max(1, Math.floor((contentW + gap) / (skW + gap)))

  let col = 0, rowY = y
  for (const item of valid) {
    const s = item.dim_unit === 'cm' ? 0.01 : 1
    const B = (parseFloat(item.length) || 0) * s
    const H = (parseFloat(item.width) || 0) * s
    if (B === 0 || H === 0) continue

    const fx = margin + col * (skW + gap)
    const fy = rowY

    const shape = item.shape || 'rect'
    // Shape fits in (skW - hLblW) wide, skSH tall — centered
    const availW = skW - hLblW
    const scl = Math.min(availW / B, skSH / H)
    const sw = B * scl
    const sh = H * scl
    const ox = fx + (availW - sw) / 2
    const oy = fy + lblTop + (skSH - sh) / 2

    doc.setDrawColor(80)
    doc.setLineWidth(0.6)
    doc.setFillColor(246, 247, 252)

    if (shape === 'rect') {
      doc.rect(ox, oy, sw, sh, 'FD')
    } else if (shape === 'tri') {
      doc.triangle(ox, oy + sh, ox + sw / 2, oy, ox + sw, oy + sh, 'FD')
    } else if (shape === 'elli') {
      const rx = sw / 2
      const ry = sh
      const k = 0.5523
      doc.lines(
        [
          [0, -ry * k,  rx * (1 - k), -ry,  rx, -ry],
          [rx * k, 0,   rx, ry * (1 - k),   rx, ry],
          [-(2 * rx), 0],
        ],
        ox, oy + sh, [1, 1], 'FD', true
      )
    }

    const fmtD = v => v < 1 ? `${(v * 100).toFixed(0)} cm` : `${v.toFixed(2)} m`
    // desc top
    const lbl = item.description || (shape === 'rect' ? 'Rechteck' : shape === 'tri' ? 'Dreieck' : 'Halbelipse')
    doc.setFontSize(5.5)
    doc.setTextColor(100)
    doc.text(lbl, fx + availW / 2, fy + lblTop - 0.5, { align: 'center' })
    // B label below
    doc.text(`B: ${fmtD(B)}`, fx + availW / 2, fy + lblTop + skSH + lblBot - 0.5, { align: 'center' })
    // H label right
    doc.text(`H: ${fmtD(H)}`, fx + availW + hLblW - 1, fy + lblTop + skSH / 2, { align: 'right' })
    doc.setTextColor(30)

    col++
    if (col >= cols) { col = 0; rowY += skH + 6 }
  }

  return rowY + skH + 4
}

/**
 * 45° hatching clipped to an isoceles triangle (apex at top-center, base at oy+oH).
 */
function hatchTriangle(doc, ox, oy, oW, oH, step) {
  for (let d = -(oH - step); d < oW; d += step) {
    const lx1 = d >= 0 ? ox + d : ox
    const ly1 = d >= 0 ? oy : oy - d
    const T = d >= 0 ? Math.min(oH, oW - d) : Math.min(oH + d, oW)
    if (T <= 0) continue
    let ts = 0, te = T
    // Left edge: (ox,oy+oH)→(ox+oW/2,oy) — inside means right of this edge
    const tsL = (oH * (ox - lx1) + (oW / 2) * (oy + oH - ly1)) / (oH + oW / 2)
    ts = Math.max(ts, tsL)
    // Right edge: (ox+oW/2,oy)→(ox+oW,oy+oH) — inside means left of this edge
    const c_r = -oH * (lx1 - ox - oW) + (oW / 2) * (ly1 - oy - oH)
    const r_r = -oH + oW / 2
    if (Math.abs(r_r) > 1e-9) {
      const t_r = -c_r / r_r
      if (r_r > 0) ts = Math.max(ts, t_r)
      else te = Math.min(te, t_r)
    } else if (c_r < 0) continue
    if (ts >= te - 0.001) continue
    doc.line(lx1 + ts, ly1 + ts, lx1 + te, ly1 + te)
  }
}

/**
 * 45° hatching clipped to a half-ellipse (flat base at oy+oH, arc upward).
 * Matematički izračunava presjek svake linije sa elipsom.
 */
function hatchHalfEllipse(doc, ox, oy, oW, oH, step) {
  const cx = ox + oW / 2
  const cyBase = oy + oH
  const rx = oW / 2
  const ry = oH
  for (let d = -(oH - step); d < oW; d += step) {
    const lx1 = d >= 0 ? ox + d : ox
    const ly1 = d >= 0 ? oy : oy - d
    const T = d >= 0 ? Math.min(oH, oW - d) : Math.min(oH + d, oW)
    // parametric: P(t) = (lx1+t, ly1+t), t in [0, T]
    const p = lx1 - cx
    const q = cyBase - ly1
    const aq = 1 / (rx * rx) + 1 / (ry * ry)
    const bq = 2 * p / (rx * rx) - 2 * q / (ry * ry)
    const cq = p * p / (rx * rx) + q * q / (ry * ry) - 1
    const disc = bq * bq - 4 * aq * cq
    if (disc < 0) continue
    const sqrtD = Math.sqrt(disc)
    const t1 = (-bq - sqrtD) / (2 * aq)
    const t2 = (-bq + sqrtD) / (2 * aq)
    const ts = Math.max(0, t1)
    const te = Math.min(T, t2)
    if (ts >= te) continue
    doc.line(lx1 + ts, ly1 + ts, lx1 + te, ly1 + te)
  }
}

/**
 * Crta forme (isForm) kao odvojene mini-skice sa kotnim linijama — iznad glavne skice.
 */
function drawFormSketchRow(doc, room, margin, startY, contentW) {
  const formItems = (room.items || []).filter(i => i.isForm && !i.subtract && i.length && i.width)
  if (formItems.length === 0) return startY

  let y = startY
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(80)
  doc.text('+ Ergänzungen:', margin, y)
  doc.setFont('helvetica', 'normal')
  y += 5

  const lDim = 14, bDim = 11, tMargin = 6, rDim = 4
  const maxSW = 38, maxSH = 26
  const cellW = lDim + maxSW + rDim
  const cellH = tMargin + maxSH + bDim
  const gap = 10
  const cols = Math.max(1, Math.floor((contentW + gap) / (cellW + gap)))

  let col = 0, rowY = y
  for (const fi of formItems) {
    const s = fi.dim_unit === 'cm' ? 0.01 : 1
    const B = (parseFloat(fi.length) || 0) * s
    const H = (parseFloat(fi.width) || 0) * s
    if (B === 0 || H === 0) continue

    const fx = margin + col * (cellW + gap)
    const fy = rowY
    const scl = Math.min(maxSW / B, maxSH / H)
    const sw = B * scl
    const sh = H * scl
    const sx = fx + lDim + (maxSW - sw) / 2
    const sy = fy + tMargin + (maxSH - sh) / 2
    const shape = fi.shape || 'rect'

    // Shape
    doc.setFillColor(246, 247, 252)
    doc.setDrawColor(80)
    doc.setLineWidth(0.6)
    if (shape === 'tri') {
      doc.triangle(sx, sy + sh, sx + sw / 2, sy, sx + sw, sy + sh, 'FD')
    } else if (shape === 'elli') {
      const k = 0.5523
      doc.lines(
        [[0, -sh*k, (sw/2)*(1-k), -sh, sw/2, -sh], [(sw/2)*k, 0, sw/2, sh*(1-k), sw/2, sh], [-sw, 0]],
        sx, sy + sh, [1, 1], 'FD', true
      )
    } else {
      doc.rect(sx, sy, sw, sh, 'FD')
    }

    // Dim lines — isti stil kao glavni crtež
    doc.setLineWidth(0.25)
    doc.setDrawColor(80)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(40)
    const tick = 1.5, extGap = 2, dimOff = 5

    // Bottom: B
    const dYb = sy + sh + dimOff
    doc.line(sx, sy+sh+extGap, sx, dYb+tick)
    doc.line(sx+sw, sy+sh+extGap, sx+sw, dYb+tick)
    doc.line(sx, dYb, sx+sw, dYb)
    doc.line(sx-tick, dYb, sx+tick, dYb)
    doc.line(sx+sw-tick, dYb, sx+sw+tick, dYb)
    doc.text(fmtDim(B), sx + sw/2, dYb - 1.5, { align: 'center' })

    // Left: H
    const dXl = sx - dimOff
    doc.line(sx-extGap, sy, dXl-tick, sy)
    doc.line(sx-extGap, sy+sh, dXl-tick, sy+sh)
    doc.line(dXl, sy, dXl, sy+sh)
    doc.line(dXl-tick, sy, dXl+tick, sy)
    doc.line(dXl-tick, sy+sh, dXl+tick, sy+sh)
    doc.text(fmtDim(H), dXl - 2, sy + sh/2, { align: 'center', angle: 90 })

    // Description above shape
    const lbl = fi.description || (shape === 'rect' ? 'Rechteck' : shape === 'tri' ? 'Dreieck' : 'Halbelipse')
    doc.setFontSize(6)
    doc.setTextColor(100)
    doc.text(lbl, sx + sw/2, fy + tMargin - 1, { align: 'center' })
    doc.setTextColor(40)

    col++
    if (col >= cols) { col = 0; rowY += cellH + 6 }
  }

  return rowY + cellH + 6
}

function hasSketchData(room) {
  for (const item of room.items || []) {
    const s = item.dim_unit === 'cm' ? 0.01 : 1
    if ((item.unit === 'm²' || item.unit === 'Wand') && item.length && item.width) {
      if ((parseFloat(item.length) || 0) * s > 0 && (parseFloat(item.width) || 0) * s > 0) return true
    }
    if (item.unit === 'Bogen' && item.length && item.height) {
      if ((parseFloat(item.length) || 0) * s > 0 && (parseFloat(item.height) || 0) * s > 0) return true
    }
    if (item.unit === 'Trap' && item.length && item.width && item.height) {
      const l = (parseFloat(item.length) || 0) * s
      const b = (parseFloat(item.width) || 0) * s
      const h = (parseFloat(item.height) || 0) * s
      if (l > 0 && b > 0 && h > 0) return true
    }
  }
  return false
}

/**
 * Crta skaliran pravougaonik sobe sa kotnim linijama.
 * Uzima item sa najvećom površinom kao osnovu skice.
 * Ako je soba samo Bogen, crta polu-elipsu.
 * Vraća novi y (odmah ispod skice).
 */
function drawRoomSketch(doc, room, margin, startY, contentW) {
  // Delegate to specialized sketch if room has only non-rectangular items
  const hasRect = (room.items || []).some(i =>
    (i.unit === 'm²' || i.unit === 'Wand') && i.length && i.width && !i.subtract
  )
  const hasHalfEllipse = (room.items || []).some(i =>
    i.unit === 'Bogen' && i.length && i.height
  )
  const hasTrap = (room.items || []).some(i =>
    i.unit === 'Trap' && i.length && i.width && i.height
  )

  if (!hasRect && hasTrap) {
    return drawTrapSketch(doc, room, margin, startY, contentW)
  }
  if (!hasRect && hasHalfEllipse) {
    return drawHalfEllipseSketch(doc, room, margin, startY, contentW)
  }

  // Check if room is Wand-only → draw unfolded wall rectangle 2(L+B)×H
  // Exclude subtract items from hasM2 check (openings are m² but shouldn't block Wand sketch)
  const hasWand = (room.items || []).some(i => i.unit === 'Wand' && i.length && i.width && i.height && !i.subtract)
  const hasM2   = (room.items || []).some(i => i.unit === 'm²' && i.length && i.width && !i.subtract)
  if (hasWand && !hasM2) {
    return drawWandSketch(doc, room, margin, startY, contentW)
  }

  // Find item with largest area for room outline
  let L = 0, B = 0, H = 0
  for (const item of room.items || []) {
    if ((item.unit === 'm²' || item.unit === 'Wand') && item.length && item.width) {
      const s = item.dim_unit === 'cm' ? 0.01 : 1
      const l = (parseFloat(item.length) || 0) * s
      const b = (parseFloat(item.width) || 0) * s
      const h = (parseFloat(item.height) || 0) * s
      if (l > 0 && b > 0 && l * b > L * B) { L = l; B = b; H = h }
    }
  }
  if (L === 0 || B === 0) return startY

  // Space reserved for dimension annotations
  const leftDim   = 20
  const rightDim  = H > 0 ? 18 : 4
  const topMargin = 2
  const bottomDim = 13

  const availW = contentW - leftDim - rightDim
  const availH = 55

  const scale = Math.min(availW / L, availH / B)
  const rectW = L * scale
  const rectH = B * scale

  const rectX = margin + leftDim + (availW - rectW) / 2

  // Form items — draw above rect, stacked vertically, centered, same scale
  const formItems = (room.items || []).filter(i => i.isForm && !i.subtract && i.length && i.width)
  const formRowGap = 14  // vertical gap between form shapes (space for B dim line below)

  const formMeta = formItems.map(fi => {
    const fs = fi.dim_unit === 'cm' ? 0.01 : 1
    const fB = (parseFloat(fi.length) || 0) * fs
    const fH = (parseFloat(fi.width) || 0) * fs
    return { fB, fH, fw: fB * scale, fh: fH * scale, shape: fi.shape || 'rect',
             lbl: fi.description || (fi.shape === 'tri' ? 'Dreieck' : fi.shape === 'elli' ? 'Halbelipse' : 'Rechteck') }
  })

  const pageH = 297
  let curY = startY + topMargin + 6  // current drawing Y, moves down as we draw form items

  for (const { fB, fH, fw, fh, shape: fshape, lbl: flbl } of formMeta) {
    const itemH = fh + formRowGap  // height this item needs (shape + dim below + gap)
    if (curY + itemH > pageH - 20) {
      doc.addPage()
      curY = margin + 6
    }
    const fox = rectX + (rectW - fw) / 2
    const foy = curY

    doc.setFillColor(246, 247, 252)
    doc.setDrawColor(80)
    doc.setLineWidth(0.6)
    if (fshape === 'tri') {
      doc.triangle(fox, foy+fh, fox+fw/2, foy, fox+fw, foy+fh, 'FD')
    } else if (fshape === 'elli') {
      const k = 0.5523
      doc.lines([[0,-fh*k,(fw/2)*(1-k),-fh,fw/2,-fh],[(fw/2)*k,0,fw/2,fh*(1-k),fw/2,fh],[-fw,0]], fox, foy+fh, [1,1], 'FD', true)
    } else {
      doc.rect(fox, foy, fw, fh, 'FD')
    }
    doc.setLineWidth(0.25); doc.setDrawColor(80); doc.setFontSize(7); doc.setFont('helvetica','normal'); doc.setTextColor(40)
    const ft=1.5, fe=2, fd=5
    // B dim (below shape)
    const fdYb = foy+fh+fd
    doc.line(fox,foy+fh+fe,fox,fdYb+ft); doc.line(fox+fw,foy+fh+fe,fox+fw,fdYb+ft)
    doc.line(fox,fdYb,fox+fw,fdYb); doc.line(fox-ft,fdYb,fox+ft,fdYb); doc.line(fox+fw-ft,fdYb,fox+fw+ft,fdYb)
    doc.text(fmtDim(fB), fox+fw/2, fdYb-1.5, {align:'center'})
    // H dim (left of shape)
    const fdXl = fox-fd
    doc.line(fox-fe,foy,fdXl-ft,foy); doc.line(fox-fe,foy+fh,fdXl-ft,foy+fh)
    doc.line(fdXl,foy,fdXl,foy+fh); doc.line(fdXl-ft,foy,fdXl+ft,foy); doc.line(fdXl-ft,foy+fh,fdXl+ft,foy+fh)
    doc.text(fmtDim(fH), fdXl-2, foy+fh/2, {align:'center', angle:90})
    // Label above shape
    doc.setFontSize(6); doc.setTextColor(100)
    doc.text(flbl, fox+fw/2, foy-1.5, {align:'center'})
    doc.setTextColor(40)

    curY += itemH
  }

  // Main rect — page break if needed
  if (curY + rectH + bottomDim + 5 > pageH - 20) {
    doc.addPage()
    curY = margin + topMargin
  }
  const rectY = curY

  // Rectangle: light fill + border
  doc.setFillColor(246, 247, 252)
  doc.setDrawColor(80)
  doc.setLineWidth(0.6)
  doc.rect(rectX, rectY, rectW, rectH, 'FD')

  // Openings (subtract items) — hatched rectangles inside the rect
  const m2Openings = (room.items || []).filter(i => i.subtract && i.length && i.width && i.unit === 'm²')
  const nOp2 = Math.min(m2Openings.length, 6)
  if (nOp2 > 0) {
    const opGap = rectW / (nOp2 + 1)
    for (let oi = 0; oi < nOp2; oi++) {
      const op = m2Openings[oi]
      const s2 = op.dim_unit === 'cm' ? 0.01 : 1
      const oL = (parseFloat(op.length) || 0) * s2
      const oHraw = (parseFloat(op.width) || 0) * s2
      if (oL <= 0) continue
      const oW = Math.min(oL * scale, rectW * 0.85 / nOp2)
      const oh = Math.min(oHraw > 0 ? oHraw * scale : rectH * 0.6, rectH * 0.92)
      const cx2 = rectX + opGap * (oi + 1)
      const ox = Math.max(rectX + 0.5, Math.min(cx2 - oW / 2, rectX + rectW - oW - 0.5))
      const oy = rectY + rectH - oh
      doc.setFillColor(255, 255, 255)
      doc.setDrawColor(100)
      doc.setLineWidth(0.4)
      if (op.shape === 'elli') {
        const k2 = 0.5523
        doc.lines([[0,-oh*k2,(oW/2)*(1-k2),-oh,oW/2,-oh],[(oW/2)*k2,0,oW/2,oh*(1-k2),oW/2,oh],[-oW,0]], ox, oy+oh, [1,1],'FD',true)
      } else if (op.shape === 'tri') {
        doc.triangle(ox, oy+oh, ox+oW/2, oy, ox+oW, oy+oh, 'FD')
      } else {
        doc.rect(ox, oy, oW, oh, 'FD')
      }
      // 45° hatching — clipped to shape
      doc.setDrawColor(150)
      doc.setLineWidth(0.25)
      const step2 = 2.5
      if (op.shape === 'elli') {
        hatchHalfEllipse(doc, ox, oy, oW, oh, step2)
      } else if (op.shape === 'tri') {
        hatchTriangle(doc, ox, oy, oW, oh, step2)
      } else {
        for (let d = -(oh - step2); d < oW; d += step2) {
          const lx1 = d >= 0 ? ox + d : ox
          const ly1 = d >= 0 ? oy : oy - d
          const lx2 = (d + oh) <= oW ? ox + d + oh : ox + oW
          const ly2 = (d + oh) <= oW ? oy + oh : oy + oW - d
          doc.line(
            Math.max(ox, Math.min(ox + oW, lx1)), Math.max(oy, Math.min(oy + oh, ly1)),
            Math.max(ox, Math.min(ox + oW, lx2)), Math.max(oy, Math.min(oy + oh, ly2))
          )
        }
      }
      // Label above opening
      const dimLabel = op.description || 'Abzug'
      doc.setTextColor(200, 60, 40)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(5.5)
      doc.text(dimLabel, ox + oW / 2, oy - 2.5, { align: 'center' })
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(5)
      doc.text(oHraw > 0 ? `${fmtDim(oL).replace(' m','')}×${fmtDim(oHraw)}` : fmtDim(oL), ox + oW / 2, oy - 0.5, { align: 'center' })
      doc.setTextColor(40)
      doc.setLineWidth(0.6)
      doc.setDrawColor(80)
    }
  }

  // Room name inside rectangle
  if (rectH >= 9) {
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(140)
    doc.text(room.name || '', rectX + rectW / 2, rectY + rectH / 2, {
      align: 'center',
      baseline: 'middle',
    })
  }

  // Dimension line style
  doc.setLineWidth(0.25)
  doc.setDrawColor(80)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(40)

  const tick   = 1.5  // tick length at ends of dim line
  const extGap = 2    // gap from rect to start of extension line
  const dimOff = 7    // distance from rect to dim line

  // ── Bottom: L ──
  const dimYB = rectY + rectH + dimOff
  doc.line(rectX,         rectY + rectH + extGap, rectX,         dimYB + tick)
  doc.line(rectX + rectW, rectY + rectH + extGap, rectX + rectW, dimYB + tick)
  doc.line(rectX, dimYB, rectX + rectW, dimYB)
  doc.line(rectX - tick,         dimYB, rectX + tick,         dimYB)
  doc.line(rectX + rectW - tick, dimYB, rectX + rectW + tick, dimYB)
  doc.text(fmtDim(L), rectX + rectW / 2, dimYB - 1.5, { align: 'center' })

  // ── Left: B ──
  const dimXL = rectX - dimOff
  doc.line(rectX - extGap, rectY,         dimXL - tick, rectY)
  doc.line(rectX - extGap, rectY + rectH, dimXL - tick, rectY + rectH)
  doc.line(dimXL, rectY, dimXL, rectY + rectH)
  doc.line(dimXL - tick, rectY,         dimXL + tick, rectY)
  doc.line(dimXL - tick, rectY + rectH, dimXL + tick, rectY + rectH)
  doc.text(fmtDim(B), dimXL - 2, rectY + rectH / 2, { align: 'center', angle: 90 })

  // ── Right: H (only when Wand item used) ──
  if (H > 0) {
    const dimXR = rectX + rectW + dimOff
    doc.line(rectX + rectW + extGap, rectY,         dimXR + tick, rectY)
    doc.line(rectX + rectW + extGap, rectY + rectH, dimXR + tick, rectY + rectH)
    doc.line(dimXR, rectY, dimXR, rectY + rectH)
    doc.line(dimXR - tick, rectY,         dimXR + tick, rectY)
    doc.line(dimXR - tick, rectY + rectH, dimXR + tick, rectY + rectH)
    doc.text(`H: ${fmtDim(H)}`, dimXR + 2, rectY + rectH / 2, { align: 'center', angle: 90 })
  }

  return rectY + rectH + bottomDim
}

/**
 * Crta polu-elipsu (Bogen) sa kotama L i H.
 * Koristi bezier aproksimaciju (κ ≈ 0.5523).
 */
function drawHalfEllipseSketch(doc, room, margin, startY, contentW) {
  // Find Bogen item with largest area
  let L = 0, H = 0
  for (const item of room.items || []) {
    if (item.unit === 'Bogen' && item.length && item.height) {
      const s = item.dim_unit === 'cm' ? 0.01 : 1
      const l = (parseFloat(item.length) || 0) * s
      const h = (parseFloat(item.height) || 0) * s
      if (l > 0 && h > 0 && l * h > L * H) { L = l; H = h }
    }
  }
  if (L === 0 || H === 0) return startY

  const leftDim  = 20
  const rightDim = 18
  const topMargin = 4
  const bottomDim = 13

  const availW = contentW - leftDim - rightDim
  const availH = 40  // max half-ellipse height

  const scale = Math.min(availW / L, availH / H)
  const eW = L * scale   // ellipse full width (= rectW)
  const eH = H * scale   // ellipse half-height

  const cx = margin + leftDim + availW / 2  // center x
  const baseY = startY + topMargin + eH     // baseline y (flat bottom)
  const topY  = baseY - eH                  // top of arc

  // Fill half-ellipse using bezier curves (κ = 0.5523)
  const rx = eW / 2
  const ry = eH
  const k = 0.5523
  doc.setFillColor(246, 247, 252)
  doc.setDrawColor(80)
  doc.setLineWidth(0.6)

  // Draw path: start bottom-left → arc → bottom-right → straight line back
  // jsPDF lines(): [dx, dy, dx1, dy1, dx2, dy2] relative segments
  // We'll use moveTo + curves via doc.lines
  const x0 = cx - rx
  const x1 = cx + rx

  doc.lines(
    [
      // left quarter: (x0, baseY) → (cx, topY)
      // CP1: (0, -ry*k)  CP2: (rx*(1-k), -ry)  End: (rx, -ry)
      [0, -ry * k,  rx * (1 - k), -ry,  rx, -ry],
      // right quarter: (cx, topY) → (x1, baseY)
      // CP1: (rx*k, 0)  CP2: (rx, ry*(1-k))  End: (rx, ry)
      [rx * k, 0,  rx, ry * (1 - k),  rx, ry],
      // straight base back to start
      [-(2 * rx), 0],
    ],
    x0, baseY,
    [1, 1],
    'FD',
    true
  )

  // Label inside arc
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(140)
  doc.text(room.name || '', cx, baseY - eH * 0.45, { align: 'center', baseline: 'middle' })

  // Dimension lines
  doc.setLineWidth(0.25)
  doc.setDrawColor(80)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(40)

  const tick   = 1.5
  const extGap = 2
  const dimOff = 7

  // ── Bottom: L ──
  const dimYB = baseY + dimOff
  doc.line(x0,  baseY + extGap, x0,  dimYB + tick)
  doc.line(x1,  baseY + extGap, x1,  dimYB + tick)
  doc.line(x0, dimYB, x1, dimYB)
  doc.line(x0 - tick, dimYB, x0 + tick, dimYB)
  doc.line(x1 - tick, dimYB, x1 + tick, dimYB)
  doc.text(fmtDim(L), cx, dimYB - 1.5, { align: 'center' })

  // ── Right: H ──
  const dimXR = x1 + dimOff
  doc.line(x1 + extGap, baseY, dimXR + tick, baseY)
  doc.line(x1 + extGap, topY,  dimXR + tick, topY)
  doc.line(dimXR, baseY, dimXR, topY)
  doc.line(dimXR - tick, baseY, dimXR + tick, baseY)
  doc.line(dimXR - tick, topY,  dimXR + tick, topY)
  doc.text(fmtDim(H), dimXR + 2, baseY - eH / 2, { align: 'center', angle: 90 })

  return baseY + bottomDim
}

/**
 * Crta razvijeni zid: pravougaonik 2(L+B) × H.
 * Uzima Wand item sa najvećom površinom.
 */
function drawWandSketch(doc, room, margin, startY, contentW) {
  let L = 0, B = 0, H = 0
  for (const item of room.items || []) {
    if (item.unit === 'Wand' && item.length && item.width && item.height) {
      const s = item.dim_unit === 'cm' ? 0.01 : 1
      const l = (parseFloat(item.length) || 0) * s
      const b = (parseFloat(item.width) || 0) * s
      const h = (parseFloat(item.height) || 0) * s
      if (l > 0 && b > 0 && h > 0 && 2*(l+b)*h > 2*(L+B)*H) { L = l; B = b; H = h }
    }
  }
  if (L === 0 || B === 0 || H === 0) return startY

  const perim = 2 * (L + B)

  const leftDim  = 4
  const rightDim = 18
  const topMargin = 2
  const bottomDim = 13

  const availW = contentW - leftDim - rightDim
  const availH = 45

  const scale = Math.min(availW / perim, availH / H)
  const rectW = perim * scale
  const rectH = H * scale

  const rectX = margin + leftDim + (availW - rectW) / 2
  const rectY = startY + topMargin

  // Rectangle
  doc.setFillColor(246, 247, 252)
  doc.setDrawColor(80)
  doc.setLineWidth(0.6)
  doc.rect(rectX, rectY, rectW, rectH, 'FD')

  // Wall dividers: L | B | L | B — dashed (interior/conceptual fold lines)
  const lW = L * scale
  const bW = B * scale
  const dividers = [lW, lW + bW, lW + bW + lW]
  doc.setDrawColor(150)
  doc.setLineWidth(0.4)
  doc.setLineDashPattern([1.5, 1.2], 0)
  for (const d of dividers) {
    doc.line(rectX + d, rectY, rectX + d, rectY + rectH)
  }
  doc.setLineDashPattern([], 0)

  // Section labels inside each wall panel
  if (rectH >= 7) {
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(160)
    const midY = rectY + rectH / 2
    const sections = [
      { label: 'L', cx: lW / 2 },
      { label: 'B', cx: lW + bW / 2 },
      { label: 'L', cx: lW + bW + lW / 2 },
      { label: 'B', cx: lW + bW + lW + bW / 2 },
    ]
    for (const { label, cx } of sections) {
      doc.text(label, rectX + cx, midY, { align: 'center', baseline: 'middle' })
    }
  }

  // Draw openings (subtract items) — span freely across wall, ignore L/B dividers
  const openings = (room.items || []).filter(i => i.subtract && i.length)
  // Distribute openings left-to-right with equal spacing
  const nOp = Math.min(openings.length, 6)
  const gap = rectW / (nOp + 1)
  for (let oi = 0; oi < nOp; oi++) {
    const op = openings[oi]
    const s2 = op.dim_unit === 'cm' ? 0.01 : 1
    const oL = (parseFloat(op.length) || 0) * s2
    const oHraw = op.unit === 'Bogen'
      ? (parseFloat(op.height) || 0) * s2
      : (parseFloat(op.width || op.height) || 0) * s2
    if (oL <= 0) continue
    // Width proportional to actual size, capped at rectW * 0.9
    const oW = Math.min(oL * scale, rectW * 0.9)
    const oH = Math.min(oHraw > 0 ? oHraw * scale : rectH * 0.55, rectH * 0.95)
    // Center of this opening
    const cx2 = rectX + gap * (oi + 1)
    const ox = Math.max(rectX + 0.5, Math.min(cx2 - oW / 2, rectX + rectW - oW - 0.5))
    const oy = rectY + rectH - oH

    // White fill (cut-out)
    doc.setFillColor(255, 255, 255)
    doc.setDrawColor(100)
    doc.setLineWidth(0.4)

    if (op.shape === 'elli') {
      // Pure half-ellipse (flat bottom, arc top)
      const k2 = 0.5523
      doc.lines(
        [[0,-oH*k2,(oW/2)*(1-k2),-oH,oW/2,-oH],[(oW/2)*k2,0,oW/2,oH*(1-k2),oW/2,oH],[-oW,0]],
        ox, oy + oH, [1,1], 'FD', true
      )
    } else if (op.shape === 'tri') {
      doc.triangle(ox, oy + oH, ox + oW / 2, oy, ox + oW, oy + oH, 'FD')
    } else if (op.unit === 'Bogen') {
      // Arch shape: rectangle bottom + rounded top via ellipse
      const archH = Math.min(oH * 0.45, oW * 0.55)
      const rectPart = oH - archH
      const ex = ox + oW / 2
      const ey = oy + archH
      doc.rect(ox, ey, oW, rectPart, 'FD')
      const rx2 = oW / 2
      const ry2 = archH
      const k2 = 0.5523
      doc.setFillColor(255, 255, 255)
      doc.lines(
        [[0,-ry2*k2,rx2*(1-k2),-ry2,rx2,-ry2],[rx2*k2,0,rx2,ry2*(1-k2),rx2,ry2],[-oW,0]],
        ex - rx2, ey, [1,1], 'FD', true
      )
    } else {
      doc.rect(ox, oy, oW, oH, 'FD')
    }

    // 45° hatching — clipped to shape bounds
    doc.setDrawColor(150)
    doc.setLineWidth(0.25)
    const step2 = 2.5
    if (op.shape === 'elli') {
      hatchHalfEllipse(doc, ox, oy, oW, oH, step2)
    } else if (op.shape === 'tri') {
      hatchTriangle(doc, ox, oy, oW, oH, step2)
    } else {
      for (let d = -(oH - step2); d < oW; d += step2) {
        const lx1 = d >= 0 ? ox + d : ox
        const ly1 = d >= 0 ? oy : oy - d
        const lx2 = (d + oH) <= oW ? ox + d + oH : ox + oW
        const ly2 = (d + oH) <= oW ? oy + oH : oy + oW - d
        doc.line(
          Math.max(ox, Math.min(ox + oW, lx1)), Math.max(oy, Math.min(oy + oH, ly1)),
          Math.max(ox, Math.min(ox + oW, lx2)), Math.max(oy, Math.min(oy + oH, ly2))
        )
      }
    }

    // Labels ABOVE the opening — red, compact two lines
    const dimLabel = op.description || 'Offnung'
    const dimSub = oHraw > 0 ? `${fmtDim(oL).replace(' m', '')}x${fmtDim(oHraw)}` : fmtDim(oL)
    doc.setTextColor(200, 60, 40)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(5.5)
    doc.text(dimLabel, ox + oW / 2, oy - 2.5, { align: 'center' })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(5)
    doc.text(dimSub, ox + oW / 2, oy - 0.5, { align: 'center' })
    doc.setTextColor(40)
  }

  doc.setLineWidth(0.25)
  doc.setDrawColor(80)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(40)

  const tick   = 1.5
  const extGap = 2
  const dimOff = 7

  // ── Bottom: 2(L+B) ──
  const dimYB = rectY + rectH + dimOff
  doc.line(rectX,         rectY + rectH + extGap, rectX,         dimYB + tick)
  doc.line(rectX + rectW, rectY + rectH + extGap, rectX + rectW, dimYB + tick)
  doc.line(rectX, dimYB, rectX + rectW, dimYB)
  doc.line(rectX - tick,         dimYB, rectX + tick,         dimYB)
  doc.line(rectX + rectW - tick, dimYB, rectX + rectW + tick, dimYB)
  doc.text(`2×(${fmtDim(L).replace(' m','')}+${fmtDim(B)})`, rectX + rectW / 2, dimYB - 1.5, { align: 'center' })

  // ── Right: H ──
  const dimXR = rectX + rectW + dimOff
  doc.line(rectX + rectW + extGap, rectY,         dimXR + tick, rectY)
  doc.line(rectX + rectW + extGap, rectY + rectH, dimXR + tick, rectY + rectH)
  doc.line(dimXR, rectY, dimXR, rectY + rectH)
  doc.line(dimXR - tick, rectY,         dimXR + tick, rectY)
  doc.line(dimXR - tick, rectY + rectH, dimXR + tick, rectY + rectH)
  doc.text(fmtDim(H), dimXR + 2, rectY + rectH / 2, { align: 'center', angle: 90 })

  return rectY + rectH + bottomDim
}

/**
 * Crta simetričan trapez sa kotama a (gore), b (dole), h (visina).
 */
function drawTrapSketch(doc, room, margin, startY, contentW) {
  // Find Trap item with largest area
  let A = 0, B = 0, H = 0
  for (const item of room.items || []) {
    if (item.unit === 'Trap' && item.length && item.height) {
      const s = item.dim_unit === 'cm' ? 0.01 : 1
      const a = (parseFloat(item.length) || 0) * s
      const b = (parseFloat(item.width) || 0) * s   // 0 = triangle
      const h = (parseFloat(item.height) || 0) * s
      if (a > 0 && h > 0 && (a + b) / 2 * h > (A + B) / 2 * H) { A = a; B = b; H = h }
    }
  }
  if (A === 0 || H === 0) return startY

  // Always draw larger side at bottom (DIN convention)
  // Preserve original B to know if it's a triangle (B=0)
  const isTriangle = B === 0
  const bottomVal = Math.max(A, B)  // longer side → bottom
  const topVal    = Math.min(A, B)  // shorter side → top

  const leftDim  = 20
  const rightDim = 18
  const topMargin = 4
  const bottomDim = 13

  const availW = contentW - leftDim - rightDim
  const availH = 45

  const scale = Math.min(availW / bottomVal, availH / H)

  const botW = bottomVal * scale  // longer side at bottom
  const topW = topVal    * scale  // shorter side at top (0 = triangle)
  const tH   = H * scale

  const cx    = margin + leftDim + availW / 2
  const baseY = startY + topMargin + tH
  const topY  = startY + topMargin

  // 4 corners (symmetric)
  const bx0 = cx - botW / 2;  const bx1 = cx + botW / 2
  const ax0 = cx - topW / 2;  const ax1 = cx + topW / 2

  // Fill + border
  doc.setFillColor(246, 247, 252)
  doc.setDrawColor(80)
  doc.setLineWidth(0.6)
  doc.lines(
    [
      [ax0 - bx0, -tH],    // bottom-left → top-left
      [topW, 0],            // top-left → top-right (0 for triangle = no line)
      [bx1 - ax1, tH],     // top-right → bottom-right
      [-botW, 0],           // bottom-right → bottom-left (close)
    ],
    bx0, baseY,
    [1, 1],
    'FD',
    true
  )

  // Room name
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(140)
  doc.text(room.name || '', cx, baseY - tH / 2, { align: 'center', baseline: 'middle' })

  doc.setLineWidth(0.25)
  doc.setDrawColor(80)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(40)

  const tick   = 1.5
  const extGap = 2
  const dimOff = 7

  // ── Bottom: longer side ──
  const dimYB = baseY + dimOff
  doc.line(bx0, baseY + extGap, bx0, dimYB + tick)
  doc.line(bx1, baseY + extGap, bx1, dimYB + tick)
  doc.line(bx0, dimYB, bx1, dimYB)
  doc.line(bx0 - tick, dimYB, bx0 + tick, dimYB)
  doc.line(bx1 - tick, dimYB, bx1 + tick, dimYB)
  doc.text(fmtDim(bottomVal), cx, dimYB - 1.5, { align: 'center' })

  // ── Top: shorter side (skip if triangle) ──
  if (!isTriangle) {
    const dimYT = topY - dimOff
    doc.line(ax0, topY - extGap, ax0, dimYT - tick)
    doc.line(ax1, topY - extGap, ax1, dimYT - tick)
    doc.line(ax0, dimYT, ax1, dimYT)
    doc.line(ax0 - tick, dimYT, ax0 + tick, dimYT)
    doc.line(ax1 - tick, dimYT, ax1 + tick, dimYT)
    doc.text(fmtDim(topVal), cx, dimYT + 2, { align: 'center' })
  }

  // ── Right: h ──
  const dimXR = bx1 + dimOff
  doc.line(bx1 + extGap, baseY, dimXR + tick, baseY)
  doc.line(ax1 + extGap, topY,  dimXR + tick, topY)
  doc.line(dimXR, baseY, dimXR, topY)
  doc.line(dimXR - tick, baseY, dimXR + tick, baseY)
  doc.line(dimXR - tick, topY,  dimXR + tick, topY)
  doc.text(`h: ${fmtDim(H)}`, dimXR + 2, baseY - tH / 2, { align: 'center', angle: 90 })

  return baseY + bottomDim
}

function fmtDim(val) {
  return `${Number(val).toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} m`
}

// ─── Utils ────────────────────────────────────────────────────────────────────

function computeTotals(rooms) {
  const totals = { 'm²': 0, 'lfm': 0, 'm³': 0, 'Stk': 0 }
  for (const room of rooms || []) {
    for (const item of room.items || []) {
      if (item.unit && item.result != null) {
        const u = (item.unit === 'Wand' || item.unit === 'Bogen' || item.unit === 'Trap') ? 'm²' : item.unit
        const sign = item.subtract ? -1 : 1
        totals[u] = (totals[u] || 0) + item.result * sign
      }
    }
  }
  return totals
}

function formatNum(n) {
  return Number(n).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(dateStr) {
  if (!dateStr) return new Date().toLocaleDateString('de-DE')
  return new Date(dateStr).toLocaleDateString('de-DE')
}
