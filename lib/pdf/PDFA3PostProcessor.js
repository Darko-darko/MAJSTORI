// lib/pdf/PDFA3PostProcessor.js
// PDF/A-3b compliance via pdf-lib post-processing.
//
// pdfkit generates the visual PDF + embedded factur-x.xml.
// This module loads the finished buffer with pdf-lib and injects:
//   - XMP metadata stream (uncompressed — required by spec)
//   - OutputIntent with sRGB ICC profile (uncompressed — required by spec)
//
// If anything fails, the original buffer is returned unchanged.

import { PDFDocument, PDFName, PDFString, PDFNumber } from 'pdf-lib'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { ZUGFERD } from './ZUGFeRDConfig.js'

export class PDFA3PostProcessor {

  /**
   * Inject PDF/A-3b metadata into a finished pdfkit PDF buffer.
   * @param {Buffer} pdfBuffer  — output of pdfkit doc.end()
   * @param {object} invoice    — normalized invoice data
   * @param {object} majstor    — business data
   * @returns {Promise<Buffer>} — modified buffer (or original on error)
   */
  static async inject(pdfBuffer, invoice, majstor) {
    try {
      const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true })
      const context = pdfDoc.context
      const catalog = pdfDoc.catalog

      // ── 1. XMP metadata stream (MUST be uncompressed for PDF/A) ────────────
      const xmpStr   = this.buildXMP(invoice, majstor)
      const xmpBytes = Buffer.from(xmpStr, 'utf8')

      // context.stream() creates a PDFRawStream — no FlateDecode applied
      const xmpStream = context.stream(xmpBytes, {
        Type:    PDFName.of('Metadata'),
        Subtype: PDFName.of('XML'),
        Length:  PDFNumber.of(xmpBytes.length),
      })
      catalog.set(PDFName.of('Metadata'), context.register(xmpStream))

      // ── 2. ICC profile stream (MUST be uncompressed) ────────────────────────
      let iccRef = null
      try {
        const iccPath  = resolve(process.cwd(), 'node_modules/pdfkit/js/data/sRGB_IEC61966_2_1.icc')
        const iccBytes = readFileSync(iccPath)

        const iccStream = context.stream(iccBytes, {
          N:      PDFNumber.of(3),
          Length: PDFNumber.of(iccBytes.length),
        })
        iccRef = context.register(iccStream)
      } catch (e) {
        console.warn('⚠️  ICC profile not found — OutputIntent without DestOutputProfile:', e.message)
      }

      // ── 3. OutputIntent dict ────────────────────────────────────────────────
      const intentEntries = {
        Type:                      PDFName.of('OutputIntent'),
        S:                         PDFName.of('GTS_PDFA1'),
        OutputConditionIdentifier: PDFString.of('sRGB IEC61966-2.1'),
        Info:                      PDFString.of('sRGB IEC61966-2.1'),
        RegistryName:              PDFString.of('http://www.color.org'),
      }
      if (iccRef) intentEntries.DestOutputProfile = iccRef

      const intentDict = context.obj(intentEntries)
      const intentRef  = context.register(intentDict)
      catalog.set(PDFName.of('OutputIntents'), context.obj([intentRef]))

      // ── Save ────────────────────────────────────────────────────────────────
      const result = await pdfDoc.save({ useObjectStreams: false })
      console.log('✅ PDF/A-3b metadata injected (pdf-lib post-processor)')
      return Buffer.from(result)

    } catch (err) {
      console.error('⚠️  PDF/A-3b post-processing failed (non-fatal):', err.message)
      return pdfBuffer  // return original — PDF still usable
    }
  }

  // ── XMP metadata builder ────────────────────────────────────────────────────

  static buildXMP(invoice, majstor) {
    const title    = `${invoice.type === 'quote' ? 'Angebot' : 'Rechnung'} ${invoice.invoice_number || ''}`
    const author   = this.esc(majstor.business_name || majstor.full_name || '')
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
      <pdf:Producer>Pro-Meister.de ZUGFeRD Generator</pdf:Producer>
    </rdf:Description>

    <!-- XMP basic -->
    <rdf:Description xmlns:xmp="http://ns.adobe.com/xap/1.0/" rdf:about="">
      <xmp:CreatorTool>Pro-Meister.de</xmp:CreatorTool>
      <xmp:CreateDate>${created}</xmp:CreateDate>
      <xmp:ModifyDate>${modified}</xmp:ModifyDate>
    </rdf:Description>

    <!-- Factur-X extension schema (required by PDF/A-3 for custom namespaces) -->
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

    <!-- Factur-X document properties -->
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

  static esc(str) {
    if (!str) return ''
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }
}

export default PDFA3PostProcessor
