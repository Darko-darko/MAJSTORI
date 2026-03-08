// netlify/functions/cleanup-pending-deletions.js
// Scheduled: runs daily at 02:00 UTC
// Hard-deletes accounts where deletion_scheduled_at < now() and pending_deletion = true

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function hardDeleteUser(userId) {
  // Storage cleanup (best effort)
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

  // Delete majstors row (cascades)
  const { error: majErr } = await supabase.from('majstors').delete().eq('id', userId)
  if (majErr) throw new Error(`majstors: ${majErr.message}`)

  // Delete auth user
  const { error: authErr } = await supabase.auth.admin.deleteUser(userId)
  if (authErr) throw new Error(`auth: ${authErr.message}`)
}

exports.handler = async () => {
  try {
    const now = new Date().toISOString()

    const { data: expired, error } = await supabase
      .from('majstors')
      .select('id, email')
      .eq('pending_deletion', true)
      .lte('deletion_scheduled_at', now)

    if (error) {
      console.error('❌ Supabase error:', error)
      return { statusCode: 500 }
    }

    if (!expired?.length) {
      console.log('ℹ️ No expired pending deletions')
      return { statusCode: 200 }
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
    return { statusCode: 200 }
  } catch (err) {
    console.error('❌ Unexpected error:', err)
    return { statusCode: 500 }
  }
}
