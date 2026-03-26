// app/dashboard/worker/tasks/page.js — Worker tasks with multi-phase reports
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
  const [reports, setReports] = useState({}) // { taskId: [reports] }
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [expandedTask, setExpandedTask] = useState(null)
  const [reportText, setReportText] = useState('')
  const [reportPhotos, setReportPhotos] = useState([]) // preview URLs
  const [reportPhotoFiles, setReportPhotoFiles] = useState([])
  const [sending, setSending] = useState(false)
  const [fullImage, setFullImage] = useState(null) // fullscreen image URL
  const fileRef = useRef(null)

  useEffect(() => { loadData() }, [])

  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return { Authorization: `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' }
  }

  const loadData = async () => {
    try {
      const headers = await getAuthHeaders()
      const [tasksRes, reportsRes] = await Promise.all([
        fetch('/api/team/tasks', { headers }),
        fetch('/api/team/task-reports', { headers }),
      ])
      const tasksJson = await tasksRes.json()
      const reportsJson = await reportsRes.json()

      if (tasksJson.tasks) setTasks(tasksJson.tasks)
      if (reportsJson.reports) {
        const grouped = {}
        reportsJson.reports.forEach(r => {
          if (!grouped[r.task_id]) grouped[r.task_id] = []
          grouped[r.task_id].push(r)
        })
        setReports(grouped)
      }
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const handleSendReport = async (taskId, isFinal = false) => {
    if (!reportText.trim() && reportPhotoFiles.length === 0) {
      alert('Bitte Text oder mindestens ein Foto hinzufügen.')
      return
    }

    if (isFinal) {
      if (!confirm('Aufgabe abschließen?\n\nNach dem Abschließen können keine weiteren Berichte gesendet werden.')) return
    }

    setSending(true)
    try {
      const headers = await getAuthHeaders()

      // Create report
      const res = await fetch('/api/team/task-reports', {
        method: 'POST', headers,
        body: JSON.stringify({ task_id: taskId, text: reportText.trim() || 'Foto-Update', is_final: isFinal })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)

      // Upload photos
      if (reportPhotoFiles.length > 0 && json.report) {
        const { data: { session } } = await supabase.auth.getSession()
        for (const file of reportPhotoFiles) {
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

      // Reload
      await loadData()
      setReportText('')
      setReportPhotos([])
      setReportPhotoFiles([])
    } catch (err) {
      alert(err.message)
    } finally {
      setSending(false)
    }
  }

  const handlePhotoSelect = (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length + reportPhotos.length > 10) { alert('Max. 10 Fotos'); return }
    setReportPhotoFiles(prev => [...prev, ...files])
    files.forEach(f => setReportPhotos(prev => [...prev, URL.createObjectURL(f)]))
    if (fileRef.current) fileRef.current.value = ''
  }

  const filtered = tasks.filter(t => {
    if (filter === 'pending') return t.status !== 'done'
    if (filter === 'done') return t.status === 'done'
    return true
  })

  if (loading) {
    return <div className="max-w-2xl mx-auto p-6"><div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent mx-auto"></div></div>
  }

  const pendingCount = tasks.filter(t => t.status !== 'done').length

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <input ref={fileRef} type="file" accept="image/*" multiple capture="environment" onChange={handlePhotoSelect} className="hidden" />

      {/* Fullscreen image */}
      {fullImage && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setFullImage(null)}>
          <img src={fullImage} alt="" className="max-w-full max-h-full object-contain" />
          <button className="absolute top-4 right-4 text-white text-3xl" onClick={() => setFullImage(null)}>✕</button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Meine Aufgaben</h1>
        {pendingCount > 0 && <span className="bg-blue-600 text-white text-sm px-3 py-1 rounded-full font-semibold">{pendingCount} offen</span>}
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
          const taskReports = reports[task.id] || []
          const hasFinal = taskReports.some(r => r.is_final)

          return (
            <div key={task.id} className={`bg-slate-800/50 border rounded-xl overflow-hidden ${isDone ? 'border-green-500/30' : 'border-slate-700'}`}>
              {/* Header */}
              <div className="p-4 flex items-start justify-between gap-4 cursor-pointer" onClick={() => { setExpandedTask(isExpanded ? null : task.id); setReportText(''); setReportPhotos([]); setReportPhotoFiles([]) }}>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className={`font-semibold ${isDone ? 'text-slate-400 line-through' : 'text-white'}`}>{task.title}</h3>
                    {taskReports.filter(r => !r.is_final).length > 0 && (
                      <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-0.5 rounded">{taskReports.filter(r => !r.is_final).length} Bericht{taskReports.filter(r => !r.is_final).length > 1 ? 'e' : ''}</span>
                    )}
                    {isDone && <span className="bg-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded">✓ Erledigt</span>}
                  </div>
                  {task.description && <p className="text-slate-400 text-sm mt-1">{task.description}</p>}
                  <div className="flex gap-4 mt-2 text-xs text-slate-500">
                    {task.location && <span>📍 {task.location}</span>}
                    {task.due_date && <span>📅 {new Date(task.due_date).toLocaleDateString('de-DE')}</span>}
                  </div>
                </div>
                <span className="text-slate-500">{isExpanded ? '▲' : '▼'}</span>
              </div>

              {/* Expanded */}
              {isExpanded && (
                <div className="border-t border-slate-700 p-4 space-y-4">
                  {/* Owner photos */}
                  {(task.owner_photos || []).length > 0 && (
                    <div>
                      <p className="text-slate-400 text-sm font-semibold mb-2">📌 Vom Chef:</p>
                      <div className="grid grid-cols-4 gap-2">
                        {task.owner_photos.map((p, i) => (
                          <img key={i} src={p.url} alt="" className="w-full h-16 object-cover rounded-lg border border-purple-500/30 cursor-pointer" onClick={() => setFullImage(p.url)} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Previous reports */}
                  {taskReports.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-slate-400 text-sm font-semibold">Meine Berichte:</p>
                      {taskReports.map(r => (
                        <div key={r.id} className={`rounded-lg p-3 ${r.is_final ? 'bg-green-900/20 border border-green-500/30' : 'bg-slate-900/50'}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-slate-500 text-xs">{new Date(r.created_at).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                            {r.is_final && <span className="text-green-400 text-xs font-semibold">Abschluss</span>}
                          </div>
                          {r.text && <p className="text-slate-300 text-sm">{r.text}</p>}
                          {r.photos?.length > 0 && (
                            <div className="grid grid-cols-4 gap-1 mt-2">
                              {r.photos.map((p, i) => (
                                <img key={i} src={p.url} alt="" className="w-full h-14 object-cover rounded cursor-pointer" onClick={() => setFullImage(p.url)} />
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* New report form */}
                  {!isDone && !hasFinal && (
                    <div className="border-t border-slate-700 pt-4 space-y-3">
                      <textarea
                        value={reportText}
                        onChange={(e) => setReportText(e.target.value)}
                        placeholder="Bericht schreiben..."
                        rows={3}
                        className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder-slate-500 text-sm"
                      />

                      {/* Photo previews */}
                      {reportPhotos.length > 0 && (
                        <div className="grid grid-cols-4 gap-2">
                          {reportPhotos.map((url, i) => (
                            <div key={i} className="relative">
                              <img src={url} alt="" className="w-full h-16 object-cover rounded-lg" />
                              <button onClick={() => {
                                setReportPhotos(prev => prev.filter((_, idx) => idx !== i))
                                setReportPhotoFiles(prev => prev.filter((_, idx) => idx !== i))
                              }} className="absolute top-0.5 right-0.5 bg-red-600 text-white w-5 h-5 rounded-full text-xs">✕</button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button onClick={() => fileRef.current?.click()} className="px-3 py-2 bg-slate-700 text-slate-300 rounded-lg text-sm hover:bg-slate-600">
                          📷 Foto
                        </button>
                        <button
                          onClick={() => handleSendReport(task.id, false)}
                          disabled={sending || (!reportText.trim() && reportPhotoFiles.length === 0)}
                          className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
                        >
                          {sending ? '...' : '📤 Zwischenbericht senden'}
                        </button>
                        <button
                          onClick={() => {
                            if (!confirm('Aufgabe abschließen?\n\nNach dem Abschließen können keine weiteren Berichte gesendet werden.')) return
                            if (reportText.trim() || reportPhotoFiles.length > 0) {
                              handleSendReport(task.id, true)
                            } else {
                              // Just close without new report
                              (async () => {
                                setSending(true)
                                const headers = await getAuthHeaders()
                                await fetch('/api/team/task-reports', {
                                  method: 'POST', headers,
                                  body: JSON.stringify({ task_id: task.id, text: 'Aufgabe abgeschlossen', is_final: true })
                                })
                                await loadData()
                                setSending(false)
                              })()
                            }
                          }}
                          disabled={sending}
                          className="py-2 px-4 bg-green-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
                        >
                          ✓ Abschließen
                        </button>
                      </div>
                    </div>
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
