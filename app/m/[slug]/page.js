'use client'
import { useState, useEffect, use } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function PublicMajstorPage({ params }) {
  const resolvedParams = use(params)
  const [majstor, setMajstor] = useState(null)
  const [businessCard, setBusinessCard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [inquiryForm, setInquiryForm] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    subject: '',
    message: '',
    images: []
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [imageUploading, setImageUploading] = useState(false)
  const [showAllImages, setShowAllImages] = useState(false)
  const router = useRouter()

  useEffect(() => {
    loadMajstorData()
  }, [resolvedParams.slug])

  const loadMajstorData = async () => {
    try {
      // Load majstor by slug
      const { data: majstorData, error: majstorError } = await supabase
        .from('majstors')
        .select('*')
        .eq('slug', resolvedParams.slug)
        .single()

      if (majstorError || !majstorData) {
        setError('Majstor nicht gefunden')
        setLoading(false)
        return
      }

      setMajstor(majstorData)

      // Load business card
      const { data: cardData } = await supabase
        .from('business_cards')
        .select('*')
        .eq('majstor_id', majstorData.id)
        .eq('is_active', true)
        .single()

      setBusinessCard(cardData)

    } catch (err) {
      console.error('Error loading majstor:', err)
      setError('Fehler beim Laden der Daten')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    setInquiryForm(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  // Kompresija slika pre upload-a
  const compressImage = (file, maxWidth = 800, quality = 0.8) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()
      
      img.onload = () => {
        let { width, height } = img
        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }
        
        canvas.width = width
        canvas.height = height
        
        ctx.drawImage(img, 0, 0, width, height)
        canvas.toBlob(resolve, 'image/jpeg', quality)
      }
      
      img.src = URL.createObjectURL(file)
    })
  }

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    // Validacija
    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        alert(`${file.name} nije slika`)
        return false
      }
      if (file.size > 10 * 1024 * 1024) {
        alert(`${file.name} je prevelika (max 10MB)`)
        return false
      }
      return true
    })

    if (validFiles.length === 0) return

    if (inquiryForm.images.length + validFiles.length > 5) {
      alert('Maximal 5 Bilder erlaubt')
      return
    }

    setImageUploading(true)
    try {
      const uploadPromises = validFiles.map(async (file, index) => {
        // Kompresuj sliku
        const compressedFile = await compressImage(file, 800, 0.8)
        const fileExt = 'jpg'
        const fileName = `inquiry_${Date.now()}_${index}.${fileExt}`
        
        const { data, error } = await supabase.storage
          .from('inquiries')
          .upload(fileName, compressedFile)

        if (error) throw error

        const { data: { publicUrl } } = supabase.storage
          .from('inquiries')
          .getPublicUrl(fileName)

        return publicUrl
      })

      const uploadedUrls = await Promise.all(uploadPromises)
      
      setInquiryForm(prev => ({
        ...prev,
        images: [...prev.images, ...uploadedUrls]
      }))
    } catch (error) {
      console.error('Upload error:', error)
      alert('Fehler beim Hochladen der Bilder')
    } finally {
      setImageUploading(false)
    }
  }

  const removeImage = async (imageUrl) => {
    try {
      // Obriši iz storage-a
      const fileName = imageUrl.split('/').pop()
      await supabase.storage
        .from('inquiries')
        .remove([fileName])
        .catch(err => console.log('Delete failed:', err))
      
      setInquiryForm(prev => ({
        ...prev,
        images: prev.images.filter(url => url !== imageUrl)
      }))
    } catch (error) {
      console.error('Error removing image:', error)
      setInquiryForm(prev => ({
        ...prev,
        images: prev.images.filter(url => url !== imageUrl)
      }))
    }
  }

  const handleSubmitInquiry = async (e) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const inquiryData = {
        majstor_id: majstor.id,
        customer_name: inquiryForm.customerName,
        customer_email: inquiryForm.customerEmail,
        customer_phone: inquiryForm.customerPhone,
        subject: inquiryForm.subject,
        message: inquiryForm.message,
        images: inquiryForm.images
      }

      // Use API route instead of direct Supabase call
      const response = await fetch('/api/inquiries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(inquiryData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to submit inquiry')
      }

      const result = await response.json()
      console.log('Inquiry submitted:', result)

      setSubmitSuccess(true)
      setInquiryForm({
        customerName: '',
        customerEmail: '',
        customerPhone: '',
        subject: '',
        message: '',
        images: []
      })

      // Auto-hide success message after 5 seconds
      setTimeout(() => {
        setSubmitSuccess(false)
      }, 5000)

    } catch (err) {
      console.error('Submit error:', err)
      alert('Fehler beim Senden der Anfrage: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const downloadVCard = () => {
    const vcard = `BEGIN:VCARD
VERSION:3.0
FN:${majstor.full_name}
ORG:${majstor.business_name || ''}
TEL:${majstor.phone || ''}
EMAIL:${majstor.email}
URL:${businessCard?.website || ''}
NOTE:${businessCard?.description || ''}
END:VCARD`

    const blob = new Blob([vcard], { type: 'text/vcard' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${majstor.full_name.replace(/\s+/g, '_')}.vcf`
    link.click()
    window.URL.revokeObjectURL(url)
  }

  // Helper funkcija za cache-busting
  const getCacheBustedUrl = (url) => {
    if (!url) return ''
    const separator = url.includes('?') ? '&' : '?'
    return `${url}${separator}cb=${Date.now()}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Laden...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Nicht gefunden</h1>
          <p className="text-slate-400">{error}</p>
        </div>
      </div>
    )
  }

  const cardBgColor = businessCard?.background_color || '#1e293b'
  const cardTextColor = businessCard?.text_color || '#ffffff'

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      
      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">
            {majstor.business_name || majstor.full_name}
          </h1>
          <button
            onClick={downloadVCard}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            📱 Kontakt speichern
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        
        {/* Business Card Display */}
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <div 
            className="rounded-xl p-8 text-center"
            style={{ 
              backgroundColor: cardBgColor,
              color: cardTextColor 
            }}
          >
            {/* Logo */}
            {businessCard?.logo_url && (
              <div className="mb-6">
                <img 
                  src={getCacheBustedUrl(businessCard.logo_url)} 
                  alt="Logo" 
                  className="w-24 h-24 mx-auto object-cover rounded-xl border-2 border-white/20" 
                  onError={(e) => {
                    console.log('Logo failed to load:', businessCard.logo_url)
                    e.target.style.display = 'none'
                  }}
                />
              </div>
            )}

            {/* Header */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold mb-2">{businessCard?.title || 'Handwerker Service'}</h1>
              <h2 className="text-xl font-semibold opacity-90">{majstor.full_name}</h2>
              {majstor.business_name && (
                <p className="text-lg opacity-80 mt-1">{majstor.business_name}</p>
              )}
            </div>

            {/* Description */}
            {businessCard?.description && (
              <p className="text-lg opacity-90 mb-6 italic leading-relaxed">{businessCard.description}</p>
            )}

            {/* Contact Info */}
            <div className="space-y-2 mb-6 text-lg">
              {majstor.phone && (
                <a href={`tel:${majstor.phone}`} className="block hover:opacity-80 transition-opacity">
                  📞 {majstor.phone}
                </a>
              )}
              <a href={`mailto:${majstor.email}`} className="block hover:opacity-80 transition-opacity">
                ✉️ {majstor.email}
              </a>
              {majstor.city && <p>📍 {majstor.city}</p>}
              {businessCard?.website && (
                <a 
                  href={businessCard.website}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-block text-blue-300 underline hover:text-blue-200 transition-colors mt-2"
                >
                  🌐 Website besuchen
                </a>
              )}
            </div>

            {/* Services */}
            {businessCard?.services && businessCard.services.length > 0 && (
              <div className="mb-6">
                <h3 className="text-xl font-semibold mb-4 opacity-90">Unsere Dienstleistungen:</h3>
                <div className="flex flex-wrap gap-3 justify-center">
                  {businessCard.services.map((service, index) => (
                    <span
                      key={index}
                      className="px-4 py-2 rounded-lg text-lg font-medium opacity-90"
                      style={{ 
                        backgroundColor: cardTextColor + '20',
                        border: `2px solid ${cardTextColor}40`
                      }}
                    >
                      {service}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Gallery - POPRAVLJENA SEKCIJA */}
        {businessCard?.gallery_images && businessCard.gallery_images.length > 0 && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
            <h3 className="text-2xl font-bold text-white mb-6 text-center">Unsere Arbeiten</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {(showAllImages ? businessCard.gallery_images : businessCard.gallery_images.slice(0, 6)).map((imageUrl, index) => (
                <div key={index} className="aspect-square group cursor-pointer">
                  <img 
                    src={getCacheBustedUrl(imageUrl)} 
                    alt={`Arbeit ${index + 1}`} 
                    className="w-full h-full object-cover rounded-lg border border-slate-600 group-hover:border-blue-500 transition-colors" 
                    onError={(e) => {
                      console.log('Gallery image failed to load:', imageUrl)
                      e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjY2NjIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkJpbGQgbmljaHQgZ2VmdW5kZW48L3RleHQ+PC9zdmc+'
                    }}
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
            
            {/* Show more button */}
            {businessCard.gallery_images.length > 6 && (
              <div className="text-center mt-6">
                <button
                  onClick={() => setShowAllImages(!showAllImages)}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {showAllImages 
                    ? 'Weniger anzeigen' 
                    : `${businessCard.gallery_images.length - 6} weitere Bilder anzeigen`
                  }
                </button>
              </div>
            )}
          </div>
        )}

        {/* Success Message */}
        {submitSuccess && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-6 text-center">
            <h3 className="text-2xl font-bold text-green-400 mb-2">✅ Anfrage gesendet!</h3>
            <p className="text-green-300">
              Vielen Dank für Ihre Anfrage. Wir melden uns schnellstmöglich bei Ihnen.
            </p>
          </div>
        )}

        {/* Inquiry Form */}
        {!submitSuccess && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8">
            <h3 className="text-3xl font-bold text-white mb-6 text-center">Kostenlose Beratung anfragen</h3>
            
            <form onSubmit={handleSubmitInquiry} className="space-y-6">
              
              {/* Contact Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Ihr Name *
                  </label>
                  <input
                    type="text"
                    name="customerName"
                    value={inquiryForm.customerName}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Max Mustermann"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    E-Mail *
                  </label>
                  <input
                    type="email"
                    name="customerEmail"
                    value={inquiryForm.customerEmail}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="max@example.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Telefon
                  </label>
                  <input
                    type="tel"
                    name="customerPhone"
                    value={inquiryForm.customerPhone}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="+49 123 456789"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Betreff *
                  </label>
                  <input
                    type="text"
                    name="subject"
                    value={inquiryForm.subject}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="z.B. Elektroinstallation"
                  />
                </div>
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Beschreibung des Problems *
                </label>
                <textarea
                  name="message"
                  value={inquiryForm.message}
                  onChange={handleInputChange}
                  required
                  rows={4}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Beschreiben Sie bitte Ihr Problem so detailliert wie möglich..."
                />
              </div>

              {/* Image Upload - POPRAVLJENA SEKCIJA */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Bilder hochladen (bis zu 5 Bilder, max 10MB pro Bild)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  disabled={imageUploading || inquiryForm.images.length >= 5}
                  className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:bg-blue-600 file:text-white hover:file:bg-blue-700 disabled:opacity-50"
                />
                
                {imageUploading && (
                  <p className="text-blue-400 text-sm mt-2">📤 Bilder werden hochgeladen...</p>
                )}
                
                {inquiryForm.images.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm text-slate-300 mb-3">Ausgewählte Bilder ({inquiryForm.images.length}/5):</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {inquiryForm.images.map((imageUrl, index) => (
                        <div key={index} className="relative group">
                          <img 
                            src={getCacheBustedUrl(imageUrl)} 
                            alt={`Upload ${index + 1}`} 
                            className="w-full h-24 object-cover rounded-lg border border-slate-600 group-hover:border-blue-500 transition-colors" 
                            onError={(e) => {
                              console.log('Uploaded image failed to load:', imageUrl)
                              e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZmY0NDQ0Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5GZWhsZXI8L3RleHQ+PC9zdmc+'
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(imageUrl)}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs hover:bg-red-600 flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity"
                            title="Bild entfernen"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting || imageUploading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-lg font-bold text-lg hover:scale-[1.02] transition-transform disabled:opacity-50"
              >
                {submitting ? '📤 Wird gesendet...' : '📧 Kostenlose Beratung anfragen'}
              </button>

              <p className="text-sm text-slate-400 text-center">
                Ihre Anfrage ist kostenlos und unverbindlich. Wir melden uns schnellstmöglich bei Ihnen.
              </p>
            </form>
          </div>
        )}

      </div>
    </div>
  )
}