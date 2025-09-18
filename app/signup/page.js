// app/signup/page.js - UPDATED sa boljom password validacijom
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function SignupPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false
  })
  const router = useRouter()

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))

    // Real-time password strength check
    if (e.target.name === 'password') {
      checkPasswordStrength(e.target.value)
    }
  }

  const checkPasswordStrength = (password) => {
    setPasswordStrength({
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    })
  }

  const validatePassword = (password) => {
    const errors = []
    
    if (password.length < 8) {
      errors.push('Passwort muss mindestens 8 Zeichen lang sein')
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Passwort muss mindestens einen Großbuchstaben enthalten')
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Passwort muss mindestens einen Kleinbuchstaben enthalten')
    }
    
    if (!/\d/.test(password)) {
      errors.push('Passwort muss mindestens eine Zahl enthalten')
    }
    
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Passwort muss mindestens ein Sonderzeichen enthalten (!@#$%^&* etc.)')
    }
    
    return errors
  }

  const validateForm = () => {
    if (!formData.email || !formData.password || !formData.confirmPassword) {
      throw new Error('Alle Felder sind erforderlich')
    }

    // Neue komplexe password validacija
    const passwordErrors = validatePassword(formData.password)
    if (passwordErrors.length > 0) {
      throw new Error(passwordErrors[0]) // Prikaži prvi error
    }

    if (formData.password !== formData.confirmPassword) {
      throw new Error('Passwörter stimmen nicht überein')
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      throw new Error('Bitte geben Sie eine gültige E-Mail-Adresse ein')
    }
  }

  // Google OAuth signup
  const handleGoogleSignup = async () => {
    try {
      setGoogleLoading(true)
      setError('')
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      })

      if (error) {
        console.error('Google OAuth error:', error)
        setError('Fehler bei Google Anmeldung: ' + error.message)
      }
    } catch (err) {
      console.error('Google signup error:', err)
      setError('Ein unerwarteter Fehler ist aufgetreten')
    } finally {
      setGoogleLoading(false)
    }
  }

  // Email/Password signup
  const handleEmailSignup = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      validateForm()

      // 1. Create auth user with MINIMAL data
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            signup_type: 'email'
          }
        }
      })

      if (authError) throw authError

      if (authData.user) {
        // 2. Create MINIMAL majstor profile via API
        const response = await fetch('/api/create-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: authData.user.id,
            email: formData.email,
            full_name: formData.email.split('@')[0],
            subscription_status: 'trial',
            subscription_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            is_active: true,
            profile_completed: false,
            profile_source: 'email_signup'
          })
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Fehler beim Erstellen des Profils')
        }

        // 3. Success redirect
        if (authData.user.email_confirmed_at) {
          router.push('/dashboard?welcome=true&trial=true')
        } else {
          alert('✅ Registrierung erfolgreich!\n\nBitte prüfen Sie Ihre E-Mails zur Bestätigung, dann können Sie sich anmelden.')
          router.push('/login?message=confirm_email')
        }
      }

    } catch (err) {
      console.error('Email signup error:', err)
      setError(err.message || 'Registrierung fehlgeschlagen')
    } finally {
      setLoading(false)
    }
  }

  const isPasswordValid = Object.values(passwordStrength).every(Boolean)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-8">
        
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold text-white mb-6 block">
            Pro-meister<span className="text-blue-400">.de</span>
          </Link>
          <h1 className="text-2xl font-bold text-white mb-2">Kostenlos registrieren</h1>
          <p className="text-slate-400">7 Tage kostenlos testen, jederzeit kündbar</p>
        </div>

        {/* Benefits */}
        <div className="mb-6 space-y-2">
          <div className="flex items-center gap-3 text-sm text-slate-300">
            <span className="text-green-400">✓</span>
            <span>Digitale Visitenkarte mit QR-Code</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-300">
            <span className="text-green-400">✓</span>
            <span>Professionelle Rechnungen & Angebote</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-300">
            <span className="text-green-400">✓</span>
            <span>Kundenverwaltung & Terminplanung</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-300">
            <span className="text-green-400">✓</span>
            <span>Automatische Garantieverwaltung</span>
          </div>
        </div>

        {/* Google Sign Up Button */}
        <button
          onClick={handleGoogleSignup}
          disabled={loading || googleLoading}
          className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-900 font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 mb-6"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {googleLoading ? 'Wird geladen...' : 'Mit Google registrieren'}
        </button>

        {/* Divider */}
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-600"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-slate-800 text-slate-400">Oder mit E-Mail</span>
          </div>
        </div>

        {/* Email Form */}
        <form onSubmit={handleEmailSignup} className="space-y-4">
          
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              E-Mail-Adresse
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="ihre@email.de"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Passwort
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ihr Passwort eingeben"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white"
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            
            {/* Password Requirements - Show only when user starts typing */}
            {formData.password && (
              <div className="mt-3 p-3 bg-slate-900/30 rounded-lg border border-slate-700">
                <p className="text-xs text-slate-400 mb-2">Passwort muss enthalten:</p>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  <div className={`flex items-center gap-1 ${passwordStrength.length ? 'text-green-400' : 'text-slate-500'}`}>
                    <span>{passwordStrength.length ? '✓' : '○'}</span>
                    <span>8+ Zeichen</span>
                  </div>
                  <div className={`flex items-center gap-1 ${passwordStrength.uppercase ? 'text-green-400' : 'text-slate-500'}`}>
                    <span>{passwordStrength.uppercase ? '✓' : '○'}</span>
                    <span>Großbuchstabe</span>
                  </div>
                  <div className={`flex items-center gap-1 ${passwordStrength.lowercase ? 'text-green-400' : 'text-slate-500'}`}>
                    <span>{passwordStrength.lowercase ? '✓' : '○'}</span>
                    <span>Kleinbuchstabe</span>
                  </div>
                  <div className={`flex items-center gap-1 ${passwordStrength.number ? 'text-green-400' : 'text-slate-500'}`}>
                    <span>{passwordStrength.number ? '✓' : '○'}</span>
                    <span>Zahl</span>
                  </div>
                  <div className={`flex items-center gap-1 col-span-2 ${passwordStrength.special ? 'text-green-400' : 'text-slate-500'}`}>
                    <span>{passwordStrength.special ? '✓' : '○'}</span>
                    <span>Sonderzeichen (!@#$%...)</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Passwort bestätigen
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Passwort wiederholen"
            />
            {formData.confirmPassword && formData.password !== formData.confirmPassword && (
              <p className="text-red-400 text-xs mt-1">Passwörter stimmen nicht überein</p>
            )}
          </div>

          {/* Terms */}
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              required
              className="mt-1 w-4 h-4 text-blue-600 bg-slate-700 border-slate-500 rounded focus:ring-blue-500"
            />
            <label className="text-sm text-slate-300">
              Ich akzeptiere die{' '}
              <Link href="/terms" className="text-blue-400 hover:text-blue-300">
                AGB
              </Link>{' '}
              und{' '}
              <Link href="/privacy" className="text-blue-400 hover:text-blue-300">
                Datenschutz
              </Link>
            </label>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || googleLoading || !isPasswordValid}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-semibold hover:scale-[1.02] transition-transform disabled:opacity-50"
          >
            {loading ? 'Registrierung läuft...' : '🚀 Kostenlos starten'}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-6 text-center space-y-3">
          <p className="text-slate-400 text-sm">
            Bereits registriert?{' '}
            <Link href="/login" className="text-blue-400 hover:text-blue-300 font-medium">
              Jetzt anmelden
            </Link>
          </p>
          
          <div className="pt-3 border-t border-slate-700">
            <p className="text-xs text-slate-500">
              🔒 Sicher & DSGVO-konform • ⚡ Sofort verfügbar • 🎯 7 Tage kostenlos
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}