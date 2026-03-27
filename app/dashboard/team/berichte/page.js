// app/dashboard/team/berichte/page.js — Owner: closed conversations (Berichte)
'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function OwnerBerichtePage() {
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterWorker, setFilterWorker] = useState('')
  const [workers, setWorkers] = useState([])
  const router = useRouter()

  useEffect(() => {
    loadData()
    const channel = supabase
      .channel('owner-berichte')
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
        fetch('/api/team/conversations?status=closed', { headers }),
        fetch('/api/team', { headers }),
      ])
      const convJson = await convRes.json()
      const teamJson = await teamRes.json()
      if (convJson.conversations) setConversations(convJson.conversations)
      if (teamJson.members) setWorkers(teamJson.members.filter(m => m.status === 'active'))
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const handleReopen = async (convId) => {
    try {
      const headers = await getHeaders()
      await fetch(`/api/team/conversations/${convId}`, {
        method: 'PATCH', headers,
        body: JSON.stringify({ status: 'open' })
      })
      await loadData()
    } catch (err) { console.error(err) }
  }

  const handleDelete = async (convId) => {
    if (!confirm('Konversation wirklich löschen?')) return
    try {
      const headers = await getHeaders()
      await fetch(`/api/team/conversations/${convId}`, { method: 'DELETE', headers })
      await loadData()
    } catch (err) { console.error(err) }
  }

  const formatDate = (iso) => new Date(iso).toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' })

  const filtered = filterWorker
    ? conversations.filter(c => c.worker_id === filterWorker)
    : conversations

  if (loading) {
    return <div className="max-w-2xl mx-auto p-6"><div className="animate-spin rounded-full h-8 w-8 border-4 border-purple-500 border-t-transparent mx-auto"></div></div>
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Berichte</h1>
        <span className="text-slate-400 text-sm">{filtered.length} abgeschlossen</span>
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

      {/* Closed conversations */}
      {filtered.length > 0 ? (
        <div className="space-y-2">
          {filtered.map(conv => (
            <div
              key={conv.id}
              className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-4 cursor-pointer hover:border-slate-600 transition-colors"
              onClick={() => router.push(`/dashboard/team/feed?conv=${conv.id}`)}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                  conv.started_by === conv.owner_id ? 'bg-purple-600/60' : 'bg-orange-600/60'
                }`}>
                  {conv.worker_name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-white font-medium text-sm">{conv.worker_name}</span>
                  <span className="text-slate-500 text-xs ml-2">
                    {conv.closed_at ? formatDate(conv.closed_at) : formatDate(conv.updated_at)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="bg-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded">Erledigt</span>
                  <span className="text-slate-500 text-xs">{conv.message_count} 💬</span>
                </div>
              </div>
              {conv.title && <p className="text-blue-400/70 text-sm font-medium ml-10">{conv.title}</p>}
              {conv.last_message && (
                <p className="text-slate-500 text-sm ml-10 mt-1 truncate">{conv.last_message.text}</p>
              )}

              {/* Actions */}
              <div className="flex gap-2 ml-10 mt-2">
                <button
                  onClick={(e) => { e.stopPropagation(); handleReopen(conv.id) }}
                  className="text-xs text-blue-400 bg-blue-500/10 px-2 py-1 rounded-lg hover:bg-blue-500/20"
                >
                  ↩ Wieder öffnen
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(conv.id) }}
                  className="text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded-lg hover:bg-red-500/20"
                >
                  🗑 Löschen
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-slate-500">
          <p className="text-4xl mb-3">📋</p>
          <p>Keine abgeschlossenen Berichte</p>
        </div>
      )}
    </div>
  )
}
