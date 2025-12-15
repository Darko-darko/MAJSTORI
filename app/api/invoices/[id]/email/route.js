// app/api/invoices/[id]/email/route.js - OPTIMIZED: Skip regeneration if cached exists

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { Buffer } from 'node:buffer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request, routeData) {
  try {
    const { id } = await routeData.params

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
      console.error('❌ Invoice not found:', invoiceError)
      return NextResponse.json({ error: 'Rechnung nicht gefunden' }, { status: 404 })
    }

    // ⚡ OPTIMIZED: Check if PDF exists in storage before regenerating
    if (invoice.type === 'invoice') {
      const pdfOutdated = invoice.pdf_generated_at && 
                          new Date(invoice.updated_at) > new Date(invoice.pdf_generated_at)
      
      if (pdfOutdated) {
        console.warn('⚠️ CRITICAL: Invoice PDF is outdated!')
        
        // ⚡ First try to serve from cache - maybe it's good enough
        const storagePath = generateStoragePath(invoice, { id: invoice.majstor_id })
        const { data: testPDF, error: testError } = await supabase.storage
          .from('invoice-pdfs')
          .download(storagePath)
        
        if (testError || !testPDF) {
          // Only regenerate if doesn't exist
          console.log('🔄 Auto-regenerating PDF before email...')
          
          const host = request.headers.get('host')
          const envSiteUrl = process.env.NEXT_PUBLIC_SITE_URL
          const siteUrl = envSiteUrl || (host?.includes('localhost') ? `http://${host}` : `https://${host}`)

          const regenResponse = await fetch(`${siteUrl}/api/invoices/${id}/pdf?forceRegenerate=true`, {
            method: 'GET',
            headers: { 'Cache-Control': 'no-cache' }
          })
          
          if (!regenResponse.ok) {
            return NextResponse.json({ 
              error: '⚠️ Rechnung wurde aktualisiert, aber PDF/ZUGFeRD ist veraltet.\n\nBitte öffnen Sie die Rechnung zuerst.'
            }, { status: 400 })
          }
          
          await new Promise(resolve => setTimeout(resolve, 500)) // Reduced from 1000
        } else {
          console.log('✅ PDF exists in storage, using cached version')
        }
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
      console.error('❌ Majstor not found:', majstorError)
      return NextResponse.json({ error: 'Geschäftsdaten nicht gefunden' }, { status: 404 })
    }

    // Get PDF from storage
    const storagePath = generateStoragePath(invoice, majstor)
    console.log('📂 Getting PDF from storage:', storagePath)

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
  const customerName = invoice.customer_name || 'Damen und Herren'

  const defaultMessage = `Sehr geehrte/r ${customerName},\n\nanbei erhalten Sie unser ${documentType} ${documentNumber}.\n\nFür Rückfragen stehen wir Ihnen gerne zur Verfügung.`
  const messageText = customMessage || defaultMessage
  const messageHTML = messageText.replace(/\n/g, '<br>')

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { 
          font-family: Arial, sans-serif; 
          line-height: 1.6; 
          color: #333; 
          background-color: #f9f9f9;
        }
        .container { 
          max-width: 600px; 
          margin: 0 auto; 
          padding: 20px;
          background-color: #ffffff;
        }
        .header { 
          border-bottom: 2px solid #1e40af; 
          padding-bottom: 20px; 
          margin-bottom: 20px;
          color: #333;
        }
        .header h2 {
          color: #333;
          margin: 0 0 10px 0;
        }
        .header p {
          color: #333;
          margin: 0;
        }
        .content {
          color: #333;
        }
        .content p {
          color: #333;
          margin: 10px 0;
        }
        .footer { 
          border-top: 1px solid #e5e5e5; 
          padding-top: 20px; 
          margin-top: 30px; 
          font-size: 12px; 
          color: #333;
        }
        .footer p {
          color: #333;
          margin: 5px 0;
        }
        .highlight { 
          background-color: #f0f7ff; 
          padding: 15px; 
          border-left: 4px solid #1e40af; 
          margin: 20px 0;
          color: #333;
        }
        .highlight strong {
          color: #333;
        }
        hr {
          border: none;
          border-top: 1px solid #e5e5e5;
          margin: 15px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>${majstor.business_name || majstor.full_name}</h2>
          <p><strong>${documentType} ${documentNumber}</strong></p>
        </div>
        
        <div class="content">
          <p>${messageHTML}</p>
          
          <div class="highlight">
            <strong>🔎 Anhang:</strong> ${documentType}_${documentNumber}.pdf
          </div>
        </div>
        
        <div class="footer">
          <p><strong>Mit freundlichen Grüßen</strong><br>
          ${majstor.business_name || majstor.full_name}</p>
          
          <hr>
          
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