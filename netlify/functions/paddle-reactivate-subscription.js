// netlify/functions/paddle-reactivate-subscription.js - REALTIME VERSION

const { createClient } = require('@supabase/supabase-js')

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const PADDLE_API_KEY = process.env.PADDLE_API_KEY
const PADDLE_API_BASE_URL = process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT === 'sandbox'
  ? 'https://sandbox-api.paddle.com'
  : 'https://api.paddle.com'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    console.log('🔄 Reactivate subscription request received')
    
    let body
    try {
      body = JSON.parse(event.body)
    } catch (e) {
      console.error('❌ Invalid JSON body')
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Invalid JSON' })
      }
    }

    const { subscriptionId, majstorId } = body

    if (!subscriptionId || !majstorId) {
      console.error('❌ Missing subscriptionId or majstorId')
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: 'Missing required fields',
          required: ['subscriptionId', 'majstorId']
        })
      }
    }

    console.log('📋 Subscription ID:', subscriptionId)
    console.log('👤 Majstor ID:', majstorId)

    if (!PADDLE_API_KEY) {
      console.error('❌ PADDLE_API_KEY not configured')
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: 'Server configuration error',
          hint: 'PADDLE_API_KEY missing'
        })
      }
    }

    // 🔥 STEP 1: Fetch current subscription status from Paddle
    console.log('📡 Fetching current subscription status from Paddle...')
    const getResponse = await fetch(
      `${PADDLE_API_BASE_URL}/subscriptions/${subscriptionId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${PADDLE_API_KEY}`
        }
      }
    )

    if (!getResponse.ok) {
      const errorText = await getResponse.text()
      console.error('❌ Failed to fetch subscription:', errorText)
      return {
        statusCode: getResponse.status,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: 'Failed to fetch subscription status',
          details: errorText.substring(0, 200)
        })
      }
    }

    const subscriptionData = await getResponse.json()
    const currentStatus = subscriptionData.data.status
    const hasScheduledChange = subscriptionData.data.scheduled_change !== null

    console.log('📊 Current Paddle status:', currentStatus)
    console.log('📅 Has scheduled change:', hasScheduledChange)

    // 🔥 STEP 2: Determine correct endpoint
    let paddleResponse
    let method

    if (currentStatus === 'trialing' && hasScheduledChange) {
      // TRIALING with scheduled cancel → PATCH (remove scheduled change)
      console.log('🔧 Using PATCH to cancel scheduled change (trialing subscription)')
      method = 'PATCH'
      
      paddleResponse = await fetch(
        `${PADDLE_API_BASE_URL}/subscriptions/${subscriptionId}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${PADDLE_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            scheduled_change: null
          })
        }
      )
    } else if (currentStatus === 'cancelled') {
      // CANCELLED (active that was cancelled) → RESUME
      console.log('▶️ Using RESUME endpoint (cancelled active subscription)')
      method = 'RESUME'
      
      paddleResponse = await fetch(
        `${PADDLE_API_BASE_URL}/subscriptions/${subscriptionId}/resume`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${PADDLE_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            effective_from: 'immediately'
          })
        }
      )
    } else if (currentStatus === 'active' && hasScheduledChange) {
      // ACTIVE with scheduled cancel → PATCH
      console.log('🔧 Using PATCH to cancel scheduled change (active subscription)')
      method = 'PATCH'
      
      paddleResponse = await fetch(
        `${PADDLE_API_BASE_URL}/subscriptions/${subscriptionId}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${PADDLE_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            scheduled_change: null
          })
        }
      )
    } else {
      console.log('⚠️ Subscription is already active without scheduled cancellation')
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: 'Subscription is already active',
          currentStatus: currentStatus,
          hasScheduledChange: hasScheduledChange
        })
      }
    }

    console.log('📡 Paddle response status:', paddleResponse.status)
    
    const responseText = await paddleResponse.text()

    if (!paddleResponse.ok) {
      let errorData
      try {
        errorData = JSON.parse(responseText)
      } catch (e) {
        console.error('❌ Failed to parse Paddle error response')
        return {
          statusCode: paddleResponse.status,
          headers: corsHeaders,
          body: JSON.stringify({ 
            error: 'Paddle API error',
            details: responseText.substring(0, 300),
            method: method,
            status: paddleResponse.status
          })
        }
      }

      console.error('❌ Paddle API error:', errorData)
      return {
        statusCode: paddleResponse.status,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: errorData.error?.detail || errorData.error?.message || 'Reactivation failed',
          paddleError: errorData,
          method: method
        })
      }
    }

    const paddleData = JSON.parse(responseText)
    console.log('✅ Paddle reactivation request successful!')

    // 🔥 REALTIME STRATEGY: Ne menjamo status odmah!
    // Samo uklonimo scheduled_change i webhook će triggerovati Realtime update
    console.log('💾 Clearing scheduled_change from database (NO status change yet)...')
    
    const { error: updateError } = await supabaseAdmin
      .from('user_subscriptions')
      .update({
        paddle_scheduled_change: null,
        cancel_at_period_end: false,
        cancelled_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('paddle_subscription_id', subscriptionId)

    if (updateError) {
      console.error('⚠️ Supabase update error:', updateError)
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: 'Database update failed',
          details: updateError.message
        })
      }
    }

    console.log('✅ Scheduled change cleared from database')
    console.log('⏳ Waiting for Paddle webhook to confirm status change...')

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        message: 'Reactivation initiated - waiting for confirmation',
        method: method,
        data: {
          subscriptionId: subscriptionId,
          previousStatus: currentStatus,
          // 🔥 Frontend će koristiti ovo da prikaže progress
          realtimeExpected: true,
          estimatedConfirmationTime: '5-15 seconds'
        }
      })
    }

  } catch (error) {
    console.error('💥 Reactivate error:', error)
    console.error('Stack:', error.stack)
    
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Failed to reactivate subscription',
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    }
  }
}