// app/dashboard/subscription/page.js - SUBSCRIPTION MANAGEMENT

'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useSubscription, clearSubscriptionCache } from '@/lib/hooks/useSubscription'
import Link from 'next/link'

export default function SubscriptionPage() {
  const [majstor, setMajstor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')
  const [showCancelModal, setShowCancelModal] = useState(false)
  const router = useRouter()

  // Get subscription data
  const { 
    subscription,
    plan, 
    features,
    isActive,
    isInTrial, 
    isFreemium, 
    isPaid,
    trialDaysRemaining,
    loading: subLoading,
    refresh: refreshSubscription
  } = useSubscription(majstor?.id)

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
        setError('Profil konnte nicht geladen werden')
        return
      }

      setMajstor(majstorData)
    } catch (err) {
      console.error('Error loading majstor:', err)
      setError('Fehler beim Laden der Daten')
    } finally {
      setLoading(false)
    }
  }

  // 🔥 Cancel subscription
  const handleCancelSubscription = async () => {
    setActionLoading(true)
    setError('')

    try {
      console.log('🚫 Cancelling subscription:', subscription.id)

      // Update subscription status to cancelled
      const { error: updateError } = await supabase
        .from('user_subscriptions')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', subscription.id)

      if (updateError) throw updateError

      // Update majstor record
      await supabase
        .from('majstors')
        .update({
          subscription_status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', majstor.id)

      console.log('✅ Subscription cancelled successfully')

      // Clear cache and refresh
      clearSubscriptionCache(majstor.id)
      await refreshSubscription()
      
      setShowCancelModal(false)
      
      // Show success message
      alert('Ihr Abonnement wurde gekündigt. Sie haben weiterhin Zugriff auf PRO-Features bis zum Ende des aktuellen Abrechnungszeitraums.')

    } catch (err) {
      console.error('Error cancelling subscription:', err)
      setError('Fehler beim Kündigen des Abonnements: ' + err.message)
    } finally {
      setActionLoading(false)
    }
  }

  // 🔥 Upgrade to PRO (redirect to choose-plan)
  const handleUpgrade = () => {
    router.push('/welcome/choose-plan')
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

  // 🟢 PRO USER VIEW
  if (isPaid || (subscription?.status === 'active')) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        
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
              
              {/* Status */}
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

              {/* Next Payment / Period End */}
              <div>
                <div className="text-slate-400 text-sm mb-1">
                  {subscription?.status === 'cancelled' ? 'Endet am' : isInGracePeriod ? 'Erste Zahlung' : 'Nächste Zahlung'}
                </div>
                <div className="text-white font-medium">
                  {periodEndDate ? periodEndDate.toLocaleDateString('de-DE') : 'Nicht verfügbar'}
                </div>
              </div>

              {/* Payment Method */}
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
              
              {/* Change Payment Method (disabled - Paddle integration coming) */}
              <button
                disabled
                className="w-full bg-slate-700 text-slate-400 px-4 py-3 rounded-lg font-medium text-sm transition-colors cursor-not-allowed"
              >
                💳 Zahlungsmethode ändern (Bald verfügbar)
              </button>

              {/* Switch to Yearly (if monthly) */}
              {plan?.name === 'pro' && (
                <button
                  disabled
                  className="w-full bg-slate-700 text-slate-400 px-4 py-3 rounded-lg font-medium text-sm transition-colors cursor-not-allowed"
                >
                  📅 Auf Jahresplan wechseln (Bald verfügbar)
                </button>
              )}

              {/* Cancel Subscription */}
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
              onClick={handleUpgrade}
              className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors"
            >
              🔄 PRO reaktivieren
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

        {/* Cancel Confirmation Modal */}
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

  // 🟡 TRIAL USER VIEW
  if (isInTrial && trialDaysRemaining > 0) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white">Meine Mitgliedschaft</h1>
          <div className="flex items-center gap-2 px-4 py-2 bg-orange-500/10 border border-orange-500/30 rounded-lg">
            <span className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></span>
            <span className="text-orange-300 font-medium">Trial - {trialDaysRemaining} Tag{trialDaysRemaining !== 1 ? 'e' : ''} übrig</span>
          </div>
        </div>

        {/* Trial Info Card */}
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
                <div className="text-white font-medium">PRO Trial</div>
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
            onClick={handleUpgrade}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4 rounded-lg font-semibold hover:opacity-90 transition-opacity"
          >
            🚀 Jetzt auf PRO upgraden
          </button>
        </div>

        {/* Features List */}
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

  // 📋 FREEMIUM USER VIEW
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Meine Mitgliedschaft</h1>
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg">
          <span className="w-2 h-2 bg-slate-400 rounded-full"></span>
          <span className="text-slate-300 font-medium">Freemium</span>
        </div>
      </div>

      {/* Upgrade CTA */}
      <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-2xl p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center flex-shrink-0">
            <span className="text-3xl">💎</span>
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white mb-2">
              Upgraden Sie auf PRO
            </h2>
            <p className="text-blue-200 mb-4">
              Schalten Sie alle Funktionen frei und verwalten Sie Ihr Handwerksgeschäft professionell.
            </p>
            <div className="flex flex-wrap gap-3 mb-4">
              <div className="flex items-center gap-2 text-sm text-blue-300">
                <span className="text-green-400">✓</span>
                <span>Kundenanfragen</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-blue-300">
                <span className="text-green-400">✓</span>
                <span>Rechnungserstellung</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-blue-300">
                <span className="text-green-400">✓</span>
                <span>Kundenverwaltung</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-blue-300">
                <span className="text-green-400">✓</span>
                <span>PDF Archiv</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Monthly Option */}
          <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
            <div className="text-center mb-3">
              <div className="text-2xl font-bold text-white mb-1">19,90€</div>
              <div className="text-slate-400 text-sm">pro Monat + MwSt.</div>
            </div>
            <ul className="space-y-2 text-sm text-slate-300 mb-4">
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                <span>30 Tage kostenlos</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                <span>Monatlich kündbar</span>
              </li>
            </ul>
          </div>

          {/* Yearly Option */}
          <div className="bg-slate-900/50 border border-green-500/20 rounded-lg p-4 relative">
            <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-bold">
              -17%
            </div>
            <div className="text-center mb-3">
              <div className="text-2xl font-bold text-white mb-1">199,99€</div>
              <div className="text-slate-400 text-sm">pro Jahr + MwSt.</div>
              <div className="text-green-400 text-xs mt-1">nur 16,67€/Monat</div>
            </div>
            <ul className="space-y-2 text-sm text-slate-300 mb-4">
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                <span>30 Tage kostenlos</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                <span>Spare 40€ im Jahr</span>
              </li>
            </ul>
          </div>
        </div>

        <button
          onClick={handleUpgrade}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4 rounded-lg font-semibold hover:opacity-90 transition-opacity"
        >
          🚀 Jetzt upgraden
        </button>
      </div>

      {/* Current Features */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
        <h3 className="text-xl font-bold text-white mb-4">Ihre aktuellen Funktionen</h3>
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
    </div>
  )
}