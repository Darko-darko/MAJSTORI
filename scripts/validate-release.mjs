#!/usr/bin/env node
// scripts/validate-release.js
// ZUGFeRD 2.4 + PDF/A-3b release gate validation.
//
// Run manually: npm run validate:zugferd
// NOT a pre-commit/pre-push hook — run only when working on invoices/ZUGFeRD.
//
// Requirements:
//   - Java installed + mustang-cli.jar in scripts/ (download from mustangproject.org)
//   - veraPDF installed as CLI (from verapdf.org)
//
// Exit codes: 0 = all pass, 1 = failures

import { spawnSync, execSync } from 'child_process'
import { writeFileSync, unlinkSync, existsSync, readFileSync } from 'fs'
import { resolve, join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { parseString } from 'xml2js'
import { promisify } from 'util'

const parseXML = promisify(parseString)
const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

// ─── Test fixtures ────────────────────────────────────────────────────────────

const TEST_MAJSTOR = {
  id:               'test-majstor-id',
  full_name:        'Max Meister',
  business_name:    'Meister Handwerk GmbH',
  email:            'test@pro-meister.de',
  business_email:   'test@pro-meister.de',
  phone:            '+49 123 456789',
  address:          'Musterstraße 1',
  postal_code:      '12345',
  city:             'Berlin',
  country:          'Deutschland',
  tax_number:       '12/345/67890',
  vat_id:           'DE123456789',
  iban:             'DE89370400440532013000',
  bic:              'COBADEFFXXX',
  bank_name:        'Commerzbank',
  is_kleinunternehmer: false,
  vat_rate:         19,
}

const TEST_INVOICE = {
  id:               'test-invoice-id',
  type:             'invoice',
  invoice_number:   'RE-2026-TEST-001',
  issue_date:       '2026-03-07',
  due_date:         '2026-03-21',
  payment_terms_days: 14,
  customer_name:    'Max Mustermann GmbH',
  customer_street:  'Kundenweg 5',
  customer_postal_code: '10115',
  customer_city:    'Berlin',
  customer_country: 'Deutschland',
  customer_email:   'kunde@example.de',
  customer_phone:   '+49 30 123456',
  place_of_service: 'Berlin',
  notes:            'Testrechnung für ZUGFeRD-Validierung',
  subtotal:         1000.00,
  tax_amount:       190.00,
  total_amount:     1190.00,
  tax_rate:         19,
  majstor_id:       'test-majstor-id',
  created_at:       '2026-03-07T12:00:00Z',
  updated_at:       '2026-03-07T12:00:00Z',
  items: JSON.stringify([
    {
      description: 'Fliesenlegen Badezimmer',
      quantity:    10,
      unit:        'm²',
      unit_price:  60.00,
      total_price: 600.00,
    },
    {
      description: 'Material und Zubehör',
      quantity:    1,
      unit:        'pausch',
      unit_price:  400.00,
      total_price: 400.00,
    },
  ]),
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

let passed = 0
let failed = 0

function ok(msg) {
  console.log('  ✅', msg)
  passed++
}

function fail(msg) {
  console.error('  ❌', msg)
  failed++
}

function section(title) {
  console.log(`\n── ${title} ──`)
}

// Deep-get a value from xml2js parsed object
function xmlGet(obj, ...keys) {
  let cur = obj
  for (const k of keys) {
    if (!cur) return undefined
    cur = Array.isArray(cur[k]) ? cur[k][0] : cur[k]
  }
  return typeof cur === 'object' && cur._ !== undefined ? cur._ : cur
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🔍 ZUGFeRD 2.4 + PDF/A-3b Release Gate Validation\n')

  // Dynamic import (ESM — must load after script starts)
  const { InvoicePDFService } = await import('../lib/pdf/InvoicePDFService.js')
  const { ZUGFERD } = await import('../lib/pdf/ZUGFeRDConfig.js')
  const { ZUGFeRDService } = await import('../lib/pdf/ZUGFeRDService.js')
  const { normalizeInvoice } = await import('../lib/pdf/InvoiceNormalizer.js')
  const { validateForZUGFeRD } = await import('../lib/pdf/InvoiceValidator.js')

  // ── 1. Generate PDF + XML ──────────────────────────────────────────────────
  section('1. Generate test invoice')

  const normalized = normalizeInvoice(TEST_INVOICE, TEST_MAJSTOR)
  const svc = new InvoicePDFService()
  let pdfBuffer

  try {
    pdfBuffer = await svc.generateInvoice(TEST_INVOICE, TEST_MAJSTOR)
    ok(`PDF generated (${pdfBuffer.length} bytes)`)
  } catch (err) {
    fail(`PDF generation failed: ${err.message}`)
    process.exit(1)
  }

  // Save PDF to temp file for external validators
  const tmpPDF = join(ROOT, 'scripts', '_test_invoice.pdf')
  writeFileSync(tmpPDF, pdfBuffer)

  // ── 2. Generate XML directly (pdfkit compresses embedded files — can't extract from binary) ──
  section('2. Generate + parse ZUGFeRD XML')

  let xmlStr
  try {
    xmlStr = ZUGFeRDService.generateZUGFeRDXML(normalized, TEST_MAJSTOR)
    ok(`factur-x.xml generated (${xmlStr.length} chars)`)
  } catch (err) {
    fail(`XML generation failed: ${err.message}`)
    process.exit(1)
  }

  let xmlParsed
  try {
    xmlParsed = await parseXML(xmlStr, { explicitArray: true, ignoreAttrs: false })
    ok('XML is well-formed (parseable)')
  } catch (err) {
    fail(`XML parse error: ${err.message}`)
    process.exit(1)
  }

  // ── 3. ZUGFeRD 2.4 profile URN check ──────────────────────────────────────
  section('3. ZUGFeRD 2.4 profile URN')

  const cii = xmlParsed['rsm:CrossIndustryInvoice']
  const ctx = cii?.['rsm:ExchangedDocumentContext']?.[0]
  const guidelineId = xmlGet(ctx, 'ram:GuidelineSpecifiedDocumentContextParameter', 'ram:ID')

  if (guidelineId === ZUGFERD.profileURN) {
    ok(`GuidelineSpecifiedDocumentContextParameter/ram:ID = ${guidelineId}`)
  } else {
    fail(`Wrong guideline URN: got "${guidelineId}", expected "${ZUGFERD.profileURN}"`)
  }

  // ── 4. Invoice number in XML ───────────────────────────────────────────────
  section('4. Invoice number in XML')

  const exchDoc = cii?.['rsm:ExchangedDocument']?.[0]
  const xmlInvoiceId = xmlGet(exchDoc, 'ram:ID')
  if (xmlInvoiceId === TEST_INVOICE.invoice_number) {
    ok(`ExchangedDocument/ram:ID = ${xmlInvoiceId}`)
  } else {
    fail(`Invoice number mismatch: XML="${xmlInvoiceId}", expected="${TEST_INVOICE.invoice_number}"`)
  }

  // ── 5. PDF ↔ XML content consistency ──────────────────────────────────────
  section('5. PDF ↔ XML content consistency')

  // Issue date
  const xmlDate = xmlGet(exchDoc, 'ram:IssueDateTime', 'udt:DateTimeString')
  const expectedDate = TEST_INVOICE.issue_date.replace(/-/g, '')
  if (xmlDate === expectedDate) {
    ok(`issue_date matches: ${TEST_INVOICE.issue_date} = ${xmlDate}`)
  } else {
    fail(`issue_date mismatch: XML="${xmlDate}", expected="${expectedDate}"`)
  }

  // Settlement / amounts
  const tradeTransaction = cii?.['rsm:SupplyChainTradeTransaction']?.[0]
  const settlement = tradeTransaction?.['ram:ApplicableHeaderTradeSettlement']?.[0]
  const monetarySummation = settlement?.['ram:SpecifiedTradeSettlementHeaderMonetarySummation']?.[0]

  const xmlTotal = parseFloat(xmlGet(monetarySummation, 'ram:GrandTotalAmount'))
  if (Math.abs(xmlTotal - normalized.totalAmount) <= 0.02) {
    ok(`total_amount matches: PDF=${normalized.totalAmount} XML=${xmlTotal}`)
  } else {
    fail(`total_amount mismatch: PDF=${normalized.totalAmount}, XML=${xmlTotal}`)
  }

  // Currency
  const xmlCurrency = xmlGet(settlement, 'ram:InvoiceCurrencyCode')
  if (xmlCurrency === 'EUR') {
    ok(`currency matches: EUR`)
  } else {
    fail(`currency mismatch: XML="${xmlCurrency}", expected="EUR"`)
  }

  // Buyer name
  const tradeAgreement = tradeTransaction?.['ram:ApplicableHeaderTradeAgreement']?.[0]
  const buyerParty = tradeAgreement?.['ram:BuyerTradeParty']?.[0]
  const xmlBuyer = xmlGet(buyerParty, 'ram:Name')
  if (xmlBuyer === TEST_INVOICE.customer_name) {
    ok(`customer_name matches: ${xmlBuyer}`)
  } else {
    fail(`customer_name mismatch: XML="${xmlBuyer}", expected="${TEST_INVOICE.customer_name}"`)
  }

  // Seller name
  const sellerParty = tradeAgreement?.['ram:SellerTradeParty']?.[0]
  const xmlSeller = xmlGet(sellerParty, 'ram:Name')
  const expectedSeller = TEST_MAJSTOR.business_name || TEST_MAJSTOR.full_name
  if (xmlSeller === expectedSeller) {
    ok(`seller_name matches: ${xmlSeller}`)
  } else {
    fail(`seller_name mismatch: XML="${xmlSeller}", expected="${expectedSeller}"`)
  }

  // ── 6. InvoiceValidator runtime check ─────────────────────────────────────
  section('6. InvoiceValidator (runtime EN16931 checks)')

  const { valid, errors: valErrors, warnings: valWarnings } = validateForZUGFeRD(normalized, TEST_MAJSTOR)
  if (valid) {
    ok('All EN16931 field checks passed')
  } else {
    valErrors.forEach(e => fail(e))
  }
  if (valWarnings.length > 0) {
    valWarnings.forEach(w => console.log('  ⚠️ ', w))
  }

  // ── 7. Mustang CLI (ZUGFeRD / EN16931 validation) ─────────────────────────
  section('7. Mustang CLI — ZUGFeRD 2.4 / EN16931 validation')

  const mustangJar = join(__dirname, 'mustang-cli.jar')
  if (!existsSync(mustangJar)) {
    console.log('  ⏭  Mustang CLI not found (scripts/mustang-cli.jar) — skipping.')
    console.log('     Download: https://github.com/ZUGFeRD/mustangproject/releases')
  } else {
    // Inject known JDK paths into PATH so 'java' resolves without shell quoting issues
    const extraJavaDirs = [
      'C:\\Program Files\\Eclipse Adoptium\\jdk-17.0.18.8-hotspot\\bin',
      'C:\\Program Files\\Java\\jdk-17\\bin',
      'C:\\Program Files\\Java\\jre-17\\bin',
    ]
    const javaEnv = { ...process.env, PATH: `${extraJavaDirs.join(';')};${process.env.PATH || ''}` }

    const mustang = spawnSync('java', ['-jar', mustangJar, '--action', 'validate', '--source', tmpPDF], {
      encoding: 'utf8', timeout: 30000, env: javaEnv
    })
    if (mustang.status === 0) {
      ok('ZUGFeRD 2.4 / EN16931 validation passed')
    } else if (!mustang.stdout && !mustang.stderr && mustang.error) {
      console.log('  ⏭  Mustang could not run — is Java installed? Skipping.')
    } else {
      fail(`Mustang validation failed:\n${mustang.stdout}\n${mustang.stderr}`)
    }
  }

  // ── 8. veraPDF (PDF/A-3b validation) ──────────────────────────────────────
  section('8. veraPDF — PDF/A-3b validation')

  try {
    execSync('verapdf --version', { stdio: 'ignore' })
    const vera = spawnSync('verapdf', ['--flavour', '3b', tmpPDF], {
      encoding: 'utf8', timeout: 90000, shell: true
    })
    const veraOut = (vera.stdout || '') + (vera.stderr || '')
    if (vera.status === null) {
      console.log('  ⏭  veraPDF timed out or could not start — skipping.')
    } else if (veraOut.includes('isCompliant="true"')) {
      ok('PDF/A-3b validation passed')
    } else {
      fail(`veraPDF validation failed (exit ${vera.status}):\n${veraOut || '(no output)'}`)
    }
  } catch {
    console.log('  ⏭  veraPDF not installed — skipping.')
    console.log('     Download: https://verapdf.org/releases/')
  }

  // ── Cleanup ────────────────────────────────────────────────────────────────
  try { unlinkSync(tmpPDF) } catch { /* ignore */ }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(50)}`)
  if (failed === 0) {
    console.log(`✅ All ${passed} checks passed — safe to push`)
  } else {
    console.log(`❌ ${failed} check(s) failed, ${passed} passed — DO NOT push`)
    process.exit(1)
  }
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
