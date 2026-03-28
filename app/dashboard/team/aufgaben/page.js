// app/dashboard/team/aufgaben/page.js — Owner: open conversations (Aufgaben)
'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function OwnerAufgabenPage() {
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterWorker, setFilterWorker] = useState('')
  const [workers, setWorkers] = useState([])
  const router = useRouter()

  useEffect(() => {
    loadData()
    const channel = supabase
      .channel('owner-aufgaben')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => loadData())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const getHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return { Authorization: `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' }
  }

  const loadData = async () => {
    try {
      const headers = await getHeaders()
      const [convRes, teamRes] = await Promise.all([
        fetch('/api/team/conversations?status=open', { headers }),
        fetch('/api/team', { headers }),
      ])
      const convJson = await convRes.json()
      const teamJson = await teamRes.json()
      if (convJson.conversations) setConversations(convJson.conversations)
      if (teamJson.members) setWorkers(teamJson.members.filter(m => m.status === 'active'))
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const handleClose = async (convId) => {
    try {
      const headers = await getHeaders()
      await fetch(`/api/team/conversations/${convId}`, {
        method: 'PATCH', headers,
        body: JSON.stringify({ status: 'closed' })
      })
      await loadData()
    } catch (err) { console.error(err) }
  }

  const formatDate = (iso) => new Date(iso).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })
  const formatTime = (iso) => new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })

  const activeWorkerIds = new Set(workers.map(w => w.worker_id))
  const nonBroadcast = conversations.filter(c => !c.is_broadcast && activeWorkerIds.has(c.worker_id))
  const filtered = filterWorker
    ? nonBroadcast.filter(c => c.worker_id === filterWorker)
    : nonBroadcast

  // Separate: owner-started (tasks) first, then worker-started (incoming)
  const ownerStarted = filtered.filter(c => c.started_by === c.owner_id)
  const workerStarted = filtered.filter(c => c.started_by !== c.owner_id)

  if (loading) {
    return <div className="max-w-2xl mx-auto p-6"><div className="animate-spin rounded-full h-8 w-8 border-4 border-purple-500 border-t-transparent mx-auto"></div></div>
  }

  const ConvCard = ({ conv }) => (
    <div
      className={`bg-slate-800/50 border rounded-xl p-4 cursor-pointer hover:border-purple-500/50 transition-colors ${
        conv.title ? 'border-blue-500/30' : 'border-slate-700'
      }`}
      onClick={() => router.push(`/dashboard/team/feed?conv=${conv.id}`)}
    >
      <div className="flex items-center gap-2 mb-1">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${
          conv.started_by === conv.owner_id ? 'bg-purple-600' : 'bg-orange-600'
        }`}>
          {conv.worker_name?.charAt(0)?.toUpperCase() || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-white font-medium text-sm">{conv.worker_name}</span>
          <span className="text-slate-500 text-xs ml-2">{formatDate(conv.last_message_at || conv.created_at)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {conv.title && <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-0.5 rounded">📋</span>}
          <span className="text-slate-500 text-xs">{conv.message_count} 💬</span>
          <button
            onClick={(e) => { e.stopPropagation(); handleClose(conv.id) }}
            className="text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded-lg hover:bg-green-500/20"
          >
            ✓
          </button>
        </div>
      </div>
      {conv.title && <p className="text-blue-400 text-sm font-medium ml-10">{conv.title}</p>}
      {(conv.location || conv.due_date) && (
        <p className="text-slate-500 text-xs ml-10">
          {conv.location && `📍 ${conv.location}`}
          {conv.location && conv.due_date && ' · '}
          {conv.due_date && `📅 ${new Date(conv.due_date).toLocaleDateString('de-DE')}`}
        </p>
      )}
      {conv.last_message && (
        <p className="text-slate-400 text-sm ml-10 mt-1 truncate">{conv.last_message.text}</p>
      )}
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Aufgaben</h1>
        <span className="text-slate-400 text-sm">{filtered.length} offen</span>
      </div>

      {/* Worker filter */}
      {workers.length > 1 && (
        <select
          value={filterWorker}
          onChange={(e) => setFilterWorker(e.target.value)}
          className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
        >
          <option value="">Alle Mitarbeiter</option>
          {workers.map(w => (
            <option key={w.worker_id} value={w.worker_id}>{w.worker_name}</option>
          ))}
        </select>
      )}

      {/* Owner-started (Aufgaben) */}
      {ownerStarted.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-slate-400 text-xs font-semibold uppercase">Meine Aufträge</h2>
          {ownerStarted.map(c => <ConvCard key={c.id} conv={c} />)}
        </div>
      )}

      {/* Worker-started (Eingang) */}
      {workerStarted.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-slate-400 text-xs font-semibold uppercase">Eingang von Mitarbeitern</h2>
          {workerStarted.map(c => <ConvCard key={c.id} conv={c} />)}
        </div>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <p className="text-4xl mb-3">✅</p>
          <p>Keine offenen Aufgaben</p>
        </div>
      )}
    </div>
  )
}
