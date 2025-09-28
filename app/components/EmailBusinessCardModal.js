// app/components/EmailBusinessCardModal.js - FIXED CUSTOMER DROPDOWN
'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function EmailBusinessCardModal({ 
  isOpen, 
  onClose, 
  businessCardData,
  majstor
}) {
  const [emailData, setEmailData] = useState({
    to_email: '',
    to_name: '',
    personal_message: ''
  })
  
  // Customer management states
  const [customers, setCustomers] = useState([])
  const [customersLoading, setCustomersLoading] = useState(false)
  const [emailInputMode, setEmailInputMode] = useState('manual') // Start with manual, switch to dropdown when customers load
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Load customers when modal opens
  useEffect(() => {
    console.log('🔄 useEffect for customer loading triggered:', { 
      isOpen, 
      majstorId: majstor?.id,
      majstorEmail: majstor?.email,
      timestamp: new Date().toISOString()
    })
    
    if (isOpen && majstor?.id) {
      console.log('✅ Conditions met, calling loadCustomers()')
      loadCustomers()
    } else {
      console.log('❌ Conditions not met for loading customers:', {
        isOpen,
        hasMajstorId: !!majstor?.id,
        majstorObject: majstor
      })
    }
  }, [isOpen, majstor?.id])

  // Test query on modal open
  useEffect(() => {
    if (isOpen && majstor?.id) {
      console.log('🧪 Testing direct customer query...')
      
      // Quick test to see if any customers exist at all
      supabase
        .from('customers')
        .select('id, name, email')
        .eq('majstor_id', majstor.id)
        .limit(3)
        .then(({ data, error }) => {
          console.log('🧪 Direct test query result:', { data, error, count: data?.length })
        })
        .catch(err => {
          console.log('🧪 Direct test query error:', err)
        })
    }
  }, [isOpen, majstor?.id])

  // Auto-switch mode based on customer availability
  useEffect(() => {
    console.log('🔧 Mode switching useEffect triggered:', {
      customersLoading,
      customersCount: customers.length,
      currentMode: emailInputMode
    })
    
    if (!customersLoading) {
      const newMode = customers.length > 0 ? 'dropdown' : 'manual'
      console.log(`📋 Setting email input mode to: ${newMode} (${customers.length} customers)`)
      setEmailInputMode(newMode)
    }
  }, [customers.length, customersLoading])

  // Load customer data
  const loadCustomers = async () => {
    if (!majstor?.id) {
      console.log('❌ No majstor ID available for customer loading')
      return
    }

    try {
      setCustomersLoading(true)
      console.log('📋 Starting customer loading process...')
      console.log('🔑 Majstor details:', { 
        id: majstor.id, 
        email: majstor.email, 
        name: majstor.full_name 
      })

      // Use the same query format as customers/page.js but without last_contacted_at
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('id, name, email, phone, company_name, created_at')
        .eq('majstor_id', majstor.id)
        .neq('name', 'DUMMY_ENTRY_FOR_NUMBERING') // Exclude dummy entries like in customers page
        .not('email', 'is', null) // Only customers with email
        .neq('email', '') // Exclude empty emails
        .order('created_at', { ascending: false })
        .limit(100)

      console.log('📋 Customer query result:', { 
        customerData, 
        customerError,
        dataLength: customerData?.length 
      })

      if (customerError) {
        console.warn('⚠️ Could not load customers:', customerError.message)
        console.warn('⚠️ Full error object:', customerError)
        return
      }

      setCustomers(customerData || [])
      console.log(`✅ Final result: Loaded ${customerData?.length || 0} customers for email dropdown`)
      
      if (customerData && customerData.length > 0) {
        console.log('📝 Sample customer data:', customerData[0])
      }

    } catch (err) {
      console.error('❌ Unexpected error in loadCustomers:', err)
    } finally {
      setCustomersLoading(false)
      console.log('🏁 Customer loading finished')
    }
  }

  // Handle customer selection
  const handleCustomerSelect = (customer) => {
    console.log('👤 Customer selected:', customer.name)
    setEmailData(prev => ({
      ...prev,
      to_email: customer.email,
      to_name: customer.name || ''
    }))
  }

  // Handle mode switching
  const switchToManualMode = () => {
    console.log('🔧 Switching to manual mode')
    setEmailInputMode('manual')
    // Keep current email data
  }

  const switchToDropdownMode = () => {
    console.log('📋 Switching to dropdown mode')
    setEmailInputMode('dropdown')
    // Keep current email data
  }

  const handleInputChange = (e) => {
    setEmailData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Validation
      if (!emailData.to_email.trim()) {
        throw new Error('E-Mail-Adresse ist erforderlich')
      }
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(emailData.to_email)) {
        throw new Error('Ungültige E-Mail-Adresse')
      }

      // Send email
      const response = await fetch('/api/business-card/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to_email: emailData.to_email.trim(),
          to_name: emailData.to_name.trim() || null,
          personal_message: emailData.personal_message.trim() || null,
          majstor_id: majstor.id,
          business_card_data: businessCardData
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}`)
      }

      if (!result.success) {
        throw new Error(result.error || 'Unbekannter Fehler')
      }

      setSuccess(true)

      // Update customer's last_contacted_at if customer exists
      if (emailData.to_email) {
        try {
          await supabase
            .from('customers')
            .update({ 
              last_contacted_at: new Date().toISOString() 
            })
            .eq('majstor_id', majstor.id)
            .eq('email', emailData.to_email)
        } catch (updateError) {
          console.log('Could not update customer contact time:', updateError)
        }
      }
      
      // Reset form after success
      setTimeout(() => {
        setEmailData({
          to_email: '',
          to_name: '',
          personal_message: ''
        })
        setSuccess(false)
        onClose()
      }, 2000)

    } catch (err) {
      console.error('Email send error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setEmailData({
        to_email: '',
        to_name: '',
        personal_message: ''
      })
      setError('')
      setSuccess(false)
      setEmailInputMode('manual') // Reset to manual for next open
      onClose()
    }
  }

  if (!isOpen) return null

  console.log('🎯 EmailBusinessCardModal render:', {
    isOpen,
    majstorId: majstor?.id,
    majstorEmail: majstor?.email,
    majstorFullName: majstor?.full_name,
    customersCount: customers.length,
    emailInputMode,
    customersLoading
  })

  console.log('🔄 Current customers array:', customers)

  const businessCardLink = `https://pro-meister.de/m/${majstor?.slug}`

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-700">
          <div>
            <h3 className="text-lg font-semibold text-white">📧 Visitenkarte per E-Mail senden</h3>
            <p className="text-sm text-slate-400 mt-1">Teilen Sie Ihre digitale Visitenkarte</p>
          </div>
          <button 
            onClick={handleClose}
            disabled={loading}
            className="text-slate-400 hover:text-white text-2xl transition-colors disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          
          {/* Success Message */}
          {success && (
            <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div className="flex items-center gap-3">
                <span className="text-2xl">✅</span>
                <div>
                  <p className="text-green-400 font-semibold">E-Mail erfolgreich gesendet!</p>
                  <p className="text-green-300 text-sm mt-1">
                    Die Visitenkarte wurde an {emailData.to_email} versendet.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <div className="flex items-center gap-3">
                <span className="text-red-400 text-xl">⚠️</span>
                <div>
                  <p className="text-red-400 font-semibold">Fehler beim Senden</p>
                  <p className="text-red-300 text-sm mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Preview Card Link */}
          <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <h4 className="text-blue-300 font-medium mb-2">📱 Ihre Visitenkarte:</h4>
            <div className="flex items-center gap-2">
              <span className="text-blue-400 text-sm">{businessCardData?.card_name || majstor?.full_name}</span>
              <span className="text-slate-400">•</span>
              <span className="text-blue-400 text-sm">{businessCardData?.card_business_name || majstor?.business_name}</span>
            </div>
            <a 
              href={businessCardLink}
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-300 hover:text-blue-200 text-xs underline mt-1 block"
            >
              {businessCardLink} ↗
            </a>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Email Input with Customer Dropdown */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Empfänger E-Mail *
              </label>

              {/* Mode Selection Buttons */}
              <div className="flex gap-2 mb-3">
                <button 
                  type="button"
                  onClick={switchToDropdownMode}
                  disabled={customers.length === 0}
                  className={`px-3 py-1 text-xs rounded transition-colors ${
                    emailInputMode === 'dropdown' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  📋 Aus Kundenliste ({customers.length})
                </button>
                <button 
                  type="button" 
                  onClick={switchToManualMode}
                  className={`px-3 py-1 text-xs rounded transition-colors ${
                    emailInputMode === 'manual' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                  }`}
                >
                  ✍️ Manuell eingeben
                </button>
              </div>

              {/* Dropdown Mode */}
              {emailInputMode === 'dropdown' && (
                <div className="space-y-2">
                  {customersLoading ? (
                    <div className="flex items-center gap-2 p-3 bg-slate-900/50 border border-slate-600 rounded-lg">
                      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-slate-400 text-sm">Lade Kunden...</span>
                    </div>
                  ) : customers.length === 0 ? (
                    <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                      <p className="text-yellow-300 text-sm">
                        Keine Kunden gefunden. Erstellen Sie zuerst Kunden oder nutzen Sie die manuelle Eingabe.
                      </p>
                    </div>
                  ) : (
                    // 🔥 FIXED: Only show the dropdown, no search input
                    <select 
                      value={emailData.to_email}
                      onChange={(e) => {
                        const selectedCustomer = customers.find(c => c.email === e.target.value)
                        if (selectedCustomer) {
                          handleCustomerSelect(selectedCustomer)
                        } else {
                          setEmailData(prev => ({ ...prev, to_email: '', to_name: '' }))
                        }
                      }}
                      disabled={loading || success}
                      className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors disabled:opacity-50"
                    >
                      <option value="">Kunde auswählen...</option>
                      {customers.map(customer => (
                        <option key={customer.id} value={customer.email}>
                          {customer.name} ({customer.email})
                          {customer.last_contacted_at && ' • Zuletzt kontaktiert'}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Manual Mode */}
              {emailInputMode === 'manual' && (
                <input
                  type="email"
                  name="to_email"
                  value={emailData.to_email}
                  onChange={handleInputChange}
                  required
                  disabled={loading || success}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors disabled:opacity-50"
                  placeholder="max@beispiel.de"
                />
              )}
            </div>

            {/* Recipient Name */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Empfänger Name (optional)
              </label>
              <input
                type="text"
                name="to_name"
                value={emailData.to_name}
                onChange={handleInputChange}
                disabled={loading || success}
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors disabled:opacity-50"
                placeholder="Max Mustermann"
              />
            </div>

            {/* Personal Message */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Persönliche Nachricht (optional)
              </label>
              <textarea
                name="personal_message"
                value={emailData.personal_message}
                onChange={handleInputChange}
                rows={3}
                disabled={loading || success}
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none disabled:opacity-50"
                placeholder="Hallo! Hier ist meine digitale Visitenkarte..."
              />
            </div>

            {/* Info Box */}
            <div className="bg-slate-900/50 border border-slate-600 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <span className="text-blue-400 text-sm">💡</span>
                <div>
                  <p className="text-slate-300 text-sm">
                    <strong>E-Mail enthält:</strong>
                  </p>
                  <ul className="text-slate-400 text-xs mt-1 space-y-1">
                    <li>• Link zu Ihrer digitalen Visitenkarte</li>
                    <li>• Ihre Kontaktdaten zur Vorschau</li>
                    <li>• Ihre persönliche Nachricht (falls eingegeben)</li>
                    <li>• Professionelles Design</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="flex-1 px-4 py-3 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={loading || success || !emailData.to_email.trim()}
                className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Senden...
                  </span>
                ) : success ? (
                  '✅ Gesendet!'
                ) : (
                  '📧 E-Mail senden'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}