// app/welcome/choose-plan/page.js - FASTSPRING VERSION
// 🔥 MIGRACIJA: Paddle → FastSpring

'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { 
  initializeFastSpring, 
  openFastSpringCheckout, 
  FASTSPRING_CONFIG,
  validateFastSpringConfig 
} from '@/lib/fastspring'
import { clearSubscriptionCache } from '@/lib/hooks/useSubscription'

export default function ChoosePlanPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [user, setUser] = useState(null)
  const [majstor, setMajstor] = useState(null)
  const [selectedProInterval, setSelectedProInterval] = useState('monthly')
  const [fastspringReady, setFastspringReady] = useState(false)
  const router = useRouter()

  // Pricing data
  const pricing = {
    freemium: {
      price: 0,
      name: 'Freemium',
      icon: '📋',
      color: 'from-slate-500 to-slate-600',
      borderColor: 'border-slate-700',
    },
    pro: {
      monthly: { price: 19.90, period: 'Monat' },
      yearly: { price: 199.90, period: 'Jahr', monthlyEquiv: 16.66, savings: 16 },
      name: 'PRO',
      icon: '💎',
      color: 'from-blue-600 to-purple-600',
      borderColor: 'border-blue-500',
    },
    proPlus: {
      price: 39.90,
      name: 'PRO+',
      icon: '🚀',
      color: 'from-purple-600 to-pink-600',
      borderColor: 'border-purple-500',
      comingSoon: true,
    }
  }

  // Google Ads conversion — okida se jednom pri dolasku na stranicu
  useEffect(() => {
    try {
      // Provera 1: postoji li sačuvan consent?
      const match = document.cookie.match(/(^|; )cookie_consent=([^;]*)/)
      if (!match) return
      const consent = JSON.parse(decodeURIComponent(match[2]))

      // Provera 2: korisnik je eksplicitno dao ads consent?
      if (!consent.ads) return

      // Provera 3: fire-once po sesiji
      if (sessionStorage.getItem('ads_conv_choose_plan')) return

      // Provera 4: gtag definisan (guard — ne baca grešku ako nije)
      if (typeof window.gtag !== 'function') return

      window.gtag('event', 'conversion', { send_to: 'AW-17973690084/eNe6CPX_g_4bEOT9wvpC' })
      sessionStorage.setItem('ads_conv_choose_plan', '1')
    } catch {
      // Silent fail — nikad ne sme da polomi stranicu
    }
  }, [])

  useEffect(() => {
    loadUserData()

    // Initialize FastSpring
    initializeFastSpring(
      (fastspring) => {
        console.log('✅ FastSpring initialized')
        setFastspringReady(true)
      },
      (error) => {
        console.error('❌ FastSpring init failed:', error)
        setError('FastSpring konnte nicht geladen werden.')
      }
    )

    // Validate FastSpring config
    if (!validateFastSpringConfig()) {
      setError('FastSpring Konfiguration fehlt.')
    }
  }, [])

  const loadUserData = async () => {
    try {
      const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !currentUser) {
        console.error('No user found')
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
        console.error('Majstor not found:', majstorError)
        router.push('/signup')
        return
      }

      setMajstor(majstorData)
    } catch (err) {
      console.error('Error loading user:', err)
      setError('Fehler beim Laden der Benutzerdaten')
    }
  }

  // 💎 PRO Subscription Handler - FASTSPRING VERSION
  const handleProSelect = async () => {
    if (!fastspringReady) {
      setError('FastSpring wird noch geladen...')
      return
    }

    setLoading(true)
    setError('')

    try {
      console.log(`🚀 Opening FastSpring Checkout: ${selectedProInterval}`)

      const productId = selectedProInterval === 'yearly' 
        ? FASTSPRING_CONFIG.productIds.yearly 
        : FASTSPRING_CONFIG.productIds.monthly

      if (!productId) {
        throw new Error(`Product ID nicht gefunden für ${selectedProInterval}`)
      }

      console.log('📋 Product ID:', productId)
      console.log('👤 User:', user.email)
      console.log('🆔 Majstor ID:', user.id)

      // 🔥 SIMPLIFIED: Samo otvori checkout i redirect sa fastspring_success=true
      openFastSpringCheckout({
        priceId: productId,
        email: user.email,
        majstorId: user.id,
        billingInterval: selectedProInterval,
        
        onSuccess: async (checkoutData) => {
          console.log('✅ FastSpring Checkout successful!')
          console.log('📋 Checkout Data:', checkoutData)
          
          // 🔥 Clear cache PRE redirect-a
          console.log('🗑️ Clearing cache before redirect...')
          clearSubscriptionCache(user.id)

          // 🔥 REDIRECT SA fastspring_success=true
          const timestamp = Date.now()
          console.log('🔄 Redirecting to dashboard with fastspring_success flag...')
          window.location.replace(`/dashboard?fastspring_success=true&plan=${selectedProInterval}&t=${timestamp}`)
        },
        
        onError: (error) => {
          console.error('❌ FastSpring Checkout error:', error)
          setError('Checkout fehlgeschlagen. Bitte versuchen Sie es erneut.')
          setLoading(false)
        },

        onClose: () => {
          console.log('🚪 FastSpring popup closed by user')
          setLoading(false)
        }
      })

    } catch (err) {
      console.error('❌ Error opening FastSpring Checkout:', err)
      setError('Fehler beim Öffnen des Checkouts: ' + err.message)
      setLoading(false)
    }
  }

  // 📋 Freemium Handler
  const handleFreemiumSelect = async () => {
    setLoading(true)
    setError('')

    try {
      console.log('📋 Setting up freemium access for user:', user.id)

      await supabase
        .from('majstors')
        .update({
          subscription_status: 'freemium',
          subscription_ends_at: null,
          grace_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      console.log('✅ Freemium configured')
      router.push('/dashboard?welcome=freemium')

    } catch (err) {
      console.error('❌ Error setting up freemium:', err)
      setError('Fehler beim Einrichten von Freemium')
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

  const currentProPricing = pricing.pro[selectedProInterval]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-12">
          <div className="text-4xl font-bold text-white mb-4">
            🎯 Willkommen bei Pro-meister<span className="text-blue-400">.de</span>!
          </div>
          <h1 className="text-2xl font-semibold text-white mb-3">
            Hallo {majstor.full_name}!
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Wählen Sie den passenden Plan für Ihr Handwerksgeschäft
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-8 bg-red-500/10 border border-red-500/20 rounded-lg p-4 max-w-2xl mx-auto">
            <p className="text-red-400 text-center">{error}</p>
          </div>
        )}

        {/* FastSpring Loading */}
        {!fastspringReady && (
          <div className="mb-8 bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 max-w-2xl mx-auto">
            <p className="text-blue-400 text-center">
              🔄 Zahlungssystem wird geladen...
            </p>
          </div>
        )}

        {/* Main Plan Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          
                    {/* 💎 PRO - EMPFOHLEN */}
          <div className="bg-slate-800/50 backdrop-blur-sm border-2 border-blue-500 rounded-2xl p-8 hover:border-blue-400 transition-all duration-300 relative scale-105 shadow-2xl">
            
            {/* Badge */}
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg">
                ⭐ EMPFOHLEN
              </div>
            </div>

            <div className="text-center mb-6 pt-4">
              <div className={`w-20 h-20 bg-gradient-to-br ${pricing.pro.color} rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg`}>
                <span className="text-4xl">{pricing.pro.icon}</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">{pricing.pro.name}</h3>
              <p className="text-slate-300">Alle Funktionen sofort</p>
            </div>

            {/* Interval Toggle */}
            <div className="bg-slate-900/50 rounded-xl p-3 mb-6">
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedProInterval('monthly')}
                  className={`flex-1 py-3 px-4 rounded-lg text-sm font-semibold transition-all ${
                    selectedProInterval === 'monthly'
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  Monatlich
                </button>
                <button
                  onClick={() => setSelectedProInterval('yearly')}
                  className={`flex-1 py-3 px-4 rounded-lg text-sm font-semibold transition-all relative ${
                    selectedProInterval === 'yearly'
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                      : 'bg-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  Jährlich
                  <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                    -{pricing.pro.yearly.savings}%
                  </span>
                </button>
              </div>
            </div>

            <div className="text-center mb-8">
              <div className="text-5xl font-bold text-white mb-2">
                {currentProPricing.price.toFixed(2)}€
              </div>
              <div className="text-slate-400 mb-1">
                pro {currentProPricing.period} + MwSt.
              </div>
              {selectedProInterval === 'yearly' && (
                <div className="text-green-400 font-semibold">
                  ≈ {currentProPricing.monthlyEquiv}€/Monat
                </div>
              )}
              <div className="mt-3 bg-blue-500/10 border border-blue-400/30 rounded-lg px-3 py-2">
                <p className="text-blue-300 text-sm font-semibold">
                  🎯 Trial: Testen Sie kostenlos
                </p>
              </div>
            </div>

            <div className="space-y-3 mb-8">
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <span className="text-green-400">✅</span>
                <span>Alle PRO Funktionen</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <span className="text-green-400">✅</span>
                <span>Unbegrenzte Kunden</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <span className="text-green-400">✅</span>
                <span>Rechnungen & Angebote</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <span className="text-green-400">✅</span>
                <span>30 Tage Kündigungsfrist</span>
              </div>
            </div>

            <button
              onClick={handleProSelect}
              disabled={loading || !fastspringReady}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl font-bold text-lg hover:scale-105 transition-transform disabled:opacity-50 shadow-xl"
            >
              {loading ? 'Wird geladen...' : !fastspringReady ? 'Laden...' : '🚀 Jetzt PRO freischalten'}
            </button>

            <div className="text-xs text-slate-400 text-center mt-4 space-y-1">
              <p>✓ Kreditkarte erforderlich</p>
              <p>✓ Trial-Periode lt. FastSpring</p>
              <p>✓ 30 Tage Kündigungsfrist</p>
            </div>
          </div>

          {/* 📋 FREEMIUM */}
          <div className="bg-slate-800/50 backdrop-blur-sm border-2 border-slate-700 rounded-2xl p-8 hover:border-slate-600 transition-all duration-300">
            <div className="text-center mb-6">
              <div className={`w-20 h-20 bg-gradient-to-br ${pricing.freemium.color} rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg`}>
                <span className="text-4xl">{pricing.freemium.icon}</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">{pricing.freemium.name}</h3>
              <p className="text-slate-300">Grundfunktionen kostenlos</p>
            </div>

            <div className="text-center mb-8">
              <div className="text-5xl font-bold text-white mb-2">0€</div>
              <div className="text-slate-400">für immer</div>
            </div>

            <div className="space-y-3 mb-8">
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <span className="text-green-400">✅</span>
                <span>QR Visitenkarte</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <span className="text-green-400">✅</span>
                <span>Kundenanfragen</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <span className="text-slate-600">❌</span>
                <span>Kundenverwaltung</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <span className="text-slate-600">❌</span>
                <span>Rechnungen</span>
              </div>
            </div>

            <button
              onClick={handleFreemiumSelect}
              disabled={loading}
              className="w-full bg-slate-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-slate-700 transition-colors disabled:opacity-50 shadow-lg"
            >
              {loading ? 'Wird eingerichtet...' : 'Nur QR-Visitenkarte nutzen'}
            </button>

            <div className="text-xs text-slate-500 text-center mt-4 space-y-1">
              <p>✓ Für immer kostenlos</p>
              <p>✓ Keine Kreditkarte</p>
              <p>✓ Upgrade jederzeit</p>
            </div>
          </div>



          {/* 🚀 PRO+ - USKORO */}
          <div className="bg-slate-800/30 backdrop-blur-sm border-2 border-slate-700 rounded-2xl p-8 relative opacity-75">
            
            {/* Coming Soon Badge */}
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <div className="bg-orange-500 text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg">
                🔜 BALD VERFÜGBAR
              </div>
            </div>

            <div className="text-center mb-6 pt-4">
              <div className={`w-20 h-20 bg-gradient-to-br ${pricing.proPlus.color} rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg opacity-60`}>
                <span className="text-4xl">{pricing.proPlus.icon}</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">{pricing.proPlus.name}</h3>
              <p className="text-slate-300">Enterprise Funktionen</p>
            </div>

            <div className="text-center mb-8">
              <div className="text-5xl font-bold text-slate-400 mb-2">
                {pricing.proPlus.price.toFixed(2)}€
              </div>
              <div className="text-slate-500">pro Monat + MwSt.</div>
            </div>

            <div className="space-y-3 mb-8">
              <div className="flex items-center gap-3 text-sm text-slate-400">
                <span className="text-slate-600">✅</span>
                <span>Alle PRO Funktionen</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-400">
                <span className="text-slate-600">📅</span>
                <span>Terminplaner & Kalender</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-400">
                <span className="text-slate-600">👥</span>
                <span>Team-Verwaltung</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-400">
                <span className="text-slate-600">📊</span>
                <span>Business Analytics</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-400">
                <span className="text-slate-600">📱</span>
                <span>Mobile App</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-400">
                <span className="text-slate-600">⚡</span>
                <span>24/7 Support</span>
              </div>
            </div>

            <button
              disabled
              className="w-full bg-slate-700 text-slate-400 py-4 rounded-xl font-bold text-lg cursor-not-allowed"
            >
              🔒 Bald verfügbar
            </button>

            <div className="text-xs text-slate-500 text-center mt-4">
              <p>Benachrichtigung erhalten</p>
            </div>
          </div>
        </div>

        {/* Security Banner */}
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-green-400 text-2xl">🔒</span>
            </div>
            <div>
              <h4 className="text-green-300 font-bold text-lg mb-3">Sichere Zahlung via FastSpring</h4>
              <div className="grid md:grid-cols-2 gap-3 text-green-200 text-sm">
                <p className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  EU-konforme Rechnungsstellung
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  PCI-DSS Level 1 zertifiziert
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  30 Tage Kündigungsfrist
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  DSGVO-konform
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing Disclaimer */}
        <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-6 mb-8">
          <h4 className="text-white font-semibold mb-3 text-center">📋 Transparente Preise</h4>
          <div className="text-slate-400 text-sm space-y-2 max-w-3xl mx-auto">
            <p>• Alle Preise zzgl. MwSt.</p>
            <p>• <strong className="text-white">Trial-Periode:</strong> Kreditkarte erforderlich. Erste Zahlung nach Trial.</p>
            <p>• <strong className="text-white">Kündigungsfrist:</strong> 30 Tage. Zugriff bis Periodenende.</p>
            <p>• Automatische Verlängerung. Jederzeit online kündbar.</p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-slate-500 text-sm">
          <p>
            Fragen? <a href="mailto:support@pro-meister.de" className="text-blue-400 hover:text-blue-300 underline">support@pro-meister.de</a>
          </p>
        </div>
      </div>
    </div>
  )
}