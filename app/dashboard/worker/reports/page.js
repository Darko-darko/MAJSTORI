// app/dashboard/worker/reports/page.js — Tagesbericht = auto gallery from tasks
'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function WorkerReportsPage() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

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

  // Group tasks with photos by date
  const tasksWithPhotos = tasks.filter(t =>
    (t.photos_before?.length > 0) || (t.photos_after?.length > 0) || t.worker_comment
  )

  const byDate = {}
  tasksWithPhotos.forEach(t => {
    const date = t.completed_at
      ? new Date(t.completed_at).toLocaleDateString('de-DE')
      : new Date(t.created_at).toLocaleDateString('de-DE')
    if (!byDate[date]) byDate[date] = []
    byDate[date].push(t)
  })

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-orange-500 border-t-transparent mx-auto"></div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white">Tagesbericht</h1>
      <p className="text-slate-400 text-sm">Automatische Übersicht aus Ihren Aufgaben</p>

      {Object.keys(byDate).length > 0 ? (
        Object.entries(byDate).map(([date, dateTasks]) => (
          <div key={date}>
            <h2 className="text-white font-semibold mb-3">{date}</h2>
            <div className="space-y-3">
              {dateTasks.map(task => (
                <div key={task.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                  <h3 className="text-white font-medium mb-2">{task.title}</h3>
                  {task.location && <p className="text-slate-500 text-xs mb-2">📍 {task.location}</p>}
                  {task.worker_comment && (
                    <p className="text-slate-300 text-sm mb-3 bg-slate-900/50 rounded-lg p-2">{task.worker_comment}</p>
                  )}

                  {/* Vorher */}
                  {task.photos_before?.length > 0 && (
                    <div className="mb-2">
                      <p className="text-slate-500 text-xs mb-1">Vorher:</p>
                      <div className="grid grid-cols-4 gap-2">
                        {task.photos_before.map((p, i) => (
                          <img key={i} src={p.url} alt="" className="w-full h-20 object-cover rounded-lg" />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Nachher */}
                  {task.photos_after?.length > 0 && (
                    <div>
                      <p className="text-slate-500 text-xs mb-1">Nachher:</p>
                      <div className="grid grid-cols-4 gap-2">
                        {task.photos_after.map((p, i) => (
                          <img key={i} src={p.url} alt="" className="w-full h-20 object-cover rounded-lg" />
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      task.status === 'done' ? 'bg-green-500/20 text-green-400' :
                      task.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {task.status === 'done' ? '✓ Erledigt' : task.status === 'in_progress' ? 'In Arbeit' : 'Offen'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      ) : (
        <div className="text-center py-12 text-slate-500">
          <p className="text-4xl mb-3">📸</p>
          <p>Noch keine Berichte vorhanden</p>
          <p className="text-sm mt-1">Fotos und Kommentare aus Aufgaben erscheinen hier automatisch</p>
        </div>
      )}
    </div>
  )
}
