import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import JSZip from 'jszip'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function verifyAccess(token, majstorId) {
  if (!token) return false
  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) return false

  const { data } = await supabase
    .from('buchhalter_access')
    .select('id')
    .eq('buchhalter_id', user.id)
    .eq('majstor_id', majstorId)
    .eq('status', 'active')
    .single()

  return !!data
}

// GET /api/buchhalter-archive?majstor_id=xxx&type=invoices|ausgaben
export async function GET(request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '')
  const { searchParams } = new URL(request.url)
  const majstorId = searchParams.get('majstor_id')
  const type = searchParams.get('type') || 'invoices'

  if (!majstorId) return NextResponse.json({ error: 'majstor_id fehlt' }, { status: 400 })

  const hasAccess = await verifyAccess(token, majstorId)
  if (!hasAccess) return NextResponse.json({ error: 'Kein Zugang' }, { status: 403 })

  if (type === 'ausgaben') {
    const month = parseInt(searchParams.get('month') ?? new Date().getMonth())
    const year = parseInt(searchParams.get('year') ?? new Date().getFullYear())
    const from = new Date(year, month, 1).toISOString()
    const to = new Date(year, month + 1, 0, 23, 59, 59).toISOString()

    // Try with scan columns first, fallback to basic if columns don't exist yet
    let { data, error } = await supabase
      .from('ausgaben')
      .select('id, storage_path, filename, created_at, vendor, receipt_date, amount_gross, amount_net, vat_rate, vat_amount, category, description, scanned_at, uploaded_by')
      .eq('majstor_id', majstorId)
      .gte('created_at', from)
      .lte('created_at', to)
      .order('created_at', { ascending: false })

    // Fallback: if scan columns don't exist yet, query basic columns only
    if (error && error.code === '42703') {
      const fallback = await supabase
        .from('ausgaben')
        .select('id, storage_path, filename, created_at')
        .eq('majstor_id', majstorId)
        .gte('created_at', from)
        .lte('created_at', to)
        .order('created_at', { ascending: false })
      data = fallback.data
      error = fallback.error
    }

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Generate signed URLs server-side (buchhalter can't access storage directly)
    const signedData = await Promise.all(
      (data || []).map(async (item) => {
        const { data: s } = await supabase.storage
          .from('ausgaben')
          .createSignedUrl(item.storage_path, 600)
        return { ...item, signedUrl: s?.signedUrl || null }
      })
    )

    return NextResponse.json({ data: signedData })
  }

  // invoices
  const { data, error } = await supabase
    .from('invoices')
    .select('id, type, invoice_number, quote_number, customer_name, total_amount, pdf_generated_at, pdf_storage_path, status, issue_date, due_date, tax_rate, subtotal, tax_amount')
    .eq('majstor_id', majstorId)
    .not('pdf_storage_path', 'is', null)
    .neq('status', 'dummy')
    .in('type', ['invoice', 'storno'])
    .order('pdf_generated_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const signedData = await Promise.all(
    (data || []).map(async (inv) => {
      const { data: s } = await supabase.storage
        .from('invoice-pdfs')
        .createSignedUrl(inv.pdf_storage_path, 600)
      return { ...inv, signedUrl: s?.signedUrl || null }
    })
  )

  return NextResponse.json({ data: signedData })
}

