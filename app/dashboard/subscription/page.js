// app/dashboard/subscription/page.js - COMPLETE WITH REACTIVATE

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
  
  const [refreshing, setRefreshing] = useState(false)
  const [refreshProgress, setRefreshProgress] = useState(0)
  
  const router = useRouter()
  
  const { 
    subscription, 
    plan, 
    isInTrial, 
    isFreemium, 
    isPaid, 
    trialDaysRemaining,
    isActive,
    refresh
  } = useSubscription(majstor?.id)
  
  const { isOpen: upgradeModalOpen, modalProps, showUpgradeModal, hideUpgradeModal } = useUpgradeModal()

  useEffect(() => {
    loadMajstor()
  }, [])

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
    const currentPlanLabel = isInTrial 
      ? 'Trial' 
      : plan?.display_name || 'Freemium'
    
    showUpgradeModal('subscription', 'PRO Mitgliedschaft', currentPlanLabel)
  }

  // 🔥 REACTIVATE SUBSCRIPTION
  const handleReactivateSubscription = async () => {
    if (!subscription?.paddle_subscription_id) {
      alert('Keine gekündigte Subscription gefunden')
      return
    }

    const confirmed = window.confirm(
      'Möchten Sie Ihre PRO-Mitgliedschaft reaktivieren?\n\n' +
      '✅ Ihr Abonnement wird sofort reaktiviert.\n' +
      '💳 Die nächste Zahlung erfolgt wie geplant.\n\n' +
      'Fortfahren?'
    )
    if (!confirmed) return

    setReactivating(true)
    setError('')

    try {
      console.log('🔄 Starting reactivation...')

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
        throw new Error(data.error || 'Fehler beim Reaktivieren')
      }

      console.log('✅ Reactivated successfully!')
      
      alert(
        'Abonnement erfolgreich reaktiviert!\n\n' +
        '✅ Ihre PRO-Mitgliedschaft ist wieder aktiv.\n' +
        '💳 Zahlungen werden wie geplant fortgesetzt.'
      )
      
      // Refresh subscription data
      if (refresh) {
        setTimeout(() => refresh(), 500)
        setTimeout(() => refresh(), 2000)
        setTimeout(() => refresh(), 5000)
      }

      // Reload page
      setTimeout(() => {
        window.location.reload()
      }, 5000)

    } catch (err) {
      console.error('💥 Reactivate error:', err)
      setError(err.message || 'Fehler beim Reaktivieren')
      alert(`❌ Fehler: ${err.message}`)
    } finally {
      setTimeout(() => setReactivating(false), 6000)
    }
  }

  // CANCEL SUBSCRIPTION
  const handleCancelSubscription = async () => {
    if (!subscription?.paddle_subscription_id) {
      alert('Keine aktive Subscription gefunden')
      return
    }

    const confirmed = window.confirm(
      'Möchten Sie Ihr Abonnement wirklich kündigen?\n\n' +
      '⏰ Die Kündigung wird zum Ende der Abrechnungsperiode wirksam (30-Tage Kündigungsfrist).\n\n' +
      'Sie haben bis dahin vollen Zugriff auf alle PRO-Funktionen.'
    )
    if (!confirmed) return

    setCancelling(true)
    setError('')

    try {
      console.log('🚫 Starting cancellation...')

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
        throw new Error(data.error || 'Fehler beim Kündigen')
      }

      console.log('✅ Cancelled successfully!')
      
      alert(
        'Abonnement erfolgreich gekündigt!\n\n' +
        '✅ Sie haben Zugriff bis zum Ende des Abrechnungszeitraums.\n' +
        '📅 Danach wechseln Sie automatisch zu Freemium.\n\n' +
        '⏳ Status wird aktualisiert...'
      )
      
      setRefreshing(true)
      setRefreshProgress(0)
      
      window.dispatchEvent(new CustomEvent('subscription-changed', {
        detail: { action: 'cancelled', timestamp: Date.now() }
      }))
      
      const refreshIntervals = [0, 1000, 3000, 6000, 10000, 15000]
      let refreshCount = 0
      
      refreshIntervals.forEach((delay, index) => {
        setTimeout(() => {
          refreshCount++
          const progress = (refreshCount / 6) * 100
          setRefreshProgress(progress)
          
          if (refresh) refresh()
          
          if (index === refreshIntervals.length - 1) {
            setTimeout(() => {
              console.log('✅ Auto-refresh complete!')
              setRefreshing(false)
              setRefreshProgress(100)
              
              setTimeout(() => {
                console.log('🚀 Executing redirect...')
                window.location.href = '/dashboard?cancelled=true'
              }, 1000)
            }, 1000)
          }
        }, delay)
      })

    } catch (err) {
      console.error('💥 Cancel error:', err)
      const errorMessage = err.message || 'Fehler beim Kündigen'
      setError(errorMessage)
      alert(`❌ Fehler: ${errorMessage}`)
    } finally {
      setTimeout(() => setCancelling(false), 18000)
    }
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
    if (!plan && isInTrial && trialDaysRemaining > 0) {
      return {
        status: 'trial',
        statusLabel: 'Kostenlose Testphase',
        statusColor: 'text-blue-400',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/30',
        icon: '🎯',
        description: `Sie haben noch ${trialDaysRemaining} Tag${trialDaysRemaining !== 1 ? 'e' : ''} vollen Zugriff auf alle PRO-Funktionen.`,
        showUpgrade: true
      }
    }
    
    if (isPaid && subscription?.status === 'active') {
      const now = new Date()
      const endDate = new Date(subscription.current_period_end)
      const diffTime = endDate.getTime() - now.getTime()
      const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      
      return {
        status: 'pro',
        statusLabel: 'PRO Mitgliedschaft',
        statusColor: 'text-green-400',
        bgColor: 'bg-green-500/10',
        borderColor: 'border-green-500/30',
        icon: '💎',
        description: `Sie haben vollen Zugriff auf alle PRO-Funktionen. Kündigungsfrist: ${daysRemaining} Tag${daysRemaining !== 1 ? 'e' : ''}.`,
        showUpgrade: false,
        showCancel: true
      }
    }
    
    if (subscription?.status === 'cancelled') {
      const now = new Date()
      const endDate = new Date(subscription.current_period_end)
      const diffTime = endDate.getTime() - now.getTime()
      const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      
      if (daysRemaining > 0) {
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
      
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Meine Mitgliedschaft</h1>
        <p className="text-slate-400">
          Verwalten Sie Ihr Abonnement und sehen Sie Ihren aktuellen Plan
        </p>
        
        {refreshing && (
          <div className="mt-4 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent"></div>
              <div className="flex-1">
                <p className="text-blue-300 font-medium text-sm">
                  Aktualisiere Subscription Status...
                </p>
                <div className="mt-2 bg-blue-900/30 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-blue-500 h-full transition-all duration-500"
                    style={{ width: `${refreshProgress}%` }}
                  ></div>
                </div>
                <p className="text-blue-400 text-xs mt-1">
                  {Math.round(refreshProgress)}% - Warte auf Paddle Webhook...
                  {refreshProgress >= 90 && ' → Weiterleitung zum Dashboard...'}
                </p>
                
                {refreshProgress >= 100 && (
                  <button
                    onClick={() => window.location.href = '/dashboard'}
                    className="mt-3 w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    🏠 Zurück zum Dashboard
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <p className="text-red-300">{error}</p>
        </div>
      )}

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
            
            <div className="flex gap-4 flex-wrap">
              {statusInfo.showUpgrade && (
                <button
                  onClick={handleUpgradeClick}
                  disabled={refreshing}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-xl font-bold text-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg disabled:opacity-50"
                >
                  🚀 Auf PRO upgraden
                </button>
              )}
              
              {statusInfo.showCancel && (
                <button
                  onClick={handleCancelSubscription}
                  disabled={cancelling || refreshing}
                  className="bg-slate-700 text-slate-300 px-6 py-3 rounded-xl font-medium hover:bg-slate-600 transition-colors disabled:opacity-50"
                >
                  {cancelling ? 'Wird gekündigt...' : 'Abonnement kündigen'}
                </button>
              )}
              
              {statusInfo.showReactivate && (
                <button
                  onClick={handleReactivateSubscription}
                  disabled={reactivating || refreshing}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-3 rounded-xl font-bold text-lg hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg disabled:opacity-50"
                >
                  {reactivating ? '⏳ Reaktiviere...' : '✅ Abonnement reaktivieren'}
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

      {/* Pricing (only for Freemium) */}
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
                  <span>Monatlich kündbar</span>
                </li>
                <li className="flex items-center gap-2 text-slate-300 text-sm">
                  <span className="text-green-400">✓</span>
                  <span>30 Tage Kündigungsfrist</span>
                </li>
              </ul>
              <button
                onClick={handleUpgradeClick}
                disabled={refreshing}
                className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
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
                  <span>Jährlich kündbar</span>
                </li>
                <li className="flex items-center gap-2 text-slate-300 text-sm">
                  <span className="text-green-400">✓</span>
                  <span>30 Tage Kündigungsfrist</span>
                </li>
                <li className="flex items-center gap-2 text-green-300 text-sm font-semibold">
                  <span className="text-green-400">★</span>
                  <span>38,81€ sparen pro Jahr!</span>
                </li>
              </ul>
              <button
                onClick={handleUpgradeClick}
                disabled={refreshing}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg disabled:opacity-50"
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
                  <strong>30 Tage Kündigungsfrist:</strong> Sie können Ihr Abonnement jederzeit kündigen. 
                  Die Kündigung wird zum Ende der Abrechnungsperiode wirksam.
                </p>
                <p>
                  <strong>Sichere Zahlung:</strong> Alle Zahlungen werden sicher über Paddle abgewickelt.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Subscription Details (for PRO users) */}
      {isPaid && subscription && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8">
          <h3 className="text-xl font-bold text-white mb-6">Abonnement Details</h3>
          
          <div className="space-y-4">
            <div className="flex justify-between py-3 border-b border-slate-700">
              <span className="text-slate-400">Status:</span>
              <span className={`font-semibold ${
                subscription.status === 'cancelled' ? 'text-orange-400' : 'text-green-400'
              }`}>
                {subscription.status === 'cancelled' ? 'Gekündigt (läuft noch)' : 'Aktiv'}
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
                  {subscription.status === 'cancelled' ? 'Endet am:' : 'Nächste Abrechnung:'}
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