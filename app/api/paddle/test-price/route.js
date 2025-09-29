// app/api/paddle/test-price/route.js - Test Paddle Price API
import { NextResponse } from 'next/server'

/**
 * 🧪 TEST PADDLE PRICE API
 * Check if Price ID is valid and retrieve its details
 */

const PADDLE_API_KEY = process.env.PADDLE_API_KEY
const PADDLE_API_BASE_URL = process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT === 'sandbox'
  ? 'https://sandbox-api.paddle.com'
  : 'https://api.paddle.com'

export async function POST(request) {
  try {
    const { priceId } = await request.json()

    if (!priceId) {
      return NextResponse.json(
        { error: 'Missing priceId' },
        { status: 400 }
      )
    }

    if (!PADDLE_API_KEY) {
      return NextResponse.json(
        { error: 'PADDLE_API_KEY not configured' },
        { status: 500 }
      )
    }

    console.log(`🧪 Testing Price ID: ${priceId}`)

    // Call Paddle API to get price details
    const response = await fetch(
      `${PADDLE_API_BASE_URL}/prices/${priceId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${PADDLE_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    )

    const data = await response.json()

    if (!response.ok) {
      console.error('❌ Paddle API error:', data)
      return NextResponse.json(
        { 
          error: 'Paddle API error',
          status: response.status,
          details: data
        },
        { status: response.status }
      )
    }

    console.log('✅ Price found:', data)

    return NextResponse.json({
      success: true,
      price: data,
      message: 'Price ID is valid'
    })

  } catch (error) {
    console.error('❌ Error testing price:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to test price',
        details: error.message 
      },
      { status: 500 }
    )
  }
}