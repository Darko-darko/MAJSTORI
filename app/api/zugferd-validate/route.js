// app/api/zugferd-validate/route.js — Public ZUGFeRD PDF validator (no auth)
import { PDFDocument, PDFName, PDFDict } from 'pdf-lib'
import { parseStringPromise } from 'xml2js'
import { inflateSync } from 'zlib'

const MAX_SIZE = 10 * 1024 * 1024 // 10 MB

// Decompress stream bytes if FlateDecode (zlib header: 0x78)
function tryInflate(bytes) {
  if (bytes[0] === 0x78) {
    try { return inflateSync(Buffer.from(bytes)) } catch (_) {}
  }
  return bytes
}

// Extract factur-x.xml from a ZUGFeRD PDF
async function extractXmlFromPdf(pdfBytes) {
  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true })

  // Method 1: Traverse Catalog → Names → EmbeddedFiles
  try {
    const catalog = pdfDoc.catalog
    const context = pdfDoc.context
    const namesDict = catalog.lookup(PDFName.of('Names'))
    if (namesDict) {
      const efDict = namesDict instanceof PDFDict
        ? namesDict.lookup(PDFName.of('EmbeddedFiles')) : null
      const nameArr = efDict instanceof PDFDict
        ? efDict.lookup(PDFName.of('Names')) : null

      if (nameArr?.size) {
        for (let i = 0; i + 1 < nameArr.size(); i += 2) {
          const nameObj = nameArr.lookup(i)
          const name = nameObj?.decodeText?.() ?? nameObj?.asString?.() ?? nameObj?.toString?.() ?? ''
          if (/factur-x|zugferd|xrechnung/i.test(name)) {
            const filespecRef = nameArr.get(i + 1)
            const filespec = context.lookup(filespecRef)
            if (!filespec?.get) continue
            const ef = filespec.lookup?.(PDFName.of('EF')) ?? context.lookup(filespec.get(PDFName.of('EF')))
            if (!ef?.get) continue
            const stream = ef.lookup?.(PDFName.of('F')) ?? context.lookup(ef.get(PDFName.of('F')))
            if (!stream?.getContents) continue
            const xmlBytes = tryInflate(stream.getContents())
            const cleaned = cleanXmlString(new TextDecoder('utf-8').decode(xmlBytes))
            if (cleaned) return cleaned
          }
        }
      }
    }
  } catch (e) {
    console.log('Method 1 (EmbeddedFiles) failed:', e.message)
  }

  // Method 2: Brute-force — scan all indirect objects for XML streams
  try {
    const { context } = pdfDoc
    const refs = context.enumerateIndirectObjects()
    for (const [ref, obj] of refs) {
      if (obj?.getContents) {
        try {
          let bytes = tryInflate(obj.getContents())
          if (bytes.length < 50 || bytes.length > 500000) continue
          const str = new TextDecoder('utf-8').decode(bytes)
          if (str.includes('CrossIndustryInvoice') || str.includes('rsm:')) {
            const cleaned = cleanXmlString(str)
            if (cleaned) return cleaned
          }
        } catch (_) { /* skip non-decodable streams */ }
      }
    }
  } catch (e) {
    console.log('Method 2 (brute-force) failed:', e.message)
  }

  // Method 3: Raw byte search — find XML directly in PDF binary
  try {
    const rawStr = new TextDecoder('latin1').decode(pdfBytes)
    const marker = '<?xml'
    let pos = 0
    while ((pos = rawStr.indexOf(marker, pos)) !== -1) {
      const chunk = rawStr.substring(pos, pos + 200)
      if (chunk.includes('CrossIndustryInvoice') || chunk.includes('uncefact')) {
        const endMarker = '</rsm:CrossIndustryInvoice>'
        const endPos = rawStr.indexOf(endMarker, pos)
        if (endPos > 0) {
          const xmlUtf8 = new TextDecoder('utf-8').decode(pdfBytes.slice(pos, endPos + endMarker.length))
          const cleaned = cleanXmlString(xmlUtf8)
          if (cleaned) return cleaned
        }
      }
      pos++
    }
  } catch (e) {
    console.log('Method 3 (raw search) failed:', e.message)
  }

  return null
}

function cleanXmlString(raw) {
  let str = raw.replace(/\0/g, '')
  const xmlStart = str.indexOf('<?xml')
  if (xmlStart > 0) str = str.substring(xmlStart)
  else if (xmlStart < 0) {
    const rootStart = str.indexOf('<rsm:')
    if (rootStart >= 0) str = str.substring(rootStart)
    else return null
  }
  const endTag = str.lastIndexOf('</rsm:CrossIndustryInvoice>')
  if (endTag > 0) str = str.substring(0, endTag + '</rsm:CrossIndustryInvoice>'.length)
  return str.trim() || null
}

