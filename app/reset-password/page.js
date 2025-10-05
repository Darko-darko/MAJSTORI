'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { auth, supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function ResetPasswordPage() {
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [sessionChecked, setSessionChecked] = useState(false)
  
  // Password validation states
  const [passwordValidation, setPasswordValidation] = useState({
    minLength: false,
    hasUpperCase: false,
    hasLowerCase: false,
    hasNumber: false,
    hasSpecialChar: false
  })
  
  const router = useRouter()

  // Check if user has valid recovery session
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error || !session) {
          setError('Ungültiger oder abgelaufener Link. Bitte fordern Sie einen neuen an.')
        }
        
        setSessionChecked(true)
      } catch (err) {
        console.error('Session check error:', err)
        setError('Fehler beim Überprüfen der Sitzung')
        setSessionChecked(true)
      }
    }
    
    checkSession()
  }, [])

  // Validate password in real-time
  useEffect(() => {
    const password = formData.password
    
    setPasswordValidation({
      minLength: password.length >= 8,
      hasUpperCase: /[A-Z]/.test(password),
      hasLowerCase: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    })
  }, [formData.password])

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const isPasswordValid = () => {
    return Object.values(passwordValidation).every(v => v === true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Validation
    if (!isPasswordValid()) {
      setError('Passwort erfüllt nicht alle Anforderungen')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwörter stimmen nicht überein')
      return
    }

    setLoading(true)

    try {
      const { error: updateError } = await auth.updatePassword(formData.password)

      if (updateError) {
        throw updateError
      }

      setSuccess(true)
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login')
      }, 3000)

    } catch (err) {
      console.error('Password update error:', err)
      setError(err.message || 'Ein Fehler ist aufgetreten')
    } finally {
      setLoading(false)
    }
  }

  if (!sessionChecked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Wird überprüft...</div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500/20 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-4xl">✅</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-4">
                Passwort erfolgreich geändert!
              </h2>
              <p className="text-slate-300 mb-6">
                Ihr Passwort wurde erfolgreich aktualisiert.
              </p>
              <p className="text-slate-400 text-sm mb-6">
                Sie werden in Kürze zur Anmeldeseite weitergeleitet...
              </p>
              <Link
                href="/login"
                className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Jetzt anmelden
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold text-white hover:text-blue-400 transition-colors">
            Pro-meister<span className="text-blue-400">.de</span>
          </Link>
          <h1 className="text-3xl font-bold text-white mt-6 mb-2">Neues Passwort erstellen</h1>
          <p className="text-slate-300">Wählen Sie ein sicheres Passwort</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
            {error.includes('abgelaufen') && (
              <Link 
                href="/forgot-password"
                className="text-blue-400 hover:text-blue-300 text-sm mt-2 inline-block"
              >
                Neuen Link anfordern →
              </Link>
            )}
          </div>
        )}

        {/* Form */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* New Password */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Neues Passwort
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12"
                  placeholder="Mindestens 8 Zeichen"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* Password Requirements - ISTI KAO SIGNUP */}
        
<div className="bg-slate-900/50 border border-slate-600 rounded-lg p-4">
  <p className="text-slate-300 text-sm font-medium mb-3">Passwort muss enthalten:</p>
  <div className="space-y-2">
    <div className={`flex items-center gap-2 text-sm ${
      passwordValidation.minLength ? 'text-green-400' : 'text-red-400'
    }`}>
      <span>{passwordValidation.minLength ? '✓' : '✗'}</span>
      <span>8+ Zeichen</span>
    </div>
    <div className={`flex items-center gap-2 text-sm ${
      passwordValidation.hasUpperCase ? 'text-green-400' : 'text-red-400'
    }`}>
      <span>{passwordValidation.hasUpperCase ? '✓' : '✗'}</span>
      <span>Großbuchstabe</span>
    </div>
    <div className={`flex items-center gap-2 text-sm ${
      passwordValidation.hasLowerCase ? 'text-green-400' : 'text-red-400'
    }`}>
      <span>{passwordValidation.hasLowerCase ? '✓' : '✗'}</span>
      <span>Kleinbuchstabe</span>
    </div>
    <div className={`flex items-center gap-2 text-sm ${
      passwordValidation.hasNumber ? 'text-green-400' : 'text-red-400'
    }`}>
      <span>{passwordValidation.hasNumber ? '✓' : '✗'}</span>
      <span>Zahl</span>
    </div>
    <div className={`flex items-center gap-2 text-sm ${
      passwordValidation.hasSpecialChar ? 'text-green-400' : 'text-red-400'
    }`}>
      <span>{passwordValidation.hasSpecialChar ? '✓' : '✗'}</span>
      <span>Sonderzeichen (!@#$%...)</span>
    </div>
  </div>
</div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Passwort bestätigen
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12"
                  placeholder="Passwort wiederholen"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {showConfirmPassword ? '🙈' : '👁️'}
                </button>
              </div>
              {/* Password Match Indicator */}
              {formData.confirmPassword && (
                <p className={`text-sm mt-2 ${
                  formData.password === formData.confirmPassword 
                    ? 'text-green-400' 
                    : 'text-red-400'
                }`}>
                  {formData.password === formData.confirmPassword 
                    ? '✓ Passwörter stimmen überein' 
                    : '✗ Passwörter stimmen nicht überein'
                  }
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !isPasswordValid() || formData.password !== formData.confirmPassword}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-semibold transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Wird gespeichert...' : 'Passwort ändern'}
            </button>

            {/* Back to Login */}
            <div className="text-center">
              <Link href="/login" className="text-slate-400 hover:text-white text-sm transition-colors">
                ← Zurück zur Anmeldung
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}