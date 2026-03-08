// app/api/admin/partners/route.js
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const ADMIN_EMAILS = ['darko.jocic.ns@gmail.com', 'novakovicdusan555@gmail.com']

async function getAdminClient(request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return { error: 'Unauthorized', status: 401 }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data: { user } } = await admin.auth.getUser(token)
  if (!user || !ADMIN_EMAILS.includes(user.email)) {
    return { error: 'Unauthorized', status: 401 }
  }

  return { admin }
}

// GET — lista svih partnera sa statistikama
export async function GET(request) {
  try {
    const { admin, error, status } = await getAdminClient(request)
    if (error) return NextResponse.json({ error }, { status })

    const { data: partners, error: dbError } = await admin
      .from('majstors')
      .select(`
        id, full_name, email, ref_code, commission_rate, created_at,
        user_subscriptions ( status )
      `)
      .eq('is_partner', true)
      .order('created_at', { ascending: false })

    if (dbError) throw dbError

    // Za svakog partnera učitaj statistike o referisanim korisnicima
    const result = await Promise.all(partners.map(async (p) => {
      const { data: referred } = await admin
        .from('majstors')
        .select(`
          id, full_name, email, created_at,
          user_subscriptions ( status )
        `)
        .eq('referred_by', p.ref_code)

      const { data: clicks } = await admin
        .from('ref_clicks')
        .select('source')
        .eq('ref_code', p.ref_code)

      const totalClicks = clicks?.length || 0
      const qrClicks = clicks?.filter(c => c.source === 'qr').length || 0
      const conversions = (referred || []).length
      const conversionRate = totalClicks ? Math.round(conversions / totalClicks * 100) : 0

      const stats = computeStats(referred || [])
      return {
        id: p.id,
        full_name: p.full_name,
        email: p.email,
        ref_code: p.ref_code,
        commission_rate: p.commission_rate || 0,
        clicks: totalClicks,
        qr_clicks: qrClicks,
        conversion_rate: conversionRate,
        ...stats
      }
    }))

    return NextResponse.json({ partners: result })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST — dodaj partnera
export async function POST(request) {
  try {
    const { admin, error, status } = await getAdminClient(request)
    if (error) return NextResponse.json({ error }, { status })

    const { majstor_id, ref_code, commission_rate } = await request.json()
    if (!majstor_id || !ref_code) {
      return NextResponse.json({ error: 'majstor_id und ref_code erforderlich' }, { status: 400 })
    }

    const { error: dbError } = await admin
      .from('majstors')
      .update({ is_partner: true, ref_code, commission_rate: commission_rate || 0 })
      .eq('id', majstor_id)

    if (dbError) throw dbError
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// PATCH — izmjena commission_rate
export async function PATCH(request) {
  try {
    const { admin, error, status } = await getAdminClient(request)
    if (error) return NextResponse.json({ error }, { status })

    const { majstor_id, commission_rate } = await request.json()
    if (!majstor_id) {
      return NextResponse.json({ error: 'majstor_id erforderlich' }, { status: 400 })
    }

    const { error: dbError } = await admin
      .from('majstors')
      .update({ commission_rate })
      .eq('id', majstor_id)

    if (dbError) throw dbError
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE — ukloni partner status
export async function DELETE(request) {
  try {
    const { admin, error, status } = await getAdminClient(request)
    if (error) return NextResponse.json({ error }, { status })

    const { majstor_id } = await request.json()
    if (!majstor_id) {
      return NextResponse.json({ error: 'majstor_id erforderlich' }, { status: 400 })
    }

    const { error: dbError } = await admin
      .from('majstors')
      .update({ is_partner: false, ref_code: null, commission_rate: 0 })
      .eq('id', majstor_id)

    if (dbError) throw dbError
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

function computeStats(referred) {
  let trial = 0, active = 0, cancelled = 0, freemium = 0
  for (const u of referred) {
    const subs = u.user_subscriptions || []
    const latest = subs.sort((a, b) =>
      new Date(b.created_at || 0) - new Date(a.created_at || 0)
    )[0]
    const s = latest?.status ?? null
    if (s === 'trial') trial++
    else if (s === 'active') active++
    else if (s === 'cancelled') cancelled++
    else freemium++
  }
  return { total: referred.length, trial, active, cancelled, freemium }
}
