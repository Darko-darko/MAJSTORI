// netlify/functions/paddle-cancel-subscription.js - REALTIME VERSION

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
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
    console.log('🚫 Cancel subscription request received')
    
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

    console.log('🔗 Calling Paddle API...')
    
    const paddleResponse = await fetch(
      `${PADDLE_API_BASE_URL}/subscriptions/${subscriptionId}/cancel`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${PADDLE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          effective_from: 'next_billing_period'
        })
      }
    )

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
            status: paddleResponse.status
          })
        }
      }

      console.error('❌ Paddle API error:', errorData)
      return {
        statusCode: paddleResponse.status,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: errorData.error?.detail || errorData.error?.message || 'Paddle cancellation failed',
          paddleError: errorData,
          paddleStatus: paddleResponse.status
        })
      }
    }

    const paddleData = JSON.parse(responseText)
    console.log('✅ Paddle subscription cancellation scheduled!')
    
    // 🔥 PADDLE RESPONSE STRUCTURE
    const scheduledChange = paddleData.data?.scheduled_change
    const effectiveAt = scheduledChange?.effective_at
    
    console.log('📅 Scheduled change:', scheduledChange)
    console.log('⏰ Effective at:', effectiveAt)

    // 🔥 REALTIME STRATEGY: Ne menjamo status odmah!
    // Samo sačuvamo scheduled_change i webhook će triggerovati Realtime update
    console.log('💾 Saving scheduled_change to database (NO status change yet)...')
    
    const { error: updateError } = await supabaseAdmin
      .from('user_subscriptions')
      .update({
        paddle_scheduled_change: scheduledChange,
        cancel_at_period_end: true,
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .or(`paddle_subscription_id.eq.${subscriptionId},provider_subscription_id.eq.${subscriptionId}`)

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

    console.log('✅ Scheduled change saved to database')
    console.log('⏳ Waiting for Paddle webhook to confirm...')

    // Return success - frontend će čekati Realtime event
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        message: 'Cancellation scheduled - waiting for confirmation',
        data: {
          subscriptionId: subscriptionId,
          scheduledChange: scheduledChange,
          effectiveAt: effectiveAt,
          // 🔥 Frontend će koristiti ovo da prikaže progress
          realtimeExpected: true,
          estimatedConfirmationTime: '5-15 seconds'
        }
      })
    }

  } catch (error) {
    console.error('💥 Cancel subscription error:', error)
    console.error('Stack:', error.stack)
    
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Failed to cancel subscription',
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    }
  }
}