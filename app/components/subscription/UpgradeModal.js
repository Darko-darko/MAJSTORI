// app/components/subscription/UpgradeModal.js - DEBUG VERSION
'use client'
import { useState, useEffect } from 'react'
import { initializePaddle, openPaddleCheckout, PADDLE_CONFIG } from '@/lib/paddle'
import { supabase } from '@/lib/supabase'
import { markPaymentJustCompleted } from '@/lib/hooks/useSubscription'

console.log('🔥 UpgradeModal.js loaded!')

/**
 * 🔥 UPGRADE MODAL - DEBUG VERSION
 */
export function UpgradeModal({ isOpen, onClose, feature, featureName, currentPlan }) {
  console.log('🔥 UpgradeModal rendered!', { isOpen, feature, featureName, currentPlan })
  
  const [billingInterval, setBillingInterval] = useState('monthly')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [paddleReady, setPaddleReady] = useState(false)

  useEffect(() => {
    console.log('🔥 UpgradeModal useEffect - isOpen changed:', isOpen)
    if (isOpen && !paddleReady) {
      console.log('🔥 Initializing Paddle...')
      initializePaddle(
        () => {
          console.log('✅ Paddle initialized in UpgradeModal')
          setPaddleReady(true)
        },
        (err) => {
          console.error('❌ Paddle initialization failed:', err)
          setError('Paddle loading failed')
        }
      )
    }
  }, [isOpen, paddleReady])

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

      const priceId = billingInterval === 'monthly' 
        ? PADDLE_CONFIG.priceIds.monthly
        : PADDLE_CONFIG.priceIds.yearly

      if (!priceId) {
        throw new Error('Price ID not configured')
      }

      console.log('🚀 Opening Paddle checkout:', {
        priceId,
        billingInterval,
        email: majstorData.email
      })

      markPaymentJustCompleted()

      await openPaddleCheckout({
        priceId: priceId,
        email: majstorData.email,
        majstorId: majstorData.id,
        billingInterval: billingInterval,
        onSuccess: (data) => {
          console.log('✅ Paddle checkout success:', data)
          onClose()
          
          setTimeout(() => {
            window.location.href = `/dashboard?paddle_success=true&plan=${billingInterval}`
          }, 1000)
        },
        onError: (err) => {
          console.error('❌ Paddle checkout error:', err)
          setError('Checkout fehlgeschlagen. Bitte versuchen Sie es erneut.')
          setLoading(false)
        }
      })

    } catch (err) {
      console.error('❌ Upgrade error:', err)
      setError(err.message || 'Ein Fehler ist aufgetreten')
      setLoading(false)
    }
  }

  if (!isOpen) {
    console.log('⏸️ UpgradeModal is closed')
    return null
  }

  console.log('✅ UpgradeModal is OPEN and RENDERING!')

  const pricing = {
    monthly: {
      price: 19.90,
      period: 'Monat',
      periodShort: 'mtl.',
      savings: null,
      popular: false
    },
    yearly: {
      price: 199.99,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 max-h-[90vh] overflow-y-auto">
        
        {/* Debug Info */}
        <div className="absolute top-0 left-0 bg-red-500 text-white text-xs px-2 py-1 z-50">
          DEBUG: Modal OPEN!
        </div>

        {/* Close Button */}
        <button
          onClick={() => {
            console.log('🔥 Close button clicked!')
            onClose()
          }}
          disabled={loading}
          className="absolute top-4 right-4 text-slate-400 hover:text-white text-2xl z-10 disabled:opacity-50"
        >
          ×
        </button>

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-8 text-center">
          <div className="text-5xl mb-4">💎</div>
          <h2 className="text-3xl font-bold text-white mb-2">
            Upgrade auf PRO
          </h2>
          <p className="text-blue-100">
            Schalten Sie alle Funktionen frei
          </p>
          <p className="text-blue-200 text-sm mt-2">
            Aktueller Plan: <strong>{currentPlan || 'Unknown'}</strong>
          </p>
        </div>

        {/* Content */}
        <div className="p-8">
          
          {/* Billing Toggle */}
          <div className="mb-8">
            <div className="flex items-center justify-center gap-4 bg-slate-900 p-2 rounded-xl">
              <button
                onClick={() => {
                  console.log('🔥 Monthly clicked!')
                  setBillingInterval('monthly')
                }}
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
                onClick={() => {
                  console.log('🔥 Yearly clicked!')
                  setBillingInterval('yearly')
                }}
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
              ✨ Alle PRO-Funktionen:
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { icon: '👥', text: 'Unbegrenzte Kundenverwaltung' },
                { icon: '📩', text: 'Kundenanfragen Management' },
                { icon: '📄', text: 'Rechnungen & Angebote' },
                { icon: '🔧', text: 'Services Verwaltung' },
                { icon: '🗂️', text: 'PDF Archiv' },
                { icon: '⚙️', text: 'Erweiterte Einstellungen' },
                { icon: '📊', text: 'Analytics & Berichte' },
                { icon: '🚀', text: 'Prioritäts-Support' }
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-3 text-slate-300">
                  <span className="text-xl">{feature.icon}</span>
                  <span className="text-sm">{feature.text}</span>
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

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={() => {
                console.log('🔥 Upgrade button clicked!')
                handleUpgrade()
              }}
              disabled={loading || !paddleReady}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-3">
                  <span className="animate-spin">⏳</span>
                  Lädt...
                </span>
              ) : (
                <>
                  🚀 Jetzt auf PRO upgraden ({currentPricing.periodShort})
                </>
              )}
            </button>

            <button
              onClick={() => {
                console.log('🔥 Cancel button clicked!')
                onClose()
              }}
              disabled={loading}
              className="w-full bg-slate-700 text-slate-300 px-8 py-3 rounded-xl font-medium hover:bg-slate-600 transition-colors disabled:opacity-50"
            >
              Vielleicht später
            </button>
          </div>

          <p className="text-center text-slate-500 text-xs mt-4">
            Sichere Zahlung über Paddle.
          </p>
        </div>
      </div>
    </div>
  )
}

/**
 * 🎣 Hook za kontrolu UpgradeModal-a
 */
export function useUpgradeModal() {
  console.log('🔥 useUpgradeModal hook initialized!')
  
  const [isOpen, setIsOpen] = useState(false)
  const [modalProps, setModalProps] = useState({
    feature: null,
    featureName: null,
    currentPlan: null
  })

  const showUpgradeModal = (feature, featureName, currentPlan) => {
    console.log('🔥🔥🔥 showUpgradeModal CALLED!', { feature, featureName, currentPlan })
    setModalProps({ feature, featureName, currentPlan })
    setIsOpen(true)
  }

  const hideUpgradeModal = () => {
    console.log('🔥 hideUpgradeModal called!')
    setIsOpen(false)
    setTimeout(() => {
      setModalProps({ feature: null, featureName: null, currentPlan: null })
    }, 300)
  }

  console.log('🔥 useUpgradeModal state:', { isOpen, modalProps })

  return {
    isOpen,
    modalProps,
    showUpgradeModal,
    hideUpgradeModal
  }
}