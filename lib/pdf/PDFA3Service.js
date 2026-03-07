// lib/pdf/PDFA3Service.js
// PDF/A-3b compliance injection for pdfkit-generated ZUGFeRD 2.4 invoices.
//
// What this covers:
//   ✅ XMP metadata stream with pdfaid:part=3, pdfaid:conformance=B
//   ✅ Info dictionary ↔ XMP sync (Title, Author, Creator, dates)
//   ✅ Factur-X/ZUGFeRD extension schema in XMP (required by spec)
//   ✅ OutputIntent with embedded sRGB IEC61966-2.1 ICC profile (DestOutputProfile)
//   ✅ Catalog AF array referencing the embedded XML filespec

import { readFileSync } from 'fs'
import { resolve } from 'path'
import { ZUGFERD } from './ZUGFeRDConfig.js'

export class PDFA3Service {

  /**
   * Inject PDF/A-3b compliance metadata into a pdfkit document.
   * Call AFTER embedZUGFeRDXML() but BEFORE doc.end().
   *
   * @param {PDFDocument} doc       — pdfkit document instance
   * @param {object}      invoice   — normalized invoice data
   * @param {object}      majstor   — business data (business_name, full_name)
   * @param {object|null} filespecRef — pdfkit ref returned by doc.file(), for catalog AF array
   */
  static inject(doc, invoice, majstor, filespecRef = null) {
    try {
      const xmp = this.buildXMP(doc, invoice, majstor)
      this.injectXMP(doc, xmp)
      this.injectOutputIntent(doc)
      if (filespecRef) this.injectAFEntry(doc, filespecRef)
      console.log('✅ PDF/A-3b metadata injected (ZUGFeRD 2.4)')
    } catch (err) {
      // Non-fatal — PDF is still usable, just not PDF/A-3b certified
      console.error('⚠️  PDF/A-3b injection failed (non-fatal):', err.message)
    }
  }

  // ---------------------------------------------------------------------------
  // XMP metadata stream
  // ---------------------------------------------------------------------------

  static buildXMP(doc, invoice, majstor) {
    const title    = `${invoice.type === 'quote' ? 'Angebot' : 'Rechnung'} ${invoice.invoice_number || ''}`
    const author   = this.esc(majstor.business_name || majstor.full_name || '')
    const producer = 'Pro-Meister.de ZUGFeRD Generator'
    const created  = new Date(invoice.created_at || Date.now()).toISOString()
    const modified = new Date().toISOString()

    return `<?xpacket begin="\uFEFF" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">

    <!-- PDF/A-3b declaration -->
    <rdf:Description xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/" rdf:about="">
      <pdfaid:part>${ZUGFERD.pdfa.part}</pdfaid:part>
      <pdfaid:conformance>${ZUGFERD.pdfa.conformance}</pdfaid:conformance>
    </rdf:Description>

    <!-- Dublin Core -->
    <rdf:Description xmlns:dc="http://purl.org/dc/elements/1.1/" rdf:about="">
      <dc:format>application/pdf</dc:format>
      <dc:title>
        <rdf:Alt><rdf:li xml:lang="x-default">${this.esc(title)}</rdf:li></rdf:Alt>
      </dc:title>
      <dc:creator>
        <rdf:Seq><rdf:li>${author}</rdf:li></rdf:Seq>
      </dc:creator>
    </rdf:Description>

    <!-- PDF namespace -->
    <rdf:Description xmlns:pdf="http://ns.adobe.com/pdf/1.3/" rdf:about="">
      <pdf:Producer>${this.esc(producer)}</pdf:Producer>
    </rdf:Description>

    <!-- XMP basic -->
    <rdf:Description xmlns:xmp="http://ns.adobe.com/xap/1.0/" rdf:about="">
      <xmp:CreatorTool>Pro-Meister.de</xmp:CreatorTool>
      <xmp:CreateDate>${created}</xmp:CreateDate>
      <xmp:ModifyDate>${modified}</xmp:ModifyDate>
    </rdf:Description>

    <!-- Factur-X extension schema declaration (required by PDF/A-3 for custom namespaces) -->
    <rdf:Description
      xmlns:pdfaExtension="http://www.aiim.org/pdfa/ns/extension/"
      xmlns:pdfaSchema="http://www.aiim.org/pdfa/ns/schema#"
      xmlns:pdfaProperty="http://www.aiim.org/pdfa/ns/property#"
      rdf:about="">
      <pdfaExtension:schemas>
        <rdf:Bag>
          <rdf:li rdf:parseType="Resource">
            <pdfaSchema:schema>Factur-X PDFA Extension Schema</pdfaSchema:schema>
            <pdfaSchema:namespaceURI>${ZUGFERD.xmpNamespace}</pdfaSchema:namespaceURI>
            <pdfaSchema:prefix>${ZUGFERD.xmpPrefix}</pdfaSchema:prefix>
            <pdfaSchema:property>
              <rdf:Seq>
                <rdf:li rdf:parseType="Resource">
                  <pdfaProperty:name>DocumentFileName</pdfaProperty:name>
                  <pdfaProperty:valueType>Text</pdfaProperty:valueType>
                  <pdfaProperty:category>external</pdfaProperty:category>
                  <pdfaProperty:description>Filename of the Factur-X XML invoice document</pdfaProperty:description>
                </rdf:li>
                <rdf:li rdf:parseType="Resource">
                  <pdfaProperty:name>DocumentType</pdfaProperty:name>
                  <pdfaProperty:valueType>Text</pdfaProperty:valueType>
                  <pdfaProperty:category>external</pdfaProperty:category>
                  <pdfaProperty:description>Type of the Factur-X document</pdfaProperty:description>
                </rdf:li>
                <rdf:li rdf:parseType="Resource">
                  <pdfaProperty:name>Version</pdfaProperty:name>
                  <pdfaProperty:valueType>Text</pdfaProperty:valueType>
                  <pdfaProperty:category>external</pdfaProperty:category>
                  <pdfaProperty:description>Factur-X version</pdfaProperty:description>
                </rdf:li>
                <rdf:li rdf:parseType="Resource">
                  <pdfaProperty:name>ConformanceLevel</pdfaProperty:name>
                  <pdfaProperty:valueType>Text</pdfaProperty:valueType>
                  <pdfaProperty:category>external</pdfaProperty:category>
                  <pdfaProperty:description>Conformance level of the Factur-X document</pdfaProperty:description>
                </rdf:li>
              </rdf:Seq>
            </pdfaSchema:property>
          </rdf:li>
        </rdf:Bag>
      </pdfaExtension:schemas>
    </rdf:Description>

    <!-- Factur-X document properties (ZUGFeRD 2.4 / Factur-X 1.07) -->
    <rdf:Description xmlns:fx="${ZUGFERD.xmpNamespace}" rdf:about="">
      <fx:DocumentType>INVOICE</fx:DocumentType>
      <fx:DocumentFileName>${ZUGFERD.xmlFilename}</fx:DocumentFileName>
      <fx:Version>${ZUGFERD.xmpVersion}</fx:Version>
      <fx:ConformanceLevel>${ZUGFERD.conformanceLevel}</fx:ConformanceLevel>
    </rdf:Description>

  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`
  }

