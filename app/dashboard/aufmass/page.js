'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { generateAufmassPDF } from '@/lib/pdf/AufmassPDF'

const UNITS = ['m²', 'Wand', 'Bogen', 'Trap', 'lm', 'm³', 'Stk']

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
  if (unit === 'lm') return (
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
  'lm':   { text: 'Längenmaß: nur L' },
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
    case 'lm':
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
  const t = { 'm²': 0, 'lm': 0, 'm³': 0, 'Stk': 0 }
  for (const r of rooms) {
    for (const i of r.items || []) {
      if (i.result == null) continue
      const unit = (i.unit === 'Wand' || i.unit === 'Bogen' || i.unit === 'Trap') ? 'm²' : i.unit
      if (unit) t[unit] = (t[unit] || 0) + i.result
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

      {/* Unit selector + Mjere */}
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
        {(item.unit === 'm²' || item.unit === 'lm' || item.unit === 'm³' || item.unit === 'Wand' || item.unit === 'Trap' || item.unit === 'Bogen') && (
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
          <span className="text-slate-400 text-xs">{item.unit}</span>
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

// ─── Room section ─────────────────────────────────────────────────────────────
function RoomSection({ room, onChange, onRemove }) {
  const updateItem = (idx, newItem) => {
    const items = [...room.items]
    items[idx] = newItem
    onChange({ ...room, items })
  }
  const removeItem = (idx) => {
    onChange({ ...room, items: room.items.filter((_, i) => i !== idx) })
  }
  const addItem = () => {
    onChange({
      ...room,
      items: [...room.items, { id: newId(), description: '', unit: 'm²', dim_unit: 'm', length: '', width: '', height: '', count: '', result: 0, calculation: '' }]
    })
  }

  return (
    <div className="border border-slate-600 rounded-xl overflow-hidden">
      {/* Room header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-700/60">
        <input
          type="text"
          value={room.name}
          onChange={e => onChange({ ...room, name: e.target.value })}
          placeholder="Bereichsname (z.B. Wohnzimmer, Fenster, Fassade...)"
          className="flex-1 bg-transparent text-white font-semibold text-sm focus:outline-none placeholder-slate-500"
        />
        <button onClick={onRemove} className="text-slate-500 hover:text-red-400 text-lg leading-none px-1">×</button>
      </div>

      {/* Items */}
      <div className="p-3 space-y-2 bg-slate-800/30">
        {room.items.map((item, idx) => (
          <ItemRow
            key={item.id}
            item={item}
            onChange={newItem => updateItem(idx, newItem)}
            onRemove={() => removeItem(idx)}
          />
        ))}
        <button
          onClick={addItem}
          className="w-full py-2 border border-dashed border-slate-600 hover:border-blue-500 text-slate-400 hover:text-blue-400 text-sm rounded-lg transition-colors"
        >
          + Position hinzufügen
        </button>
      </div>
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
    if (!canvas || !hasDrawnRef.current) { onConfirm(null); onClose(); return }
    // Rotate CCW 90° for portrait PDF
    const rotated = document.createElement('canvas')
    rotated.width = canvas.height
    rotated.height = canvas.width
    const rctx = rotated.getContext('2d')
    rctx.translate(0, canvas.width)
    rctx.rotate(-Math.PI / 2)
    rctx.drawImage(canvas, 0, 0)
    onConfirm(rotated.toDataURL('image/png'))
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
          className="bg-white border-2 border-dashed border-slate-300 rounded-xl"
          style={{
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
  })
  const [signature, setSignature] = useState(null)
  const [showSig, setShowSig] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

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

  const transferToInvoice = async () => {
    // Spremi prvo ako je novo
    if (isNew && form.title.trim()) await save()
    const flatItems = []
    for (const room of form.rooms) {
      for (const item of room.items) {
        flatItems.push({
          description: `${room.name ? room.name + ': ' : ''}${item.description}`,
          quantity: item.result || 1,
          unit: item.unit || '',
          unit_price: 0,
          total_price: 0,
        })
      }
    }
    sessionStorage.setItem('prm_aufmass_import', JSON.stringify({
      title: form.title,
      items: flatItems,
      aufmass_id: aufmass?.id || null,
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

            {/* Sobe */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-semibold text-sm">Bereiche</h3>
                <span className="text-xs text-slate-500">{form.rooms.length} Bereich/Bereiche</span>
              </div>
              {form.rooms.map((room, idx) => (
                <RoomSection
                  key={room.id}
                  room={room}
                  onChange={r => updateRoom(idx, r)}
                  onRemove={() => removeRoom(idx)}
                />
              ))}
              <button
                onClick={addRoom}
                className="w-full py-3 border-2 border-dashed border-slate-600 hover:border-blue-500 text-slate-400 hover:text-blue-400 rounded-xl text-sm font-medium transition-colors"
              >
                + Bereich hinzufügen
              </button>
            </div>

            {/* Sažetak */}
            {totalEntries.length > 0 && (
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-2">Zusammenfassung</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {totalEntries.map(([unit, val]) => (
                    <div key={unit} className="text-center">
                      <p className="text-xl font-bold text-white">{formatNum(val)}</p>
                      <p className="text-xs text-slate-400">{unit}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
                    className="w-full h-20 object-contain bg-white rounded-lg border border-slate-400"
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
                  className="w-full h-20 bg-white rounded-lg border-2 border-dashed border-slate-400 hover:border-blue-400 active:border-blue-500 flex items-center justify-center transition-colors"
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
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-lg text-sm transition-colors"
            >
              {saving ? 'Speichern...' : '💾 Speichern'}
            </button>
            <button
              onClick={downloadPDF}
              className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg text-sm transition-colors"
            >
              📄 PDF
            </button>
            <button
              onClick={transferToInvoice}
              className="flex-1 py-2.5 bg-green-700 hover:bg-green-600 text-white font-semibold rounded-lg text-sm transition-colors"
            >
              📋 In Angebot
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

      {showSig && (
        <SignatureModal
          existingDataUrl={signature}
          onConfirm={setSignature}
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
    // Ne zatvara modal — korisnik sam klikne Schließen kad završi
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
    <div className="space-y-6 pb-24">
      {/* Header */}
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
                    className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors"
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
  )
}
