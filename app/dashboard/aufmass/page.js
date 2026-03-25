'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { generateAufmassPDF, generateAufmassPDFBlob } from '@/lib/pdf/AufmassPDF'
import { SubscriptionGuard } from '@/app/components/subscription/SubscriptionGuard'
import FirstVisitHint from '@/app/components/FirstVisitHint'

const UNITS = ['m²', 'Wand', 'Bogen', 'Trap', 'lfm', 'm³', 'Stk']
const MATERIAL_UNITS = ['Stk', 'L', 'kg', 'm', 'm²', 'Karton', 'Sack']

const GEWERKE = [
  { id: 'fensterbau', label: 'Fensterbau', icon: '🏠', vobWand: null, vobBoden: null, din: null },
  { id: 'maler', label: 'Maler', icon: '🖌️', vobWand: 2.5, vobBoden: 2.5, din: '18363' },
  { id: 'fliesen', label: 'Fliesen', icon: '🔲', vobWand: 2.5, vobBoden: 0.5, din: '18352' },
  { id: 'trockenbau', label: 'Trockenbau', icon: '🧱', vobWand: 2.5, vobBoden: 0.5, din: '18340' },
  { id: 'bodenbelag', label: 'Bodenbelag', icon: '🟫', vobWand: null, vobBoden: 0.5, din: '18365' },
]

// Schnellpositionen per Gewerk (for TradeRaumCard)
const TRADE_SCHNELLPOS = {
  maler: [
    { label: 'Wände', desc: 'Wandfläche', unit: 'Wand', calc: 'wall', icon: '🖌️' },
    { label: 'Decke', desc: 'Deckenfläche', unit: 'm²', calc: 'floor', icon: '🖌️' },
    { label: 'Sockelleiste', desc: 'Sockelleiste', unit: 'lfm', calc: 'perimeter', icon: '📏' },
    { label: 'Tür', desc: 'Tür lackieren', unit: 'Stk', calc: 'stk', icon: '🚪' },
    { label: 'Fenster', desc: 'Fenster lackieren', unit: 'Stk', calc: 'stk', icon: '🪟' },
  ],
  fliesen: [
    { label: 'Bodenfliesen', desc: 'Bodenfliesen', unit: 'm²', calc: 'floor', icon: '🔲' },
    { label: 'Wandfliesen', desc: 'Wandfliesen', unit: 'Wand', calc: 'wall', icon: '🔲' },
    { label: 'Sockelfliesen', desc: 'Sockelfliesen', unit: 'lfm', calc: 'perimeter', icon: '📏' },
  ],
  trockenbau: [
    { label: 'Wandfläche', desc: 'Wandfläche', unit: 'Wand', calc: 'wall', icon: '🧱' },
    { label: 'Decke', desc: 'Deckenfläche', unit: 'm²', calc: 'floor', icon: '🧱' },
    { label: 'Ständerwerk', desc: 'Ständerwerk (UW/CW)', unit: 'lfm', calc: 'perimeter', icon: '📏' },
  ],
  bodenbelag: [
    { label: 'Bodenfläche', desc: 'Bodenfläche', unit: 'm²', calc: 'floor', icon: '🟫' },
    { label: 'Sockelleiste', desc: 'Sockelleiste', unit: 'lfm', calc: 'perimeter', icon: '📏' },
  ],
}

// ─── Fensterbau ─────────────────────────────────────────
const FENSTER_PRESETS = [
  { id: '1-kd-l', label: '1-flg.', panels: [{ type: 'kipp-dreh', hinge: 'left' }] },
  { id: '1-fix', label: 'Fest', panels: [{ type: 'fix' }] },
  { id: '1-kipp', label: 'Kipp', panels: [{ type: 'kipp' }] },
  { id: '1-kd-ob', label: 'DK + OL', panels: [{ type: 'kipp-dreh', hinge: 'left' }], oberlicht: true },
  { id: '2-kd', label: '2-flg.', panels: [{ type: 'kipp-dreh', hinge: 'left' }, { type: 'kipp-dreh', hinge: 'right' }] },
  { id: 'kd-fix', label: 'DK + Fest', panels: [{ type: 'kipp-dreh', hinge: 'left' }, { type: 'fix' }] },
  { id: '2-kd-ob', label: '2-flg. + OL', panels: [{ type: 'kipp-dreh', hinge: 'left' }, { type: 'kipp-dreh', hinge: 'right' }], oberlicht: true },
  { id: '3-kd', label: '3-flg.', panels: [{ type: 'kipp-dreh', hinge: 'left' }, { type: 'fix' }, { type: 'kipp-dreh', hinge: 'right' }] },
  { id: 'mehrteilig', label: 'Mehrteilig', panels: [], segments: true },
]
const FENSTER_MATERIALS = ['Kunststoff', 'Kunststoff-Alu', 'Holz', 'Holz-Alu', 'Aluminium', 'Stahl']
const FENSTER_GLAZING = ['2-fach Verglasung', '3-fach Verglasung']

// DIN window symbol lines for a single panel
function panelSymbolLines(x, y, w, h, type, hinge) {
  const cx = x + w / 2, cy = y + h / 2
  const lines = []
  if (type === 'fix') {
    lines.push({ x1: x, y1: y, x2: x + w, y2: y + h, dash: true })
    lines.push({ x1: x + w, y1: y, x2: x, y2: y + h, dash: true })
  }
  if (type === 'kipp' || type === 'kipp-dreh') {
    lines.push({ x1: x, y1: y + h, x2: cx, y2: y, dash: true })
    lines.push({ x1: x + w, y1: y + h, x2: cx, y2: y, dash: true })
  }
  if (type === 'klapp') {
    lines.push({ x1: x, y1: y, x2: cx, y2: y + h, dash: true })
    lines.push({ x1: x + w, y1: y, x2: cx, y2: y + h, dash: true })
  }
  if (type === 'dreh' || type === 'kipp-dreh') {
    if (hinge === 'left' || !hinge) {
      lines.push({ x1: x, y1: y, x2: x + w, y2: cy })
      lines.push({ x1: x, y1: y + h, x2: x + w, y2: cy })
    } else {
      lines.push({ x1: x + w, y1: y, x2: x, y2: cy })
      lines.push({ x1: x + w, y1: y + h, x2: x, y2: cy })
    }
  }
  return lines
}

// SVG window sketch (used in type selector and position preview)
function FensterSketch({ panels, oberlicht, size = 'sm', posWidth = 0, posHeight = 0, oberlichtHeight = 0, oberlichtType = 'fix', unterlicht = false, unterlichtHeight = 0, unterlichtType = 'fix' }) {
  const isSm = size === 'sm'
  const isXl = size === 'xl'
  const dimSpace = isSm ? 0 : isXl ? 55 : 28 // extra space for dimension lines
  const maxW = isSm ? 48 : isXl ? 360 : 140
  const maxH = isSm ? 36 : isXl ? 240 : 100
  const pad = isSm ? 3 : isXl ? 10 : 6
  const availW = maxW - 2 * pad, availH = maxH - 2 * pad
  // Proportional frame — fallback to placeholder hints when no real values
  const pw0 = parseFloat(posWidth) || 1200, ph0 = parseFloat(posHeight) || 1400
  const scale = Math.min(availW / pw0, availH / ph0)
  const frameW = pw0 * scale, frameH = ph0 * scale
  const vw = frameW + 2 * pad + (isSm ? 0 : dimSpace)
  const vh = frameH + 2 * pad + (isSm ? 0 : dimSpace)
  const fX = pad, fY = pad // frame origin
  const olHmm = parseFloat(oberlichtHeight) || 0
  const olH = oberlicht ? frameH * (olHmm > 0 ? olHmm : 300) / ph0 : 0
  const ulHmm = parseFloat(unterlichtHeight) || 0
  const ulH = unterlicht ? frameH * (ulHmm > 0 ? ulHmm : 300) / ph0 : 0
  const panelH = frameH - olH - ulH
  const sw = isSm ? 0.8 : isXl ? 1.8 : 1.2

  // Proportional panel widths — last panel = remainder of posWidth
  const totalPosW = parseFloat(posWidth) || 0
  const totalPosH = parseFloat(posHeight) || 0
  const effWidths = panels.map((p, i) => {
    if (i === panels.length - 1 && panels.length > 1 && totalPosW > 0) {
      const others = panels.reduce((s, pp, j) => j !== i ? s + (parseFloat(pp.width) || 0) : s, 0)
      if (others > 0) return Math.max(1, totalPosW - others)
    }
    return parseFloat(p.width) || 0
  })
  const hasCustomWidths = effWidths.some(w => w > 0)
  const totalW = hasCustomWidths ? effWidths.reduce((s, w) => s + (w || 1), 0) : panels.length
  const panelWidths = effWidths.map(w => hasCustomWidths ? (w || 1) / totalW * frameW : frameW / panels.length)
  let xOff = fX

  // Dimension line helper
  const dimTick = isSm ? 3 : isXl ? 5 : 3
  const dimOff1 = isSm ? 6 : isXl ? 10 : 6
  const dimOff2 = isSm ? 18 : isXl ? 28 : 18
  const fontSize = isSm ? 7.5 : isXl ? 11 : 7.5

  // Frame inset for inner panel frame
  const inset = isSm ? 2 : isXl ? 10 : 5
  // Handle dimensions
  const handleW = isSm ? 1.2 : isXl ? 4 : 2.5
  const handleH = isSm ? 4 : isXl ? 18 : 10

  return (
    <svg width={isXl ? '100%' : vw} height={isXl ? undefined : vh} viewBox={`0 0 ${vw} ${vh}`} className="text-slate-400" style={isXl ? { maxHeight: '60vh' } : undefined}>
      {/* Outer frame (Blendrahmen) */}
      <rect x={fX} y={fY} width={frameW} height={frameH} fill="none" stroke="currentColor" strokeWidth={sw * 2} />
      {oberlicht && (() => {
        const oix = fX + inset, oiy = fY + inset, oiw = frameW - 2 * inset, oih = olH - 2 * inset
        const olType = oberlichtType || 'fix'
        const olLines = panelSymbolLines(oix, oiy, oiw, oih, olType, 'left')
        const olShowHandle = olType === 'kipp' || olType === 'klapp'
        const olHx = oix + oiw / 2 - handleH / 2 // horizontal handle
        const olHy = olType === 'klapp' ? (fY + olH + oiy + oih) / 2 - handleW / 2 : (fY + oiy) / 2 - handleW / 2
        return (
          <>
            <line x1={fX} y1={fY + olH} x2={fX + frameW} y2={fY + olH} stroke="currentColor" strokeWidth={sw} />
            <rect x={oix} y={oiy} width={oiw} height={oih} fill="none" stroke="currentColor" strokeWidth={sw * 0.6} />
            {olLines.map((l, j) => (
              <line key={`ol${j}`} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
                stroke="currentColor" strokeWidth={sw * 0.7}
                strokeDasharray={l.dash ? (isSm ? '1.5 1.5' : '4 3') : 'none'} />
            ))}
            {olShowHandle && (
              <rect x={olHx} y={olHy} width={handleH} height={handleW} rx={isSm ? 0.3 : 0.8} fill="currentColor" />
            )}
          </>
        )
      })()}
      {panels.map((p, i) => {
        const px = xOff, py = fY + olH, pw = panelWidths[i]
        xOff += pw
        // Inner frame per panel (Flügelrahmen) — equal inset on all sides
        const ix = px + inset, iy = py + inset, iw = pw - 2 * inset, ih = panelH - 2 * inset
        const lines = panelSymbolLines(ix, iy, iw, ih, p.type, p.hinge)
        // Handle position: centered in frame (between outer and inner rect), opposite side of hinge
        const isLeft = p.hinge === 'left' || !p.hinge
        const hx = isLeft ? (ix + iw + px + pw) / 2 - handleW / 2 : (px + ix) / 2 - handleW / 2
        const hy = iy + ih / 2 - handleH / 2
        const showHandle = p.type === 'dreh' || p.type === 'kipp-dreh' || p.type === 'kipp'
        return (
          <g key={i}>
            {i > 0 && <line x1={px} y1={py} x2={px} y2={py + panelH} stroke="currentColor" strokeWidth={sw} />}
            {/* Inner panel frame */}
            <rect x={ix} y={iy} width={iw} height={ih} fill="none" stroke="currentColor" strokeWidth={sw * 0.6} />
            {/* DIN symbols */}
            {lines.map((l, j) => (
              <line key={j} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
                stroke="currentColor" strokeWidth={sw * 0.7}
                strokeDasharray={l.dash ? (isSm ? '1.5 1.5' : '4 3') : 'none'} />
            ))}
            {/* Handle (Griff) */}
            {showHandle && (
              <rect x={hx} y={hy} width={handleW} height={handleH} rx={isSm ? 0.3 : 0.8} fill="currentColor" />
            )}
          </g>
        )
      })}

      {/* Unterlicht */}
      {unterlicht && (() => {
        const ulY = fY + frameH - ulH
        const uix = fX + inset, uiy = ulY + inset, uiw = frameW - 2 * inset, uih = ulH - 2 * inset
        const ulType2 = unterlichtType || 'fix'
        const ulLines = panelSymbolLines(uix, uiy, uiw, uih, ulType2, 'left')
        const ulShowHandle = ulType2 === 'kipp' || ulType2 === 'klapp'
        const ulHx = uix + uiw / 2 - handleH / 2
        const ulHy = ulType2 === 'kipp' ? (ulY + uiy) / 2 - handleW / 2 : (uiy + uih + ulY + ulH) / 2 - handleW / 2
        return (
          <>
            <line x1={fX} y1={ulY} x2={fX + frameW} y2={ulY} stroke="currentColor" strokeWidth={sw} />
            <rect x={uix} y={uiy} width={uiw} height={uih} fill="none" stroke="currentColor" strokeWidth={sw * 0.6} />
            {ulLines.map((l, j) => (
              <line key={`ul${j}`} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
                stroke="currentColor" strokeWidth={sw * 0.7}
                strokeDasharray={l.dash ? (isSm ? '1.5 1.5' : '4 3') : 'none'} />
            ))}
            {ulShowHandle && (
              <rect x={ulHx} y={ulHy} width={handleH} height={handleW} rx={isSm ? 0.3 : 0.8} fill="currentColor" />
            )}
          </>
        )
      })()}

      {/* Dimension lines — only for lg size */}
      {!isSm && totalPosW > 0 && (
        <g className="text-slate-500" fill="currentColor" stroke="currentColor" strokeWidth={0.5}>
          {/* Bottom: total width */}
          <line x1={fX} y1={fY + frameH + dimOff1} x2={fX} y2={fY + frameH + dimOff2 + dimTick} strokeWidth={0.4} />
          <line x1={fX + frameW} y1={fY + frameH + dimOff1} x2={fX + frameW} y2={fY + frameH + dimOff2 + dimTick} strokeWidth={0.4} />
          <line x1={fX} y1={fY + frameH + dimOff2} x2={fX + frameW} y2={fY + frameH + dimOff2} />
          <text x={fX + frameW / 2} y={fY + frameH + dimOff2 + fontSize + 2} textAnchor="middle" fontSize={fontSize} stroke="none">{totalPosW}</text>

          {/* Bottom: individual panel widths (only when real values entered) */}
          {hasCustomWidths && panels.length > 1 && (() => {
            let cx = fX
            return panels.map((_, i) => {
              const pw = panelWidths[i]
              const ew = effWidths[i]
              const label = ew > 0 ? Math.round(ew) : ''
              const x1 = cx, x2 = cx + pw
              cx += pw
              return (
                <g key={`pw${i}`}>
                  <line x1={x1} y1={fY + frameH + 2} x2={x1} y2={fY + frameH + dimOff1 + dimTick} strokeWidth={0.4} />
                  <line x1={x2} y1={fY + frameH + 2} x2={x2} y2={fY + frameH + dimOff1 + dimTick} strokeWidth={0.4} />
                  <line x1={x1} y1={fY + frameH + dimOff1} x2={x2} y2={fY + frameH + dimOff1} />
                  <text x={x1 + pw / 2} y={fY + frameH + dimOff1 + fontSize} textAnchor="middle" fontSize={fontSize - 1} stroke="none">{label}</text>
                </g>
              )
            })
          })()}

          {/* Right: height dimensions */}
          {totalPosH > 0 && (() => {
            const hasOlDim = oberlicht && olHmm > 0
            const hasUlDim = unterlicht && ulHmm > 0
            const hasSections = hasOlDim || hasUlDim
            const fluegelHmm = totalPosH - (hasOlDim ? olHmm : 0) - (hasUlDim ? ulHmm : 0)
            // Build sections: [{y1, y2, label}]
            const sections = []
            if (hasOlDim) sections.push({ y1: fY, y2: fY + olH, label: olHmm })
            sections.push({ y1: fY + olH, y2: fY + olH + panelH, label: hasSections ? fluegelHmm : null })
            if (hasUlDim) sections.push({ y1: fY + frameH - ulH, y2: fY + frameH, label: ulHmm })

            const dimLine = (x, y1, y2, label, fs, textOff = 6) => {
              const mid = y1 + (y2 - y1) / 2
              const tx = x + textOff
              return (
                <>
                  <line x1={fX + frameW + 2} y1={y1} x2={x + dimTick} y2={y1} strokeWidth={0.4} />
                  <line x1={fX + frameW + 2} y1={y2} x2={x + dimTick} y2={y2} strokeWidth={0.4} />
                  <line x1={x} y1={y1} x2={x} y2={y2} />
                  <text x={tx} y={mid} fontSize={fs} stroke="none" textAnchor="middle" dominantBaseline="central" transform={`rotate(90, ${tx}, ${mid})`}>{label}</text>
                </>
              )
            }

            return (
              <>
                {hasSections && sections.filter(s => s.label !== null).map((s, i) => (
                  <g key={`sec${i}`}>{dimLine(fX + frameW + dimOff1, s.y1, s.y2, s.label, fontSize - 1)}</g>
                ))}
                {/* Total height — outer line */}
                {dimLine(fX + frameW + (hasSections ? dimOff2 : dimOff2), fY, fY + frameH, totalPosH, fontSize)}
              </>
            )
          })()}
        </g>
      )}
    </svg>
  )
}

