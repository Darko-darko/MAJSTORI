// app/api/shorten/route.js — create a short link
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function generateCode(length = 8) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let code = ''
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export async function POST(request) {
  try {
    const { url, type, expiresAt } = await request.json()
    if (!url || !type) {
      return NextResponse.json({ error: 'url and type required' }, { status: 400 })
    }

    // Try up to 5 times in case of code collision
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = generateCode()
      const { error } = await supabase
        .from('short_links')
        .insert({ code, url, type, expires_at: expiresAt || null })

      if (!error) {
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://pro-meister.de'
        return NextResponse.json({ shortUrl: `${baseUrl}/${type}/${code}` })
      }

      // If not a unique violation, bail out
      if (error.code !== '23505') {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    return NextResponse.json({ error: 'Could not generate unique code' }, { status: 500 })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
