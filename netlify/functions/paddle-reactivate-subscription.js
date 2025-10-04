// netlify/functions/paddle-reactivate-subscription.js - FIXED

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
      console.error('❌ Missing subscriptionId or majstorId')
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Missing subscriptionId or majstorId' })
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
          error: 'Paddle API key not configured',
          hint: 'Add PADDLE_API_KEY to environment variables'
        })
      }
    }

    // 🔥 FIXED: Use RESUME endpoint instead of creating new subscription
    console.log('🔗 Calling Paddle API to RESUME subscription...')
    console.log('URL:', `${PADDLE_API_BASE_URL}/subscriptions/${subscriptionId}/resume`)
    
    const paddleResponse = await fetch(
      `${PADDLE_API_BASE_URL}/subscriptions/${subscriptionId}/resume`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${PADDLE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          effective_from: 'immediately'  // Resume odmah, ne čekaj period end
        })
      }
    )

    console.log('📡 Paddle response status:', paddleResponse.status)
    
    const responseText = await paddleResponse.text()
    console.log('📄 Paddle response:', responseText.substring(0, 300))

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
            details: responseText.substring(0, 200),
            status: paddleResponse.status
          })
        }
      }

      console.error('❌ Paddle API error:', errorData)
      return {
        statusCode: paddleResponse.status,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: errorData.error?.detail || errorData.error?.message || 'Paddle resume failed',
          details: errorData,
          paddleStatus: paddleResponse.status
        })
      }
    }

    const paddleData = JSON.parse(responseText)
    console.log('✅ Paddle subscription resumed successfully!')
    console.log('📋 Paddle data:', JSON.stringify(paddleData, null, 2))

    // Update user_subscriptions in Supabase
    console.log('💾 Updating user_subscriptions in Supabase...')
    const { error: updateError } = await supabaseAdmin
      .from('user_subscriptions')
      .update({
        status: 'active',  // Resume → active
        cancelled_at: null,  // Clear cancellation date
        updated_at: new Date().toISOString()
      })
      .eq('paddle_subscription_id', subscriptionId)

    if (updateError) {
      console.error('❌ Supabase update error:', updateError)
      // Don't fail the request if DB update fails - Paddle already resumed
    } else {
      console.log('✅ user_subscriptions updated')
    }

    // Update majstors table
    console.log('💾 Updating majstors table...')
    const { error: majstorUpdateError } = await supabaseAdmin
      .from('majstors')
      .update({
        subscription_status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', majstorId)

    if (majstorUpdateError) {
      console.error('❌ Majstor update error:', majstorUpdateError)
    } else {
      console.log('✅ majstors table updated')
    }

    console.log('✅ Subscription reactivation complete!')

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        message: 'Subscription resumed successfully',
        data: paddleData
      })
    }

  } catch (error) {
    console.error('💥 Reactivate subscription error:', error)
    console.error('Stack:', error.stack)
    
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Failed to reactivate subscription',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    }
  }
}