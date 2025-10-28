// app/forgot-password/page.js - CLEAN VERSION: Only Honeypot (no Turnstile)
'use client'
import { useState } from 'react'
import { auth } from '@/lib/supabase'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  
  // 🍯 HONEYPOT: Bot trap field
  const [honeypot, setHoneypot] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      console.log('📧 Password reset attempt for:', email)
      
      // 🍯 HONEYPOT: Check if bot filled the trap field
      if (honeypot) {
        console.warn('🚫 Honeypot triggered - potential bot detected')
        // Simulate loading for bot, then silently reject
        await new Promise(resolve => setTimeout(resolve, 2000))
        setError('Ein Fehler ist aufgetreten')
        setLoading(false)
        return
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        throw new Error('Bitte geben Sie eine gültige E-Mail-Adresse ein')
      }

      console.log('📤 Sending password reset request...')

      // Request password reset - Supabase sends email automatically
      const { error: resetError } = await auth.resetPasswordRequest(email)

      if (resetError) {
        console.error('❌ Password reset error:', resetError)
        throw resetError
      }

      console.log('✅ Password reset email sent')
      setSuccess(true)

    } catch (err) {
      console.error('❌ Password reset failed:', err)
      
      // Generic error message to prevent email enumeration
      if (err.message.includes('rate limit')) {
        setError('Zu viele Anfragen. Bitte versuchen Sie es später erneut.')
      } else {
        // Don't reveal if email exists or not (security best practice)
        setError('Falls diese E-Mail-Adresse registriert ist, wurde eine Nachricht gesendet.')
        // Still show as partial success to prevent enumeration
        setSuccess(true)
      }
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-500/20 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-4xl">📧</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-4">
                E-Mail wurde gesendet!
              </h2>
              <p className="text-slate-300 mb-4">
                Falls ein Konto mit dieser E-Mail-Adresse existiert, haben Sie eine Nachricht mit einem Link zum Zurücksetzen Ihres Passworts erhalten.
              </p>
              <p className="text-slate-400 text-sm mb-6">
                Bitte überprüfen Sie auch Ihren Spam-Ordner.
              </p>
              <div className="space-y-3">
                <Link
                  href="/login"
                  className="block w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium text-center"
                >
                  Zurück zur Anmeldung
                </Link>
                <button
                  onClick={() => {
                    setSuccess(false)
                    setEmail('')
                    setHoneypot('')
                    setError('')
                  }}
                  className="block w-full text-slate-400 hover:text-white py-2 text-sm transition-colors"
                >
                  Erneut senden
                </button>
              </div>
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
          <h1 className="text-3xl font-bold text-white mt-6 mb-2">Passwort vergessen?</h1>
          <p className="text-slate-300">Kein Problem! Wir senden Ihnen einen Link zum Zurücksetzen.</p>
        </div>

        {/* Error Message */}
        {error && !success && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Form */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* 🍯 HONEYPOT: Hidden field for bots */}
            <input
              type="text"
              name="website"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              autoComplete="off"
              tabIndex={-1}
              style={{
                position: 'absolute',
                left: '-9999px',
                width: '1px',
                height: '1px',
                opacity: 0
              }}
              aria-hidden="true"
            />

            {/* Info Box */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <span className="text-blue-400 text-xl flex-shrink-0">ℹ️</span>
                <div className="text-sm">
                  <p className="text-blue-300 font-medium mb-1">So funktioniert&apos;s:</p>
                  <ol className="text-blue-200/90 space-y-1 list-decimal list-inside">
                    <li>Geben Sie Ihre E-Mail-Adresse ein</li>
                    <li>Sie erhalten einen Link per E-Mail</li>
                    <li>Klicken Sie auf den Link</li>
                    <li>Erstellen Sie ein neues Passwort</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                E-Mail Adresse
              </label>
              <input
                type="email"
                name="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="ihre@email.de"
              />
              <p className="text-xs text-slate-400 mt-2">
                Wir senden Ihnen einen Link zum Zurücksetzen an diese Adresse.
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-semibold transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Wird gesendet...
                </span>
              ) : (
                '📧 Link zum Zurücksetzen senden'
              )}
            </button>

            {/* Back to Login */}
            <div className="text-center pt-4 border-t border-slate-700">
              <p className="text-slate-400 text-sm">
                Erinnern Sie sich an Ihr Passwort?{' '}
                <Link href="/login" className="text-blue-400 hover:text-blue-300 font-medium">
                  Jetzt anmelden
                </Link>
              </p>
            </div>
          </form>
        </div>

        {/* Additional Help */}
        <div className="mt-6 text-center">
          <p className="text-slate-500 text-xs">
            Probleme? Kontaktieren Sie unseren{' '}
            <a href="mailto:support@pro-meister.de" className="text-blue-400 hover:text-blue-300">
              Support
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}