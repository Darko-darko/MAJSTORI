// app/m/[slug]/page.js - COMPLETE WITH SUBSCRIPTION LOGIC + TURNSTILE BOT PROTECTION
'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useSubscription } from '@/lib/hooks/useSubscription'
import { Turnstile } from '@marsidev/react-turnstile' // 🔥 TURNSTILE: Bot protection

export default function PublicBusinessCardPage({ params }) {
  const [businessCard, setBusinessCard] = useState(null)
  const [majstor, setMajstor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)

  // Gallery modal state
  const [showGalleryModal, setShowGalleryModal] = useState(false)
  
  // Inquiry form states
  const [showInquiryFormModal, setShowInquiryFormModal] = useState(false)
  const [inquiryData, setInquiryData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    customer_address: '',
    service_type: '',
    description: '',
    urgency: 'normal',
    preferred_contact: 'email'
  })
  const [inquiryLoading, setInquiryLoading] = useState(false)
  const [inquirySuccess, setInquirySuccess] = useState(false)
  const [inquiryError, setInquiryError] = useState('')
  
  // 🔥 TURNSTILE: Bot protection state
  const [turnstileToken, setTurnstileToken] = useState('')
  
  // Photo upload states
  const [uploadedImages, setUploadedImages] = useState([])
  const [imageUploading, setImageUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  
  const inquiryFormRef = useRef(null)
  const imageInputRef = useRef(null)

  const [hasCamera, setHasCamera] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Subscription logic for majstor
  const { hasFeatureAccess, plan, isFreemium, loading: subscriptionLoading } = useSubscription(majstor?.id)

  // Check if customer inquiries feature is available
  const canReceiveInquiries = hasFeatureAccess('customer_inquiries')

  useEffect(() => {
    // Detect mobile device
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent))
    }
    
    // Detect camera availability
    const checkCamera = async () => {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' } 
          })
          setHasCamera(true)
          stream.getTracks().forEach(track => track.stop())
        } else {
          setHasCamera(false)
        }
      } catch (error) {
        setHasCamera(false)
      }
    }

    checkMobile()
    checkCamera()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

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

  // Save contact to phone
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

  // Image compression
  const compressImage = (file, maxWidth = 1200, quality = 0.8) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()
      
      img.onload = () => {
        let { width, height } = img
        
        if (width > maxWidth || height > maxWidth) {
          if (width > height) {
            height = (height * maxWidth) / width
            width = maxWidth
          } else {
            width = (width * maxWidth) / height
            height = maxWidth
          }
        }
        
        canvas.width = width
        canvas.height = height
        
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(img, 0, 0, width, height)
        
        canvas.toBlob(resolve, 'image/jpeg', quality)
      }
      
      img.src = URL.createObjectURL(file)
    })
  }

  // Photo upload
  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    console.log('📷 Starting photo upload:', files.length, 'files')

    const validFiles = files.filter((file, index) => {
      if (!file.type.startsWith('image/')) {
        alert(`❌ ${file.name} ist keine Bilddatei`)
        return false
      }
      if (file.size > 10 * 1024 * 1024) {
        alert(`❌ ${file.name} ist zu groß (max 10MB)`)
        return false
      }
      return true
    })

    if (validFiles.length === 0) {
      console.log('❌ No valid files to upload')
      return
    }

    if (uploadedImages.length + validFiles.length > 5) {
      alert('⚠️ Maximal 5 Bilder erlaubt')
      return
    }

    setImageUploading(true)
    setUploadProgress(0)
    setInquiryError('')

    try {
      console.log('🔧 Processing', validFiles.length, 'images for majstor:', majstor.id)

      const uploadPromises = validFiles.map(async (file, index) => {
        try {
          const progressIncrement = 100 / validFiles.length
          setUploadProgress(prev => Math.min(prev + progressIncrement * 0.3, 95))
          
          console.log(`📤 Compressing image ${index + 1}:`, file.name)
          
          const compressedFile = await compressImage(file, 1200, 0.85)
          
          if (!compressedFile) {
            throw new Error(`Failed to compress ${file.name}`)
          }

          const fileExt = 'jpg'
          const timestamp = Date.now()
          const randomId = Math.random().toString(36).substring(2, 8)
          const fileName = `${majstor.id}/${timestamp}_${randomId}.${fileExt}`
          
          console.log(`☁️ Uploading to inquiries bucket:`, fileName)
          
          const { data, error } = await supabase.storage
            .from('inquiries')
            .upload(fileName, compressedFile, {
              cacheControl: '3600',
              upsert: false
            })

          if (error) {
            console.error('❌ Upload error for', file.name, ':', error)
            throw new Error(`Upload fehlgeschlagen für ${file.name}: ${error.message}`)
          }

          console.log('✅ Upload successful:', data.path)

          const { data: { publicUrl } } = supabase.storage
            .from('inquiries')
            .getPublicUrl(fileName)

          if (!publicUrl) {
            throw new Error(`Failed to get public URL for ${file.name}`)
          }

          setUploadProgress(prev => Math.min(prev + progressIncrement * 0.7, 100))

          return {
            url: publicUrl,
            filename: file.name,
            uploadPath: fileName,
            size: compressedFile.size,
            originalSize: file.size
          }

        } catch (uploadError) {
          console.error('❌ Individual upload failed:', uploadError)
          throw uploadError
        }
      })

      console.log('⏳ Waiting for all uploads to complete...')
      const uploadResults = await Promise.all(uploadPromises)
      
      console.log('✅ All uploads successful:', uploadResults.length, 'images')
      
      setUploadedImages(prev => [...prev, ...uploadResults])
      setUploadProgress(100)

      setTimeout(() => setUploadProgress(0), 1500)

    } catch (err) {
      console.error('💥 Photo upload error:', err)
      setInquiryError(`Fehler beim Hochladen der Bilder: ${err.message}`)
      setUploadProgress(0)
    } finally {
      setImageUploading(false)
      
      if (imageInputRef.current) {
        imageInputRef.current.value = ''
      }
    }
  }

  // Remove uploaded image
  const removeUploadedImage = async (imageIndex) => {
    try {
      const imageToRemove = uploadedImages[imageIndex]
      console.log('🗑️ Removing image:', imageToRemove.filename)
      
      if (imageToRemove.uploadPath) {
        const { error } = await supabase.storage
          .from('inquiries')
          .remove([imageToRemove.uploadPath])
        
        if (error) {
          console.warn('⚠️ Storage removal failed:', error.message)
        } else {
          console.log('✅ Image removed from storage')
        }
      }
      
      setUploadedImages(prev => prev.filter((_, index) => index !== imageIndex))
      
    } catch (error) {
      console.error('❌ Error removing image:', error)
      setUploadedImages(prev => prev.filter((_, index) => index !== imageIndex))
    }
  }

  // 🔥 TURNSTILE: Handle inquiry submission with bot protection
  const handleInquirySubmit = async (e) => {
    e.preventDefault()
    setInquiryError('')
    setInquiryLoading(true)

    try {
      console.log('📤 Submitting inquiry for majstor:', majstor.id)

      // 🔥 TURNSTILE: Validate token is present
      if (!turnstileToken) {
        throw new Error('Bitte warten Sie auf die Sicherheitsprüfung')
      }

      if (!inquiryData.customer_name.trim()) {
        throw new Error('Name ist erforderlich')
      }
      if (!inquiryData.customer_email.trim()) {
        throw new Error('E-Mail ist erforderlich')
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(inquiryData.customer_email)) {
        throw new Error('Ungültige E-Mail-Adresse')
      }

      const inquiryPayload = {
        majstor_id: majstor.id,
        customer_name: inquiryData.customer_name.trim(),
        customer_email: inquiryData.customer_email.trim(),
        customer_phone: inquiryData.customer_phone.trim() || null,
        customer_address: inquiryData.customer_address.trim() || null,
        service_type: inquiryData.service_type.trim() || null,
        description: inquiryData.description.trim(),
        urgency: inquiryData.urgency,
        preferred_contact: inquiryData.preferred_contact,
        source: 'business_card',
        subject: inquiryData.service_type.trim() || 'Kundenanfrage',
        message: inquiryData.description.trim() || '-',
        images: uploadedImages.map(img => img.url),
        photo_urls: uploadedImages.map(img => img.url),
        turnstileToken: turnstileToken // 🔥 TURNSTILE: Send token to API
      }

      console.log('📋 Submitting with payload:', {
        customer: inquiryPayload.customer_name,
        service: inquiryPayload.service_type,
        urgency: inquiryPayload.urgency,
        images: inquiryPayload.images.length,
        hasTurnstileToken: !!turnstileToken
      })

      const response = await fetch('/api/inquiries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(inquiryPayload)
      })

      const result = await response.json()

      if (!response.ok) {
        console.error('❌ API error:', result)
        throw new Error(result.error || `HTTP ${response.status}`)
      }

      if (!result.success) {
        throw new Error(result.error || 'Unknown API error')
      }

      console.log('✅ Inquiry submitted successfully:', result.inquiry?.id)

      setTimeout(() => {
        setInquirySuccess(true)
        setShowSuccessPopup(true)
      }, 100)

      setTimeout(() => {
        setInquiryData({
          customer_name: '',
          customer_email: '',
          customer_phone: '',
          customer_address: '',
          service_type: '',
          description: '',
          urgency: 'normal',
          preferred_contact: 'email'
        })
        setUploadedImages([])
        setTurnstileToken('') // 🔥 TURNSTILE: Reset token
      }, 200)

      setTimeout(() => {
        setInquirySuccess(false)
        setShowInquiryFormModal(false)
        setShowSuccessPopup(false)
      }, 5000)

    } catch (err) {
      console.error('💥 Inquiry submission error:', err)
      
      let errorMessage = err.message || 'Ein unerwarteter Fehler ist aufgetreten'
      
      if (err.message?.includes('permission denied') || err.message?.includes('RLS')) {
        errorMessage = 'Berechtigung verweigert - bitte versuchen Sie es später erneut'
      } else if (err.message?.includes('connection') || err.message?.includes('network')) {
        errorMessage = 'Netzwerkfehler - bitte überprüfen Sie Ihre Internetverbindung'
      } else if (err.message?.includes('timeout')) {
        errorMessage = 'Zeitüberschreitung - bitte versuchen Sie es erneut'
      } else if (err.message?.includes('404')) {
        errorMessage = 'Service nicht verfügbar - bitte kontaktieren Sie den Support'
      } else if (err.message?.includes('Security verification')) {
        errorMessage = 'Sicherheitsprüfung fehlgeschlagen - bitte laden Sie die Seite neu'
      }
      
      setInquiryError(errorMessage)
    } finally {
      setInquiryLoading(false)
    }
  }

  // Handle inquiry button click
  const handleInquiryClick = () => {
    setShowInquiryFormModal(true)
    setInquiryError('')
    setInquirySuccess(false)
    
    setTimeout(() => {
      inquiryFormRef.current?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      })
    }, 100)
  }

  // Preview Card Component with Subscription Logic
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

        {/* Header */}
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

        {/* Contact Info */}
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

        {/* Action Buttons with Subscription Logic */}
        <div className={`mb-${isMobile ? '3' : '4'} space-y-2`}>
          {/* Save Contact Button - Always visible */}
          <button 
            onClick={handleSaveContact}
            className="bg-white/20 hover:bg-white/30 border border-white/40 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors w-full"
          >
            📱 Kontakt speichern
          </button>

          {/* Inquiry Button - Available for ALL users (Freemium + PRO) */}
          {!subscriptionLoading && (
            <button 
              onClick={handleInquiryClick}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors w-full shadow-lg hover:shadow-green-500/25"
            >
              🔧 Anfrage senden
            </button>
          )}
        </div>

        {/* Powered By */}
        <div className="pt-2 border-t border-white/20">
          <p className="text-xs opacity-50">
            Powered by{' '}
            <a 
              href="https://pro-meister.de" 
              target="_blank" 
              rel="noopener noreferrer"
              className="underline hover:opacity-75"
            >
              pro-meister.de
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
            href="https://pro-meister.de" 
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
        <link rel="canonical" href={`https://pro-meister.de/m/${params.slug}`} />
      </head>

      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-8 px-4" suppressHydrationWarning>
        <div className="max-w-2xl mx-auto space-y-8">
          
          {/* Business Card Display */}
          <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
            <PreviewCard isMobile={false} />
          </div>

          {/* 🔥 INQUIRY FORM - Only show for subscribed majstors */}
          {showInquiryFormModal && (
            <div 
              ref={inquiryFormRef}
              className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-white">Anfrage senden</h2>
                <button
                  onClick={() => setShowInquiryFormModal(false)}
                  className="text-slate-400 hover:text-white text-2xl transition-colors"
                  title="Schließen"
                >
                  ×
                </button>
              </div>
              
              <p className="text-slate-400 mb-6">
                Kontaktieren Sie <strong className="text-white">{businessCard.card_name}</strong> direkt für ein Angebot oder weitere Informationen.
              </p>

              {/* Success Message */}
              {inquirySuccess && (
                <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">✅</span>
                    <div>
                      <p className="text-green-400 font-semibold">Anfrage erfolgreich gesendet!</p>
                      <p className="text-green-300 text-sm mt-1">
                        {businessCard.card_name} wird sich schnellstmöglich bei Ihnen melden.
                      </p>
                      {uploadedImages.length > 0 && (
                        <p className="text-green-300 text-sm mt-1">
                          📷 {uploadedImages.length} Foto{uploadedImages.length > 1 ? 's' : ''} wurden mitgesendet.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {inquiryError && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-red-400 text-xl">⚠️</span>
                    <div>
                      <p className="text-red-400 font-semibold">Fehler beim Senden</p>
                      <p className="text-red-300 text-sm mt-1">{inquiryError}</p>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleInquirySubmit} className="space-y-6">
                
                {/* Basic Customer Info */}
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
                      className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
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
                      className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
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
                      className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="+49 123 456789"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Adresse (optional)
                    </label>
                    <input
                      type="text"
                      name="customer_address"
                      value={inquiryData.customer_address}
                      onChange={handleInquiryChange}
                      className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="Straße 123, 10115 Berlin"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Ihre Adresse hilft uns bei der Angebotserstellung
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Art der Dienstleistung *
                    </label>
                    <input 
                      type="text"
                      name="service_type"
                      value={inquiryData.service_type}
                      onChange={handleInquiryChange}
                      placeholder="Kurze Beschreibung des Problems..."
                      className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      autoComplete="off"
                      required
                    />
                  </div>
                </div>

                {/* Urgency and Contact Preference */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Dringlichkeit
                    </label>
                    <select
                      name="urgency"
                      value={inquiryData.urgency}
                      onChange={handleInquiryChange}
                      className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    >
                      <option value="low">⬇️ Niedrig - Zeit lassen</option>
                      <option value="normal">➡️ Normal - in den nächsten Tagen</option>
                      <option value="high">⬆️ Hoch - schnellstmöglich</option>
                      <option value="emergency">🚨 Notfall - sofort!</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Bevorzugter Kontakt
                    </label>
                    <select
                      name="preferred_contact"
                      value={inquiryData.preferred_contact}
                      onChange={handleInquiryChange}
                      className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    >
                      <option value="email">📧 E-Mail</option>
                      <option value="phone">📞 Telefon</option>
                      <option value="both">📧📞 E-Mail und Telefon</option>
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Beschreibung Ihres Anliegens
                  </label>
                  <textarea
                    name="description"
                    value={inquiryData.description}
                    onChange={handleInquiryChange}
                    rows={4}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                    placeholder="Beschreiben Sie bitte Ihr Anliegen oder den gewünschten Service detailliert..."
                  />
                </div>

                {/* Photo Upload Section */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    📷 Fotos hinzufügen (optional)
                  </label>
                  <p className="text-xs text-slate-400 mb-3">
                    Zeigen Sie uns das Problem oder Ihre Wünsche - max. 5 Bilder, je max. 10MB
                  </p>
                  
                  <div className="space-y-4">
                    {/* Smart Photo Upload UI */}
                    {isMobile && hasCamera ? (
                      // Mobile + Camera: Dual buttons
                      <div className="grid grid-cols-2 gap-3">
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            multiple
                            onChange={handlePhotoUpload}
                            disabled={imageUploading || uploadedImages.length >= 5}
                            className="hidden"
                          />
                          <div className={`flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg transition-colors ${
                            imageUploading || uploadedImages.length >= 5
                              ? 'border-slate-600 bg-slate-700/30 text-slate-500 cursor-not-allowed'
                              : 'border-blue-500 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20'
                          }`}>
                            <span className="text-3xl">📸</span>
                            <div className="text-center">
                              <p className="font-medium text-sm">Foto</p>
                              <p className="text-xs opacity-75">aufnehmen</p>
                            </div>
                          </div>
                        </label>

                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handlePhotoUpload}
                            disabled={imageUploading || uploadedImages.length >= 5}
                            className="hidden"
                          />
                          <div className={`flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg transition-colors ${
                            imageUploading || uploadedImages.length >= 5
                              ? 'border-slate-600 bg-slate-700/30 text-slate-500 cursor-not-allowed'
                              : 'border-green-500 bg-green-500/10 text-green-300 hover:bg-green-500/20'
                          }`}>
                            <span className="text-3xl">🖼️</span>
                            <div className="text-center">
                              <p className="font-medium text-sm">Galerie</p>
                              <p className="text-xs opacity-75">auswählen</p>
                            </div>
                          </div>
                        </label>
                      </div>
                    ) : (
                      // Desktop or No Camera: Single button
                      <div className="w-full">
                        <label className="cursor-pointer block">
                          <input
                            ref={imageInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handlePhotoUpload}
                            disabled={imageUploading || uploadedImages.length >= 5}
                            className="hidden"
                          />
                          <div className={`flex items-center justify-center gap-3 p-4 border-2 border-dashed rounded-lg transition-colors ${
                            imageUploading || uploadedImages.length >= 5
                              ? 'border-slate-600 bg-slate-700/30 text-slate-500 cursor-not-allowed'
                              : 'border-green-500 bg-green-500/10 text-green-300 hover:bg-green-500/20'
                          }`}>
                            <span className="text-3xl">🖼️</span>
                            <div className="text-center">
                              <p className="font-medium">Bilder auswählen</p>
                              <p className="text-xs opacity-75">
                                {isMobile ? 'Aus Galerie wählen' : 'Dateien vom Computer auswählen'}
                              </p>
                            </div>
                          </div>
                        </label>
                      </div>
                    )}

                    {/* Upload Progress */}
                    {imageUploading && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                          <span className="text-sm text-green-400">Bilder werden hochgeladen... {Math.round(uploadProgress)}%</span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                          <div 
                            className="bg-gradient-to-r from-green-500 to-green-400 h-2 transition-all duration-500 ease-out"
                            style={{ width: `${uploadProgress}%` }}
                          ></div>
                        </div>
                      </div>
                    )}

                    {/* Uploaded Images Preview */}
                    {uploadedImages.length > 0 && (
                      <div>
                        <p className="text-sm text-slate-300 mb-3 flex items-center gap-2">
                          <span className="text-green-400">📎</span>
                          Hochgeladene Bilder ({uploadedImages.length}/5):
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {uploadedImages.map((image, index) => (
                            <div key={index} className="relative group">
                              <img 
                                src={image.url} 
                                alt={`Upload ${index}`} 
                                className="w-full h-24 object-cover rounded-lg border border-slate-600 group-hover:border-slate-500 transition-colors" 
                              />
                              <button
                                type="button"
                                onClick={() => removeUploadedImage(index)}
                                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full text-xs flex items-center justify-center transition-colors shadow-lg"
                                title="Bild entfernen"
                              >
                                ×
                              </button>
                              <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-1 rounded-b-lg">
                                <p className="truncate" title={image.filename}>
                                  {image.filename}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Info Box */}
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <span className="text-blue-400 text-sm">💡</span>
                        <div>
                          <p className="text-blue-300 text-sm">
                            <strong>Fototipps:</strong>
                          </p>
                          <ul className="text-blue-200 text-xs mt-1 space-y-1">
                            {isMobile && hasCamera && (
                              <li>📸 <strong>Foto aufnehmen:</strong> Öffnet Ihre Kamera für neue Fotos</li>
                            )}
                            <li>🖼️ <strong>{isMobile ? 'Aus Galerie:' : 'Dateien:'}</strong> {isMobile ? 'Wählen Sie vorhandene Bilder aus' : 'Wählen Sie Bilder vom Computer'}</li>
                            <li>📐 Mehrere Winkel helfen bei der Problemdiagnose</li>
                            <li>💡 Gute Beleuchtung macht Details sichtbar</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 🔥 TURNSTILE: Bot Protection Widget */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-3">
                    🛡️ Sicherheitsprüfung
                  </label>
                  <div className="flex justify-center">
                    <Turnstile
                      siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'}
                      onSuccess={(token) => setTurnstileToken(token)}
                      onError={() => setInquiryError('Sicherheitsprüfung fehlgeschlagen. Bitte laden Sie die Seite neu.')}
                      onExpire={() => setTurnstileToken('')}
                      theme="dark"
                      size="compact"
                    />
                  </div>
                </div>

                {/* Submit Buttons */}
                <div className="flex gap-3 pt-6 border-t border-slate-700">
                  <button
                    type="button"
                    onClick={() => setShowInquiryFormModal(false)}
                    disabled={inquiryLoading}
                    className="px-6 py-3 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors disabled:opacity-50 font-medium"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    disabled={inquiryLoading || imageUploading || !turnstileToken}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-lg font-semibold transition-all disabled:opacity-50 shadow-lg hover:shadow-green-500/25"
                  >
                    {inquiryLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Wird gesendet...
                      </span>
                    ) : (
                      <>
                        🔧 Anfrage senden
                        {uploadedImages.length > 0 && (
                          <span className="text-sm opacity-90 ml-2">
                            (+{uploadedImages.length} Foto{uploadedImages.length > 1 ? 's' : ''})
                          </span>
                        )}
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Privacy Notice */}
              <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <div className="flex items-start gap-3">
                  <span className="text-blue-400 text-lg flex-shrink-0">ℹ️</span>
                  <div className="text-sm">
                    <p className="text-blue-300 font-medium mb-1">Datenschutz-Hinweis</p>
                    <p className="text-blue-200/90 text-xs leading-relaxed">
                      Ihre Daten und hochgeladenen Bilder werden nur zur Bearbeitung Ihrer Anfrage verwendet 
                      und nicht an Dritte weitergegeben. Bilder werden sicher in unserem System gespeichert und können 
                      jederzeit auf Anfrage gelöscht werden.
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
                href="https://pro-meister.de" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline transition-colors"
              >
                pro-meister.de
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
                    className="text-slate-400 hover:text-white text-2xl transition-colors"
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
                      className="w-full h-32 object-cover rounded-lg hover:scale-105 transition-transform cursor-pointer" 
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Success Popup Override */}
        {showSuccessPopup && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999]">
            <div className="bg-green-600 text-white p-8 rounded-xl text-center shadow-2xl">
              <div className="text-6xl mb-4">✅</div>
              <h3 className="text-2xl font-bold mb-2">Erfolgreich gesendet!</h3>
              <p className="text-sm opacity-90">Ihre Anfrage wurde übermittelt.</p>
            </div>
          </div>
        )}
      </div>
    </>
  )
}