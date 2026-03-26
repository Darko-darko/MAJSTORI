// app/dashboard/worker/feed/page.js — Worker Feed: own posts + chef replies
'use client'
import { useState, useEffect, useRef } from 'react'
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
  const [feed, setFeed] = useState([])
  const [loading, setLoading] = useState(true)
  const [fullImage, setFullImage] = useState(null)
  const [postText, setPostText] = useState('')
  const [postFiles, setPostFiles] = useState([])
  const [postPreviews, setPostPreviews] = useState([])
  const [sending, setSending] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => {
    loadFeed()

    const channel = supabase
      .channel('worker-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_reports' }, () => loadFeed())
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

  const handleSendPost = async () => {
    if (!postText.trim() && postFiles.length === 0) return
    setSending(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const headers = { Authorization: `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' }

      const res = await fetch('/api/team/task-reports', {
        method: 'POST', headers,
        body: JSON.stringify({ text: postText.trim() || '📸 Foto', task_id: null })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)

      if (postFiles.length > 0 && json.report) {
        for (const file of postFiles) {
          const compressed = await compressImage(file)
          const formData = new FormData()
          formData.append('photo', compressed, `photo_${Date.now()}.jpg`)
          formData.append('report_id', json.report.id)
          await fetch('/api/team/task-reports', {
            method: 'PUT',
            headers: { Authorization: `Bearer ${session?.access_token}` },
            body: formData
          })
        }
      }

      setPostText('')
      setPostFiles([])
      setPostPreviews([])
      await loadFeed()
    } catch (err) { alert(err.message) }
    finally { setSending(false) }
  }

  const formatTime = (iso) => new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  const formatDate = (iso) => new Date(iso).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' })

  const reports = feed.filter(f => f.type === 'report' && !f.parent_id)
  const replies = feed.filter(f => f.type === 'report' && f.parent_id)

  const byDate = {}
  reports.forEach(item => {
    const date = formatDate(item.timestamp)
    if (!byDate[date]) byDate[date] = []
    byDate[date].push(item)
  })

  if (loading) {
    return <div className="max-w-2xl mx-auto p-6"><div className="animate-spin rounded-full h-8 w-8 border-4 border-orange-500 border-t-transparent mx-auto"></div></div>
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {fullImage && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setFullImage(null)}>
          <img src={fullImage} alt="" className="max-w-full max-h-full object-contain" />
          <button className="absolute top-4 right-4 text-white text-3xl" onClick={() => setFullImage(null)}>✕</button>
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*" multiple capture="environment" onChange={(e) => {
        const files = Array.from(e.target.files || [])
        setPostFiles(prev => [...prev, ...files])
        files.forEach(f => setPostPreviews(prev => [...prev, URL.createObjectURL(f)]))
        if (fileRef.current) fileRef.current.value = ''
      }} className="hidden" />

      <h1 className="text-2xl font-bold text-white">Mein Feed</h1>

      {/* Post form */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 space-y-3">
        <textarea
          value={postText}
          onChange={(e) => setPostText(e.target.value)}
          placeholder="Was gibt es Neues von der Baustelle?"
          rows={2}
          className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder-slate-500 text-sm"
        />
        {postPreviews.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {postPreviews.map((url, i) => (
              <div key={i} className="relative">
                <img src={url} alt="" className="w-full h-20 object-cover rounded-lg" />
                <button onClick={() => {
                  setPostPreviews(prev => prev.filter((_, idx) => idx !== i))
                  setPostFiles(prev => prev.filter((_, idx) => idx !== i))
                }} className="absolute top-0.5 right-0.5 bg-red-600 text-white w-5 h-5 rounded-full text-xs">✕</button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <button onClick={() => fileRef.current?.click()} className="px-3 py-2 bg-slate-700 text-slate-300 rounded-lg text-sm">
            📷 Foto
          </button>
          <button
            onClick={handleSendPost}
            disabled={sending || (!postText.trim() && postFiles.length === 0)}
            className="flex-1 py-2 bg-orange-600 text-white rounded-lg font-semibold disabled:opacity-50"
          >
            {sending ? '...' : '📤 Senden'}
          </button>
        </div>
      </div>

      {/* Feed */}
      {Object.keys(byDate).length > 0 ? (
        Object.entries(byDate).map(([date, items]) => (
          <div key={date}>
            <h2 className="text-slate-400 text-sm font-semibold mb-3">{date}</h2>
            <div className="space-y-3">
              {items.map(item => (
                <div key={item.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-slate-500 text-xs">{formatTime(item.timestamp)}</span>
                    {item.task?.title && <span className="text-purple-400 text-xs">📋 {item.task.title}</span>}
                    {!item.task_id && <span className="bg-orange-500/20 text-orange-400 text-xs px-2 py-0.5 rounded">📸</span>}
                    {item.is_final && <span className="bg-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded">Abschluss</span>}
                  </div>
                  {item.text && <p className="text-slate-300 text-sm">{item.text}</p>}
                  {item.photos?.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {item.photos.map((p, i) => (
                        <img key={i} src={p.url} alt="" className="w-full h-24 object-cover rounded-lg cursor-pointer" onClick={() => setFullImage(p.url)} />
                      ))}
                    </div>
                  )}

                  {/* Chef replies */}
                  {replies.filter(r => r.parent_id === item.id).map(reply => (
                    <div key={reply.id} className="ml-6 mt-2 bg-purple-900/20 border-l-2 border-purple-500 rounded-r-lg p-2">
                      <span className="text-purple-400 text-xs font-semibold">👔 Chef</span>
                      <span className="text-slate-500 text-xs ml-2">{formatTime(reply.timestamp)}</span>
                      <p className="text-slate-300 text-sm">{reply.text}</p>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ))
      ) : (
        <div className="text-center py-12 text-slate-500">
          <p className="text-4xl mb-3">📡</p>
          <p>Noch keine Beiträge</p>
          <p className="text-sm mt-1">Senden Sie Fotos und Updates von der Baustelle</p>
        </div>
      )}
    </div>
  )
}