// Validate extracted ZUGFeRD XML
function validateZugferdXml(cii) {
  const errors = []
  const warnings = []
  const data = {}

  const get = (obj, ...keys) => {
    let cur = obj
    for (const k of keys) {
      if (!cur) return undefined
      cur = Array.isArray(cur[k]) ? cur[k][0] : cur[k]
    }
    return cur
  }

  const getText = (obj, ...keys) => {
    const val = get(obj, ...keys)
    if (val === undefined || val === null) return ''
    if (typeof val === 'string') return val
    if (val._ !== undefined) return val._
    return String(val)
  }

  const root = get(cii, 'rsm:CrossIndustryInvoice')
  if (!root) {
    errors.push({ code: 'XML-001', field: 'Root', message: 'Kein gültiges CrossIndustryInvoice-Element gefunden' })
    return { errors, warnings, data }
  }

  // --- Context ---
  const ctx = get(root, 'rsm:ExchangedDocumentContext')
  const guidelineId = getText(ctx, 'ram:GuidelineSpecifiedDocumentContextParameter', 'ram:ID')
  data.profile = guidelineId

  if (!guidelineId) {
    errors.push({ code: 'BT-23', field: 'Profil', message: 'Kein Profil-URN (GuidelineSpecifiedDocumentContextParameter) gefunden' })
  } else if (!guidelineId.includes('en16931') && !guidelineId.includes('xrechnung') && !guidelineId.includes('extended')) {
    warnings.push({ code: 'BT-23', field: 'Profil', message: `Profil "${guidelineId}" — möglicherweise nicht EN16931-konform` })
  }

  // --- Document ---
  const doc = get(root, 'rsm:ExchangedDocument')
  data.invoiceNumber = getText(doc, 'ram:ID')
  data.typeCode = getText(doc, 'ram:TypeCode')
  data.issueDate = getText(doc, 'ram:IssueDateTime', 'udt:DateTimeString')

  if (!data.invoiceNumber) errors.push({ code: 'BT-1', field: 'Rechnungsnummer', message: 'Rechnungsnummer (BT-1) fehlt' })
  if (!data.issueDate) errors.push({ code: 'BT-2', field: 'Rechnungsdatum', message: 'Rechnungsdatum (BT-2) fehlt' })
  if (!['380', '381', '384', '389'].includes(data.typeCode)) {
    warnings.push({ code: 'BT-3', field: 'Dokumenttyp', message: `TypeCode "${data.typeCode}" — erwartet 380 (Rechnung), 381 (Gutschrift), 384 oder 389` })
  }

  // --- Transaction ---
  const txn = get(root, 'rsm:SupplyChainTradeTransaction')

  // Line items
  const items = txn?.['ram:IncludedSupplyChainTradeLineItem']
  data.lineItemCount = Array.isArray(items) ? items.length : (items ? 1 : 0)
  if (data.lineItemCount === 0) {
    errors.push({ code: 'BG-25', field: 'Positionen', message: 'Keine Rechnungspositionen gefunden' })
  }

  // Seller
  const agreement = get(txn, 'ram:ApplicableHeaderTradeAgreement')
  const seller = get(agreement, 'ram:SellerTradeParty')
  data.sellerName = getText(seller, 'ram:Name')
  if (!data.sellerName) errors.push({ code: 'BT-27', field: 'Verkäufer', message: 'Verkäufername (BT-27) fehlt' })

  // Seller tax ID
  const sellerTaxReg = seller?.['ram:SpecifiedTaxRegistration']
  const taxIds = Array.isArray(sellerTaxReg) ? sellerTaxReg : (sellerTaxReg ? [sellerTaxReg] : [])
  const hasFC = taxIds.some(t => getText(t, 'ram:ID').length > 0 && getText(t, 'ram:ID', '$', 'schemeID') !== 'VA')
  const hasVA = taxIds.some(t => {
    const id = get(t, 'ram:ID')
    return id && (id?.$?.schemeID === 'VA' || (typeof getText(t, 'ram:ID') === 'string' && getText(t, 'ram:ID').startsWith('DE')))
  })
  data.hasTaxNumber = hasFC || taxIds.length > 0
  data.hasVatId = hasVA

  if (!data.hasTaxNumber && !data.hasVatId) {
    errors.push({ code: 'BT-31/32', field: 'Steuer-ID', message: 'Weder Steuernummer (BT-32) noch USt-IdNr. (BT-31) vorhanden' })
  }

  // Buyer
  const buyer = get(agreement, 'ram:BuyerTradeParty')
  data.buyerName = getText(buyer, 'ram:Name')
  if (!data.buyerName) errors.push({ code: 'BT-44', field: 'Käufer', message: 'Käufername (BT-44) fehlt' })

  // Settlement (amounts)
  const settlement = get(txn, 'ram:ApplicableHeaderTradeSettlement')
  data.currency = getText(settlement, 'ram:InvoiceCurrencyCode')
  if (!data.currency) warnings.push({ code: 'BT-5', field: 'Währung', message: 'Währungscode (BT-5) fehlt' })

  const monetary = get(settlement, 'ram:SpecifiedTradeSettlementHeaderMonetarySummation')
  data.taxBasisTotal = parseFloat(getText(monetary, 'ram:TaxBasisTotalAmount')) || 0
  data.taxTotal = parseFloat(getText(monetary, 'ram:TaxTotalAmount')) || 0
  data.grandTotal = parseFloat(getText(monetary, 'ram:GrandTotalAmount')) || 0
  data.duePayableAmount = parseFloat(getText(monetary, 'ram:DuePayableAmount')) || 0

  if (data.grandTotal === 0 && data.typeCode !== '381') {
    warnings.push({ code: 'BT-112', field: 'Gesamtbetrag', message: 'Rechnungsbetrag ist 0,00 €' })
  }

  // Math check: taxBasis + tax = grandTotal
  const expectedGrand = Math.round((data.taxBasisTotal + data.taxTotal) * 100) / 100
  if (Math.abs(expectedGrand - data.grandTotal) > 0.02) {
    errors.push({
      code: 'BR-CO-15',
      field: 'Beträge',
      message: `Rechenfehler: Netto (${data.taxBasisTotal.toFixed(2)}) + MwSt. (${data.taxTotal.toFixed(2)}) = ${expectedGrand.toFixed(2)}, aber Gesamtbetrag ist ${data.grandTotal.toFixed(2)}`
    })
  }

  // Payment means
  const paymentMeans = get(settlement, 'ram:SpecifiedTradeSettlementPaymentMeans')
  data.hasPaymentInfo = !!paymentMeans
  if (!paymentMeans) warnings.push({ code: 'BG-16', field: 'Zahlung', message: 'Keine Zahlungsinformationen (BG-16) vorhanden' })

  // Tax breakdown
  const taxEntries = settlement?.['ram:ApplicableTradeTax']
  data.taxEntries = Array.isArray(taxEntries) ? taxEntries.length : (taxEntries ? 1 : 0)

  return { errors, warnings, data }
}

