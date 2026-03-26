// app/dashboard/worker/tasks/page.js — Worker's tasks with photos + comments
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

export default function WorkerTasksPage() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [expandedTask, setExpandedTask] = useState(null)
  const [comment, setComment] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)
  const [uploadType, setUploadType] = useState(null) // { taskId, type: 'before'|'after' }

  useEffect(() => { loadTasks() }, [])

  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return { Authorization: `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' }
  }

  const loadTasks = async () => {
    try {
      const headers = await getAuthHeaders()
      const res = await fetch('/api/team/tasks', { headers })
      const json = await res.json()
      if (json.tasks) setTasks(json.tasks)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      const headers = await getAuthHeaders()
      const res = await fetch('/api/team/tasks', {
        method: 'PATCH', headers,
        body: JSON.stringify({ id: taskId, status: newStatus })
      })
      const json = await res.json()
      if (json.task) setTasks(prev => prev.map(t => t.id === taskId ? json.task : t))
    } catch (err) { console.error(err) }
  }

  const handleComment = async (taskId) => {
    if (!comment.trim()) return
    try {
      const headers = await getAuthHeaders()
      const res = await fetch('/api/team/tasks', {
        method: 'PATCH', headers,
        body: JSON.stringify({ id: taskId, worker_comment: comment.trim() })
      })
      const json = await res.json()
      if (json.task) setTasks(prev => prev.map(t => t.id === taskId ? json.task : t))
      setComment('')
    } catch (err) { console.error(err) }
  }

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length || !uploadType) return

    setUploading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()

      for (const file of files) {
        const compressed = await compressImage(file)
        const formData = new FormData()
        formData.append('photo', compressed, `photo_${Date.now()}.jpg`)
        formData.append('task_id', uploadType.taskId)
        formData.append('type', uploadType.type)

        const res = await fetch('/api/team/tasks', {
          method: 'PUT',
          headers: { Authorization: `Bearer ${session?.access_token}` },
          body: formData
        })
        const json = await res.json()
        if (!res.ok) { alert(json.error); break }

        // Update local task
        setTasks(prev => prev.map(t => {
          if (t.id !== uploadType.taskId) return t
          const field = uploadType.type === 'before' ? 'photos_before' : 'photos_after'
          return { ...t, [field]: [...(t[field] || []), { url: json.photo }] }
        }))
      }
    } catch (err) {
      alert(err.message)
    } finally {
      setUploading(false)
      setUploadType(null)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const triggerUpload = (taskId, type) => {
    setUploadType({ taskId, type })
    setTimeout(() => fileRef.current?.click(), 100)
  }

  const filtered = tasks.filter(t => {
    if (filter === 'pending') return t.status === 'pending' || t.status === 'in_progress'
    if (filter === 'done') return t.status === 'done'
    return true
  })

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent mx-auto"></div>
      </div>
    )
  }

  const pendingCount = tasks.filter(t => t.status !== 'done').length

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <input ref={fileRef} type="file" accept="image/*" multiple capture="environment" onChange={handlePhotoUpload} className="hidden" />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Meine Aufgaben</h1>
        {pendingCount > 0 && (
          <span className="bg-blue-600 text-white text-sm px-3 py-1 rounded-full font-semibold">{pendingCount} offen</span>
        )}
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {[{ key: 'pending', label: 'Offen' }, { key: 'done', label: 'Erledigt' }, { key: 'all', label: 'Alle' }].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${filter === f.key ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
          >{f.label}</button>
        ))}
      </div>

      {/* Tasks */}
      <div className="space-y-3">
        {filtered.map(task => {
          const isExpanded = expandedTask === task.id
          return (
            <div key={task.id} className={`bg-slate-800/50 border rounded-xl overflow-hidden ${task.status === 'done' ? 'border-green-500/30 opacity-70' : 'border-slate-700'}`}>
              {/* Header */}
              <div className="p-4 flex items-start justify-between gap-4 cursor-pointer" onClick={() => setExpandedTask(isExpanded ? null : task.id)}>
                <div className="flex-1">
                  <h3 className={`font-semibold ${task.status === 'done' ? 'text-slate-400 line-through' : 'text-white'}`}>{task.title}</h3>
                  {task.description && <p className="text-slate-400 text-sm mt-1">{task.description}</p>}
                  <div className="flex gap-4 mt-2 text-xs text-slate-500">
                    {task.location && <span>📍 {task.location}</span>}
                    {task.due_date && <span>📅 {new Date(task.due_date).toLocaleDateString('de-DE')}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {task.status === 'pending' && (
                    <button onClick={(e) => { e.stopPropagation(); handleStatusChange(task.id, 'in_progress') }}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-semibold">Starten</button>
                  )}
                  {task.status === 'in_progress' && (
                    <button onClick={(e) => { e.stopPropagation(); handleStatusChange(task.id, 'done') }}
                      className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-semibold">✓ Fertig</button>
                  )}
                  {task.status === 'done' && <span className="text-green-400 text-sm">✓</span>}
                  <span className="text-slate-500">{isExpanded ? '▲' : '▼'}</span>
                </div>
              </div>

              {/* Expanded: Photos + Comment */}
              {isExpanded && (
                <div className="border-t border-slate-700 p-4 space-y-4">
                  {/* Vorher Photos */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-slate-400 text-sm font-semibold">📷 Vorher ({(task.photos_before || []).length}/5)</p>
                      {task.status !== 'done' && (task.photos_before || []).length < 5 && (
                        <button onClick={() => triggerUpload(task.id, 'before')} disabled={uploading}
                          className="text-blue-400 text-xs hover:underline disabled:opacity-50">
                          {uploading ? '...' : '+ Foto'}
                        </button>
                      )}
                    </div>
                    {(task.photos_before || []).length > 0 && (
                      <div className="grid grid-cols-4 gap-2">
                        {task.photos_before.map((p, i) => (
                          <img key={i} src={p.url} alt="" className="w-full h-16 object-cover rounded-lg" />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Nachher Photos */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-slate-400 text-sm font-semibold">📷 Nachher ({(task.photos_after || []).length}/5)</p>
                      {task.status !== 'done' && (task.photos_after || []).length < 5 && (
                        <button onClick={() => triggerUpload(task.id, 'after')} disabled={uploading}
                          className="text-blue-400 text-xs hover:underline disabled:opacity-50">
                          {uploading ? '...' : '+ Foto'}
                        </button>
                      )}
                    </div>
                    {(task.photos_after || []).length > 0 && (
                      <div className="grid grid-cols-4 gap-2">
                        {task.photos_after.map((p, i) => (
                          <img key={i} src={p.url} alt="" className="w-full h-16 object-cover rounded-lg" />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Comment */}
                  <div>
                    {task.worker_comment && (
                      <div className="bg-slate-900/50 rounded-lg p-3 mb-2">
                        <p className="text-slate-300 text-sm">{task.worker_comment}</p>
                      </div>
                    )}
                    {task.status !== 'done' && (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={expandedTask === task.id ? comment : ''}
                          onChange={(e) => setComment(e.target.value)}
                          placeholder="Kommentar..."
                          className="flex-1 px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500"
                          onKeyDown={(e) => e.key === 'Enter' && handleComment(task.id)}
                        />
                        <button onClick={() => handleComment(task.id)} disabled={!comment.trim()}
                          className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50">Senden</button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <p className="text-4xl mb-3">📋</p>
            <p>{filter === 'done' ? 'Noch keine erledigten Aufgaben' : 'Keine offenen Aufgaben'}</p>
          </div>
        )}
      </div>
    </div>
  )
}
