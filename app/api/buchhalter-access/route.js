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
    .select('id, status')
    .eq('majstor_id', user.id)
    .eq('buchhalter_email', email)
    .single()

  if (existing && existing.status !== 'revoked') {
    return NextResponse.json({ error: 'Dieser Buchhalter hat bereits Zugang' }, { status: 409 })
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
    accepted_at: buchhalterProfile ? new Date().toISOString() : null,
  }

  let result
  if (existing) {
    // Reactivate revoked
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

  // Pošalji invite email
  try {
    const isRegistered = !!buchhalterProfile
    const emailBody = isRegistered
      ? `<p><strong>${majstorName}</strong> hat Ihnen Zugang zu seinem Buchhalter-Bereich auf Pro-Meister erteilt.</p>
         <p>Melden Sie sich an, um die Daten einzusehen:</p>
         <p><a href="https://pro-meister.de/login" style="background:#0d9488;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;">Jetzt anmelden →</a></p>`
      : `<p><strong>${majstorName}</strong> hat Ihnen Zugang zu seinem Buchhalter-Bereich auf Pro-Meister erteilt.</p>
         <p>Registrieren Sie sich kostenlos und wählen Sie beim Setup <strong>"Buchhalter"</strong>:</p>
         <p><a href="https://pro-meister.de/signup" style="background:#0d9488;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;">Jetzt registrieren →</a></p>
         <p style="color:#64748b;font-size:13px;">Wichtig: Verwenden Sie diese E-Mail-Adresse zur Registrierung.</p>`

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
          ${emailBody}
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

// DELETE — ukloni pristup
export async function DELETE(request) {
  const user = await getUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID fehlt' }, { status: 400 })

  const { error } = await supabase
    .from('buchhalter_access')
    .update({ status: 'revoked' })
    .eq('id', id)
    .eq('majstor_id', user.id) // ownership check

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
