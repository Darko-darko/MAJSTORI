// lib/pdf/InvoicePDFService.js - OPTIMIZED: DIN lang + All fixes + WEG ADDRESSES
import PDFDocument from 'pdfkit'
import { SEPAQRService } from './SEPAQRService.js'
import { ZUGFeRDService } from './ZUGFeRDService.js'

export class InvoicePDFService {
  constructor() {
    this.doc = null
    this.currentY = 0
    this.pageBottomLimit = 740
    this.headerHeight = 50
    this.isFirstPage = true
    this.majstorData = null
    this.currentPage = 1
    this.invoiceData = null
    
    // Optimized constants
    this.COLORS = {
      primary: '#333333',
      secondary: '#666666',
      border: '#999999',
      lightBorder: '#cccccc',
      accent: '#0066cc',
      success: '#10b981',
      background: '#f0f0f0'
    }
    
    this.FONT_SIZES = {
      title: 14,
      subtitle: 12,
      header: 11,
      normal: 10,
      small: 9,
      tiny: 8,
      micro: 7
    }
  }

  setupFonts() {
    this.fonts = {
      regular: 'Helvetica',
      bold: 'Helvetica-Bold',  
      italic: 'Helvetica-Oblique',
      boldItalic: 'Helvetica-BoldOblique'
    }
  }

  setFont(type = 'regular', size = 10) {
    this.doc.font(this.fonts[type]).fontSize(size)
    return this.doc
  }

  // DIN 5008: Falzmarken
  addFalzmarken() {
    const leftMargin = 5
    const markLength = 10
    
    this.doc.save()
    this.doc.strokeColor(this.COLORS.border)
    this.doc.lineWidth(0.5)
    
    // Prva falzmarke na 105mm
    this.doc.moveTo(leftMargin, 105 * 2.83465)
       .lineTo(leftMargin + markLength, 105 * 2.83465)
       .stroke()
    
    // Druga falzmarke na 210mm
    this.doc.moveTo(leftMargin, 210 * 2.83465)
       .lineTo(leftMargin + markLength, 210 * 2.83465)
       .stroke()
    
    this.doc.restore()
    console.log('Falzmarken added (105mm, 210mm)')
  }

  // Header sa logom LEVO
  async addDIN5008Header(majstorData, isFirstPage = false) {
    if (isFirstPage) {
      let y = 20
      
      const logoX = 50
      const logoY = 20
      let logoHeight = 0
      
      if (majstorData.business_logo_url) {
        try {
          logoHeight = await this.addLogoLeft(majstorData.business_logo_url, logoX, logoY)
          y = Math.max(y, logoY + logoHeight + 10)
        } catch (logoError) {
          console.warn('Logo load failed:', logoError.message)
        }
      }
      
      const infoX = 385
      let infoY = 20
      
      this.doc.save()
      const infoBoxWidth = 165
      const infoBoxHeight = 94
      
      this.doc.rect(infoX - 7, infoY - 4, infoBoxWidth, infoBoxHeight)
         .fillOpacity(0.05)
         .fill('#000000')
         .fillOpacity(1)
      
      this.doc.rect(infoX - 8, infoY - 5, infoBoxWidth, infoBoxHeight)
         .lineWidth(1)
         .strokeColor(this.COLORS.border)
         .stroke()
      
      this.doc.rect(infoX - 8, infoY - 5, infoBoxWidth, 3)
         .fillAndStroke(this.COLORS.accent, this.COLORS.accent)
      
      this.doc.restore()
      
      infoY += 8
      
      this.setFont('bold', this.FONT_SIZES.header)
      this.doc.text(majstorData.business_name || majstorData.full_name, infoX, infoY, {
        width: 150,
        lineBreak: true
      })
      infoY += 16
      
      this.setFont('regular', this.FONT_SIZES.small)
      if (majstorData.address) {
        this.doc.text(majstorData.address, infoX, infoY, { width: 150 })
        infoY += 10
      }
      if (majstorData.city) {
        this.doc.text(majstorData.city, infoX, infoY, { width: 150 })
        infoY += 10
      }
      if (majstorData.phone) {
        this.doc.text('Tel: ' + majstorData.phone, infoX, infoY, { width: 150 })
        infoY += 10
      }
      this.doc.text(majstorData.email, infoX, infoY, { width: 150 })
      infoY += 12
      
      if (majstorData.tax_number || majstorData.vat_id) {
        this.setFont('regular', this.FONT_SIZES.tiny)
        this.doc.fillColor(this.COLORS.secondary)
        
        if (majstorData.tax_number) {
          this.doc.text('Steuernr: ' + majstorData.tax_number, infoX, infoY, { width: 150 })
          infoY += 9
        }
        if (majstorData.vat_id) {
          this.doc.text('USt-IdNr: ' + majstorData.vat_id, infoX, infoY, { width: 150 })
        }
        
        this.doc.fillColor('#000000')
      }
      
      this.currentY = 200
      console.log('Header (first page) added with logo LEFT')
      
    } else {
      const y = 20
      
      this.doc.save()
      this.doc.moveTo(50, y + 15)
         .lineTo(545, y + 15)
         .lineWidth(0.5)
         .strokeColor(this.COLORS.lightBorder)
         .stroke()
      this.doc.restore()
      
      this.setFont('bold', this.FONT_SIZES.small)
      this.doc.text(majstorData.business_name || majstorData.full_name, 50, y, {
        width: 300
      })
      
      this.setFont('italic', this.FONT_SIZES.tiny)
      this.doc.fillColor(this.COLORS.secondary)
      this.doc.text(`Seite ${this.currentPage} - Fortsetzung`, 350, y, {
        width: 195,
        align: 'right'
      })
      this.doc.fillColor('#000000')
      
      this.currentY = y + 35
      console.log(`Header (page ${this.currentPage}) added`)
    }
  }

