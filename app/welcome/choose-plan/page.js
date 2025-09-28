// app/welcome/choose-plan/page.js
'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { createTrialSubscription } from '@/lib/hooks/useSubscription'

export default function ChoosePlanPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [user, setUser] = useState(null)
  const [majstor, setMajstor] = useState(null)
  const router = useRouter()

  useEffect(() => {
    loadUserData()
  }, [])

  const loadUserData = async () => {
    try {
      // Get current user
      const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !currentUser) {
        console.error('No authenticated user found')
        router.push('/login')
        return
      }

      setUser(currentUser)

      // Get majstor profile
      const { data: majstorData, error: majstorError } = await supabase
        .from('majstors')
        .select('*')
        .eq('id', currentUser.id)
        .single()

      if (majstorError) {
        console.error('Majstor profile not found:', majstorError)
        // If no profile, user shouldn't be here
        router.push('/signup')
        return
      }

      setMajstor(majstorData)
    } catch (err) {
      console.error('Error loading user data:', err)
      setError('Fehler beim Laden der Benutzerdaten')
    }
  }

  // Option 1: PRO with 30-day grace period
  const handleProGracePeriod = async () => {
    setLoading(true)
    setError('')

    try {
      console.log('🚀 Creating PRO subscription with 30-day grace period')

      // Get PRO plan
      const { data: proPlan, error: planError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('name', 'pro')
        .single()

      if (planError) throw new Error('PRO Plan nicht gefunden')

      // Create subscription with grace period
      const now = new Date()
      const graceEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days

      const subscriptionData = {
        majstor_id: user.id,
        plan_id: proPlan.id,
        status: 'trial', // Using trial status for grace period
        trial_starts_at: now.toISOString(),
        trial_ends_at: graceEnd.toISOString(),
        created_at: now.toISOString(),
        updated_at: now.toISOString()
      }

      const { data: newSubscription, error: subError } = await supabase
        .from('user_subscriptions')
        .insert(subscriptionData)
        .select()
        .single()

      if (subError) throw subError

      console.log('✅ PRO grace period subscription created:', newSubscription.id)

      // Update majstor record for backward compatibility
      await supabase
        .from('majstors')
        .update({
          subscription_status: 'trial',
          subscription_ends_at: graceEnd.toISOString(),
          updated_at: now.toISOString()
        })
        .eq('id', user.id)

      // Redirect to dashboard
      router.push('/dashboard?welcome=pro-grace&trial=true')

    } catch (err) {
      console.error('Error creating PRO grace period:', err)
      setError('Fehler beim Erstellen der PRO-Mitgliedschaft: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // Option 2: 7-day trial then freemium
  const handleTrialToFreemium = async () => {
    setLoading(true)
    setError('')

    try {
      console.log('🆓 Creating 7-day trial subscription')

      // Use existing createTrialSubscription function
      const trialSubscription = await createTrialSubscription(user.id, 'pro')
      
      console.log('✅ Trial subscription created:', trialSubscription.id)

      // Update majstor record for backward compatibility
      const trialEnd = new Date(trialSubscription.trial_ends_at)
      await supabase
        .from('majstors')
        .update({
          subscription_status: 'trial',
          subscription_ends_at: trialEnd.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      // Redirect to dashboard
      router.push('/dashboard?welcome=trial&trial=true')

    } catch (err) {
      console.error('Error creating trial:', err)
      setError('Fehler beim Erstellen der Testversion: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // Option 3: Direct to freemium
  const handleDirectFreemium = async () => {
    setLoading(true)
    setError('')

    try {
      console.log('📋 Setting up direct freemium access')

      // Get freemium plan
      const { data: freemiumPlan, error: planError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('name', 'freemium')
        .single()

      if (planError) throw new Error('Freemium Plan nicht gefunden')

      // Update majstor record to freemium status
      await supabase
        .from('majstors')
        .update({
          subscription_status: 'freemium',
          subscription_ends_at: null, // Freemium never expires
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      console.log('✅ Freemium access configured')

      // Note: We don't create user_subscription for freemium
      // The useSubscription hook will detect no subscription and fall back to freemium

      // Redirect to dashboard
      router.push('/dashboard?welcome=freemium')

    } catch (err) {
      console.error('Error setting up freemium:', err)
      setError('Fehler beim Einrichten von Freemium: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!user || !majstor) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-xl mb-4">Laden...</div>
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-12">
          <div className="text-3xl font-bold text-white mb-4">
            🎯 Willkommen bei Pro-meister<span className="text-blue-400">.de</span>!
          </div>
          <h1 className="text-2xl font-semibold text-white mb-2">
            Hallo {majstor.full_name}!
          </h1>
          <p className="text-slate-400 text-lg">
            Wie möchten Sie mit Pro-Meister starten?
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-8 bg-red-500/10 border border-red-500/20 rounded-lg p-4">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Plan Options */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          
          {/* Option 1: PRO Sofort */}
          <div className="bg-slate-800/50 backdrop-blur-sm border-2 border-blue-500/50 rounded-2xl p-6 hover:border-blue-400 transition-all duration-300 relative">
            {/* Popular Badge */}
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <span className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-1 rounded-full text-sm font-bold">
                EMPFOHLEN
              </span>
            </div>

            <div className="text-center mb-6 pt-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                <span className="text-3xl">🚀</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">PRO Sofort</h3>
              <p className="text-slate-300">Alle Funktionen sofort nutzen</p>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <span className="text-green-400">✅</span>
                <span>30 Tage kostenlos</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <span className="text-green-400">✅</span>
                <span>Alle PRO Funktionen sofort</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <span className="text-green-400">✅</span>
                <span>Danach 19,90€/Monat</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <span className="text-green-400">✅</span>
                <span>Jederzeit kündbar</span>
              </div>
            </div>

            <button
              onClick={handleProGracePeriod}
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-semibold hover:scale-[1.02] transition-transform disabled:opacity-50"
            >
              {loading ? 'Wird eingerichtet...' : '🚀 PRO sofort starten'}
            </button>

            <p className="text-xs text-slate-500 text-center mt-3">
              Keine Kreditkarte erforderlich
            </p>
          </div>

          {/* Option 2: Trial */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-6 hover:border-slate-600 transition-all duration-300">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                <span className="text-3xl">🆓</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">7 Tage Testen</h3>
              <p className="text-slate-300">Erst testen, dann entscheiden</p>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <span className="text-green-400">✅</span>
                <span>7 Tage alle PRO Funktionen</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <span className="text-green-400">✅</span>
                <span>Danach automatisch Freemium</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <span className="text-green-400">✅</span>
                <span>Jederzeit auf PRO upgraden</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <span className="text-green-400">✅</span>
                <span>Keine automatische Zahlung</span>
              </div>
            </div>

            <button
              onClick={handleTrialToFreemium}
              disabled={loading}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Wird eingerichtet...' : '🆓 Kostenlos testen'}
            </button>

            <p className="text-xs text-slate-500 text-center mt-3">
              Risikofrei ausprobieren
            </p>
          </div>

          {/* Option 3: Freemium */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-6 hover:border-slate-600 transition-all duration-300">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-slate-500 to-slate-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                <span className="text-3xl">📋</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Freemium</h3>
              <p className="text-slate-300">Grundfunktionen kostenlos</p>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <span className="text-green-400">✅</span>
                <span>QR Visitenkarte</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <span className="text-slate-500">⭕</span>
                <span className="text-slate-500">Keine Kundenanfragen</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <span className="text-slate-500">⭕</span>
                <span className="text-slate-500">Keine Rechnungen</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <span className="text-green-400">✅</span>
                <span>Jederzeit auf PRO upgraden</span>
              </div>
            </div>

            <button
              onClick={handleDirectFreemium}
              disabled={loading}
              className="w-full bg-slate-600 text-white py-3 rounded-lg font-semibold hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Wird eingerichtet...' : '📋 Freemium starten'}
            </button>

            <p className="text-xs text-slate-500 text-center mt-3">
              Für immer kostenlos
            </p>
          </div>
        </div>

        {/* Info Section */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-blue-400 text-2xl">💡</span>
            </div>
            <div>
              <h4 className="text-blue-300 font-semibold mb-2">Sie können jederzeit wechseln!</h4>
              <p className="text-blue-200 text-sm leading-relaxed">
                Alle Pläne können in Ihrem Dashboard verwaltet werden. 
                Sie können jederzeit von Freemium auf PRO upgraden oder Ihre PRO-Mitgliedschaft kündigen.
                Ihre Daten bleiben dabei immer erhalten.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-slate-500 text-sm">
          <p>
            Haben Sie Fragen? Kontaktieren Sie uns unter{' '}
            <a href="mailto:support@pro-meister.de" className="text-blue-400 hover:text-blue-300">
              support@pro-meister.de
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}