// app/dashboard/layout.js - SA PROGRES MODALOM NA TOP LEVEL - FIXED BADGE LOGIC

'use client'

const ADMIN_EMAILS = ['darko.jocic.ns@gmail.com', 'novakovicdusan555@gmail.com']
import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { auth, majstorsAPI, supabase } from '@/lib/supabase'
import { SubscriptionGuard } from '@/app/components/subscription/SubscriptionGuard'
import { UpgradeModal, useUpgradeModal } from '@/app/components/subscription/UpgradeModal'
import { useSubscription } from '@/lib/hooks/useSubscription'
import { usePushNotifications } from '@/lib/hooks/usePushNotifications'
import Link from 'next/link'
import { SupportModal, useSupportModal } from '@/app/components/SupportModal'
import AIHelpChat from '@/app/components/AIHelpChat'
import ScrollToTopButton from '@/app/components/ScrollToTopButton'
import { useTheme } from '@/lib/context/ThemeContext'
import { useFavorites } from '@/lib/hooks/useFavorites'



function DashboardLayoutContent({ children }) {
  const { theme, toggleTheme } = useTheme()
  const [user, setUser] = useState(null)
  const [majstor, setMajstor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [workerMenuOpen, setWorkerMenuOpen] = useState(false)
  const workerMenuRef = useRef(null)
  const workerAvatarInputRef = useRef(null)

  // Close worker menu on outside click
  useEffect(() => {
    if (!workerMenuOpen) return
    const handler = (e) => {
      if (workerMenuRef.current && !workerMenuRef.current.contains(e.target)) setWorkerMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler)
    return () => { document.removeEventListener('mousedown', handler); document.removeEventListener('touchstart', handler) }
  }, [workerMenuOpen])

  const handleWorkerAvatarUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    try {
      // Resize to max 400x400 JPEG (same as AvatarUpload component)
      const resized = await new Promise((resolve, reject) => {
        const img = new Image()
        const url = URL.createObjectURL(file)
        img.onload = () => {
          URL.revokeObjectURL(url)
          const canvas = document.createElement('canvas')
          let w = img.width, h = img.height
          const max = 400
          if (w > h) { if (w > max) { h = Math.round(h * max / w); w = max } }
          else { if (h > max) { w = Math.round(w * max / h); h = max } }
          canvas.width = w; canvas.height = h
          canvas.getContext('2d').drawImage(img, 0, 0, w, h)
          canvas.toBlob(resolve, 'image/jpeg', 0.85)
        }
        img.onerror = reject
        img.src = url
      })

      const filePath = `${user.id}/avatar.jpg`
      const { error: upErr } = await supabase.storage.from('avatars').upload(filePath, resized, { upsert: true, contentType: 'image/jpeg' })
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath)
      const avatarUrl = `${publicUrl}?t=${Date.now()}`
      await supabase.from('majstors').update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() }).eq('id', user.id)
      setMajstor(prev => ({ ...prev, avatar_url: avatarUrl }))
      setWorkerMenuOpen(false)
    } catch (err) {
      alert('Fehler beim Hochladen: ' + err.message)
    }
    if (workerAvatarInputRef.current) workerAvatarInputRef.current.value = ''
  }

  // Swipe gesture for mobile sidebar (document-level listeners, no overlay div)
  const touchStart = useRef(null)
  const touchEnd = useRef(null)
  useEffect(() => {
    const onTouchStart = (e) => {
      touchEnd.current = null
      touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    }
    const onTouchMove = (e) => {
      touchEnd.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    }
    const onTouchEnd = () => {
      if (!touchStart.current || !touchEnd.current) return
      const dx = touchEnd.current.x - touchStart.current.x
      const dy = touchEnd.current.y - touchStart.current.y
      // Ignore if vertical scroll is dominant
      if (Math.abs(dy) > Math.abs(dx)) return
      // Swipe right from left edge (20-50px zone) → open
      if (dx > 50 && touchStart.current.x < 50) {
        setSidebarOpen(true)
      }
      // Swipe left → close (only when sidebar is open)
      if (dx < -50 && sidebarOpen) {
        setSidebarOpen(false)
      }
      touchStart.current = null
      touchEnd.current = null
    }
    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchmove', onTouchMove, { passive: true })
    document.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchmove', onTouchMove)
      document.removeEventListener('touchend', onTouchEnd)
    }
  }, [sidebarOpen])

  const [badgeKey, setBadgeKey] = useState(0)

  const { isOpen: supportOpen, openSupport, closeSupport } = useSupportModal()
  
  // 🔥 PROGRES MODAL STATE - NA LAYOUT NIVOU!
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [upgradeProgress, setUpgradeProgress] = useState(0)
  const [upgradeMessage, setUpgradeMessage] = useState('')
  
  // Subscription hook for menu badges
  const { subscription, plan, isFreemium, isPaid, refresh, loading: subscriptionLoading, isInGracePeriod, graceDaysRemaining, hasFeatureAccess } = useSubscription(majstor?.id)

  // Push notifikacije
  const { permission, subscribed: subscribedRaw, loading: pushLoading, supported: pushSupported, subscribe, unsubscribe } = usePushNotifications(majstor?.id)
  const [subscribed, setSubscribedOverride] = useState(null)
  const resolvedSubscribed = subscribed !== null ? subscribed : subscribedRaw
  useEffect(() => {
    const handler = (e) => setSubscribedOverride(e.detail.subscribed)
    window.addEventListener('push-subscription-changed', handler)
    return () => window.removeEventListener('push-subscription-changed', handler)
  }, [])

  
 // 🔥 LISTEN TO CUSTOM EVENTS + FORCE BADGE RE-RENDER
