// lib/pdf/InvoicePDFService.js - ZUGFeRD 2.4 / PDF/A-3b
import PDFDocument from 'pdfkit'
import { resolve } from 'path'
import { SEPAQRService } from './SEPAQRService.js'
import { ZUGFeRDService } from './ZUGFeRDService.js'
import { PDFA3PostProcessor } from './PDFA3PostProcessor.js'
import { normalizeInvoice } from './InvoiceNormalizer.js'
import { validateForZUGFeRD } from './InvoiceValidator.js'

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
    // Attempt to register embedded NotoSans fonts (required for PDF/A-3b compliance).
    // Font files are in lib/fonts/ and committed to the repo.
    try {
      const fontDir = resolve(process.cwd(), 'lib', 'fonts')
      this.doc.registerFont('NotoSans',        resolve(fontDir, 'NotoSans-Regular.ttf'))
      this.doc.registerFont('NotoSans-Bold',   resolve(fontDir, 'NotoSans-Bold.ttf'))
      this.doc.registerFont('NotoSans-Italic', resolve(fontDir, 'NotoSans-Italic.ttf'))
      this.fonts = {
        regular:    'NotoSans',
        bold:       'NotoSans-Bold',
        italic:     'NotoSans-Italic',
        boldItalic: 'NotoSans-Bold',
      }
    } catch {
      // Fallback for environments without font files (PDF/A-3b non-compliant)
      this.fonts = {
        regular:    'Helvetica',
        bold:       'Helvetica-Bold',
        italic:     'Helvetica-Oblique',
        boldItalic: 'Helvetica-BoldOblique',
      }
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
      
      const logoX = 60
      const logoY = 35
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
      this.doc.text(majstorData.business_email || majstorData.email, infoX, infoY, { width: 150 })
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
      
      this.currentY = 175
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

  // ⚡ OPTIMIZED: Faster logo fetch (3s timeout + cache headers)
  async addLogoLeft(logoUrl, logoX, logoY) {
    try {
      const maxLogoWidth = 168
      const maxLogoHeight = 72

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3000) // ⚡ 10s → 3s

      const response = await fetch(logoUrl, {
        method: 'GET',
        headers: { 
          'User-Agent': 'Pro-Meister-PDF-Generator/2.0',
          'Cache-Control': 'public, max-age=31536000' // ⚡ Cache header
        },
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
    
    const isStorno = invoiceData.type === 'storno'
    const title = invoiceData.type === 'quote' ? 'ANGEBOT' : isStorno ? 'STORNORECHNUNG' : 'RECHNUNG'
    const number = invoiceData.invoice_number || invoiceData.quote_number || 'N/A'
    const dateLabel = isStorno ? 'Stornodatum:' : invoiceData.type === 'quote' ? 'Angebotsdatum:' : 'Rechnungsdatum:'
    const validLabel = invoiceData.type === 'quote' ? 'G\u00FCltig bis:' : 'F\u00E4llig am:'

    this.setFont('bold', this.FONT_SIZES.title)
    this.doc.fillColor(this.COLORS.accent)
    this.doc.text(title, infoX, y)
    this.doc.fillColor('#000000')
    y += 20

    this.setFont('bold', this.FONT_SIZES.subtitle)
    this.doc.text('Nr. ' + number, infoX, y)
    y += 22

    if (isStorno && invoiceData.stornoOfNumber) {
      this.setFont('regular', this.FONT_SIZES.small)
      this.doc.text('Bezug:', infoX, y, { width: 90 })
      this.setFont('bold', this.FONT_SIZES.small)
      this.doc.text('Rechnung ' + invoiceData.stornoOfNumber, infoX + 92, y)
      y += 13
    }

    this.setFont('regular', this.FONT_SIZES.small)
    this.doc.text(dateLabel, infoX, y, { width: 90 })
    this.setFont('bold', this.FONT_SIZES.small)
    this.doc.text(this.formatDate(invoiceData.issue_date), infoX + 92, y)
    y += 13

    if (!isStorno && invoiceData.due_date) {
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
      const hasTax = (invoiceData.taxRate ?? invoiceData.tax_rate ?? 0) > 0
      const minRowH = hasTax ? 34 : 28
      const requiredSpace = Math.max(minRowH, descriptionHeight + 12)
      
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
      const unitLabel = item.unit ? ` ${item.unit}` : ''
      this.doc.text(`${quantity % 1 === 0 ? quantity.toFixed(0) : quantity.toFixed(2)}${unitLabel}`, startX + 290, contentY, { width: 50, align: 'right' })
      
      this.doc.text(
  '€ ' + new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(unitPrice),
  startX + 345,
  contentY,
  { width: 70, align: 'right' }
)

this.setFont('bold', this.FONT_SIZES.small)
this.doc.text(
  '€ ' + new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(totalPrice),
  startX + 420,
  contentY,
  { width: 70, align: 'right' }
)

      // Brutto per position (if tax applies)
      const taxRate = invoiceData.taxRate ?? invoiceData.tax_rate ?? 0
      const grossPrice = this.parseNumber(item.price_gross, 0)
      const totalGross = parseFloat((quantity * grossPrice).toFixed(2))
      if (taxRate > 0 && totalGross > 0) {
        this.setFont('regular', 7)
        this.doc.fillColor('#666666')
        this.doc.text(
          '(€ ' + new Intl.NumberFormat('de-DE', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          }).format(totalGross) + ' brutto)',
          startX + 390,
          contentY + 12,
          { width: 100, align: 'right' }
        )
        this.doc.fillColor('#000000')
        this.setFont('regular', this.FONT_SIZES.small)
      }


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

  // Aufmaß Fensterbau positions inline
  async addAufmassPositions() {
    // Filter to fensterbau aufmaße that have positions
    const fensterbauList = (this.aufmassDataList || []).filter(a => a.gewerk === 'fensterbau' && (a.rooms || []).length > 0)
    if (fensterbauList.length === 0) return

    // Collect all positions across all aufmaße
    const allPositions = []
    for (const aufmass of fensterbauList) {
      for (const pos of (aufmass.rooms || [])) {
        allPositions.push(pos)
      }
    }
    if (allPositions.length === 0) return

    await this.checkSpaceAndAddPageIfNeeded(30)

    // Section header
    let y = this.currentY + 8
    this.setFont('bold', this.FONT_SIZES.normal)
    this.doc.fillColor('#333333')
    this.doc.text('Aufmaß — Positionen', 50, y)
    y += 18

    const positions = allPositions
    for (let pi = 0; pi < positions.length; pi++) {
      const pos = positions[pi]
      const panels = pos.panels || []

      // Estimate block height: header(22) + sketch(110) + kote below(34) + margin(10) ≈ 176
      const estimatedBlockH = 176
      await this.checkSpaceAndAddPageIfNeeded(estimatedBlockH)
      y = this.currentY

      // Position header bar
      this.doc.save()
      this.doc.rect(50, y, 495, 18).fillAndStroke('#f5f5f5', '#cccccc')
      this.doc.restore()
      this.setFont('bold', this.FONT_SIZES.small)
      this.doc.fillColor('#333333')
      this.doc.text(`Pos. ${pi + 1}${pos.name ? '   ' + pos.name : ''}`, 55, y + 5)
      y += 22

      // Fixed layout: sketch+kote container | details text
      const SKETCH_CONTAINER_W = 210  // total width for sketch + kote
      const DET_X = 72 + SKETCH_CONTAINER_W + 5  // fixed text start
      const DET_VAL_X = DET_X + 70  // fixed value column
      const DET_VAL_W = 595.28 - 56.69 - DET_VAL_X  // available value width

      // ── MEHRTEILIG (multi-segment) ──
      if (pos.preset === 'mehrteilig' && pos.segments?.length > 0) {
        const segs = pos.segments
        const segWidths = segs.map(s => parseFloat(s.width) || 100)
        const segHeights = segs.map(s => parseFloat(s.height) || 100)
        const totalRealW = segWidths.reduce((a, b) => a + b, 0)
        const maxRealH = Math.max(...segHeights)
        const align = pos.alignment || 'top'

        // Scale sketch to fit within container minus kote space
        const segsWithBD = segs.filter(s => (s.oberlicht && parseFloat(s.oberlichtHeight) > 0) || (s.unterlicht && parseFloat(s.unterlichtHeight) > 0))
        const dimColsR = segs.length + segsWithBD.length
        const colSp = 10
        const koteSpace = 2 + dimColsR * colSp + 8
        const maxSkW = Math.min(130, SKETCH_CONTAINER_W - koteSpace), maxSkH = 110
        const scale = Math.min(maxSkW / totalRealW, maxSkH / maxRealH)
        const sketchW = totalRealW * scale, sketchH = maxRealH * scale
        const sketchX = 72, sketchY = y
        const inset = 4, handleW = 2, handleH = 8

        // Draw each segment
        let sxOff = sketchX
        for (let si = 0; si < segs.length; si++) {
          const seg = segs[si]
          const sw = segWidths[si] * scale
          const sh = segHeights[si] * scale
          const sx = sxOff
          sxOff += sw

          let sy = sketchY
          if (align === 'bottom') sy = sketchY + sketchH - sh
          else if (align === 'center') sy = sketchY + (sketchH - sh) / 2

          // Segment frame
          this.doc.save()
          this.doc.rect(sx, sy, sw, sh).lineWidth(1.2).strokeColor('#444444').stroke()
          this.doc.restore()

          const segRealH = segHeights[si]
          const olHmm = parseFloat(seg.oberlichtHeight) || 0
          const olH = seg.oberlicht ? (olHmm > 0 ? sh * olHmm / segRealH : sh * 0.22) : 0
          const ulHmm = parseFloat(seg.unterlichtHeight) || 0
          const ulH = seg.unterlicht ? (ulHmm > 0 ? sh * ulHmm / segRealH : sh * 0.22) : 0
          const panelH = sh - olH - ulH
          const panelY = sy + olH
          const segPanels = seg.panels || [{ type: 'fix' }]
          // Proportional panel widths within segment
          const segRealW2 = parseFloat(seg.width) || 0
          const pEffW = segPanels.map((p, i) => {
            if (i === segPanels.length - 1 && segPanels.length > 1 && segRealW2 > 0) {
              const others = segPanels.reduce((s, pp, j) => j !== i ? s + (parseFloat(pp.width) || 0) : s, 0)
              return Math.max(1, segRealW2 - others)
            }
            return parseFloat(p.width) || 0
          })
          const hasSegCW = pEffW.some(w => w > 0)
          const totalSegPW = hasSegCW ? pEffW.reduce((s, w) => s + (w || 1), 0) : segPanels.length
          const panelWs = pEffW.map(w => hasSegCW ? (w || 1) / totalSegPW * sw : sw / segPanels.length)

          // Oberlicht
          if (seg.oberlicht && olH > 2 * inset) {
            this.doc.save()
            this.doc.moveTo(sx, sy + olH).lineTo(sx + sw, sy + olH).lineWidth(0.5).strokeColor('#444444').stroke()
            this.doc.rect(sx + inset, sy + inset, sw - 2 * inset, olH - 2 * inset).lineWidth(0.4).strokeColor('#444444').stroke()
            this.doc.moveTo(sx + inset, sy + inset).lineTo(sx + sw - inset, sy + olH - inset).lineWidth(0.4).strokeColor('#999999').dash(3, { space: 3 }).stroke()
            this.doc.moveTo(sx + sw - inset, sy + inset).lineTo(sx + inset, sy + olH - inset).stroke()
            this.doc.restore()
            this.doc.undash()
          }

          // Panels
          let ppxOff = sx
          for (let pi = 0; pi < segPanels.length; pi++) {
            const p = segPanels[pi]
            const pw = panelWs[pi]
            const ppx = ppxOff
            ppxOff += pw
            this.doc.save()
            if (pi > 0) this.doc.moveTo(ppx, panelY).lineTo(ppx, panelY + panelH).lineWidth(0.5).strokeColor('#444444').stroke()
            const ix = ppx + inset, iy = panelY + inset, iw = pw - 2 * inset, ih = panelH - 2 * inset
            if (iw > 0 && ih > 0) {
              this.doc.rect(ix, iy, iw, ih).lineWidth(0.4).strokeColor('#444444').stroke()
              const cx = ix + iw / 2, cy = iy + ih / 2
              if (p.type === 'fix') {
                this.doc.moveTo(ix, iy).lineTo(ix + iw, iy + ih).lineWidth(0.4).strokeColor('#999999').dash(3, { space: 3 }).stroke()
                this.doc.moveTo(ix + iw, iy).lineTo(ix, iy + ih).stroke()
                this.doc.undash()
              }
              if (p.type === 'kipp' || p.type === 'kipp-dreh') {
                this.doc.moveTo(ix, iy + ih).lineTo(cx, iy).lineWidth(0.4).strokeColor('#999999').dash(3, { space: 3 }).stroke()
                this.doc.moveTo(ix + iw, iy + ih).lineTo(cx, iy).stroke()
                this.doc.undash()
              }
              if (p.type === 'dreh' || p.type === 'kipp-dreh') {
                this.doc.lineWidth(0.5).strokeColor('#444444')
                if (p.hinge === 'left' || !p.hinge) {
                  this.doc.moveTo(ix, iy).lineTo(ix + iw, cy).stroke()
                  this.doc.moveTo(ix, iy + ih).lineTo(ix + iw, cy).stroke()
                } else {
                  this.doc.moveTo(ix + iw, iy).lineTo(ix, cy).stroke()
                  this.doc.moveTo(ix + iw, iy + ih).lineTo(ix, cy).stroke()
                }
              }
              const showHandle = p.type === 'dreh' || p.type === 'kipp-dreh' || p.type === 'kipp'
              if (showHandle) {
                const isLeft = p.hinge === 'left' || !p.hinge
                const hx = isLeft ? (ix + iw + ppx + pw) / 2 - handleW / 2 : (ppx + ix) / 2 - handleW / 2
                const hy = iy + ih / 2 - handleH / 2
                this.doc.rect(hx, hy, handleW, handleH).fill('#444444')
              }
            }
            this.doc.restore()
          }

          // Unterlicht
          if (seg.unterlicht && ulH > 2 * inset) {
            const ulY = sy + sh - ulH
            this.doc.save()
            this.doc.moveTo(sx, ulY).lineTo(sx + sw, ulY).lineWidth(0.5).strokeColor('#444444').stroke()
            this.doc.rect(sx + inset, ulY + inset, sw - 2 * inset, ulH - 2 * inset).lineWidth(0.4).strokeColor('#444444').stroke()
            this.doc.moveTo(sx + inset, ulY + inset).lineTo(sx + sw - inset, ulY + ulH - inset).lineWidth(0.4).strokeColor('#999999').dash(3, { space: 3 }).stroke()
            this.doc.moveTo(sx + sw - inset, ulY + inset).lineTo(sx + inset, ulY + ulH - inset).stroke()
            this.doc.restore()
            this.doc.undash()
          }
        }

        // Dimension lines
        this.doc.save()
        this.doc.lineWidth(0.3).strokeColor('#aaaaaa')
        this.setFont('regular', 6)
        this.doc.fillColor('#999999')

        // Check if any segment has multiple panels with custom widths
        const hasPanelWidths = segs.some(seg => {
          const panels = seg.panels || []
          return panels.length > 1 && panels.some(p => parseFloat(p.width) > 0)
        })

        // Bottom row offsets
        const panelDimY = sketchY + sketchH + 4
        const segDimY = hasPanelWidths ? panelDimY + 12 : panelDimY
        const totalDimY2 = segDimY + 12

        // Bottom: per-panel widths (if any segment has custom panel widths)
        if (hasPanelWidths) {
          let px = sketchX
          for (let si = 0; si < segs.length; si++) {
            const seg = segs[si]
            const sw = segWidths[si] * scale
            const panels = seg.panels || [{ type: 'fix' }]
            const segRW = parseFloat(seg.width) || 0
            const pEff = panels.map((p, i) => {
              if (i === panels.length - 1 && panels.length > 1 && segRW > 0) {
                const others = panels.reduce((s, pp, j) => j !== i ? s + (parseFloat(pp.width) || 0) : s, 0)
                return Math.max(1, segRW - others)
              }
              return parseFloat(p.width) || 0
            })
            const hasCW = pEff.some(w => w > 0)
            const totPW = hasCW ? pEff.reduce((s, w) => s + (w || 1), 0) : panels.length
            const pWs = pEff.map(w => hasCW ? (w || 1) / totPW * sw : sw / panels.length)
            if (panels.length > 1 && hasCW) {
              let ppx = px
              for (let pi = 0; pi < panels.length; pi++) {
                const pw = pWs[pi]
                const wLabel = Math.round(pEff[pi])
                if (wLabel > 0) {
                  this.doc.moveTo(ppx, sketchY + sketchH + 1).lineTo(ppx, panelDimY + 2).stroke()
                  this.doc.moveTo(ppx + pw, sketchY + sketchH + 1).lineTo(ppx + pw, panelDimY + 2).stroke()
                  this.doc.moveTo(ppx, panelDimY).lineTo(ppx + pw, panelDimY).stroke()
                  this.doc.text(`${wLabel}`, ppx + 2, panelDimY + 3, { width: pw - 4, align: 'center' })
                }
                ppx += pw
              }
            }
            px += sw
          }
        }

        // Bottom: segment widths
        let cx2 = sketchX
        for (let si = 0; si < segs.length; si++) {
          const sw = segWidths[si] * scale
          this.doc.moveTo(cx2, sketchY + sketchH + 1).lineTo(cx2, segDimY + 2).stroke()
          this.doc.moveTo(cx2 + sw, sketchY + sketchH + 1).lineTo(cx2 + sw, segDimY + 2).stroke()
          this.doc.moveTo(cx2, segDimY).lineTo(cx2 + sw, segDimY).stroke()
          this.doc.text(`${segWidths[si]}`, cx2 + 2, segDimY + 3, { width: sw - 4, align: 'center' })
          cx2 += sw
        }

        // Bottom: total width
        if (segs.length > 1) {
          this.doc.moveTo(sketchX, segDimY + 4).lineTo(sketchX, totalDimY2 + 2).stroke()
          this.doc.moveTo(sketchX + sketchW, segDimY + 4).lineTo(sketchX + sketchW, totalDimY2 + 2).stroke()
          this.doc.moveTo(sketchX, totalDimY2).lineTo(sketchX + sketchW, totalDimY2).stroke()
          this.doc.text(`${totalRealW}`, sketchX + 2, totalDimY2 + 3, { width: sketchW - 4, align: 'center' })
        }

        // Right: per-segment heights sorted by height desc (tallest = rightmost = furthest from object)
        const sortedIdxs = segs.map((_, i) => i).sort((a, b) => segHeights[b] - segHeights[a])
        let colIdx = dimColsR - 1
        for (const si of sortedIdxs) {
          const segRealH = segHeights[si]
          const sh = segRealH * scale
          let sy = sketchY
          if (align === 'bottom') sy = sketchY + sketchH - sh
          else if (align === 'center') sy = sketchY + (sketchH - sh) / 2

          const seg = segs[si]
          const olHmm2 = parseFloat(seg.oberlichtHeight) || 0
          const ulHmm2 = parseFloat(seg.unterlichtHeight) || 0
          const hasBreakdown = (seg.oberlicht && olHmm2 > 0) || (seg.unterlicht && ulHmm2 > 0)
          const olDispMm = seg.oberlicht && olHmm2 > 0 ? olHmm2 : 0
          const ulDispMm = seg.unterlicht && ulHmm2 > 0 ? ulHmm2 : 0
          const fluegelHmm = hasBreakdown ? segRealH - olDispMm - ulDispMm : 0

          // Total height column — full extension lines
          const dimX = sketchX + sketchW + 2 + colIdx * colSp
          this.doc.moveTo(sketchX + sketchW + 1, sy).lineTo(dimX + 2, sy).stroke()
          this.doc.moveTo(sketchX + sketchW + 1, sy + sh).lineTo(dimX + 2, sy + sh).stroke()
          this.doc.moveTo(dimX, sy).lineTo(dimX, sy + sh).stroke()
          this.doc.save()
          this.doc.translate(dimX + 1, sy + sh)
          this.doc.rotate(-90)
          this.doc.text(`${segRealH}`, 0, 0, { width: sh, align: 'center' })
          this.doc.restore()
          colIdx--

          // Breakdown column — short ticks only (left of total)
          if (hasBreakdown) {
            const olH2 = olDispMm > 0 ? sh * olDispMm / segRealH : 0
            const ulH2 = ulDispMm > 0 ? sh * ulDispMm / segRealH : 0
            const bdX = sketchX + sketchW + 2 + colIdx * colSp
            this.setFont('regular', 5)
            if (olDispMm > 0) {
              this.doc.moveTo(bdX - 1.5, sy).lineTo(bdX + 1.5, sy).stroke()
              this.doc.moveTo(bdX - 1.5, sy + olH2).lineTo(bdX + 1.5, sy + olH2).stroke()
              this.doc.moveTo(bdX, sy).lineTo(bdX, sy + olH2).stroke()
              this.doc.save()
              this.doc.translate(bdX + 1, sy + olH2)
              this.doc.rotate(-90)
              this.doc.text(`${olDispMm}`, 0, 0, { width: olH2, align: 'center' })
              this.doc.restore()
            }
            this.doc.moveTo(bdX - 1.5, sy + olH2).lineTo(bdX + 1.5, sy + olH2).stroke()
            this.doc.moveTo(bdX - 1.5, sy + sh - ulH2).lineTo(bdX + 1.5, sy + sh - ulH2).stroke()
            this.doc.moveTo(bdX, sy + olH2).lineTo(bdX, sy + sh - ulH2).stroke()
            this.doc.save()
            this.doc.translate(bdX + 1, sy + sh - ulH2)
            this.doc.rotate(-90)
            this.doc.text(`${fluegelHmm}`, 0, 0, { width: sh - olH2 - ulH2, align: 'center' })
            this.doc.restore()
            if (ulDispMm > 0) {
              this.doc.moveTo(bdX - 1.5, sy + sh - ulH2).lineTo(bdX + 1.5, sy + sh - ulH2).stroke()
              this.doc.moveTo(bdX - 1.5, sy + sh).lineTo(bdX + 1.5, sy + sh).stroke()
              this.doc.moveTo(bdX, sy + sh - ulH2).lineTo(bdX, sy + sh).stroke()
              this.doc.save()
              this.doc.translate(bdX + 1, sy + sh)
              this.doc.rotate(-90)
              this.doc.text(`${ulDispMm}`, 0, 0, { width: ulH2, align: 'center' })
              this.doc.restore()
            }
            this.setFont('regular', 6)
            colIdx--
          }
        }
        this.doc.restore()

        // "Ansicht von innen"
        const bottomOffset = segs.length > 1 ? (hasPanelWidths ? 40 : 28) : (hasPanelWidths ? 26 : 14)
        this.setFont('regular', 6)
        this.doc.fillColor('#999999')
        this.doc.text('Ansicht von innen', sketchX, sketchY + sketchH + bottomOffset, { width: sketchW, align: 'center' })

        // Details — fixed position
        this.setFont('regular', this.FONT_SIZES.small)
        this.doc.fillColor('#333333')
        let dy = sketchY
        const segDescs = segs.map((seg, i) => {
          const letter = String.fromCharCode(65 + i)
          const types = (seg.panels || []).map(p => p.type === 'kipp-dreh' ? 'DK' : p.type === 'dreh' ? 'D' : p.type === 'kipp' ? 'K' : 'F').join('+')
          return `${letter}: ${seg.width || '?'}×${seg.height || '?'} (${types}${seg.oberlicht ? '+OL' : ''}${seg.unterlicht ? '+UL' : ''})`
        })
        const details = [
          ['Maße:', `${totalRealW} × ${maxRealH} mm`],
          ['Segmente:', segDescs.join(', ')],
          pos.material ? ['Material:', pos.material] : null,
          pos.profil ? ['Profil:', pos.profil] : null,
          pos.glazing ? ['Verglasung:', pos.glazing] : null,
          pos.color ? ['Farbe:', pos.color] : null,
          pos.count && parseInt(pos.count) > 1 ? ['Anzahl:', `${pos.count} Stück`] : null,
          pos.notes ? ['Bemerkung:', pos.notes] : null,
        ].filter(Boolean)
        for (const [label, value] of details) {
          this.setFont('bold', this.FONT_SIZES.small)
          this.doc.text(label, DET_X, dy, { continued: false })
          this.setFont('regular', this.FONT_SIZES.small)
          const valH = this.doc.heightOfString(value, { width: DET_VAL_W })
          this.doc.text(value, DET_VAL_X, dy, { width: DET_VAL_W })
          dy += Math.max(13, valH + 2)
        }

        y = Math.max(sketchY + sketchH + 34, dy + 5)
        this.currentY = y
      } else {
      // ── STANDARD (single-type) ──

      // Left: window sketch — proportional, scaled within fixed container
      const totalPosW = parseFloat(pos.width) || 0
      const totalPosH = parseFloat(pos.height) || 0
      const olHmm = parseFloat(pos.oberlichtHeight) || 0
      const ulHmm = parseFloat(pos.unterlichtHeight) || 0
      const hasHeightBreakdown = (pos.oberlicht && olHmm > 0) || (pos.unterlicht && ulHmm > 0)
      const heightDimCols = 1 + (hasHeightBreakdown ? 1 : 0)
      const colSpH = 10
      const koteSpaceStd = 2 + heightDimCols * colSpH + 8
      const maxSkW = Math.min(130, SKETCH_CONTAINER_W - koteSpaceStd), maxSkH = 110
      let sketchW, sketchH
      if (totalPosW > 0 && totalPosH > 0) {
        const scale = Math.min(maxSkW / totalPosW, maxSkH / totalPosH)
        sketchW = totalPosW * scale; sketchH = totalPosH * scale
      } else {
        sketchW = maxSkW; sketchH = maxSkH
      }
      const sketchX = 72
      const sketchY = y
      const inset = 4 // frame inset for Flügelrahmen
      const handleW = 2, handleH = 8

      // Outer frame (Blendrahmen)
      this.doc.save()
      this.doc.rect(sketchX, sketchY, sketchW, sketchH).lineWidth(1.2).strokeColor('#444444').stroke()
      this.doc.restore()

      const olH = pos.oberlicht ? (olHmm > 0 && totalPosH > 0 ? sketchH * olHmm / totalPosH : sketchH * 0.25) : 0
      const ulH = pos.unterlicht ? (ulHmm > 0 && totalPosH > 0 ? sketchH * ulHmm / totalPosH : sketchH * 0.25) : 0
      const panelH = sketchH - olH - ulH
      const panelY = sketchY + olH

      // Oberlicht
      if (pos.oberlicht) {
        this.doc.save()
        this.doc.moveTo(sketchX, sketchY + olH).lineTo(sketchX + sketchW, sketchY + olH).lineWidth(0.5).strokeColor('#444444').stroke()
        // Inner frame for oberlicht
        this.doc.rect(sketchX + inset, sketchY + inset, sketchW - 2 * inset, olH - 2 * inset).lineWidth(0.4).strokeColor('#444444').stroke()
        this.doc.moveTo(sketchX + inset, sketchY + inset).lineTo(sketchX + sketchW - inset, sketchY + olH - inset).lineWidth(0.4).strokeColor('#999999').dash(3, { space: 3 }).stroke()
        this.doc.moveTo(sketchX + sketchW - inset, sketchY + inset).lineTo(sketchX + inset, sketchY + olH - inset).stroke()
        this.doc.restore()
        this.doc.undash()
      }

      // Proportional panel widths
      const effWidths = panels.map((p, i) => {
        if (i === panels.length - 1 && panels.length > 1 && totalPosW > 0) {
          const others = panels.reduce((s, pp, j) => j !== i ? s + (parseFloat(pp.width) || 0) : s, 0)
          return Math.max(1, totalPosW - others)
        }
        return parseFloat(p.width) || 0
      })
      const hasCustomWidths = effWidths.some(w => w > 0)
      const totalPW = hasCustomWidths ? effWidths.reduce((s, w) => s + (w || 1), 0) : panels.length
      const panelWidths = effWidths.map(w => hasCustomWidths ? (w || 1) / totalPW * sketchW : sketchW / panels.length)

      // Draw panels
      let pxOff = sketchX
      for (let i = 0; i < panels.length; i++) {
        const pw = panelWidths[i]
        const px = pxOff
        const p = panels[i]

        this.doc.save()
        // Panel divider
        if (i > 0) {
          this.doc.moveTo(px, panelY).lineTo(px, panelY + panelH).lineWidth(0.5).strokeColor('#444444').stroke()
        }

        // Inner frame (Flügelrahmen)
        const ix = px + inset, iy = panelY + inset, iw = pw - 2 * inset, ih = panelH - 2 * inset
        this.doc.rect(ix, iy, iw, ih).lineWidth(0.4).strokeColor('#444444').stroke()

        const cx = ix + iw / 2, cy = iy + ih / 2

        // Fix — dashed X
        if (p.type === 'fix') {
          this.doc.moveTo(ix, iy).lineTo(ix + iw, iy + ih).lineWidth(0.4).strokeColor('#999999').dash(3, { space: 3 }).stroke()
          this.doc.moveTo(ix + iw, iy).lineTo(ix, iy + ih).stroke()
          this.doc.undash()
        }
        // Kipp — dashed triangle from bottom
        if (p.type === 'kipp' || p.type === 'kipp-dreh') {
          this.doc.moveTo(ix, iy + ih).lineTo(cx, iy).lineWidth(0.4).strokeColor('#999999').dash(3, { space: 3 }).stroke()
          this.doc.moveTo(ix + iw, iy + ih).lineTo(cx, iy).stroke()
          this.doc.undash()
        }
        // Klapp
        if (p.type === 'klapp') {
          this.doc.moveTo(ix, iy).lineTo(cx, iy + ih).lineWidth(0.4).strokeColor('#999999').dash(3, { space: 3 }).stroke()
          this.doc.moveTo(ix + iw, iy).lineTo(cx, iy + ih).stroke()
          this.doc.undash()
        }
        // Dreh — solid triangle from hinge
        if (p.type === 'dreh' || p.type === 'kipp-dreh') {
          this.doc.lineWidth(0.5).strokeColor('#444444')
          if (p.hinge === 'left' || !p.hinge) {
            this.doc.moveTo(ix, iy).lineTo(ix + iw, cy).stroke()
            this.doc.moveTo(ix, iy + ih).lineTo(ix + iw, cy).stroke()
          } else {
            this.doc.moveTo(ix + iw, iy).lineTo(ix, cy).stroke()
            this.doc.moveTo(ix + iw, iy + ih).lineTo(ix, cy).stroke()
          }
        }
        // Handle (Griff)
        const showHandle = p.type === 'dreh' || p.type === 'kipp-dreh' || p.type === 'kipp'
        if (showHandle) {
          const isLeft = p.hinge === 'left' || !p.hinge
          const hx = isLeft ? (ix + iw + px + pw) / 2 - handleW / 2 : (px + ix) / 2 - handleW / 2
          const hy = iy + ih / 2 - handleH / 2
          this.doc.rect(hx, hy, handleW, handleH).fill('#444444')
        }
        this.doc.restore()
        pxOff += pw
      }

      // Unterlicht
      if (pos.unterlicht) {
        const ulY = sketchY + sketchH - ulH
        this.doc.save()
        this.doc.moveTo(sketchX, ulY).lineTo(sketchX + sketchW, ulY).lineWidth(0.5).strokeColor('#444444').stroke()
        this.doc.rect(sketchX + inset, ulY + inset, sketchW - 2 * inset, ulH - 2 * inset).lineWidth(0.4).strokeColor('#444444').stroke()
        this.doc.moveTo(sketchX + inset, ulY + inset).lineTo(sketchX + sketchW - inset, ulY + ulH - inset).lineWidth(0.4).strokeColor('#999999').dash(3, { space: 3 }).stroke()
        this.doc.moveTo(sketchX + sketchW - inset, ulY + inset).lineTo(sketchX + inset, ulY + ulH - inset).stroke()
        this.doc.restore()
        this.doc.undash()
      }

      // Dimension lines
      this.doc.save()
      this.doc.lineWidth(0.3).strokeColor('#aaaaaa')
      this.setFont('regular', 6)
      this.doc.fillColor('#999999')

      if (totalPosW > 0) {
        // Bottom: individual panel widths
        if (hasCustomWidths && panels.length > 1) {
          let cx = sketchX
          const dimY = sketchY + sketchH + 4
          for (let i = 0; i < panels.length; i++) {
            const pw = panelWidths[i]
            const ew = effWidths[i]
            this.doc.moveTo(cx, sketchY + sketchH + 1).lineTo(cx, dimY + 2).stroke()
            this.doc.moveTo(cx + pw, sketchY + sketchH + 1).lineTo(cx + pw, dimY + 2).stroke()
            this.doc.moveTo(cx, dimY).lineTo(cx + pw, dimY).stroke()
            if (ew > 0) this.doc.text(`${Math.round(ew)}`, cx + 2, dimY + 3, { width: pw - 4, align: 'center' })
            cx += pw
          }
        }

        // Bottom: total width
        const totalDimY = hasCustomWidths && panels.length > 1 ? sketchY + sketchH + 14 : sketchY + sketchH + 4
        this.doc.moveTo(sketchX, sketchY + sketchH + 1).lineTo(sketchX, totalDimY + 2).stroke()
        this.doc.moveTo(sketchX + sketchW, sketchY + sketchH + 1).lineTo(sketchX + sketchW, totalDimY + 2).stroke()
        this.doc.moveTo(sketchX, totalDimY).lineTo(sketchX + sketchW, totalDimY).stroke()
        this.doc.text(`${totalPosW}`, sketchX + 2, totalDimY + 3, { width: sketchW - 4, align: 'center' })
      }

      // Right side: height dimensions (total + breakdown if OL/UL heights entered)
      const olDispMm = pos.oberlicht && olHmm > 0 ? olHmm : 0
      const ulDispMm = pos.unterlicht && ulHmm > 0 ? ulHmm : 0
      const hasBreakdownDim = olDispMm > 0 || ulDispMm > 0
      const fluegelHmm = hasBreakdownDim ? totalPosH - olDispMm - ulDispMm : 0

      if (totalPosH > 0) {
        // Total height — rightmost column (furthest from object)
        const totalColIdx = heightDimCols - 1
        const dimX = sketchX + sketchW + 2 + totalColIdx * colSpH
        this.doc.moveTo(sketchX + sketchW + 1, sketchY).lineTo(dimX + 2, sketchY).stroke()
        this.doc.moveTo(sketchX + sketchW + 1, sketchY + sketchH).lineTo(dimX + 2, sketchY + sketchH).stroke()
        this.doc.moveTo(dimX, sketchY).lineTo(dimX, sketchY + sketchH).stroke()
        this.doc.save()
        this.doc.translate(dimX + 1, sketchY + sketchH)
        this.doc.rotate(-90)
        this.doc.text(`${totalPosH}`, 0, 0, { width: sketchH, align: 'center' })
        this.doc.restore()

        // Breakdown: OL, Flügel, UL — closest column (short ticks)
        if (hasHeightBreakdown) {
          const bdX = sketchX + sketchW + 2
          this.setFont('regular', 5)
          if (olDispMm > 0) {
            this.doc.moveTo(bdX - 1.5, sketchY).lineTo(bdX + 1.5, sketchY).stroke()
            this.doc.moveTo(bdX - 1.5, sketchY + olH).lineTo(bdX + 1.5, sketchY + olH).stroke()
            this.doc.moveTo(bdX, sketchY).lineTo(bdX, sketchY + olH).stroke()
            this.doc.save()
            this.doc.translate(bdX + 1, sketchY + olH)
            this.doc.rotate(-90)
            this.doc.text(`${olDispMm}`, 0, 0, { width: olH, align: 'center' })
            this.doc.restore()
          }
          this.doc.moveTo(bdX - 1.5, sketchY + olH).lineTo(bdX + 1.5, sketchY + olH).stroke()
          this.doc.moveTo(bdX - 1.5, sketchY + sketchH - ulH).lineTo(bdX + 1.5, sketchY + sketchH - ulH).stroke()
          this.doc.moveTo(bdX, sketchY + olH).lineTo(bdX, sketchY + sketchH - ulH).stroke()
          this.doc.save()
          this.doc.translate(bdX + 1, sketchY + sketchH - ulH)
          this.doc.rotate(-90)
          this.doc.text(`${fluegelHmm}`, 0, 0, { width: sketchH - olH - ulH, align: 'center' })
          this.doc.restore()
          if (ulDispMm > 0) {
            this.doc.moveTo(bdX - 1.5, sketchY + sketchH - ulH).lineTo(bdX + 1.5, sketchY + sketchH - ulH).stroke()
            this.doc.moveTo(bdX - 1.5, sketchY + sketchH).lineTo(bdX + 1.5, sketchY + sketchH).stroke()
            this.doc.moveTo(bdX, sketchY + sketchH - ulH).lineTo(bdX, sketchY + sketchH).stroke()
            this.doc.save()
            this.doc.translate(bdX + 1, sketchY + sketchH)
            this.doc.rotate(-90)
            this.doc.text(`${ulDispMm}`, 0, 0, { width: ulH, align: 'center' })
            this.doc.restore()
          }
          this.setFont('regular', 6)
        }
      }
      this.doc.restore()

      // "Ansicht von innen" label below sketch
      this.setFont('regular', 6)
      this.doc.fillColor('#999999')
      this.doc.text('Ansicht von innen', sketchX, sketchY + sketchH + (hasCustomWidths && panels.length > 1 ? 24 : 14), { width: sketchW, align: 'center' })

      // Right side: details — fixed position (DET_X / DET_VAL_X / DET_VAL_W)
      this.setFont('regular', this.FONT_SIZES.small)
      this.doc.fillColor('#333333')
      let dy = sketchY

      const details = [
        pos.width && pos.height ? ['Maße:', `${pos.width} × ${pos.height} mm`] : null,
        pos.material ? ['Material:', pos.material] : null,
        pos.profil ? ['Profil:', pos.profil] : null,
        pos.glazing ? ['Verglasung:', pos.glazing] : null,
        pos.color ? ['Farbe:', pos.color] : null,
        panels.length > 0 ? ['Öffnungsart:', panels.map(p => {
          const t = p.type === 'kipp-dreh' ? 'Dreh-Kipp' : p.type === 'dreh' ? 'Dreh' : p.type === 'kipp' ? 'Kipp' : 'Fest'
          return t
        }).join(' + ') + (pos.oberlicht ? ' + Oberlicht' : '') + (pos.unterlicht ? ' + Unterlicht' : '')] : null,
        pos.count && parseInt(pos.count) > 1 ? ['Anzahl:', `${pos.count} Stück`] : null,
        pos.notes ? ['Bemerkung:', pos.notes] : null,
      ].filter(Boolean)

      for (const [label, value] of details) {
        this.setFont('bold', this.FONT_SIZES.small)
        this.doc.text(label, DET_X, dy, { continued: false })
        this.setFont('regular', this.FONT_SIZES.small)
        const valH = this.doc.heightOfString(value, { width: DET_VAL_W })
        this.doc.text(value, DET_VAL_X, dy, { width: DET_VAL_W })
        dy += Math.max(13, valH + 2)
      }

      y = Math.max(sketchY + sketchH + (hasCustomWidths ? 32 : 20), dy + 5)
      this.currentY = y
      } // end if/else mehrteilig
    }

    this.currentY += 5
  }

  // Totals sekcija
  async addTotalsSection(invoiceData, majstorData) {
    await this.checkSpaceAndAddPageIfNeeded(110)
    
    let y = this.currentY + 20
    const labelX = 380
    const valueX = 470
    
    // Use normalized values — same source as ZUGFeRD XML (no re-computation)
    const subtotal    = invoiceData.subtotal    ?? 0
    const taxAmount   = invoiceData.taxAmount   ?? invoiceData.tax_amount ?? 0
    const totalAmount = invoiceData.totalAmount ?? invoiceData.total_amount ?? 0
    const taxRate     = invoiceData.taxRate     ?? invoiceData.tax_rate    ?? 0

    // Rabatt, Skonto, Sicherheitseinbehalt
    const rabattPct = parseFloat(invoiceData.rabatt_percent) || 0
    const rabattAmount = parseFloat(invoiceData.rabatt_amount) || 0
    const rabattReason = invoiceData.rabatt_reason || ''
    const skontoPct = parseFloat(invoiceData.skonto_percent) || 0
    const skontoDays = parseInt(invoiceData.skonto_days) || 0
    const einbehaltPct = parseFloat(invoiceData.sicherheitseinbehalt_percent) || 0
    const einbehaltAmount = parseFloat(invoiceData.einbehalt_amount) || 0
    const einbehaltYears = parseInt(invoiceData.sicherheitseinbehalt_years) || 2
    const zahlbarSofort = parseFloat(invoiceData.zahlbar_sofort) || 0

    const hasTaxDifference = taxAmount > 0.01
    const calculatedTax    = taxAmount
    const effectiveVatRate = taxRate

    const fmt = (v) => '€ ' + new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)

    console.log('Totals:', { subtotal, taxAmount, totalAmount, taxRate: effectiveVatRate + '%', rabattPct, einbehaltPct, skontoPct })

    this.setFont('regular', this.FONT_SIZES.normal)
    this.doc.text('Nettobetrag:', labelX, y)
    this.doc.text(fmt(subtotal), valueX, y, { align: 'right', width: 75 })
    y += 15

    // Rabatt
    if (rabattPct > 0) {
      this.doc.fillColor('#DC2626')
      const rabattLabel = rabattReason
        ? `Rabatt ${rabattPct}% (${rabattReason}):`
        : `Rabatt ${rabattPct}%:`
      this.doc.text(rabattLabel, labelX, y, { width: 120 })
      this.doc.text('-' + fmt(rabattAmount).replace('€ ', '€ '), valueX, y, { align: 'right', width: 75 })
      this.doc.fillColor('#000000')
      y += 15

      this.doc.text('Netto nach Rabatt:', labelX, y)
      this.doc.text(fmt(subtotal - rabattAmount), valueX, y, { align: 'right', width: 75 })
      y += 15
    }

    if (hasTaxDifference) {
      const displayVatRate = effectiveVatRate > 0 ? effectiveVatRate : taxRate
      const taxLabel = displayVatRate > 0
        ? `zzgl. MwSt (${displayVatRate.toFixed(0)}%):`
        : 'zzgl. MwSt:'

      this.doc.text(taxLabel, labelX, y)
      this.doc.text(fmt(calculatedTax), valueX, y, { align: 'right', width: 75 })
      y += 20
    } else {
      this.setFont('italic', this.FONT_SIZES.tiny)
      const kleinText = '(Kleinunternehmerregelung - Steuer nicht ausgewiesen)'
      const kleinHeight = this.doc.heightOfString(kleinText, { width: 165, lineGap: 1.5 })
      this.doc.fillColor(this.COLORS.secondary)
      this.doc.text(kleinText, labelX, y, { width: 165, align: 'left', lineGap: 1.5 })
      this.doc.fillColor('#000000')
      this.setFont('regular', this.FONT_SIZES.normal)
      y += kleinHeight + 6
    }

    // Gesamtbetrag box
    this.doc.save()
    this.doc.rect(labelX - 4, y - 2, 200, 24)
       .fillOpacity(0.03).fill('#000000').fillOpacity(1)
    this.doc.rect(labelX - 5, y - 3, 200, 24)
       .lineWidth(2).strokeColor(this.COLORS.success).stroke()
    this.doc.rect(labelX - 5, y - 3, 200, 3)
       .fillAndStroke(this.COLORS.success, this.COLORS.success)
    this.doc.restore()

    this.setFont('bold', this.FONT_SIZES.subtitle)
    this.doc.text('Gesamtbetrag:', labelX, y + 3)
    this.doc.text(fmt(totalAmount), valueX, y + 3, { align: 'right', width: 75 })
    y += 30

    // Sicherheitseinbehalt
    if (einbehaltPct > 0) {
      this.setFont('regular', this.FONT_SIZES.normal)
      this.doc.fillColor('#D97706')
      this.doc.text(`Einbehalt ${einbehaltPct}%:`, labelX, y)
      this.doc.text('-' + fmt(einbehaltAmount).replace('€ ', '€ '), valueX, y, { align: 'right', width: 75 })
      this.doc.fillColor('#000000')
      y += 18

      this.setFont('bold', this.FONT_SIZES.normal)
      this.doc.fillColor('#0D9488')
      this.doc.text('Zahlbar sofort:', labelX, y)
      this.doc.text(fmt(zahlbarSofort), valueX, y, { align: 'right', width: 75 })
      this.doc.fillColor('#000000')
      y += 15

      // Einbehalt fällig am
      const dueDate = new Date(invoiceData.issue_date || invoiceData.issueDate || new Date())
      dueDate.setFullYear(dueDate.getFullYear() + einbehaltYears)
      this.setFont('italic', this.FONT_SIZES.tiny)
      this.doc.fillColor(this.COLORS.secondary)
      this.doc.text(`Einbehalt fällig am: ${dueDate.toLocaleDateString('de-DE')}`, labelX, y)
      this.doc.fillColor('#000000')
      y += 15
    }

    // Skonto
    if (skontoPct > 0) {
      this.setFont('italic', this.FONT_SIZES.tiny)
      this.doc.fillColor('#2563EB')
      const skontoBase = einbehaltPct > 0 ? zahlbarSofort : totalAmount
      const skontoAmount = parseFloat((skontoBase * skontoPct / 100).toFixed(2))
      this.doc.text(`${skontoPct}% Skonto bei Zahlung innerhalb ${skontoDays} Tagen (${fmt(skontoAmount)})`, labelX, y)
      this.doc.fillColor('#000000')
      y += 15
    }

    this.currentY = y + 5
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

    await this.renderLongText(invoiceData.notes, 50, y, {
      width: 495, lineGap: 1.5, font: 'italic', fontSize: this.FONT_SIZES.normal
    })
    console.log('Notes section added')
  }

  // Invoice footer
  async addInvoiceFooterSection(majstorData) {
    const footerText = majstorData.invoice_footer ||
      'Vielen Dank f\u00FCr Ihr Vertrauen. Bei Fragen stehen wir Ihnen gerne zur Verf\u00FCgung.'

    await this.checkSpaceAndAddPageIfNeeded(60)

    let y = this.currentY + 5

    this.doc.save()
    this.doc.moveTo(50, y).lineTo(545, y)
      .lineWidth(0.5)
      .stroke(this.COLORS.lightBorder)
    this.doc.restore()

    y += 10

    await this.renderLongText(footerText, 50, y, {
      width: 495, lineGap: 2, font: 'italic', fontSize: this.FONT_SIZES.header
    })
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
      this.doc.text('[X] ZUGFeRD 2.4 KONFORM - Enthält maschinenlesbare XML-Rechnungsdaten', 50, zugferdY, { 
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
      majstorData.business_email || majstorData.email,
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
      this.doc.text('(Fortsetzung auf nächster Seite)', 50, this.pageBottomLimit - 18, {
        width: 495,
        align: 'center'
      })
      this.doc.fillColor('#000000')
      
      this._manualPageAdd = true
      this.doc.addPage()
      this._manualPageAdd = false
      this.currentPage++
      this.isFirstPage = false
      
      await this.addDIN5008Header(this.majstorData, false)
      
      return true
    }
    return false
  }

  // Binary search: how many chars of text fit in maxHeight at given width
  findTextFit(text, width, maxHeight, options = {}) {
    if (this.doc.heightOfString(text, { width, ...options }) <= maxHeight) {
      return text.length
    }
    let lo = 0, hi = text.length
    while (lo < hi) {
      const mid = Math.floor((lo + hi + 1) / 2)
      if (this.doc.heightOfString(text.slice(0, mid), { width, ...options }) <= maxHeight) lo = mid
      else hi = mid - 1
    }
    // Snap back to last word boundary
    const snippet = text.slice(0, lo)
    const lastSpace = snippet.lastIndexOf(' ')
    return lastSpace > 0 ? lastSpace : lo
  }

  // Render long text across multiple pages with proper footer/header on each page
  async renderLongText(text, x, y, options = {}) {
    const width = options.width || 495
    const lineGap = options.lineGap || 1.5
    const align = options.align || 'left'
    const fontName = options.font || 'italic'
    const fontSize = options.fontSize || this.FONT_SIZES.normal

    let remaining = text

    while (remaining.length > 0) {
      // Reserve 20px for "Fortsetzung" label if we'll need to break
      const available = this.pageBottomLimit - y - 20
      this.setFont(fontName, fontSize)

      const fitIdx = this.findTextFit(remaining, width, available, { lineGap })

      if (fitIdx <= 0) {
        // Nothing fits even on a fresh page — shouldn't happen, but guard anyway
        break
      }

      const chunk = remaining.slice(0, fitIdx)
      remaining = remaining.slice(fitIdx).trimStart()

      this.doc.fillColor(options.color || this.COLORS.secondary)
      this.doc.text(chunk, x, y, { width, align, lineGap, height: available })
      this.doc.fillColor('#000000')

      if (remaining.length > 0) {
        // Add page break
        this.addPageFooter(this.majstorData, false, false)
        this.setFont('italic', this.FONT_SIZES.tiny)
        this.doc.fillColor(this.COLORS.secondary)
        this.doc.text('(Fortsetzung auf nächster Seite)', 50, this.pageBottomLimit - 18, {
          width: 495, align: 'center'
        })
        this.doc.fillColor('#000000')
        this._manualPageAdd = true
        this.doc.addPage()
        this._manualPageAdd = false
        this.currentPage++
        this.isFirstPage = false
        await this.addDIN5008Header(this.majstorData, false)
        y = this.currentY + 5
      } else {
        this.currentY = Math.min(this.doc.y + 12, this.pageBottomLimit)
      }
    }
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
  async generateInvoice(invoiceData, majstorData, aufmassDataList = []) {
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
        top: 28,
        bottom: 56.69,
        left: 70.87,
        right: 56.69
      },
      bufferPages: true,
      autoFirstPage: true,
      info: {
        Title: invoiceData.type === 'quote' ? 'Angebot' : invoiceData.type === 'storno' ? 'Stornorechnung' : 'Rechnung',
        Author: majstorData.business_name || majstorData.full_name,
        Creator: 'Pro-Meister.de - DIN 5008 Form B + DIN lang',
        Producer: 'Pro-Meister.de ZUGFeRD Generator v2.0',
        Keywords: invoiceData.type === 'quote' ? 'Angebot, Quote, DIN 5008, DIN lang' :
          invoiceData.type === 'storno' ? 'ZUGFeRD, Stornorechnung, XML, DIN 5008, DIN lang' :
          'ZUGFeRD, Rechnung, XML, DIN 5008, DIN lang',
        Subject: `${invoiceData.type === 'quote' ? 'Angebot' : invoiceData.type === 'storno' ? 'Stornorechnung' : 'Rechnung'} ${invoiceData.invoice_number || invoiceData.quote_number}`
      }
    })

    this.setupFonts()
    this.currentY = 50
    this.isFirstPage = true
    this.currentPage = 1
    this.majstorData = majstorData
    this.invoiceData = invoiceData
    this._manualPageAdd = false
    // Support both array (new) and single object (backward compat)
    this.aufmassDataList = Array.isArray(aufmassDataList) ? aufmassDataList : (aufmassDataList ? [aufmassDataList] : [])

    try {
      // Single source of truth — both PDF and XML read from this object
      const normalized = normalizeInvoice(invoiceData, majstorData)

      this.addFalzmarken()

      await this.addDIN5008Header(majstorData, true)

      this.addDIN5008AddressField(normalized, majstorData)

      this.addInvoiceInfoBlock(normalized)

      let zugferdXML = null
      let zugferdFilespec = null
      if (normalized.type === 'invoice' || normalized.type === 'storno') {
        try {
          const canGen = ZUGFeRDService.canGenerateZUGFeRD(normalized, majstorData)
          if (canGen.canGenerate) {
            // Validate before generating XML
            const { valid, errors, warnings } = validateForZUGFeRD(normalized, majstorData)
            if (warnings.length > 0) console.warn('⚠️ ZUGFeRD warnings:', warnings)
            if (!valid) {
              console.error('⛔ ZUGFeRD validation failed — XML skipped:', errors)
            } else {
              zugferdXML = ZUGFeRDService.generateZUGFeRDXML(normalized, majstorData)
              zugferdFilespec = await this.embedZUGFeRDXML(zugferdXML, normalized)
              console.log('✅ ZUGFeRD 2.4 XML generated')
            }
          } else {
            console.warn('ZUGFeRD skipped:', canGen.missingFields)
          }
        } catch (zugferdError) {
          console.error('ZUGFeRD failed:', zugferdError.message)
        }
      }

      await this.addItemsTable(normalized)
      await this.addAufmassPositions()
      await this.addTotalsSection(normalized, majstorData)
      await this.addNotesSection(normalized)
      await this.addInvoiceFooterSection(majstorData)
      await this.addPaymentInfo(normalized, majstorData)

      // PDF/A-3b injection disabled — pdfkit 0.17.x has internal metadataRef that
      // conflicts with manual ref injection (causes Acrobat to reject the PDF).
      // ZUGFeRD XML is embedded via doc.file() above — sufficient for DATEV/bookkeeping.

      this.addPageFooter(majstorData, true, !!zugferdXML)

      this.doc.end()
      
      console.log('OPTIMIZED PDF generation complete!')
      
      return new Promise((resolve, reject) => {
        const chunks = []
        this.doc.on('data', chunk => chunks.push(chunk))
        this.doc.on('end', async () => {
          try {
            let buffer = Buffer.concat(chunks)
            if (zugferdXML) {
              buffer = await PDFA3PostProcessor.inject(buffer, normalized, majstorData)
            }
            resolve(buffer)
          } catch (err) {
            reject(err)
          }
        })
        this.doc.on('error', reject)
      })
      
    } catch (error) {
      console.error('PDF generation failed:', error)
      throw error
    }
  }

  // Embed ZUGFeRD XML — returns filespec ref for PDF/A-3 AF catalog entry
  async embedZUGFeRDXML(xmlContent, invoiceData) {
    try {
      const xmlBuffer = Buffer.from(xmlContent, 'utf8')
      const xmlFilename = ZUGFeRDService.getXMLFilename()

      const filespecRef = this.doc.file(xmlBuffer, {
        name: xmlFilename,
        type: 'application/xml',
        description: `ZUGFeRD 2.4 XML data for invoice ${invoiceData.invoice_number}`,
        creationDate: new Date(invoiceData.created_at),
        modificationDate: new Date(invoiceData.updated_at || invoiceData.created_at),
        relationship: 'Alternative'
      })

      console.log('ZUGFeRD XML embedded:', xmlFilename)
      return filespecRef ?? null
    } catch (error) {
      console.error('XML embedding failed:', error.message)
      throw error
    }
  }
}

export default InvoicePDFService