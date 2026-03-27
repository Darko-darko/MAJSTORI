// app/dashboard/worker/berichte/page.js — Worker: closed conversations (Berichte)
'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function WorkerBerichtePage() {
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    loadData()
    const channel = supabase
      .channel('worker-berichte')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => loadData())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const loadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/team/conversations?status=closed', {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      })
      const json = await res.json()
      if (json.conversations) setConversations(json.conversations)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const formatDate = (iso) => new Date(iso).toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' })

  if (loading) {
    return <div className="max-w-2xl mx-auto p-6"><div className="animate-spin rounded-full h-8 w-8 border-4 border-orange-500 border-t-transparent mx-auto"></div></div>
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Meine Berichte</h1>
        <span className="text-slate-400 text-sm">{conversations.length} abgeschlossen</span>
      </div>

      {conversations.length > 0 ? (
        <div className="space-y-2">
          {conversations.map(conv => (
            <div
              key={conv.id}
              className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-4 cursor-pointer hover:border-slate-600 transition-colors"
              onClick={() => router.push(`/dashboard/worker/feed?conv=${conv.id}`)}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                  conv.started_by === conv.owner_id ? 'bg-purple-600/60' : 'bg-orange-600/60'
                }`}>
                  {conv.started_by === conv.owner_id ? '👔' : '👷'}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-white font-medium text-sm">
                    {conv.started_by === conv.owner_id ? 'Vom Chef' : 'Mein Bericht'}
                  </span>
                  <span className="text-slate-500 text-xs ml-2">
                    {conv.closed_at ? formatDate(conv.closed_at) : formatDate(conv.updated_at)}
                  </span>
                </div>
                <span className="bg-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded">Erledigt</span>
              </div>
              {conv.title && <p className="text-blue-400/70 text-sm font-medium ml-10">{conv.title}</p>}
              {conv.last_message && (
                <p className="text-slate-500 text-sm ml-10 mt-1 truncate">{conv.last_message.text}</p>
              )}
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
