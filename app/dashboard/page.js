// app/dashboard/page.js - UPDATED WITH SUBSCRIPTION PROTECTION

'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { SubscriptionGuard } from '@/app/components/subscription/SubscriptionGuard'
import { UpgradeModal, useUpgradeModal } from '@/app/components/subscription/UpgradeModal'
import Link from 'next/link'
import OnboardingWizard from '@/app/components/OnboardingWizard'

function DashboardPageContent() {
  // Core data states
  const [majstor, setMajstor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  // 🔥 NEW: Upgrade Modal Hook
  const { isOpen: upgradeModalOpen, modalProps, showUpgradeModal, hideUpgradeModal } = useUpgradeModal()
  
  // Stats state
  const [stats, setStats] = useState({
    totalInquiries: 0,
    newInquiries: 0,
    totalInvoices: 0,
     totalCustomers: 0, // Dodaj ovo
    qrScans: 0
  })

  // Welcome states
  const [welcomeMessage, setWelcomeMessage] = useState(false)
  
  const searchParams = useSearchParams()

  // Handle URL parameters and load data
  useEffect(() => {
    if (searchParams.get('welcome')) {
      setWelcomeMessage(true)
      setTimeout(() => setWelcomeMessage(false), 8000)
    }
    
    loadMajstorAndStats()
  }, [searchParams])

  const loadMajstorAndStats = async () => {
    try {
      setLoading(true)
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

    // ADDED: Load customers stats
    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select('id')
      .eq('majstor_id', userId)
      .neq('name', 'DUMMY_ENTRY_FOR_NUMBERING') // Exclude dummy entries

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

  // Refresh stats periodically
  useEffect(() => {
    if (majstor?.id) {
      const interval = setInterval(() => loadStats(majstor.id), 30000)
      return () => clearInterval(interval)
    }
  }, [majstor?.id])

  // 🔥 NEW: Feature click handler for protected items
  const handleProtectedFeatureClick = (feature, featureName) => {
    showUpgradeModal(feature, featureName, 'Freemium')
  }

  // Welcome message
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

  // 🔥 UPDATED: Protected Navigation Item Component
  const ProtectedNavItem = ({ feature, href, icon, title, description, buttonText, isAlwaysFree = false }) => {
    if (isAlwaysFree) {
      // Free items - always accessible
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

    // Protected items
    return (
      <SubscriptionGuard
        feature={feature}
        majstorId={majstor?.id}
        fallback={
          // 🔒 LOCKED STATE - Clickable upgrade prompt
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
                  'pdf_archive': 'PDF Archiv',
                  //'analytics': 'Analytics & Berichte'
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
        {/* ✅ UNLOCKED STATE - Normal functionality */}
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

  // Loading states
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
    <div className="space-y-8">
      {/* Welcome Message */}
      <WelcomeMessage />

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
              📩
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
      <p className="text-slate-400 text-sm">Kunden</p>
      <p className="text-3xl font-bold text-white">{stats.totalCustomers}</p>
      <p className="text-sm text-slate-400">Registriert</p>
    </div>
    <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center text-2xl">
      👥
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
          
          {/* QR Business Card - Always Free */}
          <ProtectedNavItem
            isAlwaysFree={true}
            href="/dashboard/business-card/create"
            icon="📱"
            title="QR Visitenkarte erstellen"
            description="Erstellen Sie Ihre digitale Visitenkarte mit QR-Code für Kunden"
            buttonText="Jetzt erstellen"
          />

          {/* Invoice Creation - Protected */}
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

      {/* Navigation Menu - All features with protection */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-6">Dashboard Navigation</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          
          {/* 🔥 PROTECTED FEATURES */}
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

          <SubscriptionGuard
            feature="customer_inquiries"
            majstorId={majstor?.id}
            fallback={
              <button
                onClick={() => handleProtectedFeatureClick('customer_inquiries', 'Kundenanfragen')}
                className="bg-slate-800/50 border border-slate-600 rounded-lg p-4 hover:border-slate-500 transition-colors relative group"
              >
                <div className="text-2xl mb-2 opacity-60">📩</div>
                <div className="text-slate-400 font-medium text-sm group-hover:text-slate-300 transition-colors">
                  Kundenanfragen
                </div>
                <span className="absolute top-2 right-2 px-1 py-0.5 text-xs bg-blue-600 text-white rounded font-medium">
                  🔒 Pro
                </span>
              </button>
            }
            showUpgradePrompt={false}
          >
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
          </SubscriptionGuard>

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
              className="bg-slash-800/50 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition-colors group"
            >
              <div className="text-2xl mb-2">🔧</div>
              <div className="text-white font-medium text-sm group-hover:text-blue-300 transition-colors">
                Meine Services
              </div>
            </Link>
          </SubscriptionGuard>

          {/* 🔥 NEW: PDF Archive */}
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

          {/* <SubscriptionGuard
            feature="analytics"
            majstorId={majstor?.id}
            fallback={
              <button
                onClick={() => handleProtectedFeatureClick('analytics', 'Analytics & Berichte')}
                className="bg-slate-800/50 border border-slate-600 rounded-lg p-4 hover:border-slate-500 transition-colors group relative"
              >
                <div className="text-2xl mb-2 opacity-60">📈</div>
                <div className="text-slate-400 font-medium text-sm group-hover:text-slate-300 transition-colors">
                  Analytics
                </div>
                <span className="absolute top-2 right-2 px-1 py-0.5 text-xs bg-blue-600 text-white rounded font-medium">
                  🔒 Pro
                </span>
              </button>
            }
            showUpgradePrompt={false}
          >
            <Link
              href="/dashboard/analytics"
              className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition-colors group"
            >
              <div className="text-2xl mb-2">📈</div>
              <div className="text-white font-medium text-sm group-hover:text-blue-300 transition-colors">
                Analytics
              </div>
            </Link>
          </SubscriptionGuard>     */}

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

      {/* Onboarding Wizard */}
      <OnboardingWizard majstor={majstor} />

      {/* 🔥 UPGRADE MODAL */}
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