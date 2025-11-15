// netlify/functions/fastspring-cancel-subscription.js
// Cancel FastSpring subscription (set autoRenew = false)

const { createClient } = require('@supabase/supabase-js')

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const FASTSPRING_USERNAME = process.env.FASTSPRING_USERNAME
const FASTSPRING_PASSWORD = process.env.FASTSPRING_PASSWORD
const FASTSPRING_API_URL = 'https://api.fastspring.com'

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
    
    const body = JSON.parse(event.body)
    const { subscriptionId, majstorId } = body

    if (!subscriptionId || !majstorId) {
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

    // FastSpring API: Update subscription to disable autoRenew
    const authString = Buffer.from(`${FASTSPRING_USERNAME}:${FASTSPRING_PASSWORD}`).toString('base64')

    const fastspringResponse = await fetch(
      `${FASTSPRING_API_URL}/subscriptions/${subscriptionId}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${authString}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          autoRenew: false
        })
      }
    )

    if (!fastspringResponse.ok) {
      const errorText = await fastspringResponse.text()
      console.error('❌ FastSpring API error:', errorText)
      return {
        statusCode: fastspringResponse.status,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: 'FastSpring cancellation failed',
          details: errorText.substring(0, 300)
        })
      }
    }

    const fastspringData = await fastspringResponse.json()
    console.log('✅ FastSpring subscription cancelled (autoRenew = false)')

    // Update database
    await supabaseAdmin
      .from('user_subscriptions')
      .update({
        cancel_at_period_end: true,
        cancelled_at: new Date().toISOString(),
        provider_metadata: {
          autoRenew: false
        },
        updated_at: new Date().toISOString()
      })
      .eq('provider_subscription_id', subscriptionId)

    console.log('✅ Database updated')
    console.log('⏳ Subscription will end at period end')

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        message: 'Cancellation scheduled',
        data: {
          subscriptionId: subscriptionId,
          autoRenew: false,
          endsAt: fastspringData.subscription?.nextChargeDate
        }
      })
    }

  } catch (error) {
    console.error('💥 Cancel error:', error)
    
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Failed to cancel subscription',
        message: error.message
      })
    }
  }
}