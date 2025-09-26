// app/test-subscription/page.js - DIAGNOSTIC VERSION
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
        planDisplay: subscriptionData.plan?.display_name,
        isInTrial: subscriptionData.isInTrial,
        trialDaysRemaining: subscriptionData.trialDaysRemaining,
        isFreemium: subscriptionData.isFreemium,
        isActive: subscriptionData.isActive,
        featuresCount: subscriptionData.features?.length || 0,
        features: subscriptionData.features?.map(f => f.feature_key)
      })
    }
  }, [subscriptionData, currentUser])

  const addResult = (message, type = 'info') => {
    setResults(prev => [...prev, { message, type, timestamp: new Date().toISOString() }])
  }

  const clearResults = () => setResults([])

  // CLEANUP ALL TEST DATA
  const cleanupAllTestData = async () => {
    setRunning(true)
    clearResults()
    
    try {
      if (!currentUser) throw new Error('Morate biti ulogovani')
      
      addResult('Brišem sve test subscriptions...', 'info')
      
      const { error: deleteError } = await supabase
        .from('user_subscriptions')
        .delete()
        .eq('majstor_id', currentUser.id)
      
      if (deleteError) throw deleteError
      
      addResult('Sve test subscription obrisane', 'success')
      addResult('Reloading page za clean state...', 'info')
      
      setTimeout(() => {
        window.location.reload()
      }, 1500)
      
    } catch (err) {
      addResult('Greška pri cleanup: ' + err.message, 'error')
    }
    setRunning(false)
  }

  // TRIAL TEST
  const runTrialTest = async () => {
    setRunning(true)
    clearResults()
    
    try {
      if (!currentUser) throw new Error('Morate biti ulogovani')
      
      addResult('1. Uzimam trenutnog korisnika...', 'info')
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
      addResult('TRIAL TEST USPEŠAN!', 'success')

      // Force hook refresh
      setTimeout(() => {
        if (subscriptionData.refresh) {
          subscriptionData.refresh()
          addResult('Hook refreshed', 'info')
        }
      }, 1000)

    } catch (err) {
      addResult('Greška: ' + err.message, 'error')
      console.error('Trial test error:', err)
    }
    setRunning(false)
  }

  // FREEMIUM TEST - ENHANCED WITH DIAGNOSTICS
  const runFreemiumTest = async () => {
    setRunning(true)
    clearResults()
    
    try {
      if (!currentUser) throw new Error('Morate biti ulogovani')
      
      addResult('1. Testiram freemium scenario...', 'info')
      
      // Check current subscriptions BEFORE delete
      addResult('2. Proveravam trenutne subscriptions PRZED brisanjem...', 'info')
      const { data: beforeDelete } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('majstor_id', currentUser.id)
      
      addResult(`Subscriptions pre brisanja: ${beforeDelete?.length || 0}`, 'info')
      
      // Delete existing subscriptions
      addResult('3. Brišem postojeće subscriptions...', 'info')
      const { error: deleteError } = await supabase
        .from('user_subscriptions')
        .delete()
        .eq('majstor_id', currentUser.id)
      
      if (deleteError) {
        addResult('DELETE GREŠKA: ' + deleteError.message, 'error')
        throw deleteError
      }
      
      addResult('DELETE komanda izvršena bez greške', 'success')

      // Verify delete worked
      addResult('4. Verifikujem da je brisanje uspešno...', 'info')
      const { data: afterDelete } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('majstor_id', currentUser.id)
      
      addResult(`Subscriptions posle brisanja: ${afterDelete?.length || 0}`, afterDelete?.length === 0 ? 'success' : 'error')
      
      if (afterDelete?.length > 0) {
        addResult('PROBLEM: Subscriptions nisu obrisane!', 'error')
        afterDelete.forEach(s => addResult(`  - ${s.status} (${s.id.slice(0,8)}...)`, 'error'))
      }

      // Get freemium plan manually
      addResult('5. Učitavam freemium plan direktno...', 'info')
      const { data: freemiumPlan, error: freemiumError } = await supabase
        .from('subscription_plans')
        .select('id, name, display_name')
        .eq('name', 'freemium')
        .single()

      if (freemiumError) {
        addResult('Greška pri učitavanju freemium plana: ' + freemiumError.message, 'error')
        throw freemiumError
      }

      const { data: freemiumFeatures } = await supabase
        .from('subscription_features')
        .select('feature_name, feature_key')
        .eq('plan_id', freemiumPlan.id)
        .eq('is_enabled', true)
      
      addResult(`Freemium plan: ${freemiumPlan.display_name}`, 'success')
      addResult(`Dostupno ${freemiumFeatures?.length || 0} funkcija`, 'success')
      freemiumFeatures?.forEach(f => addResult(`  - ${f.feature_name}`, 'info'))
      
      // Force hook to re-evaluate
      addResult('6. Triggering hook refresh...', 'info')
      if (subscriptionData.refresh) {
        await subscriptionData.refresh()
        addResult('Hook refresh pozvan', 'success')
      } else {
        addResult('Hook nema refresh funkciju', 'warning')
      }
      
      // Check hook state after refresh
      setTimeout(() => {
        addResult('7. Proveravam hook state posle refresh...', 'info')
        addResult(`Hook plan: ${subscriptionData.plan?.name || 'undefined'}`, 'info')
        addResult(`Hook freemium: ${subscriptionData.isFreemium ? 'DA' : 'NE'}`, 'info')
        addResult(`Hook trial: ${subscriptionData.isInTrial ? 'DA' : 'NE'}`, 'info')
        addResult('FREEMIUM TEST ZAVRŠEN', 'success')
      }, 2000)

    } catch (err) {
      addResult('Greška: ' + err.message, 'error')
      console.error('Freemium test error:', err)
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
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        })
        .select()
        .single()

      if (insertError) throw insertError
      addResult('PRO pretplata kreirana', 'success')

      // Load pro features
      addResult('3. Učitavam PRO funkcije...', 'info')
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
      addResult(`Pretplata važi još ${daysLeft} dana`, 'success')
      
      addResult('PRO TEST USPEŠAN!', 'success')

      // Force hook refresh
      setTimeout(() => {
        if (subscriptionData.refresh) {
          subscriptionData.refresh()
          addResult('Hook refreshed', 'info')
        }
      }, 1000)

    } catch (err) {
      addResult('Greška: ' + err.message, 'error')
      console.error('Pro test error:', err)
    }
    setRunning(false)
  }

  // EXPIRED TRIAL TEST
  const runExpiredTrialTest = async () => {
    setRunning(true)
    clearResults()
    
    try {
      if (!currentUser) throw new Error('Morate biti ulogovani')
      
      addResult('1. Testiram istekli trial scenario...', 'info')
      
      // Get pro plan
      const { data: proPlan } = await supabase
        .from('subscription_plans')
        .select('id')
        .eq('name', 'pro')
        .single()

      // Create expired trial
      addResult('2. Kreiram istekli trial...', 'info')
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
      const weekAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)
      
      const { data: expiredTrial, error: insertError } = await supabase
        .from('user_subscriptions')
        .insert({
          majstor_id: currentUser.id,
          plan_id: proPlan.id,
          status: 'trial',
          trial_starts_at: weekAgo.toISOString(),
          trial_ends_at: yesterday.toISOString()
        })
        .select()
        .single()

      if (insertError) throw insertError
      addResult('Istekli trial kreiran', 'success')
      addResult('3. Hook treba da detektuje expired trial i prebaci na freemium...', 'info')
      
      // Force subscription refresh to trigger expired trial logic
      if (subscriptionData.refresh) {
        addResult('Triggering hook refresh...', 'info')
        await subscriptionData.refresh()
        
        setTimeout(() => {
          addResult('Pogledaj console za hook poruke', 'warning')
          addResult('Hook trebalo bi da detektuje expired trial', 'warning')
        }, 2000)
      }
      
      addResult('EXPIRED TRIAL TEST KREIRAN!', 'success')

    } catch (err) {
      addResult('Greška: ' + err.message, 'error')
      console.error('Expired trial test error:', err)
    }
    setRunning(false)
  }

  // DATABASE DIAGNOSTICS
  const runDatabaseDiagnostic = async () => {
    clearResults()
    
    try {
      if (!currentUser) throw new Error('Morate biti ulogovani')
      
      addResult('DATABASE DIAGNOSTIC REPORT', 'info')
      addResult('=' * 30, 'info')
      
      // Count total subscriptions
      const { data: allSubs } = await supabase
        .from('user_subscriptions')
        .select('id, status, created_at')
        .eq('majstor_id', currentUser.id)
        .order('created_at', { ascending: false })
      
      addResult(`Ukupno subscriptions: ${allSubs?.length || 0}`, 'info')
      
      // Group by status
      const statusCounts = {}
      allSubs?.forEach(sub => {
        statusCounts[sub.status] = (statusCounts[sub.status] || 0) + 1
      })
      
      Object.entries(statusCounts).forEach(([status, count]) => {
        addResult(`  ${status}: ${count}`, 'info')
      })
      
      // Show latest subscription
      if (allSubs?.length > 0) {
        const latest = allSubs[0]
        addResult(`Najnovija: ${latest.status} (${latest.created_at})`, 'info')
      }
      
      // Check freemium plan exists
      const { data: freemiumPlan } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('name', 'freemium')
        .single()
      
      if (freemiumPlan) {
        addResult('Freemium plan postoji u bazi', 'success')
        
        const { data: freemiumFeatures } = await supabase
          .from('subscription_features')
          .select('feature_key, feature_name')
          .eq('plan_id', freemiumPlan.id)
          .eq('is_enabled', true)
        
        addResult(`Freemium features: ${freemiumFeatures?.length || 0}`, 'info')
        freemiumFeatures?.forEach(f => addResult(`  - ${f.feature_name}`, 'info'))
      } else {
        addResult('PROBLEM: Freemium plan ne postoji!', 'error')
      }
      
    } catch (err) {
      addResult('Database diagnostic error: ' + err.message, 'error')
    }
  }

  // HOOK STATUS TEST
  const showHookStatus = () => {
    clearResults()
    addResult('TRENUTNI HOOK STATUS:', 'info')
    
    if (subscriptionData.loading) {
      addResult('Loading...', 'warning')
      return
    }

    if (subscriptionData.error) {
      addResult('Error: ' + subscriptionData.error, 'error')
      return
    }

    addResult(`Plan: ${subscriptionData.plan?.display_name || 'Nepoznat'}`, 'info')
    addResult(`Plan Name: ${subscriptionData.plan?.name || 'N/A'}`, 'info')
    addResult(`Trial: ${subscriptionData.isInTrial ? 'DA' : 'NE'}`, 'info')
    addResult(`Ostalo dana: ${subscriptionData.trialDaysRemaining || 0}`, 'info')
    addResult(`Freemium: ${subscriptionData.isFreemium ? 'DA' : 'NE'}`, 'info')
    addResult(`Pro: ${subscriptionData.isPaid ? 'DA' : 'NE'}`, 'info')
    addResult(`Aktivan: ${subscriptionData.isActive ? 'DA' : 'NE'}`, 'info')
    addResult(`Funkcije: ${subscriptionData.features?.length || 0}`, 'info')
    
    if (subscriptionData.features?.length > 0) {
      addResult(`Dostupne funkcije:`, 'info')
      subscriptionData.features.forEach(f => {
        addResult(`  - ${f.feature_name} (${f.feature_key})`, 'info')
      })
    }

    if (subscriptionData.subscription) {
      addResult(`Subscription Status: ${subscriptionData.subscription.status}`, 'info')
      addResult(`Created: ${new Date(subscriptionData.subscription.created_at).toLocaleDateString()}`, 'info')
    }

    console.log('Full subscription data:', subscriptionData)
    addResult('Detalji u console', 'info')
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
      <h1 className="text-white text-3xl mb-6">Subscription System Tests - Diagnostic</h1>
      
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
      
      {/* Test Buttons */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <button 
          onClick={runTrialTest}
          disabled={running || !currentUser}
          className="bg-blue-600 text-white px-4 py-3 rounded font-semibold hover:bg-blue-700 disabled:bg-slate-600"
        >
          {running ? 'Test...' : 'Test TRIAL'}
        </button>

        <button 
          onClick={runFreemiumTest}
          disabled={running || !currentUser}
          className="bg-gray-600 text-white px-4 py-3 rounded font-semibold hover:bg-gray-700 disabled:bg-slate-600"
        >
          {running ? 'Test...' : 'Test FREEMIUM'}
        </button>

        <button 
          onClick={runProTest}
          disabled={running || !currentUser}
          className="bg-green-600 text-white px-4 py-3 rounded font-semibold hover:bg-green-700 disabled:bg-slate-600"
        >
          {running ? 'Test...' : 'Test PRO'}
        </button>

        <button 
          onClick={runExpiredTrialTest}
          disabled={running || !currentUser}
          className="bg-orange-600 text-white px-4 py-3 rounded font-semibold hover:bg-orange-700 disabled:bg-slate-600"
        >
          {running ? 'Test...' : 'Test EXPIRED'}
        </button>

        <button 
          onClick={showHookStatus}
          disabled={!currentUser}
          className="bg-purple-600 text-white px-4 py-3 rounded font-semibold hover:bg-purple-700 disabled:bg-slate-600"
        >
          Hook Status
        </button>

        <button 
          onClick={runDatabaseDiagnostic}
          disabled={!currentUser}
          className="bg-yellow-600 text-white px-4 py-3 rounded font-semibold hover:bg-yellow-700 disabled:bg-slate-600"
        >
          DB Diagnostic
        </button>
      </div>

      {/* Cleanup Button */}
      <div className="mb-6">
        <button 
          onClick={cleanupAllTestData}
          disabled={running || !currentUser}
          className="bg-red-600 text-white px-6 py-3 rounded font-semibold hover:bg-red-700 disabled:bg-slate-600"
        >
          {running ? 'Cleanup...' : 'CLEANUP - Obriši sve test subscriptions'}
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