// SVG sketch for Mehrteilig (multi-segment) windows
function MehrteiligSketch({ segments, alignment = 'top', size = 'sm' }) {
  if (!segments || segments.length === 0) return null
  const isSm = size === 'sm'
  const isXl = size === 'xl'
  // Count how many right-side dim columns we need
  // Each segment gets its own total-height column + optional breakdown column (if OL/UL)
  // Layout right to left: Seg0 total | Seg0 breakdown? | Seg1 total | Seg1 breakdown? | ...
  const segsWithBreakdown = segments.filter(s =>
    (s.oberlicht && parseFloat(s.oberlichtHeight) > 0) || (s.unterlicht && parseFloat(s.unterlichtHeight) > 0)
  )
  const dimCols = segments.length + segsWithBreakdown.length
  const maxW = isSm ? 48 : isXl ? 320 : 160
  const maxH = isSm ? 36 : isXl ? 220 : 110
  const pad = isSm ? 3 : isXl ? 12 : 6
  const colSpacing = isXl ? 22 : 14
  const dimSpaceRight = isSm ? 0 : dimCols * colSpacing + 8
  const hasPanelWidthsEarly = segments.some(seg => {
    const panels = seg.panels || []
    return panels.length > 1 && panels.some(p => parseFloat(p.width) > 0)
  })
  const bottomRows = 1 + (segments.length > 1 ? 1 : 0) + (hasPanelWidthsEarly ? 1 : 0)
  const dimSpaceBottom = isSm ? 0 : bottomRows * (isXl ? 18 : 12) + 8
  const sw = isSm ? 0.8 : isXl ? 1.8 : 1.2
  const inset = isSm ? 1.5 : isXl ? 8 : 4
  const handleW = isSm ? 1 : isXl ? 3.5 : 2
  const handleH = isSm ? 3.5 : isXl ? 16 : 8
  const fontSize = isSm ? 6 : isXl ? 10 : 7

  // Compute real dimensions
  // Fallback to placeholder values when no real dimensions entered
  const defaultH = [1400, 1200, 1000, 800]
  const segWidths = segments.map(s => parseFloat(s.width) || 600)
  const segHeights = segments.map((s, i) => parseFloat(s.height) || (defaultH[i] || 1200))
  const segHasRealW = segments.map(s => parseFloat(s.width) > 0)
  const segHasRealH = segments.map(s => parseFloat(s.height) > 0)
  const anyRealDims = segHasRealW.some(Boolean) || segHasRealH.some(Boolean)
  const totalRealW = segWidths.reduce((a, b) => a + b, 0)
  const maxRealH = Math.max(...segHeights)

  const availW = maxW - 2 * pad
  const availH = maxH - 2 * pad
  const scale = Math.min(availW / totalRealW, availH / maxRealH)
  const frameW = totalRealW * scale
  const frameH = maxRealH * scale

  const vw = frameW + 2 * pad + (isSm ? 0 : dimSpaceRight)
  const vh = frameH + 2 * pad + (isSm ? 0 : dimSpaceBottom)

  let xOff = pad

  return (
    <svg width={isXl ? '100%' : vw} height={isXl ? undefined : vh} viewBox={`0 0 ${vw} ${vh}`} className="text-slate-400" style={isXl ? { maxHeight: '60vh' } : undefined}>
      {segments.map((seg, si) => {
        const segW = segWidths[si] * scale
        const segH = segHeights[si] * scale
        const segX = xOff
        xOff += segW

        // Alignment Y
        let segY = pad
        if (alignment === 'bottom') segY = pad + frameH - segH
        else if (alignment === 'center') segY = pad + (frameH - segH) / 2

        // OL/UL proportional heights
        const segRealH = segHeights[si]
        const olHmm = parseFloat(seg.oberlichtHeight) || 0
        const olH = seg.oberlicht ? segH * (olHmm > 0 ? olHmm : 300) / segRealH : 0
        const ulHmm = parseFloat(seg.unterlichtHeight) || 0
        const ulH = seg.unterlicht ? segH * (ulHmm > 0 ? ulHmm : 300) / segRealH : 0
        const panelH = segH - olH - ulH
        const panelY = segY + olH

        // Panel widths within segment — proportional if custom widths set
        const panels = seg.panels || [{ type: 'fix' }]
        const segRealW = parseFloat(seg.width) || 0
        const panelEffWidths = panels.map((p, i) => {
          if (i === panels.length - 1 && panels.length > 1 && segRealW > 0) {
            const others = panels.reduce((s, pp, j) => j !== i ? s + (parseFloat(pp.width) || 0) : s, 0)
            if (others > 0) return Math.max(1, segRealW - others)
          }
          return parseFloat(p.width) || 0
        })
        const hasSegCustomW = panelEffWidths.some(w => w > 0)
        const totalSegPW = hasSegCustomW ? panelEffWidths.reduce((s, w) => s + (w || 1), 0) : panels.length
        const panelWs = panelEffWidths.map(w => hasSegCustomW ? (w || 1) / totalSegPW * segW : segW / panels.length)
        let pxOff2 = segX

        return (
          <g key={seg.id || si}>
            {/* Segment outer frame */}
            <rect x={segX} y={segY} width={segW} height={segH} fill="none" stroke="currentColor" strokeWidth={sw * 2} />

            {/* Oberlicht */}
            {seg.oberlicht && (() => {
              const oix = segX + inset, oiy = segY + inset, oiw = segW - 2 * inset, oih = olH - 2 * inset
              if (oiw <= 0 || oih <= 0) return null
              const olType = seg.oberlichtType || 'fix'
              const olLines = panelSymbolLines(oix, oiy, oiw, oih, olType, 'left')
              const olShowHandle = olType === 'kipp' || olType === 'klapp'
              const olHx = oix + oiw / 2 - handleH / 2
              const olHy = olType === 'klapp' ? (segY + olH + oiy + oih) / 2 - handleW / 2 : (segY + oiy) / 2 - handleW / 2
              return (
                <>
                  <line x1={segX} y1={segY + olH} x2={segX + segW} y2={segY + olH} stroke="currentColor" strokeWidth={sw} />
                  <rect x={oix} y={oiy} width={oiw} height={oih} fill="none" stroke="currentColor" strokeWidth={sw * 0.6} />
                  {olLines.map((l, j) => (
                    <line key={`ol${si}-${j}`} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
                      stroke="currentColor" strokeWidth={sw * 0.7}
                      strokeDasharray={l.dash ? (isSm ? '1.5 1.5' : '4 3') : 'none'} />
                  ))}
                  {olShowHandle && <rect x={olHx} y={olHy} width={handleH} height={handleW} rx={0.5} fill="currentColor" />}
                </>
              )
            })()}

            {/* Panels */}
            {panels.map((p, pi) => {
              const pw = panelWs[pi]
              const px = pxOff2
              pxOff2 += pw
              const ix = px + inset, iy = panelY + inset, iw = pw - 2 * inset, ih = panelH - 2 * inset
              if (iw <= 0 || ih <= 0) return null
              const lines = panelSymbolLines(ix, iy, iw, ih, p.type, p.hinge)
              const isLeft = p.hinge === 'left' || !p.hinge
              const hx = isLeft ? (ix + iw + px + pw) / 2 - handleW / 2 : (px + ix) / 2 - handleW / 2
              const hy = iy + ih / 2 - handleH / 2
              const showHandle = p.type === 'dreh' || p.type === 'kipp-dreh' || p.type === 'kipp'
              return (
                <g key={`p${si}-${pi}`}>
                  {pi > 0 && <line x1={px} y1={panelY} x2={px} y2={panelY + panelH} stroke="currentColor" strokeWidth={sw} />}
                  <rect x={ix} y={iy} width={iw} height={ih} fill="none" stroke="currentColor" strokeWidth={sw * 0.6} />
                  {lines.map((l, j) => (
                    <line key={j} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
                      stroke="currentColor" strokeWidth={sw * 0.7}
                      strokeDasharray={l.dash ? (isSm ? '1.5 1.5' : '4 3') : 'none'} />
                  ))}
                  {showHandle && <rect x={hx} y={hy} width={handleW} height={handleH} rx={isSm ? 0.3 : 0.8} fill="currentColor" />}
                </g>
              )
            })}

            {/* Unterlicht */}
            {seg.unterlicht && (() => {
              const ulY = segY + segH - ulH
              const uix = segX + inset, uiy = ulY + inset, uiw = segW - 2 * inset, uih = ulH - 2 * inset
              if (uiw <= 0 || uih <= 0) return null
              const ulType = seg.unterlichtType || 'fix'
              const ulLines = panelSymbolLines(uix, uiy, uiw, uih, ulType, 'left')
              const ulShowHandle = ulType === 'kipp' || ulType === 'klapp'
              const ulHx = uix + uiw / 2 - handleH / 2
              const ulHy = ulType === 'kipp' ? (ulY + uiy) / 2 - handleW / 2 : (uiy + uih + ulY + ulH) / 2 - handleW / 2
              return (
                <>
                  <line x1={segX} y1={ulY} x2={segX + segW} y2={ulY} stroke="currentColor" strokeWidth={sw} />
                  <rect x={uix} y={uiy} width={uiw} height={uih} fill="none" stroke="currentColor" strokeWidth={sw * 0.6} />
                  {ulLines.map((l, j) => (
                    <line key={`ul${si}-${j}`} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
                      stroke="currentColor" strokeWidth={sw * 0.7}
                      strokeDasharray={l.dash ? (isSm ? '1.5 1.5' : '4 3') : 'none'} />
                  ))}
                  {ulShowHandle && <rect x={ulHx} y={ulHy} width={handleH} height={handleW} rx={0.5} fill="currentColor" />}
                </>
              )
            })()}
          </g>
        )
      })}

      {/* Dimension lines — only when real values entered */}
      {!isSm && anyRealDims && (() => {
        const dimOff1 = isXl ? 10 : 6
        const dimOff2 = isXl ? 28 : 18
        const dimOff3 = isXl ? 46 : 30
        const dimTick = isXl ? 5 : 3

        // Check if any segment has multiple panels with custom widths → need panel-width row
        const hasPanelWidths = segments.some(seg => {
          const panels = seg.panels || []
          return panels.length > 1 && panels.some(p => parseFloat(p.width) > 0)
        })

        // Row offsets: if panel widths exist, they go closest (row 1), segment widths row 2, total row 3
        // If no panel widths: segment widths row 1, total row 2
        const panelRowY = pad + frameH + dimOff1
        const segRowY = hasPanelWidths ? pad + frameH + dimOff2 : pad + frameH + dimOff1
        const totalRowY = hasPanelWidths ? pad + frameH + dimOff3 : pad + frameH + dimOff2

        let cx = pad
        return (
          <g className="text-slate-500" fill="currentColor" stroke="currentColor" strokeWidth={0.5}>
            {/* Bottom row 1 (if applicable): per-panel widths within segments */}
            {hasPanelWidths && (() => {
              let px = pad
              return segments.map((seg, si) => {
                const segPx = px
                const sw2 = segWidths[si] * scale
                const panels = seg.panels || [{ type: 'fix' }]
                const segRealW = parseFloat(seg.width) || 0
                const panelEffWidths = panels.map((p, i) => {
                  if (i === panels.length - 1 && panels.length > 1 && segRealW > 0) {
                    const others = panels.reduce((s, pp, j) => j !== i ? s + (parseFloat(pp.width) || 0) : s, 0)
                    if (others > 0) return Math.max(1, segRealW - others)
                  }
                  return parseFloat(p.width) || 0
                })
                const hasCustomW = panelEffWidths.some(w => w > 0)
                const totalPW = hasCustomW ? panelEffWidths.reduce((s, w) => s + (w || 1), 0) : panels.length
                const panelWs = panelEffWidths.map(w => hasCustomW ? (w || 1) / totalPW * sw2 : sw2 / panels.length)
                px += sw2

                // Only show panel kote if this segment has >1 panel with custom widths
                if (panels.length <= 1 || !hasCustomW) return null
                let ppx = segPx
                return (
                  <g key={`pw${si}`}>
                    {panels.map((p, pi) => {
                      const pw = panelWs[pi]
                      const x1 = ppx, x2 = ppx + pw
                      ppx += pw
                      const wLabel = Math.round(panelEffWidths[pi])
                      if (!wLabel) return null
                      return (
                        <g key={`pw${si}-${pi}`}>
                          <line x1={x1} y1={pad + frameH + 2} x2={x1} y2={panelRowY + dimTick} strokeWidth={0.4} />
                          <line x1={x2} y1={pad + frameH + 2} x2={x2} y2={panelRowY + dimTick} strokeWidth={0.4} />
                          <line x1={x1} y1={panelRowY} x2={x2} y2={panelRowY} />
                          <text x={x1 + pw / 2} y={panelRowY + fontSize} textAnchor="middle" fontSize={fontSize - 1} stroke="none">{wLabel}</text>
                        </g>
                      )
                    })}
                  </g>
                )
              })
            })()}
            {/* Bottom: individual segment widths */}
            {segments.map((seg, si) => {
              const sw2 = segWidths[si] * scale
              const x1 = cx, x2 = cx + sw2
              cx += sw2
              if (!segHasRealW[si]) return null
              return (
                <g key={`sw${si}`}>
                  <line x1={x1} y1={pad + frameH + 2} x2={x1} y2={segRowY + dimTick} strokeWidth={0.4} />
                  <line x1={x2} y1={pad + frameH + 2} x2={x2} y2={segRowY + dimTick} strokeWidth={0.4} />
                  <line x1={x1} y1={segRowY} x2={x2} y2={segRowY} />
                  <text x={x1 + sw2 / 2} y={segRowY + fontSize} textAnchor="middle" fontSize={fontSize - 1} stroke="none">{segWidths[si]}</text>
                </g>
              )
            })}
            {/* Bottom: total width */}
            {segments.length > 1 && segHasRealW.every(Boolean) && (
              <>
                <line x1={pad} y1={segRowY + dimTick + 2} x2={pad} y2={totalRowY + dimTick} strokeWidth={0.4} />
                <line x1={pad + frameW} y1={segRowY + dimTick + 2} x2={pad + frameW} y2={totalRowY + dimTick} strokeWidth={0.4} />
                <line x1={pad} y1={totalRowY} x2={pad + frameW} y2={totalRowY} />
                <text x={pad + frameW / 2} y={totalRowY + fontSize + 2} textAnchor="middle" fontSize={fontSize} stroke="none">{totalRealW}</text>
              </>
            )}
            {/* Right: per-segment heights + OL/UL sub-kote */}
            {/* Sorted by height desc — tallest segment rightmost, breakdown left of it */}
            {(() => {
              // Full dim line with horizontal extensions to frame
              const dimLine = (x, y1, y2, label, fs, textOff = 6) => {
                if (y2 - y1 < 3) return null
                const mid = y1 + (y2 - y1) / 2
                const tx = x + textOff
                return (
                  <>
                    <line x1={pad + frameW + 2} y1={y1} x2={x + dimTick} y2={y1} strokeWidth={0.4} />
                    <line x1={pad + frameW + 2} y1={y2} x2={x + dimTick} y2={y2} strokeWidth={0.4} />
                    <line x1={x} y1={y1} x2={x} y2={y2} />
                    <text x={tx} y={mid} fontSize={fs} stroke="none" textAnchor="middle" dominantBaseline="central" transform={`rotate(90, ${tx}, ${mid})`}>{label}</text>
                  </>
                )
              }
              // Sub dim line — short ticks only, no extension to frame
              const dimLineSub = (x, y1, y2, label, fs, textOff = 6) => {
                if (y2 - y1 < 3) return null
                const mid = y1 + (y2 - y1) / 2
                const tx = x + textOff
                return (
                  <>
                    <line x1={x - dimTick} y1={y1} x2={x + dimTick} y2={y1} strokeWidth={0.4} />
                    <line x1={x - dimTick} y1={y2} x2={x + dimTick} y2={y2} strokeWidth={0.4} />
                    <line x1={x} y1={y1} x2={x} y2={y2} />
                    <text x={tx} y={mid} fontSize={fs} stroke="none" textAnchor="middle" dominantBaseline="central" transform={`rotate(90, ${tx}, ${mid})`}>{label}</text>
                  </>
                )
              }

              // Sort segments by height descending — tallest gets rightmost column
              const sortedIdxs = segments.map((_, i) => i).sort((a, b) => segHeights[b] - segHeights[a])
              let colIdx = dimCols - 1

              return sortedIdxs.map(si => {
                const seg = segments[si]
                const segH = segHeights[si] * scale
                const segRealH = segHeights[si]
                let segY = pad
                if (alignment === 'bottom') segY = pad + frameH - segH
                else if (alignment === 'center') segY = pad + (frameH - segH) / 2

                const hasOlUl = seg.oberlicht || seg.unterlicht

                // OL/UL proportional heights
                const olHmm = parseFloat(seg.oberlichtHeight) || 0
                const olH = seg.oberlicht ? segH * (olHmm > 0 ? olHmm : 300) / segRealH : 0
                const ulHmm = parseFloat(seg.unterlichtHeight) || 0
                const ulH = seg.unterlicht ? segH * (ulHmm > 0 ? ulHmm : 300) / segRealH : 0
                // Only show breakdown kote when actual heights are entered
                const olDispMm = seg.oberlicht && olHmm > 0 ? olHmm : 0
                const ulDispMm = seg.unterlicht && ulHmm > 0 ? ulHmm : 0
                const hasBreakdown = olDispMm > 0 || ulDispMm > 0
                const fluegelHmm = hasBreakdown ? segRealH - olDispMm - ulDispMm : 0

                // Total height column (rightmost of this segment's pair)
                const totalX = pad + frameW + dimOff1 + colIdx * colSpacing
                colIdx--
                // Breakdown column (left of total, only if actual heights entered)
                const breakdownX = hasBreakdown ? pad + frameW + dimOff1 + colIdx * colSpacing : 0
                if (hasBreakdown) colIdx--

                if (!segHasRealH[si]) return null
                return (
                  <g key={`sh${si}`}>
                    {/* Total height — full extension lines to frame */}
                    <g>{dimLine(totalX, segY, segY + segH, segRealH, fontSize)}</g>
                    {/* Breakdown: short ticks only, only when heights are entered */}
                    {hasBreakdown && (
                      <>
                        {olDispMm > 0 && (
                          <g>{dimLineSub(breakdownX, segY, segY + olH, olDispMm, fontSize - 1)}</g>
                        )}
                        <g>{dimLineSub(breakdownX, segY + olH, segY + segH - ulH, fluegelHmm, fontSize - 1)}</g>
                        {ulDispMm > 0 && (
                          <g>{dimLineSub(breakdownX, segY + segH - ulH, segY + segH, ulDispMm, fontSize - 1)}</g>
                        )}
                      </>
                    )}
                  </g>
                )
              })
            })()}
          </g>
        )
      })()}

    </svg>
  )
}

function newSegment() {
  return {
    id: newId(),
    width: '',
    height: '',
    panels: [{ type: 'kipp-dreh', hinge: 'left' }],
    oberlicht: false,
    oberlichtHeight: '',
    oberlichtType: 'fix',
    unterlicht: false,
    unterlichtHeight: '',
    unterlichtType: 'fix',
  }
}

function newFensterPosition() {
  return {
    id: newId(),
    name: '',
    preset: '1-kd-l',
    panels: [{ type: 'kipp-dreh', hinge: 'left' }],
    oberlicht: false,
    oberlichtHeight: '',
    oberlichtType: 'fix',
    unterlicht: false,
    unterlichtHeight: '',
    unterlichtType: 'fix',
    width: '',
    height: '',
    count: '1',
    material: 'Kunststoff',
    glazing: '2-fach Verglasung',
    color: '',
    notes: '',
    // Mehrteilig fields (only used when preset === 'mehrteilig')
    segments: [],
    alignment: 'bottom',
  }
}

const PANEL_TYPES = [
  { id: 'kipp-dreh', label: 'Dreh-Kipp' },
  { id: 'dreh', label: 'Dreh' },
  { id: 'kipp', label: 'Kipp' },
  { id: 'fix', label: 'Fest' },
]

