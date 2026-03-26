// app/dashboard/worker/reports/page.js — Tagesbericht = auto gallery from task reports
'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function WorkerReportsPage() {
  const [tasks, setTasks] = useState([])
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [fullImage, setFullImage] = useState(null)

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
      if (reportsJson.reports) setReports(reportsJson.reports)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  // Group reports by date
  const byDate = {}
  reports.forEach(r => {
    const date = new Date(r.created_at).toLocaleDateString('de-DE')
    if (!byDate[date]) byDate[date] = []
    byDate[date].push(r)
  })

  // Map task_id to task title
  const taskMap = {}
  tasks.forEach(t => { taskMap[t.id] = t })

  if (loading) {
    return <div className="max-w-2xl mx-auto p-6"><div className="animate-spin rounded-full h-8 w-8 border-4 border-orange-500 border-t-transparent mx-auto"></div></div>
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Fullscreen image */}
      {fullImage && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setFullImage(null)}>
          <img src={fullImage} alt="" className="max-w-full max-h-full object-contain" />
          <button className="absolute top-4 right-4 text-white text-3xl" onClick={() => setFullImage(null)}>✕</button>
        </div>
      )}

      <h1 className="text-2xl font-bold text-white">Tagesbericht</h1>
      <p className="text-slate-400 text-sm">Übersicht aller Berichte aus Ihren Aufgaben</p>

      {Object.keys(byDate).length > 0 ? (
        Object.entries(byDate).map(([date, dateReports]) => (
          <div key={date}>
            <h2 className="text-white font-semibold mb-3">{date}</h2>
            <div className="space-y-3">
              {dateReports.map(r => {
                const task = taskMap[r.task_id]
                return (
                  <div key={r.id} className={`bg-slate-800/50 border rounded-xl p-4 ${r.is_final ? 'border-green-500/30' : 'border-slate-700'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-slate-500 text-xs">
                        {new Date(r.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {task && <span className="text-purple-400 text-xs font-semibold">{task.title}</span>}
                      {task?.location && <span className="text-slate-500 text-xs">📍 {task.location}</span>}
                      {r.is_final && <span className="bg-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded">Abschluss</span>}
                    </div>
                    {r.text && <p className="text-slate-300 text-sm">{r.text}</p>}
                    {r.photos?.length > 0 && (
                      <div className="grid grid-cols-4 gap-2 mt-2">
                        {r.photos.map((p, i) => (
                          <img key={i} src={p.url} alt="" className="w-full h-20 object-cover rounded-lg cursor-pointer" onClick={() => setFullImage(p.url)} />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))
      ) : (
        <div className="text-center py-12 text-slate-500">
          <p className="text-4xl mb-3">📸</p>
          <p>Noch keine Berichte vorhanden</p>
          <p className="text-sm mt-1">Senden Sie Berichte aus Ihren Aufgaben</p>
        </div>
      )}
    </div>
  )
}
