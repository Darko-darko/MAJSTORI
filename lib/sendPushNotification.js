// lib/sendPushNotification.js
// Server-side utility: sends push notifications to all subscriptions of a majstor.
// Used by Next.js API routes and Netlify functions.

import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

/**
 * Sends push notifications to all subscriptions of a majstor.
 * Fire-and-forget — ne baca grešku ako nema subscriptions.
 *
 * @param {string} majstorId
 * @param {string} title
 * @param {string} message
 * @param {string} url - URL koji se otvara kad korisnik klikne notifikaciju
 */
export async function sendPushToMajstor(majstorId, title, message, url = '/dashboard') {
  try {
    const { data: subscriptions, error } = await supabaseAdmin
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('majstor_id', majstorId)

    if (error || !subscriptions || subscriptions.length === 0) {
      return
    }

    const payload = JSON.stringify({ title, message, url })
    const expired = []

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        )
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          expired.push(sub.id)
        } else {
          console.error('❌ Push error:', err.message)
        }
      }
    }

    if (expired.length > 0) {
      await supabaseAdmin.from('push_subscriptions').delete().in('id', expired)
    }
  } catch (err) {
    // Ne prekidamo main flow ako push ne uspe
    console.error('❌ sendPushToMajstor error:', err.message)
  }
}
