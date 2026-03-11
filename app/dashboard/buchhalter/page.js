'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function BuchhalterDashboard() {
  const [majstors, setMajstors] = useState([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const router = useRouter()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) { router.push('/login'); return }
      setUser(currentUser)

      // Provjeri da li je buchhalter
      const { data: profile } = await supabase
        .from('majstors')
        .select('role')
        .eq('id', currentUser.id)
        .single()

      if (!profile || profile.role !== 'buchhalter') {
        router.push('/dashboard')
        return
      }

      // Dohvati majstore koji su dali pristup
      const { data: accesses } = await supabase
        .from('buchhalter_access')
        .select('majstor_id')
        .eq('buchhalter_id', currentUser.id)
        .eq('status', 'active')

      if (!accesses?.length) { setLoading(false); return }

      const majstorIds = accesses.map(a => a.majstor_id)

      const { data: majstorProfiles } = await supabase
        .from('majstors')
        .select('id, full_name, business_name, city, email')
        .in('id', majstorIds)

      setMajstors(majstorProfiles || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-10 w-10 border-[3px] border-slate-600 border-t-teal-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20">
      <div>
        <h1 className="text-2xl font-bold text-white">📒 Meine Auftraggeber</h1>
        <p className="text-slate-400 text-sm mt-1">Mandanten, die Ihnen Buchhalter-Zugang erteilt haben</p>
      </div>

      {majstors.length === 0 ? (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 text-center">
          <div className="text-4xl mb-3">📭</div>
          <p className="text-white font-semibold mb-1">Noch keine Auftraggeber</p>
          <p className="text-slate-400 text-sm">Bitten Sie Ihren Auftraggeber, Ihnen in seinen Einstellungen Zugang zu erteilen.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {majstors.map(m => (
            <button
              key={m.id}
              onClick={() => router.push(`/dashboard/buchhalter/${m.id}`)}
              className="bg-slate-800/50 border border-slate-700 hover:border-teal-700 rounded-xl p-5 text-left transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-teal-700/30 rounded-full flex items-center justify-center text-teal-300 font-bold text-lg shrink-0">
                  {(m.business_name || m.full_name || '?')[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-white font-semibold truncate">{m.business_name || m.full_name}</p>
                  {m.city && <p className="text-slate-400 text-xs truncate">{m.city}</p>}
                </div>
                <span className="ml-auto text-slate-400 text-lg">→</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
