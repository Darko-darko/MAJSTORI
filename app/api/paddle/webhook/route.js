// app/api/paddle/webhook/route.js - NETLIFY FIXED VERSION
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

/**
 * 🔥 PADDLE WEBHOOK HANDLER - NETLIFY COMPATIBLE
 * 
 * FIXES:
 * 1. Netlify-compatible body reading
 * 2. Proper trial → pro transition
 * 3. Better status mapping
 * 4. Cache invalidation signal
 * 5. Detailed logging for debugging
 */

// Supabase Admin Client (server-side)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// Paddle Webhook Secret
const PADDLE_WEBHOOK_SECRET = process.env.PADDLE_WEBHOOK_SECRET

/**
 * 🔐 Verify Paddle Webhook Signature - NETLIFY COMPATIBLE
 */
function verifyPaddleSignature(rawBody, signatureHeader) {
  if (!PADDLE_WEBHOOK_SECRET) {
    console.warn('⚠️ PADDLE_WEBHOOK_SECRET not configured - skipping verification in development')
    return process.env.NODE_ENV === 'development' // Only allow in dev if no secret
  }

  try {
    // Parse signature header: "ts=1234567890;h1=abc123..."
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
      console.error('❌ Invalid signature format - missing ts or h1')
      return false
    }

    // 🔥 CRITICAL: Paddle uses "timestamp:body" format
    const payload = `${timestamp}:${rawBody}`
    
    // Create HMAC-SHA256 hash
    const computedHash = crypto
      .createHmac('sha256', PADDLE_WEBHOOK_SECRET)
      .update(payload, 'utf8')
      .digest('hex')

    const isValid = computedHash === receivedSignature

    if (!isValid) {
      console.error('❌ Signature verification FAILED')
      console.error('📊 Debug Info:', {
        timestamp,
        bodyLength: rawBody.length,
        bodyPreview: rawBody.substring(0, 100),
        expectedSignature: receivedSignature,
        computedSignature: computedHash
      })
    } else {
      console.log('✅ Signature verified successfully')
    }

    return isValid

  } catch (error) {
    console.error('❌ Error verifying signature:', error)
    return false
  }
}

/**
 * 🔥 POST Handler - NETLIFY COMPATIBLE VERSION
 */
export async function POST(request) {
  const startTime = Date.now()
  
  try {
    console.log('\n🔔 ========== PADDLE WEBHOOK RECEIVED ==========')
    console.log('⏰ Timestamp:', new Date().toISOString())

    // 1️⃣ 🔥 NETLIFY FIX: Read body with error handling
    let rawBody
    try {
      rawBody = await request.text()
      console.log('📦 Raw body received, length:', rawBody.length)
    } catch (bodyError) {
      console.error('❌ Failed to read request body:', bodyError)
      return NextResponse.json(
        { error: 'Failed to read request body' },
        { status: 400 }
      )
    }

    // 2️⃣ Extract signature header
    const signatureHeader = request.headers.get('paddle-signature')
    
    if (!signatureHeader) {
      console.error('❌ Missing paddle-signature header')
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 401 }
      )
    }

    console.log('🔐 Signature header present')

    // 3️⃣ 🔥 VERIFY SIGNATURE BEFORE PARSING
    if (!verifyPaddleSignature(rawBody, signatureHeader)) {
      console.error('❌ WEBHOOK REJECTED: Invalid signature')
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    console.log('✅ Signature verification PASSED')

    // 4️⃣ Parse JSON safely
    let body
    try {
      body = JSON.parse(rawBody)
    } catch (parseError) {
      console.error('❌ Failed to parse JSON:', parseError)
      return NextResponse.json(
        { error: 'Invalid JSON' },
        { status: 400 }
      )
    }

    const eventType = body.event_type
    const eventData = body.data

    console.log('🎯 Event Type:', eventType)
    console.log('🔑 Event ID:', body.event_id || 'N/A')
    console.log('📋 Data preview:', JSON.stringify(eventData).substring(0, 200))

    // 5️⃣ Handle different event types
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

      case 'subscription.paused':
        result = await handleSubscriptionPaused(eventData)
        break

      case 'subscription.resumed':
        result = await handleSubscriptionResumed(eventData)
        break

      case 'transaction.completed':
        result = await handleTransactionCompleted(eventData)
        break

      case 'transaction.payment_failed':
        result = await handlePaymentFailed(eventData)
        break

      default:
        console.log('ℹ️ Unhandled event type:', eventType)
        result = { handled: false }
    }

    // 6️⃣ Return success
    const duration = Date.now() - startTime
    console.log(`✅ Webhook processed successfully in ${duration}ms`)
    console.log('========== WEBHOOK COMPLETE ==========\n')

    return NextResponse.json({ 
      success: true,
      message: 'Webhook processed successfully',
      eventType: eventType,
      result: result,
      processingTime: `${duration}ms`
    })

  } catch (error) {
    const duration = Date.now() - startTime
    console.error('💥 ========== WEBHOOK ERROR ==========')
    console.error('Error:', error.message)
    console.error('Stack:', error.stack)
    console.error(`Failed after ${duration}ms`)
    console.error('========================================\n')
    
    return NextResponse.json(
      { 
        error: 'Webhook processing failed',
        details: error.message 
      },
      { status: 500 }
    )
  }
}

