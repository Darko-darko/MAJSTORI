// app/components/subscription/SubscriptionGuard.js - FIXED PLAN NAMES
'use client'
import { useSubscription } from '@/lib/hooks/useSubscription'

/**
 * HOC Component - prikazuje sadržaj samo ako korisnik ima pristup funkcionalnosti
 * UPDATED: Koristi ispravne nazive planova (pro, pro_plus) umesto (basic, advance)
 * 
 * Upotreba:
 * <SubscriptionGuard feature="customer_inquiries" majstorId={user.id}>
 *   <ButtonForInquiries />
 * </SubscriptionGuard>
 */
export function SubscriptionGuard({ 
  children, 
  feature, 
  majstorId, 
  fallback = null,
  showUpgradePrompt = true 
}) {
  const { hasFeatureAccess, plan, loading } = useSubscription(majstorId)

  if (loading) {
    return <div className="text-slate-400">...</div>
  }

  const hasAccess = hasFeatureAccess(feature)

  if (hasAccess) {
    return children
  }

  // Fallback ili upgrade prompt
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
 * Upgrade Prompt Component - UPDATED plan names
 */
function UpgradePrompt({ feature, currentPlan, customFallback }) {
  const featureNames = {
    'customer_inquiries': 'Kundenanfragen',
    'invoicing': 'Rechnungen & Angebote', 
    'customer_management': 'Kundenverwaltung',
    'services_management': 'Dienstleistungen',
    'pdf_archive': 'PDF-Archiv',
    'planner': 'Terminplanung',
    'referral_system': 'Empfehlungssystem',
    'white_labeling': 'White Label Optionen'
  }

  // Required plan mapping
  const featureRequiredPlan = {
    'customer_inquiries': 'Pro',
    'invoicing': 'Pro', 
    'customer_management': 'Pro',
    'services_management': 'Pro',
    'pdf_archive': 'Pro',
    'planner': 'Pro+',
    'referral_system': 'Pro+',
    'white_labeling': 'White Label'
  }

  if (customFallback) {
    return customFallback
  }

  const requiredPlan = featureRequiredPlan[feature] || 'Pro'

  return (
    <div className="bg-slate-800/50 border-2 border-dashed border-slate-600 rounded-lg p-6 text-center">
      <div className="w-12 h-12 bg-blue-500/20 rounded-lg mx-auto mb-4 flex items-center justify-center">
        <span className="text-blue-400 text-2xl">🔒</span>
      </div>
      <h3 className="text-white font-semibold mb-2">
        {featureNames[feature] || 'Diese Funktionalität'} nicht verfügbar
      </h3>
      <p className="text-slate-400 text-sm mb-4">
        Aktueller Plan: <span className="text-slate-300 font-medium">{currentPlan || 'Freemium'}</span>
        <br />
        Benötigt: <span className="text-blue-300 font-medium">{requiredPlan}</span>
      </p>
      <button 
        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
        onClick={() => {
          // TODO: Redirect to upgrade page or trigger modal
          alert(`Upgrade auf ${requiredPlan} erforderlich - Implementierung folgt!`)
        }}
      >
        Auf {requiredPlan} upgraden
      </button>
    </div>
  )
}

// app/components/subscription/TrialBanner.js
/**
 * Trial Banner - prikazuje preostale dane trial-a
 */
export function TrialBanner({ majstorId, className = '' }) {
  const { isInTrial, trialDaysRemaining, plan } = useSubscription(majstorId)

  if (!isInTrial || trialDaysRemaining <= 0) {
    return null
  }

  const isLastDays = trialDaysRemaining <= 2
  const urgencyClass = isLastDays ? 'bg-red-500/10 border-red-500/20' : 'bg-blue-500/10 border-blue-500/20'

  return (
    <div className={`${urgencyClass} border rounded-lg p-4 mb-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold">⏰</span>
          </div>
          <div>
            <h4 className="text-white font-semibold">
              {plan?.display_name || 'Pro'} Plan - Kostenlose Testphase
            </h4>
            <p className={`text-sm ${isLastDays ? 'text-red-300' : 'text-blue-300'}`}>
              {trialDaysRemaining === 1 
                ? 'Letzter Tag der Testphase!' 
                : `Noch ${trialDaysRemaining} Tage kostenlos`
              }
            </p>
          </div>
        </div>
        <button 
          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
            isLastDays 
              ? 'bg-red-600 hover:bg-red-700 text-white' 
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
          onClick={() => {
            // TODO: Redirect to billing page
            alert('Billing page - kommt bald!')
          }}
        >
          {isLastDays ? 'Jetzt upgraden' : 'Plan verwalten'}
        </button>
      </div>
    </div>
  )
}

// app/components/subscription/PlanCard.js
/**
 * Plan Card Component - für Anzeige von Plänen - UPDATED PLAN NAMES
 */
export function PlanCard({ 
  plan, 
  features = [], 
  isActive = false, 
  isRecommended = false,
  onSelect,
  className = ''
}) {
  const borderClass = isActive 
    ? 'border-green-500 bg-green-500/5' 
    : isRecommended 
    ? 'border-blue-500 bg-blue-500/5' 
    : 'border-slate-700 bg-slate-800/50'

  return (
    <div className={`border-2 ${borderClass} rounded-xl p-6 relative ${className}`}>
      {/* Recommended Badge */}
      {isRecommended && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-bold">
            EMPFOHLEN
          </div>
        </div>
      )}

      {/* Active Badge */}
      {isActive && (
        <div className="absolute top-4 right-4">
          <div className="bg-green-500 text-white px-2 py-1 rounded-full text-xs font-bold">
            AKTIV
          </div>
        </div>
      )}

      {/* Plan Header */}
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold text-white mb-2">{plan.display_name}</h3>
        <div className="flex items-baseline justify-center gap-1 mb-3">
          <span className="text-4xl font-bold text-white">
            {plan.price_monthly === 0 ? 'Kostenlos' : `${plan.price_monthly}€`}
          </span>
          {plan.price_monthly > 0 && (
            <span className="text-slate-400">/Monat</span>
          )}
        </div>
        <p className="text-slate-400 text-sm">{plan.description}</p>
      </div>

      {/* Features List */}
      <div className="space-y-3 mb-6">
        {features.map((feature, index) => (
          <div key={index} className="flex items-center gap-3">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
              feature.is_enabled 
                ? 'bg-green-500 text-white' 
                : 'bg-slate-600 text-slate-400'
            }`}>
              <span className="text-xs">
                {feature.is_enabled ? '✓' : '○'}
              </span>
            </div>
            <span className={`text-sm ${
              feature.is_enabled ? 'text-slate-300' : 'text-slate-500'
            }`}>
              {feature.feature_name}
              {!feature.is_enabled && ' (Bald verfügbar)'}
            </span>
          </div>
        ))}
      </div>

      {/* Action Button */}
      <button
        onClick={() => onSelect?.(plan)}
        disabled={isActive}
        className={`w-full py-3 rounded-lg font-semibold transition-colors ${
          isActive
            ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
            : plan.price_monthly === 0
            ? 'bg-slate-600 hover:bg-slate-700 text-white'
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
      >
        {isActive 
          ? 'Aktueller Plan' 
          : plan.price_monthly === 0 
          ? 'Kostenlos bleiben' 
          : 'Plan wählen'
        }
      </button>
    </div>
  )
}

// app/components/subscription/SubscriptionStatus.js
/**
 * Subscription Status Widget - kompakter Anzeige-Status - UPDATED PLAN NAMES
 */
export function SubscriptionStatus({ majstorId, compact = false }) {
  const { 
    plan, 
    isInTrial, 
    trialDaysRemaining, 
    isActive, 
    isPaid, 
    loading 
  } = useSubscription(majstorId)

  if (loading) {
    return <div className="animate-pulse bg-slate-700 h-8 rounded"></div>
  }

  if (!isActive) {
    return (
      <div className="bg-slate-800 border border-slate-600 rounded-lg p-3">
        <div className="text-slate-400 text-sm">
          Plan: <span className="text-white font-medium">Freemium</span>
        </div>
      </div>
    )
  }

  const statusColor = isInTrial 
    ? trialDaysRemaining <= 2 ? 'text-red-400' : 'text-blue-400'
    : 'text-green-400'

  const statusText = isInTrial 
    ? `Trial (${trialDaysRemaining}d)`
    : isPaid 
    ? 'Aktiv' 
    : 'Unbezahlt'

  if (compact) {
    return (
      <div className="inline-flex items-center gap-2 bg-slate-800 px-3 py-1 rounded-full border border-slate-600">
        <div className={`w-2 h-2 rounded-full ${
          isInTrial ? 'bg-blue-400' : isPaid ? 'bg-green-400' : 'bg-red-400'
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
            alert('Subscription management - kommt bald!')
          }}
        >
          Verwalten
        </button>
      </div>
    </div>
  )
}