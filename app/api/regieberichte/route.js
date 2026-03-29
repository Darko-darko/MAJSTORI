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

async function getUserRole(admin, userId) {
  const { data } = await admin
    .from('majstors')
    .select('id, role')
    .eq('id', userId)
    .single()
  return data
}

// GET /api/regieberichte — liste
// Solo majstor: eigene Regieberichte
// PRO+ Owner: eigene + alle von Arbeitern
// Worker: nur eigene
export async function GET(request) {
  const user = await getUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getAdmin()
  const majstor = await getUserRole(admin, user.id)
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  // Einzelnen Regiebericht laden
  if (id) {
    const { data, error } = await admin
      .from('regieberichte')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })

    // Zugriffsprüfung: owner, worker, oder Team-Chef
    if (data.majstor_id !== user.id && data.worker_id !== user.id) {
      return NextResponse.json({ error: 'Kein Zugriff' }, { status: 403 })
    }
    return NextResponse.json({ regiebericht: data })
  }

  // Liste laden
  let query

  if (majstor?.role === 'worker') {
    // Worker sieht nur eigene
    query = admin
      .from('regieberichte')
      .select('*')
      .eq('worker_id', user.id)
  } else {
    // Owner/Solo: eigene (majstor_id) — inkl. alle von Arbeitern
    query = admin
      .from('regieberichte')
      .select('*')
      .eq('majstor_id', user.id)
  }

  // Optionale Filter
  const status = searchParams.get('status')
  if (status) query = query.eq('status', status)

  const workerId = searchParams.get('worker_id')
  if (workerId) query = query.eq('worker_id', workerId)

  const invoiceId = searchParams.get('invoice_id')
  if (invoiceId) query = query.eq('invoice_id', invoiceId)

  // Nur unverknüpfte (für Auswahl-Dialog beim Anhängen an Rechnung)
  const unlinked = searchParams.get('unlinked')
  if (unlinked === 'true') query = query.is('invoice_id', null)

  // Für Picker: Regieberichte für diese Rechnung (nicht attached) + unverknüpfte
  const forInvoice = searchParams.get('for_invoice')

  query = query.order('datum', { ascending: false })

  if (forInvoice) {
    // Zwei Queries: für diese Rechnung + unverknüpfte
    const q1 = admin.from('regieberichte').select('*')
      .eq('majstor_id', user.id).eq('invoice_id', forInvoice).neq('status', 'attached')
      .order('datum', { ascending: false })
    const q2 = admin.from('regieberichte').select('*')
      .eq('majstor_id', user.id).is('invoice_id', null)
      .order('datum', { ascending: false })
    const [r1, r2] = await Promise.all([q1, q2])
    const combined = [...(r1.data || []), ...(r2.data || [])]

    // Worker-Namen anhängen
    if (majstor?.role !== 'worker' && combined.length > 0) {
      const workerIds = [...new Set(combined.filter(r => r.worker_id).map(r => r.worker_id))]
      if (workerIds.length > 0) {
        const { data: members } = await admin
          .from('team_members').select('worker_id, worker_name')
          .eq('owner_id', user.id).in('worker_id', workerIds)
        const nameMap = {}
        members?.forEach(m => { nameMap[m.worker_id] = m.worker_name })
        combined.forEach(r => { r.worker_name = nameMap[r.worker_id] || null })
      }
    }

    return NextResponse.json({ regieberichte: combined })
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Worker-Name anhängen wenn Team
  if (majstor?.role !== 'worker' && data?.length > 0) {
    const workerIds = [...new Set(data.filter(r => r.worker_id).map(r => r.worker_id))]
    if (workerIds.length > 0) {
      const { data: members } = await admin
        .from('team_members')
        .select('worker_id, worker_name')
        .eq('owner_id', user.id)
        .in('worker_id', workerIds)

      const nameMap = {}
      members?.forEach(m => { nameMap[m.worker_id] = m.worker_name })
      data.forEach(r => { r.worker_name = nameMap[r.worker_id] || null })
    }
  }

  return NextResponse.json({ regieberichte: data })
}

// POST /api/regieberichte — neuen Regiebericht erstellen
export async function POST(request) {
  const user = await getUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getAdmin()
  const majstor = await getUserRole(admin, user.id)
  const body = await request.json()

  const {
    datum, uhrzeit, objekt, beschreibung,
    mieter_name, wohnungsnummer,
    customer_name, customer_address,
    signature_url, pdf_url,
    invoice_id, owner_id
  } = body

  // Worker: majstor_id = owner_id (Team-Chef), worker_id = eigene ID
  // Solo: majstor_id = eigene ID, worker_id = null
  let majstorId = user.id
  let workerId = null

  if (majstor?.role === 'worker') {
    // Worker muss owner_id mitschicken (oder wir holen es aus team_members)
    if (owner_id) {
      majstorId = owner_id
    } else {
      const { data: membership } = await admin
        .from('team_members')
        .select('owner_id')
        .eq('worker_id', user.id)
        .eq('status', 'active')
        .single()
      if (!membership) return NextResponse.json({ error: 'Kein Team gefunden' }, { status: 400 })
      majstorId = membership.owner_id
    }
    workerId = user.id
  }

  const { data, error } = await admin
    .from('regieberichte')
    .insert({
      majstor_id: majstorId,
      worker_id: workerId,
      invoice_id: invoice_id || null,
      datum: datum || new Date().toISOString().split('T')[0],
      uhrzeit: uhrzeit || null,
      objekt: objekt || null,
      beschreibung: beschreibung || null,
      mieter_name: mieter_name || null,
      wohnungsnummer: wohnungsnummer || null,
      customer_name: customer_name || null,
      customer_address: customer_address || null,
      signature_url: signature_url || null,
      pdf_url: pdf_url || null,
      status: signature_url ? 'signed' : 'draft',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ regiebericht: data }, { status: 201 })
}

// PATCH /api/regieberichte — update
export async function PATCH(request) {
  const user = await getUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { id, ...fields } = body
  if (!id) return NextResponse.json({ error: 'ID fehlt' }, { status: 400 })

  const admin = getAdmin()

  // Zugriffsprüfung
  const { data: existing } = await admin
    .from('regieberichte')
    .select('id, majstor_id, worker_id')
    .eq('id', id)
    .single()

  if (!existing) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })
  if (existing.majstor_id !== user.id && existing.worker_id !== user.id) {
    return NextResponse.json({ error: 'Kein Zugriff' }, { status: 403 })
  }

  const allowed = [
    'datum', 'uhrzeit', 'objekt', 'beschreibung',
    'mieter_name', 'wohnungsnummer', 'customer_name', 'customer_address',
    'signature_url', 'pdf_url', 'status', 'invoice_id'
  ]
  const update = {}
  for (const key of allowed) {
    if (key in fields) update[key] = fields[key]
  }
  update.updated_at = new Date().toISOString()

  const { data, error } = await admin
    .from('regieberichte')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ regiebericht: data })
}

// DELETE /api/regieberichte — löschen (nur Owner)
export async function DELETE(request) {
  const user = await getUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: 'ID fehlt' }, { status: 400 })

  const admin = getAdmin()

  const { data: existing } = await admin
    .from('regieberichte')
    .select('id, majstor_id')
    .eq('id', id)
    .single()

  if (!existing) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })
  if (existing.majstor_id !== user.id) {
    return NextResponse.json({ error: 'Nur der Inhaber kann löschen' }, { status: 403 })
  }

  const { error } = await admin.from('regieberichte').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
