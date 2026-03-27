// app/dashboard/team/[workerId]/page.js — Owner views worker details (conversations-based)
'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function compressImage(file, maxWidth = 1920, quality = 0.8) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      let w = img.width, h = img.height
      if (w > maxWidth) { h = (maxWidth / w) * h; w = maxWidth }
      canvas.width = w; canvas.height = h
      canvas.getContext('2d').drawImage(img, 0, 0, w, h)
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality)
    }
    img.src = URL.createObjectURL(file)
  })
}

export default function WorkerDetailPage() {
  const { workerId } = useParams()
  const router = useRouter()
  const [member, setMember] = useState(null)
  const [timeEntries, setTimeEntries] = useState([])
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('time') // time, offen, erledigt
  const [expandedConv, setExpandedConv] = useState(null)
  const [fullImage, setFullImage] = useState(null)

  // New conversation form
  const [showNewForm, setShowNewForm] = useState(false)
  const [newText, setNewText] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [newLocation, setNewLocation] = useState('')
  const [newDueDate, setNewDueDate] = useState('')
  const [showTaskFields, setShowTaskFields] = useState(false)
  const [newFiles, setNewFiles] = useState([])
  const [newPreviews, setNewPreviews] = useState([])
  const [sending, setSending] = useState(false)
  const newFileRef = useRef(null)

  // Reply
  const [replyText, setReplyText] = useState('')
  const [replyFiles, setReplyFiles] = useState([])
  const [replyPreviews, setReplyPreviews] = useState([])
  const [replying, setReplying] = useState(false)
  const [replyTo, setReplyTo] = useState(null)
  const replyFileRef = useRef(null)

  useEffect(() => {
    loadData()
    const channel = supabase
      .channel(`owner-worker-${workerId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'work_times' }, () => loadData())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [workerId])

  const getHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return { Authorization: `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' }
  }

  const getAuthHeader = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return { Authorization: `Bearer ${session?.access_token}` }
  }

  const loadData = async () => {
    try {
      const headers = await getHeaders()

      // Member info
      const teamRes = await fetch('/api/team', { headers })
      const teamJson = await teamRes.json()
      const found = teamJson.members?.find(m => m.worker_id === workerId || m.id === workerId)
      setMember(found)

      // Time entries
      const timeRes = await fetch(`/api/team/time?worker_id=${workerId}`, { headers })
      const timeJson = await timeRes.json()
      if (timeJson.entries) setTimeEntries(timeJson.entries)

      // Conversations with this worker
      const convRes = await fetch(`/api/team/conversations?worker_id=${workerId}`, { headers })
      const convJson = await convRes.json()
      if (convJson.conversations) {
        // Fetch messages for each conversation
        const enriched = await Promise.all(
          convJson.conversations.map(async (conv) => {
            const msgRes = await fetch(`/api/team/conversations/${conv.id}`, { headers })
            const msgJson = await msgRes.json()
            return { ...conv, messages: msgJson.messages || [] }
          })
        )
        setConversations(enriched)
      }
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  // Create new conversation
  const handleNewConversation = async () => {
    if (!newText.trim()) return
    setSending(true)
    try {
      const headers = await getHeaders()
      const res = await fetch('/api/team/conversations', {
        method: 'POST', headers,
        body: JSON.stringify({
          worker_id: workerId,
          text: newText.trim(),
          title: showTaskFields ? newTitle.trim() || null : null,
          location: showTaskFields ? newLocation.trim() || null : null,
          due_date: showTaskFields ? newDueDate || null : null,
        })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)

      if (newFiles.length > 0 && json.message) {
        const authHeader = await getAuthHeader()
        for (const file of newFiles) {
          const compressed = await compressImage(file)
          const formData = new FormData()
          formData.append('photo', compressed, `photo_${Date.now()}.jpg`)
          formData.append('message_id', json.message.id)
          await fetch(`/api/team/conversations/${json.conversation.id}/messages`, {
            method: 'PUT', headers: authHeader, body: formData
          })
        }
      }

      setNewText(''); setNewTitle(''); setNewLocation(''); setNewDueDate('')
      setNewFiles([]); setNewPreviews([]); setShowNewForm(false); setShowTaskFields(false)
      await loadData()
    } catch (err) { alert(err.message) }
    finally { setSending(false) }
  }

  // Reply
  const handleReply = async (conversationId) => {
    if (!replyText.trim() && replyFiles.length === 0) return
    setReplying(true)
    try {
      const headers = await getHeaders()
      const res = await fetch(`/api/team/conversations/${conversationId}/messages`, {
        method: 'POST', headers,
        body: JSON.stringify({ text: replyText.trim() || '📸 Foto' })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)

      if (replyFiles.length > 0 && json.message) {
        const authHeader = await getAuthHeader()
        for (const file of replyFiles) {
          const compressed = await compressImage(file)
          const formData = new FormData()
          formData.append('photo', compressed, `photo_${Date.now()}.jpg`)
          formData.append('message_id', json.message.id)
          await fetch(`/api/team/conversations/${conversationId}/messages`, {
            method: 'PUT', headers: authHeader, body: formData
          })
        }
      }

      setReplyText(''); setReplyFiles([]); setReplyPreviews([]); setReplyTo(null)
      await loadData()
    } catch (err) { alert(err.message) }
    finally { setReplying(false) }
  }

  // Close / Archive / Reopen / Delete
  const handleAction = async (convId, action) => {
    if (action === 'delete' && !confirm('Konversation wirklich löschen?')) return
    try {
      const headers = await getHeaders()
      if (action === 'delete') {
        await fetch(`/api/team/conversations/${convId}`, { method: 'DELETE', headers })
      } else {
        await fetch(`/api/team/conversations/${convId}`, {
          method: 'PATCH', headers,
          body: JSON.stringify({ status: action })
        })
      }
      await loadData()
    } catch (err) { console.error(err) }
  }

  const formatClock = (iso) => new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  const formatDate = (iso) => new Date(iso).toLocaleDateString('de-DE')
  const formatDuration = (start, end) => {
    const ms = new Date(end).getTime() - new Date(start).getTime()
    const h = Math.floor(ms / 3600000)
    const m = Math.floor((ms % 3600000) / 60000)
    return `${h}h ${m}m`
  }

  if (loading) {
    return <div className="max-w-3xl mx-auto p-6"><div className="animate-spin rounded-full h-8 w-8 border-4 border-purple-500 border-t-transparent mx-auto"></div></div>
  }

  if (!member) {
    return (
      <div className="max-w-3xl mx-auto p-6 text-center">
        <p className="text-slate-400">Mitarbeiter nicht gefunden</p>
        <button onClick={() => router.push('/dashboard/team')} className="mt-4 text-blue-400 hover:underline">Zurück zum Team</button>
      </div>
    )
  }

  const runningEntry = timeEntries.find(e => e.status === 'running')
  const completedEntries = timeEntries.filter(e => e.status === 'completed')
  const openConvs = conversations.filter(c => c.status === 'open')
  const closedConvs = conversations.filter(c => c.status === 'closed')

  // Group time entries by date
  const entriesByDate = {}
  completedEntries.forEach(e => {
    const date = formatDate(e.start_time)
    if (!entriesByDate[date]) entriesByDate[date] = []
    entriesByDate[date].push(e)
  })

  // Conversation card renderer
  const ConvCard = ({ conv }) => {
    const isExpanded = expandedConv === conv.id
    const isOpen = conv.status === 'open'

    return (
      <div className={`border rounded-xl overflow-hidden ${
        conv.status === 'closed' ? 'bg-slate-800/30 border-slate-700/50' :
        conv.title ? 'bg-slate-800/50 border-blue-500/30' : 'bg-slate-800/50 border-slate-700'
      }`}>
        {/* Header */}
        <div className="p-4 cursor-pointer" onClick={() => setExpandedConv(isExpanded ? null : conv.id)}>
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ${
              conv.started_by === conv.owner_id ? 'bg-purple-600' : 'bg-orange-600'
            }`}>
              {conv.started_by === conv.owner_id ? '👔' : '👷'}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-white font-medium text-sm">
                {conv.started_by === conv.owner_id ? 'Sie' : member.worker_name}
              </span>
              <span className="text-slate-500 text-xs ml-2">{formatClock(conv.last_message_at || conv.created_at)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              {conv.title && <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-0.5 rounded">📋</span>}
              {conv.status === 'closed' && <span className="bg-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded">Erledigt</span>}
              {conv.started_by !== conv.owner_id && isOpen && <span className="bg-orange-500/20 text-orange-400 text-xs px-2 py-0.5 rounded">Eingang</span>}
              <span className="text-slate-500 text-xs">{conv.message_count} 💬</span>
              <span className="text-slate-500">{isExpanded ? '▲' : '▼'}</span>
            </div>
          </div>
          {conv.title && <p className="text-blue-400 text-sm font-medium ml-9">{conv.title}</p>}
          {(conv.location || conv.due_date) && (
            <p className="text-slate-500 text-xs ml-9">
              {conv.location && `📍 ${conv.location}`}
              {conv.location && conv.due_date && ' · '}
              {conv.due_date && `📅 ${new Date(conv.due_date).toLocaleDateString('de-DE')}`}
            </p>
          )}
          {!isExpanded && conv.messages?.[0] && (
            <p className="text-slate-400 text-sm ml-9 mt-1 truncate">{conv.messages[0].text}</p>
          )}
        </div>

        {/* Expanded */}
        {isExpanded && (
          <div className="border-t border-slate-700/50">
            <div className="p-3 space-y-2 max-h-80 overflow-y-auto">
              {(conv.messages || []).map(msg => {
                const isOwner = msg.sender_id === conv.owner_id
                return (
                  <div key={msg.id} className={`rounded-lg p-2.5 ${
                    isOwner ? 'bg-purple-900/20 border-l-2 border-purple-500 ml-4' : 'bg-slate-900/40 border-l-2 border-orange-500 mr-4'
                  }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-semibold ${isOwner ? 'text-purple-400' : 'text-orange-400'}`}>
                        {isOwner ? '👔 Ich' : `👷 ${member.worker_name}`}
                      </span>
                      <span className="text-slate-500 text-xs">{formatClock(msg.created_at)}</span>
                    </div>
                    {msg.text && <p className="text-slate-300 text-sm">{msg.text}</p>}
                    {msg.photos?.length > 0 && (
                      <div className="grid grid-cols-3 gap-1.5 mt-1.5">
                        {msg.photos.map((p, i) => (
                          <img key={i} src={p.url} alt="" className="w-full h-16 object-cover rounded-lg cursor-pointer hover:opacity-80" onClick={(e) => { e.stopPropagation(); setFullImage(p.url) }} />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Reply (only if open) */}
            {isOpen && (
              <div className="p-3 border-t border-slate-700/50 space-y-2">
                {replyPreviews.length > 0 && replyTo === conv.id && (
                  <div className="grid grid-cols-4 gap-1.5">
                    {replyPreviews.map((url, i) => (
                      <div key={i} className="relative">
                        <img src={url} alt="" className="w-full h-14 object-cover rounded-lg" />
                        <button onClick={() => {
                          setReplyPreviews(prev => prev.filter((_, idx) => idx !== i))
                          setReplyFiles(prev => prev.filter((_, idx) => idx !== i))
                        }} className="absolute top-0.5 right-0.5 bg-red-600 text-white w-4 h-4 rounded-full text-xs leading-none">✕</button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <button onClick={() => { setReplyTo(conv.id); replyFileRef.current?.click() }}
                    className="px-2 py-2 bg-slate-700 text-slate-300 rounded-lg text-sm">📷</button>
                  <input type="text"
                    value={replyTo === conv.id ? replyText : ''}
                    onFocus={() => setReplyTo(conv.id)}
                    onChange={(e) => { setReplyTo(conv.id); setReplyText(e.target.value) }}
                    placeholder="Antworten..."
                    className="flex-1 px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500"
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleReply(conv.id)}
                  />
                  <button onClick={() => handleReply(conv.id)}
                    disabled={replying || ((!replyText.trim() || replyTo !== conv.id) && replyFiles.length === 0)}
                    className="px-3 py-2 bg-purple-600 text-white rounded-lg text-sm disabled:opacity-50">
                    {replying && replyTo === conv.id ? '...' : 'Senden'}
                  </button>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="px-3 pb-3 flex flex-wrap gap-2">
              {isOpen && (
                <>
                  <button onClick={() => handleAction(conv.id, 'closed')} className="text-xs text-green-400 bg-green-500/10 px-3 py-1.5 rounded-lg hover:bg-green-500/20">
                    ✓ Abschließen
                  </button>
                  <button onClick={() => handleAction(conv.id, 'archived')} className="text-xs text-slate-400 bg-slate-500/10 px-3 py-1.5 rounded-lg hover:bg-slate-500/20">
                    📥 Archivieren
                  </button>
                </>
              )}
              {conv.status === 'closed' && (
                <button onClick={() => handleAction(conv.id, 'open')} className="text-xs text-blue-400 bg-blue-500/10 px-3 py-1.5 rounded-lg hover:bg-blue-500/20">
                  ↩ Wieder öffnen
                </button>
              )}
              <button onClick={() => handleAction(conv.id, 'delete')} className="text-xs text-red-400 bg-red-500/10 px-3 py-1.5 rounded-lg hover:bg-red-500/20 ml-auto">
                🗑 Löschen
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {fullImage && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setFullImage(null)}>
          <img src={fullImage} alt="" className="max-w-full max-h-full object-contain" />
          <button className="absolute top-4 right-4 text-white text-3xl" onClick={() => setFullImage(null)}>✕</button>
        </div>
      )}

      {/* Hidden file inputs */}
      <input ref={newFileRef} type="file" accept="image/*" multiple capture="environment" onChange={(e) => {
        const files = Array.from(e.target.files || [])
        setNewFiles(prev => [...prev, ...files])
        files.forEach(f => setNewPreviews(prev => [...prev, URL.createObjectURL(f)]))
        if (newFileRef.current) newFileRef.current.value = ''
      }} className="hidden" />
      <input ref={replyFileRef} type="file" accept="image/*" multiple capture="environment" onChange={(e) => {
        const files = Array.from(e.target.files || [])
        setReplyFiles(prev => [...prev, ...files])
        files.forEach(f => setReplyPreviews(prev => [...prev, URL.createObjectURL(f)]))
        if (replyFileRef.current) replyFileRef.current.value = ''
      }} className="hidden" />

      {/* Header */}
      <button onClick={() => router.push('/dashboard/team')} className="text-slate-400 hover:text-white">← Zurück</button>

      <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 border border-purple-500/30 rounded-2xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-purple-600 rounded-full flex items-center justify-center text-2xl font-bold text-white">
            {member.worker_name?.charAt(0)?.toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{member.worker_name}</h1>
            <p className="text-slate-400 text-sm">
              {member.status === 'active' ? '🟢 Aktiv' : '🟡 Wartet'}
              {member.joined_at && ` · Seit ${formatDate(member.joined_at)}`}
            </p>
          </div>
          {runningEntry && (
            <div className="ml-auto bg-green-500/20 border border-green-500/30 rounded-lg px-4 py-2">
              <p className="text-green-400 text-sm font-semibold animate-pulse">⏱️ Arbeitet seit {formatClock(runningEntry.start_time)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { key: 'time', label: '⏱️ Zeiterfassung' },
          { key: 'offen', label: `📋 Offen (${openConvs.length})` },
          { key: 'erledigt', label: `📝 Erledigt (${closedConvs.length})` },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              tab === t.key ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Time Tab */}
      {tab === 'time' && (
        <div className="space-y-4">
          {Object.keys(entriesByDate).length > 0 ? (
            Object.entries(entriesByDate).map(([date, entries]) => (
              <div key={date}>
                <h3 className="text-slate-400 text-sm font-semibold mb-2">{date}</h3>
                <div className="space-y-2">
                  {entries.map(entry => (
                    <div key={entry.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex items-center justify-between">
                      <div>
                        <p className="text-white">{formatClock(entry.start_time)} — {formatClock(entry.end_time)}</p>
                        {entry.start_lat && (
                          <p className="text-slate-500 text-xs mt-1">
                            GPS: {Number(entry.start_lat).toFixed(4)}, {Number(entry.start_lng).toFixed(4)}
                          </p>
                        )}
                      </div>
                      <p className="text-green-400 font-bold">{formatDuration(entry.start_time, entry.end_time)}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <p className="text-slate-500 text-center py-8">Noch keine Zeiteinträge</p>
          )}
        </div>
      )}

      {/* Offen Tab */}
      {tab === 'offen' && (
        <div className="space-y-4">
          {/* New conversation */}
          {!showNewForm ? (
            <button
              onClick={() => setShowNewForm(true)}
              className="w-full py-3 border-2 border-dashed border-slate-600 rounded-xl text-slate-400 hover:border-purple-500 hover:text-purple-400 transition-colors"
            >
              + Neue Nachricht an {member.worker_name}
            </button>
          ) : (
            <div className="bg-slate-800/50 border border-purple-500/30 rounded-xl p-4 space-y-3">
              <button
                onClick={() => setShowTaskFields(!showTaskFields)}
                className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${showTaskFields ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'}`}
              >
                {showTaskFields ? '📋 Aufgabe (mit Details)' : '📋 Als Aufgabe markieren'}
              </button>
              {showTaskFields && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Titel" className="px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500" />
                  <input type="text" value={newLocation} onChange={(e) => setNewLocation(e.target.value)}
                    placeholder="Ort" className="px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500" />
                  <input type="date" value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)}
                    className="px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm" />
                </div>
              )}
              <textarea value={newText} onChange={(e) => setNewText(e.target.value)}
                placeholder="Nachricht..." rows={3} autoFocus
                className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder-slate-500 text-sm" />
              {newPreviews.length > 0 && (
                <div className="grid grid-cols-4 gap-2">
                  {newPreviews.map((url, i) => (
                    <div key={i} className="relative">
                      <img src={url} alt="" className="w-full h-16 object-cover rounded-lg" />
                      <button onClick={() => {
                        setNewPreviews(prev => prev.filter((_, idx) => idx !== i))
                        setNewFiles(prev => prev.filter((_, idx) => idx !== i))
                      }} className="absolute top-0.5 right-0.5 bg-red-600 text-white w-5 h-5 rounded-full text-xs">✕</button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={() => newFileRef.current?.click()} className="px-3 py-2 bg-slate-700 text-slate-300 rounded-lg text-sm">📷 Foto</button>
                <button onClick={handleNewConversation} disabled={sending || !newText.trim()}
                  className="flex-1 py-2 bg-purple-600 text-white rounded-lg font-semibold disabled:opacity-50">
                  {sending ? '...' : '📤 Senden'}
                </button>
                <button onClick={() => { setShowNewForm(false); setNewText(''); setNewFiles([]); setNewPreviews([]); setShowTaskFields(false) }}
                  className="px-3 py-2 bg-slate-700 text-slate-300 rounded-lg text-sm">Abbrechen</button>
              </div>
            </div>
          )}

          {openConvs.length > 0 ? (
            <div className="space-y-3">
              {openConvs.map(conv => <ConvCard key={conv.id} conv={conv} />)}
            </div>
          ) : !showNewForm && (
            <p className="text-slate-500 text-center py-8">Keine offenen Konversationen</p>
          )}
        </div>
      )}

      {/* Erledigt Tab */}
      {tab === 'erledigt' && (
        <div className="space-y-3">
          {closedConvs.length > 0 ? (
            closedConvs.map(conv => <ConvCard key={conv.id} conv={conv} />)
          ) : (
            <p className="text-slate-500 text-center py-8">Keine abgeschlossenen Konversationen</p>
          )}
        </div>
      )}
    </div>
  )
}
