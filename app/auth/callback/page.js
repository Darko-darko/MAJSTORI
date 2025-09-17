'use client'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallback() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    handleCallback()
  }, [])

  const handleCallback = async () => {
    try {
      console.log('Auth callback page started')
      
      // Handle the auth callback
      const { data, error: authError } = await supabase.auth.getSession()
      
      if (authError) {
        console.error('Auth error:', authError)
        router.push('/login?error=auth_failed')
        return
      }

      if (data.session?.user) {
        console.log('User authenticated:', data.session.user.email)
        
        // Check if majstor profile exists
        const { data: profile, error: profileError } = await supabase
          .from('majstors')
          .select('id')
          .eq('id', data.session.user.id)
          .single()

        if (profileError && profileError.code === 'PGRST116') {
          console.log('Creating majstor profile...')
          // No profile - create via API
          const response = await fetch('/api/create-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: data.session.user.id,
              email: data.session.user.email,
              full_name: data.session.user.user_metadata?.name || data.session.user.email.split('@')[0],
              slug: `google-${data.session.user.id.slice(-8)}-${Date.now()}`,
              subscription_status: 'trial',
              subscription_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
              is_active: true,
              profile_source: 'google_oauth'
            })
          })

          if (!response.ok) {
            console.error('Profile creation failed')
            setError('Profile creation failed')
            return
          }
        }

        router.push('/dashboard?welcome=true')
      } else {
        router.push('/login?error=no_session')
      }
    } catch (error) {
      console.error('Callback error:', error)
      setError('Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-white text-xl">Anmeldung wird verarbeitet...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">{error}</div>
          <button 
            onClick={() => router.push('/login')}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Zur Anmeldung
          </button>
        </div>
      </div>
    )
  }

  return null
}