// PATCH — toggle paid status for invoices OR update ausgabe scan data (buchhalter)
export async function PATCH(request) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    const body = await request.json()
    const { majstorId, type } = body

    if (!majstorId) return NextResponse.json({ error: 'majstorId required' }, { status: 400 })

    const hasAccess = await verifyAccess(token, majstorId)
    if (!hasAccess) return NextResponse.json({ error: 'Kein Zugang' }, { status: 403 })

    // Update ausgabe scan metadata
    if (type === 'ausgabe_scan') {
      const { ausgabeId, scanData } = body
      if (!ausgabeId || !scanData) {
        return NextResponse.json({ error: 'ausgabeId and scanData required' }, { status: 400 })
      }

      const allowed = ['vendor', 'receipt_date', 'amount_gross', 'amount_net', 'vat_rate', 'vat_amount', 'category', 'description']
      const clean = {}
      for (const key of allowed) {
        if (scanData[key] !== undefined) clean[key] = scanData[key]
      }

      const { data, error } = await supabase
        .from('ausgaben')
        .update(clean)
        .eq('id', ausgabeId)
        .eq('majstor_id', majstorId)
        .select()
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, ausgabe: data })
    }

    // Default: toggle paid status for invoices
    const { invoiceIds, action } = body
    if (!invoiceIds?.length || !action) {
      return NextResponse.json({ error: 'invoiceIds and action required' }, { status: 400 })
    }

    const updateData = action === 'paid'
      ? { status: 'paid', paid_date: new Date().toISOString().split('T')[0], updated_at: new Date().toISOString() }
      : { status: 'sent', paid_date: null, updated_at: new Date().toISOString() }

    const { data, error } = await supabase
      .from('invoices')
      .update(updateData)
      .in('id', invoiceIds)
      .eq('majstor_id', majstorId)
      .select('id')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true, updated: data?.length || 0 })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// POST — ZIP download OR upload ausgabe (buchhalter)
