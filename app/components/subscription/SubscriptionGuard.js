// app/components/subscription/SubscriptionGuard.js - REFACTORED (NO TRIAL)
'use client'
import { useSubscription } from '@/lib/hooks/useSubscription'

/**
 * Main SubscriptionGuard - blokira sadržaj ako korisnik nema pristup
 */
export function SubscriptionGuard({ 
  children, 
  feature, 
  majstorId, 
  fallback = null,
  showUpgradePrompt = true,
  blockOnFreemium = false
}) {
  const { hasFeatureAccess, plan, loading, isFreemium } = useSubscription(majstorId)

  if (loading) {
    return <div className="animate-pulse bg-slate-700 h-20 rounded-lg"></div>
  }

  const hasAccess = hasFeatureAccess(feature)
  
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

  if (hasAccess) {
    return children
  }

  if (showUpgradePrompt) {
    return (
      <UpgradePrompt 
        feature={feature} 
        currentPlan={plan?.display_name}
        customFallback={fallback}
      />
    )
  }

  return fallback
}

/**
 * UpgradePrompt - when user doesn't have access
 */
function UpgradePrompt({ feature, currentPlan, customFallback }) {
  const featureNames = {
    'customer_inquiries': 'Kundenanfragen',
    'invoicing': 'Rechnungen & Angebote', 
    'customer_management': 'Kundenverwaltung',
    'services_management': 'Services Verwaltung',
    'pdf_archive': 'PDF Archiv',
    'settings': 'Erweiterte Einstellungen'
  }

  if (customFallback) {
    return customFallback
  }

  return (
    <div className="bg-slate-800/50 border-2 border-dashed border-slate-600 rounded-xl p-8 text-center">
      <div className="w-16 h-16 bg-blue-500/20 rounded-full mx-auto mb-4 flex items-center justify-center">
        <span className="text-blue-400 text-3xl">🔒</span>
      </div>
      
      <h3 className="text-white font-semibold text-lg mb-2">
        {featureNames[feature] || 'Diese Funktion'} nicht verfügbar
      </h3>
      
      <p className="text-slate-400 text-sm mb-4">
        Aktueller Plan: <span className="text-slate-300 font-medium">{currentPlan || 'Freemium'}</span>
      </p>
      
      <button 
        className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
        onClick={() => {
          window.location.href = '/dashboard/subscription'
        }}
      >
        Auf Pro upgraden
      </button>
    </div>
  )
}

/**
 * FreemiumBlockPrompt
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
            window.location.href = '/dashboard/subscription'
          }}
        >
          Jetzt upgraden - 19,90€/Monat
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
    subscription,
    plan, 
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

  // Calculate grace period days if PRO
  let graceDaysRemaining = 0
  if (isPaid && subscription?.current_period_end) {
    const now = new Date()
    const endDate = new Date(subscription.current_period_end)
    const diffTime = endDate.getTime() - now.getTime()
    graceDaysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  const statusColor = isPaid ? 'text-green-400' : isFreemium ? 'text-slate-400' : 'text-green-400'
  
  const statusText = isPaid && graceDaysRemaining > 0
    ? `PRO (${graceDaysRemaining}d Grace)` 
    : isFreemium
    ? 'Freemium'
    : 'Aktiv'

  if (compact) {
    return (
      <div className="inline-flex items-center gap-2 bg-slate-800 px-3 py-1 rounded-full border border-slate-600">
        <div className={`w-2 h-2 rounded-full ${
          isPaid ? 'bg-green-400' : 'bg-slate-400'
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
            window.location.href = '/dashboard/subscription'
          }}
        >
          Verwalten
        </button>
      </div>
    </div>
  )
}

/**
 * FeatureList
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