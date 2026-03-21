// app/api/cron/cleanup-deletions/route.js
// Scheduled: runs daily at 02:00 UTC
// Hard-deletes accounts where deletion_scheduled_at < now() and pending_deletion = true

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function hardDeleteUser(userId) {
  for (const bucket of ['invoices', 'invoice-attachments']) {
    try {
      const { data: files } = await supabase.storage.from(bucket).list(userId, { limit: 1000 })
      if (files?.length) {
        await supabase.storage.from(bucket).remove(files.map(f => `${userId}/${f.name}`))
      }
    } catch (e) {
      console.warn(`⚠️ Storage cleanup failed for ${bucket}/${userId}:`, e.message)
    }
  }

  const { error: majErr } = await supabase.from('majstors').delete().eq('id', userId)
  if (majErr) throw new Error(`majstors: ${majErr.message}`)

  const { error: authErr } = await supabase.auth.admin.deleteUser(userId)
  if (authErr) throw new Error(`auth: ${authErr.message}`)
}

export async function GET(request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const now = new Date().toISOString()

    const { data: expired, error } = await supabase
      .from('majstors')
      .select('id, email')
      .eq('pending_deletion', true)
      .lte('deletion_scheduled_at', now)

    if (error) {
      console.error('❌ Supabase error:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    if (!expired?.length) {
      console.log('ℹ️ No expired pending deletions')
      return Response.json({ ok: true, deleted: 0 })
    }

    let deleted = 0
    for (const user of expired) {
      try {
        await hardDeleteUser(user.id)
        deleted++
        console.log(`✅ Deleted account: ${user.email}`)
      } catch (err) {
        console.error(`❌ Failed to delete ${user.email}:`, err.message)
      }
    }

    console.log(`🗑️ Cleanup done — deleted ${deleted}/${expired.length} accounts`)
    return Response.json({ ok: true, deleted })
  } catch (err) {
    console.error('❌ Unexpected error:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