useEffect(() => {
  if (!majstor?.id) return

  console.log('🔔 [LAYOUT] Setting up custom event listener for badge...')

  // 🛑 DEBOUNCE - spreči višestruke pozive
  let isProcessing = false

  const handleSubscriptionChange = (event) => {
    if (isProcessing) {
      console.log('⏸️ [LAYOUT] Already processing, skipping...')
      return
    }
    
    isProcessing = true
    
    console.log('🔔 [LAYOUT] Subscription changed event received!', event.detail)
    refresh(true)
    setBadgeKey(prev => prev + 1)
    console.log('🔄 [LAYOUT] Badge will re-render with new data')
    
    // Reset flag nakon 2 sekunde
    setTimeout(() => {
      isProcessing = false
    }, 2000)
  }

  window.addEventListener('subscription-changed', handleSubscriptionChange)
  window.addEventListener('subscription-cancelled', handleSubscriptionChange)
  window.addEventListener('subscription-reactivated', handleSubscriptionChange)

  return () => {
    console.log('🧹 [LAYOUT] Cleaning up custom event listeners')
    window.removeEventListener('subscription-changed', handleSubscriptionChange)
    window.removeEventListener('subscription-cancelled', handleSubscriptionChange)
    window.removeEventListener('subscription-reactivated', handleSubscriptionChange)
  }

}, [majstor?.id, refresh])

// 🔥 BACKUP: Watch subscription/plan changes directly
useEffect(() => {
  if (subscription || plan) {
    console.log('🔄 [LAYOUT] Subscription/Plan changed, forcing badge update...')
    setBadgeKey(prev => prev + 1)
  }
}, [subscription?.status, subscription?.cancel_at_period_end, plan?.name])

