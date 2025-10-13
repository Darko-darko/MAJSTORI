// app/api/invoices/[id]/pdf/route.js - KOMPLETAN FIX

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { InvoicePDFService } from '@/lib/pdf/InvoicePDFService'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request, { params }) {
  try {
    const { id } = params
    const { searchParams } = new URL(request.url)
    
    // 🔥 NEW: Force regenerate parameter (bypasses cache)
    const forceRegenerate = searchParams.get('forceRegenerate') === 'true'
    const fromArchive = searchParams.get('archive') === 'true'
    
    console.log('📄 PDF API called for ID:', id, {
      forceRegenerate,
      fromArchive
    })
    
    // Get invoice/quote data
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .single()

    if (invoiceError || !invoice) {
      console.error('❌ Invoice not found:', invoiceError)
      return NextResponse.json({ error: 'Rechnung nicht gefunden' }, { status: 404 })
    }

    // Get majstor (business owner) data
    const { data: majstor, error: majstorError } = await supabase
      .from('majstors')
      .select('*')
      .eq('id', invoice.majstor_id)
      .single()

    if (majstorError || !majstor) {
      console.error('❌ Majstor not found:', majstorError)
      return NextResponse.json({ error: 'Geschäftsdaten nicht gefunden' }, { status: 404 })
    }

    // 🔥 NEW: Skip archive if force regenerate OR if PDF is outdated
    const pdfOutdated = invoice.pdf_generated_at && 
                        new Date(invoice.updated_at) > new Date(invoice.pdf_generated_at)
    
    if (pdfOutdated && !forceRegenerate) {
      console.warn('⚠️ PDF is outdated but forceRegenerate not set')
      console.warn('Updated:', invoice.updated_at, 'PDF:', invoice.pdf_generated_at)
    }

    // Serve from archive ONLY if:
    // 1. NOT force regenerate
    // 2. PDF exists in storage
    // 3. PDF is NOT outdated
    if (!forceRegenerate && !pdfOutdated && invoice.pdf_storage_path) {
      console.log('📂 Serving PDF from archive (up-to-date):', invoice.pdf_storage_path)
      return await servePDFFromArchive(invoice)
    }

    // 🔥 Generate fresh PDF (with fresh ZUGFeRD XML for invoices)
    if (forceRegenerate) {
      console.log('🔄 Force regenerating PDF...')
    } else if (pdfOutdated) {
      console.log('📅 PDF outdated, regenerating...')
    } else {
      console.log('🏭 Generating fresh PDF...')
    }
    
    const pdfService = new InvoicePDFService()
    const pdfBuffer = await pdfService.generateInvoice(invoice, majstor)

    // 🔥 Archive PDF (replaces old one with upsert: true)
    console.log('💾 Archiving regenerated PDF...')
    await archivePDF(pdfBuffer, invoice, majstor.id)

    // Prepare filename
    const documentType = invoice.type === 'quote' ? 'Angebot' : 'Rechnung'
    const documentNumber = invoice.invoice_number || invoice.quote_number || 'DRAFT'
    const customerName = invoice.customer_name.replace(/[^a-zA-Z0-9]/g, '_')
    const filename = `${documentType}_${documentNumber}_${customerName}.pdf`

    console.log('✅ Serving regenerated PDF:', filename)

    // Return PDF response
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'private, no-cache, no-store, must-revalidate', // 🔥 Force no cache
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    console.error('❌ PDF Generation Error:', error)
    return NextResponse.json({ 
      error: 'PDF-Generierung fehlgeschlagen',
      details: error.message
    }, { status: 500 })
  }
}

// 🔥 Archive PDF with UPSERT (replaces old PDF)
async function archivePDF(pdfBuffer, invoiceData, majstorId) {
  try {
    const documentType = invoiceData.type === 'quote' ? 'angebote' : 'rechnungen'
    const documentNumber = invoiceData.invoice_number || invoiceData.quote_number || `draft-${invoiceData.id}`
    const year = new Date(invoiceData.created_at).getFullYear()
    const month = new Date(invoiceData.created_at).getMonth() + 1
    
    const storagePath = `${majstorId}/${year}/${month.toString().padStart(2, '0')}/${documentType}/${documentNumber}.pdf`
    
    console.log('📤 Uploading PDF to Storage:', storagePath)
    
    // 🔥 UPSERT: Overwrite if exists
    const { error: uploadError } = await supabase.storage
      .from('invoice-pdfs')
      .upload(storagePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true, // 🔥 Replaces old PDF
        cacheControl: '0' // 🔥 No cache
      })
    
    if (uploadError) {
      console.error('❌ Storage upload error:', uploadError)
      throw uploadError
    }
    
    console.log('✅ PDF uploaded/replaced successfully')
    
    // 🔥 Update invoice metadata with NEW timestamp
    const { error: updateError } = await supabase
      .from('invoices')
      .update({
        pdf_generated_at: new Date().toISOString(), // 🔥 Fresh timestamp
        pdf_storage_path: storagePath,
        pdf_file_size: pdfBuffer.length,
        updated_at: new Date().toISOString()
      })
      .eq('id', invoiceData.id)
    
    if (updateError) {
      console.error('❌ Metadata update error:', updateError)
      throw updateError
    }
    
    console.log('✅ Invoice metadata updated with fresh PDF timestamp')
    
  } catch (error) {
    console.error('❌ PDF archiving failed:', error)
    throw error // 🔥 Propagate error to warn user
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
        'Cache-Control': 'private, max-age=3600'
      }
    })

  } catch (error) {
    console.error('❌ Archive PDF serving failed:', error)
    throw error
  }
}