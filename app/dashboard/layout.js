// app/dashboard/layout.js - VERZIJA SA DINAMIČKIM BADGE BROJEVIMA

'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { auth, majstorsAPI, supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function DashboardLayout({ children }) {
  const [user, setUser] = useState(null)
  const [majstor, setMajstor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  
  // NOVO: State za badge brojeve
  const [badges, setBadges] = useState({
    inquiries: 0,
    invoices: 0,
    warranties: 0
  })
  
  const router = useRouter()

  useEffect(() => {
    checkUser()
  }, [])

  // NOVO: Hook za učitavanje badge brojeva
  useEffect(() => {
    if (majstor?.id) {
      loadBadgeCounts()
      
      // Refresh badge counts svake 2 minute
      const interval = setInterval(loadBadgeCounts, 2 * 60 * 1000)
      return () => clearInterval(interval)
    }
  }, [majstor?.id])

  // NOVO: Funkcija za učitavanje badge brojeva
  const loadBadgeCounts = async () => {
    if (!majstor?.id) return

    try {
      console.log('🔢 Loading badge counts for majstor:', majstor.id)

      // Paralelno učitavanje svih brojeva
      const [inquiriesResult, invoicesResult, warrantiesResult] = await Promise.all([
        // Broj novih inquiries (status: 'new')
        supabase
          .from('inquiries')
          .select('id', { count: 'exact', head: true })
          .eq('majstor_id', majstor.id)
          .eq('status', 'new'),

        // Broj draft invoices
        supabase
          .from('invoices')
          .select('id', { count: 'exact', head: true })
          .eq('majstor_id', majstor.id)
          .eq('status', 'draft'),

        // Broj warranties koji ističu u sledećih 30 dana
        supabase
          .from('warranties')
          .select('id', { count: 'exact', head: true })
          .eq('majstor_id', majstor.id)
          .eq('status', 'active')
          .lte('end_date', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      ])

      const newCounts = {
        inquiries: inquiriesResult.count || 0,
        invoices: invoicesResult.count || 0, 
        warranties: warrantiesResult.count || 0
      }

      console.log('🔢 Badge counts loaded:', newCounts)
      setBadges(newCounts)

    } catch (error) {
      console.error('❌ Error loading badge counts:', error)
      // Ne mijenjaj badges ako je greška - ostavi postojeće vrednosti
    }
  }

  const checkUser = async () => {
    try {
      console.log('🔍 Checking user authentication...')
      
      const { user: currentUser, error: authError } = await auth.getUser()
      
      if (authError) {
        console.error('❌ Auth error:', authError)
        setError('Authentication error: ' + authError.message)
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

      // Pokušaj da učitaš majstor profil
      console.log('🔍 Fetching majstor profile for:', currentUser.id)
      
      const { data: majstorData, error: majstorError } = await majstorsAPI.getById(currentUser.id)
      
      if (majstorError) {
        console.error('❌ Majstor profile error:', majstorError)
        
        if (majstorError.code === 'PGRST116' || majstorError.message?.includes('0 rows')) {
          // Profil ne postoji - pokušaj da ga kreiraš
          console.log('🛠️ Creating missing majstor profile...')
          await createMissingProfile(currentUser)
        } else {
          console.error('❌ Other majstor error:', majstorError)
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
      
      const slug = displayName
        .toLowerCase()
        .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .substring(0, 40) + '-' + Date.now()

      const profileData = {
        id: user.id,
        email: user.email,
        full_name: displayName,
        business_name: user.user_metadata?.business_name || null,
        phone: user.user_metadata?.phone || null,
        city: user.user_metadata?.city || null,
        slug: slug,
        subscription_status: 'trial',
        subscription_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        is_active: true
      }

      // Pozovi API route za kreiranje profila
      const response = await fetch('/api/create-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData)
      })

      if (response.ok) {
        const result = await response.json()
        console.log('✅ Profile created successfully via API')
        setMajstor(result.profile)
        setError('') // Obriši grešku
        
        // Refresh stranica da učita novi profil
        setTimeout(() => window.location.reload(), 1000)
      } else {
        const errorData = await response.json()
        console.error('❌ Profile creation via API failed:', errorData)
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

  // NOVO: Funkcija za formatiranje badge brojeva
  const formatBadgeCount = (count) => {
    if (count === 0) return null // Ne prikazuj badge ako je 0
    if (count > 99) return '99+'
    return count.toString()
  }

  // AŽURIRANO: Navigation sa dinamičkim badge brojevima
  const navigation = [
    { name: 'Übersicht', href: '/dashboard', icon: '📊' },
    { name: 'Meine Kunden', href: '/dashboard/customers', icon: '👥' },
    { name: 'Meine Services', href: '/dashboard/services', icon: '🔧' }, // NOVO
    { name: 'QR Visitenkarte', href: '/dashboard/business-card/create', icon: '📱' },
    { 
      name: 'Kundenanfragen', 
      href: '/dashboard/inquiries', 
      icon: '📧', 
      badge: formatBadgeCount(badges.inquiries),
      badgeColor: 'bg-red-500' // crvena za nove upite
    },
    { 
      name: 'Rechnungen', 
      href: '/dashboard/invoices', 
      icon: '📄',
      badge: formatBadgeCount(badges.invoices),
      badgeColor: 'bg-yellow-500' // žuta za draft račune
    },
    { 
      name: 'Garantien', 
      href: '/dashboard/warranties', 
      icon: '🛡️',
      badge: formatBadgeCount(badges.warranties),
      badgeColor: 'bg-orange-500' // narandžasta za uskoro istiću
    },
    { name: 'Empfehlungen', href: '/dashboard/referrals', icon: '🎯' },
    { name: 'Analytics', href: '/dashboard/analytics', icon: '📈' },
    { name: 'Einstellungen', href: '/dashboard/settings', icon: '⚙️' }
  ]

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
          
          {user && !majstor && (
            <div className="mt-4 text-center">
              <p className="text-yellow-300 text-sm mb-2">
                Ihr Profil fehlt möglicherweise. Soll ich es erstellen?
              </p>
              <button
                onClick={() => createMissingProfile(user)}
                className="bg-yellow-600 text-white px-4 py-2 rounded text-sm hover:bg-yellow-700"
              >
                Profil erstellen
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // NOVA: Komponenta za rendering navigation item-a sa badge
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
              Majstori<span className="text-blue-400">.de</span>
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
            {majstor?.subscription_status === 'trial' && (
              <div className="mt-3 px-2 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded text-center">
                <p className="text-xs text-yellow-300 font-medium">
                  🎯 Trial: 7 Tage übrig
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
              Majstori<span className="text-blue-400">.de</span>
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
              {/* Debug info */}
              {process.env.NODE_ENV === 'development' && (
                <div className="text-xs text-slate-500 hidden md:block">
                  ID: {user?.id?.slice(-8)} | B: {badges.inquiries}|{badges.invoices}|{badges.warranties}
                </div>
              )}

              {/* Notifications */}
              <button 
                className="relative p-2 text-slate-400 hover:text-white transition-colors"
                onClick={loadBadgeCounts} // NOVO: Refresh badge counts na klik
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
    </div>
  )
}