/**
 * ✅ subscription.created - Nova subscription kreirana
 * CALLED: When user first subscribes (either trial or paid)
 */
async function handleSubscriptionCreated(data) {
  console.log('✅ Handling subscription.created')

  try {
    const subscriptionId = data.id
    const customerId = data.customer_id
    const status = data.status // 'trialing' or 'active'
    const customData = data.custom_data || {}
    const majstorId = customData.majstor_id

    console.log('📋 Subscription details:', {
      subscriptionId,
      customerId,
      status,
      majstorId
    })

    if (!majstorId) {
      console.error('❌ No majstor_id in custom_data')
      return { error: 'Missing majstor_id' }
    }

    const currentPeriodStart = data.current_billing_period?.starts_at
    const currentPeriodEnd = data.current_billing_period?.ends_at

    // 🔥 FIX: Determine if this is trial or paid
    let finalStatus
    let trialStart = null
    let trialEnd = null

    if (status === 'trialing') {
      finalStatus = 'trial'
      trialStart = data.started_at || currentPeriodStart
      trialEnd = currentPeriodEnd
      console.log('🎯 This is a TRIAL subscription')
    } else if (status === 'active') {
      finalStatus = 'active'
      console.log('💳 This is an ACTIVE (paid) subscription')
    } else {
      finalStatus = status
      console.log(`⚠️ Unknown status: ${status}`)
    }

    const priceId = data.items?.[0]?.price?.id
    const planId = await getPlanIdFromPriceId(priceId)

    console.log('📦 Plan mapping:', { priceId, planId })

    // Check if subscription already exists (idempotency)
    const { data: existingSub } = await supabaseAdmin
      .from('user_subscriptions')
      .select('id')
      .eq('paddle_subscription_id', subscriptionId)
      .maybeSingle()

    if (existingSub) {
      console.log('ℹ️ Subscription already exists, updating instead')
      return await handleSubscriptionUpdated(data)
    }

    // Create new subscription
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
      console.error('❌ Error creating subscription:', insertError)
      return { error: insertError.message }
    }

    console.log('✅ Subscription created in Supabase:', subscription.id)

    // Update majstor record
    const { error: majstorError } = await supabaseAdmin
      .from('majstors')
      .update({
        subscription_status: finalStatus,
        subscription_ends_at: currentPeriodEnd,
        updated_at: new Date().toISOString()
      })
      .eq('id', majstorId)

    if (majstorError) {
      console.error('❌ Error updating majstor:', majstorError)
    } else {
      console.log('✅ Majstor record updated')
    }

    return { success: true, subscriptionId: subscription.id, status: finalStatus }

  } catch (error) {
    console.error('❌ Error in handleSubscriptionCreated:', error)
    return { error: error.message }
  }
}

