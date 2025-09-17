const handleCallback = async () => {
  try {
    console.log('Auth callback page started')
    
    const { data, error: authError } = await supabase.auth.getSession()
    
    if (authError) {
      console.error('Auth error:', authError)
      router.push('/login?error=auth_failed')
      return
    }

    if (data.session?.user) {
      console.log('User authenticated:', data.session.user.email)
      
      // Check if majstor profile exists
      const { data: existingProfile, error: profileError } = await supabase
        .from('majstors')
        .select('id')
        .eq('id', data.session.user.id)
        .single()

      if (profileError && profileError.code === 'PGRST116') {
        console.log('Creating MINIMAL majstor profile...')
        
        // MINIMALNI pristup - samo obavezne kolone
        const response = await fetch('/api/create-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: data.session.user.id,
            email: data.session.user.email,
            full_name: data.session.user.user_metadata?.name || data.session.user.email.split('@')[0]
            // Bez slug, subscription_status, subscription_ends_at itd.
            // Sve ostalo će biti NULL i popuniti će se kasnije
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