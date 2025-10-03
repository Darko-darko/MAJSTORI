// app/dashboard/subscription/page.js
'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useSubscription } from '@/lib/hooks/useSubscription'
import Link from 'next/link'

export default function SubscriptionPage() {
  const [majstor, setMajstor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState('')

  const { subscription, plan, isFreemium, isPaid, refresh } = useSubscription(majstor?.id)

  useEffect(() => {
    loadMajstor()
  }, [])

  const loadMajstor = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: majstorData } = await supabase
        .from('majstors')
        .select('*')
        .eq('id', user.id)
        .single()

      setMajstor(majstorData)
    } catch (err) {
      console.error('Error loading majstor:', err)
    } finally {
      setLoading(false)
    }
  }

const handleCancelSubscription = async () => {
  // Provera da li postoji subscription
  if (!subscription?.paddle_subscription_id) {
    alert('Keine aktive Subscription gefunden')
    return
  }

  // Konfirmacija sa detaljima o grace period-u
  const confirmed = window.confirm(
    'Möchten Sie Ihr Abonnement wirklich kündigen?\n\n' +
    '⏰ Die Kündigung wird zum Ende der Abrechnungsperiode wirksam (30-Tage Kündigungsfrist).\n\n' +
    'Sie haben bis dahin vollen Zugriff auf alle PRO-Funktionen.'
  )
  if (!confirmed) return

  setCancelling(true)
  setError('')

  try {
    console.log('🚫 Starting cancellation process...')
    console.log('📋 Subscription ID:', subscription.paddle_subscription_id)
    console.log('👤 Majstor ID:', majstor.id)

    // 🔥 PROMENA: Pozivamo Netlify Function umesto /api/paddle/cancel-subscription
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

    console.log('📡 Response status:', response.status)

    const data = await response.json()
    console.log('📄 Response data:', data)

    if (!response.ok) {
      throw new Error(data.error || data.message || 'Fehler beim Kündigen')
    }

    // Success!
    console.log('✅ Subscription cancelled successfully!')
    
    alert(
      'Abonnement erfolgreich gekündigt!\n\n' +
      '✅ Sie haben Zugriff bis zum Ende des Abrechnungszeitraums.\n' +
      '📅 Danach wechseln Sie automatisch zu Freemium.'
    )
    
    // Refresh subscription data
    console.log('🔄 Refreshing subscription data...')
    setTimeout(() => {
      if (refresh) {
        refresh()
      } else {
        window.location.reload()
      }
    }, 1000)

  } catch (err) {
    console.error('💥 Cancel error:', err)
    const errorMessage = err.message || 'Fehler beim Kündigen des Abonnements.'
    setError(errorMessage)
    alert(`❌ Fehler: ${errorMessage}\n\nBitte versuchen Sie es später erneut oder kontaktieren Sie den Support.`)
  } finally {
    setCancelling(false)
  }
}

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white">Laden...</div>
      </div>
    )
  }

  const getGracePeriodDays = () => {
    if (!subscription?.current_period_end) return 0
    const now = new Date()
    const endDate = new Date(subscription.current_period_end)
    const diffTime = endDate.getTime() - now.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  const graceDays = getGracePeriodDays()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Meine Mitgliedschaft</h1>
        <p className="text-slate-400">Verwalten Sie Ihr Abonnement und sehen Sie Ihren aktuellen Plan</p>
      </div>

      {/* Current Plan */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-2xl p-8">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center text-3xl">
              {isPaid ? '💎' : '📋'}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">
                {plan?.display_name || 'Freemium'} Plan
              </h2>
              <p className="text-slate-400">
                {isFreemium && 'Kostenlose Basisversion'}
                {isPaid && subscription?.status === 'active' && `Sie haben vollen Zugriff auf alle PRO-Funktionen. Kündigungsfrist: ${graceDays} Tage.`}
                {isPaid && subscription?.status === 'cancelled' && 'Gekündigt - Zugriff bis zum Ende des Abrechnungszeitraums'}
              </p>
            </div>
          </div>
          
          {plan?.price_monthly > 0 && (
            <div className="text-right">
              <div className="text-3xl font-bold text-white">
                {plan.price_monthly}€
              </div>
              <div className="text-sm text-slate-400">pro Monat + MwSt.</div>
            </div>
          )}
        </div>

        {isPaid && subscription?.current_period_end && (
          <div className="mt-6 pt-6 border-t border-slate-700">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-400">Status:</span>
                <span className="ml-2 text-white font-medium">
                  {subscription.status === 'active' ? 'Aktiv' : 'Gekündigt'}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Nächste Abrechnung:</span>
                <span className="ml-2 text-white font-medium">
                  {new Date(subscription.current_period_end).toLocaleDateString('de-DE')}
                </span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="mt-6 flex gap-4">
          {isFreemium && (
            <Link
              href="/welcome/choose-plan"
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Auf PRO upgraden
            </Link>
          )}

          {isPaid && subscription?.status === 'active' && (
            <button
              onClick={handleCancelSubscription}
              disabled={cancelling}
              className="bg-slate-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cancelling ? 'Kündigung läuft...' : 'Abonnement kündigen'}
            </button>
          )}

          {isPaid && subscription?.status === 'cancelled' && (
            <div className="text-orange-400 font-medium">
              Gekündigt - Läuft aus am {new Date(subscription.current_period_end).toLocaleDateString('de-DE')}
            </div>
          )}
        </div>
      </div>

      {/* PRO Features List */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-6">✨ PRO Funktionen</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <div className="flex items-center space-x-3 mb-3">
              <div className="text-2xl">👥</div>
              <h3 className="text-lg font-semibold text-white">Unbegrenzte Kundenverwaltung</h3>
            </div>
            <p className="text-slate-400 text-sm">
              Verwalten Sie alle Ihre Kunden an einem Ort
            </p>
            {isFreemium && (
              <div className="mt-3 text-xs text-orange-400">🔒 Pro</div>
            )}
            {isPaid && (
              <div className="mt-3 text-xs text-green-400">✓ Aktiv</div>
            )}
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <div className="flex items-center space-x-3 mb-3">
              <div className="text-2xl">📩</div>
              <h3 className="text-lg font-semibold text-white">Kundenanfragen Management</h3>
            </div>
            <p className="text-slate-400 text-sm">
              Bearbeiten Sie Anfragen direkt im Dashboard
            </p>
            <div className="mt-3 text-xs text-green-400">✓ Kostenlos</div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <div className="flex items-center space-x-3 mb-3">
              <div className="text-2xl">📄</div>
              <h3 className="text-lg font-semibold text-white">Rechnungen & Angebote</h3>
            </div>
            <p className="text-slate-400 text-sm">
              Professionelle PDF-Rechnungen erstellen
            </p>
            {isFreemium && (
              <div className="mt-3 text-xs text-orange-400">🔒 Pro</div>
            )}
            {isPaid && (
              <div className="mt-3 text-xs text-green-400">✓ Aktiv</div>
            )}
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <div className="flex items-center space-x-3 mb-3">
              <div className="text-2xl">🔧</div>
              <h3 className="text-lg font-semibold text-white">Services Verwaltung</h3>
            </div>
            <p className="text-slate-400 text-sm">
              Verwalten Sie Ihre Dienstleistungen
            </p>
            {isFreemium && (
              <div className="mt-3 text-xs text-orange-400">🔒 Pro</div>
            )}
            {isPaid && (
              <div className="mt-3 text-xs text-green-400">✓ Aktiv</div>
            )}
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <div className="flex items-center space-x-3 mb-3">
              <div className="text-2xl">🗂️</div>
              <h3 className="text-lg font-semibold text-white">PDF Archiv</h3>
            </div>
            <p className="text-slate-400 text-sm">
              Speichern Sie alle Dokumente zentral
            </p>
            {isFreemium && (
              <div className="mt-3 text-xs text-orange-400">🔒 Pro</div>
            )}
            {isPaid && (
              <div className="mt-3 text-xs text-green-400">✓ Aktiv</div>
            )}
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <div className="flex items-center space-x-3 mb-3">
              <div className="text-2xl">📱</div>
              <h3 className="text-lg font-semibold text-white">QR Visitenkarte</h3>
            </div>
            <p className="text-slate-400 text-sm">
              Erstellen Sie Ihre digitale Visitenkarte
            </p>
            <div className="mt-3 text-xs text-green-400">✓ Kostenlos</div>
          </div>
        </div>
      </div>
    </div>
  )
}