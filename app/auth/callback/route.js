// app/auth/callback/route.js
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request) {
  console.log('🔥 Auth callback started')
  
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')

  console.log('📋 Callback params:', { code: !!code, error })

  if (error) {
    console.error('OAuth error:', error)
    return NextResponse.redirect(new URL('/login?error=oauth_error', requestUrl.origin))
  }

  if (!code) {
    console.error('No code provided')
    return NextResponse.redirect(new URL('/login?error=no_code', requestUrl.origin))
  }

  const supabase = createRouteHandlerClient({ cookies })

  try {
    console.log('🔄 Exchanging code for session...')
    const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (sessionError) {
      console.error('Session exchange error:', sessionError)
      return NextResponse.redirect(new URL('/login?error=session_failed', requestUrl.origin))
    }

    if (data.user) {
      console.log('✅ User authenticated:', data.user.email)
      
      // Čekaj da trigger kreira profil
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      console.log('🏠 Redirecting to dashboard')
      return NextResponse.redirect(new URL('/dashboard?welcome=true', requestUrl.origin))
    }

    return NextResponse.redirect(new URL('/login?error=no_user', requestUrl.origin))

  } catch (error) {
    console.error('Callback processing error:', error)
    return NextResponse.redirect(new URL('/login?error=callback_failed', requestUrl.origin))
  }
}