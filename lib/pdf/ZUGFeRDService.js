// lib/pdf/ZUGFeRDService.js - ZUGFeRD 2.1 XML Generator for German E-Invoicing
export class ZUGFeRDService {
  
  /**
   * Generates ZUGFeRD 2.1 compliant XML for invoice
   * @param {Object} invoiceData - Invoice data from database
   * @param {Object} majstorData - Business owner data
   * @returns {string} ZUGFeRD 2.1 XML string
   */
  static generateZUGFeRDXML(invoiceData, majstorData) {
    try {
      console.log('🇪🇺 Generating ZUGFeRD 2.1 XML for invoice:', invoiceData.invoice_number)

      // Only generate for invoices, not quotes
      if (invoiceData.type === 'quote') {
        throw new Error('ZUGFeRD XML is only generated for invoices, not quotes')
      }

      // Build XML structure
      const xml = this.buildZUGFeRDXML(invoiceData, majstorData)
      
      console.log('✅ ZUGFeRD XML generated successfully, length:', xml.length, 'chars')
      return xml

    } catch (error) {
      console.error('❌ ZUGFeRD XML generation failed:', error)
      throw error
    }
  }

  /**
   * Builds complete ZUGFeRD 2.1 XML document
   * @param {Object} invoice - Invoice data
   * @param {Object} majstor - Business data
   * @returns {string} XML document
   */
  static buildZUGFeRDXML(invoice, majstor) {
    const items = JSON.parse(invoice.items || '[]')
    const documentDate = this.formatXMLDate(invoice.issue_date)
    const dueDate = this.formatXMLDate(invoice.due_date)
    
    // Generate unique document ID (required by standard)
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
    ${this.buildTradeLineItems(items, invoice)}
    ${this.buildApplicableHeaderTradeAgreement(invoice, majstor)}
    ${this.buildApplicableHeaderTradeDelivery(invoice, dueDate)}
    ${this.buildApplicableHeaderTradeSettlement(invoice, majstor)}
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>`
  }

  /**
   * Document context for ZUGFeRD profile
   */
  static buildDocumentContext() {
    return `    <ram:GuidelineSpecifiedDocumentContextParameter>
      <ram:ID>urn:cen.eu:en16931:2017#compliant#urn:ferd:zugferd:2p1:basic</ram:ID>
    </ram:GuidelineSpecifiedDocumentContextParameter>`
  }

  /**
   * Document header information
   */
  static buildExchangedDocument(invoice, documentId, documentDate) {
    return `    <ram:ID>${documentId}</ram:ID>
    <ram:Name>RECHNUNG</ram:Name>
    <ram:TypeCode>380</ram:TypeCode>
    <ram:IssueDateTime>
      <udt:DateTimeString format="102">${documentDate}</udt:DateTimeString>
    </ram:IssueDateTime>`
  }

  /**
   * Trade line items (invoice positions)
   */
  static buildTradeLineItems(items, invoice) {
    return items.map((item, index) => {
      const lineNumber = index + 1
      
      // 🔥 FIX: Convert strings to numbers safely
      const price = parseFloat(item.price) || 0
      const quantity = parseFloat(item.quantity) || 1
      const netAmount = (price * quantity).toFixed(2)
      
      return `    <ram:IncludedSupplyChainTradeLineItem>
      <ram:AssociatedDocumentLineDocument>
        <ram:LineID>${lineNumber}</ram:LineID>
      </ram:AssociatedDocumentLineDocument>
      <ram:SpecifiedTradeProduct>
        <ram:Name>${this.escapeXML(item.description)}</ram:Name>
      </ram:SpecifiedTradeProduct>
      <ram:SpecifiedLineTradeAgreement>
        <ram:NetPriceProductTradePrice>
          <ram:ChargeAmount>${price.toFixed(2)}</ram:ChargeAmount>
        </ram:NetPriceProductTradePrice>
      </ram:SpecifiedLineTradeAgreement>
      <ram:SpecifiedLineTradeDelivery>
        <ram:BilledQuantity unitCode="C62">${quantity}</ram:BilledQuantity>
      </ram:SpecifiedLineTradeDelivery>
      <ram:SpecifiedLineTradeSettlement>
        <ram:ApplicableTradeTax>
          <ram:TypeCode>VAT</ram:TypeCode>
          <ram:CategoryCode>${this.getTaxCategoryCode(invoice)}</ram:CategoryCode>
          <ram:RateApplicablePercent>${parseFloat(invoice.tax_rate) || 0}</ram:RateApplicablePercent>
        </ram:ApplicableTradeTax>
        <ram:SpecifiedTradeSettlementLineMonetarySummation>
          <ram:LineTotalAmount>${netAmount}</ram:LineTotalAmount>
        </ram:SpecifiedTradeSettlementLineMonetarySummation>
      </ram:SpecifiedLineTradeSettlement>
    </ram:IncludedSupplyChainTradeLineItem>`
    }).join('\n')
  }

  /**
   * Trade agreement (seller and buyer information)
   */
  static buildApplicableHeaderTradeAgreement(invoice, majstor) {
    return `    <ram:ApplicableHeaderTradeAgreement>
      <ram:BuyerReference>${this.escapeXML(invoice.customer_name)}</ram:BuyerReference>
      <ram:SellerTradeParty>
        <ram:Name>${this.escapeXML(majstor.business_name || majstor.full_name)}</ram:Name>
        <ram:PostalTradeAddress>
          <ram:PostcodeCode>${this.extractPostcode(majstor.address)}</ram:PostcodeCode>
          <ram:LineOne>${this.escapeXML(majstor.address || '')}</ram:LineOne>
          <ram:CityName>${this.escapeXML(majstor.city || '')}</ram:CityName>
          <ram:CountryID>DE</ram:CountryID>
        </ram:PostalTradeAddress>
        ${this.buildSellerTaxRegistration(majstor)}
      </ram:SellerTradeParty>
      <ram:BuyerTradeParty>
        <ram:Name>${this.escapeXML(invoice.customer_name)}</ram:Name>
        <ram:PostalTradeAddress>
          <ram:LineOne>${this.escapeXML(invoice.customer_address || '')}</ram:LineOne>
          <ram:CountryID>DE</ram:CountryID>
        </ram:PostalTradeAddress>
      </ram:BuyerTradeParty>
    </ram:ApplicableHeaderTradeAgreement>`
  }

  /**
   * Trade delivery information
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
   * Trade settlement (payment and tax information)
   */
  static buildApplicableHeaderTradeSettlement(invoice, majstor) {
    const paymentTerms = `Zahlbar innerhalb ${invoice.payment_terms_days} Tagen`
    
    // 🔥 FIX: Convert strings to numbers safely
    const subtotal = parseFloat(invoice.subtotal) || 0
    const taxAmount = parseFloat(invoice.tax_amount) || 0
    const totalAmount = parseFloat(invoice.total_amount) || 0
    const taxRate = parseFloat(invoice.tax_rate) || 0
    
    return `    <ram:ApplicableHeaderTradeSettlement>
      <ram:PaymentReference>${invoice.invoice_number}</ram:PaymentReference>
      <ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>
      ${this.buildPayeePartyCreditorFinancialAccount(majstor)}
      <ram:ApplicableTradeTax>
        <ram:CalculatedAmount>${taxAmount.toFixed(2)}</ram:CalculatedAmount>
        <ram:TypeCode>VAT</ram:TypeCode>
        <ram:CategoryCode>${this.getTaxCategoryCode(invoice)}</ram:CategoryCode>
        <ram:BasisAmount>${subtotal.toFixed(2)}</ram:BasisAmount>
        <ram:RateApplicablePercent>${taxRate}</ram:RateApplicablePercent>
      </ram:ApplicableTradeTax>
      <ram:SpecifiedTradePaymentTerms>
        <ram:Description>${paymentTerms}</ram:Description>
        <ram:DueDateDateTime>
          <udt:DateTimeString format="102">${this.formatXMLDate(invoice.due_date)}</udt:DateTimeString>
        </ram:DueDateDateTime>
      </ram:SpecifiedTradePaymentTerms>
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:LineTotalAmount>${subtotal.toFixed(2)}</ram:LineTotalAmount>
        <ram:TaxBasisTotalAmount>${subtotal.toFixed(2)}</ram:TaxBasisTotalAmount>
        <ram:TaxTotalAmount currencyID="EUR">${taxAmount.toFixed(2)}</ram:TaxTotalAmount>
        <ram:GrandTotalAmount>${totalAmount.toFixed(2)}</ram:GrandTotalAmount>
        <ram:DuePayableAmount>${totalAmount.toFixed(2)}</ram:DuePayableAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
    </ram:ApplicableHeaderTradeSettlement>`
  }

  /**
   * Bank account information for payments
   */
  static buildPayeePartyCreditorFinancialAccount(majstor) {
    if (!majstor.iban) return ''
    
    return `      <ram:PayeePartyCreditorFinancialAccount>
        <ram:IBANID>${majstor.iban.replace(/\s+/g, '')}</ram:IBANID>
        ${majstor.bank_name ? `<ram:AccountName>${this.escapeXML(majstor.bank_name)}</ram:AccountName>` : ''}
      </ram:PayeePartyCreditorFinancialAccount>
      ${majstor.bic ? `<ram:PayeeSpecifiedCreditorFinancialInstitution><ram:BICID>${majstor.bic}</ram:BICID></ram:PayeeSpecifiedCreditorFinancialInstitution>` : ''}`
  }

  /**
   * Seller tax registration (Steuernummer, USt-IdNr)
   */
  static buildSellerTaxRegistration(majstor) {
    let registrations = []
    
    if (majstor.tax_number) {
      registrations.push(`        <ram:SpecifiedTaxRegistration>
          <ram:ID schemeID="FC">${majstor.tax_number}</ram:ID>
        </ram:SpecifiedTaxRegistration>`)
    }
    
    if (majstor.vat_id) {
      registrations.push(`        <ram:SpecifiedTaxRegistration>
          <ram:ID schemeID="VA">${majstor.vat_id}</ram:ID>
        </ram:SpecifiedTaxRegistration>`)
    }
    
    return registrations.length > 0 ? registrations.join('\n') : ''
  }

  /**
   * Get tax category code based on invoice settings
   */
  static getTaxCategoryCode(invoice) {
    // S = Standard rate, Z = Zero rated (Kleinunternehmer), E = Exempt
    // 🔥 FIX: Handle boolean conversion from database
    const isKleinunternehmer = Boolean(invoice.is_kleinunternehmer)
    return isKleinunternehmer ? 'Z' : 'S'
  }

  /**
   * Extract postcode from address string
   */
  static extractPostcode(address) {
    if (!address) return ''
    
    // Try to extract German postcode (5 digits)
    const match = address.match(/\b\d{5}\b/)
    return match ? match[0] : ''
  }

  /**
   * Generate unique document ID
   */
  static generateDocumentId(invoice) {
    // Use invoice number as base, add timestamp for uniqueness
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
   * Validate if ZUGFeRD can be generated for this invoice
   */
  static canGenerateZUGFeRD(invoiceData, majstorData) {
    const missingFields = []
    
    // Check required invoice fields
    if (invoiceData.type !== 'invoice') {
      missingFields.push('Must be invoice (not quote)')
    }
    
    if (!invoiceData.invoice_number) {
      missingFields.push('Invoice number')
    }
    
    if (!invoiceData.customer_name) {
      missingFields.push('Customer name')
    }
    
    if (!invoiceData.items || JSON.parse(invoiceData.items).length === 0) {
      missingFields.push('Invoice items')
    }
    
    // Check required majstor fields
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
   * Get ZUGFeRD profile level based on available data
   */
  static getZUGFeRDProfile(invoiceData, majstorData) {
    // BASIC profile is sufficient for most German invoices
    // EN16931 profile would require more fields
    // EXTENDED profile allows custom fields
    
    const hasAdvancedData = !!(
      majstorData.vat_id && 
      majstorData.iban && 
      majstorData.address
    )
    
    return hasAdvancedData ? 'EN16931' : 'BASIC'
  }

  /**
   * Generate filename for embedded XML
   */
  static getXMLFilename() {
    // ZUGFeRD 2.1 standard filename
    return 'factur-x.xml'
  }

  /**
   * Get ZUGFeRD version string
   */
  static getZUGFeRDVersion() {
    return '2p1'
  }
}