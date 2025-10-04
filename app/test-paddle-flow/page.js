// app/test-paddle-flow/page.js
'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function PaddleFlowTest() {
  const [log, setLog] = useState([])
  
  const addLog = (msg) => {
    setLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`])
  }

  // TEST 1: Create PRO subscription
  const createPRO = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: proPlan } = await supabase
      .from('subscription_plans')
      .select('id')
      .eq('name', 'pro')
      .single()
    
    const { data: sub } = await supabase
      .from('user_subscriptions')
      .insert({
        majstor_id: user.id,
        plan_id: proPlan.id,
        status: 'active',
        paddle_subscription_id: `test_${Date.now()}`,
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      })
      .select()
      .single()
    
    addLog('✅ PRO subscription created (30d period)')
    setTimeout(() => window.location.reload(), 1000)
  }

  // TEST 2: Cancel subscription
  const cancelSubscription = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    await supabase
      .from('user_subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString()
      })
      .eq('majstor_id', user.id)
    
    addLog('🚫 Subscription cancelled (grace period active)')
    setTimeout(() => window.location.reload(), 1000)
  }

  // TEST 3: Expire grace period
  const expireGracePeriod = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    await supabase
      .from('user_subscriptions')
      .update({
        current_period_end: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      })
      .eq('majstor_id', user.id)
    
    addLog('⏰ Grace period EXPIRED - should fallback to Freemium')
    setTimeout(() => window.location.reload(), 2000)
  }

  // TEST 4: Reactivate subscription
  const reactivateSubscription = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    await supabase
      .from('user_subscriptions')
      .update({
        status: 'active',
        cancelled_at: null
      })
      .eq('majstor_id', user.id)
    
    addLog('✅ Subscription REACTIVATED')
    setTimeout(() => window.location.reload(), 1000)
  }

  return (
    <div className="p-8 bg-slate-900 min-h-screen text-white">
      <h1 className="text-3xl font-bold mb-8">🧪 Paddle Flow Testing</h1>
      
      <div className="grid grid-cols-2 gap-4 mb-8">
        <button onClick={createPRO} className="bg-green-600 p-4 rounded">
          1️⃣ Create PRO Subscription
        </button>
        
        <button onClick={cancelSubscription} className="bg-orange-600 p-4 rounded">
          2️⃣ Cancel Subscription (keep grace)
        </button>
        
        <button onClick={expireGracePeriod} className="bg-red-600 p-4 rounded">
          3️⃣ Expire Grace Period NOW
        </button>
        
        <button onClick={reactivateSubscription} className="bg-blue-600 p-4 rounded">
          4️⃣ Reactivate Subscription
        </button>
      </div>

      <div className="bg-slate-800 p-4 rounded">
        <h2 className="font-bold mb-2">📋 Test Log:</h2>
        {log.map((entry, i) => (
          <div key={i} className="text-sm text-slate-300">{entry}</div>
        ))}
      </div>
    </div>
  )
}