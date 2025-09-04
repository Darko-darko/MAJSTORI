// app/auth/callback/route.js
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('Auth callback error:', error)
        return NextResponse.redirect(`${requestUrl.origin}/login?error=auth_failed`)
      }

      if (data.user) {
        console.log('User authenticated:', data.user.email)
        
        // Proverite da li user već postoji u majstors tabeli
        const { data: existingProfile } = await supabase
          .from('majstors')
          .select('id')
          .eq('id', data.user.id)
          .single()

        // Ako ne postoji, kreiraj profil
        if (!existingProfile) {
          console.log('Creating new profile for Google user')
          
          const displayName = data.user.user_metadata?.full_name || 
                            data.user.user_metadata?.name || 
                            data.user.email?.split('@')[0] || 
                            'Handwerker'
          
          const slug = displayName
            .toLowerCase()
            .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, '')
            .substring(0, 50)

          const profileData = {
            id: data.user.id,
            email: data.user.email,
            full_name: displayName,
            slug: slug + '-' + Date.now(), // Dodaj timestamp da izbegnemo duplikate
            subscription_status: 'trial',
            subscription_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          }

          const { error: profileError } = await supabase
            .from('majstors')
            .insert(profileData)

          if (profileError) {
            console.error('Profile creation failed:', profileError)
            // Nastavi dalje - korisnik će moći da dopuni profil kasnije
          }
        }

        // Redirect to dashboard sa welcome porukom za nove korisnike
        const redirectUrl = existingProfile 
          ? `${requestUrl.origin}/dashboard`
          : `${requestUrl.origin}/dashboard?welcome=true`
        
        return NextResponse.redirect(redirectUrl)
      }
      
    } catch (err) {
      console.error('Auth callback exception:', err)
      return NextResponse.redirect(`${requestUrl.origin}/login?error=callback_error`)
    }
  }

  // Ako nema code, redirect na login
  return NextResponse.redirect(`${requestUrl.origin}/login`)
}