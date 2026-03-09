// app/api/user/export/route.js
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import JSZip from 'jszip'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const uid = user.id

  const [majstor, invoices, customers, services, ausgaben, aufmasse] = await Promise.all([
    supabase.from('majstors').select('*').eq('id', uid).single().then(r => r.data),
    supabase.from('invoices').select('*').eq('majstor_id', uid).then(r => r.data || []),
    supabase.from('customers').select('*').eq('majstor_id', uid).then(r => r.data || []),
    supabase.from('services').select('*').eq('majstor_id', uid).then(r => r.data || []),
    supabase.from('ausgaben').select('*').eq('majstor_id', uid).then(r => r.data || []),
    supabase.from('aufmasse').select('*').eq('majstor_id', uid).then(r => r.data || []),
  ])

  const zip = new JSZip()
  zip.file('profil.json', JSON.stringify(majstor, null, 2))
  zip.file('rechnungen.json', JSON.stringify(invoices, null, 2))
  zip.file('kunden.json', JSON.stringify(customers, null, 2))
  zip.file('leistungen.json', JSON.stringify(services, null, 2))
  zip.file('ausgaben.json', JSON.stringify(ausgaben, null, 2))
  zip.file('aufmasse.json', JSON.stringify(aufmasse, null, 2))

  const zipBuffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  })

  const date = new Date().toISOString().split('T')[0]

  return new NextResponse(zipBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="pro-meister-export-${date}.zip"`,
    }
  })
}
