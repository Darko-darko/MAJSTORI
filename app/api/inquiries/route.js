// app/api/inquiries/route.js - WITH TURNSTILE + HONEYPOT PROTECTION
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Service role client (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// 🔥 TURNSTILE: Validate token with Cloudflare API
async function verifyTurnstileToken(token) {
  try {
    const response = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          secret: process.env.TURNSTILE_SECRET_KEY,
          response: token,
        }),
      }
    )

    const data = await response.json()
    
    console.log('🔒 Turnstile verification result:', {
      success: data.success,
      challenge_ts: data.challenge_ts,
      hostname: data.hostname,
      error_codes: data['error-codes']
    })

    return data.success
  } catch (error) {
    console.error('❌ Turnstile verification error:', error)
    return false
  }
}

// 🔥 POST - Create inquiry with DUAL PROTECTION (Turnstile + Honeypot)
export async function POST(request) {
  try {
    const body = await request.json()
    
    // 🍯 HONEYPOT CHECK: If website_url is filled, it's likely a bot
    if (body.website_url && body.website_url.trim() !== '') {
      console.warn('🍯 Honeypot triggered! Bot detected:', body.customer_email || 'unknown')
      
      // Don't tell the bot it failed - return fake success
      return NextResponse.json(
        { 
          success: true,
          inquiry: {
            id: 'honeypot-' + Date.now(),
            status: 'blocked'
          }
        },
        { status: 201 }
      )
    }
    
    // 🔥 TURNSTILE: Validate bot protection token
    const { turnstileToken } = body
    
    if (!turnstileToken) {
      console.warn('⚠️ Missing Turnstile token from:', body.customer_email || 'unknown')
      return NextResponse.json(
        { error: 'Security verification required' },
        { status: 400 }
      )
    }

    const isValidToken = await verifyTurnstileToken(turnstileToken)
    
    if (!isValidToken) {
      console.warn('⚠️ Invalid Turnstile token from:', body.customer_email || 'unknown')
      return NextResponse.json(
        { error: 'Security verification failed' },
        { status: 400 }
      )
    }

    console.log('✅ Security checks passed (Turnstile + Honeypot)')
    
    // Validate required fields
    const { majstor_id, customer_name, customer_email, subject, message } = body
    
    if (!majstor_id || !customer_name || !customer_email || !subject || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // 🔥 URGENCY MAPPING: emergency/high/normal/low → urgent/high/normal/low
    let priority = 'normal'
    
    if (body.urgency === 'emergency') {
      priority = 'urgent'
    } else if (body.urgency === 'high') {
      priority = 'high'  
    } else if (body.urgency === 'low') {
      priority = 'low'
    }
    // else priority remains 'normal'

    // Insert inquiry with mapped priority
    const { data: inquiry, error: inquiryError } = await supabaseAdmin
      .from('inquiries')
      .insert({
        majstor_id,
        customer_name,
        customer_email,
        customer_phone: body.customer_phone || null,
        customer_address: body.customer_address || null,
        subject,
        message,
        status: 'new',
        priority: priority,
        urgency: body.urgency || 'normal',
        preferred_contact: body.preferred_contact || 'email',
        source: body.source || 'business_card',
        description: body.description || message,
        service_type: body.service_type || null
      })
      .select()
      .single()

    if (inquiryError) {
      console.error('❌ Error creating inquiry:', inquiryError)
      return NextResponse.json(
        { error: 'Failed to create inquiry' },
        { status: 500 }
      )
    }

    console.log('✅ Inquiry created successfully:', inquiry.id)

    // Handle images if any
    if (body.images && body.images.length > 0) {
      const imagePromises = body.images.map(imageUrl => ({
        inquiry_id: inquiry.id,
        image_url: imageUrl,
        filename: imageUrl.split('/').pop()
      }))

      const { error: imagesError } = await supabaseAdmin
        .from('inquiry_images')
        .insert(imagePromises)

      if (imagesError) {
        console.error('⚠️ Error saving images:', imagesError)
        // Don't fail the whole request if images fail
      } else {
        console.log('✅ Images saved:', body.images.length)
      }
    }

    return NextResponse.json(
      { 
        success: true, 
        inquiry: inquiry 
      },
      { status: 201 }
    )

  } catch (error) {
    console.error('💥 API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// 🔥 PATCH - Update status/priority (unchanged)
export async function PATCH(request) {
  try {
    const body = await request.json()
    
    // Validate required fields
    const { inquiry_id, status, priority, majstor_id } = body
    
    if (!inquiry_id || !majstor_id) {
      return NextResponse.json(
        { error: 'Missing inquiry_id or majstor_id' },
        { status: 400 }
      )
    }

    // Prepare update data
    const updateData = {
      updated_at: new Date().toISOString()
    }

    if (status) {
      updateData.status = status
    }

    if (priority) {
      updateData.priority = priority
    }

    // Update inquiry using service role (bypasses RLS)
    const { data: inquiry, error: updateError } = await supabaseAdmin
      .from('inquiries')
      .update(updateData)
      .eq('id', inquiry_id)
      .eq('majstor_id', majstor_id) // Security: only update own inquiries
      .select()
      .single()

    if (updateError) {
      console.error('❌ Error updating inquiry:', updateError)
      return NextResponse.json(
        { error: 'Failed to update inquiry' },
        { status: 500 }
      )
    }

    console.log('✅ Inquiry updated successfully:', inquiry.id)

    return NextResponse.json(
      { 
        success: true, 
        inquiry: inquiry 
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('💥 API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}