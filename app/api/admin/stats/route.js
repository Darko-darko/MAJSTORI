// app/api/admin/stats/route.js — Read-only admin statistics
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const ADMIN_EMAILS = ['darko.jocic.ns@gmail.com', 'novakovicdusan555@gmail.com']

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

    const today = new Date().toISOString().slice(0, 10)

    const [totalUsers, activeSubs, trialSubs, totalInvoices, totalInquiries, emailCounter] = await Promise.all([
      admin.from('majstors').select('id', { count: 'exact', head: true }),
      admin.from('user_subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      admin.from('user_subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'trial'),
      admin.from('invoices').select('id', { count: 'exact', head: true }),
      admin.from('inquiries').select('id', { count: 'exact', head: true }),
      admin.from('email_counter').select('count').eq('date', today).single(),
    ])

    for (const result of [totalUsers, activeSubs, trialSubs, totalInvoices, totalInquiries]) {
      if (result.error) {
        console.error('Admin stats DB error:', result.error)
        return NextResponse.json({ error: 'Database error' }, { status: 500 })
      }
    }

    return NextResponse.json({
      totalUsers:    totalUsers.count    ?? 0,
      activeSubs:    activeSubs.count    ?? 0,
      trialSubs:     trialSubs.count     ?? 0,
      totalInvoices:   totalInvoices.count   ?? 0,
      totalInquiries:  totalInquiries.count  ?? 0,
      emailsToday:     emailCounter.data?.count ?? 0,
    })
  } catch (err) {
    console.error('Admin stats error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