// Avatar real-time update
useEffect(() => {
  const handleAvatarUpdate = (e) => {
    setMajstor(prev => prev ? { ...prev, avatar_url: e.detail.avatarUrl } : prev)
  }
  window.addEventListener('avatar-updated', handleAvatarUpdate)
  return () => window.removeEventListener('avatar-updated', handleAvatarUpdate)
}, [])

  // Upgrade Modal Hook
  const { isOpen: upgradeModalOpen, modalProps, showUpgradeModal: showFeatureModal, hideUpgradeModal } = useUpgradeModal()
  
  // Badge states
  const [badges, setBadges] = useState({
    inquiries: 0,
    invoices: 0,
  })
  const [activeWorkers, setActiveWorkers] = useState(0)
  const [openConvs, setOpenConvs] = useState(0)
  
  const router = useRouter()
  const searchParams = useSearchParams()



  // 🔥 EVENT LISTENER za subscription changes
  // useEffect(() => {
  //  const handleSubscriptionChanged = (event) => {
   //   console.log('📢 LAYOUT: subscription-changed event received!')
   //   console.log('Event detail:', event.detail)
      
   //   if (refresh && typeof refresh === 'function') {
   //     console.log('🔄 LAYOUT: Triggering subscription refresh...')
   //     refresh()
   //   }
   // }

   // window.addEventListener('subscription-changed', handleSubscriptionChanged)

  //  return () => {
  //    window.removeEventListener('subscription-changed', handleSubscriptionChanged)
  //  }
  // }, [refresh])

 // 🔥 GLAVNA LOGIKA: Detektuj paddle_success ili fastspring_success ODMAH i prikaži modal PRE svega!
  useEffect(() => {
    const paddleSuccess = searchParams.get('paddle_success')
    const fastspringSuccess = searchParams.get('fastspring_success')
    const planType = searchParams.get('plan')
    
    if ((paddleSuccess === 'true' || fastspringSuccess === 'true') && !showUpgradeModal) {
      const provider = fastspringSuccess === 'true' ? 'FastSpring' : 'Paddle'
      console.log(`🎯 LAYOUT: ${provider} payment detected - showing progress modal IMMEDIATELY!`)
      startUpgradeProcess(planType, provider)
    }
  }, [searchParams, showUpgradeModal])

  const startUpgradeProcess = (planType, provider = 'Paddle') => {
  setShowUpgradeModal(true)
  setUpgradeProgress(0)
  setUpgradeMessage('Zahlung erfolgreich! Aktiviere PRO...')
  
  // Progress stages (12 sekundi ukupno)
  const stages = [
    { delay: 0, progress: 0, message: 'Zahlung erfolgreich!' },
    { delay: 1500, progress: 15, message: `Verbindung zu ${provider}...` },
    { delay: 3000, progress: 30, message: 'Warte auf Bestätigung...' },
    { delay: 4500, progress: 45, message: 'Subscription wird erstellt...' },
    { delay: 6000, progress: 60, message: 'Synchronisiere...' },
    { delay: 8000, progress: 75, message: 'Fast fertig...' },
    { delay: 10000, progress: 90, message: 'Aktivierung läuft...' },
    { delay: 11500, progress: 100, message: '✅ Abgeschlossen!' }
  ]
  
  stages.forEach((stage) => {
    setTimeout(() => {
      setUpgradeProgress(stage.progress)
      setUpgradeMessage(stage.message)
    }, stage.delay)
  })
  
  // Nach 12 Sekunden: Redirect
  setTimeout(() => {
    const url = new URL(window.location.href)
    url.searchParams.delete('fastspring_success')
    url.searchParams.delete('paddle_success')
    url.searchParams.delete('plan')
    window.history.replaceState({}, '', url.toString())
    window.location.reload()
  }, 12000)
}
  useEffect(() => {
    checkUser()
  }, [])

  const loadBadgeCounts = async () => {
    if (!majstor?.id) return

    try {
      const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' })


      const [inquiriesResult, overdueResult] = await Promise.all([
        supabase
          .from('inquiries')
          .select('id', { count: 'exact', head: true })
          .eq('majstor_id', majstor.id)
          .eq('status', 'new'),

        supabase
          .from('invoices')
          .select('id', { count: 'exact', head: true })
          .eq('majstor_id', majstor.id)
          .eq('type', 'invoice')
          .in('status', ['sent', 'draft'])
          .lt('due_date', today),
      ])

      setBadges({
        inquiries: inquiriesResult.count || 0,
        invoices: overdueResult.count || 0,
      })

      // Active workers + open conversations count (for team owners)
      if (majstor.role !== 'worker') {
        const { data: members } = await supabase
          .from('team_members')
          .select('worker_id')
          .eq('owner_id', majstor.id)
          .eq('status', 'active')
        const activeWorkerIds = (members || []).map(m => m.worker_id).filter(Boolean)
        if (activeWorkerIds.length > 0) {
          const { count } = await supabase
            .from('work_times')
            .select('id', { count: 'exact', head: true })
            .in('worker_id', activeWorkerIds)
            .eq('status', 'running')
          setActiveWorkers(count || 0)
        }

        // Count ALL open non-broadcast conversations (including removed workers)
        const { count: convCount } = await supabase
          .from('conversations')
          .select('id', { count: 'exact', head: true })
          .eq('owner_id', majstor.id)
          .eq('status', 'open')
          .eq('is_broadcast', false)
          .not('worker_id', 'is', null)
        setOpenConvs(convCount || 0)
      }

    } catch (error) {
      console.error('Error loading badge counts:', error)
    }
  }

  // Expose on window so child pages can trigger badge refresh
  useEffect(() => {
    window.__refreshBadges = loadBadgeCounts
  })

  useEffect(() => {
    if (majstor?.id) {
      loadBadgeCounts()
      const interval = setInterval(loadBadgeCounts, 5 * 60 * 1000)
      return () => clearInterval(interval)
    }
  }, [majstor?.id])

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
        // Buchhalter doesn't need a subscription
      if (majstorData.role === 'buchhalter') {
        setMajstor(majstorData)
        if (window.location.pathname === '/dashboard' || window.location.pathname === '/dashboard/') {
          router.push('/dashboard/buchhalter')
        }
        return
      }

      if (majstorData.role === 'worker') {
        // Check if worker is still active in team
        const { data: membership } = await supabase
          .from('team_members')
          .select('status')
          .eq('worker_id', currentUser.id)
          .single()

        if (!membership || membership.status === 'removed') {
          await supabase.auth.signOut()
          router.push('/join?deactivated=true')
          return
        }

        setMajstor(majstorData)
        if (window.location.pathname === '/dashboard' || window.location.pathname === '/dashboard/') {
          router.push('/dashboard/worker')
        }
        return
      }

      if (!majstorData.subscription_status) {
          router.push('/welcome/choose-plan')
          return
        }

        const { data: subData, error: subError } = await supabase
          .from('user_subscriptions')
          .select('status, subscription_plans(name, display_name)')
          .eq('majstor_id', currentUser.id)
          .eq('status', 'active')
          .maybeSingle()

        console.log('🔑 Subscription fetch:', { subData, subError })

        majstorData.sub_status = subData?.status ?? null
        majstorData.sub_plan   = subData?.subscription_plans?.name ?? null
        console.log('🔑 isPro data:', { sub_status: majstorData.sub_status, sub_plan: majstorData.sub_plan })

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
    if (!confirm('Möchten Sie sich wirklich abmelden?')) return
    try {
      await auth.signOut()
      router.push(isWorker ? '/join' : '/')
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
  // 1) loading
  if (subscriptionLoading) {
    return { text: '...', color: 'bg-gradient-to-r from-slate-500 to-slate-600' }
  }

  // 2) hook još nije inicijalizovan
  if (majstor?.id && !subscription && !plan) {
    return { text: '...', color: 'bg-gradient-to-r from-slate-500 to-slate-600' }
  }

  // 3) grace period => poseban badge
  if (!subscription && isInGracePeriod) {
    return { text: `${graceDaysRemaining}T gratis`, color: 'bg-gradient-to-r from-blue-500 to-violet-500' }
  }

  // 4) nema subscription => upgrade
  if (!subscription) {
    return { text: 'Upgrade', color: 'bg-gradient-to-r from-yellow-500 to-orange-500' }
  }

  const now = new Date()
  const periodEnd = new Date(subscription.current_period_end)
  const daysLeft = Math.ceil((periodEnd - now) / (1000 * 60 * 60 * 24))
  const formatDays = (days) => (days === 1 ? '1 Tag' : `${days} Tage`)

  // expired period => upgrade
  if (periodEnd <= now) {
    return { text: 'Upgrade', color: 'bg-gradient-to-r from-yellow-500 to-orange-500' }
  }

  // ✅ CANCELLED / otkazano: Gekündigt + dani do isteka perioda
  if (subscription.cancel_at_period_end === true || subscription.status === 'cancelled' || subscription.cancelled_at) {
    return {
      text: `Gekündigt (${formatDays(daysLeft)})`,
      color: 'bg-gradient-to-r from-orange-500 to-red-500',
      multiline: true
    }
  }

  // ✅ Detect PRO vs PRO+
  const isProPlus = plan?.name === 'pro_plus'
  const planLabel = isProPlus ? 'PRO+' : 'PRO'
  const activeColor = isProPlus
    ? 'bg-gradient-to-r from-purple-500 to-pink-500'
    : 'bg-gradient-to-r from-green-500 to-emerald-500'

  // ✅ ACTIVE: PRO or PRO+
  if (subscription.status === 'active') {
    return { text: planLabel, color: activeColor }
  }

  // ✅ TRIAL: samo kad je status trial
  if (subscription.status === 'trial') {
    const trialEnd = subscription.trial_ends_at ? new Date(subscription.trial_ends_at) : periodEnd
    const trialDaysLeft = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24))

    // trial istekao, čeka se webhook
    if (trialEnd <= now) {
      return {
        text: 'Aktivierung...',
        color: 'bg-gradient-to-r from-yellow-500 to-orange-500 animate-pulse'
      }
    }

    return {
      text: `${planLabel}(${formatDays(trialDaysLeft)})`,
      color: isProPlus
        ? 'bg-gradient-to-r from-purple-500 to-pink-500'
        : 'bg-gradient-to-r from-yellow-500 to-orange-500',
      multiline: true
    }
  }

  // fallback
  return { text: 'Upgrade', color: 'bg-gradient-to-r from-yellow-500 to-orange-500' }
}

