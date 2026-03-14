// app/components/InvoiceCreator.js - WEG ADDRESS SYSTEM IMPLEMENTATION
'use client'

// Client-side image compression before upload (same pattern as ausgaben page)
function compressImage(file, maxWidth = 1920) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      let { width, height } = img
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width)
        width = maxWidth
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d').drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        blob => resolve(blob ? new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }) : file),
        'image/jpeg', 0.82
      )
    }
    img.onerror = () => resolve(file) // fallback: use original
    img.src = URL.createObjectURL(file)
  })
}
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import InvoiceNumbersSetupModal from './InvoiceNumbersSetupModal'
import RegieberichtForm from './RegieberichtForm'

export default function InvoiceCreator({
  isOpen,
  onClose,
  type = 'quote',
  majstor,
  onSuccess,
  editData = null,
  isEditMode = false,
  prefilledCustomer = null,
  prefilledItems = null,
  aufmassId = null
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
    items: [{ description: '', quantity: 1, unit: '', price: 0, price_gross: 0, total: 0, price_source: 'netto' }],
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

  // Voice recording states
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [showVoiceExamples, setShowVoiceExamples] = useState(false)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const micPermissionGrantedRef = useRef(false)

  // Attachments
  const [pendingAttachments, setPendingAttachments] = useState([]) // {file, localId}
  const [savedAttachments, setSavedAttachments] = useState([])     // from DB
  const [showRegieForm, setShowRegieForm] = useState(false)
  const [aufmassAttached, setAufmassAttached] = useState(false)
  const [aufmassAttaching, setAufmassAttaching] = useState(false)
  const [aufmassLocalId, setAufmassLocalId] = useState(null)
  const [showAufmassPicker, setShowAufmassPicker] = useState(false)
  const [aufmassPickerList, setAufmassPickerList] = useState([])
  const [aufmassPickerLoading, setAufmassPickerLoading] = useState(false)
  const [selectedAufmassId, setSelectedAufmassId] = useState(aufmassId)

  // Check business data completeness on mount
  useEffect(() => {
    if (isOpen && majstor?.id) {
      checkBusinessDataCompleteness()
      if (businessDataComplete) {
        checkNumbersInitialization()
      }
      loadServices()
      initializeFormData()
      setAufmassAttached(false)
    }
  }, [isOpen, majstor?.id, type, editData, isEditMode, businessDataComplete, prefilledItems])

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

      // Aufmaß import: prefilledItems → mapirati u InvoiceCreator format
      const importedItems = prefilledItems?.length > 0
        ? prefilledItems.map(i => ({
            description: i.description || '',
            quantity: i.quantity || 1,
            unit: i.unit || '',
            price: 0,
            price_gross: 0,
            total: 0,
            price_source: 'netto',
          }))
        : null

      const initialFormData = {
        ...initialCustomerData,
        items: importedItems || [{ description: '', quantity: 1, price: 0, price_gross: 0, total: 0, price_source: 'netto' }],
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
    const taxRate = parseFloat(formData.tax_rate) || 0
    const taxMultiplier = 1 + taxRate / 100

    if (field === 'quantity') {
      const quantity = parseFloat(value) || 0
      if (newItems[index].price_source === 'brutto') {
        const gross = parseFloat(newItems[index].price_gross) || 0
        newItems[index].total = parseFloat((quantity * gross / taxMultiplier).toFixed(2))
      } else {
        const price = parseFloat(newItems[index].price) || 0
        newItems[index].total = parseFloat((quantity * price).toFixed(2))
      }
    }

    if (field === 'price') {
      const quantity = parseFloat(newItems[index].quantity) || 0
      const price = parseFloat(value) || 0
      newItems[index].price_source = 'netto'
      newItems[index].total = parseFloat((quantity * price).toFixed(2))
      newItems[index].price_gross = parseFloat((price * taxMultiplier).toFixed(2))
    }

    if (field === 'price_gross') {
      const gross = parseFloat(value) || 0
      const net = parseFloat((gross / taxMultiplier).toFixed(2))
      const quantity = parseFloat(newItems[index].quantity) || 0
      newItems[index].price_source = 'brutto'
      newItems[index].price = net
      newItems[index].total = parseFloat((quantity * gross / taxMultiplier).toFixed(2))
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
      items: [...prev.items, { description: '', quantity: 1, unit: '', price: 0, price_gross: 0, total: 0, price_source: 'netto' }]
    }))
  }

  // Open Aufmaß picker modal
  const openAufmassPicker = async () => {
    setShowAufmassPicker(true)
    setAufmassPickerLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/aufmasse', {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      })
      const json = await res.json()
      setAufmassPickerList(json.aufmasse || [])
    } catch (e) {
      console.error('Aufmaß list error:', e)
    } finally {
      setAufmassPickerLoading(false)
    }
  }

  // Import Aufmaß items into current invoice (append)
  const importAufmass = (aufmass) => {
    const flatItems = []
    for (const room of (aufmass.rooms || [])) {
      const nettoByUnit = {}
      for (const item of (room.items || [])) {
        if (!item.result) continue
        const rawU = item.unit || ''
        const u = ['Wand', 'Bogen', 'Trap'].includes(rawU) ? 'm²' : rawU
        const sign = item.subtract ? -1 : 1
        nettoByUnit[u] = (nettoByUnit[u] || 0) + sign * item.result
      }
      for (const [unit, netto] of Object.entries(nettoByUnit)) {
        if (netto <= 0) continue
        const m2Units = ['m²', 'Wand', 'Bogen', 'Trap']
        const matchUnits = unit === 'm²' ? m2Units : [unit]
        const descs = room.items
          .filter(i => !i.subtract && !i.isForm && matchUnits.includes(i.unit || '') && i.description)
          .map(i => i.description)
          .filter(Boolean)
          .join(', ')
        flatItems.push({
          description: [room.name, descs].filter(Boolean).join(': '),
          quantity: Math.round(netto * 100) / 100,
          unit,
          price: 0,
          price_gross: 0,
          total: 0,
          price_source: 'netto',
        })
      }
    }
    // Add materials
    for (const mat of (aufmass.materials || [])) {
      if (!mat.description) continue
      flatItems.push({
        description: mat.description,
        quantity: parseFloat(mat.quantity) || 1,
        unit: mat.unit || 'Stk',
        price: 0,
        price_gross: 0,
        total: 0,
        price_source: 'netto',
      })
    }
    if (flatItems.length === 0) return
    // Append to existing items (remove trailing empty items first)
    setFormData(prev => {
      const existingItems = prev.items.filter(i => i.description || i.price || i.quantity > 1)
      return { ...prev, items: [...existingItems, ...flatItems] }
    })
    setSelectedAufmassId(aufmass.id)
    setAufmassAttached(false) // reset so banner shows
    setShowAufmassPicker(false)
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
    if (formData.is_kleinunternehmer) {
      const subtotal = parseFloat(items.reduce((sum, item) => sum + (item.total || 0), 0).toFixed(2))
      setFormData(prev => ({ ...prev, subtotal, tax_amount: 0, total_amount: subtotal }))
      return
    }

    const taxRate = parseFloat(formData.tax_rate) || 0

    // Sum per-item rounded netto totals — each item rounded first, then summed
    const subtotal = parseFloat(items.reduce((sum, item) =>
      sum + parseFloat((item.total || 0).toFixed(2)), 0).toFixed(2))
    // Tax rounded per item, then summed (German accounting standard)
    const taxAmount = parseFloat(items.reduce((sum, item) =>
      sum + parseFloat(((item.total || 0) * taxRate / 100).toFixed(2)), 0).toFixed(2))
    const totalAmount = parseFloat((subtotal + taxAmount).toFixed(2))

    setFormData(prev => ({
      ...prev,
      subtotal,
      tax_amount: taxAmount,
      total_amount: totalAmount
    }))
  }

  // Voice recording functions
  const startRecording = async (e) => {
    e.preventDefault()
    try {
      // Check mic permission before starting — avoids recording starting right after allow prompt
      if (!micPermissionGrantedRef.current) {
        let alreadyGranted = false
        try {
          const perm = await navigator.permissions.query({ name: 'microphone' })
          if (perm.state === 'granted') {
            alreadyGranted = true
            micPermissionGrantedRef.current = true
            localStorage.setItem('micPermission', 'granted')
          } else if (perm.state === 'denied') {
            setError('Mikrofonzugriff verweigert. Bitte in den Browser-Einstellungen erlauben.')
            return
          }
          // state === 'prompt' → fall through to request permission
        } catch {
          // iOS Safari: permissions API not supported — check localStorage fallback
          if (localStorage.getItem('micPermission') === 'granted') {
            alreadyGranted = true
            micPermissionGrantedRef.current = true
          }
        }

        if (!alreadyGranted) {
          // Request permission only — immediately stop stream, don't record yet
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
          stream.getTracks().forEach(t => t.stop())
          micPermissionGrantedRef.current = true
          localStorage.setItem('micPermission', 'granted')
          return // User presses button again to actually record
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioChunksRef.current = []
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/ogg;codecs=opus'
      const mediaRecorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }
      mediaRecorder.start()
      setIsRecording(true)
    } catch {
      setError('Mikrofonzugriff verweigert')
    }
  }

  const stopRecording = async (e) => {
    e.preventDefault()
    if (!mediaRecorderRef.current || !isRecording) return
    setIsRecording(false)
    setIsProcessing(true)

    // onstop mora biti postavljen PRIJE stop() — izbjegavamo race condition
    mediaRecorderRef.current.onstop = async () => {
      try {
        const mimeType = mediaRecorderRef.current.mimeType || 'audio/webm'
        const ext = mimeType.includes('ogg') ? 'ogg' : 'webm'
        const blob = new Blob(audioChunksRef.current, { type: mimeType })
        const formDataObj = new FormData()
        formDataObj.append('audio', blob, `recording.${ext}`)

        const { data: { session } } = await supabase.auth.getSession()
        const res = await fetch('/api/voice-invoice', {
          method: 'POST',
          headers: { Authorization: `Bearer ${session?.access_token}` },
          body: formDataObj,
        })
        const data = await res.json()

        if (res.status === 429) { setError(`Tageslimit erreicht (${data.used}/${data.limit} Sprachdiktate heute)`); return }
        if (data.error) { setError(data.detail || data.error); return }

        applyVoiceData(data)
      } catch (err) {
        console.error('Voice invoice error:', err)
        setError('Fehler bei der Sprachverarbeitung')
      } finally {
        setIsProcessing(false)
      }
    }

    mediaRecorderRef.current.stop()
    mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop())
  }

  const applyVoiceData = async (data) => {
    const { customer, items } = data

    // Kleinunternehmer haben keine MwSt — diktierte Preise sind immer Netto
    const isKlein = majstor?.is_kleinunternehmer || false
    const taxRate = formData.tax_rate || 19

    const newItems = (items || []).map(item => {
      const isBrutto = !isKlein && item.price_source === 'brutto'
      const rawPrice = parseFloat(item.price) || 0
      const qty = parseFloat(item.quantity) || 1
      const netPrice = isBrutto
        ? parseFloat((rawPrice / (1 + taxRate / 100)).toFixed(2))
        : rawPrice
      const grossPrice = isKlein
        ? netPrice
        : isBrutto
          ? rawPrice
          : parseFloat((rawPrice * (1 + taxRate / 100)).toFixed(2))
      return {
        description: item.description || '',
        quantity: qty,
        price: netPrice,
        price_gross: grossPrice,
        total: parseFloat((netPrice * qty).toFixed(2)),
        price_source: isKlein ? 'netto' : (item.price_source || 'brutto'),
      }
    })

    const filledItems = newItems.length > 0 ? newItems : formData.items

    // Try to auto-select existing customer from DB
    let customerAutoSelected = false
    if (customer?.name && majstor?.id) {
      try {
        const { data: matches } = await supabase
          .from('customers')
          .select('id, name, email, phone, street, postal_code, city, country, tax_number, weg_street, weg_postal_code, weg_city, weg_country, last_service_location')
          .eq('majstor_id', majstor.id)
          .ilike('name', customer.name)
          .limit(5)

        if (matches?.length === 1) {
          // Exact single match — auto-select, fills all fields
          handleCustomerSelect(matches[0])
          customerAutoSelected = true
        } else if (matches?.length > 1) {
          // Multiple matches — show dropdown
          setCustomerSearchTerm(customer.name)
          setCustomerSuggestions(matches)
          setShowCustomerDropdown(true)
        }
      } catch (err) {
        console.error('Voice customer search error:', err)
      }
    }

    if (!customerAutoSelected) {
      setFormData(prev => ({
        ...prev,
        ...(customer?.name && { customer_name: customer.name }),
        ...(customer?.email && { customer_email: customer.email }),
        ...(customer?.phone && { customer_phone: customer.phone }),
        ...(customer?.street && { customer_street: customer.street }),
        ...(customer?.postal_code && { customer_postal_code: customer.postal_code }),
        ...(customer?.city && { customer_city: customer.city }),
        ...(customer?.country && { customer_country: customer.country }),
        items: filledItems,
      }))
      if (customer?.name) setCustomerSearchTerm(customer.name)
    } else {
      // Customer auto-selected, still apply items
      setFormData(prev => ({ ...prev, items: filledItems }))
    }

    calculateTotals(filledItems)

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
      dueDate.setDate(dueDate.getDate() + parseInt(formData.payment_terms_days))

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
        converted_from_quote_id: editData?.converted_from_quote_id || null,
        aufmass_id: selectedAufmassId || aufmassId || editData?.aufmass_id || null
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



     } else {
        // CREATE NEW INVOICE/QUOTE
        result = await supabase
          .from('invoices')
          .insert(invoiceData)
          .select()
          .single()

        if (result.error) throw result.error

       
      }

      // Upload pending attachments
      if (pendingAttachments.length > 0) {
        const invoiceId = result.data.id
        await Promise.all(pendingAttachments.map(async ({ file }) => {
          const safeName = file.name.replace(/[^a-zA-Z0-9äöüÄÖÜß._-]/g, '_')
          const path = `attachments/${majstor.id}/${invoiceId}/${Date.now()}_${safeName}`
          const { error: uploadErr } = await supabase.storage
            .from('invoice-pdfs')
            .upload(path, file, { contentType: file.type || 'application/octet-stream', upsert: false })
          if (uploadErr) throw uploadErr
          await supabase.from('invoice_attachments').insert({
            invoice_id: invoiceId,
            majstor_id: majstor.id,
            storage_path: path,
            filename: file.name,
            file_size: file.size,
            mime_type: file.type || null
          })
        }))
        setPendingAttachments([])
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

  // Load saved attachments when editing an existing invoice
  useEffect(() => {
    if (isEditMode && editData?.id) {
      supabase
        .from('invoice_attachments')
        .select('*')
        .eq('invoice_id', editData.id)
        .then(({ data }) => {
          setSavedAttachments(data || [])
          if ((data || []).some(a => a.filename?.startsWith('Aufmass_'))) {
            setAufmassAttached(true)
          }
        })
    } else {
      setSavedAttachments([])
      setPendingAttachments([])
    }
  }, [isEditMode, editData?.id])

  // Attachment helpers
  const formatFileSize = (bytes) => {
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files)
    const total = savedAttachments.length + pendingAttachments.length + files.length
    if (total > 20) { setError('Maximal 20 Anhänge erlaubt'); return }
    const oversized = files.filter(f => f.size > 30 * 1024 * 1024)
    if (oversized.length > 0) { setError(`Datei zu groß (max. 30 MB): ${oversized.map(f => f.name).join(', ')}`); return }

    // Compress images client-side before upload; leave non-image files as-is
    const processed = await Promise.all(files.map(async f => {
      const compressed = f.type.startsWith('image/') ? await compressImage(f) : f
      return { file: compressed, localId: crypto.randomUUID() }
    }))

    setPendingAttachments(prev => [...prev, ...processed])
    e.target.value = ''
  }

  const removePendingAttachment = (localId) => {
    setPendingAttachments(prev => prev.filter(a => a.localId !== localId))
    if (localId === aufmassLocalId) {
      setAufmassAttached(false)
      setAufmassLocalId(null)
    }
  }

  const handlePreviewSavedAttachment = async (att) => {
    const { data } = await supabase.storage.from('invoice-pdfs').createSignedUrl(att.storage_path, 60)
    if (!data?.signedUrl) return
    const a = document.createElement('a')
    a.href = data.signedUrl
    a.target = '_blank'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const handleDeleteSavedAttachment = async (att) => {
    await supabase.storage.from('invoice-pdfs').remove([att.storage_path])
    await supabase.from('invoice_attachments').delete().eq('id', att.id)
    setSavedAttachments(prev => {
      const next = prev.filter(a => a.id !== att.id)
      if (att.filename?.startsWith('Aufmass_') && !next.some(a => a.filename?.startsWith('Aufmass_'))) {
        setAufmassAttached(false)
      }
      return next
    })
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

            {/* Voice Quick-Entry */}
            {!isEditMode && (
              <div className="bg-slate-700/40 border border-slate-600 rounded-lg p-4">
                <div className="flex flex-col items-center gap-1 mb-3 text-center">
                  <span className="text-white font-medium text-sm">✨ Schnellerfassung per Sprache</span>
                  <span className="text-slate-400 text-xs">Gedrückt halten und Rechnung diktieren</span>
                </div>
                <button
                  type="button"
                  onMouseDown={startRecording}
                  onMouseUp={stopRecording}
                  onTouchStart={startRecording}
                  onTouchEnd={stopRecording}
                  disabled={isProcessing}
                  className={`w-full py-3 px-4 rounded-lg font-medium text-sm transition-all select-none ${
                    isProcessing
                      ? 'bg-slate-600 text-slate-400 cursor-wait'
                      : isRecording
                      ? 'bg-red-500/20 border-2 border-red-500 text-red-400 animate-pulse'
                      : 'bg-violet-600/20 border border-violet-500/50 text-violet-300 hover:bg-violet-600/30 active:bg-violet-600/40'
                  }`}
                >
                  {isProcessing ? '⏳ Wird verarbeitet...' : isRecording ? '🔴 Aufnahme läuft — loslassen zum Beenden' : '🎙 Hier gedrückt halten & sprechen'}
                </button>

                <div className="mt-2 flex items-center gap-2">
                  <p className="flex-1 text-slate-500 text-xs">
                    Beispiel: <span className="text-slate-400">„Kunde ist Müller, Leistung ist Rohrreparatur, Preis ist 500 Euro"</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowVoiceExamples(p => !p)}
                    className="flex-shrink-0 text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 transition-colors"
                    title="Mehr Beispiele"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
                      <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75S21.75 6.615 21.75 12 17.385 21.75 12 21.75 2.25 17.385 2.25 12zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 01.67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 11-.671-1.34l.041-.022zM12 9a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>

                {showVoiceExamples && (
                  <div className="mt-2 bg-slate-800 border border-slate-700 rounded p-3 text-xs text-slate-300 space-y-2">
                    <p className="text-slate-400 italic">Nur das sprechen, was bekannt ist — fehlende Felder können danach manuell ergänzt werden.</p>
                    <p className="text-slate-400 italic">💡 Bekannter Kunde? Nur den Namen nennen — alle Daten werden automatisch ausgefüllt.</p>
                    <p className="text-slate-300"><span className="text-slate-400 font-medium">Einfach:</span> „Kunde ist Müller, Leistung ist Rohrreparatur, Preis ist 500 Euro"</p>
                    <p className="text-slate-300"><span className="text-slate-400 font-medium">Vollständig:</span> „Kunde ist Müller, Straße: Hauptstraße 5, PLZ: 80331, München, Tel: 0176 123456, E-Mail: mueller@gmail.com, Leistung ist Rohrreparatur, Preis ist 500 Euro"</p>
                  </div>
                )}
              </div>
            )}

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
                    <div className="md:col-span-4 relative" ref={showServicesDropdown === index ? servicesDropdownRef : null}>
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
                    
                    <div className="md:col-span-3">
                      <label className="block text-sm text-slate-400 mb-1">Menge *</label>
                      <div className="flex gap-1">
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
                        <select
                          value={item.unit || ''}
                          onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                          className="px-2 py-2 bg-slate-800 border border-slate-600 rounded text-white text-sm w-24 shrink-0"
                        >
                          <option value="">–</option>
                          <option value="m²">m²</option>
                          <option value="lfm">lfm</option>
                          <option value="m³">m³</option>
                          <option value="Stk">Stk</option>
                          <option value="Std">Std</option>
                          <option value="pausch">pausch</option>
                          <option value="L">L</option>
                          <option value="kg">kg</option>
                          <option value="Karton">Karton</option>
                          <option value="Sack">Sack</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-sm text-slate-400 mb-1">
                        Einzelpreis ({formData.is_kleinunternehmer ? 'inkl.' : 'netto'})
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
                      {!formData.is_kleinunternehmer && (
                        <>
                          <label className="block text-sm text-slate-400 mb-1 mt-2">Einzelpreis (brutto)</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.price_gross ?? parseFloat(((parseFloat(item.price) || 0) * (1 + (parseFloat(formData.tax_rate) || 0) / 100)).toFixed(2))}
                            onChange={(e) => handleItemChange(index, 'price_gross', e.target.value)}
                            className="w-full px-3 py-2 bg-slate-800 border border-blue-500/50 rounded text-white text-sm"
                            placeholder="119.00"
                          />
                        </>
                      )}
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-sm text-slate-400 mb-1">Gesamt</label>
                      <div className="px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm">
                        {!formData.is_kleinunternehmer ? formatCurrency(
                          item.price_source === 'brutto'
                            ? parseFloat(((parseFloat(item.quantity) || 0) * (parseFloat(item.price_gross) || 0)).toFixed(2))
                            : parseFloat((item.total * (1 + (parseFloat(formData.tax_rate) || 0) / 100)).toFixed(2))
                        ) : formatCurrency(item.total)}
                        {!formData.is_kleinunternehmer && (
                          <span className="text-slate-400 text-xs ml-1">
                            ({formatCurrency(item.total)} netto)
                          </span>
                        )}
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

                {/* Anhänge */}
                <div className="pt-3 border-t border-slate-700/50 mt-2">
                  {savedAttachments.map(att => (
                    <div key={att.id} className="flex items-center justify-between py-1.5 px-2 bg-slate-800 rounded mb-1">
                      <button type="button" onClick={() => handlePreviewSavedAttachment(att)} className="text-slate-300 hover:text-slate-100 text-sm truncate text-left hover:underline">
                        {att.filename.startsWith('Regiebericht_') ? '📋' : '📎'} {att.filename} <span className="text-slate-500">({formatFileSize(att.file_size)})</span>
                      </button>
                      <button type="button" onClick={() => handleDeleteSavedAttachment(att)} className="text-slate-500 hover:text-red-400 text-lg leading-none ml-2">×</button>
                    </div>
                  ))}
                  {pendingAttachments.map(att => {
                    const isRegie = att.file.name.startsWith('Regiebericht_')
                    return (
                      <div key={att.localId} className={`flex items-center justify-between py-1.5 px-2 rounded mb-1 ${isRegie ? 'bg-blue-900/30 border border-dashed border-blue-600/50' : 'bg-slate-800/60 border border-dashed border-slate-600'}`}>
                        <button
                          type="button"
                          onClick={() => {
                            const url = URL.createObjectURL(att.file)
                            const a = document.createElement('a')
                            a.href = url
                            a.target = '_blank'
                            document.body.appendChild(a)
                            a.click()
                            document.body.removeChild(a)
                          }}
                          className={`text-sm truncate text-left hover:underline ${isRegie ? 'text-blue-400 hover:text-blue-300' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                          {isRegie ? '📋' : '📎'} {att.file.name} <span className="text-slate-500">({formatFileSize(att.file.size)})</span>
                        </button>
                        <button type="button" onClick={() => removePendingAttachment(att.localId)} className="text-slate-500 hover:text-red-400 text-lg leading-none ml-2">×</button>
                      </div>
                    )
                  })}
                  {(savedAttachments.length + pendingAttachments.length) < 20 && (
                    <label className="flex items-center justify-center gap-2 text-sm text-slate-400 hover:text-slate-200 cursor-pointer mt-1 py-2 border border-dashed border-slate-600 hover:border-slate-400 rounded-lg transition-colors">
                      <input type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={handleFileSelect} />
                      📎 Anhang hinzufügen
                    </label>
                  )}
                  {(selectedAufmassId || aufmassId || editData?.aufmass_id) && !aufmassAttached && (
                    <button
                      type="button"
                      disabled={aufmassAttaching}
                      onClick={async () => {
                        const id = selectedAufmassId || aufmassId || editData?.aufmass_id
                        if (!id) return
                        setAufmassAttaching(true)
                        try {
                          const { data: { session } } = await supabase.auth.getSession()
                          const res = await fetch(`/api/aufmasse?id=${id}`, {
                            headers: { Authorization: `Bearer ${session?.access_token}` }
                          })
                          const json = await res.json()
                          if (!json.aufmass) throw new Error('Nicht gefunden')
                          const { generateAufmassPDFBlob } = await import('@/lib/pdf/AufmassPDF')
                          const blob = await generateAufmassPDFBlob(json.aufmass, majstor)
                          const filename = `Aufmass_${json.aufmass.title?.replace(/[^a-zA-Z0-9]/g, '_') || 'Aufmass'}.pdf`
                          const file = new File([blob], filename, { type: 'application/pdf' })
                          const localId = crypto.randomUUID()
                          setPendingAttachments(prev => [...prev, { file, localId }])
                          setAufmassLocalId(localId)
                          setAufmassAttached(true)
                        } catch (e) {
                          console.error('Aufmaß attach error:', e)
                        } finally {
                          setAufmassAttaching(false)
                        }
                      }}
                      className="flex items-center justify-center gap-2 text-sm text-blue-400 hover:text-blue-300 cursor-pointer mt-1 py-2 border border-dashed border-blue-500/50 hover:border-blue-400 rounded-lg transition-colors w-full disabled:opacity-50"
                    >
                      {aufmassAttaching ? '⏳ Wird generiert...' : '📐 Aufmaß als Anhang hinzufügen'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <hr className="border-slate-700 my-2" />

            {/* Regiebericht & Aufmaß */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setShowRegieForm(p => !p)}
                className="w-full py-2.5 border border-dashed rounded-lg text-sm text-white transition-colors text-center"
                style={{ borderColor: '#2563eb' }}
              >
                📋 Regiebericht erstellen
              </button>
              <button
                type="button"
                onClick={openAufmassPicker}
                className="w-full py-2.5 border border-dashed rounded-lg text-sm text-white transition-colors text-center"
                style={{ borderColor: '#2563eb' }}
              >
                📐 Aufmaß importieren
              </button>

              {showRegieForm && (
                <div className="mt-2">
                  <RegieberichtForm
                    majstor={majstor}
                    invoiceFormData={formData}
                    onGenerated={(file) => {
                      setPendingAttachments(prev => [...prev, { file, localId: crypto.randomUUID() }])
                      setShowRegieForm(false)
                    }}
                    onClose={() => setShowRegieForm(false)}
                  />
                </div>
              )}
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
                    <option value="0">Sofort</option>
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
                <div className="flex justify-between items-center mt-1">
                  <p className="text-xs text-slate-500">Diese Informationen erscheinen am Ende des PDFs</p>
                  <span className={`text-xs ${(formData.notes?.length || 0) > 1600 ? 'text-red-400' : (formData.notes?.length || 0) > 1200 ? 'text-yellow-400' : 'text-slate-500'}`}>
                    {formData.notes?.length || 0} / 2000
                  </span>
                </div>
                {(formData.notes?.length || 0) > 2000 && (
                  <p className="text-xs text-red-400 mt-1">⚠️ Text zu lang — wird im PDF möglicherweise abgeschnitten. Bitte kürzen Sie den Text auf max. 2000 Zeichen.</p>
                )}
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

      {/* Aufmaß Picker Modal */}
      {showAufmassPicker && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4" onClick={() => setShowAufmassPicker(false)}>
          <div className="bg-slate-800 rounded-xl max-w-lg w-full max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-slate-700 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-white">📐 Aufmaß auswählen</h3>
              <button onClick={() => setShowAufmassPicker(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {aufmassPickerLoading ? (
                <p className="text-slate-400 text-center py-8">Laden...</p>
              ) : aufmassPickerList.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-slate-400">Keine Aufmaße vorhanden.</p>
                  <p className="text-slate-500 text-sm mt-1">Erstellen Sie zuerst ein Aufmaß über das Menü.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {aufmassPickerList.map(a => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => importAufmass(a)}
                      className="w-full text-left bg-slate-700/50 hover:bg-slate-700 border border-slate-600 hover:border-blue-500 rounded-lg p-3 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-white font-medium">{a.title || 'Ohne Titel'}</p>
                          {a.customer_name && <p className="text-slate-400 text-sm">{a.customer_name}</p>}
                        </div>
                        <div className="text-right">
                          <p className="text-slate-400 text-xs">{a.date ? new Date(a.date).toLocaleDateString('de-DE') : ''}</p>
                          <p className="text-slate-500 text-xs">{(a.rooms || []).length} {(a.rooms || []).length === 1 ? 'Raum' : 'Räume'}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}