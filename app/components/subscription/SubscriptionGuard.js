// app/components/SubscriptionGuard.js
'use client'
import { useSubscription } from '@/lib/hooks/useSubscription'
import { useState } from 'react'

/**
 * Main SubscriptionGuard - blokira sadržaj ako korisnik nema pristup
 */
export function SubscriptionGuard({ 
  children, 
  feature, 
  majstorId, 
  fallback = null,
  showUpgradePrompt = true,
  blockOnFreemium = false // Blokira i freemium korisnike
}) {
  const { hasFeatureAccess, plan, loading, isInTrial, trialDaysRemaining, isFreemium } = useSubscription(majstorId)

  if (loading) {
    return <div className="animate-pulse bg-slate-700 h-20 rounded-lg"></div>
  }

  const hasAccess = hasFeatureAccess(feature)
  
  // Special case: block freemium completely for some features
  if (blockOnFreemium && isFreemium) {
    if (showUpgradePrompt) {
      return (
        <FreemiumBlockPrompt 
          feature={feature}
          customFallback={fallback}
        />
      )
    }
    return fallback
  }

  // Allow access if user has the feature
  if (hasAccess) {
    return children
  }

  // Show upgrade prompt or fallback
  if (showUpgradePrompt) {
    return (
      <UpgradePrompt 
        feature={feature} 
        currentPlan={plan?.display_name}
        isInTrial={isInTrial}
        trialDaysRemaining={trialDaysRemaining}
        customFallback={fallback}
      />
    )
  }

  return fallback
}

/**
 * TrialBanner - prikazuje status trial-a na vrhu dashboard-a
 */
