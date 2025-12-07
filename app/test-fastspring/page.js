// app/test-fastspring/page.js - TEST STRANICA

'use client'
import { useState, useEffect } from 'react'
import { 
  initializeFastSpring, 
  openFastSpringCheckout, 
  FASTSPRING_CONFIG,
  validateFastSpringConfig 
} from '@/lib/fastspring'

export default function TestFastSpringPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [fastspringReady, setFastspringReady] = useState(false)

  useEffect(() => {
    console.log('🔥 Initializing FastSpring...')
    
    // Validate config
    if (!validateFastSpringConfig()) {
      setError('FastSpring configuration is invalid!')
      return
    }

    // Initialize FastSpring
    initializeFastSpring(
      () => {
        console.log('✅ FastSpring initialized!')
        setFastspringReady(true)
      },
      (err) => {
        console.error('❌ FastSpring init failed:', err)
        setError('FastSpring failed to load: ' + err.message)
      }
    )
  }, [])

  const handleTestCheckout = async (interval) => {
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const productId = interval === 'monthly' 
        ? FASTSPRING_CONFIG.productIds.monthly
        : FASTSPRING_CONFIG.productIds.yearly

      console.log('🚀 Opening checkout for:', productId)

      await openFastSpringCheckout({
        priceId: productId,
        email: 'test@example.com',
        majstorId: 'test-user-123',
        billingInterval: interval,
        
        onSuccess: (data) => {
          console.log('✅ Checkout SUCCESS!', data)
          setSuccess(`Order created: ${data.orderId || data.reference || 'Unknown'}`)
          setLoading(false)
        },
        
        onError: (err) => {
          console.error('❌ Checkout ERROR:', err)
          setError('Checkout failed: ' + err.message)
          setLoading(false)
        },
        
        onClose: (data) => {
          console.log('🚪 Popup closed:', data)
          if (!success) {
            setError('Popup closed without purchase')
          }
          setLoading(false)
        }
      })

    } catch (err) {
      console.error('❌ Test error:', err)
      setError('Error: ' + err.message)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            🧪 FastSpring Test Page
          </h1>
          <p className="text-slate-400">
            Test FastSpring Popup Checkout Integration
          </p>
        </div>

        {/* Configuration Status */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-4">📋 Configuration</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Store ID:</span>
              <span className="text-white font-mono">{FASTSPRING_CONFIG.storeId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Popup URL:</span>
              <span className="text-white font-mono text-xs">{FASTSPRING_CONFIG.popupUrl}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Monthly Product:</span>
              <span className="text-white font-mono">{FASTSPRING_CONFIG.productIds.monthly}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Yearly Product:</span>
              <span className="text-white font-mono">{FASTSPRING_CONFIG.productIds.yearly}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Test Mode:</span>
              <span className={fastspringReady ? "text-green-400" : "text-yellow-400"}>
                {fastspringReady ? '✅ Ready' : '⏳ Loading...'}
              </span>
            </div>
          </div>
        </div>

        {/* FastSpring Status */}
        {!fastspringReady && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-yellow-500 border-t-transparent"></div>
              <span className="text-yellow-300">Loading FastSpring...</span>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <span className="text-2xl">❌</span>
              <div className="flex-1">
                <p className="text-red-300 font-semibold">Error</p>
                <p className="text-red-200 text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <span className="text-2xl">✅</span>
              <div className="flex-1">
                <p className="text-green-300 font-semibold">Success!</p>
                <p className="text-green-200 text-sm">{success}</p>
              </div>
            </div>
          </div>
        )}

        {/* Test Buttons */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          
          {/* Monthly Test */}
          <div className="bg-slate-800 border-2 border-blue-500 rounded-xl p-6">
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">📅</div>
              <h3 className="text-xl font-bold text-white mb-2">Monthly Plan</h3>
              <p className="text-slate-400">€19.90/month</p>
            </div>
            <button
              onClick={() => handleTestCheckout('monthly')}
              disabled={loading || !fastspringReady}
              className="w-full bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '⏳ Loading...' : '🧪 Test Monthly Checkout'}
            </button>
          </div>

          {/* Yearly Test */}
          <div className="bg-slate-800 border-2 border-purple-500 rounded-xl p-6">
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">📆</div>
              <h3 className="text-xl font-bold text-white mb-2">Yearly Plan</h3>
              <p className="text-slate-400">€199.90/year</p>
            </div>
            <button
              onClick={() => handleTestCheckout('yearly')}
              disabled={loading || !fastspringReady}
              className="w-full bg-purple-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '⏳ Loading...' : '🧪 Test Yearly Checkout'}
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <h3 className="text-white font-bold mb-3">📖 Test Instructions:</h3>
          <ol className="text-slate-300 text-sm space-y-2 list-decimal list-inside">
            <li>Click one of the test buttons above</li>
            <li>FastSpring popup should open</li>
            <li>Use test credit card: <code className="bg-slate-900 px-2 py-1 rounded">4111 1111 1111 1111</code></li>
            <li>Any future date for expiry</li>
            <li>Any CVV (e.g., 123)</li>
            <li>Check console for logs (F12)</li>
          </ol>
        </div>

        {/* Console Logs */}
        <div className="mt-6 text-center text-slate-500 text-sm">
          <p>💡 Check browser console (F12) for detailed logs</p>
        </div>
      </div>
    </div>
  )
}