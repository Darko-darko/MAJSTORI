// app/dashboard/customers/page.js - SA INVOICE TYPE SELECTION MODAL

'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { customersAPI } from '@/lib/customers'
import InvoiceCreator from '@/app/components/InvoiceCreator'
import Link from 'next/link'

function CustomersPageContent() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [majstor, setMajstor] = useState(null)
  const [stats, setStats] = useState({})
  
  // Search & Filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [filterFavorites, setFilterFavorites] = useState(false)
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState('desc')
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState(null)
  
  // 🔥 NOVO: Invoice modal states
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [selectedCustomerForInvoice, setSelectedCustomerForInvoice] = useState(null)
  const [invoiceType, setInvoiceType] = useState(null) // null, 'quote', ili 'invoice'
  
  // Create/Edit form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company_name: '',
    street: '',
    postal_code: '',
    city: '',
    notes: '',
    is_favorite: false
  })
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState('')
  
  // Import states
  const [importFile, setImportFile] = useState(null)
  const [importLoading, setImportLoading] = useState(false)
  const [importResults, setImportResults] = useState(null)
  const fileInputRef = useRef(null)
  
  const router = useRouter()

  useEffect(() => {
    loadMajstorAndData()
  }, [])

  useEffect(() => {
    if (majstor?.id) {
      loadCustomers()
    }
  }, [searchTerm, filterFavorites, sortBy, sortOrder, majstor?.id])

  const loadMajstorAndData = async () => {
    try {
      setLoading(true)
      
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        router.push('/login')
        return
      }

      const { data: majstorData, error: majstorError } = await supabase
        .from('majstors')
        .select('*')
        .eq('id', user.id)
        .single()

      if (majstorError) {
        setError('Fehler beim Laden des Profils')
        return
      }

      setMajstor(majstorData)
      
      // Load stats
      const { data: statsData } = await customersAPI.getStats(majstorData.id)
      if (statsData) setStats(statsData)

    } catch (err) {
      console.error('Error loading data:', err)
      setError('Fehler beim Laden der Daten')
    } finally {
      setLoading(false)
    }
  }

  const loadCustomers = async () => {
    if (!majstor?.id) return
    
    try {
      const { data: freshData, error } = await supabase
        .from('customers')
        .select('*')
        .eq('majstor_id', majstor.id)
      
      console.log('DIRECT DATA:', freshData)
      
      if (error) {
        console.error('Direct Supabase error:', error)
      } else {
        setCustomers(freshData || [])
      }
    } catch (err) {
      console.error('Error:', err)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      company_name: '',
      street: '',
      postal_code: '',
      city: '',
      notes: '',
      is_favorite: false
    })
    setFormError('')
    setEditingCustomer(null)
  }

  const handleCreateClick = () => {
    resetForm()
    setShowCreateModal(true)
  }

  const handleEditClick = (customer) => {
    setFormData({
      name: customer.name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      company_name: customer.company_name || '',
      street: customer.street || '',
      postal_code: customer.postal_code || '',
      city: customer.city || '',
      notes: customer.notes || '',
      is_favorite: customer.is_favorite || false
    })
    setEditingCustomer(customer)
    setFormError('')
    setShowCreateModal(true)
  }

  // 🔥 NOVO: Handler za New Invoice click
  const handleNewInvoiceClick = (customer) => {
    console.log('🚀 New Invoice clicked for:', customer.name)
    setSelectedCustomerForInvoice(customer)
    setInvoiceType(null) // Reset type selection
    setShowInvoiceModal(true)
  }

  // 🔥 NOVO: Handler za type selection
  const handleInvoiceTypeSelect = (type) => {
    console.log('📄 Invoice type selected:', type)
    setInvoiceType(type)
  }

  // 🔥 NOVO: Handler za zatvaranje invoice modala
  const handleInvoiceModalClose = () => {
    setShowInvoiceModal(false)
    setSelectedCustomerForInvoice(null)
    setInvoiceType(null)
  }

  // 🔥 NOVO: Handler za success invoice creation
  // 🔥 NOVO: Handler za success invoice creation
