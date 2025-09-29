// app/welcome/choose-plan/page.js - COMPLETE VERSION WITH PADDLE + COMPARISON TABLE
'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { 
  initializePaddle, 
  openPaddleCheckout, 
  PADDLE_CONFIG,
  validatePaddleConfig 
} from '@/lib/paddle'

export default function ChoosePlanPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [user, setUser] = useState(null)
  const [majstor, setMajstor] = useState(null)
  const [selectedProPlan, setSelectedProPlan] = useState('monthly') // 'monthly' or 'yearly'
  const [paddleReady, setPaddleReady] = useState(false)
  const router = useRouter()

  useEffect(() => {
    loadUserData()
    
    // 🚀 Initialize Paddle.js
    initializePaddle(
      (paddle) => {
        console.log('✅ Paddle initialized successfully')
        setPaddleReady(true)
      },
      (error) => {
        console.error('❌ Failed to initialize Paddle:', error)
        setError('Paddle konnte nicht geladen werden. Bitte laden Sie die Seite neu.')
      }
    )

    // Validate Paddle configuration
    if (!validatePaddleConfig()) {
      setError('Paddle Konfiguration fehlt. Bitte kontaktieren Sie den Support.')
    }
  }, [])

  const loadUserData = async () => {
    try {
      const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !currentUser) {
        console.error('No authenticated user found')
        router.push('/login')
        return
      }

      setUser(currentUser)

      const { data: majstorData, error: majstorError } = await supabase
        .from('majstors')
        .select('*')
        .eq('id', currentUser.id)
        .single()

      if (majstorError) {
        console.error('Majstor profile not found:', majstorError)
        router.push('/signup')
        return
      }

      setMajstor(majstorData)
    } catch (err) {
      console.error('Error loading user data:', err)
      setError('Fehler beim Laden der Benutzerdaten')
    }
  }

  // 🚀 PRO Subscription mit Paddle Checkout
  const handleProSubscription = async (billingInterval) => {
    if (!paddleReady) {
      setError('Paddle wird noch geladen. Bitte warten Sie einen Moment.')
      return
    }

    setLoading(true)
    setError('')

    try {
      console.log(`🚀 Opening Paddle Checkout for: ${billingInterval}`)

      // Select correct Price ID
      const priceId = billingInterval === 'yearly' 
        ? PADDLE_CONFIG.priceIds.yearly 
        : PADDLE_CONFIG.priceIds.monthly

      if (!priceId) {
        throw new Error(`Price ID nicht gefunden für: ${billingInterval}`)
      }

      // 🎯 Open Paddle Checkout
      openPaddleCheckout({
        priceId: priceId,
        email: user.email,
        majstorId: user.id,
        billingInterval: billingInterval,
        
        // ✅ Success Callback
        onSuccess: async (checkoutData) => {
          console.log('✅ Paddle Checkout successful:', checkoutData)
          
          // Redirect to dashboard with success message
          setTimeout(() => {
            router.push(`/dashboard?paddle_success=true&plan=${billingInterval}`)
          }, 1000)
        },
        
        // ❌ Error Callback
        onError: (error) => {
          console.error('❌ Paddle Checkout error:', error)
          setError('Checkout fehlgeschlagen. Bitte versuchen Sie es erneut.')
          setLoading(false)
        }
      })

      // Reset loading after checkout opens
      setTimeout(() => {
        setLoading(false)
      }, 2000)

    } catch (err) {
      console.error('Error opening Paddle Checkout:', err)
      setError('Fehler beim Öffnen des Checkouts: ' + err.message)
      setLoading(false)
    }
  }

  // 🆓 7-day trial (FREE, no payment method required)
  const handleTrialToFreemium = async () => {
    setLoading(true)
    setError('')

    try {
      console.log('🆓 Creating 7-day trial subscription (no Paddle)')

      // Get PRO plan
      const { data: proPlan, error: planError } = await supabase
        .from('subscription_plans')
        .select('id')
        .eq('name', 'pro')
        .single()

      if (planError) throw planError

      // Create trial subscription (NO Paddle - just Supabase)
      const trialEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      
      const { data: subscription, error: subError } = await supabase
        .from('user_subscriptions')
        .insert({
          majstor_id: user.id,
          plan_id: proPlan.id,
          status: 'trial',
          trial_starts_at: new Date().toISOString(),
          trial_ends_at: trialEnd.toISOString(),
          paddle_subscription_id: null, // NO Paddle for free trial
          paddle_customer_id: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (subError) throw subError

      // Update majstor record
      await supabase
        .from('majstors')
        .update({
          subscription_status: 'trial',
          subscription_ends_at: trialEnd.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      console.log('✅ Trial subscription created')
      
      router.push('/dashboard?welcome=trial')

    } catch (err) {
      console.error('Error creating trial:', err)
      setError('Fehler beim Erstellen der Testversion: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // 📋 Direct to Freemium (FREE forever)
  const handleDirectFreemium = async () => {
    setLoading(true)
    setError('')

    try {
      console.log('📋 Setting up direct freemium access')

      await supabase
        .from('majstors')
        .update({
          subscription_status: 'freemium',
          subscription_ends_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      console.log('✅ Freemium access configured')

      router.push('/dashboard?welcome=freemium')

    } catch (err) {
      console.error('Error setting up freemium:', err)
      setError('Fehler beim Einrichten von Freemium: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // Loading state
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
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-12">
          <div className="text-3xl font-bold text-white mb-4">
            🎯 Willkommen bei Pro-meister<span className="text-blue-400">.de</span>!
          </div>
          <h1 className="text-2xl font-semibold text-white mb-2">
            Hallo {majstor.full_name}!
          </h1>
          <p className="text-slate-400 text-lg">
            Wählen Sie den passenden Plan für Ihr Handwerksgeschäft
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-8 bg-red-500/10 border border-red-500/20 rounded-lg p-4 max-w-2xl mx-auto">
            <p className="text-red-400 text-center">{error}</p>
          </div>
        )}

        {/* Paddle Loading Indicator */}
        {!paddleReady && (
          <div className="mb-8 bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 max-w-2xl mx-auto">
            <p className="text-blue-400 text-center">
              🔄 Zahlungssystem wird geladen...
            </p>
          </div>
        )}

        {/* Main Plans - 3 Column Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          
          {/* 🚀 OPTION 1: PRO SOFORT (mit Paddle) */}
          <div className="bg-slate-800/50 backdrop-blur-sm border-2 border-blue-500/50 rounded-2xl p-6 hover:border-blue-400 transition-all duration-300 relative overflow-hidden">
            
            {/* Ribbon Badge */}
            <div className="absolute top-6 -right-10 transform rotate-45">
              <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-12 py-1.5 text-xs font-bold shadow-lg">
                EMPFOHLEN
              </div>
            </div>

            <div className="text-center mb-6 pt-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg">
                <span className="text-3xl">🚀</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">PRO Sofort</h3>
              <p className="text-slate-300 text-sm">Alle Funktionen sofort nutzen</p>
            </div>

            {/* Plan Toggle */}
            <div className="bg-slate-900/50 rounded-lg p-3 mb-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedProPlan('monthly')}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                    selectedProPlan === 'monthly'
                      ? 'bg-blue-600 text-white'
                      : 'bg-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  Monatlich
                </button>
                <button
                  onClick={() => setSelectedProPlan('yearly')}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors relative ${
                    selectedProPlan === 'yearly'
                      ? 'bg-blue-600 text-white'
                      : 'bg-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  Jährlich
                  <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                    -17%
                  </span>
                </button>
              </div>
            </div>

            {/* Pricing */}
            <div className="text-center mb-6">
              {selectedProPlan === 'monthly' ? (
                <>
                  <div className="text-4xl font-bold text-white mb-1">
                    19,90€
                  </div>
                  <div className="text-slate-400">pro Monat + MwSt.</div>
                </>
              ) : (
                <>
                  <div className="text-4xl font-bold text-white mb-1">
                    199,99€
                  </div>
                  <div className="text-slate-400">pro Jahr + MwSt.</div>
                  <div className="text-green-400 text-sm mt-1">
                    nur 16,67€/Monat
                  </div>
                </>
              )}
            </div>

            {/* Features */}
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <span className="text-green-400">✅</span>
                <span>30 Tage kostenlos testen</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <span className="text-green-400">✅</span>
                <span>Alle PRO Funktionen sofort</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <span className="text-green-400">✅</span>
                <span>Automatische Verlängerung</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-white font-semibold">
                <span className="text-green-400 text-lg">✅</span>
                <span>Jederzeit online kündbar</span>
              </div>
              <div className="bg-blue-500/10 border border-blue-400/30 rounded-lg px-3 py-2 mt-2">
                <p className="text-blue-300 text-xs text-center">
                  💡 Keine Mindestlaufzeit • Keine Kündigungsfrist
                </p>
              </div>
            </div>

            {/* CTA Button - PADDLE CHECKOUT */}
            <button
              onClick={() => handleProSubscription(selectedProPlan)}
              disabled={loading || !paddleReady}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-semibold hover:scale-[1.02] transition-transform disabled:opacity-50 shadow-lg"
            >
              {loading ? 'Wird geladen...' : !paddleReady ? 'Laden...' : '🚀 Jetzt starten'}
            </button>

            {/* Footer Note */}
            <div className="text-xs text-slate-500 text-center mt-4 space-y-1">
              <p>* Kreditkarte erforderlich</p>
              <p>* Erste Zahlung nach 30 Tagen</p>
              <p>* Keine versteckten Kosten</p>
            </div>
          </div>

          {/* 🆓 OPTION 2: 7-TAGE TRIAL */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-6 hover:border-slate-600 transition-all duration-300">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg">
                <span className="text-3xl">🆓</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">7 Tage Testen</h3>
              <p className="text-slate-300 text-sm">Risikofrei ausprobieren</p>
            </div>

            {/* Pricing */}
            <div className="text-center mb-6">
              <div className="text-4xl font-bold text-white mb-1">
                0€
              </div>
              <div className="text-slate-400">für 7 Tage</div>
            </div>

            {/* Features */}
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <span className="text-green-400">✅</span>
                <span>7 Tage alle PRO Funktionen</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <span className="text-green-400">✅</span>
                <span>Keine Kreditkarte nötig</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <span className="text-green-400">✅</span>
                <span>Danach automatisch Freemium</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <span className="text-green-400">✅</span>
                <span>Keine automatische Zahlung</span>
              </div>
            </div>

            {/* CTA Button */}
            <button
              onClick={handleTrialToFreemium}
              disabled={loading}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 shadow-lg"
            >
              {loading ? 'Wird eingerichtet...' : '🆓 Kostenlos testen'}
            </button>

            {/* Footer Note */}
            <div className="text-xs text-slate-500 text-center mt-4 space-y-1">
              <p>* Keine Kreditkarte erforderlich</p>
              <p>* Nach 7 Tagen automatisch Freemium</p>
              <p>* Jederzeit auf PRO upgraden möglich</p>
            </div>
          </div>

          {/* 📋 OPTION 3: FREEMIUM */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-6 hover:border-slate-600 transition-all duration-300">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-slate-500 to-slate-600 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg">
                <span className="text-3xl">📋</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Freemium</h3>
              <p className="text-slate-300 text-sm">Grundfunktionen kostenlos</p>
            </div>

            {/* Pricing */}
            <div className="text-center mb-6">
              <div className="text-4xl font-bold text-white mb-1">
                0€
              </div>
              <div className="text-slate-400">für immer</div>
            </div>

            {/* Features */}
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <span className="text-green-400">✅</span>
                <span>QR Visitenkarte</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <span className="text-slate-500">⭕</span>
                <span>Keine Kundenanfragen</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <span className="text-slate-500">⭕</span>
                <span>Keine Rechnungen</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <span className="text-green-400">✅</span>
                <span>Jederzeit auf PRO upgraden</span>
              </div>
            </div>

            {/* CTA Button */}
            <button
              onClick={handleDirectFreemium}
              disabled={loading}
              className="w-full bg-slate-600 text-white py-3 rounded-lg font-semibold hover:bg-slate-700 transition-colors disabled:opacity-50 shadow-lg"
            >
              {loading ? 'Wird eingerichtet...' : '📋 Freemium starten'}
            </button>

            {/* Footer Note */}
            <div className="text-xs text-slate-500 text-center mt-4 space-y-1">
              <p>* Für immer kostenlos</p>
              <p>* Keine Kreditkarte erforderlich</p>
              <p>* Upgrade jederzeit möglich</p>
            </div>
          </div>
        </div>

        {/* 📊 FEATURE COMPARISON TABLE */}
        <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700 rounded-2xl p-6 mb-8">
          <h3 className="text-xl font-bold text-white mb-6 text-center">
            Was ist in jedem Plan enthalten?
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-slate-700">
                  <th className="text-left py-3 px-4 text-slate-300 font-semibold">Funktion</th>
                  <th className="text-center py-3 px-4">
                    <div className="text-slate-300 font-semibold mb-1">Freemium</div>
                    <div className="text-green-400 text-xs font-normal">Für immer kostenlos</div>
                  </th>
                  <th className="text-center py-3 px-4">
                    <div className="text-slate-300 font-semibold mb-1">7-Tage Trial</div>
                    <div className="text-orange-400 text-xs font-normal">7 Tage kostenlos</div>
                    <div className="text-slate-500 text-xs font-normal">dann Freemium</div>
                  </th>
                  <th className="text-center py-3 px-4">
                    <div className="text-blue-300 font-semibold mb-1">PRO</div>
                    <div className="text-blue-400 text-xs font-normal">30 Tage kostenlos</div>
                    <div className="text-green-400 text-xs font-normal">dann 19,90€/Monat</div>
                  </th>
                </tr>
              </thead>
              <tbody className="text-slate-300">
                <tr className="bg-slate-800/50">
                  <td className="py-4 px-4 font-bold text-white">Zugang & Kosten</td>
                  <td className="text-center py-4 px-4">
                    <div className="text-green-400 font-bold">Für immer</div>
                    <div className="text-slate-400 text-xs mt-1">0€ - Kostenlos</div>
                  </td>
                  <td className="text-center py-4 px-4">
                    <div className="text-orange-400 font-bold">7 Tage</div>
                    <div className="text-slate-400 text-xs mt-1">Dann Freemium</div>
                    <div className="text-green-400 text-xs">Keine Kreditkarte</div>
                  </td>
                  <td className="text-center py-4 px-4">
                    <div className="text-blue-400 font-bold">Unbegrenzt</div>
                    <div className="text-slate-400 text-xs mt-1">30 Tage kostenlos</div>
                    <div className="text-orange-400 text-xs">Dann 19,90€/Monat</div>
                  </td>
                </tr>
                <tr className="border-b border-slate-700/50">
                  <td className="py-3 px-4">📱 QR Visitenkarte</td>
                  <td className="text-center py-3 px-4"><span className="text-green-400">✅</span></td>
                  <td className="text-center py-3 px-4">
                    <span className="text-green-400">✅</span>
                    <div className="text-orange-400 text-xs mt-1">(7 Tage)</div>
                  </td>
                  <td className="text-center py-3 px-4"><span className="text-green-400">✅</span></td>
                </tr>
                <tr className="border-b border-slate-700/50">
                  <td className="py-3 px-4">📧 Kundenanfragen</td>
                  <td className="text-center py-3 px-4"><span className="text-slate-500">❌</span></td>
                  <td className="text-center py-3 px-4">
                    <span className="text-green-400">✅</span>
                    <div className="text-orange-400 text-xs mt-1">(7 Tage)</div>
                  </td>
                  <td className="text-center py-3 px-4"><span className="text-green-400">✅</span></td>
                </tr>
                <tr className="border-b border-slate-700/50">
                  <td className="py-3 px-4">👥 Kundenverwaltung</td>
                  <td className="text-center py-3 px-4"><span className="text-slate-500">❌</span></td>
                  <td className="text-center py-3 px-4">
                    <span className="text-green-400">✅</span>
                    <div className="text-orange-400 text-xs mt-1">(7 Tage)</div>
                  </td>
                  <td className="text-center py-3 px-4"><span className="text-green-400">✅</span></td>
                </tr>
                <tr className="border-b border-slate-700/50">
                  <td className="py-3 px-4">📄 Rechnungen & Angebote</td>
                  <td className="text-center py-3 px-4"><span className="text-slate-500">❌</span></td>
                  <td className="text-center py-3 px-4">
                    <span className="text-green-400">✅</span>
                    <div className="text-orange-400 text-xs mt-1">(7 Tage)</div>
                  </td>
                  <td className="text-center py-3 px-4"><span className="text-green-400">✅</span></td>
                </tr>
                <tr className="border-b border-slate-700/50">
                  <td className="py-3 px-4">🔧 Services Verwaltung</td>
                  <td className="text-center py-3 px-4"><span className="text-slate-500">❌</span></td>
                  <td className="text-center py-3 px-4">
                    <span className="text-green-400">✅</span>
                    <div className="text-orange-400 text-xs mt-1">(7 Tage)</div>
                  </td>
                  <td className="text-center py-3 px-4"><span className="text-green-400">✅</span></td>
                </tr>
                <tr className="border-b border-slate-700/50">
                  <td className="py-3 px-4">🗂️ PDF Archiv</td>
                  <td className="text-center py-3 px-4"><span className="text-slate-500">❌</span></td>
                  <td className="text-center py-3 px-4">
                    <span className="text-green-400">✅</span>
                    <div className="text-orange-400 text-xs mt-1">(7 Tage)</div>
                  </td>
                  <td className="text-center py-3 px-4"><span className="text-green-400">✅</span></td>
                </tr>
              </tbody>
            </table>
          </div>
          
          {/* Table Footer Note */}
          <div className="mt-6 bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="text-orange-400 text-xl">⚠️</span>
              <div className="text-sm">
                <p className="text-orange-300 font-semibold mb-1">Wichtig zu wissen:</p>
                <p className="text-orange-200">
                  <strong>7-Tage Trial:</strong> Alle PRO-Funktionen für 7 Tage kostenlos ohne Kreditkarte. 
                  Nach 7 Tagen wechseln Sie automatisch zu Freemium (nur QR-Visitenkarte).
                </p>
                <p className="text-orange-200 mt-2">
                  <strong>PRO Plan:</strong> Alle PRO-Funktionen für 30 Tage kostenlos mit Kreditkarte. 
                  Nach 30 Tagen beginnt die automatische monatliche/jährliche Abrechnung.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 🔒 TRUST & SECURITY BANNER */}
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-green-400 text-2xl">🔒</span>
            </div>
            <div>
              <h4 className="text-green-300 font-bold text-lg mb-3">Sichere Zahlung via Paddle</h4>
              <div className="space-y-2 text-green-200 text-sm">
                <p className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  <strong>EU-konforme Rechnungsstellung:</strong> Paddle handhabt automatisch VAT/MwSt.
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  <strong>Sichere Kreditkartenzahlung:</strong> PCI-DSS Level 1 zertifiziert
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  <strong>Jederzeit kündbar:</strong> Keine Mindestlaufzeit, keine Kündigungsfrist
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  <strong>DSGVO-konform:</strong> Ihre Daten werden in der EU gespeichert
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ✅ CANCELLATION & FLEXIBILITY BANNER */}
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-green-400 text-2xl">✅</span>
            </div>
            <div>
              <h4 className="text-green-300 font-bold text-lg mb-3">100% Flexibel - Keine versteckten Kosten</h4>
              <div className="space-y-2 text-green-200 text-sm">
                <p className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  <strong>Jederzeit kündbar:</strong> PRO-Abonnement kann jederzeit mit einem Klick online gekündigt werden
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  <strong>Keine Mindestlaufzeit:</strong> Sie sind nicht an einen Vertrag gebunden
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  <strong>Keine Kündigungsfrist:</strong> Kündigung wird sofort wirksam (Zugang bis Periodenende)
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  <strong>Plan-Wechsel jederzeit:</strong> Von Freemium auf PRO upgraden oder downgraden
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  <strong>Ihre Daten bleiben erhalten:</strong> Auch nach Kündigung haben Sie Zugriff auf Ihre Daten
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 📋 PRICING DISCLAIMER */}
        <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-6 mb-8">
          <h4 className="text-white font-semibold mb-3 text-center">📋 Transparente Preise & Konditionen</h4>
          <div className="text-slate-400 text-sm space-y-2 max-w-3xl mx-auto">
            <p>
              • <strong className="text-white">Jederzeit kündbar ohne Kündigungsfrist:</strong> Sie können Ihr PRO-Abonnement jederzeit online beenden. Keine Mindestlaufzeit, keine versteckten Kosten.
            </p>
            <p>
              • Alle angegebenen Preise verstehen sich zuzüglich der gesetzlichen Mehrwertsteuer (MwSt.).
            </p>
            <p>
              • B2B-Kunden mit gültiger USt-IdNr. zahlen den Nettopreis (Reverse-Charge-Verfahren).
            </p>
            <p>
              • Der endgültige Betrag wird beim Checkout unter Berücksichtigung Ihres Standorts berechnet.
            </p>
            <p>
              • PRO-Abonnements verlängern sich automatisch, können aber jederzeit online gekündigt werden.
            </p>
            <p>
              • Sichere Zahlung über Paddle (EU-konforme Rechnungsstellung).
            </p>
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