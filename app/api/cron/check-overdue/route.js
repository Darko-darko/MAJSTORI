// app/api/cron/check-overdue/route.js
// Scheduled: runs daily at 8:00 UTC
// Sends push notification to majstors whose invoices became overdue yesterday.

import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request) {
  // Verify cron secret (Vercel sends this header for cron jobs)
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]

    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]

    const { data: overdueInvoices, error } = await supabase
      .from('invoices')
      .select('id, majstor_id, invoice_number, due_date')
      .in('status', ['sent', 'draft'])
      .gte('due_date', yesterdayStr)
      .lt('due_date', todayStr)

    if (error) {
      console.error('❌ Supabase error:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    if (!overdueInvoices || overdueInvoices.length === 0) {
      console.log('ℹ️ No overdue invoices for yesterday:', yesterdayStr)
      return Response.json({ ok: true, overdue: 0 })
    }

    console.log(`📋 Found ${overdueInvoices.length} overdue invoice(s) for ${yesterdayStr}`)

    const majstorMap = {}
    for (const invoice of overdueInvoices) {
      if (!majstorMap[invoice.majstor_id]) {
        majstorMap[invoice.majstor_id] = []
      }
      majstorMap[invoice.majstor_id].push(invoice)
    }

    for (const [majstorId, invoices] of Object.entries(majstorMap)) {
      const count = invoices.length
      const title = count === 1
        ? '⚠️ Unbezahlte Rechnung!'
        : `⚠️ ${count} unbezahlte Rechnungen!`
      const message = count === 1
        ? `Rechnung ${invoices[0].invoice_number} ist überfällig.`
        : `${count} Rechnungen sind überfällig.`

      const { data: subscriptions } = await supabase
        .from('push_subscriptions')
        .select('id, endpoint, p256dh, auth')
        .eq('majstor_id', majstorId)

      if (!subscriptions || subscriptions.length === 0) continue

      const payload = JSON.stringify({ title, message, url: '/dashboard/invoices' })
      const expired = []

      for (const sub of subscriptions) {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload
          )
          console.log(`✅ Push sent to majstor ${majstorId}`)
        } catch (err) {
          if (err.statusCode === 410 || err.statusCode === 404) {
            expired.push(sub.id)
          } else {
            console.error('❌ Push error:', err.message)
          }
        }
      }

      if (expired.length > 0) {
        await supabase.from('push_subscriptions').delete().in('id', expired)
      }
    }

    return Response.json({ ok: true, overdue: overdueInvoices.length })
  } catch (err) {
    console.error('💥 check-overdue-invoices error:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
