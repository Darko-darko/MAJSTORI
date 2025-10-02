// netlify/functions/paddle-webhook.js
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

/**
 * Netlify Function for Paddle Webhooks
 * Has direct access to raw body = signature verification works!
 */

// Supabase Admin Client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const PADDLE_WEBHOOK_SECRET = process.env.PADDLE_WEBHOOK_SECRET

// Paddle IP whitelist (backup security)
const PADDLE_IPS = [
  '34.194.127.46',
  '54.234.237.108',
  '3.208.120.145',
  '44.226.236.210',
  '44.241.183.62',
  '100.20.172.113'
]

/**
 * Verify Paddle Signature
 */
function verifyPaddleSignature(rawBody, signatureHeader) {
  if (!PADDLE_WEBHOOK_SECRET) {
    console.warn('WARNING: PADDLE_WEBHOOK_SECRET not configured')
    return false
  }

  try {
    const signatureParts = {}
    signatureHeader.split(';').forEach(part => {
      const [key, value] = part.split('=')
      if (key && value) {
        signatureParts[key.trim()] = value.trim()
      }
    })

    const timestamp = signatureParts.ts
    const receivedSignature = signatureParts.h1

    if (!timestamp || !receivedSignature) {
      console.error('Invalid signature format')
      return false
    }

    const payload = `${timestamp}:${rawBody}`
    
    const computedHash = crypto
      .createHmac('sha256', PADDLE_WEBHOOK_SECRET)
      .update(payload, 'utf8')
      .digest('hex')

    return computedHash === receivedSignature

  } catch (error) {
    console.error('Signature verification error:', error)
    return false
  }
}

/**
 * Verify Paddle IP (backup security)
 */
function verifyPaddleIP(sourceIP) {
  return PADDLE_IPS.includes(sourceIP)
}

/**
 * Main Handler
 */
export async function handler(event, context) {
  const startTime = Date.now()
  
  // Only accept POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    console.log('\n========== PADDLE WEBHOOK ==========')
    console.log('Timestamp:', new Date().toISOString())

    // Get raw body (Netlify Functions preserve it!)
    const rawBody = event.body
    
    if (!rawBody) {
      console.error('No body received')
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No body' })
      }
    }

    console.log('Body length:', rawBody.length)

    // Get headers
    const signatureHeader = event.headers['paddle-signature']
    const sourceIP = event.headers['x-forwarded-for']?.split(',')[0] || 
                     event.headers['x-nf-client-connection-ip']

    console.log('Source IP:', sourceIP)

    // Security check 1: Signature verification
    let signatureValid = false
    if (signatureHeader) {
      signatureValid = verifyPaddleSignature(rawBody, signatureHeader)
      
      if (signatureValid) {
        console.log('✅ Signature VERIFIED')
      } else {
        console.error('❌ Signature INVALID')
      }
    } else {
      console.error('❌ No signature header')
    }

    // Security check 2: IP whitelist (backup)
    const ipValid = verifyPaddleIP(sourceIP)
    
    if (ipValid) {
      console.log('✅ IP verified (Paddle)')
    } else {
      console.warn('⚠️ IP not in whitelist:', sourceIP)
    }

    // Require EITHER signature OR IP to be valid
    if (!signatureValid && !ipValid) {
      console.error('❌ WEBHOOK REJECTED: Invalid signature AND unknown IP')
      return {
        statusCode: 401,
        body: JSON.stringify({ 
          error: 'Unauthorized',
          signature: 'invalid',
          ip: 'unknown'
        })
      }
    }

    // If only IP is valid, log warning but continue
    if (!signatureValid && ipValid) {
      console.warn('⚠️ Proceeding with IP verification only (signature failed)')
    }

    // Parse JSON
    let body
    try {
      body = JSON.parse(rawBody)
    } catch (e) {
      console.error('JSON parse error:', e)
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid JSON' })
      }
    }

    const eventType = body.event_type
    const eventData = body.data

    console.log('Event:', eventType)
    console.log('Event ID:', body.event_id)

    // Process event
    let result
    switch (eventType) {
      case 'subscription.created':
        result = await handleSubscriptionCreated(eventData)
        break

      case 'subscription.updated':
        result = await handleSubscriptionUpdated(eventData)
        break

      case 'subscription.activated':
        result = await handleSubscriptionActivated(eventData)
        break

      case 'subscription.trialing':
        result = await handleSubscriptionTrialing(eventData)
        break

      case 'subscription.cancelled':
        result = await handleSubscriptionCancelled(eventData)
        break

      case 'transaction.completed':
        result = await handleTransactionCompleted(eventData)
        break

      case 'transaction.paid':
        result = await handleTransactionPaid(eventData)
        break

      default:
        console.log('Unhandled event:', eventType)
        result = { handled: false }
    }

    const duration = Date.now() - startTime
    console.log(`✅ Processed in ${duration}ms`)
    console.log('=====================================\n')

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true,
        eventType,
        result,
        processingTime: `${duration}ms`,
        security: {
          signature: signatureValid ? 'valid' : 'invalid',
          ip: ipValid ? 'verified' : 'unverified'
        }
      })
    }

  } catch (error) {
    console.error('ERROR:', error.message)
    console.error('Stack:', error.stack)
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Internal error',
        details: error.message 
      })
    }
  }
}

