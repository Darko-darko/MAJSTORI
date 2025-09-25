// app/dashboard/page.js - PRODUCTION READY (DEBUG REMOVED)

'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import OnboardingWizard from '@/app/components/OnboardingWizard'

// Subscription imports
import { SubscriptionGuard } from '@/app/components/subscription/SubscriptionGuard'
import { useSubscription } from '@/lib/hooks/useSubscription'
import { useUpgradeModal, UpgradeModal } from '@/app/components/subscription/UpgradeModal'

function DashboardPageContent() {
  // Welcome states
  const [welcomeMessage, setWelcomeMessage] = useState(false)
  const [trialWelcome, setTrialWelcome] = useState(false)
  
  // Core data states
  const [majstor, setMajstor] = useState(null)
  const [majstorLoading, setMajstorLoading] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  // Stats state
  const [stats, setStats] = useState({
    totalInquiries: 0,
    newInquiries: 0,
    totalInvoices: 0,
    qrScans: 0
  })

  // Trial info state (legacy)
  const [trialInfo, setTrialInfo] = useState({
    isTrialUser: false,
    daysRemaining: 0,
    expiresAt: null
  })
  
  const searchParams = useSearchParams()

  // Upgrade modal hook
  const { isOpen, modalProps, showUpgradeModal, hideUpgradeModal } = useUpgradeModal()

  // Subscription hook
  const { 
    plan, 
    subscription,
    hasFeatureAccess, 
    isActive, 
    isInTrial,
    isFreemium,
    isExpired,
    trialDaysRemaining,
    loading: subscriptionLoading 
  } = useSubscription(majstor?.id)

  // Handle URL parameters and load data
  useEffect(() => {
    // Check URL parameters for welcome states
    if (searchParams.get('welcome')) {
      setWelcomeMessage(true)
      setTimeout(() => setWelcomeMessage(false), 8000)
    }
    
    if (searchParams.get('trial')) {
      setTrialWelcome(true)
      setTimeout(() => setTrialWelcome(false), 10000)
    }
    
    loadMajstorAndStats()
  }, [searchParams])

  const loadMajstorAndStats = async () => {
    try {
      setMajstorLoading(true)
      setError('')
      
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        setError('Authentication required')
        return
      }

      // Get majstor profile
      const { data: majstorData, error: majstorError } = await supabase
        .from('majstors')
        .select('*')
        .eq('id', user.id)
        .single()

      if (majstorError) {
        console.error('Majstor loading error:', majstorError)
        setError('Fehler beim Laden des Profils')
        return
      }

      if (!majstorData) {
        console.error('No majstor data found')
        setError('Profil nicht gefunden')
        return
      }

      setMajstor(majstorData)
      
      // Calculate trial info (legacy)
      calculateTrialInfo(majstorData)
      
      // Load stats
      await loadStats(user.id)
      
    } catch (err) {
      console.error('Error loading dashboard data:', err)
      setError('Fehler beim Laden der Daten')
    } finally {
      setMajstorLoading(false)
      setLoading(false)
    }
  }

  // Legacy trial calculation
  const calculateTrialInfo = (majstorData) => {
    if (!majstorData) return

    const isTrialUser = majstorData.subscription_status === 'trial'
    if (!isTrialUser) {
      setTrialInfo({ isTrialUser: false, daysRemaining: 0, expiresAt: null })
      return
    }

    const now = new Date()
    const expiresAt = new Date(majstorData.subscription_ends_at)
    const diffTime = expiresAt.getTime() - now.getTime()
    const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))

    setTrialInfo({
      isTrialUser: true,
      daysRemaining,
      expiresAt: majstorData.subscription_ends_at
    })
  }

  const loadStats = async (userId) => {
    try {
      // Load inquiries stats
      const { data: inquiries, error: inquiriesError } = await supabase
        .from('inquiries')
        .select('status')
        .eq('majstor_id', userId)

      if (!inquiriesError && inquiries) {
        const newInquiries = inquiries.filter(i => i.status === 'new').length || 0
        setStats(prev => ({
          ...prev,
          totalInquiries: inquiries.length || 0,
          newInquiries
        }))
      }

      // Load invoices stats
      const { data: invoices } = await supabase
        .from('invoices')
        .select('id, type')
        .eq('majstor_id', userId)
        .neq('status', 'dummy') // Exclude dummy entries

      if (invoices) {
        setStats(prev => ({
          ...prev,
          totalInvoices: invoices.filter(inv => inv.type === 'invoice').length
        }))
      }

    } catch (err) {
      console.error('Error loading stats:', err)
    }
  }

  // Refresh stats periodically
  useEffect(() => {
    if (majstor?.id) {
      const interval = setInterval(() => loadStats(majstor.id), 30000)
      return () => clearInterval(interval)
    }
  }, [majstor?.id])

  // Trial-specific welcome message
  const TrialWelcomeMessage = () => {
    if (!trialWelcome || !isInTrial) return null

    const signupSource = searchParams.get('source')
    const isGoogleUser = signupSource === 'google'

    return (
      <div className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-green-500/10 border border-blue-500/20 rounded-2xl p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="text-4xl">🎉</div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-white mb-2">
              {isGoogleUser ? 'Willkommen bei pro-meister.de!' : 'Registrierung erfolgreich!'}
            </h3>
            <div className="space-y-2 text-slate-300">
              <p>
                🎯 <strong>Kostenlose 7-Tage-Testphase</strong> ist jetzt aktiv! 
                Noch <strong>{trialDaysRemaining} Tage</strong> um alle Funktionen zu testen.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-green-400">✓</span>
                  <span>Digitale QR-Visitenkarte</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-green-400">✓</span>
                  <span>Unbegrenzte Rechnungen</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-green-400">✓</span>
                  <span>Kundenverwaltung</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-green-400">✓</span>
                  <span>Kundenanfragen</span>
                </div>
              </div>
            </div>
            <div className="mt-4 flex flex-col sm:flex-row gap-3">
              <Link
                href="/dashboard/business-card/create"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-center"
              >
                📱 Erste Visitenkarte erstellen
              </Link>
              <Link
                href="/dashboard/invoices"
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-center"
              >
                📄 Erste Rechnung erstellen
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Regular welcome message
  const RegularWelcomeMessage = () => {
    if (!welcomeMessage || trialWelcome) return null

    return (
      <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20 rounded-2xl p-6 mb-6">
        <div className="flex items-center space-x-4">
          <div className="text-4xl">👋</div>
          <div>
            <h3 className="text-xl font-bold text-white mb-2">Willkommen zurück!</h3>
            <p className="text-slate-300">
              Schön, Sie wieder zu sehen. Hier ist Ihr Dashboard-Überblick.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Loading states
  if (loading || majstorLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <div className="text-white text-xl">
            {majstorLoading ? 'Lade Profil...' : 'Laden...'}
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">⚠️ {error}</div>
          <button 
            onClick={() => {
              setError('')
              loadMajstorAndStats()
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Erneut versuchen
          </button>
        </div>
      </div>
    )
  }

  // Error state if no majstor
  if (!majstor) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">
            Profil nicht gefunden
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Seite neu laden
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Welcome Messages */}
      <TrialWelcomeMessage />
      <RegularWelcomeMessage />

      {/* Trial Status Card */}
      {isInTrial && (
        <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-blue-300 mb-2">
                🎯 Testphase aktiv
              </h3>
              <p className="text-slate-300">
                Noch <strong>{trialDaysRemaining} Tage</strong> um alle Funktionen zu testen. 
                Danach nur €19,90/Monat für unbegrenzten Zugang.
              </p>
            </div>
            <button className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
              Mehr erfahren
            </button>
          </div>
        </div>
      )}

      {/* Expired Trial Notification */}
      {isExpired && subscription?.status === 'trial' && (
        <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4 mb-6">
          <h3 className="text-orange-300 font-semibold">Trial period završen</h3>
          <p className="text-orange-200 text-sm">
            Automatisch prebačeno na Freemium plan. Nadogradite da biste zadržali sve funkcije.
          </p>
          <button 
            onClick={() => alert('Upgrade functionality - uskoro!')}
            className="bg-orange-600 text-white px-4 py-2 rounded mt-2"
          >
            Nadogradite plan
          </button>
        </div>
      )}

      {/* Freemium Status */}
      {isFreemium && !isInTrial && (
        <div className="bg-slate-600/10 border border-slate-600/20 rounded-lg p-4 mb-6">
          <h3 className="text-slate-300 font-semibold">Freemium plan</h3>
          <p className="text-slate-400 text-sm">
            Osnovne funkcije dostupne. Nadogradite za potpunu funkcionalnost.
          </p>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Kundenanfragen</p>
              <p className="text-3xl font-bold text-white">{stats.totalInquiries}</p>
              <p className="text-sm text-slate-400">
                {stats.newInquiries} neue
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-2xl">
              📧
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Rechnungen</p>
              <p className="text-3xl font-bold text-white">{stats.totalInvoices}</p>
              <p className="text-sm text-slate-400">Erstellt</p>
            </div>
            <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center text-2xl">
              📄
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">QR Scans</p>
              <p className="text-3xl font-bold text-white">{stats.qrScans}</p>
              <p className="text-sm text-slate-400">Heute</p>
            </div>
            <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center text-2xl">
              📱
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Plan Status</p>
              <p className="text-2xl font-bold text-white">{plan?.display_name || 'Loading...'}</p>
              <p className="text-sm text-slate-400">
                {isInTrial ? `${trialDaysRemaining}d trial` : isFreemium ? 'Kostenlos' : 'Aktiv'}
              </p>
            </div>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
              isInTrial ? 'bg-blue-600' : isFreemium ? 'bg-slate-600' : 'bg-green-600'
            }`}>
              {isInTrial ? '⏱️' : isFreemium ? '🆓' : '💎'}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-6">
          {isInTrial ? 'Erste Schritte in Ihrer Testphase' : 'Schnellzugriff'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Business Card Creation */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-2xl mb-4">
              📱
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">QR Visitenkarte erstellen</h3>
            <p className="text-slate-400 text-sm mb-4">
              Erstellen Sie Ihre digitale Visitenkarte mit QR-Code für Kunden
            </p>
            <Link
              href="/dashboard/business-card/create"
              className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors"
            >
              Jetzt erstellen
            </Link>
          </div>

          {/* Invoice Creation with subscription gating */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
            <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center text-2xl mb-4">
              📄
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              {stats.totalInvoices === 0 ? 'Erste Rechnung' : 'Neue Rechnung'}
            </h3>
            <p className="text-slate-400 text-sm mb-4">
              {stats.totalInvoices === 0 
                ? 'Erstellen Sie eine professionelle PDF-Rechnung für Ihre Kunden'
                : 'Erstellen Sie eine neue Rechnung oder ein Angebot'
              }
            </p>
            
            {subscriptionLoading ? (
              <div className="bg-slate-600 text-slate-400 px-4 py-2 rounded-lg font-medium text-sm animate-pulse">
                Lade Berechtigung...
              </div>
            ) : (
              <SubscriptionGuard 
                feature="invoicing" 
                majstorId={majstor.id}
                showUpgradePrompt={false}
                fallback={
                  <button
                    onClick={() => showUpgradeModal('invoicing', 'Rechnungen & Angebote', plan?.display_name)}
                    className="inline-block bg-slate-600 text-slate-300 px-4 py-2 rounded-lg font-medium text-sm hover:bg-slate-500 transition-colors border-2 border-dashed border-slate-500"
                  >
                    🔒 Rechnung erstellen
                  </button>
                }
              >
                <Link
                  href="/dashboard/invoices"
                  className="inline-block bg-purple-600 text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-purple-700 transition-colors"
                >
                  Rechnung erstellen
                </Link>
              </SubscriptionGuard>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-6">Dashboard Navigation</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          
          <Link
            href="/dashboard/customers"
            className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition-colors group"
          >
            <div className="text-2xl mb-2">👥</div>
            <div className="text-white font-medium text-sm group-hover:text-blue-300 transition-colors">
              Meine Kunden
            </div>
            {!hasFeatureAccess('customer_management') && (
              <div className="text-xs text-slate-500 mt-1">Basic+ Plan</div>
            )}
          </Link>

          <Link
            href="/dashboard/inquiries"
            className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition-colors relative group"
          >
            <div className="text-2xl mb-2">📧</div>
            <div className="text-white font-medium text-sm group-hover:text-blue-300 transition-colors">
              Kundenanfragen
            </div>
            {!hasFeatureAccess('customer_inquiries') && (
              <div className="text-xs text-slate-500 mt-1">Basic+ Plan</div>
            )}
            {stats.newInquiries > 0 && hasFeatureAccess('customer_inquiries') && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {stats.newInquiries > 9 ? '9+' : stats.newInquiries}
              </span>
            )}
          </Link>

          <Link
            href="/dashboard/invoices"
            className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition-colors group"
          >
            <div className="text-2xl mb-2">📄</div>
            <div className="text-white font-medium text-sm group-hover:text-blue-300 transition-colors">
              Rechnungen
            </div>
            {!hasFeatureAccess('invoicing') && (
              <div className="text-xs text-slate-500 mt-1">Basic+ Plan</div>
            )}
          </Link>

          <Link
            href="/dashboard/services"
            className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition-colors group"
          >
            <div className="text-2xl mb-2">🔧</div>
            <div className="text-white font-medium text-sm group-hover:text-blue-300 transition-colors">
              Meine Services
            </div>
            {!hasFeatureAccess('services_management') && (
              <div className="text-xs text-slate-500 mt-1">Basic+ Plan</div>
            )}
          </Link>

          <Link
            href="/dashboard/warranties"
            className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition-colors group"
          >
            <div className="text-2xl mb-2">🛡️</div>
            <div className="text-white font-medium text-sm group-hover:text-blue-300 transition-colors">
              Garantien
            </div>
          </Link>

          <Link
            href="/dashboard/referrals"
            className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition-colors group"
          >
            <div className="text-2xl mb-2">🎯</div>
            <div className="text-white font-medium text-sm group-hover:text-blue-300 transition-colors">
              Empfehlungen
            </div>
            {!hasFeatureAccess('referral_system') && (
              <div className="text-xs text-slate-500 mt-1">Advanced Plan</div>
            )}
          </Link>

          <Link
            href="/dashboard/planner"
            className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition-colors group"
          >
            <div className="text-2xl mb-2">📅</div>
            <div className="text-white font-medium text-sm group-hover:text-blue-300 transition-colors">
              Planner
            </div>
            {!hasFeatureAccess('planner') && (
              <div className="text-xs text-slate-500 mt-1">Advanced Plan</div>
            )}
          </Link>

          <Link
            href="/dashboard/settings"
            className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition-colors group"
          >
            <div className="text-2xl mb-2">⚙️</div>
            <div className="text-white font-medium text-sm group-hover:text-blue-300 transition-colors">
              Einstellungen
            </div>
          </Link>
        </div>
      </div>

      {/* Onboarding Wizard */}
      <OnboardingWizard majstor={majstor} trialInfo={trialInfo} />

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={isOpen}
        onClose={hideUpgradeModal}
        feature={modalProps.feature}
        featureName={modalProps.featureName}
        currentPlan={modalProps.currentPlan}
      />
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <div className="text-white text-xl">Laden...</div>
        </div>
      </div>
    }>
      <DashboardPageContent />
    </Suspense>
  )
}