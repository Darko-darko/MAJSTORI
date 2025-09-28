// app/auth/callback/page.js - UPDATED for welcome flow
'use client'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'

function AuthCallbackComponent() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('🔐 Processing auth callback...')
        
        // Import supabase dynamically da izbegneš SSR probleme
        const { supabase } = await import('@/lib/supabase')
        
        const { data, error: authError } = await supabase.auth.getSession()
        
        if (authError) {
          console.error('❌ Auth error:', authError)
          router.push('/login?error=auth_failed')
          return
        }

        if (data.session?.user) {
          console.log('✅ User authenticated:', data.session.user.email)
          
          // Check if majstor profile exists
          const { data: existingProfile, error: profileError } = await supabase
            .from('majstors')
            .select('id, subscription_status')
            .eq('id', data.session.user.id)
            .single()

          if (profileError && profileError.code === 'PGRST116') {
            // No profile - create one
            console.log('🛠️ Creating missing profile...')
            await createMissingProfile(data.session.user)
          } else if (profileError) {
            console.error('❌ Profile error:', profileError)
            setError('Profile access error: ' + profileError.message)
            return
          }

          // 🔥 NEW: Check for welcome redirect
          const nextParam = searchParams.get('next')
          
          if (nextParam === 'welcome') {
            console.log('🎯 Redirecting to welcome/choose-plan...')
            router.push('/welcome/choose-plan')
          } else if (existingProfile && !existingProfile.subscription_status) {
            // Existing user without subscription setup - send to welcome
            console.log('🎯 Existing user without subscription - redirecting to welcome...')
            router.push('/welcome/choose-plan')
          } else {
            // Normal login flow
            console.log('📊 Redirecting to dashboard...')
            router.push('/dashboard?welcome=true')
          }
        } else {
          console.log('❌ No session found')
          router.push('/login?error=no_session')
        }
      } catch (error) {
        console.error('❌ Unexpected error in auth callback:', error)
        setError('Authentication failed: ' + error.message)
      } finally {
        setLoading(false)
      }
    }

    handleCallback()
  }, [router, searchParams])

  const createMissingProfile = async (user) => {
    try {
      console.log('🛠️ Creating missing profile for:', user.email)
      
      const displayName = user.user_metadata?.full_name || 
                         user.user_metadata?.name || 
                         user.email?.split('@')[0] || 
                         'Handwerker'
      
      const profileData = {
        id: user.id,
        email: user.email,
        full_name: displayName,
        business_name: user.user_metadata?.business_name || null,
        phone: user.user_metadata?.phone || null,
        city: user.user_metadata?.city || null,
        // 🔥 REMOVED: No automatic subscription setup
        // subscription_status: 'trial',
        // subscription_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        is_active: true,
        profile_completed: false,
        profile_source: user.user_metadata?.provider === 'google' ? 'google_oauth' : 'missing_profile'
      }

      const response = await fetch('/api/create-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData)
      })

      if (response.ok) {
        const result = await response.json()
        console.log('✅ Missing profile created successfully')
        setError('')
      } else {
        const errorData = await response.json()
        console.error('❌ Profile creation failed:', errorData)
        setError('Failed to create profile: ' + errorData.error)
      }
      
    } catch (err) {
      console.error('❌ Exception in createMissingProfile:', err)
      setError('Profile creation failed: ' + err.message)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-xl mb-4">Verarbeitung der Anmeldung...</div>
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-400 mb-4 text-lg">Anmeldefehler</div>
          <div className="text-slate-300 mb-6">{error}</div>
          <button 
            onClick={() => router.push('/login')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Zurück zur Anmeldung
          </button>
        </div>
      </div>
    )
  }

  return null
}

// Export with dynamic import to avoid SSR
export default dynamic(() => Promise.resolve(AuthCallbackComponent), {
  ssr: false
})