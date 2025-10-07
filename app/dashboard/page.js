// app/dashboard/page.js - SA AUTO-REFRESH NAKON PADDLE NAPLATE

'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { SubscriptionGuard } from '@/app/components/subscription/SubscriptionGuard'
import { UpgradeModal, useUpgradeModal } from '@/app/components/subscription/UpgradeModal'
import { useSubscription } from '@/lib/hooks/useSubscription'
import Link from 'next/link'

function DashboardPageContent() {
  const [majstor, setMajstor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  // 🔥 NOVO: Upgrade processing states
  const [upgradingInProgress, setUpgradingInProgress] = useState(false)
  const [upgradeProgress, setUpgradeProgress] = useState(0)
  const [upgradeMessage, setUpgradeMessage] = useState('')
  
  const { isOpen: upgradeModalOpen, modalProps, showUpgradeModal, hideUpgradeModal } = useUpgradeModal()
  
  // 🔥 NOVO: Hook za subscription sa refresh funkcijom
  const { refresh: refreshSubscription } = useSubscription(majstor?.id)
  
  const [stats, setStats] = useState({
    totalInquiries: 0,
    newInquiries: 0,
    totalInvoices: 0,
    totalCustomers: 0,
    qrScans: 0
  })

  const [welcomeMessage, setWelcomeMessage] = useState(false)
  
  const searchParams = useSearchParams()

  useEffect(() => {
    if (searchParams.get('welcome')) {
      setWelcomeMessage(true)
      setTimeout(() => setWelcomeMessage(false), 8000)
    }
    
    loadMajstorAndStats()
  }, [searchParams])

  // 🔥 NOVO: Detektuj uspešnu Paddle naplatu i pokreni auto-refresh
  useEffect(() => {
    const paddleSuccess = searchParams.get('paddle_success')
    const planType = searchParams.get('plan')
    
    if (paddleSuccess === 'true' && majstor?.id) {
      console.log('🎯 Paddle payment detected - starting auto-refresh!')
      startUpgradeRefresh(planType)
    }
  }, [searchParams, majstor?.id])

  // 🔥 NOVO: Progressive auto-refresh nakon Paddle naplate
  const startUpgradeRefresh = (planType) => {
    setUpgradingInProgress(true)
    setUpgradeProgress(0)
    setUpgradeMessage('Aktiviere PRO Mitgliedschaft...')
    
    // Emit event za sidebar
    window.dispatchEvent(new CustomEvent('subscription-changed', {
      detail: { action: 'upgraded', timestamp: Date.now(), plan: planType }
    }))
    
    // Progressive refresh strategy (isto kao cancel/reactivate)
    const refreshIntervals = [
      { delay: 0, message: 'Verbindung zu Paddle...' },
      { delay: 2000, message: 'Warte auf Bestätigung...' },
      { delay: 5000, message: 'Subscription wird aktualisiert...' },
      { delay: 8000, message: 'Fast fertig...' },
      { delay: 12000, message: 'Abschließen...' },
      { delay: 15000, message: 'Fertig!' }
    ]
    
    let refreshCount = 0
    const totalRefreshes = refreshIntervals.length
    
    refreshIntervals.forEach((step, index) => {
      setTimeout(() => {
        refreshCount++
        const progress = (refreshCount / totalRefreshes) * 100
        
        setUpgradeProgress(progress)
        setUpgradeMessage(step.message)
        
        console.log(`🔄 Auto-refresh #${refreshCount}/${totalRefreshes} - ${step.message}`)
        
        // Pozovi refresh funkciju iz hook-a
        if (refreshSubscription && typeof refreshSubscription === 'function') {
          refreshSubscription()
        }
        
        // Završi nakon poslednjeg koraka
        if (index === refreshIntervals.length - 1) {
          setTimeout(() => {
            setUpgradingInProgress(false)
            setUpgradeProgress(100)
            setUpgradeMessage('PRO Mitgliedschaft aktiviert!')
            
            // Ukloni paddle_success parametar iz URL-a
            const url = new URL(window.location.href)
            url.searchParams.delete('paddle_success')
            url.searchParams.delete('plan')
            window.history.replaceState({}, '', url.toString())
            
            // Reload za clean state
            setTimeout(() => {
              window.location.reload()
            }, 1500)
          }, 1000)
        }
      }, step.delay)
    })
  }

  const loadMajstorAndStats = async () => {
    try {
      setLoading(true)
      setError('')
      
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        setError('Authentication required')
        return
      }

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
      await loadStats(user.id)
      
    } catch (err) {
      console.error('Error loading dashboard data:', err)
      setError('Fehler beim Laden der Daten')
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async (userId) => {
    try {
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

      const { data: invoices } = await supabase
        .from('invoices')
        .select('id, type')
        .eq('majstor_id', userId)
        .neq('status', 'dummy')

      if (invoices) {
        setStats(prev => ({
          ...prev,
          totalInvoices: invoices.filter(inv => inv.type === 'invoice').length
        }))
      }

      const { data: customers, error: customersError } = await supabase
        .from('customers')
        .select('id')
        .eq('majstor_id', userId)
        .neq('name', 'DUMMY_ENTRY_FOR_NUMBERING')

      if (!customersError && customers) {
        setStats(prev => ({
          ...prev,
          totalCustomers: customers.length || 0
        }))
      }

    } catch (err) {
      console.error('Error loading stats:', err)
    }
  }

  useEffect(() => {
    if (majstor?.id) {
      const interval = setInterval(() => loadStats(majstor.id), 30000)
      return () => clearInterval(interval)
    }
  }, [majstor?.id])

  const handleProtectedFeatureClick = (feature, featureName) => {
    showUpgradeModal(feature, featureName, 'Freemium')
  }

  const WelcomeMessage = () => {
    if (!welcomeMessage) return null

    return (
      <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20 rounded-2xl p-6 mb-6">
        <div className="flex items-center space-x-4">
          <div className="text-4xl">👋</div>
          <div>
            <h3 className="text-xl font-bold text-white mb-2">Willkommen bei pro-meister.de!</h3>
            <p className="text-slate-300">
              Verwalten Sie Ihre Kunden, Rechnungen und Geschäftsprozesse zentral an einem Ort.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // 🔥 NOVO: Upgrade Processing Modal
  const UpgradeProcessingModal = () => {
    if (!upgradingInProgress) return null

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
        <div className="bg-slate-800 rounded-2xl p-8 max-w-md w-full mx-4 border border-slate-700 shadow-2xl">
          
          {/* Icon */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mb-4 animate-pulse">
              <span className="text-4xl">💎</span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              PRO Upgrade läuft...
            </h2>
            <p className="text-slate-400 text-sm">
              Bitte einen Moment Geduld, während wir Ihre Mitgliedschaft aktivieren
            </p>
          </div>

          {/* Progress Message */}
          <div className="mb-4">
            <p className="text-center text-blue-300 font-medium mb-3 animate-pulse">
              {upgradeMessage}
            </p>
            
            {/* Progress Bar */}
            <div className="bg-slate-700 rounded-full h-3 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-blue-500 to-purple-600 h-full transition-all duration-500 ease-out"
                style={{ width: `${upgradeProgress}%` }}
              />
            </div>
            
            {/* Progress Percentage */}
            <p className="text-center text-slate-400 text-sm mt-2">
              {Math.round(upgradeProgress)}%
            </p>
          </div>

          {/* Info */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mt-6">
            <div className="flex items-start gap-3">
              <span className="text-xl">ℹ️</span>
              <div className="text-xs text-blue-200">
                <p className="mb-1">
                  ✅ Zahlung erfolgreich
                </p>
                <p>
                  🔄 Synchronisierung mit Paddle läuft...
                </p>
              </div>
            </div>
          </div>

          {/* Loading Spinner */}
          <div className="flex justify-center mt-6">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
          </div>
        </div>
      </div>
    )
  }

  const ProtectedNavItem = ({ feature, href, icon, title, description, buttonText, isAlwaysFree = false }) => {
    if (isAlwaysFree) {
      return (
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-2xl mb-4">
            {icon}
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
          <p className="text-slate-400 text-sm mb-4">{description}</p>
          <Link
            href={href}
            className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors"
          >
            {buttonText}
          </Link>
        </div>
      )
    }

    return (
      <SubscriptionGuard
        feature={feature}
        majstorId={majstor?.id}
        fallback={
          <div className="bg-slate-800/50 border border-slate-600 rounded-2xl p-6 relative">
            <div className="w-12 h-12 bg-slate-600 rounded-xl flex items-center justify-center text-2xl mb-4 opacity-75">
              {icon}
            </div>
            <h3 className="text-lg font-semibold text-slate-400 mb-2">{title}</h3>
            <p className="text-slate-500 text-sm mb-4">{description}</p>
            <button
              onClick={() => {
                const featureNames = {
                  'customer_management': 'Kundenverwaltung',
                  'customer_inquiries': 'Kundenanfragen',
                  'invoicing': 'Rechnungen & Angebote',
                  'services_management': 'Services Verwaltung',
                  'pdf_archive': 'PDF Archiv'
                }
                handleProtectedFeatureClick(feature, featureNames[feature] || title)
              }}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors"
            >
              🔒 Jetzt freischalten
            </button>
            <div className="absolute top-3 right-3">
              <span className="px-2 py-1 text-xs bg-blue-600 text-white rounded-full font-medium">
                Pro
              </span>
            </div>
          </div>
        }
        showUpgradePrompt={false}
      >
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-2xl mb-4">
            {icon}
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
          <p className="text-slate-400 text-sm mb-4">{description}</p>
          <Link
            href={href}
            className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors"
          >
            {buttonText}
          </Link>
        </div>
      </SubscriptionGuard>
    )
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

  if (!majstor) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">Profil nicht gefunden</div>
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
    <>
      {/* 🔥 NOVO: Upgrade Processing Modal */}
      <UpgradeProcessingModal />
    
      <div className="space-y-8">
        <WelcomeMessage />

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          
          {/* Kundenanfragen */}
          <Link 
            href="/dashboard/inquiries"
            className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 hover:border-blue-500 hover:shadow-lg transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Kundenanfragen</p>
                <p className="text-3xl font-bold text-white group-hover:text-blue-400 transition-colors">
                  {stats.totalInquiries}
                </p>
                <p className="text-sm text-slate-400">
                  {stats.newInquiries} neue
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                📩
              </div>
            </div>
          </Link>

          {/* Rechnungen */}
          <Link
            href="/dashboard/invoices"
            className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 hover:border-purple-500 hover:shadow-lg transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Rechnungen</p>
                <p className="text-3xl font-bold text-white group-hover:text-purple-400 transition-colors">
                  {stats.totalInvoices}
                </p>
                <p className="text-sm text-slate-400">Erstellt</p>
              </div>
              <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                📄
              </div>
            </div>
          </Link>

          {/* Kunden */}
          <Link
            href="/dashboard/customers"
            className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 hover:border-green-500 hover:shadow-lg transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Kunden</p>
                <p className="text-3xl font-bold text-white group-hover:text-green-400 transition-colors">
                  {stats.totalCustomers}
                </p>
                <p className="text-sm text-slate-400">Registriert</p>
              </div>
              <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                👥
              </div>
            </div>
          </Link>

          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">QR Scans</p>
                <p className="text-3xl font-bold text-white">{stats.qrScans}</p>
                <p className="text-sm text-slate-400">Heute</p>
              </div>
              <div className="w-12 h-12 bg-orange-600 rounded-xl flex items-center justify-center text-2xl">
                📱
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-6">Schnellzugriff</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <ProtectedNavItem
              isAlwaysFree={true}
              href="/dashboard/business-card/create"
              icon="📱"
              title="QR Visitenkarte erstellen"
              description="Erstellen Sie Ihre digitale Visitenkarte mit QR-Code für Kunden"
              buttonText="Jetzt erstellen"
            />

            <ProtectedNavItem
              feature="invoicing"
              href="/dashboard/invoices"
              icon="📄"
              title={stats.totalInvoices === 0 ? 'Erste Rechnung' : 'Neue Rechnung'}
              description={stats.totalInvoices === 0 
                ? 'Erstellen Sie eine professionelle PDF-Rechnung für Ihre Kunden'
                : 'Erstellen Sie eine neue Rechnung oder ein Angebot'
              }
              buttonText="Rechnung erstellen"
            />
          </div>
        </div>

        {/* Navigation Menu */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-6">Dashboard Navigation</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            
            <SubscriptionGuard
              feature="customer_management"
              majstorId={majstor?.id}
              fallback={
                <button
                  onClick={() => handleProtectedFeatureClick('customer_management', 'Kundenverwaltung')}
                  className="bg-slate-800/50 border border-slate-600 rounded-lg p-4 hover:border-slate-500 transition-colors group relative"
                >
                  <div className="text-2xl mb-2 opacity-60">👥</div>
                  <div className="text-slate-400 font-medium text-sm group-hover:text-slate-300 transition-colors">
                    Meine Kunden
                  </div>
                  <span className="absolute top-2 right-2 px-1 py-0.5 text-xs bg-blue-600 text-white rounded font-medium">
                    🔒 Pro
                  </span>
                </button>
              }
              showUpgradePrompt={false}
            >
              <Link
                href="/dashboard/customers"
                className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition-colors group"
              >
                <div className="text-2xl mb-2">👥</div>
                <div className="text-white font-medium text-sm group-hover:text-blue-300 transition-colors">
                  Meine Kunden
                </div>
              </Link>
            </SubscriptionGuard>

            <Link
              href="/dashboard/inquiries"
              className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition-colors relative group"
            >
              <div className="text-2xl mb-2">📩</div>
              <div className="text-white font-medium text-sm group-hover:text-blue-300 transition-colors">
                Kundenanfragen
              </div>
              {stats.newInquiries > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {stats.newInquiries > 9 ? '9+' : stats.newInquiries}
                </span>
              )}
            </Link>

            <SubscriptionGuard
              feature="invoicing"
              majstorId={majstor?.id}
              fallback={
                <button
                  onClick={() => handleProtectedFeatureClick('invoicing', 'Rechnungen & Angebote')}
                  className="bg-slate-800/50 border border-slate-600 rounded-lg p-4 hover:border-slate-500 transition-colors group relative"
                >
                  <div className="text-2xl mb-2 opacity-60">📄</div>
                  <div className="text-slate-400 font-medium text-sm group-hover:text-slate-300 transition-colors">
                    Rechnungen
                  </div>
                  <span className="absolute top-2 right-2 px-1 py-0.5 text-xs bg-blue-600 text-white rounded font-medium">
                    🔒 Pro
                  </span>
                </button>
              }
              showUpgradePrompt={false}
            >
              <Link
                href="/dashboard/invoices"
                className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition-colors group"
              >
                <div className="text-2xl mb-2">📄</div>
                <div className="text-white font-medium text-sm group-hover:text-blue-300 transition-colors">
                  Rechnungen
                </div>
              </Link>
            </SubscriptionGuard>

            <SubscriptionGuard
              feature="services_management"
              majstorId={majstor?.id}
              fallback={
                <button
                  onClick={() => handleProtectedFeatureClick('services_management', 'Services Verwaltung')}
                  className="bg-slate-800/50 border border-slate-600 rounded-lg p-4 hover:border-slate-500 transition-colors group relative"
                >
                  <div className="text-2xl mb-2 opacity-60">🔧</div>
                  <div className="text-slate-400 font-medium text-sm group-hover:text-slate-300 transition-colors">
                    Meine Services
                  </div>
                  <span className="absolute top-2 right-2 px-1 py-0.5 text-xs bg-blue-600 text-white rounded font-medium">
                    🔒 Pro
                  </span>
                </button>
              }
              showUpgradePrompt={false}
            >
              <Link
                href="/dashboard/services"
                className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition-colors group"
              >
                <div className="text-2xl mb-2">🔧</div>
                <div className="text-white font-medium text-sm group-hover:text-blue-300 transition-colors">
                  Meine Services
                </div>
              </Link>
            </SubscriptionGuard>

            <SubscriptionGuard
              feature="pdf_archive"
              majstorId={majstor?.id}
              fallback={
                <button
                  onClick={() => handleProtectedFeatureClick('pdf_archive', 'PDF Archiv')}
                  className="bg-slate-800/50 border border-slate-600 rounded-lg p-4 hover:border-slate-500 transition-colors group relative"
                >
                  <div className="text-2xl mb-2 opacity-60">🗂️</div>
                  <div className="text-slate-400 font-medium text-sm group-hover:text-slate-300 transition-colors">
                    PDF Archiv
                  </div>
                  <span className="absolute top-2 right-2 px-1 py-0.5 text-xs bg-blue-600 text-white rounded font-medium">
                    🔒 Pro
                  </span>
                </button>
              }
              showUpgradePrompt={false}
            >
              <Link
                href="/dashboard/pdf-archive"
                className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition-colors group"
              >
                <div className="text-2xl mb-2">🗂️</div>
                <div className="text-white font-medium text-sm group-hover:text-blue-300 transition-colors">
                  PDF Archiv
                </div>
              </Link>
            </SubscriptionGuard>

            <SubscriptionGuard
              feature="settings"
              majstorId={majstor?.id}
              fallback={
                <button
                  onClick={() => handleProtectedFeatureClick('settings', 'Erweiterte Einstellungen')}
                  className="bg-slate-800/50 border border-slate-600 rounded-lg p-4 hover:border-slate-500 transition-colors group relative"
                >
                  <div className="text-2xl mb-2 opacity-60">⚙️</div>
                  <div className="text-slate-400 font-medium text-sm group-hover:text-slate-300 transition-colors">
                    Einstellungen
                  </div>
                  <span className="absolute top-2 right-2 px-1 py-0.5 text-xs bg-blue-600 text-white rounded font-medium">
                    🔒 Pro
                  </span>
                </button>
              }
              showUpgradePrompt={false}
            >
              <Link
                href="/dashboard/settings"
                className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition-colors group"
              >
                <div className="text-2xl mb-2">⚙️</div>
                <div className="text-white font-medium text-sm group-hover:text-blue-300 transition-colors">
                  Einstellungen
                </div>
              </Link>
            </SubscriptionGuard>
          </div>
        </div>

        <UpgradeModal
          isOpen={upgradeModalOpen}
          onClose={hideUpgradeModal}
          feature={modalProps.feature}
          featureName={modalProps.featureName}
          currentPlan={modalProps.currentPlan}
        />
      </div>
    </>
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