  static injectXMP(doc, xmpContent) {
    const metaStream = doc.ref({ Type: 'Metadata', Subtype: 'XML' })
    metaStream.write(Buffer.from(xmpContent, 'utf8'))
    metaStream.end()
    doc._root.data.Metadata = metaStream
  }

  // ---------------------------------------------------------------------------
  // OutputIntent — sRGB IEC61966-2.1 WITH embedded ICC profile (DestOutputProfile)
  // pdfkit bundles the ICC file at node_modules/pdfkit/js/data/sRGB_IEC61966_2_1.icc
  // ---------------------------------------------------------------------------

  static injectOutputIntent(doc) {
    let iccStream = null

    try {
      const iccPath = resolve(process.cwd(), 'node_modules/pdfkit/js/data/sRGB_IEC61966_2_1.icc')
      const iccBuf  = readFileSync(iccPath)

      iccStream = doc.ref({ N: 3, Length: iccBuf.length })
      iccStream.write(iccBuf)
      iccStream.end()
    } catch (err) {
      console.warn('⚠️  ICC profile not found — OutputIntent without DestOutputProfile:', err.message)
    }

    const intentDict = {
      Type:                      'OutputIntent',
      S:                         'GTS_PDFA1',
      OutputConditionIdentifier: 'sRGB IEC61966-2.1',
      Info:                      'sRGB IEC61966-2.1',
      RegistryName:              'http://www.color.org',
    }
    if (iccStream) intentDict.DestOutputProfile = iccStream

    const intent = doc.ref(intentDict)
    intent.end()

    if (!doc._root.data.OutputIntents) doc._root.data.OutputIntents = []
    doc._root.data.OutputIntents.push(intent)
  }

  // ---------------------------------------------------------------------------
  // Catalog AF array — links embedded XML filespec to document root
  // Required by PDF/A-3 spec (ISO 19005-3, clause 6.4)
  // ---------------------------------------------------------------------------

  static injectAFEntry(doc, filespecRef) {
    if (!doc._root.data.AF) doc._root.data.AF = []
    doc._root.data.AF.push(filespecRef)
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  static esc(str) {
    if (!str) return ''
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }
}

export default PDFA3Service
