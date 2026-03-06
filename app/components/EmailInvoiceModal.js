// app/components/EmailInvoiceModal.js
'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function EmailInvoiceModal({
  isOpen,
  onClose,
  invoice,
  majstor,
  onSuccess,
  isReminder = false
}) {
  const [formData, setFormData] = useState({
    recipientEmail: invoice?.customer_email || '',
    ccEmail: '',
    subject: '',
    message: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [attachments, setAttachments] = useState([])

  useEffect(() => {
    if (invoice?.id) {
      supabase.from('invoice_attachments').select('filename, file_size, mime_type').eq('invoice_id', invoice.id)
        .then(({ data }) => setAttachments(data || []))
    }
  }, [invoice?.id])

  useEffect(() => {
  if (invoice && majstor) {
    const documentType = invoice.type === 'quote' ? 'Angebot' : 'Rechnung'
    const documentNumber = invoice.invoice_number || invoice.quote_number
    const businessName = majstor?.business_name || majstor?.full_name || 'Pro-Meister'
    const customerName = invoice.customer_name || 'Damen und Herren'
    
    const defaultSubject = isReminder
      ? `Zahlungserinnerung – Rechnung ${documentNumber} von ${businessName}`
      : `${documentType} ${documentNumber} von ${businessName}`

    const dueDate = invoice.due_date
      ? new Date(invoice.due_date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
      : null
    const amount = invoice.total_amount
      ? new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(invoice.total_amount)
      : null

    const defaultMessage = isReminder
      ? `Sehr geehrte/r ${customerName},\n\nwir erlauben uns, Sie freundlich daran zu erinnern, dass unsere Rechnung ${documentNumber}${amount ? ` über ${amount}` : ''}${dueDate ? ` mit Fälligkeit ${dueDate}` : ''} noch offen ist.\n\nWir bitten Sie, den Betrag baldmöglichst zu überweisen.\n\nFür Rückfragen stehen wir Ihnen gerne zur Verfügung.\n\nMit freundlichen Grüßen\n${businessName}`
      : `Sehr geehrte/r ${customerName},\n\nanbei erhalten Sie unser ${documentType} ${documentNumber}.\n\nFür Rückfragen stehen wir Ihnen gerne zur Verfügung.\n\nMit freundlichen Grüßen\n${businessName}`

    setFormData(prev => ({
      ...prev,
      subject: defaultSubject,
      message: defaultMessage
    }))
  }
}, [invoice, majstor, isOpen])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.recipientEmail || !formData.subject) {
      setError('E-Mail-Adresse und Betreff sind erforderlich')
      return
    }

    setLoading(true)
    setError('')

    try {
    const { data: { session } } = await supabase.auth.getSession()
    const authHeader = { Authorization: `Bearer ${session.access_token}` }

  // PDF generation logic ako treba
  if (!invoice.pdf_storage_path || !invoice.pdf_generated_at) {
    console.log('PDF ne postoji, generišem automatski...')

    try {
      const pdfGenResponse = await fetch(`/api/invoices/${invoice.id}/pdf`, { headers: authHeader })

      if (!pdfGenResponse.ok) {
        throw new Error('PDF generisanje nije uspelo')
      }

      console.log('PDF automatski generisan')
      await new Promise(resolve => setTimeout(resolve, 1500))

    } catch (pdfGenError) {
      console.error('PDF generation error:', pdfGenError)
      setError('PDF generisanje nije uspelo. Molimo pokušajte ponovo.')
      setLoading(false)
      return
    }
  }

  console.log('Sending email for invoice:', invoice.id)

  const response = await fetch(`/api/invoices/${invoice.id}/email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeader
    },
    body: JSON.stringify({ ...formData, isReminder })
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.error || 'E-Mail-Versand fehlgeschlagen')
  }

  console.log('Email sent successfully:', result)
  
  setLoading(false)
  
  alert(`E-Mail erfolgreich gesendet!\n\nEmpfänger: ${formData.recipientEmail}\nBetreff: ${formData.subject}`)
  
  onClose()

} catch (err) {
  console.error('Email sending error:', err)
  setError(err.message)
  setLoading(false)
}
}
  if (!isOpen) return null

  const documentType = invoice?.type === 'quote' ? 'Angebot' : 'Rechnung'
  const documentNumber = invoice?.invoice_number || invoice?.quote_number

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        
        <div className="flex justify-between items-center p-6 border-b border-slate-700">
          <div>
            <h3 className="text-xl font-semibold text-white">
              {isReminder ? 'Zahlungserinnerung senden' : `${documentType} per E-Mail senden`}
            </h3>
            <p className="text-slate-400 text-sm">
              {documentType} {documentNumber} an {invoice?.customer_name}
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-white text-2xl"
            disabled={loading}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Empfänger-E-Mail *
            </label>
            <input
              type="email"
              name="recipientEmail"
              value={formData.recipientEmail}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white"
              placeholder="kunde@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              CC (Kopie an Sie)
            </label>
            <input
              type="email"
              name="ccEmail"
              value={formData.ccEmail}
              onChange={handleInputChange}
              className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white"
              placeholder="ihre@email.com"
            />
            <p className="text-xs text-slate-500 mt-1">
              Optional: Erhalten Sie eine Kopie der E-Mail
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Betreff *
            </label>
            <input
              type="text"
              name="subject"
              value={formData.subject}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white"
              placeholder="Rechnung RE-2025-001 von Firma"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Nachricht
            </label>
            <textarea
              name="message"
              value={formData.message}
              onChange={handleInputChange}
              rows={8}
              className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white"
              placeholder="Ihre persönliche Nachricht..."
            />
            <p className="text-xs text-slate-500 mt-1">
              Die Standard-Nachricht wird automatisch generiert, wenn leer gelassen
            </p>
          </div>

          <div className="border border-slate-600 rounded-lg overflow-hidden">
            <div className="px-3 py-2 bg-slate-700/50 border-b border-slate-600">
              <span className="text-slate-300 text-xs font-medium uppercase tracking-wide">Anhänge</span>
            </div>
            <div className="divide-y divide-slate-700/50">
              <div className="flex items-center gap-2 px-3 py-2">
                <span className="text-slate-400 text-base">📄</span>
                <span className="text-slate-300 text-sm truncate">
                  {documentType}_{documentNumber}_{invoice?.customer_name?.replace(/[^a-zA-Z0-9]/g, '_')}.pdf
                </span>
              </div>
              {attachments.map((att, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2">
                  <span className="text-slate-400 text-base">{att.filename.startsWith('Regiebericht_') ? '📋' : '📎'}</span>
                  <span className="text-slate-300 text-sm truncate">{att.filename}</span>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t border-slate-700">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-6 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={loading || !formData.recipientEmail || !formData.subject}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex-1 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                  {invoice.pdf_storage_path ? 'Wird gesendet...' : 'PDF wird generiert...'}
                </>
              ) : (
                <>
                  {isReminder ? 'Zahlungserinnerung senden' : 'E-Mail senden'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}