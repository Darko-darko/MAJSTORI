// app/api/paddle/webhook/route.js - FIXED FOR NEXT.JS 15
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

/**
 * 🔒 PADDLE WEBHOOK HANDLER - FIXED VERSION
 * 
 * WEBHOOK URL: https://pro-meister.de/api/paddle/webhook
 */

// Supabase Admin Client (server-side)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// Paddle Webhook Secret (iz Paddle Dashboard)
const PADDLE_WEBHOOK_SECRET = process.env.PADDLE_WEBHOOK_SECRET

// 🔥 IMPORTANT: Disable body parsing for signature verification
export const runtime = 'nodejs'

/**
 * 🔒 Verify Paddle Webhook Signature
 */
function verifyPaddleSignature(rawBody, signature) {
  //if (!PADDLE_WEBHOOK_SECRET) {
   // console.warn('⚠️ PADDLE_WEBHOOK_SECRET not configured')
   // console.warn('⚠️ CRITICAL: Webhooks will fail in production without secret!')
    // In development, we allow it but warn heavily
  //  return process.env.NODE_ENV === 'development'
 // }

  if (!signature) {
    console.error('❌ No signature provided in webhook')
    return false
  }

  try {
    // Paddle uses HMAC-SHA256 with format: ts=timestamp;h1=hash
    const parts = signature.split(';')
    const tsPrefix = 'ts='
    const h1Prefix = 'h1='
    
    let timestamp = ''
    let hash = ''
    
    for (const part of parts) {
      if (part.startsWith(tsPrefix)) {
        timestamp = part.substring(tsPrefix.length)
      } else if (part.startsWith(h1Prefix)) {
        hash = part.substring(h1Prefix.length)
      }
    }

    if (!timestamp || !hash) {
      console.error('❌ Invalid signature format')
      return false
    }

    // Create signed payload: timestamp:rawBody
    const signedPayload = `${timestamp}:${rawBody}`
    
    // Calculate expected signature
    const hmac = crypto.createHmac('sha256', PADDLE_WEBHOOK_SECRET)
    hmac.update(signedPayload)
    const expectedHash = hmac.digest('hex')

    const isValid = hash === expectedHash
    
    if (!isValid) {
      console.error('❌ Invalid Paddle webhook signature')
      console.error('Expected:', expectedHash)
      console.error('Received:', hash)
    } else {
      console.log('✅ Webhook signature verified')
    }
    
    return isValid
  } catch (error) {
    console.error('❌ Error verifying Paddle signature:', error)
    return false
  }
}

/**
 * 🔥 POST Handler - Prima Paddle webhook events
 * OPTIMIZED FOR NETLIFY: Fast response + async processing
 */
export async function POST(request) {
  console.log('🚨 WEBHOOK HIT!')
  console.log('🚨 URL:', request.url)
  console.log('🚨 Method:', request.method)
  console.log('🚨 Headers:', Object.fromEntries(request.headers))

  console.log('📨 ===== PADDLE WEBHOOK RECEIVED =====')
  
  try {
    // 1️⃣ Get raw body for signature verification
    const rawBody = await request.text()
    console.log('📦 Raw body length:', rawBody.length)

    // 2️⃣ Parse JSON
    let body
    try {
      body = JSON.parse(rawBody)
    } catch (parseError) {
      console.error('❌ Failed to parse webhook body:', parseError)
      return NextResponse.json(
        { error: 'Invalid JSON' },
        { status: 400 }
      )
    }

    // 3️⃣ Get signature from headers
    const signature = request.headers.get('paddle-signature')
    console.log('🔐 Signature present:', !!signature)

    // 4️⃣ Verify signature
    const isValid = verifyPaddleSignature(rawBody, signature)
    
    if (!isValid) {
      console.error('❌ Signature verification failed')
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    // 5️⃣ Extract event data
    const eventType = body.event_type
    const eventData = body.data

    console.log('🎯 Event Type:', eventType)
    console.log('📋 Event ID:', body.event_id)

    // 🔥 RETURN 200 OK IMMEDIATELY (before processing)
    // This prevents Paddle timeout and "needs retry"
    const response = NextResponse.json({ 
      success: true,
      message: 'Webhook received',
      event_type: eventType,
      event_id: body.event_id
    })

    // 6️⃣ Process webhook AFTER response (non-blocking)
    // Use setImmediate or Promise to process async
    processWebhookAsync(eventType, eventData, body.event_id)

    console.log('✅ Webhook response sent (processing async)')
    return response

  } catch (error) {
    console.error('❌ Webhook processing error:', error)
    console.error('Stack:', error.stack)
    
    // Even on error, return 200 to prevent retry storm
    // We'll log the error for debugging
    return NextResponse.json(
      { 
        success: false,
        error: 'Processing error (logged)',
        message: error.message 
      },
      { status: 200 } // Return 200, not 500
    )
  }
}

/**
 * 🔥 Process webhook asynchronously (non-blocking)
 */
async function processWebhookAsync(eventType, eventData, eventId) {
  try {
    console.log(`🔄 [${eventId}] Processing webhook async:`, eventType)

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
        console.log('ℹ️ Unhandled event type:', eventType)
        result = { handled: false, message: 'Event type not handled' }
    }

    console.log(`✅ [${eventId}] Webhook processed successfully:`, result)
    console.log('📨 ===== END WEBHOOK =====\n')

  } catch (error) {
    console.error(`❌ [${eventId}] Async processing error:`, error)
    console.error('Stack:', error.stack)
  }
}

