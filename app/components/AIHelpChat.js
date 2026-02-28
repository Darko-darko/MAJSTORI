// app/components/AIHelpChat.js
'use client'
import { useState, useRef, useEffect } from 'react'

function RobotIcon({ small, tiny }) {
  const size = tiny ? 20 : small ? 32 : 56
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Sivi krug */}
      <circle cx="50" cy="50" r="47" fill="white" stroke="#b8bec8" strokeWidth="5"/>

      {/* Robot tijelo - tamno plava */}
      {/* Glava */}
      <rect x="22" y="26" width="46" height="42" rx="13" fill="#1e3558"/>
      {/* Lijevo uho */}
      <rect x="13" y="40" width="11" height="12" rx="4" fill="#1e3558"/>
      {/* Desno uho */}
      <rect x="66" y="40" width="11" height="12" rx="4" fill="#1e3558"/>
      {/* Vrat/brada */}
      <rect x="39" y="66" width="16" height="9" rx="4" fill="#1e3558"/>

      {/* Zupčanik - teal, gornji lijevi dio glave */}
      <g transform="translate(37, 41)">
        <circle r="9" fill="#4ecdc0"/>
        <circle r="4.5" fill="#1e3558"/>
        {[0,45,90,135,180,225,270,315].map((angle, i) => (
          <rect key={i} x="-2.2" y="-12.5" width="4.4" height="4.5" rx="1" fill="#4ecdc0" transform={`rotate(${angle})`}/>
        ))}
      </g>

      {/* Narančasta kvačica - velika, preko cijelog robota */}
      <path d="M24 54 L42 72 L78 28" stroke="#f5911d" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  )
}

const SUGGESTED = [
  'Wie erstelle ich eine Rechnung?',
  'Was ist ZUGFeRD?',
  'Wie teile ich meine Visitenkarte?',
  'Was ist im Freemium enthalten?',
]

export default function AIHelpChat() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hallo! Ich bin Ihr Pro-Meister AI Assistent\n\nWie kann ich Ihnen helfen?' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [keyboardOffset, setKeyboardOffset] = useState(0)
  const [vvHeight, setVvHeight] = useState(null)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const update = () => {
      const offset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
      setKeyboardOffset(offset)
      setVvHeight(vv.height)
    }
    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [])

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [open, messages])


  const btnBottom = 24 + keyboardOffset
  const chatBottom = btnBottom + 64 + 8
  const chatHeight = vvHeight ? Math.min(480, vvHeight - 112) : 480

  const send = async (text) => {
    const msg = text || input.trim()
    if (!msg || loading) return

    const newMessages = [...messages, { role: 'user', content: msg }]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/ai-help', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages.slice(1) }) // bez uvodne poruke
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply || 'Entschuldigung, bitte versuchen Sie es erneut.' }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Verbindungsfehler. Bitte versuchen Sie es erneut.' }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const showSuggestions = messages.length === 1

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setOpen(v => !v)}
        className="fixed right-6 z-50 w-16 h-16 bg-white hover:bg-slate-50 rounded-full shadow-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95"
        style={{ bottom: `${btnBottom}px` }}
        title="KI-Assistent"
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <line x1="4" y1="4" x2="16" y2="16" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round"/>
            <line x1="16" y1="4" x2="4" y2="16" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
        ) : (
          <RobotIcon />
        )}
      </button>

      {/* Chat Window — inline stilovi da light mode ne utiče */}
      {open && (
        <div className="fixed right-6 z-50 w-80 sm:w-96" style={{ bottom: `${chatBottom}px` }}>

          <div className="rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            style={{ height: `${chatHeight}px`, backgroundColor: '#0f172a', border: '1px solid #334155' }}>

          {/* Header */}
          <div style={{ backgroundColor: '#1d4ed8', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            <RobotIcon small />
            <div>
              <p style={{ color: 'white', fontWeight: 600, fontSize: '14px', lineHeight: '1.2' }}>Pro-Meister AI Assistent</p>
              <p style={{ color: '#bfdbfe', fontSize: '12px' }}>KI-gestützte Hilfe</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', alignItems: 'flex-start', gap: '6px' }}>
                {m.role === 'assistant' && <div style={{ flexShrink: 0, marginTop: '4px' }}><RobotIcon tiny /></div>}
                <div style={{
                  maxWidth: '85%', padding: '8px 12px', borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  fontSize: '14px', whiteSpace: 'pre-wrap', lineHeight: '1.5',
                  backgroundColor: m.role === 'user' ? '#2563eb' : '#1e293b',
                  color: '#f1f5f9'
                }}>
                  {m.content}
                </div>
              </div>
            ))}

            {/* Suggestions */}
            {showSuggestions && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '4px' }}>
                {SUGGESTED.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => send(s)}
                    style={{ textAlign: 'left', fontSize: '12px', backgroundColor: '#1e293b', border: '1px solid #334155', color: '#94a3b8', padding: '8px 12px', borderRadius: '12px', cursor: 'pointer' }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div style={{ display: 'flex' }}>
                <div style={{ backgroundColor: '#1e293b', padding: '8px 12px', borderRadius: '16px 16px 16px 4px' }}>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center', height: '16px' }}>
                    <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ width: 6, height: 6, backgroundColor: '#64748b', animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ width: 6, height: 6, backgroundColor: '#64748b', animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ width: 6, height: 6, backgroundColor: '#64748b', animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '12px', borderTop: '1px solid #334155', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Ihre Frage..."
                disabled={loading}
                style={{ flex: 1, backgroundColor: '#1e293b', border: '1px solid #475569', color: '#f1f5f9', fontSize: '14px', padding: '8px 12px', borderRadius: '12px', outline: 'none' }}
              />
              <button
                onClick={() => send()}
                disabled={loading || !input.trim()}
                style={{ backgroundColor: '#2563eb', color: 'white', padding: '8px 12px', borderRadius: '12px', fontSize: '14px', cursor: 'pointer', opacity: (loading || !input.trim()) ? 0.5 : 1 }}
              >
                ➤
              </button>
            </div>
            <p style={{ color: '#475569', fontSize: '11px', textAlign: 'center', marginTop: '8px' }}>KI kann Fehler machen — bei wichtigen Fragen Support kontaktieren</p>
          </div>
          </div>
        </div>
      )}
    </>
  )
}
