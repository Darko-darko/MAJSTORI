// app/api/invoices/[id]/pdf/route.js - OPTIMIZED: Always serve from cache

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
    const { id } = await routeData.params
    const { searchParams } = new URL(request.url)
    const forceRegenerate = searchParams.get('forceRegenerate') === 'true'

    console.log('PDF API called for ID:', id, { forceRegenerate })

    // Invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .single()

    if (invoiceError || !invoice) {
      console.error('Invoice not found:', invoiceError)
      return NextResponse.json({ error: 'Rechnung nicht gefunden' }, { status: 404 })
    }

    // FAST PATH: Serve cached PDF (ALWAYS unless force regenerate)
    if (!forceRegenerate && invoice.pdf_storage_path) {
      console.log('Serving cached PDF from storage')
      return await servePDFFromArchive(invoice)
    }

    // REGENERATION PATH (only on force or missing PDF)
    console.log('Regenerating PDF...')
    
    // Majstor (only if regeneration needed)
    const { data: majstor, error: majstorError } = await supabase
      .from('majstors')
      .select('*')
      .eq('id', invoice.majstor_id)
      .single()

    if (majstorError || !majstor) {
      console.error('Majstor not found:', majstorError)
      return NextResponse.json({ error: 'Geschäftsdaten nicht gefunden' }, { status: 404 })
    }

    // Generate new PDF
    const pdfService = new InvoicePDFService()
    const pdfBuffer = await pdfService.generateInvoice(invoice, majstor)

    console.log('Archiving PDF...')
    await archivePDF(pdfBuffer, invoice, majstor.id)

    const documentType = invoice.type === 'quote' ? 'Angebot' : 'Rechnung'
    const documentNumber = invoice.invoice_number || invoice.quote_number || 'DRAFT'
    const customerName = invoice.customer_name.replace(/[^a-zA-Z0-9]/g, '_')
    const filename = `${documentType}_${documentNumber}_${customerName}.pdf`

    console.log('Serving regenerated PDF:', filename)

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
    console.error('PDF Generation Error:', error)
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
    const documentType = invoiceData.type === 'quote' ? 'angebote' : 'rechnungen'
    const documentNumber =
      invoiceData.invoice_number ||
      invoiceData.quote_number ||
      `draft-${invoiceData.id}`
    const year = new Date(invoiceData.created_at).getFullYear()
    const month = new Date(invoiceData.created_at).getMonth() + 1

    const storagePath = `${majstorId}/${year}/${month
      .toString()
      .padStart(2, '0')}/${documentType}/${documentNumber}.pdf`

    console.log('Uploading PDF to Storage:', storagePath)

    const { error: uploadError } = await supabase.storage
      .from('invoice-pdfs')
      .upload(storagePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
        cacheControl: '0',
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      throw uploadError
    }

    console.log('PDF uploaded/replaced successfully')

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
      console.error('Metadata update error:', updateError)
      throw updateError
    }

    console.log('Invoice metadata updated with fresh PDF timestamp')
  } catch (error) {
    console.error('PDF archiving failed:', error)
    throw error
  }
}

// Serve PDF from archive
async function servePDFFromArchive(invoice) {
  try {
    console.log('Downloading PDF from Storage:', invoice.pdf_storage_path)

    const { data, error: downloadError } = await supabase.storage
      .from('invoice-pdfs')
      .download(invoice.pdf_storage_path)

    if (downloadError) {
      console.error('Storage download error:', downloadError)
      throw downloadError
    }

    const pdfBuffer = Buffer.from(await data.arrayBuffer())

    const documentType = invoice.type === 'quote' ? 'Angebot' : 'Rechnung'
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
    console.error('Archive PDF serving failed:', error)
    throw error
  }
}