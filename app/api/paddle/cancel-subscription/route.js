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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS(request) {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function POST(request) {
  try {
    console.log('🚫 Cancel subscription request received')
    
    const { subscriptionId, majstorId } = await request.json()

    if (!subscriptionId || !majstorId) {
      console.error('❌ Missing subscriptionId or majstorId')
      return NextResponse.json(
        { error: 'Missing subscriptionId or majstorId' },
        { status: 400, headers: corsHeaders }
      )
    }

    console.log('📋 Subscription ID:', subscriptionId)
    console.log('👤 Majstor ID:', majstorId)

    if (!PADDLE_API_KEY) {
      console.error('❌ PADDLE_API_KEY not configured')
      return NextResponse.json(
        { 
          error: 'Paddle API key not configured',
          hint: 'Add PADDLE_API_KEY to environment variables'
        },
        { status: 500, headers: corsHeaders }
      )
    }

    console.log('🔗 Calling Paddle API to cancel subscription...')
    console.log('URL:', `${PADDLE_API_BASE_URL}/subscriptions/${subscriptionId}/cancel`)
    
    const paddleResponse = await fetch(
      `${PADDLE_API_BASE_URL}/subscriptions/${subscriptionId}/cancel`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${PADDLE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          effective_from: 'next_billing_period' // Otkazuje na kraju billing perioda
        })
      }
    )

    console.log('📡 Paddle response status:', paddleResponse.status)
    
    const responseText = await paddleResponse.text()
    console.log('📄 Paddle response (first 300 chars):', responseText.substring(0, 300))

    if (!paddleResponse.ok) {
      let errorData
      try {
        errorData = JSON.parse(responseText)
      } catch (e) {
        console.error('❌ Failed to parse Paddle error response')
        return NextResponse.json(
          { 
            error: 'Paddle API error',
            details: responseText.substring(0, 200),
            status: paddleResponse.status
          },
          { status: paddleResponse.status, headers: corsHeaders }
        )
      }

      console.error('❌ Paddle API error:', errorData)
      return NextResponse.json(
        { 
          error: errorData.error?.detail || errorData.error?.message || 'Paddle cancellation failed',
          details: errorData,
          paddleStatus: paddleResponse.status
        },
        { status: paddleResponse.status, headers: corsHeaders }
      )
    }

    const paddleData = JSON.parse(responseText)
    console.log('✅ Paddle subscription cancelled successfully!')
    console.log('📋 Paddle data:', JSON.stringify(paddleData, null, 2))

    // Update user_subscriptions
    console.log('💾 Updating user_subscriptions in Supabase...')
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
      // Don't fail the request if DB update fails - Paddle already cancelled
    } else {
      console.log('✅ user_subscriptions updated')
    }

    // Update majstors table
    console.log('💾 Updating majstors table...')
    const { error: majstorUpdateError } = await supabaseAdmin
      .from('majstors')
      .update({
        subscription_status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', majstorId)

    if (majstorUpdateError) {
      console.error('❌ Majstor update error:', majstorUpdateError)
    } else {
      console.log('✅ majstors table updated')
    }

    console.log('✅ Subscription cancellation complete!')

    return NextResponse.json(
      {
        success: true,
        message: 'Subscription cancelled successfully',
        data: paddleData,
        effectiveFrom: 'next_billing_period'
      },
      { headers: corsHeaders }
    )

  } catch (error) {
    console.error('💥 Cancel subscription error:', error)
    console.error('Stack:', error.stack)
    
    return NextResponse.json(
      { 
        error: 'Failed to cancel subscription',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500, headers: corsHeaders }
    )
  }
}