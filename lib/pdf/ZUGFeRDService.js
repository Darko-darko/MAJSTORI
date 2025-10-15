// lib/pdf/ZUGFeRDService.js - ZUGFeRD 2.1 EN16931 (COMFORT) - OPTIMIZED
export class ZUGFeRDService {
  
  /**
   * Generates ZUGFeRD 2.1 EN16931 compliant XML for invoice
   * @param {Object} invoiceData - Invoice data from database
   * @param {Object} majstorData - Business owner data
   * @returns {string} ZUGFeRD 2.1 EN16931 XML string
   */
  static generateZUGFeRDXML(invoiceData, majstorData) {
    try {
      console.log('🇪🇺 Generating ZUGFeRD 2.1 EN16931 XML for invoice:', invoiceData.invoice_number)

      if (invoiceData.type === 'quote') {
        throw new Error('ZUGFeRD XML is only generated for invoices, not quotes')
      }

      const xml = this.buildZUGFeRDXML(invoiceData, majstorData)
      
      console.log('✅ ZUGFeRD EN16931 XML generated successfully, length:', xml.length, 'chars')
      return xml

    } catch (error) {
      console.error('❌ ZUGFeRD XML generation failed:', error)
      throw error
    }
  }

  /**
   * Builds complete ZUGFeRD 2.1 EN16931 XML document
   * @param {Object} invoice - Invoice data
   * @param {Object} majstor - Business data
   * @returns {string} XML document
   */
  static buildZUGFeRDXML(invoice, majstor) {
    // Parse items with error handling
    let items = []
    try {
      if (typeof invoice.items === 'string') {
        items = JSON.parse(invoice.items)
      } else if (Array.isArray(invoice.items)) {
        items = invoice.items
      }
    } catch (e) {
      console.error('❌ Items parsing failed:', e)
      items = []
    }

    const documentDate = this.formatXMLDate(invoice.issue_date)
    const dueDate = this.formatXMLDate(invoice.due_date)
    const documentId = this.generateDocumentId(invoice)
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100" 
                          xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100" 
                          xmlns:qdt="urn:un:unece:uncefact:data:standard:QualifiedDataType:100" 
                          xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">
  <rsm:ExchangedDocumentContext>
    ${this.buildDocumentContext()}
  </rsm:ExchangedDocumentContext>
  
  <rsm:ExchangedDocument>
    ${this.buildExchangedDocument(invoice, documentId, documentDate)}
  </rsm:ExchangedDocument>
  
  <rsm:SupplyChainTradeTransaction>
    ${this.buildTradeLineItems(items, invoice, majstor)}
    ${this.buildApplicableHeaderTradeAgreement(invoice, majstor)}
    ${this.buildApplicableHeaderTradeDelivery(invoice, dueDate)}
    ${this.buildApplicableHeaderTradeSettlement(invoice, majstor)}
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>`
  }

  /**
   * 🔥 UPGRADED: EN16931 profile context
   */
  static buildDocumentContext() {
    return `    <ram:GuidelineSpecifiedDocumentContextParameter>
      <ram:ID>urn:cen.eu:en16931:2017#compliant#urn:ferd:zugferd:2p1:en16931</ram:ID>
    </ram:GuidelineSpecifiedDocumentContextParameter>`
  }

  /**
   * Document header information - EN16931 enhanced
   */
  static buildExchangedDocument(invoice, documentId, documentDate) {
    return `    <ram:ID>${this.escapeXML(documentId)}</ram:ID>
    <ram:Name>RECHNUNG</ram:Name>
    <ram:TypeCode>380</ram:TypeCode>
    <ram:IssueDateTime>
      <udt:DateTimeString format="102">${documentDate}</udt:DateTimeString>
    </ram:IssueDateTime>${invoice.notes ? `
    <ram:IncludedNote>
      <ram:Content>${this.escapeXML(invoice.notes)}</ram:Content>
    </ram:IncludedNote>` : ''}`
  }

  /**
   * 🔥 UPGRADED: Trade line items with EN16931 required fields
   */
  static buildTradeLineItems(items, invoice, majstor) {
    if (!items || items.length === 0) {
      console.warn('⚠️ No items to include in ZUGFeRD')
      return ''
    }

    return items.map((item, index) => {
      const lineNumber = index + 1
      
      // 🔧 Safe number parsing with fallbacks
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
      
      // Calculate VAT for this line
      const vatRate = this.parseNumber(majstor.vat_rate, 0)
      const taxCategory = this.getTaxCategoryCode(invoice, majstor)
      
      return `    <ram:IncludedSupplyChainTradeLineItem>
      <ram:AssociatedDocumentLineDocument>
        <ram:LineID>${lineNumber}</ram:LineID>
      </ram:AssociatedDocumentLineDocument>
      <ram:SpecifiedTradeProduct>
        <ram:Name>${this.escapeXML(item.description || item.name || 'Position ' + lineNumber)}</ram:Name>
      </ram:SpecifiedTradeProduct>
      <ram:SpecifiedLineTradeAgreement>
        <ram:NetPriceProductTradePrice>
          <ram:ChargeAmount>${unitPrice.toFixed(2)}</ram:ChargeAmount>
        </ram:NetPriceProductTradePrice>
      </ram:SpecifiedLineTradeAgreement>
      <ram:SpecifiedLineTradeDelivery>
        <ram:BilledQuantity unitCode="C62">${quantity.toFixed(0)}</ram:BilledQuantity>
      </ram:SpecifiedLineTradeDelivery>
      <ram:SpecifiedLineTradeSettlement>
        <ram:ApplicableTradeTax>
          <ram:TypeCode>VAT</ram:TypeCode>
          <ram:CategoryCode>${taxCategory}</ram:CategoryCode>
          <ram:RateApplicablePercent>${vatRate.toFixed(2)}</ram:RateApplicablePercent>
        </ram:ApplicableTradeTax>
        <ram:SpecifiedTradeSettlementLineMonetarySummation>
          <ram:LineTotalAmount>${totalPrice.toFixed(2)}</ram:LineTotalAmount>
        </ram:SpecifiedTradeSettlementLineMonetarySummation>
      </ram:SpecifiedLineTradeSettlement>
    </ram:IncludedSupplyChainTradeLineItem>`
    }).join('\n')
  }

  /**
   * 🔥 UPGRADED: Header trade agreement with EN16931 fields
   */
  static buildApplicableHeaderTradeAgreement(invoice, majstor) {
    return `    <ram:ApplicableHeaderTradeAgreement>
      <ram:BuyerReference>${this.escapeXML(invoice.customer_name)}</ram:BuyerReference>
      <ram:SellerTradeParty>
        <ram:Name>${this.escapeXML(majstor.business_name || majstor.full_name)}</ram:Name>
        <ram:PostalTradeAddress>
          <ram:PostcodeCode>${this.escapeXML(this.extractPostcode(majstor.address))}</ram:PostcodeCode>
          <ram:LineOne>${this.escapeXML(majstor.address || '')}</ram:LineOne>
          <ram:CityName>${this.escapeXML(majstor.city || '')}</ram:CityName>
          <ram:CountryID>DE</ram:CountryID>
        </ram:PostalTradeAddress>${this.buildSellerContact(majstor)}
        ${this.buildTaxRegistrations(majstor)}
      </ram:SellerTradeParty>
      <ram:BuyerTradeParty>
        <ram:Name>${this.escapeXML(invoice.customer_name)}</ram:Name>
        <ram:PostalTradeAddress>
          <ram:LineOne>${this.escapeXML(invoice.customer_address || '')}</ram:LineOne>
          <ram:CountryID>DE</ram:CountryID>
        </ram:PostalTradeAddress>${this.buildBuyerTaxRegistration(invoice)}
      </ram:BuyerTradeParty>
    </ram:ApplicableHeaderTradeAgreement>`
  }

  /**
   * 🔥 NEW: Seller contact info (EN16931 recommended)
   */
  static buildSellerContact(majstor) {
    if (!majstor.phone && !majstor.email) return ''
    
    return `
        <ram:DefinedTradeContact>${majstor.phone ? `
          <ram:TelephoneUniversalCommunication>
            <ram:CompleteNumber>${this.escapeXML(majstor.phone)}</ram:CompleteNumber>
          </ram:TelephoneUniversalCommunication>` : ''}${majstor.email ? `
          <ram:EmailURIUniversalCommunication>
            <ram:URIID>${this.escapeXML(majstor.email)}</ram:URIID>
          </ram:EmailURIUniversalCommunication>` : ''}
        </ram:DefinedTradeContact>`
  }

  /**
   * Seller tax registrations
   */
  static buildTaxRegistrations(majstor) {
    const registrations = []
    
    if (majstor.tax_number) {
      registrations.push(`        <ram:SpecifiedTaxRegistration>
          <ram:ID schemeID="FC">${this.escapeXML(majstor.tax_number)}</ram:ID>
        </ram:SpecifiedTaxRegistration>`)
    }
    
    if (majstor.vat_id) {
      registrations.push(`        <ram:SpecifiedTaxRegistration>
          <ram:ID schemeID="VA">${this.escapeXML(majstor.vat_id)}</ram:ID>
        </ram:SpecifiedTaxRegistration>`)
    }
    
    return registrations.length > 0 ? '\n' + registrations.join('\n') : ''
  }

  /**
   * 🔥 IMPROVED: Buyer tax registration for B2B
   */
  static buildBuyerTaxRegistration(invoice) {
    if (!invoice.customer_tax_number || !invoice.customer_tax_number.trim()) {
      return ''
    }

    const taxNumber = invoice.customer_tax_number.trim()
    const isVATID = /^[A-Z]{2}/.test(taxNumber)
    
    return `
        <ram:SpecifiedTaxRegistration>
          <ram:ID schemeID="${isVATID ? 'VA' : 'FC'}">${this.escapeXML(taxNumber)}</ram:ID>
        </ram:SpecifiedTaxRegistration>`
  }

  /**
   * Delivery information
   */
  static buildApplicableHeaderTradeDelivery(invoice, dueDate) {
    return `    <ram:ApplicableHeaderTradeDelivery>
      <ram:ActualDeliverySupplyChainEvent>
        <ram:OccurrenceDateTime>
          <udt:DateTimeString format="102">${dueDate}</udt:DateTimeString>
        </ram:OccurrenceDateTime>
      </ram:ActualDeliverySupplyChainEvent>
    </ram:ApplicableHeaderTradeDelivery>`
  }

  /**
   * 🔥 UPGRADED: Settlement with improved tax calculation
   */
  static buildApplicableHeaderTradeSettlement(invoice, majstor) {
    // Safe number parsing
    const subtotal = this.parseNumber(invoice.subtotal, 0)
    const taxAmount = this.parseNumber(invoice.tax_amount, 0)
    const totalAmount = this.parseNumber(invoice.total_amount, 0)
    const vatRate = this.parseNumber(majstor.vat_rate, 0)
    
    // 🔥 IMPROVED: Auto-detect tax from difference
    const hasTaxDifference = totalAmount > subtotal && (totalAmount - subtotal) > 0.01
    const effectiveTaxAmount = hasTaxDifference ? (totalAmount - subtotal) : taxAmount
    const effectiveVatRate = hasTaxDifference && subtotal > 0 
      ? ((totalAmount - subtotal) / subtotal * 100)
      : vatRate
    
    const taxCategory = this.getTaxCategoryCode(invoice, majstor)
    
    console.log('💰 ZUGFeRD amounts:', {
      subtotal: subtotal.toFixed(2),
      effectiveTaxAmount: effectiveTaxAmount.toFixed(2),
      totalAmount: totalAmount.toFixed(2),
      effectiveVatRate: effectiveVatRate.toFixed(2) + '%',
      taxCategory
    })

    return `    <ram:ApplicableHeaderTradeSettlement>
      <ram:PaymentReference>${this.escapeXML(invoice.invoice_number)}</ram:PaymentReference>
      <ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>${this.buildPaymentMeans(majstor)}
      <ram:ApplicableTradeTax>
        <ram:CalculatedAmount>${effectiveTaxAmount.toFixed(2)}</ram:CalculatedAmount>
        <ram:TypeCode>VAT</ram:TypeCode>
        <ram:CategoryCode>${taxCategory}</ram:CategoryCode>
        <ram:BasisAmount>${subtotal.toFixed(2)}</ram:BasisAmount>
        <ram:RateApplicablePercent>${effectiveVatRate.toFixed(2)}</ram:RateApplicablePercent>
      </ram:ApplicableTradeTax>${this.buildPaymentTerms(invoice)}
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:LineTotalAmount>${subtotal.toFixed(2)}</ram:LineTotalAmount>
        <ram:TaxBasisTotalAmount>${subtotal.toFixed(2)}</ram:TaxBasisTotalAmount>
        <ram:TaxTotalAmount currencyID="EUR">${effectiveTaxAmount.toFixed(2)}</ram:TaxTotalAmount>
        <ram:GrandTotalAmount>${totalAmount.toFixed(2)}</ram:GrandTotalAmount>
        <ram:DuePayableAmount>${totalAmount.toFixed(2)}</ram:DuePayableAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
    </ram:ApplicableHeaderTradeSettlement>`
  }

  /**
   * 🔥 NEW: Payment means with bank details (EN16931)
   */
  static buildPaymentMeans(majstor) {
    if (!majstor.iban) return ''
    
    return `
      <ram:SpecifiedTradeSettlementPaymentMeans>
        <ram:TypeCode>58</ram:TypeCode>
        <ram:Information>SEPA Überweisung</ram:Information>
        <ram:PayeePartyCreditorFinancialAccount>
          <ram:IBANID>${this.escapeXML(majstor.iban)}</ram:IBANID>
          <ram:AccountName>${this.escapeXML(majstor.bank_name || majstor.business_name || majstor.full_name)}</ram:AccountName>
        </ram:PayeePartyCreditorFinancialAccount>${majstor.bic ? `
        <ram:PayeeSpecifiedCreditorFinancialInstitution>
          <ram:BICID>${this.escapeXML(majstor.bic)}</ram:BICID>
        </ram:PayeeSpecifiedCreditorFinancialInstitution>` : ''}
      </ram:SpecifiedTradeSettlementPaymentMeans>`
  }

  /**
   * 🔥 NEW: Payment terms (EN16931)
   */
  static buildPaymentTerms(invoice) {
    if (!invoice.due_date) return ''
    
    const dueDate = this.formatXMLDate(invoice.due_date)
    const issueDate = new Date(invoice.issue_date)
    const dueDateObj = new Date(invoice.due_date)
    const daysDiff = Math.round((dueDateObj - issueDate) / (1000 * 60 * 60 * 24))
    
    return `
      <ram:SpecifiedTradePaymentTerms>
        <ram:Description>Zahlbar innerhalb ${daysDiff} Tagen</ram:Description>
        <ram:DueDateDateTime>
          <udt:DateTimeString format="102">${dueDate}</udt:DateTimeString>
        </ram:DueDateDateTime>
      </ram:SpecifiedTradePaymentTerms>`
  }

  /**
   * 🔥 IMPROVED: Tax category detection
   */
  static getTaxCategoryCode(invoice, majstor) {
    // Check if there's actually tax
    const subtotal = this.parseNumber(invoice.subtotal, 0)
    const totalAmount = this.parseNumber(invoice.total_amount, 0)
    const hasTax = totalAmount > subtotal
    
    // If no tax difference, it's Kleinunternehmer (Z = Zero rated)
    if (!hasTax) return 'Z'
    
    // Check explicit flag
    const isKleinunternehmer = Boolean(invoice.is_kleinunternehmer)
    if (isKleinunternehmer) return 'Z'
    
    // Otherwise standard rate (S)
    return 'S'
  }

  /**
   * Extract postcode from address string
   */
  static extractPostcode(address) {
    if (!address) return ''
    const match = address.match(/\b\d{5}\b/)
    return match ? match[0] : ''
  }

  /**
   * Generate unique document ID
   */
  static generateDocumentId(invoice) {
    const timestamp = new Date(invoice.created_at).getTime()
    return `${invoice.invoice_number}-${timestamp}`
  }

  /**
   * Format date for XML (YYYYMMDD)
   */
  static formatXMLDate(dateString) {
    if (!dateString) return new Date().toISOString().split('T')[0].replace(/-/g, '')
    
    const date = new Date(dateString)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    
    return `${year}${month}${day}`
  }

  /**
   * Escape special XML characters
   */
  static escapeXML(text) {
    if (!text) return ''
    
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
  }

  /**
   * 🔥 NEW: Safe number parsing (kao u PDF-u!)
   */
  static parseNumber(value, defaultValue = 0) {
    if (value == null) return defaultValue
    
    if (typeof value === 'number') {
      return isNaN(value) ? defaultValue : value
    }
    
    if (typeof value === 'string') {
      // Remove spaces: "20 000.00" → "20000.00"
      // Replace comma: "1,50" → "1.50"
      const cleaned = value.trim().replace(/\s/g, '').replace(',', '.')
      const parsed = parseFloat(cleaned)
      return isNaN(parsed) ? defaultValue : parsed
    }
    
    return defaultValue
  }

  /**
   * Validate if ZUGFeRD can be generated
   */
  static canGenerateZUGFeRD(invoiceData, majstorData) {
    const missingFields = []
    
    if (invoiceData.type !== 'invoice') {
      missingFields.push('Must be invoice (not quote)')
    }
    
    if (!invoiceData.invoice_number) {
      missingFields.push('Invoice number')
    }
    
    if (!invoiceData.customer_name) {
      missingFields.push('Customer name')
    }
    
    // Parse items safely
    let items = []
    try {
      if (typeof invoiceData.items === 'string') {
        items = JSON.parse(invoiceData.items)
      } else if (Array.isArray(invoiceData.items)) {
        items = invoiceData.items
      }
    } catch (e) {
      items = []
    }
    
    if (!items || items.length === 0) {
      missingFields.push('Invoice items')
    }
    
    if (!majstorData.business_name && !majstorData.full_name) {
      missingFields.push('Business name or full name')
    }
    
    if (!majstorData.tax_number && !majstorData.vat_id) {
      missingFields.push('Tax number or VAT ID')
    }
    
    return {
      canGenerate: missingFields.length === 0,
      missingFields
    }
  }

  /**
   * 🔥 UPGRADED: Always return EN16931 profile
   */
  static getZUGFeRDProfile(invoiceData, majstorData) {
    return 'EN16931'
  }

  /**
   * Generate filename for embedded XML
   */
  static getXMLFilename() {
    return 'factur-x.xml'
  }

  /**
   * Get ZUGFeRD version string
   */
  static getZUGFeRDVersion() {
    return '2p1'
  }
}

export default ZUGFeRDService