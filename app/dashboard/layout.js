'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { auth, majstorsAPI } from '@/lib/supabase'
import Link from 'next/link'

export default function DashboardLayout({ children }) {
  const [user, setUser] = useState(null)
  const [majstor, setMajstor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    try {
      const { user: currentUser } = await auth.getUser()
      
      if (!currentUser) {
        router.push('/login')
        return
      }

      setUser(currentUser)

      const { data: majstorData, error } = await majstorsAPI.getById(currentUser.id)
      if (error) {
        console.error('Error fetching majstor profile:', error)
      } else {
        setMajstor(majstorData)
      }

    } catch (error) {
      console.error('Auth error:', error)
      router.push('/login')
    } finally {
      setLoading(false)
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

  const navigation = [
    { name: 'Übersicht', href: '/dashboard', icon: '📊' },
    { name: 'Meine Kunden', href: '/dashboard/customers', icon: '👥' },
    { name: 'QR Visitenkarte', href: '/dashboard/business-card', icon: '📱' },
    { name: 'Kundenanfragen', href: '/dashboard/inquiries', icon: '📧', badge: '3' },
    { name: 'Rechnungen', href: '/dashboard/invoices', icon: '📄' },
    { name: 'Garantien', href: '/dashboard/warranties', icon: '🛡️' },
    { name: 'Empfehlungen', href: '/dashboard/referrals', icon: '🎯' },
    { name: 'Analytics', href: '/dashboard/analytics', icon: '📈' },
    { name: 'Einstellungen', href: '/dashboard/settings', icon: '⚙️' }
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Laden...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 flex">
      
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Desktop Sidebar - Always visible on desktop */}
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
                {majstor?.full_name?.charAt(0) || 'M'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {majstor?.full_name || 'Loading...'}
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

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="group flex items-center px-3 py-2 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
              >
                <span className="mr-3 text-lg">{item.icon}</span>
                <span className="flex-1">{item.name}</span>
                {item.badge && (
                  <span className="ml-2 px-2 py-1 text-xs bg-red-500 text-white rounded-full">
                    {item.badge}
                  </span>
                )}
              </Link>
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

      {/* Mobile Sidebar - Slide out */}
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
                {majstor?.full_name?.charAt(0) || 'M'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {majstor?.full_name || 'Loading...'}
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
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className="group flex items-center px-3 py-2 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
              >
                <span className="mr-3 text-lg">{item.icon}</span>
                <span className="flex-1">{item.name}</span>
                {item.badge && (
                  <span className="ml-2 px-2 py-1 text-xs bg-red-500 text-white rounded-full">
                    {item.badge}
                  </span>
                )}
              </Link>
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
              <button className="relative p-2 text-slate-400 hover:text-white transition-colors">
                <span className="text-xl">🔔</span>
                <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              {/* Profile */}
              <Link 
                href="/dashboard/settings"
                className="flex items-center space-x-2 text-slate-400 hover:text-white transition-colors"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                  {majstor?.full_name?.charAt(0) || 'M'}
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