'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import FirstVisitHint from '@/app/components/FirstVisitHint'

export default function BuchhalterDashboard() {
  const [majstors, setMajstors] = useState([]) // accepted
  const [pendingInvites, setPendingInvites] = useState([]) // pending acceptance
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [confirmRevoke, setConfirmRevoke] = useState(null)
  const [revoking, setRevoking] = useState(false)
  const [accepting, setAccepting] = useState(null) // access_id being accepted
  const router = useRouter()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) { router.push('/login'); return }
      setUser(currentUser)

      const { data: profile } = await supabase
        .from('majstors')
        .select('role')
        .eq('id', currentUser.id)
        .single()

      if (!profile || profile.role !== 'buchhalter') {
        router.push('/dashboard')
        return
      }

      // Dohvati SVE aktivne accesse — po buchhalter_id ILI buchhalter_email
      const { data: accesses } = await supabase
        .from('buchhalter_access')
        .select('id, majstor_id, accepted_at')
        .eq('status', 'active')
        .or(`buchhalter_id.eq.${currentUser.id},buchhalter_email.eq.${currentUser.email.toLowerCase()}`)

      if (!accesses?.length) { setLoading(false); return }

      const majstorIds = accesses.map(a => a.majstor_id)

      const { data: majstorProfiles } = await supabase
        .from('majstors')
        .select('id, full_name, business_name, city, email')
        .in('id', majstorIds)

      const profileMap = Object.fromEntries((majstorProfiles || []).map(p => [p.id, p]))

      const accepted = []
      const pending = []
      for (const a of accesses) {
        const m = profileMap[a.majstor_id]
        if (!m) continue
        const item = { ...m, access_id: a.id }
        if (a.accepted_at) {
          accepted.push(item)
        } else {
          pending.push(item)
        }
      }

      setMajstors(accepted)
      setPendingInvites(pending)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = async (accessId) => {
    setAccepting(accessId)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/buchhalter-access', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ id: accessId, action: 'accept' })
      })
      if (res.ok) {
        // Move from pending to accepted
        const item = pendingInvites.find(m => m.access_id === accessId)
        if (item) {
          setPendingInvites(prev => prev.filter(m => m.access_id !== accessId))
          setMajstors(prev => [...prev, item])
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setAccepting(null)
    }
  }

  const handleDecline = async (accessId) => {
    setAccepting(accessId)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/buchhalter-access', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ id: accessId, action: 'decline' })
      })
      if (res.ok) {
        setPendingInvites(prev => prev.filter(m => m.access_id !== accessId))
      }
    } catch (e) {
      console.error(e)
    } finally {
      setAccepting(null)
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
      <FirstVisitHint pageKey="buchhalter" />
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">📒 Meine Auftraggeber</h1>
          <p className="text-slate-400 text-sm mt-1">Mandanten, die Ihnen Buchhalter-Zugang erteilt haben</p>
        </div>
        <a
          href="/zugferd-validator"
          target="_blank"
          className="shrink-0 flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-400 text-white text-sm font-medium rounded-lg transition-colors"
        >
          ZUGFeRD prüfen
        </a>
      </div>

      {/* Pending Invites */}
      {pendingInvites.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-amber-400">📨 Neue Einladungen</p>
          {pendingInvites.map(m => (
            <div key={m.id} className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-amber-700/30 rounded-full flex items-center justify-center text-amber-300 font-bold text-lg shrink-0">
                  {(m.business_name || m.full_name || '?')[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-white font-semibold truncate">{m.business_name || m.full_name}</p>
                  {m.city && <p className="text-slate-400 text-xs truncate">{m.city}</p>}
                </div>
              </div>
              <p className="text-slate-300 text-sm mb-4">
                <strong>{m.business_name || m.full_name}</strong> möchte Ihnen Zugang zu seinen Buchhaltungsdaten gewähren.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => handleAccept(m.access_id)}
                  disabled={accepting === m.access_id}
                  className="flex-1 px-4 py-2 text-sm text-white bg-teal-600 hover:bg-teal-500 rounded-lg transition-colors disabled:opacity-50 font-medium"
                >
                  {accepting === m.access_id ? '...' : 'Annehmen'}
                </button>
                <button
                  onClick={() => handleDecline(m.access_id)}
                  disabled={accepting === m.access_id}
                  className="px-4 py-2 text-sm text-slate-300 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors disabled:opacity-50"
                >
                  Ablehnen
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Accepted Majstors */}
      {majstors.length === 0 && pendingInvites.length === 0 ? (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 text-center">
          <div className="text-4xl mb-3">📭</div>
          <p className="text-white font-semibold mb-2">Noch keine Mandanten verbunden</p>
          <p className="text-slate-400 text-sm mb-4">Sobald ein Handwerker Sie als Buchhalter hinzufügt, erscheinen seine Rechnungen und Belege automatisch hier — sortiert nach Monat, als ZIP herunterladbar.</p>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-5 text-left mt-4">
            <p className="text-blue-300 font-semibold text-sm mb-2">💡 So verbinden Sie sich mit Ihren Mandanten:</p>
            <ol className="text-slate-300 text-sm space-y-1.5 list-decimal list-inside">
              <li>Empfehlen Sie <strong className="text-white">Pro-Meister</strong> Ihren Handwerker-Mandanten</li>
              <li>Der Handwerker registriert sich kostenlos auf <strong className="text-white">pro-meister.de</strong></li>
              <li>In seinen Einstellungen trägt er Ihre E-Mail als Buchhalter ein</li>
              <li>Sie erhalten eine Einladung und sehen sofort alle Belege</li>
            </ol>
          </div>

        </div>
      ) : majstors.length > 0 && (
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
