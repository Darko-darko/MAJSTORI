// app/api/paddle/cancel-subscription/route.js
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

/**
 * 🚫 PADDLE CANCEL SUBSCRIPTION API
 * Cancels a Paddle subscription via Paddle API
 * 
 * This endpoint is called from the frontend when a user wants to cancel their subscription
 */

// Supabase Admin Client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// Paddle API Configuration
const PADDLE_API_KEY = process.env.PADDLE_API_KEY
const PADDLE_API_BASE_URL = process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT === 'sandbox'
  ? 'https://sandbox-api.paddle.com'
  : 'https://api.paddle.com'

/**
 * 🚫 POST Handler - Cancel Paddle Subscription
 */
export async function POST(request) {
  try {
    // 1️⃣ Parse request body
    const { subscriptionId, majstorId } = await request.json()

    if (!subscriptionId || !majstorId) {
      return NextResponse.json(
        { error: 'Missing subscriptionId or majstorId' },
        { status: 400 }
      )
    }

    console.log('🚫 Cancelling Paddle subscription:', subscriptionId)

    // 2️⃣ Call Paddle API to cancel subscription
    const paddleResponse = await fetch(
      `${PADDLE_API_BASE_URL}/subscriptions/${subscriptionId}/cancel`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${PADDLE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          effective_from: 'next_billing_period' // Cancel at end of billing period
        })
      }
    )

    if (!paddleResponse.ok) {
      const errorData = await paddleResponse.json()
      console.error('❌ Paddle API error:', errorData)
      throw new Error(errorData.error?.detail || 'Paddle cancellation failed')
    }

    const paddleData = await paddleResponse.json()
    console.log('✅ Paddle subscription cancelled:', paddleData)

    // 3️⃣ Update subscription in Supabase
    const { error: updateError } = await supabaseAdmin
      .from('user_subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('paddle_subscription_id', subscriptionId)

    if (updateError) {
      console.error('❌ Supabase update error:', updateError)
      throw updateError
    }

    // 4️⃣ Update majstor record
    await supabaseAdmin
      .from('majstors')
      .update({
        subscription_status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', majstorId)

    console.log('✅ Subscription cancelled in database')

    // 5️⃣ Return success
    return NextResponse.json({
      success: true,
      message: 'Subscription cancelled successfully',
      data: paddleData
    })

  } catch (error) {
    console.error('❌ Cancel subscription error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to cancel subscription',
        details: error.message 
      },
      { status: 500 }
    )
  }
}