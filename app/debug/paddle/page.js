// app/debug/paddle/page.js - ENHANCED VERSION
'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { initializePaddle, PADDLE_CONFIG, validatePaddleConfig } from '@/lib/paddle'

export default function PaddleDebugPage() {
  const [user, setUser] = useState(null)
  const [paddleReady, setPaddleReady] = useState(false)
  const [configValid, setConfigValid] = useState(false)
  const [testResults, setTestResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [paddleEvents, setPaddleEvents] = useState([])

  useEffect(() => {
    loadUser()
    
    initializePaddle(
      () => {
        setPaddleReady(true)
        addResult('✅ Paddle.js loaded successfully', 'success')
        logPaddleDetails() // 🔥 NEW: Log Paddle details on load
      },
      (error) => {
        addResult(`❌ Paddle.js failed to load: ${error.message}`, 'error')
      }
    )

    const isValid = validatePaddleConfig()
    setConfigValid(isValid)
    
    if (isValid) {
      addResult('✅ Paddle configuration is valid', 'success')
    } else {
      addResult('❌ Paddle configuration has errors', 'error')
    }
  }, [])

  const loadUser = async () => {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (!error && user) {
      setUser(user)
      addResult(`✅ User loaded: ${user.email}`, 'success')
    }
  }

  const addResult = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString()
    setTestResults(prev => [...prev, { message, type, timestamp }])
    
    // Console log za copy-paste
    const emoji = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️'
    console.log(`[${timestamp}] ${emoji} ${message}`)
  }

  const addEvent = (eventName, eventData) => {
    const timestamp = new Date().toLocaleTimeString()
    setPaddleEvents(prev => [...prev, { eventName, eventData, timestamp }])
    console.log(`🎯 PADDLE EVENT [${timestamp}]:`, eventName, eventData)
  }

  // 🔥 NEW: Log detailed Paddle info
  const logPaddleDetails = () => {
    if (!window.Paddle) return
    
    addResult('--- Paddle SDK Details ---', 'info')
    
    try {
      // Environment
      const env = window.Paddle.Environment?.get()
      addResult(`Environment: ${env}`, 'info')
      
      // Status
      const status = window.Paddle.Status?.get()
      addResult(`Status: ${JSON.stringify(status)}`, 'info')
      
      // Checkout methods
      const hasCheckout = typeof window.Paddle.Checkout?.open === 'function'
      addResult(`Checkout.open available: ${hasCheckout ? '✅' : '❌'}`, hasCheckout ? 'success' : 'error')
      
      // Version (if available)
      if (window.Paddle.version) {
        addResult(`Paddle.js version: ${window.Paddle.version}`, 'info')
      }

    } catch (error) {
      addResult(`Error logging Paddle details: ${error.message}`, 'error')
    }
  }

  // 🧪 Test 1: Check Environment Variables
  const testEnvironmentVariables = () => {
    addResult('--- Testing Environment Variables ---', 'info')
    
    const checks = [
      { name: 'PADDLE_ENVIRONMENT', value: process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT },
      { name: 'PADDLE_CLIENT_TOKEN', value: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN },
      { name: 'PRICE_ID_MONTHLY', value: process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_MONTHLY },
      { name: 'PRICE_ID_YEARLY', value: process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_YEARLY }
    ]

    checks.forEach(check => {
      if (check.value) {
        const displayValue = check.value.length > 30 ? check.value.substring(0, 30) + '...' : check.value
        addResult(`✅ ${check.name}: ${displayValue}`, 'success')
      } else {
        addResult(`❌ ${check.name}: NOT SET`, 'error')
      }
    })
  }

  // 🧪 Test 2: Check Paddle Status
  const testPaddleStatus = () => {
    addResult('--- Testing Paddle Status ---', 'info')
    
    if (!window.Paddle) {
      addResult('❌ Paddle.js not loaded', 'error')
      return
    }

    try {
      const status = window.Paddle.Status?.get()
      addResult(`Paddle Status: ${JSON.stringify(status)}`, 'info')
      
      const environment = window.Paddle.Environment?.get()
      addResult(`Paddle Environment: ${environment}`, environment === 'sandbox' ? 'success' : 'info')

      // Check if initialized
      const initialized = window.Paddle.Initialized || window.Paddle.initialized
      addResult(`Paddle Initialized: ${initialized}`, initialized ? 'success' : 'error')

    } catch (error) {
      addResult(`❌ Error checking Paddle status: ${error.message}`, 'error')
    }
  }

  // 🧪 Test 3: Validate Price IDs Format
  const testPriceIdFormat = () => {
    addResult('--- Testing Price ID Format ---', 'info')
    
    const monthlyId = PADDLE_CONFIG.priceIds.monthly
    const yearlyId = PADDLE_CONFIG.priceIds.yearly

    if (monthlyId && monthlyId.startsWith('pri_')) {
      addResult(`✅ Monthly Price ID format valid: ${monthlyId}`, 'success')
    } else {
      addResult(`❌ Monthly Price ID invalid format: ${monthlyId}`, 'error')
    }

    if (yearlyId && yearlyId.startsWith('pri_')) {
      addResult(`✅ Yearly Price ID format valid: ${yearlyId}`, 'success')
    } else {
      addResult(`❌ Yearly Price ID invalid format: ${yearlyId}`, 'error')
    }
  }

  // 🔥 NEW: Detailed event callback
  const createDetailedEventCallback = (testName) => {
    return function(event) {
      const eventInfo = {
        name: event.name,
        data: event.data,
        timestamp: new Date().toISOString()
      }
      
      addEvent(event.name, event.data)
      addResult(`🎯 [${testName}] Event: ${event.name}`, 'info')

      // Specific event handling
      if (event.name === 'checkout.loaded') {
        addResult('✅ Checkout loaded successfully!', 'success')
      }
      
      if (event.name === 'checkout.error') {
        addResult(`❌ CHECKOUT ERROR: ${JSON.stringify(event.data)}`, 'error')
        console.error('🚨 FULL ERROR DATA:', event.data)
      }

      if (event.name === 'checkout.customer.created') {
        addResult('👤 Customer created in checkout', 'success')
      }

      if (event.name === 'checkout.completed') {
        addResult('💰 Checkout completed!', 'success')
      }

      if (event.name === 'checkout.closed') {
        addResult('🚪 Checkout closed by user', 'info')
      }

      if (event.name === 'checkout.payment.initiated') {
        addResult('💳 Payment initiated', 'info')
      }
    }
  }

  // 🔥 NEW: Test 4A - ULTRA MINIMAL (basic test)
  const testUltraMinimal = async () => {
    if (!paddleReady) {
      addResult('❌ Paddle not ready', 'error')
      return
    }

    setLoading(true)
    addResult('--- ULTRA MINIMAL TEST (no extras) ---', 'info')

    try {
      const priceId = PADDLE_CONFIG.priceIds.monthly
      addResult(`Price ID: ${priceId}`, 'info')

      console.log('🧪 Opening ULTRA MINIMAL checkout...')
      
      window.Paddle.Checkout.open({
        items: [{ priceId: priceId }],
        eventCallback: createDetailedEventCallback('ULTRA_MINIMAL')
      })
      
      addResult('✅ Checkout.open() called', 'success')

    } catch (error) {
      addResult(`❌ Error: ${error.message}`, 'error')
      console.error('🚨 ULTRA MINIMAL ERROR:', error)
    } finally {
      setLoading(false)
    }
  }

  // 🔥 NEW: Test 4B - MINIMAL with Customer
  const testMinimalWithCustomer = async () => {
    if (!paddleReady || !user) {
      addResult('❌ Paddle not ready or user not logged in', 'error')
      return
    }

    setLoading(true)
    addResult('--- MINIMAL with Customer Email ---', 'info')

    try {
      const priceId = PADDLE_CONFIG.priceIds.monthly
      addResult(`Price ID: ${priceId}`, 'info')
      addResult(`Customer Email: ${user.email}`, 'info')

      console.log('🧪 Opening MINIMAL + CUSTOMER checkout...')
      
      window.Paddle.Checkout.open({
        items: [{ priceId: priceId, quantity: 1 }],
        customer: {
          email: user.email
        },
        eventCallback: createDetailedEventCallback('MINIMAL_CUSTOMER')
      })
      
      addResult('✅ Checkout.open() called', 'success')

    } catch (error) {
      addResult(`❌ Error: ${error.message}`, 'error')
      console.error('🚨 MINIMAL CUSTOMER ERROR:', error)
    } finally {
      setLoading(false)
    }
  }

  // 🔥 UPDATED: Test 4C - Full Config (your original)
  const testFullCheckout = async () => {
    if (!paddleReady || !user) {
      addResult('❌ Paddle not ready or user not logged in', 'error')
      return
    }

    setLoading(true)
    addResult('--- FULL CHECKOUT CONFIG TEST ---', 'info')

    try {
      const priceId = PADDLE_CONFIG.priceIds.monthly

      const checkoutConfig = {
        items: [{
          priceId: priceId,
          quantity: 1
        }],
        customer: {
          email: user.email
        },
        customData: {
          majstor_id: user.id
        },
        settings: {
          displayMode: 'overlay',
          theme: 'dark',
          locale: 'de',
          successUrl: `${window.location.origin}/dashboard?paddle_success=true`
        },
        eventCallback: createDetailedEventCallback('FULL_CONFIG')
      }

      console.log('🧪 Full checkout config:', JSON.stringify(checkoutConfig, null, 2))
      addResult(`Opening with full config...`, 'info')
      
      window.Paddle.Checkout.open(checkoutConfig)
      
      addResult('✅ Checkout.open() called', 'success')

    } catch (error) {
      addResult(`❌ Error: ${error.message}`, 'error')
      console.error('🚨 FULL CONFIG ERROR:', error)
    } finally {
      setLoading(false)
    }
  }

  // 🔥 NEW: Test 4D - Yearly Plan
  const testYearlyCheckout = async () => {
    if (!paddleReady) {
      addResult('❌ Paddle not ready', 'error')
      return
    }

    setLoading(true)
    addResult('--- YEARLY PLAN TEST ---', 'info')

    try {
      const priceId = PADDLE_CONFIG.priceIds.yearly
      addResult(`Yearly Price ID: ${priceId}`, 'info')

      console.log('🧪 Opening YEARLY checkout...')
      
      window.Paddle.Checkout.open({
        items: [{ priceId: priceId, quantity: 1 }],
        customer: user ? { email: user.email } : undefined,
        settings: {
          displayMode: 'overlay',
          theme: 'light' // Try light theme
        },
        eventCallback: createDetailedEventCallback('YEARLY')
      })
      
      addResult('✅ Checkout.open() called', 'success')

    } catch (error) {
      addResult(`❌ Error: ${error.message}`, 'error')
      console.error('🚨 YEARLY ERROR:', error)
    } finally {
      setLoading(false)
    }
  }

  // 🧪 Test 5: Fetch Price Info from Paddle API (server-side)
  const testPriceAPI = async () => {
    addResult('--- Testing Paddle Price API ---', 'info')
    setLoading(true)

    try {
      const response = await fetch('/api/paddle/test-price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: PADDLE_CONFIG.priceIds.monthly
        })
      })

      const data = await response.json()

      if (response.ok) {
        addResult(`✅ Price API Success`, 'success')
        addResult(`Price ID: ${data.price_id}`, 'info')
        addResult(`Product: ${data.description}`, 'info')
        addResult(`Amount: ${data.unit_price?.amount} ${data.unit_price?.currency_code}`, 'info')
        addResult(`Status: ${data.status}`, 'info')
        console.log('📊 Full Price API response:', data)
      } else {
        addResult(`❌ Price API error: ${data.error}`, 'error')
      }
    } catch (error) {
      addResult(`❌ API call failed: ${error.message}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  // 🔥 NEW: Copy all logs to clipboard
  const copyLogsToClipboard = () => {
    const logs = testResults.map(r => `[${r.timestamp}] ${r.message}`).join('\n')
    const events = paddleEvents.map(e => `[${e.timestamp}] ${e.eventName}: ${JSON.stringify(e.eventData)}`).join('\n')
    const fullLog = `=== TEST RESULTS ===\n${logs}\n\n=== PADDLE EVENTS ===\n${events}`
    
    navigator.clipboard.writeText(fullLog).then(() => {
      alert('Logs copied to clipboard!')
    })
  }

  // Run all tests
  const runAllTests = () => {
    setTestResults([])
    setPaddleEvents([])
    testEnvironmentVariables()
    testPaddleStatus()
    testPriceIdFormat()
    logPaddleDetails()
  }

  return (
    <div className="min-h-screen bg-slate-900 p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            🔧 Enhanced Paddle Debug Tool
          </h1>
          <p className="text-slate-400">
            Comprehensive testing and debugging for Paddle integration
          </p>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className={`p-4 rounded-lg border ${paddleReady ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
            <div className="text-sm text-slate-400 mb-1">Paddle.js Status</div>
            <div className="text-lg font-semibold text-white">
              {paddleReady ? '✅ Ready' : '❌ Not Loaded'}
            </div>
          </div>

          <div className={`p-4 rounded-lg border ${configValid ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
            <div className="text-sm text-slate-400 mb-1">Configuration</div>
            <div className="text-lg font-semibold text-white">
              {configValid ? '✅ Valid' : '❌ Invalid'}
            </div>
          </div>

          <div className={`p-4 rounded-lg border ${user ? 'bg-green-500/10 border-green-500/30' : 'bg-orange-500/10 border-orange-500/30'}`}>
            <div className="text-sm text-slate-400 mb-1">User Status</div>
            <div className="text-lg font-semibold text-white">
              {user ? `✅ ${user.email}` : '⚠️ Not Logged In'}
            </div>
          </div>
        </div>

        {/* Test Buttons */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Test Suite</h2>
          
          {/* Basic Tests */}
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-slate-400 mb-2">Basic Tests</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <button
                onClick={runAllTests}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                🧪 Run All
              </button>

              <button
                onClick={testEnvironmentVariables}
                className="bg-slate-600 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors text-sm"
              >
                📋 Env Vars
              </button>

              <button
                onClick={testPaddleStatus}
                className="bg-slate-600 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors text-sm"
              >
                🎯 Paddle Status
              </button>

              <button
                onClick={testPriceAPI}
                disabled={loading}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm disabled:opacity-50"
              >
                🌐 Price API
              </button>
            </div>
          </div>

          {/* Checkout Tests */}
          <div>
            <h3 className="text-sm font-semibold text-slate-400 mb-2">Checkout Tests (Progressive)</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <button
                onClick={testUltraMinimal}
                disabled={!paddleReady || loading}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm disabled:opacity-50"
              >
                1️⃣ Ultra Minimal
              </button>

              <button
                onClick={testMinimalWithCustomer}
                disabled={!paddleReady || !user || loading}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm disabled:opacity-50"
              >
                2️⃣ + Customer
              </button>

              <button
                onClick={testFullCheckout}
                disabled={!paddleReady || !user || loading}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm disabled:opacity-50"
              >
                3️⃣ Full Config
              </button>

              <button
                onClick={testYearlyCheckout}
                disabled={!paddleReady || loading}
                className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors text-sm disabled:opacity-50"
              >
                📅 Yearly Plan
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              💡 Test in order: If 1️⃣ fails, fix config first before testing others
            </p>
          </div>
        </div>

        {/* Results Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Test Results Console */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Test Results</h2>
              <div className="flex gap-2">
                <button
                  onClick={copyLogsToClipboard}
                  className="text-sm text-blue-400 hover:text-blue-300"
                >
                  📋 Copy
                </button>
                <button
                  onClick={() => setTestResults([])}
                  className="text-sm text-slate-400 hover:text-white"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="bg-slate-900 rounded-lg p-4 max-h-96 overflow-y-auto font-mono text-sm">
              {testResults.length === 0 ? (
                <div className="text-slate-500 text-center py-8">
                  No tests run yet. Click a test button above.
                </div>
              ) : (
                testResults.map((result, index) => (
                  <div
                    key={index}
                    className={`mb-2 ${
                      result.type === 'error' ? 'text-red-400' :
                      result.type === 'success' ? 'text-green-400' :
                      'text-slate-300'
                    }`}
                  >
                    <span className="text-slate-500">[{result.timestamp}]</span> {result.message}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Paddle Events Console */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Paddle Events</h2>
              <button
                onClick={() => setPaddleEvents([])}
                className="text-sm text-slate-400 hover:text-white"
              >
                Clear
              </button>
            </div>

            <div className="bg-slate-900 rounded-lg p-4 max-h-96 overflow-y-auto font-mono text-sm">
              {paddleEvents.length === 0 ? (
                <div className="text-slate-500 text-center py-8">
                  No Paddle events yet. Open a checkout to see events.
                </div>
              ) : (
                paddleEvents.map((event, index) => (
                  <div key={index} className="mb-3 border-b border-slate-700 pb-2">
                    <div className="text-blue-400 font-semibold">
                      <span className="text-slate-500">[{event.timestamp}]</span> {event.eventName}
                    </div>
                    {event.eventData && (
                      <div className="text-slate-400 text-xs mt-1 ml-4">
                        {JSON.stringify(event.eventData, null, 2)}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-blue-500/10 border border-blue-500/30 rounded-lg p-6">
          <h3 className="text-blue-300 font-semibold mb-3">📋 Testing Instructions</h3>
          <ol className="text-blue-200 text-sm space-y-2">
            <li><strong>1.</strong> Run &quotRun All&quot to check basic configuration</li>
            <li><strong>2.</strong> Test &quot1️⃣ Ultra Minimal&quot first - simplest possible checkout</li>
            <li><strong>3.</strong> If it works, try &quot2️⃣ + Customer&quot then &quot3️⃣ Full Config&quot</li>
            <li><strong>4.</strong> Watch both consoles - Test Results AND Paddle Events</li>
            <li><strong>5.</strong> Check browser Console (F12) for additional Paddle logs</li>
            <li><strong>6.</strong> Copy logs using &quot📋 Copy&quot button to share with support</li>
          </ol>
        </div>

        {/* Back to Dashboard */}
        <div className="mt-8 text-center">
          <a
            href="/dashboard"
            className="text-blue-400 hover:text-blue-300 underline"
          >
            ← Back to Dashboard
          </a>
        </div>
      </div>
    </div>
  )
}