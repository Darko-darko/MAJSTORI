// app/api/account/delete/route.js
// Two deletion modes:
//   GET  ?token=xxx  — immediate delete via email link (unactivated accounts only)
//   POST             — schedule pending deletion (30d) for authenticated users

import { createClient } from '@supabase/supabase-js'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// ---------------------------------------------------------------------------
// Token verification (matches signDeleteToken in onboarding-reminder.js)
// ---------------------------------------------------------------------------

function verifyDeleteToken(token) {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8')
    const parts = decoded.split(':')
    if (parts.length !== 3) return null
    const [userId, action, sig] = parts
    if (action !== 'delete') return null
    const secret = process.env.INTERNAL_FUNCTION_SECRET || 'fallback-secret'
    const payload = `${userId}:delete`
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex')
    if (sig !== expected) return null
    return userId
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Shared: hard-delete everything for a user
// ---------------------------------------------------------------------------

async function hardDeleteUser(userId) {
  // 1. Delete Storage files (invoices pdfs + attachments)
  // List all files under majstor's folder — best effort, non-fatal
  try {
    const { data: pdfFiles } = await supabaseAdmin.storage
      .from('invoices')
      .list(userId, { limit: 1000 })
    if (pdfFiles?.length) {
      const paths = pdfFiles.map(f => `${userId}/${f.name}`)
      await supabaseAdmin.storage.from('invoices').remove(paths)
    }
  } catch (err) {
    console.warn('⚠️ Storage cleanup failed (non-fatal):', err.message)
  }

  try {
    const { data: attachFiles } = await supabaseAdmin.storage
      .from('invoice-attachments')
      .list(userId, { limit: 1000 })
    if (attachFiles?.length) {
      const paths = attachFiles.map(f => `${userId}/${f.name}`)
      await supabaseAdmin.storage.from('invoice-attachments').remove(paths)
    }
  } catch (err) {
    console.warn('⚠️ Attachment storage cleanup failed (non-fatal):', err.message)
  }

  // 2. Delete majstors row (cascades invoices, push_subscriptions, etc.)
  const { error: majstorErr } = await supabaseAdmin
    .from('majstors')
    .delete()
    .eq('id', userId)
  if (majstorErr) throw new Error(`majstors delete failed: ${majstorErr.message}`)

  // 3. Delete auth user
  const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(userId)
  if (authErr) throw new Error(`auth delete failed: ${authErr.message}`)
}

// ---------------------------------------------------------------------------
// GET — email link click (immediate delete, unactivated accounts only)
// ---------------------------------------------------------------------------

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.redirect(new URL('/?deleted=invalid', request.url))
  }

  const userId = verifyDeleteToken(token)
  if (!userId) {
    return NextResponse.redirect(new URL('/?deleted=invalid', request.url))
  }

  // Safety check — only delete if they still haven't chosen a plan
  const { data: majstor } = await supabaseAdmin
    .from('majstors')
    .select('id, subscription_status')
    .eq('id', userId)
    .single()

  if (!majstor) {
    // Already deleted or doesn't exist
    return NextResponse.redirect(new URL('/?deleted=ok', request.url))
  }

  if (majstor.subscription_status !== null) {
    // They activated an account in the meantime — don't delete via email link
    return NextResponse.redirect(new URL('/login?deleted=protected', request.url))
  }

  try {
    await hardDeleteUser(userId)
    return NextResponse.redirect(new URL('/?deleted=ok', request.url))
  } catch (err) {
    console.error('❌ Email-link delete failed:', err.message)
    return NextResponse.redirect(new URL('/?deleted=error', request.url))
  }
}

// ---------------------------------------------------------------------------
// POST — authenticated user requests deletion (pending 30 days)
// ---------------------------------------------------------------------------

export async function POST(request) {
  const cookieStore = cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
  }

  const { data: majstor } = await supabaseAdmin
    .from('majstors')
    .select('id, subscription_status, subscription_ends_at')
    .eq('id', user.id)
    .single()

  if (!majstor) {
    return NextResponse.json({ error: 'Profil nicht gefunden' }, { status: 404 })
  }

  // PRO users: schedule deletion for after subscription ends + 30 days
  // Others: schedule deletion for 30 days from now
  let deletionDate
  if (
    majstor.subscription_status === 'active' &&
    majstor.subscription_ends_at
  ) {
    const subEnd = new Date(majstor.subscription_ends_at)
    deletionDate = new Date(subEnd.getTime() + 30 * 24 * 60 * 60 * 1000)
  } else {
    deletionDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  }

  const { error: updateErr } = await supabaseAdmin
    .from('majstors')
    .update({
      pending_deletion: true,
      deletion_scheduled_at: deletionDate.toISOString(),
    })
    .eq('id', user.id)

  if (updateErr) {
    console.error('❌ Pending deletion update failed:', updateErr.message)
    return NextResponse.json({ error: 'Fehler beim Planen der Löschung' }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    deletion_scheduled_at: deletionDate.toISOString(),
    is_pro: majstor.subscription_status === 'active',
  })
}

// ---------------------------------------------------------------------------
// DELETE — cancel pending deletion (user changed their mind)
// ---------------------------------------------------------------------------

export async function DELETE(request) {
  const cookieStore = cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
  }

  const { error } = await supabaseAdmin
    .from('majstors')
    .update({ pending_deletion: false, deletion_scheduled_at: null })
    .eq('id', user.id)

  if (error) {
    return NextResponse.json({ error: 'Fehler beim Abbrechen' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