const handleInvoiceSuccess = (createdInvoice) => {
  console.log('✅ Invoice created:', createdInvoice)
  handleInvoiceModalClose()
  
  // 🚀 Redirect to invoices page after successful creation
  router.push('/dashboard/invoices')
}
    // Možete dodati toast notification ovde
  

  const handleFormSubmit = async (e) => {
    e.preventDefault()
    setFormLoading(true)
    setFormError('')

    try {
      if (!formData.name.trim()) {
        throw new Error('Name ist erforderlich')
      }

      const customerData = {
        ...formData,
        majstor_id: majstor.id
      }

      let result
      if (editingCustomer) {
        result = await customersAPI.update(editingCustomer.id, formData)
      } else {
        result = await customersAPI.create(customerData)
      }

      if (result.error) throw result.error

      await loadCustomers()
      await loadStats()
      setShowCreateModal(false)
      resetForm()
      
      alert(`Kunde ${editingCustomer ? 'aktualisiert' : 'erstellt'}!`)

    } catch (err) {
      console.error('Error saving customer:', err)
      setFormError(err.message)
    } finally {
      setFormLoading(false)
    }
  }

  const loadStats = async () => {
    const { data: statsData } = await customersAPI.getStats(majstor.id)
    if (statsData) setStats(statsData)
  }

  const handleDeleteCustomer = async (customer) => {
    const confirmed = confirm(
      `Möchten Sie den Kunden "${customer.name}" wirklich löschen?\n\n` +
      `Diese Aktion kann NICHT rückgängig gemacht werden!\n\n` +
      `Geben Sie zur Bestätigung "${customer.name}" ein:`
    )
    
    if (!confirmed) return

    const userInput = prompt(`Geben Sie "${customer.name}" ein um zu bestätigen:`)
    if (userInput !== customer.name) {
      if (userInput !== null) {
        alert('❌ Bestätigung fehlgeschlagen. Löschen abgebrochen.')
      }
      return
    }

    try {
      const { error } = await customersAPI.delete(customer.id)
      if (error) throw error

      await loadCustomers()
      await loadStats()
      alert(`✅ Kunde "${customer.name}" wurde gelöscht.`)

    } catch (err) {
      console.error('Error deleting customer:', err)
      alert('❌ Fehler beim Löschen: ' + err.message)
    }
  }

  const handleToggleFavorite = async (customer) => {
    try {
      const { error } = await customersAPI.toggleFavorite(customer.id)
      if (error) throw error

      await loadCustomers()
    } catch (err) {
      console.error('Error toggling favorite:', err)
      alert('Fehler beim Aktualisieren des Favoriten-Status')
    }
  }

  // Excel Import functionality
  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setImportFile(file)
      setImportResults(null)
    }
  }

  const handleImport = async () => {
    if (!importFile) {
      alert('Bitte wählen Sie eine Datei aus')
      return
    }

    setImportLoading(true)
    try {
      const Papa = await import('papaparse')
      
      const text = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => resolve(e.target.result)
        reader.onerror = reject
        reader.readAsText(importFile)
      })

      const parsed = Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true
      })

      if (parsed.errors.length > 0) {
        throw new Error('Fehler beim Lesen der Datei: ' + parsed.errors[0].message)
      }

      const { imported, skipped, error } = await customersAPI.bulkImport(majstor.id, parsed.data)
      
      if (error) throw error

      setImportResults({ imported, skipped, total: parsed.data.length })
      await loadCustomers()
      await loadStats()

    } catch (err) {
      console.error('Import error:', err)
      alert('Import-Fehler: ' + err.message)
    } finally {
      setImportLoading(false)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('de-DE')
  }

  // 🔥 NOVO: Helper function for prefilledCustomer format
  const formatCustomerForInvoice = (customer) => {
    return {
      name: customer.name,
      email: customer.email,
      phone: customer.phone || '',
      address: [customer.street, customer.postal_code, customer.city].filter(Boolean).join(', ')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white text-xl">Laden...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">Meine Kunden</h1>
          <p className="text-slate-400">
            Verwalten Sie Ihre Kundendatenbank
          </p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex items-center text-slate-400 hover:text-white transition-colors"
        >
          ← Zurück zum Dashboard
        </Link>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Gesamt Kunden</p>
              <p className="text-2xl font-bold text-white">{stats.totalCustomers || 0}</p>
            </div>
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white">
              👥
            </div>
          </div>
        </div>
        
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Gesamtumsatz</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(stats.totalRevenue || 0)}</p>
            </div>
            <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center text-white">
              💰
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Ø pro Kunde</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(stats.avgRevenuePerCustomer || 0)}</p>
            </div>
            <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center text-white">
              📊
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Neue diesen Monat</p>
              <p className="text-2xl font-bold text-white">{stats.newThisMonth || 0}</p>
            </div>
            <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center text-white">
              ⭐
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 items-center flex-1">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Kunden suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 pl-10 bg-slate-800/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400">
              🔍
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilterFavorites(!filterFavorites)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterFavorites 
                  ? 'bg-yellow-600 text-white' 
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              ⭐ Favoriten
            </button>
            
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-')
                setSortBy(field)
                setSortOrder(order)
              }}
              className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
            >
              <option value="created_at-desc">Neueste zuerst</option>
              <option value="created_at-asc">Älteste zuerst</option>
              <option value="name-asc">Name A-Z</option>
              <option value="name-desc">Name Z-A</option>
              <option value="total_revenue-desc">Höchster Umsatz</option>
              <option value="total_invoices-desc">Meiste Rechnungen</option>
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => setShowImportModal(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm"
          >
            📥 Import
          </button>
          <button
            onClick={handleCreateClick}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Neuer Kunde
          </button>
        </div>
      </div>

      {/* Customers List */}
      {customers.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <div className="text-4xl mb-4">👥</div>
          <p className="text-lg mb-2">
            {searchTerm ? 'Keine Kunden gefunden' : 'Noch keine Kunden'}
          </p>
          <p className="text-sm mb-4">
            {searchTerm 
              ? 'Versuchen Sie einen anderen Suchbegriff' 
              : 'Erstellen Sie Ihren ersten Kunden oder importieren Sie aus einer Excel-Datei'
            }
          </p>
          {!searchTerm && (
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleCreateClick}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Ersten Kunden erstellen
              </button>
              <button
                onClick={() => setShowImportModal(true)}
                className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
              >
                Excel Import
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {customers.map((customer) => (
            <div key={customer.id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 hover:border-slate-600 transition-colors">

              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-white font-semibold text-lg">{customer.name}</h3>
                    {customer.is_favorite && (
                      <span className="text-yellow-400 text-lg" title="Favorit">⭐</span>
                    )}
                    {customer.company_name && (
                      <span className="text-blue-300 text-sm bg-blue-500/10 px-2 py-1 rounded">
                        {customer.company_name}
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-1 text-sm">
                    {customer.email && (
                      <p className="text-slate-300">📧 {customer.email}</p>
                    )}
                    {customer.phone && (
                      <p className="text-slate-300">📱 {customer.phone}</p>
                    )}
                    {(customer.street || customer.city) && (
                      <p className="text-slate-400">
                        📍 {[customer.street, customer.postal_code, customer.city].filter(Boolean).join(', ')}
                      </p>
                    )}
                  </div>
                </div>

                {/* Customer Stats */}
                <div className="text-right text-sm">
                  <div className="space-y-1">
                    {(customer.total_invoices > 0 || customer.total_quotes > 0) && (
                      <>
                        {customer.total_quotes > 0 && (
                          <p className="text-slate-300 text-sm">
                            📄 {customer.total_quotes} Angebot{customer.total_quotes > 1 ? 'e' : ''}
                          </p>
                        )}
                        {customer.total_invoices > 0 && (
                          <p className="text-slate-300 text-sm">
                            📋 {customer.total_invoices} Rechnung{customer.total_invoices > 1 ? 'en' : ''}
                          </p>
                        )}
                      </>
                    )}
                    {customer.total_revenue > 0 && (
                      <p className="text-green-400 font-semibold">
                        💰 {formatCurrency(customer.total_revenue)}
                      </p>
                    )}
                    {customer.last_contact_date && (
                      <p className="text-slate-500 text-xs">
                        Letzter Kontakt: {formatDate(customer.last_contact_date)}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Notes */}
              {customer.notes && (
                <div className="mb-4 p-3 bg-slate-900/50 rounded border-l-4 border-blue-500">
                  <p className="text-slate-300 text-sm italic">{customer.notes}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 flex-wrap">
                <button
                  onClick={() => handleEditClick(customer)}
                  className="bg-slate-700 text-white px-3 py-2 rounded text-sm hover:bg-slate-600 transition-colors"
                >
                  ✏️ Bearbeiten
                </button>
                
                <button
                  onClick={() => handleToggleFavorite(customer)}
                  className={`px-3 py-2 rounded text-sm transition-colors ${
                    customer.is_favorite
                      ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                      : 'bg-slate-700 text-white hover:bg-slate-600'
                  }`}
                >
                  {customer.is_favorite ? '⭐ Favorit entfernen' : '⭐ Als Favorit'}
                </button>

                {/* 🔥 NOVO: Neue Rechnung Button */}
                <button
                  onClick={() => handleNewInvoiceClick(customer)}
                  className="bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 transition-colors"
                >
                  💼 Neue Rechnung
                </button>

                <button
                  onClick={() => handleDeleteCustomer(customer)}
                  className="bg-red-600 text-white px-3 py-2 rounded text-sm hover:bg-red-700 transition-colors"
                >
                  🗑️ Löschen
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Customer Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-slate-700">
              <h3 className="text-xl font-semibold text-white">
                {editingCustomer ? 'Kunde bearbeiten' : 'Neuer Kunde'}
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                    className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white"
                    placeholder="Max Mustermann"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">E-Mail</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white"
                    placeholder="max@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Telefon</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white"
                    placeholder="+49 123 456789"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Firma</label>
                  <input
                    type="text"
                    value={formData.company_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white"
                    placeholder="Mustermann GmbH"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Straße</label>
                  <input
                    type="text"
                    value={formData.street}
                    onChange={(e) => setFormData(prev => ({ ...prev, street: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white"
                    placeholder="Musterstraße 123"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">PLZ</label>
                    <input
                      type="text"
                      value={formData.postal_code}
                      onChange={(e) => setFormData(prev => ({ ...prev, postal_code: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white"
                      placeholder="10115"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Stadt</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white"
                      placeholder="Berlin"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Notizen</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white"
                  placeholder="Zusätzliche Informationen über den Kunden..."
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_favorite"
                  checked={formData.is_favorite}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_favorite: e.target.checked }))}
                  className="mr-3 w-4 h-4 text-yellow-600 bg-slate-700 border-slate-500 rounded focus:ring-yellow-500"
                />
                <label htmlFor="is_favorite" className="text-slate-300">
                  Als Favorit markieren ⭐
                </label>
              </div>

              {formError && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                  <p className="text-red-400 text-sm">{formError}</p>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={formLoading}
                  className="px-6 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={formLoading || !formData.name.trim()}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex-1"
                >
                  {formLoading 
                    ? 'Speichern...' 
                    : (editingCustomer ? 'Kunde aktualisieren' : 'Kunde erstellen')
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg w-full max-w-lg">
            <div className="flex justify-between items-center p-6 border-b border-slate-700">
              <h3 className="text-xl font-semibold text-white">Excel/CSV Import</h3>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-slate-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  CSV-Datei auswählen
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileChange}
                  className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:bg-green-600 file:text-white hover:file:bg-green-700"
                />
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <h4 className="text-blue-300 font-medium mb-2">Erwartete Spalten:</h4>
                <div className="text-sm text-slate-300 space-y-1">
                  <p>• <strong>name</strong> oder <strong>Name</strong> (erforderlich)</p>
                  <p>• <strong>email</strong> oder <strong>E-Mail</strong> (erforderlich)</p>
                  <p>• <strong>phone</strong> oder <strong>Telefon</strong></p>
                  <p>• <strong>company_name</strong> oder <strong>Firma</strong></p>
                  <p>• <strong>street</strong> oder <strong>Straße</strong></p>
                  <p>• <strong>city</strong> oder <strong>Stadt</strong></p>
                  <p>• <strong>postal_code</strong> oder <strong>PLZ</strong></p>
                </div>
              </div>

              {importResults && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                  <h4 className="text-green-300 font-medium mb-2">Import Ergebnisse:</h4>
                  <div className="text-sm text-slate-300 space-y-1">
                    <p>✅ {importResults.imported} Kunden erfolgreich importiert</p>
                    <p>⚠️ {importResults.skipped} Einträge übersprungen</p>
                    <p>📊 {importResults.total} Einträge insgesamt</p>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setShowImportModal(false)}
                  disabled={importLoading}
                  className="px-6 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50"
                >
                  Schließen
                </button>
                <button
                  onClick={handleImport}
                  disabled={!importFile || importLoading}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex-1"
                >
                  {importLoading ? 'Importiere...' : 'Import starten'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🔥 NOVO: Invoice Type Selection Modal */}
      {showInvoiceModal && selectedCustomerForInvoice && !invoiceType && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-white mb-4 text-center">
              Was möchten Sie für <span className="text-blue-400">{selectedCustomerForInvoice.name}</span> erstellen?
            </h3>
            <div className="space-y-3">
              <button
                onClick={() => handleInvoiceTypeSelect('quote')}
                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 font-medium"
              >
                📄 Angebot erstellen
              </button>
              <button
                onClick={() => handleInvoiceTypeSelect('invoice')}
                className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 font-medium"
              >
                🧾 Rechnung erstellen
              </button>
              <button
                onClick={handleInvoiceModalClose}
                className="w-full bg-slate-600 text-white py-2 rounded-lg hover:bg-slate-700 transition-colors"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔥 NOVO: Invoice Creator Modal */}
      {showInvoiceModal && selectedCustomerForInvoice && invoiceType && (
        <InvoiceCreator
          isOpen={true}
          onClose={handleInvoiceModalClose}
          type={invoiceType}
          majstor={majstor}
          prefilledCustomer={formatCustomerForInvoice(selectedCustomerForInvoice)}
          onSuccess={handleInvoiceSuccess}
        />
      )}
    </div>
  )
}
export default function CustomersPage() {
  return (
    <Suspense fallback={<div className="text-white">Laden...</div>}>
      <CustomersPageContent />
    </Suspense>
  )
}