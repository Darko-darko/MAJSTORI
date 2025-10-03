// app/dashboard/subscription/page.js - COMPLETE FIXED VERSION

'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useSubscription, clearSubscriptionCache } from '@/lib/hooks/useSubscription'
import { initializePaddle, openPaddleCheckout, PADDLE_CONFIG } from '@/lib/paddle'

export default function SubscriptionPage() {
  const [user, setUser] = useState(null)
  const [majstor, setMajstor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [processingMessage, setProcessingMessage] = useState('')
  const [error, setError] = useState('')
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [paddleReady, setPaddleReady] = useState(false)
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)
  const router = useRouter()

  // Get subscription data
  const { 
    subscription,
    plan, 
    isActive,
    isInTrial, 
    isFreemium, 
    isPaid,
    trialDaysRemaining,
    loading: subLoading,
    refresh: refreshSubscription
  } = useSubscription(majstor?.id)

  useEffect(() => {
    loadUser()
    
    // Check for upgrade success
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('upgrade_success') === 'true') {
      setShowSuccessMessage(true)
      setTimeout(() => setShowSuccessMessage(false), 8000)
      // Clean URL
      window.history.replaceState({}, '', '/dashboard/subscription')
    }
    
    // 🚀 Initialize Paddle.js using helper function (SAME AS WELCOME PAGE)
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
    
    // 🔥 Set timeout for Paddle loading
   const paddleTimeout = setTimeout(() => {
  if (!paddleReady) {
    console.info('Paddle still loading... (this is normal)')
    // Ne prikazuj error korisniku
  }
}, 30000)

return () => clearTimeout(paddleTimeout)
  }, [])

  const loadUser = async () => {
    try {
      const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !currentUser) {
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
        setError('Profil konnte nicht geladen werden')
        return
      }

      setMajstor(majstorData)
      
      // 🔥 Validate Paddle configuration
      if (!process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN) {
        console.error('❌ NEXT_PUBLIC_PADDLE_CLIENT_TOKEN is missing!')
        setError('Paddle Konfiguration fehlt. Bitte kontaktieren Sie den Support.')
      }
      if (!process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_MONTHLY) {
        console.error('❌ NEXT_PUBLIC_PADDLE_PRICE_ID_MONTHLY is missing!')
      }
      if (!process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_YEARLY) {
        console.error('❌ NEXT_PUBLIC_PADDLE_PRICE_ID_YEARLY is missing!')
      }
    } catch (err) {
      console.error('Error loading user:', err)
      setError('Fehler beim Laden der Daten')
    } finally {
      setLoading(false)
    }
  }

  // 🔥 NEW: Create pending subscription after checkout
  const createPendingSubscription = async (planType, paddleData) => {
    try {
      console.log('🔄 Creating pending subscription for upgrade...')
      console.log('📦 Paddle Data:', paddleData)

      const planName = planType === 'yearly' ? 'pro_yearly' : 'pro'
      const { data: plan, error: planError } = await supabase
        .from('subscription_plans')
        .select('id, name, display_name')
        .eq('name', planName)
        .single()

      if (planError) throw planError
      console.log('✅ Found plan:', plan)

      const now = new Date()
      const trialEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

      console.log('📅 Trial dates:', {
        start: now.toISOString(),
        end: trialEnd.toISOString()
      })

      // Check if subscription already exists
      const { data: existingSub } = await supabase
        .from('user_subscriptions')
        .select('id, status')
        .eq('majstor_id', majstor.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      console.log('🔍 Existing subscription:', existingSub)

      if (existingSub) {
        // Update existing subscription
        console.log('📝 Updating existing subscription:', existingSub.id)
        const { data: updated, error: updateError } = await supabase
          .from('user_subscriptions')
          .update({
            plan_id: plan.id,
            status: 'trial',
            paddle_subscription_id: paddleData?.subscription_id || null,
            paddle_customer_id: paddleData?.customer_id || null,
            trial_starts_at: now.toISOString(),
            trial_ends_at: trialEnd.toISOString(),
            current_period_start: now.toISOString(),
            current_period_end: trialEnd.toISOString(),
            updated_at: now.toISOString()
          })
          .eq('id', existingSub.id)
          .select()
          .single()

        if (updateError) throw updateError
        console.log('✅ Subscription updated:', updated)
      } else {
        // Create new subscription
        console.log('➕ Creating new subscription')
        const { data: created, error: insertError } = await supabase
          .from('user_subscriptions')
          .insert({
            majstor_id: majstor.id,
            plan_id: plan.id,
            status: 'trial',
            paddle_subscription_id: paddleData?.subscription_id || null,
            paddle_customer_id: paddleData?.customer_id || null,
            trial_starts_at: now.toISOString(),
            trial_ends_at: trialEnd.toISOString(),
            current_period_start: now.toISOString(),
            current_period_end: trialEnd.toISOString(),
            created_at: now.toISOString(),
            updated_at: now.toISOString()
          })
          .select()
          .single()

        if (insertError) throw insertError
        console.log('✅ Subscription created:', created)
      }

      // Update majstor record
      const { error: majstorError } = await supabase
        .from('majstors')
        .update({
          subscription_status: 'trial',
          subscription_ends_at: trialEnd.toISOString(),
          updated_at: now.toISOString()
        })
        .eq('id', majstor.id)

      if (majstorError) throw majstorError
      console.log('✅ Majstor record updated to trial status')

      // 🔥 VERIFY: Read back what we just created
      const { data: verification } = await supabase
        .from('user_subscriptions')
        .select('*, subscription_plans(*)')
        .eq('majstor_id', majstor.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      console.log('🔍 VERIFICATION - Subscription in DB:', verification)

    } catch (err) {
      console.error('❌ Error in createPendingSubscription:', err)
      throw err
    }
  }

  // 🔥 NEW: Wait for webhook processing
  const waitForWebhookProcessing = async (maxAttempts = 10) => {
    console.log('⏰ Waiting for webhook to process...')
    
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setProcessingMessage(`Verarbeite Zahlung... (${i + 1}/${maxAttempts})`)

      const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select('paddle_subscription_id, status')
        .eq('majstor_id', majstor.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (subscription?.paddle_subscription_id) {
        console.log('✅ Webhook processed!')
        return true
      }
    }

    console.log('⚠️ Webhook timeout, but subscription should exist')
    return false
  }

  // Cancel subscription
  const handleCancelSubscription = async () => {
    setActionLoading(true)
    setError('')

    try {
      console.log('Cancelling subscription:', subscription.id)

      const { error: updateError } = await supabase
        .from('user_subscriptions')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', subscription.id)

      if (updateError) throw updateError

      await supabase
        .from('majstors')
        .update({
          subscription_status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', majstor.id)

      console.log('Subscription cancelled successfully')

      clearSubscriptionCache(majstor.id)
      await refreshSubscription()
      
      setShowCancelModal(false)
      alert('Ihr Abonnement wurde gekündigt. Sie haben weiterhin Zugriff auf PRO-Features bis zum Ende des aktuellen Abrechnungszeitraums.')

    } catch (err) {
      console.error('Error cancelling subscription:', err)
      setError('Fehler beim Kündigen des Abonnements: ' + err.message)
    } finally {
      setActionLoading(false)
    }
  }

  // 🔥 IMPROVED: Upgrade to PRO - USING SAME METHOD AS WELCOME PAGE
  const handleUpgrade = async (planType = 'monthly') => {
    if (!paddleReady) {
      setError('Paddle wird noch geladen. Bitte warten Sie einen Moment.')
      return
    }

    if (!user) {
      setError('Bitte melden Sie sich an, um fortzufahren.')
      return
    }

    setActionLoading(true)
    setProcessingMessage('Öffne Checkout...')
    setError('')

    try {
      console.log(`🚀 Opening Paddle Checkout for upgrade: ${planType}`)

      // 🔥 IMPORTANT: Define priceId FIRST before using it
      const priceId = planType === 'yearly' 
        ? PADDLE_CONFIG.priceIds.yearly
        : PADDLE_CONFIG.priceIds.monthly

      // Debug: Check Paddle config
      console.log('🔍 Paddle Config:', {
        environment: PADDLE_CONFIG.environment,
        hasToken: !!PADDLE_CONFIG.clientToken,
        priceIds: PADDLE_CONFIG.priceIds,
        selectedPriceId: priceId
      })

      if (!priceId) {
        throw new Error(`Price ID nicht gefunden für: ${planType}`)
      }

      // 🎯 Use the same helper function as welcome page (already imported at top)
      openPaddleCheckout({
        priceId: priceId,
        email: user.email,
        majstorId: majstor.id,
        billingInterval: planType,
        
        // ✅ Success Callback - SAME AS WELCOME PAGE
        onSuccess: async (checkoutData) => {
          console.log('✅ Paddle Checkout successful:', checkoutData)
          
          setProcessingMessage('Zahlung erfolgreich! Aktiviere Account...')

          try {
            // 1. Create pending subscription immediately
            await createPendingSubscription(planType, checkoutData)

            // 2. Wait for webhook (optional, max 10 seconds)
            await waitForWebhookProcessing(10)

            // 3. Clear cache to force refresh
            clearSubscriptionCache(majstor.id)

            setProcessingMessage('Fertig! Seite wird neu geladen...')

            // 4. Refresh page to show new subscription
            setTimeout(() => {
              window.location.href = '/dashboard/subscription?upgrade_success=true'
            }, 1000)

          } catch (err) {
            console.error('❌ Error processing subscription:', err)
            setError('Zahlung erfolgreich, aber Fehler bei der Aktivierung. Bitte Support kontaktieren.')
            setActionLoading(false)
            setProcessingMessage('')
          }
        },
        
        // ❌ Error Callback - SAME AS WELCOME PAGE
        onError: (error) => {
          console.error('❌ Paddle Checkout error:', error)
          setError('Checkout fehlgeschlagen. Bitte versuchen Sie es erneut.')
          setActionLoading(false)
          setProcessingMessage('')
        }
      })

      // Wait for callbacks - don't reset loading immediately
      setProcessingMessage('Warte auf Zahlung...')

    } catch (err) {
      console.error('Error opening Paddle Checkout:', err)
      setError('Fehler beim Öffnen des Checkouts: ' + err.message)
      setActionLoading(false)
      setProcessingMessage('')
    }
  }

  // Calculate period end date
  const getPeriodEndDate = () => {
    if (!subscription) return null
    
    if (subscription.status === 'trial' && subscription.trial_ends_at) {
      return new Date(subscription.trial_ends_at)
    }
    
    if (subscription.status === 'active' && subscription.current_period_end) {
      return new Date(subscription.current_period_end)
    }
    
    return null
  }

  const periodEndDate = getPeriodEndDate()
  const isInGracePeriod = subscription?.status === 'active' && !subscription?.paddle_subscription_id

  // 🔥 IMPROVED: Show processing overlay
  if (actionLoading && processingMessage) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
          <h2 className="text-2xl font-bold text-white mb-2">
            {processingMessage}
          </h2>
          <p className="text-slate-400 mb-4">
            Bitte schließen Sie dieses Fenster nicht.
          </p>
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <p className="text-blue-300 text-sm">
              ⏰ Dies kann bis zu 30 Sekunden dauern
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Loading state
  if (loading || subLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <div className="text-white text-xl">Laden...</div>
        </div>
      </div>
    )
  }

  // PRO USER VIEW
  if (isPaid || (subscription?.status === 'active')) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Success Message */}
        {showSuccessMessage && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 animate-pulse">
            <div className="flex items-center gap-3">
              <span className="text-green-400 text-2xl">🎉</span>
              <div>
                <p className="text-green-300 font-semibold">Upgrade erfolgreich!</p>
                <p className="text-green-200 text-sm">Sie haben jetzt vollen Zugriff auf alle PRO-Funktionen für 30 Tage kostenlos.</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white">Meine Mitgliedschaft</h1>
          <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-lg">
            <span className="w-2 h-2 bg-green-400 rounded-full"></span>
            <span className="text-green-300 font-medium">PRO Aktiv</span>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Main Card */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
          
          {/* Plan Info */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">
                {plan?.display_name || 'PRO Plan'}
              </h2>
              <p className="text-slate-400">
                {plan?.name === 'pro_yearly' ? 'Jährliche Abrechnung' : 'Monatliche Abrechnung'}
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-white">
                {plan?.price_monthly > 0 ? `${plan.price_monthly}€` : '0€'}
              </div>
              <div className="text-slate-400 text-sm">
                {plan?.name === 'pro_yearly' ? 'pro Jahr' : 'pro Monat'} + MwSt.
              </div>
            </div>
          </div>

          {/* Status Info */}
          <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              <div>
                <div className="text-slate-400 text-sm mb-1">Status</div>
                <div className="text-white font-medium">
                  {subscription?.status === 'cancelled' ? (
                    <span className="text-orange-400">Gekündigt</span>
                  ) : isInGracePeriod ? (
                    <span className="text-blue-400">Testphase</span>
                  ) : (
                    <span className="text-green-400">Aktiv</span>
                  )}
                </div>
              </div>

              <div>
                <div className="text-slate-400 text-sm mb-1">
                  {subscription?.status === 'cancelled' ? 'Endet am' : isInGracePeriod ? 'Erste Zahlung' : 'Nächste Zahlung'}
                </div>
                <div className="text-white font-medium">
                  {periodEndDate ? periodEndDate.toLocaleDateString('de-DE') : 'Nicht verfügbar'}
                </div>
              </div>

              <div>
                <div className="text-slate-400 text-sm mb-1">Zahlungsmethode</div>
                <div className="text-white font-medium">
                  {subscription?.paddle_subscription_id ? (
                    <span>Kreditkarte •••• (Paddle)</span>
                  ) : (
                    <span className="text-slate-500">Noch nicht hinterlegt</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Grace Period Notice */}
          {isInGracePeriod && subscription?.status !== 'cancelled' && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <span className="text-blue-400 text-xl">🎯</span>
                <div>
                  <h4 className="text-blue-300 font-semibold mb-1">Kostenlose Testphase aktiv</h4>
                  <p className="text-blue-200 text-sm">
                    Sie nutzen aktuell alle PRO-Funktionen kostenlos. 
                    Die erste Zahlung erfolgt am {periodEndDate?.toLocaleDateString('de-DE')}. 
                    Sie können jederzeit vor diesem Datum kündigen, ohne dass Kosten entstehen.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Cancelled Notice */}
          {subscription?.status === 'cancelled' && (
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <span className="text-orange-400 text-xl">⚠️</span>
                <div>
                  <h4 className="text-orange-300 font-semibold mb-1">Abonnement gekündigt</h4>
                  <p className="text-orange-200 text-sm">
                    Sie haben weiterhin Zugriff auf alle PRO-Funktionen bis {periodEndDate?.toLocaleDateString('de-DE')}. 
                    Danach wechseln Sie automatisch zu Freemium.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {subscription?.status !== 'cancelled' && (
            <div className="space-y-3">
              
              <button
                disabled
                className="w-full bg-slate-700 text-slate-400 px-4 py-3 rounded-lg font-medium text-sm transition-colors cursor-not-allowed"
              >
                💳 Zahlungsmethode ändern (Bald verfügbar)
              </button>

              {plan?.name === 'pro' && (
                <button
                  disabled
                  className="w-full bg-slate-700 text-slate-400 px-4 py-3 rounded-lg font-medium text-sm transition-colors cursor-not-allowed"
                >
                  📅 Auf Jahresplan wechseln (Bald verfügbar)
                </button>
              )}

              <button
                onClick={() => setShowCancelModal(true)}
                disabled={actionLoading}
                className="w-full bg-red-600 text-white px-4 py-3 rounded-lg font-medium text-sm hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                🚫 Abonnement kündigen
              </button>
            </div>
          )}

          {/* Re-activate if cancelled */}
          {subscription?.status === 'cancelled' && (
            <button
              onClick={() => handleUpgrade('monthly')}
              disabled={actionLoading}
              className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {actionLoading ? 'Laden...' : '🔄 PRO reaktivieren'}
            </button>
          )}
        </div>

        {/* Features List */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-white mb-4">Ihre PRO-Funktionen</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { icon: '📱', name: 'QR Visitenkarte' },
              { icon: '📧', name: 'Kundenanfragen' },
              { icon: '👥', name: 'Kundenverwaltung' },
              { icon: '📄', name: 'Rechnungen & Angebote' },
              { icon: '🔧', name: 'Services Verwaltung' },
              { icon: '🗂️', name: 'PDF Archiv' }
            ].map((feature) => (
              <div key={feature.name} className="flex items-center gap-3 bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                <span className="text-2xl">{feature.icon}</span>
                <span className="text-green-300 font-medium">{feature.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Cancel Modal */}
        {showCancelModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-xl max-w-md w-full p-6">
              <h3 className="text-xl font-bold text-white mb-4">Abonnement wirklich kündigen?</h3>
              
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4 mb-6">
                <p className="text-orange-200 text-sm mb-3">
                  Nach der Kündigung:
                </p>
                <ul className="space-y-2 text-orange-200 text-sm">
                  <li className="flex items-start gap-2">
                    <span>✓</span>
                    <span>Sie behalten PRO bis {periodEndDate?.toLocaleDateString('de-DE')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span>✓</span>
                    <span>Keine weiteren Zahlungen</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span>⚠️</span>
                    <span>Danach automatisch Freemium (nur QR-Visitenkarte)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span>✓</span>
                    <span>Ihre Daten bleiben erhalten</span>
                  </li>
                </ul>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancelModal(false)}
                  disabled={actionLoading}
                  className="flex-1 bg-slate-600 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleCancelSubscription}
                  disabled={actionLoading}
                  className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {actionLoading ? 'Wird gekündigt...' : 'Ja, kündigen'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // TRIAL USER VIEW
  if (isInTrial && trialDaysRemaining > 0) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Success Message */}
        {showSuccessMessage && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 animate-pulse">
            <div className="flex items-center gap-3">
              <span className="text-green-400 text-2xl">🎉</span>
              <div>
                <p className="text-green-300 font-semibold">Upgrade erfolgreich!</p>
                <p className="text-green-200 text-sm">Sie haben jetzt vollen Zugriff auf alle PRO-Funktionen!</p>
              </div>
            </div>
          </div>
        )}
        
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white">Meine Mitgliedschaft</h1>
          <div className="flex items-center gap-2 px-4 py-2 bg-orange-500/10 border border-orange-500/30 rounded-lg">
            <span className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></span>
            <span className="text-orange-300 font-medium">Trial - {trialDaysRemaining} Tag{trialDaysRemaining !== 1 ? 'e' : ''} übrig</span>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/30 rounded-2xl p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-16 h-16 bg-orange-500/20 rounded-2xl flex items-center justify-center flex-shrink-0">
              <span className="text-3xl">⏰</span>
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white mb-2">
                Ihre kostenlose Testphase läuft
              </h2>
              <p className="text-orange-200">
                Sie haben noch <strong>{trialDaysRemaining} Tag{trialDaysRemaining !== 1 ? 'e' : ''}</strong> vollen 
                Zugriff auf alle PRO-Funktionen. Nach der Testphase wechseln Sie automatisch zu Freemium.
              </p>
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-slate-400 text-sm mb-1">Aktueller Plan</div>
                <div className="text-white font-medium">Trial</div>
              </div>
              <div>
                <div className="text-slate-400 text-sm mb-1">Trial endet am</div>
                <div className="text-white font-medium">
                  {subscription?.trial_ends_at ? new Date(subscription.trial_ends_at).toLocaleDateString('de-DE') : 'N/A'}
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => handleUpgrade('monthly')}
            disabled={actionLoading || !paddleReady}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {actionLoading ? 'Laden...' : !paddleReady ? 'Paddle lädt...' : '🚀 Jetzt auf PRO upgraden'}
          </button>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-white mb-4">Was Sie aktuell nutzen können</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { icon: '📱', name: 'QR Visitenkarte' },
              { icon: '📧', name: 'Kundenanfragen' },
              { icon: '👥', name: 'Kundenverwaltung' },
              { icon: '📄', name: 'Rechnungen & Angebote' },
              { icon: '🔧', name: 'Services Verwaltung' },
              { icon: '🗂️', name: 'PDF Archiv' }
            ].map((feature) => (
              <div key={feature.name} className="flex items-center gap-3 bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
                <span className="text-2xl">{feature.icon}</span>
                <span className="text-orange-300 font-medium">{feature.name}</span>
                <span className="ml-auto text-orange-400 text-xs">({trialDaysRemaining}d)</span>
              </div>
            ))}
          </div>
          <p className="text-slate-400 text-sm mt-4 text-center">
            Nach dem Trial behalten Sie nur die QR-Visitenkarte (Freemium)
          </p>
        </div>
      </div>
    )
  }

  // FREEMIUM USER VIEW - UPGRADE OPTIONS
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Auf PRO upgraden</h1>
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg">
          <span className="w-2 h-2 bg-slate-400 rounded-full"></span>
          <span className="text-slate-300 font-medium">Freemium</span>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {!paddleReady && (
        <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 border-3 border-orange-400 border-t-transparent rounded-full animate-spin"></div>
            <div>
              <p className="text-orange-300 font-medium">Paddle wird geladen...</p>
              <p className="text-orange-200 text-sm">Falls dies länger als 10 Sekunden dauert, laden Sie bitte die Seite neu.</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-2xl p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center flex-shrink-0">
            <span className="text-3xl">💎</span>
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white mb-2">
              Schalten Sie alle Funktionen frei
            </h2>
            <p className="text-blue-200 mb-4">
              Verwalten Sie Ihr Handwerksgeschäft professionell mit allen PRO-Features.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                'Kundenanfragen',
                'Rechnungserstellung',
                'Kundenverwaltung',
                'Services Verwaltung',
                'PDF Archiv',
                'Priority Support'
              ].map((feature) => (
                <div key={feature} className="flex items-center gap-2 text-sm text-blue-300">
                  <span className="text-green-400">✓</span>
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Monthly Plan */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 hover:border-blue-500/50 transition-colors">
          <div className="text-center mb-6">
            <div className="text-slate-400 text-sm mb-2">Monatlich</div>
            <div className="text-4xl font-bold text-white mb-1">19,90€</div>
            <div className="text-slate-400 text-sm">pro Monat + MwSt.</div>
          </div>
          
          <ul className="space-y-3 mb-6">
            <li className="flex items-center gap-2 text-sm text-slate-300">
              <span className="text-green-400">✓</span>
              <span>30 Tage kostenlos testen</span>
            </li>
            <li className="flex items-center gap-2 text-sm text-slate-300">
              <span className="text-green-400">✓</span>
              <span>Alle PRO-Funktionen</span>
            </li>
            <li className="flex items-center gap-2 text-sm text-slate-300">
              <span className="text-green-400">✓</span>
              <span>Jederzeit kündbar</span>
            </li>
          </ul>

          <button
            onClick={() => handleUpgrade('monthly')}
            disabled={actionLoading || !paddleReady}
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {actionLoading ? 'Laden...' : !paddleReady ? 'Paddle lädt...' : 'Monatlich starten'}
          </button>
        </div>

        {/* Yearly Plan */}
        <div className="bg-slate-800 border-2 border-green-500/30 rounded-2xl p-6 relative">
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
            <span className="bg-green-500 text-white px-4 py-1 rounded-full text-sm font-bold">
              Spare 17%
            </span>
          </div>

          <div className="text-center mb-6">
            <div className="text-slate-400 text-sm mb-2">Jährlich</div>
            <div className="text-4xl font-bold text-white mb-1">199,99€</div>
            <div className="text-slate-400 text-sm">pro Jahr + MwSt.</div>
            <div className="text-green-400 text-sm mt-1">nur 16,67€/Monat</div>
          </div>
          
          <ul className="space-y-3 mb-6">
            <li className="flex items-center gap-2 text-sm text-slate-300">
              <span className="text-green-400">✓</span>
              <span>30 Tage kostenlos testen</span>
            </li>
            <li className="flex items-center gap-2 text-sm text-slate-300">
              <span className="text-green-400">✓</span>
              <span>Alle PRO-Funktionen</span>
            </li>
            <li className="flex items-center gap-2 text-sm text-slate-300">
              <span className="text-green-400">✓</span>
              <span>Spare 40€ im Jahr</span>
            </li>
          </ul>

          <button
            onClick={() => handleUpgrade('yearly')}
            disabled={actionLoading || !paddleReady}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {actionLoading ? 'Laden...' : !paddleReady ? 'Paddle lädt...' : 'Jährlich starten'}
          </button>
        </div>
      </div>

      {/* Current Features */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
        <h3 className="text-xl font-bold text-white mb-4">Ihre aktuellen Funktionen (Freemium)</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/20 rounded-lg p-3">
            <span className="text-2xl">📱</span>
            <span className="text-green-300 font-medium">QR Visitenkarte</span>
            <span className="ml-auto text-green-400 text-sm">✓ Verfügbar</span>
          </div>
          
          {[
            { icon: '📧', name: 'Kundenanfragen' },
            { icon: '👥', name: 'Kundenverwaltung' },
            { icon: '📄', name: 'Rechnungen & Angebote' },
            { icon: '🔧', name: 'Services Verwaltung' },
            { icon: '🗂️', name: 'PDF Archiv' }
          ].map((feature) => (
            <div key={feature.name} className="flex items-center gap-3 bg-slate-700/50 border border-slate-600 rounded-lg p-3 opacity-60">
              <span className="text-2xl">{feature.icon}</span>
              <span className="text-slate-400 font-medium">{feature.name}</span>
              <span className="ml-auto text-slate-500 text-sm">🔒 PRO</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 text-center">
        <p className="text-green-300 text-sm">
          ✓ 30 Tage kostenlos • ✓ Jederzeit kündbar • ✓ Keine versteckten Kosten
        </p>
      </div>

      {/* Debug Panel (Development only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
          <details>
            <summary className="text-slate-400 cursor-pointer hover:text-white">
              🔧 Debug Info (Development only)
            </summary>
            <div className="mt-4 space-y-2 text-sm">
              <div className="text-slate-300">
                <strong>User ID:</strong> {majstor?.id}
              </div>
              <div className="text-slate-300">
                <strong>Current Plan:</strong> {plan?.name || 'loading...'}
              </div>
              <div className="text-slate-300">
                <strong>Subscription Status:</strong> {subscription?.status || 'none'}
              </div>
              <div className="text-slate-300">
                <strong>Is Active:</strong> {isActive ? '✅ Yes' : '❌ No'}
              </div>
              <div className="text-slate-300">
                <strong>Is Trial:</strong> {isInTrial ? '✅ Yes' : '❌ No'}
              </div>
              <div className="text-slate-300">
                <strong>Is Freemium:</strong> {isFreemium ? '✅ Yes' : '❌ No'}
              </div>
              <div className="text-slate-300">
                <strong>Trial Days Remaining:</strong> {trialDaysRemaining}
              </div>
              <div className="text-slate-300">
                <strong>Paddle Subscription ID:</strong> {subscription?.paddle_subscription_id || 'none'}
              </div>
            </div>
          </details>
        </div>
      )}
    </div>
  )
}