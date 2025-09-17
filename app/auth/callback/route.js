// app/auth/callback/route.js
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request) {
  console.log('🔥 CALLBACK HANDLER STARTED')
  
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  console.log('📋 Request URL:', request.url)
  console.log('📋 Code present:', !!code)

  if (!code) {
    console.log('❌ No code parameter')
    return NextResponse.redirect(new URL('/login?error=no_code', requestUrl.origin))
  }

  // Regular supabase client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  // Service role client  
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  console.log('🔧 Environment check:', {
    hasURL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
  })

  try {
    console.log('🔄 Exchanging code for session...')
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('❌ Session exchange error:', error)
      return NextResponse.redirect(new URL('/login?error=session_failed', requestUrl.origin))
    }

    if (!data.user) {
      console.error('❌ No user in session data')
      return NextResponse.redirect(new URL('/login?error=no_user', requestUrl.origin))
    }

    console.log('✅ User authenticated:', data.user.email)
    console.log('👤 User metadata:', data.user.user_metadata)

    // Check if profile exists
    console.log('🔍 Checking for existing majstor profile...')
    const { data: existingProfile, error: profileError } = await supabaseAdmin
      .from('majstors')
      .select('id, full_name')
      .eq('id', data.user.id)
      .single()

    console.log('📊 Profile check result:', { existingProfile, profileError })

    if (!existingProfile && profileError?.code === 'PGRST116') {
      console.log('🏗️ Creating new majstor profile...')
      
      const profileData = {
        id: data.user.id,
        email: data.user.email,
        full_name: data.user.user_metadata?.name || data.user.user_metadata?.full_name || data.user.email.split('@')[0],
        slug: `google-${data.user.id.slice(-8)}-${Date.now()}`,
        is_active: true,
        subscription_status: 'trial',
        subscription_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        profile_source: 'google_oauth',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      console.log('📝 Profile data to insert:', profileData)

      const { data: insertResult, error: insertError } = await supabaseAdmin
        .from('majstors')
        .insert(profileData)
        .select()

      if (insertError) {
        console.error('❌ Profile creation error:', insertError)
        return NextResponse.redirect(new URL('/login?error=profile_creation_failed', requestUrl.origin))
      }

      console.log('✅ Profile created successfully:', insertResult)
    } else if (existingProfile) {
      console.log('👤 Profile already exists:', existingProfile.full_name)
    } else {
      console.error('❌ Unexpected profile check error:', profileError)
    }
    
    console.log('🏠 Redirecting to dashboard')
    return NextResponse.redirect(new URL('/dashboard?welcome=true', requestUrl.origin))

  } catch (error) {
    console.error('💥 Callback processing error:', error)
    return NextResponse.redirect(new URL('/login?error=callback_failed', requestUrl.origin))
  }
}