// app/dashboard/layout.js - FINALNI SA ISPRAVNIM REDOM I ORIGINAL FONT SIZE
// Samo izmeni getNavigation() i NavigationItem

// app/dashboard/layout.js - FINALNI SA ISPRAVNIM REDOM I ORIGINAL FONT SIZE
// Samo izmeni getNavigation() i NavigationItem

const isBuchhalter = majstor?.role === 'buchhalter'
const isWorker = majstor?.role === 'worker'

const { getFavoriteItems, getNonFavoriteItems, editMode: favEditMode, setEditMode: setFavEditMode, toggleFavorite, favorites: favKeys, MAX_FAVORITES } = useFavorites()

const getBuchhalterNavigation = () => [
  { name: 'Meine Auftraggeber', href: '/dashboard/buchhalter', icon: '📒', protected: false },
]

const getWorkerNavigation = () => [
  { name: 'Übersicht', href: '/dashboard/worker', icon: '👷', protected: false },
  { name: 'Feed', href: '/dashboard/worker/feed', icon: '📡', protected: false },
  { name: 'Aufgaben', href: '/dashboard/worker/aufgaben', icon: '📋', protected: false },
  { name: 'Zeiterfassung', href: '/dashboard/worker/time', icon: '⏱️', protected: false },
]

