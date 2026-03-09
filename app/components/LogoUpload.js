// app/components/LogoUpload.js
'use client'
import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'

export default function LogoUpload({ 
  majstor, 
  onLogoUpdate, 
  context = 'general',
  className = '' 
}) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [previewUrl, setPreviewUrl] = useState(null)
  const [uploadedUrl, setUploadedUrl] = useState(null)
  const fileInputRef = useRef(null)

  const labels = {
    general: {
      title: 'Geschäftslogo / Profilbild',
      description: 'Erscheint als Ihr Profilbild und auf allen Geschäftsdokumenten',
      buttonText: 'Logo hochladen'
    },
    invoice: {
      title: 'Logo für Rechnungen und Angebote', 
      description: 'Wird im Kopf aller PDF-Dokumente angezeigt',
      buttonText: 'Rechnungslogo hochladen'
    }
  }

  const currentLabel = labels[context]

  const handleFileSelect = async (e) => {
    console.log('🔥 LOGO UPLOAD: handleFileSelect called')
    
    const file = e.target.files?.[0]
    console.log('📁 LOGO UPLOAD: Selected file:', file?.name, file?.size, file?.type)
    
    if (!file) {
      console.log('❌ LOGO UPLOAD: No file selected')
      return
    }

    // Show preview immediately
    setPreviewUrl(URL.createObjectURL(file))

    console.log('🔍 LOGO UPLOAD: Majstor object:', majstor)

    // Validation
    if (!file.type.match(/^image\/(png|jpe?g)$/)) {
      console.log('❌ LOGO UPLOAD: Invalid file type:', file.type)
      setError('Nur PNG und JPG Dateien sind erlaubt')
      return
    }

    if (file.size > 2 * 1024 * 1024) { // 2MB
      console.log('❌ LOGO UPLOAD: File too large:', file.size)
      setError('Datei ist zu groß (max. 2MB)')
      return
    }

    console.log('✅ LOGO UPLOAD: Validation passed')
    setError('')
    setUploading(true)

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${majstor.id}/business-logo.${fileExt}`
      const filePath = fileName

      console.log('📤 LOGO UPLOAD: Upload path:', filePath)
      console.log('🏪 LOGO UPLOAD: Supabase client:', !!supabase)

      // Upload to Supabase Storage
      console.log('🚀 LOGO UPLOAD: Starting storage upload...')
      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type
        })

      console.log('📤 LOGO UPLOAD: Storage upload result:', { uploadError })
      
      if (uploadError) {
        console.error('❌ LOGO UPLOAD: Storage upload failed:', uploadError)
        throw uploadError
      }

      // Get public URL with cache-busting timestamp
      const { data: { publicUrl } } = supabase.storage
        .from('logos')
        .getPublicUrl(filePath)

      const publicUrlWithTs = `${publicUrl}?t=${Date.now()}`
      console.log('📷 Logo uploaded, public URL:', publicUrlWithTs)

      // Update majstor record
      const { error: updateError } = await supabase
        .from('majstors')
        .update({
          business_logo_url: publicUrlWithTs,
          updated_at: new Date().toISOString()
        })
        .eq('id', majstor.id)

      if (updateError) throw updateError

      console.log('✅ Majstor updated with logo URL')
      setUploadedUrl(publicUrlWithTs)
      setPreviewUrl(null)
      onLogoUpdate && onLogoUpdate(publicUrlWithTs)

      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

    } catch (err) {
      console.error('Logo upload error:', err)
      setError('Upload fehlgeschlagen: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  const handleRemoveLogo = async () => {
    if (!majstor.business_logo_url) return

    const confirmed = confirm('Möchten Sie das Logo wirklich entfernen?')
    if (!confirmed) return

    setUploading(true)
    setError('')

    try {
      const { error: updateError } = await supabase
        .from('majstors')
        .update({ 
          business_logo_url: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', majstor.id)

      if (updateError) throw updateError

      console.log('✅ Logo removed from profile')
      setUploadedUrl(null)
      onLogoUpdate && onLogoUpdate(null)

    } catch (err) {
      console.error('Logo removal error:', err)
      setError('Entfernen fehlgeschlagen: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className={`bg-slate-800/50 border border-slate-700 rounded-lg p-6 ${className}`}>
      <h4 className="text-white font-semibold mb-2">{currentLabel.title}</h4>
      <p className="text-slate-400 text-sm mb-4">{currentLabel.description}</p>
      
      {/* Current Logo Display / Preview */}
      {(majstor.business_logo_url || uploadedUrl || previewUrl) && (
        <div className="mb-4">
          <p className="text-slate-300 text-sm mb-2">{previewUrl ? 'Vorschau:' : 'Aktuelles Logo:'}</p>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-lg p-2 flex items-center justify-center" style={{backgroundColor: '#ffffff', border: '1.5px solid #94a3b8'}}>
              <img
                src={previewUrl || uploadedUrl || majstor.business_logo_url}
                alt="Logo"
                className="max-w-full max-h-full object-contain"
                onError={(e) => { e.target.style.display = 'none' }}
              />
            </div>
            <div>
              <p className="text-white text-sm">{previewUrl ? 'Wird hochgeladen...' : 'Logo aktiv'}</p>
              {!previewUrl && (
                <button
                  onClick={handleRemoveLogo}
                  disabled={uploading}
                  className="text-red-400 hover:text-red-300 text-sm disabled:opacity-50"
                >
                  Entfernen
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Upload Interface */}
      <div className="space-y-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg"
          onChange={handleFileSelect}
          disabled={uploading}
          className="hidden"
        />

        <button
         type="button"
onClick={(e) => {
  e.preventDefault()
  e.stopPropagation()
  fileInputRef.current?.click()
}}
          disabled={uploading}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {uploading ? (
            <>
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
              Wird hochgeladen...
            </>
          ) : (
            <>
              📷 {currentLabel.buttonText}
            </>
          )}
        </button>

        {/* Requirements */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
          <p className="text-blue-300 text-sm font-medium mb-1">Anforderungen:</p>
          <ul className="text-blue-200 text-xs space-y-1">
            <li>• Dateiformate: PNG, JPG</li>
            <li>• Maximale Größe: 2MB</li>
            <li>• Empfohlen: Quadratisches Format (z.B. 200x200px)</li>
            <li>• Transparenter Hintergrund (PNG) für bestes Ergebnis</li>
          </ul>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}
      </div>
    </div>
  )
}