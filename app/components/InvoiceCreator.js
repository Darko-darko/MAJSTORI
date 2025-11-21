// app/components/InvoiceCreator.js - WEG ADDRESS SYSTEM IMPLEMENTATION
'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import InvoiceNumbersSetupModal from './InvoiceNumbersSetupModal'

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
  // Business data completion check
  const [businessDataComplete, setBusinessDataComplete] = useState(false)
  const [showBusinessDataModal, setShowBusinessDataModal] = useState(false)

  // Numbers setup states
  const [numbersInitialized, setNumbersInitialized] = useState(false)
  const [showNumbersSetupModal, setShowNumbersSetupModal] = useState(false)

  // Edit confirmation modal states
  const [showEditConfirmModal, setShowEditConfirmModal] = useState(false)
  const [pendingFormData, setPendingFormData] = useState(null)

 const [formData, setFormData] = useState({
  // Customer identification
  customer_id: null,
  customer_name: '',
  customer_email: '',
  customer_phone: '',
  customer_tax_number: '',
  
  // ✅ Billing address - structured fields
  customer_street: '',
  customer_postal_code: '',
  customer_city: '',
  customer_country: '',
    
   // ✅ WEG object address (optional, collapsed by default)
  show_weg: false,
  weg_property_name: '',
  weg_street: '',
  weg_postal_code: '',
  weg_city: '',
  weg_country: '',
    
    // Service location (existing field, improved UX)
    place_of_service: '',
    
    // Invoice items and totals (existing)
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
  
  // Services states
  const [services, setServices] = useState([])
  const [showServicesDropdown, setShowServicesDropdown] = useState(null)
  const [filteredServices, setFilteredServices] = useState([])
  
  const customerInputRef = useRef(null)
  const servicesDropdownRef = useRef(null)

  // Check business data completeness on mount
  useEffect(() => {
    if (isOpen && majstor?.id) {
      checkBusinessDataCompleteness()
      if (businessDataComplete) {
        checkNumbersInitialization()
      }
      loadServices()
      initializeFormData()
    }
  }, [isOpen, majstor?.id, type, editData, isEditMode, businessDataComplete])

  // Monitor majstor changes
  useEffect(() => {
    if (majstor) {
      checkBusinessDataCompleteness()
      if (businessDataComplete) {
        checkNumbersInitialization()
      }
    }
  }, [majstor, isEditMode, businessDataComplete])

  // Unified business data validation logic
  const checkBusinessDataCompleteness = () => {
    if (!majstor) {
      setBusinessDataComplete(false)
      return
    }

    const requiredFields = ['full_name', 'email']
    const recommendedFields = ['business_name', 'phone', 'city']
    
    const isRequiredComplete = requiredFields.every(field => 
      majstor[field] && majstor[field].trim().length > 0
    )
    
    const validRecommendedFields = recommendedFields.filter(field => 
      majstor[field] && majstor[field].trim().length > 0
    )
    const isRecommendedSufficient = validRecommendedFields.length >= 2
    
    const isCompleteEnough = isRequiredComplete && isRecommendedSufficient
    setBusinessDataComplete(isCompleteEnough)

    if (!isEditMode && !isCompleteEnough) {
      setShowBusinessDataModal(true)
      return
    }
  }

  // Check numbers initialization
  const checkNumbersInitialization = () => {
    if (!majstor) {
      setNumbersInitialized(false)
      return
    }

    const isInitialized = majstor.numbers_initialized === true
    setNumbersInitialized(isInitialized)

    if (!isEditMode && !isInitialized) {
      setShowNumbersSetupModal(true)
    }
  }

  // Handle successful numbers setup
  const handleNumbersSetupSuccess = () => {
    setShowNumbersSetupModal(false)
    setNumbersInitialized(true)
  }

  // Business Data Completion Modal
  const BusinessDataModal = () => {
    if (!showBusinessDataModal) return null

    const missingFields = []
    if (!majstor?.full_name?.trim()) missingFields.push('Vollständiger Name')
    if (!majstor?.business_name?.trim()) missingFields.push('Firmenname')
    if (!majstor?.phone?.trim()) missingFields.push('Telefonnummer')
    if (!majstor?.city?.trim()) missingFields.push('Stadt/Ort')

    const handleRedirectToSettings = () => {
      setShowBusinessDataModal(false)
      onClose()
      
      setTimeout(() => {
        const url = new URL(window.location.href)
        url.pathname = '/dashboard/invoices'
        url.hash = ''
        url.searchParams.set('tab', 'settings')
        url.searchParams.set('from', 'invoice-creation')
        url.searchParams.set('type', type)
        
        window.location.href = url.toString()
      }, 100)
    }

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
        <div className="bg-slate-800 rounded-xl max-w-md w-full p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              📋
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Profil vervollständigen</h3>
              <p className="text-sm text-slate-400">Für professionelle Rechnungen</p>
            </div>
          </div>

          <div className="mb-6">
            <p className="text-slate-300 mb-4">
              Um professionelle Rechnungen zu erstellen, vervollständigen Sie bitte Ihr Geschäftsprofil:
            </p>
            
            <div className="bg-slate-900/50 rounded-lg p-4 mb-4">
              <h4 className="text-white font-medium mb-2">Fehlende Informationen:</h4>
              <ul className="space-y-1">
                {missingFields.map((field, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm text-slate-400">
                    <span className="text-red-400">•</span>
                    {field}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
              <p className="text-blue-300 text-sm">
                💡 Diese Daten erscheinen auf Ihren Rechnungen und helfen Kunden bei der Kontaktaufnahme.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                setShowBusinessDataModal(false)
                onClose()
              }}
              className="flex-1 bg-slate-600 text-white py-3 rounded-lg hover:bg-slate-700 transition-colors"
            >
              Später
            </button>
            <button
              onClick={handleRedirectToSettings}
              className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Jetzt vervollständigen
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Edit Confirmation Modal
  const EditConfirmationModal = () => {
    if (!showEditConfirmModal) return null

    const invoiceNumber = editData?.invoice_number || 'N/A'

    return (
      <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60] p-4">
        <div className="bg-slate-800 rounded-xl max-w-md w-full p-6 border-2 border-orange-500/30">
          
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center text-2xl">
              ⚠️
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white">
                Rechnung ändern?
              </h3>
              <p className="text-sm text-slate-400">
                {invoiceNumber}
              </p>
            </div>
          </div>

          <div className="mb-6 space-y-3">
            <p className="text-slate-300">
              Sie sind dabei, eine <strong className="text-white">bereits erstellte Rechnung</strong> zu ändern.
            </p>
            
            <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700">
              <p className="text-slate-300 text-sm mb-2">
                <strong className="text-blue-400">Was passiert bei &quotJa&quot:</strong>
              </p>
              <ul className="text-slate-400 text-sm space-y-1 ml-4">
                <li>✅ Änderungen werden gespeichert</li>
                <li>✅ PDF wird automatisch neu generiert</li>
                <li>✅ ZUGFeRD XML wird aktualisiert</li>
                <li>✅ Bereit für E-Mail Versand</li>
              </ul>
            </div>

            <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700">
              <p className="text-slate-300 text-sm mb-2">
                <strong className="text-slate-400">Was passiert bei &quotNein&quot:</strong>
              </p>
              <ul className="text-slate-400 text-sm space-y-1 ml-4">
                <li>❌ Änderungen werden NICHT gespeichert</li>
                <li>📄 Alter PDF bleibt unverändert</li>
                <li>↩️ Zurück zur Bearbeitung</li>
              </ul>
            </div>

            <p className="text-orange-300 text-sm mt-4">
              <strong>Möchten Sie fortfahren?</strong>
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleCancelEdit}
              disabled={loading}
              className="flex-1 bg-slate-600 text-white py-3 rounded-lg hover:bg-slate-700 transition-colors font-medium disabled:opacity-50"
            >
              ❌ Nein, abbrechen
            </button>
            <button
              onClick={handleConfirmEdit}
              disabled={loading}
              className="flex-1 bg-orange-600 text-white py-3 rounded-lg hover:bg-orange-700 transition-colors font-medium disabled:opacity-50"
            >
              {loading ? '⏳ Speichere...' : '✅ Ja, ändern'}
            </button>
          </div>

          <p className="text-slate-500 text-xs text-center mt-3">
            Diese Aktion kann nicht rückgängig gemacht werden
          </p>
        </div>
      </div>
    )
  }

  // Load services function
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
      }
    } catch (err) {
      console.error('Error loading services:', err)
    }
  }

  // Auto-save service function
  const autoSaveServiceFromInvoice = async (serviceName) => {
    try {
      if (!serviceName || !majstor?.id) return

      const { data: existing } = await supabase
        .from('services')
        .select('id')
        .eq('majstor_id', majstor.id)
        .eq('is_active', true)
        .ilike('name', serviceName.trim())

      if (existing && existing.length > 0) return

      await supabase
        .from('services')
        .insert({
          majstor_id: majstor.id,
          name: serviceName.trim(),
          source: 'invoice',
          usage_count: 1
        })

    } catch (error) {
      console.warn('Auto-save service failed:', error)
    }
  }

  // Filter services function
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

  // Initialize form data
  const initializeFormData = () => {
    const defaultSettings = {
      is_kleinunternehmer: majstor?.is_kleinunternehmer || false,
      tax_rate: majstor?.is_kleinunternehmer ? 0 : (majstor?.default_tax_rate || 19),
      payment_terms_days: majstor?.payment_terms_days || 14
    }

   if (isEditMode && editData) {
      const parsedItems = editData.items ? JSON.parse(editData.items) : [{ description: '', quantity: 1, price: 0, total: 0 }]
      
      setFormData({
        customer_id: editData.customer_id || null,
        customer_name: editData.customer_name || '',
        customer_email: editData.customer_email || '',
        customer_phone: editData.customer_phone || '',
        customer_tax_number: editData.customer_tax_number || '',
        
        // ✅ Structured billing address from invoice
        customer_street: editData.customer_street || '',
        customer_postal_code: editData.customer_postal_code || '',
        customer_city: editData.customer_city || '',
        customer_country: editData.customer_country || '',
        
        // ✅ WEG address from invoice
        show_weg: !!(editData.weg_street),
        weg_property_name: editData.weg_property_name || '',
        weg_street: editData.weg_street || '',
        weg_postal_code: editData.weg_postal_code || '',
        weg_city: editData.weg_city || '',
        weg_country: editData.weg_country || '',
        
        place_of_service: editData.place_of_service || '',
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
        customer_id: null,
        customer_name: '',
        customer_email: '',
        customer_phone: '',
        customer_tax_number: '',
        customer_street: '',
        customer_postal_code: '',
        customer_city: '',
        customer_country: '',
        show_weg: false,
        weg_property_name: '',
        weg_street: '',
        weg_postal_code: '',
        weg_city: '',
        weg_country: '',
        place_of_service: '',
      }

      if (prefilledCustomer) {
        initialCustomerData = {
          customer_id: prefilledCustomer.id || null,
          customer_name: prefilledCustomer.name || '',
          customer_email: prefilledCustomer.email || '',
          customer_phone: prefilledCustomer.phone || '',
          customer_tax_number: prefilledCustomer.tax_number || '',
          customer_street: prefilledCustomer.street || '',
          customer_postal_code: prefilledCustomer.postal_code || '',
          customer_city: prefilledCustomer.city || '',
          customer_country: prefilledCustomer.country || '',
          show_weg: !!(prefilledCustomer.weg_street),
          weg_property_name: prefilledCustomer.weg_property_name || '',
          weg_street: prefilledCustomer.weg_street || '',
          weg_postal_code: prefilledCustomer.weg_postal_code || '',
          weg_city: prefilledCustomer.weg_city || '',
          weg_country: prefilledCustomer.weg_country || '',
          place_of_service: prefilledCustomer.last_service_location || ''
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

  // ✅ FIXED: Search customers with correct columns
  const searchCustomers = async (searchTerm) => {
    console.log('🔍 Searching for:', searchTerm)
    
    try {
      setSearchLoading(true)
      
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, email, phone, street, postal_code, city, country, tax_number, weg_street, weg_postal_code, weg_city, weg_country, last_service_location')
        .eq('majstor_id', majstor.id)
        .or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
        .limit(10)

      console.log('📦 Results:', data)
      console.log('❌ Error:', error)

      if (!error && data) {
        setCustomerSuggestions(data)
        setShowCustomerDropdown(data.length > 0)
      }
    } catch (err) {
      console.error('Error searching customers:', err)
    } finally {
      setSearchLoading(false)
    }
  }

  // ✅ IMPROVED: Handle customer select with structured address
  const handleCustomerSelect = (customer) => {
    console.log('✅ Customer selected:', customer)

    setFormData(prev => ({
      ...prev,
      customer_id: customer.id,
      customer_name: customer.name || '',
      customer_email: customer.email || '',
      customer_phone: customer.phone || '',
      customer_tax_number: customer.tax_number || '',
      
      // ✅ Structured billing address
      customer_street: customer.street || '',
      customer_postal_code: customer.postal_code || '',
      customer_city: customer.city || '',
      customer_country: customer.country || 'Deutschland',
      show_country: customer.country && customer.country !== 'Deutschland',
      
      // ✅ WEG address (auto-show if exists)
      show_weg: !!(customer.weg_street),
      weg_property_name: customer.weg_property_name || '',  // ← DODAJ OVO
      weg_street: customer.weg_street || '',
      weg_postal_code: customer.weg_postal_code || '',
      weg_city: customer.weg_city || '',
      weg_country: customer.weg_country || 'Deutschland',
      
      // ✅ Last service location
      place_of_service: customer.last_service_location || ''
    }))
    
    setCustomerSearchTerm(customer.name)
    setShowCustomerDropdown(false)
    setCustomerSuggestions([])
  }

  // Service selection for items
  const handleServiceSelect = (itemIndex, service) => {
    const newItems = [...formData.items]
    newItems[itemIndex] = {
      ...newItems[itemIndex],
      description: service.name,
      price: service.default_price || 0,
      total: (newItems[itemIndex].quantity || 1) * (service.default_price || 0)
    }
    
    setFormData(prev => ({ ...prev, items: newItems }))
    setShowServicesDropdown(null)
    setFilteredServices([])
    
    calculateTotals(newItems)
  }

  // ✅ Handle customer name change with search
  const handleCustomerNameChange = (e) => {
    const value = e.target.value
    setCustomerSearchTerm(value)
    setFormData(prev => ({ ...prev, customer_name: value }))
    
    if (value.length >= 2 && !isEditMode && !prefilledCustomer) {
      searchCustomers(value)
    } else {
      setCustomerSuggestions([])
      setShowCustomerDropdown(false)
    }
    
    if (value.length === 0) {
      setFormData(prev => ({
        ...prev,
        customer_id: null,
        customer_name: '',
        customer_email: '',
        customer_phone: '',
        customer_tax_number: '',
        customer_street: '',
        customer_postal_code: '',
        customer_city: '',
        customer_country: 'Deutschland',
        show_country: false,
        show_weg: false,
        weg_property_name: '',  // ← DODAJ OVO
        weg_street: '',
        weg_postal_code: '',
        weg_city: '',
        weg_country: 'Deutschland',
        place_of_service: ''
      }))
    }
  }

  // Handle input change
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    
    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: checked }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  // Handle item changes with proper service filtering
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

    if (field === 'description') {
      if (value.length >= 2) {
        const filtered = filterServicesByTerm(value, services)
        setFilteredServices(filtered)
        setShowServicesDropdown(filtered.length > 0 ? index : null)
      } else {
        setFilteredServices([])
        setShowServicesDropdown(null)
      }
    }
  }

  // Add item
  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { description: '', quantity: 1, price: 0, total: 0 }]
    }))
  }

  // Remove item
  const removeItem = (index) => {
    if (formData.items.length > 1) {
      const newItems = formData.items.filter((_, i) => i !== index)
      setFormData(prev => ({ ...prev, items: newItems }))
      calculateTotals(newItems)
      
      if (showServicesDropdown === index) {
        setShowServicesDropdown(null)
        setFilteredServices([])
      }
    }
  }

  // Calculate totals
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

  // ✅ NEW: Quick-fill functions
  const copyBillingToWeg = () => {
    setFormData(prev => ({
      ...prev,
      weg_property_name: '',  // ← DODAJ OVO (ostavi prazno jer nije deo billing adrese)
      weg_street: prev.customer_street,
      weg_postal_code: prev.customer_postal_code,
      weg_city: prev.customer_city,
      weg_country: prev.customer_country
    }))
  }

  const copyWegToService = () => {
    const serviceLocation = `${formData.weg_street}, ${formData.weg_postal_code} ${formData.weg_city}`
    setFormData(prev => ({ ...prev, place_of_service: serviceLocation }))
  }

  const copyBillingToService = () => {
    const serviceLocation = `${formData.customer_street}, ${formData.customer_postal_code} ${formData.customer_city}`
    setFormData(prev => ({ ...prev, place_of_service: serviceLocation }))
  }

  // Handle submit
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // For EDIT mode + INVOICE → show confirmation modal
    if (isEditMode && editData?.id && type === 'invoice') {
      console.log('🔥 Edit invoice detected - showing confirmation modal')
      setPendingFormData(formData)
      setShowEditConfirmModal(true)
      return
    }
    
    // All other cases: save directly
    await handleActualSave()
  }

  // ✅ IMPROVED: Actual save function with customer auto-create
  const handleActualSave = async () => {
    if (!businessDataComplete) {
      setShowBusinessDataModal(true)
      return
    }

    if (!numbersInitialized) {
      setShowNumbersSetupModal(true)
      return
    }

    setError('')
    setLoading(true)

    try {
      // ✅ Validation - structured billing address required
      if (!formData.customer_name || !formData.customer_email) {
        throw new Error('Kunde Name und E-Mail sind erforderlich')
      }

      if (!formData.customer_street || !formData.customer_postal_code || !formData.customer_city) {
        throw new Error('Rechnungsadresse ist erforderlich (Straße, PLZ, Stadt)')
      }

      if (formData.items.some(item => !item.description || item.price <= 0)) {
        throw new Error('Alle Positionen müssen eine Beschreibung und einen Preis haben')
      }

      // Auto-save new services
      const serviceNames = formData.items
        .map(item => item.description?.trim())
        .filter(desc => desc && desc.length > 0)

      const uniqueServices = [...new Set(serviceNames)]
      await Promise.all(
        uniqueServices.map(serviceName => autoSaveServiceFromInvoice(serviceName))
      )

      // ✅ Check/create customer
      let customerId = formData.customer_id
      
      if (!customerId) {
        console.log('🔍 Searching for existing customer...')
        
      // ✅ FIXED: Case-insensitive duplicate detection
const { data: existingCustomers, error: searchError } = await supabase
  .from('customers')
  .select('id')
  .eq('majstor_id', majstor.id)
  .ilike('name', formData.customer_name.trim())
  .ilike('email', formData.customer_email.trim())

if (searchError) {
  console.error('ERROR searching customer:', searchError)
  throw new Error('Fehler bei der Kundensuche: ' + searchError.message)
}
        if (existingCustomers && existingCustomers.length > 0) {
          console.log('✅ Found existing customer:', existingCustomers[0].id)
          customerId = existingCustomers[0].id
          
          // Update existing customer with latest data
          await supabase
            .from('customers')
            .update({
              phone: formData.customer_phone || null,
              street: formData.customer_street,
              postal_code: formData.customer_postal_code,
              city: formData.customer_city,
              country: formData.customer_country,
              tax_number: formData.customer_tax_number || null,
              weg_property_name: formData.weg_property_name || null,  // ← DODAJ OVO
              weg_street: formData.weg_street || null,
              weg_postal_code: formData.weg_postal_code || null,
              weg_city: formData.weg_city || null,
              weg_country: formData.weg_country || null,
              last_service_location: formData.place_of_service || null,
              last_contact_date: new Date().toISOString().split('T')[0],
              updated_at: new Date().toISOString()
            })
            .eq('id', customerId)
        } else {
          console.log('➕ Creating new customer...')
          
          // Create new customer
          const { data: newCustomer, error: customerError } = await supabase
            .from('customers')
            .insert({
              majstor_id: majstor.id,
              name: formData.customer_name.trim(),
              email: formData.customer_email.trim(),
              phone: formData.customer_phone || null,
              street: formData.customer_street,
              postal_code: formData.customer_postal_code,
              city: formData.customer_city,
              country: formData.customer_country,
              tax_number: formData.customer_tax_number || null,
              weg_property_name: formData.weg_property_name || null,  // ← DODAJ OVO
              weg_street: formData.weg_street || null,
              weg_postal_code: formData.weg_postal_code || null,
              weg_city: formData.weg_city || null,
              weg_country: formData.weg_country || null,
              last_service_location: formData.place_of_service || null,
              source: 'invoice',
              last_contact_date: new Date().toISOString().split('T')[0]
            })
            .select()
            .single()
          
          if (customerError) throw customerError
          
          console.log('✅ Customer created:', newCustomer.id)
          customerId = newCustomer.id
        }
      } else {
        console.log('🔄 Updating existing customer:', customerId)
        
        // Update existing customer
        await supabase
          .from('customers')
          .update({
            phone: formData.customer_phone || null,
            street: formData.customer_street,
            postal_code: formData.customer_postal_code,
            city: formData.customer_city,
            country: formData.customer_country,
            tax_number: formData.customer_tax_number || null,
            weg_property_name: formData.weg_property_name || null,  // ← DODAJ OVO
            weg_street: formData.weg_street || null,
            weg_postal_code: formData.weg_postal_code || null,
            weg_city: formData.weg_city || null,
            weg_country: formData.weg_country || null,
            last_service_location: formData.place_of_service || null,
            last_contact_date: new Date().toISOString().split('T')[0],
            updated_at: new Date().toISOString()
          })
          .eq('id', customerId)
      }

      const dueDate = new Date(formData.issue_date)
      dueDate.setDate(dueDate.getDate() + formData.payment_terms_days)

      // ✅ Create invoice with customer_id + structured addresses
      const invoiceData = {
        majstor_id: majstor.id,
        customer_id: customerId,
        type: type,
        customer_name: formData.customer_name,
        customer_email: formData.customer_email,
        customer_phone: formData.customer_phone || null,
        customer_tax_number: formData.customer_tax_number || null,
        
        // ✅ Structured billing address
        customer_street: formData.customer_street,
        customer_postal_code: formData.customer_postal_code,
        customer_city: formData.customer_city,
        customer_country: formData.customer_country,
        
        // ✅ WEG address (nullable)
        weg_property_name: formData.weg_property_name || null,  // ← DODAJ OVO
        weg_street: formData.weg_street || null,
        weg_postal_code: formData.weg_postal_code || null,
        weg_city: formData.weg_city || null,
        weg_country: formData.weg_country || null,
        
        // Service location
        place_of_service: formData.place_of_service || null,
        
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
        // UPDATE EXISTING INVOICE/QUOTE
        result = await supabase
          .from('invoices')
          .update({ ...invoiceData, updated_at: new Date().toISOString() })
          .eq('id', editData.id)
          .select()
          .single()

        if (result.error) throw result.error

        // AUTO-REGENERATE PDF AFTER EDIT (for invoices)
        if (type === 'invoice') {
          console.log('📄 Invoice updated, regenerating PDF to ensure sync...')
          
          try {
            const regenResponse = await fetch(
              `/api/invoices/${editData.id}/pdf?forceRegenerate=true`,
              {
                method: 'GET',
                headers: { 'Cache-Control': 'no-cache' }
              }
            )
            
            if (regenResponse.ok) {
              console.log('✅ PDF successfully regenerated after edit')
              console.log('🇪🇺 ZUGFeRD XML synchronized with updated invoice data')
            } else {
              console.error('❌ PDF regeneration failed:', regenResponse.statusText)
              throw new Error('PDF regeneration failed')
            }
          } catch (regenError) {
            console.error('❌ PDF regeneration error:', regenError)
            
            alert(
              '⚠️ WICHTIG: PDF/ZUGFeRD Regenerierung fehlgeschlagen!\n\n' +
              'Die Rechnung wurde in der Datenbank aktualisiert, aber:\n' +
              '• Das PDF ist möglicherweise veraltet\n' +
              '• Das ZUGFeRD XML enthält alte Daten\n\n' +
              '⛔ Bitte NICHT per E-Mail versenden!\n' +
              '⛔ Kontaktieren Sie den Support oder regenerieren Sie das PDF manuell.\n\n' +
              'Details: ' + regenError.message
            )
          }
        }

      } else {
        // CREATE NEW INVOICE/QUOTE
        result = await supabase
          .from('invoices')
          .insert(invoiceData)
          .select()
          .single()

        if (result.error) throw result.error

        // Try PDF generation
        console.log('🤖 Generating PDF for new document:', result.data.id)
        
        try {
          const pdfResponse = await fetch(`/api/invoices/${result.data.id}/pdf`)
          
          if (pdfResponse.ok) {
            console.log('✅ PDF successfully generated')
          } else {
            throw new Error(pdfResponse.statusText)
          }
        } catch (pdfError) {
          console.error('❌ PDF generation failed:', pdfError)
          
          alert(
            '⚠️ WICHTIG: PDF wurde nicht generiert!\n\n' +
            'Die Rechnung ist gespeichert, aber das PDF fehlt.\n' +
            'Bitte öffnen Sie die Rechnung über "Ansehen" um das PDF zu generieren.'
          )
        }
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

  // Handler for confirm edit (YES)
  const handleConfirmEdit = async () => {
    console.log('✅ User confirmed edit - proceeding with save + regenerate')
    setShowEditConfirmModal(false)
    setPendingFormData(null)
    await handleActualSave()
  }

  // Handler for cancel edit (NO)
  const handleCancelEdit = () => {
    console.log('❌ User cancelled edit - no changes saved')
    setShowEditConfirmModal(false)
    setPendingFormData(null)
  }

  // Format currency
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
    <>
      {/* Business Data Modal */}
      <BusinessDataModal />
      
      {/* Numbers Setup Modal */}
      <InvoiceNumbersSetupModal
        isOpen={showNumbersSetupModal}
        onClose={() => setShowNumbersSetupModal(false)}
        majstor={majstor}
        onSuccess={handleNumbersSetupSuccess}
      />
      
      {/* Edit Confirmation Modal */}
      <EditConfirmationModal />
      
      {/* Main Invoice Creator Modal */}
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
            <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl">✕</button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            
            {/* Business Data Warning */}
            {!businessDataComplete && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <span className="text-yellow-400 text-xl">⚠️</span>
                  <div>
                    <h4 className="text-yellow-300 font-medium mb-2">Profil unvollständig</h4>
                    <p className="text-yellow-200 text-sm mb-3">
                      Ihr Geschäftsprofil ist noch nicht vollständig.
                      Für professionelle Rechnungen empfehlen wir:
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowBusinessDataModal(true)}
                      className="bg-yellow-600 text-white px-4 py-2 rounded text-sm hover:bg-yellow-700 transition-colors"
                    >
                      Profil vervollständigen
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Numbers Not Initialized Warning */}
            {businessDataComplete && !numbersInitialized && (
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <span className="text-orange-400 text-xl">🔢</span>
                  <div>
                    <h4 className="text-orange-300 font-medium mb-2">Rechnungsnummern einrichten</h4>
                    <p className="text-orange-200 text-sm mb-3">
                      Bevor Sie Ihre erste Rechnung erstellen, müssen Sie die Startnummern für Angebote und Rechnungen festlegen.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowNumbersSetupModal(true)}
                      className="bg-orange-600 text-white px-4 py-2 rounded text-sm hover:bg-orange-700 transition-colors"
                    >
                      Nummern einrichten
                    </button>
                  </div>
                </div>
              </div>
            )}

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
                        : `${formData.tax_rate}% MwSt. wird berechnet`
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ✅ CUSTOMER INFORMATION - IMPROVED */}
<div>
  <h4 className="text-white font-semibold mb-4">📋 Kundeninformationen</h4>
  
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {/* Customer Name - Autocomplete */}
    <div className="relative" ref={customerInputRef}>
      <label className="block text-sm font-medium text-slate-300 mb-2">
        Kundenname * {!isEditMode && '(mindestens 2 Zeichen)'}
      </label>
      <input
        type="text"
        value={customerSearchTerm}
        onChange={handleCustomerNameChange}
        required
        className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white"
        placeholder="z.B. Max Mustermann"
      />
      
      {/* Customer Suggestions Dropdown */}
      {showCustomerDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto">
          {searchLoading ? (
            <div className="p-3 text-slate-400 text-center">
              🔍 Suche...
            </div>
          ) : customerSuggestions.length === 0 ? (
            <div className="p-3 text-slate-400 text-center">
              Keine Kunden gefunden
            </div>
          ) : (
            customerSuggestions.map((customer, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleCustomerSelect(customer)}
                className="w-full text-left px-3 py-2 hover:bg-slate-700 text-white text-sm border-b border-slate-700 last:border-b-0 focus:outline-none focus:bg-slate-700"
              >
                <div className="font-medium">{customer.name}</div>
                <div className="text-slate-400 text-xs">📧 {customer.email}</div>
                {customer.phone && (
                  <div className="text-slate-400 text-xs">📞 {customer.phone}</div>
                )}
                {customer.street && (
                  <div className="text-slate-400 text-xs">📍 {customer.street}, {customer.postal_code} {customer.city}</div>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>

    {/* Email */}
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
    
    {/* Phone */}
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

    {/* Tax Number */}
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-2">
        Steuernummer (optional)
      </label>
      <input
        type="text"
        name="customer_tax_number"
        value={formData.customer_tax_number}
        onChange={handleInputChange}
        className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white"
        placeholder="DE123456789"
      />
    </div>
  </div>

  {/* ✅ BILLING ADDRESS - STRUCTURED FIELDS */}
  <div className="mt-4 p-4 bg-slate-900/30 rounded-lg border-l-4 border-blue-500">
    <h5 className="text-white font-medium mb-3">Rechnungsadresse</h5>
    
    <div className="grid grid-cols-1 gap-3">
      {/* Street */}
      <div>
        <label className="block text-sm text-slate-400 mb-1">Straße und Hausnummer *</label>
        <input
          type="text"
          name="customer_street"
          value={formData.customer_street}
          onChange={handleInputChange}
          required
          className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white"
          placeholder="z.B. Musterstraße 123"
        />
      </div>
      
      {/* PLZ + City */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm text-slate-400 mb-1">PLZ *</label>
          <input
            type="text"
            name="customer_postal_code"
            value={formData.customer_postal_code}
            onChange={handleInputChange}
            required
            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white"
            placeholder="12345"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1">Stadt *</label>
          <input
            type="text"
            name="customer_city"
            value={formData.customer_city}
            onChange={handleInputChange}
            required
            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white"
            placeholder="z.B. Berlin"
          />
        </div>
      </div>
      
    {/* ✅ Country - UVEK VIDLJIVO */}
      <div>
        <label className="block text-sm text-slate-400 mb-1">Land (optional)</label>
        <select
          name="customer_country"
          value={formData.customer_country}
          onChange={handleInputChange}
          className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white"
        >
          <option value="">-- Nicht angegeben --</option>
          <option value="Deutschland">🇩🇪 Deutschland</option>
          <option value="Österreich">🇦🇹 Österreich</option>
          <option value="Schweiz">🇨🇭 Schweiz</option>
          <option value="Serbien">🇷🇸 Serbien</option>
          <option value="Kroatien">🇭🇷 Kroatien</option>
          <option value="Frankreich">🇫🇷 Frankreich</option>
          <option value="Italien">🇮🇹 Italien</option>
          <option value="Niederlande">🇳🇱 Niederlande</option>
          <option value="Polen">🇵🇱 Polen</option>
        </select>
      </div>
    </div>
  </div>

  {/* ✅ WEG/OBJECT ADDRESS - MINIMALIST + CHECKBOX COUNTRY */}
<div className="mt-4">
  {!formData.show_weg ? (
    <button
      type="button"
      onClick={() => setFormData(prev => ({ ...prev, show_weg: true }))}
      className="w-full p-3 flex items-center gap-3 text-blue-400 hover:text-blue-300 transition-colors text-sm bg-transparent"
    >
      <div className="w-1 h-6 bg-blue-500 rounded-full"></div>
      <span>+ Objektadresse hinzufügen (falls abweichend)</span>
    </button>
  ) : (
    <div className="p-4 bg-slate-900/30 rounded-lg border-l-4 border-green-500">
      <div className="flex justify-between items-center mb-3">
        <h5 className="text-green-300 font-medium">Objektadresse</h5>
        <button
          type="button"
          onClick={() => setFormData(prev => ({ 
            ...prev, 
            show_weg: false,
            weg_property_name: '',  // ← DODAJ OVO
            weg_street: '',
            weg_postal_code: '',
            weg_city: '',
            weg_country: 'Deutschland'
          }))}
          className="text-slate-400 hover:text-white text-xl"
          title="Objektadresse entfernen"
        >
          ×
        </button>
      </div>
      
      <div className="grid grid-cols-1 gap-3">
        {/* 🔥 NOVO POLJE - DODAJ OVDE */}
        <div>
          <label className="block text-sm text-slate-400 mb-1">Objektname</label>
          <input
            type="text"
            name="weg_property_name"
            value={formData.weg_property_name}
            onChange={handleInputChange}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white"
            placeholder="z.B. Wohnanlage Musterpark"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1">Straße und Hausnummer</label>
          <input
            type="text"
            name="weg_street"
            value={formData.weg_street}
            onChange={handleInputChange}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white"
            placeholder="z.B. Musterstraße 123"
          />
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-slate-400 mb-1">PLZ</label>
            <input
              type="text"
              name="weg_postal_code"
              value={formData.weg_postal_code}
              onChange={handleInputChange}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white"
              placeholder="12345"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Stadt</label>
            <input
              type="text"
              name="weg_city"
              value={formData.weg_city}
              onChange={handleInputChange}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white"
              placeholder="z.B. Berlin"
            />
          </div>
        </div>
        
     {/* ✅ WEG Country - UVEK VIDLJIVO */}
        <div>
          <label className="block text-sm text-slate-400 mb-1">Land (optional)</label>
          <select
            name="weg_country"
            value={formData.weg_country}
            onChange={handleInputChange}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white"
          >
            <option value="">-- Nicht angegeben --</option>
            <option value="Deutschland">🇩🇪 Deutschland</option>
            <option value="Österreich">🇦🇹 Österreich</option>
            <option value="Schweiz">🇨🇭 Schweiz</option>
            <option value="Serbien">🇷🇸 Serbien</option>
            <option value="Kroatien">🇭🇷 Kroatien</option>
            <option value="Frankreich">🇫🇷 Frankreich</option>
            <option value="Italien">🇮🇹 Italien</option>
            <option value="Niederlande">🇳🇱 Niederlande</option>
            <option value="Polen">🇵🇱 Polen</option>
          </select>
        </div>
      </div>
      
      <p className="text-xs text-slate-500 mt-3">
        💡 Z.B. WEG-Gebäude, Baustelle, oder Arbeitsort falls abweichend von Rechnungsadresse
      </p>
    </div>
  )}
</div>

  {/* ✅ SERVICE LOCATION - IMPROVED WITH QUICK-FILL */}
  <div className="mt-4">
    <label className="block text-sm font-medium text-slate-300 mb-2">
      📍 Ort der Leistung (optional)
    </label>
    <div className="flex gap-2 mb-2">
      <button
        type="button"
        onClick={copyBillingToService}
        className="px-3 py-1 bg-slate-700 text-slate-300 text-xs rounded hover:bg-slate-600 transition-colors"
      >
        📋 Von Rechnungsadresse
      </button>
      {formData.show_weg && (
        <button
          type="button"
          onClick={copyWegToService}
          className="px-3 py-1 bg-slate-700 text-slate-300 text-xs rounded hover:bg-slate-600 transition-colors"
        >
          📋 Von Lieferadresse
        </button>
      )}
    </div>
    <input
      type="text"
      name="place_of_service"
      value={formData.place_of_service}
      onChange={handleInputChange}
      className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white"
      placeholder="z.B. Berlin, 10115 Berlin, Treppenhaus 2.OG"
    />
    <p className="text-xs text-slate-500 mt-1">
      💡 Wichtig für steuerliche Zwecke und ZUGFeRD-Compliance
    </p>
  </div>
</div>

            {/* Items Section */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-white font-semibold">Positionen</h4>
                <button
                  type="button"
                  onClick={addItem}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                >
                  + Position hinzufügen
                </button>
              </div>
              
              <div className="space-y-3">
                {formData.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-3 p-3 bg-slate-900/50 rounded-lg relative">
                    <div className="md:col-span-5 relative" ref={showServicesDropdown === index ? servicesDropdownRef : null}>
                      <label className="block text-sm text-slate-400 mb-1">Beschreibung *</label>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white text-sm"
                        placeholder="z.B. Beratung (min. 2 Zeichen)"
                        required
                      />
                      
                      {/* Services Dropdown */}
                      {showServicesDropdown === index && filteredServices.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                          {filteredServices.map((service, sIndex) => (
                            <button
                              key={sIndex}
                              type="button"
                              onClick={() => handleServiceSelect(index, service)}
                              className="w-full text-left px-3 py-2 hover:bg-slate-700 text-white text-sm border-b border-slate-700 last:border-b-0"
                            >
                              <div className="font-medium">{service.name}</div>
                              {service.default_price && (
                                <div className="text-slate-400 text-xs">{formatCurrency(service.default_price)}</div>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-sm text-slate-400 mb-1">Menge *</label>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white text-sm"
                        placeholder="1"
                        required
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-sm text-slate-400 mb-1">
                        Einzelpreis ({formData.is_kleinunternehmer ? 'inkl.' : 'netto'})
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
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
                    <span className="text-slate-400">zzgl. MwSt. ({formData.tax_rate}%):</span>
                    <span className="text-white">{formatCurrency(formData.tax_amount)}</span>
                  </div>
                )}
                
                <div className="flex justify-between pt-2 border-t border-slate-700">
                  <span className="text-white font-semibold">Gesamtbetrag:</span>
                  <span className="text-white font-semibold text-lg">{formatCurrency(formData.total_amount)}</span>
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div>
              <h4 className="text-white font-semibold mb-4">Zusätzliche Informationen</h4>
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
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Anmerkungen / Zusätzliche Informationen
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white"
                  placeholder="z.B. Zahlungsbedingungen, Lieferhinweise, Danksagung, etc."
                />
                <p className="text-xs text-slate-500 mt-1">
                  Diese Informationen erscheinen am Ende des PDFs
                </p>
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
                disabled={loading || formData.total_amount <= 0 || !businessDataComplete || !numbersInitialized}
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
    </>
  )
}