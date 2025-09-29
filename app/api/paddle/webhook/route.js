// app/api/paddle/webhook/route.js - Paddle Webhook Handler
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

/**
 * 🔐 PADDLE WEBHOOK HANDLER
 * Primanje i procesiranje Paddle subscription events
 * 
 * WEBHOOK URL: https://pro-meister.de/api/paddle/webhook
 * 
 * Paddle će slati events ovde:
 * - subscription.created
 * - subscription.updated
 * - subscription.cancelled
 * - subscription.paused
 * - subscription.resumed
 * - transaction.completed
 * - transaction.payment_failed
 */

// Supabase Admin Client (server-side)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// Paddle Webhook Secret (iz Paddle Dashboard)
const PADDLE_WEBHOOK_SECRET = process.env.PADDLE_WEBHOOK_SECRET

/**
 * 🔐 Verify Paddle Webhook Signature
 * Paddle šalje signature u header-u za verifikaciju autentičnosti
 */
function verifyPaddleSignature(rawBody, signature) {
  if (!PADDLE_WEBHOOK_SECRET) {
    console.warn('⚠️ PADDLE_WEBHOOK_SECRET not configured - skipping signature verification')
    return true // U development mode možda nećeš imati secret
  }

  try {
    // Paddle koristi HMAC-SHA256
    const hmac = crypto.createHmac('sha256', PADDLE_WEBHOOK_SECRET)
    hmac.update(rawBody)
    const expectedSignature = hmac.digest('hex')

    const isValid = signature === expectedSignature
    
    if (!isValid) {
      console.error('❌ Invalid Paddle webhook signature')
    }
    
    return isValid
  } catch (error) {
    console.error('❌ Error verifying Paddle signature:', error)
    return false
  }
}

/**
 * 📥 POST Handler - Prima Paddle webhook events
 */
