// netlify/functions/fastspring-reactivate-subscription.js

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

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' }),
    }
  }

  try {
    console.log('🔄 Reactivate subscription request received')

    const body = JSON.parse(event.body || '{}')
    const { subscriptionId, majstorId } = body

    if (!subscriptionId || !majstorId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Missing required fields',
          required: ['subscriptionId', 'majstorId'],
        }),
      }
    }

    console.log('📋 Subscription ID:', subscriptionId)
    console.log('👤 Majstor ID:', majstorId)

    const authString = Buffer.from(
      `${FASTSPRING_USERNAME}:${FASTSPRING_PASSWORD}`
    ).toString('base64')

    // ✅ Update subscription: remove deactivation (undo cancel)
    const fastspringResponse = await fetch(
      `${FASTSPRING_API_URL}/subscriptions`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${authString}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          subscriptions: [
            {
              subscription: subscriptionId,
              deactivationDate: null,
            },
          ],
        }),
      }
    )

    console.log('🔢 FS status:', fastspringResponse.status)

    if (!fastspringResponse.ok) {
      const errorText = await fastspringResponse.text()
      console.error('❌ FastSpring API error:', errorText)

      return {
        statusCode: fastspringResponse.status,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'FastSpring reactivation failed',
          status: fastspringResponse.status,
          details: errorText?.slice(0, 300) || null,
        }),
      }
    }

    const fastspringData = await fastspringResponse.json()
    console.log('✅ FastSpring subscription reactivated')

    await supabaseAdmin
      .from('user_subscriptions')
      .update({
        cancel_at_period_end: false,
        cancelled_at: null,
        provider_metadata: { autoRenew: true },
        updated_at: new Date().toISOString(),
      })
      .eq('provider_subscription_id', subscriptionId)

    console.log('✅ Database updated')

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        message: 'Reactivation successful',
        data: fastspringData,
      }),
    }
  } catch (error) {
    console.error('💥 Reactivate error:', error)

    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Failed to reactivate subscription',
        message: error.message,
      }),
    }
  }
}
