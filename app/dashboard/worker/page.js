// app/dashboard/worker/page.js — Worker Dashboard
'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function WorkerDashboard() {
  const [worker, setWorker] = useState(null)
  const [teamInfo, setTeamInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(null)
  const [todayEntries, setTodayEntries] = useState([])
  const router = useRouter()

  useEffect(() => {
    loadWorkerData()
  }, [])

  const loadWorkerData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: majstor } = await supabase
        .from('majstors')
        .select('*')
        .eq('id', user.id)
        .single()
      setWorker(majstor)

      // Get team membership
      const { data: membership } = await supabase
        .from('team_members')
        .select('*, owner:owner_id(full_name, business_name)')
        .eq('worker_id', user.id)
        .eq('status', 'active')
        .single()

      if (membership) {
        setTeamInfo({
          ownerName: membership.owner?.business_name || membership.owner?.full_name,
          workerName: membership.worker_name,
          joinedAt: membership.joined_at,
        })
      }

      // Load today's time entries
      const { data: { session } } = await supabase.auth.getSession()
      const today = new Date().toISOString().split('T')[0]
      const timeRes = await fetch(`/api/team/time?date=${today}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      })
      const timeJson = await timeRes.json()
      if (timeJson.entries) {
        const runningEntry = timeJson.entries.find(e => e.status === 'running')
        if (runningEntry) setRunning(runningEntry)
        setTodayEntries(timeJson.entries.filter(e => e.status === 'completed'))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-purple-500 border-t-transparent mx-auto"></div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 border border-purple-500/30 rounded-2xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-purple-600 rounded-full flex items-center justify-center text-2xl font-bold text-white">
            {worker?.full_name?.charAt(0)?.toUpperCase() || '👷'}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">
              Hallo, {teamInfo?.workerName || worker?.full_name}!
            </h1>
            {teamInfo && (
              <p className="text-slate-400">
                Team: <span className="text-purple-400">{teamInfo.ownerName}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-4">
        <button onClick={() => router.push('/dashboard/worker/time')} className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 text-center hover:border-green-500/50 transition-colors">
          <div className="text-4xl mb-2">⏱️</div>
          <p className="text-white font-semibold">Zeiterfassung</p>
        </button>

        <button onClick={() => router.push('/dashboard/worker/tasks')} className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 text-center hover:border-blue-500/50 transition-colors">
          <div className="text-4xl mb-2">📋</div>
          <p className="text-white font-semibold">Aufgaben</p>
        </button>

        <button onClick={() => router.push('/dashboard/worker/reports')} className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 text-center hover:border-orange-500/50 transition-colors">
          <div className="text-4xl mb-2">📝</div>
          <p className="text-white font-semibold">Tagesbericht</p>
        </button>
      </div>

      {/* Today's Status */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
        <h3 className="text-white font-semibold mb-3">Heute</h3>
        {running ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <p className="text-green-400">Läuft seit {new Date(running.start_time).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
            <button onClick={() => router.push('/dashboard/worker/time')} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-500 transition-colors">
              Stoppen
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-slate-500 rounded-full"></div>
              <p className="text-slate-400">
                {todayEntries.length > 0
                  ? `${todayEntries.length} Eintrag${todayEntries.length > 1 ? 'e' : ''} heute`
                  : 'Keine Zeiterfassung aktiv'}
              </p>
            </div>
            <button onClick={() => router.push('/dashboard/worker/time')} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-500 transition-colors">
              Starten
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
