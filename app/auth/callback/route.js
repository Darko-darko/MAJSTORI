// app/auth/callback/route.js - GOOGLE OAUTH CALLBACK HANDLER
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    try {
      // Exchange code for session
      const { data: { user }, error: authError } = await supabase.auth.exchangeCodeForSession(code)
      
      if (authError) {
        console.error('❌ Auth callback error:', authError)
        return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
      }

      if (user) {
        console.log('✅ Google OAuth successful for:', user.email)

        // 🔥 Check if profile already exists
        const { data: existingProfile } = await supabase
          .from('majstors')
          .select('id, profile_completed, subscription_status')
          .eq('id', user.id)
          .single()

        if (existingProfile) {
          // Existing user - redirect to dashboard
          console.log('👤 Existing user logged in:', user.email)
          return NextResponse.redirect(`${origin}/dashboard`)
        } else {
          // 🎯 NEW GOOGLE USER - Create profile with real data
          console.log('🆕 Creating new Google OAuth profile for:', user.email)
          
          const googleProfileData = {
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email.split('@')[0],
            phone: user.user_metadata?.phone || null,
            profile_source: 'google_oauth'
          }

          // Create profile via API
          const response = await fetch(`${origin}/api/create-profile`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(googleProfileData)
          })

          if (response.ok) {
            console.log('✅ Google OAuth profile created successfully')
            return NextResponse.redirect(`${origin}/dashboard?welcome=true&trial=true&source=google`)
          } else {
            console.error('❌ Failed to create Google OAuth profile')
            return NextResponse.redirect(`${origin}/login?error=profile_creation_failed`)
          }
        }
      }

    } catch (error) {
      console.error('❌ Callback processing error:', error)
      return NextResponse.redirect(`${origin}/login?error=callback_processing_failed`)
    }
  }

  // No code parameter - redirect to login
  return NextResponse.redirect(`${origin}/login?error=no_auth_code`)
}