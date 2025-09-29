// app/api/paddle/webhook/route.js - COMPLETE FIX
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

/**
 * 🔒 PADDLE WEBHOOK HANDLER - PRODUCTION READY
 * 
 * WEBHOOK URL: https://pro-meister.de/api/paddle/webhook
 */

// Supabase Admin Client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const PADDLE_WEBHOOK_SECRET = process.env.PADDLE_WEBHOOK_SECRET

// 🔥 CRITICAL: Configure route for raw body access
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * 🔒 Verify Paddle Signature - CORRECT IMPLEMENTATION
 */
function verifyPaddleSignature(rawBody, signatureHeader) {
  // Skip in development if secret not set
  if (!PADDLE_WEBHOOK_SECRET) {
    console.warn('⚠️ PADDLE_WEBHOOK_SECRET not configured')
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ Allowing webhook in development mode')
      return true
    }
    return false
  }

  if (!signatureHeader) {
    console.error('❌ No signature header provided')
    return false
  }

  try {
    console.log('🔐 Starting signature verification...')
    
    // Parse Paddle signature: "ts=1759187034;h1=abc123..."
    const parts = signatureHeader.split(';').reduce((acc, part) => {
      const [key, value] = part.split('=')
      if (key && value) acc[key] = value
      return acc
    }, {})

    const timestamp = parts.ts
    const receivedHash = parts.h1

    if (!timestamp || !receivedHash) {
      console.error('❌ Invalid signature format')
      console.error('Signature header:', signatureHeader)
      return false
    }

    console.log('📋 Timestamp:', timestamp)
    console.log('📋 Received hash:', receivedHash)
    console.log('📋 Body length:', rawBody.length)
    console.log('📋 Secret length:', PADDLE_WEBHOOK_SECRET.length)

    // Paddle signs: timestamp + ":" + raw_body
    const signedPayload = `${timestamp}:${rawBody}`
    
    // Calculate HMAC
    const hmac = crypto.createHmac('sha256', PADDLE_WEBHOOK_SECRET)
    hmac.update(signedPayload, 'utf8')
    const expectedHash = hmac.digest('hex')

    console.log('📋 Expected hash:', expectedHash)
    console.log('📋 Hashes match:', expectedHash === receivedHash)

    if (expectedHash !== receivedHash) {
      console.error('❌ Signature verification failed')
      console.error('Expected:', expectedHash)
      console.error('Received:', receivedHash)
      
      // Try alternative format (without colon) as fallback
      const altPayload = `${timestamp}${rawBody}`
      const altHmac = crypto.createHmac('sha256', PADDLE_WEBHOOK_SECRET)
      altHmac.update(altPayload, 'utf8')
      const altHash = altHmac.digest('hex')
      
      console.log('🔄 Trying alternative format (no colon):', altHash === receivedHash)
      
      if (altHash === receivedHash) {
        console.log('✅ Alternative format matched!')
        return true
      }
      
      return false
    }

    console.log('✅ Signature verified successfully')
    return true

  } catch (error) {
    console.error('❌ Error during signature verification:', error)
    return false
  }
}

/**
 * 🔥 POST Handler - Optimized for Netlify
 */
