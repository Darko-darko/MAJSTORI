// app/api/ausgaben/route.js
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function getUser(request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return null
  const { data: { user } } = await admin.auth.getUser(token)
  return user || null
}

// GET — fetch all ausgaben for the user
export async function GET(request) {
  try {
    const user = await getUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await admin
      .from('ausgaben')
      .select('id, filename, storage_path, created_at, uploaded_by')
      .eq('majstor_id', user.id)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ausgaben: data || [] })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST — save metadata after client uploads to storage
export async function POST(request) {
  try {
    const user = await getUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { storage_path, filename } = await request.json()
    if (!storage_path) return NextResponse.json({ error: 'storage_path required' }, { status: 400 })

    const { data, error } = await admin
      .from('ausgaben')
      .insert({ majstor_id: user.id, storage_path, filename: filename || null, uploaded_by: user.id })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ausgabe: data })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// PATCH — update scan metadata (vendor, amount, category, etc.)
export async function PATCH(request) {
  try {
    const user = await getUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id, ...updates } = await request.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    // Only allow these fields to be updated
    const allowed = ['vendor', 'receipt_date', 'amount_gross', 'amount_net', 'vat_rate', 'vat_amount', 'category', 'description']
    const clean = {}
    for (const key of allowed) {
      if (updates[key] !== undefined) clean[key] = updates[key]
    }

    if (Object.keys(clean).length === 0) {
      return NextResponse.json({ error: 'No valid fields' }, { status: 400 })
    }

    // Verify ownership (majstor updating own) OR buchhalter via separate route
    const { data, error } = await admin
      .from('ausgaben')
      .update(clean)
      .eq('id', id)
      .eq('majstor_id', user.id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ausgabe: data })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE — remove ausgabe and file from storage
export async function DELETE(request) {
  try {
    const user = await getUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await request.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    // Fetch to verify ownership and get storage_path
    const { data: ausgabe, error: fetchError } = await admin
      .from('ausgaben')
      .select('storage_path')
      .eq('id', id)
      .eq('majstor_id', user.id)
      .single()

    if (fetchError || !ausgabe) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Delete from storage
    await admin.storage.from('ausgaben').remove([ausgabe.storage_path])

    // Delete from DB
    await admin.from('ausgaben').delete().eq('id', id)

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
