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
  const [tab, setTab] = useState('time') // time, tasks
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newLocation, setNewLocation] = useState('')
  const [newDue, setNewDue] = useState('')
  const [saving, setSaving] = useState(false)

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
        setTasks(prev => [json.task, ...prev])
        setNewTitle(''); setNewDesc(''); setNewLocation(''); setNewDue('')
        setShowTaskForm(false)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
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
              <div className="flex gap-3">
                <button
                  onClick={handleCreateTask}
                  disabled={saving || !newTitle.trim()}
                  className="flex-1 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-500 transition-colors disabled:opacity-50"
                >
                  {saving ? '...' : 'Erstellen'}
                </button>
                <button
                  onClick={() => setShowTaskForm(false)}
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
              <div className="space-y-2">
                {pendingTasks.map(task => (
                  <div key={task.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                    <h4 className="text-white font-medium">{task.title}</h4>
                    {task.description && <p className="text-slate-400 text-sm mt-1">{task.description}</p>}
                    <div className="flex gap-4 mt-2 text-xs text-slate-500">
                      {task.location && <span>📍 {task.location}</span>}
                      {task.due_date && <span>📅 {new Date(task.due_date).toLocaleDateString('de-DE')}</span>}
                      <span className={task.status === 'in_progress' ? 'text-blue-400' : 'text-yellow-400'}>
                        {task.status === 'in_progress' ? 'In Arbeit' : 'Offen'}
                      </span>
                    </div>
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
                  <div key={task.id} className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-4 opacity-60">
                    <span className="text-green-400">✓</span> <span className="text-slate-400 line-through">{task.title}</span>
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
    </div>
  )
}
