'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function BuchhalterDashboard() {
  const [majstors, setMajstors] = useState([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [confirmRevoke, setConfirmRevoke] = useState(null) // {accessId, name}
  const [revoking, setRevoking] = useState(false)
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
        .select('id, majstor_id')
        .eq('buchhalter_id', currentUser.id)
        .eq('status', 'active')

      if (!accesses?.length) { setLoading(false); return }

      const majstorIds = accesses.map(a => a.majstor_id)

      const { data: majstorProfiles } = await supabase
        .from('majstors')
        .select('id, full_name, business_name, city, email')
        .in('id', majstorIds)

      // Attach access_id to each majstor
      const accessMap = Object.fromEntries(accesses.map(a => [a.majstor_id, a.id]))
      setMajstors((majstorProfiles || []).map(m => ({ ...m, access_id: accessMap[m.id] })))
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleRevoke = async () => {
    if (!confirmRevoke) return
    setRevoking(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`/api/buchhalter-access?id=${confirmRevoke.accessId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` }
      })
      if (res.ok) {
        setMajstors(prev => prev.filter(m => m.access_id !== confirmRevoke.accessId))
        setConfirmRevoke(null)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setRevoking(false)
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
            <div key={m.id} className="bg-slate-800/50 border border-slate-700 hover:border-teal-700 rounded-xl p-5 transition-colors">
              <button
                onClick={() => router.push(`/dashboard/buchhalter/${m.id}`)}
                className="w-full text-left"
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
              <button
                onClick={() => setConfirmRevoke({ accessId: m.access_id, name: m.business_name || m.full_name })}
                className="mt-3 text-xs text-red-400/60 hover:text-red-400 transition-colors"
              >
                Zugang beenden
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Confirm Revoke Dialog */}
      {confirmRevoke && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-sm w-full">
            <h3 className="text-white font-semibold text-lg mb-2">Zugang beenden?</h3>
            <p className="text-slate-300 text-sm mb-5">
              Möchten Sie den Zugang zu <strong>{confirmRevoke.name}</strong> wirklich beenden? Sie verlieren den Zugriff auf dessen Daten.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmRevoke(null)}
                className="flex-1 px-4 py-2 text-sm text-slate-300 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleRevoke}
                disabled={revoking}
                className="flex-1 px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {revoking ? 'Wird beendet...' : 'Ja, beenden'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