function FensterPositionCard({ pos, index, onChange, onRemove, validated }) {
  const update = (key, val) => onChange({ ...pos, [key]: val })
  const [showCustom, setShowCustom] = useState(false)
  const [zoomSketch, setZoomSketch] = useState(false)

  const selectPreset = (preset) => {
    if (preset.id === 'mehrteilig') {
      onChange({
        ...pos,
        preset: 'mehrteilig',
        segments: pos.segments && pos.segments.length > 0 ? pos.segments : [newSegment(), newSegment()],
      })
      setShowCustom(true)
      return
    }
    onChange({
      ...pos,
      preset: preset.id,
      panels: JSON.parse(JSON.stringify(preset.panels)),
      oberlicht: !!preset.oberlicht,
      segments: [],
    })
    setShowCustom(false)
  }

  const updatePanel = (idx, field, val) => {
    const panels = JSON.parse(JSON.stringify(pos.panels))
    panels[idx][field] = val
    onChange({ ...pos, panels, preset: 'custom' })
  }

  const addPanel = () => {
    const panels = [...pos.panels.map(p => ({ ...p, width: '', manual: false })), { type: 'fix', hinge: 'left' }]
    onChange({ ...pos, panels, preset: 'custom' })
  }

  const removePanel = (idx) => {
    if (pos.panels.length <= 1) return
    const panels = pos.panels.filter((_, i) => i !== idx).map(p => ({ ...p, width: '', manual: false }))
    onChange({ ...pos, panels, preset: 'custom' })
  }

  const toggleOberlicht = () => {
    onChange({ ...pos, oberlicht: !pos.oberlicht, preset: 'custom' })
  }
  const toggleUnterlicht = () => {
    onChange({ ...pos, unterlicht: !pos.unterlicht, preset: 'custom' })
  }

  return (
    <div className="border border-slate-600 rounded-xl p-3 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500 font-mono">Pos. {index + 1}</span>
        <input
          type="text"
          value={pos.name}
          onChange={e => update('name', e.target.value)}
          placeholder="z.B. Küchenfenster, Haustür..."
          className="flex-1 px-2 py-1 bg-slate-800 border border-slate-600 rounded text-white placeholder:text-slate-500 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button onClick={onRemove} className="text-red-400 hover:text-red-300 text-sm px-1">✕</button>
      </div>

      {/* Typ-Auswahl */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <label className="text-xs text-slate-500">Fenstertyp</label>
          {showCustom && (
            <button
              type="button"
              onClick={() => setShowCustom(false)}
              className="text-[10px] text-blue-400 hover:text-blue-300"
            >← Vorlagen</button>
          )}
        </div>

        {!showCustom ? (
          <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {FENSTER_PRESETS.map(fp => (
              <button
                key={fp.id}
                type="button"
                onClick={() => selectPreset(fp)}
                className={`flex flex-col items-center gap-0.5 p-1.5 rounded-lg border transition-all ${
                  pos.preset === fp.id
                    ? 'border-blue-500 bg-blue-500/20'
                    : 'border-slate-600 bg-slate-800 hover:border-slate-500'
                }`}
              >
                {fp.id === 'mehrteilig' ? (
                  <svg width="48" height="36" viewBox="0 0 48 36" className="text-slate-400">
                    {/* Segment A: tall, DK left */}
                    <rect x="3" y="3" width="16" height="30" fill="none" stroke="currentColor" strokeWidth={1.6} />
                    <rect x="4.5" y="4.5" width="13" height="27" fill="none" stroke="currentColor" strokeWidth={0.5} />
                    <line x1="4.5" y1="4.5" x2="11" y2="18" stroke="currentColor" strokeWidth={0.6} />
                    <line x1="4.5" y1="31.5" x2="11" y2="18" stroke="currentColor" strokeWidth={0.6} />
                    <line x1="4.5" y1="4.5" x2="17.5" y2="18" stroke="currentColor" strokeWidth={0.6} strokeDasharray="1.5 1.5" />
                    <line x1="4.5" y1="31.5" x2="17.5" y2="18" stroke="currentColor" strokeWidth={0.6} strokeDasharray="1.5 1.5" />
                    {/* Segment B: shorter, Fix */}
                    <rect x="19" y="8" width="12" height="25" fill="none" stroke="currentColor" strokeWidth={1.6} />
                    <rect x="20.5" y="9.5" width="9" height="22" fill="none" stroke="currentColor" strokeWidth={0.5} />
                    <line x1="20.5" y1="9.5" x2="29.5" y2="31.5" stroke="currentColor" strokeWidth={0.6} strokeDasharray="1.5 1.5" />
                    <line x1="29.5" y1="9.5" x2="20.5" y2="31.5" stroke="currentColor" strokeWidth={0.6} strokeDasharray="1.5 1.5" />
                    {/* Segment C: tall, Dreh right */}
                    <rect x="31" y="3" width="14" height="30" fill="none" stroke="currentColor" strokeWidth={1.6} />
                    <rect x="32.5" y="4.5" width="11" height="27" fill="none" stroke="currentColor" strokeWidth={0.5} />
                    <line x1="43.5" y1="4.5" x2="38" y2="18" stroke="currentColor" strokeWidth={0.6} />
                    <line x1="43.5" y1="31.5" x2="38" y2="18" stroke="currentColor" strokeWidth={0.6} />
                  </svg>
                ) : (
                  <FensterSketch panels={fp.panels} oberlicht={fp.oberlicht} size="sm" />
                )}
                <span className="text-[10px] text-slate-400">{fp.label}</span>
              </button>
            ))}
          </div>
          </div>
        ) : pos.preset === 'mehrteilig' ? (
          /* ── Mehrteilig: Segment editor ── */
          <div className="space-y-2">
            {/* Alignment selector */}
            <div className="flex items-center gap-2 bg-slate-800/50 border border-slate-600 rounded-lg px-2 py-1.5">
              <span className="text-[11px] text-slate-500">Ausrichtung:</span>
              {['top', 'bottom', 'center'].map(a => (
                <button key={a} type="button"
                  onClick={() => update('alignment', a)}
                  className={`text-[10px] px-2 py-0.5 rounded ${pos.alignment === a ? 'bg-blue-500/30 text-blue-400 border border-blue-500' : 'text-slate-400 border border-slate-600 hover:border-slate-500'}`}
                >{a === 'top' ? 'Oben' : a === 'bottom' ? 'Unten' : 'Mitte'}</button>
              ))}
            </div>

            {/* Segment cards */}
            {(pos.segments || []).map((seg, si) => {
              const updateSeg = (field, val) => {
                const segs = JSON.parse(JSON.stringify(pos.segments))
                segs[si][field] = val
                onChange({ ...pos, segments: segs })
              }
              const updateSegPanel = (pi, field, val) => {
                const segs = JSON.parse(JSON.stringify(pos.segments))
                segs[si].panels[pi][field] = val
                onChange({ ...pos, segments: segs })
              }
              const addSegPanel = () => {
                const segs = JSON.parse(JSON.stringify(pos.segments))
                segs[si].panels = segs[si].panels.map(p => ({ ...p, width: '', manual: false }))
                segs[si].panels.push({ type: 'fix', hinge: 'left' })
                onChange({ ...pos, segments: segs })
              }
              const removeSegPanel = (pi) => {
                if (seg.panels.length <= 1) return
                const segs = JSON.parse(JSON.stringify(pos.segments))
                segs[si].panels = segs[si].panels.filter((_, j) => j !== pi).map(p => ({ ...p, width: '', manual: false }))
                onChange({ ...pos, segments: segs })
              }
              const removeSeg = () => {
                if ((pos.segments || []).length <= 1) return
                onChange({ ...pos, segments: pos.segments.filter((_, j) => j !== si) })
              }
              const letter = String.fromCharCode(65 + si)
              return (
                <div key={seg.id} className="bg-slate-800/50 border border-slate-600 rounded-lg p-2 space-y-2 overflow-hidden">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-white font-semibold">Segment {letter}</span>
                    {seg.width && seg.height && <span className="text-[10px] text-slate-500">({seg.width}×{seg.height})</span>}
                    <div className="flex-1" />
                    {(pos.segments || []).length > 1 && (
                      <button onClick={removeSeg} className="text-red-400 hover:text-red-300 text-sm px-1">✕</button>
                    )}
                  </div>
                  {/* Segment dimensions */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-500 w-[20px] shrink-0">B:</span>
                      <input type="number" value={seg.width || ''} onChange={e => updateSeg('width', e.target.value)}
                        placeholder="z.B. 600" className="flex-1 min-w-0 min-h-[32px] px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white placeholder:text-slate-500 text-xs"
                        style={validated && !parseFloat(seg.width) ? { outline: '2px solid #ef4444', outlineOffset: '-1px' } : undefined} />
                      <span className="text-[10px] text-slate-500">mm</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-500 w-[20px] shrink-0">H:</span>
                      <input type="number" value={seg.height || ''} onChange={e => updateSeg('height', e.target.value)}
                        placeholder={`z.B. ${[1400, 1200, 1000, 800][si] || 1200}`} className="flex-1 min-w-0 min-h-[32px] px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white placeholder:text-slate-500 text-xs"
                        style={validated && !parseFloat(seg.height) ? { outline: '2px solid #ef4444', outlineOffset: '-1px' } : undefined} />
                      <span className="text-[10px] text-slate-500">mm</span>
                    </div>
                  </div>
                  {/* Segment Flügel */}
                  {seg.panels.map((panel, pi) => {
                    const segTotalW = parseFloat(seg.width) || 0
                    const showWidths = seg.panels.length > 1 && segTotalW > 0
                    return (
                    <div key={pi} className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-500 w-[40px] shrink-0">Flügel {pi + 1}</span>
                        <select value={panel.type} onChange={e => updateSegPanel(pi, 'type', e.target.value)}
                          className="flex-1 min-h-[32px] px-1.5 py-1 bg-slate-700 border border-slate-600 rounded text-white text-xs">
                          {PANEL_TYPES.map(pt => <option key={pt.id} value={pt.id}>{pt.label}</option>)}
                        </select>
                        {(panel.type === 'dreh' || panel.type === 'kipp-dreh') && (
                          <select value={panel.hinge || 'left'} onChange={e => updateSegPanel(pi, 'hinge', e.target.value)}
                            className="min-h-[32px] px-1.5 py-1 bg-slate-700 border border-slate-600 rounded text-white text-xs">
                            <option value="left">Band L</option>
                            <option value="right">Band R</option>
                          </select>
                        )}
                        {showWidths && (
                          <input type="number"
                            value={panel.width || ''}
                            onChange={e => {
                              const val = e.target.value
                              const newVal = parseFloat(val) || 0
                              const segs = JSON.parse(JSON.stringify(pos.segments))
                              segs[si].panels[pi] = { ...segs[si].panels[pi], width: val, manual: val !== '' }
                              if (segTotalW > 0) {
                                const autoIdxs = []
                                let manualSum = 0
                                segs[si].panels.forEach((p, j) => {
                                  if (j === pi) return
                                  if (p.manual) manualSum += parseFloat(p.width) || 0
                                  else autoIdxs.push(j)
                                })
                                const remainder = segTotalW - newVal - manualSum
                                if (autoIdxs.length > 0) {
                                  const each = remainder > 0 ? Math.round(remainder / autoIdxs.length) : 0
                                  autoIdxs.forEach(j => { segs[si].panels[j] = { ...segs[si].panels[j], width: each > 0 ? String(each) : '' } })
                                }
                              }
                              onChange({ ...pos, segments: segs })
                            }}
                            placeholder={`z.B. ${segTotalW > 0 ? Math.round(segTotalW / seg.panels.length) : 600}`}
                            className="w-14 min-h-[32px] px-0.5 py-1 border border-slate-600 rounded text-[10px] text-center placeholder:text-slate-500 shrink-0 bg-slate-700 text-white"
                            style={validated && !parseFloat(panel.width) ? { outline: '2px solid #ef4444', outlineOffset: '-1px' } : undefined} />
                        )}
                        {seg.panels.length > 1 && (
                          <button onClick={() => removeSegPanel(pi)} className="text-red-400/70 text-xs px-0.5 shrink-0">✕</button>
                        )}
                    </div>
                    )
                  })}
                  {/* Segment OL/UL */}
                  {seg.oberlicht && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] text-slate-500 min-w-[44px]">OL</span>
                      <select value={seg.oberlichtType || 'fix'} onChange={e => updateSeg('oberlichtType', e.target.value)}
                        className="flex-1 min-h-[32px] px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-xs">
                        <option value="fix">Fest</option>
                        <option value="kipp">Kipp</option>
                        <option value="klapp">Klapp</option>
                      </select>
                      <input type="number" value={seg.oberlichtHeight || ''} onChange={e => updateSeg('oberlichtHeight', e.target.value)}
                        placeholder="z.B. 400" className="w-14 min-h-[32px] px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white placeholder:text-slate-500 text-xs"
                        style={validated && !parseFloat(seg.oberlichtHeight) ? { outline: '2px solid #ef4444', outlineOffset: '-1px' } : undefined} />
                      <span className="text-[10px] text-slate-500">mm</span>
                      <button onClick={() => updateSeg('oberlicht', false)} className="text-red-400/70 text-xs px-0.5 shrink-0">✕</button>
                    </div>
                  )}
                  {seg.unterlicht && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] text-slate-500 min-w-[44px]">UL</span>
                      <select value={seg.unterlichtType || 'fix'} onChange={e => updateSeg('unterlichtType', e.target.value)}
                        className="flex-1 min-h-[32px] px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-xs">
                        <option value="fix">Fest</option>
                        <option value="kipp">Kipp</option>
                        <option value="klapp">Klapp</option>
                      </select>
                      <input type="number" value={seg.unterlichtHeight || ''} onChange={e => updateSeg('unterlichtHeight', e.target.value)}
                        placeholder="z.B. 300" className="w-14 min-h-[32px] px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white placeholder:text-slate-500 text-xs"
                        style={validated && !parseFloat(seg.unterlichtHeight) ? { outline: '2px solid #ef4444', outlineOffset: '-1px' } : undefined} />
                      <span className="text-[10px] text-slate-500">mm</span>
                      <button onClick={() => updateSeg('unterlicht', false)} className="text-red-400/70 text-xs px-0.5 shrink-0">✕</button>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button onClick={addSegPanel} className="text-[10px] text-blue-400 hover:text-blue-300">+ Flügel</button>
                    {!seg.oberlicht && (
                      <button onClick={() => updateSeg('oberlicht', true)} className="text-[10px] text-slate-500 hover:text-slate-400">+ Oberlicht</button>
                    )}
                    {!seg.unterlicht && (
                      <button onClick={() => updateSeg('unterlicht', true)} className="text-[10px] text-slate-500 hover:text-slate-400">+ Unterlicht</button>
                    )}
                  </div>
                </div>
              )
            })}
            <button
              onClick={() => onChange({ ...pos, segments: [...(pos.segments || []), newSegment()] })}
              className="w-full py-2 border-2 border-dashed border-slate-600 hover:border-blue-500 text-slate-400 hover:text-blue-400 rounded-lg text-xs font-medium transition-colors"
            >+ Segment</button>
          </div>
        ) : (
          /* ── Standard: Flügel/OL/UL editor ── */
          <div className="bg-slate-800/50 border border-slate-600 rounded-lg p-2 space-y-2">
            {pos.panels.map((panel, pi) => (
              <div key={pi} className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-500 w-[40px] shrink-0">Flügel {pi + 1}</span>
                <select
                  value={panel.type}
                  onChange={e => updatePanel(pi, 'type', e.target.value)}
                  className="flex-1 min-h-[36px] px-1.5 py-1.5 bg-slate-700 border border-slate-600 rounded text-white text-xs"
                >
                  {PANEL_TYPES.map(pt => (
                    <option key={pt.id} value={pt.id}>{pt.label}</option>
                  ))}
                </select>
                {(panel.type === 'dreh' || panel.type === 'kipp-dreh') && (
                  <select
                    value={panel.hinge || 'left'}
                    onChange={e => updatePanel(pi, 'hinge', e.target.value)}
                    className="min-h-[36px] px-1.5 py-1.5 bg-slate-700 border border-slate-600 rounded text-white text-xs"
                  >
                    <option value="left">Band L</option>
                    <option value="right">Band R</option>
                  </select>
                )}
                {pos.panels.length > 1 && (
                  <button onClick={() => removePanel(pi)} className="text-red-400/70 text-xs px-0.5 shrink-0 min-h-[36px]">✕</button>
                )}
              </div>
            ))}
            {pos.oberlicht && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-slate-500 min-w-[52px]">Oberlicht</span>
                <select
                  value={pos.oberlichtType || 'fix'}
                  onChange={e => update('oberlichtType', e.target.value)}
                  className="flex-1 min-h-[36px] px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-white text-xs"
                >
                  <option value="fix">Fest</option>
                  <option value="kipp">Kipp</option>
                  <option value="klapp">Klapp</option>
                </select>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-slate-500">Höhe:</span>
                  <input type="number" value={pos.oberlichtHeight || ''} onChange={e => update('oberlichtHeight', e.target.value)}
                    placeholder="z.B. 400" className="w-16 min-h-[36px] px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-white placeholder:text-slate-500 text-xs"
                    style={validated && !parseFloat(pos.oberlichtHeight) ? { outline: '2px solid #ef4444', outlineOffset: '-1px' } : undefined} />
                  <span className="text-[10px] text-slate-500">mm</span>
                </div>
                <button onClick={toggleOberlicht} className="text-red-400/70 text-xs px-0.5 shrink-0 min-h-[36px]">✕</button>
              </div>
            )}
            {pos.unterlicht && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-slate-500 min-w-[52px]">Unterlicht</span>
                <select
                  value={pos.unterlichtType || 'fix'}
                  onChange={e => update('unterlichtType', e.target.value)}
                  className="flex-1 min-h-[36px] px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-white text-xs"
                >
                  <option value="fix">Fest</option>
                  <option value="kipp">Kipp</option>
                  <option value="klapp">Klapp</option>
                </select>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-slate-500">Höhe:</span>
                  <input type="number" value={pos.unterlichtHeight || ''} onChange={e => update('unterlichtHeight', e.target.value)}
                    placeholder="z.B. 300" className="w-16 min-h-[36px] px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-white placeholder:text-slate-500 text-xs"
                    style={validated && !parseFloat(pos.unterlichtHeight) ? { outline: '2px solid #ef4444', outlineOffset: '-1px' } : undefined} />
                  <span className="text-[10px] text-slate-500">mm</span>
                </div>
                <button onClick={toggleUnterlicht} className="text-red-400/70 text-xs px-0.5 shrink-0 min-h-[36px]">✕</button>
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={addPanel} className="text-[10px] text-blue-400 hover:text-blue-300">+ Flügel</button>
              {!pos.oberlicht && (
                <button onClick={toggleOberlicht} className="text-[10px] text-slate-500 hover:text-slate-400">+ Oberlicht</button>
              )}
              {!pos.unterlicht && (
                <button onClick={toggleUnterlicht} className="text-[10px] text-slate-500 hover:text-slate-400">+ Unterlicht</button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Individuelle Flügelbreiten — nur bei Standard-Typ mit 2+ Flügeln */}
      {pos.preset !== 'mehrteilig' && pos.panels.length > 1 && parseFloat(pos.width) > 0 && (() => {
        const totalW = parseFloat(pos.width)
        return (
          <div className="bg-slate-800/50 border border-slate-600 rounded-lg p-2">
            <p className="text-[10px] text-slate-500 mb-1.5">Flügelbreiten (optional — leer = gleich breit)</p>
            <div className="space-y-1.5">
              {pos.panels.map((panel, pi) => {
                return (
                  <div key={pi} className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 w-14">Flügel {pi + 1}:</span>
                    <input
                      type="number"
                      value={panel.width || ''}
                      onChange={e => {
                        const val = e.target.value
                        const newVal = parseFloat(val) || 0
                        const newPanels = pos.panels.map((p, j) => j === pi
                          ? { ...p, width: val, manual: val !== '' }
                          : { ...p })
                        if (totalW > 0) {
                          const autoIdxs = []
                          let manualSum = 0
                          newPanels.forEach((p, j) => {
                            if (j === pi) return
                            if (p.manual) manualSum += parseFloat(p.width) || 0
                            else autoIdxs.push(j)
                          })
                          const remainder = totalW - newVal - manualSum
                          if (autoIdxs.length > 0) {
                            const each = remainder > 0 ? Math.round(remainder / autoIdxs.length) : 0
                            autoIdxs.forEach(j => { newPanels[j] = { ...newPanels[j], width: each > 0 ? String(each) : '' } })
                          }
                        }
                        onChange({ ...pos, panels: newPanels })
                      }}
                      placeholder={`z.B. ${totalW > 0 ? Math.round(totalW / pos.panels.length) : 600}`}
                      className="w-20 min-h-[32px] px-2 py-1 border border-slate-600 rounded text-xs text-center placeholder:text-slate-500 bg-slate-700 text-white"
                      style={validated && !parseFloat(panel.width) ? { outline: '2px solid #ef4444', outlineOffset: '-1px' } : undefined}
                    />
                    <span className="text-[10px] text-slate-500">mm</span>
                  </div>
                )
              })}
            </div>
            {(() => {
              const sum = pos.panels.reduce((s, p) => s + (p.manual ? (parseFloat(p.width) || 0) : 0), 0)
              return sum > totalW ? (
                <p className="text-[10px] text-red-400 mt-1">⚠ Summe ({sum}) überschreitet Breite ({totalW})</p>
              ) : null
            })()}
          </div>
        )
      })()}

      {/* Anpassen button */}
      {!showCustom && (
        <button
          type="button"
          onClick={() => setShowCustom(true)}
          className="min-h-[44px] px-2 py-1.5 text-xs font-medium transition-colors text-blue-400 hover:text-blue-300 underline decoration-blue-400"
        >⚙ Anpassen</button>
      )}

      {/* Vorschau + Maße */}
      <div className="flex flex-col sm:flex-row gap-3 items-start">
        <div className="bg-slate-800 rounded-lg p-2 border border-slate-700 cursor-pointer hover:border-blue-500 transition-colors self-center sm:self-start" onClick={() => setZoomSketch(true)}>
          {pos.preset === 'mehrteilig' ? (
            <MehrteiligSketch segments={pos.segments || []} alignment={pos.alignment || 'top'} size="lg" />
          ) : (
            <FensterSketch panels={pos.panels} oberlicht={pos.oberlicht} size="lg" posWidth={pos.width} posHeight={pos.height} oberlichtHeight={pos.oberlichtHeight} oberlichtType={pos.oberlichtType} unterlicht={pos.unterlicht} unterlichtHeight={pos.unterlichtHeight} unterlichtType={pos.unterlichtType} />
          )}
        </div>
        {zoomSketch && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setZoomSketch(false)}>
            <div className="bg-slate-800 rounded-xl p-4 sm:p-6 border border-slate-600 max-w-lg w-full overflow-x-auto" onClick={e => e.stopPropagation()}>
              {pos.preset === 'mehrteilig' ? (
                <MehrteiligSketch segments={pos.segments || []} alignment={pos.alignment || 'top'} size="xl" />
              ) : (
                <FensterSketch panels={pos.panels} oberlicht={pos.oberlicht} size="xl" posWidth={pos.width} posHeight={pos.height} oberlichtHeight={pos.oberlichtHeight} oberlichtType={pos.oberlichtType} unterlicht={pos.unterlicht} unterlichtHeight={pos.unterlichtHeight} unterlichtType={pos.unterlichtType} />
              )}
              <button onClick={() => setZoomSketch(false)} className="mt-4 w-full py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm">Schließen</button>
            </div>
          </div>
        )}
        <div className="flex-1 space-y-2">
          {pos.preset === 'mehrteilig' ? (
            /* Mehrteilig: auto-computed dimensions summary */
            <div className="bg-slate-800/50 border border-slate-600 rounded-lg px-2 py-1.5">
              <p className="text-[10px] text-slate-500">
                Gesamt: {(pos.segments || []).reduce((s, seg) => s + (parseFloat(seg.width) || 0), 0)} × {Math.max(...(pos.segments || []).map(seg => parseFloat(seg.height) || 0), 0)} mm
                <span className="ml-2">({(pos.segments || []).length} Segmente)</span>
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-slate-500 mb-0.5">Breite (mm)</label>
                <input type="number" value={pos.width} onChange={e => update('width', e.target.value)}
                  placeholder="z.B. 1200" className="w-full px-2 py-1 bg-slate-800 border border-slate-600 rounded text-white placeholder:text-slate-500 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  style={validated && !parseFloat(pos.width) ? { outline: '2px solid #ef4444', outlineOffset: '-1px' } : undefined} />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-0.5">Höhe gesamt (mm)</label>
                <input type="number" value={pos.height} onChange={e => update('height', e.target.value)}
                  placeholder="z.B. 1400" className="w-full px-2 py-1 bg-slate-800 border border-slate-600 rounded text-white placeholder:text-slate-500 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  style={validated && !parseFloat(pos.height) ? { outline: '2px solid #ef4444', outlineOffset: '-1px' } : undefined} />
                {pos.height && (pos.oberlichtHeight || pos.unterlichtHeight) && (
                  <p className="text-[10px] text-slate-500 mt-0.5">Flügel: {parseFloat(pos.height) - (parseFloat(pos.oberlichtHeight) || 0) - (parseFloat(pos.unterlichtHeight) || 0)} mm</p>
                )}
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <div>
              <label className="block text-[10px] text-slate-500 mb-0.5">Anzahl</label>
              <input type="number" value={pos.count} onChange={e => update('count', e.target.value)}
                min="1" className="w-full px-2 py-1 bg-slate-800 border border-slate-600 rounded text-white placeholder:text-slate-500 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 mb-0.5">Material</label>
              <select value={FENSTER_MATERIALS.includes(pos.material) ? pos.material : '__custom__'}
                onChange={e => update('material', e.target.value)}
                className="w-full px-1 py-1 bg-slate-800 border border-slate-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                {FENSTER_MATERIALS.map(m => <option key={m} value={m}>{m}</option>)}
                <option value="__custom__">Sonstiges...</option>
              </select>
              {!FENSTER_MATERIALS.includes(pos.material) && (
                <input type="text" value={pos.material === '__custom__' ? '' : pos.material} onChange={e => update('material', e.target.value || '__custom__')}
                  placeholder="Material eingeben..."
                  className="w-full mt-1 px-1 py-1 bg-slate-800 border border-slate-600 rounded text-white placeholder:text-slate-500 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" autoFocus />
              )}
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 mb-0.5">Profil</label>
              <input type="text" value={pos.profil || ''} onChange={e => update('profil', e.target.value)}
                placeholder="z.B. Iglo 5 Classic..."
                className="w-full px-2 py-1 bg-slate-800 border border-slate-600 rounded text-white placeholder:text-slate-500 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 mb-0.5">Verglasung</label>
              <select value={FENSTER_GLAZING.includes(pos.glazing) ? pos.glazing : '__custom__'}
                onChange={e => update('glazing', e.target.value)}
                className="w-full px-1 py-1 bg-slate-800 border border-slate-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                {FENSTER_GLAZING.map(g => <option key={g} value={g}>{g}</option>)}
                <option value="__custom__">Sonstiges...</option>
              </select>
              {!FENSTER_GLAZING.includes(pos.glazing) && (
                <input type="text" value={pos.glazing === '__custom__' ? '' : pos.glazing} onChange={e => update('glazing', e.target.value || '__custom__')}
                  placeholder="Verglasung eingeben..."
                  className="w-full mt-1 px-1 py-1 bg-slate-800 border border-slate-600 rounded text-white placeholder:text-slate-500 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" autoFocus />
              )}
            </div>
          </div>
          <div>
            <label className="block text-[10px] text-slate-500 mb-0.5">Farbe / Dekor</label>
            <input type="text" value={pos.color} onChange={e => update('color', e.target.value)}
              placeholder="z.B. Weiß, Anthrazit DB 703..."
              className="w-full px-2 py-1 bg-slate-800 border border-slate-600 rounded text-white placeholder:text-slate-500 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-[10px] text-slate-500 mb-0.5">Bemerkungen</label>
            <textarea value={pos.notes} onChange={e => update('notes', e.target.value)}
              placeholder="Optional... (max. 80 Zeichen)"
              maxLength={80}
              rows={2}
              className={`w-full px-2 py-1 bg-slate-800 border rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y ${(pos.notes?.length || 0) >= 70 ? 'border-amber-500' : 'border-slate-600'}`} />
            {(pos.notes?.length || 0) >= 60 && (
              <span className={`text-[10px] ${(pos.notes?.length || 0) >= 70 ? 'text-amber-400' : 'text-slate-500'}`}>
                {pos.notes.length}/80
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const SK = '#94a3b8'
const SF = '#1e293b'

// Horizontal dim line with ticks + label below
function Hdim({ x1, x2, y, label, above }) {
  const mx = (x1 + x2) / 2
  return (
    <g>
      <line x1={x1} y1={y} x2={x2} y2={y} stroke={SK} strokeWidth={0.7}/>
      <line x1={x1} y1={y-2} x2={x1} y2={y+2} stroke={SK} strokeWidth={0.7}/>
      <line x1={x2} y1={y-2} x2={x2} y2={y+2} stroke={SK} strokeWidth={0.7}/>
      <text x={mx} y={above ? y-2 : y+6} textAnchor="middle" fontSize="7" fill={SK} fontFamily="sans-serif">{label}</text>
    </g>
  )
}

// Vertical dim line with ticks + label to the right
function Vdim({ x, y1, y2, label }) {
  const my = (y1 + y2) / 2
  return (
    <g>
      <line x1={x} y1={y1} x2={x} y2={y2} stroke={SK} strokeWidth={0.7}/>
      <line x1={x-2} y1={y1} x2={x+2} y2={y1} stroke={SK} strokeWidth={0.7}/>
      <line x1={x-2} y1={y2} x2={x+2} y2={y2} stroke={SK} strokeWidth={0.7}/>
      <text x={x+4} y={my+2.5} textAnchor="start" fontSize="7" fill={SK} fontFamily="sans-serif">{label}</text>
    </g>
  )
}

const UnitSketch = ({ unit, isTriangle }) => {
  if (unit === 'm²') return (
    <svg width="56" height="38" viewBox="0 0 56 38" overflow="visible">
      <rect x="4" y="4" width="34" height="22" fill={SF} stroke={SK} strokeWidth={1.2}/>
      <Hdim x1={4} x2={38} y={31} label="L"/>
      <Vdim x={43} y1={4} y2={26} label="B"/>
    </svg>
  )
  if (unit === 'Wand') return (
    <svg width="72" height="52" viewBox="-12 0 84 52" overflow="visible">
      <polygon points="2,10 44,10 44,38 2,38" fill={SF} stroke={SK} strokeWidth={1.2}/>
      <polygon points="2,10 12,2 54,2 44,10" fill={SF} stroke={SK} strokeWidth={0.7} strokeDasharray="3 2"/>
      <polygon points="44,10 54,2 54,30 44,38" fill={SF} stroke={SK} strokeWidth={1.2}/>
      <text x={-9} y={26} fontSize="8" fontWeight="bold" fill={SK} fontFamily="sans-serif">H</text>
      <text x={23} y={48} textAnchor="middle" fontSize="8" fontWeight="bold" fill={SK} fontFamily="sans-serif">L</text>
      <text x={51} y={44} fontSize="8" fontWeight="bold" fill={SK} fontFamily="sans-serif">B</text>
    </svg>
  )
  if (unit === 'Bogen') return (
    <svg width="64" height="40" viewBox="0 0 64 40" overflow="visible">
      <path d="M4,28 C4,15.85 13.85,6 26,6 C38.15,6 48,15.85 48,28 Z" fill={SF} stroke={SK} strokeWidth={1.2}/>
      <Hdim x1={4} x2={48} y={33} label="L"/>
      <Vdim x={52} y1={6} y2={28} label="H"/>
    </svg>
  )
  if (unit === 'Trap') {
    if (isTriangle) return (
      <svg width="64" height="44" viewBox="0 0 64 44" overflow="visible">
        <polygon points="28,6 4,30 52,30" fill={SF} stroke={SK} strokeWidth={1.2}/>
        <line x1={28} y1={6} x2={28} y2={30} stroke={SK} strokeWidth={0.6} strokeDasharray="2 2" opacity="0.5"/>
        <Hdim x1={4} x2={52} y={35} label="a"/>
        <Vdim x={56} y1={6} y2={30} label="h"/>
      </svg>
    )
    return (
      <svg width="64" height="48" viewBox="0 0 64 48" overflow="visible">
        <polygon points="12,8 44,8 52,32 4,32" fill={SF} stroke={SK} strokeWidth={1.2}/>
        <Hdim x1={12} x2={44} y={4} label="a" above/>
        <Hdim x1={4} x2={52} y={37} label="b"/>
        <Vdim x={56} y1={8} y2={32} label="h"/>
      </svg>
    )
  }
  if (unit === 'lfm') return (
    <svg width="56" height="24" viewBox="0 0 56 24" overflow="visible">
      <line x1={4} y1={10} x2={50} y2={10} stroke={SK} strokeWidth={1.8}/>
      <Hdim x1={4} x2={50} y={15} label="L"/>
    </svg>
  )
  if (unit === 'm³') return (
    <svg width="72" height="52" viewBox="-12 0 84 52" overflow="visible">
      <polygon points="2,10 44,10 44,38 2,38" fill={SF} stroke={SK} strokeWidth={1.2}/>
      <polygon points="2,10 12,2 54,2 44,10" fill={SF} stroke={SK} strokeWidth={1.2}/>
      <polygon points="44,10 54,2 54,30 44,38" fill={SF} stroke={SK} strokeWidth={1.2}/>
      <text x={-9} y={26} fontSize="8" fontWeight="bold" fill={SK} fontFamily="sans-serif">H</text>
      <text x={23} y={48} textAnchor="middle" fontSize="8" fontWeight="bold" fill={SK} fontFamily="sans-serif">L</text>
      <text x={51} y={44} fontSize="8" fontWeight="bold" fill={SK} fontFamily="sans-serif">B</text>
    </svg>
  )
  if (unit === 'Stk') return (
    <svg width="48" height="24" viewBox="0 0 48 24">
      <circle cx="8" cy="12" r="4" fill={SK}/>
      <circle cx="24" cy="12" r="4" fill={SK}/>
      <circle cx="40" cy="12" r="4" fill={SK}/>
      <text x="24" y="22" textAnchor="middle" fontSize="7" fill={SK} fontFamily="sans-serif">n Stück</text>
    </svg>
  )
  return null
}

const UNIT_HINTS = {
  'm²':   { text: 'Fläche: L × B' },
  'Wand': { text: 'Wandfläche: 2 × (L + B) × H' },
  'Bogen': { text: 'Halbellipse: pi × L × H / 4' },
  'Trap': (item) => {
    const b = parseFloat(item.width) || 0
    if (b === 0) return { text: 'Dreieck (b = 0): a × h / 2', isTriangle: true }
    return { text: 'Trapez: (a + b) / 2 × h ; b = 0 ergibt Dreieck' }
  },
  'lfm':   { text: 'Längenmaß: nur L' },
  'm³':   { text: 'Volumen: L × B × H' },
  'Stk':  { text: 'Stückzahl: direkte Anzahl' },
}

function newId() {
  return Math.random().toString(36).slice(2, 10)
}

function calcItem(item) {
  const scale = item.dim_unit === 'cm' ? 0.01 : 1
  const l = (parseFloat(item.length) || 0) * scale
  const b = (parseFloat(item.width) || 0) * scale
  const h = (parseFloat(item.height) || 0) * scale
  const c = parseFloat(item.count) || 1
  const u = item.dim_unit === 'cm' ? 'cm' : 'm'
  let result = 0
  let calculation = ''
  switch (item.unit) {
    case 'm²':
      if (item.description?.toLowerCase().includes('rund')) {
        // Kreis: π × (d/2)²
        const r = l / 2
        result = Math.PI * r * r * c
        calculation = c > 1 ? `π×(${item.length}${u}/2)² × ${c}` : `π×(${item.length}${u}/2)²`
      } else {
        result = l * b * c
        calculation = c > 1 ? `${item.length}${u} × ${item.width}${u} × ${c}` : `${item.length}${u} × ${item.width}${u}`
      }
      break
    case 'Bogen':
      // Halbe Ellipse: π × (L/2) × H / 2 = π × L × H / 4
      result = Math.PI * l * h / 4 * c
      calculation = c > 1 ? `(pi x ${item.length}${u} x ${item.height}${u}) / 4 x ${c}` : `(pi x ${item.length}${u} x ${item.height}${u}) / 4`
      break
    case 'Trap':
      // Trapez: (a + b) / 2 × h
      result = (l + b) / 2 * h * c
      calculation = c > 1 ? `(${item.length}+${item.width})${u}/2 × ${item.height}${u} × ${c}` : `(${item.length}+${item.width})${u}/2 × ${item.height}${u}`
      break
    case 'lfm':
      result = l * c
      calculation = c > 1 ? `${item.length}${u} × ${c}` : `${item.length}${u}`
      break
    case 'Wand':
      result = 2 * (l + b) * h * c
      calculation = c > 1 ? `2×(${item.length}+${item.width})${u} × ${item.height}${u} × ${c}` : `2×(${item.length}+${item.width})${u} × ${item.height}${u}`
      break
    case 'm³':
      result = l * b * h * c
      calculation = c > 1 ? `${item.length}${u} × ${item.width}${u} × ${item.height}${u} × ${c}` : `${item.length}${u} × ${item.width}${u} × ${item.height}${u}`
      break
    case 'Stk':
      result = c
      calculation = `${c}`
      break
    default:
      result = 0
  }
  return { ...item, result: Math.round(result * 100) / 100, calculation }
}

function computeTotals(rooms, gewerk) {
  const t = {}
  const gw = GEWERKE.find(g => g.id === gewerk) || {}
  const vobWand = gw.vobWand || 0
  const vobBoden = gw.vobBoden || 0
  // Trades with Wand positions: openings subtract from Wand → use vobWand threshold
  // Floor-only trades (Bodenbelag): openings subtract from floor → use vobBoden threshold
  const hasWallPos = ['maler', 'fliesen', 'trockenbau'].includes(gewerk)
  const vobThr = hasWallPos ? vobWand : vobBoden
  for (const r of rooms) {
    for (const i of r.items || []) {
      if (i.result == null) continue
      const rawU = i.unit || ''
      // Trades with Wand: keep Wand separate from m² (Decke/Boden) so Abzug only applies to Wand
      const unit = hasWallPos
        ? (['Bogen', 'Trap'].includes(rawU) ? 'm²' : rawU)
        : (['Wand', 'Bogen', 'Trap'].includes(rawU) ? 'm²' : rawU)
      let sign = i.subtract ? -1 : 1
      if (i.subtract && vobThr > 0) {
        const cnt = parseFloat(i.count) || 1
        const singleArea = cnt > 0 ? i.result / cnt : i.result
        if (singleArea < vobThr) sign = 0
      }
      if (hasWallPos && i.subtract) {
        t['Wand'] = (t['Wand'] || 0) + i.result * sign
      } else if (unit) {
        t[unit] = (t[unit] || 0) + i.result * sign
      }
    }
  }
  return t
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('de-DE')
}

function formatNum(n) {
  return Number(n).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ─── Item row ────────────────────────────────────────────────────────────────
function ItemRow({ item, onChange, onRemove }) {
  const update = (field, val) => onChange(calcItem({ ...item, [field]: val }))

  return (
    <div className="flex flex-col gap-2 p-2 bg-slate-800 rounded-lg border border-slate-700 text-sm">
      {/* Beschreibung header row */}
      <div className="flex gap-2 items-center">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 mb-1">
            <span className="text-xs text-slate-400 font-medium">Beschreibung</span>
            <span className="text-red-400 text-xs">*</span>
            <span className="text-xs text-slate-600">→ Angebot</span>
          </div>
          <input
            type="text"
            value={item.description}
            onChange={e => update('description', e.target.value)}
            placeholder="z.B. Bodenbelag, Wandfliesen..."
            className="w-full px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-500 text-sm"
          />
        </div>
        <button onClick={onRemove} className="shrink-0 self-end mb-0.5 w-6 h-6 flex items-center justify-center bg-red-600/20 hover:bg-red-600/40 text-red-400 text-xs rounded transition-colors">✕</button>
      </div>

      {/* Unit selector */}
      <div className="flex gap-1 items-center flex-wrap">
        <div className="flex gap-0.5 flex-wrap">
          {UNITS.map(u => (
            <button
              key={u}
              onClick={() => update('unit', u)}
              className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
                item.unit === u
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              {u}
            </button>
          ))}
        </div>
        <span className="text-slate-600 mx-1">|</span>
      </div>

      {/* Mjere */}
      <div className="flex gap-2 items-center flex-wrap">
        {/* m | cm toggle — samo za dimenzijske jedinice */}
        {item.unit !== 'Stk' && (
          <div className="flex rounded overflow-hidden border border-slate-600 shrink-0">
            {['m', 'cm'].map(du => (
              <button
                key={du}
                onClick={() => update('dim_unit', du)}
                className={`px-2 py-0.5 text-xs font-medium transition-colors ${
                  (item.dim_unit || 'm') === du
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                {du}
              </button>
            ))}
          </div>
        )}
        {(item.unit === 'm²' || item.unit === 'lfm' || item.unit === 'm³' || item.unit === 'Wand' || item.unit === 'Trap' || item.unit === 'Bogen') && (
          <div className="flex items-center gap-1">
            <span className="text-slate-500 text-xs">{item.unit === 'Trap' ? 'a' : 'L'}</span>
            <input
              type="number"
              value={item.length || ''}
              onChange={e => update('length', e.target.value)}
              placeholder="0.00"
              step="0.01"
              inputMode="decimal"
              className="w-20 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm text-right"
            />
          </div>
        )}
        {(item.unit === 'm²' || item.unit === 'm³' || item.unit === 'Wand' || item.unit === 'Trap') && (
          <>
            <span className="text-slate-500">×</span>
            <div className="flex items-center gap-1">
              <span className="text-slate-500 text-xs">{item.unit === 'Trap' ? 'b' : 'B'}</span>
              <input
                type="number"
                value={item.width || ''}
                onChange={e => update('width', e.target.value)}
                placeholder="0.00"
                step="0.01"
                inputMode="decimal"
                className="w-20 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm text-right"
              />
            </div>
          </>
        )}
        {(item.unit === 'm³' || item.unit === 'Wand' || item.unit === 'Trap' || item.unit === 'Bogen') && (
          <>
            <span className="text-slate-500">×</span>
            <div className="flex items-center gap-1">
              <span className="text-slate-500 text-xs">H</span>
              <input
                type="number"
                value={item.height || ''}
                onChange={e => update('height', e.target.value)}
                placeholder="0.00"
                step="0.01"
                inputMode="decimal"
                className="w-20 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm text-right"
              />
            </div>
          </>
        )}
        {item.unit === 'Stk' && (
          <div className="flex items-center gap-1">
            <span className="text-slate-500 text-xs">Stk</span>
            <input
              type="number"
              value={item.count || ''}
              onChange={e => update('count', e.target.value)}
              placeholder="1"
              step="1"
              inputMode="numeric"
              className="w-20 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm text-right"
            />
          </div>
        )}
        {/* Anzahl za sve osim Stk */}
        {item.unit !== 'Stk' && (
          <div className="flex items-center gap-1 ml-auto">
            <span className="text-slate-500 text-xs">×Anz.</span>
            <input
              type="number"
              value={item.count || ''}
              onChange={e => update('count', e.target.value)}
              placeholder="1"
              step="1"
              min="1"
              inputMode="numeric"
              className="w-16 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm text-right"
            />
          </div>
        )}
        {/* Ergebnis */}
        <div className="ml-auto flex items-center gap-1 bg-slate-900 px-3 py-1 rounded border border-slate-700">
          <span className="text-white font-semibold text-sm">{formatNum(item.result || 0)}</span>
          <span className="text-slate-400 text-xs">{(item.unit === 'Wand' || item.unit === 'Bogen' || item.unit === 'Trap') ? 'm²' : item.unit}</span>
        </div>
      </div>

      {/* Hint */}
      {UNIT_HINTS[item.unit] && (() => {
        const hint = typeof UNIT_HINTS[item.unit] === 'function'
          ? UNIT_HINTS[item.unit](item)
          : UNIT_HINTS[item.unit]
        return (
          <div className="flex items-center justify-center gap-2 px-1 mt-1">
            <UnitSketch unit={item.unit} isTriangle={hint.isTriangle} />
            <span className="text-xs text-slate-500 italic">{hint.text}</span>
          </div>
        )
      })()}
    </div>
  )
}

// ─── Shape row (Öffnungen + Formen, shared) ───────────────────────────────────
const SHAPES = [
  { id: 'rect', label: '▭', title: 'Rechteck',   formula: (b, h) => b * h,                  calcStr: (b, h, u) => `${b}${u}×${h}${u}` },
  { id: 'tri',  label: '△', title: 'Dreieck',    formula: (b, h) => b * h / 2,              calcStr: (b, h, u) => `${b}${u}×${h}${u}/2` },
  { id: 'elli', label: '◖', title: 'Halbelipse', formula: (b, h) => Math.PI * b * h / 4,   calcStr: (b, h, u) => `pi x ${b}${u} x ${h}${u} / 4` },
]

function ShapeRow({ item, onChange, onRemove }) {
  const isSubtract = !!item.subtract
  const update = (field, val) => {
    const updated = { ...item, [field]: val }
    const s = (updated.dim_unit || 'm') === 'cm' ? 0.01 : 1
    const b = (parseFloat(updated.length) || 0) * s
    const h = (parseFloat(updated.width) || 0) * s
    const c = parseFloat(updated.count) || 1
    const u = (updated.dim_unit || 'm') === 'cm' ? 'cm' : 'm'
    const sh = SHAPES.find(x => x.id === (updated.shape || 'rect')) || SHAPES[0]
    updated.result = Math.round(sh.formula(b, h) * c * 100) / 100
    const base = sh.calcStr(updated.length || 0, updated.width || 0, u)
    updated.calculation = c > 1 ? `${base}×${c}` : base
    onChange(updated)
  }
  const shape = item.shape || 'rect'
  const accentBtn = isSubtract ? 'bg-red-700 text-white' : 'bg-teal-700 text-white'
  const wrapCls = isSubtract ? 'bg-red-950/20 border-red-900/30' : 'bg-teal-950/20 border-teal-900/30'
  const resCls  = isSubtract ? 'bg-red-900/30 border-red-500/30 text-red-300' : 'bg-teal-900/30 border-teal-500/30 text-teal-300'
  const sign    = isSubtract ? '−' : '+'
  const signCls = isSubtract ? 'text-red-400' : 'text-teal-400'
  return (
    <div className={`py-1.5 px-2 rounded-lg border text-sm ${wrapCls}`}>
      {/* Row 1: description */}
      <div className="flex gap-1.5 items-center mb-1.5">
        <input type="text" value={item.description} onChange={e => update('description', e.target.value)}
          placeholder={isSubtract ? 'Fenster / Tür...' : 'Beschreibung...'}
          className="flex-1 min-w-0 px-2 py-1 bg-slate-800 border border-slate-600 rounded text-white placeholder-slate-500 text-xs shape-row-input" />
        <div className="flex rounded overflow-hidden border border-slate-600 shrink-0">
          {SHAPES.map(sh => (
            <button key={sh.id} onClick={() => update('shape', sh.id)} title={sh.title}
              className={`px-2 py-0.5 text-xs font-medium transition-colors ${shape === sh.id ? accentBtn : 'bg-slate-700 text-slate-400'}`}
            >{sh.label}</button>
          ))}
        </div>
        <div className="flex rounded overflow-hidden border border-slate-600 shrink-0">
          {['m', 'cm'].map(du => (
            <button key={du} onClick={() => update('dim_unit', du)}
              className={`px-2 py-0.5 text-xs font-medium transition-colors ${(item.dim_unit || 'm') === du ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'}`}
            >{du}</button>
          ))}
        </div>
      </div>
      {/* Row 2: dimensions */}
      <div className="flex flex-wrap gap-1.5 items-center">
        <div className="flex items-center gap-1">
          <span className="text-slate-500 text-xs">B</span>
          <input type="number" value={item.length || ''} onChange={e => update('length', e.target.value)}
            placeholder="0.00" step="0.01" inputMode="decimal"
            className="w-14 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-xs text-right shape-row-input" />
        </div>
        <span className="text-slate-500 text-xs">×</span>
        <div className="flex items-center gap-1">
          <span className="text-slate-500 text-xs">H</span>
          <input type="number" value={item.width || ''} onChange={e => update('width', e.target.value)}
            placeholder="0.00" step="0.01" inputMode="decimal"
            className="w-14 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-xs text-right shape-row-input" />
        </div>
        <div className="flex items-center gap-1">
          <span className="text-slate-500 text-xs">×</span>
          <input type="number" value={item.count || ''} onChange={e => update('count', e.target.value)}
            placeholder="1" step="1" min="1" inputMode="numeric"
            className="w-12 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-xs text-right shape-row-input" />
        </div>
        <div className={`ml-auto flex items-center gap-1 px-2 py-1 rounded border light-invert-text ${resCls}`}>
          <span className={`text-xs font-bold light-invert-text ${signCls}`}>{sign}</span>
          <span className="font-semibold text-xs">{formatNum(item.result || 0)}</span>
          <span className="text-xs">m²</span>
        </div>
        <button onClick={onRemove} className="w-6 h-6 flex items-center justify-center bg-red-600/20 hover:bg-red-600/40 text-red-400 text-xs rounded shrink-0">✕</button>
      </div>
    </div>
  )
}

// ─── Öffnungen section ────────────────────────────────────────────────────────
function ÖffnungenSection({ openings, onChange, bruttoM2 }) {
  const [open, setOpen] = useState(false)

  const totalAbzug = openings.reduce((s, i) => s + (i.result || 0), 0)
  const netto = bruttoM2 - totalAbzug

  const addOpening = () => {
    onChange([...openings, { id: newId(), description: '', shape: 'rect', unit: 'm²', dim_unit: 'm', length: '', width: '', count: '', result: 0, calculation: '', subtract: true }])
    setOpen(true)
  }
  const updateOpening = (idx, item) => {
    const updated = [...openings]; updated[idx] = item; onChange(updated)
  }
  const removeOpening = (idx) => onChange(openings.filter((_, i) => i !== idx))

  return (
    <div className="border border-red-900/40 rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-red-950/30 cursor-pointer" onClick={() => setOpen(o => !o)}>
        <span className="text-red-400 text-sm">🪟</span>
        <span className="text-red-300 text-sm font-medium flex-1">Öffnungen & Abzüge</span>
        {openings.length > 0 && !open && (
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-red-400 text-xs font-mono">− {formatNum(totalAbzug)} m²</span>
            <span className="text-white light-invert-text text-sm font-bold font-mono">= {formatNum(netto)} m²</span>
          </div>
        )}
        <span className="text-red-400/60 text-xs">{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div className="p-3 space-y-2 bg-red-950/10">
          {openings.length === 0 && (
            <p className="text-xs text-slate-500 italic text-center py-1">Noch keine Öffnungen</p>
          )}
          {openings.map((item, idx) => (
            <ShapeRow key={item.id} item={item}
              onChange={newItem => updateOpening(idx, newItem)}
              onRemove={() => removeOpening(idx)}
            />
          ))}
          <button onClick={addOpening}
            className="w-full py-1.5 border border-dashed border-red-900/50 hover:border-red-700 text-red-400/70 hover:text-red-300 text-sm rounded-lg transition-colors">
            + Öffnung hinzufügen
          </button>
          {openings.length > 0 && (
            <div className="px-3 py-2 bg-slate-900/60 rounded border border-slate-700 text-xs space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>Fläche (brutto)</span>
                <span>{formatNum(bruttoM2)} m²</span>
              </div>
              {openings.map((op, i) => op.result > 0 && (
                <div key={i} className="flex justify-between text-red-400">
                  <span>− {op.description || `Öffnung ${i + 1}`}{(parseFloat(op.count) || 1) > 1 ? ` ×${op.count}` : ''}</span>
                  <span>− {formatNum(op.result)} m²</span>
                </div>
              ))}
              <div className="flex justify-between text-white font-semibold border-t border-slate-700 pt-1 light-invert-text">
                <span>Netto</span>
                <span>{formatNum(netto)} m²</span>
              </div>
            </div>
          )}
          <button onClick={() => setOpen(false)}
            className="w-full py-2 bg-red-800/30 hover:bg-red-700/40 text-red-200 text-sm font-medium rounded-lg transition-colors border border-red-700/60">
            ✓ Fertig
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Formen section (additive shapes) ────────────────────────────────────────
function FormenSection({ forms, onChange, baseM2 }) {
  const [open, setOpen] = useState(false)
  const totalAdd = forms.reduce((s, i) => s + (i.result || 0), 0)
  const netto = baseM2 + totalAdd

  const addForm = () => {
    onChange([...forms, { id: newId(), description: '', shape: 'elli', unit: 'm²', dim_unit: 'm', length: '', width: '', count: '', result: 0, calculation: '', subtract: false, isForm: true }])
    setOpen(true)
  }
  const updateForm = (idx, item) => { const updated = [...forms]; updated[idx] = item; onChange(updated) }
  const removeForm = (idx) => onChange(forms.filter((_, i) => i !== idx))

  return (
    <div className="border border-teal-900/40 rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-teal-950/30 cursor-pointer" onClick={() => setOpen(o => !o)}>
        <span className="text-teal-400 text-sm">◖</span>
        <span className="text-teal-300 text-sm font-medium flex-1">Formen & Ergänzungen</span>
        {forms.length > 0 && !open && (
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-teal-400 text-xs font-mono">+ {formatNum(totalAdd)} m²</span>
            <span className="text-white light-invert-text text-sm font-bold font-mono">= {formatNum(netto)} m²</span>
          </div>
        )}
        <button onClick={e => { e.stopPropagation(); addForm() }}
          className="text-teal-400 hover:text-teal-200 text-lg font-bold px-1 leading-none">+</button>
        <span className="text-teal-400/60 text-xs">{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div className="p-3 space-y-2 bg-teal-950/10">
          {forms.length === 0 && (
            <p className="text-xs text-slate-500 italic text-center py-1">Noch keine Ergänzungen</p>
          )}
          {forms.map((item, idx) => (
            <ShapeRow key={item.id} item={item}
              onChange={newItem => updateForm(idx, newItem)}
              onRemove={() => removeForm(idx)}
            />
          ))}
          <button onClick={addForm}
            className="w-full py-1.5 border border-dashed border-teal-900/50 hover:border-teal-700 text-teal-400/70 hover:text-teal-300 text-sm rounded-lg transition-colors">
            + Form hinzufügen
          </button>
          {forms.length > 0 && (
            <div className="px-3 py-2 bg-slate-900/60 rounded border border-slate-700 text-xs">
              <div className="flex justify-between font-semibold">
                <span className="text-teal-300">Gesamt Ergänzungen</span>
                <span className="text-white light-invert-text">+ {formatNum(totalAdd)} m²</span>
              </div>
            </div>
          )}
          <button onClick={() => setOpen(false)}
            className="w-full py-2 bg-teal-800/30 hover:bg-teal-700/40 text-teal-200 text-sm font-medium rounded-lg transition-colors border border-teal-700/60">
            ✓ Fertig
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Material row ─────────────────────────────────────────────────────────────
function MaterialRow({ item, onChange, onRemove }) {
  return (
    <div className="flex gap-2 items-center py-1.5 border-b border-slate-700/50 last:border-0">
      <input
        value={item.description}
        onChange={e => onChange({ ...item, description: e.target.value })}
        placeholder="Bezeichnung"
        className="flex-1 bg-slate-700 text-white text-sm rounded px-2 py-1 border border-slate-600 min-w-0"
      />
      <input
        type="number"
        value={item.quantity}
        onChange={e => onChange({ ...item, quantity: e.target.value })}
        placeholder="Menge"
        className="w-20 bg-slate-700 text-white text-sm rounded px-2 py-1 border border-slate-600 text-right"
      />
      <select
        value={item.unit}
        onChange={e => onChange({ ...item, unit: e.target.value })}
        className="bg-slate-700 text-white text-sm rounded px-2 py-1 border border-slate-600"
      >
        {MATERIAL_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
      </select>
      <button onClick={onRemove} className="w-6 h-6 flex items-center justify-center bg-red-600/20 hover:bg-red-600/40 text-red-400 text-xs rounded shrink-0">✕</button>
    </div>
  )
}

// ─── Materialien section ───────────────────────────────────────────────────────
function MaterialienSection({ materials, onChange }) {
  const [open, setOpen] = useState(false)

  const addMaterial = () => {
    onChange([...materials, { id: newId(), description: '', quantity: '', unit: 'Stk' }])
    setOpen(true)
  }
  const updateMaterial = (idx, item) => {
    const updated = [...materials]; updated[idx] = item; onChange(updated)
  }
  const removeMaterial = (idx) => onChange(materials.filter((_, i) => i !== idx))

  return (
    <div className="border border-amber-800/40 rounded-lg overflow-hidden">
      <div
        className="flex items-center justify-between px-3 py-2 bg-amber-900/20 cursor-pointer"
        onClick={() => materials.length > 0 ? setOpen(o => !o) : addMaterial()}
      >
        <div className="flex items-center gap-2">
          <span className="text-amber-400 text-sm font-semibold">📦 Materialien</span>
          {materials.length > 0 && (
            <span className="text-amber-300/70 text-xs">({materials.length})</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!open && materials.length === 0 && (
            <span className="text-amber-400/60 text-xs">+ hinzufügen</span>
          )}
          {materials.length > 0 && (
            <span className="text-amber-400/70 text-xs">{open ? '▲' : '▼'}</span>
          )}
        </div>
      </div>
      {open && (
        <div className="p-3 bg-slate-800/40 space-y-2">
          <div className="flex gap-2 text-xs text-slate-400 px-1 pb-1">
            <span className="flex-1">Bezeichnung</span>
            <span className="w-20 text-right">Menge</span>
            <span className="w-16 text-center">Einheit</span>
            <span className="w-6"></span>
          </div>
          {materials.map((m, idx) => (
            <MaterialRow key={m.id} item={m} onChange={item => updateMaterial(idx, item)} onRemove={() => removeMaterial(idx)} />
          ))}
          <button onClick={addMaterial}
            className="w-full py-1.5 border border-dashed border-amber-900/50 hover:border-amber-700 text-amber-400/70 hover:text-amber-300 text-sm rounded-lg transition-colors">
            + Material hinzufügen
          </button>
          <button onClick={() => setOpen(false)}
            className="w-full py-2 bg-amber-800/30 hover:bg-amber-700/40 text-amber-200 text-sm font-medium rounded-lg transition-colors border border-amber-700/60">
            ✓ Fertig
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Trade room card (Maler, Fliesen, Trockenbau, Bodenbelag) ────────────────
function TradeRaumCard({ room, onChange, onRemove, gewerk, validated }) {
  const [open, setOpen] = useState(true)
  const [openingsOpen, setOpeningsOpen] = useState(false)

  // Auto-open Öffnungen panel if validated and has errors
  useEffect(() => {
    if (!validated) return
    const openings = (room.items || []).filter(i => i.subtract)
    const hasError = openings.some(op => !op.description?.trim() || !parseFloat(op.length) || !parseFloat(op.width))
    if (hasError) setOpeningsOpen(true)
  }, [validated])

  const gw = GEWERKE.find(g => g.id === gewerk) || {}
  const schnellpos = TRADE_SCHNELLPOS[gewerk] || []
  const vobWand = gw.vobWand || 0
  const vobBoden = gw.vobBoden || 0
  const vobMax = Math.max(vobWand, vobBoden)
  const hasWall = schnellpos.some(s => s.calc === 'wall')
  const hasFloor = schnellpos.some(s => s.calc === 'floor')

  const rL = parseFloat(room.length) || 0
  const rB = parseFloat(room.width) || 0
  const rH = parseFloat(room.height) || 0
  const hasDims = hasWall ? (rL > 0 && rB > 0 && rH > 0) : (rL > 0 && rB > 0)

  // Computed values from room dimensions
  const wandflaeche = rL > 0 && rB > 0 && rH > 0 ? Math.round(2 * (rL + rB) * rH * 100) / 100 : 0
  const deckenflaeche = rL > 0 && rB > 0 ? Math.round(rL * rB * 100) / 100 : 0
  const umfang = rL > 0 && rB > 0 ? Math.round(2 * (rL + rB) * 100) / 100 : 0

  // Items management
  const positions = (room.items || []).filter(i => !i.subtract)
  const openings = (room.items || []).filter(i => i.subtract)

  const setItems = (newPositions, newOpenings) => {
    onChange({ ...room, items: [...(newPositions || positions), ...(newOpenings || openings)] })
  }

  const addPosition = (desc, unit, length, width, height, count) => {
    const item = calcItem({
      id: newId(), description: desc, unit, dim_unit: 'm',
      length: String(length), width: String(width), height: String(height),
      count: count > 1 ? String(count) : '', result: 0, calculation: '', subtract: false
    })
    setItems([...positions, item], undefined)
  }

  const removePosition = (idx) => setItems(positions.filter((_, i) => i !== idx), undefined)

  const addOpening = () => {
    const item = calcItem({
      id: newId(), description: '', unit: 'm²', dim_unit: 'm',
      length: '', width: '', height: '', count: '', result: 0, calculation: '', subtract: true
    })
    setItems(undefined, [...openings, item])
  }

  const updateOpening = (idx, field, val) => {
    const updated = [...openings]
    updated[idx] = calcItem({ ...updated[idx], [field]: val })
    setItems(undefined, updated)
  }

  const removeOpening = (idx) => setItems(undefined, openings.filter((_, i) => i !== idx))

  // Totals
  const bruttoM2 = positions.reduce((s, i) => {
    const u = ['Wand', 'Bogen', 'Trap'].includes(i.unit) ? 'm²' : i.unit
    return u === 'm²' ? s + (i.result || 0) : s
  }, 0)
  const totalAbzug = openings.reduce((s, i) => {
    const total = i.result || 0
    const cnt = parseFloat(i.count) || 1
    const singleArea = cnt > 0 ? total / cnt : total
    return singleArea >= (vobMax || 0) ? s + total : s
  }, 0)
  const nettoM2 = Math.round((bruttoM2 - totalAbzug) * 100) / 100

  // Check which quick-positions are already added
  const isAdded = (sp) => {
    if (sp.unit === 'Wand') return positions.some(i => i.unit === 'Wand')
    if (sp.unit === 'lfm') return positions.some(i => i.unit === 'lfm' && i.description?.includes(sp.desc.split(' ')[0]))
    if (sp.calc === 'floor') return positions.some(i => i.description?.includes(sp.desc.split(' ')[0]))
    return false
  }

  // Schnellposition values
  const spValues = (sp) => {
    if (sp.calc === 'wall') return [rL, rB, rH, 1]
    if (sp.calc === 'floor') return [rL, rB, '', 1]
    if (sp.calc === 'perimeter') return [umfang, '', '', 1]
    return ['', '', '', 1]
  }

  // Bodenbelag never needs height
  const needsHeight = gewerk !== 'bodenbelag'

  return (
    <div className="rounded-xl border border-slate-600 overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 bg-slate-700/60 cursor-pointer"
        onClick={() => setOpen(o => !o)}
      >
        {open ? (
          <input
            type="text"
            value={room.name}
            onChange={e => { e.stopPropagation(); onChange({ ...room, name: e.target.value }) }}
            onClick={e => e.stopPropagation()}
            placeholder="Raumname (z.B. Wohnzimmer)"
            className="flex-1 bg-slate-800/50 border border-slate-600 rounded px-2 py-1 text-white text-sm font-medium focus:outline-none focus:border-blue-500 placeholder-slate-500 min-w-0"
            style={validated && !room.name?.trim() ? { outline: '2px solid #ef4444', outlineOffset: '-1px' } : undefined}
          />
        ) : (
          <span className="flex-1 text-white text-sm font-medium truncate">
            {room.name || <span className="text-slate-500">Raumname</span>}
            {nettoM2 > 0 && <span className="text-slate-400 text-xs font-mono ml-2">{formatNum(nettoM2)} m²</span>}
          </span>
        )}
        <button onClick={e => { e.stopPropagation(); onRemove() }} className="text-red-400/60 hover:text-red-400 text-lg px-1">✕</button>
        <span className="text-slate-400 text-xs">{open ? '▲' : '▼'}</span>
      </div>

      {open && (
        <div className="p-3 space-y-3">
          {/* Room dimensions L / B / H */}
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="text-xs text-slate-400">L (m)</label>
              <input type="number" step="0.01" value={room.length || ''} onChange={e => onChange({ ...room, length: e.target.value })}
                className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-white text-sm" style={validated && !parseFloat(room.length) ? { outline: '2px solid #ef4444', outlineOffset: '-1px' } : undefined} placeholder="0.00" />
            </div>
            <span className="text-slate-500 pb-2">×</span>
            <div className="flex-1">
              <label className="text-xs text-slate-400">B (m)</label>
              <input type="number" step="0.01" value={room.width || ''} onChange={e => onChange({ ...room, width: e.target.value })}
                className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-white text-sm" style={validated && !parseFloat(room.width) ? { outline: '2px solid #ef4444', outlineOffset: '-1px' } : undefined} placeholder="0.00" />
            </div>
            {needsHeight && <>
            <span className="text-slate-500 pb-2">×</span>
            <div className="flex-1">
              <label className="text-xs text-slate-400">H (m)</label>
              <input type="number" step="0.01" value={room.height || ''} onChange={e => onChange({ ...room, height: e.target.value })}
                className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-white text-sm" style={validated && !parseFloat(room.height) ? { outline: '2px solid #ef4444', outlineOffset: '-1px' } : undefined} placeholder="0.00" />
            </div>
            </>}
          </div>

          {/* Auto-computed hints */}
          {hasDims && (
            <div className="flex flex-wrap gap-3 text-xs text-slate-400 bg-slate-800/50 rounded px-2 py-1.5">
              {hasWall && wandflaeche > 0 && <span>Wände: <span className="text-white font-mono">{formatNum(wandflaeche)} m²</span></span>}
              {hasFloor && deckenflaeche > 0 && <span>{gewerk === 'maler' || gewerk === 'trockenbau' ? 'Decke' : 'Boden'}: <span className="text-white font-mono">{formatNum(deckenflaeche)} m²</span></span>}
              <span>Umfang: <span className="text-white font-mono">{formatNum(umfang)} m</span></span>
            </div>
          )}

          {/* Schnellpositionen */}
          {hasDims && (
            <div className="flex flex-wrap gap-1.5">
              {schnellpos.map(sp => {
                const [l, w, h, c] = spValues(sp)
                const isStkButton = sp.calc === 'stk'
                return (
                  <button key={sp.label}
                    onClick={() => addPosition(sp.desc, sp.unit, l, w, h, c)}
                    disabled={!isStkButton && isAdded(sp)}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors disabled:opacity-30 ${
                      isStkButton
                        ? 'bg-slate-700/60 text-slate-300 hover:bg-slate-600/60 border border-slate-600/30'
                        : 'bg-blue-600/20 text-blue-300 hover:bg-blue-600/40 border border-blue-600/30'
                    }`}>
                    + {sp.label}
                  </button>
                )
              })}
            </div>
          )}

          {/* Positions list */}
          {positions.length > 0 && (
            <div className="space-y-1">
              {positions.map((item, idx) => (
                <div key={item.id}>
                  <div className="flex items-center gap-2 px-2 py-1.5 bg-slate-800/60 rounded text-sm">
                    <span className="flex-1 text-white truncate">{item.description || '—'}</span>
                    <span className="text-slate-400 text-xs font-mono">{item.calculation}</span>
                    <span className="text-white font-mono text-xs font-semibold min-w-[60px] text-right">
                      {formatNum(item.result)} {['Wand', 'Bogen', 'Trap'].includes(item.unit) ? 'm²' : item.unit}
                    </span>
                    <button onClick={() => removePosition(idx)} className="text-red-400/40 hover:text-red-400 text-xs">✕</button>
                  </div>
                  {/* Bodenfläche: Öffnungen inline for bodenbelag */}
                  {item.unit === 'm²' && gewerk === 'bodenbelag' && (
                    <div className="ml-2 mt-1 mb-1">
                      <div className="border border-slate-600/50 rounded-lg overflow-hidden">
                        <div className="flex items-center gap-2 px-2.5 py-1.5 bg-red-900/10 cursor-pointer" onClick={() => {
                          setOpeningsOpen(o => !o)
                          if (!openingsOpen && openings.length === 0) addOpening()
                        }}>
                          <span className="text-xs font-medium text-red-300/80 flex-1">🔲 Aussparungen {openings.length > 0 && `(${openings.length})`}</span>
                          {totalAbzug > 0 && <span className="text-red-300/60 text-xs font-mono">− {formatNum(totalAbzug)} m²</span>}
                          <span className="text-slate-500 text-xs">{openingsOpen ? '▲' : '▼'}</span>
                        </div>
                        {openingsOpen && (
                          <div className="p-2 space-y-1.5">
                            {openings.map((op, idx) => {
                              const totalArea = op.result || 0
                              const cnt2 = parseFloat(op.count) || 1
                              const singleArea2 = cnt2 > 0 ? totalArea / cnt2 : totalArea
                              const isUebermessen2 = vobMax > 0 && singleArea2 > 0 && singleArea2 < vobMax
                              return (
                                <div key={op.id} className="text-xs space-y-1">
                                  <div className="flex items-center gap-1">
                                    <input type="text" value={op.description} onChange={e => updateOpening(idx, 'description', e.target.value)}
                                      placeholder="oder eingeben..." className="flex-1 bg-slate-800 border border-slate-600 rounded px-1.5 py-1 text-white min-w-0"
                                      style={validated && !op.description?.trim() ? { outline: '2px solid #ef4444', outlineOffset: '-1px' } : undefined} />
                                    <button onClick={() => removeOpening(idx)} className="text-red-600 hover:text-red-500 shrink-0 text-sm font-bold">✕</button>
                                  </div>
                                  {!op.description && (
                                    <div className="flex gap-1 flex-wrap">
                                      {['Säule', 'Kamin', 'Rundpfeiler', 'Sonstiges'].map(t => (
                                        <button key={t} onClick={() => updateOpening(idx, 'description', t)}
                                          className="px-2 py-0.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-xs transition-colors">{t}</button>
                                      ))}
                                    </div>
                                  )}
                                  <div className="flex items-center gap-1.5">
                                    {op.description?.toLowerCase().includes('rund') ? (
                                      <>
                                        <span className="text-slate-400">⌀</span>
                                        <input type="number" step="0.01" value={op.length || ''} onChange={e => updateOpening(idx, 'length', e.target.value)}
                                          className="w-14 bg-slate-800 border border-slate-600 rounded px-1.5 py-1 text-white text-center" placeholder="0"
                                          style={validated && !parseFloat(op.length) ? { outline: '2px solid #ef4444', outlineOffset: '-1px' } : undefined} />
                                      </>
                                    ) : (
                                      <>
                                        <span className="text-slate-400">B</span>
                                        <input type="number" step="0.01" value={op.length || ''} onChange={e => updateOpening(idx, 'length', e.target.value)}
                                          className="w-14 bg-slate-800 border border-slate-600 rounded px-1.5 py-1 text-white text-center" placeholder="0"
                                          style={validated && !parseFloat(op.length) ? { outline: '2px solid #ef4444', outlineOffset: '-1px' } : undefined} />
                                        <span className="text-slate-400">×H</span>
                                        <input type="number" step="0.01" value={op.width || ''} onChange={e => updateOpening(idx, 'width', e.target.value)}
                                          className="w-14 bg-slate-800 border border-slate-600 rounded px-1.5 py-1 text-white text-center" placeholder="0"
                                          style={validated && !parseFloat(op.width) ? { outline: '2px solid #ef4444', outlineOffset: '-1px' } : undefined} />
                                      </>
                                    )}
                                    <span className="text-slate-400">×</span>
                                    <input type="number" step="1" min="1" value={op.count || ''} onChange={e => updateOpening(idx, 'count', e.target.value)}
                                      className="w-10 bg-slate-800 border border-slate-600 rounded px-1 py-1 text-white text-center" placeholder="1" />
                                    <span className="font-mono text-white min-w-[50px] text-right">{formatNum(totalArea)} m²</span>
                                    {isUebermessen2 ? (
                                      <span className="text-green-400 text-[10px] min-w-[24px]" title="übermessen">✓</span>
                                    ) : totalArea > 0 ? (
                                      <span className="text-red-400 text-[10px] min-w-[24px]" title="abgezogen">−</span>
                                    ) : <span className="min-w-[24px]" />}
                                  </div>
                                </div>
                              )
                            })}
                            <button onClick={addOpening}
                              className="w-full py-1.5 border border-dashed border-red-400/30 text-red-300/60 hover:text-red-300 rounded text-xs transition-colors">
                              + Aussparung
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {/* Sockelleiste: Abzug */}
                  {item.unit === 'lfm' && (gewerk === 'bodenbelag' || gewerk === 'fliesen') && (
                    <div className="ml-2 mt-1 mb-1">
                      <div className="border border-slate-600/50 rounded-lg overflow-hidden">
                        <div className="flex items-center gap-2 px-2.5 py-1.5 bg-red-900/10 cursor-pointer" onClick={() => {
                          if (!item._abzugOpen && (!item.deductions || item.deductions.length === 0)) {
                            const newDeds = [{ width: '', count: '1' }]
                            const updated = { ...item, deductions: newDeds, _abzugOpen: true }
                            const newPos = [...positions]; newPos[idx] = updated; setItems(newPos, undefined)
                          } else {
                            const updated = { ...item, _abzugOpen: !item._abzugOpen }
                            const newPos = [...positions]; newPos[idx] = updated; setItems(newPos, undefined)
                          }
                        }}>
                          <span className="text-xs font-medium text-red-300/80 flex-1">📏 Abzüge {(item.deductions || []).length > 0 && `(${(item.deductions || []).length})`}</span>
                          <span className="text-slate-500 text-xs">{item._abzugOpen ? '▲' : '▼'}</span>
                        </div>
                        {item._abzugOpen && (
                          <div className="p-2 space-y-1">
                      {(item.deductions || []).map((ded, di) => (
                        <div key={di} className="flex items-center gap-1.5 text-xs">
                          <span className="text-red-400">−</span>
                          <span className="text-slate-400">Abzug</span>
                          <input type="number" step="0.01" value={ded.width || ''} placeholder="Breite"
                            onChange={e => {
                              const deds = [...(item.deductions || [])]
                              deds[di] = { ...deds[di], width: e.target.value }
                              const totalDed = deds.reduce((s, d) => s + ((parseFloat(d.width) || 0) * (parseInt(d.count) || 1)), 0)
                              const base = 2 * ((parseFloat(room.length) || 0) + (parseFloat(room.width) || 0))
                              const updated = { ...item, deductions: deds, result: Math.round((base - totalDed) * 100) / 100 }
                              const newPos = [...positions]; newPos[idx] = updated; setItems(newPos, undefined)
                            }}
                            className="w-14 bg-slate-800 border border-slate-600 rounded px-1.5 py-0.5 text-white text-center"
                            style={validated && !parseFloat(ded.width) ? { outline: '2px solid #ef4444', outlineOffset: '-1px' } : undefined} />
                          <span className="text-slate-400">m ×</span>
                          <input type="number" step="1" min="1" value={ded.count || ''} placeholder="1"
                            onChange={e => {
                              const deds = [...(item.deductions || [])]
                              deds[di] = { ...deds[di], count: e.target.value }
                              const totalDed = deds.reduce((s, d) => s + ((parseFloat(d.width) || 0) * (parseInt(d.count) || 1)), 0)
                              const base = 2 * ((parseFloat(room.length) || 0) + (parseFloat(room.width) || 0))
                              const updated = { ...item, deductions: deds, result: Math.round((base - totalDed) * 100) / 100 }
                              const newPos = [...positions]; newPos[idx] = updated; setItems(newPos, undefined)
                            }}
                            className="w-10 bg-slate-800 border border-slate-600 rounded px-1 py-0.5 text-white text-center"
                            style={validated && !parseInt(ded.count) ? { outline: '2px solid #ef4444', outlineOffset: '-1px' } : undefined} />
                          <span className="text-slate-500 font-mono">{formatNum((parseFloat(ded.width) || 0) * (parseInt(ded.count) || 1))} m</span>
                          <button onClick={() => {
                            const deds = (item.deductions || []).filter((_, i) => i !== di)
                            const totalDed = deds.reduce((s, d) => s + ((parseFloat(d.width) || 0) * (parseInt(d.count) || 1)), 0)
                            const base = 2 * ((parseFloat(room.length) || 0) + (parseFloat(room.width) || 0))
                            const updated = { ...item, deductions: deds, result: Math.round((base - totalDed) * 100) / 100 }
                            const newPos = [...positions]; newPos[idx] = updated; setItems(newPos, undefined)
                          }} className="text-red-400/40 hover:text-red-400">✕</button>
                        </div>
                      ))}
                      <button onClick={() => {
                        const deds = [...(item.deductions || []), { width: '', count: '1' }]
                        const updated = { ...item, deductions: deds }
                        const newPos = [...positions]; newPos[idx] = updated; setItems(newPos, undefined)
                      }} className="text-xs text-red-300/60 hover:text-red-300 transition-colors">
                        + Abzug (Tür, Schrank...)
                      </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Öffnungen — skip for bodenbelag (shown inline under Bodenfläche) */}
          {gewerk !== 'bodenbelag' && <div className="border border-slate-600/50 rounded-lg overflow-hidden">
            <div
              className="flex items-center gap-2 px-2.5 py-1.5 bg-red-900/10 cursor-pointer"
              onClick={() => setOpeningsOpen(o => !o)}
            >
              <span className="text-xs font-medium text-red-300/80 flex-1">
                🔲 Öffnungen {openings.length > 0 && `(${openings.length})`}
              </span>
              {totalAbzug > 0 && <span className="text-red-300/60 text-xs font-mono">− {formatNum(totalAbzug)} m²</span>}
              <span className="text-slate-500 text-xs">{openingsOpen ? '▲' : '▼'}</span>
            </div>
            {openingsOpen && (
              <div className="p-2 space-y-1.5">
                {openings.map((op, idx) => {
                  const totalArea = op.result || 0
                  const cnt = parseFloat(op.count) || 1
                  const singleArea = cnt > 0 ? totalArea / cnt : totalArea
                  const isUebermessen = vobMax > 0 && singleArea > 0 && singleArea < vobMax
                  return (
                    <div key={op.id} className="text-xs space-y-1">
                      <div className="flex items-center gap-1">
                        <input type="text" value={op.description} onChange={e => updateOpening(idx, 'description', e.target.value)}
                          placeholder="oder eingeben..." className="flex-1 bg-slate-800 border border-slate-600 rounded px-1.5 py-1 text-white min-w-0"
                          style={validated && !op.description?.trim() ? { outline: '2px solid #ef4444', outlineOffset: '-1px' } : undefined} />
                        <button onClick={() => removeOpening(idx)} className="text-red-600 hover:text-red-500 shrink-0 text-sm font-bold">✕</button>
                      </div>
                      {!op.description && (
                        <div className="flex gap-1 flex-wrap">
                          {(gewerk === 'bodenbelag'
                            ? ['Säule', 'Kamin', 'Rundpfeiler', 'Sonstiges']
                            : gewerk === 'fliesen'
                            ? ['Fenster', 'Tür', 'Säule', 'Kamin', 'Rundpfeiler']
                            : ['Fenster', 'Tür', 'Balkontür', 'Dachfenster']
                          ).map(t => (
                            <button key={t} onClick={() => updateOpening(idx, 'description', t)}
                              className="px-2 py-0.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-xs transition-colors">{t}</button>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        {op.description?.toLowerCase().includes('rund') ? (
                          <>
                            <span className="text-slate-400">⌀</span>
                            <input type="number" step="0.01" value={op.length || ''} onChange={e => updateOpening(idx, 'length', e.target.value)}
                              className="w-14 bg-slate-800 border border-slate-600 rounded px-1.5 py-1 text-white text-center" placeholder="0"
                              style={validated && !parseFloat(op.length) ? { outline: '2px solid #ef4444', outlineOffset: '-1px' } : undefined} />
                          </>
                        ) : (
                          <>
                            <span className="text-slate-400">B</span>
                            <input type="number" step="0.01" value={op.length || ''} onChange={e => updateOpening(idx, 'length', e.target.value)}
                              className="w-14 bg-slate-800 border border-slate-600 rounded px-1.5 py-1 text-white text-center" placeholder="0"
                              style={validated && !parseFloat(op.length) ? { outline: '2px solid #ef4444', outlineOffset: '-1px' } : undefined} />
                            <span className="text-slate-400">×H</span>
                            <input type="number" step="0.01" value={op.width || ''} onChange={e => updateOpening(idx, 'width', e.target.value)}
                              className="w-14 bg-slate-800 border border-slate-600 rounded px-1.5 py-1 text-white text-center" placeholder="0"
                              style={validated && !parseFloat(op.width) ? { outline: '2px solid #ef4444', outlineOffset: '-1px' } : undefined} />
                          </>
                        )}
                        <span className="text-slate-400">×</span>
                        <input type="number" step="1" min="1" value={op.count || ''} onChange={e => updateOpening(idx, 'count', e.target.value)}
                          className="w-10 bg-slate-800 border border-slate-600 rounded px-1 py-1 text-white text-center" placeholder="1" />
                        <span className="font-mono text-white min-w-[50px] text-right">{formatNum(totalArea)} m²</span>
                      {isUebermessen ? (
                        <span className="text-green-400 text-[10px] min-w-[24px]" title={`${formatNum(singleArea)} m² < ${vobMax} m² — übermessen`}>✓</span>
                      ) : totalArea > 0 ? (
                        <span className="text-red-400 text-[10px] min-w-[24px]" title={`≥ ${vobMax} m² — abgezogen`}>−</span>
                      ) : <span className="min-w-[24px]" />}
                      </div>
                    </div>
                  )
                })}
                <button onClick={addOpening}
                  className="w-full py-1.5 border border-dashed border-red-400/30 text-red-300/60 hover:text-red-300 rounded text-xs transition-colors">
                  + Öffnung
                </button>
                {vobMax > 0 && gw.din && (
                  <p className="text-[10px] text-slate-500 mt-1">
                    VOB/C DIN {gw.din}: Öffnungen {vobWand && vobBoden && vobWand !== vobBoden
                      ? `Wand < ${vobWand} m², Boden < ${vobBoden} m²`
                      : `< ${vobMax} m²`
                    } übermessen (✓ = kein Abzug)
                  </p>
                )}
              </div>
            )}
          </div>}

          {/* Netto summary */}
          {bruttoM2 > 0 && (
            <div className="flex justify-between items-center px-2 py-1.5 bg-slate-800/40 rounded text-xs">
              <span className="text-slate-400">Netto:</span>
              <span className="text-white font-mono font-semibold">{formatNum(nettoM2)} m²</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Room section ─────────────────────────────────────────────────────────────
function RoomSection({ room, onChange, onRemove }) {
  const [open, setOpen] = useState(true)
  const regularItems = room.items.filter(i => !i.subtract && !i.isForm)
  const openings = room.items.filter(i => i.subtract)
  const forms = room.items.filter(i => i.isForm && !i.subtract)

  const updateRegularItem = (idx, newItem) => {
    const updated = [...regularItems]; updated[idx] = newItem
    onChange({ ...room, items: [...updated, ...forms, ...openings] })
  }
  const removeRegularItem = (idx) => {
    onChange({ ...room, items: [...regularItems.filter((_, i) => i !== idx), ...forms, ...openings] })
  }
  const addItem = () => {
    const newItem = { id: newId(), description: '', unit: 'm²', dim_unit: 'm', length: '', width: '', height: '', count: '', result: 0, calculation: '', subtract: false }
    onChange({ ...room, items: [...regularItems, newItem, ...forms, ...openings] })
  }
  const updateOpenings = (newOpenings) => {
    onChange({ ...room, items: [...regularItems, ...forms, ...newOpenings] })
  }
  const updateForms = (newForms) => {
    onChange({ ...room, items: [...regularItems, ...newForms, ...openings] })
  }

  // baseM2 = only regular items (before forms)
  const baseM2 = regularItems.reduce((s, i) => {
    const u = (i.unit === 'Wand' || i.unit === 'Bogen' || i.unit === 'Trap') ? 'm²' : i.unit
    return u === 'm²' ? s + (i.result || 0) : s
  }, 0)
  // brutto m² = regular items + forms (passed to Öffnungen as gross area)
  const bruttoM2 = baseM2 + forms.reduce((s, i) => s + (i.result || 0), 0)

  // Only show Öffnungen section if room has area-type items or already has openings/forms
  const hasAreaItems = regularItems.some(i => ['m²', 'Wand', 'Bogen', 'Trap'].includes(i.unit))

  // netto m² for collapsed summary
  const totalAbzug = openings.reduce((s, i) => s + (i.result || 0), 0)
  const nettoM2 = bruttoM2 - totalAbzug

  return (
    <div className="rounded-lg overflow-hidden">
      {/* Room header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-700/40 rounded-t-lg">
        {open ? (
          <div className="flex items-center flex-1 border border-slate-600/25 rounded bereich-name-input" onClick={e => e.stopPropagation()}>
            <svg className="w-3 h-3 ml-2 mr-1 text-slate-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            <input
              type="text"
              value={room.name}
              onChange={e => onChange({ ...room, name: e.target.value })}
              placeholder="Bereichsname"
              className="flex-1 bg-transparent py-0.5 pr-2 text-white text-sm focus:outline-none placeholder-slate-400 min-w-0 shape-row-input"
              onClick={e => e.stopPropagation()}
            />
          </div>
        ) : (
          <span className="flex-1 text-white text-sm font-medium truncate">
            {room.name || <span className="text-slate-500">Bereichsname</span>}
            {nettoM2 > 0 && <span className="text-slate-400 text-xs font-mono ml-2">{formatNum(nettoM2)} m²</span>}
          </span>
        )}
        <button
          onClick={() => setOpen(o => !o)}
          className="text-slate-400 hover:text-slate-200 text-xs px-1 shrink-0"
        >{open ? '▲' : '▼'}</button>
        <button onClick={onRemove} className="text-slate-500 hover:text-red-400 text-lg leading-none px-1 shrink-0">×</button>
      </div>

      {/* Items */}
      {open && (
        <div className="p-3 space-y-2 bg-slate-800/30">
          {regularItems.map((item, idx) => (
            <ItemRow
              key={item.id}
              item={item}
              onChange={newItem => updateRegularItem(idx, newItem)}
              onRemove={() => removeRegularItem(idx)}
            />
          ))}
          <button
            onClick={addItem}
            className="w-full py-2 border border-dashed border-slate-600 hover:border-blue-500 text-slate-400 hover:text-blue-400 text-sm rounded-lg transition-colors"
          >
            + Position hinzufügen
          </button>
          {(hasAreaItems || forms.length > 0) && (
            <FormenSection forms={forms} onChange={updateForms} baseM2={baseM2} />
          )}
          {(hasAreaItems || forms.length > 0 || openings.length > 0) && (
            <ÖffnungenSection
              openings={openings}
              onChange={updateOpenings}
              bruttoM2={bruttoM2}
            />
          )}
        </div>
      )}
    </div>
  )
}

// ─── Signature modal ──────────────────────────────────────────────────────────
function SignatureModal({ onConfirm, onClose, existingDataUrl }) {
  const canvasRef = useRef(null)
  const isDrawingRef = useRef(false)
  const lastPosRef = useRef({ x: 0, y: 0 })
  const hasDrawnRef = useRef(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      ctx.strokeStyle = '#1e293b'
      ctx.lineWidth = 3
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      hasDrawnRef.current = false
      if (existingDataUrl) {
        const img = new Image()
        img.onload = () => { ctx.drawImage(img, 0, 0, canvas.width, canvas.height); hasDrawnRef.current = true }
        img.src = existingDataUrl
      }
    }, 50)
    return () => clearTimeout(timer)
  }, [existingDataUrl])

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if (e.touches) return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY }
  }
  const startDraw = (e) => { e.preventDefault(); isDrawingRef.current = true; lastPosRef.current = getPos(e, canvasRef.current) }
  const draw = (e) => {
    e.preventDefault()
    if (!isDrawingRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const pos = getPos(e, canvas)
    ctx.beginPath(); ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y); ctx.lineTo(pos.x, pos.y); ctx.stroke()
    lastPosRef.current = pos
    hasDrawnRef.current = true
  }
  const endDraw = (e) => { e?.preventDefault(); isDrawingRef.current = false }

  const clear = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
    hasDrawnRef.current = false
  }

  const confirm = () => {
    const canvas = canvasRef.current
    if (!canvas || !hasDrawnRef.current) { onConfirm(null, null); onClose(); return }
    // Rotate CCW 90° for portrait PDF
    const rotated = document.createElement('canvas')
    rotated.width = canvas.height
    rotated.height = canvas.width
    const rctx = rotated.getContext('2d')
    rctx.translate(0, canvas.width)
    rctx.rotate(-Math.PI / 2)
    rctx.drawImage(canvas, 0, 0)
    onConfirm(rotated.toDataURL('image/png'), canvas.toDataURL('image/png'))
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[60] bg-white flex flex-col" style={{ touchAction: 'none' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-100 border-b border-slate-200 shrink-0">
        <span className="text-slate-800 font-semibold text-sm">✍️ Unterschrift</span>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-500 hover:text-slate-800 text-2xl leading-none w-8 h-8 flex items-center justify-center"
        >
          ×
        </button>
      </div>

      {/* Hint */}
      <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 shrink-0">
        <p className="text-blue-600 text-xs text-center">
          Hier unterschreiben &nbsp;·&nbsp; Gerät quer halten für mehr Platz
        </p>
      </div>

      {/* Buttons left + canvas right */}
      <div className="flex-1 flex flex-row min-h-0 overflow-hidden p-3 gap-3">
        <div className="flex flex-col gap-3 justify-center shrink-0" style={{ width: 64 }}>
          <button
            type="button"
            onClick={clear}
            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium text-sm transition-colors"
            style={{ writingMode: 'vertical-lr', minHeight: 80 }}
          >
            <span style={{ display: 'inline-block', transform: 'rotate(90deg)' }}>🗑</span> Löschen
          </button>
          <button
            type="button"
            onClick={confirm}
            className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-sm transition-colors"
            style={{ writingMode: 'vertical-lr', minHeight: 120 }}
          >
            <span style={{ display: 'inline-block', transform: 'rotate(90deg)' }}>✅</span> Bestätigen
          </button>
        </div>

        <canvas
          ref={canvasRef}
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
          onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
          onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw}
        />
      </div>
    </div>
  )
}

// ─── Editor modal ─────────────────────────────────────────────────────────────
function EditorModal({ aufmass, majstor, token, onSave, onClose }) {
  const router = useRouter()
  const isNew = !aufmass?.id

  const [form, setForm] = useState({
    title: aufmass?.title || '',
    customer_name: aufmass?.customer_name || '',
    date: aufmass?.date || new Date().toISOString().split('T')[0],
    rooms: aufmass?.rooms || [],
    notes: aufmass?.notes || '',
    materials: aufmass?.materials || [],
    gewerk: aufmass?.gewerk || 'fensterbau',
  })
  const [signature, setSignature] = useState(aufmass?.signature || null)
  const [bereicheOpen, setBereicheOpen] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [validated, setValidated] = useState(false)

  // Customer autocomplete
  const [customerId, setCustomerId] = useState(aufmass?.customer_id || null)
  const [customerSuggestions, setCustomerSuggestions] = useState([])
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const customerTimeout = useRef(null)


  const searchCustomers = async (term) => {
    if (!term || term.length < 2 || !majstor?.id) { setCustomerSuggestions([]); return }
    const { data } = await supabase
      .from('customers')
      .select('id, name, email, street, postal_code, city')
      .eq('majstor_id', majstor.id)
      .ilike('name', `%${term}%`)
      .limit(5)
    setCustomerSuggestions(data || [])
    setShowCustomerDropdown((data || []).length > 0)
  }

  const handleCustomerNameChange = (val) => {
    setForm(f => ({ ...f, customer_name: val }))
    setCustomerId(null) // Reset selection on manual typing
    clearTimeout(customerTimeout.current)
    customerTimeout.current = setTimeout(() => searchCustomers(val), 300)
  }

  const selectCustomer = (c) => {
    setForm(f => ({ ...f, customer_name: c.name }))
    setCustomerId(c.id)
    setShowCustomerDropdown(false)
    setCustomerSuggestions([])
  }

  const addRoom = () => setForm(f => ({
    ...f,
    rooms: [...f.rooms, { id: newId(), name: '', items: [] }]
  }))

  const updateRoom = (idx, room) => setForm(f => {
    const rooms = [...f.rooms]; rooms[idx] = room; return { ...f, rooms }
  })

  const removeRoom = (idx) => setForm(f => ({ ...f, rooms: f.rooms.filter((_, i) => i !== idx) }))

  const totals = computeTotals(form.rooms, form.gewerk)
  const totalEntries = Object.entries(totals).filter(([, v]) => v > 0)

  const validateForm = () => {
    setValidated(true)
    if (!form.title.trim()) { setError('Bitte Titel eingeben'); return false }
    if (form.gewerk === 'fensterbau') {
      for (let i = 0; i < form.rooms.length; i++) {
        const pos = form.rooms[i]
        const posLabel = `Pos. ${i + 1}`
        if (pos.preset === 'mehrteilig') {
          for (let si = 0; si < (pos.segments || []).length; si++) {
            const seg = pos.segments[si]
            const segLabel = `${posLabel} Segment ${String.fromCharCode(65 + si)}`
            if (!parseFloat(seg.width)) { setError(`${segLabel}: Bitte Breite eingeben`); return false }
            if (!parseFloat(seg.height)) { setError(`${segLabel}: Bitte Höhe eingeben`); return false }
            if (seg.panels.length > 1 && seg.panels.some(p => !parseFloat(p.width))) {
              setError(`${segLabel}: Bitte alle Flügelbreiten eingeben`); return false
            }
            if (seg.oberlicht && !parseFloat(seg.oberlichtHeight)) {
              setError(`${segLabel}: Bitte Oberlicht-Höhe eingeben`); return false
            }
            if (seg.unterlicht && !parseFloat(seg.unterlichtHeight)) {
              setError(`${segLabel}: Bitte Unterlicht-Höhe eingeben`); return false
            }
          }
          continue
        }
        if (!parseFloat(pos.width)) { setError(`${posLabel}: Bitte Breite eingeben`); return false }
        if (!parseFloat(pos.height)) { setError(`${posLabel}: Bitte Höhe eingeben`); return false }
        if (pos.panels.length > 1 && pos.panels.some(p => !parseFloat(p.width))) {
          setError(`${posLabel}: Bitte alle Flügelbreiten eingeben`); return false
        }
        if (pos.oberlicht && !parseFloat(pos.oberlichtHeight)) {
          setError(`${posLabel}: Bitte Oberlicht-Höhe eingeben`); return false
        }
        if (pos.unterlicht && !parseFloat(pos.unterlichtHeight)) {
          setError(`${posLabel}: Bitte Unterlicht-Höhe eingeben`); return false
        }
      }
    } else {
      // Non-Fensterbau: validate rooms have dimensions and at least one position
      for (let i = 0; i < form.rooms.length; i++) {
        const room = form.rooms[i]
        const roomLabel = room.name || `Raum ${i + 1}`
        if (!room.name?.trim()) { setError(`${roomLabel}: Bitte Raumname eingeben`); return false }
        if (!parseFloat(room.length)) { setError(`${roomLabel}: Bitte Länge (L) eingeben`); return false }
        if (!parseFloat(room.width)) { setError(`${roomLabel}: Bitte Breite (B) eingeben`); return false }
        if (form.gewerk !== 'bodenbelag' && !parseFloat(room.height)) { setError(`${roomLabel}: Bitte Höhe (H) eingeben`); return false }
        const positions = (room.items || []).filter(item => !item.subtract)
        if (positions.length === 0) { setError(`${roomLabel}: Bitte mindestens eine Position hinzufügen (Wände, Decke, Sockelleiste...)`); return false }
        // Validate Öffnungen dimensions
        const openings = (room.items || []).filter(item => item.subtract)
        for (let j = 0; j < openings.length; j++) {
          const op = openings[j]
          const opLabel = op.description || `Öffnung ${j + 1}`
          if (!op.description?.trim()) { setError(`${roomLabel} → ${opLabel}: Bitte Bezeichnung eingeben`); return false }
          const isRound = op.description?.toLowerCase().includes('rund')
          if (!parseFloat(op.length)) { setError(`${roomLabel} → ${opLabel}: Bitte ${isRound ? 'Durchmesser (⌀)' : 'Breite (B)'} eingeben`); return false }
          if (!isRound && !parseFloat(op.width)) { setError(`${roomLabel} → ${opLabel}: Bitte Höhe (H) eingeben`); return false }
        }
        // Validate Sockelleiste deductions
        const lfmPositions = (room.items || []).filter(item => !item.subtract && item.unit === 'lfm')
        for (const pos of lfmPositions) {
          for (let di = 0; di < (pos.deductions || []).length; di++) {
            const ded = pos.deductions[di]
            if (!parseFloat(ded.width)) { setError(`${roomLabel} → Abzug ${di + 1}: Bitte Breite eingeben`); return false }
            if (!parseInt(ded.count)) { setError(`${roomLabel} → Abzug ${di + 1}: Bitte Anzahl eingeben`); return false }
          }
        }
      }
    }
    return true
  }

  const save = async () => {
    if (!validateForm()) return null
    setSaving(true); setError('')
    try {
      const method = isNew ? 'POST' : 'PATCH'
      const body = isNew ? form : { id: aufmass.id, ...form }
      const res = await fetch('/api/aufmasse', {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onSave(data.aufmass)
      return data.aufmass
    } catch (e) {
      setError(e.message)
      return null
    } finally {
      setSaving(false)
    }
  }

  const downloadPDF = async () => {
    if (!validateForm()) return
    await generateAufmassPDF(form, majstor, signature)
  }

  const transferTo = async (docType) => {
    if (!validateForm()) return
    const saved = await save()
    if (!saved) return
    const flatItems = []

    if (form.gewerk === 'fensterbau') {
      // Fensterbau: each position = one invoice item
      for (const pos of form.rooms) {
        if (pos.preset === 'mehrteilig' && pos.segments?.length > 0) {
          // Mehrteilig: describe all segments
          const segDescs = pos.segments.map((seg, i) => {
            const letter = String.fromCharCode(65 + i)
            const typLabels = (seg.panels || []).map(p =>
              p.type === 'kipp-dreh' ? 'Dreh-Kipp' : p.type === 'dreh' ? 'Dreh' : p.type === 'kipp' ? 'Kipp' : 'Fest'
            )
            let typStr = typLabels.join('+')
            if (seg.oberlicht) typStr += '+OL'
            if (seg.unterlicht) typStr += '+UL'
            return `${letter}: ${seg.width || '?'}×${seg.height || '?'} (${typStr})`
          })
          const totalW = pos.segments.reduce((s, seg) => s + (parseFloat(seg.width) || 0), 0)
          const maxH = Math.max(...pos.segments.map(seg => parseFloat(seg.height) || 0))
          const parts = [
            pos.material,
            `Mehrteilig ${totalW}×${maxH} mm`,
            segDescs.join(', '),
            pos.glazing,
            pos.color,
          ].filter(v => v && v !== '__custom__')
          flatItems.push({
            description: parts.join(', '),
            quantity: parseInt(pos.count) || 1,
            unit: 'Stk',
            unit_price: 0,
            total_price: 0,
          })
        } else {
          const panels = pos.panels || []
          const typLabels = panels.map(p =>
            p.type === 'kipp-dreh' ? 'Dreh-Kipp' : p.type === 'dreh' ? 'Dreh' : p.type === 'kipp' ? 'Kipp' : 'Fest'
          )
          const typStr = typLabels.join(' + ') + (pos.oberlicht ? ' + Oberlicht' : '')
          const parts = [
            pos.material,
            typStr,
            pos.width && pos.height ? `${pos.width} × ${pos.height} mm` : null,
            pos.glazing,
            pos.color,
          ].filter(v => v && v !== '__custom__')
          flatItems.push({
            description: parts.join(', '),
            quantity: parseInt(pos.count) || 1,
            unit: 'Stk',
            unit_price: 0,
            total_price: 0,
          })
        }
      }
    } else {
      // Room-based: each position = separate invoice item
      const gwData = GEWERKE.find(g => g.id === form.gewerk) || {}
      const hasWallPos = ['maler', 'fliesen', 'trockenbau'].includes(form.gewerk)
      const vobThr = hasWallPos ? (gwData.vobWand || 0) : (gwData.vobBoden || 0)
      for (const room of form.rooms) {
        // Compute total deduction for m² (respecting Übermessung)
        const openings = (room.items || []).filter(i => i.subtract)
        let totalAbzugM2 = 0
        for (const op of openings) {
          const total = op.result || 0
          const cnt = parseFloat(op.count) || 1
          const singleArea = cnt > 0 ? total / cnt : total
          if (vobThr > 0 && singleArea < vobThr) continue // übermessen
          totalAbzugM2 += total
        }

        // Each non-subtract position → separate invoice item
        const positions = (room.items || []).filter(i => !i.subtract && !i.isForm)
        for (const item of positions) {
          if (!item.result || item.result <= 0) continue
          const rawU = item.unit || ''
          const u = ['Wand', 'Bogen', 'Trap'].includes(rawU) ? 'm²' : rawU
          let qty = item.result
          // Subtract openings from first m² position (Wand or Bodenfläche)
          if ((rawU === 'Wand' || u === 'm²') && totalAbzugM2 > 0) {
            qty = Math.max(0, qty - totalAbzugM2)
            totalAbzugM2 = 0 // only subtract from first m² position
          }
          if (qty <= 0) continue
          flatItems.push({
            description: [room.name, item.description].filter(v => v && v !== '__custom__').join(': '),
            quantity: Math.round(qty * 100) / 100,
            unit: u,
            unit_price: 0,
            total_price: 0,
          })
        }
      }
    }

    // Materials (shared for all gewerke)
    for (const mat of (form.materials || [])) {
      if (!mat.description) continue
      flatItems.push({
        description: mat.description,
        quantity: parseFloat(mat.quantity) || 1,
        unit: mat.unit || 'Stk',
        unit_price: 0,
        total_price: 0,
      })
    }
    // For non-Fensterbau: ask if user wants to attach Aufmaß PDF
    const attachPdf = form.gewerk !== 'fensterbau' && window.confirm('Aufmaß als Anlage anhängen?')
    sessionStorage.setItem('prm_aufmass_import', JSON.stringify({
      title: form.title,
      items: flatItems,
      aufmass_id: saved.id || aufmass?.id || null,
      gewerk: form.gewerk,
      docType,
      attachAufmass: attachPdf,
      customer_name: form.customer_name || null,
      customer_id: customerId || null,
    }))
    router.push('/dashboard/invoices?from=aufmass')
  }



  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center overflow-y-auto py-4 px-4">
        <div className="w-full max-w-2xl bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
            <h2 className="text-white font-bold text-lg">
              {isNew ? '📐 Neues Aufmaß' : '📐 Aufmaß bearbeiten'}
            </h2>
            <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl leading-none">×</button>
          </div>


          <div className="p-5 space-y-4">
            {/* Meta */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs text-slate-400 mb-1">Titel *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="z.B. Renovierung Musterstr. 5"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={validated && !form.title.trim() ? { outline: '2px solid #ef4444', outlineOffset: '-1px' } : undefined}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Datum</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="relative">
              <label className="block text-xs text-slate-400 mb-1">Kundenname</label>
              <input
                type="text"
                value={form.customer_name}
                onChange={e => handleCustomerNameChange(e.target.value)}
                onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
                onFocus={() => { if (customerSuggestions.length > 0) setShowCustomerDropdown(true) }}
                placeholder="Optional..."
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {showCustomerDropdown && customerSuggestions.length > 0 && (
                <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-600 rounded-lg overflow-hidden shadow-xl">
                  {customerSuggestions.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onMouseDown={() => selectCustomer(c)}
                      className="w-full text-left px-3 py-2 hover:bg-slate-700 transition-colors"
                    >
                      <p className="text-white text-sm">{c.name}</p>
                      {c.city && <p className="text-slate-400 text-xs">{c.street ? `${c.street}, ` : ''}{c.city}</p>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Gewerk */}
            <div>
              <label className="block text-xs text-slate-400 mb-1">Gewerk</label>
              <div className="flex flex-wrap gap-1.5">
                {GEWERKE.map(g => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => {
                      if (g.id === form.gewerk) return
                      const hasWork = form.rooms?.some(r => r.name || parseFloat(r.length) || parseFloat(r.width) || parseFloat(r.height) || r.items?.length > 0)
                      if (hasWork && !confirm('Gewerk ändern? Alle bisherigen Eingaben werden gelöscht.')) return
                      setForm(f => ({ ...f, gewerk: g.id, rooms: [] }))
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      form.gewerk === g.id
                        ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {g.icon} {g.label}
                  </button>
                ))}
              </div>
              {(() => {
                const g = GEWERKE.find(x => x.id === form.gewerk)
                if (!g?.din) return null
                const parts = []
                if (g.vobWand) parts.push(`Wand ≤ ${g.vobWand} m²`)
                if (g.vobBoden) parts.push(`Boden ≤ ${g.vobBoden} m²`)
                return parts.length > 0 ? (
                  <p className="text-xs text-slate-500 mt-1">
                    VOB/C DIN {g.din}: Öffnungen übermessen — {parts.join(', ')}
                  </p>
                ) : null
              })()}
            </div>

            {/* Trade-specific editors */}
            {form.gewerk === 'fensterbau' ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-white text-sm font-semibold">🪟 Positionen</span>
                  <span className="text-slate-400 text-xs">({form.rooms.length})</span>
                </div>
                {form.rooms.map((pos, idx) => (
                  <FensterPositionCard
                    key={pos.id}
                    pos={pos}
                    index={idx}
                    onChange={p => updateRoom(idx, p)}
                    onRemove={() => removeRoom(idx)}
                    validated={validated}
                  />
                ))}
                <button
                  onClick={() => setForm(f => ({ ...f, rooms: [...f.rooms, newFensterPosition()] }))}
                  className="w-full py-3 border-2 border-dashed border-slate-600 hover:border-blue-500 text-slate-400 hover:text-blue-400 rounded-xl text-sm font-medium transition-colors"
                >
                  + Position hinzufügen
                </button>
              </div>
            ) : TRADE_SCHNELLPOS[form.gewerk] ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-white text-sm font-semibold">{GEWERKE.find(g => g.id === form.gewerk)?.icon} Räume</span>
                  <span className="text-slate-400 text-xs">({form.rooms.length})</span>
                  {totalEntries.length > 0 && (
                    <span className="text-slate-400 text-xs font-mono ml-auto">
                      {totalEntries.map(([unit, val]) => `${formatNum(val)} ${unit === 'Wand' ? 'm²' : unit}`).join(' · ')}
                    </span>
                  )}
                </div>
                {form.rooms.map((room, idx) => (
                  <TradeRaumCard
                    key={room.id}
                    room={room}
                    onChange={r => updateRoom(idx, r)}
                    onRemove={() => removeRoom(idx)}
                    gewerk={form.gewerk}
                    validated={validated}
                  />
                ))}
                <button
                  onClick={addRoom}
                  className="w-full py-3 border-2 border-dashed border-slate-600 hover:border-blue-500 text-slate-400 hover:text-blue-400 rounded-xl text-sm font-medium transition-colors"
                >
                  + Raum hinzufügen
                </button>
              </div>
            ) : (
              /* Fallback: generic Bereiche */
              <div className="border border-slate-600 rounded-xl overflow-hidden">
                <div
                  className="flex items-center gap-2 px-3 py-2 bg-slate-700/60 cursor-pointer"
                  onClick={() => setBereicheOpen(o => !o)}
                >
                  <span className="text-white text-sm font-semibold flex-1">📐 Bereiche <span className="text-slate-400 font-normal text-xs">({form.rooms.length})</span></span>
                  {totalEntries.length > 0 && (
                    <span className="text-slate-400 text-xs font-mono mr-2">
                      {totalEntries.map(([unit, val]) => `${formatNum(val)} ${unit === 'Wand' ? 'm²' : unit}`).join(' · ')}
                    </span>
                  )}
                  <span className="text-slate-400 text-xs">{bereicheOpen ? '▲' : '▼'}</span>
                </div>
                {bereicheOpen && <div className="p-3 space-y-0">
                {form.rooms.map((room, idx) => (
                  <div key={room.id}>
                    {idx > 0 && <div className="border-t border-slate-600/50 my-3" />}
                    <RoomSection
                      room={room}
                      onChange={r => updateRoom(idx, r)}
                      onRemove={() => removeRoom(idx)}
                    />
                  </div>
                ))}
                {form.rooms.length > 0 && <div className="border-t border-slate-600/50 mt-3 mb-1" />}
                <button
                  onClick={addRoom}
                  className="w-full py-3 border-2 border-dashed border-slate-600 hover:border-blue-500 text-slate-400 hover:text-blue-400 rounded-xl text-sm font-medium transition-colors mt-2"
                >
                  + Bereich hinzufügen
                </button>
                </div>}
              </div>
            )}


            {/* Materialien */}
            <MaterialienSection
              materials={form.materials}
              onChange={m => setForm(f => ({ ...f, materials: m }))}
            />

            {/* Notizen */}
            <div>
              <label className="block text-xs text-slate-400 mb-1">Notizen</label>
              <textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Optionale Anmerkungen..."
                rows={3}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {/* Unterschrift — nur Anzeige wenn vorhanden (signiert wird aus der Liste) */}
            {signature && (
              <div>
                <label className="block text-xs text-slate-400 mb-2">Unterschrift</label>
                <img
                  src={signature}
                  alt="Unterschrift"
                  className="w-full h-20 object-contain rounded-lg border border-slate-400"
                  style={{ backgroundColor: '#ffffff' }}
                />
              </div>
            )}

            {error && (
              <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">{error}</p>
            )}
          </div>

          {/* Actions */}
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 px-5 py-4 pb-20 border-t border-slate-700">
            <button
              onClick={save}
              disabled={saving}
              className="py-2.5 disabled:opacity-50 font-semibold rounded-lg text-xs sm:text-sm transition-colors flex flex-col items-center"
              style={{ backgroundColor: '#2563eb', color: '#ffffff' }}
            >
              {saving ? '...' : <><span>💾</span><span>Speichern</span></>}
            </button>
            <button
              onClick={() => transferTo('quote')}
              className="py-2.5 font-semibold rounded-lg text-xs sm:text-sm transition-colors flex flex-col items-center"
              style={{ backgroundColor: '#15803d', color: '#ffffff' }}
            >
              <span>📋</span><span className="leading-tight text-center">In<br className="sm:hidden" /> Angebot</span>
            </button>
            <button
              onClick={() => transferTo('invoice')}
              className="py-2.5 font-semibold rounded-lg text-xs sm:text-sm transition-colors flex flex-col items-center"
              style={{ backgroundColor: '#c2410c', color: '#ffffff' }}
            >
              <span>🧾</span><span className="leading-tight text-center">In<br className="sm:hidden" /> Rechnung</span>
            </button>
            <button
              onClick={downloadPDF}
              className="py-2.5 font-semibold rounded-lg text-xs sm:text-sm transition-colors flex flex-col items-center"
              style={{ backgroundColor: '#475569', color: '#ffffff' }}
            >
              <span>📄</span><span>PDF</span>
            </button>
            <button
              onClick={async () => {
                if (!form.title.trim()) { setError('Bitte Titel eingeben'); return }
                const blob = await generateAufmassPDFBlob(form, majstor, signature)
                const fileName = `Aufmass_${form.title.replace(/[^a-zA-Z0-9äöüÄÖÜß._-]/g, '_')}.pdf`
                const file = new File([blob], fileName, { type: 'application/pdf' })
                if (navigator.share && navigator.canShare?.({ files: [file] })) {
                  await navigator.share({ title: `Aufmaß: ${form.title}`, files: [file] })
                } else {
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url; a.download = fileName; a.click()
                  URL.revokeObjectURL(url)
                }
              }}
              className="py-2.5 font-semibold rounded-lg text-xs sm:text-sm transition-colors flex flex-col items-center"
              style={{ backgroundColor: '#7c3aed', color: '#ffffff' }}
            >
              <span>📤</span><span>Teilen</span>
            </button>
            <button
              onClick={onClose}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg text-sm transition-colors border border-slate-700"
            >
              ✕ Schließen
            </button>
          </div>
        </div>
      </div>


    </>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AufmassPage() {
  const router = useRouter()
  const [majstor, setMajstor] = useState(null)
  const [token, setToken] = useState(null)
  const [aufmasse, setAufmasse] = useState([])
  const [loading, setLoading] = useState(true)
  const [editor, setEditor] = useState(null) // null | 'new' | aufmass object
  const [deleting, setDeleting] = useState(null)
  const [sigTarget, setSigTarget] = useState(null) // aufmass object to sign

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) { router.push('/login'); return }
      setToken(session.access_token)
      supabase.from('majstors').select('*').eq('id', session.user.id).single()
        .then(({ data }) => setMajstor(data))
    })
  }, [router])

  const loadList = useCallback(async (t) => {
    if (!t) return
    setLoading(true)
    const res = await fetch('/api/aufmasse', { headers: { Authorization: `Bearer ${t}` } })
    const data = await res.json()
    setAufmasse(data.aufmasse || [])
    setLoading(false)
  }, [])

  useEffect(() => { if (token) loadList(token) }, [token, loadList])

  const handleSave = (saved) => {
    setAufmasse(prev => {
      const idx = prev.findIndex(a => a.id === saved.id)
      if (idx >= 0) { const n = [...prev]; n[idx] = saved; return n }
      return [saved, ...prev]
    })
    // Prebaci editor na pravi objekat (ne 'new') da sljedeći save koristi PATCH
    setEditor(saved)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Aufmaß wirklich löschen?')) return
    setDeleting(id)
    await fetch('/api/aufmasse', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id }),
    })
    setAufmasse(prev => prev.filter(a => a.id !== id))
    setDeleting(null)
  }

  const handleSign = async (rotated, raw) => {
    if (!sigTarget) return
    // Save both: rotated (for PDF) + raw (for re-editing without double-rotation)
    await fetch('/api/aufmasse', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id: sigTarget.id, signature: rotated, signature_raw: raw }),
    })
    setAufmasse(prev => prev.map(a => a.id === sigTarget.id ? { ...a, signature: rotated, signature_raw: raw } : a))
    setSigTarget(null)
  }

  return (
    <SubscriptionGuard feature="invoicing" majstorId={majstor?.id}>
    <div className="space-y-6 pb-24">
      <FirstVisitHint pageKey="aufmass" />
      {/* Header */}
      <a href="/dashboard" className="text-slate-400 hover:text-white text-sm inline-block mb-3">← Zurück zum Dashboard</a>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">📐 Aufmaß</h1>
          <p className="text-slate-400 text-sm mt-0.5">Raummaße erfassen und als PDF exportieren</p>
        </div>
        <button
          onClick={() => setEditor('new')}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition-colors shadow-lg"
        >
          + Neues Aufmaß
        </button>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : aufmasse.length === 0 ? (
        <div className="text-center py-20 bg-slate-800/30 rounded-2xl border border-slate-700">
          <p className="text-5xl mb-4">📐</p>
          <p className="text-white font-semibold text-lg mb-2">Noch keine Aufmaße erstellt</p>
          <p className="text-slate-400 text-sm mb-6">Erfasse Raummaße direkt auf der Baustelle</p>
          <button
            onClick={() => setEditor('new')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
          >
            Erstes Aufmaß erstellen
          </button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {aufmasse.map(a => {
            const totals = computeTotals(a.rooms || [], a.gewerk)
            const totalEntries = Object.entries(totals).filter(([, v]) => v > 0)
            return (
              <div key={a.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 hover:border-slate-600 transition-colors">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="text-white font-semibold truncate">{a.title}</p>
                    <p className="text-slate-400 text-xs mt-0.5">
                      {formatDate(a.date)}{a.customer_name ? ` · ${a.customer_name}` : ''}
                    </p>
                  </div>
                  <span className="text-xs text-slate-500 shrink-0">{(a.rooms || []).length} Bereiche</span>
                </div>

                {totalEntries.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {totalEntries.map(([unit, val]) => (
                      <span key={unit} className="text-xs px-2 py-0.5 bg-slate-700 text-slate-300 rounded-full">
                        {formatNum(val)} {unit === 'Wand' ? 'm²' : unit}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => setEditor(a)}
                    className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors"
                  >
                    ✏️ Öffnen
                  </button>
                  <button
                    onClick={() => generateAufmassPDF(a, majstor, a.signature || null)}
                    className="flex-1 py-2 text-sm rounded-lg transition-colors"
                    style={{ backgroundColor: '#475569', color: '#ffffff' }}
                  >
                    📄 PDF
                  </button>
                  <button
                    onClick={() => setSigTarget(a)}
                    className={`py-2 px-3 text-sm rounded-lg transition-colors ${
                      a.signature
                        ? 'bg-green-600/10 hover:bg-green-600/20 text-green-400'
                        : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                    }`}
                    title={a.signature ? 'Unterschrift ändern' : 'Unterschreiben'}
                  >
                    ✍️
                  </button>
                  <button
                    onClick={() => handleDelete(a.id)}
                    disabled={deleting === a.id}
                    className="py-2 px-3 bg-red-600/10 hover:bg-red-600/20 text-red-400 text-sm rounded-lg transition-colors disabled:opacity-50"
                  >
                    {deleting === a.id ? '...' : '🗑️'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Editor modal */}
      {editor && (
        <EditorModal
          aufmass={editor === 'new' ? null : editor}
          majstor={majstor}
          token={token}
          onSave={handleSave}
          onClose={() => setEditor(null)}
        />
      )}

      {/* Signature modal (from list) */}
      {sigTarget && (
        <SignatureModal
          existingDataUrl={sigTarget.signature_raw || null}
          onConfirm={(rotated, raw) => handleSign(rotated, raw)}
          onClose={() => setSigTarget(null)}
        />
      )}
    </div>
    </SubscriptionGuard>
  )
}
