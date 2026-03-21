// app/api/fastspring-cancel/route.js

import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const FASTSPRING_USERNAME = process.env.FASTSPRING_USERNAME
const FASTSPRING_PASSWORD = process.env.FASTSPRING_PASSWORD
const FASTSPRING_API_URL = 'https://api.fastspring.com'

export async function POST(request) {
  try {
    console.log('🚫 Cancel subscription request received')

    const body = await request.json()
    const { subscriptionId, majstorId } = body

    if (!subscriptionId || !majstorId) {
      return Response.json({
        error: 'Missing required fields',
        required: ['subscriptionId', 'majstorId'],
      }, { status: 400 })
    }

    console.log('📋 Subscription ID:', subscriptionId)
    console.log('👤 Majstor ID:', majstorId)

    const authString = Buffer.from(
      `${FASTSPRING_USERNAME}:${FASTSPRING_PASSWORD}`
    ).toString('base64')

    const fastspringResponse = await fetch(
      `${FASTSPRING_API_URL}/subscriptions/${subscriptionId}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Basic ${authString}`,
          Accept: 'application/json',
        },
      }
    )

    console.log('🔢 FS status:', fastspringResponse.status)

    if (!fastspringResponse.ok) {
      const errorText = await fastspringResponse.text()
      console.error('❌ FastSpring API error body:', errorText)

      return Response.json({
        error: 'FastSpring cancellation failed',
        status: fastspringResponse.status,
        details: errorText?.slice(0, 300) || null,
      }, { status: fastspringResponse.status })
    }

    const fastspringData = await fastspringResponse.json()
    console.log('✅ FastSpring cancellation scheduled')

    await supabaseAdmin
      .from('user_subscriptions')
      .update({
        cancel_at_period_end: true,
        cancelled_at: new Date().toISOString(),
        provider_metadata: { autoRenew: false },
        updated_at: new Date().toISOString(),
      })
      .eq('provider_subscription_id', subscriptionId)

    console.log('✅ Database updated')

    return Response.json({
      success: true,
      message: 'Cancellation scheduled',
      data: {
        subscriptionId,
        autoRenew: false,
        endsAt: fastspringData.nextChargeDate,
      },
    })
  } catch (error) {
    console.error('💥 Cancel error:', error)

    return Response.json({
      error: 'Failed to cancel subscription',
      message: error.message,
    }, { status: 500 })
  }
}
