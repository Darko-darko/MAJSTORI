// app/api/partner/sub-partners/route.js — CRUD for sub-partner management
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

async function getTopLevelPartner(request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return { error: 'Unauthorized', status: 401 }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data: { user } } = await admin.auth.getUser(token)
  if (!user) return { error: 'Unauthorized', status: 401 }

  const { data: profile } = await admin
    .from('majstors')
    .select('id, is_partner, parent_partner_id, commission_rate')
    .eq('id', user.id)
    .single()

  if (!profile?.is_partner || profile.parent_partner_id) {
    return { error: 'Nur Partner können Sub-Partner verwalten', status: 403 }
  }

  return { admin, profile }
}

// POST — add sub-partner
export async function POST(request) {
  try {
    const { admin, profile, error, status } = await getTopLevelPartner(request)
    if (error) return NextResponse.json({ error }, { status })

    const { majstor_id, ref_code, commission_rate } = await request.json()
    if (!majstor_id || !ref_code) {
      return NextResponse.json({ error: 'majstor_id und ref_code erforderlich' }, { status: 400 })
    }

    const rate = parseFloat(commission_rate) || 0
    if (rate > (profile.commission_rate || 0)) {
      return NextResponse.json({ error: `Provision darf maximal ${profile.commission_rate}€ betragen` }, { status: 400 })
    }

    // Check ref_code uniqueness
    const { data: existing } = await admin
      .from('majstors')
      .select('id')
      .eq('ref_code', ref_code.trim())
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Dieser Ref-Code ist bereits vergeben' }, { status: 400 })
    }

    // Check target is not already a partner
    const { data: target } = await admin
      .from('majstors')
      .select('id, is_partner, parent_partner_id')
      .eq('id', majstor_id)
      .single()

    if (!target) return NextResponse.json({ error: 'Nutzer nicht gefunden' }, { status: 404 })
    if (target.is_partner) {
      return NextResponse.json({ error: 'Dieser Nutzer ist bereits Partner' }, { status: 400 })
    }

    const { error: dbError } = await admin
      .from('majstors')
      .update({
        is_partner: true,
        ref_code: ref_code.trim(),
        commission_rate: rate,
        parent_partner_id: profile.id,
      })
      .eq('id', majstor_id)

    if (dbError) throw dbError
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// PATCH — update sub-partner commission
export async function PATCH(request) {
  try {
    const { admin, profile, error, status } = await getTopLevelPartner(request)
    if (error) return NextResponse.json({ error }, { status })

    const { sub_partner_id, commission_rate } = await request.json()
    if (!sub_partner_id) return NextResponse.json({ error: 'sub_partner_id erforderlich' }, { status: 400 })

    const rate = parseFloat(commission_rate) || 0
    if (rate > (profile.commission_rate || 0)) {
      return NextResponse.json({ error: `Provision darf maximal ${profile.commission_rate}€ betragen` }, { status: 400 })
    }

    // Verify ownership
    const { data: sub } = await admin
      .from('majstors')
      .select('id, parent_partner_id')
      .eq('id', sub_partner_id)
      .single()

    if (!sub || sub.parent_partner_id !== profile.id) {
      return NextResponse.json({ error: 'Nicht berechtigt' }, { status: 403 })
    }

    const { error: dbError } = await admin
      .from('majstors')
      .update({ commission_rate: rate })
      .eq('id', sub_partner_id)

    if (dbError) throw dbError
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// PUT — mark/unmark sub-partner payout as paid
export async function PUT(request) {
  try {
    const { admin, profile, error, status } = await getTopLevelPartner(request)
    if (error) return NextResponse.json({ error }, { status })

    const { sub_partner_id, month, action } = await request.json()
    if (!sub_partner_id || !month) {
      return NextResponse.json({ error: 'sub_partner_id und month erforderlich' }, { status: 400 })
    }

    // Verify ownership
    const { data: sub } = await admin
      .from('majstors')
      .select('id, parent_partner_id, commission_rate')
      .eq('id', sub_partner_id)
      .single()

    if (!sub || sub.parent_partner_id !== profile.id) {
      return NextResponse.json({ error: 'Nicht berechtigt' }, { status: 403 })
    }

    if (action === 'undo') {
      const { data: existing } = await admin
        .from('partner_payouts')
        .select('confirmed_at')
        .eq('partner_id', sub_partner_id)
        .eq('month', month)
        .single()

      if (existing?.confirmed_at) {
        return NextResponse.json({ error: 'Bereits vom Sub-Partner bestätigt' }, { status: 400 })
      }

      const { error: dbError } = await admin
        .from('partner_payouts')
        .delete()
        .eq('partner_id', sub_partner_id)
        .eq('month', month)

      if (dbError) throw dbError
    } else {
      const { error: dbError } = await admin
        .from('partner_payouts')
        .upsert(
          {
            partner_id: sub_partner_id,
            month,
            amount: 0,
            paid_at: new Date().toISOString(),
          },
          { onConflict: 'partner_id,month' }
        )

      if (dbError) throw dbError
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE — remove sub-partner
export async function DELETE(request) {
  try {
    const { admin, profile, error, status } = await getTopLevelPartner(request)
    if (error) return NextResponse.json({ error }, { status })

    const { sub_partner_id } = await request.json()
    if (!sub_partner_id) return NextResponse.json({ error: 'sub_partner_id erforderlich' }, { status: 400 })

    // Verify ownership
    const { data: sub } = await admin
      .from('majstors')
      .select('id, parent_partner_id')
      .eq('id', sub_partner_id)
      .single()

    if (!sub || sub.parent_partner_id !== profile.id) {
      return NextResponse.json({ error: 'Nicht berechtigt' }, { status: 403 })
    }

    const { error: dbError } = await admin
      .from('majstors')
      .update({
        is_partner: false,
        ref_code: null,
        commission_rate: 0,
        parent_partner_id: null,
      })
      .eq('id', sub_partner_id)

    if (dbError) throw dbError
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
