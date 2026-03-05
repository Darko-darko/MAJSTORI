// app/api/partner/stats/route.js
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Verify user and check is_partner
    const { data: { user } } = await admin.auth.getUser(token)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await admin
      .from('majstors')
      .select('id, full_name, ref_code, commission_rate, is_partner')
      .eq('id', user.id)
      .single()

    if (!profile?.is_partner) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

    // Fetch referred users with subscriptions (service role bypasses RLS)
    const { data: referred } = await admin
      .from('majstors')
      .select(`
        id, full_name, email, created_at,
        user_subscriptions ( status, created_at )
      `)
      .eq('referred_by', profile.ref_code)
      .order('created_at', { ascending: false })

    return NextResponse.json({ profile, referred: referred || [] })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
