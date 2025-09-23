// lib/pdf/InvoicePDFService.js - FIXED VERSION WITH WORKING LOGO
import PDFDocument from 'pdfkit'

export class InvoicePDFService {
  constructor() {
    this.doc = null
    this.currentY = 0
  }

  setupFonts() {
    this.fonts = {
      regular: 'Helvetica',
      bold: 'Helvetica-Bold',  
      italic: 'Helvetica-Oblique'
    }
  }

  setFont(type = 'regular', size = 10) {
    this.doc.font(this.fonts[type]).fontSize(size)
    return this.doc
  }

  // FIXED: Made async to properly handle logo loading
  async generateInvoice(invoiceData, majstorData) {
    this.doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      info: {
        Title: invoiceData.type === 'quote' ? 'Angebot' : 'Rechnung',
        Author: majstorData.business_name || majstorData.full_name,
        Creator: 'Pro-Meister.de Platform'
      }
    })

    this.setupFonts()
    this.currentY = 50
    
    // FIXED: Await all async operations in proper order
    await this.addBusinessHeader(majstorData)
    this.addCustomerAddress(invoiceData)
    this.addInvoiceTitle(invoiceData)
    this.addInvoiceDetails(invoiceData)
    this.addItemsTable(invoiceData)
    this.addTotalsSection(invoiceData)
    this.addPaymentInfo(invoiceData, majstorData)
    this.addLegalFooter(majstorData)
    
    this.doc.end()
    return new Promise((resolve) => {
      const chunks = []
      this.doc.on('data', chunk => chunks.push(chunk))
      this.doc.on('end', () => resolve(Buffer.concat(chunks)))
    })
  }

  // FIXED: Made async to properly handle logo
  async addBusinessHeader(majstorData) {
    const startX = 320
    let y = 50

    // FIXED: Proper logo handling with await
    if (majstorData.business_logo_url) {
      try {
        console.log('🖼️ Attempting to load logo from:', majstorData.business_logo_url)
        await this.addLogo(majstorData.business_logo_url, y)
        console.log('✅ Logo successfully added to PDF header')
      } catch (logoError) {
        console.warn('⚠️ Logo load failed, continuing without logo:', logoError.message)
        // Continue without logo - don't break PDF generation
      }
    } else {
      console.log('ℹ️ No logo URL provided, skipping logo')
    }

    // Business info (right side)
    this.setFont('bold', 12)
    this.doc.text(majstorData.business_name || majstorData.full_name, startX, y)
    y += 15

    this.setFont('regular', 10)
    
    if (majstorData.address) {
      this.doc.text(majstorData.address, startX, y)
      y += 12
    }
    
    if (majstorData.city) {
      this.doc.text(majstorData.city, startX, y)  
      y += 12
    }
    
    if (majstorData.phone) {
      this.doc.text('Tel: ' + majstorData.phone, startX, y)
      y += 12
    }
    
    this.doc.text(majstorData.email, startX, y)
    y += 20
    
    if (majstorData.tax_number) {
      this.doc.text('Steuernummer: ' + majstorData.tax_number, startX, y)
      y += 12
    }
    
    if (majstorData.vat_id) {
      this.doc.text('USt-IdNr: ' + majstorData.vat_id, startX, y)
      y += 12
    }

    this.currentY = Math.max(this.currentY, y + 20)
  }

  // FIXED: Improved logo handling with proper error handling and fallbacks
  async addLogo(logoUrl, headerY) {
    try {
      const logoX = 50
      const logoY = headerY
      const maxLogoWidth = 100
      const maxLogoHeight = 60

      console.log('🔄 Fetching logo from URL...')

      // FIXED: Proper fetch with better error handling
      const response = await fetch(logoUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Pro-Meister-PDF-Generator/1.0'
        },
        // Add timeout to prevent hanging
        signal: AbortSignal.timeout(10000) // 10 second timeout
      })

      if (!response.ok) {
        throw new Error(`Logo fetch failed: ${response.status} ${response.statusText}`)
      }

      // FIXED: Use arrayBuffer instead of buffer for better compatibility
      const imageArrayBuffer = await response.arrayBuffer()
      const imageBuffer = Buffer.from(imageArrayBuffer)
      
      console.log('📷 Logo loaded successfully, size:', imageBuffer.length, 'bytes')

      // FIXED: Better image embedding with error handling
      this.doc.image(imageBuffer, logoX, logoY, {
        fit: [maxLogoWidth, maxLogoHeight],
        align: 'center',
        valign: 'center'
      })

      console.log('✅ Logo successfully embedded in PDF')
      
      // Update currentY to account for logo space
      this.currentY = Math.max(this.currentY, logoY + maxLogoHeight + 10)

    } catch (error) {
      console.error('❌ Logo rendering failed:', error.message)
      
      // FIXED: Better fallback placeholder
      this.addLogoPlaceholder(logoX, logoY, maxLogoWidth, maxLogoHeight)
      throw error // Re-throw to be handled by caller
    }
  }

  // FIXED: New method for logo placeholder
  addLogoPlaceholder(x, y, width, height) {
    console.log('🔲 Adding logo placeholder')
    
    // Save current state
    this.doc.save()
    
    // Draw placeholder rectangle
    this.doc
      .rect(x, y, width, height)
      .fillColor('#f0f0f0')
      .fill()
      .stroke()
    
    // Add placeholder text
    this.setFont('regular', 8)
    this.doc
      .fillColor('#666666')
      .text('LOGO', x + width/2 - 10, y + height/2 - 4)
    
    // Restore state
    this.doc.restore()
    this.doc.fillColor('#000000') // Reset to black
    
    // Update currentY
    this.currentY = Math.max(this.currentY, y + height + 10)
  }

  addCustomerAddress(invoiceData) {
    const startX = 50
    let y = Math.max(120, this.currentY)

    this.setFont('bold', 11)
    this.doc.text(invoiceData.customer_name, startX, y)
    y += 15
    
    this.setFont('regular', 10)
    if (invoiceData.customer_address) {
      this.doc.text(invoiceData.customer_address, startX, y)
      y += 12
    }
    
    this.currentY = Math.max(this.currentY, y + 30)
  }

  addInvoiceTitle(invoiceData) {
    const title = invoiceData.type === 'quote' ? 'ANGEBOT' : 'RECHNUNG'
    const number = invoiceData.invoice_number || invoiceData.quote_number
    
    let y = Math.max(200, this.currentY)

    this.setFont('bold', 16)
    this.doc.text(title, 50, y)
    
    this.setFont('regular', 12)
    this.doc.text('Nr. ' + number, 50, y + 20)

    this.currentY = y + 50
  }

  addInvoiceDetails(invoiceData) {
    const startX = 50
    let y = this.currentY

    this.setFont('regular', 10)

    const dateLabel = invoiceData.type === 'quote' ? 'Angebotsdatum:' : 'Rechnungsdatum:'
    this.doc.text(dateLabel, startX, y)
    this.doc.text(this.formatDate(invoiceData.issue_date), startX + 120, y)
    y += 15

    if (invoiceData.type === 'quote' && invoiceData.valid_until) {
      this.doc.text('Gueltig bis:', startX, y)
      this.doc.text(this.formatDate(invoiceData.valid_until), startX + 120, y)
      y += 15
    } else if (invoiceData.due_date) {
      this.doc.text('Faelligkeitsdatum:', startX, y)
      this.doc.text(this.formatDate(invoiceData.due_date), startX + 120, y)
      y += 15
    }

    this.doc.text('Kunde:', startX, y)
    this.doc.text(invoiceData.customer_name, startX + 120, y)
    y += 25

    this.currentY = y
  }

  addItemsTable(invoiceData) {
    const items = JSON.parse(invoiceData.items || '[]')
    const startX = 50
    const tableWidth = 495
    let y = this.currentY

    const columns = {
      pos: startX,
      description: startX + 30,
      quantity: startX + 280,
      price: startX + 340,
      total: startX + 420
    }

    this.setFont('bold', 10)
    this.doc.text('Pos.', columns.pos, y)
    this.doc.text('Beschreibung', columns.description, y)
    this.doc.text('Menge', columns.quantity, y)
    this.doc.text('Einzelpreis', columns.price, y)
    this.doc.text('Gesamtpreis', columns.total, y)
    
    y += 15
    this.doc.moveTo(startX, y).lineTo(startX + tableWidth, y).stroke()
    y += 10

    this.setFont('regular', 10)
    items.forEach((item, index) => {
      this.doc.text((index + 1).toString(), columns.pos, y)
      this.doc.text(item.description, columns.description, y, { width: 190 })
      this.doc.text(item.quantity.toString(), columns.quantity, y)
      this.doc.text(this.formatCurrency(item.price), columns.price, y)
      this.doc.text(this.formatCurrency(item.total), columns.total, y)
      y += 20
    })

    this.doc.moveTo(startX, y).lineTo(startX + tableWidth, y).stroke()
    y += 15

    this.currentY = y
  }

  addTotalsSection(invoiceData) {
    const startX = 350
    let y = this.currentY

    this.setFont('regular', 10)

    let subtotalLabel = 'Nettobetrag:'
    if (invoiceData.is_kleinunternehmer) {
      subtotalLabel = 'Gesamtbetrag:'
    }
    
    this.doc.text(subtotalLabel, startX, y)
    this.doc.text(this.formatCurrency(invoiceData.subtotal), startX + 120, y)
    y += 15

    if (!invoiceData.is_kleinunternehmer) {
      this.doc.text('zzgl. MwSt (' + invoiceData.tax_rate + '%):', startX, y)
      this.doc.text(this.formatCurrency(invoiceData.tax_amount), startX + 120, y)
      y += 15
      
      this.setFont('bold', 10)
      this.doc.text('Gesamtbetrag:', startX, y)
      this.doc.text(this.formatCurrency(invoiceData.total_amount), startX + 120, y)
      y += 15
    }

    if (invoiceData.is_kleinunternehmer) {
      y += 10
      this.setFont('italic', 9)
      this.doc.text('Gemaess Paragraph 19 UStG wird keine Umsatzsteuer berechnet.', startX - 100, y, { width: 250 })
      y += 20
    }

    this.currentY = y + 20
  }

  addPaymentInfo(invoiceData, majstorData) {
    if (invoiceData.type === 'quote') return

    let y = this.currentY + 20

    this.setFont('bold', 11)
    this.doc.text('Zahlungsinformationen', 50, y)
    
    y += 20
    this.setFont('regular', 10)

    if (majstorData.iban) {
      this.doc.text('IBAN:', 50, y)
      this.doc.text(majstorData.iban, 120, y)
      y += 15
    }
    
    if (majstorData.bic) {
      this.doc.text('BIC:', 50, y)
      this.doc.text(majstorData.bic, 120, y)
      y += 15
    }
    
    if (majstorData.bank_name) {
      this.doc.text('Bank:', 50, y)
      this.doc.text(majstorData.bank_name, 120, y)
      y += 15
    }

    this.doc.text('Zahlungsziel:', 50, y)
    this.doc.text(invoiceData.payment_terms_days + ' Tage', 120, y)
    y += 20

    this.currentY = y
  }

  addLegalFooter(majstorData) {
    const footerY = 720

    this.setFont('regular', 8)
    this.doc.fillColor('#666666')
    
    const footerText = (majstorData.business_name || majstorData.full_name) + ' | ' +
                     majstorData.email + ' | ' +
                     (majstorData.phone || '') + ' | ' +
                     'Steuernr: ' + (majstorData.tax_number || 'N/A')
    
    this.doc.text(footerText, 50, footerY, { width: 500, align: 'center' })

    this.addBrandingFooter()
  }

  addBrandingFooter() {
    const brandingY = 750
    
    this.setFont('regular', 7)
    this.doc.fillColor('#999999')
    
    this.doc.text('POWERED BY PRO-MEISTER.DE', 50, brandingY, { 
      width: 500, 
      align: 'center' 
    })
    
    this.doc.fillColor('#000000')
  }

  formatDate(dateString) {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('de-DE')
  }

  formatCurrency(amount) {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount || 0)
  }
}

export default InvoicePDFService