export async function POST(req) {
  try {
    const contentType = req.headers.get('content-type') || ''

    let pdfBytes

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      const file = formData.get('pdf')
      if (!file) return Response.json({ error: 'Keine PDF-Datei hochgeladen' }, { status: 400 })
      if (file.size > MAX_SIZE) return Response.json({ error: 'Datei zu groß (max. 10 MB)' }, { status: 400 })
      pdfBytes = new Uint8Array(await file.arrayBuffer())
    } else {
      const body = await req.arrayBuffer()
      if (body.byteLength > MAX_SIZE) return Response.json({ error: 'Datei zu groß (max. 10 MB)' }, { status: 400 })
      pdfBytes = new Uint8Array(body)
    }

    // Check PDF magic bytes
    const header = new TextDecoder().decode(pdfBytes.slice(0, 5))
    if (header !== '%PDF-') {
      return Response.json({ error: 'Ungültige Datei — nur PDF-Dateien werden akzeptiert' }, { status: 400 })
    }

    // Extract XML
    let xmlString
    try {
      xmlString = await extractXmlFromPdf(pdfBytes)
    } catch (err) {
      return Response.json({ error: 'PDF konnte nicht gelesen werden: ' + err.message }, { status: 400 })
    }

    if (!xmlString) {
      return Response.json({
        valid: false,
        zugferd: false,
        message: 'Kein ZUGFeRD/Factur-X XML in dieser PDF gefunden. Diese Rechnung ist kein elektronisches Rechnungsdokument nach ZUGFeRD-Standard.',
        errors: [{ code: 'XML-000', field: 'XML', message: 'Keine eingebettete XML-Datei (factur-x.xml) gefunden' }],
        warnings: [],
        data: {}
      })
    }

    // Parse XML
    let parsed
    try {
      parsed = await parseStringPromise(xmlString, { explicitArray: true })
    } catch (err) {
      return Response.json({
        valid: false,
        zugferd: true,
        message: 'XML gefunden, aber fehlerhaft: ' + err.message,
        errors: [{ code: 'XML-002', field: 'XML', message: 'XML ist nicht wohlgeformt' }],
        warnings: [],
        data: {}
      })
    }

    // Validate
    const { errors, warnings, data } = validateZugferdXml(parsed)

    return Response.json({
      valid: errors.length === 0,
      zugferd: true,
      message: errors.length === 0
        ? `ZUGFeRD-Rechnung gültig — ${data.lineItemCount} Position(en), ${data.grandTotal?.toFixed(2)} ${data.currency || 'EUR'}`
        : `${errors.length} Fehler gefunden`,
      errors,
      warnings,
      data
    })
  } catch (err) {
    console.error('ZUGFeRD validate error:', err)
    return Response.json({ error: 'Serverfehler: ' + err.message }, { status: 500 })
  }
}
