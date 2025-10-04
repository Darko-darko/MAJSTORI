// netlify/functions/paddle-reactivate-subscription.js - UNIVERSAL

import { createClient } from '@supabase/supabase-js'

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

export async function OPTIONS(request) {
  return { statusCode: 200, headers: corsHeaders, body: '' }
}

export async function handler(event, context) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    console.log('🔄 Reactivate subscription request received')
    
    const { subscriptionId, majstorId } = JSON.parse(event.body)

    if (!subscriptionId || !majstorId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Missing subscriptionId or majstorId' })
      }
    }

    console.log('📋 Subscription ID:', subscriptionId)
    console.log('👤 Majstor ID:', majstorId)

    if (!PADDLE_API_KEY) {
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Paddle API key not configured' })
      }
    }

    // PRVO: Proveri trenutni status u Paddle-u
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
        body: JSON.stringify({ error: 'Failed to fetch subscription status' })
      }
    }

    const subscriptionData = await getResponse.json()
    const currentStatus = subscriptionData.data.status
    const hasScheduledChange = subscriptionData.data.scheduled_change !== null

    console.log('Current Paddle status:', currentStatus)
    console.log('Has scheduled change:', hasScheduledChange)

    let paddleResponse
    let method

    // LOGIKA: Odaberi pravi endpoint
    if (currentStatus === 'trialing' && hasScheduledChange) {
      // TRIALING sa zakazanim cancel → PATCH (ukloni scheduled change)
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
      // CANCELLED (active koji je cancelled) → RESUME
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
      // ACTIVE sa zakazanim cancel → PATCH
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
      // Subscription nije cancelled niti nema scheduled change
      console.log('⚠️ Subscription is already active without scheduled cancellation')
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: 'Subscription is already active',
          currentStatus: currentStatus
        })
      }
    }

    console.log('📡 Paddle response status:', paddleResponse.status)
    
    const responseText = await paddleResponse.text()
    console.log('📄 Paddle response:', responseText.substring(0, 300))

    if (!paddleResponse.ok) {
      let errorData
      try {
        errorData = JSON.parse(responseText)
      } catch (e) {
        return {
          statusCode: paddleResponse.status,
          headers: corsHeaders,
          body: JSON.stringify({ 
            error: 'Paddle API error',
            details: responseText.substring(0, 200),
            method: method
          })
        }
      }

      console.error('❌ Paddle API error:', errorData)
      return {
        statusCode: paddleResponse.status,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: errorData.error?.detail || errorData.error?.message || 'Reactivation failed',
          details: errorData,
          method: method
        })
      }
    }

    const paddleData = JSON.parse(responseText)
    console.log('✅ Subscription reactivated successfully!')

    // Update Supabase
    console.log('💾 Updating Supabase...')
    
    const newStatus = currentStatus === 'trialing' ? 'trial' : 'active'
    
    const { error: updateError } = await supabaseAdmin
      .from('user_subscriptions')
      .update({
        status: newStatus,
        cancelled_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('paddle_subscription_id', subscriptionId)

    if (updateError) {
      console.error('❌ Supabase update error:', updateError)
    } else {
      console.log('✅ Database updated')
    }

    // Update majstors
    await supabaseAdmin
      .from('majstors')
      .update({
        subscription_status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', majstorId)

    console.log('✅ Reactivation complete!')

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        message: 'Subscription reactivated successfully',
        method: method,
        newStatus: newStatus,
        data: paddleData
      })
    }

  } catch (error) {
    console.error('💥 Reactivate error:', error)
    
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Failed to reactivate subscription',
        details: error.message
      })
    }
  }
}