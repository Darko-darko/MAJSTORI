// app/dashboard/worker/feed/page.js — Worker Feed: conversations with chef
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

export default function WorkerFeedPage() {
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)
  const PAGE_SIZE = 20
  const [fullImage, setFullImage] = useState(null)
  const [userId, setUserId] = useState(null)
  const feedEndRef = useRef(null)

  // New message form
  const [showNewForm, setShowNewForm] = useState(false)
  const [newText, setNewText] = useState('')
  const [newFiles, setNewFiles] = useState([])
  const [newPreviews, setNewPreviews] = useState([])
  const [sending, setSending] = useState(false)
  const newCameraRef = useRef(null)
  const newGalleryRef = useRef(null)
  const [showNewPhotoPicker, setShowNewPhotoPicker] = useState(false)

  // Reply state
  const [replyTo, setReplyTo] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [replyFiles, setReplyFiles] = useState([])
  const [replyPreviews, setReplyPreviews] = useState([])
  const [replying, setReplying] = useState(false)
  const replyCameraRef = useRef(null)
  const replyGalleryRef = useRef(null)
  const [showReplyPhotoPicker, setShowReplyPhotoPicker] = useState(false)

  // Expanded conversation
  const searchParams = useSearchParams()
  const convParam = searchParams.get('conv')
  const [expandedConv, setExpandedConv] = useState(convParam || null)

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

    const channel = supabase
      .channel('worker-feed-v2')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => loadFeed())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => loadFeed())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'work_times' }, () => loadFeed())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const getHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!userId && session?.user?.id) setUserId(session.user.id)
    return { Authorization: `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' }
  }

  const getAuthHeader = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return { Authorization: `Bearer ${session?.access_token}` }
  }

  const loadFeed = async (reset = true) => {
    try {
      const headers = await getHeaders()
      const currentOffset = reset ? 0 : offset
      const res = await fetch(`/api/team/feed?limit=${PAGE_SIZE}&offset=${currentOffset}`, { headers })
      const json = await res.json()
      if (json.conversations) {
        if (reset) {
          setConversations(json.conversations)
          setOffset(PAGE_SIZE)
        } else {
          setConversations(prev => [...prev, ...json.conversations])
          setOffset(currentOffset + PAGE_SIZE)
        }
        setHasMore(json.hasMore || false)
      }
    } catch (err) { console.error(err) }
    finally { setLoading(false); setLoadingMore(false) }
  }

  const loadMore = async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    await loadFeed(false)
  }

  useEffect(() => {
    if (!feedEndRef.current) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && hasMore && !loadingMore) loadMore() },
      { threshold: 0.1 }
    )
    observer.observe(feedEndRef.current)
    return () => observer.disconnect()
  }, [hasMore, loadingMore])

  // Create new conversation (worker → chef)
  const handleNewMessage = async () => {
    if (!newText.trim() && newFiles.length === 0) return
    setSending(true)
    try {
      const headers = await getHeaders()
      const res = await fetch('/api/team/conversations', {
        method: 'POST', headers,
        body: JSON.stringify({ text: newText.trim() || '📸 Foto' })
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

      setNewText('')
      setNewFiles([])
      setNewPreviews([])
      setShowNewForm(false)
      await loadFeed()
    } catch (err) { alert(err.message) }
    finally { setSending(false) }
  }

  // Mark conversation as read
  const markRead = async (convId) => {
    try {
      const headers = await getHeaders()
      await fetch(`/api/team/conversations/${convId}`, {
        method: 'PATCH', headers,
        body: JSON.stringify({ mark_read: true })
      })
      setConversations(prev => prev.map(c => c.id === convId ? { ...c, unread_count: 0 } : c))
    } catch (err) { console.error(err) }
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

  const formatTime = (iso) => new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  const formatDate = (iso) => new Date(iso).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' })
  // Build feed items
  const feedItems = []
  conversations.forEach(c => {
    feedItems.push({ type: 'conversation', ...c, timestamp: c.last_message_at || c.created_at })
  })
  feedItems.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

  const byDate = {}
  feedItems.forEach(item => {
    const date = formatDate(item.timestamp)
    if (!byDate[date]) byDate[date] = []
    byDate[date].push(item)
  })

  if (loading) {
    return <div className="max-w-2xl mx-auto p-6"><div className="animate-spin rounded-full h-8 w-8 border-4 border-orange-500 border-t-transparent mx-auto"></div></div>
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

      {/* Hidden file inputs */}
      <input ref={newCameraRef} type="file" accept="image/*" multiple capture="environment" onChange={(e) => {
        const files = Array.from(e.target.files || [])
        setNewFiles(prev => [...prev, ...files])
        files.forEach(f => setNewPreviews(prev => [...prev, URL.createObjectURL(f)]))
        if (newCameraRef.current) newCameraRef.current.value = ''
        setShowNewForm(true)
        setShowNewPhotoPicker(false)
      }} className="hidden" />
      <input ref={newGalleryRef} type="file" accept="image/*" multiple onChange={(e) => {
        const files = Array.from(e.target.files || [])
        setNewFiles(prev => [...prev, ...files])
        files.forEach(f => setNewPreviews(prev => [...prev, URL.createObjectURL(f)]))
        if (newGalleryRef.current) newGalleryRef.current.value = ''
        setShowNewForm(true)
        setShowNewPhotoPicker(false)
      }} className="hidden" />
      <input ref={replyCameraRef} type="file" accept="image/*" multiple capture="environment" onChange={(e) => {
        const files = Array.from(e.target.files || [])
        setReplyFiles(prev => [...prev, ...files])
        files.forEach(f => setReplyPreviews(prev => [...prev, URL.createObjectURL(f)]))
        if (replyCameraRef.current) replyCameraRef.current.value = ''
      }} className="hidden" />
      <input ref={replyGalleryRef} type="file" accept="image/*" multiple onChange={(e) => {
        const files = Array.from(e.target.files || [])
        setReplyFiles(prev => [...prev, ...files])
        files.forEach(f => setReplyPreviews(prev => [...prev, URL.createObjectURL(f)]))
        if (replyGalleryRef.current) replyGalleryRef.current.value = ''
      }} className="hidden" />

      <h1 className="text-2xl font-bold text-white">Mein Feed</h1>

      {/* New message form */}
      {!showNewForm ? (
        <div className="flex gap-2">
          <button
            onClick={() => setShowNewForm(true)}
            className="flex-1 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-xl font-bold hover:from-orange-500 hover:to-amber-500 transition-all"
          >
            💬 Neue Nachricht
          </button>
          <div className="relative">
            <button
              onClick={() => setShowNewPhotoPicker(!showNewPhotoPicker)}
              className="px-4 py-3 bg-slate-700 text-white rounded-xl font-bold hover:bg-slate-600 transition-colors"
            >
              📷
            </button>
            {showNewPhotoPicker && (
              <div className="absolute bottom-full right-0 mb-1 bg-slate-700 border border-slate-600 rounded-lg shadow-lg overflow-hidden z-20">
                <button onClick={() => { newCameraRef.current?.click(); setShowNewPhotoPicker(false) }} className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-white hover:bg-slate-600 transition-colors">
                  📸 Kamera
                </button>
                <button onClick={() => { newGalleryRef.current?.click(); setShowNewPhotoPicker(false) }} className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-white hover:bg-slate-600 transition-colors border-t border-slate-600">
                  🖼️ Galerie
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-slate-800/50 border border-orange-500/30 rounded-xl p-4 space-y-3">
          <textarea
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="Nachricht an den Chef..."
            rows={3}
            className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder-slate-500 text-sm"
            autoFocus
          />
          {newPreviews.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {newPreviews.map((url, i) => (
                <div key={i} className="relative">
                  <img src={url} alt="" className="w-full h-20 object-cover rounded-lg" />
                  <button onClick={() => {
                    setNewPreviews(prev => prev.filter((_, idx) => idx !== i))
                    setNewFiles(prev => prev.filter((_, idx) => idx !== i))
                  }} className="absolute top-0.5 right-0.5 bg-red-600 text-white w-5 h-5 rounded-full text-xs">✕</button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <div className="relative">
              <button onClick={() => setShowNewPhotoPicker(!showNewPhotoPicker)} className="px-3 py-2 bg-slate-700 text-slate-300 rounded-lg text-sm">
                📷 Foto
              </button>
              {showNewPhotoPicker && (
                <div className="absolute bottom-full left-0 mb-1 bg-slate-700 border border-slate-600 rounded-lg shadow-lg overflow-hidden z-20">
                  <button onClick={() => { newCameraRef.current?.click(); setShowNewPhotoPicker(false) }} className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-white hover:bg-slate-600 transition-colors">
                    📸 Kamera
                  </button>
                  <button onClick={() => { newGalleryRef.current?.click(); setShowNewPhotoPicker(false) }} className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-white hover:bg-slate-600 transition-colors border-t border-slate-600">
                    🖼️ Galerie
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={handleNewMessage}
              disabled={sending || (!newText.trim() && newFiles.length === 0)}
              className="flex-1 py-2 bg-orange-600 text-white rounded-lg font-semibold disabled:opacity-50"
            >
              {sending ? '...' : '📤 Senden'}
            </button>
            <button onClick={() => { setShowNewForm(false); setNewText(''); setNewFiles([]); setNewPreviews([]) }}
              className="px-3 py-2 bg-slate-700 text-slate-300 rounded-lg text-sm">Abbrechen</button>
          </div>
        </div>
      )}

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
                        : item.started_by === item.owner_id
                          ? 'bg-slate-800/50 border-purple-500/30'
                          : 'bg-slate-800/50 border-orange-500/30'
                    }`}>
                      {/* Header */}
                      <div
                        className="p-4 cursor-pointer"
                        onClick={() => {
                          const opening = expandedConv !== item.id
                          setExpandedConv(opening ? item.id : null)
                          if (opening && item.unread_count > 0) markRead(item.id)
                        }}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                            item.started_by === item.owner_id ? 'bg-purple-600' : 'bg-orange-600'
                          }`}>
                            {item.started_by === item.owner_id ? '👔' : '👷'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-white font-medium text-sm">
                              {item.started_by === item.owner_id ? 'Chef' : 'Ich'}
                            </span>
                            <span className="text-slate-500 text-xs ml-2">{formatTime(item.last_message_at || item.created_at)}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {item.title && <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-0.5 rounded">📋</span>}
                            {item.status === 'closed' && <span className="bg-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded">Erledigt</span>}
                            {item.unread_count > 0 && (
                              <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse min-w-[20px] text-center">{item.unread_count}</span>
                            )}
                            <span className="bg-purple-500/20 text-purple-400 text-xs font-semibold px-2 py-0.5 rounded-full border border-purple-500/30">{item.message_count} 💬</span>
                          </div>
                        </div>

                        {item.title && <p className="text-blue-400 text-sm font-medium ml-10">{item.title}</p>}
                        {(item.location || item.due_date) && (
                          <p className="text-slate-500 text-xs ml-10">
                            {item.location && `📍 ${item.location}`}
                            {item.location && item.due_date && ' · '}
                            {item.due_date && `📅 ${new Date(item.due_date).toLocaleDateString('de-DE')}`}
                          </p>
                        )}

                        {expandedConv !== item.id && item.messages?.[0] && (
                          <p className="text-slate-400 text-sm ml-10 mt-1 truncate">{item.messages[0].text}</p>
                        )}
                      </div>

                      {/* Expanded messages */}
                      {expandedConv === item.id && (
                        <div className="border-t border-slate-700/50">
                          <div className="p-3 space-y-2 max-h-96 overflow-y-auto" ref={el => {
                            if (el) setTimeout(() => el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' }), 50)
                          }}>
                            {(item.messages || []).map(msg => {
                              const isChef = msg.sender_id === item.owner_id
                              return (
                                <div key={msg.id} className={`rounded-lg p-2.5 ${
                                  isChef ? 'bg-purple-900/20 border-l-2 border-purple-500 ml-4' : 'bg-slate-900/40 border-l-2 border-orange-500 mr-4'
                                }`}>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-xs font-semibold ${isChef ? 'text-purple-400' : 'text-orange-400'}`}>
                                      {isChef ? '👔 Chef' : '👷 Ich'}
                                    </span>
                                    <span className="text-slate-500 text-xs">{formatTime(msg.created_at)}</span>
                                    {!isChef && item.owner_read_at && new Date(item.owner_read_at) >= new Date(msg.created_at) && (
                                      <span className="text-blue-400 text-xs" title="Gelesen">✓✓</span>
                                    )}
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

                          {/* Reply (only if open) */}
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
                                <div className="relative">
                                  <button onClick={() => { setReplyTo(item.id); setShowReplyPhotoPicker(!showReplyPhotoPicker) }}
                                    className="px-2 py-2 bg-slate-700 text-slate-300 rounded-lg text-sm">📷</button>
                                  {showReplyPhotoPicker && replyTo === item.id && (
                                    <div className="absolute bottom-full left-0 mb-1 bg-slate-700 border border-slate-600 rounded-lg shadow-lg overflow-hidden z-20">
                                      <button onClick={() => { replyCameraRef.current?.click(); setShowReplyPhotoPicker(false) }} className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-white hover:bg-slate-600 transition-colors">
                                        📸 Kamera
                                      </button>
                                      <button onClick={() => { replyGalleryRef.current?.click(); setShowReplyPhotoPicker(false) }} className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-white hover:bg-slate-600 transition-colors border-t border-slate-600">
                                        🖼️ Galerie
                                      </button>
                                    </div>
                                  )}
                                </div>
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
                                  className="px-3 py-2 bg-orange-600 text-white rounded-lg text-sm disabled:opacity-50"
                                >
                                  {replying && replyTo === item.id ? '...' : 'Senden'}
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Closed notice */}
                          {item.status === 'closed' && (
                            <div className="p-3 border-t border-slate-700/50 text-center">
                              <span className="text-slate-500 text-xs">✓ Konversation abgeschlossen</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                </div>
              ))}
            </div>
          </div>
        ))
      ) : !loading && (
        <div className="text-center py-12 text-slate-500">
          <p className="text-4xl mb-3">📡</p>
          <p>Noch keine Aktivitäten</p>
          <p className="text-sm mt-1">Senden Sie Fotos und Updates an Ihren Chef</p>
        </div>
      )}

      {/* Infinite scroll sentinel */}
      <div ref={feedEndRef} className="h-4" />
      {loadingMore && (
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-orange-500 border-t-transparent"></div>
        </div>
      )}
    </div>
  )
}
