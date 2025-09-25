// app/api/invoices/[id]/pdf/route.js - AŽURIRAJ postojeći fajl

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { InvoicePDFService } from '@/lib/pdf/InvoicePDFService'

// Create a Supabase client with SERVICE ROLE (bypasses RLS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request, { params }) {
  try {
    const { id } = params
    const { searchParams } = new URL(request.url)
    const fromArchive = searchParams.get('archive') === 'true'
    
    console.log('🔍 PDF API called for ID:', id, 'fromArchive:', fromArchive)
    
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

    // 🆕 NOVO - provjeri da li PDF već postoji u arhivi
    if (fromArchive && invoice.pdf_storage_path) {
      console.log('📂 Serving PDF from archive:', invoice.pdf_storage_path)
      return await servePDFFromArchive(invoice)
    }

    // Generate fresh PDF
    console.log('🏭 Generating fresh PDF...')
    const pdfService = new InvoicePDFService()
    const pdfBuffer = await pdfService.generateInvoice(invoice, majstor)

    // 🆕 NOVO - sačuvaj PDF u Storage i ažuriraj metadata
    if (!invoice.pdf_storage_path) {
      console.log('💾 Archiving PDF for future use...')
      await archivePDF(pdfBuffer, invoice, majstor.id)
    }

    // Prepare filename
    const documentType = invoice.type === 'quote' ? 'Angebot' : 'Rechnung'
    const documentNumber = invoice.invoice_number || invoice.quote_number || 'DRAFT'
    const customerName = invoice.customer_name.replace(/[^a-zA-Z0-9]/g, '_')
    const filename = `${documentType}_${documentNumber}_${customerName}.pdf`

    console.log('✅ Serving PDF with filename:', filename)

    // Return PDF response
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'private, no-cache'
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

// 🆕 NOVO - funkcija za čuvanje PDF-a u Storage
async function archivePDF(pdfBuffer, invoiceData, majstorId) {
  try {
    const documentType = invoiceData.type === 'quote' ? 'angebote' : 'rechnungen'
    const documentNumber = invoiceData.invoice_number || invoiceData.quote_number || `draft-${invoiceData.id}`
    const year = new Date(invoiceData.created_at).getFullYear()
    const month = new Date(invoiceData.created_at).getMonth() + 1
    
    // Storage path: majstorId/2025/01/rechnungen/RE-2025-001.pdf
    const storagePath = `${majstorId}/${year}/${month.toString().padStart(2, '0')}/${documentType}/${documentNumber}.pdf`
    
    console.log('📤 Uploading PDF to Storage:', storagePath)
    
    // Upload to Storage
    const { error: uploadError } = await supabase.storage
      .from('invoice-pdfs')
      .upload(storagePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true // Overwrite ako već postoji
      })
    
    if (uploadError) {
      console.error('❌ Storage upload error:', uploadError)
      throw uploadError
    }
    
    console.log('✅ PDF uploaded successfully')
    
    // Update invoice metadata
    const { error: updateError } = await supabase
      .from('invoices')
      .update({
        pdf_generated_at: new Date().toISOString(),
        pdf_storage_path: storagePath,
        pdf_file_size: pdfBuffer.length,
        updated_at: new Date().toISOString()
      })
      .eq('id', invoiceData.id)
    
    if (updateError) {
      console.error('❌ Metadata update error:', updateError)
      throw updateError
    }
    
    console.log('✅ Invoice metadata updated')
    
  } catch (error) {
    console.error('❌ PDF archiving failed:', error)
    // Ne prekidaj proces ako archiving ne uspe
  }
}

// 🆕 NOVO - funkcija za serviranje iz arhive
async function servePDFFromArchive(invoice) {
  try {
    console.log('📥 Downloading PDF from Storage:', invoice.pdf_storage_path)
    
    // Download iz storage
    const { data, error: downloadError } = await supabase.storage
      .from('invoice-pdfs')
      .download(invoice.pdf_storage_path)

    if (downloadError) {
      console.error('❌ Storage download error:', downloadError)
      throw downloadError
    }

    // Convert to buffer
    const pdfBuffer = Buffer.from(await data.arrayBuffer())
    
    // Generate filename
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
        'Cache-Control': 'private, max-age=3600' // Cache archived PDFs for 1 hour
      }
    })

  } catch (error) {
    console.error('❌ Archive PDF serving failed:', error)
    throw error
  }
}