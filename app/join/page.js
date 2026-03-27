// app/join/page.js — Worker joins team with 6-digit code (no email needed)
'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function JoinPage() {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [deactivated, setDeactivated] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('deactivated') === 'true') {
      setDeactivated(true)
    }
  }, [])
  const [success, setSuccess] = useState(null)
  const router = useRouter()

  const handleJoin = async () => {
    if (code.length !== 6) {
      setError('Bitte geben Sie einen 6-stelligen Code ein')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/team/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ join_code: code })
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error)

      // Auto-login with fake email + code as password
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: json.email,
        password: json.password,
      })

      if (loginError) throw new Error('Login fehlgeschlagen: ' + loginError.message)

      setSuccess(json)

      // Redirect to worker dashboard
      setTimeout(() => router.push('/dashboard/worker'), 2000)

    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">

        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Pro-Meister<span className="text-blue-400">.de</span>
          </h1>
          <p className="text-slate-400">Team beitreten</p>
        </div>

        {deactivated && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 mb-4 text-center">
            <p className="text-red-400 font-semibold mb-1">Zugang deaktiviert</p>
            <p className="text-slate-400 text-sm">Ihr Teamzugang wurde vom Chef entfernt. Kontaktieren Sie Ihren Arbeitgeber für einen neuen Code.</p>
          </div>
        )}

        {!success ? (
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8">
            <div className="text-center mb-6">
              <div className="text-5xl mb-3">👷</div>
              <h2 className="text-xl font-bold text-white mb-2">Team-Code eingeben</h2>
              <p className="text-slate-400 text-sm">
                Ihr Chef hat Ihnen einen 6-stelligen Code gegeben
              </p>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <input
              type="text"
              inputMode="numeric"
              value={code}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 6)
                setCode(val)
                setError('')
              }}
              placeholder="000000"
              className="w-full px-4 py-4 bg-slate-900 border border-slate-600 rounded-xl text-white text-center text-3xl tracking-[0.5em] font-mono placeholder-slate-600"
              maxLength={6}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            />

            <button
              onClick={handleJoin}
              disabled={loading || code.length !== 6}
              className="w-full mt-4 bg-purple-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-purple-500 transition-colors disabled:opacity-50"
            >
              {loading ? 'Wird verbunden...' : 'Beitreten'}
            </button>

            <p className="text-slate-500 text-xs text-center mt-4">
              Kein E-Mail oder Passwort nötig — nur der Code
            </p>
          </div>
        ) : (
          <div className="bg-slate-800/50 border border-green-500/30 rounded-2xl p-8 text-center">
            <div className="text-5xl mb-3">🎉</div>
            <h2 className="text-xl font-bold text-white mb-2">Willkommen im Team!</h2>
            <p className="text-slate-300 mb-1">
              <span className="text-purple-400 font-semibold">{success.team_name}</span>
            </p>
            <p className="text-slate-400 text-sm mb-6">
              Hallo {success.worker_name}!
            </p>
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-green-500 border-t-transparent mx-auto mb-2"></div>
            <p className="text-slate-400 text-sm">Weiterleitung zum Dashboard...</p>
          </div>
        )}

        <p className="text-center text-slate-500 text-xs mt-6">
          Pro-Meister.de — Handwerker-Software
        </p>
      </div>
    </div>
  )
}
