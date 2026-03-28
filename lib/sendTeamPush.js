// lib/sendTeamPush.js — Send push notification for team events
export async function sendTeamPush({ majstorId, title, message, url }) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:8888')

    const res = await fetch(`${baseUrl}/api/send-push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': process.env.INTERNAL_FUNCTION_SECRET || '',
      },
      body: JSON.stringify({ majstorId, title, message, url }),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      console.error(`Push API ${res.status}: ${text}`)
    }
  } catch (err) {
    console.error('Push notification failed:', err.message)
  }
}
