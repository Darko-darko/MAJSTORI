// components/InvoiceCreator.js - FIXED Services Dropdown with Proper Filtering

'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

export default function InvoiceCreator({ 
  isOpen, 
  onClose, 
  type = 'quote', 
  majstor,
  onSuccess,
  editData = null,
  isEditMode = false,
  prefilledCustomer = null
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
    valid_until: '',
    issue_date: new Date().toISOString().split('T')[0],
    is_kleinunternehmer: false
  })
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  // Customer autocomplete states
  const [customerSearchTerm, setCustomerSearchTerm] = useState('')
  const [customerSuggestions, setCustomerSuggestions] = useState([])
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  
  // 🔥 FIXED: Services states with proper filtering
  const [services, setServices] = useState([])
  const [showServicesDropdown, setShowServicesDropdown] = useState(null)
  const [filteredServices, setFilteredServices] = useState([]) // ← NOVO za filtrirane usluge
  
  const customerInputRef = useRef(null)
  const servicesDropdownRef = useRef(null)

  useEffect(() => {
    if (isOpen && majstor?.id) {
      console.log('🛠️ Enhanced InvoiceCreator opened:', { type, isEditMode })
      loadServices()
      initializeFormData()
    }
  }, [isOpen, majstor?.id, type, editData, isEditMode])

  // Load majstor's services
  const loadServices = async () => {
    try {
      const { data: servicesData, error } = await supabase
        .from('services')
        .select('*')
        .eq('majstor_id', majstor.id)
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (!error) {
        setServices(servicesData || [])
        console.log('📋 Loaded services:', servicesData?.length || 0)
      }
    } catch (err) {
      console.error('Error loading services:', err)
    }
  }

  // 🔥 NOVO: Filter services based on search term
  const filterServicesByTerm = (searchTerm, allServices) => {
    if (!searchTerm || searchTerm.length < 2) {
      return []
    }
    
    const term = searchTerm.toLowerCase()
    return allServices.filter(service => 
      service.name.toLowerCase().includes(term) ||
      (service.description && service.description.toLowerCase().includes(term))
    )
  }

  const initializeFormData = () => {
    const defaultSettings = {
      is_kleinunternehmer: majstor?.is_kleinunternehmer || false,
      tax_rate: majstor?.is_kleinunternehmer ? 0 : (majstor?.default_tax_rate || 19),
      payment_terms_days: majstor?.payment_terms_days || 14
    }

    if (isEditMode && editData) {
      const parsedItems = editData.items ? JSON.parse(editData.items) : [{ description: '', quantity: 1, price: 0, total: 0 }]
      
      setFormData({
        customer_name: editData.customer_name || '',
        customer_email: editData.customer_email || '',
        customer_address: editData.customer_address || '',
        customer_phone: editData.customer_phone || '',
        items: parsedItems,
        subtotal: editData.subtotal || 0,
        tax_rate: editData.tax_rate || defaultSettings.tax_rate,
        tax_amount: editData.tax_amount || 0,
        total_amount: editData.total_amount || 0,
        notes: editData.notes || '',
        payment_terms_days: editData.payment_terms_days || defaultSettings.payment_terms_days,
        valid_until: editData.valid_until || '',
        issue_date: editData.issue_date || new Date().toISOString().split('T')[0],
        is_kleinunternehmer: editData.is_kleinunternehmer !== undefined ? editData.is_kleinunternehmer : defaultSettings.is_kleinunternehmer
      })
      
      setCustomerSearchTerm(editData.customer_name || '')
    } else {
      let initialCustomerData = {
        customer_name: '',
        customer_email: '',
        customer_address: '',
        customer_phone: ''
      }

      if (prefilledCustomer) {
        console.log('🎯 Using prefilled customer:', prefilledCustomer)
        initialCustomerData = {
          customer_name: prefilledCustomer.name || '',
          customer_email: prefilledCustomer.email || '',
          customer_address: prefilledCustomer.address || '',
          customer_phone: prefilledCustomer.phone || ''
        }
        setCustomerSearchTerm(prefilledCustomer.name || '')
      }

      const initialFormData = {
        ...initialCustomerData,
        items: [{ description: '', quantity: 1, price: 0, total: 0 }],
        subtotal: 0,
        tax_rate: defaultSettings.tax_rate,
        tax_amount: 0,
        total_amount: 0,
        notes: '',
        payment_terms_days: defaultSettings.payment_terms_days,
        valid_until: '',
        issue_date: new Date().toISOString().split('T')[0],
        is_kleinunternehmer: defaultSettings.is_kleinunternehmer
      }

      if (type === 'quote') {
        const validUntil = new Date()
        validUntil.setDate(validUntil.getDate() + 30)
        initialFormData.valid_until = validUntil.toISOString().split('T')[0]
      }

      setFormData(initialFormData)
    }
  }

  // Customer search with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (customerSearchTerm.length >= 2 && !isEditMode && !prefilledCustomer) {
        searchCustomers(customerSearchTerm)
      } else {
        setCustomerSuggestions([])
        setShowCustomerDropdown(false)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [customerSearchTerm, isEditMode, prefilledCustomer])

  const searchCustomers = async (searchTerm) => {
    if (!majstor?.id || searchTerm.length < 2) return

    setSearchLoading(true)
    try {
      const { data: customers, error } = await supabase
        .from('customers')
        .select('name, email, phone, street, city, postal_code, total_revenue, total_invoices')
        .eq('majstor_id', majstor.id)
        .or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
        .order('total_revenue', { ascending: false })
        .limit(8)

      if (!error && customers) {
        setCustomerSuggestions(customers)
        setShowCustomerDropdown(customers.length > 0)
        console.log('🔍 Found customers:', customers.length)
      }
    } catch (err) {
      console.error('Customer search error:', err)
    } finally {
      setSearchLoading(false)
    }
  }

  // Select customer from dropdown
  const handleCustomerSelect = (customer) => {
    console.log('👤 Selected customer:', customer)
    
    const addressParts = [customer.street, customer.postal_code, customer.city].filter(Boolean)
    const fullAddress = addressParts.join(', ')
    
    setFormData(prev => ({
      ...prev,
      customer_name: customer.name,
      customer_email: customer.email,
      customer_phone: customer.phone || '',
      customer_address: fullAddress
    }))
    
    setCustomerSearchTerm(customer.name)
    setShowCustomerDropdown(false)
  }

  // 🔥 FIXED: Service selection for items
  const handleServiceSelect = (itemIndex, service) => {
    const newItems = [...formData.items]
    newItems[itemIndex] = {
      ...newItems[itemIndex],
      description: service.name,
    
      total: (newItems[itemIndex].quantity || 1) * (service.default_price || 0)
    }
    
    setFormData(prev => ({ ...prev, items: newItems }))
    setShowServicesDropdown(null)
    setFilteredServices([]) // ← CLEAR filtered services
    
    calculateTotals(newItems)
  }

  const handleCustomerNameChange = (e) => {
    const value = e.target.value
    setCustomerSearchTerm(value)
    setFormData(prev => ({ ...prev, customer_name: value }))
    
    if (value.length === 0) {
      setFormData(prev => ({
        ...prev,
        customer_name: '',
        customer_email: '',
        customer_phone: '',
        customer_address: ''
      }))
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  // 🔥 FIXED: Handle item changes with proper service filtering
  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items]
    newItems[index] = { ...newItems[index], [field]: value }
    
    if (field === 'quantity' || field === 'price') {
      const quantity = field === 'quantity' ? parseFloat(value) || 0 : newItems[index].quantity
      const price = field === 'price' ? parseFloat(value) || 0 : newItems[index].price
      newItems[index].total = quantity * price
    }
    
    setFormData(prev => ({ ...prev, items: newItems }))
    calculateTotals(newItems)

    // 🔥 FIXED: Proper services filtering logic
    if (field === 'description') {
      if (value.length >= 2) {
        const filtered = filterServicesByTerm(value, services)
        setFilteredServices(filtered)
        setShowServicesDropdown(filtered.length > 0 ? index : null)
        console.log(`🔍 Filtering services for "${value}":`, filtered.length, 'found')
      } else {
        setFilteredServices([])
        setShowServicesDropdown(null)
      }
    }
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
      setFormData(prev => ({ ...prev, items: newItems }))
      calculateTotals(newItems)
      
      // Clear dropdown if removing active item
      if (showServicesDropdown === index) {
        setShowServicesDropdown(null)
        setFilteredServices([])
      }
    }
  }

  const calculateTotals = (items) => {
    const subtotal = items.reduce((sum, item) => sum + (item.total || 0), 0)
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
      if (!formData.customer_name || !formData.customer_email) {
        throw new Error('Kunde Name und E-Mail sind erforderlich')
      }

      if (formData.items.some(item => !item.description || item.price <= 0)) {
        throw new Error('Alle Positionen müssen eine Beschreibung und einen Preis haben')
      }

      const dueDate = new Date(formData.issue_date)
      dueDate.setDate(dueDate.getDate() + formData.payment_terms_days)

      const invoiceData = {
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
        status: editData?.status || 'draft',
        issue_date: formData.issue_date,
        due_date: dueDate.toISOString().split('T')[0],
        notes: formData.notes,
        payment_terms_days: formData.payment_terms_days,
        valid_until: type === 'quote' ? formData.valid_until : null,
        is_kleinunternehmer: formData.is_kleinunternehmer,
        converted_from_quote_id: editData?.converted_from_quote_id || null
      }

      let result
      if (isEditMode && editData?.id) {
        result = await supabase
          .from('invoices')
          .update({ ...invoiceData, updated_at: new Date().toISOString() })
          .eq('id', editData.id)
          .select()
          .single()
      } else {
        result = await supabase
          .from('invoices')
          .insert(invoiceData)
          .select()
          .single()
      }

      if (result.error) throw result.error

      console.log(`✅ ${type} ${isEditMode ? 'updated' : 'created'} successfully:`, result.data.id)
      
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

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (customerInputRef.current && !customerInputRef.current.contains(event.target)) {
        setShowCustomerDropdown(false)
      }
      if (servicesDropdownRef.current && !servicesDropdownRef.current.contains(event.target)) {
        setShowServicesDropdown(null)
        setFilteredServices([])
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-700">
          <h3 className="text-xl font-semibold text-white">
            {isEditMode ? (
              type === 'quote' ? '✏️ Angebot bearbeiten' : '✏️ Rechnung bearbeiten'
            ) : (
              type === 'quote' ? '📄 Neues Angebot erstellen' : '🧾 Neue Rechnung erstellen'
            )}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl">×</button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* Status Information */}
          <div className={`rounded-lg p-4 border ${formData.is_kleinunternehmer ? 'bg-green-500/10 border-green-500/20' : 'bg-blue-500/10 border-blue-500/20'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${formData.is_kleinunternehmer ? 'bg-green-500' : 'bg-blue-500'}`}>
                  {formData.is_kleinunternehmer ? '✓' : '%'}
                </div>
                <div>
                  <h4 className={`font-semibold ${formData.is_kleinunternehmer ? 'text-green-300' : 'text-blue-300'}`}>
                    {formData.is_kleinunternehmer ? 'Kleinunternehmer (§19 UStG)' : 'Regulärer Steuerstatus'}
                  </h4>
                  <p className="text-slate-400 text-sm">
                    {formData.is_kleinunternehmer 
                      ? 'Keine Mehrwertsteuer wird berechnet' 
                      : `${formData.tax_rate}% MwSt. wird hinzugefügt`
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Customer Section with Autocomplete */}
          <div className="bg-slate-900/50 rounded-lg p-4">
            <h4 className="text-white font-semibold mb-4">Kunde</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Customer Name with Autocomplete */}
              <div className="relative" ref={customerInputRef}>
                <label className="block text-sm font-medium text-slate-300 mb-2">Name *</label>
                <input
                  type="text"
                  value={customerSearchTerm}
                  onChange={handleCustomerNameChange}
                  onFocus={() => customerSearchTerm.length >= 2 && setShowCustomerDropdown(customerSuggestions.length > 0)}
                  required
                  className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white"
                  placeholder="Kunde eingeben... (min. 2 Zeichen)"
                />
                
                {/* Customer Suggestions Dropdown */}
                {showCustomerDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto">
                    {searchLoading ? (
                      <div className="p-3 text-slate-400 text-center">Suche...</div>
                    ) : customerSuggestions.length === 0 ? (
                      <div className="p-3 text-slate-400 text-center">Keine Kunden gefunden</div>
                    ) : (
                      customerSuggestions.map((customer, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => handleCustomerSelect(customer)}
                          className="w-full text-left px-3 py-2 hover:bg-slate-700 text-white text-sm border-b border-slate-700 last:border-b-0 focus:outline-none focus:bg-slate-700"
                        >
                          <div className="font-medium">{customer.name}</div>
                          <div className="text-slate-400 text-xs">{customer.email}</div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">E-Mail *</label>
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
                <label className="block text-sm font-medium text-slate-300 mb-2">Telefon</label>
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
                <label className="block text-sm font-medium text-slate-300 mb-2">Adresse</label>
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

          {/* 🔥 FIXED: Items Section with Improved Services Dropdown */}
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
                  <div className="md:col-span-5 relative">
                    <label className="block text-sm text-slate-400 mb-1">Beschreibung</label>
                    <div className="relative" ref={showServicesDropdown === index ? servicesDropdownRef : null}>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white text-sm"
                        placeholder="z.B. Wasserrohr reparieren (min. 2 Zeichen für Vorschläge)"
                      />
                      
                      {/* 🔥 FIXED: Services Dropdown with Filtered Results */}
                      {showServicesDropdown === index && filteredServices.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                          <div className="p-2 border-b border-slate-700 bg-slate-900">
                            <div className="text-xs text-slate-400">
                              {filteredServices.length} Vorschlag{filteredServices.length > 1 ? 'e' : ''} gefunden
                            </div>
                          </div>
                          {filteredServices.map((service, serviceIndex) => (
                            <button
                              key={serviceIndex}
                              type="button"
                              onClick={() => handleServiceSelect(index, service)}
                              className="w-full text-left px-3 py-2 hover:bg-slate-700 text-white text-sm border-b border-slate-700 last:border-b-0 focus:outline-none focus:bg-slate-700"
                            >
                              <div className="font-medium">{service.name}</div>
                            </button>
                          ))}
                        </div>
                      )}
                      
                      {/* 🔥 NUOVO: No results message */}
                      {showServicesDropdown === index && item.description.length >= 2 && filteredServices.length === 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-lg z-10">
                          <div className="p-3 text-slate-400 text-center text-sm">
                            Keine passenden Usluge gefunden für "{item.description}"
                          </div>
                        </div>
                      )}
                    </div>
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
                      Preis (€ {formData.is_kleinunternehmer ? 'inkl.' : 'netto'})
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
                  <span className="text-slate-400">zzgl. MwSt ({formData.tax_rate}%):</span>
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
                  <label className="block text-sm font-medium text-slate-300 mb-2">Gültig bis</label>
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
                <label className="block text-sm font-medium text-slate-300 mb-2">Zahlungsziel (Tage)</label>
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
            
            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">Notizen (intern)</label>
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
                ? (isEditMode ? 'Speichern...' : 'Erstelle...') 
                : (isEditMode ? 'Änderungen speichern' : `${type === 'quote' ? 'Angebot' : 'Rechnung'} erstellen`)
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}