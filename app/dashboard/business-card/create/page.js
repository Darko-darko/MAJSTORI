'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function BusinessCardPage() {
  const [formData, setFormData] = useState({
    title: 'Meine Visitenkarte',
    description: '',
    services: [],
    background_color: '#1e293b',
    text_color: '#ffffff',
  })
  const [newService, setNewService] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [majstor, setMajstor] = useState(null)
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const cardRef = useRef(null)
  const router = useRouter()

  useEffect(() => {
    loadMajstorData()
    loadExistingCard()
  }, [])

  useEffect(() => {
    if (majstor?.slug) {
      console.log('Majstor loaded with slug:', majstor.slug)
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
        console.log('Majstor data loaded:', majstorData)
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
        })
      }
    } catch (error) {
      console.log('No existing card found')
    }
  }

  const generateQRCode = async (url) => {
    try {
      // Simple QR code generation using online API as fallback
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`
      setQrCodeUrl(qrUrl)
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

    } catch (err) {
      console.error('Error saving business card:', err)
      setError(err.message || 'Fehler beim Speichern der Visitenkarte')
    } finally {
      setLoading(false)
    }
  }

  const downloadBusinessCard = async () => {
    if (!cardRef.current) return

    try {
      // Import html2canvas dynamically
      const html2canvas = (await import('html2canvas')).default
      
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true
      })
      
      const link = document.createElement('a')
      link.download = `visitenkarte-${majstor?.full_name?.replace(/\s+/g, '-').toLowerCase() || 'majstor'}.png`
      link.href = canvas.toDataURL()
      link.click()
    } catch (error) {
      console.error('Error downloading business card:', error)
      alert('Fehler beim Herunterladen der Visitenkarte')
    }
  }

  const downloadQRCode = () => {
    if (!qrCodeUrl) return

    const link = document.createElement('a')
    link.download = `qr-code-${majstor?.slug || 'majstor'}.png`
    link.href = qrCodeUrl
    link.target = '_blank'
    link.click()
    
    // Clean up
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
          <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">QR Visitenkarte</h1>
          <p className="text-slate-400">
            Erstellen und verwalten Sie Ihre digitale Visitenkarte
          </p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex items-center text-slate-400 hover:text-white transition-colors"
        >
          ← Zurück zum Dashboard
        </Link>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Form Section */}
        <div className="space-y-6">
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Visitenkarte bearbeiten</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Titel der Visitenkarte
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="z.B. Meine Visitenkarte"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Beschreibung / Slogan
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={2}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="z.B. Ihr zuverlässiger Elektriker in München"
                />
              </div>

              {/* Services */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Dienstleistungen
                </label>
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
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addService())}
                    />
                    <button
                      type="button"
                      onClick={addService}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                      Hinzufügen
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

              {/* Color Scheme */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Hintergrundfarbe
                  </label>
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
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Textfarbe
                  </label>
                  <input
                    type="color"
                    value={formData.text_color}
                    onChange={(e) => setFormData(prev => ({...prev, text_color: e.target.value}))}
                    className="w-full h-10 rounded border border-slate-600 bg-slate-900"
                  />
                </div>
              </div>

              {/* Error Display */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-semibold hover:scale-[1.02] transition-transform disabled:opacity-50"
              >
                {loading ? 'Speichern...' : 'Visitenkarte speichern'}
              </button>
            </form>
          </div>

          {/* Download Actions */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Downloads</h3>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={downloadBusinessCard}
                className="flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors"
              >
                📱 Visitenkarte
              </button>
              <button
                onClick={downloadQRCode}
                disabled={!qrCodeUrl}
                className="flex items-center justify-center gap-2 bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                📱 QR Code
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-2 text-center">
              Herunterladen als PNG für Druck oder digitale Nutzung
            </p>
          </div>
        </div>

        {/* Preview Section */}
        <div className="space-y-6">
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Live Vorschau</h2>
              {majstor?.slug && (
                <a
                  href={`/m/${majstor.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  majstori.de/m/{majstor.slug} →
                </a>
              )}
            </div>

            {/* Business Card Preview */}
            <div className="border border-slate-600 rounded-lg p-4 bg-white">
              <div 
                ref={cardRef}
                className="rounded-xl p-6 text-center shadow-lg max-w-sm mx-auto"
                style={{ 
                  backgroundColor: formData.background_color,
                  color: formData.text_color 
                }}
              >
                {/* Header */}
                <div className="mb-4">
                  <h1 className="text-xl font-bold mb-1">{formData.title}</h1>
                  <h2 className="text-lg font-semibold opacity-90">{majstor.full_name}</h2>
                  {majstor.business_name && (
                    <p className="text-sm opacity-80">{majstor.business_name}</p>
                  )}
                </div>

                {/* Description */}
                {formData.description && (
                  <p className="text-sm opacity-90 mb-4 italic">
                    {formData.description}
                  </p>
                )}

                {/* Contact Info */}
                <div className="space-y-1 mb-4 text-xs opacity-90">
                  {majstor.phone && <p>📞 {majstor.phone}</p>}
                  <p>📧 {majstor.email}</p>
                  {majstor.city && <p>📍 {majstor.city}</p>}
                </div>

                {/* Services */}
                {formData.services.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold mb-2 opacity-90">Dienstleistungen:</h3>
                    <div className="flex flex-wrap gap-1 justify-center">
                      {formData.services.slice(0, 3).map((service, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 rounded-md text-xs font-medium opacity-80"
                          style={{ 
                            backgroundColor: formData.text_color + '20',
                            border: `1px solid ${formData.text_color}40`
                          }}
                        >
                          {service}
                        </span>
                      ))}
                      {formData.services.length > 3 && (
                        <span className="text-xs opacity-70">+{formData.services.length - 3} mehr</span>
                      )}
                    </div>
                  </div>
                )}

                {/* QR Code */}
                <div className="inline-block p-2 bg-white rounded-lg">
                  {qrCodeUrl ? (
                    <img src={qrCodeUrl} alt="QR Code" className="w-16 h-16" />
                  ) : (
                    <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center text-black text-xs font-bold">
                      QR
                    </div>
                  )}
                </div>
                
                <p className="text-xs opacity-70 mt-2">
                  QR-Code für Kontakt & Anfragen
                </p>
              </div>
            </div>

            {/* Info */}
            <div className="mt-4 bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
              <p className="text-blue-300 text-sm">
                💡 QR-Code führt zur öffentlichen Seite majstori.de/m/{majstor.slug}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Install html2canvas notice */}
      <script dangerouslySetInnerHTML={{
        __html: `
          if (typeof window !== 'undefined' && !window.html2canvas) {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
            document.head.appendChild(script);
          }
        `
      }} />
    </div>
  )
}