export function TrialBanner({ majstorId, className = '' }) {
  const { isInTrial, trialDaysRemaining, isFreemium } = useSubscription(majstorId)
  const [dismissed, setDismissed] = useState(false)

  // Ne prikazuj za freemium ili ako je dismissed
  if (isFreemium || !isInTrial || dismissed || trialDaysRemaining <= 0) {
    return null
  }

  const isLastDays = trialDaysRemaining <= 2
  const urgencyClass = isLastDays 
    ? 'from-red-500/20 to-orange-500/20 border-red-500/30' 
    : 'from-blue-500/20 to-purple-500/20 border-blue-500/30'

  return (
    <div className={`bg-gradient-to-r ${urgencyClass} border rounded-lg p-4 mb-6 relative ${className}`}>
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-2 right-2 text-slate-400 hover:text-white text-lg"
        aria-label="Dismiss banner"
      >
        ×
      </button>
      
      <div className="flex items-center justify-between pr-8">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white ${
            isLastDays ? 'bg-red-500' : 'bg-blue-500'
          }`}>
            {isLastDays ? '⚠️' : '🎯'}
          </div>
          <div>
            <h4 className={`font-semibold ${isLastDays ? 'text-red-300' : 'text-blue-300'}`}>
              {isLastDays ? 'Trial läuft bald ab!' : 'Kostenlose Testphase aktiv'}
            </h4>
            <p className="text-slate-400 text-sm">
              {trialDaysRemaining === 1 
                ? 'Letzter Tag der kostenlosen Testphase!' 
                : `Noch ${trialDaysRemaining} Tage kostenlos verfügbar`
              }
            </p>
          </div>
        </div>
        <button className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
          isLastDays 
            ? 'bg-red-600 hover:bg-red-700 text-white' 
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}>
          {isLastDays ? 'Jetzt upgraden' : 'Mehr erfahren'}
        </button>
      </div>
    </div>
  )
}

/**
 * UpgradePrompt - za slučajeve kada korisnik nema pristup funkcionalnosti
 */
function UpgradePrompt({ feature, currentPlan, isInTrial, trialDaysRemaining, customFallback }) {
  const featureNames = {
    'customer_inquiries': 'Kundenanfragen',
    'invoicing': 'Rechnungen & Angebote', 
    'customer_management': 'Kundenverwaltung',
    'services_management': 'Services Verwaltung',
    'pdf_archive': 'PDF Archiv'
  }

  if (customFallback) {
    return customFallback
  }

  // Different message for trial vs freemium
  const isTrialMessage = isInTrial && trialDaysRemaining > 0

  return (
    <div className="bg-slate-800/50 border-2 border-dashed border-slate-600 rounded-xl p-8 text-center">
      <div className="w-16 h-16 bg-blue-500/20 rounded-full mx-auto mb-4 flex items-center justify-center">
        <span className="text-blue-400 text-3xl">🔒</span>
      </div>
      
      <h3 className="text-white font-semibold text-lg mb-2">
        {featureNames[feature] || 'Diese Funktion'} 
        {isTrialMessage ? ' sollte verfügbar sein' : ' nicht verfügbar'}
      </h3>
      
      <p className="text-slate-400 text-sm mb-4">
        {isTrialMessage ? (
          `Ihr Trial sollte Zugang zu allen Funktionen haben. Bitte kontaktieren Sie den Support.`
        ) : (
          <>Aktueller Plan: <span className="text-slate-300 font-medium">{currentPlan || 'Freemium'}</span></>
        )}
      </p>
      
      {!isTrialMessage && (
        <button 
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
          onClick={() => {
            // TODO: Redirect to upgrade page
            alert('Upgrade Funktion wird bald implementiert!')
          }}
        >
          Auf Pro upgraden
        </button>
      )}
    </div>
  )
}

/**
 * FreemiumBlockPrompt - strenger block für freemium users
 */
function FreemiumBlockPrompt({ feature, customFallback }) {
  const featureNames = {
    'customer_inquiries': 'Kundenanfragen',
    'invoicing': 'Rechnungen & Angebote', 
    'customer_management': 'Kundenverwaltung',
    'services_management': 'Services Verwaltung',
    'pdf_archive': 'PDF Archiv'
  }

  if (customFallback) {
    return customFallback
  }

  return (
    <div className="bg-slate-900 border border-slate-600 rounded-xl p-8 text-center">
      <div className="w-16 h-16 bg-purple-500/20 rounded-full mx-auto mb-4 flex items-center justify-center">
        <span className="text-purple-400 text-3xl">💎</span>
      </div>
      
      <h3 className="text-white font-semibold text-lg mb-2">
        {featureNames[feature] || 'Diese Funktion'} ist nur für Pro-Nutzer
      </h3>
      
      <p className="text-slate-400 text-sm mb-6">
        Upgrade auf Pro um Zugang zu allen Funktionen zu erhalten, einschließlich Kundenmanagement, 
        Rechnungserstellung und erweiterten Features.
      </p>
      
      <div className="space-y-3">
        <button 
          className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
          onClick={() => {
            // TODO: Redirect to pricing page
            alert('Upgrade Funktion wird bald implementiert!')
          }}
        >
          7 Tage kostenlos testen
        </button>
        <p className="text-slate-500 text-xs">
          Keine Kreditkarte erforderlich • Jederzeit kündbar
        </p>
      </div>
    </div>
  )
}

/**
 * SubscriptionStatus - kompakte Anzeige des subscription status
 */
export function SubscriptionStatus({ majstorId, compact = false }) {
  const { 
    plan, 
    isInTrial, 
    trialDaysRemaining, 
    isActive, 
    isPaid,
    isFreemium,
    loading 
  } = useSubscription(majstorId)

  if (loading) {
    return <div className="animate-pulse bg-slate-700 h-8 rounded"></div>
  }

  if (!isActive) {
    return (
      <div className="bg-slate-800 border border-slate-600 rounded-lg p-3">
        <div className="text-slate-400 text-sm">
          Plan: <span className="text-white font-medium">Inaktiv</span>
        </div>
      </div>
    )
  }

  const statusColor = isInTrial 
    ? trialDaysRemaining <= 2 ? 'text-red-400' : 'text-blue-400'
    : isPaid ? 'text-green-400' : 'text-slate-400'

  const statusText = isInTrial 
    ? `Trial (${trialDaysRemaining}d)`
    : isPaid 
    ? 'Aktiv' 
    : isFreemium
    ? 'Freemium'
    : 'Unbekannt'

  if (compact) {
    return (
      <div className="inline-flex items-center gap-2 bg-slate-800 px-3 py-1 rounded-full border border-slate-600">
        <div className={`w-2 h-2 rounded-full ${
          isInTrial ? 'bg-blue-400' : isPaid ? 'bg-green-400' : 'bg-slate-400'
        }`}></div>
        <span className="text-white text-sm font-medium">{plan?.display_name}</span>
        <span className={`text-xs ${statusColor}`}>({statusText})</span>
      </div>
    )
  }

  return (
    <div className="bg-slate-800 border border-slate-600 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-white font-semibold">{plan?.display_name} Plan</div>
          <div className={`text-sm ${statusColor}`}>Status: {statusText}</div>
          {plan?.price_monthly > 0 && (
            <div className="text-slate-400 text-sm">
              {plan.price_monthly}€/Monat
            </div>
          )}
        </div>
        <button 
          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
          onClick={() => {
            // TODO: Open subscription management
            alert('Abo-Verwaltung wird bald implementiert!')
          }}
        >
          Verwalten
        </button>
      </div>
    </div>
  )
}

/**
 * FeatureList - zeigt verfügbare Features für aktuellen Plan
 */
export function FeatureList({ majstorId, showAll = false }) {
  const { features, plan, loading } = useSubscription(majstorId)

  if (loading) {
    return <div className="animate-pulse bg-slate-700 h-32 rounded"></div>
  }

  const allFeatures = [
    { key: 'business_cards', name: 'QR Visitenkarte', icon: '📱' },
    { key: 'customer_inquiries', name: 'Kundenanfragen', icon: '📧' },
    { key: 'customer_management', name: 'Kundenverwaltung', icon: '👥' },
    { key: 'invoicing', name: 'Rechnungen & Angebote', icon: '📄' },
    { key: 'services_management', name: 'Services Verwaltung', icon: '🔧' },
    { key: 'pdf_archive', name: 'PDF Archiv', icon: '🗂️' }
  ]

  const availableFeatures = features?.map(f => f.feature_key) || []

  return (
    <div className="bg-slate-800 border border-slate-600 rounded-lg p-4">
      <h3 className="text-white font-semibold mb-3">
        Verfügbare Funktionen ({plan?.display_name})
      </h3>
      <div className="space-y-2">
        {allFeatures.map(feature => {
          const isAvailable = availableFeatures.includes(feature.key)
          const shouldShow = showAll || isAvailable
          
          if (!shouldShow) return null
          
          return (
            <div key={feature.key} className={`flex items-center gap-3 p-2 rounded ${
              isAvailable ? 'bg-green-500/10 border border-green-500/20' : 'bg-slate-700/50'
            }`}>
              <span className="text-lg">{feature.icon}</span>
              <span className={`font-medium ${
                isAvailable ? 'text-green-300' : 'text-slate-500'
              }`}>
                {feature.name}
              </span>
              <span className={`ml-auto text-xs px-2 py-1 rounded ${
                isAvailable 
                  ? 'bg-green-500 text-white' 
                  : 'bg-slate-600 text-slate-400'
              }`}>
                {isAvailable ? 'Verfügbar' : 'Nicht verfügbar'}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}