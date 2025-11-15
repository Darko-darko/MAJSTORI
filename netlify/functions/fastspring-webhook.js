// netlify/functions/fastspring-webhook.js
// FastSpring Webhook Handler - processes all subscription events

const { createClient } = require('@supabase/supabase-js')
const crypto = require('crypto')

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// FastSpring API credentials
const FASTSPRING_USERNAME = process.env.FASTSPRING_USERNAME
const FASTSPRING_PASSWORD = process.env.FASTSPRING_PASSWORD
const FASTSPRING_HMAC_SECRET = process.env.FASTSPRING_HMAC_SECRET

exports.handler = async (event) => {
  const startTime = Date.now()
  
  console.log('\n=====================================')
  console.log('🔔 FASTSPRING WEBHOOK RECEIVED')
  console.log('Method:', event.httpMethod)
  console.log('Time:', new Date().toISOString())

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    // 🔒 SECURITY: Verify HMAC signature
    const signature = event.headers['x-fs-signature']
    const rawBody = event.body

    if (FASTSPRING_HMAC_SECRET && signature) {
      const expectedSignature = crypto
        .createHmac('sha256', FASTSPRING_HMAC_SECRET)
        .update(rawBody)
        .digest('base64')

      const signatureValid = expectedSignature === signature
      console.log('🔒 Signature Valid:', signatureValid)

      if (!signatureValid) {
        console.warn('⚠️ Invalid signature!')
        return {
          statusCode: 403,
          body: JSON.stringify({ error: 'Invalid signature' })
        }
      }
    } else {
      console.warn('⚠️ No HMAC verification (test mode)')
    }

    // Parse webhook payload
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

    // FastSpring sends array of events
    const events = body.events || []
    console.log('📦 Events count:', events.length)

    const results = []

    // Process each event
    for (const evt of events) {
      const eventType = evt.type
      const eventData = evt.data

      console.log('\n---')
      console.log('Event:', eventType)
      console.log('ID:', evt.id)

      let result
      switch (eventType) {
        case 'subscription.activated':
          result = await handleSubscriptionActivated(eventData)
          break

        case 'subscription.deactivated':
          result = await handleSubscriptionDeactivated(eventData)
          break

        case 'subscription.updated':
          result = await handleSubscriptionUpdated(eventData)
          break

        case 'subscription.charge.completed':
          result = await handleSubscriptionChargeCompleted(eventData)
          break

        case 'subscription.charge.failed':
          result = await handleSubscriptionChargeFailed(eventData)
          break

        case 'subscription.trial.reminder':
          result = await handleTrialReminder(eventData)
          break

        default:
          console.log('Unhandled event:', eventType)
          result = { handled: false }
      }

      results.push({ eventType, result })
    }

    const duration = Date.now() - startTime
    console.log(`✅ Processed in ${duration}ms`)
    console.log('=====================================\n')

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true,
        processed: results.length,
        results,
        processingTime: `${duration}ms`
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
// EVENT HANDLERS
// ============================================

/**
 * subscription.activated
 * Triggered when:
 * - New subscription starts (after trial or immediate)
 * - Subscription is reactivated after being deactivated
 */
async function handleSubscriptionActivated(data) {
  console.log('✅ subscription.activated')

  try {
    const subscription = data.subscription
    const account = data.account

    const subscriptionId = subscription.id
    const accountId = account.id
    const status = subscription.state // 'active' or 'trial'

    // Get majstor_id from tags (set during checkout)
    const majstorId = subscription.tags?.majstor_id

    if (!majstorId) {
      console.error('❌ Missing majstor_id in tags')
      return { error: 'Missing majstor_id' }
    }

    console.log('📋 Subscription ID:', subscriptionId)
    console.log('👤 Majstor ID:', majstorId)
    console.log('📊 Status:', status)

    // Determine plan from product
    const productPath = subscription.product
    const planId = await getPlanIdFromProduct(productPath)

    if (!planId) {
      console.error('❌ Could not determine plan_id')
      return { error: 'Unknown product' }
    }

    // Get period dates
    const currentPeriodStart = subscription.nextChargeDate 
      ? new Date(new Date(subscription.nextChargeDate).getTime() - (30 * 24 * 60 * 60 * 1000)).toISOString()
      : new Date().toISOString()
    
    const currentPeriodEnd = subscription.nextChargeDate

    // Determine if trial
    let finalStatus = 'active'
    let trialEndsAt = null

    if (subscription.inTrial) {
      finalStatus = 'trial'
      trialEndsAt = subscription.nextChargeDate
      console.log('🎯 TRIAL subscription')
    }

    // Upsert subscription
    const { data: sub, error: upsertError } = await supabaseAdmin
      .from('user_subscriptions')
      .upsert({
        majstor_id: majstorId,
        plan_id: planId,
        status: finalStatus,
        payment_provider: 'fastspring',
        provider_subscription_id: subscriptionId,
        provider_customer_id: accountId,
        current_period_start: currentPeriodStart,
        current_period_end: currentPeriodEnd,
        trial_starts_at: subscription.inTrial ? currentPeriodStart : null,
        trial_ends_at: trialEndsAt,
        cancel_at_period_end: false,
        cancelled_at: null,
        provider_metadata: {
          autoRenew: subscription.autoRenew,
          intervalUnit: subscription.intervalUnit,
          intervalLength: subscription.intervalLength
        },
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'provider_subscription_id'
      })
      .select()
      .single()

    if (upsertError) {
      console.error('❌ Upsert error:', upsertError)
      return { error: upsertError.message }
    }

    console.log('✅ Subscription saved:', sub.id)

    // Update majstor record
    await supabaseAdmin
      .from('majstors')
      .update({
        subscription_status: finalStatus,
        subscription_ends_at: currentPeriodEnd,
        updated_at: new Date().toISOString()
      })
      .eq('id', majstorId)

    console.log('✅ Majstor record updated')

    return { success: true, status: finalStatus }

  } catch (error) {
    console.error('❌ Error:', error)
    return { error: error.message }
  }
}

/**
 * subscription.deactivated
 * Triggered when subscription is cancelled/expires
 */
async function handleSubscriptionDeactivated(data) {
  console.log('❌ subscription.deactivated')

  try {
    const subscription = data.subscription
    const subscriptionId = subscription.id

    console.log('📋 Subscription ID:', subscriptionId)

    // Get existing subscription
    const { data: existingSub } = await supabaseAdmin
      .from('user_subscriptions')
      .select('majstor_id, status')
      .eq('provider_subscription_id', subscriptionId)
      .single()

    if (!existingSub) {
      console.error('❌ Subscription not found')
      return { error: 'Subscription not found' }
    }

    const majstorId = existingSub.majstor_id

    // Update to cancelled status
    await supabaseAdmin
      .from('user_subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('provider_subscription_id', subscriptionId)

    // Update majstor to freemium
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

    return { success: true, newStatus: 'cancelled' }

  } catch (error) {
    console.error('❌ Error:', error)
    return { error: error.message }
  }
}

/**
 * subscription.updated
 * Triggered when subscription details change
 */
async function handleSubscriptionUpdated(data) {
  console.log('🔄 subscription.updated')

  try {
    const subscription = data.subscription
    const subscriptionId = subscription.id

    console.log('📋 Subscription ID:', subscriptionId)

    // Check if autoRenew changed (cancellation scheduled)
    const autoRenew = subscription.autoRenew
    const cancelAtPeriodEnd = !autoRenew

    console.log('🔄 AutoRenew:', autoRenew)
    console.log('📅 Cancel at period end:', cancelAtPeriodEnd)

    // Update subscription
    const { error: updateError } = await supabaseAdmin
      .from('user_subscriptions')
      .update({
        cancel_at_period_end: cancelAtPeriodEnd,
        cancelled_at: cancelAtPeriodEnd ? new Date().toISOString() : null,
        provider_metadata: {
          autoRenew: autoRenew
        },
        updated_at: new Date().toISOString()
      })
      .eq('provider_subscription_id', subscriptionId)

    if (updateError) {
      console.error('❌ Update error:', updateError)
      return { error: updateError.message }
    }

    console.log('✅ Subscription updated')

    return { success: true, cancelAtPeriodEnd }

  } catch (error) {
    console.error('❌ Error:', error)
    return { error: error.message }
  }
}

/**
 * subscription.charge.completed
 * Triggered when payment succeeds
 */
async function handleSubscriptionChargeCompleted(data) {
  console.log('💳 subscription.charge.completed')

  try {
    const subscription = data.subscription
    const subscriptionId = subscription.id

    // If was in trial and payment succeeded → move to active
    const { data: existingSub } = await supabaseAdmin
      .from('user_subscriptions')
      .select('status')
      .eq('provider_subscription_id', subscriptionId)
      .single()

    if (existingSub?.status === 'trial') {
      await supabaseAdmin
        .from('user_subscriptions')
        .update({
          status: 'active',
          trial_ends_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('provider_subscription_id', subscriptionId)

      console.log('✅ Trial → Active conversion')
    }

    return { success: true }

  } catch (error) {
    console.error('❌ Error:', error)
    return { error: error.message }
  }
}

/**
 * subscription.charge.failed
 * Triggered when payment fails
 */
async function handleSubscriptionChargeFailed(data) {
  console.log('⚠️ subscription.charge.failed')

  try {
    const subscription = data.subscription
    const subscriptionId = subscription.id

    // Mark as past_due
    await supabaseAdmin
      .from('user_subscriptions')
      .update({
        status: 'past_due',
        updated_at: new Date().toISOString()
      })
      .eq('provider_subscription_id', subscriptionId)

    console.log('⚠️ Subscription marked as past_due')

    return { success: true }

  } catch (error) {
    console.error('❌ Error:', error)
    return { error: error.message }
  }
}

/**
 * subscription.trial.reminder
 * Triggered before trial ends (optional handling)
 */
async function handleTrialReminder(data) {
  console.log('⏰ subscription.trial.reminder')
  
  // Optional: Send email reminder to user
  // For now, just log it
  
  return { success: true, message: 'Trial reminder logged' }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Map FastSpring product to plan_id
 */
async function getPlanIdFromProduct(productPath) {
  // Product path format: "promeister-monthly" or "promeister-yearly"
  
  const productMap = {
    'promeister-monthly': 'pro',
    'promeister-yearly': 'pro'
  }

  const planName = productMap[productPath]

  if (!planName) {
    console.warn('Unknown product:', productPath)
    return null
  }

  // Get plan_id from database
  const { data: plan } = await supabaseAdmin
    .from('subscription_plans')
    .select('id')
    .eq('name', planName)
    .single()

  if (!plan) {
    console.error(`Plan '${planName}' not found in database!`)
    return null
  }

  return plan.id
}