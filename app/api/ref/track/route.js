// app/api/ref/track/route.js — log a referral link click (no auth required)
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const { ref_code, source } = await request.json()
    if (!ref_code) return NextResponse.json({ error: 'ref_code required' }, { status: 400 })

    await admin.from('ref_clicks').insert({
      ref_code,
      source: source || 'link',
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
