// app/dashboard/subscription/page.js - REALTIME VERSION

'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useSubscription } from '@/lib/hooks/useSubscription'
import { UpgradeModal, useUpgradeModal } from '@/app/components/subscription/UpgradeModal'
import { useRouter } from 'next/navigation'

export default function SubscriptionPage() {
  const [majstor, setMajstor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [reactivating, setReactivating] = useState(false)
  const [error, setError] = useState('')
  
  // 🔥 REALTIME PROGRESS STATE
  const [processingAction, setProcessingAction] = useState(null) // 'cancel' | 'reactivate' | null
  const [processingMessage, setProcessingMessage] = useState('')
  const [processingStep, setProcessingStep] = useState(0)
  
  const router = useRouter()
  
  const { 
    subscription, 
    plan, 
    isInTrial, 
    isFreemium, 
    isPaid, 
    trialDaysRemaining,
    isCancelled,
    isActive,
    refresh
  } = useSubscription(majstor?.id)
  
  const { isOpen: upgradeModalOpen, modalProps, showUpgradeModal, hideUpgradeModal } = useUpgradeModal()

  useEffect(() => {
    loadMajstor()
  }, [])

  // 🔥 REALTIME LISTENER za subscription promene - UVEK AKTIVAN!
  useEffect(() => {
    if (!majstor?.id) return

    console.log(`🔔 Setting up permanent Realtime listener...`)

    const channel = supabase
      .channel(`subscription-page-${majstor.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_subscriptions',
          filter: `majstor_id=eq.${majstor.id}`
        },
        (payload) => {
          console.log('🔔 REALTIME: Subscription updated on page!', payload)
          
          const newStatus = payload.new?.status
          const cancelAtPeriodEnd = payload.new?.cancel_at_period_end
          const scheduledChange = payload.new?.paddle_scheduled_change

          console.log('Status:', newStatus)
          console.log('Cancel at period end:', cancelAtPeriodEnd)
          console.log('Scheduled change:', scheduledChange)

          // 🔥 CANCEL CONFIRMATION
          if (processingAction === 'cancel' && cancelAtPeriodEnd === true) {
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
          // 🔥 REACTIVATE CONFIRMATION
          else if (processingAction === 'reactivate' && cancelAtPeriodEnd === false) {
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
          // 🔥 AUTOMATIC REFRESH kada nema processingAction (webhook stigao kasnije)
          else if (!processingAction) {
            console.log('🔄 Automatic refresh triggered by Realtime (no processing action)')
            refresh(true)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'user_subscriptions',
          filter: `majstor_id=eq.${majstor.id}`
        },
        (payload) => {
          console.log('🔔 REALTIME: Subscription DELETED!', payload)
          console.log('🚫 Trial cancelled - subscription removed')
          
          // 🔥 TRIAL CANCEL CONFIRMATION
          if (processingAction === 'cancel') {
            console.log('✅ TRIAL CANCEL CONFIRMED - Subscription deleted!')
            setProcessingStep(100)
            setProcessingMessage('Trial beendet! Auf Freemium zurückgesetzt...')
            
            setTimeout(() => {
              setProcessingAction(null)
              setCancelling(false)
              setProcessingStep(0)
              
              // 🔥 Force page reload za clean state
              console.log('🔄 Reloading page after trial cancellation...')
              window.location.reload()
            }, 1500)
          } else {
            // Automatic refresh ako nema processingAction
            console.log('🔄 Automatic refresh after DELETE')
            refresh(true)
            
            // 🔥 Force reload nakon 1s
            setTimeout(() => {
              window.location.reload()
            }, 1000)
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Realtime status:', status)
      })

    // Cleanup
    return () => {
      console.log('🔌 Unsubscribing from Realtime')
      supabase.removeChannel(channel)
    }
  }, [majstor?.id, processingAction, refresh])

  const loadMajstor = async () => {
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

  const handleUpgradeClick = () => {
    console.log('🔥 Upgrade button clicked!')
    const currentPlanLabel = isInTrial 
      ? 'Trial' 
      : plan?.display_name || 'Freemium'
    
    showUpgradeModal('subscription', 'PRO Mitgliedschaft', currentPlanLabel)
  }

  // 🔥 CANCEL SUBSCRIPTION - REALTIME VERSION
  const handleCancelSubscription = async () => {
    if (!subscription?.paddle_subscription_id) {
      alert('Keine aktive Subscription gefunden')
      return
    }

    const confirmed = window.confirm(
      'Möchten Sie Ihr Abonnement wirklich kündigen?\n\n' +
      '⏰ Die Kündigung wird zum Ende der Abrechnungsperiode wirksam.\n\n' +
      'Sie haben bis dahin vollen Zugriff auf alle PRO-Funktionen.'
    )
    if (!confirmed) return

    setCancelling(true)
    setError('')
    setProcessingAction('cancel')
    setProcessingStep(0)
    setProcessingMessage('Sende Kündigungsanfrage...')

    try {
      console.log('🚫 Starting cancellation process...')
      
      const response = await fetch('/.netlify/functions/paddle-cancel-subscription', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          subscriptionId: subscription.paddle_subscription_id,
          majstorId: majstor.id
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Fehler beim Kündigen')
      }

      console.log('✅ Paddle API call successful!')
      console.log('⏳ Waiting for webhook confirmation...')

      // 🔥 PROGRESS STEPS während čekanja webhook-a
      const steps = [
        { step: 20, delay: 500, message: 'Verbindung zu Paddle...' },
        { step: 40, delay: 2000, message: 'Warte auf Bestätigung...' },
        { step: 60, delay: 4000, message: 'Webhook wird empfangen...' },
        { step: 80, delay: 6000, message: 'Datenbank wird aktualisiert...' },
        { step: 90, delay: 8000, message: 'Fast fertig...' }
      ]

      steps.forEach(({ step, delay, message }) => {
        setTimeout(() => {
          if (processingStep < 100) { // Ne overwrite-uj ako je već 100%
            setProcessingStep(step)
            setProcessingMessage(message)
          }
        }, delay)
      })

      // 🔥 TIMEOUT ako webhook ne stigne za 15s
      setTimeout(() => {
        if (processingAction === 'cancel' && processingStep < 100) {
          console.warn('⏰ Timeout - webhook delayed')
          setProcessingMessage('Bestätigung dauert länger als erwartet...')
          
          // Nastavi čekati još 15s
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
      setProcessingAction(null)
      setCancelling(false)
      setProcessingStep(0)
      alert(`❌ Fehler: ${errorMessage}\n\nBitte versuchen Sie es später erneut.`)
    }
  }

  // 🔥 REACTIVATE SUBSCRIPTION - REALTIME VERSION
  const handleReactivateSubscription = async () => {
    if (!subscription?.paddle_subscription_id) {
      alert('Keine Subscription gefunden')
      return
    }

    const confirmed = window.confirm(
      'Möchten Sie Ihr Abonnement reaktivieren?\n\n' +
      '✅ Ihr PRO-Zugriff wird fortgesetzt.\n' +
      '💳 Die Abrechnung erfolgt normal am Ende des Zeitraums.'
    )
    if (!confirmed) return

    setReactivating(true)
    setError('')
    setProcessingAction('reactivate')
    setProcessingStep(0)
    setProcessingMessage('Sende Reaktivierungsanfrage...')

    try {
      console.log('🔄 Starting reactivation process...')
      
      const response = await fetch('/.netlify/functions/paddle-reactivate-subscription', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          subscriptionId: subscription.paddle_subscription_id,
          majstorId: majstor.id
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Fehler bei der Reaktivierung')
      }

      console.log('✅ Paddle API call successful!')
      console.log('⏳ Waiting for webhook confirmation...')

      // 🔥 PROGRESS STEPS
      const steps = [
        { step: 20, delay: 500, message: 'Verbindung zu Paddle...' },
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

      // 🔥 TIMEOUT
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
      const errorMessage = err.message || 'Fehler bei der Reaktivierung.'
      setError(errorMessage)
      setProcessingAction(null)
      setReactivating(false)
      setProcessingStep(0)
      alert(`❌ Fehler: ${errorMessage}`)
    }
  }

  // 🔥 MANUAL REFRESH
  const handleManualRefresh = () => {
    console.log('🔄 Manual refresh triggered by user')
    refresh(true)
    setTimeout(() => {
      window.location.reload()
    }, 1000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <div className="text-white text-xl">Laden...</div>
        </div>
      </div>
    )
  }

  const getStatusInfo = () => {
    if (!subscription) {
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

    const now = new Date()
    const periodEnd = new Date(subscription.current_period_end)
    const daysRemaining = Math.ceil((periodEnd - now) / (1000 * 60 * 60 * 24))
    
    if (subscription.status === 'trial' && daysRemaining > 0) {
      return {
        status: 'trial',
        statusLabel: 'PRO Trial',
        statusColor: 'text-blue-400',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/30',
        icon: '🎯',
        description: `Sie haben vollen Zugriff auf alle PRO-Funktionen. Erste Zahlung in ${daysRemaining} Tag${daysRemaining !== 1 ? 'en' : ''}. Sie können jederzeit kündigen.`,
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
    
    if (subscription.cancel_at_period_end && daysRemaining > 0) {
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
        showReactivate: true
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
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold text-white">Meine Mitgliedschaft</h1>
        </div>
        <p className="text-slate-400">
          Verwalten Sie Ihr Abonnement und sehen Sie Ihren aktuellen Plan
        </p>
        
        {/* 🔥 REALTIME PROGRESS INDICATOR */}
        {processingAction && (
          <div className="mt-4 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 animate-pulse">
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
                  {processingStep}% - Warte auf Paddle Webhook...
                </p>
              </div>
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

      {/* 🔥 DEBUG INFO */}
      {subscription && (
        <div className="bg-slate-800/50 border border-slate-600 rounded-lg p-4 text-xs text-slate-400">
          <div className="font-mono">
            <div>DB Status: <span className="text-white">{subscription.status}</span></div>
            <div>Period End: <span className="text-white">{new Date(subscription.current_period_end).toLocaleString('de-DE')}</span></div>
            <div>Cancel at Period End: <span className={subscription.cancel_at_period_end ? 'text-orange-400' : 'text-green-400'}>{subscription.cancel_at_period_end ? 'YES' : 'NO'}</span></div>
            {subscription.cancelled_at && (
              <div>Cancelled At: <span className="text-orange-400">{new Date(subscription.cancelled_at).toLocaleString('de-DE')}</span></div>
            )}
            {subscription.paddle_scheduled_change && (
              <div>Scheduled Change: <span className="text-yellow-400">{JSON.stringify(subscription.paddle_scheduled_change)}</span></div>
            )}
          </div>
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
                  disabled={!!processingAction}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-xl font-bold text-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg disabled:opacity-50"
                >
                  🚀 Auf PRO upgraden
                </button>
              )}
              
              {statusInfo.showCancel && (
                <button
                  onClick={handleCancelSubscription}
                  disabled={cancelling || !!processingAction}
                  className="bg-slate-700 text-slate-300 px-6 py-3 rounded-xl font-medium hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cancelling ? 'Wird gekündigt...' : 'Abonnement kündigen'}
                </button>
              )}

              {statusInfo.showReactivate && (
                <button
                  onClick={handleReactivateSubscription}
                  disabled={reactivating || !!processingAction}
                  className="bg-green-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                  {reactivating ? 'Wird reaktiviert...' : '✅ Subscription reaktivieren'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* PRO Features Overview */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8">
        <h3 className="text-2xl font-bold text-white mb-6 text-center">
          ✨ PRO Funktionen
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            {
              icon: '👥',
              title: 'Unbegrenzte Kundenverwaltung',
              description: 'Verwalten Sie alle Ihre Kunden an einem Ort'
            },
            {
              icon: '📩',
              title: 'Kundenanfragen Management',
              description: 'Bearbeiten Sie Anfragen direkt im Dashboard'
            },
            {
              icon: '📄',
              title: 'Rechnungen & Angebote',
              description: 'Professionelle PDF-Rechnungen erstellen'
            },
            {
              icon: '🔧',
              title: 'Services Verwaltung',
              description: 'Verwalten Sie Ihre Dienstleistungen'
            },
            {
              icon: '🗂️',
              title: 'PDF Archiv',
              description: 'Zugriff auf alle Ihre PDFs'
            },
            {
              icon: '⚙️',
              title: 'Erweiterte Einstellungen',
              description: 'Vollständige Anpassungsmöglichkeiten'
            },
            {
              icon: '📊',
              title: 'Analytics & Berichte',
              description: 'Detaillierte Geschäftseinblicke'
            },
            {
              icon: '🚀',
              title: 'Prioritäts-Support',
              description: 'Schnelle Hilfe bei Fragen'
            }
          ].map((feature, i) => (
            <div 
              key={i}
              className={`bg-slate-900/50 rounded-xl p-6 ${
                statusInfo.status !== 'freemium' ? 'border-2 border-green-500/20' : 'border border-slate-700'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="text-4xl">{feature.icon}</div>
                <div>
                  <h4 className="text-white font-semibold mb-1">{feature.title}</h4>
                  <p className="text-slate-400 text-sm">{feature.description}</p>
                  {statusInfo.status !== 'freemium' && (
                    <div className="mt-2">
                      <span className="text-green-400 text-xs font-semibold">✓ Aktiv</span>
                    </div>
                  )}
                  {statusInfo.status === 'freemium' && (
                    <div className="mt-2">
                      <span className="text-slate-500 text-xs">🔒 PRO erforderlich</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing Comparison (only for non-PRO users) */}
      {statusInfo.showUpgrade && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8">
          <h3 className="text-2xl font-bold text-white mb-6 text-center">
            💰 Preise
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900 border-2 border-blue-500/30 rounded-xl p-6">
              <div className="text-center mb-6">
                <div className="text-4xl mb-2">📅</div>
                <h4 className="text-xl font-bold text-white mb-2">Monatlich</h4>
                <div className="text-4xl font-bold text-white mb-1">
                  19,90€
                  <span className="text-lg text-slate-400 font-normal ml-2">+ MwSt.</span>
                </div>
                <div className="text-slate-400 text-sm">pro Monat</div>
              </div>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-2 text-slate-300 text-sm">
                  <span className="text-green-400">✓</span>
                  <span>Alle PRO-Funktionen</span>
                </li>
                <li className="flex items-center gap-2 text-slate-300 text-sm">
                  <span className="text-green-400">✓</span>
                  <span>1 Tag kostenlos testen</span>
                </li>
                <li className="flex items-center gap-2 text-slate-300 text-sm">
                  <span className="text-green-400">✓</span>
                  <span>Jederzeit kündbar</span>
                </li>
              </ul>
              <button
                onClick={handleUpgradeClick}
                className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Monatlich wählen
              </button>
            </div>

            <div className="bg-gradient-to-br from-blue-900/50 to-purple-900/50 border-2 border-purple-500/50 rounded-xl p-6 relative">
              <div className="absolute -top-3 -right-3 bg-green-500 text-white text-sm font-bold px-3 py-1 rounded-full">
                16% SPAREN
              </div>
              <div className="text-center mb-6">
                <div className="text-4xl mb-2">🎯</div>
                <h4 className="text-xl font-bold text-white mb-2">Jährlich</h4>
                <div className="text-4xl font-bold text-white mb-1">
                  199,99€
                  <span className="text-lg text-slate-400 font-normal ml-2">+ MwSt.</span>
                </div>
                <div className="text-slate-400 text-sm mb-1">pro Jahr</div>
                <div className="text-green-400 text-sm font-semibold">
                  ≈ 16,66€/Monat
                </div>
              </div>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-2 text-slate-300 text-sm">
                  <span className="text-green-400">✓</span>
                  <span>Alle PRO-Funktionen</span>
                </li>
                <li className="flex items-center gap-2 text-slate-300 text-sm">
                  <span className="text-green-400">✓</span>
                  <span>1 Tag kostenlos testen</span>
                </li>
                <li className="flex items-center gap-2 text-slate-300 text-sm">
                  <span className="text-green-400">✓</span>
                  <span>Jährlich kündbar</span>
                </li>
                <li className="flex items-center gap-2 text-green-300 text-sm font-semibold">
                  <span className="text-green-400">☆</span>
                  <span>38,81€ sparen pro Jahr!</span>
                </li>
              </ul>
              <button
                onClick={handleUpgradeClick}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg"
              >
                Jährlich wählen (BESTE WAHL!)
              </button>
            </div>
          </div>

          <div className="mt-6 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">ℹ️</span>
              <div className="text-sm text-blue-200">
                <p className="mb-2">
                  <strong>Kostenloser Test:</strong> 1 Tag vollen PRO-Zugriff ohne Risiko. Erste Zahlung erfolgt nach dem Testzeitraum.
                </p>
                <p className="mb-2">
                  <strong>Jederzeit kündbar:</strong> Sie können Ihr Abonnement jederzeit kündigen. 
                  Sie behalten Zugriff bis zum Ende der Abrechnungsperiode.
                </p>
                <p>
                  <strong>Sichere Zahlung:</strong> Alle Zahlungen werden sicher über Paddle abgewickelt.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Subscription Details */}
      {subscription && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8">
          <h3 className="text-xl font-bold text-white mb-6">Abonnement Details</h3>
          
          <div className="space-y-4">
            <div className="flex justify-between py-3 border-b border-slate-700">
              <span className="text-slate-400">Status:</span>
              <span className={`font-semibold ${
                subscription.status === 'trial' ? 'text-blue-400' :
                subscription.cancel_at_period_end ? 'text-orange-400' : 
                'text-green-400'
              }`}>
                {subscription.status === 'trial' ? 'Trial (kostenlos)' :
                 subscription.cancel_at_period_end ? 'Gekündigt (läuft noch)' : 
                 'Aktiv'}
              </span>
            </div>
            
            <div className="flex justify-between py-3 border-b border-slate-700">
              <span className="text-slate-400">Plan:</span>
              <span className="text-white font-semibold">{plan?.display_name}</span>
            </div>
            
            <div className="flex justify-between py-3 border-b border-slate-700">
              <span className="text-slate-400">Preis:</span>
              <span className="text-white font-semibold">
                {plan?.price_monthly?.toFixed(2)}€ + MwSt. / Monat
              </span>
            </div>
            
            {subscription.current_period_end && (
              <div className="flex justify-between py-3 border-b border-slate-700">
                <span className="text-slate-400">
                  {subscription.status === 'trial' ? 'Trial endet am:' :
                   subscription.cancel_at_period_end ? 'Endet am:' : 
                   'Nächste Abrechnung:'}
                </span>
                <span className="text-white font-semibold">
                  {new Date(subscription.current_period_end).toLocaleDateString('de-DE')}
                </span>
              </div>
            )}
            
            {subscription.paddle_subscription_id && (
              <div className="flex justify-between py-3">
                <span className="text-slate-400">Abonnement-ID:</span>
                <span className="text-slate-500 text-sm font-mono">
                  {subscription.paddle_subscription_id}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      <UpgradeModal
        isOpen={upgradeModalOpen}
        onClose={hideUpgradeModal}
        feature={modalProps.feature}
        featureName={modalProps.featureName}
        currentPlan={modalProps.currentPlan}
      />
    </div>
  )
}