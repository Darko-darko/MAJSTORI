// lib/pdf/InvoiceNormalizer.js
// Single normalize() call — both PDF and XML read from the same object.
// Prevents any discrepancy between the visual PDF and the machine-readable XML.

const round2 = n => Math.round(n * 100) / 100

/**
 * Parse and normalize invoice + majstor data into one consistent object.
 * Call this ONCE at the top of generateInvoice(); pass `normalized` to both
 * ZUGFeRDService.generateZUGFeRDXML() and all PDF rendering methods.
 *
 * @param {object} invoiceData  — raw DB row from invoices table
 * @param {object} majstorData  — raw DB row from majstors table
 * @returns {object}            — normalized invoice ready for PDF + XML
 */
export function normalizeInvoice(invoiceData, majstorData) {
  // Parse items once
  let items = []
  try {
    items = typeof invoiceData.items === 'string'
      ? JSON.parse(invoiceData.items)
      : Array.isArray(invoiceData.items) ? invoiceData.items : []
  } catch {
    items = []
  }

  // Freeze amounts from DB (computed by frontend at save time)
  const subtotal    = round2(parseFloat(invoiceData.subtotal    ?? 0) || 0)
  const taxAmount   = round2(parseFloat(invoiceData.tax_amount  ?? 0) || 0)
  const totalAmount = round2(parseFloat(invoiceData.total_amount ?? subtotal + taxAmount) || 0)

  // Tax
  const isKlein   = !!majstorData.is_kleinunternehmer
  const taxRate   = isKlein ? 0 : round2(parseFloat(majstorData.vat_rate ?? 0) || 0)
  const taxCategory = (isKlein || taxRate === 0) ? 'Z' : 'S'

  // Currency always EUR for German B2B
  const currency = 'EUR'

  return {
    ...invoiceData,
    items,
    subtotal,
    taxAmount,
    totalAmount,
    taxRate,
    taxCategory,
    currency,
  }
}

export default normalizeInvoice
