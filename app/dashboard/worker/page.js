// app/dashboard/worker/page.js — Worker Dashboard: alles auf einer Seite
'use client'
import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import WorkerBerichteTab from '@/app/components/WorkerBerichteTab'

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

export default function WorkerDashboard() {
  const [worker, setWorker] = useState(null)
  const [teamInfo, setTeamInfo] = useState(null)
  const [loading, setLoading] = useState(true)

  // Timer state
  const [running, setRunning] = useState(null)
  const [todayEntries, setTodayEntries] = useState([])
  const [elapsed, setElapsed] = useState(0)
  const [actionLoading, setActionLoading] = useState(false)
  const timerRef = useRef(null)

  // Feed state
  const [conversations, setConversations] = useState([])
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)
  const PAGE_SIZE = 20
  const feedEndRef = useRef(null)
  const [userId, setUserId] = useState(null)

  // Tab state
  const [activeTab, setActiveTab] = useState('alle') // 'alle' | 'aufgaben' | 'berichte'

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
  const [fullImage, setFullImage] = useState(null)

  useEffect(() => {
    if (convParam && !loading) {
      setTimeout(() => {
        const el = document.getElementById(`conv-${convParam}`)
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 100)
    }
  }, [convParam, loading])

  // Initial load
  useEffect(() => {
    loadAll()

    const channel = supabase
      .channel('worker-all-in-one')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => { loadFeed(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => { loadFeed(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'work_times' }, () => { loadTimeEntries(); })
      .subscribe()

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      supabase.removeChannel(channel)
    }
  }, [])

  // Timer tick
  useEffect(() => {
    if (running) {
      timerRef.current = setInterval(() => {
        const start = new Date(running.start_time).getTime()
        setElapsed(Math.floor((Date.now() - start) / 1000))
      }, 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
      setElapsed(0)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [running])

  // Infinite scroll
  useEffect(() => {
    if (!feedEndRef.current) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && hasMore && !loadingMore) loadMoreFeed() },
      { threshold: 0.1 }
    )
    observer.observe(feedEndRef.current)
    return () => observer.disconnect()
  }, [hasMore, loadingMore])

  const getHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!userId && session?.user?.id) setUserId(session.user.id)
    return { Authorization: `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' }
  }

  const getAuthHeader = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return { Authorization: `Bearer ${session?.access_token}` }
  }

  const loadAll = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const { data: majstor } = await supabase
        .from('majstors')
        .select('*')
        .eq('id', user.id)
        .single()
      setWorker(majstor)

      const { data: membership } = await supabase
        .from('team_members')
        .select('*, owner:owner_id(full_name, business_name)')
        .eq('worker_id', user.id)
        .eq('status', 'active')
        .single()

      if (membership) {
        setTeamInfo({
          ownerName: membership.owner?.business_name || membership.owner?.full_name,
          workerName: membership.worker_name,
        })
      }

      await Promise.all([loadTimeEntries(), loadFeed()])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const loadTimeEntries = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const today = new Date().toISOString().split('T')[0]
      const res = await fetch(`/api/team/time?date=${today}`, {
        headers: { Authorization: `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' }
      })
      const json = await res.json()
      if (json.entries) {
        const runningEntry = json.entries.find(e => e.status === 'running')
        setRunning(runningEntry || null)
        setTodayEntries(json.entries.filter(e => e.status === 'completed'))
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
    finally { setLoadingMore(false) }
  }

  const loadMoreFeed = async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    await loadFeed(false)
  }

  // Timer actions
  const getGPS = () => new Promise((resolve) => {
    if (!navigator.geolocation) { resolve({}); return }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve({}),
      { timeout: 5000 }
    )
  })

  const handleStart = async () => {
    setActionLoading(true)
    try {
      const gps = await getGPS()
      const headers = await getHeaders()
      const res = await fetch('/api/team/time', {
        method: 'POST', headers,
        body: JSON.stringify({ action: 'start', ...gps })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setRunning(json.entry)
    } catch (err) { alert(err.message) }
    finally { setActionLoading(false) }
  }

  const handleStop = async () => {
    setActionLoading(true)
    try {
      const gps = await getGPS()
      const headers = await getHeaders()
      const res = await fetch('/api/team/time', {
        method: 'POST', headers,
        body: JSON.stringify({ action: 'stop', ...gps })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setTodayEntries(prev => [json.entry, ...prev])
      setRunning(null)
    } catch (err) { alert(err.message) }
    finally { setActionLoading(false) }
  }

  // Conversation actions
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

      setNewText(''); setNewFiles([]); setNewPreviews([]); setShowNewForm(false)
      await loadFeed()
    } catch (err) { alert(err.message) }
    finally { setSending(false) }
  }

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
      await loadFeed()
    } catch (err) { alert(err.message) }
    finally { setReplying(false) }
  }

  // Formatters
  const formatTimer = (seconds) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }
  const formatClock = (iso) => new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  const formatDate = (iso) => new Date(iso).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' })
  const formatDuration = (start, end) => {
    const totalMin = Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 60000)
    return `${Math.floor(totalMin / 60)}h ${totalMin % 60}m`
  }

  // Build feed items
  const filteredConversations = activeTab === 'aufgaben'
    ? conversations.filter(c => c.started_by === c.owner_id && !c.is_broadcast && c.status === 'open')
    : conversations

  const byDate = {}
  filteredConversations.forEach(c => {
    const date = formatDate(c.last_message_at || c.created_at)
    if (!byDate[date]) byDate[date] = []
    byDate[date].push(c)
  })

  // Count open aufgaben for badge
  const aufgabenCount = conversations.filter(c => c.started_by === c.owner_id && !c.is_broadcast && c.status === 'open').length

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-purple-500 border-t-transparent mx-auto"></div>
      </div>
    )
  }

  const isLongRunning = elapsed > 10 * 3600

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
        setShowNewForm(true); setShowNewPhotoPicker(false)
      }} className="hidden" />
      <input ref={newGalleryRef} type="file" accept="image/*" multiple onChange={(e) => {
        const files = Array.from(e.target.files || [])
        setNewFiles(prev => [...prev, ...files])
        files.forEach(f => setNewPreviews(prev => [...prev, URL.createObjectURL(f)]))
        if (newGalleryRef.current) newGalleryRef.current.value = ''
        setShowNewForm(true); setShowNewPhotoPicker(false)
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

      {/* 1. Welcome */}
      <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 border border-purple-500/30 rounded-2xl p-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center text-xl font-bold text-white">
            {worker?.full_name?.charAt(0)?.toUpperCase() || '👷'}
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">
              Hallo, {(teamInfo?.workerName || worker?.full_name || '').toUpperCase()}!
            </h1>
            {teamInfo && (
              <p className="text-slate-400 text-sm">
                Team: <span className="text-purple-400">{teamInfo.ownerName}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 2. Zeiterfassung */}
      <div className={`border rounded-xl p-4 ${
        running
          ? isLongRunning ? 'bg-red-900/20 border-red-500/50' : 'bg-green-900/20 border-green-500/50'
          : 'bg-slate-800/50 border-slate-700'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⏱️</span>
            {running ? (
              <div>
                <p className={`text-2xl font-mono font-bold ${isLongRunning ? 'text-red-400' : 'text-green-400'}`}>
                  {formatTimer(elapsed)}
                </p>
                <p className="text-slate-400 text-xs">seit {formatClock(running.start_time)}</p>
              </div>
            ) : (
              <div>
                <p className="text-slate-400 text-sm font-medium">Zeiterfassung</p>
                <p className="text-slate-500 text-xs">
                  {todayEntries.length > 0
                    ? `${todayEntries.length} Eintrag${todayEntries.length > 1 ? 'e' : ''} heute`
                    : 'Nicht gestartet'}
                </p>
              </div>
            )}
          </div>

          {running ? (
            <button
              onClick={handleStop}
              disabled={actionLoading}
              className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-500 transition-colors disabled:opacity-50"
            >
              {actionLoading ? '...' : '⏹ Stoppen'}
            </button>
          ) : (
            <button
              onClick={handleStart}
              disabled={actionLoading}
              className="px-6 py-3 bg-green-600 text-white rounded-xl font-bold text-sm hover:bg-green-500 transition-colors disabled:opacity-50"
            >
              {actionLoading ? '...' : '▶ Starten'}
            </button>
          )}
        </div>

        {isLongRunning && (
          <p className="text-red-400 text-xs mt-2 animate-pulse">Zeiterfassung läuft seit über 10 Stunden!</p>
        )}
        {running?.start_lat && (
          <p className="text-green-500 text-xs mt-1">📍 Standort erfasst ✓</p>
        )}
      </div>

      {/* 3. Neue Nachricht */}
      {!showNewForm ? (
        <button
          onClick={() => setShowNewForm(true)}
          className="w-full py-3 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl font-bold hover:from-purple-500 hover:to-violet-500 transition-all"
        >
          + Neue Nachricht
        </button>
      ) : (
        <div className="bg-slate-800/50 border border-purple-500/30 rounded-xl p-4 space-y-3">
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
              className="flex-1 py-2 bg-purple-600 text-white rounded-lg font-semibold disabled:opacity-50"
            >
              {sending ? '...' : 'Senden'}
            </button>
            <button onClick={() => { setShowNewForm(false); setNewText(''); setNewFiles([]); setNewPreviews([]) }}
              className="px-3 py-2 bg-slate-700 text-slate-300 rounded-lg text-sm">Abbrechen</button>
          </div>
        </div>
      )}

      {/* 4. Tabs: Alle / Aufgaben */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('alle')}
          className={`px-5 py-2 rounded-full text-sm font-semibold transition-colors ${
            activeTab === 'alle'
              ? 'bg-purple-600 text-white'
              : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          Alle
        </button>
        <button
          onClick={() => setActiveTab('aufgaben')}
          className={`px-5 py-2 rounded-full text-sm font-semibold transition-colors flex items-center gap-1.5 ${
            activeTab === 'aufgaben'
              ? 'bg-purple-600 text-white'
              : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          Aufgaben
          {aufgabenCount > 0 && (
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center ${
              activeTab === 'aufgaben' ? 'bg-white/20 text-white' : 'bg-orange-500 text-white'
            }`}>{aufgabenCount}</span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('berichte')}
          className={`px-5 py-2 rounded-full text-sm font-semibold transition-colors ${
            activeTab === 'berichte'
              ? 'bg-purple-600 text-white'
              : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          Berichte
        </button>
      </div>

      {/* 5. Berichte Tab */}
      {activeTab === 'berichte' && <WorkerBerichteTab worker={worker} />}

      {/* 6. Feed (nur bei Alle/Aufgaben) */}
      {activeTab !== 'berichte' && (Object.keys(byDate).length > 0 ? (
        Object.entries(byDate).map(([date, items]) => (
          <div key={date}>
            <h2 className="text-slate-400 text-sm font-semibold mb-3 sticky top-0 bg-slate-900/80 backdrop-blur py-1 z-10">{date}</h2>
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} id={`conv-${item.id}`}>
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
                          item.is_broadcast ? 'bg-yellow-600' : item.started_by === item.owner_id ? 'bg-purple-600' : 'bg-orange-600'
                        }`}>
                          {item.is_broadcast ? '📢' : item.started_by === item.owner_id ? '👔' : '👷'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-white font-medium text-sm">
                            {item.is_broadcast ? 'Alle Mitarbeiter' : item.started_by === item.owner_id ? 'Chef' : 'Ich'}
                          </span>
                          <span className="text-slate-500 text-xs ml-2">{formatClock(item.last_message_at || item.created_at)}</span>
                          {/* Read receipt for worker messages */}
                          {!item.is_broadcast && item.started_by !== item.owner_id && item.owner_read_at && (
                            <span className="text-blue-400 text-xs ml-1">✓✓</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          {item.is_broadcast && item.reactions?.length > 0 && (
                            <span className="text-yellow-400 text-xs">👍 {item.reactions.length}</span>
                          )}
                          {!item.is_broadcast && item.title && <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-0.5 rounded">📋</span>}
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
                                  <span className="text-slate-500 text-xs">{formatClock(msg.created_at)}</span>
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

                        {/* Broadcast: reaction */}
                        {item.is_broadcast && item.status === 'open' && (
                          <div className="p-3 border-t border-slate-700/50 flex items-center gap-3">
                            <button
                              onClick={async () => {
                                const headers = await getHeaders()
                                await fetch(`/api/team/conversations/${item.id}`, {
                                  method: 'PATCH', headers,
                                  body: JSON.stringify({ react: true })
                                })
                                loadFeed()
                              }}
                              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                (item.reactions || []).some(r => r.user_id === userId)
                                  ? 'bg-green-600 text-white'
                                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                              }`}
                            >
                              👍 {(item.reactions || []).some(r => r.user_id === userId) ? 'Bestätigt' : 'Verstanden'}
                            </button>
                          </div>
                        )}

                        {/* Reply */}
                        {!item.is_broadcast && item.status === 'open' && (
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
                                className="px-3 py-2 bg-purple-600 text-white rounded-lg text-sm disabled:opacity-50"
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
                </div>
              ))}
            </div>
          </div>
        ))
      ) : (
        <div className="text-center py-12 text-slate-500">
          <p className="text-4xl mb-3">{activeTab === 'aufgaben' ? '✅' : '📡'}</p>
          <p>{activeTab === 'aufgaben' ? 'Keine offenen Aufgaben' : 'Noch keine Aktivitäten'}</p>
          <p className="text-sm mt-1">{activeTab === 'aufgaben' ? 'Hier erscheinen Aufträge vom Chef' : 'Senden Sie Fotos und Updates an Ihren Chef'}</p>
        </div>
      ))}

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