const getNavigation = () => {
  return [
    { name: 'Übersicht', href: '/dashboard', icon: '📊', protected: false },

    { isGroupHeader: true, label: 'Finanzen', key: 'gh-finanzen' },
    { name: 'Rechnungen', href: '/dashboard/invoices', icon: '📄', badge: formatBadgeCount(badges.invoices), badgeColor: 'bg-red-500', protected: true, feature: 'invoicing' },
    { name: 'Ausgaben', href: '/dashboard/ausgaben', icon: '🧾', protected: true, feature: 'pdf_archive' },
    { name: 'Buchhalter', href: '/dashboard/pdf-archive', icon: '🗂️', protected: true, feature: 'pdf_archive' },

    { isGroupHeader: true, label: 'Baustelle', key: 'gh-baustelle' },
    { name: 'Aufmaß', href: '/dashboard/aufmass', icon: '📐', protected: true, feature: 'invoicing' },

    { isGroupHeader: true, label: 'Team', key: 'gh-team' },
    { name: 'Mitglieder', href: '/dashboard/team', icon: '👷', protected: true, feature: 'team', subtitle: activeWorkers > 0 ? `⏱️ ${activeWorkers} aktiv` : null },
    { name: 'Feed', href: '/dashboard/team/feed', icon: '📡', protected: true, feature: 'team' },
    { name: 'Offen', href: '/dashboard/team/aufgaben', icon: '📋', badge: openConvs > 0 ? String(openConvs) : null, badgeColor: 'bg-orange-500', protected: true, feature: 'team' },
    { name: 'Erledigt', href: '/dashboard/team/berichte', icon: '📝', protected: true, feature: 'team' },

    { isGroupHeader: true, label: 'Marketing', key: 'gh-marketing' },
    { name: 'Visitenkarte', href: '/dashboard/business-card/create', icon: '📱', protected: false },
    { name: 'Kundenanfragen', href: '/dashboard/inquiries', icon: '📧', badge: formatBadgeCount(badges.inquiries), badgeColor: 'bg-red-500', protected: false },

    { isGroupHeader: true, label: 'Stammdaten', key: 'gh-stammdaten' },
    { name: 'Meine Kunden', href: '/dashboard/customers', icon: '👥', protected: true, feature: 'customer_management' },
    { name: 'Meine Services', href: '/dashboard/services', icon: '🔧', protected: true, feature: 'services_management' },
  ]
}

