// app/components/SupportModal.js
'use client'
import { useState } from 'react'

export function SupportModal({ isOpen, onClose, userEmail = '', userName = '' }) {
  const [formData, setFormData] = useState({
    name: userName,
    email: userEmail,
    subject: '',
    message: '',
    category: 'general'
  })
  const [sending, setSending] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const categories = [
    { value: 'general', label: '❓ Allgemeine Frage' },
    { value: 'technical', label: '🔧 Technisches Problem' },
    { value: 'billing', label: '💳 Abrechnung & Zahlung' },
    { value: 'feature', label: '✨ Feature-Anfrage' },
    { value: 'bug', label: '🐛 Bug Report' },
  ]

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSending(true)
    setError('')

    try {
      const response = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim Senden')
      }

      setSuccess(true)
      
      // Reset form after 2 seconds and close
      setTimeout(() => {
        setFormData({
          name: userName,
          email: userEmail,
          subject: '',
          message: '',
          category: 'general'
        })
        setSuccess(false)
        onClose()
      }, 2000)

    } catch (err) {
      console.error('Support form error:', err)
      setError(err.message || 'Fehler beim Senden. Bitte versuchen Sie es erneut.')
    } finally {
      setSending(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 max-h-[90vh] overflow-y-auto">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={sending}
          className="absolute top-4 right-4 text-slate-400 hover:text-white text-2xl z-10 disabled:opacity-50"
        >
          ×
        </button>

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-8 text-center rounded-t-2xl">
          <div className="text-5xl mb-4">💬</div>
          <h2 className="text-3xl font-bold text-white mb-2">
            Support kontaktieren
          </h2>
          <p className="text-blue-100">
            Wir helfen Ihnen gerne weiter
          </p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="p-8">
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-6 text-center">
              <div className="text-5xl mb-4">✅</div>
              <h3 className="text-xl font-bold text-green-300 mb-2">
                Nachricht erfolgreich gesendet!
              </h3>
              <p className="text-green-200">
                Wir melden uns innerhalb von 24 Stunden bei Ihnen.
              </p>
            </div>
          </div>
        )}

        {/* Form */}
        {!success && (
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            
            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Kategorie
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                required
              >
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                placeholder="Ihr Name"
                required
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                E-Mail
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                placeholder="ihre@email.de"
                required
              />
            </div>

            {/* Subject */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Betreff
              </label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({...formData, subject: e.target.value})}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                placeholder="Kurze Zusammenfassung"
                required
              />
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Nachricht
              </label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData({...formData, message: e.target.value})}
                rows={6}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 resize-none"
                placeholder="Beschreiben Sie Ihr Anliegen ausführlich..."
                required
              />
            </div>

            {/* Info Box */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <p className="text-blue-300 text-sm">
                ⏰ <strong>Antwortzeit:</strong> Wir melden uns innerhalb von 24 Stunden (Mo-Fr).
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={onClose}
                disabled={sending}
                className="flex-1 bg-slate-700 text-slate-300 px-6 py-3 rounded-lg font-medium hover:bg-slate-600 transition-colors disabled:opacity-50"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={sending}
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-bold hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 shadow-lg"
              >
                {sending ? 'Wird gesendet...' : '📨 Nachricht senden'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

// Hook za jednostavno korišćenje
export function useSupportModal() {
  const [isOpen, setIsOpen] = useState(false)

  return {
    isOpen,
    openSupport: () => setIsOpen(true),
    closeSupport: () => setIsOpen(false)
  }
}