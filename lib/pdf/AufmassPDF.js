// jsPDF loaded dynamically on demand (saves ~564 KB initial bundle)

/**
 * Generiše Aufmaß PDF i pokreće download.
 */
export async function generateAufmassPDF(aufmass, majstor, signatureDataUrl = null) {
  const { default: jsPDF } = await import('jspdf')
  const sig = signatureDataUrl || aufmass.signature || null
  const doc = buildDoc(jsPDF, aufmass, majstor, sig, true)
  const blob = doc.output('blob')
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}

/**
 * Generiše Aufmaß PDF i vraća Blob (za attachment u InvoiceCreator).
 */
export async function generateAufmassPDFBlob(aufmass, majstor) {
  const { default: jsPDF } = await import('jspdf')
  const doc = buildDoc(jsPDF, aufmass, majstor, aufmass.signature || null, false)
  return doc.output('blob')
}

// VOB/C thresholds per Gewerk
const GEWERKE_VOB = {
  maler:      { vobWand: 2.5, vobBoden: 2.5, din: '18363' },
  fliesen:    { vobWand: 2.5, vobBoden: 0.5, din: '18352' },
  trockenbau: { vobWand: 2.5, vobBoden: 0.5, din: '18340' },
  bodenbelag: { vobWand: null, vobBoden: 0.5, din: '18365' },
}

// ─── Core builder ─────────────────────────────────────────────────────────────

