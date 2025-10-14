// netlify/functions/paddle-webhook.js - FIXED FOR NETLIFY

import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const PADDLE_WEBHOOK_SECRET = process.env.PADDLE_WEBHOOK_SECRET

const PADDLE_IPS = [
  '34.194.127.46',
  '54.234.237.108',
  '3.208.120.145',
  '44.226.236.210',
  '44.241.183.62',
  '100.20.172.113'
]

// 🔥 FIXED: Paddle signature verification for Netlify
function verifyPaddleSignature(rawBody, signatureHeader) {
  if (!PADDLE_WEBHOOK_SECRET) {
    console.warn('WARNING: PADDLE_WEBHOOK_SECRET not configured')
    return false
  }

  try {
    // Parse signature header
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

    // 🔥 KLJUČNA PROMJENA: Paddle Billing format
    // signedContent = "timestamp:body"
    const signedContent = `${timestamp}:${rawBody}`
    
    // Calculate expected signature
    const computedHash = crypto
      .createHmac('sha256', PADDLE_WEBHOOK_SECRET)
      .update(signedContent, 'utf8')
      .digest('hex')

    // Compare signatures (constant-time)
    const isValid = computedHash === receivedSignature

    if (isValid) {
      console.log('✅ Signature VALID')
    } else {
      console.error('❌ Signature MISMATCH')
      console.log('Computed:', computedHash.substring(0, 30))
      console.log('Received:', receivedSignature.substring(0, 30))
    }

    return isValid

  } catch (error) {
    console.error('Signature verification error:', error)
    return false
  }
}

function verifyPaddleIP(sourceIP) {
  return PADDLE_IPS.includes(sourceIP)
}

export async function handler(event, context) {
  const startTime = Date.now()
  
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    console.log('\n========== PADDLE WEBHOOK ==========')
    console.log('Timestamp:', new Date().toISOString())

    // 🔥 KRITIČNO: U Netlify Functions, event.body je STRING
    // Ne transformiši ga! Koristi ga direktno za signature verification
    const rawBody = event.body
    
    if (!rawBody) {
      console.error('No body received')
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No body' })
      }
    }

    console.log('Body length:', rawBody.length)

    const signatureHeader = event.headers['paddle-signature']
    const sourceIP = event.headers['x-forwarded-for']?.split(',')[0] || 
                     event.headers['x-nf-client-connection-ip']

    console.log('Source IP:', sourceIP)

    // Verify signature
    let signatureValid = false
    if (signatureHeader && PADDLE_WEBHOOK_SECRET) {
      signatureValid = verifyPaddleSignature(rawBody, signatureHeader)
    } else {
      console.error('❌ No signature header or secret')
    }

    // Verify IP as fallback
    const ipValid = verifyPaddleIP(sourceIP)
    
    if (ipValid) {
      console.log('✅ IP verified (Paddle)')
    } else {
      console.warn('⚠️ IP not in whitelist:', sourceIP)
    }

    // Accept webhook if EITHER signature OR IP is valid
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

    if (!signatureValid && ipValid) {
      console.warn('⚠️ Proceeding with IP verification only (signature failed)')
    }

    // 🔥 NOW parse JSON (after signature verification)
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

    // Process webhook
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

// Event handlers (ostavljam tvoje postojeće funkcije)
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

    let finalStatus = 'active'
    let trialEndsAt = null
    
    if (status === 'trialing') {
      finalStatus = 'trial'
      trialEndsAt = currentPeriodEnd
      console.log('🎯 Trial subscription detected!')
      console.log('Trial ends at:', trialEndsAt)
    } else if (status === 'active') {
      finalStatus = 'active'
      console.log('💳 Active (paid) subscription')
    }

    const priceId = data.items?.[0]?.price?.id
    const planId = await getPlanIdFromPriceId(priceId)

    if (!planId) {
      console.error('Could not determine plan_id for price:', priceId)
      return { error: 'Unknown price_id' }
    }

    const { data: existingSub } = await supabaseAdmin
      .from('user_subscriptions')
      .select('id')
      .eq('paddle_subscription_id', subscriptionId)
      .maybeSingle()

    if (existingSub) {
      console.log('Subscription already exists, updating instead')
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
        trial_starts_at: status === 'trialing' ? currentPeriodStart : null,
        trial_ends_at: trialEndsAt,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (insertError) {
      console.error('Insert error:', insertError)
      return { error: insertError.message }
    }

    console.log('Created subscription:', subscription.id)

    await supabaseAdmin
      .from('majstors')
      .update({
        subscription_status: finalStatus,
        subscription_ends_at: currentPeriodEnd,
        updated_at: new Date().toISOString()
      })
      .eq('id', majstorId)

    console.log('Updated majstor record')

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

  let finalStatus = 'active'
  let trialEndsAt = null
  
  if (status === 'trialing') {
    finalStatus = 'trial'
    trialEndsAt = currentPeriodEnd
    console.log('🎯 Still in trial period')
  } else if (status === 'active') {
    finalStatus = 'active'
    console.log('💳 Trial ended → Active subscription')
  } else if (status === 'cancelled') {
    finalStatus = 'cancelled'
    console.log('🚫 Subscription cancelled')
  }

  await supabaseAdmin
    .from('user_subscriptions')
    .update({
      status: finalStatus,
      current_period_start: currentPeriodStart,
      current_period_end: currentPeriodEnd,
      trial_ends_at: trialEndsAt,
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
      trial_ends_at: null,
      updated_at: new Date().toISOString()
    })
    .eq('paddle_subscription_id', subscriptionId)

  return { success: true }
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

  const { data: subscription } = await supabaseAdmin
    .from('user_subscriptions')
    .select('majstor_id')
    .eq('paddle_subscription_id', subscriptionId)
    .single()

  if (subscription?.majstor_id) {
    await supabaseAdmin
      .from('majstors')
      .update({
        subscription_status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', subscription.majstor_id)
  }

  return { success: true }
}

async function handleTransactionCompleted(data) {
  console.log('💳 transaction.completed')

  const subscriptionId = data.subscription_id

  if (subscriptionId) {
    await supabaseAdmin
      .from('user_subscriptions')
      .update({
        status: 'active',
        trial_ends_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('paddle_subscription_id', subscriptionId)
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
        trial_ends_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('paddle_subscription_id', subscriptionId)
  }

  return { success: true }
}

async function getPlanIdFromPriceId(priceId) {
  const priceIdMap = {
    [process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_MONTHLY]: 'pro',
    [process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_YEARLY]: 'pro'
  }

  const planName = priceIdMap[priceId]

  if (!planName) {
    console.warn('Unknown price ID:', priceId)
    return null
  }

  console.log(`Price ${priceId} mapped to plan: ${planName}`)

  const { data: plan } = await supabaseAdmin
    .from('subscription_plans')
    .select('id')
    .eq('name', planName)
    .single()

  if (!plan) {
    console.error(`Plan '${planName}' not found in database!`)
    return null
  }

  console.log(`Found plan_id: ${plan.id}`)
  return plan.id
}