export async function POST(request) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    const body = await request.json()
    const { majstorId, type = 'ausgaben' } = body

    if (!majstorId) return NextResponse.json({ error: 'majstorId required' }, { status: 400 })

    const hasAccess = await verifyAccess(token, majstorId)
    if (!hasAccess) return NextResponse.json({ error: 'Kein Zugang' }, { status: 403 })

    // --- UPLOAD AUSGABE (buchhalter uploading for majstor) ---
    if (type === 'upload_ausgabe') {
      const { data: { user } } = await supabase.auth.getUser(token)
      if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

      const { storage_path, filename } = body
      if (!storage_path) return NextResponse.json({ error: 'storage_path required' }, { status: 400 })

      const { data, error } = await supabase
        .from('ausgaben')
        .insert({
          majstor_id: majstorId,
          storage_path,
          filename: filename || null,
          uploaded_by: user.id
        })
        .select()
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, ausgabe: data })
    }

    // --- SIGNED UPLOAD URL (buchhalter needs this to upload to storage) ---
    if (type === 'upload_url') {
      const { path } = body
      if (!path) return NextResponse.json({ error: 'path required' }, { status: 400 })
      // Ensure path is under the majstor's folder
      if (!path.startsWith(`${majstorId}/`)) return NextResponse.json({ error: 'Invalid path' }, { status: 400 })

      const { data, error } = await supabase.storage
        .from('ausgaben')
        .createSignedUploadUrl(path)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ signedUrl: data.signedUrl, token: data.token, path: data.path })
    }

    // --- INVOICES ZIP ---
    if (type === 'invoices') {
      const { invoiceIds } = body
      if (!invoiceIds?.length) return NextResponse.json({ error: 'invoiceIds required' }, { status: 400 })

      const { data: invoices, error: fetchError } = await supabase
        .from('invoices')
        .select('id, invoice_number, quote_number, pdf_storage_path, type')
        .in('id', invoiceIds)
        .eq('majstor_id', majstorId)

      if (fetchError || !invoices?.length) return NextResponse.json({ error: 'No invoices found' }, { status: 404 })

      const fileResults = await Promise.all(
        invoices.map(async (inv, index) => {
          try {
            const { data, error } = await supabase.storage.from('invoice-pdfs').download(inv.pdf_storage_path)
            if (error || !data) return null
            const num = inv.invoice_number || inv.quote_number || String(index + 1).padStart(3, '0')
            const prefix = inv.type === 'quote' ? 'Angebot' : inv.type === 'storno' ? 'Storno' : 'Rechnung'
            return { filename: `${prefix}_${num}.pdf`, buffer: await data.arrayBuffer() }
          } catch { return null }
        })
      )

      const validFiles = fileResults.filter(Boolean)
      if (!validFiles.length) return NextResponse.json({ error: 'No files could be loaded' }, { status: 500 })

      const zip = new JSZip()
      validFiles.forEach(({ filename, buffer }) => zip.file(filename, buffer))
      const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } })

      const timestamp = Date.now()
      const zipPath = `temp-zips-invoices/buchhalter/${majstorId}/${timestamp}.zip`

      const { error: uploadError } = await supabase.storage
        .from('invoice-pdfs')
        .upload(zipPath, zipBuffer, { contentType: 'application/zip', upsert: true })

      if (uploadError) return NextResponse.json({ error: 'ZIP upload failed' }, { status: 500 })

      const { data: signedUrlData } = await supabase.storage
        .from('invoice-pdfs')
        .createSignedUrl(zipPath, 60 * 60 * 24 * 7, { download: `Rechnungen_${new Date().toLocaleDateString('de-DE').replace(/\./g, '-')}.zip` })

      return NextResponse.json({ success: true, zipUrl: signedUrlData?.signedUrl, count: validFiles.length })
    }

    // --- AUSGABEN ZIP ---
    const { ausgabenIds } = body
    if (!ausgabenIds?.length) return NextResponse.json({ error: 'ausgabenIds required' }, { status: 400 })

    const { data: ausgaben, error: fetchError } = await supabase
      .from('ausgaben')
      .select('id, filename, storage_path')
      .in('id', ausgabenIds)
      .eq('majstor_id', majstorId)

    if (fetchError || !ausgaben?.length) return NextResponse.json({ error: 'No ausgaben found' }, { status: 404 })

    const fileResults = await Promise.all(
      ausgaben.map(async (a, index) => {
        try {
          const { data, error } = await supabase.storage.from('ausgaben').download(a.storage_path)
          if (error || !data) return null
          const ext = a.storage_path.split('.').pop() || 'jpg'
          const filename = a.filename || `Beleg_${String(index + 1).padStart(3, '0')}.${ext}`
          return { filename, buffer: await data.arrayBuffer() }
        } catch { return null }
      })
    )

    const validFiles = fileResults.filter(Boolean)
    if (!validFiles.length) return NextResponse.json({ error: 'No files could be loaded' }, { status: 500 })

    const zip = new JSZip()
    validFiles.forEach(({ filename, buffer }) => zip.file(filename, buffer))
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } })

    const timestamp = Date.now()
    const zipPath = `temp-zips-ausgaben/buchhalter/${majstorId}/${timestamp}.zip`

    const { error: uploadError } = await supabase.storage
      .from('invoice-pdfs')
      .upload(zipPath, zipBuffer, { contentType: 'application/zip', upsert: true })

    if (uploadError) return NextResponse.json({ error: 'ZIP upload failed' }, { status: 500 })

    const { data: signedUrlData } = await supabase.storage
      .from('invoice-pdfs')
      .createSignedUrl(zipPath, 60 * 60 * 24 * 7, { download: `Ausgaben_${new Date().toLocaleDateString('de-DE').replace(/\./g, '-')}.zip` })

    return NextResponse.json({ success: true, zipUrl: signedUrlData?.signedUrl, count: validFiles.length })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// DELETE — remove ausgaben (buchhalter)
export async function DELETE(request) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    const { majstorId, ausgabenIds } = await request.json()

    if (!majstorId || !ausgabenIds?.length) {
      return NextResponse.json({ error: 'majstorId and ausgabenIds required' }, { status: 400 })
    }

    const hasAccess = await verifyAccess(token, majstorId)
    if (!hasAccess) return NextResponse.json({ error: 'Kein Zugang' }, { status: 403 })

    // Fetch storage paths
    const { data: items } = await supabase
      .from('ausgaben')
      .select('id, storage_path')
      .in('id', ausgabenIds)
      .eq('majstor_id', majstorId)

    if (!items?.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Delete from storage
    const paths = items.map(i => i.storage_path).filter(Boolean)
    if (paths.length) await supabase.storage.from('ausgaben').remove(paths)

    // Delete from DB
    await supabase.from('ausgaben').delete().in('id', items.map(i => i.id))

    return NextResponse.json({ success: true, deleted: items.length })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
