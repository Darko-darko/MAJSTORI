// netlify/functions/paddle-webhook.js - PRODUCTION SAFE VERSION
// ✅ SAMO 2 FUNKCIJE PROMENJENE - OSTALO NETAKNUTO!

const { createClient } = require('@supabase/supabase-js')
const crypto = require('crypto')

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const ALLOWED_IPS = [
  '34.232.58.13',
  '34.195.105.136',
  '34.237.3.244',
  '35.155.119.135',
  '52.11.166.252',
  '34.212.5.7'
]

exports.handler = async (event) => {
  const startTime = Date.now()
  
  console.log('\n=====================================')
  console.log('🔔 PADDLE WEBHOOK RECEIVED')
  console.log('Method:', event.httpMethod)
  console.log('Time:', new Date().toISOString())

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const clientIp = event.headers['x-forwarded-for']?.split(',')[0].trim() || 
                     event.headers['client-ip']
    
    console.log('Client IP:', clientIp)
    
    const ipValid = ALLOWED_IPS.includes(clientIp)
    console.log('IP Valid:', ipValid)

    const paddleSignature = event.headers['paddle-signature']
    const rawBody = event.body

    let signatureValid = false
    if (paddleSignature && process.env.PADDLE_WEBHOOK_SECRET) {
      const [tsValue, h1Value] = paddleSignature.split(';').map(part => {
        const [key, value] = part.split('=')
        return value
      })

      const signedPayload = `${tsValue}:${rawBody}`
      const expectedSignature = crypto
        .createHmac('sha256', process.env.PADDLE_WEBHOOK_SECRET)
        .update(signedPayload)
        .digest('hex')

      signatureValid = expectedSignature === h1Value
      console.log('Signature Valid:', signatureValid)
    }

    if (!ipValid && !signatureValid) {
      console.warn('⚠️ Security check failed')
      return {
        statusCode: 403,
        body: JSON.stringify({ 
          error: 'Forbidden',
          ip: clientIp,
          ipValid,
          signatureValid
        })
      }
    }

    if (!signatureValid) {
      console.warn('⚠️ Signature verification failed, but IP is valid')
      console.warn('Proceeding with IP verification only (signature failed)')
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
// 🔥 PROMENJENA FUNKCIJA #1 - KONZISTENTNA LOGIKA
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

  // 🔥 NOVA LOGIKA: Trial cancel ISTO kao PRO cancel (ne briše, samo markira)
  if (status === 'trialing' && scheduledChange?.action === 'cancel') {
    console.log('🚫 Trial cancellation scheduled')
    console.log('📌 Marking subscription for cancellation (consistent with PRO)')
    
    const { data: subscription } = await supabaseAdmin
      .from('user_subscriptions')
      .select('majstor_id')
      .eq('paddle_subscription_id', subscriptionId)
      .single()

    if (!subscription?.majstor_id) {
      console.error('❌ Subscription not found')
      return { error: 'Subscription not found' }
    }

    // ✅ UPDATE (ne DELETE!) - konzistentno sa PRO
    await supabaseAdmin
      .from('user_subscriptions')
      .update({
        cancel_at_period_end: true,
        paddle_scheduled_change: scheduledChange,
        updated_at: new Date().toISOString()
      })
      .eq('paddle_subscription_id', subscriptionId)

    console.log('✅ Trial marked for cancellation')
    console.log('📅 Will be cancelled when period ends')

    return { 
      success: true, 
      action: 'marked_for_cancellation',
      message: 'Trial cancellation scheduled' 
    }
  }

  // ✅ Normalan flow za ostale statuse (ISTO KAO RANIJE)
  let finalStatus
  let trialEndsAt = null
  let cancelAtPeriodEnd = false
  
  if (status === 'trialing') {
    finalStatus = 'trial'
    trialEndsAt = currentPeriodEnd
    console.log('🎯 Still in trial period')
  } 
  else if (status === 'active') {
    finalStatus = 'active'
    
    if (scheduledChange?.action === 'cancel') {
      cancelAtPeriodEnd = true
      console.log('📅 Active subscription - cancellation scheduled for:', scheduledChange.effective_at)
    } else {
      console.log('💳 Active subscription - no scheduled changes')
    }
  } 
  else if (status === 'cancelled') {
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
        subscription_ends_at: currentPeriodEnd,
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
// 🔥 PROMENJENA FUNKCIJA #2 - KONZISTENTNA LOGIKA
// ============================================
async function handleSubscriptionCancelled(data) {
  console.log('❌ subscription.cancelled')

  const subscriptionId = data.id
  const cancelledAt = data.cancelled_at

  const { data: subscription } = await supabaseAdmin
    .from('user_subscriptions')
    .select('majstor_id, status, current_period_end')
    .eq('paddle_subscription_id', subscriptionId)
    .single()

  if (!subscription) {
    console.error('❌ Subscription not found:', subscriptionId)
    return { error: 'Subscription not found' }
  }

  const majstorId = subscription.majstor_id
  const currentStatus = subscription.status

  console.log('📊 Current status:', currentStatus)
  console.log('👤 Majstor ID:', majstorId)

  // 🔥 NOVA LOGIKA: Konzistentno za TRIAL i PRO
  // Oba završavaju sa status='cancelled'
  
  if (currentStatus === 'trial' || currentStatus === 'active') {
    console.log(`🔄 ${currentStatus.toUpperCase()} → CANCELLED`)
    
    // ✅ UPDATE na 'cancelled' (ne 'freemium'!)
    await supabaseAdmin
      .from('user_subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: cancelledAt,
        updated_at: new Date().toISOString()
      })
      .eq('paddle_subscription_id', subscriptionId)

    // ✅ Majstor prelazi na freemium
    await supabaseAdmin
      .from('majstors')
      .update({
        subscription_status: 'freemium',
        subscription_ends_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', majstorId)

    console.log('✅ Subscription cancelled')
    console.log('✅ User reverted to freemium')

    return { 
      success: true, 
      newStatus: 'cancelled',
      previousStatus: currentStatus,
      message: 'Subscription cancelled - user is now freemium'
    }
  }

  // Fallback za neočekivane statuse
  console.warn('⚠️ Unexpected status:', currentStatus)
  return { 
    success: true, 
    message: 'No action taken - unexpected status' 
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

// ============================================
// ✅ NE DIRAM - RADI PERFEKTNO!
// ============================================
async function handleTransactionCompleted(data) {
  console.log('💳 transaction.completed')

  const subscriptionId = data.subscription_id

  if (subscriptionId) {
    const { data: currentSub } = await supabaseAdmin
      .from('user_subscriptions')
      .select('status, trial_ends_at')
      .eq('paddle_subscription_id', subscriptionId)
      .single()

    if (!currentSub) {
      console.warn('⚠️ Subscription not found for transaction.completed')
      return { success: false, error: 'Subscription not found' }
    }

    const now = new Date()
    const isTrialActive = currentSub.status === 'trial' && 
                          currentSub.trial_ends_at && 
                          new Date(currentSub.trial_ends_at) > now

    if (isTrialActive) {
      console.log('⏸️ Trial is still active - NOT changing status to active')
      return { success: true, message: 'Trial active - status unchanged' }
    }

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

// ============================================
// ✅ NE DIRAM - RADI PERFEKTNO!
// ============================================
async function handleTransactionPaid(data) {
  console.log('💳 transaction.paid')

  const subscriptionId = data.subscription_id

  if (subscriptionId) {
    const { data: currentSub } = await supabaseAdmin
      .from('user_subscriptions')
      .select('status, trial_ends_at')
      .eq('paddle_subscription_id', subscriptionId)
      .single()

    if (!currentSub) {
      console.warn('⚠️ Subscription not found for transaction.paid')
      return { success: false, error: 'Subscription not found' }
    }

    const now = new Date()
    const isTrialActive = currentSub.status === 'trial' && 
                          currentSub.trial_ends_at && 
                          new Date(currentSub.trial_ends_at) > now

    if (isTrialActive) {
      console.log('⏸️ Trial is still active - NOT changing status to active')
      return { success: true, message: 'Trial active - status unchanged' }
    }

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

// ============================================
// ✅ NE DIRAM - RADI PERFEKTNO!
// ============================================
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