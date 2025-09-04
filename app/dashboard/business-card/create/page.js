'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import html2canvas from 'html2canvas'
import QRCode from 'qrcode'
import Link from 'next/link'

export default function CreateBusinessCardPage() {
  // Helper function za cache-busting (definisano na početku)
  const getCacheBustedUrl = (url) => {
    if (!url) return ''
    const separator = url.includes('?') ? '&' : '?'
    return `${url}${separator}cb=${Date.now()}`
  }

  const [formData, setFormData] = useState({
    title: 'Meine Visitenkarte',
    description: '',
    services: [],
    background_color: '#1e293b',
    text_color: '#ffffff',
    website: '',
    logo_url: '',
    gallery_images: []
  })
  const [newService, setNewService] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [majstor, setMajstor] = useState(null)
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [logoUploading, setLogoUploading] = useState(false)
  const [galleryUploading, setGalleryUploading] = useState(false)
  const [forceImageRefresh, setForceImageRefresh] = useState(0)
  const [showGalleryModal, setShowGalleryModal] = useState(false)
  const [showPrintModal, setShowPrintModal] = useState(false)
  const logoInputRef = useRef(null)
  const galleryInputRef = useRef(null)
  const router = useRouter()

  // Print formats
  const printFormats = [
    { name: 'QR Nalepnice - Klein', size: '50x50mm', width: 189, height: 189 },
    { name: 'QR Nalepnice - Mittel', size: '70x70mm', width: 264, height: 264 },
    { name: 'QR Nalepnice - Groß', size: '100x100mm', width: 378, height: 378 },
    { name: 'Business Card', size: '85x55mm', width: 323, height: 204 }
  ]

  useEffect(() => {
    loadMajstorData()
    loadExistingCard()
  }, [])

  useEffect(() => {
    if (majstor?.slug) {
      generateQRCode()
    }
  }, [majstor])

  const loadMajstorData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: majstorData, error } = await supabase
        .from('majstors')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) {
        console.error('Error loading majstor:', error)
      } else {
        // Auto-generate slug if missing
        if (!majstorData.slug && majstorData.full_name) {
          const slug = majstorData.full_name
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, '')
            .substring(0, 50)
          
          const { error: updateError } = await supabase
            .from('majstors')
            .update({ slug })
            .eq('id', user.id)
          
          if (!updateError) {
            majstorData.slug = slug
          }
        }
        
        setMajstor(majstorData)
      }
    } catch (error) {
      console.error('Auth error:', error)
      router.push('/login')
    }
  }

  const loadExistingCard = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: existingCard } = await supabase
        .from('business_cards')
        .select('*')
        .eq('majstor_id', user.id)
        .single()

      if (existingCard) {
        setFormData({
          title: existingCard.title || 'Meine Visitenkarte',
          description: existingCard.description || '',
          services: existingCard.services || [],
          background_color: existingCard.background_color || '#1e293b',
          text_color: existingCard.text_color || '#ffffff',
          website: existingCard.website || '',
          logo_url: existingCard.logo_url || '',
          gallery_images: existingCard.gallery_images || []
        })
      }
    } catch (error) {
      console.log('No existing card found')
    }
  }

  const generateQRCode = async () => {
    try {
      if (!majstor?.slug) return
      
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://majstori.de'
      const fullUrl = `${baseUrl}/m/${majstor.slug}`
      
      const qrDataUrl = await QRCode.toDataURL(fullUrl, {
        width: 1024,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })
      
      setQrCodeUrl(qrDataUrl)
      
    } catch (error) {
      console.error('Error generating QR code:', error)
    }
  }

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const addService = () => {
    if (newService.trim() && !formData.services.includes(newService.trim())) {
      setFormData(prev => ({
        ...prev,
        services: [...prev.services, newService.trim()]
      }))
      setNewService('')
    }
  }

  const removeService = (service) => {
    setFormData(prev => ({
      ...prev,
      services: prev.services.filter(s => s !== service)
    }))
  }

  const removeLogo = async () => {
    try {
      // Briši logo iz storage-a
      if (formData.logo_url && majstor?.id) {
        const cleanUrl = formData.logo_url.split('?')[0]
        const urlParts = cleanUrl.split('/')
        const fileName = urlParts.slice(-2).join('/')
        
        await supabase.storage
          .from('business-cards')
          .remove([fileName])
      }
      
      setFormData(prev => ({ ...prev, logo_url: '' }))
      setForceImageRefresh(Date.now())
      
      if (logoInputRef.current) {
        logoInputRef.current.value = ''
      }
    } catch (error) {
      console.error('Error removing logo:', error)
      setFormData(prev => ({ ...prev, logo_url: '' }))
      setForceImageRefresh(Date.now())
    }
  }

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

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('Bitte wählen Sie eine Bilddatei aus')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('Datei zu groß. Maximum 10MB erlaubt.')
      return
    }

    setLogoUploading(true)
    try {
      // Prvo obriši stari logo
      if (formData.logo_url && majstor?.id) {
        const oldUrl = formData.logo_url.split('?')[0]
        const oldFileName = oldUrl.split('/').slice(-2).join('/')
        await supabase.storage
          .from('business-cards')
          .remove([oldFileName])
          .catch(err => console.log('Old logo removal failed:', err))
      }

      const compressedFile = await compressImage(file, 400, 0.9)
      const fileExt = 'jpg'
      const fileName = `${majstor.id}/logo_${Date.now()}.${fileExt}`
      
      const { data, error } = await supabase.storage
        .from('business-cards')
        .upload(fileName, compressedFile)

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage
        .from('business-cards')
        .getPublicUrl(fileName)

      setFormData(prev => ({ ...prev, logo_url: publicUrl }))
      setForceImageRefresh(Date.now())
      
    } catch (error) {
      console.error('Logo upload error:', error)
      alert('Fehler beim Hochladen des Logos')
    } finally {
      setLogoUploading(false)
    }
  }

  const handleGalleryUpload = async (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        alert(`${file.name} ist keine Bilddatei`)
        return false
      }
      if (file.size > 10 * 1024 * 1024) {
        alert(`${file.name} ist zu groß (max 10MB)`)
        return false
      }
      return true
    })

    if (validFiles.length === 0) return

    if (formData.gallery_images.length + validFiles.length > 10) {
      alert('Maximum 10 Galerie-Bilder erlaubt')
      return
    }

    setGalleryUploading(true)
    try {
      const uploadPromises = validFiles.map(async (file, index) => {
        const compressedFile = await compressImage(file, 800, 0.8)
        const fileExt = 'jpg'
        const fileName = `${majstor.id}/gallery/${Date.now()}_${index}.${fileExt}`
        
        const { data, error } = await supabase.storage
          .from('business-cards')
          .upload(fileName, compressedFile)

        if (error) throw error

        const { data: { publicUrl } } = supabase.storage
          .from('business-cards')
          .getPublicUrl(fileName)

        return publicUrl
      })

      const uploadedUrls = await Promise.all(uploadPromises)
      
      setFormData(prev => ({
        ...prev,
        gallery_images: [...prev.gallery_images, ...uploadedUrls]
      }))
    } catch (error) {
      console.error('Gallery upload error:', error)
      alert('Fehler beim Hochladen der Galerie-Bilder')
    } finally {
      setGalleryUploading(false)
      if (galleryInputRef.current) {
        galleryInputRef.current.value = ''
      }
    }
  }

  const removeGalleryImage = async (imageUrl) => {
    try {
      const urlParts = imageUrl.split('/')
      const fileName = urlParts.slice(-2).join('/')
      
      await supabase.storage
        .from('business-cards')
        .remove([fileName])
        .catch(err => console.log('Gallery image removal failed:', err))
      
      setFormData(prev => ({
        ...prev,
        gallery_images: prev.gallery_images.filter(url => url !== imageUrl)
      }))
      
      if (galleryInputRef.current) {
        galleryInputRef.current.value = ''
      }
    } catch (error) {
      console.error('Error removing gallery image:', error)
      setFormData(prev => ({
        ...prev,
        gallery_images: prev.gallery_images.filter(url => url !== imageUrl)
      }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: existing } = await supabase
        .from('business_cards')
        .select('id')
        .eq('majstor_id', user.id)
        .single()

      const cardData = {
        majstor_id: user.id,
        ...formData,
        is_active: true,
        qr_code_url: qrCodeUrl
      }

      let result
      if (existing) {
        result = await supabase
          .from('business_cards')
          .update(cardData)
          .eq('id', existing.id)
          .select()
          .single()
      } else {
        result = await supabase
          .from('business_cards')
          .insert(cardData)
          .select()
          .single()
      }

      if (result.error) {
        throw result.error
      }

      alert('Visitenkarte erfolgreich gespeichert!')
      await loadExistingCard()

    } catch (err) {
      console.error('Error saving business card:', err)
      setError(err.message || 'Fehler beim Speichern der Visitenkarte')
    } finally {
      setLoading(false)
    }
  }

// SAVRŠENO CENTRISANI Print layout
  const downloadPrintCard = async (format) => {
    try {
      console.log('Starting print download for format:', format)
      
      const isSquare = format.width === format.height
      const isLarge = format.width > 300
      const isSmall = format.width < 250
      const isBusinessCard = format.width > format.height
      
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      const scale = 3
      canvas.width = format.width * scale
      canvas.height = format.height * scale
      ctx.scale(scale, scale)
      
      // Bela pozadina
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, format.width, format.height)
      
      const centerX = format.width / 2
      const centerY = format.height / 2
      
      const drawCenteredText = (text, x, y, fontSize, fontWeight = 'normal', color = '#000000') => {
        ctx.font = `${fontWeight} ${fontSize}px Arial`
        ctx.fillStyle = color
        ctx.textAlign = 'center'
        ctx.fillText(text, x, y)
      }
      
      // Izračunaj ukupnu visinu sadržaja da možeš centrirati
      let totalHeight = 0
      let logoHeight = 0
      let nameHeight = 0
      let businessHeight = 0
      let descHeight = 0
      let qrHeight = 0
      let ctaHeight = 0
      let contactHeight = 0
      
      // Računaj visine
      if (formData.logo_url) {
        logoHeight = isSmall ? 30 : isLarge ? 45 : 35
        totalHeight += logoHeight + 8
      }
      
      nameHeight = isSmall ? 14 : isLarge ? 18 : 16
      totalHeight += nameHeight + 4
      
      if (majstor.business_name && !isSmall) {
        businessHeight = isLarge ? 12 : 10
        totalHeight += businessHeight + 6
      }
      
      if (formData.description && isLarge) {
        descHeight = 10
        totalHeight += descHeight + 8
      }
      
      // QR kod - glavni element
      qrHeight = isBusinessCard ? 
        Math.min(format.height - 40, 50) : // Business card - ograniči QR
        (isSmall ? Math.min(format.width - 40, 80) : 
         isLarge ? Math.min(format.width - 60, 100) : 
         Math.min(format.width - 50, 85))
      
      totalHeight += qrHeight + 8
      
      ctaHeight = isSmall ? 8 : isLarge ? 11 : 9
      totalHeight += ctaHeight + 4
      
      if (!isSmall) {
        contactHeight = isLarge ? 8 : 7
        totalHeight += contactHeight
      }
      
      // Početna Y pozicija za centrisanje
      let startY = centerY - totalHeight / 2
      let currentY = startY
      
      // Logo
      if (formData.logo_url) {
        try {
          const logoImg = new Image()
          logoImg.crossOrigin = 'anonymous'
          
          await new Promise((resolve) => {
            logoImg.onload = () => {
              const logoSize = isSmall ? 25 : isLarge ? 40 : 30
              ctx.drawImage(logoImg, centerX - logoSize/2, currentY, logoSize, logoSize)
              resolve()
            }
            logoImg.onerror = resolve
            logoImg.src = getCacheBustedUrl(formData.logo_url)
          })
          
          currentY += logoHeight + 8
        } catch (error) {
          console.log('Logo failed to load')
        }
      }
      
      // Ime - glavno
      drawCenteredText(
        majstor.full_name || 'Handwerker', 
        centerX, 
        currentY + nameHeight, 
        nameHeight, 
        'bold'
      )
      currentY += nameHeight + 4
      
      // Business name
      if (majstor.business_name && !isSmall) {
        drawCenteredText(
          majstor.business_name, 
          centerX, 
          currentY + businessHeight, 
          businessHeight, 
          '500'
        )
        currentY += businessHeight + 6
      }
      
      // Opis (samo za velike)
      if (formData.description && isLarge) {
        const description = formData.description.length > 60 ? 
          formData.description.substring(0, 60) + '...' : 
          formData.description
        drawCenteredText(
          description, 
          centerX, 
          currentY + descHeight, 
          descHeight, 
          'normal', 
          '#666666'
        )
        currentY += descHeight + 8
      }
      
      // QR kod - centrisan
      if (qrCodeUrl) {
        try {
          const qrImg = new Image()
          await new Promise((resolve) => {
            qrImg.onload = () => {
              ctx.drawImage(qrImg, centerX - qrHeight/2, currentY, qrHeight, qrHeight)
              resolve()
            }
            qrImg.onerror = resolve
            qrImg.src = qrCodeUrl
          })
        } catch (error) {
          console.log('QR code failed to load')
        }
      }
      currentY += qrHeight + 8
      
      // Call to action
      drawCenteredText(
        'Scannen für Kontakt & Anfragen', 
        centerX, 
        currentY + ctaHeight, 
        ctaHeight, 
        'bold'
      )
      currentY += ctaHeight + 4
      
      // Kontakt info - samo ako nije mali format
      if (!isSmall && currentY < format.height - 20) {
        ctx.fillStyle = '#666666'
        
        if (isLarge) {
          // Za velike formate - više informacija
          if (majstor.phone && majstor.email) {
            drawCenteredText(
              `${majstor.phone} • ${majstor.email}`, 
              centerX, 
              currentY + contactHeight, 
              contactHeight
            )
            if (majstor.city) {
              drawCenteredText(
                majstor.city, 
                centerX, 
                currentY + contactHeight * 2 + 2, 
                contactHeight - 1
              )
            }
          } else {
            drawCenteredText(
              majstor.email || majstor.phone || '', 
              centerX, 
              currentY + contactHeight, 
              contactHeight
            )
          }
        } else {
          // Za srednje formate - jedna linija
          drawCenteredText(
            majstor.email || majstor.phone || '', 
            centerX, 
            currentY + contactHeight, 
            contactHeight
          )
        }
      }
      
      // Download
      const link = document.createElement('a')
      link.download = `print-visitenkarte-${format.size}-${majstor?.full_name?.replace(/\s+/g, '-').toLowerCase() || 'majstor'}.png`
      link.href = canvas.toDataURL('image/png', 1.0)
      link.click()
      
      setShowPrintModal(false)
      console.log('Print download completed successfully')
      
    } catch (error) {
      console.error('Print download failed:', error)
      alert('Download fehlgeschlagen. Bitte versuchen Sie es erneut.')
    }
  }
  const downloadQRCode = () => {
    if (!qrCodeUrl) return

    const link = document.createElement('a')
    link.download = `qr-code-${majstor?.slug || 'majstor'}.png`
    link.href = qrCodeUrl
    link.target = '_blank'
    link.click()
    link.remove()
  }

  const colorPresets = [
    '#1e293b', '#000000', '#2563eb', '#059669', '#dc2626', 
    '#7c3aed', '#ea580c', '#0891b2', '#be123c', '#4338ca'
  ]

  if (!majstor) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white text-xl">Laden...</div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">QR Visitenkarte erstellen</h1>
          <p className="text-slate-400">
            Erstellen Sie Ihr komplettes digitales Profil für Kunden
          </p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex items-center text-slate-400 hover:text-white transition-colors"
        >
          ← Zurück zum Dashboard
        </Link>
      </div>

      {/* Mobile Layout */}
      <div className="block lg:hidden space-y-6">
        {/* Mobile Form */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Profil bearbeiten</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Titel</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Website (optional)</label>
                <input
                  type="url"
                  name="website"
                  value={formData.website}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://ihre-website.de"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Beschreibung</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={2}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Logo Upload */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Logo Upload</label>
              <div className="space-y-2">
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                />
                {formData.logo_url && (
                  <div className="flex items-center gap-2">
                    <img 
                      src={getCacheBustedUrl(formData.logo_url)} 
                      alt="Logo" 
                      className="w-12 h-12 object-cover rounded" 
                      key={forceImageRefresh}
                    />
                    <button
                      type="button"
                      onClick={removeLogo}
                      className="text-red-400 text-sm hover:text-red-300"
                    >
                      Entfernen
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Gallery Upload */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Galerie - Ihre Arbeiten</label>
              <div className="space-y-2">
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleGalleryUpload}
                  className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:bg-green-600 file:text-white hover:file:bg-green-700"
                />
                {formData.gallery_images.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {formData.gallery_images.map((imageUrl, index) => (
                      <div key={index} className="relative">
                        <img src={imageUrl} alt={`Gallery ${index}`} className="w-full h-16 object-cover rounded" />
                        <button
                          type="button"
                          onClick={() => removeGalleryImage(imageUrl)}
                          className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Services */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Dienstleistungen</label>
              <div className="space-y-2 mb-2">
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      setNewService(e.target.value)
                      e.target.value = ''
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="">Wählen Sie eine Dienstleistung...</option>
                  <option value="Elektroinstallation">Elektroinstallation</option>
                  <option value="Wasserinstallation">Wasserinstallation</option>
                  <option value="Heizung & Klima">Heizung & Klima</option>
                  <option value="Renovierung">Renovierung</option>
                  <option value="Malerarbeiten">Malerarbeiten</option>
                  <option value="Fliesenverlegung">Fliesenverlegung</option>
                  <option value="Dacharbeiten">Dacharbeiten</option>
                  <option value="Garten & Landschaft">Garten & Landschaft</option>
                  <option value="Fenster & Türen">Fenster & Türen</option>
                  <option value="Sicherheitstechnik">Sicherheitstechnik</option>
                </select>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newService}
                    onChange={(e) => setNewService(e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="Oder eigene Dienstleistung eingeben..."
                  />
                  <button
                    type="button"
                    onClick={addService}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.services.map((service, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-blue-600/20 border border-blue-500/30 rounded-md text-blue-300 text-xs"
                  >
                    {service}
                    <button
                      type="button"
                      onClick={() => removeService(service)}
                      className="text-blue-300 hover:text-white ml-1"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Colors */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Hintergrund</label>
                <div className="space-y-2">
                  <input
                    type="color"
                    value={formData.background_color}
                    onChange={(e) => setFormData(prev => ({...prev, background_color: e.target.value}))}
                    className="w-full h-10 rounded border border-slate-600 bg-slate-900"
                  />
                  <div className="flex gap-1 flex-wrap">
                    {colorPresets.map((color, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setFormData(prev => ({...prev, background_color: color}))}
                        className={`w-6 h-6 rounded border-2 ${
                          formData.background_color === color ? 'border-white' : 'border-slate-600'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Text</label>
                <input
                  type="color"
                  value={formData.text_color}
                  onChange={(e) => setFormData(prev => ({...prev, text_color: e.target.value}))}
                  className="w-full h-10 rounded border border-slate-600 bg-slate-900"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-semibold hover:scale-[1.02] transition-transform disabled:opacity-50"
            >
              {loading ? 'Speichern...' : 'Profil speichern'}
            </button>
          </form>
        </div>

        {/* Mobile Preview */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <h2 className="text-lg font-semibold text-white mb-3">Öffentliches Profil Vorschau</h2>
          
          <div className="border border-slate-600 rounded-lg p-3 bg-white overflow-hidden">
            <div 
              className="rounded-lg p-4 text-center shadow-lg mx-auto"
              style={{ 
                backgroundColor: formData.background_color,
                color: formData.text_color,
                width: '100%',
                maxWidth: '300px'
              }}
            >
              {/* Logo */}
              {formData.logo_url && (
                <div className="mb-3">
                  <img 
                    src={getCacheBustedUrl(formData.logo_url)} 
                    alt="Logo" 
                    className="w-16 h-16 mx-auto object-cover rounded-lg border border-white/20" 
                    key={forceImageRefresh}
                  />
                </div>
              )}

              {/* Header */}
              <div className="mb-3">
                <h1 className="text-lg font-bold leading-tight">{formData.title}</h1>
                <h2 className="text-base font-semibold opacity-90">{majstor.full_name}</h2>
                {majstor.business_name && (
                  <p className="text-sm opacity-80">{majstor.business_name}</p>
                )}
              </div>

              {/* Description */}
              {formData.description && (
                <p className="text-sm opacity-90 mb-3 italic leading-tight">{formData.description}</p>
              )}

              {/* Contact Info */}
              <div className="space-y-1 mb-3 text-sm opacity-90">
                {majstor.phone && <p>📞 {majstor.phone}</p>}
                <p>✉️ {majstor.email}</p>
                {majstor.city && <p>📍 {majstor.city}</p>}
                {formData.website && (
  <a 
    href={formData.website}
    target="_blank" 
    rel="noopener noreferrer"
    className="text-blue-300 underline hover:text-blue-200 cursor-pointer"
  >
    🌐 Website besuchen →
  </a>
)}
              </div>

              {/* Services */}
              {formData.services.length > 0 && (
                <div className="mb-3">
                  <h3 className="text-sm font-semibold mb-2 opacity-90">Unsere Dienstleistungen:</h3>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {formData.services.map((service, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 rounded-full text-xs font-medium opacity-90"
                        style={{ 
                          backgroundColor: formData.text_color + '20',
                          border: `1px solid ${formData.text_color}40`
                        }}
                      >
                        {service}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Gallery Preview */}
              {formData.gallery_images.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-semibold mb-3 opacity-90">Unsere Arbeiten:</h3>
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    {formData.gallery_images.slice(0, 3).map((imageUrl, index) => (
                      <img 
                        key={index} 
                        src={imageUrl} 
                        alt={`Work ${index}`} 
                        className="w-full h-16 object-cover rounded border border-white/20" 
                      />
                    ))}
                  </div>
                  {formData.gallery_images.length > 3 && (
                    <button 
                      onClick={() => setShowGalleryModal(true)}
                      className="text-xs underline opacity-80 hover:opacity-100"
                    >
                      + {formData.gallery_images.length - 3} weitere Bilder ansehen
                    </button>
                  )}
                </div>
              )}

              {/* Contact Button */}
              <div className="mt-4 pt-3 border-t border-white/20">
                <button 
                  className="w-full py-3 px-4 rounded-lg font-semibold text-sm transition-colors"
                  style={{
                    backgroundColor: formData.text_color,
                    color: formData.background_color
                  }}
                >
                  📧 Anfrage senden
                </button>
                <p className="text-xs opacity-70 mt-2">
                  Scannen Sie unseren QR-Code für direkten Kontakt
                </p>
              </div>
            </div>
          </div>

          {majstor?.slug && (
            <div className="mt-3 text-center">
              <a
                href={`/m/${majstor.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 text-xs"
              >
                Öffentliche Seite: majstori.de/m/{majstor.slug} →
              </a>
            </div>
          )}
        </div>

        {/* Mobile Downloads */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Downloads</h3>
          <div className="space-y-3">
            <button
              onClick={() => setShowPrintModal(true)}
              className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors"
            >
              🖨️ Print Visitenkarte
            </button>
            <button
              onClick={downloadQRCode}
              disabled={!qrCodeUrl}
              className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              📱 QR Code
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden lg:grid lg:grid-cols-2 gap-6">
        {/* Desktop Form */}
        <div className="space-y-6">
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Profil bearbeiten</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Basic Info - Desktop */}
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Titel</label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Website (optional)</label>
                  <input
                    type="url"
                    name="website"
                    value={formData.website}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://ihre-website.de"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Beschreibung</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={2}
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Logo Upload - Desktop */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Logo Upload</label>
                <div className="space-y-2">
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                  />
                  {formData.logo_url && (
                    <div className="flex items-center gap-2">
                      <img 
                        src={getCacheBustedUrl(formData.logo_url)} 
                        alt="Logo" 
                        className="w-12 h-12 object-cover rounded" 
                        key={forceImageRefresh}
                      />
                      <button
                        type="button"
                        onClick={removeLogo}
                        className="text-red-400 text-sm hover:text-red-300"
                      >
                        Entfernen
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Gallery Upload - Desktop */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Galerie - Ihre Arbeiten</label>
                <div className="space-y-2">
                  <input
                    ref={galleryInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleGalleryUpload}
                    className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:bg-green-600 file:text-white hover:file:bg-green-700"
                  />
                  {formData.gallery_images.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {formData.gallery_images.map((imageUrl, index) => (
                        <div key={index} className="relative">
                          <img src={imageUrl} alt={`Gallery ${index}`} className="w-full h-16 object-cover rounded" />
                          <button
                            type="button"
                            onClick={() => removeGalleryImage(imageUrl)}
                            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Services - Desktop */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Dienstleistungen</label>
                <div className="space-y-2 mb-2">
                  <select
                    value=""
                    onChange={(e) => {
                      if (e.target.value) {
                        setNewService(e.target.value)
                        e.target.value = ''
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="">Wählen Sie eine Dienstleistung...</option>
                    <option value="Elektroinstallation">Elektroinstallation</option>
                    <option value="Wasserinstallation">Wasserinstallation</option>
                    <option value="Heizung & Klima">Heizung & Klima</option>
                    <option value="Renovierung">Renovierung</option>
                    <option value="Malerarbeiten">Malerarbeiten</option>
                    <option value="Fliesenverlegung">Fliesenverlegung</option>
                    <option value="Dacharbeiten">Dacharbeiten</option>
                    <option value="Garten & Landschaft">Garten & Landschaft</option>
                    <option value="Fenster & Türen">Fenster & Türen</option>
                    <option value="Sicherheitstechnik">Sicherheitstechnik</option>
                  </select>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newService}
                      onChange={(e) => setNewService(e.target.value)}
                      className="flex-1 px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder="Oder eigene Dienstleistung eingeben..."
                    />
                    <button
                      type="button"
                      onClick={addService}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.services.map((service, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-blue-600/20 border border-blue-500/30 rounded-md text-blue-300 text-xs"
                    >
                      {service}
                      <button
                        type="button"
                        onClick={() => removeService(service)}
                        className="text-blue-300 hover:text-white ml-1"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Colors - Desktop */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Hintergrund</label>
                  <div className="space-y-2">
                    <input
                      type="color"
                      value={formData.background_color}
                      onChange={(e) => setFormData(prev => ({...prev, background_color: e.target.value}))}
                      className="w-full h-10 rounded border border-slate-600 bg-slate-900"
                    />
                    <div className="flex gap-1 flex-wrap">
                      {colorPresets.map((color, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => setFormData(prev => ({...prev, background_color: color}))}
                          className={`w-6 h-6 rounded border-2 ${
                            formData.background_color === color ? 'border-white' : 'border-slate-600'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Text</label>
                  <input
                    type="color"
                    value={formData.text_color}
                    onChange={(e) => setFormData(prev => ({...prev, text_color: e.target.value}))}
                    className="w-full h-10 rounded border border-slate-600 bg-slate-900"
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-semibold hover:scale-[1.02] transition-transform disabled:opacity-50"
              >
                {loading ? 'Speichern...' : 'Profil speichern'}
              </button>
            </form>
          </div>

          {/* Desktop Downloads */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Downloads</h3>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setShowPrintModal(true)}
                className="flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors"
              >
                🖨️ Print
              </button>
              <button
                onClick={downloadQRCode}
                disabled={!qrCodeUrl}
                className="flex items-center justify-center gap-2 bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                📱 QR Code
              </button>
            </div>
          </div>
        </div>

        {/* Desktop Preview */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Öffentliches Profil Vorschau</h2>
          
          <div className="border border-slate-600 rounded-lg p-4 bg-white overflow-hidden">
            <div 
              className="rounded-lg p-6 text-center shadow-lg mx-auto"
              style={{ 
                backgroundColor: formData.background_color,
                color: formData.text_color,
                maxWidth: '400px'
              }}
            >
              {/* Logo - Desktop */}
              {formData.logo_url && (
                <div className="mb-4">
                  <img 
                    src={getCacheBustedUrl(formData.logo_url)} 
                    alt="Logo" 
                    className="w-20 h-20 mx-auto object-cover rounded-lg border border-white/20" 
                    key={forceImageRefresh}
                  />
                </div>
              )}

              {/* Header - Desktop */}
              <div className="mb-4">
                <h1 className="text-xl font-bold leading-tight">{formData.title}</h1>
                <h2 className="text-lg font-semibold opacity-90">{majstor.full_name}</h2>
                {majstor.business_name && (
                  <p className="text-sm opacity-80">{majstor.business_name}</p>
                )}
              </div>

              {/* Description - Desktop */}
              {formData.description && (
                <p className="text-sm opacity-90 mb-4 italic leading-tight">{formData.description}</p>
              )}

              {/* Contact Info - Desktop */}
              <div className="space-y-1 mb-4 text-sm opacity-90">
                {majstor.phone && <p>📞 {majstor.phone}</p>}
                <p>✉️ {majstor.email}</p>
                {majstor.city && <p>📍 {majstor.city}</p>}
               {formData.website && (
  <a 
    href={formData.website}
    target="_blank" 
    rel="noopener noreferrer"
    className="text-blue-300 underline hover:text-blue-200 cursor-pointer"
  >
    🌐 Website besuchen →
  </a>
)}
              </div>

              {/* Services - Desktop */}
              {formData.services.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-semibold mb-3 opacity-90">Unsere Dienstleistungen:</h3>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {formData.services.map((service, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 rounded-full text-xs font-medium opacity-90"
                        style={{ 
                          backgroundColor: formData.text_color + '20',
                          border: `1px solid ${formData.text_color}40`
                        }}
                      >
                        {service}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Gallery Preview - Desktop */}
              {formData.gallery_images.length > 0 && (
                <div className="mb-5">
                  <h3 className="text-sm font-semibold mb-3 opacity-90">Unsere Arbeiten:</h3>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {formData.gallery_images.slice(0, 3).map((imageUrl, index) => (
                      <img 
                        key={index} 
                        src={imageUrl} 
                        alt={`Work ${index}`} 
                        className="w-full h-20 object-cover rounded border border-white/20" 
                      />
                    ))}
                  </div>
                  {formData.gallery_images.length > 3 && (
                    <button 
                      onClick={() => setShowGalleryModal(true)}
                      className="text-xs underline opacity-80 hover:opacity-100"
                    >
                      + {formData.gallery_images.length - 3} weitere Bilder ansehen
                    </button>
                  )}
                </div>
              )}

              {/* Contact Button - Desktop */}
              <div className="mt-5 pt-4 border-t border-white/20">
                <button 
                  className="w-full py-3 px-4 rounded-lg font-semibold text-sm transition-colors"
                  style={{
                    backgroundColor: formData.text_color,
                    color: formData.background_color
                  }}
                >
                  📧 Anfrage senden
                </button>
                <p className="text-xs opacity-70 mt-2">
                  Scannen Sie unseren QR-Code für direkten Kontakt
                </p>
              </div>
            </div>
          </div>

          {majstor?.slug && (
            <div className="mt-4 text-center">
              <a
                href={`/m/${majstor.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 text-sm"
              >
                Öffentliche Seite ansehen: majstori.de/m/{majstor.slug} →
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Gallery Modal */}
      {showGalleryModal && (
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
              {formData.gallery_images.map((imageUrl, index) => (
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

      {/* Print Modal */}
      {showPrintModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">Print Format wählen</h3>
              <button
                onClick={() => setShowPrintModal(false)}
                className="text-slate-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>
            <div className="space-y-3">
              {printFormats.map((format, index) => (
                <button
                  key={index}
                  onClick={() => downloadPrintCard(format)}
                  className="w-full flex justify-between items-center p-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-left transition-colors"
                >
                  <div>
                    <div className="text-white font-medium">{format.name}</div>
                    <div className="text-slate-400 text-sm">{format.size}</div>
                  </div>
                  <div className="text-blue-400">📄</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}