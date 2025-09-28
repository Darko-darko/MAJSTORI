// app/api/create-profile/route.js - UPDATED for welcome flow
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const profileData = await request.json()
    
    console.log('🛠️ Creating profile for:', profileData.email)

    // Validate required fields
    if (!profileData.id || !profileData.email) {
      return NextResponse.json({
        success: false,
        error: 'ID und E-Mail sind erforderlich'
      }, { status: 400 })
    }

    // Check if profile already exists
    const { data: existing } = await supabase
      .from('majstors')
      .select('id')
      .eq('id', profileData.id)
      .single()

    if (existing) {
      console.log('✅ Profile already exists for:', profileData.email)
      return NextResponse.json({
        success: true,
        profile: existing,
        message: 'Profile already exists'
      })
    }

    // Prepare profile data - 🔥 REMOVED automatic subscription setup
    const insertData = {
      id: profileData.id,
      email: profileData.email,
      full_name: profileData.full_name || profileData.email.split('@')[0],
      business_name: profileData.business_name || null,
      phone: profileData.phone || null,
      city: profileData.city || null,
      address: profileData.address || null,
      website: profileData.website || null,
      is_active: profileData.is_active !== undefined ? profileData.is_active : true,
      profile_completed: profileData.profile_completed !== undefined ? profileData.profile_completed : false,
      profile_source: profileData.profile_source || 'api_creation',
      signup_method: profileData.signup_method || 'unknown',
      
      // 🔥 SUBSCRIPTION FIELDS - Only set if explicitly provided
      subscription_status: profileData.subscription_status || null,
      subscription_ends_at: profileData.subscription_ends_at || null,
      
      // Auto-generate slug if name provided
      slug: profileData.full_name 
        ? profileData.full_name
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, '')
            .substring(0, 50) + '-' + Math.random().toString(36).substring(2, 8)
        : null,
      
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    console.log('📝 Inserting profile data:', {
      email: insertData.email,
      full_name: insertData.full_name,
      subscription_status: insertData.subscription_status || 'NONE SET',
      profile_source: insertData.profile_source
    })

    // Insert profile
    const { data: newProfile, error: insertError } = await supabase
      .from('majstors')
      .insert(insertData)
      .select()
      .single()

    if (insertError) {
      console.error('❌ Profile creation error:', insertError)
      throw new Error(`Database error: ${insertError.message}`)
    }

    console.log('✅ Profile created successfully:', newProfile.id)

    // 🔥 REMOVED: Automatic trial creation
    // No longer automatically creating trial subscriptions here
    // User will choose their plan in /welcome/choose-plan

    return NextResponse.json({
      success: true,
      profile: newProfile,
      message: 'Profile created successfully'
    })

  } catch (error) {
    console.error('❌ Create profile API error:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Ein unerwarteter Fehler ist aufgetreten'
    }, { status: 500 })
  }
}