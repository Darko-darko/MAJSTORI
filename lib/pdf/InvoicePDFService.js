// lib/pdf/InvoicePDFService.js - COMPLETE VERSION WITH LAYOUT IMPROVEMENTS
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
        Producer: 'Pro-Meister.de ZUGFeRD Generator',
        Keywords: invoiceData.type === 'invoice' ? 'ZUGFeRD, Rechnung, XML' : 'Angebot, Quote'
      }
    })

    this.setupFonts()
    this.currentY = 50
    
    await this.addBusinessHeader(majstorData)
    
    // ZUGFeRD XML embedding (for invoices only)
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
    this.addItemsTable(invoiceData)
    await this.addTotalsSection(invoiceData, majstorData)
    
    // Notes BEFORE payment info
   this.addNotesSection(invoiceData, majstorData)
    
    // Payment info (without QR - QR is now in totals)
    await this.addPaymentInfo(invoiceData, majstorData)
    
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

  async embedZUGFeRDXML(xmlContent, invoiceData) {
    try {
      console.log('📎 Embedding ZUGFeRD XML as PDF attachment...')
      
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

  addZUGFeRDFooter() {
    const zugferdY = 730
    
    this.setFont('regular', 7)
    this.doc.fillColor('#0066cc')
    
    this.doc.text('[PDF] ZUGFeRD 2.1 KONFORM - Enthält maschinenlesbare XML-Rechnungsdaten', 50, zugferdY, { 
      width: 500, 
      align: 'left' 
    })
    
    this.doc.fillColor('#000000')
    
    console.log('🏷️ ZUGFeRD compliance badge added to PDF')
  }

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
      const logoX = 30
      const logoY = 30
      const maxLogoWidth = 180  // Increased from 100
      const maxLogoHeight = 100   // Increased from 60

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

 async addTotalsSection(invoiceData, majstorData) {
  const qrX = 220        // Bilo 60, sada DESNO
  const qrY = this.currentY
  const qrSize = 70      // Bilo 100, sada 30% manje
  
  const totalsX = 350
  let y = this.currentY

    this.setFont('regular', 10)

    let subtotalLabel = 'Nettobetrag:'
    if (invoiceData.is_kleinunternehmer) {
      subtotalLabel = 'Gesamtbetrag:'
    }
    
    this.doc.text(subtotalLabel, totalsX, y)
    this.doc.text(this.formatCurrency(invoiceData.subtotal), totalsX + 120, y)
    y += 15

    if (!invoiceData.is_kleinunternehmer) {
      this.doc.text('zzgl. MwSt (' + invoiceData.tax_rate + '%):', totalsX, y)
      this.doc.text(this.formatCurrency(invoiceData.tax_amount), totalsX + 120, y)
      y += 15
      
      this.setFont('bold', 10)
      this.doc.text('Gesamtbetrag:', totalsX, y)
      this.doc.text(this.formatCurrency(invoiceData.total_amount), totalsX + 120, y)
      y += 15
    }

    // Add QR code on the LEFT (only for invoices with payment info)
    if (invoiceData.type === 'invoice' && majstorData.iban && invoiceData.total_amount > 0) {
    try {
      console.log('🔥 Generating SEPA QR code for totals section...')
      const qrBuffer = await SEPAQRService.generateForInvoice(invoiceData, majstorData)
      
      this.doc.image(qrBuffer, qrX, qrY, {
        fit: [qrSize, qrSize],
        align: 'center',
        valign: 'center'
      })
      
      this.setFont('regular', 6)  // Manji font za label
      this.doc.text('SEPA QR-Code', qrX - 5, qrY + qrSize + 3, { width: qrSize + 10, align: 'center' })
      
      console.log('✅ SEPA QR code added next to totals')
    } catch (qrError) {
      console.warn('⚠️ QR code generation failed:', qrError.message)
    }
  }

   if (invoiceData.is_kleinunternehmer) {
  y += 10
  this.setFont('italic', 8)
  this.doc.text('Gemaess Paragraph 19 UStG', totalsX, y)
  y += 12
  this.doc.text('wird keine Umsatzsteuer berechnet.', totalsX, y)
  y += 20
}

    this.currentY = y + 20
  }

 addNotesSection(invoiceData, majstorData) {
  const hasNotes = invoiceData.notes && invoiceData.notes.trim()
  const hasFooter = majstorData.invoice_footer && majstorData.invoice_footer.trim()
  
  // Skip if both are empty
  if (!hasNotes && !hasFooter) {
    console.log('⏭️ Skipping notes section - both notes and footer are empty')
    return
  }

  console.log('📝 Current Y before notes/footer:', this.currentY)

  let y = this.currentY + 15

  if (y > 670) {
    console.warn('⚠️ Not enough space for notes/footer section, Y:', y)
    return
  }

  const maxWidth = 495

  // 1️⃣ Add NOTES with title (if exists)
  if (hasNotes) {
    this.setFont('bold', 11)
    this.doc.text('Anmerkungen', 50, y)
    y += 15

    this.setFont('regular', 9)
    const notesText = invoiceData.notes.trim()
    
    this.doc.text(notesText, 50, y, {
      width: maxWidth,
      align: 'left'
    })
    
    const notesHeight = this.doc.heightOfString(notesText, {
      width: maxWidth
    })
    
    y += notesHeight + 10
    console.log('✅ Notes added, height:', notesHeight)
  }

  // 2️⃣ Add FOOTER without title (if exists)
  if (hasFooter) {
    // Small spacing if notes exist above
    if (hasNotes) {
      y += 5
    }

    this.setFont('regular', 9)
    const footerText = majstorData.invoice_footer.trim()
    
    this.doc.text(footerText, 50, y, {
      width: maxWidth,
      align: 'left'
    })
    
    const footerHeight = this.doc.heightOfString(footerText, {
      width: maxWidth
    })
    
    y += footerHeight + 10
    console.log('✅ Footer added, height:', footerHeight)
  }

  this.currentY = y
  
  console.log('✅ Notes/Footer section complete, new currentY:', this.currentY)
}

  async addPaymentInfo(invoiceData, majstorData) {
    if (invoiceData.type === 'quote') return

    let y = this.currentY + 20

    this.setFont('bold', 11)
    this.doc.text('Zahlungsinformationen', 50, y)
    
    y += 20

    this.addPaymentInfoDetails(invoiceData, majstorData, y)
  }

  addPaymentInfoDetails(invoiceData, majstorData, startY) {
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
    y += 15

    this.doc.text('Betrag:', 50, y)
    this.doc.text(this.formatCurrency(invoiceData.total_amount), 120, y)
    y += 20

    this.currentY = y
  }

  addLegalFooter(majstorData) {
    const footerY = 755

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
    const brandingY = 770
    
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