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
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)
  const PAGE_SIZE = 20
  const [fullImage, setFullImage] = useState(null)
  const feedEndRef = useRef(null)

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
  const newCameraRef = useRef(null)
  const newGalleryRef = useRef(null)
  const [showNewPhotoPicker, setShowNewPhotoPicker] = useState(false)

  // Reply state per conversation
  const [replyTo, setReplyTo] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [replyFiles, setReplyFiles] = useState([])
  const [replyPreviews, setReplyPreviews] = useState([])
  const [replying, setReplying] = useState(false)
  const replyCameraRef = useRef(null)
  const replyGalleryRef = useRef(null)
  const [showReplyPhotoPicker, setShowReplyPhotoPicker] = useState(false)

  const isMobile = typeof window !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)

  // Expanded conversation
  const searchParams = useSearchParams()
  const convParam = searchParams.get('conv')
  const [expandedConv, setExpandedConv] = useState(convParam || null)
  const expandedConvRef = useRef(expandedConv)
  useEffect(() => { expandedConvRef.current = expandedConv }, [expandedConv])

  // Active workers + today's completed
  const [activeWorkersList, setActiveWorkersList] = useState([])
  const [completedTodayList, setCompletedTodayList] = useState([])
  const [showActive, setShowActive] = useState(false)

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
    loadActiveWorkers()

    const channel = supabase
      .channel('owner-feed-v2')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => loadFeed())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (payload) => {
        const convId = payload.new?.conversation_id
        if (convId) {
          setExpandedConv(convId)
          if (document.visibilityState === 'visible') markRead(convId)
        }
        loadFeed()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'work_times' }, () => { loadFeed(); loadActiveWorkers() })
      .subscribe()

    // Mark read when tab becomes visible with expanded conversation
    const onVisible = () => {
      if (document.visibilityState === 'visible' && expandedConvRef.current) {
        markRead(expandedConvRef.current)
      }
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      supabase.removeChannel(channel)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  const getHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return { Authorization: `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' }
  }

  const getAuthHeader = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return { Authorization: `Bearer ${session?.access_token}` }
  }

  const loadActiveWorkers = async () => {
    try {
      const headers = await getHeaders()
      // Fetch without date filter — filter locally using local timezone
      const res = await fetch('/api/team/time', { headers })
      const json = await res.json()
      if (json.entries) {
        const teamRes = await fetch('/api/team', { headers })
        const teamJson = await teamRes.json()
        const nameMap = {}
        ;(teamJson.members || []).forEach(m => { if (m.worker_id) nameMap[m.worker_id] = m.worker_name })
        const enrich = (e) => ({ ...e, worker_name: nameMap[e.worker_id] || 'Mitarbeiter' })

        const todayLocal = new Date().toLocaleDateString('en-CA') // YYYY-MM-DD local
        const isToday = (iso) => new Date(iso).toLocaleDateString('en-CA') === todayLocal

        setActiveWorkersList(json.entries.filter(e => e.status === 'running').map(enrich))
        setCompletedTodayList(json.entries.filter(e => e.status === 'completed' && isToday(e.start_time)).map(enrich))
      }
    } catch (err) { console.error(err) }
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

  // Infinite scroll observer
  useEffect(() => {
    if (!feedEndRef.current) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && hasMore && !loadingMore) loadMore() },
      { threshold: 0.1 }
    )
    observer.observe(feedEndRef.current)
    return () => observer.disconnect()
  }, [hasMore, loadingMore])

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

  // Send conversation to one worker (+ photo uploads)
  const sendToWorker = async (workerId, headers, authHeader) => {
    const res = await fetch('/api/team/conversations', {
      method: 'POST', headers,
      body: JSON.stringify({
        worker_id: workerId,
        text: newText.trim(),
        title: showTaskFields ? newTitle.trim() || null : null,
        location: showTaskFields ? newLocation.trim() || null : null,
        due_date: showTaskFields ? newDueDate || null : null,
        is_broadcast: newWorkerId === '__all__' || undefined,
      })
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error)

    if (newFiles.length > 0 && json.message) {
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
    return json
  }

  // Create new conversation (single or broadcast)
  const handleNewConversation = async () => {
    if (!newWorkerId || !newText.trim()) return
    setSending(true)
    try {
      const headers = await getHeaders()
      const authHeader = await getAuthHeader()

      if (newWorkerId === '__all__') {
        // Broadcast: send to each worker
        for (const w of workers) {
          await sendToWorker(w.worker_id, headers, authHeader)
        }
      } else {
        await sendToWorker(newWorkerId, headers, authHeader)
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

  // Mark conversation as read
  const markRead = async (convId) => {
    try {
      const headers = await getHeaders()
      await fetch(`/api/team/conversations/${convId}`, {
        method: 'PATCH', headers,
        body: JSON.stringify({ mark_read: true })
      })
      // Update locally without full reload
      setConversations(prev => prev.map(c => c.id === convId ? { ...c, unread_count: 0 } : c))
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

      {/* Header */}
      <h1 className="text-2xl font-bold text-white">Team Feed</h1>

      {/* Workers time widget */}
      {workers.length > 0 && (() => {
        const activeIds = new Set(activeWorkersList.map(w => w.worker_id))
        const completedByWorker = {}
        completedTodayList.forEach(w => {
          if (!completedByWorker[w.worker_id]) completedByWorker[w.worker_id] = []
          completedByWorker[w.worker_id].push(w)
        })
        const inactiveWorkers = workers.filter(w => !activeIds.has(w.worker_id) && !completedByWorker[w.worker_id])

        return (
          <div className="bg-slate-800/50 border border-green-500/30 rounded-xl overflow-hidden">
            <button
              onClick={() => setShowActive(!showActive)}
              className="w-full px-4 py-2.5 flex items-center justify-between"
            >
              <span className="text-sm font-medium">
                {activeWorkersList.length > 0
                  ? <span className="text-green-400">🟢 {activeWorkersList.length} aktiv</span>
                  : <span className="text-slate-400">⏱️ Zeiterfassung</span>
                }
                {completedTodayList.length > 0 && <span className="text-slate-500"> · <span className="text-slate-400">{completedTodayList.length} abgeschlossen</span></span>}
                {inactiveWorkers.length > 0 && <span className="text-slate-500"> · {inactiveWorkers.length} inaktiv</span>}
              </span>
              <span className="text-slate-500 text-xs">{showActive ? '▲' : '▼'}</span>
            </button>
            {showActive && (
              <div className="px-4 pb-3 space-y-1.5">
                {/* Active workers */}
                {activeWorkersList.map(w => {
                  const elapsed = Date.now() - new Date(w.start_time).getTime()
                  const h = Math.floor(elapsed / 3600000)
                  const m = Math.floor((elapsed % 3600000) / 60000)
                  return (
                    <div key={w.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse flex-shrink-0"></span>
                        <span className="text-white light-invert-text">{w.worker_name}</span>
                        {w.start_lat ? (
                          <a href={`https://maps.google.com/?q=${w.start_lat},${w.start_lng}`} target="_blank" rel="noopener noreferrer"
                            className="text-blue-400 text-xs hover:underline" title="Startstandort">📍</a>
                        ) : (
                          <span className="text-slate-500 text-xs" title="Standort nicht verfügbar">📍</span>
                        )}
                      </div>
                      <span className="text-slate-400 text-xs">
                        seit {new Date(w.start_time).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                        <span className="text-green-400 ml-2 font-medium">{h}h {m}m</span>
                      </span>
                    </div>
                  )
                })}

                {/* Completed today */}
                {activeWorkersList.length > 0 && Object.keys(completedByWorker).length > 0 && (
                  <div className="border-t border-slate-700/50 my-1.5" />
                )}
                {Object.entries(completedByWorker).map(([wId, entries]) => (
                  entries.map(w => {
                    const ms = new Date(w.end_time).getTime() - new Date(w.start_time).getTime()
                    const h = Math.floor(ms / 3600000)
                    const m = Math.floor((ms % 3600000) / 60000)
                    const startTime = new Date(w.start_time).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
                    const endTime = new Date(w.end_time).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
                    return (
                      <div key={w.id} className="text-sm">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-slate-500 rounded-full flex-shrink-0"></span>
                            <span className="text-slate-300">{w.worker_name}</span>
                            {w.start_lat ? (
                              <a href={`https://maps.google.com/?q=${w.start_lat},${w.start_lng}`} target="_blank" rel="noopener noreferrer"
                                className="text-blue-400 text-xs hover:underline" title="Angemeldet">📍▶</a>
                            ) : (
                              <span className="text-slate-600 text-xs">📍▶</span>
                            )}
                            {w.end_lat ? (
                              <a href={`https://maps.google.com/?q=${w.end_lat},${w.end_lng}`} target="_blank" rel="noopener noreferrer"
                                className="text-blue-400 text-xs hover:underline" title="Abgemeldet">📍⏹</a>
                            ) : (
                              <span className="text-slate-600 text-xs">📍⏹</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400 text-xs">
                              {startTime}–{endTime}
                              <span className="text-slate-300 ml-2 font-medium">{h}h {m}m</span>
                            </span>
                            <button
                              onClick={async () => {
                                if (!confirm(`Eintrag von ${w.worker_name} (${startTime}–${endTime}) löschen?`)) return
                                const headers = await getHeaders()
                                await fetch(`/api/team/time?id=${w.id}`, { method: 'DELETE', headers })
                                loadActiveWorkers()
                              }}
                              className="text-slate-600 hover:text-red-400 text-xs transition-colors"
                              title="Eintrag löschen"
                            >🗑</button>
                          </div>
                        </div>
                        {w.note && <p className="text-slate-500 text-xs ml-4 mt-0.5">{w.note}</p>}
                      </div>
                    )
                  })
                ))}

                {/* Inactive workers */}
                {(activeWorkersList.length > 0 || Object.keys(completedByWorker).length > 0) && inactiveWorkers.length > 0 && (
                  <div className="border-t border-slate-700/50 my-1.5" />
                )}
                {inactiveWorkers.map(w => (
                  <div key={w.worker_id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-slate-600 rounded-full flex-shrink-0"></span>
                      <span className="text-slate-500">{w.worker_name}</span>
                    </div>
                    <span className="text-slate-600 text-xs">Heute nicht aktiv</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })()}

      {/* New conversation button */}
      {!showNewForm && (
        <button
          onClick={() => setShowNewForm(true)}
          className="w-full py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-500 transition-colors"
        >
          + Neue Nachricht
        </button>
      )}

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
            {workers.length > 1 && <option value="__all__">📢 Alle Mitarbeiter</option>}
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
          <input ref={newCameraRef} type="file" accept="image/*" multiple capture="environment" onChange={(e) => {
            const files = Array.from(e.target.files || [])
            setNewFiles(prev => [...prev, ...files])
            files.forEach(f => setNewPreviews(prev => [...prev, URL.createObjectURL(f)]))
            if (newCameraRef.current) newCameraRef.current.value = ''
            setShowNewPhotoPicker(false)
          }} className="hidden" />
          <input ref={newGalleryRef} type="file" accept="image/*" multiple onChange={(e) => {
            const files = Array.from(e.target.files || [])
            setNewFiles(prev => [...prev, ...files])
            files.forEach(f => setNewPreviews(prev => [...prev, URL.createObjectURL(f)]))
            if (newGalleryRef.current) newGalleryRef.current.value = ''
            setShowNewPhotoPicker(false)
          }} className="hidden" />

          <div className="flex gap-2">
            <div className="relative">
              <button onClick={() => isMobile ? setShowNewPhotoPicker(!showNewPhotoPicker) : newGalleryRef.current?.click()} className="px-3 py-2 bg-slate-700 text-slate-300 rounded-lg text-sm">
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

      {/* Hidden file inputs for replies */}
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
                            {item.worker_name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-white font-medium text-sm">{item.worker_name}</span>
                            <span className="text-slate-500 text-xs ml-2">{formatTime(item.last_message_at || item.created_at)}</span>
                            {item.worker_read_at && new Date(item.worker_read_at) >= new Date(item.last_message_at) && (
                              <span className="text-blue-400 text-xs ml-1" title="Gelesen">✓✓</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            {item.title && <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-0.5 rounded">📋 Aufgabe</span>}
                            {item.status === 'closed' && <span className="bg-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded">Erledigt</span>}
                            {item.status === 'open' && item.started_by !== item.owner_id && <span className="bg-orange-500/20 text-orange-400 text-xs px-2 py-0.5 rounded">Eingang</span>}
                            {item.unread_count > 0 && (
                              <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse min-w-[20px] text-center">{item.unread_count}</span>
                            )}
                            <span className="bg-purple-500/20 text-purple-400 text-xs font-semibold px-2 py-0.5 rounded-full border border-purple-500/30">{item.message_count} 💬</span>
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
                                    {isOwner && item.worker_read_at && new Date(item.worker_read_at) >= new Date(msg.created_at) && (
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
                                <div className="relative">
                                  <button onClick={() => { setReplyTo(item.id); isMobile ? setShowReplyPhotoPicker(!showReplyPhotoPicker) : replyGalleryRef.current?.click() }}
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
                                <button onClick={() => handleClose(item.id)} className="text-xs text-green-400 hover:text-green-300 bg-green-500/10 border border-green-500/30 px-3 py-1.5 rounded-lg">
                                  ✓ Abschließen
                                </button>
                                <button onClick={() => handleArchive(item.id)} className="text-xs text-amber-400 hover:text-amber-300 bg-amber-500/15 border border-amber-500/30 px-3 py-1.5 rounded-lg">
                                  📥 Archivieren
                                </button>
                              </>
                            )}
                            {item.status === 'closed' && (
                              <button onClick={() => handleReopen(item.id)} className="text-xs text-blue-400 hover:text-blue-300 bg-blue-500/10 border border-blue-500/30 px-3 py-1.5 rounded-lg">
                                ↩ Wieder öffnen
                              </button>
                            )}
                            {item.status === 'archived' && (
                              <button onClick={() => handleReopen(item.id)} className="text-xs text-blue-400 hover:text-blue-300 bg-blue-500/10 border border-blue-500/30 px-3 py-1.5 rounded-lg">
                                ↩ Wieder öffnen
                              </button>
                            )}
                            <button onClick={() => handleDelete(item.id)} className="text-xs text-red-400 hover:text-red-300 bg-red-500/10 border border-red-500/30 px-3 py-1.5 rounded-lg ml-auto">
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
      ) : !loading && (
        <div className="text-center py-12 text-slate-500">
          <p className="text-4xl mb-3">📡</p>
          <p>Noch keine Aktivitäten</p>
          <p className="text-sm mt-1">Starten Sie eine Konversation mit Ihrem Team</p>
        </div>
      )}

      {/* Infinite scroll sentinel */}
      <div ref={feedEndRef} className="h-4" />
      {loadingMore && (
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-purple-500 border-t-transparent"></div>
        </div>
      )}
    </div>
  )
}
