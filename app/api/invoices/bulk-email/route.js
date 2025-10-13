// app/api/invoices/bulk-email/route.js - SA BATCH VALIDACIJOM

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request) {
  try {
    const { invoiceIds, majstorId, recipients, subject, message } = await request.json()
    
    console.log('📧 Bulk email API called')
    console.log('📨 Recipients:', recipients)
    console.log('📄 Invoice IDs:', invoiceIds.length)

    // Validation
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json({ 
        error: 'Recipients are required and must be an array' 
      }, { status: 400 })
    }

    if (!invoiceIds || !Array.isArray(invoiceIds) || invoiceIds.length === 0) {
      return NextResponse.json({ 
        error: 'Invoice IDs are required and must be an array' 
      }, { status: 400 })
    }

    if (!subject) {
      return NextResponse.json({ 
        error: 'Subject is required' 
      }, { status: 400 })
    }

    // Get invoices with pdf_storage_path
    const { data: invoices, error: invoicesError } = await supabase
      .from('invoices')
      .select('*')
      .in('id', invoiceIds)
      .eq('majstor_id', majstorId)
      .not('pdf_storage_path', 'is', null)

    if (invoicesError || !invoices || invoices.length === 0) {
      return NextResponse.json({ 
        error: 'No invoices with PDFs found' 
      }, { status: 404 })
    }

    console.log('📄 Found', invoices.length, 'invoices with existing PDFs')

    // 🔥 NEW: Check for outdated PDFs in batch
    const outdatedInvoices = invoices.filter(inv => 
      inv.type === 'invoice' && 
      inv.pdf_generated_at && 
      new Date(inv.updated_at) > new Date(inv.pdf_generated_at)
    )

    if (outdatedInvoices.length > 0) {
      console.warn('⚠️ CRITICAL: Found', outdatedInvoices.length, 'outdated invoice PDFs')
      
      const outdatedNumbers = outdatedInvoices.map(inv => inv.invoice_number).join(', ')
      
      return NextResponse.json({ 
        error: `⚠️ ${outdatedInvoices.length} Rechnung(en) haben veraltete PDFs/ZUGFeRD XML:\n\n` +
               `${outdatedNumbers}\n\n` +
               `Diese Rechnungen wurden nach der PDF-Generierung aktualisiert.\n\n` +
               `Bitte:\n` +
               `1. Öffnen Sie jede Rechnung einzeln (regeneriert PDF automatisch)\n` +
               `2. Oder verwenden Sie einzelnen E-Mail-Versand (regeneriert automatisch)\n` +
               `3. Dann versuchen Sie den Bulk-Versand erneut\n\n` +
               `❗ Bulk-Versand ist für Ihre Sicherheit blockiert, um zu verhindern ` +
               `dass veraltete ZUGFeRD XML-Daten an Ihre Buchhalter gesendet werden.`,
        outdatedInvoices: outdatedNumbers
      }, { status: 400 })
    }

    console.log('✅ All invoice PDFs are up-to-date, safe for bulk email')

    // Get majstor data
    const { data: majstor, error: majstorError } = await supabase
      .from('majstors')
      .select('*')
      .eq('id', majstorId)
      .single()

    if (majstorError || !majstor) {
      return NextResponse.json({ 
        error: 'Business data not found' 
      }, { status: 404 })
    }

    // Collect PDFs from Storage
    const pdfAttachments = []
    
    for (const invoice of invoices) {
      try {
        console.log('📥 Loading PDF from storage:', invoice.pdf_storage_path)
        
        const { data: pdfData, error: downloadError } = await supabase.storage
          .from('invoice-pdfs')
          .download(invoice.pdf_storage_path)

        if (downloadError || !pdfData) {
          console.warn(`⚠️ PDF download failed for invoice ${invoice.id}:`, downloadError?.message)
          continue
        }

        const pdfBuffer = Buffer.from(await pdfData.arrayBuffer())
        const documentType = invoice.type === 'quote' ? 'Angebot' : 'Rechnung'
        const documentNumber = invoice.invoice_number || invoice.quote_number
        const filename = `${documentType}_${documentNumber}.pdf`

        pdfAttachments.push({
          filename: filename,
          content: pdfBuffer,
          contentType: 'application/pdf'
        })

        console.log('✅ PDF loaded from storage:', filename, 'Size:', Math.round(pdfBuffer.length / 1024), 'KB')

      } catch (pdfError) {
        console.error('❌ PDF preparation failed for invoice', invoice.id, pdfError)
      }
    }

    if (pdfAttachments.length === 0) {
      return NextResponse.json({ 
        error: 'No PDFs could be loaded from storage' 
      }, { status: 500 })
    }

    // Calculate total file size
    const totalSize = pdfAttachments.reduce((sum, attachment) => sum + attachment.content.length, 0)
    console.log('📎 Total attachments size:', Math.round(totalSize / 1024 / 1024 * 100) / 100, 'MB')

    // Safety check: Prevent emails that are too large
    const MAX_EMAIL_SIZE_MB = 20
    if (totalSize > MAX_EMAIL_SIZE_MB * 1024 * 1024) {
      return NextResponse.json({ 
        error: `Email too large: ${Math.round(totalSize / 1024 / 1024 * 100) / 100}MB (max ${MAX_EMAIL_SIZE_MB}MB)` 
      }, { status: 413 })
    }

    // Email results tracking
    const emailResults = []

    // Send email to each recipient
    for (const recipient of recipients) {
      try {
        console.log('📤 Sending to:', recipient)

        const emailData = {
          from: `${majstor.business_name || majstor.full_name} <rechnungen@pro-meister.de>`,
          to: [recipient.trim()],
          subject: subject,
          html: generateEmailHTML(invoices, majstor, message),
          attachments: pdfAttachments
        }

        const { data: emailResult, error: emailError } = await resend.emails.send(emailData)

        if (emailError) {
          console.error('❌ Email send failed to', recipient, emailError)
          emailResults.push({ 
            recipient, 
            success: false, 
            error: emailError.message 
          })
        } else {
          console.log('✅ Email sent to', recipient, 'ID:', emailResult.id)
          emailResults.push({ 
            recipient, 
            success: true, 
            emailId: emailResult.id 
          })
        }

        // Small delay between emails to avoid rate limiting
        if (recipients.indexOf(recipient) < recipients.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }

      } catch (recipientError) {
        console.error('❌ Email sending exception for', recipient, recipientError)
        emailResults.push({ 
          recipient, 
          success: false, 
          error: recipientError.message 
        })
      }
    }

    // Summary
    const successCount = emailResults.filter(result => result.success).length
    const failureCount = emailResults.length - successCount

    console.log(`📊 Email summary: ${successCount} sent, ${failureCount} failed`)

    return NextResponse.json({ 
      success: true,
      results: emailResults,
      summary: {
        totalRecipients: recipients.length,
        successCount,
        failureCount,
        attachmentCount: pdfAttachments.length,
        totalSizeKB: Math.round(totalSize / 1024)
      },
      message: `${successCount} E-Mails erfolgreich gesendet`
    })

  } catch (error) {
    console.error('❌ Bulk email error:', error)
    return NextResponse.json({ 
      error: 'Bulk E-Mail Versand fehlgeschlagen',
      details: error.message
    }, { status: 500 })
  }
}

