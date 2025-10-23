// app/dashboard/customers/page.js - 🔥 FIXED VERSION
// ✅ Edit dugme sada radi
// ✅ Delete ima profesionalan alert modal
// ✅ Autofill u InvoiceCreator radi perfektno
// ✅ WEG filter fixed (checks weg_street)
// ✅ Favorite toggle working

'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { SubscriptionGuard } from '@/app/components/subscription/SubscriptionGuard'
import InvoiceCreator from '@/app/components/InvoiceCreator'
import * as XLSX from 'xlsx'

export default function CustomersPage() {
  const router = useRouter()
  const [majstor, setMajstor] = useState(null)
  const [customers, setCustomers] = useState([])
  const [filteredCustomers, setFilteredCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterWEG, setFilterWEG] = useState('all')
  const [filterFavorites, setFilterFavorites] = useState(false)
  const [sortBy, setSortBy] = useState('created_at')
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false) // 🔥 NEW DELETE MODAL
  const [customerToDelete, setCustomerToDelete] = useState(null) // 🔥 NEW
  const [showNotesModal, setShowNotesModal] = useState(false)
  const [selectedCustomerNotes, setSelectedCustomerNotes] = useState(null)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState(null)
  const [selectedCustomerForInvoice, setSelectedCustomerForInvoice] = useState(null)
  const [invoiceType, setInvoiceType] = useState(null)
  
  // Import states
  const [importFile, setImportFile] = useState(null)
  const [importLoading, setImportLoading] = useState(false)
  const [importResults, setImportResults] = useState(null)
  
  // 🔥 Form saving state
  const [saving, setSaving] = useState(false)
  
  // Stats
  const [stats, setStats] = useState({
    total: 0,
    totalRevenue: 0,
    withWEG: 0,
    favorites: 0
  })

  // Form state for create/edit
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    street: '',
    postal_code: '',
    city: '',
    country: 'Deutschland',
    tax_number: '',
    notes: '',
    is_favorite: false,
    is_weg_customer: false,
    weg_property_name: '',
    weg_street: '',
    weg_postal_code: '',
    weg_city: '',
    weg_country: 'Deutschland'
  })

  useEffect(() => {
    loadProfile()
  }, [])

  useEffect(() => {
    if (majstor?.id) {
      loadCustomers()
    }
  }, [majstor])

