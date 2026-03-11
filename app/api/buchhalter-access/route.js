import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
const resend = new Resend(process.env.RESEND_API_KEY)

async function getUser(request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return null
  const { data: { user } } = await supabase.auth.getUser(token)
  return user || null
}

// GET — lista accessa za trenutnog majstora
export async function GET(request) {
  const user = await getUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('buchhalter_access')
    .select('id, buchhalter_email, buchhalter_id, status, invited_at, accepted_at')
    .eq('majstor_id', user.id)
    .neq('status', 'revoked')
    .order('invited_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

// POST — dodaj pristup + pošalji email
export async function POST(request) {
  const user = await getUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { buchhalter_email } = await request.json()
  if (!buchhalter_email?.trim()) {
    return NextResponse.json({ error: 'E-Mail ist erforderlich' }, { status: 400 })
  }

  const email = buchhalter_email.trim().toLowerCase()

  // Provjeri da li već postoji
  const { data: existing } = await supabase
    .from('buchhalter_access')
    .select('id, status, accepted_at')
    .eq('majstor_id', user.id)
    .eq('buchhalter_email', email)
    .single()

  // Ako je već prihvatio poziv — ne šalji ponovo
  if (existing && existing.status !== 'revoked' && existing.accepted_at) {
    return NextResponse.json({ error: 'Dieser Buchhalter ist bereits verbunden' }, { status: 409 })
  }

  // Provjeri da li buchhalter već ima nalog
  const { data: buchhalterProfile } = await supabase
    .from('majstors')
    .select('id, full_name')
    .eq('email', email)
    .eq('role', 'buchhalter')
    .single()

  // Dohvati majstor podatke za email
  const { data: majstorProfile } = await supabase
    .from('majstors')
    .select('full_name, business_name')
    .eq('id', user.id)
    .single()

  const majstorName = majstorProfile?.business_name || majstorProfile?.full_name || 'Ein Meister'

  // Kreiraj ili ažuriraj access record
  const accessData = {
    majstor_id: user.id,
    buchhalter_email: email,
    buchhalter_id: buchhalterProfile?.id || null,
    status: 'active',
    invited_at: new Date().toISOString(),
    accepted_at: null, // Buchhalter muss explizit annehmen
  }

  let result
  if (existing) {
    // Update: reaktiviraj revoked ILI ažuriraj invited_at za erneut senden
    const { data, error } = await supabase
      .from('buchhalter_access')
      .update(accessData)
      .eq('id', existing.id)
      .select()
      .single()
    result = { data, error }
  } else {
    const { data, error } = await supabase
      .from('buchhalter_access')
      .insert(accessData)
      .select()
      .single()
    result = { data, error }
  }

  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 })

  // Pošalji invite email — univerzalni template sa obe opcije
  try {
    await resend.emails.send({
      from: 'Pro-Meister <noreply@pro-meister.de>',
      to: email,
      subject: `${majstorName} hat Ihnen Buchhalter-Zugang erteilt`,
      html: `
        <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px">
          <div style="text-align:center;margin-bottom:24px">
            <span style="font-size:32px">📒</span>
            <h2 style="color:#0f172a;margin:8px 0">Buchhalter-Zugang erhalten</h2>
          </div>
          <p><strong>${majstorName}</strong> hat Ihnen Zugang zu seinem Buchhalter-Bereich auf Pro-Meister erteilt.</p>
          <p style="margin-top:20px;font-weight:600;">Bereits registriert?</p>
          <p><a href="https://pro-meister.de/login" style="display:inline-block;background:#0d9488;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;">Anmelden →</a></p>
          <p style="margin-top:20px;font-weight:600;">Noch kein Konto?</p>
          <p><a href="https://pro-meister.de/signup" style="display:inline-block;background:#334155;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;">Kostenlos registrieren →</a></p>
          <p style="color:#64748b;font-size:13px;margin-top:4px;">Wählen Sie beim Setup <strong>„Buchhalter"</strong> und verwenden Sie diese E-Mail-Adresse.</p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">
          <p style="color:#94a3b8;font-size:12px;text-align:center">Pro-Meister · pro-meister.de</p>
        </div>
      `
    })
  } catch (emailError) {
    console.warn('⚠️ Invite email failed (non-blocking):', emailError.message)
  }

  return NextResponse.json({ success: true, data: result.data })
}