export async function POST(request) {
  try {
    console.log('📨 Received Paddle webhook')

    // 1️⃣ Parse raw body
    const rawBody = await request.text()
    const body = JSON.parse(rawBody)

    // 2️⃣ Get signature from headers
    const signature = request.headers.get('paddle-signature')

    // 3️⃣ Verify signature (security)
    if (!verifyPaddleSignature(rawBody, signature)) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    // 4️⃣ Extract event data
    const eventType = body.event_type
    const eventData = body.data

    console.log('🎯 Paddle Event Type:', eventType)
    console.log('📦 Event Data:', JSON.stringify(eventData, null, 2))

    // 5️⃣ Handle different event types
    switch (eventType) {
      case 'subscription.created':
        await handleSubscriptionCreated(eventData)
        break

      case 'subscription.updated':
        await handleSubscriptionUpdated(eventData)
        break

      case 'subscription.cancelled':
        await handleSubscriptionCancelled(eventData)
        break

      case 'subscription.paused':
        await handleSubscriptionPaused(eventData)
        break

      case 'subscription.resumed':
        await handleSubscriptionResumed(eventData)
        break

      case 'transaction.completed':
        await handleTransactionCompleted(eventData)
        break

      case 'transaction.payment_failed':
        await handlePaymentFailed(eventData)
        break

      default:
        console.log('ℹ️ Unhandled event type:', eventType)
    }

    // 6️⃣ Return success response
    return NextResponse.json({ 
      success: true,
      message: 'Webhook processed successfully'
    })

  } catch (error) {
    console.error('❌ Webhook processing error:', error)
    
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
 */
async function handleSubscriptionCreated(data) {
  console.log('✅ Handling subscription.created')

  try {
    // Extract subscription data
    const subscriptionId = data.id
    const customerId = data.customer_id
    const status = data.status // 'active', 'trialing', etc.
    const customData = data.custom_data || {}
    const majstorId = customData.majstor_id

    if (!majstorId) {
      console.error('❌ No majstor_id in custom_data')
      return
    }

    // Extract billing info
    const currentPeriodStart = data.current_billing_period?.starts_at
    const currentPeriodEnd = data.current_billing_period?.ends_at
    const trialStart = data.started_at
    const trialEnd = status === 'trialing' ? currentPeriodEnd : null

    // Get plan ID from price_id
    const priceId = data.items?.[0]?.price?.id
    const planId = await getPlanIdFromPriceId(priceId)

    // Create subscription in Supabase
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

    if (error) {
      console.error('❌ Error creating subscription in Supabase:', error)
      return
    }

    console.log('✅ Subscription created in Supabase:', subscription.id)

    // Update majstor record
    await supabaseAdmin
      .from('majstors')
      .update({
        subscription_status: status === 'trialing' ? 'trial' : 'active',
        subscription_ends_at: currentPeriodEnd,
        updated_at: new Date().toISOString()
      })
      .eq('id', majstorId)

    console.log('✅ Majstor record updated')

  } catch (error) {
    console.error('❌ Error in handleSubscriptionCreated:', error)
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

    // Update subscription in Supabase
    const { error } = await supabaseAdmin
      .from('user_subscriptions')
      .update({
        status: status === 'trialing' ? 'trial' : status,
        current_period_start: currentPeriodStart,
        current_period_end: currentPeriodEnd,
        updated_at: new Date().toISOString()
      })
      .eq('paddle_subscription_id', subscriptionId)

    if (error) {
      console.error('❌ Error updating subscription:', error)
      return
    }

    console.log('✅ Subscription updated in Supabase')

    // Get majstor_id and update majstor record
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

  } catch (error) {
    console.error('❌ Error in handleSubscriptionUpdated:', error)
  }
}

/**
 * ❌ subscription.cancelled - Subscription otkazana
 */
async function handleSubscriptionCancelled(data) {
  console.log('❌ Handling subscription.cancelled')

  try {
    const subscriptionId = data.id
    const cancelledAt = data.cancelled_at

    // Update subscription status
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
      return
    }

    console.log('✅ Subscription cancelled in Supabase')

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
          subscription_status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', subscription.majstor_id)
    }

  } catch (error) {
    console.error('❌ Error in handleSubscriptionCancelled:', error)
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
}

/**
 * 💳 transaction.completed - Uspešna transakcija/payment
 */
async function handleTransactionCompleted(data) {
  console.log('💳 Handling transaction.completed')

  // Ovde možeš logovati payment history ili slati email receipts
  const transactionId = data.id
  const amount = data.details?.totals?.total
  const currency = data.currency_code

  console.log(`✅ Payment successful: ${amount} ${currency}`)
  
  // Opciono: Sačuvaj transaction u posebnoj tabeli
  // await supabaseAdmin.from('transactions').insert({ ... })
}

/**
 * ⚠️ transaction.payment_failed - Neuspešan payment
 */
async function handlePaymentFailed(data) {
  console.log('⚠️ Handling transaction.payment_failed')

  // Ovde možeš:
  // 1. Obavestiti korisnika emailom
  // 2. Promeniti status subscription
  // 3. Dodati retry logiku

  const customerId = data.customer_id
  console.error(`❌ Payment failed for customer: ${customerId}`)
}

/**
 * 🔍 Helper: Get Plan ID from Paddle Price ID
 */
async function getPlanIdFromPriceId(priceId) {
  // Map Paddle Price IDs to Supabase Plan IDs
  const priceIdMap = {
    [process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_MONTHLY]: 'pro',
    [process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_YEARLY]: 'pro_yearly'
  }

  const planName = priceIdMap[priceId]
  
  if (!planName) {
    console.warn('⚠️ Unknown price ID:', priceId)
    return null
  }

  // Get plan from Supabase
  const { data: plan } = await supabaseAdmin
    .from('subscription_plans')
    .select('id')
    .eq('name', planName)
    .single()

  return plan?.id
}