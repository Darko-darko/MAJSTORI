// netlify/functions/paddle-webhook.js - SAFE UPDATE (samo subscription.updated poboljšan)

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

    const signedContent = `${timestamp}:${rawBody}`
    
    const computedHash = crypto
      .createHmac('sha256', PADDLE_WEBHOOK_SECRET)
      .update(signedContent, 'utf8')
      .digest('hex')

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

    let signatureValid = false
    if (signatureHeader && PADDLE_WEBHOOK_SECRET) {
      signatureValid = verifyPaddleSignature(rawBody, signatureHeader)
    } else {
      console.error('❌ No signature header or secret')
    }

    const ipValid = verifyPaddleIP(sourceIP)
    
    if (ipValid) {
      console.log('✅ IP verified (Paddle)')
    } else {
      console.warn('⚠️ IP not in whitelist:', sourceIP)
    }

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

      case 'subscription.past_due':
        result = await handleSubscriptionPastDue(eventData)
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

// ============================================
// ✅ NE DIRAM - RADI PERFEKTNO!
// ============================================
async function handleSubscriptionCreated(data) {
  console.log('✅ subscription.created')

  try {
    console.log('🔥 RAW PADDLE DATA:', JSON.stringify(data, null, 2))

    const subscriptionId = data.id
    const customerId = data.customer_id
    const status = data.status
    const customData = data.custom_data || {}
    const majstorId = customData.majstor_id

    console.log('📋 Paddle status:', status)
    console.log('📋 Majstor ID:', majstorId)

    if (!majstorId) {
      console.error('❌ Missing majstor_id')
      return { error: 'Missing majstor_id' }
    }

    const currentPeriodStart = data.current_billing_period?.starts_at
    const currentPeriodEnd = data.current_billing_period?.ends_at

    let finalStatus
    let trialEndsAt = null
    
    if (status === 'trialing') {
      finalStatus = 'trial'
      trialEndsAt = currentPeriodEnd
      console.log('🎯 TRIAL subscription detected!')
      console.log('🎯 Trial ends at:', trialEndsAt)
    } else if (status === 'active') {
      finalStatus = 'active'
      console.log('💳 ACTIVE subscription (no trial)')
    } else {
      console.error('❌ Unexpected status from Paddle:', status)
      return { error: `Invalid status: ${status}` }
    }

    const priceId = data.items?.[0]?.price?.id
    const planId = await getPlanIdFromPriceId(priceId)

    if (!planId) {
      console.error('❌ Could not determine plan_id for price:', priceId)
      return { error: 'Unknown price_id' }
    }

    console.log('📦 Plan ID:', planId)

    const { data: subscription, error: upsertError } = await supabaseAdmin
      .from('user_subscriptions')
      .upsert({
        majstor_id: majstorId,
        plan_id: planId,
        status: finalStatus,
        paddle_subscription_id: subscriptionId,
        paddle_customer_id: customerId,
        current_period_start: currentPeriodStart,
        current_period_end: currentPeriodEnd,
        trial_starts_at: status === 'trialing' ? currentPeriodStart : null,
        trial_ends_at: trialEndsAt,
        cancel_at_period_end: false,
        cancelled_at: null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'paddle_subscription_id'
      })
      .select()
      .single()

    if (upsertError) {
      console.error('❌ Upsert error:', upsertError)
      return { error: upsertError.message }
    }

    console.log('✅ Subscription saved with ID:', subscription.id)
    console.log('✅ Status in database:', finalStatus)

    await supabaseAdmin
      .from('majstors')
      .update({
        subscription_status: finalStatus,
        subscription_ends_at: currentPeriodEnd,
        updated_at: new Date().toISOString()
      })
      .eq('id', majstorId)

    console.log('✅ Majstor record updated')

    return { 
      success: true, 
      subscriptionId: subscription.id, 
      status: finalStatus,
      trialEnds: trialEndsAt 
    }

  } catch (error) {
    console.error('❌ Error in handleSubscriptionCreated:', error)
    return { error: error.message }
  }
}