function buildDoc(jsPDF, aufmass, majstor, signatureDataUrl, includeSignatureSection) {
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
    ['Bauvorhaben', aufmass.title || '—'],
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

  // --- FENSTERBAU ---
  if (aufmass.gewerk === 'fensterbau') {
    const positions = aufmass.rooms || []
    for (let pi = 0; pi < positions.length; pi++) {
      const pos = positions[pi]
      checkBreak(80)

      // Position header
      doc.setFillColor(240, 240, 240)
      doc.rect(margin, y - 4, contentW, 7, 'F')
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(30)
      doc.text(`Pos. ${pi + 1}${pos.name ? '   ' + pos.name : ''}`, margin + 2, y)
      y += 8

      // ── MEHRTEILIG (multi-segment) ──
      if (pos.preset === 'mehrteilig' && pos.segments?.length > 0) {
        const segs = pos.segments
        const segWidths = segs.map(s => parseFloat(s.width) || 100)
        const segHeights = segs.map(s => parseFloat(s.height) || 100)
        const totalRealW = segWidths.reduce((a, b) => a + b, 0)
        const maxRealH = Math.max(...segHeights)
        const align = pos.alignment || 'top'

        const maxSkW = 65, maxSkH = 55
        const scale = Math.min(maxSkW / totalRealW, maxSkH / maxRealH)
        const sketchW = totalRealW * scale, sketchH = maxRealH * scale
        const sketchX = margin + 17, sketchY = y
        const inset = 2.5, handleW = 1.2, handleH = 5

        // Draw each segment
        let sxOff = sketchX
        for (let si = 0; si < segs.length; si++) {
          const seg = segs[si]
          const sw = segWidths[si] * scale
          const sh = segHeights[si] * scale
          const sx = sxOff
          sxOff += sw

          let sy = sketchY
          if (align === 'bottom') sy = sketchY + sketchH - sh
          else if (align === 'center') sy = sketchY + (sketchH - sh) / 2

          // Segment frame
          doc.setDrawColor(80)
          doc.setLineWidth(0.7)
          doc.rect(sx, sy, sw, sh)

          // OL/UL proportional
          const segRealH = segHeights[si]
          const olHmm = parseFloat(seg.oberlichtHeight) || 0
          const olH = seg.oberlicht ? (olHmm > 0 ? sh * olHmm / segRealH : sh * 0.22) : 0
          const ulHmm = parseFloat(seg.unterlichtHeight) || 0
          const ulH = seg.unterlicht ? (ulHmm > 0 ? sh * ulHmm / segRealH : sh * 0.22) : 0
          const panelH = sh - olH - ulH
          const panelY = sy + olH
          const panels = seg.panels || [{ type: 'fix' }]
          // Proportional panel widths within segment
          const segRealW2 = parseFloat(seg.width) || 0
          const pEffW = panels.map((p, i) => {
            if (i === panels.length - 1 && panels.length > 1 && segRealW2 > 0) {
              const others = panels.reduce((s, pp, j) => j !== i ? s + (parseFloat(pp.width) || 0) : s, 0)
              return Math.max(1, segRealW2 - others)
            }
            return parseFloat(p.width) || 0
          })
          const hasSegCW = pEffW.some(w => w > 0)
          const totalSegPW = hasSegCW ? pEffW.reduce((s, w) => s + (w || 1), 0) : panels.length
          const panelWs = pEffW.map(w => hasSegCW ? (w || 1) / totalSegPW * sw : sw / panels.length)

          // Oberlicht
          if (seg.oberlicht && olH > 2 * inset) {
            doc.setDrawColor(80)
            doc.setLineWidth(0.5)
            doc.line(sx, sy + olH, sx + sw, sy + olH)
            doc.setLineWidth(0.3)
            doc.rect(sx + inset, sy + inset, sw - 2 * inset, olH - 2 * inset)
            doc.setDrawColor(160)
            doc.setLineDashPattern([1.5, 1.5], 0)
            doc.line(sx + inset, sy + inset, sx + sw - inset, sy + olH - inset)
            doc.line(sx + sw - inset, sy + inset, sx + inset, sy + olH - inset)
            doc.setLineDashPattern([], 0)
          }

          // Panels
          let ppxOff = sx
          for (let pi = 0; pi < panels.length; pi++) {
            const p = panels[pi]
            const pw = panelWs[pi]
            const ppx = ppxOff
            ppxOff += pw
            doc.setDrawColor(80)
            doc.setLineWidth(0.5)
            if (pi > 0) doc.line(ppx, panelY, ppx, panelY + panelH)
            const ix = ppx + inset, iy = panelY + inset, iw = pw - 2 * inset, ih = panelH - 2 * inset
            if (iw <= 0 || ih <= 0) continue
            doc.setLineWidth(0.3)
            doc.rect(ix, iy, iw, ih)
            const cx = ix + iw / 2, cy = iy + ih / 2
            if (p.type === 'fix') {
              doc.setDrawColor(160); doc.setLineDashPattern([1.5, 1.5], 0)
              doc.line(ix, iy, ix + iw, iy + ih); doc.line(ix + iw, iy, ix, iy + ih)
              doc.setLineDashPattern([], 0)
            }
            if (p.type === 'kipp' || p.type === 'kipp-dreh') {
              doc.setDrawColor(160); doc.setLineDashPattern([1.5, 1.5], 0)
              doc.line(ix, iy + ih, cx, iy); doc.line(ix + iw, iy + ih, cx, iy)
              doc.setLineDashPattern([], 0)
            }
            if (p.type === 'dreh' || p.type === 'kipp-dreh') {
              doc.setDrawColor(80); doc.setLineDashPattern([], 0)
              if (p.hinge === 'left' || !p.hinge) { doc.line(ix, iy, ix + iw, cy); doc.line(ix, iy + ih, ix + iw, cy) }
              else { doc.line(ix + iw, iy, ix, cy); doc.line(ix + iw, iy + ih, ix, cy) }
            }
            const showHandle = p.type === 'dreh' || p.type === 'kipp-dreh' || p.type === 'kipp'
            if (showHandle) {
              const isLeft = p.hinge === 'left' || !p.hinge
              const hx = isLeft ? (ix + iw + ppx + pw) / 2 - handleW / 2 : (ppx + ix) / 2 - handleW / 2
              const hy = iy + ih / 2 - handleH / 2
              doc.setFillColor(80); doc.rect(hx, hy, handleW, handleH, 'F')
            }
          }

          // Unterlicht
          if (seg.unterlicht && ulH > 2 * inset) {
            const ulY = sy + sh - ulH
            doc.setDrawColor(80)
            doc.setLineWidth(0.5)
            doc.line(sx, ulY, sx + sw, ulY)
            doc.setLineWidth(0.3)
            doc.rect(sx + inset, ulY + inset, sw - 2 * inset, ulH - 2 * inset)
            doc.setDrawColor(160)
            doc.setLineDashPattern([1.5, 1.5], 0)
            doc.line(sx + inset, ulY + inset, sx + sw - inset, ulY + ulH - inset)
            doc.line(sx + sw - inset, ulY + inset, sx + inset, ulY + ulH - inset)
            doc.setLineDashPattern([], 0)
          }
        }

        // Dimension lines
        doc.setDrawColor(140); doc.setLineWidth(0.3); doc.setFontSize(6)
        doc.setFont('helvetica', 'normal'); doc.setTextColor(120)

        // Check if any segment has multiple panels with custom widths
        const hasPanelWidths = segs.some(seg => {
          const panels = seg.panels || []
          return panels.length > 1 && panels.some(p => parseFloat(p.width) > 0)
        })

        // Bottom row offsets
        const panelDimY = sketchY + sketchH + 3
        const segDimY = hasPanelWidths ? panelDimY + 6 : panelDimY
        const totalDimY = segDimY + 6

        // Bottom: per-panel widths (if any segment has custom panel widths)
        if (hasPanelWidths) {
          let px = sketchX
          for (let si = 0; si < segs.length; si++) {
            const seg = segs[si]
            const sw = segWidths[si] * scale
            const panels = seg.panels || [{ type: 'fix' }]
            const segRW = parseFloat(seg.width) || 0
            const pEff = panels.map((p, i) => {
              if (i === panels.length - 1 && panels.length > 1 && segRW > 0) {
                const others = panels.reduce((s, pp, j) => j !== i ? s + (parseFloat(pp.width) || 0) : s, 0)
                return Math.max(1, segRW - others)
              }
              return parseFloat(p.width) || 0
            })
            const hasCW = pEff.some(w => w > 0)
            const totPW = hasCW ? pEff.reduce((s, w) => s + (w || 1), 0) : panels.length
            const pWs = pEff.map(w => hasCW ? (w || 1) / totPW * sw : sw / panels.length)
            if (panels.length > 1 && hasCW) {
              let ppx = px
              for (let pi = 0; pi < panels.length; pi++) {
                const pw = pWs[pi]
                const wLabel = Math.round(pEff[pi])
                if (wLabel > 0) {
                  doc.line(ppx, sketchY + sketchH + 1, ppx, panelDimY + 1.5)
                  doc.line(ppx + pw, sketchY + sketchH + 1, ppx + pw, panelDimY + 1.5)
                  doc.line(ppx, panelDimY, ppx + pw, panelDimY)
                  doc.text(`${wLabel}`, ppx + pw / 2, panelDimY + 3.5, { align: 'center' })
                }
                ppx += pw
              }
            }
            px += sw
          }
        }

        // Bottom: segment widths
        let cx2 = sketchX
        for (let si = 0; si < segs.length; si++) {
          const sw = segWidths[si] * scale
          doc.line(cx2, sketchY + sketchH + 1, cx2, segDimY + 1.5)
          doc.line(cx2 + sw, sketchY + sketchH + 1, cx2 + sw, segDimY + 1.5)
          doc.line(cx2, segDimY, cx2 + sw, segDimY)
          doc.text(`${segWidths[si]}`, cx2 + sw / 2, segDimY + 3.5, { align: 'center' })
          cx2 += sw
        }

        // Bottom: total width
        if (segs.length > 1) {
          doc.line(sketchX, segDimY + 2, sketchX, totalDimY + 1.5)
          doc.line(sketchX + sketchW, segDimY + 2, sketchX + sketchW, totalDimY + 1.5)
          doc.line(sketchX, totalDimY, sketchX + sketchW, totalDimY)
          doc.text(`${totalRealW}`, sketchX + sketchW / 2, totalDimY + 3.5, { align: 'center' })
        }

        // Right: per-segment heights sorted by height desc (tallest = rightmost = furthest from object)
        const colSp = 7
        const segsWithBD = segs.filter(s => (s.oberlicht && parseFloat(s.oberlichtHeight) > 0) || (s.unterlicht && parseFloat(s.unterlichtHeight) > 0))
        const dimColsR = segs.length + segsWithBD.length
        const sortedIdxs = segs.map((_, i) => i).sort((a, b) => segHeights[b] - segHeights[a])
        let colIdx = dimColsR - 1
        for (const si of sortedIdxs) {
          const segRealH = segHeights[si]
          const sh = segRealH * scale
          let sy = sketchY
          if (align === 'bottom') sy = sketchY + sketchH - sh
          else if (align === 'center') sy = sketchY + (sketchH - sh) / 2

          const seg = segs[si]
          const olHmm = parseFloat(seg.oberlichtHeight) || 0
          const ulHmm = parseFloat(seg.unterlichtHeight) || 0
          const hasBreakdown = (seg.oberlicht && olHmm > 0) || (seg.unterlicht && ulHmm > 0)
          const olDispMm = seg.oberlicht && olHmm > 0 ? olHmm : 0
          const ulDispMm = seg.unterlicht && ulHmm > 0 ? ulHmm : 0
          const fluegelHmm = hasBreakdown ? segRealH - olDispMm - ulDispMm : 0

          // Total height column (rightmost of this segment's pair)
          const dimX = sketchX + sketchW + 4 + colIdx * colSp
          doc.line(sketchX + sketchW + 1, sy, dimX + 1.5, sy)
          doc.line(sketchX + sketchW + 1, sy + sh, dimX + 1.5, sy + sh)
          doc.line(dimX, sy, dimX, sy + sh)
          doc.text(`${segRealH}`, dimX + 5, sy + sh / 2, { align: 'center', angle: 90 })
          colIdx--

          // Breakdown column (short ticks only, left of total)
          if (hasBreakdown) {
            const olH = olDispMm > 0 ? sh * olDispMm / segRealH : 0
            const ulH = ulDispMm > 0 ? sh * ulDispMm / segRealH : 0
            const bdX = sketchX + sketchW + 4 + colIdx * colSp
            doc.setFontSize(5)
            if (olDispMm > 0) {
              doc.line(bdX - 1, sy, bdX + 1, sy)
              doc.line(bdX - 1, sy + olH, bdX + 1, sy + olH)
              doc.line(bdX, sy, bdX, sy + olH)
              doc.text(`${olDispMm}`, bdX + 5.5, sy + olH / 2, { align: 'center', angle: 90 })
            }
            doc.line(bdX - 1, sy + olH, bdX + 1, sy + olH)
            doc.line(bdX - 1, sy + sh - ulH, bdX + 1, sy + sh - ulH)
            doc.line(bdX, sy + olH, bdX, sy + sh - ulH)
            doc.text(`${fluegelHmm}`, bdX + 5.5, sy + olH + (sh - olH - ulH) / 2, { align: 'center', angle: 90 })
            if (ulDispMm > 0) {
              doc.line(bdX - 1, sy + sh - ulH, bdX + 1, sy + sh - ulH)
              doc.line(bdX - 1, sy + sh, bdX + 1, sy + sh)
              doc.line(bdX, sy + sh - ulH, bdX, sy + sh)
              doc.text(`${ulDispMm}`, bdX + 5.5, sy + sh - ulH + ulH / 2, { align: 'center', angle: 90 })
            }
            doc.setFontSize(6)
            colIdx--
          }
        }

        // "Ansicht von innen"
        const bottomOffset = segs.length > 1 ? (hasPanelWidths ? 24 : 18) : (hasPanelWidths ? 16 : 10)
        doc.setFontSize(6); doc.setTextColor(150)
        doc.text('Ansicht von innen', sketchX + sketchW / 2, sketchY + sketchH + bottomOffset, { align: 'center' })

        // Details table — offset past all dim columns
        const dimRightEdge = sketchX + sketchW + 4 + (dimColsR - 1) * colSp + 8
        const detX = dimRightEdge + 5
        const detValX = detX + 30
        const detW = pageW - margin - detValX
        doc.setFontSize(8); doc.setTextColor(80)
        let dy = sketchY
        const segDescs = segs.map((seg, i) => {
          const letter = String.fromCharCode(65 + i)
          const types = (seg.panels || []).map(p => p.type === 'kipp-dreh' ? 'DK' : p.type === 'dreh' ? 'D' : p.type === 'kipp' ? 'K' : 'F').join('+')
          return `${letter}: ${seg.width || '?'}×${seg.height || '?'} (${types}${seg.oberlicht ? '+OL' : ''}${seg.unterlicht ? '+UL' : ''})`
        })
        const details = [
          ['Typ', `Mehrteilig (${segs.length} Segmente)`],
          ['Maße', `${totalRealW} × ${maxRealH} mm`],
          ['Segmente', segDescs.join(', ')],
          pos.material ? ['Material', pos.material] : null,
          pos.profil ? ['Profil', pos.profil] : null,
          pos.glazing ? ['Verglasung', pos.glazing] : null,
          pos.color ? ['Farbe', pos.color] : null,
          pos.count && pos.count !== '1' ? ['Anzahl', `${pos.count} Stück`] : null,
          pos.notes ? ['Bemerkung', pos.notes] : null,
        ].filter(Boolean)
        for (const [label, value] of details) {
          doc.setFont('helvetica', 'bold'); doc.text(label + ':', detX, dy)
          doc.setFont('helvetica', 'normal')
          const valLines = doc.splitTextToSize(value, detW)
          doc.text(valLines, detValX, dy)
          dy += valLines.length * 4 + 1
        }

        y = Math.max(y, sketchY + sketchH + 22, dy + 4)
      } else {
      // ── STANDARD (single-type) ──

      // Left side: window sketch — proportional
      const totalPosW = parseFloat(pos.width) || 0
      const totalPosH = parseFloat(pos.height) || 0
      const maxSkW = 65, maxSkH = 55
      let sketchW, sketchH
      if (totalPosW > 0 && totalPosH > 0) {
        const scale = Math.min(maxSkW / totalPosW, maxSkH / totalPosH)
        sketchW = totalPosW * scale; sketchH = totalPosH * scale
      } else {
        sketchW = maxSkW; sketchH = maxSkH
      }
      const sketchX = margin + 17
      const sketchY = y
      const inset = 2.5 // frame inset for Flügelrahmen
      const handleW = 1.2, handleH = 5

      // Outer frame (Blendrahmen)
      doc.setDrawColor(80)
      doc.setLineWidth(0.7)
      doc.rect(sketchX, sketchY, sketchW, sketchH)

      const panels = pos.panels || []
      const olHmm = parseFloat(pos.oberlichtHeight) || 0
      const olH = pos.oberlicht ? (olHmm > 0 && totalPosH > 0 ? sketchH * olHmm / totalPosH : sketchH * 0.25) : 0
      const ulHmm = parseFloat(pos.unterlichtHeight) || 0
      const ulH = pos.unterlicht ? (ulHmm > 0 && totalPosH > 0 ? sketchH * ulHmm / totalPosH : sketchH * 0.25) : 0
      const panelH = sketchH - olH - ulH
      const panelY = sketchY + olH

      // Proportional panel widths — last panel = remainder of pos.width
      const effWidths = panels.map((p, i) => {
        if (i === panels.length - 1 && panels.length > 1 && totalPosW > 0) {
          const others = panels.reduce((s, pp, j) => j !== i ? s + (parseFloat(pp.width) || 0) : s, 0)
          return Math.max(1, totalPosW - others)
        }
        return parseFloat(p.width) || 0
      })
      const hasCustomWidths = effWidths.some(w => w > 0)
      const totalPW = hasCustomWidths ? effWidths.reduce((s, w) => s + (w || 1), 0) : panels.length
      const panelWidths = effWidths.map(w => hasCustomWidths ? (w || 1) / totalPW * sketchW : sketchW / panels.length)

      // Oberlicht
      if (pos.oberlicht) {
        doc.setDrawColor(80)
        doc.line(sketchX, sketchY + olH, sketchX + sketchW, sketchY + olH)
        // Inner frame for oberlicht
        doc.setLineWidth(0.3)
        doc.rect(sketchX + inset, sketchY + inset, sketchW - 2 * inset, olH - 2 * inset)
        doc.setDrawColor(160)
        doc.setLineDashPattern([1.5, 1.5], 0)
        doc.line(sketchX + inset, sketchY + inset, sketchX + sketchW - inset, sketchY + olH - inset)
        doc.line(sketchX + sketchW - inset, sketchY + inset, sketchX + inset, sketchY + olH - inset)
        doc.setLineDashPattern([], 0)
      }

      // Panels
      let pxOff = sketchX
      for (let i = 0; i < panels.length; i++) {
        const pw = panelWidths[i]
        const px = pxOff
        const p = panels[i]
        doc.setDrawColor(80)
        doc.setLineWidth(0.5)
        if (i > 0) doc.line(px, panelY, px, panelY + panelH)

        // Inner frame (Flügelrahmen)
        const ix = px + inset, iy = panelY + inset, iw = pw - 2 * inset, ih = panelH - 2 * inset
        doc.setLineWidth(0.3)
        doc.rect(ix, iy, iw, ih)

        const cx = ix + iw / 2, cy = iy + ih / 2
        if (p.type === 'fix') {
          doc.setDrawColor(160)
          doc.setLineDashPattern([1.5, 1.5], 0)
          doc.line(ix, iy, ix + iw, iy + ih)
          doc.line(ix + iw, iy, ix, iy + ih)
          doc.setLineDashPattern([], 0)
        }
        if (p.type === 'kipp' || p.type === 'kipp-dreh') {
          doc.setDrawColor(160)
          doc.setLineDashPattern([1.5, 1.5], 0)
          doc.line(ix, iy + ih, cx, iy)
          doc.line(ix + iw, iy + ih, cx, iy)
          doc.setLineDashPattern([], 0)
        }
        if (p.type === 'klapp') {
          doc.setDrawColor(160)
          doc.setLineDashPattern([1.5, 1.5], 0)
          doc.line(ix, iy, cx, iy + ih)
          doc.line(ix + iw, iy, cx, iy + ih)
          doc.setLineDashPattern([], 0)
        }
        if (p.type === 'dreh' || p.type === 'kipp-dreh') {
          doc.setDrawColor(80)
          doc.setLineDashPattern([], 0)
          if (p.hinge === 'left' || !p.hinge) {
            doc.line(ix, iy, ix + iw, cy)
            doc.line(ix, iy + ih, ix + iw, cy)
          } else {
            doc.line(ix + iw, iy, ix, cy)
            doc.line(ix + iw, iy + ih, ix, cy)
          }
        }
        // Handle (Griff) — centered in frame, opposite side of hinge
        const showHandle = p.type === 'dreh' || p.type === 'kipp-dreh' || p.type === 'kipp'
        if (showHandle) {
          const isLeft = p.hinge === 'left' || !p.hinge
          const hx = isLeft ? (ix + iw + px + pw) / 2 - handleW / 2 : (px + ix) / 2 - handleW / 2
          const hy = iy + ih / 2 - handleH / 2
          doc.setFillColor(80)
          doc.rect(hx, hy, handleW, handleH, 'F')
        }
        pxOff += pw
      }

      // Unterlicht
      if (pos.unterlicht) {
        const ulY = sketchY + sketchH - ulH
        doc.setDrawColor(80)
        doc.setLineWidth(0.5)
        doc.line(sketchX, ulY, sketchX + sketchW, ulY)
        doc.setLineWidth(0.3)
        doc.rect(sketchX + inset, ulY + inset, sketchW - 2 * inset, ulH - 2 * inset)
        doc.setDrawColor(160)
        doc.setLineDashPattern([1.5, 1.5], 0)
        doc.line(sketchX + inset, ulY + inset, sketchX + sketchW - inset, ulY + ulH - inset)
        doc.line(sketchX + sketchW - inset, ulY + inset, sketchX + inset, ulY + ulH - inset)
        doc.setLineDashPattern([], 0)
      }

      // Dimension lines (Kotierung)
      doc.setDrawColor(140)
      doc.setLineWidth(0.3)
      doc.setFontSize(6)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(120)

      if (totalPosW > 0) {
        const dimY1 = sketchY + sketchH + 3
        const dimY2 = sketchY + sketchH + 7

        // Individual panel widths (if custom)
        if (hasCustomWidths && panels.length > 1) {
          let cx = sketchX
          for (let i = 0; i < panels.length; i++) {
            const pw = panelWidths[i]
            const ew = effWidths[i]
            // Extension lines
            doc.line(cx, sketchY + sketchH + 1, cx, dimY1 + 1.5)
            doc.line(cx + pw, sketchY + sketchH + 1, cx + pw, dimY1 + 1.5)
            // Dimension line
            doc.line(cx, dimY1, cx + pw, dimY1)
            // Ticks
            doc.line(cx, dimY1 - 1, cx, dimY1 + 1)
            doc.line(cx + pw, dimY1 - 1, cx + pw, dimY1 + 1)
            // Text
            if (ew > 0) doc.text(`${Math.round(ew)}`, cx + pw / 2, dimY1 + 3.5, { align: 'center' })
            cx += pw
          }
        }

        // Total width
        const totalDimY = hasCustomWidths && panels.length > 1 ? dimY2 + 2 : dimY1
        // Extension lines
        doc.line(sketchX, sketchY + sketchH + 1, sketchX, totalDimY + 1.5)
        doc.line(sketchX + sketchW, sketchY + sketchH + 1, sketchX + sketchW, totalDimY + 1.5)
        // Dimension line
        doc.line(sketchX, totalDimY, sketchX + sketchW, totalDimY)
        // Ticks
        doc.line(sketchX, totalDimY - 1, sketchX, totalDimY + 1)
        doc.line(sketchX + sketchW, totalDimY - 1, sketchX + sketchW, totalDimY + 1)
        // Text
        doc.text(`${totalPosW}`, sketchX + sketchW / 2, totalDimY + 3.5, { align: 'center' })
      }

      // Right side: height dimensions (total + breakdown if OL/UL heights entered)
      const olDispMm = pos.oberlicht && olHmm > 0 ? olHmm : 0
      const ulDispMm = pos.unterlicht && ulHmm > 0 ? ulHmm : 0
      const hasHeightBreakdown = olDispMm > 0 || ulDispMm > 0
      const fluegelHmm = hasHeightBreakdown ? totalPosH - olDispMm - ulDispMm : 0
      const heightDimCols = 1 + (hasHeightBreakdown ? 1 : 0)
      const colSpH = 7

      if (totalPosH > 0) {
        // Total height — rightmost column (furthest from object)
        const totalColIdx = heightDimCols - 1
        const dimX = sketchX + sketchW + 4 + totalColIdx * colSpH
        doc.line(sketchX + sketchW + 1, sketchY, dimX + 1.5, sketchY)
        doc.line(sketchX + sketchW + 1, sketchY + sketchH, dimX + 1.5, sketchY + sketchH)
        doc.line(dimX, sketchY, dimX, sketchY + sketchH)
        doc.text(`${totalPosH}`, dimX + 5, sketchY + sketchH / 2, { align: 'center', angle: 90 })

        // Breakdown: OL, Flügel, UL — closest column (short ticks)
        if (hasHeightBreakdown) {
          const bdX = sketchX + sketchW + 4
          doc.setFontSize(5)
          if (olDispMm > 0) {
            doc.line(bdX - 1, sketchY, bdX + 1, sketchY)
            doc.line(bdX - 1, sketchY + olH, bdX + 1, sketchY + olH)
            doc.line(bdX, sketchY, bdX, sketchY + olH)
            doc.text(`${olDispMm}`, bdX + 5.5, sketchY + olH / 2, { align: 'center', angle: 90 })
          }
          doc.line(bdX - 1, sketchY + olH, bdX + 1, sketchY + olH)
          doc.line(bdX - 1, sketchY + sketchH - ulH, bdX + 1, sketchY + sketchH - ulH)
          doc.line(bdX, sketchY + olH, bdX, sketchY + sketchH - ulH)
          doc.text(`${fluegelHmm}`, bdX + 5.5, sketchY + olH + (sketchH - olH - ulH) / 2, { align: 'center', angle: 90 })
          if (ulDispMm > 0) {
            doc.line(bdX - 1, sketchY + sketchH - ulH, bdX + 1, sketchY + sketchH - ulH)
            doc.line(bdX - 1, sketchY + sketchH, bdX + 1, sketchY + sketchH)
            doc.line(bdX, sketchY + sketchH - ulH, bdX, sketchY + sketchH)
            doc.text(`${ulDispMm}`, bdX + 5.5, sketchY + sketchH - ulH + ulH / 2, { align: 'center', angle: 90 })
          }
          doc.setFontSize(6)
        }
      }

      // "Ansicht von innen" below sketch
      doc.setFontSize(6)
      doc.setTextColor(150)
      doc.text('Ansicht von innen', sketchX + sketchW / 2, sketchY + sketchH + (hasCustomWidths && panels.length > 1 ? 18 : 10), { align: 'center' })

      // Right side: details table — offset past dim columns
      const dimRightEdgeStd = sketchX + sketchW + 4 + (heightDimCols - 1) * colSpH + 8
      const detX = dimRightEdgeStd + 5
      const detValX = detX + 30
      const detW = pageW - margin - detValX
      doc.setFontSize(8)
      doc.setTextColor(80)
      let dy = sketchY

      const details = [
        pos.width && pos.height ? ['Maße', `${pos.width} × ${pos.height} mm`] : null,
        pos.material ? ['Material', pos.material] : null,
        pos.profil ? ['Profil', pos.profil] : null,
        pos.glazing ? ['Verglasung', pos.glazing] : null,
        pos.color ? ['Farbe', pos.color] : null,
      ].filter(Boolean)

      // Öffnungsart from panels
      const oeffnung = (pos.panels || []).map(p => {
        const t = p.type === 'kipp-dreh' ? 'Dreh-Kipp' : p.type === 'dreh' ? 'Dreh' : p.type === 'kipp' ? 'Kipp' : 'Fest'
        return t
      }).join(' + ') + (pos.oberlicht ? ' + Oberlicht' : '') + (pos.unterlicht ? ' + Unterlicht' : '')
      if (oeffnung) details.push(['Öffnungsart', oeffnung])
      if (pos.count && pos.count !== '1') details.push(['Anzahl', `${pos.count} Stück`])
      if (pos.notes) details.push(['Bemerkung', pos.notes])

      doc.setFont('helvetica', 'normal')
      doc.setTextColor(80)
      for (const [label, value] of details) {
        doc.setFont('helvetica', 'bold')
        doc.text(label + ':', detX, dy)
        doc.setFont('helvetica', 'normal')
        const valLines = doc.splitTextToSize(value, detW)
        doc.text(valLines, detValX, dy)
        dy += valLines.length * 4 + 1
      }

      y = Math.max(y, sketchY + sketchH + (hasCustomWidths ? 22 : 14), dy + 4)
      } // end if/else mehrteilig

      // Separator
      if (pi < positions.length - 1) {
        doc.setDrawColor(220)
        doc.line(margin, y, pageW - margin, y)
        y += 6
      }
    }

    // Summary: total count
    if (positions.length > 0) {
      y += 4
    }
  } else {

  // --- ROOMS ---
  const rooms = aufmass.rooms || []

  for (const room of rooms) {
    // Estimate room height: header + items + netto + sketch
    const roomItems = (room.items || []).filter(i => !i.subtract)
    const roomSubs = (room.items || []).filter(i => i.subtract)
    const estH = 10 + (roomItems.length + roomSubs.length) * 6 + 30 + 70
    // If room won't fit and we're past top third of page, start new page
    if (y + estH > pageH - 20 && y > margin + 60) {
      doc.addPage()
      y = margin
    }

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
    const gwVob = GEWERKE_VOB[aufmass.gewerk] || {}
    const hasWallPos = ['maler', 'fliesen', 'trockenbau'].includes(aufmass.gewerk)
    const vobThr = hasWallPos ? (gwVob.vobWand || 0) : (gwVob.vobBoden || 0)

    // Trades with Wand: sort items — Wandfläche first, then Abzüge, then rest
    const isMaler = hasWallPos
    const sortedItems = isMaler
      ? [
          ...items.filter(i => i.unit === 'Wand' && !i.subtract),
          ...items.filter(i => i.subtract && i.opening_target !== 'boden'),
          ...items.filter(i => i.unit === 'm²' && !i.subtract && !i.isForm),
          ...items.filter(i => i.subtract && i.opening_target === 'boden'),
          ...items.filter(i => i.unit === 'lfm' && !i.subtract),
          ...items.filter(i => i.unit !== 'Wand' && i.unit !== 'm²' && i.unit !== 'lfm' && !i.subtract && !i.isForm),
          ...items.filter(i => i.isForm && !i.subtract),
        ]
      : items

    for (const item of sortedItems) {
      checkBreak(6)
      const isAbzug = !!item.subtract
      const isForm = !!item.isForm
      // VOB Übermessung hint for Maler openings
      let isUebermessen = false
      if (isAbzug && vobThr > 0 && item.result > 0) {
        const cnt = parseFloat(item.count) || 1
        const singleArea = cnt > 0 ? item.result / cnt : item.result
        if (singleArea < vobThr) isUebermessen = true
      }
      const desc = (item.description || '—') + (isAbzug ? (isUebermessen ? ' (übermessen)' : ' (Abzug)') : isForm ? ' (Ergänzung)' : '')
      const calc = (item.calculation || '-').replace(/π/g, 'pi')
      const unit = (item.unit === 'Wand' || item.unit === 'Bogen' || item.unit === 'Trap') ? 'm²' : (item.unit || '')
      // For lfm with deductions, show brutto (before deductions)
      let displayResult = item.result || 0
      if (item.unit === 'lfm' && item.deductions?.length > 0) {
        const totalDed = item.deductions.reduce((s, d) => s + ((parseFloat(d.width) || 0) * (parseInt(d.count) || 1)), 0)
        displayResult = Math.round((displayResult + totalDed) * 100) / 100
      }
      const resultStr = displayResult != null ? (isAbzug ? (isUebermessen ? formatNum(displayResult) : `- ${formatNum(displayResult)}`) : isForm ? `+ ${formatNum(displayResult)}` : formatNum(displayResult)) : '-'

      const descLines = doc.splitTextToSize(desc, 60)
      doc.setFontSize(9)
      if (isAbzug && isUebermessen) doc.setTextColor(130, 130, 130)
      else if (isAbzug) doc.setTextColor(200, 80, 50)
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

      // Sockelleiste deductions (Türbreite etc.)
      if (item.unit === 'lfm' && item.deductions?.length > 0) {
        for (const ded of item.deductions) {
          const dedW = parseFloat(ded.width) || 0
          const dedC = parseInt(ded.count) || 1
          if (dedW <= 0) continue
          checkBreak(6)
          doc.setFontSize(9)
          doc.setTextColor(200, 80, 50)
          doc.text('  Abzug', col.bez, y)
          doc.text(dedC > 1 ? `${ded.width}m × ${dedC}` : `${ded.width}m`, col.ber, y)
          doc.text('lfm', col.ein, y)
          doc.text(`- ${formatNum(dedW * dedC)}`, col.erg, y)
          doc.setTextColor(30)
          doc.setDrawColor(220)
          doc.line(margin, y + 3, pageW - margin, y + 3)
          y += 9
        }
      }
    }

    // Netto section
    const subtractItems = items.filter(i => (i.subtract || i.isForm) && i.result != null)
    if (subtractItems.length > 0) {
      if (isMaler) {
        // Wall-based trades: multi-line netto breakdown
        const wandBrutto = items.filter(i => i.unit === 'Wand' && !i.subtract).reduce((s, i) => s + (i.result || 0), 0)
        let totalAbzug = 0
        for (const op of items.filter(i => i.subtract && i.opening_target !== 'boden')) {
          const total = op.result || 0
          const cnt = parseFloat(op.count) || 1
          const singleArea = cnt > 0 ? total / cnt : total
          if (vobThr > 0 && singleArea < vobThr) continue
          totalAbzug += total
        }
        const wandNetto = wandBrutto - totalAbzug
        // Floor openings reduce Bodenfläche
        let bodenAbzug = 0
        for (const op of items.filter(i => i.subtract && i.opening_target === 'boden')) {
          bodenAbzug += (op.result || 0)
        }
        const flaecheBrutto = items.filter(i => i.unit === 'm²' && !i.subtract && !i.isForm).reduce((s, i) => s + (i.result || 0), 0)
        const flaeche = flaecheBrutto - bodenAbzug
        const lfm = items.filter(i => i.unit === 'lfm' && !i.subtract).reduce((s, i) => s + (i.result || 0), 0)
        const stk = items.filter(i => i.unit === 'Stk' && !i.subtract).reduce((s, i) => s + (i.result || 0), 0)
        const flaecheLabel = ['maler', 'trockenbau'].includes(aufmass.gewerk) ? 'Deckenfläche' : 'Bodenfläche'

        checkBreak(20)
        doc.setDrawColor(150)
        doc.line(margin, y, pageW - margin, y)
        y += 4
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(30)

        if (wandNetto > 0) { doc.text('Netto Wandfläche:', col.bez, y); doc.text(`${formatNum(wandNetto)} m²`, col.erg, y); y += 5 }
        if (flaeche > 0) { doc.text(`${flaecheLabel}:`, col.bez, y); doc.text(`${formatNum(flaeche)} m²`, col.erg, y); y += 5 }
        if (lfm > 0) { doc.text('Laufmeter:', col.bez, y); doc.text(`${formatNum(lfm)} lfm`, col.erg, y); y += 5 }
        if (stk > 0) { doc.text('Stück:', col.bez, y); doc.text(`${formatNum(stk)} Stk`, col.erg, y); y += 5 }
        doc.setFont('helvetica', 'normal')
      } else {
        // Floor-only / generic: single-line netto with VOB threshold
        const nettoByUnit = {}
        for (const item of items) {
          if (item.result == null) continue
          const u = (['Wand', 'Bogen', 'Trap'].includes(item.unit) ? 'm²' : item.unit) || ''
          if (!u) continue
          let sign = item.subtract ? -1 : 1
          if (item.subtract && vobThr > 0) {
            const cnt = parseFloat(item.count) || 1
            const singleArea = cnt > 0 ? item.result / cnt : item.result
            if (singleArea < vobThr) sign = 0
          }
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
    }

    y += 3

    // --- SKETCH (forms integrated above rect in drawRoomSketch) ---
    if (hasSketchData(room)) {
      checkBreak(100)
      y += 3
      y = drawRoomSketch(doc, room, margin, y, contentW, aufmass.gewerk)
      y += 5
    }
  }

  // --- SUMMARY ---
  const totals = computeTotals(rooms, aufmass.gewerk)
  const totalEntries = Object.entries(totals).filter(([, v]) => v > 0)

  if (totalEntries.length > 0 && rooms.length > 1) {
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
      const displayUnit = unit === 'Wand' ? 'm² (Wandfläche)' : unit
      doc.text(`Gesamt ${displayUnit}:`, margin + 2, y)
      doc.setFont('helvetica', 'bold')
      doc.text(`${formatNum(total)} ${unit === 'Wand' ? 'm²' : unit}`, margin + 55, y)
      doc.setFont('helvetica', 'normal')
      y += 5
    }
  }
  } // end else (non-fensterbau)

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

    const fmtD = v => v < 1 ? `${(v * 100).toFixed(0)}` : `${v.toFixed(2)}`
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
function drawRoomSketch(doc, room, margin, startY, contentW, gewerk) {
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

  // Check if room is Wand-based → draw unfolded wall rectangle 2(L+B)×H
  // For wall-based trades (Maler, Fliesen, Trockenbau): always prefer Wand sketch
  const hasWand = (room.items || []).some(i => i.unit === 'Wand' && i.length && i.width && i.height && !i.subtract)
  const hasM2   = (room.items || []).some(i => i.unit === 'm²' && i.length && i.width && !i.subtract)
  const wallTrades = ['maler', 'trockenbau']

  // Fliesen: draw both Wand + Floor sketches if both exist
  if (gewerk === 'fliesen' && hasWand && hasM2) {
    let y = drawWandSketch(doc, room, margin, startY, contentW, gewerk)
    y += 5
    return drawFloorSketchOnly(doc, room, margin, y, contentW, gewerk)
  }

  if (hasWand && (!hasM2 || wallTrades.includes(gewerk))) {
    return drawWandSketch(doc, room, margin, startY, contentW, gewerk)
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

  // Openings (subtract items) — hatched shapes inside the rect
  // For fliesen: only show boden openings on floor sketch
  const m2Openings = (room.items || []).filter(i => i.subtract && i.length && i.unit === 'm²' && (gewerk !== 'fliesen' || i.opening_target === 'boden' || !i.opening_target))
  // Group by type: round vs rect
  const roundOpenings = m2Openings.filter(i => i.description?.toLowerCase().includes('rund'))
  const rectOpenings = m2Openings.filter(i => !i.description?.toLowerCase().includes('rund'))
  const groups = []
  if (rectOpenings.length > 0) groups.push({ items: rectOpenings, isRound: false })
  if (roundOpenings.length > 0) groups.push({ items: roundOpenings, isRound: true })
  const nGroups = groups.length
  if (nGroups > 0) {
    const groupGap = rectW / (nGroups + 1)
    for (let gi = 0; gi < nGroups; gi++) {
      const group = groups[gi]
      const rep = group.items[0] // Representative item for dimensions
      const totalCount = group.items.reduce((s, i) => s + (parseInt(i.count) || 1), 0)
      const s2 = rep.dim_unit === 'cm' ? 0.01 : 1
      const oL = (parseFloat(rep.length) || 0) * s2
      const oHraw = (parseFloat(rep.width) || 0) * s2
      if (oL <= 0) continue
      const oW = Math.min(oL * scale, rectW * 0.35)
      const oh = group.isRound ? oW : Math.min(oHraw > 0 ? oHraw * scale : rectH * 0.3, rectH * 0.35)
      const cx2 = rectX + rectW / 2
      const ox = cx2 - oW / 2
      const oy = group.isRound ? rectY + rectH * 0.25 - oh / 2 : rectY + rectH * 0.65 - oh / 2
      const op = rep
      const isRound = group.isRound
      doc.setFillColor(255, 255, 255)
      doc.setDrawColor(100)
      doc.setLineWidth(0.4)
      if (isRound) {
        const r = Math.min(oW, oh) / 2
        doc.circle(ox + oW / 2, oy + oh / 2, r, 'FD')
      } else if (op.shape === 'elli') {
        const k2 = 0.5523
        doc.lines([[0,-oh*k2,(oW/2)*(1-k2),-oh,oW/2,-oh],[(oW/2)*k2,0,oW/2,oh*(1-k2),oW/2,oh],[-oW,0]], ox, oy+oh, [1,1],'FD',true)
      } else if (op.shape === 'tri') {
        doc.triangle(ox, oy+oh, ox+oW/2, oy, ox+oW, oy+oh, 'FD')
      } else {
        doc.rect(ox, oy, oW, oh, 'FD')
      }
      // 45° hatching — clipped to shape
      doc.setDrawColor(200, 60, 40)
      doc.setLineWidth(0.25)
      const step2 = 2.5
      if (isRound) {
        // 45° hatching clipped to circle
        const r = Math.min(oW, oh) / 2
        const cx = ox + oW / 2, cy = oy + oh / 2
        for (let d = -(2 * r - step2); d < 2 * r; d += step2) {
          const x1 = cx - r + Math.max(0, d)
          const y1 = cy - r + Math.max(0, -d)
          const x2 = cx - r + Math.min(2 * r, d + 2 * r)
          const y2 = cy - r + Math.min(2 * r, -d + 2 * r)
          // Clip to circle
          const pts = [[x1, y1], [x2, y2]].map(([px, py]) => {
            const dx = px - cx, dy = py - cy
            const dist = Math.sqrt(dx * dx + dy * dy)
            if (dist <= r) return [px, py]
            return [cx + dx / dist * r, cy + dy / dist * r]
          })
          if (Math.sqrt((pts[0][0]-cx)**2+(pts[0][1]-cy)**2) <= r + 0.1 && Math.sqrt((pts[1][0]-cx)**2+(pts[1][1]-cy)**2) <= r + 0.1) {
            doc.line(pts[0][0], pts[0][1], pts[1][0], pts[1][1])
          }
        }
      } else if (op.shape === 'elli') {
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
      const uniqueNames = [...new Set(group.items.map(i => i.description || 'Abzug'))]
      const groupName = uniqueNames.length === 1 ? uniqueNames[0] : 'Abzug'
      const dimLabel = (totalCount > 1 ? `${totalCount}× ` : '') + groupName
      doc.setTextColor(200, 60, 40)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(5.5)
      doc.text(dimLabel, ox + oW / 2, oy - 2.5, { align: 'center' })
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(5)
      const dimSub = isRound ? `d=${fmtDim(oL)}` : (oHraw > 0 ? `${fmtDim(oL)}×${fmtDim(oHraw)}` : fmtDim(oL))
      doc.text(dimSub, ox + oW / 2, oy - 0.5, { align: 'center' })
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
    if (m2Openings.length > 0) {
      // Name above top edge when openings exist
      doc.text(room.name || '', rectX + rectW / 2, rectY - 2, { align: 'center' })
    } else {
      // Name centered when no openings
      doc.text(room.name || '', rectX + rectW / 2, rectY + rectH / 2, { align: 'center', baseline: 'middle' })
    }
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
// Floor-only sketch (for Fliesen when both Wand + Floor exist)
function drawFloorSketchOnly(doc, room, margin, startY, contentW, gewerk) {
  let L = 0, B = 0
  for (const item of room.items || []) {
    if (item.unit === 'm²' && item.length && item.width && !item.subtract) {
      const s = item.dim_unit === 'cm' ? 0.01 : 1
      const l = (parseFloat(item.length) || 0) * s
      const b = (parseFloat(item.width) || 0) * s
      if (l > 0 && b > 0 && l * b > L * B) { L = l; B = b }
    }
  }
  if (L === 0 || B === 0) return startY

  const leftDim = 20, rightDim = 4, topMargin = 2, bottomDim = 13
  const availW = contentW - leftDim - rightDim
  const availH = 55
  const scale = Math.min(availW / L, availH / B)
  const rectW = L * scale, rectH = B * scale
  const fx = margin + leftDim + (availW - rectW) / 2
  const fy = startY + topMargin

  // Draw floor rectangle
  doc.setFillColor(245, 245, 245)
  doc.setDrawColor(60)
  doc.setLineWidth(0.6)
  doc.rect(fx, fy, rectW, rectH, 'FD')

  // Room name
  const m2Openings = (room.items || []).filter(i => i.subtract && i.length && i.unit === 'm²' && i.opening_target === 'boden')
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(140)
  if (m2Openings.length > 0) {
    doc.text(room.name || '', fx + rectW / 2, fy - 2, { align: 'center' })
  } else {
    doc.text(room.name || '', fx + rectW / 2, fy + rectH / 2, { align: 'center', baseline: 'middle' })
  }

  // Draw boden openings (Aussparungen)
  const roundOps = m2Openings.filter(i => i.description?.toLowerCase().includes('rund'))
  const rectOps = m2Openings.filter(i => !i.description?.toLowerCase().includes('rund'))
  const groups = []
  if (rectOps.length > 0) groups.push({ items: rectOps, isRound: false })
  if (roundOps.length > 0) groups.push({ items: roundOps, isRound: true })
  for (let gi = 0; gi < groups.length; gi++) {
    const group = groups[gi]
    const rep = group.items[0]
    const totalCount = group.items.reduce((s, i) => s + (parseInt(i.count) || 1), 0)
    const s2 = rep.dim_unit === 'cm' ? 0.01 : 1
    const oL = (parseFloat(rep.length) || 0) * s2
    const oHraw = (parseFloat(rep.width) || 0) * s2
    if (oL <= 0) continue
    const oW = Math.min(oL * scale, rectW * 0.35)
    const oh = group.isRound ? oW : Math.min(oHraw > 0 ? oHraw * scale : rectH * 0.3, rectH * 0.35)
    const ox = fx + rectW / 2 - oW / 2
    const oy = group.isRound ? fy + rectH * 0.25 - oh / 2 : fy + rectH * 0.65 - oh / 2

    doc.setFillColor(255, 255, 255)
    doc.setDrawColor(100)
    doc.setLineWidth(0.4)
    if (group.isRound) {
      const r = Math.min(oW, oh) / 2
      doc.circle(ox + oW / 2, oy + oh / 2, r, 'FD')
    } else {
      doc.rect(ox, oy, oW, oh, 'FD')
    }

    // Red hatch
    doc.setDrawColor(200, 60, 40)
    doc.setLineWidth(0.25)
    const step2 = 2.5
    if (group.isRound) {
      const r = Math.min(oW, oh) / 2
      const cx = ox + oW / 2, cy = oy + oh / 2
      for (let d = -(2 * r - step2); d < 2 * r; d += step2) {
        const x1 = cx - r + Math.max(0, d), y1 = cy - r + Math.max(0, -d)
        const x2 = cx - r + Math.min(2 * r, d + 2 * r), y2 = cy - r + Math.min(2 * r, -d + 2 * r)
        const pts = [[x1,y1],[x2,y2]].map(([px,py]) => { const dx=px-cx, dy=py-cy, dist=Math.sqrt(dx*dx+dy*dy); return dist<=r?[px,py]:[cx+dx/dist*r,cy+dy/dist*r] })
        if (Math.sqrt((pts[0][0]-cx)**2+(pts[0][1]-cy)**2)<=r+0.1) doc.line(pts[0][0],pts[0][1],pts[1][0],pts[1][1])
      }
    } else {
      for (let d = -(oh - step2); d < oW; d += step2) {
        const lx1 = d >= 0 ? ox + d : ox, ly1 = d >= 0 ? oy : oy - d
        const lx2 = (d+oh)<=oW ? ox+d+oh : ox+oW, ly2 = (d+oh)<=oW ? oy+oh : oy+oW-d
        doc.line(Math.max(ox,Math.min(ox+oW,lx1)),Math.max(oy,Math.min(oy+oh,ly1)),Math.max(ox,Math.min(ox+oW,lx2)),Math.max(oy,Math.min(oy+oh,ly2)))
      }
    }

    // Label
    const uniqueNames = [...new Set(group.items.map(i => i.description || 'Abzug'))]
    const groupName = uniqueNames.length === 1 ? uniqueNames[0] : 'Abzug'
    const dimLabel = (totalCount > 1 ? `${totalCount}× ` : '') + groupName
    doc.setTextColor(200, 60, 40)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(5.5)
    doc.text(dimLabel, ox + oW / 2, oy - 2.5, { align: 'center' })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(5)
    const dimSub = group.isRound ? `d=${fmtDim(oL)}` : (oHraw > 0 ? `${fmtDim(oL)}×${fmtDim(oHraw)}` : fmtDim(oL))
    doc.text(dimSub, ox + oW / 2, oy - 0.5, { align: 'center' })
    doc.setTextColor(40)
  }

  // Dimension lines (same style as Wand sketch)
  doc.setLineWidth(0.25)
  doc.setDrawColor(80)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(40)

  const tick = 1.5, extGap = 2, dimOff = 7

  // Bottom: L
  const dimYB = fy + rectH + dimOff
  doc.line(fx, fy + rectH + extGap, fx, dimYB + tick)
  doc.line(fx + rectW, fy + rectH + extGap, fx + rectW, dimYB + tick)
  doc.line(fx, dimYB, fx + rectW, dimYB)
  doc.line(fx - tick, dimYB, fx + tick, dimYB)
  doc.line(fx + rectW - tick, dimYB, fx + rectW + tick, dimYB)
  doc.text(fmtDim(L), fx + rectW / 2, dimYB - 1.5, { align: 'center' })

  // Right: B
  const dimXR = fx + rectW + dimOff
  doc.line(fx + rectW + extGap, fy, dimXR + tick, fy)
  doc.line(fx + rectW + extGap, fy + rectH, dimXR + tick, fy + rectH)
  doc.line(dimXR, fy, dimXR, fy + rectH)
  doc.line(dimXR - tick, fy, dimXR + tick, fy)
  doc.line(dimXR - tick, fy + rectH, dimXR + tick, fy + rectH)
  doc.text(fmtDim(B), dimXR + 2, fy + rectH / 2, { align: 'center', angle: 90 })

  return dimYB + 10
}

function drawWandSketch(doc, room, margin, startY, contentW, gewerk) {
  const vobThr = gewerk === 'maler' ? 2.5 : 0
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

  // Draw openings (subtract items) — one rectangle per opening type, with count label
  // For fliesen: only show wand openings on wall sketch
  const openings = (room.items || []).filter(i => i.subtract && i.length && (gewerk !== 'fliesen' || i.opening_target !== 'boden'))
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
    const descLower = (op.description || '').toLowerCase()
    const isTuer = descLower.includes('tür') || descLower.includes('tur') || descLower.includes('tor')
    const isFenster = descLower.includes('fenster')
    const oy = isTuer ? rectY + rectH - oH                         // Tür/Tor: am Boden (unten)
             : isFenster ? rectY + (rectH - oH) / 2                // Fenster: mittig
             : rectY                                                 // Sonstiges: an der Decke (oben)

    // Check if übermessen (VOB: single area < threshold → not deducted)
    const singleArea = oL * (oHraw > 0 ? oHraw : 1)
    const isUeberm = vobThr > 0 && singleArea > 0 && singleArea < vobThr

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
    doc.setDrawColor(isUeberm ? 150 : 200, isUeberm ? 150 : 60, isUeberm ? 150 : 40)
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

    // Labels ABOVE the opening
    const cnt = parseInt(op.count) || 1
    const dimLabel = (cnt > 1 ? `${cnt}× ` : '') + (op.description || 'Öffnung')
    const dimSub = oHraw > 0 ? `${fmtDim(oL)}×${fmtDim(oHraw)}` : fmtDim(oL)
    doc.setTextColor(isUeberm ? 130 : 200, isUeberm ? 130 : 60, isUeberm ? 130 : 40)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(5.5)
    doc.text(dimLabel, ox + oW / 2, rectY - 4, { align: 'center' })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(5)
    doc.text(dimSub, ox + oW / 2, rectY - 1.5, { align: 'center' })
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
  const hLabel = fmtDim(H)
  const hLabelW = doc.getTextWidth(hLabel)
  doc.text(hLabel, dimXR + 2, rectY + (rectH + hLabelW) / 2, { angle: 90 })

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
  return Number(val).toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

// ─── Utils ────────────────────────────────────────────────────────────────────

function computeTotals(rooms, gewerk) {
  const totals = {}
  const gwVob = GEWERKE_VOB[gewerk] || {}
  const hasWallPos = ['maler', 'fliesen', 'trockenbau'].includes(gewerk)
  const vobThr = hasWallPos ? (gwVob.vobWand || 0) : (gwVob.vobBoden || 0)
  for (const room of rooms || []) {
    for (const item of room.items || []) {
      if (item.unit && item.result != null) {
        const rawU = item.unit
        // Trades with Wand: keep Wand separate from m² so Abzug only applies to Wand
        const u = hasWallPos
          ? (['Bogen', 'Trap'].includes(rawU) ? 'm²' : rawU)
          : (['Wand', 'Bogen', 'Trap'].includes(rawU) ? 'm²' : rawU)
        let sign = item.subtract ? -1 : 1
        if (item.subtract && vobThr > 0) {
          const cnt = parseFloat(item.count) || 1
          const singleArea = cnt > 0 ? item.result / cnt : item.result
          if (singleArea < vobThr) sign = 0
        }
        if (hasWallPos && item.subtract) {
          totals['Wand'] = (totals['Wand'] || 0) + item.result * sign
        } else {
          totals[u] = (totals[u] || 0) + item.result * sign
        }
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
