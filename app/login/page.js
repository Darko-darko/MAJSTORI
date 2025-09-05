'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { auth, supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()


  

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  // Google OAuth Login
  const handleGoogleLogin = async () => {
  try {
    console.log('1. Starting Google OAuth...') // DODAJ
    setGoogleLoading(true)
    setError('')
    
    console.log('2. Calling supabase.auth.signInWithOAuth...') // DODAJ
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })

    console.log('3. OAuth result:', data, error) // DODAJ

    if (error) {
      console.error('Google OAuth error:', error)
      setError('Fehler bei Google Anmeldung: ' + error.message)
    }
  } catch (err) {
    console.error('4. Catch block error:', err) // DODAJ
    setError('Ein unerwarteter Fehler ist aufgetreten')
  } finally {
    setGoogleLoading(false)
  }
}
  // Regular email/password login
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data, error: signInError } = await auth.signIn(
        formData.email, 
        formData.password
      )

      if (signInError) {
        throw signInError
      }

      if (data.user) {
        // Success - redirect to dashboard
        router.push('/dashboard')
      }

    } catch (err) {
      console.error('Login error:', err)
      if (err.message.includes('Invalid login credentials')) {
        setError('Ungültige E-Mail oder Passwort')
      } else if (err.message.includes('Email not confirmed')) {
        setError('Bitte bestätigen Sie Ihre E-Mail-Adresse')
      } else {
        setError(err.message || 'Ein Fehler ist aufgetreten')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold text-white hover:text-blue-400 transition-colors">
            Majstori<span className="text-blue-400">.de</span>
          </Link>
          <h1 className="text-3xl font-bold text-white mt-6 mb-2">Willkommen zurück</h1>
          <p className="text-slate-300">Melden Sie sich in Ihr Konto an</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Form */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-8">
          
          {/* Google Login Button */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading || googleLoading}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-900 font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 mb-6"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {googleLoading ? 'Wird geladen...' : 'Mit Google anmelden'}
          </button>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-slate-800 text-slate-400">Oder</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                E-Mail Adresse
              </label>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="ihre@email.de"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Passwort
              </label>
              <input
                type="password"
                name="password"
                required
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ihr Passwort"
              />
            </div>

            {/* Forgot Password Link */}
            <div className="text-right">
              <Link href="/forgot-password" className="text-sm text-blue-400 hover:text-blue-300">
                Passwort vergessen?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-semibold transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Anmeldung läuft...' : 'Anmelden'}
            </button>

            {/* Demo Account Info */}
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
              <p className="text-green-300 text-sm">
                <strong>Demo Account:</strong><br/>
                E-Mail: demo@majstori.de<br/>
                Passwort: demo123
              </p>
            </div>

            {/* Signup Link */}
            <div className="text-center">
              <p className="text-slate-400">
                Noch kein Konto?{' '}
                <Link href="/signup" className="text-blue-400 hover:text-blue-300 font-medium">
                  Hier registrieren
                </Link>
              </p>
            </div>
          </form>
        </div>

        {/* Benefits */}
        <div className="mt-8 text-center">
          <p className="text-slate-400 text-sm mb-4">Mit Majstori.de erhalten Sie:</p>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="bg-slate-800/30 rounded-lg p-3">
              <div className="text-blue-400 mb-1">📱</div>
              <p className="text-slate-300">Digitale Visitenkarte</p>
            </div>
            <div className="bg-slate-800/30 rounded-lg p-3">
              <div className="text-green-400 mb-1">📸</div>
              <p className="text-slate-300">Kundenanfragen</p>
            </div>
            <div className="bg-slate-800/30 rounded-lg p-3">
              <div className="text-purple-400 mb-1">📄</div>
              <p className="text-slate-300">PDF Rechnungen</p>
            </div>
            <div className="bg-slate-800/30 rounded-lg p-3">
              <div className="text-orange-400 mb-1">🛡️</div>
              <p className="text-slate-300">Garantien</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}