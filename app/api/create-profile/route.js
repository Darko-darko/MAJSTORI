import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Service role client (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const profileData = await request.json()
    
    console.log('Creating profile:', profileData)
    
    // Insert into majstors table using service role
    const { data, error } = await supabaseAdmin
      .from('majstors')
      .insert(profileData)
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      throw error
    }

    console.log('Profile created successfully:', data.id)

    return NextResponse.json({ 
      success: true, 
      profile: data 
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}