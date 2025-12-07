// app/dashboard/subscription/page.js - FASTSPRING VERSION
// 🔥 MIGRACIJA: Paddle → FastSpring

'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useSubscription } from '@/lib/hooks/useSubscription'
import { initializeFastSpring, openFastSpringCheckout, FASTSPRING_CONFIG } from '@/lib/fastspring'

export default function SubscriptionPage() {
  const router = useRouter()
  const [majstor, setMajstor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const [reactivating, setReactivating] = useState(false)
  const [fastspringReady, setFastspringReady] = useState(false)

  // Processing state - za progress indicator
  const [processingAction, setProcessingAction] = useState(null)
  const [processingStep, setProcessingStep] = useState(0)
  const [processingMessage, setProcessingMessage] = useState('')

  const { 
    subscription, 
    plan, 
    loading: subscriptionLoading,
    refresh,
    isInTrial
  } = useSubscription(majstor?.id)

  // Load majstor profile
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
          router.push('/login')
          return
        }

        const { data: majstorData, error: majstorError } = await supabase
          .from('majstors')
          .select('*')
          .eq('id', user.id)
          .single()

        if (majstorError) {
          console.error('Error loading majstor:', majstorError)
          return
        }

        setMajstor(majstorData)
      } catch (err) {
        console.error('Error:', err)
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [router])

  // 🔥 Initialize FastSpring
  useEffect(() => {
    console.log('🔥 Initializing FastSpring in subscription page...')
    initializeFastSpring(
      () => {
        console.log('✅ FastSpring ready!')
        setFastspringReady(true)
      },
      (err) => {
        console.error('❌ FastSpring init failed:', err)
        setError('FastSpring konnte nicht geladen werden.')
      }
    )
  }, [])

  // Realtime listener
  useEffect(() => {
    if (!majstor?.id) return

    console.log('🔔 Setting up Realtime listener for subscription page...')

    const channel = supabase
      .channel(`page-subscription-${majstor.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'user_subscriptions',
        filter: `majstor_id=eq.${majstor.id}`
      }, (payload) => {
        console.log('🔔 REALTIME: Subscription updated!', payload)
        
        const oldCancelFlag = payload.old?.cancel_at_period_end
        const newCancelFlag = payload.new?.cancel_at_period_end
        const newStatus = payload.new?.status

        console.log(`📊 Cancel flag: ${oldCancelFlag} → ${newCancelFlag}`)
        console.log(`📊 Status: ${payload.old?.status} → ${newStatus}`)
// 🛑 IGNORE: expired status updates when already expired (prevents infinite loop)
        if (newStatus === 'expired' && payload.old?.status !== 'active' && payload.old?.status !== 'trial' && payload.old?.status !== 'cancelled') {
          console.log('⏭️ Ignoring redundant expired status update (prevents loop)')
          return
        }

      
        

        if (newCancelFlag === true && processingAction === 'cancel') {
          console.log('✅ CANCEL CONFIRMED via Realtime!')
          setProcessingStep(100)
          setProcessingMessage('Kündigung bestätigt!')
          
          setTimeout(() => {
            setProcessingAction(null)
            setCancelling(false)
            setProcessingStep(0)
            refresh(true)
          }, 1500)
        }
        else if (newCancelFlag === false && processingAction === 'reactivate') {
          console.log('✅ REACTIVATE CONFIRMED via Realtime!')
          setProcessingStep(100)
          setProcessingMessage('Reaktivierung bestätigt!')
          
          setTimeout(() => {
            setProcessingAction(null)
            setReactivating(false)
            setProcessingStep(0)
            refresh(true)
          }, 1500)
        }
        else if (newStatus === 'cancelled') {
          console.log('✅ SUBSCRIPTION CANCELLED via Realtime!')
          setProcessingStep(100)
          setProcessingMessage('Auf Freemium zurückgesetzt!')
          
          setTimeout(() => {
            setProcessingAction(null)
            setCancelling(false)
            setProcessingStep(0)
            refresh(true)
          }, 1500)
        }
        else if (!processingAction) {
          console.log('🔄 Automatic refresh triggered by Realtime')
          refresh(true)
        }
      })
      .subscribe()

    return () => {
      console.log('🔌 Unsubscribing from Realtime')
      supabase.removeChannel(channel)
    }
  }, [majstor?.id, processingAction, refresh])

  // 🔥 FIXED: Direktno otvara FastSpring kao dugmad sa katancem!
  const handleUpgradeClick = async () => {
    if (!fastspringReady) {
      setError('FastSpring wird noch geladen...')
      return
    }

    if (!majstor) {
      setError('Benutzerdaten fehlen')
      return
    }

    console.log('🚀 Opening FastSpring Checkout directly!')

    const productId = FASTSPRING_CONFIG.productIds.monthly

    if (!productId) {
      setError('Product ID nicht konfiguriert')
      return
    }

    try {
      await openFastSpringCheckout({
        priceId: productId,
        email: majstor.email,
        majstorId: majstor.id,
        billingInterval: 'monthly',
        onSuccess: (data) => {
          console.log('✅ Payment successful!', data)
          setTimeout(() => {
            refresh(true)
            window.location.href = '/dashboard?fastspring_success=true&plan=monthly'
          }, 2000)
        },
        onError: (err) => {
          console.error('❌ Payment error:', err)
          setError('Zahlung fehlgeschlagen: ' + err.message)
        },
        onClose: () => {
          console.log('🚪 FastSpring popup closed')
        }
      })
    } catch (err) {
      console.error('❌ Upgrade error:', err)
      setError('Fehler beim Öffnen des Checkouts')
    }
  }

  const handleCancelSubscription = async () => {
    const confirmed = window.confirm(
      'Möchten Sie Ihr Abonnement wirklich kündigen?\n\n' +
      '✅ Sie behalten den Zugriff bis zum Ende des Abrechnungszeitraums.\n' +
      '📅 Danach wechseln Sie automatisch zu Freemium.\n\n' +
      'Sie können jederzeit wieder upgraden!'
    )

    if (!confirmed) return

    setCancelling(true)
    setError('')
    setProcessingAction('cancel')
    setProcessingStep(0)
    setProcessingMessage('Sende Kündigungsanfrage...')

    try {
      console.log('🚫 Starting cancellation process...')
      
      // 🔥 FASTSPRING: Koristi fastspring-cancel-subscription funkciju
      const response = await fetch('/.netlify/functions/fastspring-cancel-subscription', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          subscriptionId: subscription.provider_subscription_id,
          majstorId: majstor.id
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Fehler beim Kündigen')
      }

      console.log('✅ FastSpring API call successful!')
      console.log('⏳ Waiting for webhook confirmation via Realtime...')

      const steps = [
        { step: 20, delay: 500, message: 'Verbindung zu FastSpring...' },
        { step: 40, delay: 2000, message: 'Warte auf Bestätigung...' },
        { step: 60, delay: 4000, message: 'Webhook wird empfangen...' },
        { step: 80, delay: 6000, message: 'Datenbank wird aktualisiert...' },
        { step: 90, delay: 8000, message: 'Fast fertig...' }
      ]

      steps.forEach(({ step, delay, message }) => {
        setTimeout(() => {
          if (processingStep < 100) {
            setProcessingStep(step)
            setProcessingMessage(message)
          }
        }, delay)
      })

      setTimeout(() => {
        if (processingAction === 'cancel' && processingStep < 100) {
          console.warn('⏰ Timeout - webhook delayed')
          setProcessingMessage('Bestätigung dauert länger als erwartet...')
          
          setTimeout(() => {
            if (processingAction === 'cancel' && processingStep < 100) {
              console.warn('⏰ Final timeout after 30s')
              setProcessingAction(null)
              setCancelling(false)
              setProcessingStep(0)
              refresh(true)
              alert(
                'Die Kündigung wurde gesendet, aber die Bestätigung dauert.\n\n' +
                'Bitte prüfen Sie in 1-2 Minuten den Status.'
              )
            }
          }, 15000)
        }
      }, 15000)

    } catch (err) {
      console.error('💥 Cancel error:', err)
      const errorMessage = err.message || 'Fehler beim Kündigen des Abonnements.'
      
      setError(errorMessage)
      setCancelling(false)
      setProcessingAction(null)
      setProcessingStep(0)

      alert(
        'Fehler beim Kündigen:\n\n' +
        errorMessage +
        '\n\nBitte versuchen Sie es später erneut oder kontaktieren Sie den Support.'
      )
    }
  }

  const handleReactivateSubscription = async () => {
    const confirmed = window.confirm(
      'Möchten Sie Ihr Abonnement reaktivieren?\n\n' +
      '✅ Ihre Kündigung wird zurückgenommen\n' +
      '📅 Das Abonnement wird automatisch verlängert\n' +
      '💳 Die nächste Zahlung erfolgt wie geplant'
    )

    if (!confirmed) return

    setReactivating(true)
    setError('')
    setProcessingAction('reactivate')
    setProcessingStep(0)
    setProcessingMessage('Sende Reaktivierungsanfrage...')

    try {
      console.log('▶️ Starting reactivation process...')

      // 🔥 FASTSPRING: Koristi fastspring-reactivate-subscription funkciju
      const response = await fetch('/.netlify/functions/fastspring-reactivate-subscription', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          subscriptionId: subscription.provider_subscription_id,
          majstorId: majstor.id
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Fehler beim Reaktivieren')
      }

      console.log('✅ FastSpring API call successful!')
      console.log('⏳ Waiting for webhook confirmation via Realtime...')

      const steps = [
        { step: 20, delay: 500, message: 'Verbindung zu FastSpring...' },
        { step: 40, delay: 2000, message: 'Warte auf Bestätigung...' },
        { step: 60, delay: 4000, message: 'Webhook wird empfangen...' },
        { step: 80, delay: 6000, message: 'Datenbank wird aktualisiert...' },
        { step: 90, delay: 8000, message: 'Fast fertig...' }
      ]

      steps.forEach(({ step, delay, message }) => {
        setTimeout(() => {
          if (processingStep < 100) {
            setProcessingStep(step)
            setProcessingMessage(message)
          }
        }, delay)
      })

      setTimeout(() => {
        if (processingAction === 'reactivate' && processingStep < 100) {
          console.warn('⏰ Timeout - webhook delayed')
          setProcessingMessage('Bestätigung dauert länger als erwartet...')
          
          setTimeout(() => {
            if (processingAction === 'reactivate' && processingStep < 100) {
              console.warn('⏰ Final timeout after 30s')
              setProcessingAction(null)
              setReactivating(false)
              setProcessingStep(0)
              refresh(true)
              alert(
                'Die Reaktivierung wurde gesendet, aber die Bestätigung dauert.\n\n' +
                'Bitte prüfen Sie in 1-2 Minuten den Status.'
              )
            }
          }, 15000)
        }
      }, 15000)

    } catch (err) {
      console.error('💥 Reactivate error:', err)
      const errorMessage = err.message || 'Fehler beim Reaktivieren des Abonnements.'
      
      setError(errorMessage)
      setReactivating(false)
      setProcessingAction(null)
      setProcessingStep(0)

      alert(
        'Fehler beim Reaktivieren:\n\n' +
        errorMessage +
        '\n\nBitte versuchen Sie es später erneut oder kontaktieren Sie den Support.'
      )
    }
  }

  if (loading || subscriptionLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-slate-300">Lade Abonnement-Daten...</p>
        </div>
      </div>
    )
  }

  // Calculate days remaining
  const getDaysRemaining = () => {
    if (!subscription) return 0
    
    const now = new Date()
    const periodEnd = isInTrial 
      ? new Date(subscription.trial_ends_at)
      : new Date(subscription.current_period_end)
    
    const daysLeft = Math.ceil((periodEnd - now) / (1000 * 60 * 60 * 24))
    return daysLeft > 0 ? daysLeft : 0
  }

  const daysRemaining = getDaysRemaining()

  const getStatusInfo = () => {
    if (!subscription || plan?.name === 'freemium' || subscription.status === 'cancelled') {
      if (subscription?.status === 'cancelled') {
        const now = new Date()
        const periodEnd = new Date(subscription.current_period_end)
        
        if (periodEnd > now) {
          return {
            status: 'cancelled',
            statusLabel: 'Gekündigte Mitgliedschaft',
            statusColor: 'text-orange-400',
            bgColor: 'bg-orange-500/10',
            borderColor: 'border-orange-500/30',
            icon: '⏰',
            description: `Ihre Kündigung wurde bestätigt. Sie haben noch ${daysRemaining} Tag${daysRemaining !== 1 ? 'e' : ''} vollen PRO-Zugriff. Danach wechseln Sie automatisch zu Freemium.`,
            showUpgrade: false,
            showCancel: false,
            showReactivate: false
          }
        }
      }

      return {
        status: 'freemium',
        statusLabel: 'Freemium',
        statusColor: 'text-slate-400',
        bgColor: 'bg-slate-500/10',
        borderColor: 'border-slate-500/30',
        icon: '📋',
        description: 'Sie nutzen aktuell die kostenlose Version mit eingeschränkten Funktionen.',
        showUpgrade: true
      }
    }

    if (subscription.cancel_at_period_end === true && daysRemaining > 0) {
      return {
        status: 'cancelled_pending',
        statusLabel: 'Gekündigte Mitgliedschaft',
        statusColor: 'text-orange-400',
        bgColor: 'bg-orange-500/10',
        borderColor: 'border-orange-500/30',
        icon: '⏰',
        description: `Ihre Kündigung wurde bestätigt. Sie haben noch ${daysRemaining} Tag${daysRemaining !== 1 ? 'e' : ''} vollen PRO-Zugriff. Danach wechseln Sie automatisch zu Freemium.`,
        showUpgrade: false,
        showCancel: false,
        showReactivate: false
      }
    }

    if (subscription.status === 'trial' && daysRemaining > 0) {
      return {
        status: 'trial',
        statusLabel: 'PRO Trial',
        statusColor: 'text-green-400',
        bgColor: 'bg-green-500/10',
        borderColor: 'border-green-500/30',
        icon: '🎯',
        description: `Sie testen PRO kostenlos. Erste Zahlung in ${daysRemaining} Tag${daysRemaining !== 1 ? 'en' : ''}. Sie können jederzeit kündigen.`,
        showUpgrade: false,
        showCancel: true
      }
    }
    
    if (subscription.status === 'active' && daysRemaining > 0) {
      return {
        status: 'pro',
        statusLabel: 'PRO Mitgliedschaft',
        statusColor: 'text-green-400',
        bgColor: 'bg-green-500/10',
        borderColor: 'border-green-500/30',
        icon: '💎',
        description: `Sie haben vollen Zugriff auf alle PRO-Funktionen. Nächste Abrechnung in ${daysRemaining} Tag${daysRemaining !== 1 ? 'en' : ''}.`,
        showUpgrade: false,
        showCancel: true
      }
    }
    
    return {
      status: 'freemium',
      statusLabel: 'Freemium',
      statusColor: 'text-slate-400',
      bgColor: 'bg-slate-500/10',
      borderColor: 'border-slate-500/30',
      icon: '📋',
      description: 'Sie nutzen aktuell die kostenlose Version mit eingeschränkten Funktionen.',
      showUpgrade: true
    }
  }

  const statusInfo = getStatusInfo()

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Meine Mitgliedschaft</h1>
        <p className="text-slate-400">
          Verwalten Sie Ihr Abonnement und sehen Sie Ihren aktuellen Plan
        </p>
        
        {/* Processing Indicator */}
        {processingAction && (
          <div className="mt-4 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent"></div>
              <div className="flex-1">
                <p className="text-blue-300 font-medium text-sm">
                  {processingMessage}
                </p>
                <div className="mt-2 bg-blue-900/30 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-blue-500 h-full transition-all duration-500"
                    style={{ width: `${processingStep}%` }}
                  ></div>
                </div>
                <p className="text-blue-400 text-xs mt-1">
                  {Math.round(processingStep)}%
                </p>
              </div>
            </div>
          </div>
        )}

        {/* FastSpring Loading Indicator */}
        {!fastspringReady && (
          <div className="mt-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-yellow-500 border-t-transparent"></div>
              <p className="text-yellow-300 text-sm">
                FastSpring wird geladen...
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <p className="text-red-300">{error}</p>
        </div>
      )}

      {/* Current Status Card */}
      <div className={`${statusInfo.bgColor} border ${statusInfo.borderColor} rounded-2xl p-8`}>
        <div className="flex items-start gap-6">
          <div className="text-6xl">{statusInfo.icon}</div>
          <div className="flex-1">
            <h2 className={`text-2xl font-bold ${statusInfo.statusColor} mb-2`}>
              {statusInfo.statusLabel}
            </h2>
            <p className="text-slate-300 text-lg mb-4">
              {statusInfo.description}
            </p>
            
            {/* Action Buttons */}
            <div className="flex gap-4 flex-wrap">
              {statusInfo.showUpgrade && (
                <button
                  onClick={handleUpgradeClick}
                  disabled={processingAction || !fastspringReady}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-xl font-bold text-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {!fastspringReady ? 'FastSpring lädt...' : '🚀 Auf PRO upgraden'}
                </button>
              )}
              
              {statusInfo.showCancel && (
                <button
                  onClick={handleCancelSubscription}
                  disabled={cancelling || processingAction}
                  className="bg-slate-700 text-slate-300 px-6 py-3 rounded-xl font-medium hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cancelling ? 'Kündige...' : 'Abonnement kündigen'}
                </button>
              )}

              {statusInfo.showReactivate && (
                <button
                  onClick={handleReactivateSubscription}
                  disabled={reactivating || processingAction}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-3 rounded-xl font-bold text-lg hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg disabled:opacity-50"
                >
                  {reactivating ? 'Reaktiviere...' : '✨ Abonnement reaktivieren'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Features Comparison */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Freemium */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
          <div className="text-center mb-6">
            <h3 className="text-2xl font-bold text-white mb-2">Freemium</h3>
            <p className="text-4xl font-bold text-slate-400">Kostenlos</p>
          </div>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <span className="text-green-500 mt-1">✓</span>
              <span className="text-slate-300">QR Visitenkarte erstellen</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-green-500 mt-1">✓</span>
              <span className="text-slate-300">Kundenanfragen empfangen</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-500 mt-1">✗</span>
              <span className="text-slate-500">Kundenverwaltung</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-500 mt-1">✗</span>
              <span className="text-slate-500">Rechnungserstellung</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-500 mt-1">✗</span>
              <span className="text-slate-500">Services Management</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-red-500 mt-1">✗</span>
              <span className="text-slate-500">PDF Archiv</span>
            </li>
          </ul>
        </div>

        {/* PRO */}
        <div className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-2 border-blue-500/50 rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-blue-500 text-white px-4 py-1 rounded-bl-xl text-sm font-bold">
            EMPFOHLEN
          </div>
          <div className="text-center mb-6 mt-4">
            <h3 className="text-2xl font-bold text-white mb-2">PRO</h3>
            <p className="text-4xl font-bold text-blue-400">€19,90<span className="text-lg text-slate-400">/Monat</span></p>
            <p className="text-sm text-slate-400 mt-1">1 Tag kostenlos testen</p>
          </div>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <span className="text-green-500 mt-1">✓</span>
              <span className="text-white font-medium">Alle Freemium-Funktionen</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-green-500 mt-1">✓</span>
              <span className="text-white font-medium">Unbegrenzte Kunden</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-green-500 mt-1">✓</span>
              <span className="text-white font-medium">Professionelle Rechnungen</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-green-500 mt-1">✓</span>
              <span className="text-white font-medium">Services Management</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-green-500 mt-1">✓</span>
              <span className="text-white font-medium">Automatisches PDF Archiv</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-green-500 mt-1">✓</span>
              <span className="text-white font-medium">Priority Support</span>
            </li>
          </ul>
          {statusInfo.showUpgrade && (
            <button
              onClick={handleUpgradeClick}
              disabled={!fastspringReady}
              className="w-full mt-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-bold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {!fastspringReady ? 'FastSpring lädt...' : 'Jetzt upgraden'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}