import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '')
  const { searchParams } = new URL(request.url)
  const majstorId = searchParams.get('majstor_id')
  const path = searchParams.get('path')
  const bucket = searchParams.get('bucket') || 'invoice-pdfs'

  if (!majstorId || !path) {
    return NextResponse.json({ error: 'majstor_id and path required' }, { status: 400 })
  }

  if (!token) return NextResponse.json({ error: 'Kein Token' }, { status: 401 })

  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'Ungültiger Token' }, { status: 401 })

  const { data: access } = await supabase
    .from('buchhalter_access')
    .select('id')
    .eq('buchhalter_id', user.id)
    .eq('majstor_id', majstorId)
    .eq('status', 'active')
    .single()

  if (!access) return NextResponse.json({ error: 'Kein Zugang' }, { status: 403 })

  const { data: signed } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 600)

  return NextResponse.json({ signedUrl: signed?.signedUrl || null })
}