export async function POST(request) {
  const startTime = Date.now()
  console.log('\n🔔 ========== NEW WEBHOOK REQUEST ==========')
  console.log('⏰ Time:', new Date().toISOString())
  
  try {
    // 1️⃣ Read raw body correctly for Next.js 15
    const rawBody = await request.text()
    
    console.log('📦 Body received, length:', rawBody.length)
    console.log('📦 Body preview:', rawBody.substring(0, 200) + '...')

    // 2️⃣ Parse JSON
    let body
    try {
      body = JSON.parse(rawBody)
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError)
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const eventType = body.event_type
    const eventId = body.event_id
    
    console.log('🎯 Event Type:', eventType)
    console.log('🎯 Event ID:', eventId)
    console.log('📋 Custom Data:', JSON.stringify(body.data?.custom_data))

    // 3️⃣ Verify signature
    const signature = request.headers.get('paddle-signature')
    console.log('🔐 Signature header:', signature ? 'Present' : 'Missing')
    
    const isValid = verifyPaddleSignature(rawBody, signature)
    
    if (!isValid) {
      console.error('❌ SIGNATURE VERIFICATION FAILED')
      console.error('⚠️ This webhook will be rejected!')
      
      // Return 401 but log everything for debugging
      return NextResponse.json(
        { 
          error: 'Invalid signature',
          event_id: eventId,
          event_type: eventType
        },
        { status: 401 }
      )
    }

    // 4️⃣ Return 200 OK immediately
    console.log('✅ Signature verified, returning 200 OK')
    console.log('⏱️ Response time:', Date.now() - startTime, 'ms')
    
    // Start async processing (non-blocking)
    setImmediate(() => {
      processWebhookAsync(eventType, body.data, eventId).catch(err => {
        console.error('❌ Async processing failed:', err)
      })
    })

    return NextResponse.json({ 
      success: true,
      event_id: eventId,
      event_type: eventType,
      message: 'Webhook received and processing'
    })

  } catch (error) {
    console.error('❌ Fatal webhook error:', error)
    console.error('Stack:', error.stack)
    
    // Return 200 even on error to prevent retry storm
    return NextResponse.json(
      { 
        success: false,
        error: error.message,
        message: 'Error logged, no retry needed'
      },
      { status: 200 }
    )
  }
}

/**
 * 🔄 Process webhook asynchronously
 */
async function processWebhookAsync(eventType, eventData, eventId) {
  console.log(`\n🔄 [${eventId}] Starting async processing...`)
  
  try {
    let result

    switch (eventType) {
      case 'subscription.created':
        result = await handleSubscriptionCreated(eventData)
        break

      case 'subscription.updated':
        result = await handleSubscriptionUpdated(eventData)
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
        console.log(`ℹ️ [${eventId}] Unhandled event type:`, eventType)
        return
    }

    console.log(`✅ [${eventId}] Processing completed:`, result)
    console.log('========== END WEBHOOK ==========\n')

  } catch (error) {
    console.error(`❌ [${eventId}] Async processing error:`, error)
    console.error('Stack:', error.stack)
  }
}

/**
 * ✅ subscription.created
 */
