// app/auth/callback/route.js
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// Service role client za bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  
  console.log('1. Auth callback triggered with code:', !!code)

  if (code) {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    try {
      // Exchange code for session
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      console.log('2. Auth exchange result:', {
        user: data?.user?.email,
        error: error?.message
      })
      
      if (error) {
        console.error('Auth callback error:', error)
        return NextResponse.redirect(`${requestUrl.origin}/login?error=auth_failed`)
      }

      if (data.user) {
        console.log('3. User authenticated successfully')
        
        // Proverite da li profil već postoji
        const { data: existingProfile, error: checkError } = await supabaseAdmin
          .from('majstors')
          .select('id, slug')
          .eq('id', data.user.id)
          .single()

        console.log('4. Profile check result:', {
          exists: !!existingProfile,
          error: checkError?.message
        })

        let isNewUser = false

        // Ako profil ne postoji, kreiraj ga
        if (!existingProfile) {
          console.log('5. Creating new profile for user...')
          isNewUser = true
          
          const displayName = data.user.user_metadata?.full_name || 
                            data.user.user_metadata?.name || 
                            data.user.email?.split('@')[0] || 
                            'Handwerker'
          
          // Generiši unique slug
          const baseSlug = displayName
            .toLowerCase()
            .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, '')
            .substring(0, 40)
          
          const slug = `${baseSlug}-${Date.now()}`

          const profileData = {
            id: data.user.id,
            email: data.user.email,
            full_name: displayName,
            business_name: data.user.user_metadata?.business_name || null,
            phone: data.user.user_metadata?.phone || null,
            city: data.user.user_metadata?.city || null,
            slug: slug,
            subscription_status: 'trial',
            subscription_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            is_active: true
          }

          console.log('6. Creating profile with data:', {
            email: profileData.email,
            name: profileData.full_name,
            slug: profileData.slug
          })

          // Koristi service role da bypasses RLS
          const { data: newProfile, error: profileError } = await supabaseAdmin
            .from('majstors')
            .insert(profileData)
            .select('id, slug')
            .single()

          if (profileError) {
            console.error('7. Profile creation failed:', profileError)
            // Ne prekidaj tok - korisnik može kasnije da dopuni profil
          } else {
            console.log('7. Profile created successfully:', newProfile.id)
          }
        }

        // Redirect na odgovarajuću stranicu
        const redirectUrl = isNewUser 
          ? `${requestUrl.origin}/dashboard?welcome=true`
          : `${requestUrl.origin}/dashboard`
        
        console.log('8. Redirecting to:', redirectUrl)
        return NextResponse.redirect(redirectUrl)
      }
      
    } catch (err) {
      console.error('Auth callback exception:', err)
      return NextResponse.redirect(`${requestUrl.origin}/login?error=callback_error`)
    }
  }

  // Ako nema code, vrati na login
  console.log('No auth code provided, redirecting to login')
  return NextResponse.redirect(`${requestUrl.origin}/login`)
}