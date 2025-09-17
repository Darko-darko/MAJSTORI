// app/dashboard/layout.js - UPDATED FOR TRIAL STRATEGY

'use client'
import { useState, useEffect , Suspense } from 'react'
import { useRouter, useSearchParams} from 'next/navigation'
import { auth, majstorsAPI, supabase } from '@/lib/supabase'
import Link from 'next/link'

function DashboardLayoutContent({ children }) {  // <- DODAJ children prop
  const [user, setUser] = useState(null)
  const [majstor, setMajstor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  
  // Trial tracking states
  const [trialInfo, setTrialInfo] = useState({
    isTrialUser: false,
    daysRemaining: 0,
    expiresAt: null
  })
  
  // Badge states
  const [badges, setBadges] = useState({
    inquiries: 0,
    invoices: 0,
    warranties: 0
  })
  
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    if (majstor?.id) {
      loadBadgeCounts()
      calculateTrialInfo()
      
      // Refresh every 2 minutes
      const interval = setInterval(() => {
        loadBadgeCounts()
        calculateTrialInfo()
      }, 2 * 60 * 1000)
      
      return () => clearInterval(interval)
    }
  }, [majstor?.id])

  // 🎯 Calculate trial information
  const calculateTrialInfo = () => {
    if (!majstor) return

    const isTrialUser = majstor.subscription_status === 'trial'
    if (!isTrialUser) {
      setTrialInfo({ isTrialUser: false, daysRemaining: 0, expiresAt: null })
      return
    }

    const now = new Date()
    const expiresAt = new Date(majstor.subscription_ends_at)
    const diffTime = expiresAt.getTime() - now.getTime()
    const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))

    setTrialInfo({
      isTrialUser: true,
      daysRemaining,
      expiresAt: majstor.subscription_ends_at
    })

    console.log('🎯 Trial info calculated:', { daysRemaining, expiresAt: majstor.subscription_ends_at })
  }

  const loadBadgeCounts = async () => {
    if (!majstor?.id) return

    try {
      const [inquiriesResult, invoicesResult, warrantiesResult] = await Promise.all([
        supabase
          .from('inquiries')
          .select('id', { count: 'exact', head: true })
          .eq('majstor_id', majstor.id)
          .eq('status', 'new'),

        supabase
          .from('invoices')
          .select('id', { count: 'exact', head: true })
          .eq('majstor_id', majstor.id)
          .eq('status', 'draft'),

        supabase
          .from('warranties')
          .select('id', { count: 'exact', head: true })
          .eq('majstor_id', majstor.id)
          .eq('status', 'active')
          .lte('end_date', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      ])

      setBadges({
        inquiries: inquiriesResult.count || 0,
        invoices: invoicesResult.count || 0, 
        warranties: warrantiesResult.count || 0
      })

    } catch (error) {
      console.error('❌ Error loading badge counts:', error)
    }
  }

  const checkUser = async () => {
    try {
      console.log('🔍 Checking user authentication...')
      
      const { user: currentUser, error: authError } = await auth.getUser()
      
      if (authError) {
        console.error('❌ Auth error:', authError)
        router.push('/login')
        return
      }
      
      if (!currentUser) {
        console.log('❌ No user found, redirecting to login')
        router.push('/login')
        return
      }

      console.log('✅ User authenticated:', currentUser.email)
      setUser(currentUser)

      // Load majstor profile
      const { data: majstorData, error: majstorError } = await majstorsAPI.getById(currentUser.id)
      
      if (majstorError) {
        console.error('❌ Majstor profile error:', majstorError)
        
        if (majstorError.code === 'PGRST116' || majstorError.message?.includes('0 rows')) {
          // No profile - create one
          console.log('🛠️ Creating missing profile...')
          await createMissingProfile(currentUser)
        } else {
          setError('Profile access error: ' + majstorError.message)
        }
      } else {
        console.log('✅ Majstor profile loaded:', majstorData.full_name)
        setMajstor(majstorData)
      }

    } catch (error) {
      console.error('❌ Unexpected error in checkUser:', error)
      setError('Unexpected error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const createMissingProfile = async (user) => {
    try {
      console.log('🛠️ Creating missing profile for:', user.email)
      
      const displayName = user.user_metadata?.full_name || 
                         user.user_metadata?.name || 
                         user.email?.split('@')[0] || 
                         'Handwerker'
      
      const profileData = {
        id: user.id,
        email: user.email,
        full_name: displayName,
        business_name: user.user_metadata?.business_name || null,
        phone: user.user_metadata?.phone || null,
        city: user.user_metadata?.city || null,
        subscription_status: 'trial',
        subscription_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        is_active: true,
        profile_completed: false,
        profile_source: user.user_metadata?.provider === 'google' ? 'google_oauth' : 'missing_profile'
      }

      const response = await fetch('/api/create-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData)
      })

      if (response.ok) {
        const result = await response.json()
        console.log('✅ Missing profile created successfully')
        setMajstor(result.profile)
        setError('')
      } else {
        const errorData = await response.json()
        console.error('❌ Profile creation failed:', errorData)
        setError('Failed to create profile: ' + errorData.error)
      }
      
    } catch (err) {
      console.error('❌ Exception in createMissingProfile:', err)
      setError('Profile creation failed: ' + err.message)
    }
  }

  const handleSignOut = async () => {
    try {
      await auth.signOut()
      router.push('/')
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  const formatBadgeCount = (count) => {
    if (count === 0) return null
    if (count > 99) return '99+'
    return count.toString()
  }

  // 🔥 SMART NAVIGATION - different for trial users
  const getNavigation = () => {
    const baseNavigation = [
      { name: 'Übersicht', href: '/dashboard', icon: '📊' },
      { name: 'Meine Kunden', href: '/dashboard/customers', icon: '👥' },
      { name: 'QR Visitenkarte', href: '/dashboard/business-card/create', icon: '📱' },
    ]

    // Core features available in trial
    const coreFeatures = [
      { 
        name: 'Kundenanfragen', 
        href: '/dashboard/inquiries', 
        icon: '📧', 
        badge: formatBadgeCount(badges.inquiries),
        badgeColor: 'bg-red-500'
      },
      { 
        name: 'Rechnungen', 
        href: '/dashboard/invoices', 
        icon: '📄',
        badge: formatBadgeCount(badges.invoices),
        badgeColor: 'bg-yellow-500'
      }
    ]

    // Advanced features (limited in trial)
    const advancedFeatures = [
      { name: 'Meine Services', href: '/dashboard/services', icon: '🔧' },
      { 
        name: 'Garantien', 
        href: '/dashboard/warranties', 
        icon: '🛡️',
        badge: formatBadgeCount(badges.warranties),
        badgeColor: 'bg-orange-500'
      },
      { name: 'Empfehlungen', href: '/dashboard/referrals', icon: '🎯' },
      { name: 'Analytics', href: '/dashboard/analytics', icon: '📈' },
      { name: 'Einstellungen', href: '/dashboard/settings', icon: '⚙️' }
    ]

    return [...baseNavigation, ...coreFeatures, ...advancedFeatures]
  }

  // 🎯 Trial Banner Component
  const TrialBanner = () => {
    if (!trialInfo.isTrialUser) return null

    const isExpiringSoon = trialInfo.daysRemaining <= 2
    const bannerColor = isExpiringSoon ? 'from-red-500/20 to-orange-500/20' : 'from-blue-500/20 to-purple-500/20'
    const textColor = isExpiringSoon ? 'text-red-300' : 'text-blue-300'

    return (
      <div className={`bg-gradient-to-r ${bannerColor} border ${isExpiringSoon ? 'border-red-500/30' : 'border-blue-500/30'} rounded-lg p-4 mb-6`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isExpiringSoon ? 'bg-red-500' : 'bg-blue-500'}`}>
              {isExpiringSoon ? '⚠️' : '🎯'}
            </div>
            <div>
              <h4 className={`font-semibold ${textColor}`}>
                {isExpiringSoon ? '⚠️ Trial läuft bald ab!' : '🎯 Kostenlose Testphase aktiv'}
              </h4>
              <p className="text-slate-400 text-sm">
                {trialInfo.daysRemaining > 0 
                  ? `Noch ${trialInfo.daysRemaining} Tag${trialInfo.daysRemaining > 1 ? 'e' : ''} kostenlos` 
                  : 'Trial ist abgelaufen'
                }
              </p>
            </div>
          </div>
          <button className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
            isExpiringSoon 
              ? 'bg-red-600 hover:bg-red-700 text-white' 
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}>
            {isExpiringSoon ? 'Jetzt upgraden' : 'Mehr erfahren'}
          </button>
        </div>
      </div>
    )
  }

  const NavigationItem = ({ item, isMobile = false }) => (
    <Link
      key={item.name}
      href={item.href}
      onClick={isMobile ? () => setSidebarOpen(false) : undefined}
      className="group flex items-center px-3 py-2 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
    >
      <span className="mr-3 text-lg">{item.icon}</span>
      <span className="flex-1">{item.name}</span>
      {item.badge && (
        <span className={`ml-2 px-2 py-1 text-xs ${item.badgeColor || 'bg-red-500'} text-white rounded-full font-medium`}>
          {item.badge}
        </span>
      )}
    </Link>
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-xl mb-4">Laden...</div>
          <div className="text-slate-400 text-sm">Überprüfung der Benutzerauthentifizierung...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-red-500/10 border border-red-500/20 rounded-lg p-6">
          <h2 className="text-red-400 text-xl font-semibold mb-4">Dashboard Fehler</h2>
          <p className="text-red-300 mb-6">{error}</p>
          <div className="space-y-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
            >
              Erneut versuchen
            </button>
            <button
              onClick={() => router.push('/login')}
              className="w-full bg-slate-600 text-white py-2 rounded-lg hover:bg-slate-700"
            >
              Zurück zur Anmeldung
            </button>
          </div>
        </div>
      </div>
    )
  }

  const navigation = getNavigation()

  return (
    <div className="min-h-screen bg-slate-900 flex">
      
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <div className="flex flex-col w-64 bg-slate-800 border-r border-slate-700">
          
          {/* Logo */}
          <div className="flex items-center h-16 px-4 border-b border-slate-700">
            <Link href="/" className="text-xl font-bold text-white">
              Pro-meister<span className="text-blue-400">.de</span>
            </Link>
          </div>

          {/* User Info */}
          <div className="px-4 py-4 border-b border-slate-700">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                {majstor?.full_name?.charAt(0) || user?.email?.charAt(0) || 'M'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {majstor?.full_name || user?.email || 'Loading...'}
                </p>
                <p className="text-xs text-slate-400 truncate">
                  {majstor?.business_name || 'Handwerker'}
                </p>
              </div>
            </div>

            {/* Trial Status */}
            {trialInfo.isTrialUser && (
              <div className="mt-3 px-2 py-1 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded text-center">
                <p className="text-xs text-blue-300 font-medium">
                  🎯 Trial: {trialInfo.daysRemaining} Tag{trialInfo.daysRemaining !== 1 ? 'e' : ''} übrig
                </p>
              </div>
            )}
          </div>

          {/* Desktop Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => (
              <NavigationItem key={item.name} item={item} />
            ))}
          </nav>

          {/* Sign Out */}
          <div className="p-2 border-t border-slate-700">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-700 rounded-md transition-colors"
            >
              <span className="mr-3">🚪</span>
              Abmelden
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar */}
      <div className={`lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-slate-800 border-r border-slate-700 transform transition-transform duration-300 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Mobile Header */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-slate-700">
            <Link href="/" className="text-xl font-bold text-white">
              Pro-meister<span className="text-blue-400">.de</span>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          {/* Mobile User Info */}
          <div className="px-4 py-4 border-b border-slate-700">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                {majstor?.full_name?.charAt(0) || user?.email?.charAt(0) || 'M'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {majstor?.full_name || user?.email || 'Loading...'}
                </p>
                <p className="text-xs text-slate-400 truncate">
                  {majstor?.business_name || 'Handwerker'}
                </p>
              </div>
            </div>
          </div>

          {/* Mobile Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => (
              <NavigationItem key={item.name} item={item} isMobile={true} />
            ))}
          </nav>

          {/* Mobile Sign Out */}
          <div className="p-2 border-t border-slate-700">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-700 rounded-md transition-colors"
            >
              <span className="mr-3">🚪</span>
              Abmelden
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* Top Bar */}
        <header className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700 px-4 py-3 lg:px-6 lg:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Mobile menu button */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-slate-400 hover:text-white p-1"
              >
                <span className="text-xl">☰</span>
              </button>
              
              <div>
                <h1 className="text-xl font-semibold text-white">
                  Handwerker Dashboard
                </h1>
                <p className="text-sm text-slate-400 hidden sm:block">
                  {trialInfo.isTrialUser 
                    ? `Kostenlose Testphase - noch ${trialInfo.daysRemaining} Tage` 
                    : 'Verwalten Sie Ihre Kunden und Aufträge'
                  }
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* Notifications */}
              <button 
                className="relative p-2 text-slate-400 hover:text-white transition-colors"
                onClick={loadBadgeCounts}
                title="Refresh notifications"
              >
                <span className="text-xl">🔔</span>
                {(badges.inquiries + badges.invoices + badges.warranties) > 0 && (
                  <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
                )}
              </button>

              {/* Profile */}
              <Link 
                href="/dashboard/settings"
                className="flex items-center space-x-2 text-slate-400 hover:text-white transition-colors"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                  {majstor?.full_name?.charAt(0) || user?.email?.charAt(0) || 'M'}
                </div>
              </Link>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-slate-900 p-4 lg:p-6">
          {/* Trial Banner */}
          <TrialBanner />
          
          {children}
        </main>
      </div>
    </div>
  )
}
export default function DashboardLayout({ children }) {  // <- children prop
  return (
    <Suspense fallback={<div className="text-white">Laden...</div>}>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </Suspense>
  )
}