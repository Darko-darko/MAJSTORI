// app/api/send-push/route.js
// Internal function: sends push notifications to all subscriptions of a majstor.

import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

const INTERNAL_SECRET = process.env.INTERNAL_FUNCTION_SECRET

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  // Auth check — internal calls only
  const secret = request.headers.get('x-internal-secret')
  if (!INTERNAL_SECRET || secret !== INTERNAL_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { majstorId, title, message, url } = body

    if (!majstorId || !title || !message) {
      return Response.json({ error: 'Missing majstorId, title or message' }, { status: 400 })
    }

    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('majstor_id', majstorId)

    if (error) {
      console.error('❌ Supabase error:', error)
      return Response.json({ error: 'Database error' }, { status: 500 })
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('ℹ️ No push subscriptions for majstor:', majstorId)
      return Response.json({ sent: 0, message: 'No subscriptions' })
    }

    const payload = JSON.stringify({ title, message, url: url || '/dashboard' })

    let sent = 0
    const expired = []

    for (const sub of subscriptions) {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      }

      try {
        await webpush.sendNotification(pushSubscription, payload)
        sent++
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          expired.push(sub.id)
          console.log('🗑️ Expired subscription, removing:', sub.id)
        } else {
          console.error('❌ Push error for sub', sub.id, ':', err.message)
        }
      }
    }

    if (expired.length > 0) {
      await supabase.from('push_subscriptions').delete().in('id', expired)
    }

    console.log(`✅ Push sent: ${sent}/${subscriptions.length} for majstor ${majstorId}`)

    return Response.json({ sent, total: subscriptions.length })
  } catch (error) {
    console.error('💥 Send push error:', error)
    return Response.json({ error: 'Failed to send push notification', message: error.message }, { status: 500 })
  }
}
