// lib/pdf/SEPAQRService.js - EPC QR Code Generator for SEPA Payments
import QRCode from 'qrcode'

export class SEPAQRService {
  
  /**
   * Generates EPC QR code for SEPA payments according to European Payments Council guidelines
   * @param {Object} paymentData - Payment information
   * @param {string} paymentData.name - Recipient name (max 70 chars)
   * @param {string} paymentData.iban - IBAN account number
   * @param {string} paymentData.bic - BIC code (optional for version 2)
   * @param {number} paymentData.amount - Payment amount (max 2 decimal places)
   * @param {string} paymentData.currency - Currency code (EUR)
   * @param {string} paymentData.purpose - Payment purpose (max 4 chars, optional)
   * @param {string} paymentData.reference - Payment reference (max 35 chars, optional)
   * @param {string} paymentData.text - Additional text (max 140 chars, optional)
   * @returns {Promise<Buffer>} QR code image as buffer
   */
  static async generateEPCQRCode(paymentData) {
    try {
      // Build EPC QR string according to specification
      const epcString = this.buildEPCString(paymentData)
      
      console.log('📱 Generated EPC QR string:', epcString.replace(/\n/g, '\\n'))
      
      // Generate QR code with EPC specifications
      const qrBuffer = await QRCode.toBuffer(epcString, {
        errorCorrectionLevel: 'M',  // Fixed by EPC guidelines
        type: 'png',
        width: 200,                 // Reasonable size for invoice
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })
      
      console.log('✅ EPC QR code generated, size:', qrBuffer.length, 'bytes')
      return qrBuffer
      
    } catch (error) {
      console.error('❌ EPC QR generation failed:', error)
      throw error
    }
  }

  /**
   * Builds EPC QR code string according to specification
   * @param {Object} data - Payment data
   * @returns {string} EPC formatted string
   */
  static buildEPCString(data) {
    // Validate required fields
    if (!data.name || !data.iban) {
      throw new Error('Name and IBAN are required for EPC QR code')
    }

    // Clean and validate IBAN
    const cleanIBAN = this.cleanIBAN(data.iban)
    if (!this.validateIBAN(cleanIBAN)) {
      throw new Error('Invalid IBAN format')
    }

    // Format amount (max 2 decimal places)
    const formattedAmount = data.amount ? 
      `${data.currency || 'EUR'}${parseFloat(data.amount).toFixed(2)}` : ''

    // Build EPC string according to specification
    // Format: BCD\n002\n2\nSCT\nBIC\nName\nIBAN\nAmount\nPurpose\nReference\nText
    const epcLines = [
      'BCD',                                          // Service Tag
      '002',                                          // Version
      '2',                                            // Character Set (UTF-8)
      'SCT',                                          // Identification (SEPA Credit Transfer)
      this.truncate(data.bic || '', 11),             // BIC (optional in version 2)
      this.truncate(data.name, 70),                  // Beneficiary Name
      cleanIBAN,                                      // Beneficiary Account (IBAN)
      formattedAmount,                                // Amount
      this.truncate(data.purpose || '', 4),          // Purpose (optional)
      this.truncate(data.reference || '', 35),       // Structured Reference (optional)
      this.truncate(data.text || '', 140)            // Unstructured Remittance Information (optional)
    ]

    return epcLines.join('\n')
  }

  /**
   * Clean IBAN by removing spaces and converting to uppercase
   * @param {string} iban - Raw IBAN
   * @returns {string} Clean IBAN
   */
  static cleanIBAN(iban) {
    return iban.replace(/\s+/g, '').toUpperCase()
  }

  /**
   * Basic IBAN validation
   * @param {string} iban - IBAN to validate
   * @returns {boolean} Valid or not
   */
  static validateIBAN(iban) {
    // Basic validation: length and format
    return /^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/.test(iban) && iban.length >= 15 && iban.length <= 34
  }

  /**
   * Truncate string to maximum length
   * @param {string} str - String to truncate
   * @param {number} maxLength - Maximum length
   * @returns {string} Truncated string
   */
  static truncate(str, maxLength) {
    if (!str) return ''
    return str.length > maxLength ? str.substring(0, maxLength) : str
  }

  /**
   * Validate payment data before generating QR code
   * @param {Object} data - Payment data to validate
   * @returns {Object} Validation result
   */
  static validatePaymentData(data) {
    const errors = []
    
    if (!data.name?.trim()) {
      errors.push('Recipient name is required')
    }
    
    if (!data.iban?.trim()) {
      errors.push('IBAN is required')
    } else {
      const cleanIBAN = this.cleanIBAN(data.iban)
      if (!this.validateIBAN(cleanIBAN)) {
        errors.push('Invalid IBAN format')
      }
    }
    
    if (data.amount && (isNaN(data.amount) || data.amount <= 0)) {
      errors.push('Amount must be a positive number')
    }
    
    if (data.amount && data.amount > 999999999.99) {
      errors.push('Amount too large (max: 999,999,999.99)')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Generate QR code specifically for invoice data
   * @param {Object} invoiceData - Invoice data
   * @param {Object} majstorData - Business owner data  
   * @returns {Promise<Buffer>} QR code buffer
   */
  static async generateForInvoice(invoiceData, majstorData) {
    // Only generate for invoices, not quotes
    if (invoiceData.type === 'quote') {
      throw new Error('QR codes are only generated for invoices, not quotes')
    }

    // Prepare payment data
    const paymentData = {
      name: majstorData.business_name || majstorData.full_name,
      iban: majstorData.iban,
      bic: majstorData.bic,
      amount: invoiceData.total_amount,
      currency: 'EUR',
      reference: invoiceData.invoice_number,
      text: `Rechnung ${invoiceData.invoice_number} - ${invoiceData.customer_name}`
    }

    console.log('💳 Generating SEPA QR for invoice:', {
      invoiceNumber: invoiceData.invoice_number,
      amount: paymentData.amount,
      recipient: paymentData.name,
      iban: paymentData.iban ? 'Present' : 'Missing'
    })

    // Validate data
    const validation = this.validatePaymentData(paymentData)
    if (!validation.valid) {
      throw new Error('Invalid payment data: ' + validation.errors.join(', '))
    }

    return await this.generateEPCQRCode(paymentData)
  }
}