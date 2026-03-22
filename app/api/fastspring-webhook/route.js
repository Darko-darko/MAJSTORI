// app/api/fastspring-webhook/route.js
// FastSpring Webhook Handler - processes all subscription events

import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const FASTSPRING_HMAC_SECRET = process.env.FASTSPRING_HMAC_SECRET

export async function POST(request) {
  const startTime = Date.now()

  console.log('\n=====================================')
  console.log(' FASTSPRING WEBHOOK RECEIVED')
  console.log('Time:', new Date().toISOString())

  try {
    const rawBody = await request.text()

    // SECURITY: Verify HMAC signature
    const signature = request.headers.get('x-fs-signature')

    if (FASTSPRING_HMAC_SECRET && signature) {
      const expectedSignature = crypto
        .createHmac('sha256', FASTSPRING_HMAC_SECRET)
        .update(rawBody)
        .digest('base64')

      const signatureValid = expectedSignature === signature
      console.log(' Signature Valid:', signatureValid)

      if (!signatureValid) {
        console.warn(' Invalid signature!')
        return Response.json({ error: 'Invalid signature' }, { status: 403 })
      }
    } else {
      console.warn(' No HMAC verification (test mode)')
    }

    // Parse webhook payload
    let body
    try {
      body = JSON.parse(rawBody)
    } catch (e) {
      console.error('JSON parse error:', e)
      return Response.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const events = body.events || []
    console.log(' Events count:', events.length)

    const results = []

    for (const evt of events) {
      const eventType = evt.type
      const eventData = evt.data

      console.log('\n---')
      console.log('Event:', eventType)
      console.log('ID:', evt.id)

      try {
        console.log(' Raw event data (truncated):', JSON.stringify(eventData).slice(0, 1000))
      } catch (_) {}

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
    console.log(` Processed in ${duration}ms`)
    console.log('=====================================\n')

    return Response.json({
      success: true,
      processed: results.length,
      results,
      processingTime: `${duration}ms`
    })

  } catch (error) {
    console.error('ERROR:', error.message)
    console.error('Stack:', error.stack)

    return Response.json({
      error: 'Internal error',
      details: error.message
    }, { status: 500 })
  }
}

// ============================================
// EVENT HANDLERS
// ============================================

async function handleSubscriptionActivated(data) {
  console.log(' subscription.activated')

  try {
    console.log('🔍 CHECKING FOR TAGS...')
    console.log('🔍 typeof data.subscription:', typeof data.subscription)

    if (typeof data.subscription === 'object' && data.subscription !== null) {
      console.log('🔍 subscription object keys:', Object.keys(data.subscription).join(', '))
      console.log('🔍 data.subscription.tags:', JSON.stringify(data.subscription.tags || null))

      if (data.subscription.tags) {
        console.log('🏷️ TAGS FOUND!')
        console.log('🏷️ majstor_id:', data.subscription.tags.majstor_id)
        console.log('🏷️ billing_interval:', data.subscription.tags.billing_interval)
        console.log('🏷️ source:', data.subscription.tags.source)
      } else {
        console.log('❌ NO TAGS in subscription object!')
      }
    } else {
      console.log('❌ subscription is NOT an object, it is:', data.subscription)
    }

    const subscriptionId =
      typeof data.subscription === 'string'
        ? data.subscription
        : data.subscription?.id

    const accountObj = data.account
    const accountId =
      typeof accountObj === 'string'
        ? accountObj
        : accountObj?.id

    const statusRaw = data.state

    let majstorId = null

    // STRATEGY 1: Subscription tags
    if (typeof data.subscription === 'object' && data.subscription.tags?.majstor_id) {
      majstorId = data.subscription.tags.majstor_id
      console.log('Found majstor_id in subscription.tags:', majstorId)
    }

    // STRATEGY 2: Product attributes
    if (!majstorId && data.product && typeof data.product === 'object') {
      if (data.product.attributes?.majstor_id) {
        majstorId = data.product.attributes.majstor_id
        console.log('Found majstor_id in product.attributes:', majstorId)
      }
    }

    // STRATEGY 3: Order/session tags
    if (!majstorId && data.tags?.majstor_id) {
      majstorId = data.tags.majstor_id
      console.log('Found majstor_id in order tags:', majstorId)
    }

    // STRATEGY 4: Company field
    if (!majstorId && typeof accountObj === 'object') {
      const company = accountObj.contact?.company || accountObj.company
      if (company && company.startsWith('MAJSTOR:')) {
        majstorId = company.replace('MAJSTOR:', '')
        console.log('Found majstor_id in company field:', majstorId)
      }
    }

    // STRATEGY 5: Email lookup
    if (!majstorId) {
      console.log(' No majstor_id in tags, trying email lookup...')
      const customerEmail =
        typeof accountObj === 'object'
          ? accountObj.contact?.email
          : null

      if (customerEmail) {
        const { data: majstor, error: lookupError } = await supabaseAdmin
          .from('majstors')
          .select('id')
          .eq('email', customerEmail)
          .single()

        if (majstor) {
          majstorId = majstor.id
          console.log(` Found majstor by email: ${majstorId}`)
        } else {
          console.error(` No majstor found for email: ${customerEmail}`, lookupError)
        }
      }
    }

    if (!majstorId) {
      console.error(' Cannot identify majstor - no tags and no email match')
      return { error: 'Cannot identify majstor' }
    }

    let productPath = null

    try {
      console.log(' data.product raw:', JSON.stringify(data.product))
    } catch (_) {}

    if (typeof data.product === 'string') {
      productPath = data.product
    } else if (data.product && typeof data.product === 'object') {
      productPath = data.product.product || data.product.path || data.product.sku || null
    } else if (typeof data.subscription === 'object') {
      productPath = data.subscription.product || data.subscription.sku || null
    }

    console.log(' Product path (resolved):', productPath)
    console.log(' Subscription ID:', subscriptionId)
    console.log(' Majstor ID:', majstorId)
    console.log(' Status (raw):', statusRaw)

    const planId = await getPlanIdFromProduct(productPath)

    if (!subscriptionId || !planId) {
      console.error(' Could not determine subscriptionId or plan_id')
      return { error: 'Unknown subscription or product' }
    }

    const beginMs =
      typeof data.subscription === 'object'
        ? data.subscription.begin
        : data.begin

    const nextChargeMs =
      typeof data.subscription === 'object'
        ? data.subscription.nextChargeDate
        : data.nextChargeDate

    const currentPeriodStart = beginMs
      ? new Date(beginMs).toISOString()
      : new Date().toISOString()

    const currentPeriodEnd = nextChargeMs
      ? new Date(nextChargeMs).toISOString()
      : null

    const inTrial =
      statusRaw === 'trial' ||
      data.inTrial === true ||
      data.nextNotificationType === 'FREE_TRIAL_NOTIFICATION'

    const finalStatus = inTrial ? 'trial' : 'active'
    const trialEndsAt = inTrial ? currentPeriodEnd : null

    const autoRenew =
      typeof data.subscription === 'object'
        ? data.subscription.autoRenew
        : (typeof data.autoRenew === 'boolean'
          ? data.autoRenew
          : true)

    const intervalUnit =
      typeof data.subscription === 'object'
        ? data.subscription.intervalUnit
        : data.intervalUnit

    const intervalLength =
      typeof data.subscription === 'object'
        ? data.subscription.intervalLength
        : data.intervalLength

    const { data: sub, error: upsertError } = await supabaseAdmin
      .from('user_subscriptions')
      .upsert({
        majstor_id: majstorId,
        plan_id: planId,
        status: finalStatus,
        payment_provider: 'fastspring',
        provider_subscription_id: subscriptionId,
        provider_customer_id: accountId || null,
        current_period_start: currentPeriodStart,
        current_period_end: currentPeriodEnd,
        trial_starts_at: inTrial ? currentPeriodStart : null,
        trial_ends_at: trialEndsAt,
        cancel_at_period_end: false,
        cancelled_at: null,
        provider_metadata: { autoRenew, intervalUnit, intervalLength },
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'provider_subscription_id'
      })
      .select()
      .single()

    if (upsertError) {
      console.error(' Upsert error:', upsertError)
      return { error: upsertError.message }
    }

    console.log(' Subscription saved:', sub.id)

    await supabaseAdmin
      .from('majstors')
      .update({
        subscription_status: finalStatus,
        subscription_ends_at: currentPeriodEnd,
        updated_at: new Date().toISOString()
      })
      .eq('id', majstorId)

    console.log(' Majstor record updated')
    return { success: true, status: finalStatus }

  } catch (error) {
    console.error(' Error in handleSubscriptionActivated:', error)
    return { error: error.message }
  }
}

async function handleSubscriptionDeactivated(data) {
  console.log(' subscription.deactivated')

  try {
    const subscriptionId =
      typeof data.subscription === 'string'
        ? data.subscription
        : data.subscription?.id

    console.log(' Subscription ID:', subscriptionId)

    const { data: existingSub } = await supabaseAdmin
      .from('user_subscriptions')
      .select('majstor_id, status')
      .eq('provider_subscription_id', subscriptionId)
      .single()

    if (!existingSub) {
      console.error(' Subscription not found')
      return { error: 'Subscription not found' }
    }

    const majstorId = existingSub.majstor_id

    await supabaseAdmin
      .from('user_subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('provider_subscription_id', subscriptionId)

    await supabaseAdmin
      .from('majstors')
      .update({
        subscription_status: 'freemium',
        subscription_ends_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', majstorId)

    console.log(' Subscription cancelled')
    console.log(' User reverted to freemium')
    return { success: true, newStatus: 'cancelled' }

  } catch (error) {
    console.error(' Error in handleSubscriptionDeactivated:', error)
    return { error: error.message }
  }
}

async function handleSubscriptionUpdated(data) {
  console.log(' subscription.updated')

  try {
    const subscriptionId =
      typeof data.subscription === 'string'
        ? data.subscription
        : data.subscription?.id

    console.log(' Subscription ID:', subscriptionId)

    const autoRenew =
      typeof data.subscription === 'object'
        ? data.subscription.autoRenew
        : (typeof data.autoRenew === 'boolean'
          ? data.autoRenew
          : true)

    const cancelAtPeriodEnd = !autoRenew

    console.log(' AutoRenew:', autoRenew)
    console.log(' Cancel at period end:', cancelAtPeriodEnd)

    const { error: updateError } = await supabaseAdmin
      .from('user_subscriptions')
      .update({
        cancel_at_period_end: cancelAtPeriodEnd,
        cancelled_at: cancelAtPeriodEnd ? new Date().toISOString() : null,
        provider_metadata: { autoRenew },
        updated_at: new Date().toISOString()
      })
      .eq('provider_subscription_id', subscriptionId)

    if (updateError) {
      console.error(' Update error:', updateError)
      return { error: updateError.message }
    }

    console.log(' Subscription updated')
    return { success: true, cancelAtPeriodEnd }

  } catch (error) {
    console.error(' Error in handleSubscriptionUpdated:', error)
    return { error: error.message }
  }
}

async function handleSubscriptionChargeCompleted(data) {
  console.log('🔔 subscription.charge.completed')

  try {
    const subscriptionObj = data.subscription
    const subscriptionId =
      typeof subscriptionObj === 'string'
        ? subscriptionObj
        : subscriptionObj?.id

    console.log('📋 Subscription ID (charge.completed):', subscriptionId)

    const { data: existingSub, error: subError } = await supabaseAdmin
      .from('user_subscriptions')
      .select('id, majstor_id, status, current_period_start, current_period_end')
      .eq('provider_subscription_id', subscriptionId)
      .single()

    if (subError) {
      console.error('❌ Error loading existing subscription:', subError)
      return { error: subError.message }
    }

    if (!existingSub) {
      console.error('❌ No subscription found for subscriptionId:', subscriptionId)
      return { error: 'Subscription not found' }
    }

    let nextChargeMs = null
    if (typeof subscriptionObj === 'object' && subscriptionObj !== null) {
      nextChargeMs = subscriptionObj.nextChargeDate || null
    }
    if (!nextChargeMs && data.nextChargeDate) {
      nextChargeMs = data.nextChargeDate
    }

    const now = new Date()
    const nowIso = now.toISOString()

    let newCurrentPeriodEnd
    if (nextChargeMs) {
      newCurrentPeriodEnd = new Date(nextChargeMs).toISOString()
      console.log('✅ Using nextChargeDate as period end:', newCurrentPeriodEnd)
    } else {
      const fallback = new Date(now)
      fallback.setMonth(fallback.getMonth() + 1)
      newCurrentPeriodEnd = fallback.toISOString()
      console.warn('⚠️ No nextChargeDate, using +1 month fallback:', newCurrentPeriodEnd)
    }

    if (existingSub.status === 'trial') {
      const { error: updateSubError } = await supabaseAdmin
        .from('user_subscriptions')
        .update({
          status: 'active',
          trial_ends_at: null,
          current_period_start: nowIso,
          current_period_end: newCurrentPeriodEnd,
          updated_at: nowIso
        })
        .eq('id', existingSub.id)

      if (updateSubError) {
        console.error('❌ Error updating user_subscriptions:', updateSubError)
        return { error: updateSubError.message }
      }

      const { error: updateMajstorError } = await supabaseAdmin
        .from('majstors')
        .update({
          subscription_status: 'active',
          subscription_ends_at: newCurrentPeriodEnd,
          updated_at: nowIso
        })
        .eq('id', existingSub.majstor_id)

      if (updateMajstorError) {
        console.error('❌ Error updating majstor:', updateMajstorError)
        return { error: updateMajstorError.message }
      }

      console.log('✅ Trial → Active conversion complete')
      console.log('   New period:', nowIso, '→', newCurrentPeriodEnd)

    } else if (existingSub.status === 'active') {
      const { error: updateSubError } = await supabaseAdmin
        .from('user_subscriptions')
        .update({
          current_period_start: nowIso,
          current_period_end: newCurrentPeriodEnd,
          updated_at: nowIso
        })
        .eq('id', existingSub.id)

      if (updateSubError) {
        console.error('❌ Error updating subscription period:', updateSubError)
        return { error: updateSubError.message }
      }

      const { error: updateMajstorError } = await supabaseAdmin
        .from('majstors')
        .update({
          subscription_ends_at: newCurrentPeriodEnd,
          updated_at: nowIso
        })
        .eq('id', existingSub.majstor_id)

      if (updateMajstorError) {
        console.error('❌ Error updating majstor:', updateMajstorError)
      }

      console.log('✅ Active subscription renewed')
      console.log('   New period:', nowIso, '→', newCurrentPeriodEnd)

    } else {
      console.warn('⚠️ Charge completed but status is:', existingSub.status)
      console.warn('   No action taken')
    }

    return { success: true }

  } catch (error) {
    console.error('❌ Error in handleSubscriptionChargeCompleted:', error)
    return { error: error.message }
  }
}

async function handleSubscriptionChargeFailed(data) {
  console.log(' subscription.charge.failed')

  try {
    const subscriptionObj = data.subscription
    const subscriptionId =
      typeof subscriptionObj === 'string'
        ? subscriptionObj
        : subscriptionObj?.id

    await supabaseAdmin
      .from('user_subscriptions')
      .update({
        status: 'past_due',
        updated_at: new Date().toISOString()
      })
      .eq('provider_subscription_id', subscriptionId)

    console.log(' Subscription marked as past_due')
    return { success: true }

  } catch (error) {
    console.error(' Error in handleSubscriptionChargeFailed:', error)
    return { error: error.message }
  }
}

async function handleTrialReminder(data) {
  console.log(' subscription.trial.reminder')
  return { success: true, message: 'Trial reminder logged' }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

async function getPlanIdFromProduct(productPath) {
  const productMap = {
    'promeister-monthly': 'pro',
    'promeister-yearly': 'pro'
  }

  const planName = productMap[productPath]

  if (!planName) {
    console.warn('Unknown product:', productPath)
    return null
  }

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
