import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

async function getUser(request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return null
  const admin = getAdmin()
  const { data: { user } } = await admin.auth.getUser(token)
  return user || null
}

// GET /api/aufmasse — lista korisnikovih aufmasse, ili ?id=xxx za jedan
export async function GET(request) {
  const user = await getUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getAdmin()
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (id) {
    const { data, error } = await admin
      .from('aufmasse')
      .select('*')
      .eq('id', id)
      .eq('majstor_id', user.id)
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 404 })
    return NextResponse.json({ aufmass: data })
  }

  const { data, error } = await admin
    .from('aufmasse')
    .select('*')
    .eq('majstor_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ aufmasse: data })
}

// POST /api/aufmasse — kreiraj novi aufmaß
export async function POST(request) {
  const user = await getUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { title, customer_name, date, rooms, notes } = body

  if (!title?.trim()) {
    return NextResponse.json({ error: 'Titel ist erforderlich' }, { status: 400 })
  }

  const admin = getAdmin()
  const { data, error } = await admin
    .from('aufmasse')
    .insert({
      majstor_id: user.id,
      title: title.trim(),
      customer_name: customer_name || null,
      date: date || new Date().toISOString().split('T')[0],
      rooms: rooms || [],
      notes: notes || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ aufmass: data }, { status: 201 })
}

// PATCH /api/aufmasse — update aufmaß
export async function PATCH(request) {
  const user = await getUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { id, ...fields } = body

  if (!id) return NextResponse.json({ error: 'ID fehlt' }, { status: 400 })

  // Dozvoljeni update fajlovi
  const allowed = ['title', 'customer_name', 'date', 'rooms', 'notes', 'status']
  const update = {}
  for (const key of allowed) {
    if (key in fields) update[key] = fields[key]
  }
  update.updated_at = new Date().toISOString()

  const admin = getAdmin()

  // Provjera vlasništva
  const { data: existing } = await admin
    .from('aufmasse')
    .select('id')
    .eq('id', id)
    .eq('majstor_id', user.id)
    .single()

  if (!existing) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })

  const { data, error } = await admin
    .from('aufmasse')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ aufmass: data })
}

// DELETE /api/aufmasse — obrisi aufmaß
export async function DELETE(request) {
  const user = await getUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: 'ID fehlt' }, { status: 400 })

  const admin = getAdmin()

  // Provjera vlasništva
  const { data: existing } = await admin
    .from('aufmasse')
    .select('id')
    .eq('id', id)
    .eq('majstor_id', user.id)
    .single()

  if (!existing) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })

  const { error } = await admin.from('aufmasse').delete().eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
