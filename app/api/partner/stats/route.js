// app/api/partner/stats/route.js
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { computeMonthlyStats, mergeMonthlyStats, fetchSubPartnerData } from '@/lib/partnerStats'

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
      .select('id, full_name, ref_code, commission_rate, is_partner, parent_partner_id')
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
      .select('month, amount, active_count, paid_at, confirmed_at')
      .eq('partner_id', user.id)

    const referredIds = (referred || []).map(u => u.id)
    let history = []
    if (referredIds.length > 0) {
      try {
        const { data: h } = await admin
          .from('subscription_history')
          .select('majstor_id, status, changed_at')
          .in('majstor_id', referredIds)
          .order('changed_at', { ascending: true })
        history = h || []
      } catch { history = [] }
    }

    const directMonthlyStats = computeMonthlyStats(referred || [], history, profile.commission_rate || 0)

    // Ref click stats
    const { data: clicks } = await admin
      .from('ref_clicks')
      .select('source, clicked_at')
      .eq('ref_code', profile.ref_code)

    const clickStats = {
      total: clicks?.length || 0,
      qr: clicks?.filter(c => c.source === 'qr').length || 0,
      link: clicks?.filter(c => c.source === 'link').length || 0,
      conversions: (referred || []).length,
      conversionRate: clicks?.length
        ? Math.round((referred || []).length / clicks.length * 100)
        : 0,
    }

    // Sub-partner data (only for top-level partners)
    const isTopLevelPartner = !profile.parent_partner_id
    let subPartners = []
    let monthlyStats = directMonthlyStats

    if (isTopLevelPartner) {
      subPartners = await fetchSubPartnerData(admin, profile.id)

      if (subPartners.length > 0) {
        monthlyStats = mergeMonthlyStats(
          directMonthlyStats,
          subPartners.map(sp => ({ stats: sp.monthlyStats, subRate: sp.commission_rate || 0 })),
          profile.commission_rate || 0,
          'net'
        )
      }
    }

    return NextResponse.json({
      profile,
      referred: referred || [],
      payouts: payouts || [],
      monthlyStats,
      clickStats,
      isTopLevelPartner,
      subPartners,
    })
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
