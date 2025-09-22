// lib/pdf/InvoicePDFService.js
import PDFDocument from 'pdfkit'

export class InvoicePDFService {
  constructor() {
    this.doc = null
    this.currentY = 0
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

    this.doc.fontSize(12)
    this.doc.text(majstorData.business_name || majstorData.full_name, startX, y)
    y += 15

    this.doc.fontSize(10)
    
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

    this.doc.fontSize(11)
    this.doc.text(invoiceData.customer_name, startX, y)
    y += 15
    
    this.doc.fontSize(10)
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

    this.doc.fontSize(16)
    this.doc.text(title, 50, y)
    
    this.doc.fontSize(12)
    this.doc.text('Nr. ' + number, 50, y + 20)

    this.currentY = y + 50
  }

  addInvoiceDetails(invoiceData) {
    const startX = 50
    let y = this.currentY

    this.doc.fontSize(10)

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
    const tableWidth = 500
    let y = this.currentY

    this.doc.fontSize(10)
    this.doc.text('Pos.', startX, y)
    this.doc.text('Beschreibung', startX + 40, y)
    this.doc.text('Menge', startX + 300, y)
    this.doc.text('Einzelpreis', startX + 360, y)
    this.doc.text('Gesamtpreis', startX + 440, y)
    
    y += 15
    this.doc.moveTo(startX, y).lineTo(startX + tableWidth, y).stroke()
    y += 10

    items.forEach((item, index) => {
      this.doc.text((index + 1).toString(), startX, y)
      this.doc.text(item.description, startX + 40, y, { width: 250 })
      this.doc.text(item.quantity.toString(), startX + 300, y)
      this.doc.text(this.formatCurrency(item.price), startX + 360, y)
      this.doc.text(this.formatCurrency(item.total), startX + 440, y)
      y += 20
    })

    this.doc.moveTo(startX, y).lineTo(startX + tableWidth, y).stroke()
    y += 15

    this.currentY = y
  }

  addTotalsSection(invoiceData) {
    const startX = 350
    let y = this.currentY

    this.doc.fontSize(10)

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
      
      this.doc.text('Gesamtbetrag:', startX, y)
      this.doc.text(this.formatCurrency(invoiceData.total_amount), startX + 120, y)
      y += 15
    }

    if (invoiceData.is_kleinunternehmer) {
      y += 10
      this.doc.fontSize(9)
      this.doc.text('Gemaess Paragraph 19 UStG wird keine Umsatzsteuer berechnet.', startX - 100, y, { width: 250 })
      y += 20
    }

    this.currentY = y + 20
  }

  addPaymentInfo(invoiceData, majstorData) {
    if (invoiceData.type === 'quote') return

    let y = this.currentY + 20

    this.doc.fontSize(11)
    this.doc.text('Zahlungsinformationen', 50, y)
    
    y += 20
    this.doc.fontSize(10)

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
    const footerY = 750

    this.doc.fontSize(8)
    this.doc.fillColor('#666666')
    
    const footerText = (majstorData.business_name || majstorData.full_name) + ' | ' +
                     majstorData.email + ' | ' +
                     (majstorData.phone || '') + ' | ' +
                     'Steuernr: ' + (majstorData.tax_number || 'N/A')
    
    this.doc.text(footerText, 50, footerY, { width: 500, align: 'center' })
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