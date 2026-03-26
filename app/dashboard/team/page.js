// app/dashboard/team/page.js — Team Management (PRO+)
'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useSubscription } from '@/lib/hooks/useSubscription'

export default function TeamPage() {
  const [majstor, setMajstor] = useState(null)
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')
  const [copiedCode, setCopiedCode] = useState(null)

  const { plan } = useSubscription(majstor?.id)

  useEffect(() => {
    loadData()
  }, [])

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

      const res = await fetch('/api/team')
      const json = await res.json()
      if (json.members) setMembers(json.members.filter(m => m.status !== 'removed'))
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
      const res = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ worker_name: newName.trim() })
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error)

      if (json.needsPayment) {
        // TODO: otvori FastSpring checkout za additional-user
        alert(`Hinweis: Die ersten 2 Mitglieder sind in PRO+ enthalten. Ab dem 3. Mitglied fallen 8€/Monat an.`)
      }

      setMembers(prev => [...prev, json.member])
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
      const res = await fetch(`/api/team?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Fehler beim Entfernen')
      setMembers(prev => prev.filter(m => m.id !== id))
    } catch (err) {
      setError(err.message)
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
        <div className="flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-sm">Teammitglieder</p>
            <p className="text-2xl font-bold text-white">{activeMembers.length} / {includedMembers} inklusive</p>
          </div>
          {activeMembers.length > includedMembers && (
            <div className="text-right">
              <p className="text-slate-400 text-sm">Zusatzkosten</p>
              <p className="text-lg font-bold text-orange-400">
                +{(activeMembers.length - includedMembers) * 8}€/Monat
              </p>
            </div>
          )}
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
        <div className="flex gap-3">
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
            className="px-6 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-500 transition-colors disabled:opacity-50"
          >
            {adding ? '...' : '+ Hinzufügen'}
          </button>
        </div>
      </div>

      {/* Members List */}
      <div className="space-y-3">
        {activeMembers.map((member) => (
          <div key={member.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${
                member.status === 'active' ? 'bg-green-600' : 'bg-slate-600'
              }`}>
                {member.worker_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-white font-medium">{member.worker_name}</p>
                <p className={`text-xs ${member.status === 'active' ? 'text-green-400' : 'text-yellow-400'}`}>
                  {member.status === 'active' ? 'Aktiv' : 'Wartet auf Beitritt'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {member.status === 'pending' && (
                <button
                  onClick={() => copyCode(member.join_code)}
                  className="px-3 py-1.5 bg-slate-700 text-slate-300 rounded-lg text-sm hover:bg-slate-600 transition-colors"
                >
                  {copiedCode === member.join_code ? '✓ Kopiert!' : `Code: ${member.join_code}`}
                </button>
              )}
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
    </div>
  )
}