const NavigationItem = ({ item, isMobile = false }) => {
  if (item.isGroupHeader) {
    return item.label ? (
      <p className="px-3 pt-4 pb-1 text-xs font-semibold text-slate-500 uppercase tracking-wider">
        {item.label}
      </p>
    ) : <div className="mt-3 border-t border-slate-700/50" />
  }

  const separator = item.isSeparator ? 'mt-6 pt-6 border-t border-slate-700' : ''
  const bottomBorder = item.hasBottomBorder ? 'mb-6 pb-6 border-b border-slate-700' : ''

  const baseClasses = `
    group flex items-center w-full px-3 py-1.5 text-sm font-medium rounded-md transition-all
    ${separator}
    ${bottomBorder}
  `

  // 🆕 AKO JE BUTTON (Support Modal)
  if (item.isButton) {
    return (
      <button
        onClick={item.onClick}
        className={`
          ${baseClasses}
          w-full text-left
          text-slate-300 hover:bg-slate-700 hover:text-white
        `}
      >
        <span className="mr-3 w-6 shrink-0 text-lg">{item.icon}</span>
        <span className="flex-1">{item.name}</span>
      </button>
    )
  }

  const linkClasses = `
    ${baseClasses}
    text-slate-300 hover:bg-slate-700 hover:text-white
  `

  const content = (
    <>
      <span className="mr-3 w-6 shrink-0 text-lg">{item.icon}</span>
      <span className="flex-1">
        {item.name}
        {item.subtitle && (
          <span className="block text-xs text-green-400 font-normal leading-tight">{item.subtitle}</span>
        )}
      </span>

      {/* Regular Badge Display (brojevi) */}
      {item.badge && typeof item.badge === 'string' && (
        <span className={`
          ml-2 px-2 py-1 text-xs font-medium rounded-full text-white
          ${item.badgeColor || 'bg-red-500'}
        `}>
          {item.badge}
        </span>
      )}
      
      {/* Subscription Badge (PRO, Upgrade, Trial) */}
      {item.badge && typeof item.badge === 'object' && (
        <span className={`
          ml-2 px-2 py-1 text-xs font-medium rounded-full text-white shadow-sm
          ${item.badge.multiline 
            ? 'whitespace-pre-line text-center leading-tight' 
            : ''
          }
          ${item.badge.color}
        `}>
          {item.badge.text}
        </span>
      )}
      
      {/* 🆕 External Link Icon */}
      {item.target === '_blank' && (
        <span className="ml-2 text-slate-400 text-xs">↗</span>
      )}
    </>
  )

  // 🔒 PROTECTED FEATURES - sa badge dizajnom
  const isFeatureLocked = item.protected && (
    (isFreemium && !isInGracePeriod) ||
    (item.feature === 'team' && !hasFeatureAccess('team'))
  )

  if (isFeatureLocked) {
    const badgeLabel = item.feature === 'team' ? 'Pro+' : 'Pro'
    return (
      <button
        onClick={() => {
          showFeatureModal({
            feature: item.feature || 'premium_feature',
            featureName: item.name,
            currentPlan: plan?.name || 'freemium'
          })
        }}
        className={linkClasses}
      >
        <span className="mr-3 w-6 shrink-0 text-lg opacity-75">{item.icon}</span>
        <span className="flex-1 text-left">{item.name}</span>

        {/* 🔒 BADGE - sa katancem */}
        <span className="ml-auto shrink-0 px-2 py-1 text-xs bg-blue-600 text-white rounded-full font-medium inline-flex items-center gap-1">
          <span>🔒</span>
          <span>{badgeLabel}</span>
        </span>
      </button>
    )
  }

  // Regular navigation links
  return (
    <Link
      href={item.href}
      target={item.target || '_self'}
      rel={item.target === '_blank' ? 'noopener noreferrer' : undefined}
      className={linkClasses}
      onClick={isMobile ? () => setSidebarOpen(false) : undefined}
    >
      {content}
    </Link>
  )
}

  // Favoriten Section for sidebar
  const FavoritenSection = ({ isMobile = false }) => {
    const favItems = getFavoriteItems()

    return (
      <div className="px-2 pt-2 pb-1 border-b border-slate-700">
        <div className="flex items-center justify-between px-3 pb-1">
          <p className="text-xs font-semibold text-yellow-400/80 uppercase tracking-wider">Favoriten</p>
          <button
            onClick={() => setFavEditMode(!favEditMode)}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            {favEditMode ? 'Fertig' : 'Anpassen'}
          </button>
        </div>

        {!favEditMode && favItems.length === 0 && (
          <p className="px-3 py-2 text-xs text-slate-500 italic">Keine Favoriten gesetzt</p>
        )}
        {favItems.map(item => {
          const isLocked = item.protected && (
            (isFreemium && !isInGracePeriod) ||
            (item.feature === 'team' && !hasFeatureAccess('team'))
          )

          if (favEditMode) {
            return (
              <button
                key={item.key}
                onClick={() => toggleFavorite(item.key)}
                className="group flex items-center w-full px-3 py-1.5 text-sm font-medium rounded-md text-yellow-300 hover:bg-slate-700 transition-all"
              >
                <span className="mr-3 w-6 shrink-0 text-lg">{item.icon}</span>
                <span className="flex-1">{item.name}</span>
                <span className="w-5 h-5 rounded-full bg-yellow-500 text-black text-xs flex items-center justify-center">−</span>
              </button>
            )
          }

          if (isLocked) {
            const badgeLabel = item.feature === 'team' ? 'Pro+' : 'Pro'
            return (
              <button
                key={item.key}
                onClick={() => showFeatureModal({ feature: item.feature, featureName: item.name, currentPlan: plan?.name || 'freemium' })}
                className="group flex items-center w-full px-3 py-1.5 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-700 transition-all"
              >
                <span className="mr-3 w-6 shrink-0 text-lg opacity-75">{item.icon}</span>
                <span className="flex-1 text-left">{item.name}</span>
                <span className="ml-auto shrink-0 px-2 py-1 text-xs bg-blue-600 text-white rounded-full font-medium inline-flex items-center gap-1">
                  <span>🔒</span><span>{badgeLabel}</span>
                </span>
              </button>
            )
          }

          return (
            <Link
              key={item.key}
              href={item.href}
              onClick={isMobile ? () => setSidebarOpen(false) : undefined}
              className="group flex items-center px-3 py-1.5 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-700 hover:text-white transition-all"
            >
              <span className="mr-3 w-6 shrink-0 text-lg">{item.icon}</span>
              <span className="flex-1">{item.name}</span>
            </Link>
          )
        })}

        {/* Edit mode: show non-favorites with + button */}
        {favEditMode && getNonFavoriteItems().length > 0 && (
          <>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 pt-3 pb-1">Hinzufügen</p>
            {getNonFavoriteItems().map(item => {
              const canAdd = favKeys.length < MAX_FAVORITES
              return (
                <button
                  key={item.key}
                  onClick={canAdd ? () => toggleFavorite(item.key) : undefined}
                  className={`group flex items-center w-full px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                    canAdd ? 'text-slate-400 hover:bg-slate-700 hover:text-white' : 'text-slate-600 cursor-not-allowed'
                  }`}
                >
                  <span className="mr-3 w-6 shrink-0 text-lg">{item.icon}</span>
                  <span className="flex-1">{item.name}</span>
                  <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center ${
                    canAdd ? 'bg-slate-600 text-slate-300' : 'bg-slate-800 text-slate-600'
                  }`}>+</span>
                </button>
              )
            })}
          </>
        )}
      </div>
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
          <div className="animate-spin rounded-full h-20 w-20 border-[6px] border-slate-600 border-t-blue-500 mx-auto mb-6"></div>
          <div className="text-white text-xl mb-2">Laden...</div>
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

  const navigation = isWorker ? getWorkerNavigation() : isBuchhalter ? getBuchhalterNavigation() : getNavigation()

  const partnerItem = majstor?.is_partner
    ? { name: 'Mein ProMeister Partner', href: '/dashboard/partner', icon: '🤝', protected: false }
    : null

  const mitgliedschaftItem = { name: 'Meine Mitgliedschaft', href: '/dashboard/subscription', icon: '💎', protected: false, badge: getSubscriptionBadge() }

  const bottomNavigation = isWorker ? [] : [
    { name: 'Einstellungen', href: '/dashboard/settings', icon: '⚙️', protected: false },
    { name: 'FAQ & Hilfe', href: '/dashboard/help', icon: '📚', protected: false },
  ]

  return (
    <>
      {/* 🔥 PROGRES MODAL - RENDERUJE SE PRVI, PRE SVEGA! */}
      <UpgradeProcessingModal />

      <div className="min-h-screen bg-slate-900 flex">
       
      
        
        {/* 🔥 Swipe Indicator - vizuelni hint za korisnika (nicht für Worker) */}
        {!isWorker && !sidebarOpen && (
          <div className="lg:hidden fixed left-0 top-1/2 -translate-y-1/2 z-30 pointer-events-none">
            <div className="w-1 h-16 bg-gradient-to-r from-blue-500/30 to-transparent rounded-r-full animate-pulse"></div>
          </div>
        )}

        {!isWorker && sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Desktop Sidebar (nicht für Worker) */}
        <div className={`hidden ${!isBuchhalter && !isWorker ? 'lg:flex' : ''} lg:flex-shrink-0`}>
          <div className="flex flex-col w-64 bg-slate-800 border-r border-slate-700">
            
            <div className="flex items-center h-16 px-4 border-b border-slate-700">
              <Link href="/" className="text-xl font-bold text-white">
                Pro-meister<span className="text-blue-400">.de</span>
              </Link>
            </div>

            <div className="px-4 py-4 border-b border-slate-700">
              <div className="flex items-center space-x-3">
                {majstor?.avatar_url ? (
                  <img src={majstor.avatar_url} alt="Avatar" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                    {majstor?.full_name?.charAt(0) || user?.email?.charAt(0) || 'M'}
                  </div>
                )}
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

            <div key={badgeKey + '-scroll'} className="flex-1 overflow-y-auto overscroll-contain">
              {!isBuchhalter && !isWorker && (
                <div className="px-2 pt-2 pb-1 border-b border-slate-700">
                  <NavigationItem item={mitgliedschaftItem} />
                </div>
              )}

              {!isBuchhalter && !isWorker && <FavoritenSection />}

              <nav className="px-2 py-4 pb-20 space-y-1">
                {navigation.map((item) => (
                  <NavigationItem key={item.key || item.name} item={item} />
                ))}
              </nav>
            </div>

            <div className="border-t border-slate-700 px-2 py-2">
              {!isBuchhalter && bottomNavigation.map((item) => (
                <NavigationItem key={item.name} item={item} />
              ))}
              {!isBuchhalter && partnerItem && <NavigationItem item={partnerItem} />}
              {!isBuchhalter && ADMIN_EMAILS.includes(majstor?.email) && (
                <Link
                  href="/dashboard/admin"
                  className="w-full flex items-center px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-700 rounded-md transition-colors"
                >
                  <span className="mr-3">🛡️</span>
                  Admin Panel
                </Link>
              )}
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

        {/* Mobile Sidebar (nicht für Worker) */}
        <div
          className={`${isBuchhalter || isWorker ? 'hidden' : ''} lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-slate-800 border-r border-slate-700 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
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
                {majstor?.avatar_url ? (
                  <img src={majstor.avatar_url} alt="Avatar" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                    {majstor?.full_name?.charAt(0) || user?.email?.charAt(0) || 'M'}
                  </div>
                )}
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

            <div key={badgeKey + '-mscroll'} className="flex-1 overflow-y-auto overscroll-contain">
              {!isBuchhalter && !isWorker && (
                <div className="px-2 pt-2 pb-1 border-b border-slate-700">
                  <NavigationItem item={mitgliedschaftItem} isMobile={true} />
                </div>
              )}

              {!isBuchhalter && !isWorker && <FavoritenSection isMobile={true} />}

              <nav className="px-2 py-4 pb-20 space-y-1">
                {navigation.map((item) => (
                  <NavigationItem key={item.key || item.name} item={item} isMobile={true} />
                ))}
              </nav>
            </div>

            <div className="border-t border-slate-700 px-2 py-2">
              {!isBuchhalter && bottomNavigation.map((item) => (
                <NavigationItem key={item.name} item={item} isMobile={true} />
              ))}
              {!isBuchhalter && partnerItem && <NavigationItem item={partnerItem} isMobile={true} />}
              {!isBuchhalter && ADMIN_EMAILS.includes(majstor?.email) && (
                <Link
                  href="/dashboard/admin"
                  onClick={() => setSidebarOpen(false)}
                  className="w-full flex items-center px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-700 rounded-md transition-colors"
                >
                  <span className="mr-3">🛡️</span>
                  Admin Panel
                </Link>
              )}
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
                {!isBuchhalter && !isWorker && (
                  <button
                    onClick={() => setSidebarOpen(true)}
                    className="lg:hidden text-slate-400 hover:text-white p-1"
                  >
                    <span className="text-xl">☰</span>
                  </button>
                )}
                
                <h1 className={`text-base font-semibold text-white whitespace-nowrap ${isWorker ? 'hidden sm:block' : ''}`}>
                  {isBuchhalter ? 'Buchhaltungs-Portal' : <span>Pro-Meister<span className="text-blue-400">.de</span></span>}
                </h1>
              </div>

              <div className="flex items-center space-x-3">
                {!isBuchhalter && (pushSupported && !resolvedSubscribed && permission !== 'denied' ? (
                  <button
                    onClick={subscribe}
                    disabled={pushLoading}
                    title="Push-Benachrichtigungen aktivieren"
                    className="relative p-2 text-white opacity-50 hover:opacity-80 transition-colors disabled:opacity-30"
                  >
                    {pushLoading ? (
                      <span className="text-xl">⏳</span>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-4-5.659V4a2 2 0 10-4 0v1.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0a3 3 0 11-6 0m6 0H9" />
                        <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round"/>
                      </svg>
                    )}
                  </button>
                ) : (
                  <button
                    className="relative p-2 hover:opacity-80 transition-colors"
                    style={{ color: '#facc15' }}
                    onClick={unsubscribe}
                    disabled={pushLoading}
                    title="Push-Benachrichtigungen deaktivieren"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-4-5.659V4a2 2 0 10-4 0v1.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0a3 3 0 11-6 0m6 0H9" />
                      </svg>
                    {(badges.inquiries + badges.invoices) > 0 && (
                      <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
                    )}
                  </button>
                ))}

                <button
                  className="relative p-2 hover:opacity-80 transition-colors"
                  style={{ color: '#3b82f6' }}
                  onClick={openSupport}
                  title="Support kontaktieren"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                </button>

                <button
                  onClick={toggleTheme}
                  title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                  className="p-2 text-slate-400 hover:text-white transition-colors text-lg"
                >
                  {theme === 'dark' ? '☀️' : '🌙'}
                </button>

                {isBuchhalter && (
                  <button
                    onClick={handleSignOut}
                    className="text-sm text-slate-400 hover:text-white transition-colors px-2 py-1"
                  >
                    🚪 Abmelden
                  </button>
                )}
                {/* Worker: avatar with dropdown (Profilbild + Abmelden) */}
                {isWorker && (
                  <div className="relative" ref={workerMenuRef}>
                    <input ref={workerAvatarInputRef} type="file" accept="image/*" onChange={handleWorkerAvatarUpload} className="hidden" />
                    <button onClick={() => setWorkerMenuOpen(!workerMenuOpen)} className="flex-shrink-0">
                      {majstor?.avatar_url ? (
                        <div className="w-8 h-8 rounded-full overflow-hidden">
                          <img src={majstor.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                          {majstor?.full_name?.charAt(0) || user?.email?.charAt(0) || 'M'}
                        </div>
                      )}
                    </button>
                    {workerMenuOpen && (
                      <div className="absolute right-0 top-full mt-2 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-lg overflow-hidden z-50">
                        <button
                          onClick={() => workerAvatarInputRef.current?.click()}
                          className="flex items-center gap-2 w-full px-4 py-3 text-sm text-white hover:bg-slate-700 transition-colors"
                        >
                          📷 Profilbild ändern
                        </button>
                        <button
                          onClick={handleSignOut}
                          className="flex items-center gap-2 w-full px-4 py-3 text-sm text-red-400 hover:bg-slate-700 transition-colors border-t border-slate-700"
                        >
                          🚪 Abmelden
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {!isBuchhalter && !isWorker && (isFreemium ? (
                  majstor?.avatar_url ? (
                    <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                      <img src={majstor.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                      {majstor?.full_name?.charAt(0) || user?.email?.charAt(0) || 'M'}
                    </div>
                  )
                ) : (
                  <Link
                    href="/dashboard/settings"
                    className="flex items-center space-x-2 text-slate-400 hover:text-white transition-colors"
                  >
                    {majstor?.avatar_url ? (
                      <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                        <img src={majstor.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                        {majstor?.full_name?.charAt(0) || user?.email?.charAt(0) || 'M'}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          </header>

          {isInGracePeriod && graceDaysRemaining > 0 && (
            <div className="grace-banner bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap">
              <span className="text-white text-sm">
                🎁 Du hast noch <strong>{graceDaysRemaining} {graceDaysRemaining === 1 ? 'Tag' : 'Tage'}</strong> vollen PRO-Zugriff kostenlos — alle Funktionen freigeschaltet!
              </span>
              <Link href="/dashboard/subscription" className="bg-white text-blue-700 text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap hover:bg-blue-50 transition-colors">
                Jetzt PRO werden →
              </Link>
            </div>
          )}

          <main className="flex-1 overflow-y-auto bg-slate-900 p-4 lg:p-6 pb-28">
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

        {!isBuchhalter && !isWorker && <AIHelpChat />}
        <ScrollToTopButton />
      </div>
    </>
  )
}

export default function DashboardLayout({ children }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-20 w-20 border-[6px] border-slate-600 border-t-blue-500 mx-auto mb-6"></div>
          <div className="text-white text-xl">Laden...</div>
        </div>
      </div>
    }>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </Suspense>
  )
}