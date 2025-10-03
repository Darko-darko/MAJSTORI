// app/dashboard/subscription/page.js - SUBSCRIPTION MANAGEMENT WITH UPGRADE

'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useSubscription } from '@/lib/hooks/useSubscription'
import { UpgradeModal, useUpgradeModal } from '@/app/components/subscription/UpgradeModal'
import { useRouter } from 'next/navigation'

export default function SubscriptionPage() {
  const [majstor, setMajstor] = useState(null)
  const [loading, setLoading] = useState(true)
  
  const router = useRouter()
  
  // Subscription hook
  const { 
    subscription, 
    plan, 
    isInTrial, 
    isFreemium, 
    isPaid, 
    trialDaysRemaining,
    isActive 
  } = useSubscription(majstor?.id)
  
  // Upgrade modal hook
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
    console.log('🔥 Upgrade button clicked!')
    const currentPlanLabel = isInTrial 
      ? 'Trial' 
      : plan?.display_name || 'Freemium'
    
    showUpgradeModal('subscription', 'PRO Mitgliedschaft', currentPlanLabel)
  }

  const handleCancelSubscription = async () => {
    if (!confirm('Möchten Sie Ihr Abonnement wirklich kündigen?')) return

    try {
      const response = await fetch('/api/paddle/webhook/cancel-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionId: subscription.paddle_subscription_id,
          majstorId: majstor.id
        })
      })

      if (response.ok) {
        alert('Abonnement erfolgreich gekündigt. Sie haben bis zum Ende der Abrechnungsperiode Zugriff.')
        window.location.reload()
      } else {
        alert('Fehler beim Kündigen des Abonnements.')
      }
    } catch (err) {
      console.error('Cancel error:', err)
      alert('Fehler beim Kündigen des Abonnements.')
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

  // Get current status info
  const getStatusInfo = () => {
    if (!plan && isInTrial && trialDaysRemaining > 0) {
      // 7-day trial
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
      // PRO with grace period
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
    
    // Freemium
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
      </div>

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
            <div className="flex gap-4">
              {statusInfo.showUpgrade && (
                <button
                  onClick={handleUpgradeClick}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-xl font-bold text-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg"
                >
                  🚀 Auf PRO upgraden
                </button>
              )}
              
              {statusInfo.showCancel && (
                <button
                  onClick={handleCancelSubscription}
                  className="bg-slate-700 text-slate-300 px-6 py-3 rounded-xl font-medium hover:bg-slate-600 transition-colors"
                >
                  Abonnement kündigen
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
            {/* Monthly Plan */}
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
                className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Monatlich wählen
              </button>
            </div>

            {/* Yearly Plan */}
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
              <span className="text-green-400 font-semibold">Aktiv</span>
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
                <span className="text-slate-400">Nächste Abrechnung:</span>
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

      {/* Upgrade Modal */}
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