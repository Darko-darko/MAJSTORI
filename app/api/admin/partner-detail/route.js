// app/api/admin/partner-detail/route.js
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const ADMIN_EMAILS = ['darko.jocic.ns@gmail.com', 'novakovicdusan555@gmail.com']

async function getAdmin(request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return { error: 'Unauthorized', status: 401 }
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const { data: { user } } = await admin.auth.getUser(token)
  if (!user || !ADMIN_EMAILS.includes(user.email)) return { error: 'Unauthorized', status: 401 }
  return { admin }
}

// GET ?partner_id=xxx — detailed stats + payouts
export async function GET(request) {
  try {
    const { admin, error, status } = await getAdmin(request)
    if (error) return NextResponse.json({ error }, { status })

    const { searchParams } = new URL(request.url)
    const partner_id = searchParams.get('partner_id')
    if (!partner_id) return NextResponse.json({ error: 'partner_id erforderlich' }, { status: 400 })

    const { data: partner } = await admin
      .from('majstors')
      .select('id, full_name, email, ref_code, commission_rate')
      .eq('id', partner_id)
      .single()

    if (!partner) return NextResponse.json({ error: 'Partner nicht gefunden' }, { status: 404 })

    const { data: referred } = await admin
      .from('majstors')
      .select('id, full_name, email, created_at, user_subscriptions ( status, created_at )')
      .eq('referred_by', partner.ref_code)
      .order('created_at', { ascending: false })

    const { data: payouts } = await admin
      .from('partner_payouts')
      .select('*')
      .eq('partner_id', partner_id)

    return NextResponse.json({ partner, referred: referred || [], payouts: payouts || [] })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST { partner_id, month, amount } — mark as paid
export async function POST(request) {
  try {
    const { admin, error, status } = await getAdmin(request)
    if (error) return NextResponse.json({ error }, { status })

    const { partner_id, month, amount } = await request.json()
    if (!partner_id || !month) return NextResponse.json({ error: 'partner_id und month erforderlich' }, { status: 400 })

    const { error: dbError } = await admin
      .from('partner_payouts')
      .upsert(
        { partner_id, month, amount: amount || 0, paid_at: new Date().toISOString() },
        { onConflict: 'partner_id,month' }
      )

    if (dbError) throw dbError
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE { partner_id, month } — unmark payment
export async function DELETE(request) {
  try {
    const { admin, error, status } = await getAdmin(request)
    if (error) return NextResponse.json({ error }, { status })

    const { partner_id, month } = await request.json()
    if (!partner_id || !month) return NextResponse.json({ error: 'partner_id und month erforderlich' }, { status: 400 })

    const { error: dbError } = await admin
      .from('partner_payouts')
      .delete()
      .eq('partner_id', partner_id)
      .eq('month', month)

    if (dbError) throw dbError
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