/**
 * 🔄 subscription.updated
 * CALLED: When subscription changes (including trial → active transition)
 */
async function handleSubscriptionUpdated(data) {
  console.log('🔄 Handling subscription.updated')

  try {
    const subscriptionId = data.id
    const status = data.status // Can be 'trialing', 'active', 'past_due', etc.
    const currentPeriodStart = data.current_billing_period?.starts_at
    const currentPeriodEnd = data.current_billing_period?.ends_at

    console.log('📋 Update details:', {
      subscriptionId,
      status,
      currentPeriodStart,
      currentPeriodEnd
    })

    // 🔥 FIX: Map Paddle status to our status
    let finalStatus
    if (status === 'trialing') {
      finalStatus = 'trial'
    } else if (status === 'active') {
      finalStatus = 'active'
    } else if (status === 'past_due') {
      finalStatus = 'past_due'
    } else if (status === 'paused') {
      finalStatus = 'paused'
    } else {
      finalStatus = status
    }

    console.log(`🔄 Status mapping: ${status} → ${finalStatus}`)

    // Update subscription
    const { error: updateError } = await supabaseAdmin
      .from('user_subscriptions')
      .update({
        status: finalStatus,
        current_period_start: currentPeriodStart,
        current_period_end: currentPeriodEnd,
        updated_at: new Date().toISOString()
      })
      .eq('paddle_subscription_id', subscriptionId)

    if (updateError) {
      console.error('❌ Error updating subscription:', updateError)
      return { error: updateError.message }
    }

    console.log('✅ Subscription updated in Supabase')

    // Get majstor_id and update majstor record
    const { data: subscription } = await supabaseAdmin
      .from('user_subscriptions')
      .select('majstor_id')
      .eq('paddle_subscription_id', subscriptionId)
      .single()

    if (subscription?.majstor_id) {
      const { error: majstorError } = await supabaseAdmin
        .from('majstors')
        .update({
          subscription_status: finalStatus,
          subscription_ends_at: currentPeriodEnd,
          updated_at: new Date().toISOString()
        })
        .eq('id', subscription.majstor_id)

      if (majstorError) {
        console.error('❌ Error updating majstor:', majstorError)
      } else {
        console.log('✅ Majstor record updated')
      }
    }

    return { success: true, status: finalStatus }

  } catch (error) {
    console.error('❌ Error in handleSubscriptionUpdated:', error)
    return { error: error.message }
  }
}

/**
 * ⚡ subscription.activated
 * CALLED: When trial converts to paid or subscription reactivates
 */
