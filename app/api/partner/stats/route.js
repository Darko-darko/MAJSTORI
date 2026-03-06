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

    const { data: { user } } = await admin.auth.getUser(token)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await admin
      .from('majstors')
      .select('id, full_name, ref_code, commission_rate, is_partner')
      .eq('id', user.id)
      .single()

    if (!profile?.is_partner) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

    const { data: referred } = await admin
      .from('majstors')
      .select(`
        id, full_name, email, created_at,
        user_subscriptions ( status, created_at )
      `)
      .eq('referred_by', profile.ref_code)
      .order('created_at', { ascending: false })

    const { data: payouts } = await admin
      .from('partner_payouts')
      .select('month, amount, paid_at, confirmed_at')
      .eq('partner_id', user.id)

    return NextResponse.json({ profile, referred: referred || [], payouts: payouts || [] })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// PATCH { month } — partner confirms receipt of payment
export async function PATCH(request) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const { data: { user } } = await admin.auth.getUser(token)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await admin
      .from('majstors')
      .select('id, is_partner')
      .eq('id', user.id)
      .single()

    if (!profile?.is_partner) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

    const { month } = await request.json()
    if (!month) return NextResponse.json({ error: 'month erforderlich' }, { status: 400 })

    const { error: dbError } = await admin
      .from('partner_payouts')
      .update({ confirmed_at: new Date().toISOString() })
      .eq('partner_id', user.id)
      .eq('month', month)
      .not('paid_at', 'is', null) // can only confirm if admin already marked as paid

    if (dbError) throw dbError
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
