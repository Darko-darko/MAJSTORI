import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Service role client (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// 🔥 POSTOJEĆI POST - za kreiranje inquiry
export async function POST(request) {
  try {
    const body = await request.json()
    
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
        subject,
        message,
        status: 'new',
        priority: priority,                                   // 🔥 MAPPED URGENCY → PRIORITY
        urgency: body.urgency || 'normal',                   // Original urgency value
        preferred_contact: body.preferred_contact || 'email',
        source: body.source || 'business_card',
        description: body.description || message,
        service_type: body.service_type || null
      })
      .select()
      .single()

    if (inquiryError) {
      console.error('Error creating inquiry:', inquiryError)
      return NextResponse.json(
        { error: 'Failed to create inquiry' },
        { status: 500 }
      )
    }

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
        console.error('Error saving images:', imagesError)
        // Don't fail the whole request if images fail
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
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// 🔥 NOVI PATCH - za update status/priority
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
      console.error('Error updating inquiry:', updateError)
      return NextResponse.json(
        { error: 'Failed to update inquiry' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { 
        success: true, 
        inquiry: inquiry 
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}