// Event handlers (same as before)

async function handleSubscriptionCreated(data) {
  console.log('✅ subscription.created')

  try {
    const subscriptionId = data.id
    const customerId = data.customer_id
    const status = data.status
    const customData = data.custom_data || {}
    const majstorId = customData.majstor_id

    if (!majstorId) {
      console.error('Missing majstor_id')
      return { error: 'Missing majstor_id' }
    }

    const currentPeriodStart = data.current_billing_period?.starts_at
    const currentPeriodEnd = data.current_billing_period?.ends_at

    const scheduledChange = data.scheduled_change
    const isPaidWithGracePeriod = scheduledChange !== null

    let finalStatus
    let trialStart = null
    let trialEnd = null

    if (status === 'trialing' && isPaidWithGracePeriod) {
      finalStatus = 'active'
      console.log('PAID with grace period')
    } else if (status === 'trialing') {
      finalStatus = 'trial'
      trialStart = data.started_at || currentPeriodStart
      trialEnd = currentPeriodEnd
      console.log('FREE trial')
    } else if (status === 'active') {
      finalStatus = 'active'
    } else {
      finalStatus = status
    }

    const priceId = data.items?.[0]?.price?.id
    const planId = await getPlanIdFromPriceId(priceId)

    const { data: existingSub } = await supabaseAdmin
      .from('user_subscriptions')
      .select('id')
      .eq('paddle_subscription_id', subscriptionId)
      .maybeSingle()

    if (existingSub) {
      return await handleSubscriptionUpdated(data)
    }

    const { data: subscription, error: insertError } = await supabaseAdmin
      .from('user_subscriptions')
      .insert({
        majstor_id: majstorId,
        plan_id: planId,
        status: finalStatus,
        paddle_subscription_id: subscriptionId,
        paddle_customer_id: customerId,
        current_period_start: currentPeriodStart,
        current_period_end: currentPeriodEnd,
        trial_starts_at: trialStart,
        trial_ends_at: trialEnd,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (insertError) {
      console.error('Insert error:', insertError)
      return { error: insertError.message }
    }

    console.log('Created:', subscription.id)

    await supabaseAdmin
      .from('majstors')
      .update({
        subscription_status: finalStatus,
        subscription_ends_at: currentPeriodEnd,
        updated_at: new Date().toISOString()
      })
      .eq('id', majstorId)

    return { success: true, subscriptionId: subscription.id, status: finalStatus }

  } catch (error) {
    console.error('Error:', error)
    return { error: error.message }
  }
}

async function handleSubscriptionUpdated(data) {
  console.log('🔄 subscription.updated')

  const subscriptionId = data.id
  const status = data.status
  const currentPeriodStart = data.current_billing_period?.starts_at
  const currentPeriodEnd = data.current_billing_period?.ends_at

  const scheduledChange = data.scheduled_change
  const isPaidWithGracePeriod = scheduledChange !== null

  let finalStatus = status === 'trialing' && isPaidWithGracePeriod ? 'active' :
                    status === 'trialing' ? 'trial' :
                    status === 'active' ? 'active' : status

  await supabaseAdmin
    .from('user_subscriptions')
    .update({
      status: finalStatus,
      current_period_start: currentPeriodStart,
      current_period_end: currentPeriodEnd,
      updated_at: new Date().toISOString()
    })
    .eq('paddle_subscription_id', subscriptionId)

  const { data: subscription } = await supabaseAdmin
    .from('user_subscriptions')
    .select('majstor_id')
    .eq('paddle_subscription_id', subscriptionId)
    .single()

  if (subscription?.majstor_id) {
    await supabaseAdmin
      .from('majstors')
      .update({
        subscription_status: finalStatus,
        subscription_ends_at: currentPeriodEnd,
        updated_at: new Date().toISOString()
      })
      .eq('id', subscription.majstor_id)
  }

  return { success: true, status: finalStatus }
}

async function handleSubscriptionActivated(data) {
  console.log('⚡ subscription.activated')

  const subscriptionId = data.id

  await supabaseAdmin
    .from('user_subscriptions')
    .update({
      status: 'active',
      updated_at: new Date().toISOString()
    })
    .eq('paddle_subscription_id', subscriptionId)

  return { success: true }
}

async function handleSubscriptionTrialing(data) {
  console.log('🎯 subscription.trialing')

  const subscriptionId = data.id
  const scheduledChange = data.scheduled_change
  const finalStatus = scheduledChange !== null ? 'active' : 'trial'

  await supabaseAdmin
    .from('user_subscriptions')
    .update({
      status: finalStatus,
      updated_at: new Date().toISOString()
    })
    .eq('paddle_subscription_id', subscriptionId)

  return { success: true, status: finalStatus }
}

async function handleSubscriptionCancelled(data) {
  console.log('❌ subscription.cancelled')

  const subscriptionId = data.id
  const cancelledAt = data.cancelled_at

  await supabaseAdmin
    .from('user_subscriptions')
    .update({
      status: 'cancelled',
      cancelled_at: cancelledAt,
      updated_at: new Date().toISOString()
    })
    .eq('paddle_subscription_id', subscriptionId)

  return { success: true }
}

async function handleTransactionCompleted(data) {
  console.log('💳 transaction.completed')

  const subscriptionId = data.subscription_id

  if (subscriptionId) {
    const { data: subscription } = await supabaseAdmin
      .from('user_subscriptions')
      .select('status')
      .eq('paddle_subscription_id', subscriptionId)
      .single()

    if (subscription && subscription.status === 'trial') {
      await supabaseAdmin
        .from('user_subscriptions')
        .update({
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('paddle_subscription_id', subscriptionId)
    }
  }

  return { success: true }
}

async function handleTransactionPaid(data) {
  console.log('💳 transaction.paid')

  const subscriptionId = data.subscription_id

  if (subscriptionId) {
    await supabaseAdmin
      .from('user_subscriptions')
      .update({
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('paddle_subscription_id', subscriptionId)
  }

  return { success: true }
}

async function getPlanIdFromPriceId(priceId) {
  const priceIdMap = {
    [process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_MONTHLY]: 'pro',
    [process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_YEARLY]: 'pro_yearly'
  }

  const planName = priceIdMap[priceId] || 'pro'

  const { data: plan } = await supabaseAdmin
    .from('subscription_plans')
    .select('id')
    .eq('name', planName)
    .single()

  return plan?.id
}