async function handleSubscriptionCreated(data) {
  console.log('✅ Processing subscription.created')

  const subscriptionId = data.id
  const customerId = data.customer_id
  const status = data.status
  const customData = data.custom_data || {}
  const majstorId = customData.majstor_id

  console.log('📋 Subscription ID:', subscriptionId)
  console.log('👤 Customer ID:', customerId)
  console.log('👤 Majstor ID:', majstorId)
  console.log('📊 Status:', status)

  if (!majstorId) {
    console.error('❌ CRITICAL: No majstor_id in custom_data')
    console.error('Custom data received:', customData)
    throw new Error('Missing majstor_id in webhook')
  }

  // Extract dates
  const currentPeriodStart = data.current_billing_period?.starts_at
  const currentPeriodEnd = data.current_billing_period?.ends_at
  const trialStart = data.started_at
  const trialEnd = status === 'trialing' ? currentPeriodEnd : null

  // Get plan ID
  const priceId = data.items?.[0]?.price?.id
  const planId = await getPlanIdFromPriceId(priceId)

  console.log('💰 Price ID:', priceId)
  console.log('📦 Plan ID:', planId)

  // Check for existing subscription
  const { data: existingSub } = await supabaseAdmin
    .from('user_subscriptions')
    .select('id, status')
    .eq('majstor_id', majstorId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existingSub) {
    // Update existing
    console.log('🔄 Updating existing subscription:', existingSub.id)
    
    const { error } = await supabaseAdmin
      .from('user_subscriptions')
      .update({
        paddle_subscription_id: subscriptionId,
        paddle_customer_id: customerId,
        status: status === 'trialing' ? 'trial' : 'active',
        current_period_start: currentPeriodStart,
        current_period_end: currentPeriodEnd,
        trial_starts_at: trialStart,
        trial_ends_at: trialEnd,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingSub.id)

    if (error) {
      console.error('❌ Supabase update error:', error)
      throw error
    }

    console.log('✅ Subscription updated successfully')
  } else {
    // Create new
    console.log('➕ Creating new subscription')

    const { error } = await supabaseAdmin
      .from('user_subscriptions')
      .insert({
        majstor_id: majstorId,
        plan_id: planId,
        status: status === 'trialing' ? 'trial' : 'active',
        paddle_subscription_id: subscriptionId,
        paddle_customer_id: customerId,
        current_period_start: currentPeriodStart,
        current_period_end: currentPeriodEnd,
        trial_starts_at: trialStart,
        trial_ends_at: trialEnd
      })

    if (error) {
      console.error('❌ Supabase insert error:', error)
      throw error
    }

    console.log('✅ Subscription created successfully')
  }

  // Update majstor
  await supabaseAdmin
    .from('majstors')
    .update({
      subscription_status: status === 'trialing' ? 'trial' : 'active',
      subscription_ends_at: currentPeriodEnd,
      updated_at: new Date().toISOString()
    })
    .eq('id', majstorId)

  console.log('✅ Majstor record updated')

  return { 
    success: true, 
    action: existingSub ? 'updated' : 'created',
    majstor_id: majstorId 
  }
}

/**
 * 🔄 subscription.updated
 */
async function handleSubscriptionUpdated(data) {
  console.log('🔄 Processing subscription.updated')

  const subscriptionId = data.id
  const status = data.status
  const currentPeriodEnd = data.current_billing_period?.ends_at

  await supabaseAdmin
    .from('user_subscriptions')
    .update({
      status: status === 'trialing' ? 'trial' : status,
      current_period_end: currentPeriodEnd,
      updated_at: new Date().toISOString()
    })
    .eq('paddle_subscription_id', subscriptionId)

  return { success: true, action: 'updated' }
}

/**
 * ❌ subscription.cancelled
 */
async function handleSubscriptionCancelled(data) {
  console.log('❌ Processing subscription.cancelled')

  await supabaseAdmin
    .from('user_subscriptions')
    .update({
      status: 'cancelled',
      cancelled_at: data.cancelled_at,
      updated_at: new Date().toISOString()
    })
    .eq('paddle_subscription_id', data.id)

  return { success: true, action: 'cancelled' }
}

/**
 * ⏸️ subscription.paused
 */
async function handleSubscriptionPaused(data) {
  await supabaseAdmin
    .from('user_subscriptions')
    .update({ status: 'paused', updated_at: new Date().toISOString() })
    .eq('paddle_subscription_id', data.id)

  return { success: true, action: 'paused' }
}

/**
 * ▶️ subscription.resumed
 */
async function handleSubscriptionResumed(data) {
  await supabaseAdmin
    .from('user_subscriptions')
    .update({ status: 'active', updated_at: new Date().toISOString() })
    .eq('paddle_subscription_id', data.id)

  return { success: true, action: 'resumed' }
}

/**
 * 💳 transaction.completed
 */
async function handleTransactionCompleted(data) {
  console.log('💳 Payment successful:', data.details?.totals?.total, data.currency_code)
  return { success: true, action: 'transaction_completed' }
}

/**
 * ⚠️ transaction.payment_failed
 */
async function handlePaymentFailed(data) {
  console.error('⚠️ Payment failed for customer:', data.customer_id)
  return { success: true, action: 'payment_failed' }
}

/**
 * 🔍 Get Plan ID from Price ID
 */
async function getPlanIdFromPriceId(priceId) {
  const mapping = {
    [process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_MONTHLY]: 'pro',
    [process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_YEARLY]: 'pro_yearly'
  }

  const planName = mapping[priceId]
  if (!planName) {
    console.warn('⚠️ Unknown price ID:', priceId)
    return null
  }

  const { data } = await supabaseAdmin
    .from('subscription_plans')
    .select('id')
    .eq('name', planName)
    .single()

  return data?.id
}