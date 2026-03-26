// app/dashboard/worker/tasks/page.js — Worker's tasks view
'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function WorkerTasksPage() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending') // pending, done, all

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
        method: 'PATCH',
        headers,
        body: JSON.stringify({ id: taskId, status: newStatus })
      })
      const json = await res.json()
      if (json.task) {
        setTasks(prev => prev.map(t => t.id === taskId ? json.task : t))
      }
    } catch (err) {
      console.error(err)
    }
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

  const pendingCount = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Meine Aufgaben</h1>
        {pendingCount > 0 && (
          <span className="bg-blue-600 text-white text-sm px-3 py-1 rounded-full font-semibold">
            {pendingCount} offen
          </span>
        )}
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {[
          { key: 'pending', label: 'Offen' },
          { key: 'done', label: 'Erledigt' },
          { key: 'all', label: 'Alle' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              filter === f.key
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Task List */}
      <div className="space-y-3">
        {filtered.map(task => (
          <div key={task.id} className={`bg-slate-800/50 border rounded-xl p-5 ${
            task.status === 'done' ? 'border-green-500/30 opacity-70' : 'border-slate-700'
          }`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className={`font-semibold ${task.status === 'done' ? 'text-slate-400 line-through' : 'text-white'}`}>
                  {task.title}
                </h3>
                {task.description && (
                  <p className="text-slate-400 text-sm mt-1">{task.description}</p>
                )}
                <div className="flex gap-4 mt-2 text-xs text-slate-500">
                  {task.location && <span>📍 {task.location}</span>}
                  {task.due_date && <span>📅 {new Date(task.due_date).toLocaleDateString('de-DE')}</span>}
                </div>
              </div>

              <div>
                {task.status === 'pending' && (
                  <button
                    onClick={() => handleStatusChange(task.id, 'in_progress')}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-500 transition-colors"
                  >
                    Starten
                  </button>
                )}
                {task.status === 'in_progress' && (
                  <button
                    onClick={() => handleStatusChange(task.id, 'done')}
                    className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-500 transition-colors"
                  >
                    ✓ Fertig
                  </button>
                )}
                {task.status === 'done' && (
                  <span className="text-green-400 text-sm">✓ Erledigt</span>
                )}
              </div>
            </div>
          </div>
        ))}

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
