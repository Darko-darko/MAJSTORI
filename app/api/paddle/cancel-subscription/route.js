// app/api/paddle/cancel-subscription/route.js
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const PADDLE_API_KEY = process.env.PADDLE_API_KEY
const PADDLE_API_BASE_URL = process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT === 'sandbox'
  ? 'https://sandbox-api.paddle.com'
  : 'https://api.paddle.com'

export async function POST(request) {
  try {
    const { subscriptionId, majstorId } = await request.json()

    if (!subscriptionId || !majstorId) {
      return NextResponse.json(
        { error: 'Missing subscriptionId or majstorId' },
        { status: 400 }
      )
    }

    if (!PADDLE_API_KEY) {
      console.error('PADDLE_API_KEY not configured')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    console.log('Cancelling Paddle subscription:', subscriptionId)

    const paddleResponse = await fetch(
      `${PADDLE_API_BASE_URL}/subscriptions/${subscriptionId}/cancel`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${PADDLE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          effective_from: 'next_billing_period'
        })
      }
    )

    if (!paddleResponse.ok) {
      const errorData = await paddleResponse.json()
      console.error('Paddle API error:', errorData)
      throw new Error(errorData.error?.detail || 'Paddle cancellation failed')
    }

    const paddleData = await paddleResponse.json()
    console.log('Paddle subscription cancelled:', paddleData)

    await supabaseAdmin
      .from('user_subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('paddle_subscription_id', subscriptionId)

    await supabaseAdmin
      .from('majstors')
      .update({
        subscription_status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', majstorId)

    console.log('Subscription cancelled in database')

    return NextResponse.json({
      success: true,
      message: 'Subscription cancelled successfully',
      data: paddleData
    })

  } catch (error) {
    console.error('Cancel subscription error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to cancel subscription',
        details: error.message 
      },
      { status: 500 }
    )
  }
}