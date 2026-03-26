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
  const [newDue, setNewDue] = useState('')
  const [saving, setSaving] = useState(false)
  const [newPhotos, setNewPhotos] = useState([]) // preview URLs
  const [newPhotoFiles, setNewPhotoFiles] = useState([]) // actual files

  useEffect(() => { loadData() }, [workerId])

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

      // Load reports for this worker
      const reportsRes = await fetch(`/api/team/reports?worker_id=${workerId}`, { headers })
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
    if (!newTitle.trim()) return
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
        setNewTitle(''); setNewDesc(''); setNewLocation(''); setNewDue('')
        setNewPhotos([]); setNewPhotoFiles([])
        setShowTaskForm(false)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteTask = async (taskId) => {
    try {
      const headers = await getAuthHeaders()
      await fetch(`/api/team/tasks?id=${taskId}`, { method: 'DELETE', headers })
      setTasks(prev => prev.filter(t => t.id !== taskId))
    } catch (err) { console.error(err) }
  }

  const handleResetTask = async (taskId) => {
    const reason = prompt('Grund für Zurücksetzen (optional):')
    if (reason === null) return // cancelled

    try {
      const headers = await getAuthHeaders()
      const res = await fetch('/api/team/tasks', {
        method: 'PATCH', headers,
        body: JSON.stringify({
          id: taskId,
          status: 'pending',
          description: reason ? `[Zurückgesetzt: ${reason}]` : undefined,
        })
      })
      const json = await res.json()
      if (json.task) setTasks(prev => prev.map(t => t.id === taskId ? json.task : t))
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
  const pendingTasks = tasks.filter(t => t.status !== 'done')
  const doneTasks = tasks.filter(t => t.status === 'done')

  // Group time entries by date
  const entriesByDate = {}
  completedEntries.forEach(e => {
    const date = formatDate(e.start_time)
    if (!entriesByDate[date]) entriesByDate[date] = []
    entriesByDate[date].push(e)
  })

  return (
    <div className="max-w-3xl mx-auto space-y-6">
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
              onClick={() => setShowTaskForm(true)}
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
                  onClick={handleCreateTask}
                  disabled={saving || !newTitle.trim()}
                  className="flex-1 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-500 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Wird erstellt...' : 'Erstellen'}
                </button>
                <button
                  onClick={() => { setShowTaskForm(false); setNewPhotos([]); setNewPhotoFiles([]) }}
                  className="px-4 py-3 bg-slate-700 text-slate-300 rounded-xl hover:bg-slate-600 transition-colors"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          )}

          {pendingTasks.length > 0 && (
            <div>
              <h3 className="text-white font-semibold mb-2">Offen ({pendingTasks.length})</h3>
              <div className="space-y-3">
                {pendingTasks.map(task => (
                  <div key={task.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <h4 className="text-white font-medium">{task.title}</h4>
                        {task.description && <p className="text-slate-400 text-sm mt-1">{task.description}</p>}
                        <div className="flex gap-4 mt-2 text-xs text-slate-500">
                          {task.location && <span>📍 {task.location}</span>}
                          {task.due_date && <span>📅 {new Date(task.due_date).toLocaleDateString('de-DE')}</span>}
                        </div>
                      </div>
                      <button
                        onClick={() => { if (confirm('Aufgabe löschen?')) handleDeleteTask(task.id) }}
                        className="text-slate-500 hover:text-red-400 text-sm"
                      >✕</button>
                    </div>
                    {/* Owner photos */}
                    {(task.owner_photos || []).length > 0 && (
                      <div>
                        <p className="text-slate-500 text-xs mb-1">Ihre Fotos:</p>
                        <div className="grid grid-cols-4 gap-2">
                          {task.owner_photos.map((p, i) => (
                            <img key={i} src={p.url} alt="" className="w-full h-16 object-cover rounded-lg border border-purple-500/30" />
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Worker comment if any */}
                    {task.worker_comment && (
                      <div className="bg-slate-900/50 rounded-lg p-2">
                        <p className="text-slate-500 text-xs mb-1">Kommentar vom Mitarbeiter:</p>
                        <p className="text-slate-300 text-sm">{task.worker_comment}</p>
                      </div>
                    )}
                    {/* Worker photos if any */}
                    {((task.photos_before?.length > 0) || (task.photos_after?.length > 0)) && (
                      <div className="flex gap-4">
                        {task.photos_before?.length > 0 && (
                          <div>
                            <p className="text-slate-500 text-xs mb-1">Vorher:</p>
                            <div className="flex gap-1">
                              {task.photos_before.map((p, i) => (
                                <img key={i} src={p.url} alt="" className="w-12 h-12 object-cover rounded" />
                              ))}
                            </div>
                          </div>
                        )}
                        {task.photos_after?.length > 0 && (
                          <div>
                            <p className="text-slate-500 text-xs mb-1">Nachher:</p>
                            <div className="flex gap-1">
                              {task.photos_after.map((p, i) => (
                                <img key={i} src={p.url} alt="" className="w-12 h-12 object-cover rounded" />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {doneTasks.length > 0 && (
            <div>
              <h3 className="text-slate-400 font-semibold mb-2">Erledigt ({doneTasks.length})</h3>
              <div className="space-y-2">
                {doneTasks.map(task => (
                  <div key={task.id} className="bg-slate-800/30 border border-green-500/20 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <h4 className="text-white font-medium"><span className="text-green-400">✓</span> {task.title}</h4>
                        {task.worker_comment && (
                          <p className="text-slate-300 text-sm mt-1 bg-slate-900/50 rounded p-2">{task.worker_comment}</p>
                        )}
                        {(task.photos_before?.length > 0 || task.photos_after?.length > 0) && (
                          <div className="flex gap-4 mt-2">
                            {task.photos_before?.length > 0 && (
                              <div>
                                <p className="text-slate-500 text-xs mb-1">Vorher:</p>
                                <div className="flex gap-1">
                                  {task.photos_before.map((p, i) => (
                                    <img key={i} src={p.url} alt="" className="w-12 h-12 object-cover rounded" />
                                  ))}
                                </div>
                              </div>
                            )}
                            {task.photos_after?.length > 0 && (
                              <div>
                                <p className="text-slate-500 text-xs mb-1">Nachher:</p>
                                <div className="flex gap-1">
                                  {task.photos_after.map((p, i) => (
                                    <img key={i} src={p.url} alt="" className="w-12 h-12 object-cover rounded" />
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleResetTask(task.id)}
                        className="px-3 py-1.5 bg-slate-700 text-slate-300 rounded-lg text-xs hover:bg-slate-600 transition-colors whitespace-nowrap"
                      >
                        ↩ Zurücksetzen
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tasks.length === 0 && (
            <p className="text-slate-500 text-center py-8">Keine Aufgaben zugewiesen</p>
          )}
        </div>
      )}

      {/* Reports Tab */}
      {tab === 'reports' && (
        <div className="space-y-4">
          {reports.length > 0 ? (
            reports.map(r => (
              <div key={r.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-white font-semibold">
                    {new Date(r.report_date).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </h3>
                  {r.locked && <span className="text-yellow-400 text-xs">🔒</span>}
                </div>
                {r.text && <p className="text-slate-300 text-sm mb-3">{r.text}</p>}
                {r.photos?.length > 0 && (
                  <div className="grid grid-cols-4 gap-2">
                    {r.photos.map((photo, idx) => (
                      <img key={idx} src={photo.url} alt="" className="w-full h-20 object-cover rounded-lg" />
                    ))}
                  </div>
                )}
                {!r.text && !r.photos?.length && (
                  <p className="text-slate-500 text-sm">Kein Inhalt</p>
                )}
              </div>
            ))
          ) : (
            <p className="text-slate-500 text-center py-8">Noch keine Berichte</p>
          )}
        </div>
      )}
    </div>
  )
}
