<<<<<<< HEAD
// netlify/functions/fastspring-reactivate-subscription.js
// Reactivate: turn ON auto-renew (manualRenew = false)

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

    const body = JSON.parse(event.body)
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
    console.log('🔐 FS username set:', !!FASTSPRING_USERNAME)
    console.log('🔐 FS password set:', !!FASTSPRING_PASSWORD)

    const authString = Buffer.from(
      `${FASTSPRING_USERNAME}:${FASTSPRING_PASSWORD}`
    ).toString('base64')

    const fastspringResponse = await fetch(
      `${FASTSPRING_API_URL}/subscriptions`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${authString}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscriptions: [
            {
              subscription: subscriptionId,
              manualRenew: 'false', // uključi auto-renew
            },
          ],
        }),
      }
    )

    if (!fastspringResponse.ok) {
      const errorText = await fastspringResponse.text()
      console.error('❌ FastSpring API error:', errorText)
      return {
        statusCode: fastspringResponse.status,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'FastSpring reactivation failed',
          details: errorText.substring(0, 300),
        }),
      }
    }

    const fastspringData = await fastspringResponse.json()
    console.log('✅ FastSpring subscription reactivated (autoRenew = true)')

    await supabaseAdmin
      .from('user_subscriptions')
      .update({
        cancel_at_period_end: false,
        cancelled_at: null,
        provider_metadata: {
          autoRenew: true,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('provider_subscription_id', subscriptionId)

    console.log('✅ Database updated')
    console.log('✅ Subscription will auto-renew')

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        message: 'Reactivation successful',
        data: {
          subscriptionId,
          autoRenew: true,
          nextChargeDate: fastspringData.subscriptions?.[0]?.nextChargeDate,
        },
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
=======
// netlify/functions/fastspring-reactivate-subscription.js
// Reactivate FastSpring subscription (set autoRenew = true)

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
    console.log('🔄 Reactivate subscription request received')
    
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

    // FastSpring API: Update subscription to enable autoRenew
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
          autoRenew: true
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
          error: 'FastSpring reactivation failed',
          details: errorText.substring(0, 300)
        })
      }
    }

    const fastspringData = await fastspringResponse.json()
    console.log('✅ FastSpring subscription reactivated (autoRenew = true)')

    // Update database
    await supabaseAdmin
      .from('user_subscriptions')
      .update({
        cancel_at_period_end: false,
        cancelled_at: null,
        provider_metadata: {
          autoRenew: true
        },
        updated_at: new Date().toISOString()
      })
      .eq('provider_subscription_id', subscriptionId)

    console.log('✅ Database updated')
    console.log('✅ Subscription will auto-renew')

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        message: 'Reactivation successful',
        data: {
          subscriptionId: subscriptionId,
          autoRenew: true,
          nextChargeDate: fastspringData.subscription?.nextChargeDate
        }
      })
    }

  } catch (error) {
    console.error('💥 Reactivate error:', error)
    
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Failed to reactivate subscription',
        message: error.message
      })
    }
  }
}
>>>>>>> 3e46e47071fbd52a87c06e387ce3355d6ed62548
