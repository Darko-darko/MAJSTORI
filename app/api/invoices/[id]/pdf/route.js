// app/api/invoices/[id]/pdf/route.js - OPTIMIZED: Serve cached immediately

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { InvoicePDFService } from '@/lib/pdf/InvoicePDFService'
import { Buffer } from 'node:buffer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { persistSession: false },
  }
)

export async function GET(request, routeData) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await routeData.params
    const { searchParams } = new URL(request.url)
    const forceRegenerate = searchParams.get('forceRegenerate') === 'true'

    console.log('📄 PDF API called for ID:', id, { forceRegenerate })

    // Invoice + Majstor in parallel
    const [invoiceResult, majstorResult] = await Promise.all([
      supabase.from('invoices').select('*').eq('id', id).single(),
      supabase.from('majstors').select('*').eq('id', user.id).single(),
    ])

    const { data: invoice, error: invoiceError } = invoiceResult
    const { data: majstor, error: majstorError } = majstorResult

    if (invoiceError || !invoice) {
      console.error('❌ Invoice not found:', invoiceError)
      return NextResponse.json({ error: 'Rechnung nicht gefunden' }, { status: 404 })
    }
    if (invoice.majstor_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    if (majstorError || !majstor) {
      console.error('❌ Majstor not found:', majstorError)
      return NextResponse.json({ error: 'Geschäftsdaten nicht gefunden' }, { status: 404 })
    }

    // Load all linked Aufmaß data
    let aufmassDataList = []
    const aufmassIds = invoice.aufmass_ids || (invoice.aufmass_id ? [invoice.aufmass_id] : [])
    if (aufmassIds.length > 0) {
      const { data: aufmasse } = await supabase
        .from('aufmasse').select('*').in('id', aufmassIds)
      if (aufmasse?.length > 0) aufmassDataList = aufmasse
    }

    // ⚡ FAST PATH: Serve cached PDF if exists and up-to-date
    if (!forceRegenerate && invoice.pdf_storage_path && invoice.pdf_generated_at) {
      const pdfGenAt = new Date(invoice.pdf_generated_at)
      const invoiceOutdated = new Date(invoice.updated_at) > pdfGenAt
      const aufmassOutdated = aufmassDataList.some(a => a.updated_at && new Date(a.updated_at) > pdfGenAt)

      if (!invoiceOutdated && !aufmassOutdated) {
        console.log('✅ Serving cached PDF (up-to-date)')
        return await servePDFFromArchive(invoice)
      }
    }

    // For storno invoices, fetch original invoice number for PDF/ZUGFeRD reference
    let stornoOfNumber = null
    if (invoice.type === 'storno' && invoice.storno_of) {
      const { data: orig } = await supabase
        .from('invoices').select('invoice_number').eq('id', invoice.storno_of).single()
      stornoOfNumber = orig?.invoice_number || null
    }

    // Generate new PDF
    console.log('🔄 Regenerating PDF...')
    const pdfService = new InvoicePDFService()
    const pdfBuffer = await pdfService.generateInvoice({ ...invoice, stornoOfNumber }, majstor, aufmassDataList)

    // Archive in background — don't block the response
    archivePDF(pdfBuffer, invoice, majstor.id).catch(err =>
      console.error('❌ Background PDF archiving failed:', err)
    )

    const documentType = invoice.type === 'quote' ? 'Angebot' : invoice.type === 'storno' ? 'Stornorechnung' : 'Rechnung'
    const documentNumber = invoice.invoice_number || invoice.quote_number || 'DRAFT'
    const customerName = invoice.customer_name.replace(/[^a-zA-Z0-9]/g, '_')
    const filename = `${documentType}_${documentNumber}_${customerName}.pdf`

    console.log('✅ Serving regenerated PDF:', filename)

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    })
  } catch (error) {
    console.error('❌ PDF Generation Error:', error)
    return NextResponse.json(
      {
        error: 'PDF-Generierung fehlgeschlagen',
        details: error.message,
      },
      { status: 500 }
    )
  }
}

// Archive PDF with UPSERT
async function archivePDF(pdfBuffer, invoiceData, majstorId) {
  try {
    const documentType = invoiceData.type === 'quote' ? 'angebote' : invoiceData.type === 'storno' ? 'stornos' : 'rechnungen'
    const documentNumber =
      invoiceData.invoice_number ||
      invoiceData.quote_number ||
      `draft-${invoiceData.id}`
    const year = new Date(invoiceData.created_at).getFullYear()
    const month = new Date(invoiceData.created_at).getMonth() + 1

    const storagePath = `${majstorId}/${year}/${month
      .toString()
      .padStart(2, '0')}/${documentType}/${documentNumber}.pdf`

    console.log('📤 Uploading PDF to Storage:', storagePath)

    const { error: uploadError } = await supabase.storage
      .from('invoice-pdfs')
      .upload(storagePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
        cacheControl: '0',
      })

    if (uploadError) {
      console.error('❌ Storage upload error:', uploadError)
      throw uploadError
    }

    console.log('✅ PDF uploaded/replaced successfully')

    const { error: updateError } = await supabase
      .from('invoices')
      .update({
        pdf_generated_at: new Date().toISOString(),
        pdf_storage_path: storagePath,
        pdf_file_size: pdfBuffer.length,
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoiceData.id)

    if (updateError) {
      console.error('❌ Metadata update error:', updateError)
      throw updateError
    }

    console.log('✅ Invoice metadata updated with fresh PDF timestamp')
  } catch (error) {
    console.error('❌ PDF archiving failed:', error)
    throw error
  }
}

// Serve PDF from archive
async function servePDFFromArchive(invoice) {
  try {
    console.log('📥 Downloading PDF from Storage:', invoice.pdf_storage_path)

    const { data, error: downloadError } = await supabase.storage
      .from('invoice-pdfs')
      .download(invoice.pdf_storage_path)

    if (downloadError) {
      console.error('❌ Storage download error:', downloadError)
      throw downloadError
    }

    const pdfBuffer = Buffer.from(await data.arrayBuffer())

    const documentType = invoice.type === 'quote' ? 'Angebot' : invoice.type === 'storno' ? 'Stornorechnung' : 'Rechnung'
    const documentNumber = invoice.invoice_number || invoice.quote_number
    const customerName = invoice.customer_name.replace(/[^a-zA-Z0-9]/g, '_')
    const filename = `${documentType}_${documentNumber}_${customerName}.pdf`

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch (error) {
    console.error('❌ Archive PDF serving failed:', error)
    throw error
  }
}