// app/dashboard/worker/time/page.js — Zeiterfassung (Worker)
'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

export default function WorkerTimePage() {
  const [running, setRunning] = useState(null) // current running entry
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef(null)

  useEffect(() => {
    loadEntries()

    // Realtime: if timer is stopped externally (cron, owner), UI updates immediately
    const channel = supabase
      .channel('worker-time')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'work_times' }, () => loadEntries())
      .subscribe()

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      supabase.removeChannel(channel)
    }
  }, [])

  // Timer tick
  useEffect(() => {
    if (running) {
      timerRef.current = setInterval(() => {
        const start = new Date(running.start_time).getTime()
        setElapsed(Math.floor((Date.now() - start) / 1000))
      }, 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
      setElapsed(0)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [running])

  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return { Authorization: `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' }
  }

  const loadEntries = async () => {
    try {
      const headers = await getAuthHeaders()
      const today = new Date().toISOString().split('T')[0]
      const res = await fetch(`/api/team/time?date=${today}`, { headers })
      const json = await res.json()

      if (json.entries) {
        const runningEntry = json.entries.find(e => e.status === 'running')
        if (runningEntry) setRunning(runningEntry)
        setEntries(json.entries.filter(e => e.status === 'completed'))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const getGPS = () => new Promise((resolve) => {
    if (!navigator.geolocation) { resolve({}); return }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve({}),
      { timeout: 5000 }
    )
  })

  const handleStart = async () => {
    setActionLoading(true)
    try {
      const gps = await getGPS()
      const headers = await getAuthHeaders()
      const res = await fetch('/api/team/time', {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'start', ...gps })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setRunning(json.entry)
    } catch (err) {
      alert(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleStop = async () => {
    setActionLoading(true)
    try {
      const gps = await getGPS()
      const headers = await getAuthHeaders()
      const res = await fetch('/api/team/time', {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'stop', ...gps })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setEntries(prev => [json.entry, ...prev])
      setRunning(null)
    } catch (err) {
      alert(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const formatDuration = (start, end) => {
    const ms = new Date(end).getTime() - new Date(start).getTime()
    const totalMin = Math.floor(ms / 60000)
    const h = Math.floor(totalMin / 60)
    const m = totalMin % 60
    return `${h}h ${m}m`
  }

  const formatClock = (iso) => {
    return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-green-500 border-t-transparent mx-auto"></div>
      </div>
    )
  }

  const isLongRunning = elapsed > 10 * 3600 // 10h warning

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white">Zeiterfassung</h1>

      {/* Timer Card */}
      <div className={`border rounded-2xl p-8 text-center ${
        running
          ? isLongRunning
            ? 'bg-red-900/20 border-red-500/50'
            : 'bg-green-900/20 border-green-500/50'
          : 'bg-slate-800/50 border-slate-700'
      }`}>
        {running ? (
          <>
            <div className={`text-6xl font-mono font-bold mb-2 ${isLongRunning ? 'text-red-400' : 'text-green-400'}`}>
              {formatTime(elapsed)}
            </div>
            <p className="text-slate-400 mb-1">
              Gestartet um {formatClock(running.start_time)}
            </p>
            {isLongRunning && (
              <p className="text-red-400 text-sm mb-4 animate-pulse">
                Zeiterfassung läuft seit über 10 Stunden!
              </p>
            )}
            {running.start_lat && (
              <p className="text-green-500 text-xs mb-4">📍 Standort erfasst ✓</p>
            )}

            <button
              onClick={handleStop}
              disabled={actionLoading}
              className="px-12 py-4 bg-red-600 text-white rounded-xl font-bold text-xl hover:bg-red-500 transition-colors disabled:opacity-50"
            >
              {actionLoading ? '...' : '⏹ Stoppen'}
            </button>
          </>
        ) : (
          <>
            <div className="text-6xl font-mono font-bold text-slate-600 mb-4">
              00:00:00
            </div>
            <button
              onClick={handleStart}
              disabled={actionLoading}
              className="px-12 py-4 bg-green-600 text-white rounded-xl font-bold text-xl hover:bg-green-500 transition-colors disabled:opacity-50"
            >
              {actionLoading ? '...' : '▶ Starten'}
            </button>
          </>
        )}
      </div>

      {/* Today's Entries */}
      <div>
        <h2 className="text-white font-semibold mb-3">Heute</h2>
        {entries.length > 0 ? (
          <div className="space-y-2">
            {entries.map((entry) => (
              <div key={entry.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <p className="text-white font-medium">
                    {formatClock(entry.start_time)} — {formatClock(entry.end_time)}
                  </p>
                  <p className="text-green-400 font-bold">
                    {formatDuration(entry.start_time, entry.end_time)}
                  </p>
                </div>
                {(entry.start_lat || entry.end_lat) && (
                  <p className="text-slate-500 text-xs mt-1">📍 Standort erfasst</p>
                )}
                {entry.note && (
                  <p className="text-slate-400 text-xs mt-1">{entry.note}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-500 text-sm">Noch keine Einträge heute</p>
        )}
      </div>
    </div>
  )
}
