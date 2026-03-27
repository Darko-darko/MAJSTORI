// app/dashboard/team/tasks/page.js — Owner creates/manages tasks
'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function OwnerTasksPage() {
  const [tasks, setTasks] = useState([])
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { loadData() }, [])

  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return { Authorization: `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' }
  }

  const loadData = async () => {
    try {
      const headers = await getAuthHeaders()

      const [tasksRes, membersRes] = await Promise.all([
        fetch('/api/team/tasks', { headers }),
        fetch('/api/team', { headers }),
      ])

      const tasksJson = await tasksRes.json()
      const membersJson = await membersRes.json()

      if (tasksJson.tasks) setTasks(tasksJson.tasks)
      if (membersJson.members) setMembers(membersJson.members.filter(m => m.status === 'active'))
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!title.trim()) { setError('Titel ist erforderlich'); return }
    setSaving(true)
    setError('')

    try {
      const headers = await getAuthHeaders()
      const res = await fetch('/api/team/tasks', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title, description, location,
          assigned_to: assignedTo || null,
          due_date: dueDate || null,
        })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)

      setTasks(prev => [json.task, ...prev])
      setTitle(''); setDescription(''); setLocation(''); setAssignedTo(''); setDueDate('')
      setShowForm(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Aufgabe wirklich löschen?')) return
    try {
      const headers = await getAuthHeaders()
      await fetch(`/api/team/tasks?id=${id}`, { method: 'DELETE', headers })
      setTasks(prev => prev.filter(t => t.id !== id))
    } catch (err) {
      console.error(err)
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent mx-auto"></div>
      </div>
    )
  }

  const pending = tasks.filter(t => t.status !== 'done')
  const done = tasks.filter(t => t.status === 'done')

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Aufgaben verwalten</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-500 transition-colors"
        >
          {showForm ? 'Abbrechen' : '+ Neue Aufgabe'}
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-slate-400 text-sm mb-1">Titel *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => { setTitle(e.target.value); setError('') }}
              placeholder="z.B. Badezimmer fliesen"
              className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder-slate-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 text-sm mb-1">Beschreibung</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Details zur Aufgabe..."
              rows={2}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder-slate-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 text-sm mb-1">Ort</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="z.B. Müller Str. 5"
                className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder-slate-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 text-sm mb-1">Fällig am</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 text-sm mb-1">Zuweisen an</label>
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl text-white"
            >
              <option value="">Nicht zugewiesen</option>
              {members.map(m => (
                <option key={m.id} value={m.worker_id}>{m.worker_name}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleCreate}
            disabled={saving}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-500 transition-colors disabled:opacity-50"
          >
            {saving ? 'Wird erstellt...' : 'Aufgabe erstellen'}
          </button>
        </div>
      )}

      {/* Pending Tasks */}
      {pending.length > 0 && (
        <div>
          <h2 className="text-white font-semibold mb-3">Offen ({pending.length})</h2>
          <div className="space-y-2">
            {pending.map(task => (
              <div key={task.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-white font-medium">{task.title}</h3>
                  {task.description && <p className="text-slate-400 text-sm mt-1">{task.description}</p>}
                  <div className="flex gap-4 mt-2 text-xs text-slate-500">
                    {task.location && <span>📍 {task.location}</span>}
                    {task.due_date && <span>📅 {new Date(task.due_date).toLocaleDateString('de-DE')}</span>}
                    {task.assigned?.full_name && <span>👷 {task.assigned.full_name}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded ${
                    task.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400' : 'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {task.status === 'in_progress' ? 'In Arbeit' : 'Offen'}
                  </span>
                  <button onClick={() => handleDelete(task.id)} className="text-slate-500 hover:text-red-400 text-sm">✕</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Done Tasks */}
      {done.length > 0 && (
        <div>
          <h2 className="text-slate-400 font-semibold mb-3">Erledigt ({done.length})</h2>
          <div className="space-y-2">
            {done.map(task => (
              <div key={task.id} className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-4 opacity-60">
                <div className="flex items-center gap-3">
                  <span className="text-green-400">✓</span>
                  <span className="text-slate-400 line-through">{task.title}</span>
                  {task.assigned?.full_name && <span className="text-xs text-slate-500">— {task.assigned.full_name}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tasks.length === 0 && !showForm && (
        <div className="text-center py-12 text-slate-500">
          <p className="text-4xl mb-3">📋</p>
          <p>Noch keine Aufgaben erstellt</p>
          <p className="text-sm mt-1">Erstellen Sie Aufgaben für Ihr Team</p>
        </div>
      )}
    </div>
  )
}