async function handleSubscriptionActivated(data) {
  console.log('⚡ Handling subscription.activated (TRIAL → PRO)')

  try {
    const subscriptionId = data.id

    console.log('🎯 Activating subscription:', subscriptionId)

    // Update to active status
    const { error: updateError } = await supabaseAdmin
      .from('user_subscriptions')
      .update({
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('paddle_subscription_id', subscriptionId)

    if (updateError) {
      console.error('❌ Error activating subscription:', updateError)
      return { error: updateError.message }
    }

    console.log('✅ Subscription activated in Supabase')

    // Update majstor record
    const { data: subscription } = await supabaseAdmin
      .from('user_subscriptions')
      .select('majstor_id')
      .eq('paddle_subscription_id', subscriptionId)
      .single()

    if (subscription?.majstor_id) {
      const { error: majstorError } = await supabaseAdmin
        .from('majstors')
        .update({
          subscription_status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', subscription.majstor_id)

      if (majstorError) {
        console.error('❌ Error updating majstor:', majstorError)
      } else {
        console.log('✅ Majstor record updated to ACTIVE')
      }
    }

    return { success: true, status: 'active' }

  } catch (error) {
    console.error('❌ Error in handleSubscriptionActivated:', error)
    return { error: error.message }
  }
}

/**
 * ❌ subscription.cancelled
 */
async function handleSubscriptionCancelled(data) {
  console.log('❌ Handling subscription.cancelled')

  try {
    const subscriptionId = data.id
    const cancelledAt = data.cancelled_at

    const { error } = await supabaseAdmin
      .from('user_subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: cancelledAt,
        updated_at: new Date().toISOString()
      })
      .eq('paddle_subscription_id', subscriptionId)

    if (error) {
      console.error('❌ Error cancelling subscription:', error)
      return { error: error.message }
    }

    console.log('✅ Subscription cancelled in Supabase')

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

    return { success: true, status: 'cancelled' }

  } catch (error) {
    console.error('❌ Error in handleSubscriptionCancelled:', error)
    return { error: error.message }
  }
}

/**
 * ⏸️ subscription.paused
 */
async function handleSubscriptionPaused(data) {
  console.log('⏸️ Handling subscription.paused')
  
  const subscriptionId = data.id
  
  await supabaseAdmin
    .from('user_subscriptions')
    .update({
      status: 'paused',
      updated_at: new Date().toISOString()
    })
    .eq('paddle_subscription_id', subscriptionId)

  return { success: true, status: 'paused' }
}

/**
 * ▶️ subscription.resumed
 */
async function handleSubscriptionResumed(data) {
  console.log('▶️ Handling subscription.resumed')
  
  const subscriptionId = data.id
  
  await supabaseAdmin
    .from('user_subscriptions')
    .update({
      status: 'active',
      updated_at: new Date().toISOString()
    })
    .eq('paddle_subscription_id', subscriptionId)

  return { success: true, status: 'active' }
}

/**
 * 💳 transaction.completed
 */
async function handleTransactionCompleted(data) {
  console.log('💳 Handling transaction.completed')

  const transactionId = data.id
  const subscriptionId = data.subscription_id
  const amount = data.details?.totals?.total
  const currency = data.currency_code

  console.log(`✅ Payment successful: ${amount} ${currency}`)
  console.log(`📋 Transaction ID: ${transactionId}`)
  console.log(`🔗 Subscription ID: ${subscriptionId}`)

  // If this is a subscription payment, ensure subscription is active
  if (subscriptionId) {
    const { data: subscription } = await supabaseAdmin
      .from('user_subscriptions')
      .select('status')
      .eq('paddle_subscription_id', subscriptionId)
      .single()

    if (subscription && subscription.status !== 'active') {
      console.log('🔄 Payment completed but subscription not active, updating...')
      await supabaseAdmin
        .from('user_subscriptions')
        .update({
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('paddle_subscription_id', subscriptionId)
    }
  }

  return { success: true, transactionId }
}

/**
 * ⚠️ transaction.payment_failed
 */
async function handlePaymentFailed(data) {
  console.log('⚠️ Handling transaction.payment_failed')

  const customerId = data.customer_id
  const subscriptionId = data.subscription_id

  console.error(`❌ Payment failed for customer: ${customerId}`)
  console.error(`🔗 Subscription ID: ${subscriptionId}`)

  // Optionally update subscription status to 'past_due'
  if (subscriptionId) {
    await supabaseAdmin
      .from('user_subscriptions')
      .update({
        status: 'past_due',
        updated_at: new Date().toISOString()
      })
      .eq('paddle_subscription_id', subscriptionId)
  }

  return { success: true, status: 'payment_failed' }
}

/**
 * 🔍 Helper: Get Plan ID from Paddle Price ID
 */
async function getPlanIdFromPriceId(priceId) {
  const priceIdMap = {
    [process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_MONTHLY]: 'pro',
    [process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_YEARLY]: 'pro_yearly'
  }

  const planName = priceIdMap[priceId]
  
  if (!planName) {
    console.warn('⚠️ Unknown price ID:', priceId)
    // Default to 'pro' if unknown
    const { data: plan } = await supabaseAdmin
      .from('subscription_plans')
      .select('id')
      .eq('name', 'pro')
      .single()
    
    return plan?.id
  }

  const { data: plan } = await supabaseAdmin
    .from('subscription_plans')
    .select('id')
    .eq('name', planName)
    .single()

  return plan?.id
}