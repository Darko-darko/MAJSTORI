// app/dashboard/worker/tasks/page.js — Worker tasks with photos + comments + Abschließen
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
  const [comments, setComments] = useState({}) // { taskId: text }
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)
  const [uploadType, setUploadType] = useState(null)

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
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const updateTask = async (taskId, data) => {
    try {
      const headers = await getAuthHeaders()
      const res = await fetch('/api/team/tasks', {
        method: 'PATCH', headers,
        body: JSON.stringify({ id: taskId, ...data })
      })
      const json = await res.json()
      if (json.task) setTasks(prev => prev.map(t => t.id === taskId ? json.task : t))
      return json.task
    } catch (err) { console.error(err) }
  }

  const handleAbschliessen = async (task) => {
    const hasContent = (task.photos_before?.length > 0) || (task.photos_after?.length > 0) || task.worker_comment?.trim()
    if (!hasContent) {
      alert('Bitte fügen Sie mindestens einen Kommentar oder ein Foto hinzu, bevor Sie abschließen.')
      return
    }

    const confirmed = confirm(
      'Aufgabe abschließen?\n\n' +
      'Nach dem Abschließen können keine Änderungen mehr vorgenommen werden.\n\n' +
      'Fortfahren?'
    )
    if (!confirmed) return

    await updateTask(task.id, { status: 'done' })
  }

  const handleCommentSave = async (taskId) => {
    const text = comments[taskId]?.trim()
    if (!text) return
    await updateTask(taskId, { worker_comment: text })
    setComments(prev => ({ ...prev, [taskId]: '' }))
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

        setTasks(prev => prev.map(t => {
          if (t.id !== uploadType.taskId) return t
          const field = uploadType.type === 'before' ? 'photos_before' : 'photos_after'
          return { ...t, [field]: [...(t[field] || []), { url: json.photo }] }
        }))
      }
    } catch (err) { alert(err.message) }
    finally {
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
    if (filter === 'pending') return t.status !== 'done'
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

      <div className="flex gap-2">
        {[{ key: 'pending', label: 'Offen' }, { key: 'done', label: 'Erledigt' }, { key: 'all', label: 'Alle' }].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${filter === f.key ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
          >{f.label}</button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map(task => {
          const isExpanded = expandedTask === task.id
          const isDone = task.status === 'done'

          return (
            <div key={task.id} className={`bg-slate-800/50 border rounded-xl overflow-hidden ${isDone ? 'border-green-500/30 opacity-70' : 'border-slate-700'}`}>
              {/* Header */}
              <div className="p-4 flex items-start justify-between gap-4 cursor-pointer" onClick={() => setExpandedTask(isExpanded ? null : task.id)}>
                <div className="flex-1">
                  <h3 className={`font-semibold ${isDone ? 'text-slate-400 line-through' : 'text-white'}`}>{task.title}</h3>
                  {task.description && <p className="text-slate-400 text-sm mt-1">{task.description}</p>}
                  <div className="flex gap-4 mt-2 text-xs text-slate-500">
                    {task.location && <span>📍 {task.location}</span>}
                    {task.due_date && <span>📅 {new Date(task.due_date).toLocaleDateString('de-DE')}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isDone ? (
                    <span className="text-green-400 text-sm font-semibold">✓ Erledigt</span>
                  ) : (
                    <span className="text-yellow-400 text-xs">Offen</span>
                  )}
                  <span className="text-slate-500">{isExpanded ? '▲' : '▼'}</span>
                </div>
              </div>

              {/* Expanded */}
              {isExpanded && (
                <div className="border-t border-slate-700 p-4 space-y-4">
                  {/* Owner Photos */}
                  {(task.owner_photos || []).length > 0 && (
                    <div>
                      <p className="text-slate-400 text-sm font-semibold mb-2">📌 Vom Chef:</p>
                      <div className="grid grid-cols-4 gap-2">
                        {task.owner_photos.map((p, i) => (
                          <img key={i} src={p.url} alt="" className="w-full h-16 object-cover rounded-lg border border-purple-500/30" />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Vorher */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-slate-400 text-sm font-semibold">📷 Vorher ({(task.photos_before || []).length}/5)</p>
                      {!isDone && (task.photos_before || []).length < 5 && (
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

                  {/* Nachher */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-slate-400 text-sm font-semibold">📷 Nachher ({(task.photos_after || []).length}/5)</p>
                      {!isDone && (task.photos_after || []).length < 5 && (
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
                    {!isDone && (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={comments[task.id] || ''}
                          onChange={(e) => setComments(prev => ({ ...prev, [task.id]: e.target.value }))}
                          placeholder="Kommentar..."
                          className="flex-1 px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500"
                          onKeyDown={(e) => e.key === 'Enter' && handleCommentSave(task.id)}
                        />
                        <button onClick={() => handleCommentSave(task.id)} disabled={!comments[task.id]?.trim()}
                          className="px-3 py-2 bg-slate-700 text-slate-300 rounded-lg text-sm disabled:opacity-50 hover:bg-slate-600">Speichern</button>
                      </div>
                    )}
                  </div>

                  {/* Abschließen */}
                  {!isDone && (
                    <button
                      onClick={() => handleAbschliessen(task)}
                      className="w-full py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-500 transition-colors"
                    >
                      ✓ Aufgabe abschließen
                    </button>
                  )}
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
