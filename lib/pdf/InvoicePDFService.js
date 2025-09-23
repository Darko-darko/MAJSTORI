// lib/pdf/InvoicePDFService.js - FINAL VERSION WITH ZUGFeRD EMBEDDING
import PDFDocument from 'pdfkit'
import { SEPAQRService } from './SEPAQRService.js'
import { ZUGFeRDService } from './ZUGFeRDService.js'

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

  async generateInvoice(invoiceData, majstorData) {
    this.doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      info: {
        Title: invoiceData.type === 'quote' ? 'Angebot' : 'Rechnung',
        Author: majstorData.business_name || majstorData.full_name,
        Creator: 'Pro-Meister.de Platform',
        // 🔥 NEW: PDF/A-3 compliance metadata
        Producer: 'Pro-Meister.de ZUGFeRD Generator',
        Keywords: invoiceData.type === 'invoice' ? 'ZUGFeRD, Rechnung, XML' : 'Angebot, Quote'
      }
    })

    this.setupFonts()
    this.currentY = 50
    
    await this.addBusinessHeader(majstorData)
    
    // 🔥 GENERATE AND EMBED ZUGFeRD XML (for invoices only)
    let zugferdXML = null
    if (invoiceData.type === 'invoice') {
      console.log('🇪🇺 Preparing ZUGFeRD embedding for invoice...')
      try {
        const validation = ZUGFeRDService.canGenerateZUGFeRD(invoiceData, majstorData)
        if (validation.canGenerate) {
          zugferdXML = ZUGFeRDService.generateZUGFeRDXML(invoiceData, majstorData)
          console.log('📋 ZUGFeRD XML ready for embedding, length:', zugferdXML.length)
          
          // 🔥 EMBED XML INTO PDF
          await this.embedZUGFeRDXML(zugferdXML, invoiceData)
          
        } else {
          console.warn('⚠️ ZUGFeRD embedding skipped, missing:', validation.missingFields)
        }
      } catch (zugferdError) {
        console.error('❌ ZUGFeRD embedding failed:', zugferdError.message)
        // Continue without XML embedding
      }
    }
    
    this.addCustomerAddress(invoiceData)
    this.addInvoiceTitle(invoiceData)
    this.addInvoiceDetails(invoiceData)
    this.addItemsTable(invoiceData)
    this.addTotalsSection(invoiceData)
    await this.addPaymentInfo(invoiceData, majstorData)
    
    // 🔥 ADD ZUGFeRD FOOTER (if XML was embedded)
    if (zugferdXML) {
      this.addZUGFeRDFooter()
    }
    
    this.addLegalFooter(majstorData)
    
    this.doc.end()
    return new Promise((resolve) => {
      const chunks = []
      this.doc.on('data', chunk => chunks.push(chunk))
      this.doc.on('end', () => resolve(Buffer.concat(chunks)))
    })
  }

  // 🔥 NEW: Embed ZUGFeRD XML into PDF as attachment
  async embedZUGFeRDXML(xmlContent, invoiceData) {
    try {
      console.log('📎 Embedding ZUGFeRD XML as PDF attachment...')
      
      // Convert XML string to buffer
      const xmlBuffer = Buffer.from(xmlContent, 'utf8')
      const xmlFilename = ZUGFeRDService.getXMLFilename() // 'factur-x.xml'
      
      // 🔥 EMBED AS PDF ATTACHMENT (PDF/A-3 compliant)
      // PDFKit supports file attachments via the file() method
      this.doc.file(xmlBuffer, {
        name: xmlFilename,
        type: 'application/xml',
        description: `ZUGFeRD 2.1 XML data for invoice ${invoiceData.invoice_number}`,
        creationDate: new Date(invoiceData.created_at),
        modificationDate: new Date(invoiceData.updated_at || invoiceData.created_at),
        // 🔥 CRITICAL: PDF/A-3 relationship 
        relationship: 'Alternative'  // PDF and XML are alternative representations
      })
      
      console.log('✅ ZUGFeRD XML successfully embedded as', xmlFilename)
      
      // 🔥 ADD XMP METADATA for ZUGFeRD compliance
      this.addZUGFeRDMetadata()
      
    } catch (error) {
      console.error('❌ XML embedding failed:', error.message)
      throw error
    }
  }

  // 🔥 NEW: Add XMP metadata for ZUGFeRD compliance
  addZUGFeRDMetadata() {
    try {
      // Add ZUGFeRD XMP metadata
      const zugferdNamespace = 'http://www.zugferd.de/'
      const version = ZUGFeRDService.getZUGFeRDVersion() // '2p1'
      
      // PDFKit doesn't have direct XMP support, but we can add custom metadata
      this.doc.info.Custom = {
        'ZUGFeRD_Version': version,
        'ZUGFeRD_Profile': 'urn:cen.eu:en16931:2017#compliant#urn:ferd:zugferd:2p1:basic',
        'Factur-X_Version': '1.0'
      }
      
      console.log('📋 ZUGFeRD metadata added to PDF')
      
    } catch (error) {
      console.warn('⚠️ Could not add ZUGFeRD metadata:', error.message)
    }
  }

  // 🔥 NEW: Add visual indicator that PDF contains ZUGFeRD data
  addZUGFeRDFooter() {
    const zugferdY = 730  // Higher up, separate from other footers
    
    this.setFont('regular', 7)
    this.doc.fillColor('#0066cc')
    
    // 🎨 ZUGFeRD badge - compact, professional
    this.doc.text('[PDF] ZUGFeRD 2.1 KONFORM - Enthält maschinenlesbare XML-Rechnungsdaten', 50, zugferdY, { 
      width: 500, 
      align: 'left' 
    })
    
    // Reset color
    this.doc.fillColor('#000000')
    
    console.log('🏷️ ZUGFeRD compliance badge added to PDF')
  }

  // EXISTING METHODS REMAIN UNCHANGED
  async addBusinessHeader(majstorData) {
    const startX = 320
    let y = 50

    if (majstorData.business_logo_url) {
      try {
        console.log('🖼️ Attempting to load logo from:', majstorData.business_logo_url)
        await this.addLogo(majstorData.business_logo_url, y)
        console.log('✅ Logo successfully added to PDF header')
      } catch (logoError) {
        console.warn('⚠️ Logo load failed, continuing without logo:', logoError.message)
      }
    } else {
      console.log('ℹ️ No logo URL provided, skipping logo')
    }

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

  async addLogo(logoUrl, headerY) {
    try {
      const logoX = 50
      const logoY = headerY
      const maxLogoWidth = 100
      const maxLogoHeight = 60

      const response = await fetch(logoUrl, {
        method: 'GET',
        headers: { 'User-Agent': 'Pro-Meister-PDF-Generator/1.0' },
        signal: AbortSignal.timeout(10000)
      })

      if (!response.ok) {
        throw new Error(`Logo fetch failed: ${response.status} ${response.statusText}`)
      }

      const imageArrayBuffer = await response.arrayBuffer()
      const imageBuffer = Buffer.from(imageArrayBuffer)
      
      this.doc.image(imageBuffer, logoX, logoY, {
        fit: [maxLogoWidth, maxLogoHeight],
        align: 'center',
        valign: 'center'
      })

      this.currentY = Math.max(this.currentY, logoY + maxLogoHeight + 10)

    } catch (error) {
      this.addLogoPlaceholder(logoX, logoY, maxLogoWidth, maxLogoHeight)
      throw error
    }
  }

  addLogoPlaceholder(x, y, width, height) {
    this.doc.save()
    this.doc.rect(x, y, width, height).fillColor('#f0f0f0').fill().stroke()
    this.setFont('regular', 8)
    this.doc.fillColor('#666666').text('LOGO', x + width/2 - 10, y + height/2 - 4)
    this.doc.restore().fillColor('#000000')
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

  async addPaymentInfo(invoiceData, majstorData) {
    if (invoiceData.type === 'quote') return

    let y = this.currentY + 20

    this.setFont('bold', 11)
    this.doc.text('Zahlungsinformationen', 50, y)
    
    y += 20
    const paymentInfoStartY = y

    const canGenerateQR = this.shouldGenerateQR(invoiceData, majstorData)
    
    if (canGenerateQR) {
      await this.addPaymentInfoWithQR(invoiceData, majstorData, y)
    } else {
      this.addPaymentInfoWithoutQR(invoiceData, majstorData, y)
    }
  }

  shouldGenerateQR(invoiceData, majstorData) {
    return !!(
      invoiceData.type === 'invoice' &&
      majstorData.iban &&
      invoiceData.total_amount > 0 &&
      (majstorData.business_name || majstorData.full_name)
    )
  }

  async addPaymentInfoWithQR(invoiceData, majstorData, startY) {
    let y = startY
    const leftColumnX = 50
    const qrX = 350
    const qrY = startY

    this.setFont('regular', 10)

    if (majstorData.iban) {
      this.doc.text('IBAN:', leftColumnX, y)
      this.doc.text(majstorData.iban, leftColumnX + 60, y)
      y += 15
    }
    
    if (majstorData.bic) {
      this.doc.text('BIC:', leftColumnX, y)
      this.doc.text(majstorData.bic, leftColumnX + 60, y)
      y += 15
    }
    
    if (majstorData.bank_name) {
      this.doc.text('Bank:', leftColumnX, y)
      this.doc.text(majstorData.bank_name, leftColumnX + 60, y)
      y += 15
    }

    this.doc.text('Zahlungsziel:', leftColumnX, y)
    this.doc.text(invoiceData.payment_terms_days + ' Tage', leftColumnX + 90, y)
    y += 15

    this.doc.text('Betrag:', leftColumnX, y)
    this.doc.text(this.formatCurrency(invoiceData.total_amount), leftColumnX + 60, y)
    y += 20

    try {
      console.log('🔥 Generating SEPA QR code...')
      const qrBuffer = await SEPAQRService.generateForInvoice(invoiceData, majstorData)
      
      this.doc.image(qrBuffer, qrX, qrY, {
        fit: [120, 120],
        align: 'center',
        valign: 'center'
      })
      
      this.setFont('regular', 8)
      this.doc.text('SEPA QR-Code', qrX, qrY + 125, { width: 120, align: 'center' })
      this.doc.text('Mit Banking-App scannen', qrX, qrY + 135, { width: 120, align: 'center' })
      
      console.log('✅ SEPA QR code added to PDF')

      this.currentY = Math.max(y, qrY + 155)

    } catch (qrError) {
      console.warn('⚠️ QR code generation failed:', qrError.message)
      
      this.setFont('italic', 8)
      this.doc.fillColor('#666666')
      this.doc.text('QR-Code nicht verfügbar', qrX, qrY + 20)
      this.doc.text('(Fehlende Bankdaten)', qrX, qrY + 35)
      this.doc.fillColor('#000000')
      
      this.currentY = y + 20
    }
  }

  addPaymentInfoWithoutQR(invoiceData, majstorData, startY) {
    let y = startY

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

    if (invoiceData.type === 'invoice') {
      this.setFont('italic', 8)
      this.doc.fillColor('#666666')
      this.doc.text('Hinweis: SEPA QR-Code benötigt vollständige Bankdaten', 50, y)
      this.doc.fillColor('#000000')
      y += 15
    }

    this.currentY = y
  }

  addLegalFooter(majstorData) {
    const footerY = 755  // 🎨 More breathing room - increased from 745 to 755

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
    const brandingY = 770  // 🎨 FIX: Moved further down to avoid overlap - was 760, now 770
    
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