  async addLogoLeft(logoUrl, logoX, logoY) {
    try {
      const maxLogoWidth = 140
      const maxLogoHeight = 60

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)

      const response = await fetch(logoUrl, {
        method: 'GET',
        headers: { 'User-Agent': 'Pro-Meister-PDF-Generator/2.0' },
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`Logo fetch failed: ${response.status}`)
      }

      const imageArrayBuffer = await response.arrayBuffer()
      const imageBuffer = Buffer.from(imageArrayBuffer)
      
      this.doc.image(imageBuffer, logoX, logoY, {
        fit: [maxLogoWidth, maxLogoHeight],
        align: 'left',
        valign: 'top'
      })

      console.log('Logo added (LEFT, 140x60px)')
      return maxLogoHeight
    } catch (error) {
      console.error('Logo load failed:', error)
      throw error
    }
  }


  // UPGRADED: DIN 5008 Form B mit strukturierten Adressen + WEG
  addDIN5008AddressField(invoiceData, majstorData) {
    const fieldX = 70.87
    const fieldStartY = 127.56
    const fieldWidth = 240.95
    const fieldHeight = 127.56
    
    const anschriftY = 177.7
    const absenderY = anschriftY - 10
    
    this.setFont('regular', 6.5)
    this.doc.fillColor(this.COLORS.secondary)
    
    const absenderLine = `${majstorData.business_name || majstorData.full_name}, ${majstorData.address || ''}, ${majstorData.city || ''}`
    
    this.doc.text(absenderLine, fieldX, absenderY, {
      width: fieldWidth,
      lineBreak: false
    })
    
    this.doc.save()
    this.doc.moveTo(fieldX, anschriftY - 2)
       .lineTo(fieldX + fieldWidth, anschriftY - 2)
       .lineWidth(0.3)
       .strokeColor(this.COLORS.lightBorder)
       .stroke()
    this.doc.restore()
    
    let y = anschriftY + 5
    
    this.doc.fillColor('#000000')
    this.setFont('bold', this.FONT_SIZES.header)
    
    this.doc.text(invoiceData.customer_name, fieldX, y, {
      width: fieldWidth,
      lineBreak: false
    })
    y += 15
    
    if (invoiceData.customer_tax_number) {
      this.setFont('regular', this.FONT_SIZES.small)
      this.doc.fillColor(this.COLORS.secondary)
      this.doc.text(`Steuernr: ${invoiceData.customer_tax_number}`, fieldX, y, {
        width: fieldWidth
      })
      this.doc.fillColor('#000000')
      y += 13
    }

    // BILLING ADDRESS - Structured
    this.setFont('regular', this.FONT_SIZES.normal)
    
    if (invoiceData.customer_street) {
      this.doc.text(invoiceData.customer_street, fieldX, y, {
        width: fieldWidth
      })
      y += 11
    }
    
   if (invoiceData.customer_postal_code && invoiceData.customer_city) {
      let cityLine = `${invoiceData.customer_postal_code} ${invoiceData.customer_city}`
      
      // 🔥 Prikaži državu SAMO ako nije prazna
      if (invoiceData.customer_country && invoiceData.customer_country.trim() !== '') {
        cityLine += `, ${invoiceData.customer_country}`
      }
      
      this.doc.text(cityLine, fieldX, y, {
        width: fieldWidth
      })
      y += 13
    }
    
    // WEG OBJECT ADDRESS
    if (invoiceData.weg_street) {
      y += 5
      
      if (invoiceData.weg_property_name) {
        this.setFont('bold', this.FONT_SIZES.small)
        this.doc.fillColor(this.COLORS.secondary)
        this.doc.text(invoiceData.weg_property_name, fieldX, y, {
          width: fieldWidth
        })
        this.doc.fillColor('#000000')
        y += 11
      }
      
      this.setFont('regular', this.FONT_SIZES.normal)
      this.doc.text(invoiceData.weg_street, fieldX, y, {
        width: fieldWidth
      })
      y += 11
      
      if (invoiceData.weg_postal_code && invoiceData.weg_city) {
        let wegCityLine = `${invoiceData.weg_postal_code} ${invoiceData.weg_city}`
        
        // 🔥 Prikaži državu SAMO ako nije prazna
        if (invoiceData.weg_country && invoiceData.weg_country.trim() !== '') {
          wegCityLine += `, ${invoiceData.weg_country}`
        }
        
        this.doc.text(wegCityLine, fieldX, y, {
          width: fieldWidth
        })
        y += 11
      }
    }
    
    this.currentY = fieldStartY + fieldHeight + 20
    console.log('DIN 5008 Address Field added (structured: billing + WEG)')
  }

  // Info blok
  addInvoiceInfoBlock(invoiceData) {
    const infoX = 370
    let y = 200
    
    const title = invoiceData.type === 'quote' ? 'ANGEBOT' : 'RECHNUNG'
    const number = invoiceData.invoice_number || invoiceData.quote_number || 'N/A'
    const dateLabel = invoiceData.type === 'quote' ? 'Angebotsdatum:' : 'Rechnungsdatum:'
    const validLabel = invoiceData.type === 'quote' ? 'G\u00FCltig bis:' : 'F\u00E4llig am:'
    
    this.setFont('bold', this.FONT_SIZES.title)
    this.doc.fillColor(this.COLORS.accent)
    this.doc.text(title, infoX, y)
    this.doc.fillColor('#000000')
    y += 20
    
    this.setFont('bold', this.FONT_SIZES.subtitle)
    this.doc.text('Nr. ' + number, infoX, y)
    y += 22
    
    this.setFont('regular', this.FONT_SIZES.small)
    this.doc.text(dateLabel, infoX, y, { width: 90 })
    this.setFont('bold', this.FONT_SIZES.small)
    this.doc.text(this.formatDate(invoiceData.issue_date), infoX + 92, y)
    y += 13
    
    if (invoiceData.due_date) {
      this.setFont('regular', this.FONT_SIZES.small)
      this.doc.text(validLabel, infoX, y, { width: 90 })
      this.setFont('bold', this.FONT_SIZES.small)
      this.doc.text(this.formatDate(invoiceData.due_date), infoX + 92, y)
      y += 13
    }
    
    y += 13

    if (invoiceData.place_of_service && invoiceData.place_of_service.trim().length > 0) {
      this.setFont('regular', this.FONT_SIZES.small)
      this.doc.text('Ort der Leistung:', infoX, y, { width: 90 })
      this.setFont('bold', this.FONT_SIZES.small)
      
      const placeText = invoiceData.place_of_service.trim()
      const maxWidth = 100
      
      const textHeight = this.doc.heightOfString(placeText, {
        width: maxWidth,
        lineBreak: true
      })
      
      this.doc.text(placeText, infoX + 92, y, {
        width: maxWidth,
        lineBreak: true
      })
      
      y += textHeight + 5
    }

    this.currentY = y
    console.log('Invoice info block added')
  }

  // Items Table
  async addItemsTable(invoiceData) {
    let items = []
    try {
      if (typeof invoiceData.items === 'string') {
        items = JSON.parse(invoiceData.items)
      } else if (Array.isArray(invoiceData.items)) {
        items = invoiceData.items
      } else {
        console.error('Invalid items format:', typeof invoiceData.items)
        return
      }
    } catch (parseError) {
      console.error('Items parsing failed:', parseError.message)
      return
    }
    
    if (!items || items.length === 0) {
      console.warn('No items in invoice')
      return
    }
    
    console.log('Processing', items.length, 'items:', items)
    
    await this.checkSpaceAndAddPageIfNeeded(120)
    
    let y = this.currentY + 5
    const startX = 50
    const tableWidth = 495
    
    const addTableHeader = (yPos) => {
      this.doc.save()
      this.doc.rect(startX, yPos, tableWidth, 24)
         .fillAndStroke(this.COLORS.background, this.COLORS.primary)
      this.doc.restore()
      
      this.setFont('bold', this.FONT_SIZES.small)
      this.doc.fillColor('#000000')
      
      this.doc.text('Pos.', startX + 5, yPos + 8, { width: 30 })
      this.doc.text('Beschreibung', startX + 40, yPos + 8, { width: 245 })
      this.doc.text('Menge', startX + 290, yPos + 8, { width: 50, align: 'right' })
      this.doc.text('Einzelpreis', startX + 345, yPos + 8, { width: 70, align: 'right' })
      this.doc.text('Gesamtpreis', startX + 420, yPos + 8, { width: 70, align: 'right' })
      
      return yPos + 24
    }
    
    y = addTableHeader(y)
    
    this.setFont('regular', this.FONT_SIZES.small)
    let itemY = y
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      
      const descriptionHeight = this.doc.heightOfString(item.description || '', { 
        width: 245,
        lineGap: 1
      })
      const requiredSpace = Math.max(28, descriptionHeight + 12)
      
      const isLastItem = (i === items.length - 1)
      const extraSpaceForLast = isLastItem ? 150 : 35
      
      const needsNewPage = await this.checkSpaceAndAddPageIfNeeded(
        requiredSpace + extraSpaceForLast,
        3
      )
      
      if (needsNewPage) {
        itemY = this.currentY + 10
        itemY = addTableHeader(itemY)
        console.log('Table header repeated on new page')
      }
      
      this.doc.save()
      this.doc.moveTo(startX, itemY)
         .lineTo(startX + tableWidth, itemY)
         .lineWidth(0.3)
         .strokeColor('#eeeeee')
         .stroke()
      this.doc.restore()
      
      const contentY = itemY + 6
      
      const quantity = this.parseNumber(
        item.quantity ?? item.amount ?? item.qty ?? 1, 
        1
      )
      const unitPrice = this.parseNumber(
        item.unit_price ?? item.price ?? item.unitPrice ?? item.einzelpreis ?? 0, 
        0
      )
      const totalPrice = this.parseNumber(
        item.total_price ?? item.total ?? item.totalPrice ?? item.gesamtpreis ?? (quantity * unitPrice), 
        0
      )
      
      if (i === 0) {
        console.log('Item #1 data:', {
          raw: item,
          parsed: { quantity, unitPrice, totalPrice }
        })
      }
      
      if (i % 2 === 0) {
        this.doc.save()
        this.doc.rect(startX, itemY, tableWidth, requiredSpace)
           .fillOpacity(0.02)
           .fill(this.COLORS.primary)
           .fillOpacity(1)
        this.doc.restore()
      }
      
      this.setFont('regular', this.FONT_SIZES.small)
      this.doc.text((i + 1).toString(), startX + 5, contentY, { width: 30 })
      this.doc.text(item.description || '', startX + 40, contentY, { 
        width: 245,
        lineBreak: true,
        lineGap: 1
      })
      this.doc.text(quantity.toFixed(0), startX + 290, contentY, { width: 50, align: 'right' })
      this.doc.text(`${unitPrice.toFixed(2)} \u20AC`, startX + 345, contentY, { width: 70, align: 'right' })
      
      this.setFont('bold', this.FONT_SIZES.small)
      this.doc.text(`${totalPrice.toFixed(2)} \u20AC`, startX + 420, contentY, { width: 70, align: 'right' })
      
      itemY += requiredSpace
    }
    
    this.doc.save()
    this.doc.moveTo(startX, itemY)
       .lineTo(startX + tableWidth, itemY)
       .lineWidth(1.5)
       .strokeColor(this.COLORS.primary)
       .stroke()
    this.doc.restore()
    
    this.currentY = itemY + 12
    console.log(`Items table added (${items.length} items) with anti-orphan protection`)
  }

  // Totals sekcija
  async addTotalsSection(invoiceData, majstorData) {
    await this.checkSpaceAndAddPageIfNeeded(110)
    
    let y = this.currentY + 20
    const labelX = 380
    const valueX = 470
    
    const subtotal = this.parseNumber(invoiceData.subtotal, 0)
    const taxAmount = this.parseNumber(invoiceData.tax_amount, 0)
    const totalAmount = this.parseNumber(invoiceData.total_amount, 0)
    const vatRate = this.parseNumber(majstorData.vat_rate, 0)
    
    const hasTaxDifference = totalAmount > subtotal && (totalAmount - subtotal) > 0.01
    const calculatedTax = hasTaxDifference ? (totalAmount - subtotal) : taxAmount
    const effectiveVatRate = hasTaxDifference && subtotal > 0 
      ? ((totalAmount - subtotal) / subtotal * 100) 
      : vatRate
    
    console.log('Totals:', { 
      subtotal, 
      taxAmount, 
      totalAmount, 
      vatRate,
      hasTaxDifference,
      calculatedTax,
      effectiveVatRate: effectiveVatRate.toFixed(2) + '%'
    })
    
    this.setFont('regular', this.FONT_SIZES.normal)
    this.doc.text('Nettobetrag:', labelX, y)
    this.doc.text(`${subtotal.toFixed(2)} \u20AC`, valueX, y, { align: 'right', width: 75 })
    y += 15
    
    if (hasTaxDifference) {
      const displayVatRate = effectiveVatRate > 0 ? effectiveVatRate : vatRate
      const taxLabel = displayVatRate > 0 
        ? `zzgl. MwSt (${displayVatRate.toFixed(0)}%):` 
        : 'zzgl. MwSt:'
      
      this.doc.text(taxLabel, labelX, y)
      this.doc.text(`${calculatedTax.toFixed(2)} \u20AC`, valueX, y, { align: 'right', width: 75 })
      y += 20
    } else {
      this.setFont('italic', this.FONT_SIZES.tiny)
      this.doc.fillColor(this.COLORS.secondary)
      this.doc.text('(Kleinunternehmerregelung - Steuer nicht ausgewiesen)', labelX, y, {
        width: 165,
        align: 'left'
      })
      this.doc.fillColor('#000000')
      this.setFont('regular', this.FONT_SIZES.normal)
      y += 20
    }
    
    this.doc.save()
    this.doc.rect(labelX - 4, y - 2, 200, 24)
       .fillOpacity(0.03)
       .fill('#000000')
       .fillOpacity(1)
    
    this.doc.rect(labelX - 5, y - 3, 200, 24)
       .lineWidth(2)
       .strokeColor(this.COLORS.success)
       .stroke()
    
    this.doc.rect(labelX - 5, y - 3, 200, 3)
       .fillAndStroke(this.COLORS.success, this.COLORS.success)
    this.doc.restore()
    
    this.setFont('bold', this.FONT_SIZES.subtitle)
    this.doc.text('Gesamtbetrag:', labelX, y + 3)
    this.doc.text(`${totalAmount.toFixed(2)} \u20AC`, valueX, y + 3, { align: 'right', width: 75 })
    
    this.currentY = y + 25
    console.log('Totals section added')
  }

  // Notes
  async addNotesSection(invoiceData) {
    if (!invoiceData.notes) return
    
    await this.checkSpaceAndAddPageIfNeeded(60)
    
    let y = this.currentY + 12
    
    this.doc.save()
    this.doc.moveTo(50, y).lineTo(545, y)
       .lineWidth(0.5)
       .stroke(this.COLORS.lightBorder)
    this.doc.restore()
    
    y += 12
    
    this.setFont('italic', this.FONT_SIZES.normal)
    this.doc.fillColor(this.COLORS.secondary)
    this.doc.text(invoiceData.notes, 50, y, {
      width: 495,
      align: 'left',
      lineGap: 1.5
    })
    this.doc.fillColor('#000000')
    
    const notesHeight = this.doc.heightOfString(invoiceData.notes, { 
      width: 495,
      lineGap: 1.5
    })
    
    this.currentY = y + notesHeight + 12
    console.log('Notes section added')
  }

  // Invoice footer
  async addInvoiceFooterSection(majstorData) {
    const footerText = majstorData.invoice_footer ||
      'Vielen Dank f\u00FCr Ihr Vertrauen. Bei Fragen stehen wir Ihnen gerne zur Verf\u00FCgung.'
    
    const maxWidth = 495
    const textHeight = this.doc.heightOfString(footerText, {
      width: maxWidth,
      lineGap: 2
    })
    
    const requiredSpace = 8 + 12 + textHeight + 18
    await this.checkSpaceAndAddPageIfNeeded(requiredSpace)

    let y = this.currentY + 5

    this.doc.save()
    this.doc.moveTo(50, y).lineTo(545, y)
      .lineWidth(0.5)
      .stroke(this.COLORS.lightBorder)
    this.doc.restore()
    
    y += 10

    this.doc.font('Times-Italic').fontSize(this.FONT_SIZES.header)
    this.doc.fillColor(this.COLORS.secondary)
    this.doc.text(footerText, 50, y, {
      width: maxWidth,
      align: 'left',
      lineGap: 2
    })
    this.doc.fillColor('#000000')
    
    this.currentY = y + textHeight + 12
    console.log('Invoice footer section added')
  }

  // Payment info sa SEPA QR
  async addPaymentInfo(invoiceData, majstorData) {
    if (invoiceData.type === 'quote') return

    await this.checkSpaceAndAddPageIfNeeded(120)

    let y = this.currentY + 12
    const paymentInfoStartY = y

    this.setFont('bold', this.FONT_SIZES.header)
    this.doc.text('Zahlungsinformationen', 50, y)
    y += 20

    const totalAmount = parseFloat(invoiceData.total_amount || 0)

    if (majstorData.iban && totalAmount > 0) {
      try {
        const qrBuffer = await SEPAQRService.generateForInvoice(invoiceData, majstorData)
        const qrX = 380
        const qrY = paymentInfoStartY - 5
        const qrSize = 90
        
        this.doc.save()
        this.doc.rect(qrX - 2, qrY - 2, qrSize + 4, qrSize + 4)
           .lineWidth(1)
           .strokeColor(this.COLORS.lightBorder)
           .stroke()
        this.doc.restore()
        
        this.doc.image(qrBuffer, qrX, qrY, {
          fit: [qrSize, qrSize]
        })
        
        this.setFont('italic', this.FONT_SIZES.tiny)
        this.doc.fillColor(this.COLORS.secondary)
        this.doc.text('SEPA QR', qrX, qrY + qrSize + 5, {
          width: qrSize,
          align: 'center'
        })
        this.doc.fillColor('#000000')
        
      } catch (qrError) {
        console.warn('SEPA QR failed:', qrError.message)
      }
    }

    this.setFont('regular', this.FONT_SIZES.small)
    
    if (majstorData.iban) {
      this.doc.text('IBAN:', 50, y, { width: 70 })
      this.setFont('bold', this.FONT_SIZES.small)
      this.doc.text(majstorData.iban, 125, y)
      this.setFont('regular', this.FONT_SIZES.small)
      y += 13
    }
    
    if (majstorData.bic) {
      this.doc.text('BIC:', 50, y, { width: 70 })
      this.setFont('bold', this.FONT_SIZES.small)
      this.doc.text(majstorData.bic, 125, y)
      this.setFont('regular', this.FONT_SIZES.small)
      y += 13
    }
    
    if (majstorData.bank_name) {
      this.doc.text('Bank:', 50, y, { width: 70 })
      this.setFont('bold', this.FONT_SIZES.small)
      this.doc.text(majstorData.bank_name, 125, y)
      y += 13
    }
    
    this.currentY = Math.max(y, paymentInfoStartY + 105)
    console.log('Payment info added')
  }

  // Page footer
  addPageFooter(majstorData, isLastPage = false, hasZUGFeRD = false) {
    const footerY = 745
    
    if (isLastPage && hasZUGFeRD) {
      const zugferdY = 728
      this.setFont('bold', this.FONT_SIZES.micro)
      this.doc.fillColor(this.COLORS.accent)
      this.doc.text('[X] ZUGFeRD 2.1 KONFORM - Enthält maschinenlesbare XML-Rechnungsdaten', 50, zugferdY, { 
        width: 500, 
        align: 'left' 
      })
      this.doc.fillColor('#000000')
    }
    
    this.doc.save()
    this.doc.moveTo(50, footerY - 3).lineTo(545, footerY - 3)
      .lineWidth(0.5)
      .stroke(this.COLORS.lightBorder)
    this.doc.restore()
    
    this.setFont('regular', this.FONT_SIZES.micro)
    this.doc.fillColor(this.COLORS.secondary)
    
    const footerText = [
      majstorData.business_name || majstorData.full_name,
      majstorData.email,
      majstorData.phone || '',
      'Steuernr: ' + (majstorData.tax_number || 'N/A')
    ].filter(Boolean).join(' | ')
    
    this.doc.text(footerText, 50, footerY + 3, { 
      width: 495, 
      align: 'center',
      lineBreak: false 
    })
    
    const brandingY = footerY + 15
    this.setFont('bold', this.FONT_SIZES.micro)
    this.doc.fillColor(this.COLORS.accent)
    this.doc.text('POWERED BY PRO-MEISTER.DE', 50, brandingY, { 
      width: 495, 
      align: 'center',
      lineBreak: false
    })
    
    this.doc.fillColor('#000000')
  }

  // Check space sa anti-orphan zastitom
  async checkSpaceAndAddPageIfNeeded(requiredSpace, minItemsOnPage = 0) {
    const hasEnoughSpace = (this.currentY + requiredSpace) <= this.pageBottomLimit
    
    const remainingSpace = this.pageBottomLimit - this.currentY
    const isOrphanRisk = remainingSpace < 100 && remainingSpace < requiredSpace * 0.5
    
    if (!hasEnoughSpace || isOrphanRisk) {
      console.log('Adding new page - space:', remainingSpace, 'required:', requiredSpace)
      
      this.addPageFooter(this.majstorData, false, false)
      
      this.setFont('italic', this.FONT_SIZES.tiny)
      this.doc.fillColor(this.COLORS.secondary)
      this.doc.text('(Fortsetzung auf nächster Seite)', 50, this.pageBottomLimit + 5, {
        width: 495,
        align: 'center'
      })
      this.doc.fillColor('#000000')
      
      this.doc.addPage()
      this.currentPage++
      this.isFirstPage = false
      
      await this.addDIN5008Header(this.majstorData, false)
      
      return true
    }
    return false
  }

  // Format date helper
  formatDate(dateString) {
    if (!dateString) return ''
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return ''
    
    return date.toLocaleDateString('de-DE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  }

  // Safe number parsing helper
  parseNumber(value, defaultValue = 0) {
    if (value == null) return defaultValue
    
    if (typeof value === 'number') {
      return isNaN(value) ? defaultValue : value
    }
    
    if (typeof value === 'string') {
      const cleaned = value.trim().replace(/\s/g, '').replace(',', '.')
      const parsed = parseFloat(cleaned)
      return isNaN(parsed) ? defaultValue : parsed
    }
    
    return defaultValue
  }

  // MAIN: Generate Invoice
  async generateInvoice(invoiceData, majstorData) {
    console.log('Starting OPTIMIZED PDF generation...')
    console.log('Invoice data:', {
      type: invoiceData.type,
      number: invoiceData.invoice_number || invoiceData.quote_number,
      subtotal: invoiceData.subtotal,
      tax_amount: invoiceData.tax_amount,
      total_amount: invoiceData.total_amount,
      items_type: typeof invoiceData.items,
      items_length: invoiceData.items ? (typeof invoiceData.items === 'string' ? 'string' : invoiceData.items.length) : 'null'
    })
    console.log('Majstor data:', {
      vat_rate: majstorData.vat_rate,
      has_iban: !!majstorData.iban,
      has_logo: !!majstorData.business_logo_url
    })
    
    this.doc = new PDFDocument({
      size: 'A4',
      margins: {
        top: 0,
        bottom: 56.69,
        left: 70.87,
        right: 56.69
      },
      bufferPages: true,
      autoFirstPage: true,
      info: {
        Title: invoiceData.type === 'quote' ? 'Angebot' : 'Rechnung',
        Author: majstorData.business_name || majstorData.full_name,
        Creator: 'Pro-Meister.de - DIN 5008 Form B + DIN lang',
        Producer: 'Pro-Meister.de ZUGFeRD Generator v2.0',
        Keywords: invoiceData.type === 'invoice' ? 
          'ZUGFeRD, Rechnung, XML, DIN 5008, DIN lang' : 
          'Angebot, Quote, DIN 5008, DIN lang',
        Subject: `${invoiceData.type === 'quote' ? 'Angebot' : 'Rechnung'} ${invoiceData.invoice_number || invoiceData.quote_number}`
      }
    })

    this.setupFonts()
    this.currentY = 50
    this.isFirstPage = true
    this.currentPage = 1
    this.majstorData = majstorData
    this.invoiceData = invoiceData
    
    try {
      this.addFalzmarken()
      
      await this.addDIN5008Header(majstorData, true)
      
      this.addDIN5008AddressField(invoiceData, majstorData)
      
      this.addInvoiceInfoBlock(invoiceData)
      
      let zugferdXML = null
      if (invoiceData.type === 'invoice') {
        try {
          const validation = ZUGFeRDService.canGenerateZUGFeRD(invoiceData, majstorData)
          if (validation.canGenerate) {
            zugferdXML = ZUGFeRDService.generateZUGFeRDXML(invoiceData, majstorData)
            await this.embedZUGFeRDXML(zugferdXML, invoiceData)
            console.log('ZUGFeRD XML embedded')
          } else {
            console.warn('ZUGFeRD skipped:', validation.missingFields)
          }
        } catch (zugferdError) {
          console.error('ZUGFeRD failed:', zugferdError.message)
        }
      }
      
      await this.addItemsTable(invoiceData)
      await this.addTotalsSection(invoiceData, majstorData)
      await this.addNotesSection(invoiceData)
      await this.addInvoiceFooterSection(majstorData)
      await this.addPaymentInfo(invoiceData, majstorData)
      
      this.addPageFooter(majstorData, true, !!zugferdXML)
      
      this.doc.end()
      
      console.log('OPTIMIZED PDF generation complete!')
      
      return new Promise((resolve, reject) => {
        const chunks = []
        this.doc.on('data', chunk => chunks.push(chunk))
        this.doc.on('end', () => resolve(Buffer.concat(chunks)))
        this.doc.on('error', reject)
      })
      
    } catch (error) {
      console.error('PDF generation failed:', error)
      throw error
    }
  }

  // Embed ZUGFeRD XML
  async embedZUGFeRDXML(xmlContent, invoiceData) {
    try {
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
      
      console.log('ZUGFeRD XML embedded:', xmlFilename)
    } catch (error) {
      console.error('XML embedding failed:', error.message)
      throw error
    }
  }
}

export default InvoicePDFService