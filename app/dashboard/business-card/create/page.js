'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function CreateBusinessCardPage() {
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
  const [preview, setPreview] = useState(false)
  const router = useRouter()

  useEffect(() => {
    loadMajstorData()
  }, [])

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
        setMajstor(majstorData)
        setFormData(prev => ({
          ...prev,
          description: majstorData.business_name || ''
        }))
      }
    } catch (error) {
      console.error('Auth error:', error)
      router.push('/login')
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
        is_active: true
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

      router.push('/dashboard/business-card?success=created')

    } catch (err) {
      console.error('Error saving business card:', err)
      setError(err.message || 'Fehler beim Speichern der Visitenkarte')
    } finally {
      setLoading(false)
    }
  }

  const colorPresets = [
    { name: 'Dunkelblau', bg: '#1e293b', text: '#ffffff' },
    { name: 'Schwarz', bg: '#000000', text: '#ffffff' },
    { name: 'Blau', bg: '#2563eb', text: '#ffffff' },
    { name: 'Grün', bg: '#059669', text: '#ffffff' },
    { name: 'Weiß', bg: '#ffffff', text: '#000000' },
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
            Erstellen Sie Ihre digitale Visitenkarte mit QR-Code für Kunden
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
            <h2 className="text-lg font-semibold text-white mb-4">Visitenkarte Details</h2>
            
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
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newService}
                    onChange={(e) => setNewService(e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="z.B. Elektroinstallation"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addService())}
                  />
                  <button
                    type="button"
                    onClick={addService}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    +
                  </button>
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
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Farbschema
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {colorPresets.map((preset, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setFormData(prev => ({
                        ...prev,
                        background_color: preset.bg,
                        text_color: preset.text
                      }))}
                      className={`aspect-square rounded-lg border-2 transition-all ${
                        formData.background_color === preset.bg
                          ? 'border-blue-400 scale-105'
                          : 'border-slate-600'
                      }`}
                      style={{ backgroundColor: preset.bg }}
                      title={preset.name}
                    >
                      <div 
                        className="w-full h-full rounded-md flex items-center justify-center text-xs font-bold"
                        style={{ color: preset.text }}
                      >
                        Aa
                      </div>
                    </button>
                  ))}
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
        </div>

        {/* Preview Section */}
        <div className="space-y-6">
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Live Vorschau</h2>
              {majstor?.slug && (
                <p className="text-xs text-slate-400">
                  majstori.de/m/{majstor.slug}
                </p>
              )}
            </div>

            {/* Business Card Preview */}
            <div className="border border-slate-600 rounded-lg p-3">
              <div 
                className="rounded-xl p-6 text-center shadow-lg"
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
                      {formData.services.map((service, index) => (
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
                    </div>
                  </div>
                )}

                {/* QR Code Placeholder */}
                <div className="bg-white/20 rounded-lg p-3 inline-block">
                  <div className="w-16 h-16 bg-white/80 rounded flex items-center justify-center text-black text-xs font-bold">
                    QR
                  </div>
                </div>
                
                <p className="text-xs opacity-70 mt-2">
                  QR-Code für Kontakt
                </p>
              </div>
            </div>

            {/* Info */}
            <div className="mt-4 bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
              <p className="text-blue-300 text-sm">
                💡 Nach dem Speichern wird ein echter QR-Code generiert
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}