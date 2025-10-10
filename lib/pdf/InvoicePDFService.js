// lib/pdf/InvoicePDFService.js - OPTIMIZED FOR MORE ITEMS PER PAGE
import PDFDocument from 'pdfkit'
import { SEPAQRService } from './SEPAQRService.js'
import { ZUGFeRDService } from './ZUGFeRDService.js'

export class InvoicePDFService {
  constructor() {
    this.doc = null
    this.currentY = 0
    this.pageBottomLimit = 720  // ✅ OPTIMIZED: More space for items
    this.headerHeight = 120     // ✅ OPTIMIZED: Compact header
    this.isFirstPage = true
    this.majstorData = null
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

  async addPageHeader(majstorData, isFirstPage = false) {
    const startX = 320
    const startY = 50
    let y = startY

    if (majstorData.business_logo_url && isFirstPage) {
      try {
        await this.addLogo(majstorData.business_logo_url, y)
      } catch (logoError) {
        console.warn('⚠️ Logo load failed:', logoError.message)
      }
    }

    let contentHeight = 0
    this.setFont('bold', 12)
    contentHeight += 15
    
    this.setFont('regular', 10)
    if (majstorData.address) contentHeight += 12
    if (majstorData.city) contentHeight += 12
    if (majstorData.phone) contentHeight += 12
    contentHeight += 12
    contentHeight += 20
    if (majstorData.tax_number) contentHeight += 12
    if (majstorData.vat_id) contentHeight += 12
    
    const boxPadding = 8
    const boxWidth = 220
    this.doc.save()
    this.doc.rect(startX - boxPadding, startY - boxPadding, boxWidth, contentHeight + boxPadding)
      .lineWidth(1)
      .stroke('#333333')
    this.doc.restore()

    y = startY
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

    // ✅ OPTIMIZED: Reduced spacing
    this.currentY = Math.max(isFirstPage ? 120 : 100, y + 15)
    
    console.log('✅ Page header added, currentY:', this.currentY)
  }

  addPageFooter(majstorData, isLastPage = false, hasZUGFeRD = false) {
    const footerY = 745
    
    if (isLastPage && hasZUGFeRD) {
      const zugferdY = 728
      this.setFont('regular', 7)
      this.doc.fillColor('#0066cc')
      this.doc.text('[PDF] ZUGFeRD 2.1 KONFORM - Enthält maschinenlesbare XML-Rechnungsdaten', 50, zugferdY, { 
        width: 500, 
        align: 'left' 
      })
      this.doc.fillColor('#000000')
    }
    
    this.doc.save()
    this.doc.moveTo(50, footerY - 3).lineTo(545, footerY - 3)
      .lineWidth(0.5)
      .stroke('#cccccc')
    this.doc.restore()
    
    this.doc.font('Helvetica').fontSize(7)
    this.doc.fillColor('#555555')
    
    const footerText = (majstorData.business_name || majstorData.full_name) + ' | ' +
                     majstorData.email + ' | ' +
                     (majstorData.phone || '') + ' | ' +
                     'Steuernr: ' + (majstorData.tax_number || 'N/A')
    
    this.doc.text(footerText, 50, footerY + 3, { 
      width: 495, 
      align: 'center',
      lineBreak: false 
    })
    
    const brandingY = footerY + 15
    this.doc.font('Helvetica-Bold').fontSize(7)
    this.doc.fillColor('#0066cc')
    this.doc.text('POWERED BY PRO-MEISTER.DE', 50, brandingY, { 
      width: 495, 
      align: 'center',
      lineBreak: false
    })
    
    this.doc.fillColor('#000000')
    
    console.log('✅ Page footer added')
  }

  async checkSpaceAndAddPageIfNeeded(requiredSpace) {
    if (this.currentY + requiredSpace > this.pageBottomLimit) {
      console.log('📄 Adding new page - not enough space. CurrentY:', this.currentY)
      
      this.addPageFooter(this.majstorData, false, false)
      this.doc.addPage()
      await this.addPageHeader(this.majstorData, false)
      
      return true
    }
    return false
  }

  async generateInvoice(invoiceData, majstorData) {
    this.doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      info: {
        Title: invoiceData.type === 'quote' ? 'Angebot' : 'Rechnung',
        Author: majstorData.business_name || majstorData.full_name,
        Creator: 'Pro-Meister.de Platform',
        Producer: 'Pro-Meister.de ZUGFeRD Generator',
        Keywords: invoiceData.type === 'invoice' ? 'ZUGFeRD, Rechnung, XML' : 'Angebot, Quote'
      }
    })

