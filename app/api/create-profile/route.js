// app/api/create-profile/route.js - UPDATED FOR TRIAL STRATEGY
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Service role client (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const profileData = await request.json()
    
    console.log('🛠️ Creating profile with trial strategy:', {
      id: profileData.id,
      email: profileData.email,
      source: profileData.profile_source || 'unknown'
    })

    // 🔥 SMART PROFILE GENERATION based on signup type
    let processedData = {
      id: profileData.id,
      email: profileData.email,
      subscription_status: 'trial',
      subscription_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      is_active: true,
      profile_completed: false
    }

    // 🎯 Different handling for Google OAuth vs Email
    if (profileData.profile_source === 'google_oauth') {
      // Google OAuth - We have real data, create full profile
      processedData = {
        ...processedData,
        full_name: profileData.full_name || profileData.email.split('@')[0],
        business_name: profileData.business_name || null,
        phone: profileData.phone || null,
        city: profileData.city || null,
        slug: generateSlug(profileData.full_name || profileData.email.split('@')[0]),
        profile_completed: true, // Google users get full profile immediately
        profile_source: 'google_oauth'
      }
    } else {
      // Email signup - Minimal profile for trial
      const tempName = profileData.full_name || profileData.email.split('@')[0]
      processedData = {
        ...processedData,
        full_name: tempName,
        slug: generateSlug(tempName),
        profile_completed: false, // Email users complete profile later
        profile_source: 'email_signup'
      }
    }

    console.log('📝 Processed profile data:', processedData)

    // Insert into majstors table
    const { data, error } = await supabaseAdmin
      .from('majstors')
      .insert(processedData)
      .select()
      .single()

    if (error) {
      console.error('❌ Database error:', error)
      
      // Handle duplicate key errors gracefully
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Ein Profil mit dieser E-Mail-Adresse existiert bereits' },
          { status: 409 }
        )
      }
      
      throw error
    }

    console.log('✅ Profile created successfully:', {
      id: data.id,
      name: data.full_name,
      source: data.profile_source,
      trial_ends: data.subscription_ends_at
    })

    return NextResponse.json({ 
      success: true, 
      profile: data,
      trial_info: {
        status: 'trial',
        ends_at: data.subscription_ends_at,
        days_remaining: 7
      }
    })

  } catch (error) {
    console.error('❌ API error:', error)
    return NextResponse.json(
      { error: error.message || 'Fehler beim Erstellen des Profils' },
      { status: 500 }
    )
  }
}

// 🔧 Helper function to generate URL-safe slug
function generateSlug(name) {
  if (!name) return 'handwerker-' + Date.now()
  
  return name
    .toLowerCase()
    .replace(/[äöüß]/g, (match) => {
      const map = { 'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss' }
      return map[match] || match
    })
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 40) + '-' + Date.now().toString().slice(-6)
}