// app/components/InvoiceNumbersSetupModal.js
'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function InvoiceNumbersSetupModal({ 
  isOpen, 
  onClose, 
  majstor, 
  onSuccess 
}) {
  const [formData, setFormData] = useState({
    next_quote_number: '', // Prazan string za lakše brisanje
    next_invoice_number: '' // Prazan string za lakše brisanje
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleInputChange = (e) => {
    const { name, value } = e.target
    
    // Dozvoli samo brojeve
    const cleanValue = value.replace(/[^0-9]/g, '')
    
    setFormData(prev => ({
      ...prev,
      [name]: cleanValue // Ostavi kao string
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Parse brojeve ili koristi 1 kao default
    const quoteNumber = parseInt(formData.next_quote_number) || 1
    const invoiceNumber = parseInt(formData.next_invoice_number) || 1

    // NEMAČKO BEZBEDNOSNO PITANJE SA VALIDIRANIM BROJEVIMA
    const confirmMessage = `
Bestätigung: Rechnungsnummern einrichten

Nächstes Angebot: AN-${new Date().getFullYear()}-${String(quoteNumber).padStart(4, '0')}
Nächste Rechnung: RE-${new Date().getFullYear()}-${String(invoiceNumber).padStart(4, '0')}

ACHTUNG: Diese Aktion ist DAUERHAFT und kann nicht rückgängig gemacht werden!

Sind Sie sicher, dass Sie fortfahren möchten?`

    if (!confirm(confirmMessage)) {
      return
    }

    setError('')
    setLoading(true)

    try {
      const currentYear = new Date().getFullYear()
      
      // Generate dummy entries if needed
      const dummyEntries = []
      
      // Create dummy quote if next number > 1
      if (quoteNumber > 1) {
        const dummyQuoteNumber = `AN-${currentYear}-${String(quoteNumber - 1).padStart(4, '0')}`
        dummyEntries.push({
          majstor_id: majstor.id,
          type: 'quote',
          quote_number: dummyQuoteNumber,
          customer_name: 'DUMMY_ENTRY_FOR_NUMBERING',
          customer_email: 'dummy@internal.system',
          items: JSON.stringify([]),
          subtotal: 0,
          tax_rate: 0,
          tax_amount: 0,
          total_amount: 0,
          status: 'dummy',
          issue_date: new Date().toISOString().split('T')[0],
          due_date: new Date().toISOString().split('T')[0],
        })
      }
      
      // Create dummy invoice if next number > 1
      if (invoiceNumber > 1) {
        const dummyInvoiceNumber = `RE-${currentYear}-${String(invoiceNumber - 1).padStart(4, '0')}`
        dummyEntries.push({
          majstor_id: majstor.id,
          type: 'invoice',
          invoice_number: dummyInvoiceNumber,
          customer_name: 'DUMMY_ENTRY_FOR_NUMBERING',
          customer_email: 'dummy@internal.system',
          items: JSON.stringify([]),
          subtotal: 0,
          tax_rate: 0,
          tax_amount: 0,
          total_amount: 0,
          status: 'dummy',
          issue_date: new Date().toISOString().split('T')[0],
          due_date: new Date().toISOString().split('T')[0]
        })
      }

      // Insert dummy entries if any
      if (dummyEntries.length > 0) {
        const { error: insertError } = await supabase
          .from('invoices')
          .insert(dummyEntries)
        
        if (insertError) throw insertError
      }

      // Mark numbers as initialized
      const { error: updateError } = await supabase
        .from('majstors')
        .update({ 
          numbers_initialized: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', majstor.id)

      if (updateError) throw updateError

      console.log('✅ Numbers setup completed successfully')
      onSuccess()

    } catch (err) {
      console.error('Numbers setup error:', err)
      setError('Fehler beim Einrichten der Nummern: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const currentYear = new Date().getFullYear()
  const previewQuoteNumber = `AN-${currentYear}-${String(formData.next_quote_number || '1').padStart(4, '0')}`
  const previewInvoiceNumber = `RE-${currentYear}-${String(formData.next_invoice_number || '1').padStart(4, '0')}`

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
      <div className="bg-slate-800 rounded-xl max-w-md w-full p-6">
        
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center">
            🔢
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Rechnungsnummern einrichten</h3>
            <p className="text-sm text-slate-400">Einmalige Einrichtung</p>
          </div>
        </div>

        {/* Content */}
        <div className="mb-6">
          <p className="text-slate-300 mb-4">
            Legen Sie fest, mit welcher Nummer Ihre ersten Angebote und Rechnungen beginnen sollen:
          </p>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Quote Number */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Nächste Angebotsnummer
              </label>
              
              <input
                type="tel"
                name="next_quote_number"
                value={formData.next_quote_number}
                onChange={handleInputChange}
                inputMode="numeric"
                pattern="[0-9]*"
                className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white"
                placeholder="z.B. 21"
                onFocus={(e) => e.target.select()}
              />
              <p className="text-xs text-slate-500 mt-1">
                Vorschau: <span className="text-blue-400 font-mono">{previewQuoteNumber}</span>
              </p>
            </div>

            {/* Invoice Number */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Nächste Rechnungsnummer
              </label>
              <input
                type="tel"
                name="next_invoice_number"
                value={formData.next_invoice_number}
                onChange={handleInputChange}
                inputMode="numeric"
                pattern="[0-9]*"
                className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white"
                placeholder="z.B. 32"
                onFocus={(e) => e.target.select()}
              />
              <p className="text-xs text-slate-500 mt-1">
                Vorschau: <span className="text-purple-400 font-mono">{previewInvoiceNumber}</span>
              </p>
            </div>

            {/* Info Box */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
              <p className="text-blue-300 text-sm">
                💡 <strong>Beispiel:</strong> Wenn Sie bereits 24 Angebote erstellt haben, geben Sie &quot;25&quot; ein. 
                Das System wird dann automatisch mit AN-{currentYear}-025 fortfahren.
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 bg-slate-600 text-white py-3 rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-orange-600 text-white py-3 rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Einrichten...' : 'Nummern einrichten'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}