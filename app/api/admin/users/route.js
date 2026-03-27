// app/api/admin/users/route.js — Read-only user list with subscription info
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const ADMIN_EMAILS = ['darko.jocic.ns@gmail.com', 'novakovicdusan555@gmail.com']

function latestSub(subs) {
  if (!subs || subs.length === 0) return null
  return subs.slice().sort((a, b) => {
    const aTime = a.created_at ? new Date(a.created_at).getTime() : 0
    const bTime = b.created_at ? new Date(b.created_at).getTime() : 0
    return bTime - aTime
  })[0]
}

export async function GET(request) {
  try {
    // 1) Auth check via Bearer token (session lives in localStorage, not cookies)
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const { data: { user } } = await admin.auth.getUser(token)
    if (!user || !ADMIN_EMAILS.includes(user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2) Query params
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''

    // 4) Fetch users with subscriptions
    let query = admin
      .from('majstors')
      .select(`
        id, email, full_name, business_name, city, created_at, subscription_status, role,
        invoices(count),
        inquiries(count),
        user_subscriptions (
          status, created_at, current_period_end, trial_ends_at, cancel_at_period_end,
          subscription_plans ( name, display_name )
        )
      `)
      .order('created_at', { ascending: false })

    if (search) {
      query = query.or(`email.ilike.%${search}%,business_name.ilike.%${search}%`)
    }

    const { data, error } = await query
    if (error) {
      console.error('Admin users DB error:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    // 5) Flatten — pick latest subscription per user
    let users = (data || []).map(m => {
      const latest = latestSub(m.user_subscriptions)
      return {
        id:                 m.id,
        email:              m.email,
        full_name:          m.full_name,
        business_name:      m.business_name,
        city:               m.city,
        created_at:         m.created_at,
        role:               m.role || null,
        sub_status:            latest?.status ?? m.subscription_status ?? null,
        sub_plan:              latest?.subscription_plans?.display_name ?? latest?.subscription_plans?.name ?? null,
        current_period_end:    latest?.current_period_end ?? null,
        trial_ends_at:         latest?.trial_ends_at ?? null,
        cancel_at_period_end:  latest?.cancel_at_period_end ?? false,
        invoice_count:      m.invoices?.[0]?.count ?? 0,
        inquiry_count:      m.inquiries?.[0]?.count ?? 0,
      }
    })

    // 6) Split buchhalters from handwerkers
    const buchhalters = users.filter(u => u.role === 'buchhalter')
    const handwerkers = users.filter(u => u.role !== 'buchhalter' && u.role !== 'worker')

    // 7) Status filter (only for handwerkers)
    let filteredHandwerkers = handwerkers
    if (status) {
      filteredHandwerkers = handwerkers.filter(u => u.sub_status === status)
    }

    // 8) Fetch mandant counts for buchhalters
    let buchhalterList = buchhalters
    if (buchhalters.length > 0) {
      const buchhalterIds = buchhalters.map(b => b.id)
      const { data: accessData } = await admin
        .from('buchhalter_access')
        .select('buchhalter_id, accepted_at')
        .in('buchhalter_id', buchhalterIds)
        .eq('status', 'active')

      const countMap = {}
      for (const a of (accessData || [])) {
        if (!countMap[a.buchhalter_id]) countMap[a.buchhalter_id] = { total: 0, accepted: 0 }
        countMap[a.buchhalter_id].total++
        if (a.accepted_at) countMap[a.buchhalter_id].accepted++
      }

      buchhalterList = buchhalters.map(b => ({
        ...b,
        mandant_count: countMap[b.id]?.accepted ?? 0,
        pending_count: (countMap[b.id]?.total ?? 0) - (countMap[b.id]?.accepted ?? 0),
      }))
    }

    return NextResponse.json({ users: filteredHandwerkers, buchhalters: buchhalterList })
  } catch (err) {
    console.error('Admin users error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
