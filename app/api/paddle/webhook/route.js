// app/api/paddle/webhook/route.js - DEBUG VERSION FOR NETLIFY
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

/**
 * 🔍 PADDLE WEBHOOK - DEBUGGING VERSION
 * 
 * TEMPORARILY DISABLES SIGNATURE VERIFICATION
 * Shows us EXACTLY what Netlify is sending
 * 
 * ⚠️ USE ONLY FOR DEBUGGING - NEVER IN PRODUCTION!
 */

// Supabase Admin Client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const PADDLE_WEBHOOK_SECRET = process.env.PADDLE_WEBHOOK_SECRET
const DEBUG_MODE = true // 🔥 SET TO FALSE AFTER DEBUGGING

/**
 * 🔐 Verify Paddle Webhook Signature - WITH DETAILED LOGGING
 */
function verifyPaddleSignature(rawBody, signatureHeader) {
  console.log('\n🔍 ========== SIGNATURE DEBUG ==========')
  console.log('🔑 Secret exists:', !!PADDLE_WEBHOOK_SECRET)
  console.log('🔑 Secret length:', PADDLE_WEBHOOK_SECRET?.length || 0)
  console.log('📦 Body type:', typeof rawBody)
  console.log('📦 Body length:', rawBody?.length || 0)
  console.log('📦 Body preview:', rawBody?.substring(0, 100))
  console.log('🔐 Signature header:', signatureHeader)

  if (!PADDLE_WEBHOOK_SECRET) {
    console.warn('⚠️ NO SECRET - Allowing in debug mode')
    return DEBUG_MODE
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

    console.log('⏰ Timestamp:', timestamp)
    console.log('🔐 Received signature:', receivedSignature)

    if (!timestamp || !receivedSignature) {
      console.error('❌ Missing ts or h1 in signature')
      return DEBUG_MODE
    }

    // Try different payload formats
    const formats = {
      'ts:body': `${timestamp}:${rawBody}`,
      'ts:body (trimmed)': `${timestamp}:${rawBody.trim()}`,
      'ts:body (no spaces)': `${timestamp}:${rawBody.replace(/\s+/g, '')}`,
      'body only': rawBody,
      'body (UTF-8 explicit)': Buffer.from(rawBody, 'utf8').toString()
    }

    console.log('\n🧪 Testing different signature formats:')
    
    let isValid = false
    let workingFormat = null

    Object.entries(formats).forEach(([formatName, payload]) => {
      const hash = crypto
        .createHmac('sha256', PADDLE_WEBHOOK_SECRET)
        .update(payload, 'utf8')
        .digest('hex')
      
      const matches = hash === receivedSignature
      console.log(`${matches ? '✅' : '❌'} ${formatName}: ${hash.substring(0, 20)}...`)
      
      if (matches) {
        isValid = true
        workingFormat = formatName
      }
    })

    if (isValid) {
      console.log(`\n🎉 SUCCESS! Working format: ${workingFormat}`)
    } else {
      console.log('\n❌ No format matched')
      console.log('Expected:', receivedSignature)
    }

    console.log('========== SIGNATURE DEBUG END ==========\n')

    // 🔥 IN DEBUG MODE: Always return true
    return DEBUG_MODE ? true : isValid

  } catch (error) {
    console.error('❌ Signature verification error:', error)
    return DEBUG_MODE
  }
}

/**
 * 🔥 POST Handler - DEBUG VERSION
 */
