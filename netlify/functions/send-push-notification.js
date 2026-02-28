// netlify/functions/send-push-notification.js
// Internal function: sends push notifications to all subscriptions of a majstor.
// Called by other server-side functions (webhooks, cron jobs) — not from frontend.

const webpush = require('web-push')
const { createClient } = require('@supabase/supabase-js')

const INTERNAL_SECRET = process.env.INTERNAL_FUNCTION_SECRET
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY
const VAPID_SUBJECT = process.env.VAPID_SUBJECT

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-internal-secret',
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' }),
    }
  }

  // Zaštita — samo interni pozivi
  const secret = event.headers['x-internal-secret']
  if (!INTERNAL_SECRET || secret !== INTERNAL_SECRET) {
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Unauthorized' }),
    }
  }

  try {
    const body = JSON.parse(event.body || '{}')
    const { majstorId, title, message, url } = body

    if (!majstorId || !title || !message) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Missing majstorId, title or message' }),
      }
    }

    // Dohvati sve push subscriptions za ovog majstora
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('majstor_id', majstorId)

    if (error) {
      console.error('❌ Supabase error:', error)
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Database error' }),
      }
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('ℹ️ No push subscriptions for majstor:', majstorId)
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ sent: 0, message: 'No subscriptions' }),
      }
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
        // 410 Gone = subscription istekla, obriši je
        if (err.statusCode === 410 || err.statusCode === 404) {
          expired.push(sub.id)
          console.log('🗑️ Expired subscription, removing:', sub.id)
        } else {
          console.error('❌ Push error for sub', sub.id, ':', err.message)
        }
      }
    }

    // Obriši istekle subscriptions
    if (expired.length > 0) {
      await supabase.from('push_subscriptions').delete().in('id', expired)
    }

    console.log(`✅ Push sent: ${sent}/${subscriptions.length} for majstor ${majstorId}`)

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ sent, total: subscriptions.length }),
    }
  } catch (error) {
    console.error('💥 Send push error:', error)
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Failed to send push notification', message: error.message }),
    }
  }
}
