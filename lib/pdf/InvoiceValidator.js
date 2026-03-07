// lib/pdf/InvoiceValidator.js
// Lightweight EN16931 / ZUGFeRD 2.4 pre-flight checks.
// Runs at runtime in production — pure JS, no Java, no extra npm packages.
// For full Mustang + veraPDF validation use: npm run validate:zugferd

import { ZUGFERD } from './ZUGFeRDConfig.js'

const VALID_UNIT_CODES = new Set(['C62', 'MTK', 'MTR', 'MTQ', 'HUR', 'LS', ''])

/**
 * Validate invoice data before generating ZUGFeRD XML.
 *
 * @param {object} normalized  — output of normalizeInvoice()
 * @param {object} majstorData — raw majstors DB row
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
export function validateForZUGFeRD(normalized, majstorData) {
  const errors   = []
  const warnings = []

  // BT-1 — Invoice number
  if (!normalized.invoice_number?.trim()) {
    errors.push('BT-1: invoice_number fehlt')
  }

  // BT-2 — Issue date
  if (!normalized.issue_date || isNaN(new Date(normalized.issue_date).getTime())) {
    errors.push('BT-2: issue_date ungültig oder fehlt')
  }

  // BT-5 — Currency
  if (normalized.currency !== 'EUR') {
    errors.push(`BT-5: Währung muss EUR sein (ist: ${normalized.currency})`)
  }

  // BT-23 — Guideline URN (sanity check — we set it, but verify config)
  if (!ZUGFERD.profileURN.includes('factur-x.eu:1p0:en16931')) {
    errors.push('BT-23: profileURN entspricht nicht ZUGFeRD 2.4 / EN16931')
  }

  // BT-31/32 — Seller tax identification
  if (!majstorData.tax_number?.trim() && !majstorData.vat_id?.trim()) {
    errors.push('BT-31/32: Steuernummer oder USt-IdNr des Verkäufers fehlt')
  }

  // BT-44 — Buyer name
  if (!normalized.customer_name?.trim()) {
    errors.push('BT-44: customer_name (Käufername) fehlt')
  }

  // BT-96 — Exemption reason required when taxCategory = Z
  if (normalized.taxCategory === 'Z' && !majstorData.is_kleinunternehmer) {
    warnings.push('BT-96: taxCategory=Z aber is_kleinunternehmer nicht gesetzt — ExemptionReason prüfen')
  }

  // Line items
  const items = normalized.items ?? []
  if (items.length === 0) {
    errors.push('Keine Rechnungspositionen vorhanden')
  }

  items.forEach((item, i) => {
    const pos = `Position ${i + 1}`

    // BT-129 — Quantity
    const qty = parseFloat(item.quantity ?? item.amount ?? item.qty ?? 0)
    if (!qty || qty <= 0) {
      errors.push(`BT-129: ${pos}: Menge muss > 0 sein`)
    }

    // BT-146 — Unit price
    const price = parseFloat(item.unit_price ?? item.price ?? 0)
    if (price == null || isNaN(price)) {
      errors.push(`BT-146: ${pos}: Einzelpreis fehlt`)
    }

    // BT-163 — Unit code
    const unitRaw = (item.unit ?? '').trim()
    // Map display units → UN/ECE codes for validation
    const unitMap = { 'm²': 'MTK', 'lm': 'MTR', 'm³': 'MTQ', 'Stk': 'C62', 'Std': 'HUR', 'pausch': 'LS' }
    const unitCode = unitMap[unitRaw] ?? unitRaw
    if (!VALID_UNIT_CODES.has(unitCode)) {
      warnings.push(`BT-163: ${pos}: Unbekannter Einheitencode "${unitRaw}" — wird als C62 behandelt`)
    }
  })

  // Amount consistency check
  const diff = Math.abs(normalized.subtotal + normalized.taxAmount - normalized.totalAmount)
  if (diff > 0.02) {
    errors.push(
      `Betragsinkonsistenz: Netto (${normalized.subtotal}) + MwSt (${normalized.taxAmount}) ≠ Brutto (${normalized.totalAmount}), Differenz: ${diff.toFixed(2)}`
    )
  }

  return { valid: errors.length === 0, errors, warnings }
}

export default validateForZUGFeRD