export async function POST(request) {
  const startTime = Date.now()
  
  try {
    console.log('\n🔔 ========== PADDLE WEBHOOK RECEIVED (DEBUG MODE) ==========')
    console.log('⏰ Timestamp:', new Date().toISOString())
    console.log('🌍 Environment:', process.env.NODE_ENV)
    console.log('🔧 Platform:', process.env.NETLIFY ? 'Netlify' : 'Other')

    // Log ALL headers
    console.log('\n📋 ALL HEADERS:')
    request.headers.forEach((value, key) => {
      console.log(`  ${key}: ${value}`)
    })

    // Try multiple ways to read body
    console.log('\n📦 BODY READING ATTEMPTS:')
    
    let rawBody = null
    let bodyReadMethod = null

    // Method 1: request.text()
    try {
      rawBody = await request.text()
      bodyReadMethod = 'request.text()'
      console.log('✅ Method 1 (request.text()) SUCCESS')
      console.log('  Length:', rawBody.length)
      console.log('  Preview:', rawBody.substring(0, 150))
    } catch (e) {
      console.log('❌ Method 1 (request.text()) FAILED:', e.message)
    }

    // Method 2: Clone and try again
    if (!rawBody) {
      try {
        const cloned = request.clone()
        rawBody = await cloned.text()
        bodyReadMethod = 'request.clone().text()'
        console.log('✅ Method 2 (clone) SUCCESS')
      } catch (e) {
        console.log('❌ Method 2 (clone) FAILED:', e.message)
      }
    }

    if (!rawBody) {
      console.error('❌ Could not read body with any method')
      return NextResponse.json(
        { error: 'Failed to read request body' },
        { status: 400 }
      )
    }

    console.log(`\n✅ Body read using: ${bodyReadMethod}`)

    // Get signature
    const signatureHeader = request.headers.get('paddle-signature')
    
    if (!signatureHeader) {
      console.error('❌ Missing paddle-signature header')
      // IN DEBUG MODE: Continue anyway
      if (!DEBUG_MODE) {
        return NextResponse.json({ error: 'Missing signature' }, { status: 401 })
      }
      console.log('⚠️ DEBUG MODE: Continuing without signature...')
    } else {
      // Verify signature (will log details)
      const verified = verifyPaddleSignature(rawBody, signatureHeader)
      
      if (!verified && !DEBUG_MODE) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
      
      if (verified) {
        console.log('✅ Signature VERIFIED')
      } else {
        console.log('⚠️ Signature FAILED but DEBUG MODE enabled - continuing...')
      }
    }

    // Parse JSON
    let body
    try {
      body = JSON.parse(rawBody)
      console.log('\n✅ JSON parsed successfully')
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError.message)
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const eventType = body.event_type
    const eventData = body.data

    console.log('\n🎯 ========== EVENT PROCESSING ==========')
    console.log('📌 Event Type:', eventType)
    console.log('🔑 Event ID:', body.event_id || 'N/A')
    console.log('📋 Custom Data:', JSON.stringify(body.data?.custom_data || {}))
    console.log('👤 Customer ID:', body.data?.customer_id || 'N/A')
    console.log('🎫 Subscription ID:', body.data?.id || 'N/A')
    console.log('📊 Status:', body.data?.status || 'N/A')

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

      case 'subscription.cancelled':
        result = await handleSubscriptionCancelled(eventData)
        break

      case 'transaction.completed':
        result = await handleTransactionCompleted(eventData)
        break

      default:
        console.log('ℹ️ Unhandled event type:', eventType)
        result = { handled: false, eventType }
    }

    const duration = Date.now() - startTime
    console.log(`\n✅ Webhook processed in ${duration}ms`)
    console.log('📊 Result:', JSON.stringify(result))
    console.log('========== WEBHOOK COMPLETE ==========\n')

    return NextResponse.json({ 
      success: true,
      debugMode: DEBUG_MODE,
      message: 'Webhook processed',
      eventType,
      result,
      processingTime: `${duration}ms`
    })

  } catch (error) {
    const duration = Date.now() - startTime
    console.error('\n💥 ========== WEBHOOK ERROR ==========')
    console.error('❌ Error:', error.message)
    console.error('📚 Stack:', error.stack)
    console.error(`⏱️  Failed after ${duration}ms`)
    console.error('========================================\n')
    
    return NextResponse.json({ 
      error: 'Webhook processing failed',
      details: error.message,
      debugMode: DEBUG_MODE
    }, { status: 500 })
  }
}

/**
 * ✅ subscription.created
 */
async function handleSubscriptionCreated(data) {
  console.log('\n✅ ========== HANDLING: subscription.created ==========')

  try {
    const subscriptionId = data.id
    const customerId = data.customer_id
    const status = data.status
    const customData = data.custom_data || {}
    const majstorId = customData.majstor_id

    console.log('📋 Subscription Data:')
    console.log('  ID:', subscriptionId)
    console.log('  Customer:', customerId)
    console.log('  Status:', status)
    console.log('  Majstor ID:', majstorId)
    console.log('  Custom Data:', JSON.stringify(customData))

    if (!majstorId) {
      console.error('❌ CRITICAL: No majstor_id in custom_data!')
      console.log('💡 Full data:', JSON.stringify(data, null, 2))
      return { error: 'Missing majstor_id', data }
    }

    const currentPeriodStart = data.current_billing_period?.starts_at
    const currentPeriodEnd = data.current_billing_period?.ends_at

    let finalStatus
    let trialStart = null
    let trialEnd = null

    if (status === 'trialing') {
      finalStatus = 'trial'
      trialStart = data.started_at || currentPeriodStart
      trialEnd = currentPeriodEnd
      console.log('🎯 Type: TRIAL subscription')
    } else if (status === 'active') {
      finalStatus = 'active'
      console.log('💳 Type: ACTIVE (paid) subscription')
    } else {
      finalStatus = status
      console.log(`⚠️ Type: Unknown status "${status}"`)
    }

    const priceId = data.items?.[0]?.price?.id
    console.log('💰 Price ID:', priceId)
    
    const planId = await getPlanIdFromPriceId(priceId)
    console.log('📦 Plan ID:', planId)

    // Check if already exists
    const { data: existingSub } = await supabaseAdmin
      .from('user_subscriptions')
      .select('id')
      .eq('paddle_subscription_id', subscriptionId)
      .maybeSingle()

    if (existingSub) {
      console.log('ℹ️ Subscription already exists, updating instead')
      return await handleSubscriptionUpdated(data)
    }

    // Create subscription
    console.log('💾 Creating subscription in Supabase...')
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
      console.error('❌ Supabase insert error:', insertError)
      return { error: insertError.message }
    }

    console.log('✅ Subscription created:', subscription.id)

    // Update majstor
    console.log('💾 Updating majstor record...')
    const { error: majstorError } = await supabaseAdmin
      .from('majstors')
      .update({
        subscription_status: finalStatus,
        subscription_ends_at: currentPeriodEnd,
        updated_at: new Date().toISOString()
      })
      .eq('id', majstorId)

    if (majstorError) {
      console.error('❌ Majstor update error:', majstorError)
    } else {
      console.log('✅ Majstor updated')
    }

    console.log('========== subscription.created COMPLETE ==========\n')
    return { success: true, subscriptionId: subscription.id, status: finalStatus }

  } catch (error) {
    console.error('❌ Error in handleSubscriptionCreated:', error)
    return { error: error.message }
  }
}

