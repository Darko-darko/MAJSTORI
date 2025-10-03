// app/dashboard/layout.js - REFACTORED (NO TRIAL)
'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { auth, majstorsAPI, supabase } from '@/lib/supabase'
import { SubscriptionGuard } from '@/app/components/subscription/SubscriptionGuard'
import { UpgradeModal, useUpgradeModal } from '@/app/components/subscription/UpgradeModal'
import { useSubscription } from '@/lib/hooks/useSubscription'
import Link from 'next/link'

function DashboardLayoutContent({ children }) {
  const [user, setUser] = useState(null)
  const [majstor, setMajstor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  
  // Subscription hook for menu badges
  const { subscription, plan, isFreemium, isPaid } = useSubscription(majstor?.id)
  
  // Upgrade Modal Hook
  const { isOpen: upgradeModalOpen, modalProps, showUpgradeModal, hideUpgradeModal } = useUpgradeModal()
  
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
      
      const interval = setInterval(() => {
        loadBadgeCounts()
      }, 2 * 60 * 1000)
      
      return () => clearInterval(interval)
    }
  }, [majstor?.id])

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
          .select('id, due_date, status')
          .eq('majstor_id', majstor.id)
          .in('status', ['sent', 'draft'])
          .neq('status', 'dummy'),

        supabase
          .from('warranties')
          .select('id', { count: 'exact', head: true })
          .eq('majstor_id', majstor.id)
          .eq('status', 'active')
          .lte('end_date', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      ])

      let overdueCount = 0
      if (invoicesResult.data && !invoicesResult.error) {
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        overdueCount = invoicesResult.data.filter(invoice => {
          if (!invoice.due_date) return false
          const dueDate = new Date(invoice.due_date)
          dueDate.setHours(0, 0, 0, 0)
          return today > dueDate
        }).length
      }

      setBadges({
        inquiries: inquiriesResult.count || 0,
        invoices: overdueCount,
        warranties: warrantiesResult.count || 0
      })

    } catch (error) {
      console.error('Error loading badge counts:', error)
    }
  }

  const checkUser = async () => {
    try {
      const { user: currentUser, error: authError } = await auth.getUser()
      
      if (authError) {
        console.error('Auth error:', authError)
        router.push('/login')
        return
      }
      
      if (!currentUser) {
        console.log('No user found, redirecting to login')
        router.push('/login')
        return
      }

      setUser(currentUser)

      const { data: majstorData, error: majstorError } = await majstorsAPI.getById(currentUser.id)
      
      if (majstorError) {
        console.error('Majstor profile error:', majstorError)
        
        if (majstorError.code === 'PGRST116' || majstorError.message?.includes('0 rows')) {
          console.log('Creating missing profile...')
          await createMissingProfile(currentUser)
        } else {
          setError('Profile access error: ' + majstorError.message)
        }
      } else {
        setMajstor(majstorData)
      }

    } catch (error) {
      console.error('Unexpected error in checkUser:', error)
      setError('Unexpected error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const createMissingProfile = async (user) => {
    try {
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
        subscription_status: null,
        subscription_ends_at: null,
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
        setMajstor(result.profile)
        setError('')
      } else {
        const errorData = await response.json()
        setError('Failed to create profile: ' + errorData.error)
      }
      
    } catch (err) {
      console.error('Exception in createMissingProfile:', err)
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

  // Get subscription badge for menu item
  const getSubscriptionBadge = () => {
    if (!plan) return null
    
    if (isFreemium) {
      return {
        text: 'Upgrade',
        color: 'bg-gradient-to-r from-yellow-500 to-orange-500'
      }
    }
    
    // PRO with grace period
    if (isPaid && subscription?.current_period_end) {
      const now = new Date()
      const endDate = new Date(subscription.current_period_end)
      const diffTime = endDate.getTime() - now.getTime()
      const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      
      return {
        text: daysRemaining > 0 ? `PRO (${daysRemaining}d)` : 'PRO',
        color: 'bg-gradient-to-r from-green-500 to-emerald-500'
      }
    }
    
    if (isPaid) {
      return {
        text: 'PRO',
        color: 'bg-gradient-to-r from-green-500 to-emerald-500'
      }
    }
    
    return null
  }

  // Navigation with subscription item
  const getNavigation = () => {
    const baseNavigation = [
      { name: 'Übersicht', href: '/dashboard', icon: '📊', protected: false },
    ]

    const freeFeatures = [
      { 
        name: 'QR Visitenkarte', 
        href: '/dashboard/business-card/create', 
        icon: '📱', 
        protected: false
      },
      { 
        name: 'Kundenanfragen', 
        href: '/dashboard/inquiries', 
        icon: '📩', 
        badge: formatBadgeCount(badges.inquiries),
        badgeColor: 'bg-red-500',
        protected: false
      }
    ]

    const protectedFeatures = [
      { 
        name: 'Meine Kunden', 
        href: '/dashboard/customers', 
        icon: '👥', 
        protected: true,
        feature: 'customer_management'
      },
      { 
        name: 'Rechnungen', 
        href: '/dashboard/invoices', 
        icon: '📄',
        badge: formatBadgeCount(badges.invoices),
        badgeColor: 'bg-red-500',
        protected: true,
        feature: 'invoicing'
      },
      { 
        name: 'Meine Services', 
        href: '/dashboard/services', 
        icon: '🔧',
        protected: true,
        feature: 'services_management'
      },
      { 
        name: 'PDF Archiv', 
        href: '/dashboard/pdf-archive', 
        icon: '🗂️',
        protected: true,
        feature: 'pdf_archive'
      }
    ]

    // Subscription management item
    const subscriptionItem = {
      name: 'Meine Mitgliedschaft',
      href: '/dashboard/subscription',
      icon: '💎',
      protected: false,
      isSeparator: true,
      badge: getSubscriptionBadge()
    }

    const settingsItem = { 
      name: 'Einstellungen', 
      href: '/dashboard/settings', 
      icon: '⚙️', 
      protected: true,
      feature: 'settings'
    }

    return [
      ...baseNavigation, 
      ...freeFeatures, 
      ...protectedFeatures,
      subscriptionItem,
      settingsItem
    ]
  }

  // NavigationItem with subscription styling
  const NavigationItem = ({ item, isMobile = false }) => {
    const separator = item.isSeparator ? (
      <div className="my-2 border-t border-slate-700"></div>
    ) : null

    // Special styling for subscription item
    const isSubscriptionItem = item.href === '/dashboard/subscription'
    
    let subscriptionStyles = ''
    if (isSubscriptionItem) {
      if (isFreemium) {
        subscriptionStyles = 'bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 text-yellow-300 hover:from-yellow-500/20 hover:to-orange-500/20 hover:border-yellow-400/50 hover:text-yellow-200 shadow-sm'
      } else if (isPaid) {
        subscriptionStyles = 'bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 text-green-300 hover:from-green-500/20 hover:to-emerald-500/20 hover:border-green-400/50 hover:text-green-200 shadow-sm'
      } else {
        subscriptionStyles = 'bg-gradient-to-r from-slate-500/10 to-slate-600/10 border border-slate-500/30 text-slate-300 hover:bg-slate-700'
      }
    }
    
    const content = (
      <div className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
        isSubscriptionItem 
          ? subscriptionStyles
          : 'text-slate-300 hover:bg-slate-700 hover:text-white'
      } ${
        item.comingSoon ? 'opacity-60' : ''
      }`}>
        <span className={`mr-3 ${isSubscriptionItem ? 'text-xl' : 'text-lg'}`}>{item.icon}</span>
        <span className="flex-1">
          {item.name}
          {item.comingSoon && (
            <span className="ml-2 text-xs text-orange-400">(Uskoro)</span>
          )}
        </span>
        {item.badge && typeof item.badge === 'string' && (
          <span className={`ml-2 px-2 py-1 text-xs ${item.badgeColor || 'bg-red-500'} text-white rounded-full font-medium`}>
            {item.badge}
          </span>
        )}
        {item.badge && typeof item.badge === 'object' && (
          <span className={`ml-2 px-2 py-1 text-xs ${item.badge.color} text-white rounded-full font-medium shadow-sm`}>
            {item.badge.text}
          </span>
        )}
      </div>
    )

    // Protected items
    if (item.protected && item.feature && !item.comingSoon) {
      return (
        <>
          {separator}
          <SubscriptionGuard
            key={item.name}
            feature={item.feature}
            majstorId={majstor?.id}
            fallback={
              <button
                onClick={() => {
                  const featureNames = {
                    'customer_management': 'Kundenverwaltung',
                    'invoicing': 'Rechnungen & Angebote',
                    'services_management': 'Services Verwaltung',
                    'pdf_archive': 'PDF Archiv',
                    'settings': 'Erweiterte Einstellungen'
                  }
                  showUpgradeModal(
                    item.feature, 
                    featureNames[item.feature] || item.name,
                    'Freemium'
                  )
                  if (isMobile) setSidebarOpen(false)
                }}
                className="w-full group flex items-center px-3 py-2 text-sm font-medium rounded-md text-slate-400 hover:text-slate-300 hover:bg-slate-700/50 transition-colors cursor-pointer"
              >
                <span className="mr-3 text-lg opacity-75">{item.icon}</span>
                <span className="flex-1 text-left">{item.name}</span>
                <span className="ml-2 px-2 py-1 text-xs bg-blue-600 text-white rounded-full font-medium group-hover:bg-blue-500">
                  🔒 Pro
                </span>
              </button>
            }
            showUpgradePrompt={false}
          >
            <Link
              href={item.href}
              onClick={isMobile ? () => setSidebarOpen(false) : undefined}
            >
              {content}
            </Link>
          </SubscriptionGuard>
        </>
      )
    }

    // Coming soon items
    if (item.comingSoon) {
      return (
        <>
          {separator}
          <div key={item.name} className="cursor-not-allowed">
            {content}
          </div>
        </>
      )
    }

    // Free/unprotected items
    return (
      <>
        {separator}
        <Link
          key={item.name}
          href={item.href}
          onClick={isMobile ? () => setSidebarOpen(false) : undefined}
        >
          {content}
        </Link>
      </>
    )
  }

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

            {/* Subscription Status Badge */}
            {plan && (
              <div className="mt-3 px-2 py-1 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded text-center">
                <p className="text-xs font-medium">
                  {isPaid ? (
                    <span className="text-green-300">💎 PRO Mitglied</span>
                  ) : isFreemium ? (
                    <span className="text-slate-300">📋 Freemium</span>
                  ) : null}
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
                  Verwalten Sie Ihre Kunden und Aufträge
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
          {children}
        </main>
      </div>

      {/* Upgrade Modal */}
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

export default function DashboardLayout({ children }) {
  return (
    <Suspense fallback={<div className="text-white">Laden...</div>}>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </Suspense>
  )
}