/**
 * ✅ subscription.created - Nova subscription kreirana
 */
async function handleSubscriptionCreated(data) {
  console.log('✅ Handling subscription.created')

  try {
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
      console.error('❌ No majstor_id in custom_data')
      return { error: 'Missing majstor_id' }
    }

    // Extract billing info
    const currentPeriodStart = data.current_billing_period?.starts_at
    const currentPeriodEnd = data.current_billing_period?.ends_at
    const trialStart = data.started_at
    const trialEnd = status === 'trialing' ? currentPeriodEnd : null

    // Get plan ID from price_id
    const priceId = data.items?.[0]?.price?.id
    const planId = await getPlanIdFromPriceId(priceId)

    console.log('💰 Price ID:', priceId)
    console.log('📦 Plan ID:', planId)

    // 🔥 CRITICAL: Use timeout protection for database queries
    const dbOperations = Promise.race([
      // Main operation
      (async () => {
        // Check if subscription already exists (created by frontend)
        const { data: existingSub } = await supabaseAdmin
          .from('user_subscriptions')
          .select('id')
          .eq('majstor_id', majstorId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (existingSub) {
          // Update existing subscription with Paddle data
          console.log('🔄 Updating existing subscription:', existingSub.id)
          
          const { data: updated, error: updateError } = await supabaseAdmin
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
            .select()
            .single()

          if (updateError) throw updateError

          console.log('✅ Subscription updated:', updated.id)
          return { action: 'updated', subscription_id: updated.id }
        } else {
          // Create new subscription
          console.log('➕ Creating new subscription')

          const { data: subscription, error } = await supabaseAdmin
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
              trial_ends_at: trialEnd,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single()

          if (error) throw error

          console.log('✅ Subscription created in Supabase:', subscription.id)
          return { action: 'created', subscription_id: subscription.id }
        }
      })(),
      
      // Timeout after 8 seconds (Netlify has 10s limit)
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database operation timeout')), 8000)
      )
    ])

    const result = await dbOperations

    // Update majstor record (non-critical, can fail)
    try {
      await supabaseAdmin
        .from('majstors')
        .update({
          subscription_status: status === 'trialing' ? 'trial' : 'active',
          subscription_ends_at: currentPeriodEnd,
          updated_at: new Date().toISOString()
        })
        .eq('id', majstorId)

      console.log('✅ Majstor record updated')
    } catch (majstorError) {
      console.error('⚠️ Failed to update majstor (non-critical):', majstorError)
    }

    return result

  } catch (error) {
    console.error('❌ Error in handleSubscriptionCreated:', error)
    throw error
  }
}

/**
 * 🔄 subscription.updated - Subscription promenjena
 */
async function handleSubscriptionUpdated(data) {
  console.log('🔄 Handling subscription.updated')

  try {
    const subscriptionId = data.id
    const status = data.status
    const currentPeriodStart = data.current_billing_period?.starts_at
    const currentPeriodEnd = data.current_billing_period?.ends_at

    const { error } = await supabaseAdmin
      .from('user_subscriptions')
      .update({
        status: status === 'trialing' ? 'trial' : status,
        current_period_start: currentPeriodStart,
        current_period_end: currentPeriodEnd,
        updated_at: new Date().toISOString()
      })
      .eq('paddle_subscription_id', subscriptionId)

    if (error) throw error

    console.log('✅ Subscription updated in Supabase')

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
          subscription_status: status === 'trialing' ? 'trial' : status,
          subscription_ends_at: currentPeriodEnd,
          updated_at: new Date().toISOString()
        })
        .eq('id', subscription.majstor_id)
    }

    return { action: 'updated' }
  } catch (error) {
    console.error('❌ Error in handleSubscriptionUpdated:', error)
    throw error
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

    if (error) throw error

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

    return { action: 'cancelled' }
  } catch (error) {
    console.error('❌ Error in handleSubscriptionCancelled:', error)
    throw error
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

  return { action: 'paused' }
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

  return { action: 'resumed' }
}

/**
 * 💳 transaction.completed
 */
async function handleTransactionCompleted(data) {
  console.log('💳 Handling transaction.completed')

  const transactionId = data.id
  const amount = data.details?.totals?.total
  const currency = data.currency_code

  console.log(`✅ Payment successful: ${amount} ${currency}`)
  
  return { action: 'transaction_completed', transaction_id: transactionId }
}

/**
 * ⚠️ transaction.payment_failed
 */
async function handlePaymentFailed(data) {
  console.log('⚠️ Handling transaction.payment_failed')

  const customerId = data.customer_id
  console.error(`❌ Payment failed for customer: ${customerId}`)

  return { action: 'payment_failed', customer_id: customerId }
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
    return null
  }

  const { data: plan } = await supabaseAdmin
    .from('subscription_plans')
    .select('id')
    .eq('name', planName)
    .single()

  return plan?.id
}