// app/components/subscription/UpgradeModal.js - FASTSPRING VERSION
// 🔥 MIGRACIJA: Paddle → FastSpring (UI ostaje identičan!)

'use client'
import { useState, useEffect } from 'react'
import { initializeFastSpring, openFastSpringCheckout, FASTSPRING_CONFIG } from '@/lib/fastspring'
import { supabase } from '@/lib/supabase'

export function UpgradeModal({ isOpen, onClose, feature, featureName, currentPlan }) {
  const [billingInterval, setBillingInterval] = useState('monthly')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fastspringReady, setFastspringReady] = useState(false)

  // Determine target plan: PRO+ for team features, PRO for everything else
  const isProPlus = feature === 'team'

  useEffect(() => {
    if (isOpen && !fastspringReady) {
      console.log('🔥 Initializing FastSpring...')
      initializeFastSpring(
        () => {
          console.log('✅ FastSpring initialized in UpgradeModal')
          setFastspringReady(true)
        },
        (err) => {
          console.error('❌ FastSpring initialization failed:', err)
          setError('FastSpring loading failed')
        }
      )
    }
  }, [isOpen, fastspringReady])

  useEffect(() => {
    if (!isOpen) {
      setLoading(false)
      setError('')
    }
  }, [isOpen])

  const handleUpgrade = async () => {
    console.log('🚀 handleUpgrade called!', { billingInterval })
    
    try {
      setLoading(true)
      setError('')

      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        throw new Error('Authentifizierung erforderlich')
      }

      const { data: majstorData, error: majstorError } = await supabase
        .from('majstors')
        .select('id, email')
        .eq('id', user.id)
        .single()

      if (majstorError) throw majstorError

      // 🔥 PROMENA: FastSpring productIds umesto Paddle priceIds
      const productId = isProPlus
        ? (billingInterval === 'monthly' ? FASTSPRING_CONFIG.productIds.plusMonthly : FASTSPRING_CONFIG.productIds.plusYearly)
        : (billingInterval === 'monthly' ? FASTSPRING_CONFIG.productIds.monthly : FASTSPRING_CONFIG.productIds.yearly)

      if (!productId) {
        throw new Error('Product ID not configured')
      }

      console.log('🚀 Opening FastSpring checkout:', {
        productId,
        billingInterval,
        email: majstorData.email,
        majstorId: majstorData.id
      })

      // 🔥 PROMENA: openFastSpringCheckout umesto openPaddleCheckout
      await openFastSpringCheckout({
        priceId: productId, // FastSpring i dalje prima kao 'priceId' parameter (compatibility)
        email: majstorData.email,
        majstorId: majstorData.id,
        billingInterval: billingInterval,
        onSuccess: (data) => {
          console.log('✅ FastSpring checkout success:', data)
          window.location.href = `/dashboard?fastspring_success=true&plan=${billingInterval}`
        },
        onError: (err) => {
          console.error('❌ FastSpring checkout error:', err)
          setError('Checkout fehlgeschlagen. Bitte versuchen Sie es erneut.')
          setLoading(false)
        },
        onClose: () => {
          console.log('🚪 FastSpring popup closed')
          setLoading(false)
        }
      })

    } catch (err) {
      console.error('❌ Upgrade error:', err)
      setError(err.message || 'Ein Fehler ist aufgetreten')
      setLoading(false)
    }
  }

  // 🔥 NOVA FUNKCIJA - Zatvori modal i resetuj sve
  const handleClose = () => {
    console.log('🚪 Modal closing - resetting state')
    setLoading(false)
    setError('')
    onClose()
  }

  if (!isOpen) {
    return null
  }

  const pricing = isProPlus ? {
    monthly: {
      price: 29.90,
      period: 'Monat',
      periodShort: 'mtl.',
      savings: null,
      popular: false
    },
    yearly: {
      price: 299.90,
      period: 'Jahr',
      periodShort: 'jährl.',
      savings: '16%',
      popular: true
    }
  } : {
    monthly: {
      price: 19.90,
      period: 'Monat',
      periodShort: 'mtl.',
      savings: null,
      popular: false
    },
    yearly: {
      price: 199.90,
      period: 'Jahr',
      periodShort: 'jährl.',
      savings: '16%',
      popular: true
    }
  }

  const currentPricing = pricing[billingInterval]
  const monthlyEquivalent = billingInterval === 'yearly' 
    ? (currentPricing.price / 12).toFixed(2) 
    : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 my-8 max-h-[90vh] overflow-y-auto">
        
        {/* 🔥 CLOSE BUTTON - UVEK OMOGUĆENO! */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white text-2xl z-10 hover:bg-slate-700 rounded-full w-8 h-8 flex items-center justify-center transition-colors"
        >
          ×
        </button>

        {/* Header */}
        <div className={`p-8 text-center ${isProPlus ? 'bg-gradient-to-r from-purple-600 to-pink-600' : 'bg-gradient-to-r from-blue-600 to-purple-600'}`}>
          <div className="text-5xl mb-4">{isProPlus ? '👑' : '💎'}</div>
          <h2 className="text-3xl font-bold text-white mb-2">
            Upgrade auf {isProPlus ? 'PRO+' : 'PRO'}
          </h2>
          <p className={isProPlus ? 'text-purple-100' : 'text-blue-100'}>
            {isProPlus ? 'Team-Funktionen für Ihren Betrieb' : 'Schalten Sie alle Funktionen frei'}
          </p>
          {currentPlan && (
            <p className="text-blue-200 text-sm mt-2">
              Aktueller Plan: <strong>{currentPlan}</strong>
            </p>
          )}
        </div>

        {/* Content */}
        <div className="p-8">
          
          {/* Billing Toggle */}
          <div className="mb-8">
            <div className="flex items-center justify-center gap-4 bg-slate-900 p-2 rounded-xl">
              <button
                onClick={() => setBillingInterval('monthly')}
                disabled={loading}
                className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                  billingInterval === 'monthly'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Monatlich
              </button>

              <button
                onClick={() => setBillingInterval('yearly')}
                disabled={loading}
                className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all duration-200 relative ${
                  billingInterval === 'yearly'
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Jährlich
                {pricing.yearly.savings && (
                  <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                    -{pricing.yearly.savings}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Pricing Display */}
          <div className="text-center mb-8">
            <div className="text-5xl font-bold text-white mb-2">
              {currentPricing.price.toFixed(2)}€
              <span className="text-xl text-slate-400 font-normal ml-2">
                + MwSt.
              </span>
            </div>
            <div className="text-slate-400 text-lg">
              pro {currentPricing.period}
            </div>
            {monthlyEquivalent && (
              <div className="text-green-400 text-sm mt-1">
                ≈ {monthlyEquivalent}€/Monat (spare {pricing.yearly.savings}!)
              </div>
            )}
          </div>

          {/* Features List */}
          <div className="bg-slate-900 rounded-xl p-6 mb-6">
            <h3 className="text-white font-semibold mb-4 text-center">
              {isProPlus ? '👑 Alle PRO+ Funktionen:' : '✨ Alle PRO-Funktionen:'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(isProPlus ? [
                { icon: '👷', text: 'Mitarbeiter verwalten' },
                { icon: '📡', text: 'Team Feed & Nachrichten' },
                { icon: '📋', text: 'Aufgaben zuweisen' },
                { icon: '📝', text: 'Berichte & Erledigtes' },
                { icon: '⏱️', text: 'Zeiterfassung pro Mitarbeiter' },
                { icon: '📢', text: 'Broadcasts an alle' },
                { icon: '📄', text: 'Alle PRO-Funktionen inklusive' },
                { icon: '🚀', text: 'Prioritäts-Support' }
              ] : [
                { icon: '👥', text: 'Unbegrenzte Kundenverwaltung' },
                { icon: '📩', text: 'Kundenanfragen Management' },
                { icon: '📄', text: 'Rechnungen & Angebote' },
                { icon: '🔧', text: 'Services Verwaltung' },
                { icon: '🗂️', text: 'PDF Archiv' },
                { icon: '⚙️', text: 'Erweiterte Einstellungen' },
                { icon: '📊', text: 'Analytics & Berichte' },
                { icon: '🚀', text: 'Prioritäts-Support' }
              ]).map((f, i) => (
                <div key={i} className="flex items-center gap-3 text-slate-300">
                  <span className="text-xl">{f.icon}</span>
                  <span className="text-sm">{f.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Important Notes */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <span className="text-2xl">ℹ️</span>
              <div className="text-sm text-blue-200">
                <p className="mb-2">
                  <strong>30 Tage Kündigungsfrist:</strong> Sie können Ihr Abonnement jederzeit kündigen.
                </p>
                <p>
                  <strong>Keine versteckten Kosten:</strong> Der angegebene Preis zzgl. MwSt.
                </p>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-3 text-red-300">
                <span className="text-2xl">⚠️</span>
                <span className="text-sm">{error}</span>
              </div>
            </div>
          )}

          {/* FastSpring Loading Indicator */}
          {!fastspringReady && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-3 text-yellow-300">
                <span className="text-2xl">⏳</span>
                <span className="text-sm">FastSpring wird geladen...</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleUpgrade}
              disabled={loading || !fastspringReady}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-3">
                  <span className="animate-spin">⏳</span>
                  Lädt...
                </span>
              ) : !fastspringReady ? (
                <span className="flex items-center justify-center gap-3">
                  <span className="animate-pulse">⏳</span>
                  FastSpring lädt...
                </span>
              ) : (
                <>
                  🚀 Jetzt auf {isProPlus ? 'PRO+' : 'PRO'} upgraden ({currentPricing.periodShort})
                </>
              )}
            </button>

            <button
              onClick={handleClose}
              className="w-full bg-slate-700 text-slate-300 px-8 py-3 rounded-xl font-medium hover:bg-slate-600 transition-colors"
            >
              Vielleicht später
            </button>
          </div>

          <p className="text-center text-slate-500 text-xs mt-4">
            Sichere Zahlung über FastSpring.
          </p>
        </div>
      </div>
    </div>
  )
}

export function useUpgradeModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [modalProps, setModalProps] = useState({
    feature: null,
    featureName: null,
    currentPlan: null
  })

  const showUpgradeModal = (featureOrObj, featureName, currentPlan) => {
    // Support both: showUpgradeModal({ feature, featureName, currentPlan }) and showUpgradeModal(feature, featureName, currentPlan)
    const props = typeof featureOrObj === 'object'
      ? featureOrObj
      : { feature: featureOrObj, featureName, currentPlan }
    console.log('🔥 showUpgradeModal CALLED!', props)
    setModalProps(props)
    setIsOpen(true)
  }

  const hideUpgradeModal = () => {
    console.log('🔥 hideUpgradeModal called!')
    setIsOpen(false)
    setTimeout(() => {
      setModalProps({ feature: null, featureName: null, currentPlan: null })
    }, 300)
  }

  return {
    isOpen,
    modalProps,
    showUpgradeModal,
    hideUpgradeModal
  }
}