    this.setupFonts()
    this.currentY = 50
    this.isFirstPage = true
    this.majstorData = majstorData
    
    await this.addPageHeader(majstorData, true)
    
    let zugferdXML = null
    if (invoiceData.type === 'invoice') {
      console.log('🇪🇺 Preparing ZUGFeRD embedding for invoice...')
      try {
        const validation = ZUGFeRDService.canGenerateZUGFeRD(invoiceData, majstorData)
        if (validation.canGenerate) {
          zugferdXML = ZUGFeRDService.generateZUGFeRDXML(invoiceData, majstorData)
          console.log('📋 ZUGFeRD XML ready for embedding, length:', zugferdXML.length)
          await this.embedZUGFeRDXML(zugferdXML, invoiceData)
        } else {
          console.warn('⚠️ ZUGFeRD embedding skipped, missing:', validation.missingFields)
        }
      } catch (zugferdError) {
        console.error('❌ ZUGFeRD embedding failed:', zugferdError.message)
      }
    }
    
    this.addCustomerAddress(invoiceData)
    this.addInvoiceTitle(invoiceData)
    this.addInvoiceDetails(invoiceData)
    await this.addItemsTable(invoiceData)
    await this.addTotalsSection(invoiceData, majstorData)
    await this.addNotesSection(invoiceData)
    await this.addInvoiceFooterSection(majstorData)
    await this.addPaymentInfo(invoiceData, majstorData)
    
    this.addPageFooter(majstorData, true, !!zugferdXML)
    
