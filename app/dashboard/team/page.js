// app/dashboard/team/page.js — Team Management (PRO+)
'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { initializeFastSpring, openFastSpringCheckout, FASTSPRING_CONFIG } from '@/lib/fastspring'

export default function TeamPage() {
  const [majstor, setMajstor] = useState(null)
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')
  const [copiedCode, setCopiedCode] = useState(null)
  const [fastspringReady, setFastspringReady] = useState(false)
  const [showSeatModal, setShowSeatModal] = useState(false)
  const [showReduceModal, setShowReduceModal] = useState(false)
  const [seatQty, setSeatQty] = useState(1)
  const [seatInterval, setSeatInterval] = useState('monthly')
  const [reducing, setReducing] = useState(false)
  const router = useRouter()

  // Seat info from API
  const [paidSeats, setPaidSeats] = useState(0)
  const [totalSlots, setTotalSlots] = useState(2)

  useEffect(() => {
    loadData()
    initializeFastSpring(() => setFastspringReady(true))

    const channel = supabase
      .channel('team-members')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_members' }, () => loadData())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const getAuthHeader = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return { Authorization: `Bearer ${session?.access_token}` }
  }

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: m } = await supabase
        .from('majstors')
        .select('*')
        .eq('id', user.id)
        .single()
      setMajstor(m)

      const headers = await getAuthHeader()
      const res = await fetch('/api/team', { headers })
      const json = await res.json()
      if (json.members) setMembers(json.members.filter(m => m.status !== 'removed'))
      if (json.paidSeats !== undefined) setPaidSeats(json.paidSeats)
      if (json.totalSlots !== undefined) setTotalSlots(json.totalSlots)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddMember = async () => {
    if (!newName.trim()) return

    setAdding(true)
    setError('')

    try {
      const headers = await getAuthHeader()
      const res = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ worker_name: newName.trim() })
      })

      const json = await res.json()

      // No available seats — open seat booking modal
      if (res.status === 402 && json.needsPayment) {
        setError('')
        setShowSeatModal(true)
        return
      }

      if (!res.ok) throw new Error(json.error)

      setMembers(prev => [...prev, json.member])
      if (json.totalSlots) setTotalSlots(json.totalSlots)
      setNewName('')
    } catch (err) {
      setError(err.message)
    } finally {
      setAdding(false)
    }
  }

  const handleRemoveMember = async (id, name) => {
    if (!confirm(`${name} wirklich aus dem Team entfernen?`)) return

    try {
      const headers = await getAuthHeader()
      const res = await fetch(`/api/team?id=${id}`, {
        method: 'DELETE',
        headers
      })
      if (!res.ok) throw new Error('Fehler beim Entfernen')

      const json = await res.json()
      setMembers(prev => prev.filter(m => m.id !== id))

      // Offer seat reduction if there are unused paid seats
      if (json.unusedSeats > 0 && json.paidSeats > 0) {
        const reduce = confirm(
          `Mitarbeiter entfernt.\n\n` +
          `Sie haben ${json.unusedSeats} ungenutzte bezahlte ${json.unusedSeats === 1 ? 'Platz' : 'Plätze'}.\n\n` +
          `Möchten Sie nicht benötigte Plätze kündigen und sparen?`
        )
        if (reduce) {
          setShowReduceModal(true)
        }
      }
    } catch (err) {
      setError(err.message)
    }
  }

  const handleReduceSeats = async (newCount) => {
    setReducing(true)
    setError('')
    try {
      const headers = await getAuthHeader()
      const res = await fetch('/api/team', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ reduceTo: newCount })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)

      setPaidSeats(json.paidSeats)
      setTotalSlots(json.totalSlots)
      setShowReduceModal(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setReducing(false)
    }
  }

  const copyCode = (code) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent mx-auto"></div>
      </div>
    )
  }

  const activeMembers = members.filter(m => m.status !== 'removed')
  const includedMembers = 2
  const freeSlots = totalSlots - activeMembers.length

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Team verwalten</h1>
        <p className="text-slate-400 mt-1">
          Fügen Sie Mitarbeiter hinzu und verwalten Sie Ihr Team
        </p>
      </div>

      {/* Stats */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-slate-400 text-sm">Teammitglieder</p>
            <p className="text-2xl font-bold text-white">
              {activeMembers.length} / {totalSlots}
            </p>
            <p className="text-slate-500 text-xs mt-0.5">
              {includedMembers} inklusive{paidSeats > 0 ? ` + ${paidSeats} gebucht` : ''}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {paidSeats > 0 && (
              <div className="text-right">
                <p className="text-slate-400 text-sm">Zusatzkosten</p>
                <p className="text-lg font-bold text-orange-400">
                  +{paidSeats * 8}€/Monat
                </p>
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => setShowSeatModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg text-sm font-semibold hover:from-purple-500 hover:to-pink-500 transition-all"
              >
                + Plätze buchen
              </button>
              {paidSeats > 0 && (
                <button
                  onClick={() => setShowReduceModal(true)}
                  className="px-4 py-2 bg-slate-700 text-slate-400 rounded-lg text-sm hover:bg-slate-600 transition-colors"
                >
                  Plätze reduzieren
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Add Member */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
        <h3 className="text-white font-semibold mb-3">Mitarbeiter hinzufügen</h3>
        {freeSlots <= 0 && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-3">
            <p className="text-yellow-300 text-sm">
              Alle Plätze belegt. Buchen Sie zusätzliche Plätze, um weitere Mitarbeiter hinzuzufügen.
            </p>
          </div>
        )}
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => { setNewName(e.target.value); setError('') }}
            placeholder="Name des Mitarbeiters"
            className="flex-1 px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder-slate-500"
            onKeyDown={(e) => e.key === 'Enter' && handleAddMember()}
          />
          <button
            onClick={handleAddMember}
            disabled={adding || !newName.trim()}
            className="px-6 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-500 transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {adding ? '...' : '+ Hinzufügen'}
          </button>
        </div>
      </div>

      {/* Members List */}
      <div className="space-y-3">
        {activeMembers.map((member) => (
          <div key={member.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 hover:border-purple-500/50 transition-colors">
            <div
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => member.status === 'active' && member.worker_id && router.push(`/dashboard/team/${member.worker_id}`)}
            >
              <div className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-lg font-bold ${
                member.status === 'active' ? 'bg-green-600' : 'bg-slate-600'
              }`}>
                {member.worker_name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{member.worker_name}</p>
                <p className={`text-xs ${member.status === 'active' ? 'text-green-400' : 'text-yellow-400'}`}>
                  {member.status === 'active' ? 'Aktiv' : 'Wartet auf Beitritt'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={() => copyCode(member.join_code)}
                className="px-2 py-1.5 bg-slate-700 text-slate-400 rounded-lg text-sm hover:bg-slate-600 transition-colors"
                title="Code kopieren"
              >
                {copiedCode === member.join_code ? '✓ Kopiert!' : '🔑 Code'}
              </button>
              <button
                onClick={() => {
                  const text = `Hallo ${member.worker_name}, tritt unserem Team bei!\n\nÖffne: pro-meister.de/join\nDein Code: ${member.join_code}`
                  if (navigator.share) {
                    navigator.share({ title: 'Pro-Meister Team', text })
                  } else {
                    navigator.clipboard.writeText(text)
                    alert('Text kopiert!')
                  }
                }}
                className="px-2 py-1.5 bg-slate-700 text-slate-400 rounded-lg text-sm hover:bg-slate-600 transition-colors"
                title="Code teilen"
              >
                📤
              </button>
              <button
                onClick={() => handleRemoveMember(member.id, member.worker_name)}
                className="text-slate-500 hover:text-red-400 transition-colors"
                title="Entfernen"
              >
                ✕
              </button>
            </div>
          </div>
        ))}

        {activeMembers.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <p className="text-4xl mb-3">👥</p>
            <p>Noch keine Teammitglieder</p>
            <p className="text-sm mt-1">Fügen Sie Ihren ersten Mitarbeiter hinzu</p>
          </div>
        )}
      </div>

      {/* How it works */}
      <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-5">
        <h3 className="text-white font-semibold mb-3">So funktioniert es</h3>
        <div className="space-y-2 text-sm text-slate-400">
          <p>1. Geben Sie den Namen des Mitarbeiters ein</p>
          <p>2. Teilen Sie den 6-stelligen Code mit dem Mitarbeiter</p>
          <p>3. Der Mitarbeiter öffnet <span className="text-blue-400">pro-meister.de/join</span> und gibt den Code ein</p>
          <p>4. Fertig — der Mitarbeiter hat Zugriff auf Zeiterfassung und Aufgaben</p>
        </div>
      </div>

      {/* Seat booking modal */}
      {showSeatModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowSeatModal(false)}>
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-sm w-full space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-bold text-lg">Plätze buchen</h3>
            <p className="text-slate-400 text-sm">8€/Monat oder 80€/Jahr pro Mitarbeiter</p>

            <div>
              <label className="block text-slate-400 text-sm mb-1">Anzahl</label>
              <input
                type="number"
                min={1}
                max={50}
                value={seatQty}
                onChange={(e) => setSeatQty(e.target.value === '' ? '' : Math.min(50, Math.max(1, parseInt(e.target.value) || 1)))}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl text-white text-center text-xl"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setSeatInterval('monthly')}
                className={`flex-1 py-3 rounded-lg text-sm font-semibold transition-all ${seatInterval === 'monthly' ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-400'}`}
              >
                Monatlich
              </button>
              <button
                onClick={() => setSeatInterval('yearly')}
                className={`flex-1 py-3 rounded-lg text-sm font-semibold transition-all relative ${seatInterval === 'yearly' ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-400'}`}
              >
                Jährlich
                <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">-17%</span>
              </button>
            </div>

            <div className="bg-slate-900/50 rounded-lg p-3 text-center">
              <p className="text-white text-2xl font-bold">
                {seatInterval === 'monthly' ? `${(seatQty || 0) * 8},00€` : `${(seatQty || 0) * 80},00€`}
              </p>
              <p className="text-slate-400 text-xs">
                {seatQty || 0} {seatQty === 1 ? 'Platz' : 'Plätze'} × {seatInterval === 'monthly' ? '8€/Monat' : '80€/Jahr'}
              </p>
            </div>

            <button
              onClick={async () => {
                if (!fastspringReady) return
                const { data: { user } } = await supabase.auth.getUser()
                const productId = seatInterval === 'yearly'
                  ? FASTSPRING_CONFIG.productIds.teamSeatYearly
                  : FASTSPRING_CONFIG.productIds.teamSeat
                openFastSpringCheckout({
                  priceId: productId,
                  email: majstor?.email,
                  majstorId: user?.id,
                  quantity: seatQty || 1,
                  billingInterval: seatInterval,
                  onSuccess: () => {
                    setShowSeatModal(false)
                    // Reload after short delay for webhook to process
                    setTimeout(() => loadData(), 3000)
                  },
                  onError: (err) => { alert('Fehler: ' + err.message) },
                  onClose: () => {}
                })
              }}
              disabled={!fastspringReady}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold hover:from-purple-500 hover:to-pink-500 transition-all disabled:opacity-50"
            >
              {fastspringReady ? 'Jetzt buchen' : 'Laden...'}
            </button>

            <button onClick={() => setShowSeatModal(false)} className="w-full py-2 text-slate-400 text-sm hover:text-white">
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* Seat reduction modal */}
      {showReduceModal && (
        <SeatReduceModal
          paidSeats={paidSeats}
          activeMembers={activeMembers.length}
          includedMembers={includedMembers}
          reducing={reducing}
          onReduce={handleReduceSeats}
          onClose={() => setShowReduceModal(false)}
        />
      )}
    </div>
  )
}

// Seat reduction modal component
function SeatReduceModal({ paidSeats, activeMembers, includedMembers, reducing, onReduce, onClose }) {
  const minSeats = Math.max(0, activeMembers - includedMembers)
  const [newCount, setNewCount] = useState(minSeats)

  const savings = (paidSeats - newCount) * 8

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-sm w-full space-y-4" onClick={e => e.stopPropagation()}>
        <h3 className="text-white font-bold text-lg">Plätze reduzieren</h3>

        <div className="bg-slate-900/50 rounded-lg p-3 space-y-1 text-sm">
          <div className="flex justify-between text-slate-400">
            <span>Aktive Mitglieder</span>
            <span className="text-white font-medium">{activeMembers}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Inklusive Plätze</span>
            <span className="text-white font-medium">{includedMembers}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Bezahlte Plätze</span>
            <span className="text-white font-medium">{paidSeats}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Mindestens benötigt</span>
            <span className="text-white font-medium">{minSeats}</span>
          </div>
        </div>

        <div>
          <label className="block text-slate-400 text-sm mb-1">Neue Anzahl bezahlter Plätze</label>
          <input
            type="number"
            min={minSeats}
            max={paidSeats}
            value={newCount}
            onChange={(e) => setNewCount(Math.min(paidSeats, Math.max(minSeats, parseInt(e.target.value) || 0)))}
            className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl text-white text-center text-xl"
          />
        </div>

        {savings > 0 && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-center">
            <p className="text-green-400 font-bold">Sie sparen {savings}€/Monat</p>
          </div>
        )}

        {activeMembers > includedMembers + newCount && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            <p className="text-red-400 text-sm">
              Bitte entfernen Sie zuerst {activeMembers - (includedMembers + newCount)} Mitglieder.
            </p>
          </div>
        )}

        <button
          onClick={() => onReduce(newCount)}
          disabled={reducing || newCount >= paidSeats || activeMembers > includedMembers + newCount}
          className="w-full py-3 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-500 transition-all disabled:opacity-50"
        >
          {reducing ? 'Wird geändert...' : newCount === 0 ? 'Alle Plätze kündigen' : `Auf ${newCount} Plätze reduzieren`}
        </button>

        <button onClick={onClose} className="w-full py-2 text-slate-400 text-sm hover:text-white">
          Abbrechen
        </button>
      </div>
    </div>
  )
}
