// app/dashboard/worker/aufgaben/page.js — Worker: open conversations from chef
'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function WorkerAufgabenPage() {
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    loadData()
    const channel = supabase
      .channel('worker-aufgaben')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => loadData())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const loadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/team/conversations?status=open', {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      })
      const json = await res.json()
      if (json.conversations) {
        // Only show conversations started by owner (= tasks for worker)
        setConversations(json.conversations.filter(c => c.started_by === c.owner_id))
      }
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const formatDate = (iso) => new Date(iso).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })

  if (loading) {
    return <div className="max-w-2xl mx-auto p-6"><div className="animate-spin rounded-full h-8 w-8 border-4 border-orange-500 border-t-transparent mx-auto"></div></div>
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Meine Aufgaben</h1>
        <span className="text-slate-400 text-sm">{conversations.length} offen</span>
      </div>

      {conversations.length > 0 ? (
        <div className="space-y-2">
          {conversations.map(conv => (
            <div
              key={conv.id}
              className={`bg-slate-800/50 border rounded-xl p-4 cursor-pointer hover:border-orange-500/50 transition-colors ${
                conv.title ? 'border-blue-500/30' : 'border-slate-700'
              }`}
              onClick={() => router.push(`/dashboard/worker/feed?conv=${conv.id}`)}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-sm font-bold text-white">👔</div>
                <div className="flex-1 min-w-0">
                  <span className="text-white font-medium text-sm">Vom Chef</span>
                  <span className="text-slate-500 text-xs ml-2">{formatDate(conv.last_message_at || conv.created_at)}</span>
                </div>
                <span className="text-slate-500 text-xs">{conv.message_count} 💬</span>
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
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-slate-500">
          <p className="text-4xl mb-3">✅</p>
          <p>Keine offenen Aufgaben</p>
          <p className="text-sm mt-1">Hier erscheinen Aufträge vom Chef</p>
        </div>
      )}
    </div>
  )
}
