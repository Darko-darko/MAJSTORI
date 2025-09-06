// app/components/InvoiceCreator.js - FIXED VERSION FOR DEPLOYMENT

'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export default function InvoiceCreator({ 
  isOpen, 
  onClose, 
  type = 'quote', // 'quote' or 'invoice'
  majstor,
  onSuccess,
  editData = null, // NOVO: data for editing
  isEditMode = false // NOVO: edit mode flag
}) {
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    customer_address: '',
    customer_phone: '',
    items: [{ description: '', quantity: 1, price: 0, total: 0 }],
    subtotal: 0,
    tax_rate: 19,
    tax_amount: 0,
    total_amount: 0,
    notes: '',
    payment_terms_days: 14,
    valid_until: '', // nur für quotes
    issue_date: new Date().toISOString().split('T')[0],
    is_kleinunternehmer: false
  })
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [customers, setCustomers] = useState([])
  const [showCustomerSelect, setShowCustomerSelect] = useState(false)

  // NOVO: Load customers function
  const loadCustomers = useCallback(async () => {
    if (!majstor?.id) return
    
    try {
      // Load customers from inquiries
      const { data } = await supabase
        .from('inquiries')
        .select('customer_name, customer_email, customer_phone')
        .eq('majstor_id', majstor.id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (data) {
        // Remove duplicates based on email
        const uniqueCustomers = data.filter((customer, index, self) =>
          index === self.findIndex(c => c.customer_email === customer.customer_email)
        )
        setCustomers(uniqueCustomers)
      }
    } catch (err) {
      console.error('Error loading customers:', err)
    }
  }, [majstor?.id])

  // NOVO: Load edit data function
  const loadEditData = useCallback(() => {
    if (!editData || !isEditMode) return

    try {
      const items = editData.items ? JSON.parse(editData.items) : [{ description: '', quantity: 1, price: 0, total: 0 }]
      
      setFormData({
        customer_name: editData.customer_name || '',
        customer_email: editData.customer_email || '',
        customer_address: editData.customer_address || '',
        customer_phone: editData.customer_phone || '',
        items: items,
        subtotal: editData.subtotal || 0,
        tax_rate: editData.tax_rate || 19,
        tax_amount: editData.tax_amount || 0,
        total_amount: editData.total_amount || 0,
        notes: editData.notes || '',
        payment_terms_days: editData.payment_terms_days || 14,
        valid_until: editData.valid_until || '',
        issue_date: editData.issue_date || new Date().toISOString().split('T')[0],
        is_kleinunternehmer: editData.is_kleinunternehmer || false
      })
    } catch (err) {
      console.error('Error loading edit data:', err)
      setError('Fehler beim Laden der Bearbeitungsdaten')
    }
  }, [editData, isEditMode])

  // NOVO: Reset form function
  const resetForm = useCallback(() => {
    if (isEditMode) return // Don't reset if editing
    
    setFormData({
      customer_name: '',
      customer_email: '',
      customer_address: '',
      customer_phone: '',
      items: [{ description: '', quantity: 1, price: 0, total: 0 }],
      subtotal: 0,
      tax_rate: 19,
      tax_amount: 0,
      total_amount: 0,
      notes: '',
      payment_terms_days: 14,
      valid_until: type === 'quote' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : '',
      issue_date: new Date().toISOString().split('T')[0],
      is_kleinunternehmer: false
    })
  }, [isEditMode, type])

  useEffect(() => {
    if (isOpen && majstor?.id) {
      loadCustomers()
      
      if (isEditMode && editData) {
        loadEditData()
      } else {
        resetForm()
      }
    }
  }, [isOpen, majstor?.id, type, isEditMode, editData, loadCustomers, loadEditData, resetForm])

  const handleCustomerSelect = (customer) => {
    setFormData(prev => ({
      ...prev,
      customer_name: customer.customer_name,
      customer_email: customer.customer_email,
      customer_phone: customer.customer_phone || ''
    }))
    setShowCustomerSelect(false)
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items]
    newItems[index] = { ...newItems[index], [field]: value }
    
    // Berechne total für diesen item
    if (field === 'quantity' || field === 'price') {
      const quantity = field === 'quantity' ? parseFloat(value) || 0 : newItems[index].quantity
      const price = field === 'price' ? parseFloat(value) || 0 : newItems[index].price
      newItems[index].total = quantity * price
    }
    
    setFormData(prev => ({
      ...prev,
      items: newItems
    }))
    
    // Berechne totals
    calculateTotals(newItems)
  }

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { description: '', quantity: 1, price: 0, total: 0 }]
    }))
  }

  const removeItem = (index) => {
    if (formData.items.length > 1) {
      const newItems = formData.items.filter((_, i) => i !== index)
      setFormData(prev => ({
        ...prev,
        items: newItems
      }))
      calculateTotals(newItems)
    }
  }

  const calculateTotals = (items) => {
    const subtotal = items.reduce((sum, item) => sum + (item.total || 0), 0)
    // AKO JE KLEINUNTERNEHMER, NEMA PDV
    const taxAmount = formData.is_kleinunternehmer ? 0 : subtotal * (formData.tax_rate / 100)
    const totalAmount = subtotal + taxAmount
    
    setFormData(prev => ({
      ...prev,
      subtotal,
      tax_amount: taxAmount,
      total_amount: totalAmount
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Validation
      if (!formData.customer_name || !formData.customer_email) {
        throw new Error('Kunde Name und E-Mail sind erforderlich')
      }

      if (formData.items.some(item => !item.description || item.price <= 0)) {
        throw new Error('Alle Positionen müssen eine Beschreibung und einen Preis haben')
      }

      // Due date calculation
      const dueDate = new Date(formData.issue_date)
      dueDate.setDate(dueDate.getDate() + formData.payment_terms_days)

      const documentData = {
        majstor_id: majstor.id,
        type: type,
        customer_name: formData.customer_name,
        customer_email: formData.customer_email,
        customer_phone: formData.customer_phone,
        customer_address: formData.customer_address,
        items: JSON.stringify(formData.items),
        subtotal: formData.subtotal,
        tax_rate: formData.tax_rate,
        tax_amount: formData.tax_amount,
        total_amount: formData.total_amount,
        status: 'draft',
        issue_date: formData.issue_date,
        due_date: dueDate.toISOString().split('T')[0],
        notes: formData.notes,
        payment_terms_days: formData.payment_terms_days,
        valid_until: type === 'quote' ? formData.valid_until : null,
        is_kleinunternehmer: formData.is_kleinunternehmer
      }

      let result
      if (isEditMode && editData) {
        // Update existing document
        result = await supabase
          .from('invoices')
          .update({
            ...documentData,
            updated_at: new Date().toISOString()
          })
          .eq('id', editData.id)
          .select()
          .single()
      } else {
        // Create new document
        result = await supabase
          .from('invoices')
          .insert(documentData)
          .select()
          .single()
      }

      if (result.error) throw result.error

      console.log(`${type} ${isEditMode ? 'updated' : 'created'} successfully:`, result.data.id)
      
      // Reset form only if not editing
      if (!isEditMode) {
        resetForm()
      }

      onSuccess(result.data)
      onClose()

    } catch (err) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} ${type}:`, err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-700">
          <h3 className="text-xl font-semibold text-white">
            {isEditMode 
              ? `${type === 'quote' ? '📄 Angebot bearbeiten' : '🧾 Rechnung bearbeiten'}`
              : `${type === 'quote' ? '📄 Neues Angebot erstellen' : '🧾 Neue Rechnung erstellen'}`
            }
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* Customer Section */}
          <div className="bg-slate-900/50 rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-white font-semibold">Kunde</h4>
              {customers.length > 0 && !isEditMode && (
                <button
                  type="button"
                  onClick={() => setShowCustomerSelect(!showCustomerSelect)}
                  className="text-blue-400 text-sm hover:text-blue-300"
                >
                  Aus Anfragen auswählen
                </button>
              )}
            </div>

            {/* Customer Dropdown */}
            {showCustomerSelect && (
              <div className="mb-4 bg-slate-800 border border-slate-600 rounded-lg max-h-32 overflow-y-auto">
                {customers.map((customer, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleCustomerSelect(customer)}
                    className="w-full text-left px-3 py-2 hover:bg-slate-700 text-white text-sm border-b border-slate-700 last:border-b-0"
                  >
                    <div className="font-medium">{customer.customer_name}</div>
                    <div className="text-slate-400 text-xs">{customer.customer_email}</div>
                  </button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  name="customer_name"
                  value={formData.customer_name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white"
                  placeholder="Max Mustermann"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  E-Mail *
                </label>
                <input
                  type="email"
                  name="customer_email"
                  value={formData.customer_email}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white"
                  placeholder="max@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Telefon
                </label>
                <input
                  type="tel"
                  name="customer_phone"
                  value={formData.customer_phone}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white"
                  placeholder="+49 123 456789"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Adresse
                </label>
                <input
                  type="text"
                  name="customer_address"
                  value={formData.customer_address}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white"
                  placeholder="Straße 123, 10115 Berlin"
                />
              </div>
            </div>
          </div>

          {/* Items Section */}
          <div className="bg-slate-900/50 rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-white font-semibold">Positionen</h4>
              <button
                type="button"
                onClick={addItem}
                className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
              >
                + Position hinzufügen
              </button>
            </div>

            <div className="space-y-3">
              {formData.items.map((item, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  <div className="md:col-span-5">
                    <label className="block text-sm text-slate-400 mb-1">Beschreibung</label>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white text-sm"
                      placeholder="z.B. Wasserrohr reparieren"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm text-slate-400 mb-1">Menge</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white text-sm"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm text-slate-400 mb-1">
                     // Encore sigurniji:
                   {`Preis (€ ${formData.is_kleinunternehmer ? 'inkl.' : 'netto'})`} 
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.price}
                      onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white text-sm"
                      placeholder="100.00"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm text-slate-400 mb-1">Gesamt</label>
                    <div className="px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm">
                      {formatCurrency(item.total)}
                    </div>
                  </div>
                  <div className="md:col-span-1">
                    {formData.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="w-full px-2 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Price info */}
            <div className="text-xs text-slate-500 mt-2">
              {formData.is_kleinunternehmer 
                ? '* Gemäß §19 UStG werden alle Preise ohne Mehrwertsteuer berechnet'
                : '* Alle Preise sind Nettopreise (zzgl. MwSt.)'
              }
            </div>
          </div>

          {/* Totals Section */}
          <div className="bg-slate-900/50 rounded-lg p-4">
            <h4 className="text-white font-semibold mb-4">Berechnung</h4>
            <div className="space-y-2 max-w-md ml-auto">
              <div className="flex justify-between">
                <span className="text-slate-400">
                  {formData.is_kleinunternehmer ? 'Gesamtbetrag:' : 'Nettobetrag:'}
                </span>
                <span className="text-white">{formatCurrency(formData.subtotal)}</span>
              </div>
              
              {!formData.is_kleinunternehmer && (
                <div className="flex justify-between">
                  <span className="text-slate-400">
                    zzgl. MwSt ({formData.tax_rate}%):
                  </span>
                  <span className="text-white">{formatCurrency(formData.tax_amount)}</span>
                </div>
              )}
              
              {formData.is_kleinunternehmer && (
                <div className="text-xs text-slate-500 italic">
                  * Gemäß §19 UStG wird keine Umsatzsteuer berechnet
                </div>
              )}
              
              {!formData.is_kleinunternehmer && (
                <div className="border-t border-slate-600 pt-2">
                  <div className="flex justify-between font-semibold">
                    <span className="text-white">Bruttobetrag:</span>
                    <span className="text-white text-lg">{formatCurrency(formData.total_amount)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Settings Section */}
          <div className="bg-slate-900/50 rounded-lg p-4">
            <h4 className="text-white font-semibold mb-4">Einstellungen</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  {type === 'quote' ? 'Angebotsdatum' : 'Rechnungsdatum'}
                </label>
                <input
                  type="date"
                  name="issue_date"
                  value={formData.issue_date}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white"
                />
              </div>
              
              {type === 'quote' && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Gültig bis
                  </label>
                  <input
                    type="date"
                    name="valid_until"
                    value={formData.valid_until}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white"
                  />
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Zahlungsziel (Tage)
                </label>
                <select
                  name="payment_terms_days"
                  value={formData.payment_terms_days}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white"
                >
                  <option value="7">7 Tage</option>
                  <option value="14">14 Tage</option>
                  <option value="30">30 Tage</option>
                </select>
              </div>
            </div>
            
            {/* KLEINUNTERNEHMER SEKCIJA */}
            <div className="mt-6 border-t border-slate-600 pt-6">
              <h5 className="text-white font-medium mb-4">Steuer-Einstellungen</h5>
              
              <div className="flex items-center mb-4">
                <input
                  type="checkbox"
                  id="kleinunternehmer"
                  checked={formData.is_kleinunternehmer}
                  onChange={(e) => {
                    const isKleinunternehmer = e.target.checked
                    setFormData(prev => ({
                      ...prev,
                      is_kleinunternehmer: isKleinunternehmer,
                      tax_rate: isKleinunternehmer ? 0 : 19,
                      tax_amount: 0  // Reset tax amount
                    }))
                    // Preračunaj totale sa novim tax_rate
                    setTimeout(() => calculateTotals(formData.items), 0)
                  }}
                  className="mr-3 w-4 h-4 text-blue-600 bg-slate-700 border-slate-500 rounded focus:ring-blue-500"
                />
                <label htmlFor="kleinunternehmer" className="text-slate-300 text-sm">
                  Kleinunternehmer nach §19 UStG (keine Mehrwertsteuer)
                </label>
              </div>
              
              {!formData.is_kleinunternehmer && (
                <div className="max-w-xs">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    MwSt. Satz (%)
                  </label>
                  <select
                    value={formData.tax_rate}
                    onChange={(e) => {
                      const newTaxRate = parseFloat(e.target.value)
                      setFormData(prev => ({
                        ...prev,
                        tax_rate: newTaxRate
                      }))
                      setTimeout(() => calculateTotals(formData.items), 0)
                    }}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white"
                  >
                    <option value="19">19% (Regelsteuersatz)</option>
                    <option value="7">7% (ermäßigter Steuersatz)</option>
                    <option value="0">0% (steuerbefreit)</option>
                  </select>
                </div>
              )}
            </div>
            
            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Notizen (intern)
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white"
                placeholder="Interne Notizen (erscheinen nicht auf dem PDF)"
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <p className="text-red-400">{error}</p>
            </div>
          )}

          {/* Footer */}
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
              disabled={loading || formData.total_amount <= 0}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex-1"
            >
              {loading 
                ? `${isEditMode ? 'Aktualisiere...' : 'Erstelle...'}` 
                : `${isEditMode ? `${type === 'quote' ? 'Angebot' : 'Rechnung'} aktualisieren` : `${type === 'quote' ? 'Angebot' : 'Rechnung'} erstellen`}`
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}