// PATCH — sačuvaj email bez invite-a (samo za ZIP slanje)
export async function PATCH(request) {
  const user = await getUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { buchhalter_email } = await request.json()
  if (!buchhalter_email?.trim()) return NextResponse.json({ error: 'E-Mail fehlt' }, { status: 400 })

  const email = buchhalter_email.trim().toLowerCase()

  // Provjeri da li buchhalter već ima nalog
  const { data: buchhalterProfile } = await supabase
    .from('majstors')
    .select('id')
    .eq('email', email)
    .eq('role', 'buchhalter')
    .single()

  // Revoke sve ostale aktivne (ako menja email)
  await supabase.from('buchhalter_access').update({ status: 'revoked' })
    .eq('majstor_id', user.id).eq('status', 'active').neq('buchhalter_email', email)

  // Upsert — ako red već postoji (i revoked), reaktiviraj ga
  // NE setujemo invited_at ovde — to radi samo POST (kad se email pošalje)
  const { data, error } = await supabase
    .from('buchhalter_access')
    .upsert({
      majstor_id: user.id,
      buchhalter_email: email,
      buchhalter_id: buchhalterProfile?.id || null,
      status: 'active',
      accepted_at: null, // Buchhalter muss explizit annehmen
      invited_at: null, // Reset — Einladung wird nur über POST gesendet
    }, { onConflict: 'majstor_id,buchhalter_email' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data })
}

// PUT — buchhalter prihvata poziv
export async function PUT(request) {
  const user = await getUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, action } = await request.json()
  if (!id || !action) return NextResponse.json({ error: 'ID und Aktion erforderlich' }, { status: 400 })

  // Provjeri da je buchhalter vlasnik ovog accessa
  const { data: accessRow } = await supabase
    .from('buchhalter_access')
    .select('id, buchhalter_id, buchhalter_email, status')
    .eq('id', id)
    .single()

  if (!accessRow) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })

  // Provjeri ownership — buchhalter_id mora matchovati ILI email mora matchovati
  const userEmail = user.email?.toLowerCase()
  if (accessRow.buchhalter_id !== user.id && accessRow.buchhalter_email !== userEmail) {
    return NextResponse.json({ error: 'Nicht berechtigt' }, { status: 403 })
  }

  if (action === 'accept') {
    const { error } = await supabase
      .from('buchhalter_access')
      .update({
        accepted_at: new Date().toISOString(),
        buchhalter_id: user.id,
        status: 'active'
      })
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  if (action === 'decline') {
    const { error } = await supabase
      .from('buchhalter_access')
      .update({ status: 'revoked' })
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Ungültige Aktion' }, { status: 400 })
}

// DELETE — ukloni pristup
export async function DELETE(request) {
  const user = await getUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID fehlt' }, { status: 400 })

  // Allow both majstor and buchhalter to revoke
  const { data: accessRow } = await supabase
    .from('buchhalter_access')
    .select('majstor_id, buchhalter_id')
    .eq('id', id)
    .single()

  if (!accessRow || (accessRow.majstor_id !== user.id && accessRow.buchhalter_id !== user.id)) {
    return NextResponse.json({ error: 'Nicht berechtigt' }, { status: 403 })
  }

  const { error } = await supabase
    .from('buchhalter_access')
    .update({ status: 'revoked' })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Provjeri ima li još aktivnih buchhaltera — ako ne, očisti bookkeeper_email
  const { data: remaining } = await supabase
    .from('buchhalter_access')
    .select('buchhalter_email')
    .eq('majstor_id', user.id)
    .eq('status', 'active')
    .limit(1)

  return NextResponse.json({ success: true })
}
