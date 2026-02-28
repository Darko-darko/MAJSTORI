// app/components/AvatarUpload.js
'use client'
import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'

// Client-side resize: vraća Blob (JPEG, max 400x400)
function resizeImage(file, maxSize = 400) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      let { width, height } = img
      if (width > height) {
        if (width > maxSize) { height = Math.round(height * maxSize / width); width = maxSize }
      } else {
        if (height > maxSize) { width = Math.round(width * maxSize / height); height = maxSize }
      }
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d').drawImage(img, 0, 0, width, height)
      canvas.toBlob(resolve, 'image/jpeg', 0.85)
    }
    img.onerror = reject
    img.src = url
  })
}

export default function AvatarUpload({ majstor, onAvatarUpdate }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const galleryRef = useRef(null)
  const cameraRef = useRef(null)

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Nur Bilddateien sind erlaubt')
      return
    }

    setError('')
    setUploading(true)

    try {
      // Resize na max 400x400 JPEG
      const resized = await resizeImage(file)
      const filePath = `${majstor.id}/avatar.jpg`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, resized, { upsert: true, contentType: 'image/jpeg' })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      // Cache busting — novi timestamp znači browser ne koristi staru sliku
      const avatarUrl = `${publicUrl}?t=${Date.now()}`

      const { error: updateError } = await supabase
        .from('majstors')
        .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
        .eq('id', majstor.id)

      if (updateError) throw updateError

      onAvatarUpdate?.(avatarUrl)
      // Notify layout da ažurira avatar u realnom vremenu
      window.dispatchEvent(new CustomEvent('avatar-updated', { detail: { avatarUrl } }))
    } catch (err) {
      console.error('Avatar upload error:', err)
      setError('Upload fehlgeschlagen: ' + err.message)
    } finally {
      setUploading(false)
      if (galleryRef.current) galleryRef.current.value = ''
      if (cameraRef.current) cameraRef.current.value = ''
    }
  }

  const handleRemove = async () => {
    if (!confirm('Profilbild wirklich entfernen?')) return
    setUploading(true)
    try {
      await supabase.storage.from('avatars').remove([`${majstor.id}/avatar.jpg`])
      await supabase
        .from('majstors')
        .update({ avatar_url: null, updated_at: new Date().toISOString() })
        .eq('id', majstor.id)
      onAvatarUpdate?.(null)
      window.dispatchEvent(new CustomEvent('avatar-updated', { detail: { avatarUrl: null } }))
    } catch (err) {
      setError('Entfernen fehlgeschlagen')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
      <h4 className="text-white font-semibold mb-1">Profilbild</h4>
      <p className="text-slate-400 text-sm mb-4">Erscheint als Ihr Avatar im Dashboard</p>

      <div className="flex items-center gap-4 mb-4">
        {/* Trenutna slika ili inicijali */}
        {majstor.avatar_url ? (
          <img
            src={majstor.avatar_url}
            alt="Avatar"
            className="w-16 h-16 rounded-full object-cover ring-2 ring-blue-500/40"
          />
        ) : (
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-2xl font-semibold">
            {majstor?.full_name?.charAt(0) || 'M'}
          </div>
        )}

        <div className="flex flex-col gap-2">
          {/* Skriveni file inputi */}
          <input
            ref={galleryRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            disabled={uploading}
          />
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="user"
            onChange={handleFileSelect}
            className="hidden"
            disabled={uploading}
          />

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => galleryRef.current?.click()}
              disabled={uploading}
              className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              🖼️ Galerie
            </button>
            <button
              type="button"
              onClick={() => cameraRef.current?.click()}
              disabled={uploading}
              className="text-sm bg-slate-600 text-white px-3 py-1.5 rounded-lg hover:bg-slate-500 transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              📸 Selfie
            </button>
          </div>

          {majstor.avatar_url && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={uploading}
              className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50 text-left"
            >
              Entfernen
            </button>
          )}
        </div>
      </div>

      {uploading && (
        <div className="flex items-center gap-2 text-slate-400 text-sm mb-3">
          <div className="animate-spin w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full"></div>
          Wird hochgeladen und verkleinert...
        </div>
      )}

      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
        <p className="text-blue-200 text-xs">
          Bild wird automatisch auf max. 400×400px verkleinert • Alle Bildformate erlaubt
        </p>
      </div>

      {error && (
        <div className="mt-3 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}
    </div>
  )
}
