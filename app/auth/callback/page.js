// app/auth/callback/page.js
'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'

function AuthCallbackComponent() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Import supabase dynamically da izbegneš SSR probleme
        const { supabase } = await import('@/lib/supabase')
        
        const { data, error: authError } = await supabase.auth.getSession()
        
        if (authError) {
          router.push('/login?error=auth_failed')
          return
        }

        if (data.session?.user) {
          // Check if majstor profile exists
          const { data: existingProfile, error: profileError } = await supabase
            .from('majstors')
            .select('id')
            .eq('id', data.session.user.id)
            .single()

          if (profileError && profileError.code === 'PGRST116') {
            // Create minimal profile
            const response = await fetch('/api/create-profile', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: data.session.user.id,
                email: data.session.user.email,
                full_name: data.session.user.user_metadata?.name || data.session.user.email.split('@')[0]
              })
            })

            if (!response.ok) {
              setError('Profile creation failed')
              return
            }
          }

          router.push('/dashboard?welcome=true')
        } else {
          router.push('/login?error=no_session')
        }
      } catch (error) {
        setError('Authentication failed')
      } finally {
        setLoading(false)
      }
    }

    handleCallback()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white">Processing authentication...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 mb-4">{error}</div>
          <button 
            onClick={() => router.push('/login')}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Back to Login
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