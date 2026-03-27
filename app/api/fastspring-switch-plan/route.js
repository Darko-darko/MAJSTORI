// app/api/fastspring-switch-plan/route.js
// Switch subscription product on FastSpring (no checkout needed)
// Used for downgrade PRO+ → PRO (both trial and active)

import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const FASTSPRING_USERNAME = process.env.FASTSPRING_USERNAME
const FASTSPRING_PASSWORD = process.env.FASTSPRING_PASSWORD

// Map plan names to FastSpring product paths
const PLAN_PRODUCTS = {
  pro: {
    monthly: 'promeister-monthly',
    yearly: 'promeister-yearly',
  },
  pro_plus: {
    monthly: 'promeister-plus-monthly',
    yearly: 'promeister-plus-yearly',
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { subscriptionId, majstorId, targetPlan } = body

    if (!subscriptionId || !majstorId || !targetPlan) {
      return Response.json({
        error: 'Missing required fields',
        required: ['subscriptionId', 'majstorId', 'targetPlan']
      }, { status: 400 })
    }

    if (!PLAN_PRODUCTS[targetPlan]) {
      return Response.json({ error: 'Invalid target plan' }, { status: 400 })
    }

    console.log(`🔄 Switch plan: ${subscriptionId} → ${targetPlan} for majstor ${majstorId}`)

    // Get current subscription to determine interval (monthly/yearly)
    const { data: currentSub } = await supabaseAdmin
      .from('user_subscriptions')
      .select('provider_metadata, plan_id, status')
      .eq('provider_subscription_id', subscriptionId)
      .eq('majstor_id', majstorId)
      .single()

    if (!currentSub) {
      return Response.json({ error: 'Subscription not found' }, { status: 404 })
    }

    const interval = currentSub.provider_metadata?.intervalUnit === 'year' ? 'yearly' : 'monthly'
    const newProduct = PLAN_PRODUCTS[targetPlan][interval]

    console.log(`📦 Switching to product: ${newProduct} (${interval})`)

    // Call FastSpring API to change product
    const credentials = Buffer.from(`${FASTSPRING_USERNAME}:${FASTSPRING_PASSWORD}`).toString('base64')

    const fsResponse = await fetch('https://api.fastspring.com/subscriptions', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        subscriptions: [{
          subscription: subscriptionId,
          product: newProduct
        }]
      })
    })

    if (!fsResponse.ok) {
      const errorText = await fsResponse.text()
      console.error('❌ FastSpring switch error:', errorText)
      return Response.json({
        error: 'FastSpring Fehler beim Planwechsel',
        details: errorText?.slice(0, 300)
      }, { status: 500 })
    }

    const fsData = await fsResponse.json()
    console.log('✅ FastSpring product switched:', JSON.stringify(fsData))

    // Update plan_id in our database
    const { data: newPlan } = await supabaseAdmin
      .from('subscription_plans')
      .select('id')
      .eq('name', targetPlan)
      .single()

    if (newPlan) {
      await supabaseAdmin
        .from('user_subscriptions')
        .update({
          plan_id: newPlan.id,
          updated_at: new Date().toISOString()
        })
        .eq('provider_subscription_id', subscriptionId)

      console.log(`✅ DB updated: plan_id → ${targetPlan}`)
    }

    // If downgrading from PRO+ to PRO, cancel seat subscription
    if (targetPlan === 'pro') {
      const { data: majstor } = await supabaseAdmin
        .from('majstors')
        .select('seat_subscription_id')
        .eq('id', majstorId)
        .single()

      if (majstor?.seat_subscription_id) {
        console.log('💺 Cancelling seat subscription on downgrade...')
        await fetch(`https://api.fastspring.com/subscriptions/${majstor.seat_subscription_id}`, {
          method: 'DELETE',
          headers: { Authorization: `Basic ${credentials}` }
        })
        await supabaseAdmin
          .from('majstors')
          .update({ paid_seats: 0, seat_subscription_id: null })
          .eq('id', majstorId)
      }
    }

    return Response.json({
      success: true,
      newPlan: targetPlan,
      newProduct,
      interval,
      isTrialSwitch: currentSub.status === 'trial'
    })

  } catch (error) {
    console.error('💥 Switch plan error:', error)
    return Response.json({
      error: 'Fehler beim Planwechsel',
      message: error.message
    }, { status: 500 })
  }
}
