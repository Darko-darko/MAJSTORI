// app/api/invoices/bulk-zip/route.js
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import JSZip from 'jszip'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const { invoiceIds, majstorId, zipFilename } = await request.json()

    if (!invoiceIds?.length || !majstorId) {
      return NextResponse.json({ error: 'invoiceIds and majstorId required' }, { status: 400 })
    }

    // Get invoices
    const { data: invoices, error: invoicesError } = await supabase
      .from('invoices')
      .select('id, type, invoice_number, quote_number, customer_name, pdf_storage_path')
      .in('id', invoiceIds)
      .eq('majstor_id', majstorId)
      .not('pdf_storage_path', 'is', null)

    if (invoicesError || !invoices?.length) {
      return NextResponse.json({ error: 'No invoices with PDFs found' }, { status: 404 })
    }

    // Download all PDFs in parallel
    const pdfResults = await Promise.all(
      invoices.map(async (invoice) => {
        try {
          const { data, error } = await supabase.storage
            .from('invoice-pdfs')
            .download(invoice.pdf_storage_path)

          if (error || !data) return null

          const docType = invoice.type === 'quote' ? 'Angebot' : 'Rechnung'
          const docNumber = invoice.invoice_number || invoice.quote_number
          const customerSlug = (invoice.customer_name || 'Kunde')
            .replace(/[^a-zA-Z0-9äöüÄÖÜß\s-]/g, '')
            .trim()
            .replace(/\s+/g, '_')
            .substring(0, 30)
          const filename = `${docType}_${docNumber}_${customerSlug}.pdf`

          return { filename, buffer: await data.arrayBuffer() }
        } catch {
          return null
        }
      })
    )

    const validPDFs = pdfResults.filter(Boolean)

    if (!validPDFs.length) {
      return NextResponse.json({ error: 'No PDFs could be loaded' }, { status: 500 })
    }

    // Build ZIP
    const zip = new JSZip()
    validPDFs.forEach(({ filename, buffer }) => zip.file(filename, buffer))

    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    })

    // Upload ZIP to Supabase storage
    const timestamp = Date.now()
    const zipPath = `temp-zips/${majstorId}/${timestamp}_rechnungen.zip`

    const { error: uploadError } = await supabase.storage
      .from('invoice-pdfs')
      .upload(zipPath, zipBuffer, {
        contentType: 'application/zip',
        upsert: true
      })

    if (uploadError) {
      console.error('ZIP upload error:', uploadError)
      return NextResponse.json({ error: 'ZIP upload failed: ' + uploadError.message }, { status: 500 })
    }

    // Create signed URL valid for 7 days — download parameter sets Content-Disposition filename
    const downloadFilename = zipFilename || `${timestamp}_rechnungen.zip`
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('invoice-pdfs')
      .createSignedUrl(zipPath, 60 * 60 * 24 * 14, { download: downloadFilename })

    if (signedUrlError) {
      return NextResponse.json({ error: 'Signed URL failed: ' + signedUrlError.message }, { status: 500 })
    }

    // Create short link (valid 14 days, same as signed URL)
    let shortUrl = null
    try {
      const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
      let code = ''
      for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)]
      const expiresAt = new Date(Date.now() + 60 * 60 * 24 * 14 * 1000).toISOString()
      const { error: insertError } = await supabase
        .from('short_links')
        .insert({ code, url: signedUrlData.signedUrl, type: 're', expires_at: expiresAt })
      if (!insertError) {
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://pro-meister.de'
        shortUrl = `${baseUrl}/re/${code}`
      }
    } catch {
      // shortUrl remains null — not critical
    }

    return NextResponse.json({
      success: true,
      zipUrl: signedUrlData.signedUrl,
      shortUrl,
      count: validPDFs.length,
      skipped: invoices.length - validPDFs.length
    })

  } catch (error) {
    console.error('bulk-zip error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
