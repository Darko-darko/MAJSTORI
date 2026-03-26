// app/dashboard/team/feed/page.js — Owner Feed: realtime stream from all workers
'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function FeedPage() {
  const [feed, setFeed] = useState([])
  const [loading, setLoading] = useState(true)
  const [fullImage, setFullImage] = useState(null)
  const [replyTo, setReplyTo] = useState(null) // report id
  const [replyText, setReplyText] = useState('')
  const [replying, setReplying] = useState(false)

  useEffect(() => {
    loadFeed()

    // Realtime
    const channel = supabase
      .channel('owner-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_reports' }, () => loadFeed())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'work_times' }, () => loadFeed())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => loadFeed())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const loadFeed = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/team/feed', {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      })
      const json = await res.json()
      if (json.feed) setFeed(json.feed)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const handleReply = async (parentId) => {
    if (!replyText.trim()) return
    setReplying(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      await fetch('/api/team/task-reports', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: replyText.trim(), task_id: null, parent_id: parentId })
      })
      setReplyText('')
      setReplyTo(null)
      await loadFeed()
    } catch (err) { console.error(err) }
    finally { setReplying(false) }
  }

  const formatTime = (iso) => new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  const formatDate = (iso) => new Date(iso).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' })

  // Group by date — only main posts (no replies)
  const byDate = {}
  feed.filter(item => !item.parent_id).forEach(item => {
    const date = formatDate(item.timestamp)
    if (!byDate[date]) byDate[date] = []
    byDate[date].push(item)
  })
  // All replies (for lookup)
  const allReplies = feed.filter(item => item.parent_id)

  if (loading) {
    return <div className="max-w-2xl mx-auto p-6"><div className="animate-spin rounded-full h-8 w-8 border-4 border-purple-500 border-t-transparent mx-auto"></div></div>
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {fullImage && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setFullImage(null)}>
          <img src={fullImage} alt="" className="max-w-full max-h-full object-contain" />
          <button className="absolute top-4 right-4 text-white text-3xl" onClick={() => setFullImage(null)}>✕</button>
        </div>
      )}

      <h1 className="text-2xl font-bold text-white">Team Feed</h1>

      {Object.keys(byDate).length > 0 ? (
        Object.entries(byDate).map(([date, items]) => (
          <div key={date}>
            <h2 className="text-slate-400 text-sm font-semibold mb-3 sticky top-0 bg-slate-900/80 backdrop-blur py-1">{date}</h2>
            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={idx} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                  {/* Report */}
                  {item.type === 'report' && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-sm font-bold text-white">
                          {item.worker_name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <span className="text-white font-medium text-sm">{item.worker_name}</span>
                          <span className="text-slate-500 text-xs ml-2">{formatTime(item.timestamp)}</span>
                        </div>
                        {item.is_final && <span className="bg-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded ml-auto">Abschluss</span>}
                        {!item.is_final && item.task_id && <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-0.5 rounded ml-auto">Bericht</span>}
                        {!item.task_id && <span className="bg-orange-500/20 text-orange-400 text-xs px-2 py-0.5 rounded ml-auto">📸 Foto</span>}
                      </div>
                      {item.task?.title && (
                        <p className="text-purple-400 text-xs mb-1">📋 {item.task.title}{item.task.location ? ` · 📍 ${item.task.location}` : ''}</p>
                      )}
                      {item.text && <p className="text-slate-300 text-sm">{item.text}</p>}
                      {item.photos?.length > 0 && (
                        <div className="grid grid-cols-3 gap-2 mt-2">
                          {item.photos.map((p, i) => (
                            <img key={i} src={p.url} alt="" className="w-full h-24 object-cover rounded-lg cursor-pointer" onClick={() => setFullImage(p.url)} />
                          ))}
                        </div>
                      )}

                      {/* Replies (both chef and worker) */}
                      {allReplies.filter(r => r.parent_id === item.id).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)).map(reply => {
                        const isWorker = reply.worker_id === item.worker_id
                        return (
                          <div key={reply.id} className={`ml-10 mt-2 rounded-lg p-2 border-l-2 ${isWorker ? 'bg-slate-900/30 border-blue-500' : 'bg-purple-900/20 border-purple-500'}`}>
                            <span className={`text-xs font-semibold ${isWorker ? 'text-blue-400' : 'text-purple-400'}`}>
                              {isWorker ? `👷 ${reply.worker_name || 'Mitarbeiter'}` : '👔 Chef'}
                            </span>
                            <span className="text-slate-500 text-xs ml-2">{formatTime(reply.timestamp)}</span>
                            <p className="text-slate-300 text-sm">{reply.text}</p>
                          </div>
                        )
                      })}

                      {/* Reply button */}
                      {replyTo === item.id ? (
                        <div className="flex gap-2 mt-2">
                          <input
                            type="text"
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Antworten..."
                            className="flex-1 px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500"
                            autoFocus
                            onKeyDown={(e) => e.key === 'Enter' && handleReply(item.id)}
                          />
                          <button onClick={() => handleReply(item.id)} disabled={replying || !replyText.trim()}
                            className="px-3 py-2 bg-purple-600 text-white rounded-lg text-sm disabled:opacity-50">
                            {replying ? '...' : 'Senden'}
                          </button>
                          <button onClick={() => { setReplyTo(null); setReplyText('') }}
                            className="px-2 py-2 text-slate-400 text-sm">✕</button>
                        </div>
                      ) : (
                        <button onClick={() => setReplyTo(item.id)} className="text-slate-500 text-xs mt-2 hover:text-purple-400">
                          💬 Antworten
                        </button>
                      )}
                    </div>
                  )}

                  {/* Time */}
                  {item.type === 'time' && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-sm font-bold text-white">
                        {item.worker_name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <span className="text-white font-medium text-sm">{item.worker_name}</span>
                        <span className="text-slate-500 text-xs ml-2">{formatTime(item.timestamp)}</span>
                      </div>
                      {item.status === 'running' ? (
                        <span className="bg-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded ml-auto animate-pulse">⏱️ Arbeitet</span>
                      ) : (
                        <span className="text-slate-400 text-xs ml-auto">
                          {formatTime(item.start_time)} — {item.end_time ? formatTime(item.end_time) : '...'}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Task done */}
                  {item.type === 'task_done' && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-sm font-bold text-white">
                        {item.worker_name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <span className="text-white font-medium text-sm">{item.worker_name}</span>
                        <span className="text-slate-500 text-xs ml-2">{formatTime(item.timestamp)}</span>
                      </div>
                      <span className="bg-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded ml-auto">✓ {item.title}</span>
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
          <p className="text-sm mt-1">Hier erscheinen alle Aktivitäten Ihres Teams in Echtzeit</p>
        </div>
      )}
    </div>
  )
}