function generateEmailHTML(invoices, majstorData, customMessage) {
  const invoiceCount = invoices.filter(inv => inv.type === 'invoice').length
  const quoteCount = invoices.filter(inv => inv.type === 'quote').length
  
  const totalAmount = invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0)
  
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  const documentsList = invoices.map(inv => {
    const docType = inv.type === 'quote' ? 'Angebot' : 'Rechnung'
    const docNumber = inv.invoice_number || inv.quote_number
    return `${docType} ${docNumber} - ${inv.customer_name} (${formatCurrency(inv.total_amount)})`
  }).join('<br>')

  const defaultMessage = customMessage || `Sehr geehrte Damen und Herren,

anbei senden wir Ihnen unsere Rechnungen zur Buchführung.

Mit freundlichen Grüßen`

  const messageHTML = defaultMessage.replace(/\n/g, '<br>')

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
        .summary { background-color: #f8fafc; padding: 15px; border-left: 4px solid #1e40af; margin: 20px 0; }
        .documents { background-color: #f1f5f9; padding: 10px; border-radius: 5px; font-size: 12px; margin: 10px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>${majstorData.business_name || majstorData.full_name}</h2>
          <p><strong>Bulk-Versendung: ${invoices.length} Dokumente</strong></p>
        </div>
        
        <div class="content">
          <p>${messageHTML}</p>
          
          <div class="summary">
            <h3>📊 Übersicht</h3>
            <p>
              <strong>Rechnungen:</strong> ${invoiceCount}<br>
              <strong>Angebote:</strong> ${quoteCount}<br>
              <strong>Gesamtwert:</strong> ${formatCurrency(totalAmount)}
            </p>
          </div>

          <div class="documents">
            <strong>📎 Anhänge:</strong><br>
            ${documentsList}
          </div>
        </div>
        
        <div class="footer">
          <p><strong>${majstorData.business_name || majstorData.full_name}</strong><br>
          ${majstorData.address || ''}<br>
          ${majstorData.city || ''}<br>
          E-Mail: ${majstorData.email}<br>
          ${majstorData.phone ? `Tel: ${majstorData.phone}<br>` : ''}
          ${majstorData.tax_number ? `Steuernummer: ${majstorData.tax_number}` : ''}</p>
          
          <p style="font-size: 10px; color: #999; margin-top: 20px;">
            Diese E-Mail wurde über die Pro-Meister.de Plattform versendet.
          </p>
        </div>
      </div>
    </body>
    </html>
  `
}