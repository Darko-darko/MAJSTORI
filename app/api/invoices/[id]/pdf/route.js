// app/api/invoices/[id]/pdf/route.js
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { InvoicePDFService } from '@/lib/pdf/InvoicePDFService'

// Production-ready Supabase client with Service Role
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
      return NextResponse.json({ 
        error: 'Rechnung nicht gefunden',
        status: 'not_found'
      }, { status: 404 })
    }

    // Get majstor data
    const { data: majstor, error: majstorError } = await supabase
      .from('majstors')
      .select('*')
      .eq('id', invoice.majstor_id)
      .single()

    if (majstorError || !majstor) {
      console.error('Majstor not found:', majstorError)
      return NextResponse.json({ 
        error: 'Geschäftsdaten nicht gefunden',
        status: 'business_data_missing'
      }, { status: 404 })
    }

    // Generate PDF
    console.log('🔧 Starting PDF generation...')
    console.log('Document:', { 
      type: invoice.type, 
      number: invoice.invoice_number || invoice.quote_number,
      customer: invoice.customer_name,
      amount: invoice.total_amount
    })
    
    const pdfService = new InvoicePDFService()
    const pdfBuffer = await pdfService.generateInvoice(invoice, majstor)

    console.log('✅ PDF generated:', pdfBuffer.length, 'bytes')

    // Prepare clean filename
    const documentType = invoice.type === 'quote' ? 'Angebot' : 'Rechnung'
    const documentNumber = invoice.invoice_number || invoice.quote_number || 'DRAFT'
    const customerName = invoice.customer_name.replace(/[^a-zA-Z0-9\-_]/g, '_')
    const filename = `${documentType}_${documentNumber}_${customerName}.pdf`

    // Return PDF with proper headers
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY'
      }
    })

  } catch (error) {
    console.error('PDF Generation Error:', error)
    
    // Production-safe error handling
    const isDevelopment = process.env.NODE_ENV === 'development'
    
    let errorResponse = {
      error: 'PDF-Generierung fehlgeschlagen',
      status: 'generation_failed',
      timestamp: new Date().toISOString()
    }
    
    // Add debug info only in development
    if (isDevelopment) {
      errorResponse.details = error.message
      errorResponse.stack = error.stack
    }
    
    return NextResponse.json(errorResponse, { status: 500 })
  }
}

// Health check endpoint
export async function HEAD(request, { params }) {
  try {
    const { id } = params
    
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select('id, type, majstor_id')
      .eq('id', id)
      .single()
    
    if (error || !invoice) {
      return new NextResponse(null, { status: 404 })
    }
    
    return new NextResponse(null, { 
      status: 200,
      headers: {
        'X-Document-Type': invoice.type,
        'X-Document-Exists': 'true'
      }
    })
  } catch (error) {
    return new NextResponse(null, { status: 500 })
  }
}