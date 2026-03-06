'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function BuchhalterSendModal({
  isOpen,
  onClose,
  selectedIds,
  majstor,
  periodLabel
}) {
  const [loading, setLoading] = useState(false)
  const [zipUrl, setZipUrl] = useState(null)
  const [shortUrl, setShortUrl] = useState(null)
  const [count, setCount] = useState(0)
  const [error, setError] = useState('')
  const [bookkeeperEmail, setBookkeeperEmail] = useState(majstor?.bookkeeper_email || '')

  useEffect(() => {
    if (isOpen) {
      setZipUrl(null)
      setError('')
      generateZip()
    }
  }, [isOpen])

  useEffect(() => {
    setBookkeeperEmail(majstor?.bookkeeper_email || '')
  }, [majstor])

  const generateZip = async () => {
    setLoading(true)
    try {
      const businessSlug = (majstor?.business_name || majstor?.full_name || 'Rechnungen')
        .replace(/\s+/g, '_').substring(0, 30)
      const zipFilename = `Rechnungen_${periodLabel.replace(/\s+/g, '_')}_${businessSlug}.zip`
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/invoices/bulk-zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ invoiceIds: selectedIds, majstorId: majstor.id, zipFilename })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setZipUrl(data.zipUrl)
      setShortUrl(data.shortUrl || null)
      setCount(data.count)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const getEmailContent = () => {
    const businessName = majstor?.business_name || majstor?.full_name || ''
    const subject = `Rechnungen ${periodLabel} – ${businessName}`
    const body = `Sehr geehrte Damen und Herren,\n\nanbei finden Sie die Rechnungen für ${periodLabel} zum Download:\n\n${shortUrl || zipUrl}\n\n(Link gültig 14 Tage)\n\nMit freundlichen Grüßen\n${businessName}`
    return { subject, body }
  }

  const openMailto = () => {
    const { subject, body } = getEmailContent()
    const mailto = `mailto:${encodeURIComponent(bookkeeperEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.open(mailto, '_self')
    onClose()
  }

  const openGmail = () => {
    const { subject, body } = getEmailContent()
    const url = `https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(bookkeeperEmail)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.open(url, '_blank')
    onClose()
  }

  const downloadZip = () => {
    window.open(zipUrl, '_blank')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl w-full max-w-md border border-slate-700">

        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-slate-700">
          <div>
            <h3 className="text-white font-semibold text-lg">📤 An Buchhalter senden</h3>
            <p className="text-slate-400 text-sm mt-0.5">{periodLabel}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl leading-none">×</button>
        </div>

        <div className="p-5 space-y-4">

          {/* Buchhalter Email */}
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">E-Mail Buchhalter</label>
            <input
              type="email"
              value={bookkeeperEmail}
              onChange={e => setBookkeeperEmail(e.target.value)}
              placeholder="buchhalter@beispiel.de"
              className="w-full px-3 py-2 bg-slate-900/60 border border-slate-600 rounded-lg text-white text-sm"
            />
          </div>

          {/* Status */}
          {loading && (
            <div className="flex items-center gap-3 bg-slate-700/40 rounded-lg p-4">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin shrink-0" />
              <span className="text-slate-300 text-sm">ZIP wird erstellt ({selectedIds.length} PDFs)...</span>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <p className="text-red-400 text-sm">{error}</p>
              <button onClick={generateZip} className="text-red-300 text-xs underline mt-1">Erneut versuchen</button>
            </div>
          )}

          {zipUrl && !loading && (
            <>
              {/* Success info */}
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 flex items-center gap-2">
                <span className="text-green-400">✅</span>
                <span className="text-green-300 text-sm">ZIP erstellt — {count} PDFs</span>
              </div>

              {/* Buttons */}
              <div className="space-y-2">
                <button
                  onClick={openGmail}
                  disabled={!bookkeeperEmail}
                  className="hidden sm:flex w-full py-3 bg-red-600/80 hover:bg-red-600 disabled:opacity-40 text-white rounded-lg font-medium transition-colors items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                  </svg>
                  In Gmail öffnen
                </button>
                <button
                  onClick={openMailto}
                  disabled={!bookkeeperEmail}
                  className="w-full py-3 bg-slate-600 hover:bg-slate-500 disabled:opacity-40 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  📧 Im E-Mail-Programm öffnen
                </button>
                <button
                  onClick={downloadZip}
                  className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 border border-slate-600"
                >
                  📥 ZIP herunterladen
                </button>
              </div>

              <p className="text-slate-500 text-xs text-center">
                Link gültig 14 Tage · ZIP enthält {count} PDF-Dateien
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
