// app/api/paddle/webhook/route.js - FIXED VERSION
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

/**
 * 🔥 PADDLE WEBHOOK HANDLER - FIXED SIGNATURE VERIFICATION
 * 
 * ⚠️ KRITIČNE IZMENE:
 * 1. Prvo čitamo RAW body kao text (await request.text())
 * 2. Koristimo ts:body format za signature
 * 3. Tek NAKON verifikacije parsujemo JSON
 * 
 * ✅ SVE OSTALE FUNKCIONALNOSTI OSTAJU ISTE!
 */

// Supabase Admin Client (server-side)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// Paddle Webhook Secret
const PADDLE_WEBHOOK_SECRET = process.env.PADDLE_WEBHOOK_SECRET

/**
 * 🔐 FIXED: Verify Paddle Webhook Signature
 * Koristi ts:body format koji je Paddle standard
 */
function verifyPaddleSignature(rawBody, signatureHeader) {
  if (!PADDLE_WEBHOOK_SECRET) {
    console.warn('⚠️ PADDLE_WEBHOOK_SECRET not configured - skipping verification')
    return true // U development mode možda nećeš imati secret
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
      console.error('❌ Invalid signature format')
      return false
    }

    // 🔥 KRITIČNO: Paddle koristi format "timestamp:body"
    const payload = `${timestamp}:${rawBody}`
    
    // Kreiraj HMAC-SHA256 hash
    const computedHash = crypto
      .createHmac('sha256', PADDLE_WEBHOOK_SECRET)
      .update(payload, 'utf8')
      .digest('hex')

    const isValid = computedHash === receivedSignature

    // Detaljno logovanje za debugging
    if (!isValid) {
      console.error('❌ Signature verification FAILED')
      console.error('Expected:', receivedSignature)
      console.error('Computed:', computedHash)
      console.error('Timestamp:', timestamp)
      console.error('Body length:', rawBody.length)
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
 * 🔥 POST Handler - FIXED VERSION
 */
export async function POST(request) {
  try {
    console.log('\n🔔 ========== PADDLE WEBHOOK RECEIVED ==========')

    // 1️⃣ 🔥 KRITIČNO: Prvo pročitaj RAW body kao TEXT
    const rawBody = await request.text()
    console.log('📦 Raw body length:', rawBody.length)

    // 2️⃣ Izvuci signature header
    const signatureHeader = request.headers.get('paddle-signature')
    
    if (!signatureHeader) {
      console.error('❌ Missing paddle-signature header')
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 401 }
      )
    }

    console.log('🔐 Signature header present:', signatureHeader.substring(0, 50) + '...')

    // 3️⃣ 🔥 VERIFIKUJ SIGNATURE PRE PARSIRANJA
    if (!verifyPaddleSignature(rawBody, signatureHeader)) {
      console.error('❌ WEBHOOK REJECTED: Invalid signature')
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    console.log('✅ Signature verification PASSED')

    // 4️⃣ Tek sada možemo sigurno parsovati JSON
    const body = JSON.parse(rawBody)
    const eventType = body.event_type
    const eventData = body.data

    console.log('🎯 Event Type:', eventType)
    console.log('📋 Event ID:', body.event_id || 'N/A')

    // 5️⃣ Handle različite event types (SVE OSTAJE ISTO!)
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

    // 6️⃣ Return success
    console.log('✅ Webhook processed successfully')
    console.log('========== WEBHOOK COMPLETE ==========\n')

    return NextResponse.json({ 
      success: true,
      message: 'Webhook processed successfully',
      eventType: eventType
    })

  } catch (error) {
    console.error('💥 ========== WEBHOOK ERROR ==========')
    console.error('Error:', error.message)
    console.error('Stack:', error.stack)
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

// ================================================================
// 🔥 SVE HANDLER FUNKCIJE OSTAJU POTPUNO ISTE!
// Samo signature verification je fixirana gore
// ================================================================

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

    if (!majstorId) {
      console.error('❌ No majstor_id in custom_data')
      return
    }

    const currentPeriodStart = data.current_billing_period?.starts_at
    const currentPeriodEnd = data.current_billing_period?.ends_at
    const trialStart = data.started_at
    const trialEnd = status === 'trialing' ? currentPeriodEnd : null

    const priceId = data.items?.[0]?.price?.id
    const planId = await getPlanIdFromPriceId(priceId)

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
      console.error('❌ Error creating subscription:', error)
      return
    }

    console.log('✅ Subscription created in Supabase:', subscription.id)

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
 * 🔄 subscription.updated
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

    if (error) {
      console.error('❌ Error updating subscription:', error)
      return
    }

    console.log('✅ Subscription updated in Supabase')

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
      return
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
 * 💳 transaction.completed
 */
async function handleTransactionCompleted(data) {
  console.log('💳 Handling transaction.completed')

  const transactionId = data.id
  const amount = data.details?.totals?.total
  const currency = data.currency_code

  console.log(`✅ Payment successful: ${amount} ${currency}`)
}

/**
 * ⚠️ transaction.payment_failed
 */
async function handlePaymentFailed(data) {
  console.log('⚠️ Handling transaction.payment_failed')

  const customerId = data.customer_id
  console.error(`❌ Payment failed for customer: ${customerId}`)
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