// ============================================
// 🔥 POBOLJŠAN - Za cancel/reactivate Realtime
// ============================================
async function handleSubscriptionUpdated(data) {
  console.log('🔄 subscription.updated')

  const subscriptionId = data.id
  const status = data.status
  const currentPeriodStart = data.current_billing_period?.starts_at
  const currentPeriodEnd = data.current_billing_period?.ends_at
  const scheduledChange = data.scheduled_change

  console.log('📊 Paddle status:', status)
  console.log('📅 Scheduled change:', scheduledChange)

  let finalStatus
  let trialEndsAt = null
  let cancelAtPeriodEnd = false
  
  // 🔥 FIXED: Detektuj cancel iz trial-a!
  if (status === 'trialing' && scheduledChange?.action === 'cancel') {
    // ✅ Trial je cancelled → odmah na freemium!
    finalStatus = 'freemium'
    cancelAtPeriodEnd = false
    trialEndsAt = null
    console.log('🚫 Trial cancelled → Reverting to freemium immediately')
  }
  else if (status === 'trialing') {
    // ✅ Trial je aktivan (nije cancelled)
    finalStatus = 'trial'
    trialEndsAt = currentPeriodEnd
    console.log('🎯 Still in trial period')
  } 
  else if (status === 'active') {
    // ✅ Active subscription
    finalStatus = 'active'
    
    // Proveri da li je scheduled cancel
    if (scheduledChange?.action === 'cancel') {
      cancelAtPeriodEnd = true
      console.log('📅 Active subscription - cancellation scheduled for:', scheduledChange.effective_at)
    } else {
      console.log('💳 Active subscription - no scheduled changes')
    }
  } 
  else if (status === 'cancelled') {
    // ✅ Subscription je finalno cancelled (period istekao)
    finalStatus = 'cancelled'
    console.log('🚫 Subscription cancelled')
  }

  // 🔥 Update sa Paddle podacima - ovo će triggerovati Realtime!
  const { error: updateError } = await supabaseAdmin
    .from('user_subscriptions')
    .update({
      status: finalStatus,
      current_period_start: currentPeriodStart,
      current_period_end: currentPeriodEnd,
      trial_ends_at: trialEndsAt,
      paddle_scheduled_change: scheduledChange,
      cancel_at_period_end: cancelAtPeriodEnd,
      updated_at: new Date().toISOString()
    })
    .eq('paddle_subscription_id', subscriptionId)

  if (updateError) {
    console.error('❌ Update error:', updateError)
    return { error: updateError.message }
  }

  console.log('✅ Subscription updated - Realtime triggered!')

  // Update majstor record
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
        subscription_ends_at: finalStatus === 'freemium' ? null : currentPeriodEnd,
        updated_at: new Date().toISOString()
      })
      .eq('id', subscription.majstor_id)
    
    console.log('✅ Majstor record updated')
  }

  return { 
    success: true, 
    status: finalStatus,
    cancelAtPeriodEnd: cancelAtPeriodEnd,
    scheduledChange: scheduledChange 
  }
}

