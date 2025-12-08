import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  console.log('✅ /api/ping HIT!')
  return NextResponse.json({ ok: true, message: 'Ping radi!' })
}
