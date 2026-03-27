// app/dashboard/worker/page.js — Worker Dashboard
'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
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

export default function WorkerDashboard() {
  const [worker, setWorker] = useState(null)
  const [teamInfo, setTeamInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(null)
  const [todayEntries, setTodayEntries] = useState([])
  const [showPhotoForm, setShowPhotoForm] = useState(false)
  const [photoText, setPhotoText] = useState('')
  const [photoFiles, setPhotoFiles] = useState([])
  const [photoPreviews, setPhotoPreviews] = useState([])
  const [sendingPhoto, setSendingPhoto] = useState(false)
  const fileRef = useRef(null)
  const router = useRouter()

  useEffect(() => {
    loadWorkerData()

    const channel = supabase
      .channel('worker-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => loadWorkerData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'work_times' }, () => loadWorkerData())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
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

  const handleSendPhoto = async () => {
    if (!photoText.trim() && photoFiles.length === 0) return
    setSendingPhoto(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const headers = { Authorization: `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' }

      // Create report without task_id
      const res = await fetch('/api/team/task-reports', {
        method: 'POST', headers,
        body: JSON.stringify({ text: photoText.trim() || '📸 Foto', task_id: null })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)

      // Upload photos
      if (photoFiles.length > 0 && json.report) {
        for (const file of photoFiles) {
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

      setPhotoText('')
      setPhotoFiles([])
      setPhotoPreviews([])
      setShowPhotoForm(false)
    } catch (err) { alert(err.message) }
    finally { setSendingPhoto(false) }
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

        <button onClick={() => router.push('/dashboard/worker/aufgaben')} className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 text-center hover:border-blue-500/50 transition-colors">
          <div className="text-4xl mb-2">📋</div>
          <p className="text-white font-semibold">Aufgaben</p>
        </button>

        <button onClick={() => router.push('/dashboard/worker/reports')} className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 text-center hover:border-orange-500/50 transition-colors">
          <div className="text-4xl mb-2">📝</div>
          <p className="text-white font-semibold">Tagesbericht</p>
        </button>
      </div>

      {/* Quick Photo */}
      <input ref={fileRef} type="file" accept="image/*" multiple capture="environment" onChange={(e) => {
        const files = Array.from(e.target.files || [])
        setPhotoFiles(prev => [...prev, ...files])
        files.forEach(f => setPhotoPreviews(prev => [...prev, URL.createObjectURL(f)]))
        if (fileRef.current) fileRef.current.value = ''
        setShowPhotoForm(true)
      }} className="hidden" />

      {!showPhotoForm ? (
        <button
          onClick={() => fileRef.current?.click()}
          className="w-full py-4 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-xl font-bold text-lg hover:from-orange-500 hover:to-amber-500 transition-all"
        >
          📸 Foto senden
        </button>
      ) : (
        <div className="bg-slate-800/50 border border-orange-500/30 rounded-xl p-4 space-y-3">
          <textarea
            value={photoText}
            onChange={(e) => setPhotoText(e.target.value)}
            placeholder="Beschreibung (optional)..."
            rows={2}
            className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder-slate-500 text-sm"
            autoFocus
          />
          {photoPreviews.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {photoPreviews.map((url, i) => (
                <div key={i} className="relative">
                  <img src={url} alt="" className="w-full h-20 object-cover rounded-lg" />
                  <button onClick={() => {
                    setPhotoPreviews(prev => prev.filter((_, idx) => idx !== i))
                    setPhotoFiles(prev => prev.filter((_, idx) => idx !== i))
                  }} className="absolute top-0.5 right-0.5 bg-red-600 text-white w-5 h-5 rounded-full text-xs">✕</button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={() => fileRef.current?.click()} className="px-3 py-2 bg-slate-700 text-slate-300 rounded-lg text-sm">
              + Foto
            </button>
            <button
              onClick={handleSendPhoto}
              disabled={sendingPhoto || (!photoText.trim() && photoFiles.length === 0)}
              className="flex-1 py-2 bg-orange-600 text-white rounded-lg font-semibold disabled:opacity-50"
            >
              {sendingPhoto ? '...' : '📤 Senden'}
            </button>
            <button onClick={() => { setShowPhotoForm(false); setPhotoText(''); setPhotoFiles([]); setPhotoPreviews([]) }}
              className="px-3 py-2 bg-slate-700 text-slate-300 rounded-lg text-sm">Abbrechen</button>
          </div>
        </div>
      )}

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