// ============================================
// ✅ NE DIRAM - RADI PERFEKTNO!
// ============================================
async function handleSubscriptionActivated(data) {
  console.log('⚡ subscription.activated')
  console.log('🎉 TRIAL → PRO conversion successful!')

  const subscriptionId = data.id

  await supabaseAdmin
    .from('user_subscriptions')
    .update({
      status: 'active',
      trial_ends_at: null,
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
        subscription_status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', subscription.majstor_id)
    
    console.log('✅ User now has PRO access')
  }

  return { success: true, message: 'Trial converted to PRO' }
}

// ============================================
// ✅ NE DIRAM - RADI PERFEKTNO!
// ============================================
async function handleSubscriptionCancelled(data) {
  console.log('❌ subscription.cancelled')

  const subscriptionId = data.id
  const cancelledAt = data.cancelled_at
  const scheduledChange = data.scheduled_change

  const { data: subscription } = await supabaseAdmin
    .from('user_subscriptions')
    .select('majstor_id, status, trial_ends_at, current_period_end')
    .eq('paddle_subscription_id', subscriptionId)
    .single()

  if (!subscription) {
    console.error('Subscription not found:', subscriptionId)
    return { error: 'Subscription not found' }
  }

  const majstorId = subscription.majstor_id
  const currentStatus = subscription.status

  let newStatus
  let shouldRevertToFreemium = false
  let cancelAtPeriodEnd = false

  if (currentStatus === 'trial') {
    newStatus = 'freemium'
    shouldRevertToFreemium = true
    console.log('🔄 Trial cancelled → Reverting to freemium')
    console.log('User will lose PRO access immediately')
  } else if (currentStatus === 'active') {
    if (scheduledChange?.action === 'cancel') {
      newStatus = 'active'
      cancelAtPeriodEnd = true
      console.log('📅 Cancellation scheduled for:', subscription.current_period_end)
      console.log('User keeps PRO access until:', subscription.current_period_end)
    } else {
      newStatus = 'freemium'
      shouldRevertToFreemium = true
      console.log('⚠️ Immediate cancellation → Freemium')
    }
  } else {
    newStatus = 'freemium'
    console.log('⚠️ Unexpected cancellation from status:', currentStatus)
  }

  await supabaseAdmin
    .from('user_subscriptions')
    .update({
      status: newStatus,
      cancelled_at: cancelledAt,
      cancel_at_period_end: cancelAtPeriodEnd,
      updated_at: new Date().toISOString()
    })
    .eq('paddle_subscription_id', subscriptionId)

  if (majstorId) {
    await supabaseAdmin
      .from('majstors')
      .update({
        subscription_status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', majstorId)
  }

  console.log(`✅ Status updated: ${currentStatus} → ${newStatus}`)

  return { 
    success: true, 
    newStatus,
    previousStatus: currentStatus,
    revertedToFreemium: shouldRevertToFreemium,
    cancelAtPeriodEnd,
    message: shouldRevertToFreemium 
      ? 'Reverted to freemium' 
      : cancelAtPeriodEnd 
        ? 'Active until period end'
        : 'Cancelled'
  }
}

// ============================================
// ✅ NE DIRAM - RADI PERFEKTNO!
// ============================================
async function handleSubscriptionPastDue(data) {
  console.log('⏰ subscription.past_due')
  console.log('⚠️ Payment failed - subscription past due')

  const subscriptionId = data.id

  await supabaseAdmin
    .from('user_subscriptions')
    .update({
      status: 'past_due',
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
        subscription_status: 'past_due',
        updated_at: new Date().toISOString()
      })
      .eq('id', subscription.majstor_id)
  }

  console.log('⏳ Grace period active - waiting for payment retry')

  return { success: true, message: 'Marked as past due' }
}

async function handleTransactionCompleted(data) {
  console.log('💳 transaction.completed')

  const subscriptionId = data.subscription_id

  if (subscriptionId) {
    // 🔥 FIX: Ne diraj trial subscription! Samo update-uj ako JE active
    const { data: currentSub } = await supabaseAdmin
      .from('user_subscriptions')
      .select('status, trial_ends_at')
      .eq('paddle_subscription_id', subscriptionId)
      .single()

    if (!currentSub) {
      console.warn('⚠️ Subscription not found for transaction.completed')
      return { success: false, error: 'Subscription not found' }
    }

    // 🔥 Proveri da li je trial još aktivan
    const now = new Date()
    const isTrialActive = currentSub.status === 'trial' && 
                          currentSub.trial_ends_at && 
                          new Date(currentSub.trial_ends_at) > now

    if (isTrialActive) {
      console.log('⏸️ Trial is still active - NOT changing status to active')
      return { success: true, message: 'Trial active - status unchanged' }
    }

    // ✅ Samo ako NIJE trial, onda update-uj na active
    await supabaseAdmin
      .from('user_subscriptions')
      .update({
        status: 'active',
        trial_ends_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('paddle_subscription_id', subscriptionId)
    
    console.log('✅ Payment successful - subscription active')
  }

  return { success: true }
}

async function handleTransactionPaid(data) {
  console.log('💳 transaction.paid')

  const subscriptionId = data.subscription_id

  if (subscriptionId) {
    // 🔥 FIX: Ne diraj trial subscription!
    const { data: currentSub } = await supabaseAdmin
      .from('user_subscriptions')
      .select('status, trial_ends_at')
      .eq('paddle_subscription_id', subscriptionId)
      .single()

    if (!currentSub) {
      console.warn('⚠️ Subscription not found for transaction.paid')
      return { success: false, error: 'Subscription not found' }
    }

    // 🔥 Proveri da li je trial još aktivan
    const now = new Date()
    const isTrialActive = currentSub.status === 'trial' && 
                          currentSub.trial_ends_at && 
                          new Date(currentSub.trial_ends_at) > now

    if (isTrialActive) {
      console.log('⏸️ Trial is still active - NOT changing status to active')
      return { success: true, message: 'Trial active - status unchanged' }
    }

    // ✅ Samo ako NIJE trial, update-uj na active
    await supabaseAdmin
      .from('user_subscriptions')
      .update({
        status: 'active',
        trial_ends_at: null,
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
          subscription_status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', subscription.majstor_id)
    }
    
    console.log('✅ Payment confirmed - PRO access granted')
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