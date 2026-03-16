// app/components/AIHelpChat.js
'use client'
import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'



const SUGGESTED = [
  'Wie erstelle ich eine Rechnung?',
  'Was ist ZUGFeRD?',
  'Wie teile ich meine Visitenkarte?',
  'Was ist im Freemium enthalten?',
]

export default function AIHelpChat() {
  const [open, setOpen] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [showPulse, setShowPulse] = useState(false)

  useEffect(() => {
    const key = 'pm_ai_pulse_count'
    const count = parseInt(localStorage.getItem(key) || '0', 10)
    if (count < 3) {
      setShowPulse(true)
      localStorage.setItem(key, String(count + 1))
      const timer = setTimeout(() => setShowPulse(false), 6000)
      return () => clearTimeout(timer)
    }
  }, [])
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hallo! Ich bin Ihr Pro-Meister KI-Assistent\n\nWie kann ich Ihnen helfen?' }
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
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/ai-help', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {})
        },
        body: JSON.stringify({ messages: newMessages.slice(1) }) // bez uvodne poruke
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply || 'Entschuldigung, bitte versuchen Sie es erneut.' }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Verbindungsfehler. Bitte versuchen Sie es erneut.' }])
    } finally {
      setLoading(false)
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
      <style>{`
        @keyframes pm-label-in { from { opacity: 0; transform: translateX(8px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes pm-pulse-ring {
          0% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.35); opacity: 0; }
          100% { transform: scale(1.35); opacity: 0; }
        }
        html.light-mode #pm-float-btn { background: #e2e8f0 !important; border-color: #cbd5e1 !important; box-shadow: 0 4px 16px rgba(0,0,0,0.15) !important; }
        html.light-mode #pm-label { background-color: #60a5fa !important; border-color: #93c5fd !important; }
        @media (hover: none) { #pm-label { display: none !important; } }
      `}</style>
      <div style={{ position: 'fixed', right: '24px', bottom: `${btnBottom}px`, zIndex: 50, display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Hilfe? label */}
        {hovered && !open && (
          <div id="pm-label" style={{ backgroundColor: '#1e293b', color: 'white', fontSize: '13px', fontWeight: 500, padding: '6px 12px', borderRadius: '20px', border: '1px solid #334155', whiteSpace: 'nowrap', animation: 'pm-label-in 0.15s ease-out', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
            KI-Hilfe
          </div>
        )}
        <div style={{ position: 'relative', width: '64px', height: '64px' }}>
          {showPulse && !open && (
            <>
              <div style={{ position: 'absolute', inset: '-4px', borderRadius: '50%', border: '2px solid #3b82f6', animation: 'pm-pulse-ring 2s ease-out infinite', pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', inset: '-4px', borderRadius: '50%', border: '2px solid #3b82f6', animation: 'pm-pulse-ring 2s ease-out infinite 0.6s', pointerEvents: 'none' }} />
            </>
          )}
          <button
            onClick={() => { setOpen(v => !v); setShowPulse(false) }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            id="pm-float-btn"
            style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#64748b', boxShadow: '0 4px 16px rgba(0,0,0,0.4)', border: '1px solid #94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.2s, box-shadow 0.2s' }}
            onMouseOver={e => e.currentTarget.style.transform = 'scale(1.07)'}
            onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
            title="KI-Assistent"
          >
            <div style={{ transition: 'transform 0.3s', transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}>
              {open ? (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <line x1="4" y1="4" x2="16" y2="16" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round"/>
                  <line x1="16" y1="4" x2="4" y2="16" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
              ) : (
                <img src="/floatrobot.png" width={44} height={44} alt="KI-Assistent" style={{ objectFit: 'contain' }} />
              )}
            </div>
          </button>
        </div>
      </div>

      {/* Chat Window — inline stilovi da light mode ne utiče */}
      {open && (
        <div className="fixed right-6 z-50 w-80 sm:w-96" style={{ bottom: `${chatBottom}px` }}>

          <div className="rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            style={{ height: `${chatHeight}px`, backgroundColor: '#0f172a', border: '1px solid #334155' }}>

          {/* Header */}
          <div style={{ backgroundColor: '#1d4ed8', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            <img src="/floatrobot.png" width={32} height={32} alt="KI" style={{ objectFit: 'contain' }} />
            <div>
              <p style={{ color: 'white', fontWeight: 600, fontSize: '14px', lineHeight: '1.2' }}>Pro-Meister KI-Assistent</p>
              <p style={{ color: '#bfdbfe', fontSize: '12px' }}>KI-gestützte Hilfe</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', alignItems: 'flex-start', gap: '6px' }}>
                {m.role === 'assistant' && (
                  <div style={{ flexShrink: 0, marginTop: '4px', width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #2563eb, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img src="/floatrobot.png" width={22} height={22} alt="KI" style={{ objectFit: 'contain' }} />
                  </div>
                )}
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
                onMouseDown={(e) => e.preventDefault()}
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
