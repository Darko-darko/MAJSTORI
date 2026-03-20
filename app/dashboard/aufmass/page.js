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
  { id: 'allgemein', label: 'Allgemein', icon: '📐', vobThreshold: null, din: null },
  { id: 'maler', label: 'Maler', icon: '🖌️', vobThreshold: 2.5, din: '18363' },
  { id: 'fensterbau', label: 'Fensterbau', icon: '🪟', vobThreshold: null, din: null },
  { id: 'fliesen', label: 'Fliesen', icon: '🔲', vobThreshold: 0.1, din: '18352' },
  { id: 'trockenbau', label: 'Trockenbau', icon: '🧱', vobThreshold: 2.5, din: '18340' },
  { id: 'estrich', label: 'Estrich', icon: '🏗️', vobThreshold: 0.5, din: '18353' },
  { id: 'bodenbelag', label: 'Bodenbelag', icon: '🟫', vobThreshold: 0.5, din: '18365' },
]

// ─── Fensterbau ─────────────────────────────────────────
const FENSTER_PRESETS = [
  { id: '1-kd-l', label: '1-flg. DK', panels: [{ type: 'kipp-dreh', hinge: 'left' }] },
  { id: '2-kd', label: '2-flg. DK', panels: [{ type: 'kipp-dreh', hinge: 'left' }, { type: 'kipp-dreh', hinge: 'right' }] },
  { id: '1-fix', label: 'Fest', panels: [{ type: 'fix' }] },
  { id: '1-kipp', label: 'Kipp', panels: [{ type: 'kipp' }] },
  { id: 'kd-fix', label: 'DK + Fest', panels: [{ type: 'kipp-dreh', hinge: 'left' }, { type: 'fix' }] },
  { id: '3-kd', label: '3-flg.', panels: [{ type: 'kipp-dreh', hinge: 'left' }, { type: 'fix' }, { type: 'kipp-dreh', hinge: 'right' }] },
  { id: '1-kd-ob', label: 'DK + OL', panels: [{ type: 'kipp-dreh', hinge: 'left' }], oberlicht: true },
  { id: '2-kd-ob', label: '2-flg. + OL', panels: [{ type: 'kipp-dreh', hinge: 'left' }, { type: 'kipp-dreh', hinge: 'right' }], oberlicht: true },
]
const FENSTER_MATERIALS = ['Kunststoff', 'Holz', 'Aluminium', 'Holz-Alu']
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
function FensterSketch({ panels, oberlicht, size = 'sm', posWidth = 0, posHeight = 0 }) {
  const isSm = size === 'sm'
  const isXl = size === 'xl'
  const dimSpace = isSm ? 0 : isXl ? 45 : 28 // extra space for dimension lines
  const maxW = isSm ? 48 : isXl ? 280 : 140
  const maxH = isSm ? 36 : isXl ? 200 : 100
  const pad = isSm ? 3 : isXl ? 10 : 6
  const availW = maxW - 2 * pad, availH = maxH - 2 * pad
  // Proportional frame based on actual dimensions
  const pw0 = parseFloat(posWidth) || 0, ph0 = parseFloat(posHeight) || 0
  let frameW, frameH
  if (pw0 > 0 && ph0 > 0) {
    const scale = Math.min(availW / pw0, availH / ph0)
    frameW = pw0 * scale; frameH = ph0 * scale
  } else {
    frameW = availW; frameH = availH
  }
  const vw = frameW + 2 * pad + (isSm ? 0 : dimSpace)
  const vh = frameH + 2 * pad + (isSm ? 0 : dimSpace)
  const fX = pad, fY = pad // frame origin
  const olH = oberlicht ? frameH * 0.28 : 0
  const panelH = frameH - olH
  const sw = isSm ? 0.8 : isXl ? 1.8 : 1.2

  // Proportional panel widths — last panel = remainder of posWidth
  const totalPosW = parseFloat(posWidth) || 0
  const totalPosH = parseFloat(posHeight) || 0
  const effWidths = panels.map((p, i) => {
    if (i === panels.length - 1 && panels.length > 1 && totalPosW > 0) {
      const others = panels.reduce((s, pp, j) => j !== i ? s + (parseFloat(pp.width) || 0) : s, 0)
      return Math.max(1, totalPosW - others)
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
    <svg width={vw} height={vh} viewBox={`0 0 ${vw} ${vh}`} className="text-slate-400">
      {/* Outer frame (Blendrahmen) */}
      <rect x={fX} y={fY} width={frameW} height={frameH} fill="none" stroke="currentColor" strokeWidth={sw * 2} />
      {oberlicht && (
        <>
          <line x1={fX} y1={fY + olH} x2={fX + frameW} y2={fY + olH} stroke="currentColor" strokeWidth={sw} />
          {/* Inner frame for oberlicht */}
          <rect x={fX + inset} y={fY + inset} width={frameW - 2 * inset} height={olH - 2 * inset} fill="none" stroke="currentColor" strokeWidth={sw * 0.6} />
          <line x1={fX + inset} y1={fY + inset} x2={fX + frameW - inset} y2={fY + olH - inset} stroke="currentColor" strokeWidth={sw * 0.5} strokeDasharray={isSm ? '1.5 1.5' : '3 3'} />
          <line x1={fX + frameW - inset} y1={fY + inset} x2={fX + inset} y2={fY + olH - inset} stroke="currentColor" strokeWidth={sw * 0.5} strokeDasharray={isSm ? '1.5 1.5' : '3 3'} />
        </>
      )}
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

      {/* Dimension lines — only for lg size */}
      {!isSm && totalPosW > 0 && (
        <g className="text-slate-500" fill="currentColor" stroke="currentColor" strokeWidth={0.5}>
          {/* Bottom: total width */}
          <line x1={fX} y1={fY + frameH + dimOff1} x2={fX} y2={fY + frameH + dimOff2 + dimTick} strokeWidth={0.4} />
          <line x1={fX + frameW} y1={fY + frameH + dimOff1} x2={fX + frameW} y2={fY + frameH + dimOff2 + dimTick} strokeWidth={0.4} />
          <line x1={fX} y1={fY + frameH + dimOff2} x2={fX + frameW} y2={fY + frameH + dimOff2} />
          <text x={fX + frameW / 2} y={fY + frameH + dimOff2 + fontSize + 2} textAnchor="middle" fontSize={fontSize} stroke="none">{totalPosW}</text>

          {/* Bottom: individual panel widths (if different) */}
          {hasCustomWidths && panels.length > 1 && (() => {
            let cx = fX
            return panels.map((_, i) => {
              const pw = panelWidths[i]
              const ew = effWidths[i]
              const x1 = cx, x2 = cx + pw
              cx += pw
              return (
                <g key={`pw${i}`}>
                  <line x1={x1} y1={fY + frameH + 2} x2={x1} y2={fY + frameH + dimOff1 + dimTick} strokeWidth={0.4} />
                  <line x1={x2} y1={fY + frameH + 2} x2={x2} y2={fY + frameH + dimOff1 + dimTick} strokeWidth={0.4} />
                  <line x1={x1} y1={fY + frameH + dimOff1} x2={x2} y2={fY + frameH + dimOff1} />
                  <text x={x1 + pw / 2} y={fY + frameH + dimOff1 + fontSize} textAnchor="middle" fontSize={fontSize - 1} stroke="none">{ew > 0 ? Math.round(ew) : ''}</text>
                </g>
              )
            })
          })()}

          {/* Right: total height */}
          {totalPosH > 0 && (
            <>
              <line x1={fX + frameW + dimOff1} y1={fY} x2={fX + frameW + dimOff2 + dimTick} y2={fY} strokeWidth={0.4} />
              <line x1={fX + frameW + dimOff1} y1={fY + frameH} x2={fX + frameW + dimOff2 + dimTick} y2={fY + frameH} strokeWidth={0.4} />
              <line x1={fX + frameW + dimOff2} y1={fY} x2={fX + frameW + dimOff2} y2={fY + frameH} />
              <text x={fX + frameW + dimOff2 + 6} y={fY + frameH / 2} fontSize={fontSize} stroke="none" textAnchor="middle" dominantBaseline="central" transform={`rotate(90, ${fX + frameW + dimOff2 + 6}, ${fY + frameH / 2})`}>{totalPosH}</text>
            </>
          )}
        </g>
      )}
    </svg>
  )
}

function newFensterPosition() {
  return {
    id: newId(),
    name: '',
    preset: '1-kd-l',
    panels: [{ type: 'kipp-dreh', hinge: 'left' }],
    oberlicht: false,
    width: '',
    height: '',
    count: '1',
    material: 'Kunststoff',
    glazing: '2-fach Verglasung',
    color: '',
    notes: '',
  }
}

const PANEL_TYPES = [
  { id: 'kipp-dreh', label: 'Dreh-Kipp' },
  { id: 'dreh', label: 'Dreh' },
  { id: 'kipp', label: 'Kipp' },
  { id: 'fix', label: 'Fest' },
]

function FensterPositionCard({ pos, index, onChange, onRemove }) {
  const update = (key, val) => onChange({ ...pos, [key]: val })
  const [showCustom, setShowCustom] = useState(false)
  const [zoomSketch, setZoomSketch] = useState(false)

  const selectPreset = (preset) => {
    onChange({
      ...pos,
      preset: preset.id,
      panels: JSON.parse(JSON.stringify(preset.panels)),
      oberlicht: !!preset.oberlicht,
    })
    setShowCustom(false)
  }

  const updatePanel = (idx, field, val) => {
    const panels = JSON.parse(JSON.stringify(pos.panels))
    panels[idx][field] = val
    onChange({ ...pos, panels, preset: 'custom' })
  }

  const addPanel = () => {
    const panels = [...pos.panels, { type: 'fix', hinge: 'left' }]
    onChange({ ...pos, panels, preset: 'custom' })
  }

  const removePanel = (idx) => {
    if (pos.panels.length <= 1) return
    const panels = pos.panels.filter((_, i) => i !== idx)
    onChange({ ...pos, panels, preset: 'custom' })
  }

  const toggleOberlicht = () => {
    onChange({ ...pos, oberlicht: !pos.oberlicht, preset: 'custom' })
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
          className="flex-1 px-2 py-1 bg-slate-800 border border-slate-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button onClick={onRemove} className="text-red-400 hover:text-red-300 text-sm px-1">✕</button>
      </div>

      {/* Typ-Auswahl */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <label className="text-xs text-slate-500">Fenstertyp</label>
          <button
            type="button"
            onClick={() => setShowCustom(o => !o)}
            className="text-[10px] text-blue-400 hover:text-blue-300"
          >
            {showCustom ? '← Vorlagen' : 'Anpassen ⚙'}
          </button>
        </div>

        {!showCustom ? (
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
                <FensterSketch panels={fp.panels} oberlicht={fp.oberlicht} size="sm" />
                <span className="text-[10px] text-slate-400">{fp.label}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="bg-slate-800/50 border border-slate-600 rounded-lg p-2 space-y-2">
            {pos.panels.map((panel, pi) => (
              <div key={pi} className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500 min-w-[52px]">Flügel {pi + 1}</span>
                <select
                  value={panel.type}
                  onChange={e => updatePanel(pi, 'type', e.target.value)}
                  className="flex-1 min-h-[36px] px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-white text-xs"
                >
                  {PANEL_TYPES.map(pt => (
                    <option key={pt.id} value={pt.id}>{pt.label}</option>
                  ))}
                </select>
                {(panel.type === 'dreh' || panel.type === 'kipp-dreh') && (
                  <select
                    value={panel.hinge || 'left'}
                    onChange={e => updatePanel(pi, 'hinge', e.target.value)}
                    className="min-h-[36px] px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-white text-xs"
                  >
                    <option value="left">Band links</option>
                    <option value="right">Band rechts</option>
                  </select>
                )}
                {pos.panels.length > 1 && (
                  <button onClick={() => removePanel(pi)} className="text-red-400 text-sm px-1 min-h-[36px]">✕</button>
                )}
              </div>
            ))}
            <div className="flex gap-2">
              <button onClick={addPanel} className="text-[10px] text-blue-400 hover:text-blue-300">+ Flügel</button>
              <button onClick={toggleOberlicht}
                className={`text-[10px] ${pos.oberlicht ? 'text-green-400' : 'text-slate-500 hover:text-slate-400'}`}
              >
                {pos.oberlicht ? '✓ Oberlicht' : '+ Oberlicht'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Individuelle Flügelbreiten — nur bei 2+ Flügeln und eingegebener Gesamtbreite */}
      {pos.panels.length > 1 && parseFloat(pos.width) > 0 && (() => {
        const totalW = parseFloat(pos.width)
        const anyHasWidth = pos.panels.some(p => parseFloat(p.width) > 0)
        const othersSum = pos.panels.slice(0, -1).reduce((s, p) => s + (parseFloat(p.width) || 0), 0)
        const lastRest = totalW - othersSum
        return (
          <div className="bg-slate-800/50 border border-slate-600 rounded-lg p-2">
            <p className="text-[10px] text-slate-500 mb-1.5">Flügelbreiten (optional — leer = gleich breit)</p>
            <div className="space-y-1.5">
              {pos.panels.map((panel, pi) => {
                const isLast = pi === pos.panels.length - 1
                return (
                  <div key={pi} className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 w-14">Flügel {pi + 1}:</span>
                    {isLast && anyHasWidth ? (
                      <>
                        <span className={`w-20 min-h-[32px] px-2 py-1 bg-slate-600/50 border border-slate-600 rounded text-xs text-center flex items-center justify-center ${lastRest > 0 ? 'text-slate-300' : 'text-red-400'}`}>
                          {lastRest > 0 ? lastRest : 'Fehler'}
                        </span>
                        <span className="text-[10px] text-slate-500">mm</span>
                        {lastRest > 0 && <span className="text-[9px] text-slate-500 italic">auto</span>}
                        {lastRest <= 0 && <span className="text-[9px] text-red-400">zu breit!</span>}
                      </>
                    ) : (
                      <>
                        <input
                          type="number"
                          value={panel.width || ''}
                          onChange={e => updatePanel(pi, 'width', e.target.value)}
                          placeholder={isLast ? 'auto' : ''}
                          className="w-20 min-h-[32px] px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-xs text-center"
                        />
                        <span className="text-[10px] text-slate-500">mm</span>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* Vorschau + Maße */}
      <div className="flex gap-3 items-start">
        <div className="bg-slate-800 rounded-lg p-2 border border-slate-700 cursor-pointer hover:border-blue-500 transition-colors" onClick={() => setZoomSketch(true)}>
          <FensterSketch panels={pos.panels} oberlicht={pos.oberlicht} size="lg" posWidth={pos.width} posHeight={pos.height} />
        </div>
        {zoomSketch && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setZoomSketch(false)}>
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-600 max-w-sm" onClick={e => e.stopPropagation()}>
              <FensterSketch panels={pos.panels} oberlicht={pos.oberlicht} size="xl" posWidth={pos.width} posHeight={pos.height} />
              <button onClick={() => setZoomSketch(false)} className="mt-4 w-full py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm">Schließen</button>
            </div>
          </div>
        )}
        <div className="flex-1 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] text-slate-500 mb-0.5">Breite (mm)</label>
              <input type="number" value={pos.width} onChange={e => update('width', e.target.value)}
                placeholder="1200" className="w-full px-2 py-1 bg-slate-800 border border-slate-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 mb-0.5">Höhe (mm)</label>
              <input type="number" value={pos.height} onChange={e => update('height', e.target.value)}
                placeholder="1400" className="w-full px-2 py-1 bg-slate-800 border border-slate-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[10px] text-slate-500 mb-0.5">Anzahl</label>
              <input type="number" value={pos.count} onChange={e => update('count', e.target.value)}
                min="1" className="w-full px-2 py-1 bg-slate-800 border border-slate-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 mb-0.5">Material</label>
              <select value={pos.material} onChange={e => update('material', e.target.value)}
                className="w-full px-1 py-1 bg-slate-800 border border-slate-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                {FENSTER_MATERIALS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 mb-0.5">Profil</label>
              <input type="text" value={pos.profil || ''} onChange={e => update('profil', e.target.value)}
                placeholder="z.B. Iglo 5 Classic..."
                className="w-full px-2 py-1 bg-slate-800 border border-slate-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 mb-0.5">Verglasung</label>
              <select value={pos.glazing} onChange={e => update('glazing', e.target.value)}
                className="w-full px-1 py-1 bg-slate-800 border border-slate-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                {FENSTER_GLAZING.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[10px] text-slate-500 mb-0.5">Farbe / Dekor</label>
            <input type="text" value={pos.color} onChange={e => update('color', e.target.value)}
              placeholder="z.B. Weiß, Anthrazit DB 703..."
              className="w-full px-2 py-1 bg-slate-800 border border-slate-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-[10px] text-slate-500 mb-0.5">Bemerkungen</label>
            <input type="text" value={pos.notes} onChange={e => update('notes', e.target.value)}
              placeholder="Optional..."
              className="w-full px-2 py-1 bg-slate-800 border border-slate-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
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
      result = l * b * c
      calculation = c > 1 ? `${item.length}${u} × ${item.width}${u} × ${c}` : `${item.length}${u} × ${item.width}${u}`
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

function computeTotals(rooms) {
  const t = { 'm²': 0, 'lfm': 0, 'm³': 0, 'Stk': 0 }
  for (const r of rooms) {
    for (const i of r.items || []) {
      if (i.result == null) continue
      const unit = (i.unit === 'Wand' || i.unit === 'Bogen' || i.unit === 'Trap') ? 'm²' : i.unit
      const sign = i.subtract ? -1 : 1
      if (unit) t[unit] = (t[unit] || 0) + i.result * sign
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
    <div className={`flex flex-wrap gap-1.5 items-center py-1.5 px-2 rounded-lg border text-sm ${wrapCls}`}>
      {/* Shape selector */}
      <div className="flex rounded overflow-hidden border border-slate-600 shrink-0">
        {SHAPES.map(sh => (
          <button key={sh.id} onClick={() => update('shape', sh.id)} title={sh.title}
            className={`px-2 py-0.5 text-xs font-medium transition-colors ${shape === sh.id ? accentBtn : 'bg-slate-700 text-slate-400'}`}
          >{sh.label}</button>
        ))}
      </div>
      <input type="text" value={item.description} onChange={e => update('description', e.target.value)}
        placeholder={isSubtract ? 'Fenster / Tür...' : 'Beschreibung...'}
        className="w-28 px-2 py-1 bg-slate-800 border border-slate-600 rounded text-white placeholder-slate-500 text-xs shape-row-input" />
      <div className="flex rounded overflow-hidden border border-slate-600 shrink-0">
        {['m', 'cm'].map(du => (
          <button key={du} onClick={() => update('dim_unit', du)}
            className={`px-2 py-0.5 text-xs font-medium transition-colors ${(item.dim_unit || 'm') === du ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'}`}
          >{du}</button>
        ))}
      </div>
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
    gewerk: aufmass?.gewerk || 'allgemein',
  })
  const [signature, setSignature] = useState(null)
  const [signatureRaw, setSignatureRaw] = useState(null)
  const [showSig, setShowSig] = useState(false)
  const [bereicheOpen, setBereicheOpen] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Transfer modal
  const [transferModal, setTransferModal] = useState(null) // 'quote' | 'invoice' | null
  const [existingDocs, setExistingDocs] = useState([])
  const [existingLoading, setExistingLoading] = useState(false)
  const [appendingTo, setAppendingTo] = useState(null) // invoice id being appended to

  const addRoom = () => setForm(f => ({
    ...f,
    rooms: [...f.rooms, { id: newId(), name: '', items: [] }]
  }))

  const updateRoom = (idx, room) => setForm(f => {
    const rooms = [...f.rooms]; rooms[idx] = room; return { ...f, rooms }
  })

  const removeRoom = (idx) => setForm(f => ({ ...f, rooms: f.rooms.filter((_, i) => i !== idx) }))

  const totals = computeTotals(form.rooms)
  const totalEntries = Object.entries(totals).filter(([, v]) => v > 0)

  const save = async () => {
    if (!form.title.trim()) { setError('Bitte Titel eingeben'); return }
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
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const downloadPDF = async () => {
    if (!form.title.trim()) { setError('Bitte Titel eingeben'); return }
    await generateAufmassPDF(form, majstor, signature)
  }

  const transferTo = async (docType) => {
    if (isNew && form.title.trim()) await save()
    const flatItems = []

    if (form.gewerk === 'fensterbau') {
      // Fensterbau: each position = one invoice item
      for (const pos of form.rooms) {
        const panels = pos.panels || []
        const typLabels = panels.map(p =>
          p.type === 'kipp-dreh' ? 'Dreh-Kipp' : p.type === 'dreh' ? 'Dreh' : p.type === 'kipp' ? 'Kipp' : 'Fest'
        )
        const typStr = typLabels.join(' + ') + (pos.oberlicht ? ' + Oberlicht' : '')
        const parts = [
          pos.name,
          pos.material,
          typStr,
          pos.width && pos.height ? `${pos.width} × ${pos.height} mm` : null,
          pos.glazing,
          pos.color,
        ].filter(Boolean)
        flatItems.push({
          description: parts.join(', '),
          quantity: parseInt(pos.count) || 1,
          unit: 'Stk',
          unit_price: 0,
          total_price: 0,
        })
      }
    } else {
      // Room-based: compute netto per unit
      for (const room of form.rooms) {
        const nettoByUnit = {}
        for (const item of room.items) {
          if (!item.result) continue
          const rawU = item.unit || ''
          const u = ['Wand', 'Bogen', 'Trap'].includes(rawU) ? 'm²' : rawU
          const sign = item.subtract ? -1 : 1
          nettoByUnit[u] = (nettoByUnit[u] || 0) + sign * item.result
        }
        for (const [unit, netto] of Object.entries(nettoByUnit)) {
          if (netto <= 0) continue
          const m2Units = ['m²', 'Wand', 'Bogen', 'Trap']
          const matchUnits = unit === 'm²' ? m2Units : [unit]
          const descs = room.items
            .filter(i => !i.subtract && !i.isForm && matchUnits.includes(i.unit || '') && i.description)
            .map(i => i.description)
            .filter(Boolean)
            .join(', ')
          flatItems.push({
            description: [room.name, descs].filter(Boolean).join(': '),
            quantity: Math.round(netto * 100) / 100,
            unit,
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
    sessionStorage.setItem('prm_aufmass_import', JSON.stringify({
      title: form.title,
      items: flatItems,
      aufmass_id: aufmass?.id || null,
      docType,
    }))
    router.push('/dashboard/invoices?from=aufmass')
  }

  const buildFlatItems = () => {
    const flatItems = []
    for (const room of form.rooms) {
      const nettoByUnit = {}
      for (const item of room.items) {
        if (!item.result) continue
        const rawU = item.unit || ''
        const u = ['Wand', 'Bogen', 'Trap'].includes(rawU) ? 'm²' : rawU
        const sign = item.subtract ? -1 : 1
        nettoByUnit[u] = (nettoByUnit[u] || 0) + sign * item.result
      }
      for (const [unit, netto] of Object.entries(nettoByUnit)) {
        if (netto <= 0) continue
        const m2Units = ['m²', 'Wand', 'Bogen', 'Trap']
        const matchUnits = unit === 'm²' ? m2Units : [unit]
        const descs = room.items
          .filter(i => !i.subtract && !i.isForm && matchUnits.includes(i.unit || '') && i.description)
          .map(i => i.description)
          .filter(Boolean)
          .join(', ')
        flatItems.push({
          description: [room.name, descs].filter(Boolean).join(': '),
          quantity: Math.round(netto * 100) / 100,
          unit,
          unit_price: 0,
          total_price: 0,
        })
      }
    }
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
    return flatItems
  }

  const openTransferModal = async (docType) => {
    setTransferModal(docType)
    setExistingLoading(true)
    try {
      const type = docType === 'quote' ? 'quote' : 'invoice'
      const { data } = await supabase
        .from('invoices')
        .select('id, invoice_number, customer_name, created_at, items, type, aufmass_id')
        .eq('majstor_id', majstor.id)
        .eq('type', type)
        .neq('status', 'dummy')
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false })
        .limit(20)
      setExistingDocs(data || [])
    } catch (e) {
      console.error('Error loading docs:', e)
    } finally {
      setExistingLoading(false)
    }
  }

  const appendToExisting = async (doc) => {
    // Guard: check if this Aufmaß is already linked to this document
    if (aufmass?.id && doc.aufmass_id === aufmass.id) {
      if (!confirm('Dieses Aufmaß wurde bereits zu diesem Dokument hinzugefügt. Trotzdem erneut hinzufügen?')) return
    }
    if (isNew && form.title.trim()) await save()
    setAppendingTo(doc.id)
    try {
      const existingItems = doc.items ? JSON.parse(doc.items) : []
      const newItems = buildFlatItems().map(item => ({
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        price: 0,
        price_gross: 0,
        total: 0,
        price_source: 'netto',
      }))
      const mergedItems = [...existingItems, ...newItems]
      const { error: updateErr } = await supabase
        .from('invoices')
        .update({
          items: JSON.stringify(mergedItems),
          aufmass_id: aufmass?.id || null,
        })
        .eq('id', doc.id)
      if (updateErr) throw updateErr

      // Auto-upload Aufmaß PDF as attachment
      try {
        const pdfBlob = await generateAufmassPDFBlob(form, majstor)
        const safeName = (form.title || 'Aufmass').replace(/[^a-zA-Z0-9äöüÄÖÜß._-]/g, '_')
        const fileName = `Aufmass_${safeName}.pdf`
        const storagePath = `attachments/${majstor.id}/${doc.id}/${Date.now()}_${fileName}`

        await supabase.storage
          .from('invoice-pdfs')
          .upload(storagePath, pdfBlob, { contentType: 'application/pdf' })

        await supabase.from('invoice_attachments').insert({
          invoice_id: doc.id,
          majstor_id: majstor.id,
          storage_path: storagePath,
          filename: fileName,
          file_size: pdfBlob.size,
          mime_type: 'application/pdf',
        })
      } catch (attErr) {
        console.error('Aufmaß PDF attachment failed (non-critical):', attErr)
      }

      setTransferModal(null)
      // Redirect to invoices page and auto-open this document in editor
      sessionStorage.setItem('prm_edit_after_append', JSON.stringify({
        id: doc.id,
        type: doc.type,
      }))
      router.push('/dashboard/invoices?from=aufmass_append')
    } catch (e) {
      console.error('Append error:', e)
      alert('❌ Fehler: ' + (e.message || 'Unbekannter Fehler'))
    } finally {
      setAppendingTo(null)
    }
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
            <div>
              <label className="block text-xs text-slate-400 mb-1">Kundenname</label>
              <input
                type="text"
                value={form.customer_name}
                onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))}
                placeholder="Optional..."
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Gewerk */}
            <div>
              <label className="block text-xs text-slate-400 mb-1">Gewerk</label>
              <div className="flex flex-wrap gap-1.5">
                {GEWERKE.map(g => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, gewerk: g.id }))}
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
              {form.gewerk !== 'allgemein' && (() => {
                const g = GEWERKE.find(x => x.id === form.gewerk)
                return g?.vobThreshold != null ? (
                  <p className="text-xs text-slate-500 mt-1">
                    VOB/C DIN {g.din}: Öffnungen ≤ {g.vobThreshold} m² werden übermessen
                  </p>
                ) : null
              })()}
            </div>

            {/* Fensterbau: Positionen statt Bereiche */}
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
                  />
                ))}
                <button
                  onClick={() => setForm(f => ({ ...f, rooms: [...f.rooms, newFensterPosition()] }))}
                  className="w-full py-3 border-2 border-dashed border-slate-600 hover:border-blue-500 text-slate-400 hover:text-blue-400 rounded-xl text-sm font-medium transition-colors"
                >
                  + Position hinzufügen
                </button>
              </div>
            ) : (
              /* Bereiche (Allgemein, Maler, etc.) */
              <div className="border border-slate-600 rounded-xl overflow-hidden">
                <div
                  className="flex items-center gap-2 px-3 py-2 bg-slate-700/60 cursor-pointer"
                  onClick={() => setBereicheOpen(o => !o)}
                >
                  <span className="text-white text-sm font-semibold flex-1">📐 Bereiche <span className="text-slate-400 font-normal text-xs">({form.rooms.length})</span></span>
                  {totalEntries.length > 0 && (
                    <span className="text-slate-400 text-xs font-mono mr-2">
                      {totalEntries.map(([unit, val]) => `${formatNum(val)} ${unit}`).join(' · ')}
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

            {/* Potpis */}
            <div>
              <label className="block text-xs text-slate-400 mb-2">Unterschrift (optional)</label>
              {signature ? (
                <div className="relative group">
                  <img
                    src={signature}
                    alt="Unterschrift"
                    className="w-full h-20 object-contain rounded-lg border border-slate-400"
                    style={{ backgroundColor: '#ffffff' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSig(true)}
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
                  onClick={() => setShowSig(true)}
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

            {error && (
              <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">{error}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 px-5 py-4 pb-20 border-t border-slate-700">
            <button
              onClick={save}
              disabled={saving}
              className="flex-1 py-2.5 disabled:opacity-50 font-semibold rounded-lg text-sm transition-colors flex flex-col items-center"
              style={{ backgroundColor: '#2563eb', color: '#ffffff' }}
            >
              {saving ? 'Speichern...' : <><span>💾</span><span>Speichern</span></>}
            </button>
            <button
              onClick={downloadPDF}
              className="flex-1 py-2.5 font-semibold rounded-lg text-sm transition-colors flex flex-col items-center"
              style={{ backgroundColor: '#475569', color: '#ffffff' }}
            >
              <span>📄</span><span>PDF</span>
            </button>
            <button
              onClick={() => openTransferModal('quote')}
              className="flex-1 py-2.5 font-semibold rounded-lg text-sm transition-colors flex flex-col items-center"
              style={{ backgroundColor: '#15803d', color: '#ffffff' }}
            >
              <span>📋</span><span>Angebot</span>
            </button>
            <button
              onClick={() => openTransferModal('invoice')}
              className="flex-1 py-2.5 font-semibold rounded-lg text-sm transition-colors flex flex-col items-center"
              style={{ backgroundColor: '#c2410c', color: '#ffffff' }}
            >
              <span>🧾</span><span>Rechnung</span>
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

      {/* Transfer Modal: Neu erstellen / Zu bestehendem hinzufügen */}
      {transferModal && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4" onClick={() => !appendingTo && setTransferModal(null)}>
          <div className="bg-slate-800 rounded-xl w-full max-w-sm border border-slate-700 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b border-slate-700">
              <h3 className="text-white font-semibold">
                {transferModal === 'quote' ? '📋 Angebot' : '🧾 Rechnung'}
              </h3>
              <button onClick={() => setTransferModal(null)} className="text-slate-400 hover:text-white text-2xl leading-none">×</button>
            </div>

            <div className="p-4 space-y-3">
              {/* Neues erstellen */}
              <button
                onClick={() => { setTransferModal(null); transferTo(transferModal) }}
                className="w-full py-3 rounded-lg text-sm font-semibold transition-colors"
                style={{ backgroundColor: transferModal === 'quote' ? '#15803d' : '#c2410c', color: '#ffffff' }}
              >
                + {transferModal === 'quote' ? 'Neues Angebot erstellen' : 'Neue Rechnung erstellen'}
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <hr className="flex-1 border-slate-700" />
                <span className="text-slate-500 text-xs">oder</span>
                <hr className="flex-1 border-slate-700" />
              </div>

              {/* Zu bestehendem hinzufügen */}
              <p className="text-slate-400 text-xs">Zu bestehendem hinzufügen:</p>
              {existingLoading ? (
                <p className="text-slate-500 text-sm text-center py-4">Laden...</p>
              ) : existingDocs.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-4">
                  {transferModal === 'quote' ? 'Keine Angebote vorhanden' : 'Keine Rechnungen vorhanden'}
                </p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {existingDocs.map(doc => (
                    <button
                      key={doc.id}
                      onClick={() => appendToExisting(doc)}
                      disabled={!!appendingTo}
                      className="w-full text-left px-3 py-2.5 rounded-lg transition-colors disabled:opacity-50"
                      style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-white text-sm font-medium">{doc.invoice_number}</span>
                          {doc.customer_name && (
                            <span className="text-slate-400 text-xs ml-2">{doc.customer_name}</span>
                          )}
                        </div>
                        {appendingTo === doc.id && (
                          <span className="text-blue-400 text-xs animate-pulse">⏳</span>
                        )}
                      </div>
                      <p className="text-slate-500 text-xs mt-0.5">
                        {new Date(doc.created_at).toLocaleDateString('de-DE')} · {doc.items ? JSON.parse(doc.items).length : 0} Positionen
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showSig && (
        <SignatureModal
          existingDataUrl={signatureRaw}
          onConfirm={(rotated, raw) => { setSignature(rotated); setSignatureRaw(raw) }}
          onClose={() => setShowSig(false)}
        />
      )}
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
    setDeleting(id)
    await fetch('/api/aufmasse', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id }),
    })
    setAufmasse(prev => prev.filter(a => a.id !== id))
    setDeleting(null)
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
            const totals = computeTotals(a.rooms || [])
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
                        {formatNum(val)} {unit}
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
                    onClick={() => generateAufmassPDF(a, majstor)}
                    className="flex-1 py-2 text-sm rounded-lg transition-colors"
                    style={{ backgroundColor: '#475569', color: '#ffffff' }}
                  >
                    📄 PDF
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
    </div>
    </SubscriptionGuard>
  )
}
