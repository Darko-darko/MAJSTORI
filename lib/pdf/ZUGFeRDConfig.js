// lib/pdf/ZUGFeRDConfig.js
// Single source of truth for all ZUGFeRD 2.4 / Factur-X 1.07 constants.
// Import from here — never hardcode version strings elsewhere.

export const ZUGFERD = {
  // ZUGFeRD version
  version:          '2p4',
  profile:          'EN16931',

  // GuidelineSpecifiedDocumentContextParameter/ram:ID
  // Mustang EN16931 profile uses base CEN URN (without Factur-X suffix)
  profileURN:       'urn:cen.eu:en16931:2017',

  // Embedded XML attachment filename (must stay 'factur-x.xml' per spec)
  xmlFilename:      'factur-x.xml',

  // XMP metadata — fx:Version (Mustang XMPSchemaZugferd expects '1.0')
  xmpVersion:       '1.0',
  xmpNamespace:     'urn:factur-x:pdfa:CrossIndustryDocument:invoice:1p0#',
  xmpPrefix:        'fx',
  conformanceLevel: 'EN 16931',

  // PDF/A-3b
  pdfa: {
    part:        3,
    conformance: 'B',
  },
}

export default ZUGFERD