    this.doc.end()
    return new Promise((resolve) => {
      const chunks = []
      this.doc.on('data', chunk => chunks.push(chunk))
      this.doc.on('end', () => resolve(Buffer.concat(chunks)))
    })
  }

  async embedZUGFeRDXML(xmlContent, invoiceData) {
    try {
      console.log('🔎 Embedding ZUGFeRD XML as PDF attachment...')
      
      const xmlBuffer = Buffer.from(xmlContent, 'utf8')
      const xmlFilename = ZUGFeRDService.getXMLFilename()
      
      this.doc.file(xmlBuffer, {
        name: xmlFilename,
        type: 'application/xml',
        description: `ZUGFeRD 2.1 XML data for invoice ${invoiceData.invoice_number}`,
        creationDate: new Date(invoiceData.created_at),
        modificationDate: new Date(invoiceData.updated_at || invoiceData.created_at),
        relationship: 'Alternative'
      })
      
      console.log('✅ ZUGFeRD XML successfully embedded as', xmlFilename)
      this.addZUGFeRDMetadata()
      
    } catch (error) {
      console.error('❌ XML embedding failed:', error.message)
      throw error
    }
  }

  addZUGFeRDMetadata() {
    try {
      const version = ZUGFeRDService.getZUGFeRDVersion()
      
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

  async addLogo(logoUrl, headerY) {
    try {
      const logoX = 30
      const logoY = 30
      const maxLogoWidth = 180
      const maxLogoHeight = 100

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
      throw error
    }
  }

  addCustomerAddress(invoiceData) {
    const startX = 50
    let y = this.currentY

    this.setFont('bold', 11)
    this.doc.text(invoiceData.customer_name, startX, y, { underline: true })
    y += 16
    
    this.setFont('regular', 10.5)
    if (invoiceData.customer_address) {
      this.doc.text(invoiceData.customer_address, startX, y)
      y += 12
    }
    
    // ✅ OPTIMIZED: Reduced spacing
    this.currentY = y + 20
  }

  addInvoiceTitle(invoiceData) {
    const title = invoiceData.type === 'quote' ? 'ANGEBOT' : 'RECHNUNG'
    const number = invoiceData.invoice_number || invoiceData.quote_number
    
    let y = this.currentY

    this.setFont('bold', 16)
    this.doc.text(title, 50, y)
    
    this.setFont('regular', 12)
    this.doc.text('Nr. ' + number, 50, y + 18)

    // ✅ OPTIMIZED: Reduced spacing
    this.currentY = y + 40
  }

  addInvoiceDetails(invoiceData) {
    const startX = 50
    let y = this.currentY

    this.setFont('regular', 10)

    const dateLabel = invoiceData.type === 'quote' ? 'Angebotsdatum:' : 'Rechnungsdatum:'
    this.doc.text(dateLabel, startX, y)
    this.doc.text(this.formatDate(invoiceData.issue_date), startX + 120, y)
    y += 12

    if (invoiceData.type === 'quote' && invoiceData.valid_until) {
      this.doc.text('Gueltig bis:', startX, y)
      this.doc.text(this.formatDate(invoiceData.valid_until), startX + 120, y)
      y += 12
    } else if (invoiceData.due_date) {
      this.doc.text('Faelligkeitsdatum:', startX, y)
      this.doc.text(this.formatDate(invoiceData.due_date), startX + 120, y)
      y += 12
    }

    this.doc.text('Kunde:', startX, y)
    this.doc.text(invoiceData.customer_name, startX + 120, y)
    y += 20

    this.currentY = y
  }

  async addItemsTable(invoiceData) {
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
    
    // ✅ OPTIMIZED: Reduced spacing
    y += 12
    this.doc.moveTo(startX, y).lineTo(startX + tableWidth, y).stroke()
    y += 8

    this.setFont('regular', 10)
    
    for (let index = 0; index < items.length; index++) {
      const item = items[index]
      
      if (y + 20 > this.pageBottomLimit) {
        console.log('📄 Adding new page at item', index + 1)
        
        this.addPageFooter(this.majstorData, false, false)
        this.doc.addPage()
        await this.addPageHeader(this.majstorData, false)
        
        y = this.currentY
        
        this.setFont('bold', 10)
        this.doc.text('Pos.', columns.pos, y)
        this.doc.text('Beschreibung', columns.description, y)
        this.doc.text('Menge', columns.quantity, y)
        this.doc.text('Einzelpreis', columns.price, y)
        this.doc.text('Gesamtpreis', columns.total, y)
        y += 12
        this.doc.moveTo(startX, y).lineTo(startX + tableWidth, y).stroke()
        y += 8
        this.setFont('regular', 10)
      }
      
      this.doc.text((index + 1).toString(), columns.pos, y)
      this.doc.text(item.description, columns.description, y, { width: 190 })
      this.doc.text(item.quantity.toString(), columns.quantity, y)
      this.doc.text(this.formatCurrency(item.price), columns.price, y)
      this.doc.text(this.formatCurrency(item.total), columns.total, y)
      // ✅ OPTIMIZED: Reduced spacing
      y += 17
    }

    this.doc.moveTo(startX, y).lineTo(startX + tableWidth, y).stroke()
    y += 12

    this.currentY = y
  }

  async addTotalsSection(invoiceData, majstorData) {
    await this.checkSpaceAndAddPageIfNeeded(70)
    
    const totalsX = 350
    let y = this.currentY

    this.setFont('regular', 10)

    let subtotalLabel = 'Nettobetrag:'
    if (invoiceData.is_kleinunternehmer) {
      subtotalLabel = 'Gesamtbetrag:'
    }
    
    this.doc.text(subtotalLabel, totalsX, y)
    this.doc.text(this.formatCurrency(invoiceData.subtotal), totalsX + 120, y)
    y += 12

    if (!invoiceData.is_kleinunternehmer) {
      this.doc.text('zzgl. MwSt (' + invoiceData.tax_rate + '%):', totalsX, y)
      this.doc.text(this.formatCurrency(invoiceData.tax_amount), totalsX + 120, y)
      y += 12
      
      const gesamtY = y
      
      this.setFont('bold', 11)
      this.doc.text('Gesamtbetrag:', totalsX, gesamtY)
      
      const amountText = this.formatCurrency(invoiceData.total_amount)
      const amountX = totalsX + 120
      const amountWidth = this.doc.widthOfString(amountText)
      
      this.doc.save()
      this.doc.roundedRect(amountX - 5, gesamtY - 3, amountWidth + 10, 18, 3)
        .lineWidth(2)
        .stroke('#000000')
      this.doc.restore()
      
      this.doc.text(amountText, amountX, gesamtY)
      y += 18
    }

    if (invoiceData.is_kleinunternehmer) {
      y += 8
      this.setFont('italic', 8)
      this.doc.text('Gemaess Paragraph 19 UStG', totalsX, y)
      y += 10
      this.doc.text('wird keine Umsatzsteuer berechnet.', totalsX, y)
      y += 15
    }

    // ✅ OPTIMIZED: Reduced spacing
    this.currentY = y + 15
  }

  async addNotesSection(invoiceData) {
    if (!invoiceData.notes || !invoiceData.notes.trim()) {
      console.log('⭐ Skipping notes - empty or null')
      return
    }

    console.log('📝 Adding notes section')

    this.doc.font('Helvetica').fontSize(10)
    const notesText = invoiceData.notes.trim()
    const maxWidth = 495
    const textHeight = this.doc.heightOfString(notesText, {
      width: maxWidth,
      lineGap: 2
    })
    
    const requiredSpace = 15 + textHeight + 15
    await this.checkSpaceAndAddPageIfNeeded(requiredSpace)

    // ✅ OPTIMIZED: Reduced spacing
    let y = this.currentY + 10

    this.doc.font('Helvetica-Bold').fontSize(11)
    this.doc.text('Anmerkungen', 50, y)
    
    y += 15

    this.doc.font('Helvetica').fontSize(10)
    this.doc.text(notesText, 50, y, {
      width: maxWidth,
      align: 'left',
      lineGap: 2
    })
    
    this.currentY = y + textHeight + 15
    
    console.log('✅ Notes section added')
  }

  async addInvoiceFooterSection(majstorData) {
    if (!majstorData.invoice_footer || !majstorData.invoice_footer.trim()) {
      console.log('⭐ Skipping invoice footer - empty or null')
      return
    }

    console.log('📜 Adding invoice footer section')

    this.doc.font('Times-Italic').fontSize(11)
    const footerText = majstorData.invoice_footer.trim()
    const maxWidth = 495
    const textHeight = this.doc.heightOfString(footerText, {
      width: maxWidth,
      lineGap: 1.5
    })
    
    const requiredSpace = 6 + 10 + textHeight + 15
    await this.checkSpaceAndAddPageIfNeeded(requiredSpace)

    // ✅ OPTIMIZED: Reduced spacing
    let y = this.currentY + 6

    this.doc.save()
    this.doc.moveTo(50, y).lineTo(545, y)
      .lineWidth(0.5)
      .stroke('#d0d0d0')
    this.doc.restore()
    
    y += 10

    this.doc.font('Times-Italic').fontSize(11)
    this.doc.text(footerText, 50, y, {
      width: maxWidth,
      align: 'left',
      lineGap: 1.5
    })
    
    this.currentY = y + textHeight + 15
    
    console.log('✅ Invoice footer section added')
  }

  async addPaymentInfo(invoiceData, majstorData) {
    if (invoiceData.type === 'quote') return

    await this.checkSpaceAndAddPageIfNeeded(110)

    // ✅ OPTIMIZED: Reduced spacing
    let y = this.currentY + 15
    const paymentInfoStartY = y

    this.setFont('bold', 11)
    this.doc.text('Zahlungsinformationen', 50, y)
    
    y += 18

    if (majstorData.iban && invoiceData.total_amount > 0) {
      try {
        console.log('🔥 Generating SEPA QR code for payment section...')
        const qrBuffer = await SEPAQRService.generateForInvoice(invoiceData, majstorData)
        
        const qrX = 380
        const qrY = paymentInfoStartY - 10
        const qrSize = 85
        
        this.doc.image(qrBuffer, qrX, qrY, {
          fit: [qrSize, qrSize],
          align: 'center',
          valign: 'center'
        })
        
        this.setFont('regular', 7)
        this.doc.text('SEPA QR-Code', qrX, qrY + qrSize + 4, { width: qrSize, align: 'center' })
        
        console.log('✅ SEPA QR code added')
      } catch (qrError) {
        console.warn('⚠️ QR code generation failed:', qrError.message)
      }
    }

    this.addPaymentInfoDetails(invoiceData, majstorData, y)
  }

  addPaymentInfoDetails(invoiceData, majstorData, startY) {
    let y = startY

    this.setFont('regular', 10)

    if (majstorData.iban) {
      this.doc.text('IBAN:', 50, y)
      this.doc.text(majstorData.iban, 120, y)
      y += 12
    }
    
    if (majstorData.bic) {
      this.doc.text('BIC:', 50, y)
      this.doc.text(majstorData.bic, 120, y)
      y += 12
    }
    
    if (majstorData.bank_name) {
      this.doc.text('Bank:', 50, y)
      this.doc.text(majstorData.bank_name, 120, y)
      y += 12
    }

    this.doc.text('Zahlungsziel:', 50, y)
    this.doc.text(invoiceData.payment_terms_days + ' Tage', 120, y)
    y += 12

    this.doc.text('Betrag:', 50, y)
    this.doc.text(this.formatCurrency(invoiceData.total_amount), 120, y)
    y += 18

    this.currentY = y
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