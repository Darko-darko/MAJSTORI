// app/dashboard/layout.js - SA PROGRES MODALOM NA TOP LEVEL - FIXED BADGE LOGIC

'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { auth, majstorsAPI, supabase } from '@/lib/supabase'
import { SubscriptionGuard } from '@/app/components/subscription/SubscriptionGuard'
import { UpgradeModal, useUpgradeModal } from '@/app/components/subscription/UpgradeModal'
import { useSubscription } from '@/lib/hooks/useSubscription'
import Link from 'next/link'
import { SupportModal, useSupportModal } from '@/app/components/SupportModal'



function DashboardLayoutContent({ children }) {
  const [user, setUser] = useState(null)
  const [majstor, setMajstor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { isOpen: supportOpen, openSupport, closeSupport } = useSupportModal()
  
  // 🔥 PROGRES MODAL STATE - NA LAYOUT NIVOU!
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [upgradeProgress, setUpgradeProgress] = useState(0)
  const [upgradeMessage, setUpgradeMessage] = useState('')
  
  // Subscription hook for menu badges
  const { subscription, plan, isFreemium, isPaid, refresh, loading: subscriptionLoading } = useSubscription(majstor?.id)
  
  // 🔥 REALTIME LISTENER - update badge automatski
useEffect(() => {
  if (!majstor?.id) return

  console.log('🔔 Setting up Realtime listener for badge updates...')

  const channel = supabase
    .channel(`layout-subscription-${majstor.id}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'user_subscriptions',
      filter: `majstor_id=eq.${majstor.id}`
    }, (payload) => {
      console.log('🔔 Subscription changed in layout - refreshing badge!')
      console.log('Payload:', payload)
      refresh(true) // Force refresh subscription data
    })
    .subscribe()

  return () => {
    console.log('🧹 Cleaning up layout Realtime listener')
    channel.unsubscribe()
  }
}, [majstor?.id, refresh])
  // Upgrade Modal Hook
  const { isOpen: upgradeModalOpen, modalProps, showUpgradeModal: showFeatureModal, hideUpgradeModal } = useUpgradeModal()
  
  // Badge states
  const [badges, setBadges] = useState({
    inquiries: 0,
    invoices: 0,
    warranties: 0
  })
  
  const router = useRouter()
  const searchParams = useSearchParams()

  // 🔥 SWIPE GESTURE za otvaranje sidebar-a na mobilnom
  const [touchStart, setTouchStart] = useState(null)
  const [touchEnd, setTouchEnd] = useState(null)
  const [isSwiping, setIsSwiping] = useState(false)

  // Min. distance za validni swipe (u px)
  const minSwipeDistance = 50

  const onTouchStart = (e) => {
    setTouchEnd(null)
    const startX = e.targetTouches[0].clientX
    setTouchStart(startX)
    
    // Počni swipe samo ako je dodir na levoj strani ekrana
    if (startX < 50) {
      setIsSwiping(true)
    }
  }

  const onTouchMove = (e) => {
    if (!isSwiping && !sidebarOpen) return
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) {
      setIsSwiping(false)
      return
    }
    
    const distance = touchEnd - touchStart
    const isLeftSwipe = distance < -minSwipeDistance
    const isRightSwipe = distance > minSwipeDistance
    
    // Swipe sa leve strane ekrana ka desnoj → otvori sidebar
    if (isRightSwipe && touchStart < 50) {
      console.log('👉 Swipe right detected - opening sidebar')
      setSidebarOpen(true)
      
      // 🔥 Haptic feedback (ako je dostupno)
      if (navigator.vibrate) {
        navigator.vibrate(10) // 10ms vibration
      }
    }
    // Ako je swipe počeo sa leve strane ali nije dovoljno jak, ne otvori
    else if (touchStart < 50 && distance > 0 && distance < minSwipeDistance) {
      console.log('⚠️ Weak swipe - not opening')
      setSidebarOpen(false)
    }
    
    // Swipe sa desne ka levoj (na otvorenom sidebar-u) → zatvori
    if (isLeftSwipe && sidebarOpen) {
      console.log('👈 Swipe left detected - closing sidebar')
      setSidebarOpen(false)
      
      // 🔥 Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(10)
      }
    }
    // Ako je sidebar otvoren i swipe je ka levoj ali slab, ostavi otvoren
    else if (sidebarOpen && distance < 0 && distance > -minSwipeDistance) {
      console.log('⚠️ Weak swipe - keeping open')
      setSidebarOpen(true)
    }
    
    setIsSwiping(false)
    setTouchStart(null)
    setTouchEnd(null)
  }

  // Izračunaj trenutni pomak sidebar-a tokom swipe-a
  const getSwipeOffset = () => {
    if (!isSwiping || !touchStart || !touchEnd) return 0
    
    const distance = touchEnd - touchStart
    const sidebarWidth = 256 // 16rem = 256px
    
    // Ako swipe-uješ sa leve strane
    if (touchStart < 50) {
      // Pomak od -256px (zatvoreno) do 0px (otvoreno)
      const offset = Math.min(0, -sidebarWidth + distance)
      return Math.max(-sidebarWidth, offset)
    }
    
    return 0
  }

  useEffect(() => {
    // Dodaj touch listeners samo na mobilnom
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      document.addEventListener('touchstart', onTouchStart, { passive: true })
      document.addEventListener('touchmove', onTouchMove, { passive: true })
      document.addEventListener('touchend', onTouchEnd)

      return () => {
        document.removeEventListener('touchstart', onTouchStart)
        document.removeEventListener('touchmove', onTouchMove)
        document.removeEventListener('touchend', onTouchEnd)
      }
    }
  }, [touchStart, touchEnd, sidebarOpen, isSwiping])

  // 🔥 EVENT LISTENER za subscription changes
  useEffect(() => {
    const handleSubscriptionChanged = (event) => {
      console.log('📢 LAYOUT: subscription-changed event received!')
      console.log('Event detail:', event.detail)
      
      if (refresh && typeof refresh === 'function') {
        console.log('🔄 LAYOUT: Triggering subscription refresh...')
        refresh()
      }
    }

    window.addEventListener('subscription-changed', handleSubscriptionChanged)

    return () => {
      window.removeEventListener('subscription-changed', handleSubscriptionChanged)
    }
  }, [refresh])

  // 🔥 GLAVNA LOGIKA: Detektuj paddle_success ODMAH i prikaži modal PRE svega!
  useEffect(() => {
    const paddleSuccess = searchParams.get('paddle_success')
    const planType = searchParams.get('plan')
    
    if (paddleSuccess === 'true' && !showUpgradeModal) {
      console.log('🎯 LAYOUT: Paddle payment detected - showing progress modal IMMEDIATELY!')
      startUpgradeProcess(planType)
    }
  }, [searchParams, showUpgradeModal])

  const startUpgradeProcess = (planType) => {
    setShowUpgradeModal(true)
    setUpgradeProgress(0)
    setUpgradeMessage('Zahlung erfolgreich! Aktiviere PRO...')
    
    window.dispatchEvent(new CustomEvent('subscription-changed', {
      detail: { action: 'upgraded', timestamp: Date.now(), plan: planType }
    }))
    
    // 🔥 PHASE 1: Brzi progress do 85% (12 sekundi)
    const initialStages = [
      { delay: 0, progress: 0, message: 'Zahlung erfolgreich! Aktiviere PRO...' },
      { delay: 1500, progress: 15, message: 'Verbindung zu Paddle...' },
      { delay: 3000, progress: 30, message: 'Warte auf Bestätigung...' },
      { delay: 4500, progress: 45, message: 'Subscription wird erstellt...' },
      { delay: 6000, progress: 60, message: 'Synchronisiere mit Paddle...' },
      { delay: 8000, progress: 70, message: 'Webhook wird empfangen...' },
      { delay: 10000, progress: 80, message: 'Datenbank wird aktualisiert...' },
      { delay: 12000, progress: 85, message: 'Überprüfe Status...' }
    ]
    
    initialStages.forEach((stage) => {
      setTimeout(() => {
        setUpgradeProgress(stage.progress)
        setUpgradeMessage(stage.message)
        if (refresh && typeof refresh === 'function') {
          refresh()
        }
      }, stage.delay)
    })
    
    // 🔥 PHASE 2: Aktivno proveravaj status (od 12s do max 30s)
    let checkCount = 0
    const maxChecks = 36 // 18 sekundi provera (36 * 500ms)
    const startTime = Date.now()
    const maxWaitTime = 30000 // Max 30 sekundi od starta
    
    const checkInterval = setInterval(async () => {
      checkCount++
      const elapsed = Date.now() - startTime
      
      // Povećaj progress polako dok čekamo (85% -> 95%)
      const checkProgress = 85 + Math.min((checkCount / maxChecks) * 10, 10)
      setUpgradeProgress(Math.round(checkProgress))
      
      if (checkCount % 4 === 0) {
        setUpgradeMessage('Warte auf Webhook...')
      } else if (checkCount % 4 === 2) {
        setUpgradeMessage('Synchronisierung läuft...')
      }
      
      // Refresh subscription
      if (refresh && typeof refresh === 'function') {
        refresh()
      }
      
      // Proveri da li je subscription postao PRO ili Trial
      const isPro = subscription?.status === 'active' || subscription?.status === 'trial'
      
      // Zatvori modal ako je PRO ILI ako je prošlo 30s
      if (isPro || elapsed >= maxWaitTime || checkCount >= maxChecks) {
        clearInterval(checkInterval)
        
        console.log(isPro 
          ? '✅ Subscription confirmed as PRO! Closing modal...' 
          : `⏱️ Timeout reached (${elapsed}ms). Closing modal...`)
        
        // Završi animaciju
        setUpgradeProgress(100)
        setUpgradeMessage('✅ PRO Mitgliedschaft aktiviert!')
        
        setTimeout(() => {
          // Ukloni parametre
          const url = new URL(window.location.href)
          url.searchParams.delete('paddle_success')
          url.searchParams.delete('plan')
          window.history.replaceState({}, '', url.toString())
          
          // Reload
          window.location.reload()
        }, 1500)
      }
    }, 500) // Provera svakih 500ms
  }

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

  // 🔥 FIXED: Badge logic sa boljom race condition zaštitom
  const getSubscriptionBadge = () => {
    // 1️⃣ Ako hook još uvek učitava → prikaži loading
    if (subscriptionLoading) {
      return {
        text: '...',
        color: 'bg-gradient-to-r from-slate-500 to-slate-600'
      }
    }
    if (subscription?.cancel_at_period_end === true) {
    return {
      text: 'Gekündigt',
      color: 'bg-gradient-to-r from-orange-500 to-red-500'
    }
  }
    // Grace period: Trial završio ali još nije active
  if (subscription?.status === 'trial' && subscription?.trial_ends_at) {
    const now = new Date()
    const trialEnd = new Date(subscription.trial_ends_at)
    if (now > trialEnd) {
      return { 
        text: 'Upgrading...', 
        color: 'bg-gradient-to-r from-yellow-500 to-orange-500 animate-pulse' 
      }
    }
  }
    // 2️⃣ Ako hook nije učitan ali majstor postoji → prikaži loading
    // ⚠️ VAŽNO: Proveri da li BILO subscription ILI plan postoji
    //    Ako nijedno ne postoji, hook se još učitava!
    if (majstor?.id && !subscription && !plan) {
      console.log('🔄 Badge: Hook not initialized yet, showing loading...')
      return {
        text: '...',
        color: 'bg-gradient-to-r from-slate-500 to-slate-600'
      }
    }
    
    // 3️⃣ Ako nema subscription ALI ima plan → proveri plan
    if (!subscription) {
      // Ako je plan freemium → "Upgrade"
      if (plan?.name === 'freemium') {
        return {
          text: 'Upgrade',
          color: 'bg-gradient-to-r from-yellow-500 to-orange-500'
        }
      }
      
      // Ako nema ni subscription ni plan (fallback) → "Upgrade"
      if (!plan) {
        return {
          text: 'Upgrade',
          color: 'bg-gradient-to-r from-yellow-500 to-orange-500'
        }
      }
    }
    
    // 4️⃣ Normalna logika za subscription koji postoji
    const now = new Date()
    const periodEnd = new Date(subscription.current_period_end)
    const createdAt = new Date(subscription.created_at)
    const daysLeft = Math.ceil((periodEnd - now) / (1000 * 60 * 60 * 24))
    
    if (periodEnd <= now) {
      return {
        text: 'Upgrade',
        color: 'bg-gradient-to-r from-yellow-500 to-orange-500'
      }
    }
    
    const formatDays = (days) => days === 1 ? '1 Tag' : `${days} Tage`
    
    if (subscription.cancelled_at) {
      return {
        text: `PRO(${formatDays(daysLeft)})`,
        color: 'bg-gradient-to-r from-orange-500 to-red-500',
        multiline: true
      }
    }
    
    let isInTrial = false
    let trialDaysLeft = 0
    
    if (subscription.trial_ends_at) {
      const trialEnd = new Date(subscription.trial_ends_at)
      if (trialEnd > now) {
        isInTrial = true
        trialDaysLeft = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24))
      }
    } else if (subscription.trial_starts_at) {
      const trialStart = new Date(subscription.trial_starts_at)
      const estimatedTrialEnd = new Date(trialStart)
      estimatedTrialEnd.setDate(estimatedTrialEnd.getDate() + 1)
      
      if (estimatedTrialEnd > now) {
        isInTrial = true
        trialDaysLeft = Math.ceil((estimatedTrialEnd - now) / (1000 * 60 * 60 * 24))
      }
    } else if (subscription.status === 'active' || subscription.status === 'trial') {
      const hoursSinceCreation = (now - createdAt) / (1000 * 60 * 60)
      if (hoursSinceCreation < 48 && daysLeft <= 1) {
        isInTrial = true
        trialDaysLeft = daysLeft
      }
    }
    
    if (isInTrial && trialDaysLeft > 0) {
      return {
        text: `PRO(${formatDays(trialDaysLeft)})`,
        color: 'bg-gradient-to-r from-green-500 to-emerald-500',
        multiline: true
      }
    }
    
    if (subscription.status === 'active') {
      return {
        text: 'PRO',
        color: 'bg-gradient-to-r from-green-500 to-emerald-500'
      }
    }
    
    // Fallback
    return {
      text: 'Upgrade',
      color: 'bg-gradient-to-r from-yellow-500 to-orange-500'
    }
  }

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
        icon: '📧', 
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

  const NavigationItem = ({ item, isMobile = false }) => {
    const separator = item.isSeparator ? (
      <div className="my-2 border-t border-slate-700"></div>
    ) : null

    const isSubscriptionItem = item.href === '/dashboard/subscription'
    
    let subscriptionStyles = ''
    if (isSubscriptionItem) {
      if (isFreemium) {
        subscriptionStyles = 'bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 text-yellow-300 hover:from-yellow-500/20 hover:to-orange-500/20 hover:border-yellow-400/50 hover:text-yellow-200 shadow-sm'
      } else if (isPaid) {
        subscriptionStyles = 'bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 text-green-300 hover:from-green-500/20 hover:to-emerald-500/20 hover:border-green-400/50 hover:text-green-200 shadow-sm'
      } else if (subscription?.cancel_at_period_end === true) {
  subscriptionStyles = 'bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/30 text-orange-300 hover:from-orange-500/20 hover:to-red-500/20 hover:border-orange-400/50 hover:text-orange-200 shadow-sm'
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
          <span className={`ml-2 px-2 py-1 text-xs ${item.badge.color} text-white rounded-full font-medium shadow-sm ${
            item.badge.multiline ? 'whitespace-pre-line text-center leading-tight' : ''
          }`}>
            {item.badge.text}
          </span>
        )}
      </div>
    )

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
                  showFeatureModal(
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

  // 🔥 UPGRADE PROCESSING MODAL - NA TOP LAYOUT NIVOU!
  const UpgradeProcessingModal = () => {
    if (!showUpgradeModal) return null

    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/98 backdrop-blur-sm">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-8 max-w-md w-full mx-4 border border-slate-700 shadow-2xl">
          
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-full mb-4 animate-pulse shadow-lg shadow-blue-500/50">
              <span className="text-5xl">💎</span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              PRO Upgrade läuft...
            </h2>
            <p className="text-slate-400 text-sm">
              Ihre Zahlung war erfolgreich! Wir aktivieren jetzt Ihre PRO Mitgliedschaft.
            </p>
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent"></div>
              <p className="text-center text-blue-300 font-medium animate-pulse">
                {upgradeMessage}
              </p>
            </div>
            
            <div className="bg-slate-700/50 rounded-full h-4 overflow-hidden shadow-inner">
              <div 
                className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 h-full transition-all duration-700 ease-out shadow-lg"
                style={{ width: `${upgradeProgress}%` }}
              />
            </div>
            
            <p className="text-center text-slate-400 text-sm mt-2 font-mono">
              {Math.round(upgradeProgress)}% abgeschlossen
            </p>
          </div>

          <div className="space-y-3">
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
              <div className="flex items-center gap-3">
                <span className="text-xl">✅</span>
                <div className="text-xs text-green-200">
                  <p className="font-semibold">Zahlung erfolgreich</p>
                  <p className="text-green-300/70">Ihre Zahlung wurde bestätigt</p>
                </div>
              </div>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
              <div className="flex items-center gap-3">
                <span className="text-xl">🔄</span>
                <div className="text-xs text-blue-200">
                  <p className="font-semibold">Synchronisierung läuft</p>
                  <p className="text-blue-300/70">Paddle Webhook wird verarbeitet...</p>
                </div>
              </div>
            </div>

            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
              <div className="flex items-center gap-3">
                <span className="text-xl">⏳</span>
                <div className="text-xs text-purple-200">
                  <p className="font-semibold">Bitte warten</p>
                  <p className="text-purple-300/70">Dieser Vorgang dauert ca. 15-20 Sekunden</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-slate-500">
              Bitte schließen Sie dieses Fenster nicht...
            </p>
          </div>
        </div>
      </div>
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
    <>
      {/* 🔥 PROGRES MODAL - RENDERUJE SE PRVI, PRE SVEGA! */}
      <UpgradeProcessingModal />

      <div className="min-h-screen bg-slate-900 flex">
       
      
        
        {/* 🔥 Swipe Indicator - vizuelni hint za korisnika */}
        {!sidebarOpen && (
          <div className="lg:hidden fixed left-0 top-1/2 -translate-y-1/2 z-30 pointer-events-none">
            <div className="w-1 h-16 bg-gradient-to-r from-blue-500/30 to-transparent rounded-r-full animate-pulse"></div>
          </div>
        )}
        
        {sidebarOpen && (
          <div 
            className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Desktop Sidebar */}
        <div className="hidden lg:flex lg:flex-shrink-0">
          <div className="flex flex-col w-64 bg-slate-800 border-r border-slate-700">
            
            <div className="flex items-center h-16 px-4 border-b border-slate-700">
              <Link href="/" className="text-xl font-bold text-white">
                Pro-meister<span className="text-blue-400">.de</span>
              </Link>
            </div>

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

              {subscription && (
                <div className="mt-3 px-2 py-1.5 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded text-center">
                  <p className="text-xs font-medium leading-tight whitespace-pre-line">
                   {(() => {
  const now = new Date()
  const periodEnd = new Date(subscription.current_period_end)
  const createdAt = new Date(subscription.created_at)
  const daysLeft = Math.ceil((periodEnd - now) / (1000 * 60 * 60 * 24))
  const formatDays = (days) => days === 1 ? '1 Tag' : `${days} Tage`
  
  // 🔥 Grace period check
  if (subscription.status === 'trial' && subscription.trial_ends_at) {
    const trialEnd = new Date(subscription.trial_ends_at)
    if (now > trialEnd) return <span className="text-yellow-300 animate-pulse">⏳ Aktivierung...</span>
  }
  
  if (periodEnd <= now) {
    return <span className="text-slate-300">📋 Freemium</span>
  }
                      
                      if (subscription.cancelled_at) {
                        return <span className="text-orange-300">⏰ PRO({formatDays(daysLeft)})</span>
                      }
                      
                      let isInTrial = false
                      let trialDaysLeft = 0
                      
                      if (subscription.trial_ends_at) {
                        const trialEnd = new Date(subscription.trial_ends_at)
                        if (trialEnd > now) {
                          isInTrial = true
                          trialDaysLeft = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24))
                        }
                      } else if (subscription.trial_starts_at) {
                        const trialStart = new Date(subscription.trial_starts_at)
                        const estimatedTrialEnd = new Date(trialStart)
                        estimatedTrialEnd.setDate(estimatedTrialEnd.getDate() + 1)
                        
                        if (estimatedTrialEnd > now) {
                          isInTrial = true
                          trialDaysLeft = Math.ceil((estimatedTrialEnd - now) / (1000 * 60 * 60 * 24))
                        }
                      } else if (subscription.status === 'active') {
                        const hoursSinceCreation = (now - createdAt) / (1000 * 60 * 60)
                        if (hoursSinceCreation < 48 && daysLeft <= 1) {
                          isInTrial = true
                          trialDaysLeft = daysLeft
                        }
                      }
                      
                      if (isInTrial && trialDaysLeft > 0) {
                        return <span className="text-green-300">💎 PRO({formatDays(trialDaysLeft)})</span>
                      }
                      
                      if (subscription.status === 'active') {
                        return <span className="text-green-300">💎 PRO Mitglied</span>
                      }
                      
                      return <span className="text-slate-300">📋 Freemium</span>
                    })()}
                  </p>
                </div>
              )}

              {!subscription && (
                <div className="mt-3 px-2 py-1 bg-gradient-to-r from-slate-500/10 to-slate-600/10 border border-slate-500/20 rounded text-center">
                  <p className="text-xs font-medium text-slate-300">📋 Freemium</p>
                </div>
              )}
            </div>

            <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
              {navigation.map((item) => (
                <NavigationItem key={item.name} item={item} />
              ))}
            </nav>

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
        <div 
          className={`lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-slate-800 border-r border-slate-700 ${
            isSwiping ? '' : 'transform transition-transform duration-300 ease-in-out'
          } ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
          style={isSwiping ? { transform: `translateX(${getSwipeOffset()}px)` } : {}}
        >
          <div className="flex flex-col h-full">
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

              {subscription && (
                <div className="mt-3 px-2 py-1.5 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded text-center">
                  <p className="text-xs font-medium leading-tight whitespace-pre-line">
                    {(() => {
  const now = new Date()
  const periodEnd = new Date(subscription.current_period_end)
  const createdAt = new Date(subscription.created_at)
  const daysLeft = Math.ceil((periodEnd - now) / (1000 * 60 * 60 * 24))
  const formatDays = (days) => days === 1 ? '1 Tag' : `${days} Tage`
  
  // 🔥 Grace period check
  if (subscription.status === 'trial' && subscription.trial_ends_at) {
    const trialEnd = new Date(subscription.trial_ends_at)
    if (now > trialEnd) return <span className="text-yellow-300 animate-pulse">⏳ Aktivierung...</span>
  }
  
  if (periodEnd <= now) {
    return <span className="text-slate-300">📋 Freemium</span>
  }
                      
                      if (subscription.cancelled_at) {
                        return <span className="text-orange-300">⏰ PRO({formatDays(daysLeft)})</span>
                      }
                      
                      let isInTrial = false
                      let trialDaysLeft = 0
                      
                      if (subscription.trial_ends_at) {
                        const trialEnd = new Date(subscription.trial_ends_at)
                        if (trialEnd > now) {
                          isInTrial = true
                          trialDaysLeft = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24))
                        }
                      } else if (subscription.trial_starts_at) {
                        const trialStart = new Date(subscription.trial_starts_at)
                        const estimatedTrialEnd = new Date(trialStart)
                        estimatedTrialEnd.setDate(estimatedTrialEnd.getDate() + 1)
                        
                        if (estimatedTrialEnd > now) {
                          isInTrial = true
                          trialDaysLeft = Math.ceil((estimatedTrialEnd - now) / (1000 * 60 * 60 * 24))
                        }
                      } else if (subscription.status === 'active') {
                        const hoursSinceCreation = (now - createdAt) / (1000 * 60 * 60)
                        if (hoursSinceCreation < 48 && daysLeft <= 1) {
                          isInTrial = true
                          trialDaysLeft = daysLeft
                        }
                      }
                      
                      if (isInTrial && trialDaysLeft > 0) {
                        return <span className="text-green-300">💎 PRO({formatDays(trialDaysLeft)})</span>
                      }
                      
                      if (subscription.status === 'active') {
                        return <span className="text-green-300">💎 PRO Mitglied</span>
                      }
                      
                      return <span className="text-slate-300">📋 Freemium</span>
                    })()}
                  </p>
                </div>
              )}

              {!subscription && (
                <div className="mt-3 px-2 py-1.5 bg-gradient-to-r from-slate-500/10 to-slate-600/10 border border-slate-500/20 rounded text-center">
                  <p className="text-xs font-medium text-slate-300">📋 Freemium</p>
                </div>
              )}
            </div>

            <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
              {navigation.map((item) => (
                <NavigationItem key={item.name} item={item} isMobile={true} />
              ))}
            </nav>

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
          
          <header className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700 px-4 py-3 lg:px-6 lg:py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
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
                
                <button 
                  className="relative p-2 text-slate-400 hover:text-white transition-colors"
                  onClick={openSupport}
                  title="Support kontaktieren"
                >
                  <span className="text-xl">📨</span>
                </button>

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

          <main className="flex-1 overflow-y-auto bg-slate-900 p-4 lg:p-6">
            {children}
          </main>
        </div>

        <UpgradeModal
          isOpen={upgradeModalOpen}
          onClose={hideUpgradeModal}
          feature={modalProps.feature}
          featureName={modalProps.featureName}
          currentPlan={modalProps.currentPlan}
        />
        
        <SupportModal 
          isOpen={supportOpen}
          onClose={closeSupport}
          userEmail={user?.email}
          userName={majstor?.full_name}
        />
      </div>
    </>
  )
}

export default function DashboardLayout({ children }) {
  return (
    <Suspense fallback={<div className="text-white">Laden...</div>}>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </Suspense>
  )
}