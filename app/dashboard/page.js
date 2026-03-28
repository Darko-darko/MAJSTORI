// app/dashboard/page.js - SIMPLIFIED (modal je u layout-u!)

'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { UpgradeModal, useUpgradeModal } from '@/app/components/subscription/UpgradeModal'
import { useSubscription } from '@/lib/hooks/useSubscription'
import { useFavorites } from '@/lib/hooks/useFavorites'
import Link from 'next/link'
import FirstVisitHint from '@/app/components/FirstVisitHint'

function DashboardPageContent() {
  const [majstor, setMajstor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  const { isOpen: upgradeFeatureModalOpen, modalProps, showUpgradeModal: showFeatureUpgradeModal, hideUpgradeModal } = useUpgradeModal()
  
  const { isFreemium, isInGracePeriod, hasFeatureAccess, refresh: refreshSubscription } = useSubscription(majstor?.id)
  const { favorites, editMode, setEditMode, toggleFavorite, getFavoriteItems, getNonFavoriteItems, MAX_FAVORITES } = useFavorites()
  
  const [stats, setStats] = useState({
    totalInquiries: 0,
    newInquiries: 0,
    totalInvoices: 0,
    totalCustomers: 0
  })

  const [welcomeMessage, setWelcomeMessage] = useState(false)
  
  const searchParams = useSearchParams()

  // 🔥 EVENT LISTENER za subscription changes
  useEffect(() => {
    const handleSubscriptionChanged = (event) => {
      console.log('🔔 DASHBOARD PAGE: subscription-changed event received!')
      
      if (refreshSubscription && typeof refreshSubscription === 'function') {
        console.log('🔄 DASHBOARD PAGE: Triggering subscription refresh...')
        refreshSubscription()
      }
    }

    window.addEventListener('subscription-changed', handleSubscriptionChanged)

    return () => {
      window.removeEventListener('subscription-changed', handleSubscriptionChanged)
    }
  }, [refreshSubscription])

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
      const [totalInq, newInq, invoiceCount, customerCount] = await Promise.all([
        supabase.from('inquiries').select('id', { count: 'exact', head: true }).eq('majstor_id', userId),
        supabase.from('inquiries').select('id', { count: 'exact', head: true }).eq('majstor_id', userId).eq('status', 'new'),
        supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('majstor_id', userId).eq('type', 'invoice').neq('status', 'dummy'),
        supabase.from('customers').select('id', { count: 'exact', head: true }).eq('majstor_id', userId).neq('name', 'DUMMY_ENTRY_FOR_NUMBERING'),
      ])

      setStats(prev => ({
        ...prev,
        totalInquiries: totalInq.count || 0,
        newInquiries: newInq.count || 0,
        totalInvoices: invoiceCount.count || 0,
        totalCustomers: customerCount.count || 0,
      }))
    } catch (err) {
      console.error('Error loading stats:', err)
    }
  }

  useEffect(() => {
    if (majstor?.id) {
      const interval = setInterval(() => loadStats(majstor.id), 5 * 60 * 1000)
      const onVisible = () => {
        if (document.visibilityState === 'visible') loadStats(majstor.id)
      }
      document.addEventListener('visibilitychange', onVisible)
      return () => {
        clearInterval(interval)
        document.removeEventListener('visibilitychange', onVisible)
      }
    }
  }, [majstor?.id])

  const handleProtectedFeatureClick = (feature, featureName) => {
    showFeatureUpgradeModal(feature, featureName, 'Freemium')
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

  const ProtectedStatCard = ({ href, icon, title, value, subtitle, badgeCount, iconBg }) => {
    if (isFreemium && !isInGracePeriod) {
      return (
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 relative">
          <span className="absolute top-2 right-2 px-1 py-0.5 text-xs rounded font-medium" style={{ backgroundColor: '#2563eb', color: '#ffffff' }}>🔒 Pro</span>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">{title}</p>
              <p className="text-3xl font-bold text-white">
                {value}
              </p>
              <p className="text-sm text-slate-400">{subtitle}</p>
            </div>
            <div className={`w-12 h-12 ${iconBg} rounded-xl flex items-center justify-center text-2xl opacity-75`}>
              {icon}
            </div>
          </div>
        </div>
      )
    }

    return (
      <Link 
        href={href}
        className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 hover:border-blue-500 hover:shadow-lg transition-all cursor-pointer group relative"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-sm">{title}</p>
            <p className="text-3xl font-bold text-white group-hover:text-blue-400 transition-colors">
              {value}
            </p>
            <p className="text-sm text-slate-400">{subtitle}</p>
          </div>
          <div className={`w-12 h-12 ${iconBg} rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform`}>
            {icon}
          </div>
        </div>
        {badgeCount > 0 && (
          <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-semibold">
            {badgeCount > 9 ? '9+' : badgeCount}
          </span>
        )}
      </Link>
    )
  }

  const QuickItem = ({ item, isFav, editMode, onToggle, canAddMore = true, isFreemium, isInGracePeriod, hasFeatureAccess, onProtectedClick, stats }) => {
    const isLocked = item.protected && isFreemium && !isInGracePeriod
    const isTeamLocked = item.feature === 'team' && !hasFeatureAccess('team')
    const locked = isLocked || isTeamLocked

    // Edit mode: tap to toggle favorite
    if (editMode) {
      const canToggle = isFav || canAddMore
      return (
        <button
          onClick={canToggle ? onToggle : undefined}
          className={`relative rounded-lg p-4 text-center transition-all ${
            isFav
              ? 'bg-yellow-500/10 border-2 border-yellow-500/50'
              : canToggle
                ? 'bg-slate-800/50 border border-slate-700 hover:border-slate-500'
                : 'bg-slate-800/30 border border-slate-800 opacity-40 cursor-not-allowed'
          }`}
        >
          <div className="text-2xl mb-2">{item.icon}</div>
          <div className={`font-medium text-sm ${isFav ? 'text-yellow-300' : 'text-slate-400'}`}>{item.name}</div>
          <span className={`absolute top-1 right-1 w-5 h-5 rounded-full text-xs flex items-center justify-center ${
            isFav ? 'bg-yellow-500 text-black' : 'bg-slate-600 text-slate-300'
          }`}>
            {isFav ? '−' : '+'}
          </span>
        </button>
      )
    }

    // Locked state
    if (locked) {
      const badgeLabel = item.feature === 'team' ? 'Pro+' : 'Pro'
      const featureNames = {
        'customer_management': 'Kundenverwaltung',
        'invoicing': 'Rechnungen & Angebote',
        'services_management': 'Services Verwaltung',
        'pdf_archive': 'PDF Archiv',
        'team': 'Team Funktionen',
      }
      return (
        <button
          onClick={() => onProtectedClick(item.feature, featureNames[item.feature] || item.name)}
          className={`relative rounded-lg p-4 text-center transition-colors group ${
            isFav ? 'bg-yellow-500/5 border border-yellow-500/20' : 'bg-slate-800/50 border border-slate-600'
          } hover:border-slate-500`}
        >
          <div className="text-2xl mb-2 opacity-60">{item.icon}</div>
          <div className="text-slate-400 font-medium text-sm">{item.name}</div>
          <span className="absolute top-2 right-2 px-1 py-0.5 text-xs bg-blue-600 text-white rounded font-medium">🔒 {badgeLabel}</span>
        </button>
      )
    }

    // Normal state
    return (
      <Link
        href={item.href}
        className={`relative rounded-lg p-4 text-center transition-colors group ${
          isFav ? 'bg-yellow-500/5 border border-yellow-500/20 hover:border-yellow-500/40' : 'bg-slate-800/50 border border-slate-700 hover:border-slate-600'
        }`}
      >
        <div className="text-2xl mb-2">{item.icon}</div>
        <div className="text-white font-medium text-sm group-hover:text-blue-300 transition-colors">{item.name}</div>
        {item.key === 'kundenanfragen' && stats.newInquiries > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {stats.newInquiries > 9 ? '9+' : stats.newInquiries}
          </span>
        )}
      </Link>
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
    <div className="space-y-8">
      <FirstVisitHint pageKey="ubersicht" />
      <WelcomeMessage />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        <ProtectedStatCard
          href="/dashboard/invoices?tab=invoices"
          icon="📄"
          iconBg="bg-purple-600"
          title="Rechnungen"
          value={stats.totalInvoices}
          subtitle="Erstellt"
          badgeCount={0}
        />

        <Link
          href="/dashboard/inquiries"
          className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 hover:border-blue-500 hover:shadow-lg transition-all cursor-pointer group relative"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Kundenanfragen</p>
              <p className="text-3xl font-bold text-white group-hover:text-blue-400 transition-colors">
                {stats.totalInquiries}
              </p>
              <p className="text-sm text-slate-400">{`${stats.newInquiries} neue`}</p>
            </div>
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
              📩
            </div>
          </div>
          {stats.newInquiries > 0 && (
            <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-semibold">
              {stats.newInquiries > 9 ? '9+' : stats.newInquiries}
            </span>
          )}
        </Link>
      </div>

      {/* Schnellzugriff — Favoriten zuerst, dann alle anderen */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-white">Schnellzugriff</h2>
          <button
            onClick={() => setEditMode(!editMode)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              editMode
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {editMode ? 'Fertig' : 'Anpassen'}
          </button>
        </div>

        {editMode && (
          <p className="text-slate-400 text-sm mb-4">
            Tippen Sie auf ein Element um es als Favorit hinzuzufügen oder zu entfernen (max. {MAX_FAVORITES}).
          </p>
        )}

        {/* Favoriten */}
        {getFavoriteItems().length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-semibold text-yellow-400/80 uppercase tracking-wider mb-3">Favoriten</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {getFavoriteItems().map(item => (
                <QuickItem
                  key={item.key}
                  item={item}
                  isFav={true}
                  editMode={editMode}
                  onToggle={() => toggleFavorite(item.key)}
                  isFreemium={isFreemium}
                  isInGracePeriod={isInGracePeriod}
                  hasFeatureAccess={hasFeatureAccess}
                  onProtectedClick={handleProtectedFeatureClick}
                  stats={stats}
                />
              ))}
            </div>
          </div>
        )}

        {/* Alle anderen */}
        <div>
          {!editMode && getFavoriteItems().length > 0 && (
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Alle Funktionen</p>
          )}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {getNonFavoriteItems().map(item => (
              <QuickItem
                key={item.key}
                item={item}
                isFav={false}
                editMode={editMode}
                onToggle={() => toggleFavorite(item.key)}
                canAddMore={favorites.length < MAX_FAVORITES}
                isFreemium={isFreemium}
                isInGracePeriod={isInGracePeriod}
                hasFeatureAccess={hasFeatureAccess}
                onProtectedClick={handleProtectedFeatureClick}
                stats={stats}
              />
            ))}
          </div>
        </div>
      </div>

      <UpgradeModal
        isOpen={upgradeFeatureModalOpen}
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