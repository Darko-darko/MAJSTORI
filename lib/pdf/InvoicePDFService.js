// lib/pdf/InvoicePDFService.js - STEP 1: Basic Font Improvement
import PDFDocument from 'pdfkit'

export class InvoicePDFService {
  constructor() {
    this.doc = null
    this.currentY = 0
  }

  // NEW: Font setup method
  setupFonts() {
    // PDFKit built-in fonts: Helvetica, Times-Roman, Courier
    // Helvetica is default, but we'll make it explicit and add variants
    this.fonts = {
      regular: 'Helvetica',
      bold: 'Helvetica-Bold',  
      italic: 'Helvetica-Oblique'
    }
  }

  // NEW: Helper method to set font consistently
  setFont(type = 'regular', size = 10) {
    this.doc.font(this.fonts[type]).fontSize(size)
    return this.doc
  }

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

    // CHANGED: Setup fonts first
    this.setupFonts()
    this.currentY = 50
    
    this.addBusinessHeader(majstorData)
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

  addBusinessHeader(majstorData) {
    const startX = 320
    let y = 50

    // CHANGED: Use new font helper - Bold for business name
    this.setFont('bold', 12)
    this.doc.text(majstorData.business_name || majstorData.full_name, startX, y)
    y += 15

    // CHANGED: Regular font for details  
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

  addCustomerAddress(invoiceData) {
    const startX = 50
    let y = Math.max(120, this.currentY)

    // CHANGED: Bold for customer name
    this.setFont('bold', 11)
    this.doc.text(invoiceData.customer_name, startX, y)
    y += 15
    
    // CHANGED: Regular for address
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

    // CHANGED: Bold for title
    this.setFont('bold', 16)
    this.doc.text(title, 50, y)
    
    // CHANGED: Regular for number
    this.setFont('regular', 12)
    this.doc.text('Nr. ' + number, 50, y + 20)

    this.currentY = y + 50
  }

  // REST OF METHODS - Just showing the pattern for one more...
  addInvoiceDetails(invoiceData) {
    const startX = 50
    let y = this.currentY

    // CHANGED: Use consistent font
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
    const tableWidth = 495  // FIXED: A4 width (595) - both margins (50+50) = 495
    let y = this.currentY

    // FIXED: Better column spacing for German text
    const columns = {
      pos: startX,           // 50
      description: startX + 30,   // 80 (smaller for Pos.)
      quantity: startX + 280,     // 330 (moved left)
      price: startX + 340,        // 390 (moved left) 
      total: startX + 420         // 470 (moved left, more space)
    }

    // CHANGED: Bold headers
    this.setFont('bold', 10)
    this.doc.text('Pos.', columns.pos, y)
    this.doc.text('Beschreibung', columns.description, y)
    this.doc.text('Menge', columns.quantity, y)
    this.doc.text('Einzelpreis', columns.price, y)
    this.doc.text('Gesamtpreis', columns.total, y)  // Now fits properly
    
    y += 15
    this.doc.moveTo(startX, y).lineTo(startX + tableWidth, y).stroke()
    y += 10

    // CHANGED: Regular font for items
    this.setFont('regular', 10)
    items.forEach((item, index) => {
      this.doc.text((index + 1).toString(), columns.pos, y)
      this.doc.text(item.description, columns.description, y, { width: 190 })  // FIXED: Reduced width for description
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
      
      // CHANGED: Bold for total amount
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

    // CHANGED: Bold header
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
    const footerY = 720  // Moved up a bit for branding

    // CHANGED: Better business footer with font styling
    this.setFont('regular', 8)
    this.doc.fillColor('#666666')
    
    const footerText = (majstorData.business_name || majstorData.full_name) + ' | ' +
                     majstorData.email + ' | ' +
                     (majstorData.phone || '') + ' | ' +
                     'Steuernr: ' + (majstorData.tax_number || 'N/A')
    
    this.doc.text(footerText, 50, footerY, { width: 500, align: 'center' })

    // NEW: POWERED BY branding
    this.addBrandingFooter()
  }

  // NEW: Pro-Meister.de branding
  addBrandingFooter() {
    const brandingY = 750
    
    // Professional branding styling
    this.setFont('regular', 7)
    this.doc.fillColor('#999999')
    
    this.doc.text('POWERED BY PRO-MEISTER.DE', 50, brandingY, { 
      width: 500, 
      align: 'center' 
    })
    
    // Reset color for future use
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