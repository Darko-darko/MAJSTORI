// netlify/functions/paddle-cancel-subscription.js - CommonJS verzija
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
    console.log('URL:', `${PADDLE_API_BASE_URL}/subscriptions/${subscriptionId}/cancel`)
    
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
    console.log('📄 Paddle response preview:', responseText.substring(0, 200))

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
    console.log('✅ Paddle subscription cancelled!')
    console.log('📋 Scheduled cancellation at end of billing period')

    console.log('💾 Updating Supabase database...')
    
    const { error: updateError } = await supabaseAdmin
      .from('user_subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('paddle_subscription_id', subscriptionId)

    if (updateError) {
      console.error('⚠️ Supabase user_subscriptions update error:', updateError)
    } else {
      console.log('✅ user_subscriptions status updated to "cancelled"')
    }

    const { error: majstorUpdateError } = await supabaseAdmin
      .from('majstors')
      .update({
        subscription_status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', majstorId)

    if (majstorUpdateError) {
      console.error('⚠️ Majstor update error:', majstorUpdateError)
    } else {
      console.log('✅ majstors table updated to "cancelled"')
    }

    console.log('✅ Subscription cancellation complete!')

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        message: 'Subscription cancelled successfully',
        data: {
          subscriptionId: paddleData.data?.id || subscriptionId,
          status: 'cancelled',
          effectiveFrom: 'next_billing_period',
          scheduledChange: paddleData.data?.scheduled_change || null
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