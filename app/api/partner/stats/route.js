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

    const monthlyStats = computeMonthlyStats(referred || [], history, profile.commission_rate || 0)

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

    return NextResponse.json({ profile, referred: referred || [], payouts: payouts || [], monthlyStats, clickStats })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

function computeMonthlyStats(referred, history, commissionRate) {
  const months = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const year = d.getFullYear()
    const month = d.getMonth()
    const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`
    const lastDay = new Date(year, month + 1, 0, 23, 59, 59, 999)
    const isCurrent = i === 0

    const registrations = referred.filter(u => {
      const c = new Date(u.created_at)
      return c.getFullYear() === year && c.getMonth() === month
    }).length

    let activeCount
    if (isCurrent) {
      activeCount = referred.filter(u => {
        const subs = u.user_subscriptions || []
        const latest = [...subs].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))[0]
        return latest?.status === 'active'
      }).length
    } else {
      activeCount = referred.filter(u => {
        const userHistory = history
          .filter(h => h.majstor_id === u.id && new Date(h.changed_at) <= lastDay)
          .sort((a, b) => new Date(b.changed_at) - new Date(a.changed_at))
        if (userHistory.length === 0) return false
        return userHistory[0].status === 'active'
      }).length
    }

    months.push({ month: monthKey, activeCount, amount: activeCount * commissionRate, registrations, isCurrent })
  }
  return months
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
