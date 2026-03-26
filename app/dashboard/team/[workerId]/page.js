// app/dashboard/team/[workerId]/page.js — Owner views worker details
'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function WorkerDetailPage() {
  const { workerId } = useParams()
  const router = useRouter()
  const [member, setMember] = useState(null)
  const [timeEntries, setTimeEntries] = useState([])
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('time') // time, tasks, reports
  const [reports, setReports] = useState([])
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newLocation, setNewLocation] = useState('')
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
  const [newDue, setNewDue] = useState(tomorrow)
  const [saving, setSaving] = useState(false)
  const [newPhotos, setNewPhotos] = useState([]) // preview URLs
  const [newPhotoFiles, setNewPhotoFiles] = useState([]) // actual files
  const [expandedTaskId, setExpandedTaskId] = useState(null)
  const [fullImage, setFullImage] = useState(null)
  const [editingTaskId, setEditingTaskId] = useState(null)

  useEffect(() => {
    loadData()

    // Realtime: listen for changes
    const channel = supabase
      .channel(`owner-worker-${workerId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        console.log('🔔 Task updated — reloading')
        loadData()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_reports' }, () => {
        console.log('🔔 Report updated — reloading')
        loadData()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'work_times' }, () => {
        console.log('🔔 Time updated — reloading')
        loadData()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [workerId])

  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return { Authorization: `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' }
  }

  const loadData = async () => {
    try {
      const headers = await getAuthHeaders()

      // Load member info
      const teamRes = await fetch('/api/team', { headers })
      const teamJson = await teamRes.json()
      const found = teamJson.members?.find(m => m.worker_id === workerId || m.id === workerId)
      setMember(found)

      // Load time entries for this worker
      const timeRes = await fetch(`/api/team/time?worker_id=${workerId}`, { headers })
      const timeJson = await timeRes.json()
      if (timeJson.entries) setTimeEntries(timeJson.entries)

      // Load task reports for this worker
      const reportsRes = await fetch(`/api/team/task-reports?worker_id=${workerId}`, { headers })
      const reportsJson = await reportsRes.json()
      if (reportsJson.reports) setReports(reportsJson.reports)

      // Load tasks for this worker
      const tasksRes = await fetch('/api/team/tasks', { headers })
      const tasksJson = await tasksRes.json()
      if (tasksJson.tasks) {
        setTasks(tasksJson.tasks.filter(t => t.assigned_to === workerId))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

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

  const handlePhotoSelect = (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length + newPhotos.length > 5) {
      alert('Max. 5 Fotos pro Aufgabe')
      return
    }
    setNewPhotoFiles(prev => [...prev, ...files])
    files.forEach(f => setNewPhotos(prev => [...prev, URL.createObjectURL(f)]))
  }

  const handleCreateTask = async () => {
    if (!newTitle.trim() || !newDue) return
    setSaving(true)
    try {
      const headers = await getAuthHeaders()
      const res = await fetch('/api/team/tasks', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: newTitle, description: newDesc, location: newLocation,
          assigned_to: workerId,
          due_date: newDue || null,
        })
      })
      const json = await res.json()
      if (json.task) {
        // Upload photos if any
        if (newPhotoFiles.length > 0) {
          const { data: { session } } = await supabase.auth.getSession()
          for (const file of newPhotoFiles) {
            const compressed = await compressImage(file)
            const formData = new FormData()
            formData.append('photo', compressed, `photo_${Date.now()}.jpg`)
            formData.append('task_id', json.task.id)
            formData.append('type', 'owner')
            console.log('📷 Uploading owner photo for task:', json.task.id)
            const uploadRes = await fetch('/api/team/tasks', {
              method: 'PUT',
              headers: { Authorization: `Bearer ${session?.access_token}` },
              body: formData
            })
            const uploadJson = await uploadRes.json()
            console.log('📷 Upload result:', uploadRes.status, uploadJson)
          }
          // Reload to get updated task with photos
          const reloadRes = await fetch('/api/team/tasks', { headers })
          const reloadJson = await reloadRes.json()
          if (reloadJson.tasks) setTasks(reloadJson.tasks.filter(t => t.assigned_to === workerId))
        } else {
          setTasks(prev => [json.task, ...prev])
        }
        setNewTitle(''); setNewDesc(''); setNewLocation(''); setNewDue(tomorrow)
        setNewPhotos([]); setNewPhotoFiles([])
        setShowTaskForm(false)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const startEditing = (task) => {
    setEditingTaskId(task.id)
    setNewTitle(task.title)
    setNewDesc(task.description || '')
    setNewLocation(task.location || '')
    setNewDue(task.due_date || '')
    setNewPhotos((task.owner_photos || []).map(p => p.url))
    setNewPhotoFiles([])
    setShowTaskForm(true)
  }

  const handleUpdateTask = async () => {
    if (!newTitle.trim() || !newDue) return
    setSaving(true)
    try {
      const headers = await getAuthHeaders()
      const res = await fetch('/api/team/tasks', {
        method: 'PATCH', headers,
        body: JSON.stringify({
          id: editingTaskId,
          title: newTitle, description: newDesc, location: newLocation,
          due_date: newDue || null,
        })
      })

      // Upload new photos if any
      if (newPhotoFiles.length > 0) {
        const { data: { session } } = await supabase.auth.getSession()
        for (const file of newPhotoFiles) {
          const compressed = await compressImage(file)
          const formData = new FormData()
          formData.append('photo', compressed, `photo_${Date.now()}.jpg`)
          formData.append('task_id', editingTaskId)
          formData.append('type', 'owner')
          await fetch('/api/team/tasks', {
            method: 'PUT',
            headers: { Authorization: `Bearer ${session?.access_token}` },
            body: formData
          })
        }
      }

      await loadData()
      setEditingTaskId(null)
      setShowTaskForm(false)
      setNewTitle(''); setNewDesc(''); setNewLocation(''); setNewDue(tomorrow)
      setNewPhotos([]); setNewPhotoFiles([])
    } catch (err) { console.error(err) }
    finally { setSaving(false) }
  }

  const handleDeleteTask = async (taskId) => {
    try {
      const headers = await getAuthHeaders()
      await fetch(`/api/team/tasks?id=${taskId}`, { method: 'DELETE', headers })
      setTasks(prev => prev.filter(t => t.id !== taskId))
    } catch (err) { console.error(err) }
  }

  const handleResetTask = async (taskId) => {
    const reason = prompt('Grund für Wiederholen (optional):')
    if (reason === null) return // cancelled

    try {
      const headers = await getAuthHeaders()
      // Reset task status
      const res = await fetch('/api/team/tasks', {
        method: 'PATCH', headers,
        body: JSON.stringify({
          id: taskId,
          status: 'pending',
          description: reason ? `[Wiederholen: ${reason}]` : undefined,
        })
      })
      // Remove final flag from reports so worker can continue
      const { data: { session } } = await supabase.auth.getSession()
      await fetch('/api/team/task-reports/reset-final', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: taskId })
      })
      const json = await res.json()
      if (json.task) {
        setTasks(prev => prev.map(t => t.id === taskId ? json.task : t))
        // Reload reports
        await loadData()
      }
    } catch (err) { console.error(err) }
  }

  const formatClock = (iso) => new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  const formatDate = (iso) => new Date(iso).toLocaleDateString('de-DE')
  const formatDuration = (start, end) => {
    const ms = new Date(end).getTime() - new Date(start).getTime()
    const totalMin = Math.floor(ms / 60000)
    const h = Math.floor(totalMin / 60)
    const m = totalMin % 60
    return `${h}h ${m}m`
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-purple-500 border-t-transparent mx-auto"></div>
      </div>
    )
  }

  if (!member) {
    return (
      <div className="max-w-3xl mx-auto p-6 text-center">
        <p className="text-slate-400">Mitarbeiter nicht gefunden</p>
        <button onClick={() => router.push('/dashboard/team')} className="mt-4 text-blue-400 hover:underline">
          Zurück zum Team
        </button>
      </div>
    )
  }

  const runningEntry = timeEntries.find(e => e.status === 'running')
  const completedEntries = timeEntries.filter(e => e.status === 'completed')
  const today = new Date().toISOString().split('T')[0]
  const isToday = (dateStr) => dateStr && dateStr.startsWith(today)

  // Aufgaben: open + today completed
  const aufgabenTasks = tasks.filter(t => t.status !== 'done' || isToday(t.completed_at))
  // Berichte: ALL completed (full history)
  const berichteTasks = tasks.filter(t => t.status === 'done')

  // Keep old names for compatibility
  const pendingTasks = aufgabenTasks
  const doneTasks = berichteTasks

  // Group time entries by date
  const entriesByDate = {}
  completedEntries.forEach(e => {
    const date = formatDate(e.start_time)
    if (!entriesByDate[date]) entriesByDate[date] = []
    entriesByDate[date].push(e)
  })

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Fullscreen image */}
      {fullImage && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setFullImage(null)}>
          <img src={fullImage} alt="" className="max-w-full max-h-full object-contain" />
          <button className="absolute top-4 right-4 text-white text-3xl" onClick={() => setFullImage(null)}>✕</button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.push('/dashboard/team')} className="text-slate-400 hover:text-white">
          ← Zurück
        </button>
      </div>

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
              <p className="text-green-400 text-sm font-semibold animate-pulse">
                ⏱️ Arbeitet seit {formatClock(runningEntry.start_time)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { key: 'time', label: '⏱️ Zeiterfassung' },
          { key: 'tasks', label: '📋 Aufgaben' },
          { key: 'reports', label: '📝 Berichte' },
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
                        <p className="text-white">
                          {formatClock(entry.start_time)} — {formatClock(entry.end_time)}
                        </p>
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

      {/* Tasks Tab */}
      {tab === 'tasks' && (
        <div className="space-y-4">
          {/* Add Task Button + Form */}
          {!showTaskForm ? (
            <button
              onClick={() => { setEditingTaskId(null); setNewTitle(''); setNewDesc(''); setNewLocation(''); setNewDue(tomorrow); setNewPhotos([]); setNewPhotoFiles([]); setShowTaskForm(true) }}
              className="w-full py-3 border-2 border-dashed border-slate-600 rounded-xl text-slate-400 hover:border-purple-500 hover:text-purple-400 transition-colors"
            >
              + Neue Aufgabe für {member.worker_name}
            </button>
          ) : (
            <div className="bg-slate-800/50 border border-purple-500/30 rounded-xl p-5 space-y-3">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Aufgabe *"
                className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder-slate-500"
                autoFocus
              />
              <textarea
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Beschreibung (optional)"
                rows={2}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder-slate-500"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  placeholder="Ort (optional)"
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder-slate-500"
                />
                <input
                  type="date"
                  value={newDue}
                  onChange={(e) => setNewDue(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl text-white"
                />
              </div>
              {/* Photos */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <label className="block text-slate-400 text-sm">Fotos (optional)</label>
                  {newPhotos.length < 5 && (
                    <label className="text-purple-400 text-xs cursor-pointer hover:underline">
                      + Foto
                      <input type="file" accept="image/*" multiple capture="environment" onChange={handlePhotoSelect} className="hidden" />
                    </label>
                  )}
                </div>
                {newPhotos.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 mb-2">
                    {newPhotos.map((url, i) => (
                      <div key={i} className="relative">
                        <img src={url} alt="" className="w-full h-16 object-cover rounded-lg" />
                        <button
                          onClick={() => {
                            setNewPhotos(prev => prev.filter((_, idx) => idx !== i))
                            setNewPhotoFiles(prev => prev.filter((_, idx) => idx !== i))
                          }}
                          className="absolute top-0.5 right-0.5 bg-red-600 text-white w-5 h-5 rounded-full text-xs"
                        >✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={editingTaskId ? handleUpdateTask : handleCreateTask}
                  disabled={saving || !newTitle.trim() || !newDue}
                  className="flex-1 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-500 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Wird gespeichert...' : editingTaskId ? 'Speichern' : 'Erstellen'}
                </button>
                <button
                  onClick={() => { setShowTaskForm(false); setEditingTaskId(null); setNewPhotos([]); setNewPhotoFiles([]) }}
                  className="px-4 py-3 bg-slate-700 text-slate-300 rounded-xl hover:bg-slate-600 transition-colors"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          )}

          {pendingTasks.length > 0 && (
            <div className="space-y-3">
              {pendingTasks.map(task => {
                const isDone = task.status === 'done'
                const taskReports = reports.filter(r => r.task_id === task.id)
                const isOpen = expandedTaskId === task.id

                return (
                  <div key={task.id} className={`bg-slate-800/50 border rounded-xl overflow-hidden ${isDone ? 'border-green-500/30' : 'border-slate-700'}`}>
                    {/* Header — always visible */}
                    <div className="p-4 flex items-start justify-between gap-3 cursor-pointer" onClick={() => setExpandedTaskId(isOpen ? null : task.id)}>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className={`font-medium ${isDone ? 'text-slate-400' : 'text-white'}`}>{task.title}</h4>
                          {isDone && <span className="bg-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded">✓ Erledigt</span>}
                          {taskReports.filter(r => !r.is_final).length > 0 && <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-0.5 rounded">{taskReports.filter(r => !r.is_final).length} Bericht{taskReports.filter(r => !r.is_final).length > 1 ? 'e' : ''}</span>}
                        </div>
                        <div className="flex gap-4 mt-1 text-xs text-slate-500">
                          {task.location && <span>📍 {task.location}</span>}
                          {task.due_date && <span>📅 {new Date(task.due_date).toLocaleDateString('de-DE')}</span>}
                        </div>
                      </div>
                      <span className="text-slate-500">{isOpen ? '▲' : '▼'}</span>
                    </div>

                    {/* Expanded — details + actions + reports */}
                    {isOpen && (
                      <div className="border-t border-slate-700 p-4 space-y-3">
                        {task.description && <p className="text-slate-400 text-sm">{task.description}</p>}

                        {/* Action buttons */}
                        <div className="flex gap-2 flex-wrap">
                          {!isDone && (
                            <button
                              onClick={() => startEditing(task)}
                              className="px-3 py-1.5 bg-slate-700 text-slate-300 rounded-lg text-xs hover:bg-slate-600 transition-colors"
                            >
                              ✏️ Bearbeiten
                            </button>
                          )}
                          {isDone && (
                            <button
                              onClick={() => handleResetTask(task.id)}
                              className="px-3 py-1.5 bg-slate-700 text-slate-300 rounded-lg text-xs hover:bg-slate-600 transition-colors"
                            >
                              ↩ Aufgabe wiederholen
                            </button>
                          )}
                          <button
                            onClick={() => { if (confirm('Aufgabe endgültig löschen?')) handleDeleteTask(task.id) }}
                            className="px-3 py-1.5 bg-slate-700 text-red-400 rounded-lg text-xs hover:bg-red-900/30 transition-colors"
                          >
                            🗑️ Löschen
                          </button>
                        </div>

                        {/* Owner photos */}
                        {(task.owner_photos || []).length > 0 && (
                          <div>
                            <p className="text-slate-500 text-xs mb-1">Ihre Fotos:</p>
                            <div className="grid grid-cols-4 gap-2">
                              {task.owner_photos.map((p, i) => (
                                <img key={i} src={p.url} alt="" className="w-full h-16 object-cover rounded-lg border border-purple-500/30 cursor-pointer" onClick={() => setFullImage(p.url)} />
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Task reports */}
                        {taskReports.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-slate-400 text-sm font-semibold">Berichte vom Mitarbeiter:</p>
                            {taskReports.map(r => (
                              <div key={r.id} className={`rounded-lg p-3 ${r.is_final ? 'bg-green-900/20 border border-green-500/30' : 'bg-slate-900/50'}`}>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-slate-500 text-xs">{new Date(r.created_at).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                                  {r.is_final ? <span className="text-green-400 text-xs font-semibold">Abschluss</span> : <span className="text-blue-400 text-xs">Zwischenbericht</span>}
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

                        {taskReports.length === 0 && !isDone && (
                          <p className="text-slate-500 text-sm">Noch keine Berichte vom Mitarbeiter</p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {pendingTasks.length === 0 && !showTaskForm && (
            <p className="text-slate-500 text-center py-8">Keine offenen Aufgaben</p>
          )}
        </div>
      )}

      {/* Reports Tab */}
      {tab === 'reports' && (() => {
        // Combine done tasks + free posts, group by date
        const byDate = {}

        const getDateKey = (iso) => iso ? iso.split('T')[0] : '1970-01-01'
        const formatDateLabel = (iso) => iso ? new Date(iso).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' }) : 'Unbekannt'

        // Done tasks
        doneTasks.forEach(task => {
          const key = getDateKey(task.completed_at)
          if (!byDate[key]) byDate[key] = { label: formatDateLabel(task.completed_at), tasks: [], freePosts: [] }
          byDate[key].tasks.push(task)
        })

        // Free posts (no task_id)
        const freePosts = reports.filter(r => !r.task_id)
        freePosts.forEach(post => {
          const key = getDateKey(post.created_at)
          if (!byDate[key]) byDate[key] = { label: formatDateLabel(post.created_at), tasks: [], freePosts: [] }
          byDate[key].freePosts.push(post)
        })

        return (
          <div className="space-y-6">
            {Object.keys(byDate).length > 0 ? (
              Object.entries(byDate).sort((a, b) => b[0].localeCompare(a[0])).map(([dateKey, { label, tasks: dateTasks, freePosts: datePosts }]) => (
                <div key={dateKey}>
                  <h3 className="text-white font-semibold mb-3">📅 {label}</h3>
                  {/* Merge tasks + free posts, sort by time newest first */}
                  {(() => {
                    const combined = [
                      ...dateTasks.map(t => ({ itemType: 'task', timestamp: t.completed_at || t.created_at, ...t })),
                      ...datePosts.map(p => ({ itemType: 'post', timestamp: p.created_at, ...p })),
                    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

                    return (
                      <div className="space-y-3">
                        {combined.map(item => {
                          if (item.itemType === 'task') {
                            const task = item
                            const taskReports = reports.filter(r => r.task_id === task.id)
                            return (
                              <div key={task.id} className="bg-slate-800/50 border border-green-500/20 rounded-xl overflow-hidden">
                                <div className="p-4 flex items-center justify-between cursor-pointer" onClick={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)}>
                                  <div className="flex items-center gap-2">
                                    <span className="text-green-400">✓</span>
                                    <h4 className="text-white font-medium">{task.title}</h4>
                                    {task.location && <span className="text-slate-500 text-xs">📍 {task.location}</span>}
                                    {taskReports.filter(r => !r.is_final).length > 0 && (
                                      <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-0.5 rounded">{taskReports.filter(r => !r.is_final).length}</span>
                                    )}
                                  </div>
                                  <span className="text-slate-500">{expandedTaskId === task.id ? '▲' : '▼'}</span>
                                </div>
                                {expandedTaskId === task.id && (
                                  <div className="border-t border-slate-700 p-4 space-y-2 pl-8 border-l-2 border-slate-600 ml-4">
                                    {taskReports.map(r => (
                                      <div key={r.id} className={`rounded-lg p-2 ${r.is_final ? 'bg-green-900/20' : 'bg-slate-900/30'}`}>
                                        <span className="text-slate-500 text-xs">
                                          {new Date(r.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                                          {r.is_final ? ' · Abschluss' : ''}
                                        </span>
                                        {r.text && <p className="text-slate-300 text-sm">{r.text}</p>}
                                        {r.photos?.length > 0 && (
                                          <div className="grid grid-cols-4 gap-1 mt-1">
                                            {r.photos.map((p, i) => (
                                              <img key={i} src={p.url} alt="" className="w-full h-14 object-cover rounded cursor-pointer" onClick={() => setFullImage(p.url)} />
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                    <button onClick={() => handleResetTask(task.id)}
                                      className="w-full mt-3 py-2 bg-slate-700 text-slate-300 rounded-lg text-sm hover:bg-slate-600 transition-colors">
                                      ↩ Aufgabe wiederholen
                                    </button>
                                  </div>
                                )}
                              </div>
                            )
                          } else {
                            const post = item
                            return (
                              <div key={post.id} className="bg-slate-800/50 border border-orange-500/20 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="bg-orange-500/20 text-orange-400 text-xs px-2 py-0.5 rounded">📸 Foto</span>
                                  <span className="text-slate-500 text-xs">
                                    {new Date(post.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                {post.text && <p className="text-slate-300 text-sm">{post.text}</p>}
                                {post.photos?.length > 0 && (
                                  <div className="grid grid-cols-4 gap-2 mt-2">
                                    {post.photos.map((p, i) => (
                                      <img key={i} src={p.url} alt="" className="w-full h-16 object-cover rounded-lg cursor-pointer" onClick={() => setFullImage(p.url)} />
                                    ))}
                                  </div>
                                )}
                              </div>
                            )
                          }
                        })}
                      </div>
                    )
                  })()}
                </div>
              ))
            ) : (
              <p className="text-slate-500 text-center py-8">Noch keine Berichte oder Fotos</p>
            )}
          </div>
        )
      })()}
    </div>
  )
}
