// app/dashboard/page.js - CLEAN VERSION (No Subscription Guards)

'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import OnboardingWizard from '@/app/components/OnboardingWizard'

function DashboardPageContent() {
  // Core data states
  const [majstor, setMajstor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  // Stats state
  const [stats, setStats] = useState({
    totalInquiries: 0,
    newInquiries: 0,
    totalInvoices: 0,
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
              <p className="text-slate-400 text-sm">Kunden</p>
              <p className="text-3xl font-bold text-white">-</p>
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

          {/* Invoice Creation */}
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
            <Link
              href="/dashboard/invoices"
              className="inline-block bg-purple-600 text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-purple-700 transition-colors"
            >
              Rechnung erstellen
            </Link>
          </div>
        </div>
      </div>

      {/* Navigation Menu - All features available */}
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
          </Link>

          <Link
            href="/dashboard/inquiries"
            className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition-colors relative group"
          >
            <div className="text-2xl mb-2">📧</div>
            <div className="text-white font-medium text-sm group-hover:text-blue-300 transition-colors">
              Kundenanfragen
            </div>
            {stats.newInquiries > 0 && (
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
          </Link>

          <Link
            href="/dashboard/services"
            className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition-colors group"
          >
            <div className="text-2xl mb-2">🔧</div>
            <div className="text-white font-medium text-sm group-hover:text-blue-300 transition-colors">
              Meine Services
            </div>
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
          </Link>

          <Link
            href="/dashboard/planner"
            className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition-colors group"
          >
            <div className="text-2xl mb-2">📅</div>
            <div className="text-white font-medium text-sm group-hover:text-blue-300 transition-colors">
              Planner
            </div>
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
      <OnboardingWizard majstor={majstor} />
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