// app/api/invoices/[id]/pdf/route.js - FIXED VERSION WITH PROPER ASYNC HANDLING
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
    console.log('🔍 Querying invoice...')
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .single()

    console.log('📄 Invoice query result:', { 
      found: !!invoice, 
      error: invoiceError?.message,
      invoiceNumber: invoice?.invoice_number || invoice?.quote_number 
    })

    if (invoiceError || !invoice) {
      console.error('❌ Invoice not found:', invoiceError)
      return NextResponse.json({ error: 'Rechnung nicht gefunden' }, { status: 404 })
    }

    // Get majstor (business owner) data
    console.log('👨‍💼 Querying majstor for ID:', invoice.majstor_id)
    const { data: majstor, error: majstorError } = await supabase
      .from('majstors')
      .select('*')
      .eq('id', invoice.majstor_id)
      .single()

    console.log('👨‍💼 Majstor query result:', { 
      found: !!majstor, 
      error: majstorError?.message,
      hasLogo: !!majstor?.business_logo_url,
      logoUrl: majstor?.business_logo_url ? 'YES' : 'NO'
    })

    if (majstorError || !majstor) {
      console.error('❌ Majstor not found:', majstorError)
      return NextResponse.json({ error: 'Geschäftsdaten nicht gefunden' }, { status: 404 })
    }

    // FIXED: Proper debug logging for logo
    if (majstor.business_logo_url) {
      console.log('🖼️ Logo URL found:', majstor.business_logo_url)
    } else {
      console.log('ℹ️ No logo URL in majstor data')
    }

    // Generate PDF using our service
    console.log('🏗️ Starting PDF generation...')
    console.log('📋 Invoice data:', { 
      type: invoice.type, 
      number: invoice.invoice_number || invoice.quote_number,
      customer: invoice.customer_name,
      logoPresent: !!majstor.business_logo_url
    })
    
    const pdfService = new InvoicePDFService()
    
    // FIXED: Proper await for async PDF generation
    console.log('⏳ Generating PDF (this may take a moment for logos)...')
    const pdfBuffer = await pdfService.generateInvoice(invoice, majstor)

    console.log('✅ PDF generated successfully, size:', pdfBuffer.length, 'bytes')

    // Prepare filename
    const documentType = invoice.type === 'quote' ? 'Angebot' : 'Rechnung'
    const documentNumber = invoice.invoice_number || invoice.quote_number || 'DRAFT'
    const customerName = invoice.customer_name.replace(/[^a-zA-Z0-9]/g, '_')
    const filename = `${documentType}_${documentNumber}_${customerName}.pdf`

    console.log('📎 Sending PDF with filename:', filename)

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
    console.error('🔍 Error details:', error.message)
    console.error('📍 Stack trace:', error.stack)
    
    // FIXED: Better error response with more context
    let errorMessage = 'PDF-Generierung fehlgeschlagen'
    let statusCode = 500
    
    if (error.message?.includes('fetch')) {
      errorMessage = 'Logo konnte nicht geladen werden'
      console.error('🖼️ Logo fetch error detected')
    } else if (error.message?.includes('timeout')) {
      errorMessage = 'PDF-Generierung Zeitüberschreitung'
      statusCode = 408
    } else if (error.message?.includes('AbortSignal')) {
      errorMessage = 'Anfrage abgebrochen (Zeitüberschreitung)'
      statusCode = 408
    }
    
    return NextResponse.json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp: new Date().toISOString()
    }, { status: statusCode })
  }
}