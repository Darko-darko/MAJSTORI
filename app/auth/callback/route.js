// app/auth/callback/route.js
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=no_code', requestUrl.origin))
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  try {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('Session exchange error:', error)
      return NextResponse.redirect(new URL('/login?error=session_failed', requestUrl.origin))
    }

    if (data.user) {
      // Proveri da li profil postoji
      const { data: existingProfile } = await supabaseAdmin
        .from('majstors')
        .select('id')
        .eq('id', data.user.id)
        .single()

      if (!existingProfile) {
        // Kreiraj profil preko service role
        await supabaseAdmin
          .from('majstors')
          .insert({
            id: data.user.id,
            email: data.user.email,
            full_name: data.user.user_metadata?.name || data.user.email.split('@')[0],
            slug: `google-${data.user.id.slice(-8)}-${Date.now()}`,
            is_active: true,
            subscription_status: 'trial',
            subscription_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            profile_source: 'google_oauth',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
      }
      
      return NextResponse.redirect(new URL('/dashboard?welcome=true', requestUrl.origin))
    }

  } catch (error) {
    console.error('Callback error:', error)
    return NextResponse.redirect(new URL('/login?error=callback_failed', requestUrl.origin))
  }
}