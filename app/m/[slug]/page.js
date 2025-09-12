// app/m/[slug]/page.js - JEDNOSTAVNO REŠENJE
'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

export default function PublicBusinessCardPage({ params }) {
  const [businessCard, setBusinessCard] = useState(null)
  const [majstor, setMajstor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  // Gallery modal state
  const [showGalleryModal, setShowGalleryModal] = useState(false)
  
  // Inquiry form states
  const [showInquiryForm, setShowInquiryForm] = useState(false)
  const [inquiryData, setInquiryData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    service_type: '',
    description: ''
  })
  const [inquiryLoading, setInquiryLoading] = useState(false)
  const [inquirySuccess, setInquirySuccess] = useState(false)
  const [inquiryError, setInquiryError] = useState('')
  
  const inquiryFormRef = useRef(null)

  useEffect(() => {
    if (params.slug) {
      loadBusinessCard()
    }
  }, [params.slug])

  const loadBusinessCard = async () => {
    try {
      setLoading(true)
      console.log('🔍 Loading business card for slug:', params.slug)

      // Load majstor by slug
      const { data: majstorData, error: majstorError } = await supabase
        .from('majstors')
        .select('*')
        .eq('slug', params.slug)
        .eq('is_active', true)
        .single()

      if (majstorError || !majstorData) {
        console.error('❌ Majstor not found:', majstorError)
        setError('Profil nicht gefunden')
        return
      }

      setMajstor(majstorData)
      console.log('✅ Majstor loaded:', majstorData.full_name)

      // Load business card
      const { data: cardData, error: cardError } = await supabase
        .from('business_cards')
        .select('*')
        .eq('majstor_id', majstorData.id)
        .eq('is_active', true)
        .single()

      if (cardError || !cardData) {
        console.error('❌ Business card not found:', cardError)
        setError('Visitenkarte nicht gefunden')
        return
      }

      setBusinessCard(cardData)
      console.log('✅ Business card loaded')

    } catch (err) {
      console.error('❌ Unexpected error:', err)
      setError('Ein Fehler ist aufgetreten')
    } finally {
      setLoading(false)
    }
  }

  // Helper function za cache-busting
  const getCacheBustedUrl = (url) => {
    if (!url) return ''
    const separator = url.includes('?') ? '&' : '?'
    return `${url}${separator}cb=${Date.now()}`
  }

  // 🔥 FUNKCIJA ZA ČUVANJE KONTAKTA - COPY-PASTE IZ BUILDER-A
  const handleSaveContact = () => {
    if (!businessCard) return
    
    const vCardData = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${businessCard.card_name || 'Handwerker'}`,
      `ORG:${businessCard.card_business_name || ''}`,
      `TEL:${businessCard.card_phone || ''}`,
      `EMAIL:${businessCard.card_email || ''}`,
      `ADR:;;;${businessCard.card_city || ''};;;;`,
      businessCard.website ? `URL:${businessCard.website}` : '',
      'END:VCARD'
    ].filter(line => line && !line.endsWith(':'))
     .join('\n')

    const blob = new Blob([vCardData], { type: 'text/vcard;charset=utf-8' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${businessCard.card_name?.replace(/\s+/g, '_') || 'kontakt'}.vcf`
    link.click()
    window.URL.revokeObjectURL(url)
  }

  // Handle inquiry form changes
  const handleInquiryChange = (e) => {
    setInquiryData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  // Handle inquiry submission
  const handleInquirySubmit = async (e) => {
    e.preventDefault()
    setInquiryError('')
    setInquiryLoading(true)

    try {
      if (!inquiryData.customer_name.trim()) {
        throw new Error('Name ist erforderlich')
      }
      if (!inquiryData.customer_email.trim()) {
        throw new Error('E-Mail ist erforderlich')
      }
      if (!inquiryData.description.trim()) {
        throw new Error('Beschreibung ist erforderlich')
      }

      const { data, error } = await supabase
        .from('inquiries')
        .insert({
          majstor_id: majstor.id,
          customer_name: inquiryData.customer_name.trim(),
          customer_email: inquiryData.customer_email.trim(),
          customer_phone: inquiryData.customer_phone.trim() || null,
          service_type: inquiryData.service_type.trim() || null,
          description: inquiryData.description.trim(),
          status: 'new'
        })
        .select()
        .single()

      if (error) throw error

      console.log('✅ Inquiry created:', data.id)
      
      setInquirySuccess(true)
      setInquiryData({
        customer_name: '',
        customer_email: '',
        customer_phone: '',
        service_type: '',
        description: ''
      })
      
      // Hide form after 3 seconds
      setTimeout(() => {
        setShowInquiryForm(false)
        setInquirySuccess(false)
      }, 3000)

    } catch (err) {
      console.error('❌ Inquiry submission error:', err)
      setInquiryError(err.message || 'Fehler beim Senden der Anfrage')
    } finally {
      setInquiryLoading(false)
    }
  }

  // Handle inquiry button click
  const handleInquiryClick = () => {
    setShowInquiryForm(true)
    setTimeout(() => {
      inquiryFormRef.current?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      })
    }, 100)
  }

  // 🔥 IDENTIČNA PREVIEW CARD - COPY-PASTE IZ BUILDER-A
  const PreviewCard = ({ isMobile = false }) => {
    if (!businessCard) return null

    return (
      <div 
        className={`rounded-lg p-${isMobile ? '4' : '6'} text-center shadow-lg mx-auto`}
        style={{ 
          backgroundColor: businessCard.background_color || '#1e293b',
          color: businessCard.text_color || '#ffffff',
          width: '100%',
          maxWidth: isMobile ? '300px' : '400px'
        }}
      >
        {/* Logo */}
        {businessCard.logo_url && (
          <div className={`mb-${isMobile ? '3' : '4'}`}>
            <img 
              src={getCacheBustedUrl(businessCard.logo_url)} 
              alt="Logo" 
              className={`w-${isMobile ? '16 h-16' : '20 h-20'} mx-auto object-cover rounded-lg border border-white/20`}
            />
          </div>
        )}

        {/* Header - 🔥 KORISTI BUSINESS CARD PODATKE */}
        <div className={`mb-${isMobile ? '3' : '4'}`}>
          <h1 className={`text-${isMobile ? 'lg' : 'xl'} font-bold leading-tight`}>
            {businessCard.title || 'Meine Visitenkarte'}
          </h1>
          <h2 className={`text-${isMobile ? 'base' : 'lg'} font-semibold opacity-90`}>
            {businessCard.card_name}
          </h2>
          {businessCard.card_business_name && (
            <p className="text-sm opacity-80">{businessCard.card_business_name}</p>
          )}
        </div>

        {/* Description */}
        {businessCard.description && (
          <p className={`text-sm opacity-90 mb-${isMobile ? '3' : '4'} italic leading-tight`}>
            {businessCard.description}
          </p>
        )}

        {/* Contact Info - 🔥 KORISTI BUSINESS CARD PODATKE */}
        <div className={`space-y-1 mb-${isMobile ? '3' : '4'} text-sm opacity-90`}>
          {businessCard.card_phone && <p>📞 {businessCard.card_phone}</p>}
          <p>✉️ {businessCard.card_email}</p>
          {businessCard.card_city && <p>📍 {businessCard.card_city}</p>}
          {businessCard.website && (
            <a 
              href={businessCard.website}
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-300 underline hover:text-blue-200 cursor-pointer block"
            >
              🌐 Website besuchen →
            </a>
          )}
        </div>

        {/* Services */}
        {businessCard.services && businessCard.services.length > 0 && (
          <div className={`mb-${isMobile ? '3' : '4'}`}>
            <h3 className="text-sm font-semibold mb-2 opacity-90">Unsere Dienstleistungen:</h3>
            <div className="flex flex-wrap gap-2 justify-center">
              {businessCard.services.map((service, index) => (
                <span
                  key={index}
                  className="px-3 py-1 rounded-full text-xs font-medium opacity-90"
                  style={{ 
                    backgroundColor: (businessCard.text_color || '#ffffff') + '20',
                    border: `1px solid ${businessCard.text_color || '#ffffff'}40`
                  }}
                >
                  {service}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Gallery Preview */}
        {businessCard.gallery_images && businessCard.gallery_images.length > 0 && (
          <div className={`mb-${isMobile ? '4' : '5'}`}>
            <h3 className="text-sm font-semibold mb-3 opacity-90">Unsere Arbeiten:</h3>
            <div className="grid grid-cols-3 gap-2 mb-2">
              {businessCard.gallery_images.slice(0, 3).map((imageUrl, index) => (
                <img 
                  key={index} 
                  src={imageUrl} 
                  alt={`Work ${index}`} 
                  className={`w-full h-${isMobile ? '16' : '20'} object-cover rounded border border-white/20 cursor-pointer hover:opacity-75 transition-opacity`}
                  onClick={() => setShowGalleryModal(true)}
                />
              ))}
            </div>
            {businessCard.gallery_images.length > 3 && (
              <button 
                onClick={() => setShowGalleryModal(true)}
                className="text-xs underline opacity-80 hover:opacity-100"
              >
                + {businessCard.gallery_images.length - 3} weitere Bilder ansehen
              </button>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className={`mb-${isMobile ? '3' : '4'} space-y-2`}>
          {/* 🔥 KONTAKT SPEICHERN DUGME */}
          <button 
            onClick={handleSaveContact}
            className="bg-white/20 hover:bg-white/30 border border-white/40 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors w-full"
          >
            📱 Kontakt speichern
          </button>

          {/* 🔥 INQUIRY BUTTON */}
          <button 
            onClick={handleInquiryClick}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors w-full"
          >
            📧 Anfrage senden
          </button>
        </div>

        {/* 🔥 POWERED BY MAJSTORI.DE */}
        <div className="pt-2 border-t border-white/20">
          <p className="text-xs opacity-50">
            Powered by{' '}
            <a 
              href="https://majstori.de" 
              target="_blank" 
              rel="noopener noreferrer"
              className="underline hover:opacity-75"
            >
              Majstori.de
            </a>
          </p>
        </div>
      </div>
    )
  }

  // Generate page title and meta description
  const pageTitle = businessCard?.card_name 
    ? `${businessCard.card_name} - ${businessCard.card_business_name || 'Handwerker'}`
    : 'Handwerker Profil'
  
  const pageDescription = businessCard?.description 
    ? businessCard.description 
    : `Kontaktieren Sie ${businessCard?.card_name || 'unseren Handwerker'} für professionelle Dienstleistungen`

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-xl mb-4">Profil wird geladen...</div>
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    )
  }

  if (error || !businessCard) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-white mb-4">Profil nicht gefunden</h1>
          <p className="text-slate-400 mb-6">
            {error || 'Das gesuchte Profil existiert nicht oder ist nicht verfügbar.'}
          </p>
          <a 
            href="https://majstori.de" 
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Zurück zur Hauptseite
          </a>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* SEO Meta Tags */}
      <head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:type" content="profile" />
        {businessCard.logo_url && (
          <meta property="og:image" content={businessCard.logo_url} />
        )}
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="canonical" href={`https://majstori.de/m/${params.slug}`} />
      </head>

      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-8 px-4">
        <div className="max-w-2xl mx-auto space-y-8">
          
          {/* 🔥 IDENTIČNA PREVIEW KOMPONENTA */}
          <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
            <PreviewCard isMobile={false} />
          </div>

          {/* 🔥 INQUIRY FORMA - ZADRŽANA POSTOJEĆA */}
          {showInquiryForm && (
            <div 
              ref={inquiryFormRef}
              className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6"
            >
              <h2 className="text-2xl font-bold text-white mb-2">Anfrage senden</h2>
              <p className="text-slate-400 mb-6">
                Kontaktieren Sie {businessCard.card_name} direkt für ein Angebot oder weitere Informationen.
              </p>

              {inquirySuccess && (
                <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">✅</span>
                    <div>
                      <p className="text-green-400 font-semibold">Anfrage erfolgreich gesendet!</p>
                      <p className="text-green-300 text-sm">
                        {businessCard.card_name} wird sich schnellstmöglich bei Ihnen melden.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {inquiryError && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-red-400">{inquiryError}</p>
                </div>
              )}

              <form onSubmit={handleInquirySubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Ihr Name *
                    </label>
                    <input
                      type="text"
                      name="customer_name"
                      value={inquiryData.customer_name}
                      onChange={handleInquiryChange}
                      required
                      className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Max Mustermann"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      E-Mail Adresse *
                    </label>
                    <input
                      type="email"
                      name="customer_email"
                      value={inquiryData.customer_email}
                      onChange={handleInquiryChange}
                      required
                      className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="max@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Telefonnummer (optional)
                    </label>
                    <input
                      type="tel"
                      name="customer_phone"
                      value={inquiryData.customer_phone}
                      onChange={handleInquiryChange}
                      className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="+49 123 456789"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Art der Dienstleistung
                    </label>
                    <select
                      name="service_type"
                      value={inquiryData.service_type}
                      onChange={handleInquiryChange}
                      className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Bitte wählen...</option>
                      {businessCard.services?.map((service, index) => (
                        <option key={index} value={service}>{service}</option>
                      ))}
                      <option value="Andere">Andere</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Beschreibung Ihres Anliegens *
                  </label>
                  <textarea
                    name="description"
                    value={inquiryData.description}
                    onChange={handleInquiryChange}
                    required
                    rows={4}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Beschreiben Sie bitte Ihr Anliegen oder den gewünschten Service..."
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowInquiryForm(false)}
                    className="px-6 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    disabled={inquiryLoading}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg font-semibold hover:from-green-700 hover:to-green-800 transition-all disabled:opacity-50"
                  >
                    {inquiryLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Wird gesendet...
                      </span>
                    ) : (
                      '📧 Anfrage senden'
                    )}
                  </button>
                </div>
              </form>

              <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <span className="text-blue-400 text-lg">ℹ️</span>
                  <div className="text-sm">
                    <p className="text-blue-300 font-medium">Datenschutz-Hinweis</p>
                    <p className="text-blue-200/80 text-xs">
                      Ihre Daten werden nur zur Bearbeitung Ihrer Anfrage verwendet und nicht an Dritte weitergegeben.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="text-center text-slate-500 text-sm">
            <p>
              Erstellt mit{' '}
              <a 
                href="https://majstori.de" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline"
              >
                Majstori.de
              </a>
              {' '}- Die Handwerker-Plattform
            </p>
          </div>

          {/* Gallery Modal */}
          {showGalleryModal && businessCard.gallery_images && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
              <div className="bg-slate-800 rounded-xl max-w-4xl max-h-[90vh] overflow-y-auto p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-white">Alle Arbeiten</h3>
                  <button
                    onClick={() => setShowGalleryModal(false)}
                    className="text-slate-400 hover:text-white text-2xl"
                  >
                    ×
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {businessCard.gallery_images.map((imageUrl, index) => (
                    <img 
                      key={index} 
                      src={imageUrl} 
                      alt={`Work ${index}`} 
                      className="w-full h-32 object-cover rounded-lg" 
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}