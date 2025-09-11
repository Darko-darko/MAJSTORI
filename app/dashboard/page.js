// app/dashboard/page.js - UPDATED WITH TRIAL WELCOME & ONBOARDING

'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import OnboardingWizard from '@/app/components/OnboardingWizard'

function DashboardPageContent() {
  const [welcomeMessage, setWelcomeMessage] = useState(false)
  const [trialWelcome, setTrialWelcome] = useState(false)
  const [majstor, setMajstor] = useState(null)
  const [stats, setStats] = useState({
    totalInquiries: 0,
    newInquiries: 0,
    totalInvoices: 0,
    qrScans: 0
  })
  const [loading, setLoading] = useState(true)
  const [trialInfo, setTrialInfo] = useState({
    isTrialUser: false,
    daysRemaining: 0,
    expiresAt: null
  })
  const searchParams = useSearchParams()

  useEffect(() => {
    // Check URL parameters for welcome states
    if (searchParams.get('welcome')) {
      setWelcomeMessage(true)
      setTimeout(() => setWelcomeMessage(false), 8000) // Hide after 8 seconds
    }
    
    if (searchParams.get('trial')) {
      setTrialWelcome(true)
      setTimeout(() => setTrialWelcome(false), 10000) // Hide after 10 seconds
    }
    
    loadMajstorAndStats()
  }, [searchParams])

  const loadMajstorAndStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Load majstor profile
      const { data: majstorData, error: majstorError } = await supabase
        .from('majstors')
        .select('*')
        .eq('id', user.id)
        .single()

      if (!majstorError && majstorData) {
        setMajstor(majstorData)
        calculateTrialInfo(majstorData)
      }

      // Load stats
      await loadStats(user.id)
      
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

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

      if (!inquiriesError) {
        const newInquiries = inquiries?.filter(i => i.status === 'new').length || 0
        setStats(prev => ({
          ...prev,
          totalInquiries: inquiries?.length || 0,
          newInquiries
        }))
      }

      // Load invoices stats
      const { data: invoices } = await supabase
        .from('invoices')
        .select('id, type')
        .eq('majstor_id', userId)

      if (invoices) {
        setStats(prev => ({
          ...prev,
          totalInvoices: invoices.length
        }))
      }

    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  // Refresh stats periodically
  useEffect(() => {
    if (majstor?.id) {
      const interval = setInterval(() => loadStats(majstor.id), 30000)
      return () => clearInterval(interval)
    }
  }, [majstor?.id])

  // 🎯 Trial-specific welcome message
  const TrialWelcomeMessage = () => {
    if (!trialWelcome || !trialInfo.isTrialUser) return null

    const signupSource = searchParams.get('source')
    const isGoogleUser = signupSource === 'google'

    return (
      <div className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-green-500/10 border border-blue-500/20 rounded-2xl p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="text-4xl">🎉</div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-white mb-2">
              {isGoogleUser ? 'Willkommen bei Majstori.de!' : 'Registrierung erfolgreich!'}
            </h3>
            <div className="space-y-2 text-slate-300">
              <p>
                🎯 <strong>Kostenlose 7-Tage-Testphase</strong> ist jetzt aktiv! 
                Noch <strong>{trialInfo.daysRemaining} Tage</strong> um alle Funktionen zu testen.
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
                  <span>Garantieverwaltung</span>
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

  // 🎯 Regular welcome message (for returning users)
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

  return (
    <div className="space-y-8">
      {/* Welcome Messages */}
      <TrialWelcomeMessage />
      <RegularWelcomeMessage />

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Kundenanfragen</p>
              <p className="text-3xl font-bold text-white">{loading ? '-' : stats.totalInquiries}</p>
              <p className="text-sm text-slate-400">
                {loading ? 'Laden...' : `${stats.newInquiries} neue`}
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
              <p className="text-3xl font-bold text-white">{loading ? '-' : stats.totalInvoices}</p>
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
              <p className="text-3xl font-bold text-white">{loading ? '-' : stats.qrScans}</p>
              <p className="text-sm text-slate-400">Heute</p>
            </div>
            <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center text-2xl">
              📱
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-6">
          {trialInfo.isTrialUser ? 'Erste Schritte in Ihrer Testphase' : 'Schnellzugriff'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
            <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center text-2xl mb-4">
              📄
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Erste Rechnung</h3>
            <p className="text-slate-400 text-sm mb-4">
              Erstellen Sie eine professionelle PDF-Rechnung für Ihre Kunden
            </p>
            <Link
              href="/dashboard/invoices"
              className="inline-block bg-purple-600 text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-purple-700 transition-colors"
            >
              Rechnung erstellen
            </Link>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-6">Dashboard Navigation</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <Link
            href="/dashboard/customers"
            className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition-colors"
          >
            <div className="text-2xl mb-2">👥</div>
            <div className="text-white font-medium text-sm">Meine Kunden</div>
          </Link>

          <Link
            href="/dashboard/inquiries"
            className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition-colors relative"
          >
            <div className="text-2xl mb-2">📧</div>
            <div className="text-white font-medium text-sm">Kundenanfragen</div>
            {stats.newInquiries > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {stats.newInquiries > 9 ? '9+' : stats.newInquiries}
              </span>
            )}
          </Link>

          <Link
            href="/dashboard/invoices"
            className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition-colors"
          >
            <div className="text-2xl mb-2">📄</div>
            <div className="text-white font-medium text-sm">Rechnungen</div>
          </Link>

          <Link
            href="/dashboard/warranties"
            className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition-colors"
          >
            <div className="text-2xl mb-2">🛡️</div>
            <div className="text-white font-medium text-sm">Garantien</div>
          </Link>

          <Link
            href="/dashboard/services"
            className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition-colors"
          >
            <div className="text-2xl mb-2">🔧</div>
            <div className="text-white font-medium text-sm">Meine Services</div>
          </Link>

          <Link
            href="/dashboard/referrals"
            className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition-colors"
          >
            <div className="text-2xl mb-2">🎯</div>
            <div className="text-white font-medium text-sm">Empfehlungen</div>
          </Link>

          <Link
            href="/dashboard/analytics"
            className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition-colors"
          >
            <div className="text-2xl mb-2">📈</div>
            <div className="text-white font-medium text-sm">Analytics</div>
          </Link>

          <Link
            href="/dashboard/settings"
            className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition-colors"
          >
            <div className="text-2xl mb-2">⚙️</div>
            <div className="text-white font-medium text-sm">Einstellungen</div>
          </Link>
        </div>
      </div>

      {/* Trial Status Card */}
      {trialInfo.isTrialUser && (
        <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-blue-300 mb-2">
                🎯 Testphase aktiv
              </h3>
              <p className="text-slate-300">
                Noch <strong>{trialInfo.daysRemaining} Tage</strong> um alle Funktionen zu testen. 
                Danach nur €19/Monat für unbegrenzten Zugang.
              </p>
            </div>
            <button className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
              Mehr erfahren
            </button>
          </div>
        </div>
      )}

      {/* Onboarding Wizard */}
      <OnboardingWizard majstor={majstor} trialInfo={trialInfo} />
    </div>
  )
}
export default function DashboardPage() {  // ili InvoicesPage
  return (
    <Suspense fallback={<div className="text-white">Laden...</div>}>
      <DashboardPageContent />
    </Suspense>
  )
}