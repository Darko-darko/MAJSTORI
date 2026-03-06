// app/re/[code]/route.js — short link redirect for Rechnungen ZIPs
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request, { params }) {
  const { code } = params

  const { data, error } = await supabase
    .from('short_links')
    .select('url, expires_at')
    .eq('code', code)
    .eq('type', 're')
    .single()

  if (error || !data) {
    return new NextResponse('Link nicht gefunden.', { status: 404 })
  }

  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return new NextResponse('Dieser Link ist abgelaufen.', { status: 410 })
  }

  return NextResponse.redirect(data.url)
}