useEffect(() => {
  filterCustomers()
}, [customers, searchTerm, filterWEG, filterFavorites, sortBy])  // ❌ OVO MENJAJ

  const loadProfile = async () => {
    try {
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

      if (majstorError) throw majstorError
      setMajstor(majstorData)
    } catch (err) {
      console.error('Error loading profile:', err)
    }
  }

  const loadCustomers = async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('majstor_id', majstor.id)
        .order('name', { ascending: true })

      if (error) throw error

      setCustomers(data || [])
      
      const total = data?.length || 0
      const totalRevenue = data?.reduce((sum, c) => sum + (parseFloat(c.total_revenue) || 0), 0) || 0
      const withWEG = data?.filter(c => c.weg_street).length || 0
      const favorites = data?.filter(c => c.is_favorite).length || 0

      setStats({ total, totalRevenue, withWEG, favorites })
    } catch (err) {
      console.error('Error loading customers:', err)
    } finally {
      setLoading(false)
    }
  }

  const filterCustomers = () => {
    let filtered = customers

    // 🔥 REMOVE DUMMY ENTRY FROM VIEW
    filtered = filtered.filter(c => c.name !== 'DUMMY_ENTRY_FOR_NUMBERING')

    if (searchTerm) {
      filtered = filtered.filter(c =>
        c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (filterWEG === 'with_weg') {
      filtered = filtered.filter(c => c.weg_street)
    } else if (filterWEG === 'without_weg') {
      filtered = filtered.filter(c => !c.weg_street)
    }

    if (filterFavorites) {
      filtered = filtered.filter(c => c.is_favorite)
    }

  filtered = filtered.sort((a, b) => {
  if (sortBy === 'name') {
    return (a.name || '').localeCompare(b.name || '')
  } else if (sortBy === 'revenue') {
    return (parseFloat(b.total_revenue) || 0) - (parseFloat(a.total_revenue) || 0)
  } else if (sortBy === 'last_contact') {
    return new Date(b.last_contact_date || 0) - new Date(a.last_contact_date || 0)
  } else if (sortBy === 'created_at') {
    return new Date(b.created_at || 0) - new Date(a.created_at || 0)
  }
  return 0
})

    setFilteredCustomers(filtered)
  }

const handleToggleFavorite = async (customer) => {
  const newFavoriteStatus = !customer.is_favorite
  
  // ✅ Update SAMO filteredCustomers (ne diraj customers uopšte!)
  setFilteredCustomers(prevFiltered =>
    prevFiltered.map(c =>
      c.id === customer.id
        ? { ...c, is_favorite: newFavoriteStatus }
        : c
    )
  )
  
  // ✅ Update stats
  setStats(prev => ({
    ...prev,
    favorites: newFavoriteStatus 
      ? prev.favorites + 1 
      : prev.favorites - 1
  }))
  
  // ✅ Update bazu u pozadini
  try {
    const { error } = await supabase
      .from('customers')
      .update({ is_favorite: newFavoriteStatus })
      .eq('id', customer.id)

    if (error) throw error
    
    // ✅ Tiho update customers state (bez da korisnik primeti)
    setCustomers(prevCustomers => 
      prevCustomers.map(c => 
        c.id === customer.id 
          ? { ...c, is_favorite: newFavoriteStatus }
          : c
      )
    )
  } catch (err) {
    console.error('Error toggling favorite:', err)
    // Rollback
    setFilteredCustomers(prevFiltered =>
      prevFiltered.map(c =>
        c.id === customer.id
          ? { ...c, is_favorite: !newFavoriteStatus }
          : c
      )
    )
    setStats(prev => ({
      ...prev,
      favorites: newFavoriteStatus 
        ? prev.favorites - 1 
        : prev.favorites + 1
    }))
    alert('Fehler beim Aktualisieren')
  }
}
  const handleCreateCustomer = async (e) => {
    e.preventDefault()
    
    if (saving) return
    setSaving(true)
    
    try {
      // Check duplicate: BOTH name AND email must match
      if (formData.name?.trim() && formData.email?.trim()) {
       const { data: existing } = await supabase
  .from('customers')
  .select('id')
  .eq('majstor_id', majstor.id)
  .ilike('name', formData.name.trim())
  .ilike('email', formData.email.trim())
        
        if (existing && existing.length > 0) {
          alert('⚠️ Dieser Kunde existiert bereits!\n\nEin Kunde mit dem gleichen Namen UND E-Mail ist bereits vorhanden.')
          setSaving(false)
          return
        }
      }

      // 🔥 REMOVE is_weg_customer before sending to Supabase
      const { is_weg_customer, ...dataToSave } = formData

      const { error } = await supabase
        .from('customers')
        .insert({
          majstor_id: majstor.id,
          ...dataToSave
        })

      if (error) throw error

      // SUCCESS - close everything
      setShowCreateModal(false)
      setSaving(false)
      resetForm()
      await loadCustomers()
      
    } catch (err) {
      console.error('Error creating customer:', err)
      alert('Fehler beim Erstellen: ' + err.message)
      setSaving(false)
    }
  }

  const handleUpdateCustomer = async (e) => {
    e.preventDefault()
    
    if (saving) return
    setSaving(true)
    
    try {
      // 🔥 REMOVE is_weg_customer before sending to Supabase
      const { is_weg_customer, ...dataToSave } = formData

      const { error } = await supabase
        .from('customers')
        .update(dataToSave)
        .eq('id', editingCustomer.id)

      if (error) throw error

      // SUCCESS - close everything
      setShowEditModal(false)
      setEditingCustomer(null)
      setSaving(false)
      resetForm()
      await loadCustomers()
      
    } catch (err) {
      console.error('Error updating customer:', err)
      alert('Fehler beim Aktualisieren: ' + err.message)
      setSaving(false)
    }
  }

  // 🔥 FIXED: Delete with professional modal
  const handleDeleteCustomer = async () => {
    if (!customerToDelete) return
    
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerToDelete.id)

      if (error) throw error
      
      setShowDeleteModal(false)
      setCustomerToDelete(null)
      loadCustomers()
    } catch (err) {
      console.error('Error deleting customer:', err)
      alert('Fehler beim Löschen')
    }
  }

  // 🔥 FIXED: Open delete modal
  const openDeleteModal = (customer) => {
    setCustomerToDelete(customer)
    setShowDeleteModal(true)
  }

  // 🔥 FIXED: Edit modal properly opens
  const openEditModal = (customer) => {
    console.log('🔧 Opening edit modal for:', customer.name)
    setEditingCustomer(customer)
    setFormData({
      name: customer.name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      street: customer.street || '',
      postal_code: customer.postal_code || '',
      city: customer.city || '',
      country: customer.country || 'Deutschland',
      tax_number: customer.tax_number || '',
      notes: customer.notes || '',
      is_favorite: customer.is_favorite || false,
      is_weg_customer: !!customer.weg_street, // 🔥 Auto-detect WEG
      weg_property_name: customer.weg_property_name || '',
      weg_street: customer.weg_street || '',
      weg_postal_code: customer.weg_postal_code || '',
      weg_city: customer.weg_city || '',
      weg_country: customer.weg_country || 'Deutschland'
    })
    setShowEditModal(true)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      street: '',
      postal_code: '',
      city: '',
      country: 'Deutschland',
      tax_number: '',
      notes: '',
      is_favorite: false,
      is_weg_customer: false,
      weg_property_name: '',
      weg_street: '',
      weg_postal_code: '',
      weg_city: '',
      weg_country: 'Deutschland'
    })
    setSaving(false) // 🔥 Reset saving state
  }

  // 📄 INVOICE FLOW
  const handleNewInvoiceClick = (customer) => {
    console.log('🚀 New Invoice clicked for:', customer.name)
    setSelectedCustomerForInvoice(customer)
    setInvoiceType(null)
    setShowInvoiceModal(true)
  }

  const handleInvoiceTypeSelect = (type) => {
    console.log('📄 Invoice type selected:', type)
    setInvoiceType(type)
  }

  const handleInvoiceModalClose = () => {
    setShowInvoiceModal(false)
    setSelectedCustomerForInvoice(null)
    setInvoiceType(null)
  }

  const handleInvoiceSuccess = (createdInvoice) => {
    try {
      console.log('✅ Invoice created:', createdInvoice)
      handleInvoiceModalClose()
      
      const invoiceTab = createdInvoice?.type === 'invoice' ? 'invoices' : 'quotes'
      const redirectUrl = `/dashboard/invoices?tab=${invoiceTab}&from=customers`
      console.log('🚀 Redirecting to:', redirectUrl)
      router.push(redirectUrl)
      
    } catch (error) {
      console.error('❌ Error in handleInvoiceSuccess:', error)
    }
  }

  // 🔥 FIXED: Proper customer formatting for autofill
  const formatCustomerForInvoice = (customer) => {
    return {
      id: customer.id,
      name: customer.name,
      email: customer.email || '',
      phone: customer.phone || '',
      tax_number: customer.tax_number || '',
      // ✅ Structured billing address fields
      weg_property_name: customer.weg_property_name || '',  // ← MORA BITI OVDE!
      street: customer.street || '',
      postal_code: customer.postal_code || '',
      city: customer.city || '',
      country: customer.country || 'Deutschland',
      // ✅ WEG address fields
      weg_street: customer.weg_street || '',
      weg_postal_code: customer.weg_postal_code || '',
      weg_city: customer.weg_city || '',
      weg_country: customer.weg_country || 'Deutschland',
      // ✅ Last service location
      last_service_location: customer.last_service_location || ''
    }
  }

  // 👆 CLICKABLE STATS
  const handleWEGStatClick = () => {
    if (filterWEG === 'with_weg') {
      setFilterWEG('all')
    } else {
      setFilterWEG('with_weg')
      setFilterFavorites(false)
    }
  }

  const handleFavoritesStatClick = () => {
    setFilterFavorites(!filterFavorites)
    if (!filterFavorites) {
      setFilterWEG('all')
    }
  }

  // 🔥 SIMPLIFIED IMPORT HANDLER
  const handleImport = async () => {
    if (!importFile) {
      alert('Bitte wählen Sie eine Datei')
      return
    }

    setImportLoading(true)
    setImportResults(null)

    try {
      const reader = new FileReader()
      
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target.result)
          const workbook = XLSX.read(data, { type: 'array' })
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          const jsonData = XLSX.utils.sheet_to_json(worksheet)

          let imported = 0
          let skipped = 0

          for (const row of jsonData) {
            // Skip if no name
            if (!row.Name && !row.name) {
              skipped++
              continue
            }

            // ✅ SIMPLIFIED: Only basic fields
            const customerData = {
              majstor_id: majstor.id,
              name: row.Name || row.name,
              email: row.Email || row.email || '',
              phone: row.Telefon || row.phone || '',
              street: row['Straße'] || row.street || '',
              postal_code: row.PLZ || row.postal_code || '',
              city: row.Stadt || row.city || '',
              country: 'Deutschland',
              tax_number: row['Steuernummer'] || row.tax_number || '',
              notes: row.Notizen || row.notes || '',
              is_favorite: false,
              weg_property_name: '',
              weg_street: '',
              weg_postal_code: '',
              weg_city: '',
              weg_country: 'Deutschland'
            }

            const { error } = await supabase
              .from('customers')
              .insert(customerData)

            if (error) {
              console.error('Error importing customer:', error)
              skipped++
            } else {
              imported++
            }
          }

          setImportResults({
            total: jsonData.length,
            imported,
            skipped
          })

          await loadCustomers()

        } catch (parseError) {
          console.error('Parse error:', parseError)
          alert('Fehler beim Verarbeiten der Datei')
        } finally {
          setImportLoading(false)
        }
      }

      reader.readAsArrayBuffer(importFile)

    } catch (err) {
      console.error('Import error:', err)
      alert('Fehler beim Importieren')
      setImportLoading(false)
    }
  }

  const exportToExcel = () => {
    // ✅ SIMPLIFIED: Only basic fields
    const exportData = filteredCustomers.map(c => ({
      Name: c.name,
      Email: c.email || '',
      Telefon: c.phone || '',
      'Straße': c.street || '',
      PLZ: c.postal_code || '',
      Stadt: c.city || '',
      'Steuernummer': c.tax_number || '',
      'Notizen': c.notes || '',
      // ✅ Removed: Firma, Favorit, WEG Kunde fields
      'Anzahl Rechnungen': c.total_invoices || 0,
      'Gesamtumsatz': c.total_revenue || 0,
      'Letzter Kontakt': c.last_contact_date || ''
    }))

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Kunden')
    XLSX.writeFile(wb, 'kunden_export.xlsx')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white text-xl">Laden...</div>
      </div>
    )
  }

  if (!majstor) {
    return null
  }

  return (
    <SubscriptionGuard feature="customer_management" majstorId={majstor.id}>
      <div className="space-y-6 pb-20">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-white mb-1">Meine Kunden</h1>
              <p className="text-slate-400 text-sm">Verwalten Sie Ihre Kundendatenbank</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
              >
                ✨ Neuer Kunde
              </button>
              <button
                onClick={() => setShowImportModal(true)}
                className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
              >
                📥 Import
              </button>
              <button
                onClick={exportToExcel}
                className="flex-1 sm:flex-none bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
              >
                📊 Excel Export
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards - ALL CLICKABLE! */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div 
            onClick={() => {
              // Reset all filters
              setFilterWEG('all')
              setFilterFavorites(false)
              setSearchTerm('')
            }}
            className={`bg-slate-800/50 border ${filterWEG === 'all' && !filterFavorites && !searchTerm ? 'border-blue-500 ring-2 ring-blue-500/50' : 'border-slate-700'} rounded-xl p-4 cursor-pointer hover:border-blue-500/50 transition-all`}
          >
            <div className="text-slate-400 text-sm mb-1">Gesamt</div>
            <div className="text-2xl font-bold text-white">{stats.total}</div>
            <div className="text-xs text-slate-500 mt-1">Alle anzeigen</div>
          </div>
          <div 
            onClick={handleWEGStatClick}
            className={`bg-slate-800/50 border ${filterWEG === 'with_weg' ? 'border-purple-500 ring-2 ring-purple-500/50' : 'border-slate-700'} rounded-xl p-4 cursor-pointer hover:border-purple-500/50 transition-all`}
          >
            <div className="text-slate-400 text-sm mb-1">WEG Kunden</div>
            <div className="text-2xl font-bold text-purple-400">{stats.withWEG}</div>
            <div className="text-xs text-slate-500 mt-1">Filtern</div>
          </div>
          <div 
            onClick={handleFavoritesStatClick}
            className={`bg-slate-800/50 border ${filterFavorites ? 'border-yellow-500 ring-2 ring-yellow-500/50' : 'border-slate-700'} rounded-xl p-4 cursor-pointer hover:border-yellow-500/50 transition-all`}
          >
            <div className="text-slate-400 text-sm mb-1">Favoriten</div>
            <div className="text-2xl font-bold text-yellow-400">{stats.favorites}</div>
            <div className="text-xs text-slate-500 mt-1">Filtern</div>
          </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
  <div className="text-slate-400 text-sm mb-1">Gesamtumsatz</div>
  <div className="text-base sm:text-xl lg:text-2xl font-bold text-green-400 flex items-center gap-2 flex-wrap">
    <span>💰</span>
    <span className="break-words">
      {stats.totalRevenue.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
    </span>
  </div>
</div>
        </div>

        {/* Filters - COMPLETE */}
        <div className="flex flex-col sm:flex-row gap-4">
          <input
            type="text"
            placeholder="Suche nach Name, E-Mail oder Firma..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
          
          {/* WEG Filter Dropdown */}
          <select
            value={filterWEG}
            onChange={(e) => {
              setFilterWEG(e.target.value)
              if (e.target.value !== 'all') {
                setFilterFavorites(false)
              }
            }}
            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
          >
            <option value="all">Alle Kunden</option>
            <option value="with_weg">Nur WEG Kunden</option>
            <option value="without_weg">Ohne WEG</option>
          </select>

          {/* Sort Dropdown */}
          <select
  value={sortBy}
  onChange={(e) => setSortBy(e.target.value)}
  className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
>
  <option value="created_at">Neueste zuerst</option>
  <option value="name">Nach Name</option>
  <option value="revenue">Nach Umsatz</option>
  <option value="last_contact">Nach letztem Kontakt</option>
</select>
        </div>

        {/* Customers Table - Desktop */}
        <div className="hidden lg:block bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-900/50 border-b border-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider w-8"></th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Kontakt</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider w-64">Adresse</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Rechnungen</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Umsatz</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Aktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-4 py-8 text-center text-slate-400">
                      Keine Kunden gefunden
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map(customer => (
                    <tr key={customer.id} className="hover:bg-slate-700/30 transition-colors">
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggleFavorite(customer)}
                          className="hover:scale-125 transition-transform"
                        >
                          {customer.is_favorite ? (
                            <span className="text-yellow-400">⭐</span>
                          ) : (
                            <span className="text-slate-600">☆</span>
                          )}
                        </button>
                        </td>
                     <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="font-medium text-white">{customer.name}</div>
                          {customer.notes && (
                            <button
                              onClick={() => {
                                setSelectedCustomerNotes({
                                  name: customer.name,
                                  notes: customer.notes
                                })
                                setShowNotesModal(true)
                              }}
                              className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 px-2 py-0.5 rounded text-xs font-medium cursor-pointer transition-colors"
                              title="Notizen anzeigen"
                            >
                              📝
                            </button>
                          )}
                        </div>
                      </td>
                <td className="px-4 py-3">
  {customer.email ? (
    <a 
      href={`mailto:${customer.email}`}
      className="text-sm text-blue-400 hover:text-blue-300 underline transition-colors block"
    >
      {customer.email}
    </a>
  ) : (
    <div className="text-sm text-slate-500">-</div>
  )}
  {customer.phone ? (
    <a 
      href={`tel:${customer.phone}`}
      className="text-xs text-green-400 hover:text-green-300 underline transition-colors block"
    >
      {customer.phone}
    </a>
  ) : (
    <div className="text-xs text-slate-500">-</div>
  )}
</td>
                      <td className="px-4 py-3">
  <div className="flex items-center gap-2">
    <div>
      <div className="text-sm text-slate-300">
        {customer.street ? `${customer.street}` : '-'}
      </div>
      <div className="text-xs text-slate-400">
        {customer.postal_code && customer.city ? `${customer.postal_code} ${customer.city}` : ''}
      </div>
    </div>
    {customer.weg_street && (
      <span className="bg-purple-500/20 text-purple-300 px-2 py-1 rounded text-xs font-medium whitespace-nowrap">
        WEG
      </span>
    )}
  </div>
</td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-slate-300 font-medium">{customer.total_invoices || 0}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {customer.total_revenue && parseFloat(customer.total_revenue) > 0 ? (
                          <span className="text-green-400 font-medium flex items-center justify-end gap-1">
                            <span>💰</span>
                            {parseFloat(customer.total_revenue).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                          </span>
                        ) : (
                          <span className="text-slate-500 text-sm">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleNewInvoiceClick(customer)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
                            title="Rechnung erstellen"
                          >
                            💼 Neue Rechnung
                          </button>
                          <button
                            onClick={() => openEditModal(customer)}
                            className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
                            title="Bearbeiten"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => openDeleteModal(customer)}
                            className="bg-red-600/20 hover:bg-red-600/30 text-red-400 px-3 py-1 rounded text-xs font-medium transition-colors"
                            title="Löschen"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Customers Cards - Mobile 📱 */}
        <div className="lg:hidden space-y-4">
          {filteredCustomers.length === 0 ? (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 text-center text-slate-400">
              Keine Kunden gefunden
            </div>
          ) : (
            filteredCustomers.map(customer => (
              <div key={customer.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 hover:border-slate-600 transition-colors">
               {/* Header with name and favorite */}
<div className="flex items-start justify-between mb-3">
  <div className="flex-1">
    <div className="flex items-center gap-2 mb-1">
      <button
        onClick={() => handleToggleFavorite(customer)}
        className="hover:scale-125 transition-transform"
      >
        {customer.is_favorite ? (
          <span className="text-yellow-400 text-lg">⭐</span>
        ) : (
          <span className="text-slate-600 text-lg">☆</span>
        )}
      </button>
      <h3 className="font-semibold text-white text-lg">{customer.name}</h3>
      {customer.notes && (
        <button
          onClick={() => {
            setSelectedCustomerNotes({
              name: customer.name,
              notes: customer.notes
            })
            setShowNotesModal(true)
          }}
          className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 px-2 py-0.5 rounded text-xs font-medium cursor-pointer transition-colors"
          title="Notizen anzeigen"
        >
          📝
        </button>
      )}
    </div>
  </div>
  {customer.weg_street && (
    <span className="bg-purple-500/20 text-purple-300 px-2 py-1 rounded text-xs font-medium">
      WEG
    </span>
  )}
</div>

                {/* Contact info */}
                <div className="space-y-2 mb-4">
                {customer.email && (
  <a 
    href={`mailto:${customer.email}`}
    className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
  >
    <span className="text-slate-500">📧</span>
    <span className="underline">{customer.email}</span>
  </a>
)}
{customer.phone && (
  <a 
    href={`tel:${customer.phone}`}
    className="flex items-center gap-2 text-sm text-green-400 hover:text-green-300 transition-colors"
  >
    <span className="text-slate-500">📞</span>
    <span className="underline">{customer.phone}</span>
  </a>
)}
                  {customer.street && (
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <span className="text-slate-500">📍</span>
                      <span>{customer.street}, {customer.postal_code} {customer.city}</span>
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-700">
                  <div className="text-center">
                    <div className="text-xs text-slate-400 mb-1">Rechnungen</div>
                    <div className="text-lg font-semibold text-white">{customer.total_invoices || 0}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-slate-400 mb-1">Umsatz</div>
                    {customer.total_revenue && parseFloat(customer.total_revenue) > 0 ? (
                      <div className="text-lg font-semibold text-green-400 flex items-center gap-1">
                        <span>💰</span>
                        {parseFloat(customer.total_revenue).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                      </div>
                    ) : (
                      <div className="text-lg text-slate-500">-</div>
                    )}
                  </div>
                </div>

                {/* Actions */}
           <div className="grid grid-cols-3 gap-2">
  <button
    onClick={() => handleNewInvoiceClick(customer)}
    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors flex flex-col items-center gap-1"
  >
    <span className="text-base">💼</span>
    <span>Rechnung</span>
  </button>
  <button
    onClick={() => openEditModal(customer)}
    className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors flex flex-col items-center gap-1"
  >
    <span className="text-base">✏️</span>
    <span>Bearbeiten</span>
  </button>
  <button
    onClick={() => openDeleteModal(customer)}
    className="bg-red-600/20 hover:bg-red-600/30 text-red-400 px-3 py-2 rounded-lg text-xs font-medium transition-colors flex flex-col items-center gap-1"
  >
    <span className="text-base">🗑️</span>
    <span>Löschen</span>
  </button>
</div>
              </div>
            ))
          )}
        </div>

        {/* 🔥 DELETE CONFIRMATION MODAL - PROFESSIONAL STYLE */}
        {showDeleteModal && customerToDelete && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-2xl p-6 max-w-md w-full border-2 border-red-500/30">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center text-2xl">
                  🗑️
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">Kunde löschen?</h3>
                  <p className="text-sm text-slate-400">{customerToDelete.name}</p>
                </div>
              </div>

              <div className="mb-6 space-y-3">
                <p className="text-slate-300">
                  Möchten Sie diesen Kunden wirklich <strong className="text-white">unwiderruflich löschen</strong>?
                </p>
                
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <span className="text-red-400 text-xl">⚠️</span>
                    <div className="text-sm text-red-300">
                      <strong>Achtung:</strong> Alle zugehörigen Rechnungen und Daten bleiben erhalten, 
                      aber der Kunde wird aus der Datenbank entfernt.
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false)
                    setCustomerToDelete(null)
                  }}
                  className="flex-1 bg-slate-600 text-white py-3 rounded-lg hover:bg-slate-700 transition-colors font-medium"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleDeleteCustomer}
                  className="flex-1 bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  Ja, löschen
                </button>
              </div>
            </div>
          </div>
        )}
        {/* 📝 NOTES MODAL */}
        {showNotesModal && selectedCustomerNotes && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-2xl p-6 max-w-lg w-full border-2 border-blue-500/30">
              
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-xl">
                    📝
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white">Notizen</h3>
                    <p className="text-sm text-slate-400">{selectedCustomerNotes.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowNotesModal(false)
                    setSelectedCustomerNotes(null)
                  }}
                  className="text-slate-400 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>

              {/* Content */}
              <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                <p className="text-slate-300 whitespace-pre-wrap">
                  {selectedCustomerNotes.notes}
                </p>
              </div>

              {/* Footer */}
              <div className="flex justify-end mt-4">
                <button
                  onClick={() => {
                    setShowNotesModal(false)
                    setSelectedCustomerNotes(null)
                  }}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Schließen
                </button>
              </div>
            </div>
          </div>
        )}
        {/* CREATE/EDIT MODAL */}
        {(showCreateModal || showEditModal) && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-slate-800 rounded-2xl p-6 max-w-2xl w-full my-8">
              <h2 className="text-2xl font-bold text-white mb-6">
                {showCreateModal ? 'Neuer Kunde' : 'Kunde bearbeiten'}
              </h2>

              <form onSubmit={showCreateModal ? handleCreateCustomer : handleUpdateCustomer}>
                <div className="space-y-6">
                  {/* Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Name *</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">E-Mail</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Telefon</label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white"
                      />
                    </div>
                  </div>

                  {/* Address */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">Adresse</h3>
                    <div className="grid grid-cols-1 gap-4">
                      <input
                        type="text"
                        placeholder="Straße und Hausnummer"
                        value={formData.street}
                        onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white"
                      />
                      <div className="grid grid-cols-3 gap-4">
                        <input
                          type="text"
                          placeholder="PLZ"
                          value={formData.postal_code}
                          onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                          className="px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white"
                        />
                        <input
                          type="text"
                          placeholder="Stadt"
                          value={formData.city}
                          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                          className="col-span-2 px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* WEG Section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="is_weg"
                        checked={formData.is_weg_customer}
                        onChange={(e) => setFormData({ ...formData, is_weg_customer: e.target.checked })}
                        className="w-4 h-4 bg-slate-900 border-slate-600 rounded"
                      />
                      <label htmlFor="is_weg" className="text-sm font-medium text-slate-300">
                        WEG Kunde (Wohnungseigentümergemeinschaft)
                      </label>
                    </div>

                    {formData.is_weg_customer && (
                      <div className="space-y-4 pl-6 border-l-2 border-purple-500/30">
                        <input
                          type="text"
                          placeholder="WEG Objektname"
                          value={formData.weg_property_name}
                          onChange={(e) => setFormData({ ...formData, weg_property_name: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white"
                        />
                        <input
                          type="text"
                          placeholder="WEG Straße und Hausnummer"
                          value={formData.weg_street}
                          onChange={(e) => setFormData({ ...formData, weg_street: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white"
                        />
                        <div className="grid grid-cols-3 gap-4">
                          <input
                            type="text"
                            placeholder="PLZ"
                            value={formData.weg_postal_code}
                            onChange={(e) => setFormData({ ...formData, weg_postal_code: e.target.value })}
                            className="px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white"
                          />
                          <input
                            type="text"
                            placeholder="Stadt"
                            value={formData.weg_city}
                            onChange={(e) => setFormData({ ...formData, weg_city: e.target.value })}
                            className="col-span-2 px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Additional */}
                  <div className="space-y-4">
                    <input
                      type="text"
                      placeholder="Steuernummer (optional)"
                      value={formData.tax_number}
                      onChange={(e) => setFormData({ ...formData, tax_number: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white"
                    />
                    <textarea
                      placeholder="Notizen"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white"
                    />
                  </div>

                  {/* Favorite - ONLY IN EDIT MODE */}
                  {showEditModal && (
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="is_favorite"
                        checked={formData.is_favorite}
                        onChange={(e) => setFormData({ ...formData, is_favorite: e.target.checked })}
                        className="w-4 h-4 bg-slate-900 border-slate-600 rounded"
                      />
                      <label htmlFor="is_favorite" className="text-sm font-medium text-slate-300">
                        ⭐ Als Favorit markieren
                      </label>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false)
                      setShowEditModal(false)
                      setEditingCustomer(null)
                      resetForm()
                      setSaving(false) // Reset saving state
                    }}
                    disabled={saving}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-4 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="animate-spin">⏳</span>
                        {showCreateModal ? 'Erstelle...' : 'Speichert...'}
                      </span>
                    ) : (
                      showCreateModal ? 'Kunde erstellen' : 'Änderungen speichern'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* INVOICE MODAL - OLD DESIGN RESTORED */}
        {showInvoiceModal && selectedCustomerForInvoice && (
          <>
            {!invoiceType ? (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4">
                  <h3 className="text-xl font-bold text-white mb-4">
                    Für {selectedCustomerForInvoice.name}
                  </h3>
                  <p className="text-slate-300 mb-6">
                    Was möchten Sie erstellen?
                  </p>
                  <div className="space-y-3">
                    <button
                      onClick={() => handleInvoiceTypeSelect('quote')}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-lg font-medium transition-colors text-left flex items-center gap-3"
                    >
                      <span className="text-2xl">📋</span>
                      <div>
                        <div className="font-semibold">Angebot erstellen</div>
                        <div className="text-sm text-blue-200">Kostenvoranschlag für Kunde</div>
                      </div>
                    </button>
                    <button
                      onClick={() => handleInvoiceTypeSelect('invoice')}
                      className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-4 rounded-lg font-medium transition-colors text-left flex items-center gap-3"
                    >
                      <span className="text-2xl">💼</span>
                      <div>
                        <div className="font-semibold">Rechnung erstellen</div>
                        <div className="text-sm text-green-200">Offizielle Rechnung mit MwSt.</div>
                      </div>
                    </button>
                  </div>
                  <button
                    onClick={handleInvoiceModalClose}
                    className="w-full mt-4 bg-slate-700 hover:bg-slate-600 text-white px-4 py-3 rounded-lg font-medium transition-colors"
                  >
                    Abbrechen
                  </button>
                </div>
              </div>
            ) : (
              <InvoiceCreator
                isOpen={true}
                onClose={handleInvoiceModalClose}
                type={invoiceType}
                majstor={majstor}
                onSuccess={handleInvoiceSuccess}
                prefilledCustomer={formatCustomerForInvoice(selectedCustomerForInvoice)}
              />
            )}
          </>
        )}

        {/* IMPORT MODAL */}
        {showImportModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-2xl p-6 max-w-2xl w-full">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Kunden importieren</h2>
                <button
                  onClick={() => {
                    setShowImportModal(false)
                    setImportFile(null)
                    setImportResults(null)
                  }}
                  className="text-slate-400 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                {/* Instructions - SIMPLIFIED */}
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <h3 className="text-blue-300 font-medium mb-2">📋 Anleitung:</h3>
                  <ul className="text-sm text-slate-300 space-y-1">
                    <li>• Unterstützte Formate: Excel (.xlsx, .xls) und CSV</li>
                    <li>• <strong>Erforderliche Spalte:</strong> Name</li>
                    <li>• <strong>Optionale Spalten:</strong> Email, Telefon, Straße, PLZ, Stadt, Steuernummer, Notizen</li>
                    <li>• Alle Kunden werden automatisch als normale Kunden importiert</li>
                    <li>• WEG-Kunden und Favoriten können nach dem Import manuell bearbeitet werden</li>
                  </ul>
                </div>

                {/* Download Template - SIMPLIFIED */}
                <button
                  onClick={() => {
                    const templateData = [{
                      'Name': 'Max Mustermann',
                      'Email': 'max@example.com',
                      'Telefon': '+49123456789',
                      'Straße': 'Musterstraße 123',
                      'PLZ': '12345',
                      'Stadt': 'Berlin',
                      'Steuernummer': 'DE123456789',
                      'Notizen': ''
                    }]
                    const ws = XLSX.utils.json_to_sheet(templateData)
                    const wb = XLSX.utils.book_new()
                    XLSX.utils.book_append_sheet(wb, ws, 'Vorlage')
                    XLSX.writeFile(wb, 'kunden_import_vorlage.xlsx')
                  }}
                  className="w-full bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm flex items-center justify-center gap-2"
                >
                  📥 Vorlage herunterladen
                </button>

                {/* File Upload */}
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Datei auswählen</label>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={(e) => setImportFile(e.target.files[0])}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                  />
                  {importFile && (
                    <p className="text-sm text-green-400 mt-2">
                      ✓ Datei ausgewählt: {importFile.name}
                    </p>
                  )}
                </div>

                {/* Results */}
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

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => {
                      setShowImportModal(false)
                      setImportFile(null)
                      setImportResults(null)
                    }}
                    disabled={importLoading}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-4 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    {importResults ? 'Schließen' : 'Abbrechen'}
                  </button>
                  {!importResults && (
                    <button
                      onClick={handleImport}
                      disabled={!importFile || importLoading}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {importLoading ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="animate-spin">⏳</span>
                          Importiere...
                        </span>
                      ) : (
                        '📥 Import starten'
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </SubscriptionGuard>
  )
}