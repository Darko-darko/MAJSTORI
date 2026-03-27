// app/dashboard/team/feed/page.js — Owner Feed: conversations + time entries
'use client'
import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
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

export default function FeedPage() {
  const [conversations, setConversations] = useState([])
  const [workers, setWorkers] = useState([])
  const [loading, setLoading] = useState(true)
  const [fullImage, setFullImage] = useState(null)

  // New conversation form
  const [showNewForm, setShowNewForm] = useState(false)
  const [newWorkerId, setNewWorkerId] = useState('')
  const [newText, setNewText] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [newLocation, setNewLocation] = useState('')
  const [newDueDate, setNewDueDate] = useState('')
  const [showTaskFields, setShowTaskFields] = useState(false)
  const [newFiles, setNewFiles] = useState([])
  const [newPreviews, setNewPreviews] = useState([])
  const [sending, setSending] = useState(false)
  const newFileRef = useRef(null)

  // Reply state per conversation
  const [replyTo, setReplyTo] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [replyFiles, setReplyFiles] = useState([])
  const [replyPreviews, setReplyPreviews] = useState([])
  const [replying, setReplying] = useState(false)
  const replyFileRef = useRef(null)

  // Expanded conversation
  const searchParams = useSearchParams()
  const convParam = searchParams.get('conv')
  const [expandedConv, setExpandedConv] = useState(convParam || null)

  // Filter
  const [filter, setFilter] = useState('all') // 'all', 'open', 'closed'

  // Scroll to conversation from URL param
  useEffect(() => {
    if (convParam && !loading) {
      setTimeout(() => {
        const el = document.getElementById(`conv-${convParam}`)
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 100)
    }
  }, [convParam, loading])

  useEffect(() => {
    loadFeed()
    loadWorkers()

    const channel = supabase
      .channel('owner-feed-v2')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => loadFeed())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => loadFeed())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'work_times' }, () => loadFeed())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const getHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return { Authorization: `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' }
  }

  const getAuthHeader = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return { Authorization: `Bearer ${session?.access_token}` }
  }

  const loadFeed = async () => {
    try {
      const headers = await getHeaders()
      const res = await fetch('/api/team/feed', { headers })
      const json = await res.json()
      if (json.conversations) setConversations(json.conversations)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const loadWorkers = async () => {
    try {
      const headers = await getHeaders()
      const res = await fetch('/api/team', { headers })
      const json = await res.json()
      if (json.members) {
        setWorkers(json.members.filter(m => m.status === 'active'))
      }
    } catch (err) { console.error(err) }
  }

  // Create new conversation
  const handleNewConversation = async () => {
    if (!newWorkerId || !newText.trim()) return
    setSending(true)
    try {
      const headers = await getHeaders()
      const res = await fetch('/api/team/conversations', {
        method: 'POST', headers,
        body: JSON.stringify({
          worker_id: newWorkerId,
          text: newText.trim(),
          title: showTaskFields ? newTitle.trim() || null : null,
          location: showTaskFields ? newLocation.trim() || null : null,
          due_date: showTaskFields ? newDueDate || null : null,
        })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)

      // Upload photos
      if (newFiles.length > 0 && json.message) {
        const authHeader = await getAuthHeader()
        for (const file of newFiles) {
          const compressed = await compressImage(file)
          const formData = new FormData()
          formData.append('photo', compressed, `photo_${Date.now()}.jpg`)
          formData.append('message_id', json.message.id)
          await fetch(`/api/team/conversations/${json.conversation.id}/messages`, {
            method: 'PUT',
            headers: authHeader,
            body: formData
          })
        }
      }

      // Reset form
      setNewText('')
      setNewTitle('')
      setNewLocation('')
      setNewDueDate('')
      setNewWorkerId('')
      setNewFiles([])
      setNewPreviews([])
      setShowNewForm(false)
      setShowTaskFields(false)
      await loadFeed()
    } catch (err) { alert(err.message) }
    finally { setSending(false) }
  }

  // Reply to conversation
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

      // Upload reply photos
      if (replyFiles.length > 0 && json.message) {
        const authHeader = await getAuthHeader()
        for (const file of replyFiles) {
          const compressed = await compressImage(file)
          const formData = new FormData()
          formData.append('photo', compressed, `photo_${Date.now()}.jpg`)
          formData.append('message_id', json.message.id)
          await fetch(`/api/team/conversations/${conversationId}/messages`, {
            method: 'PUT',
            headers: authHeader,
            body: formData
          })
        }
      }

      setReplyText('')
      setReplyFiles([])
      setReplyPreviews([])
      setReplyTo(null)
      await loadFeed()
    } catch (err) { alert(err.message) }
    finally { setReplying(false) }
  }

  // Close conversation
  const handleClose = async (convId) => {
    try {
      const headers = await getHeaders()
      await fetch(`/api/team/conversations/${convId}`, {
        method: 'PATCH', headers,
        body: JSON.stringify({ status: 'closed' })
      })
      await loadFeed()
    } catch (err) { console.error(err) }
  }

  // Reopen conversation
  const handleReopen = async (convId) => {
    try {
      const headers = await getHeaders()
      await fetch(`/api/team/conversations/${convId}`, {
        method: 'PATCH', headers,
        body: JSON.stringify({ status: 'open' })
      })
      await loadFeed()
    } catch (err) { console.error(err) }
  }

  // Archive conversation (hide from Offen, keep in Feed)
  const handleArchive = async (convId) => {
    try {
      const headers = await getHeaders()
      await fetch(`/api/team/conversations/${convId}`, {
        method: 'PATCH', headers,
        body: JSON.stringify({ status: 'archived' })
      })
      await loadFeed()
    } catch (err) { console.error(err) }
  }

  // Delete conversation
  const handleDelete = async (convId) => {
    if (!confirm('Konversation wirklich löschen?')) return
    try {
      const headers = await getHeaders()
      await fetch(`/api/team/conversations/${convId}`, {
        method: 'DELETE', headers,
      })
      await loadFeed()
    } catch (err) { console.error(err) }
  }

  const formatTime = (iso) => new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  const formatDate = (iso) => new Date(iso).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' })
  // Build feed items sorted by timestamp
  const feedItems = []

  const filteredConversations = conversations.filter(c => {
    if (filter === 'open') return c.status === 'open'
    if (filter === 'closed') return c.status === 'closed'
    if (filter === 'archived') return c.status === 'archived'
    return true // 'all' shows everything including archived
  })

  filteredConversations.forEach(c => {
    feedItems.push({ type: 'conversation', ...c, timestamp: c.last_message_at || c.created_at })
  })

  feedItems.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

  // Group by date
  const byDate = {}
  feedItems.forEach(item => {
    const date = formatDate(item.timestamp)
    if (!byDate[date]) byDate[date] = []
    byDate[date].push(item)
  })

  if (loading) {
    return <div className="max-w-2xl mx-auto p-6"><div className="animate-spin rounded-full h-8 w-8 border-4 border-purple-500 border-t-transparent mx-auto"></div></div>
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Fullscreen image */}
      {fullImage && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setFullImage(null)}>
          <img src={fullImage} alt="" className="max-w-full max-h-full object-contain" />
          <button className="absolute top-4 right-4 text-white text-3xl" onClick={() => setFullImage(null)}>✕</button>
        </div>
      )}

      {/* Header + New button */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Team Feed</h1>
        <button
          onClick={() => setShowNewForm(!showNewForm)}
          className="px-4 py-2 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-500 transition-colors"
        >
          + Neue Nachricht
        </button>
      </div>

      {/* New conversation form */}
      {showNewForm && (
        <div className="bg-slate-800/50 border border-purple-500/30 rounded-xl p-4 space-y-3">
          {/* Worker select */}
          <select
            value={newWorkerId}
            onChange={(e) => setNewWorkerId(e.target.value)}
            className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl text-white text-sm"
          >
            <option value="">Mitarbeiter auswählen...</option>
            {workers.map(w => (
              <option key={w.worker_id} value={w.worker_id}>{w.worker_name}</option>
            ))}
          </select>

          {/* Task fields toggle */}
          <button
            onClick={() => setShowTaskFields(!showTaskFields)}
            className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${showTaskFields ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
          >
            {showTaskFields ? '📋 Aufgabe (mit Details)' : '📋 Als Aufgabe markieren'}
          </button>

          {/* Task fields */}
          {showTaskFields && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Titel (optional)"
                className="px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500"
              />
              <input
                type="text"
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                placeholder="Ort (optional)"
                className="px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500"
              />
              <input
                type="date"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                className="px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm"
              />
            </div>
          )}

          {/* Message text */}
          <textarea
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="Nachricht schreiben..."
            rows={3}
            className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder-slate-500 text-sm"
          />

          {/* Photo previews */}
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

          {/* Actions */}
          <input ref={newFileRef} type="file" accept="image/*" multiple capture="environment" onChange={(e) => {
            const files = Array.from(e.target.files || [])
            setNewFiles(prev => [...prev, ...files])
            files.forEach(f => setNewPreviews(prev => [...prev, URL.createObjectURL(f)]))
            if (newFileRef.current) newFileRef.current.value = ''
          }} className="hidden" />

          <div className="flex gap-2">
            <button onClick={() => newFileRef.current?.click()} className="px-3 py-2 bg-slate-700 text-slate-300 rounded-lg text-sm">
              📷 Foto
            </button>
            <button
              onClick={handleNewConversation}
              disabled={sending || !newWorkerId || !newText.trim()}
              className="flex-1 py-2 bg-purple-600 text-white rounded-lg font-semibold disabled:opacity-50"
            >
              {sending ? '...' : '📤 Senden'}
            </button>
            <button onClick={() => { setShowNewForm(false); setNewText(''); setNewFiles([]); setNewPreviews([]); setShowTaskFields(false) }}
              className="px-3 py-2 bg-slate-700 text-slate-300 rounded-lg text-sm">Abbrechen</button>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2">
        {[
          { key: 'all', label: 'Alle' },
          { key: 'open', label: 'Offen' },
          { key: 'closed', label: 'Erledigt' },
          { key: 'archived', label: 'Archiv' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f.key ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Hidden file input for replies */}
      <input ref={replyFileRef} type="file" accept="image/*" multiple capture="environment" onChange={(e) => {
        const files = Array.from(e.target.files || [])
        setReplyFiles(prev => [...prev, ...files])
        files.forEach(f => setReplyPreviews(prev => [...prev, URL.createObjectURL(f)]))
        if (replyFileRef.current) replyFileRef.current.value = ''
      }} className="hidden" />

      {/* Feed */}
      {Object.keys(byDate).length > 0 ? (
        Object.entries(byDate).map(([date, items]) => (
          <div key={date}>
            <h2 className="text-slate-400 text-sm font-semibold mb-3 sticky top-0 bg-slate-900/80 backdrop-blur py-1 z-10">{date}</h2>
            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={item.id || idx} id={item.type === 'conversation' ? `conv-${item.id}` : undefined}>
                  {/* Conversation */}
                  {item.type === 'conversation' && (
                    <div className={`border rounded-xl overflow-hidden ${
                      item.status === 'closed'
                        ? 'bg-slate-800/30 border-slate-700/50'
                        : item.title ? 'bg-slate-800/50 border-blue-500/30' : 'bg-slate-800/50 border-slate-700'
                    }`}>
                      {/* Conversation header */}
                      <div
                        className="p-4 cursor-pointer"
                        onClick={() => setExpandedConv(expandedConv === item.id ? null : item.id)}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                            item.started_by === item.owner_id ? 'bg-purple-600' : 'bg-orange-600'
                          }`}>
                            {item.worker_name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-white font-medium text-sm">{item.worker_name}</span>
                            <span className="text-slate-500 text-xs ml-2">{formatTime(item.last_message_at || item.created_at)}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {item.title && <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-0.5 rounded">📋 Aufgabe</span>}
                            {item.status === 'closed' && <span className="bg-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded">Erledigt</span>}
                            {item.status === 'open' && item.started_by !== item.owner_id && <span className="bg-orange-500/20 text-orange-400 text-xs px-2 py-0.5 rounded">Eingang</span>}
                            <span className="text-slate-500 text-xs">{item.message_count} 💬</span>
                          </div>
                        </div>

                        {/* Title / Location / Due date */}
                        {item.title && <p className="text-blue-400 text-sm font-medium ml-10">{item.title}</p>}
                        {(item.location || item.due_date) && (
                          <p className="text-slate-500 text-xs ml-10">
                            {item.location && `📍 ${item.location}`}
                            {item.location && item.due_date && ' · '}
                            {item.due_date && `📅 ${new Date(item.due_date).toLocaleDateString('de-DE')}`}
                          </p>
                        )}

                        {/* First message preview (if not expanded) */}
                        {expandedConv !== item.id && item.messages?.[0] && (
                          <p className="text-slate-400 text-sm ml-10 mt-1 truncate">{item.messages[0].text}</p>
                        )}
                      </div>

                      {/* Expanded: all messages */}
                      {expandedConv === item.id && (
                        <div className="border-t border-slate-700/50">
                          <div className="p-3 space-y-2 max-h-96 overflow-y-auto">
                            {(item.messages || []).map(msg => {
                              const isOwner = msg.sender_id === item.owner_id
                              return (
                                <div key={msg.id} className={`rounded-lg p-2.5 ${
                                  isOwner ? 'bg-purple-900/20 border-l-2 border-purple-500 ml-4' : 'bg-slate-900/40 border-l-2 border-orange-500 mr-4'
                                }`}>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-xs font-semibold ${isOwner ? 'text-purple-400' : 'text-orange-400'}`}>
                                      {isOwner ? '👔 Ich' : `👷 ${item.worker_name}`}
                                    </span>
                                    <span className="text-slate-500 text-xs">{formatTime(msg.created_at)}</span>
                                  </div>
                                  {msg.text && <p className="text-slate-300 text-sm">{msg.text}</p>}
                                  {msg.photos?.length > 0 && (
                                    <div className="grid grid-cols-3 gap-1.5 mt-1.5">
                                      {msg.photos.map((p, i) => (
                                        <img key={i} src={p.url} alt="" className="w-full h-20 object-cover rounded-lg cursor-pointer hover:opacity-80" onClick={(e) => { e.stopPropagation(); setFullImage(p.url) }} />
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>

                          {/* Reply form (only if open) */}
                          {item.status === 'open' && (
                            <div className="p-3 border-t border-slate-700/50 space-y-2">
                              {replyPreviews.length > 0 && replyTo === item.id && (
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
                                <button onClick={() => { setReplyTo(item.id); replyFileRef.current?.click() }}
                                  className="px-2 py-2 bg-slate-700 text-slate-300 rounded-lg text-sm">📷</button>
                                <input
                                  type="text"
                                  value={replyTo === item.id ? replyText : ''}
                                  onFocus={() => setReplyTo(item.id)}
                                  onChange={(e) => { setReplyTo(item.id); setReplyText(e.target.value) }}
                                  placeholder="Antworten..."
                                  className="flex-1 px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500"
                                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleReply(item.id)}
                                />
                                <button
                                  onClick={() => handleReply(item.id)}
                                  disabled={replying || ((!replyText.trim() || replyTo !== item.id) && replyFiles.length === 0)}
                                  className="px-3 py-2 bg-purple-600 text-white rounded-lg text-sm disabled:opacity-50"
                                >
                                  {replying && replyTo === item.id ? '...' : 'Senden'}
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Actions */}
                          <div className="px-3 pb-3 flex flex-wrap gap-2">
                            {item.status === 'open' && (
                              <>
                                <button onClick={() => handleClose(item.id)} className="text-xs text-green-400 hover:text-green-300 bg-green-500/10 px-3 py-1.5 rounded-lg">
                                  ✓ Abschließen
                                </button>
                                <button onClick={() => handleArchive(item.id)} className="text-xs text-slate-400 hover:text-slate-300 bg-slate-500/10 px-3 py-1.5 rounded-lg">
                                  📥 Archivieren
                                </button>
                              </>
                            )}
                            {item.status === 'closed' && (
                              <button onClick={() => handleReopen(item.id)} className="text-xs text-blue-400 hover:text-blue-300 bg-blue-500/10 px-3 py-1.5 rounded-lg">
                                ↩ Wieder öffnen
                              </button>
                            )}
                            {item.status === 'archived' && (
                              <button onClick={() => handleReopen(item.id)} className="text-xs text-blue-400 hover:text-blue-300 bg-blue-500/10 px-3 py-1.5 rounded-lg">
                                ↩ Wieder öffnen
                              </button>
                            )}
                            <button onClick={() => handleDelete(item.id)} className="text-xs text-red-400 hover:text-red-300 bg-red-500/10 px-3 py-1.5 rounded-lg ml-auto">
                              🗑 Löschen
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              ))}
            </div>
          </div>
        ))
      ) : (
        <div className="text-center py-12 text-slate-500">
          <p className="text-4xl mb-3">📡</p>
          <p>Noch keine Aktivitäten</p>
          <p className="text-sm mt-1">Starten Sie eine Konversation mit Ihrem Team</p>
        </div>
      )}
    </div>
  )
}
