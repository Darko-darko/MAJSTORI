// app/join/page.js — Worker joins team with 6-digit code
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function JoinPage() {
  const [code, setCode] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [step, setStep] = useState('code') // code → register → success
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [teamInfo, setTeamInfo] = useState(null)
  const router = useRouter()

  const handleCodeSubmit = async () => {
    if (code.length !== 6) {
      setError('Bitte geben Sie einen 6-stelligen Code ein')
      return
    }

    setLoading(true)
    setError('')

    try {
      // First verify code exists
      const res = await fetch('/api/team/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ join_code: code })
      })

      const json = await res.json()

      if (!res.ok) {
        // Code valid but needs registration
        if (res.status === 400 && json.error?.includes('email')) {
          setStep('register')
        } else {
          throw new Error(json.error)
        }
      } else {
        // Joined without registration (shouldn't happen but handle it)
        setTeamInfo(json)
        setStep('success')
      }
    } catch (err) {
      // Code found, proceed to registration
      setStep('register')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async () => {
    if (!email || !password) {
      setError('Bitte füllen Sie alle Felder aus')
      return
    }
    if (password.length < 6) {
      setError('Passwort muss mindestens 6 Zeichen haben')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/team/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          join_code: code,
          worker_email: email,
          worker_password: password,
        })
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error)

      // Auto-login
      if (email && password) {
        await supabase.auth.signInWithPassword({ email, password })
      }

      setTeamInfo(json)
      setStep('success')
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

        {/* Step: Enter Code */}
        {step === 'code' && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8">
            <div className="text-center mb-6">
              <div className="text-5xl mb-3">👷</div>
              <h2 className="text-xl font-bold text-white mb-2">Team-Code eingeben</h2>
              <p className="text-slate-400 text-sm">
                Ihr Arbeitgeber hat Ihnen einen 6-stelligen Code gegeben
              </p>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <input
              type="text"
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
              onKeyDown={(e) => e.key === 'Enter' && handleCodeSubmit()}
            />

            <button
              onClick={handleCodeSubmit}
              disabled={loading || code.length !== 6}
              className="w-full mt-4 bg-purple-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-purple-500 transition-colors disabled:opacity-50"
            >
              {loading ? 'Prüfe Code...' : 'Weiter'}
            </button>
          </div>
        )}

        {/* Step: Register */}
        {step === 'register' && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8">
            <div className="text-center mb-6">
              <div className="text-5xl mb-3">📋</div>
              <h2 className="text-xl font-bold text-white mb-2">Konto erstellen</h2>
              <p className="text-slate-400 text-sm">
                Erstellen Sie ein Konto, um dem Team beizutreten
              </p>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-slate-400 text-sm mb-1">E-Mail (optional)</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError('') }}
                  placeholder="ihre@email.de"
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder-slate-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 text-sm mb-1">Passwort</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError('') }}
                  placeholder="Mindestens 6 Zeichen"
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder-slate-500"
                  onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
                />
              </div>
            </div>

            <button
              onClick={handleRegister}
              disabled={loading}
              className="w-full mt-6 bg-purple-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-purple-500 transition-colors disabled:opacity-50"
            >
              {loading ? 'Wird erstellt...' : 'Konto erstellen & beitreten'}
            </button>

            <button
              onClick={() => { setStep('code'); setError('') }}
              className="w-full mt-3 text-slate-400 text-sm hover:text-white transition-colors"
            >
              Zurück
            </button>
          </div>
        )}

        {/* Step: Success */}
        {step === 'success' && (
          <div className="bg-slate-800/50 border border-green-500/30 rounded-2xl p-8 text-center">
            <div className="text-5xl mb-3">🎉</div>
            <h2 className="text-xl font-bold text-white mb-2">Willkommen im Team!</h2>
            <p className="text-slate-300 mb-1">
              Sie sind jetzt Mitglied bei <span className="text-purple-400 font-semibold">{teamInfo?.team_name}</span>
            </p>
            <p className="text-slate-400 text-sm mb-6">
              als {teamInfo?.worker_name}
            </p>

            <button
              onClick={() => router.push('/dashboard/worker')}
              className="w-full bg-green-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-green-500 transition-colors"
            >
              Zum Dashboard
            </button>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-slate-500 text-xs mt-6">
          Pro-Meister.de — Handwerker-Software
        </p>
      </div>
    </div>
  )
}
