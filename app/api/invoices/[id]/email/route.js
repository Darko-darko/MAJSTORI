// app/api/invoices/[id]/email/route.js - SA VALIDACIJOM

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request, { params }) {
  try {
    const { id } = params
    const { recipientEmail, ccEmail, subject, message } = await request.json()
    
    console.log('📧 Email API called for invoice:', id)
    console.log('📨 Recipient:', recipientEmail)

    // Validation
    if (!recipientEmail || !subject) {
      return NextResponse.json({ 
        error: 'E-Mail-Adresse und Betreff sind erforderlich' 
      }, { status: 400 })
    }

    // Get invoice data
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .single()

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: 'Rechnung nicht gefunden' }, { status: 404 })
    }

    // 🔥 NEW: CRITICAL CHECK - Prevent sending outdated PDF/ZUGFeRD
    if (invoice.type === 'invoice') {
      const pdfOutdated = invoice.pdf_generated_at && 
                          new Date(invoice.updated_at) > new Date(invoice.pdf_generated_at)
      
      if (pdfOutdated) {
        console.warn('⚠️ CRITICAL: Invoice PDF is outdated!')
        console.warn('Invoice updated:', invoice.updated_at)
        console.warn('PDF generated:', invoice.pdf_generated_at)
        
        // 🔥 AUTO-REGENERATE before sending
        console.log('🔄 Auto-regenerating PDF before email...')
        
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 
                       (request.headers.get('host') ? `https://${request.headers.get('host')}` : 'http://localhost:3000')
        
        const regenResponse = await fetch(
          `${siteUrl}/api/invoices/${id}/pdf?forceRegenerate=true`,
          {
            method: 'GET',
            headers: { 'Cache-Control': 'no-cache' }
          }
        )
        
        if (!regenResponse.ok) {
          console.error('❌ PDF regeneration failed before email')
          return NextResponse.json({ 
            error: '⚠️ Rechnung wurde aktualisiert, aber PDF/ZUGFeRD ist veraltet.\n\n' +
                   'Die Rechnung kann nicht per E-Mail gesendet werden, da das PDF ' +
                   'nicht mit den aktuellen Daten übereinstimmt.\n\n' +
                   'Bitte öffnen Sie die Rechnung zuerst (um PDF zu regenerieren) ' +
                   'und versuchen Sie es dann erneut.'
          }, { status: 400 })
        }
        
        console.log('✅ PDF regenerated successfully before email')
        
        // Wait a bit for storage to be fully updated
        await new Promise(resolve => setTimeout(resolve, 1000))
      } else {
        console.log('✅ PDF is up-to-date, safe to send')
      }
    }

    // Get majstor data
    const { data: majstor, error: majstorError } = await supabase
      .from('majstors')
      .select('*')
      .eq('id', invoice.majstor_id)
      .single()

    if (majstorError || !majstor) {
      return NextResponse.json({ error: 'Geschäftsdaten nicht gefunden' }, { status: 404 })
    }

    // Get PDF from storage
    const storagePath = generateStoragePath(invoice, majstor)
    console.log('📁 Getting PDF from storage:', storagePath)

    const { data: pdfData, error: downloadError } = await supabase.storage
      .from('invoice-pdfs')
      .download(storagePath)

    if (downloadError || !pdfData) {
      console.error('❌ PDF not found in storage:', downloadError)
      return NextResponse.json({ 
        error: 'PDF nicht gefunden. Bitte generieren Sie zuerst das PDF.' 
      }, { status: 404 })
    }

    // Convert PDF to attachment format
    const pdfBuffer = Buffer.from(await pdfData.arrayBuffer())
    const filename = generateFilename(invoice)

    // Prepare email data
    const emailData = {
      from: `${majstor.business_name || majstor.full_name} <rechnungen@pro-meister.de>`,
      to: [recipientEmail],
      subject: subject,
      html: generateEmailHTML(invoice, majstor, message),
      attachments: [
        {
          filename: filename,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    }

    if (ccEmail && ccEmail.trim()) {
      emailData.cc = [ccEmail.trim()]
    }

    console.log('📤 Sending email via Resend...')
    
    const { data: emailResult, error: emailError } = await resend.emails.send(emailData)

    if (emailError) {
      console.error('❌ Resend error:', emailError)
      return NextResponse.json({ 
        error: 'E-Mail konnte nicht gesendet werden: ' + emailError.message 
      }, { status: 500 })
    }

    console.log('✅ Email sent successfully:', emailResult.id)

    // Save email tracking info
    await supabase
      .from('invoices')
      .update({ 
        email_sent_at: new Date().toISOString(),
        email_sent_to: recipientEmail,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    await logEmailActivity(invoice.id, recipientEmail, emailResult.id)

    return NextResponse.json({ 
      success: true, 
      emailId: emailResult.id,
      message: `E-Mail erfolgreich an ${recipientEmail} gesendet` 
    })

  } catch (error) {
    console.error('❌ Email sending error:', error)
    return NextResponse.json({ 
      error: 'E-Mail-Versand fehlgeschlagen',
      details: error.message
    }, { status: 500 })
  }
}

function generateStoragePath(invoice, majstor) {
  const year = new Date(invoice.created_at).getFullYear()
  const month = new Date(invoice.created_at).getMonth() + 1
  const documentNumber = invoice.invoice_number || invoice.quote_number || `draft-${invoice.id}`
  const documentType = invoice.type === 'quote' ? 'angebote' : 'rechnungen'
  
  return `${majstor.id}/${year}/${month.toString().padStart(2, '0')}/${documentType}/${documentNumber}.pdf`
}

function generateFilename(invoice) {
  const documentType = invoice.type === 'quote' ? 'Angebot' : 'Rechnung'
  const documentNumber = invoice.invoice_number || invoice.quote_number || 'DRAFT'
  const customerName = invoice.customer_name.replace(/[^a-zA-Z0-9]/g, '_')
  
  return `${documentType}_${documentNumber}_${customerName}.pdf`
}

function generateEmailHTML(invoice, majstor, customMessage) {
  const documentType = invoice.type === 'quote' ? 'Angebot' : 'Rechnung'
  const documentNumber = invoice.invoice_number || invoice.quote_number
  const isQuote = invoice.type === 'quote'
  
  const defaultMessage = isQuote 
    ? `Sehr geehrte Damen und Herren,\n\nanbei erhalten Sie unser Angebot ${documentNumber}.\n\nFür Rückfragen stehen wir Ihnen gerne zur Verfügung.`
    : `Sehr geehrte Damen und Herren,\n\nanbei erhalten Sie unsere Rechnung ${documentNumber}.\n\nWir bitten um Begleichung innerhalb der angegebenen Zahlungsfrist.\n\nVielen Dank für Ihr Vertrauen.`

  const messageText = customMessage || defaultMessage
  const messageHTML = messageText.replace(/\n/g, '<br>')

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { border-bottom: 2px solid #1e40af; padding-bottom: 20px; margin-bottom: 20px; }
        .footer { border-top: 1px solid #e5e5e5; padding-top: 20px; margin-top: 30px; font-size: 12px; color: #666; }
        .highlight { background-color: #f0f7ff; padding: 15px; border-left: 4px solid #1e40af; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>${majstor.business_name || majstor.full_name}</h2>
          <p><strong>${documentType} ${documentNumber}</strong></p>
        </div>
        
        <div class="content">
          <p>Liebe/r ${invoice.customer_name},</p>
          <p>${messageHTML}</p>
          
          <div class="highlight">
            <strong>📎 Anhang:</strong> ${documentType}_${documentNumber}.pdf
          </div>
        </div>
        
        <div class="footer">
          <p>Mit freundlichen Grüßen<br>
          <strong>${majstor.business_name || majstor.full_name}</strong></p>
          
          <hr style="margin: 15px 0;">
          
          <p>
            ${majstor.business_name || majstor.full_name}<br>
            ${majstor.address || ''}<br>
            ${majstor.city || ''}<br>
            E-Mail: ${majstor.email}<br>
            ${majstor.phone ? `Tel: ${majstor.phone}<br>` : ''}
            ${majstor.tax_number ? `Steuernummer: ${majstor.tax_number}` : ''}
          </p>
          
          <p style="font-size: 10px; color: #999; margin-top: 20px;">
            Diese E-Mail wurde über die Pro-Meister.de Plattform versendet.
          </p>
        </div>
      </div>
    </body>
    </html>
  `
}

async function logEmailActivity(invoiceId, recipientEmail, emailId) {
  try {
    console.log('📝 Email logged:', { invoiceId, recipientEmail, emailId })
  } catch (error) {
    console.warn('⚠️ Email logging failed:', error)
  }
}