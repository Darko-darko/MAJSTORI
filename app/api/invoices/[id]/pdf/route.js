// app/api/invoices/[id]/pdf/route.js - ENHANCED WITH STORAGE
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
    console.log('📄 PDF API called for ID:', id)
    
    // Get invoice/quote data
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .single()

    if (invoiceError || !invoice) {
      console.error('Invoice not found:', invoiceError)
      return NextResponse.json({ error: 'Rechnung nicht gefunden' }, { status: 404 })
    }

    // Get majstor (business owner) data
    const { data: majstor, error: majstorError } = await supabase
      .from('majstors')
      .select('*')
      .eq('id', invoice.majstor_id)
      .single()

    if (majstorError || !majstor) {
      console.error('Majstor not found:', majstorError)
      return NextResponse.json({ error: 'Geschäftsdaten nicht gefunden' }, { status: 404 })
    }

    // NEW: Check if PDF already exists in storage
    const storagePath = generateStoragePath(invoice, majstor)
    console.log('🗂️ Checking storage path:', storagePath)

    let pdfBuffer = null
    
    // Try to get existing PDF from storage
    const { data: existingPDF, error: downloadError } = await supabase.storage
      .from('invoice-pdfs')
      .download(storagePath)

    if (existingPDF && !downloadError) {
      console.log('✅ Found existing PDF in storage')
      pdfBuffer = Buffer.from(await existingPDF.arrayBuffer())
    } else {
      console.log('🏭 Generating new PDF...')
      
      // Generate new PDF
      const pdfService = new InvoicePDFService()
      pdfBuffer = await pdfService.generateInvoice(invoice, majstor)

      // NEW: Save PDF to storage
      await savePDFToStorage(pdfBuffer, storagePath, invoice)
    }

    // Prepare filename for download
    const filename = generateFilename(invoice)
    console.log('📎 Serving PDF:', filename)

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

// NEW: Generate storage path for PDF
function generateStoragePath(invoice, majstor) {
  const year = new Date(invoice.created_at).getFullYear()
  const month = new Date(invoice.created_at).getMonth() + 1
  const documentNumber = invoice.invoice_number || invoice.quote_number || `draft-${invoice.id}`
  const documentType = invoice.type === 'quote' ? 'angebote' : 'rechnungen'
  
  // Structure: majstor-id/year/month/type/document-number.pdf
  return `${majstor.id}/${year}/${month.toString().padStart(2, '0')}/${documentType}/${documentNumber}.pdf`
}

// NEW: Generate download filename
function generateFilename(invoice) {
  const documentType = invoice.type === 'quote' ? 'Angebot' : 'Rechnung'
  const documentNumber = invoice.invoice_number || invoice.quote_number || 'DRAFT'
  const customerName = invoice.customer_name.replace(/[^a-zA-Z0-9]/g, '_')
  
  return `${documentType}_${documentNumber}_${customerName}.pdf`
}

// NEW: Save PDF to Supabase Storage
async function savePDFToStorage(pdfBuffer, storagePath, invoice) {
  try {
    console.log('💾 Saving PDF to storage:', storagePath)
    
    const { error: uploadError } = await supabase.storage
      .from('invoice-pdfs')
      .upload(storagePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true, // Overwrite if exists
        metadata: {
          invoice_id: invoice.id,
          customer_name: invoice.customer_name,
          document_type: invoice.type,
          document_number: invoice.invoice_number || invoice.quote_number,
          generated_at: new Date().toISOString()
        }
      })

    if (uploadError) {
      console.error('Storage upload failed:', uploadError)
      // Don't throw - PDF generation should still work even if storage fails
      return false
    }

    console.log('✅ PDF saved to storage successfully')
    return true

  } catch (error) {
    console.error('Storage save error:', error)
    return false
  }
}