/**
 * 🔄 subscription.updated
 */
async function handleSubscriptionUpdated(data) {
  console.log('\n🔄 ========== HANDLING: subscription.updated ==========')

  try {
    const subscriptionId = data.id
    const status = data.status
    const currentPeriodStart = data.current_billing_period?.starts_at
    const currentPeriodEnd = data.current_billing_period?.ends_at

    console.log('📋 Update Data:')
    console.log('  Subscription ID:', subscriptionId)
    console.log('  New Status:', status)
    console.log('  Period:', currentPeriodStart, 'to', currentPeriodEnd)

    let finalStatus = status === 'trialing' ? 'trial' : 
                      status === 'active' ? 'active' : status

    console.log('🔄 Status mapping:', status, '→', finalStatus)

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
      console.error('❌ Update error:', updateError)
      return { error: updateError.message }
    }

    console.log('✅ Subscription updated')

    // Update majstor
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
      
      console.log('✅ Majstor updated')
    }

    console.log('========== subscription.updated COMPLETE ==========\n')
    return { success: true, status: finalStatus }

  } catch (error) {
    console.error('❌ Error in handleSubscriptionUpdated:', error)
    return { error: error.message }
  }
}

/**
 * ⚡ subscription.activated
 */
async function handleSubscriptionActivated(data) {
  console.log('\n⚡ ========== HANDLING: subscription.activated ==========')

  const subscriptionId = data.id
  console.log('🎯 Activating subscription:', subscriptionId)

  await supabaseAdmin
    .from('user_subscriptions')
    .update({
      status: 'active',
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
    
    console.log('✅ Subscription activated')
  }

  console.log('========== subscription.activated COMPLETE ==========\n')
  return { success: true, status: 'active' }
}

/**
 * ❌ subscription.cancelled
 */
async function handleSubscriptionCancelled(data) {
  console.log('\n❌ HANDLING: subscription.cancelled')
  
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

  console.log('✅ Subscription cancelled')
  return { success: true }
}

/**
 * 💳 transaction.completed
 */
async function handleTransactionCompleted(data) {
  console.log('\n💳 HANDLING: transaction.completed')
  
  const transactionId = data.id
  const subscriptionId = data.subscription_id
  const amount = data.details?.totals?.total
  const currency = data.currency_code

  console.log(`✅ Payment: ${amount} ${currency}`)
  console.log(`🔗 Subscription: ${subscriptionId}`)

  if (subscriptionId) {
    const { data: subscription } = await supabaseAdmin
      .from('user_subscriptions')
      .select('status')
      .eq('paddle_subscription_id', subscriptionId)
      .single()

    if (subscription && subscription.status !== 'active') {
      console.log('🔄 Ensuring subscription is active...')
      await supabaseAdmin
        .from('user_subscriptions')
        .update({ status: 'active', updated_at: new Date().toISOString() })
        .eq('paddle_subscription_id', subscriptionId)
    }
  }

  return { success: true, transactionId }
}

/**
 * 🔍 Helper: Get Plan ID from Price ID
 */
async function getPlanIdFromPriceId(priceId) {
  console.log('🔍 Looking up plan for price:', priceId)
  
  const priceIdMap = {
    [process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_MONTHLY]: 'pro',
    [process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_YEARLY]: 'pro_yearly'
  }

  const planName = priceIdMap[priceId] || 'pro'
  console.log('📋 Mapped to plan name:', planName)

  const { data: plan } = await supabaseAdmin
    .from('subscription_plans')
    .select('id')
    .eq('name', planName)
    .single()

  console.log('✅ Plan ID:', plan?.id)
  return plan?.id
}