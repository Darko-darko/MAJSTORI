// app/test-subscription/page.js - FIXED CLEANUP VERSION
'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { createTrialSubscription, useSubscription } from '@/lib/hooks/useSubscription'

export default function TestPage() {
  const [results, setResults] = useState([])
  const [running, setRunning] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  
  // Hook integration for real-time monitoring
  const subscriptionData = useSubscription(currentUser?.id)

  // Load user on mount
  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUser(user)
        console.log('User loaded:', user.email)
      }
    }
    loadUser()
  }, [])

  // Monitor subscription changes
  useEffect(() => {
    if (subscriptionData && !subscriptionData.loading && currentUser) {
      console.log('Subscription data updated:', {
        plan: subscriptionData.plan?.name,
        isInTrial: subscriptionData.isInTrial,
        trialDaysRemaining: subscriptionData.trialDaysRemaining,
        isFreemium: subscriptionData.isFreemium,
        isActive: subscriptionData.isActive,
        featuresCount: subscriptionData.features?.length || 0
      })
    }
  }, [subscriptionData, currentUser])

  const addResult = (message, type = 'info') => {
    setResults(prev => [...prev, { message, type, timestamp: new Date().toISOString() }])
  }

  const clearResults = () => setResults([])

  // 🔥 NOVI - POTPUNI RESET (kao novi signup)
  const resetToNewSignup = async () => {
    setRunning(true)
    clearResults()
    
    try {
      if (!currentUser) throw new Error('Morate biti ulogovani')
      
      addResult('🔄 POTPUNI RESET - simulacija novog signup-a...', 'info')
      
      // 1. Obriši sve user_subscriptions
      addResult('1️⃣ Brišem user_subscriptions...', 'info')
      const { error: deleteSubError } = await supabase
        .from('user_subscriptions')
        .delete()
        .eq('majstor_id', currentUser.id)
      
      if (deleteSubError) throw deleteSubError
      addResult('✅ user_subscriptions obrisane', 'success')

      // 2. Resetuj majstors tabelu na FRESH SIGNUP STATE
      addResult('2️⃣ Resetujem majstors na fresh signup state...', 'info')
      const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      
      const { error: updateMajstorError } = await supabase
        .from('majstors')
        .update({
          subscription_status: 'trial',  // Fresh 7-day trial
          subscription_ends_at: trialEndsAt,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentUser.id)
      
      if (updateMajstorError) throw updateMajstorError
      addResult('✅ majstors resetovana - fresh 7-day trial', 'success')
      addResult(`Trial end date: ${new Date(trialEndsAt).toLocaleString('sr-RS')}`, 'info')

      // 3. Clear cache
      addResult('3️⃣ Čistim cache...', 'info')
      if (typeof window !== 'undefined') {
        localStorage.removeItem('paddle_just_paid')
      }
      
      addResult('✅ POTPUNI RESET ZAVRŠEN!', 'success')
      addResult('Korisnik je sada kao NOV SIGNUP - 7-day trial aktivan', 'success')
      addResult('Reloading za clean state...', 'info')
      
      setTimeout(() => {
        window.location.reload()
      }, 2000)
      
    } catch (err) {
      addResult('❌ Greška: ' + err.message, 'error')
      console.error('Reset error:', err)
    }
    setRunning(false)
  }

  // 🔥 NOVI - RESET NA FREEMIUM
  const resetToFreemium = async () => {
    setRunning(true)
    clearResults()
    
    try {
      if (!currentUser) throw new Error('Morate biti ulogovani')
      
      addResult('🔄 RESET NA FREEMIUM...', 'info')
      
      // 1. Obriši sve user_subscriptions
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
          subscription_status: null,  // NULL = freemium
          subscription_ends_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentUser.id)
      
      if (updateMajstorError) throw updateMajstorError
      addResult('✅ majstors resetovana - freemium mode', 'success')

      addResult('✅ FREEMIUM RESET ZAVRŠEN!', 'success')
      addResult('Korisnik je sada FREEMIUM (bez trial-a)', 'success')
      addResult('Reloading za clean state...', 'info')
      
      setTimeout(() => {
        window.location.reload()
      }, 2000)
      
    } catch (err) {
      addResult('❌ Greška: ' + err.message, 'error')
      console.error('Freemium reset error:', err)
    }
    setRunning(false)
  }

  // 🔥 STARA FUNKCIJA - samo briše subscriptions (NE DIRAJ majstors)
  const cleanupSubscriptionsOnly = async () => {
    setRunning(true)
    clearResults()
    
    try {
      if (!currentUser) throw new Error('Morate biti ulogovani')
      
      addResult('⚠️ Brišem SAMO user_subscriptions (majstors ostaje)...', 'info')
      
      const { error: deleteError } = await supabase
        .from('user_subscriptions')
        .delete()
        .eq('majstor_id', currentUser.id)
      
      if (deleteError) throw deleteError
      
      addResult('✅ user_subscriptions obrisane', 'success')
      addResult('⚠️ majstors NIJE resetovana - može biti buggy!', 'warning')
      addResult('Reloading...', 'info')
      
      setTimeout(() => {
        window.location.reload()
      }, 1500)
      
    } catch (err) {
      addResult('❌ Greška: ' + err.message, 'error')
    }
    setRunning(false)
  }

  // TRIAL TEST
  const runTrialTest = async () => {
    setRunning(true)
    clearResults()
    
    try {
      if (!currentUser) throw new Error('Morate biti ulogovani')
      
      addResult('1. Testiram Trial...', 'info')
      addResult('Korisnik: ' + currentUser.email, 'success')

      addResult('2. Kreiram trial subscription...', 'info')
      const trial = await createTrialSubscription(currentUser.id)
      addResult('Trial kreiran - ' + trial.status, 'success')

      const now = new Date()
      const trialEnd = new Date(trial.trial_ends_at)
      const daysLeft = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24))
      addResult(`Trial aktivan - ${daysLeft} dana ostalo`, 'success')

      const { data: features } = await supabase
        .from('subscription_features')
        .select('feature_name, feature_key')
        .eq('plan_id', trial.plan_id)
        .eq('is_enabled', true)
      
      addResult(`Dostupno ${features?.length || 0} funkcija`, 'success')
      features?.forEach(f => addResult(`  - ${f.feature_name}`, 'info'))
      addResult('✅ TRIAL TEST USPEŠAN!', 'success')

      setTimeout(() => {
        if (subscriptionData.refresh) {
          subscriptionData.refresh()
        }
      }, 1000)

    } catch (err) {
      addResult('❌ Greška: ' + err.message, 'error')
      console.error('Trial test error:', err)
    }
    setRunning(false)
  }

  // PRO TEST  
  const runProTest = async () => {
    setRunning(true)
    clearResults()
    
    try {
      if (!currentUser) throw new Error('Morate biti ulogovani')
      
      addResult('1. Testiram PRO scenario...', 'info')
      
      // Get pro plan
      const { data: proPlan } = await supabase
        .from('subscription_plans')
        .select('id')
        .eq('name', 'pro')
        .single()

      // Create active (paid) pro subscription
      addResult('2. Kreiram aktivnu PRO pretplatu...', 'info')
      const { data: proSubscription, error: insertError } = await supabase
        .from('user_subscriptions')
        .insert({
          majstor_id: currentUser.id,
          plan_id: proPlan.id,
          status: 'active',
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          paddle_subscription_id: 'test_sub_' + Date.now(),
          paddle_customer_id: 'test_cust_' + Date.now()
        })
        .select()
        .single()

      if (insertError) throw insertError
      addResult('PRO pretplata kreirana', 'success')

      // Update majstors table
      addResult('3. Updating majstors table...', 'info')
      await supabase
        .from('majstors')
        .update({
          subscription_status: 'active',
          subscription_ends_at: proSubscription.current_period_end,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentUser.id)

      // Load pro features
      addResult('4. Učitavam PRO funkcije...', 'info')
      const { data: proFeatures } = await supabase
        .from('subscription_features')
        .select('feature_name, feature_key')
        .eq('plan_id', proPlan.id)
        .eq('is_enabled', true)
      
      addResult(`PRO plan aktivan`, 'success')
      addResult(`Dostupno ${proFeatures?.length || 0} funkcija`, 'success')
      proFeatures?.forEach(f => addResult(`  - ${f.feature_name}`, 'info'))
      
      const now = new Date()
      const periodEnd = new Date(proSubscription.current_period_end)
      const daysLeft = Math.ceil((periodEnd - now) / (1000 * 60 * 60 * 24))
      addResult(`Pretplata važi još ${daysLeft} dana (30-day grace period)`, 'success')
      
      addResult('✅ PRO TEST USPEŠAN!', 'success')

      setTimeout(() => {
        if (subscriptionData.refresh) {
          subscriptionData.refresh()
        }
      }, 1000)

    } catch (err) {
      addResult('❌ Greška: ' + err.message, 'error')
      console.error('Pro test error:', err)
    }
    setRunning(false)
  }

  // DATABASE DIAGNOSTICS
  const runDatabaseDiagnostic = async () => {
    clearResults()
    
    try {
      if (!currentUser) throw new Error('Morate biti ulogovani')
      
      addResult('📊 DATABASE DIAGNOSTIC REPORT', 'info')
      addResult('=' .repeat(40), 'info')
      
      // Check majstors table
      addResult('\n📋 MAJSTORS TABLE:', 'info')
      const { data: majstorData } = await supabase
        .from('majstors')
        .select('subscription_status, subscription_ends_at, updated_at')
        .eq('id', currentUser.id)
        .single()
      
      if (majstorData) {
        addResult(`  subscription_status: ${majstorData.subscription_status || 'NULL'}`, 'info')
        addResult(`  subscription_ends_at: ${majstorData.subscription_ends_at || 'NULL'}`, 'info')
        addResult(`  updated_at: ${new Date(majstorData.updated_at).toLocaleString('sr-RS')}`, 'info')
        
        if (majstorData.subscription_ends_at) {
          const now = new Date()
          const endDate = new Date(majstorData.subscription_ends_at)
          const diffDays = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24))
          addResult(`  Days remaining: ${diffDays}`, 'info')
        }
      }

      // Check user_subscriptions
      addResult('\n📋 USER_SUBSCRIPTIONS TABLE:', 'info')
      const { data: allSubs } = await supabase
        .from('user_subscriptions')
        .select('id, status, created_at, trial_ends_at, current_period_end, paddle_subscription_id')
        .eq('majstor_id', currentUser.id)
        .order('created_at', { ascending: false })
      
      addResult(`  Total subscriptions: ${allSubs?.length || 0}`, 'info')
      
      if (allSubs?.length > 0) {
        allSubs.forEach((sub, i) => {
          addResult(`\n  Subscription ${i + 1}:`, 'info')
          addResult(`    - Status: ${sub.status}`, 'info')
          addResult(`    - Created: ${new Date(sub.created_at).toLocaleString('sr-RS')}`, 'info')
          if (sub.trial_ends_at) {
            addResult(`    - Trial ends: ${new Date(sub.trial_ends_at).toLocaleString('sr-RS')}`, 'info')
          }
          if (sub.current_period_end) {
            addResult(`    - Period ends: ${new Date(sub.current_period_end).toLocaleString('sr-RS')}`, 'info')
          }
          if (sub.paddle_subscription_id) {
            addResult(`    - Paddle ID: ${sub.paddle_subscription_id}`, 'info')
          }
        })
      } else {
        addResult('  ⚠️ No subscriptions found', 'warning')
      }

      // Check hook interpretation
      addResult('\n🎯 HOOK INTERPRETATION:', 'info')
      addResult(`  Plan: ${subscriptionData.plan?.name || 'NULL'}`, 'info')
      addResult(`  isInTrial: ${subscriptionData.isInTrial}`, 'info')
      addResult(`  trialDaysRemaining: ${subscriptionData.trialDaysRemaining}`, 'info')
      addResult(`  isFreemium: ${subscriptionData.isFreemium}`, 'info')
      addResult(`  isPaid: ${subscriptionData.isPaid}`, 'info')
      addResult(`  isActive: ${subscriptionData.isActive}`, 'info')
      
      addResult('\n✅ DIAGNOSTIC COMPLETE', 'success')
      
    } catch (err) {
      addResult('❌ Database diagnostic error: ' + err.message, 'error')
    }
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
      <h1 className="text-white text-3xl mb-6">🧪 Subscription System Tests - FIXED</h1>
      
      {/* Status Bar */}
      <div className="bg-slate-800 p-4 rounded-lg mb-6">
        <h2 className="text-white font-semibold mb-2">Live Hook Status:</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="bg-slate-700 p-2 rounded">
            <span className="text-slate-400">Plan:</span>
            <div className="text-white font-semibold">
              {subscriptionData?.loading ? 'Loading...' : subscriptionData?.plan?.display_name || 'Unknown'}
            </div>
          </div>
          <div className="bg-slate-700 p-2 rounded">
            <span className="text-slate-400">Status:</span>
            <div className="text-white font-semibold">
              {subscriptionData?.loading ? '...' : 
               subscriptionData?.isInTrial ? `Trial (${subscriptionData.trialDaysRemaining}d)` :
               subscriptionData?.isPaid ? 'Pro' :
               subscriptionData?.isFreemium ? 'Freemium' : 'Unknown'}
            </div>
          </div>
          <div className="bg-slate-700 p-2 rounded">
            <span className="text-slate-400">Active:</span>
            <div className={`font-semibold ${subscriptionData?.isActive ? 'text-green-400' : 'text-red-400'}`}>
              {subscriptionData?.loading ? '...' : subscriptionData?.isActive ? 'YES' : 'NO'}
            </div>
          </div>
          <div className="bg-slate-700 p-2 rounded">
            <span className="text-slate-400">Features:</span>
            <div className="text-white font-semibold">
              {subscriptionData?.loading ? '...' : subscriptionData?.features?.length || 0}
            </div>
          </div>
        </div>
      </div>

      {/* 🔥 NOVI CLEANUP BUTTONS */}
      <div className="bg-slate-800 border border-yellow-500 p-6 rounded-lg mb-6">
        <h2 className="text-yellow-400 font-bold text-xl mb-4">🔄 RESET OPCIJE:</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Option 1: Fresh Signup */}
          <div className="bg-slate-700 p-4 rounded-lg">
            <h3 className="text-white font-semibold mb-2">1️⃣ Fresh Signup</h3>
            <p className="text-slate-400 text-sm mb-4">
              Simulira novog korisnika - fresh 7-day trial
            </p>
            <button 
              onClick={resetToNewSignup}
              disabled={running || !currentUser}
              className="w-full bg-green-600 text-white px-4 py-3 rounded font-semibold hover:bg-green-700 disabled:bg-slate-600"
            >
              {running ? 'Resetujem...' : 'Reset → Fresh Trial'}
            </button>
          </div>

          {/* Option 2: Freemium */}
          <div className="bg-slate-700 p-4 rounded-lg">
            <h3 className="text-white font-semibold mb-2">2️⃣ Freemium</h3>
            <p className="text-slate-400 text-sm mb-4">
              Prebaci na freemium (bez trial-a)
            </p>
            <button 
              onClick={resetToFreemium}
              disabled={running || !currentUser}
              className="w-full bg-gray-600 text-white px-4 py-3 rounded font-semibold hover:bg-gray-700 disabled:bg-slate-600"
            >
              {running ? 'Resetujem...' : 'Reset → Freemium'}
            </button>
          </div>

          {/* Option 3: Subscriptions Only */}
          <div className="bg-slate-700 p-4 rounded-lg">
            <h3 className="text-white font-semibold mb-2">3️⃣ Subs Only</h3>
            <p className="text-slate-400 text-sm mb-4">
              ⚠️ Briše samo subscriptions (može buggovati!)
            </p>
            <button 
              onClick={cleanupSubscriptionsOnly}
              disabled={running || !currentUser}
              className="w-full bg-yellow-600 text-white px-4 py-3 rounded font-semibold hover:bg-yellow-700 disabled:bg-slate-600"
            >
              {running ? 'Brišem...' : 'Delete Subs Only'}
            </button>
          </div>
        </div>
      </div>
      
      {/* Test Buttons */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <button 
          onClick={runTrialTest}
          disabled={running || !currentUser}
          className="bg-blue-600 text-white px-4 py-3 rounded font-semibold hover:bg-blue-700 disabled:bg-slate-600"
        >
          {running ? 'Test...' : 'Test TRIAL'}
        </button>

        <button 
          onClick={runProTest}
          disabled={running || !currentUser}
          className="bg-green-600 text-white px-4 py-3 rounded font-semibold hover:bg-green-700 disabled:bg-slate-600"
        >
          {running ? 'Test...' : 'Test PRO'}
        </button>

        <button 
          onClick={runDatabaseDiagnostic}
          disabled={!currentUser}
          className="bg-purple-600 text-white px-4 py-3 rounded font-semibold hover:bg-purple-700 disabled:bg-slate-600"
        >
          DB Diagnostic
        </button>
      </div>

      {/* Test Results */}
      <div className="bg-slate-800 p-4 rounded-lg max-h-96 overflow-y-auto">
        <h2 className="text-white font-semibold mb-4">Test Results:</h2>
        {results.length === 0 ? (
          <div className="text-slate-400 text-center py-8">
            Izaberite test scenario da pokrenete...
          </div>
        ) : (
          results.map((result, i) => (
            <div key={i} className={`mb-1 font-mono text-sm ${getResultColor(result.type)}`}>
              <span className="text-slate-500 text-xs mr-2">
                {new Date(result.timestamp).toLocaleTimeString()}
              </span>
              {result.message}
            </div>
          ))
        )}
      </div>
    </div>
  )
}