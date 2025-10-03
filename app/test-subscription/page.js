// app/test-subscription/page.js - DEBUG PRO MAX VERSION
'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { createTrialSubscription, useSubscription, clearSubscriptionCache } from '@/lib/hooks/useSubscription'

export default function TestPage() {
  const [results, setResults] = useState([])
  const [running, setRunning] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [debugInfo, setDebugInfo] = useState({})
  
  // Hook integration
  const subscriptionData = useSubscription(currentUser?.id)

  // Load user on mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        addResult('🔄 Loading user...', 'info')
        const { data: { user }, error } = await supabase.auth.getUser()
        
        if (error) {
          addResult('❌ Auth error: ' + error.message, 'error')
          return
        }
        
        if (user) {
          setCurrentUser(user)
          addResult('✅ User loaded: ' + user.email, 'success')
          console.log('User loaded:', user)
        } else {
          addResult('❌ No user found', 'error')
        }
      } catch (err) {
        addResult('💥 Exception loading user: ' + err.message, 'error')
      }
    }
    loadUser()
  }, [])

  // Monitor subscription changes
  useEffect(() => {
    if (subscriptionData && !subscriptionData.loading && currentUser) {
      const info = {
        timestamp: new Date().toISOString(),
        plan_name: subscriptionData.plan?.name,
        plan_display: subscriptionData.plan?.display_name,
        isInTrial: subscriptionData.isInTrial,
        trialDaysRemaining: subscriptionData.trialDaysRemaining,
        isFreemium: subscriptionData.isFreemium,
        isPaid: subscriptionData.isPaid,
        isActive: subscriptionData.isActive,
        featuresCount: subscriptionData.features?.length || 0,
        subscription_status: subscriptionData.subscription?.status || 'none',
        has_subscription: !!subscriptionData.subscription
      }
      
      setDebugInfo(info)
      console.log('📊 Subscription data updated:', info)
    } else if (subscriptionData?.loading) {
      setDebugInfo({ loading: true })
    } else if (subscriptionData?.error) {
      setDebugInfo({ error: subscriptionData.error })
    }
  }, [subscriptionData, currentUser])

  const addResult = (message, type = 'info') => {
    const result = { 
      message, 
      type, 
      timestamp: new Date().toISOString() 
    }
    setResults(prev => [...prev, result])
    console.log(`[${type.toUpperCase()}]`, message)
  }

  const clearResults = () => {
    setResults([])
    console.clear()
  }

  // ============================================
  // RESET FUNCTIONS
  // ============================================

  const resetToNewSignup = async () => {
    setRunning(true)
    clearResults()
    
    try {
      if (!currentUser) throw new Error('Morate biti ulogovani')
      
      addResult('🔄 POTPUNI RESET - simulacija novog signup-a...', 'info')
      
      // 1. Briši sve user_subscriptions
      addResult('1️⃣ Brišem user_subscriptions...', 'info')
      const { error: deleteSubError } = await supabase
        .from('user_subscriptions')
        .delete()
        .eq('majstor_id', currentUser.id)
      
      if (deleteSubError) {
        addResult('❌ Delete error: ' + deleteSubError.message, 'error')
        throw deleteSubError
      }
      addResult('✅ user_subscriptions obrisane', 'success')

      // 2. Resetuj majstors tabelu
      addResult('2️⃣ Resetujem majstors na fresh signup state...', 'info')
      const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      
      const { error: updateMajstorError } = await supabase
        .from('majstors')
        .update({
          subscription_status: 'trial',
          subscription_ends_at: trialEndsAt,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentUser.id)
      
      if (updateMajstorError) {
        addResult('❌ Update error: ' + updateMajstorError.message, 'error')
        throw updateMajstorError
      }
      addResult('✅ majstors resetovana - fresh 7-day trial', 'success')
      addResult(`📅 Trial end date: ${new Date(trialEndsAt).toLocaleString('sr-RS')}`, 'info')

      // 3. Clear ALL caches
      addResult('3️⃣ Čistim sve cache-ove...', 'info')
      
      // Clear subscription hook cache
      clearSubscriptionCache(currentUser.id)
      
      // Clear localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('paddle_just_paid')
        // Clear any other relevant items
        const keysToRemove = []
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key?.includes('subscription') || key?.includes('paddle')) {
            keysToRemove.push(key)
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key))
        addResult(`🗑️ Cleared ${keysToRemove.length} localStorage items`, 'info')
      }
      
      addResult('✅ POTPUNI RESET ZAVRŠEN!', 'success')
      addResult('👤 Korisnik je sada kao NOV SIGNUP - 7-day trial aktivan', 'success')
      addResult('🔄 Reloading za clean state u 2 sekunde...', 'info')
      
      setTimeout(() => {
        window.location.reload()
      }, 2000)
      
    } catch (err) {
      addResult('💥 Greška: ' + err.message, 'error')
      console.error('Reset error:', err)
    }
    setRunning(false)
  }

  const resetToFreemium = async () => {
    setRunning(true)
    clearResults()
    
    try {
      if (!currentUser) throw new Error('Morate biti ulogovani')
      
      addResult('🔄 RESET NA FREEMIUM...', 'info')
      
      // 1. Briši sve user_subscriptions
      addResult('1️⃣ Brišem user_subscriptions...', 'info')
      const { error: deleteSubError } = await supabase
        .from('user_subscriptions')
        .delete()
        .eq('majstor_id', currentUser.id)
      
      if (deleteSubError) throw deleteSubError
      addResult('✅ user_subscriptions obrisane', 'success')

      // 2. Resetuj majstors na freemium state
      addResult('2️⃣ Resetujem majstors na freemium state...', 'info')
      const { error: updateMajstorError } = await supabase
        .from('majstors')
        .update({
          subscription_status: null,
          subscription_ends_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentUser.id)
      
      if (updateMajstorError) throw updateMajstorError
      addResult('✅ majstors resetovana - freemium mode', 'success')

      // 3. Clear cache
      clearSubscriptionCache(currentUser.id)
      if (typeof window !== 'undefined') {
        localStorage.removeItem('paddle_just_paid')
      }

      addResult('✅ FREEMIUM RESET ZAVRŠEN!', 'success')
      addResult('👤 Korisnik je sada FREEMIUM (bez trial-a)', 'success')
      addResult('🔄 Reloading...', 'info')
      
      setTimeout(() => {
        window.location.reload()
      }, 2000)
      
    } catch (err) {
      addResult('💥 Greška: ' + err.message, 'error')
      console.error('Freemium reset error:', err)
    }
    setRunning(false)
  }

  const resetToPro = async () => {
    setRunning(true)
    clearResults()
    
    try {
      if (!currentUser) throw new Error('Morate biti ulogovani')
      
      addResult('🔄 RESET NA PRO (platforma direktno)...', 'info')
      
      // 1. Briši stare subscriptions
      addResult('1️⃣ Brišem stare subscriptions...', 'info')
      await supabase
        .from('user_subscriptions')
        .delete()
        .eq('majstor_id', currentUser.id)
      
      // 2. Get pro plan
      const { data: proPlan, error: planError } = await supabase
        .from('subscription_plans')
        .select('id, name')
        .eq('name', 'pro')
        .single()

      if (planError || !proPlan) {
        throw new Error('Pro plan nije pronađen u bazi!')
      }
      addResult(`✅ Pronašao pro plan: ${proPlan.id}`, 'success')

      // 3. Create active PRO subscription (simulira uspešno Paddle plaćanje)
      addResult('2️⃣ Kreiram aktivnu PRO pretplatu...', 'info')
      const now = new Date()
      const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 dana grace
      
      const { data: proSubscription, error: insertError } = await supabase
        .from('user_subscriptions')
        .insert({
          majstor_id: currentUser.id,
          plan_id: proPlan.id,
          status: 'active',
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          paddle_subscription_id: 'test_sub_' + Date.now(),
          paddle_customer_id: 'test_cust_' + Date.now(),
          billing_interval: 'monthly',
          created_at: now.toISOString(),
          updated_at: now.toISOString()
        })
        .select()
        .single()

      if (insertError) {
        addResult('❌ Insert error: ' + insertError.message, 'error')
        throw insertError
      }
      addResult('✅ PRO pretplata kreirana: ' + proSubscription.id, 'success')

      // 4. Update majstors table
      addResult('3️⃣ Updating majstors table...', 'info')
      const { error: updateError } = await supabase
        .from('majstors')
        .update({
          subscription_status: 'active',
          subscription_ends_at: periodEnd.toISOString(),
          updated_at: now.toISOString()
        })
        .eq('id', currentUser.id)
      
      if (updateError) throw updateError
      addResult('✅ Majstors updated', 'success')

      // 5. Clear cache i trigger refresh
      clearSubscriptionCache(currentUser.id)
      
      addResult('✅ PRO RESET ZAVRŠEN!', 'success')
      addResult(`📅 Grace period: 30 dana (do ${periodEnd.toLocaleDateString('sr-RS')})`, 'info')
      addResult('🔄 Reloading...', 'info')
      
      setTimeout(() => {
        window.location.reload()
      }, 2000)
      
    } catch (err) {
      addResult('💥 Greška: ' + err.message, 'error')
      console.error('Pro reset error:', err)
    }
    setRunning(false)
  }

  // ============================================
  // DIAGNOSTIC FUNCTIONS
  // ============================================

  const runFullDiagnostic = async () => {
    clearResults()
    
    try {
      if (!currentUser) {
        addResult('❌ Nema user-a - morate biti ulogovani', 'error')
        return
      }
      
      addResult('🔍 POTPUNA DIJAGNOSTIKA SISTEMA', 'info')
      addResult('='.repeat(50), 'info')
      
      // 1. User info
      addResult('\n👤 USER INFO:', 'info')
      addResult(`  Email: ${currentUser.email}`, 'info')
      addResult(`  ID: ${currentUser.id}`, 'info')
      
      // 2. Majstors table
      addResult('\n📋 MAJSTORS TABLE:', 'info')
      const { data: majstorData, error: majstorError } = await supabase
        .from('majstors')
        .select('subscription_status, subscription_ends_at, updated_at')
        .eq('id', currentUser.id)
        .single()
      
      if (majstorError) {
        addResult('  ❌ Error: ' + majstorError.message, 'error')
      } else if (majstorData) {
        addResult(`  subscription_status: ${majstorData.subscription_status || 'NULL'}`, 'info')
        addResult(`  subscription_ends_at: ${majstorData.subscription_ends_at || 'NULL'}`, 'info')
        
        if (majstorData.subscription_ends_at) {
          const daysLeft = Math.ceil((new Date(majstorData.subscription_ends_at) - new Date()) / (1000 * 60 * 60 * 24))
          addResult(`  ⏰ Days remaining: ${daysLeft}`, daysLeft > 0 ? 'success' : 'warning')
        }
      }

      // 3. User_subscriptions table
      addResult('\n📋 USER_SUBSCRIPTIONS TABLE:', 'info')
      const { data: allSubs, error: subsError } = await supabase
        .from('user_subscriptions')
        .select(`
          id, 
          status, 
          billing_interval,
          created_at, 
          trial_ends_at, 
          current_period_end, 
          paddle_subscription_id,
          subscription_plans (name, display_name)
        `)
        .eq('majstor_id', currentUser.id)
        .order('created_at', { ascending: false })
      
      if (subsError) {
        addResult('  ❌ Error: ' + subsError.message, 'error')
      } else {
        addResult(`  Total: ${allSubs?.length || 0} subscription(s)`, 'info')
        
        if (allSubs && allSubs.length > 0) {
          allSubs.forEach((sub, i) => {
            addResult(`\n  📄 Subscription ${i + 1}:`, 'info')
            addResult(`    Plan: ${sub.subscription_plans?.display_name || 'Unknown'}`, 'info')
            addResult(`    Status: ${sub.status}`, 'info')
            addResult(`    Billing: ${sub.billing_interval || 'N/A'}`, 'info')
            addResult(`    Created: ${new Date(sub.created_at).toLocaleString('sr-RS')}`, 'info')
            if (sub.trial_ends_at) {
              addResult(`    Trial ends: ${new Date(sub.trial_ends_at).toLocaleString('sr-RS')}`, 'info')
            }
            if (sub.current_period_end) {
              addResult(`    Period ends: ${new Date(sub.current_period_end).toLocaleString('sr-RS')}`, 'info')
            }
            if (sub.paddle_subscription_id) {
              addResult(`    Paddle ID: ${sub.paddle_subscription_id}`, 'info')
            }
          })
        } else {
          addResult('  ⚠️ No subscriptions found', 'warning')
        }
      }

      // 4. Hook interpretation
      addResult('\n🎯 HOOK INTERPRETATION:', 'info')
      addResult(`  Loading: ${subscriptionData?.loading ? 'YES' : 'NO'}`, 'info')
      addResult(`  Error: ${subscriptionData?.error || 'None'}`, subscriptionData?.error ? 'error' : 'info')
      addResult(`  Plan: ${subscriptionData?.plan?.name || 'NULL'}`, 'info')
      addResult(`  Plan Display: ${subscriptionData?.plan?.display_name || 'NULL'}`, 'info')
      addResult(`  isInTrial: ${subscriptionData?.isInTrial ? 'YES' : 'NO'}`, 'info')
      addResult(`  trialDaysRemaining: ${subscriptionData?.trialDaysRemaining || 0}`, 'info')
      addResult(`  isFreemium: ${subscriptionData?.isFreemium ? 'YES' : 'NO'}`, 'info')
      addResult(`  isPaid: ${subscriptionData?.isPaid ? 'YES' : 'NO'}`, 'info')
      addResult(`  isActive: ${subscriptionData?.isActive ? 'YES' : 'NO'}`, 'info')
      addResult(`  Features: ${subscriptionData?.features?.length || 0}`, 'info')

      // 5. Environment check
      addResult('\n🌍 ENVIRONMENT:', 'info')
      addResult(`  Location: ${typeof window !== 'undefined' ? window.location.hostname : 'N/A'}`, 'info')
      addResult(`  Is Production: ${process.env.NODE_ENV === 'production' ? 'YES' : 'NO'}`, 'info')
      
      // 6. Cache info
      addResult('\n💾 CACHE STATUS:', 'info')
      if (typeof window !== 'undefined') {
        const paddlePaidFlag = localStorage.getItem('paddle_just_paid')
        addResult(`  paddle_just_paid: ${paddlePaidFlag || 'Not set'}`, 'info')
      }
      
      addResult('\n✅ DIJAGNOSTIKA ZAVRŠENA', 'success')
      addResult('💡 Pogledaj Console (F12) za detaljne objekte', 'info')
      
      // Log full objects to console
      console.group('🔍 FULL DIAGNOSTIC DATA')
      console.log('User:', currentUser)
      console.log('Majstor Data:', majstorData)
      console.log('All Subscriptions:', allSubs)
      console.log('Hook Data:', subscriptionData)
      console.log('Debug Info:', debugInfo)
      console.groupEnd()
      
    } catch (err) {
      addResult('💥 Diagnostic error: ' + err.message, 'error')
      console.error(err)
    }
  }

  const forceHookRefresh = () => {
    clearResults()
    addResult('🔄 Forcing hook refresh...', 'info')
    
    if (currentUser?.id) {
      clearSubscriptionCache(currentUser.id)
      addResult('✅ Cache cleared', 'success')
    }
    
    if (subscriptionData?.refresh) {
      subscriptionData.refresh()
      addResult('✅ Hook refresh triggered', 'success')
    } else {
      addResult('⚠️ Hook nema refresh funkciju', 'warning')
    }
    
    addResult('⏳ Čekam 2 sekunde pa reload...', 'info')
    setTimeout(() => {
      window.location.reload()
    }, 2000)
  }

  const getResultColor = (type) => {
    switch(type) {
      case 'success': return 'text-green-400'
      case 'error': return 'text-red-400' 
      case 'warning': return 'text-yellow-400'
      default: return 'text-slate-300'
    }
  }

  return (
    <div className="p-8 bg-slate-900 min-h-screen">
      <h1 className="text-white text-3xl mb-6">🧪 Subscription Test - Debug Pro Max</h1>
      
      {/* Live Status Bar */}
      <div className="bg-slate-800 border border-slate-700 p-4 rounded-lg mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-semibold">📊 Live Status</h2>
          <div className="text-xs text-slate-400">
            {debugInfo.timestamp && new Date(debugInfo.timestamp).toLocaleTimeString('sr-RS')}
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="bg-slate-700 p-3 rounded">
            <div className="text-slate-400 text-xs mb-1">Plan</div>
            <div className="text-white font-semibold">
              {subscriptionData?.loading ? '⏳ Loading...' : 
               subscriptionData?.plan?.display_name || '❓ Unknown'}
            </div>
          </div>
          
          <div className="bg-slate-700 p-3 rounded">
            <div className="text-slate-400 text-xs mb-1">Status</div>
            <div className={`font-semibold ${
              subscriptionData?.isInTrial ? 'text-blue-400' :
              subscriptionData?.isPaid ? 'text-green-400' :
              subscriptionData?.isFreemium ? 'text-gray-400' : 'text-red-400'
            }`}>
              {subscriptionData?.loading ? '...' : 
               subscriptionData?.isInTrial ? `Trial (${subscriptionData.trialDaysRemaining}d)` :
               subscriptionData?.isPaid ? 'PRO' :
               subscriptionData?.isFreemium ? 'Freemium' : 'Unknown'}
            </div>
          </div>
          
          <div className="bg-slate-700 p-3 rounded">
            <div className="text-slate-400 text-xs mb-1">Active</div>
            <div className={`font-semibold ${subscriptionData?.isActive ? 'text-green-400' : 'text-red-400'}`}>
              {subscriptionData?.loading ? '...' : 
               subscriptionData?.isActive ? '✅ YES' : '❌ NO'}
            </div>
          </div>
          
          <div className="bg-slate-700 p-3 rounded">
            <div className="text-slate-400 text-xs mb-1">Features</div>
            <div className="text-white font-semibold">
              {subscriptionData?.loading ? '...' : 
               subscriptionData?.features?.length || 0}
            </div>
          </div>
        </div>

        {/* User Info */}
        {currentUser && (
          <div className="mt-3 pt-3 border-t border-slate-700">
            <div className="text-xs text-slate-400">
              👤 {currentUser.email} • {currentUser.id.slice(0, 8)}...
            </div>
          </div>
        )}
      </div>

      {/* Reset Options */}
      <div className="bg-gradient-to-r from-yellow-900/20 to-orange-900/20 border border-yellow-600/30 p-6 rounded-lg mb-6">
        <h2 className="text-yellow-400 font-bold text-xl mb-4 flex items-center gap-2">
          🔄 RESET OPCIJE
          <span className="text-sm font-normal text-yellow-300">(menjaju bazu direktno)</span>
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Fresh Trial */}
          <div className="bg-slate-800 border border-slate-700 p-4 rounded-lg">
            <div className="text-2xl mb-2">🆕</div>
            <h3 className="text-white font-semibold mb-2">Fresh Signup</h3>
            <p className="text-slate-400 text-sm mb-4">
              Simulira novog korisnika<br/>
              ✅ 7-day trial<br/>
              ✅ Sve features unlocked
            </p>
            <button 
              onClick={resetToNewSignup}
              disabled={running || !currentUser}
              className="w-full bg-green-600 text-white px-4 py-3 rounded font-semibold hover:bg-green-700 disabled:bg-slate-600 transition-colors"
            >
              {running ? '⏳ Resetujem...' : '🆕 Reset → Trial'}
            </button>
          </div>

          {/* Freemium */}
          <div className="bg-slate-800 border border-slate-700 p-4 rounded-lg">
            <div className="text-2xl mb-2">🔓</div>
            <h3 className="text-white font-semibold mb-2">Freemium</h3>
            <p className="text-slate-400 text-sm mb-4">
              Prebaci na besplatan plan<br/>
              ⚠️ Ograničene features<br/>
              💡 Može upgrade na PRO
            </p>
            <button 
              onClick={resetToFreemium}
              disabled={running || !currentUser}
              className="w-full bg-gray-600 text-white px-4 py-3 rounded font-semibold hover:bg-gray-700 disabled:bg-slate-600 transition-colors"
            >
              {running ? '⏳ Resetujem...' : '🔓 Reset → Freemium'}
            </button>
          </div>

          {/* PRO */}
          <div className="bg-slate-800 border border-slate-700 p-4 rounded-lg">
            <div className="text-2xl mb-2">💎</div>
            <h3 className="text-white font-semibold mb-2">PRO Direct</h3>
            <p className="text-slate-400 text-sm mb-4">
              Direktno postavi PRO<br/>
              ✅ Sve features<br/>
              📅 30-day grace period
            </p>
            <button 
              onClick={resetToPro}
              disabled={running || !currentUser}
              className="w-full bg-blue-600 text-white px-4 py-3 rounded font-semibold hover:bg-blue-700 disabled:bg-slate-600 transition-colors"
            >
              {running ? '⏳ Resetujem...' : '💎 Reset → PRO'}
            </button>
          </div>
        </div>
      </div>

      {/* Diagnostic Tools */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <button 
          onClick={runFullDiagnostic}
          disabled={!currentUser}
          className="bg-purple-600 text-white px-6 py-4 rounded-lg font-semibold hover:bg-purple-700 disabled:bg-slate-600 transition-colors flex items-center justify-center gap-2"
        >
          <span className="text-2xl">🔍</span>
          <span>Full Diagnostic (proveri SVE)</span>
        </button>

        <button 
          onClick={forceHookRefresh}
          disabled={!currentUser}
          className="bg-orange-600 text-white px-6 py-4 rounded-lg font-semibold hover:bg-orange-700 disabled:bg-slate-600 transition-colors flex items-center justify-center gap-2"
        >
          <span className="text-2xl">🔄</span>
          <span>Force Refresh (clear cache + reload)</span>
        </button>
      </div>

      {/* Results Console */}
      <div className="bg-slate-800 border border-slate-700 p-4 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold">📝 Console Output</h2>
          <button 
            onClick={clearResults}
            className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1 rounded transition-colors"
          >
            Clear
          </button>
        </div>
        
        <div className="bg-slate-900 p-4 rounded max-h-96 overflow-y-auto font-mono text-sm">
          {results.length === 0 ? (
            <div className="text-slate-500 text-center py-8">
              🎯 Klikni na neki test da počneš...
            </div>
          ) : (
            results.map((result, i) => (
              <div key={i} className={`mb-1 ${getResultColor(result.type)}`}>
                <span className="text-slate-600 text-xs mr-2">
                  {new Date(result.timestamp).toLocaleTimeString('sr-RS')}
                </span>
                {result.message}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-6 bg-blue-900/20 border border-blue-600/30 p-4 rounded-lg">
        <h3 className="text-blue-400 font-semibold mb-2">💡 Kako koristiti:</h3>
        <ol className="text-slate-300 text-sm space-y-1 list-decimal list-inside">
          <li>Prvo klikni "Full Diagnostic" da vidiš trenutno stanje sistema</li>
          <li>Izaberi jedan od Reset opcija da promeniš subscription stanje</li>
          <li>Ako hook ne osvežava podatke, klikni "Force Refresh"</li>
          <li>Proveri Console Output i browser Console (F12) za detalje</li>
          <li>Nakon reset-a, stranica će se automatski reload-ovati</li>
        </ol>
      </div>
    </div>
  )
}