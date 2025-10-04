// netlify/functions/paddle-reactivate-subscription.js
// 🔥 KREIRAJ OVAJ NOVI FAJL!

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
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function handler(event, context) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    console.log('🔄 Reactivate subscription request')
    
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

    // Paddle API call - Resume subscription
    const paddleResponse = await fetch(
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

    const responseText = await paddleResponse.text()

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
            details: responseText.substring(0, 200)
          })
        }
      }

      console.error('❌ Paddle error:', errorData)
      return {
        statusCode: paddleResponse.status,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: errorData.error?.detail || 'Reactivation failed'
        })
      }
    }

    const paddleData = JSON.parse(responseText)
    console.log('✅ Paddle subscription reactivated!')

    // Update database
    await supabaseAdmin
      .from('user_subscriptions')
      .update({
        status: 'active',
        cancelled_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('paddle_subscription_id', subscriptionId)

    await supabaseAdmin
      .from('majstors')
      .update({
        subscription_status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', majstorId)

    console.log('✅ Database updated')

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        message: 'Subscription reactivated successfully',
        data: paddleData
      })
    }

  } catch (error) {
    console.error('💥 Error:', error)
    
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Failed to reactivate',
        details: error.message
      })
    }
  }
}