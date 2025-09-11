// app/dashboard/services/page.js - SUSPENSE WRAPPED WITH ALL FUNCTIONALITY

'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

function ServicesPageContent() {
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [majstor, setMajstor] = useState(null)
  
  // Service stats state
  const [serviceStats, setServiceStats] = useState({
    totalServices: 0,
    mostPopular: null,
    averagePrice: 0
  })
  
  // Search & Filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('usage_count')
  const [sortOrder, setSortOrder] = useState('desc')
  const [filterBySource, setFilterBySource] = useState('all') // all, manual, import, invoice
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [editingService, setEditingService] = useState(null)
  
  // Create/Edit form state
  const [formData, setFormData] = useState({
    name: ''
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
      loadServices()
    }
  }, [searchTerm, sortBy, sortOrder, filterBySource, majstor?.id])

  // Calculate stats when services change
  useEffect(() => {
    if (majstor?.id && services.length >= 0) {
      calculateServiceStats()
    }
  }, [services, majstor?.id])

  // Function to calculate service statistics
  const calculateServiceStats = async () => {
  try {
    if (!majstor?.id || services.length === 0) {
      setServiceStats({
        totalServices: 0,
        mostPopular: null,
        averagePrice: 0
      })
      return
    }

    // 1. Total services
    const totalServices = services.length

    // Fetch only PAID invoices
const { data: invoices, error } = await supabase
  .from('invoices')
  .select('items')
  .eq('majstor_id', majstor.id)
  .eq('type', 'invoice')         // Samo fakture, ne profakture
  .eq('status', 'paid')          // Samo plaćene

    let mostPopular = null
    let averagePrice = 0

    if (!error && invoices && invoices.length > 0) {
      // 2. Average price calculation from invoices
      const allPrices = []
      const serviceUsage = {}

      invoices.forEach(invoice => {
        if (invoice.items) {
          try {
            const items = JSON.parse(invoice.items)
            items.forEach(item => {
              // Za prosečnu cenu
              if (item.price && item.price > 0) {
                allPrices.push(parseFloat(item.price))
              }
              
              // Za najpopularniju uslugu
              if (item.description) {
                const description = item.description.trim()
                serviceUsage[description] = (serviceUsage[description] || 0) + 1
              }
            })
          } catch (parseError) {
            console.warn('Failed to parse invoice items:', parseError)
          }
        }
      })

      // Izračunaj prosečnu cenu
      if (allPrices.length > 0) {
        averagePrice = allPrices.reduce((sum, price) => sum + price, 0) / allPrices.length
      }

      // Pronađi najpopularniju uslugu
      if (Object.keys(serviceUsage).length > 0) {
        const mostUsedService = Object.entries(serviceUsage)
          .sort(([,a], [,b]) => b - a)[0]
        
        mostPopular = {
          name: mostUsedService[0],
          count: mostUsedService[1]
        }
      }
    }

    setServiceStats({
      totalServices,
      mostPopular,
      averagePrice
    })

    console.log('Service stats calculated:', {
      totalServices,
      mostPopular,
      averagePrice
    })

  } catch (error) {
    console.error('Error calculating service stats:', error)
    setServiceStats({
      totalServices: services.length,
      mostPopular: null,
      averagePrice: 0
    })
  }
}

  // Format currency function
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

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

    } catch (err) {
      console.error('Error loading data:', err)
      setError('Fehler beim Laden der Daten')
    } finally {
      setLoading(false)
    }
  }

  const loadServices = async () => {
    if (!majstor?.id) return
    
    try {
      let query = supabase
        .from('services')
        .select('*')
        .eq('majstor_id', majstor.id)
        .eq('is_active', true)

      // Search functionality
      if (searchTerm) {
        query = query.ilike('name', `%${searchTerm}%`)
      }

      // Filter by source
      if (filterBySource !== 'all') {
        query = query.eq('source', filterBySource)
      }

      // Sorting
      query = query.order(sortBy, { ascending: sortOrder === 'asc' })

      const { data: servicesData, error } = await query
      
      if (error) {
        console.error('Error loading services:', error)
        setError('Fehler beim Laden der Services')
      } else {
        setServices(servicesData || [])
      }
    } catch (err) {
      console.error('Error:', err)
      setError('Fehler beim Laden der Services')
    }
  }

  const resetForm = () => {
    setFormData({ name: '' })
    setFormError('')
    setEditingService(null)
  }

  const handleCreateClick = () => {
    resetForm()
    setShowCreateModal(true)
  }

  const handleEditClick = (service) => {
    setFormData({
      name: service.name || ''
    })
    setEditingService(service)
    setFormError('')
    setShowCreateModal(true)
  }

  const handleFormSubmit = async (e) => {
    e.preventDefault()
    setFormLoading(true)
    setFormError('')

    try {
      if (!formData.name.trim()) {
        throw new Error('Service Name ist erforderlich')
      }

      // Check for duplicates
      const { data: existing } = await supabase
        .from('services')
        .select('id')
        .eq('majstor_id', majstor.id)
        .eq('is_active', true)
        .ilike('name', formData.name.trim())

      if (existing && existing.length > 0 && (!editingService || existing[0].id !== editingService.id)) {
        throw new Error('Diese Service existiert bereits')
      }

      let result
      if (editingService) {
        result = await supabase
          .from('services')
          .update({
            name: formData.name.trim(),
            updated_at: new Date().toISOString()
          })
          .eq('id', editingService.id)
          .select()
          .single()
      } else {
        result = await supabase
          .from('services')
          .insert({
            majstor_id: majstor.id,
            name: formData.name.trim(),
            source: 'manual'
          })
          .select()
          .single()
      }

      if (result.error) throw result.error

      await loadServices()
      setShowCreateModal(false)
      resetForm()

    } catch (err) {
      console.error('Error saving service:', err)
      setFormError(err.message)
    } finally {
      setFormLoading(false)
    }
  }

  const handleDeleteService = async (service) => {
    const confirmed = confirm(
      `Möchten Sie die Service "${service.name}" wirklich löschen?\n\n` +
      `Diese Aktion kann NICHT rückgängig gemacht werden!`
    )
    
    if (!confirmed) return

    try {
      const { error } = await supabase
        .from('services')
        .update({ is_active: false })
        .eq('id', service.id)

      if (error) throw error

      await loadServices()

    } catch (err) {
      console.error('Error deleting service:', err)
      alert('Fehler beim Löschen: ' + err.message)
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

      // Process services data
      const validServices = parsed.data
        .filter(row => {
          const name = row.name || row.Name || row.service || row.Service || row.Dienstleistung
          return name && name.trim().length > 0
        })
        .map(row => ({
          majstor_id: majstor.id,
          name: (row.name || row.Name || row.service || row.Service || row.Dienstleistung).trim(),
          source: 'import'
        }))

      if (validServices.length === 0) {
        throw new Error('Keine gültigen Services in der Datei gefunden')
      }

      // Check for duplicates
      const existingServices = await supabase
        .from('services')
        .select('name')
        .eq('majstor_id', majstor.id)
        .eq('is_active', true)

      const existingNames = new Set(
        existingServices.data?.map(s => s.name.toLowerCase()) || []
      )

      const newServices = validServices.filter(service => 
        !existingNames.has(service.name.toLowerCase())
      )

      let imported = 0
      if (newServices.length > 0) {
        const { data, error } = await supabase
          .from('services')
          .insert(newServices)
          .select()

        if (error) throw error
        imported = data?.length || 0
      }

      const skipped = validServices.length - imported

      setImportResults({ 
        imported, 
        skipped, 
        total: parsed.data.length 
      })
      
      await loadServices()

    } catch (err) {
      console.error('Import error:', err)
      alert('Import-Fehler: ' + err.message)
    } finally {
      setImportLoading(false)
    }
  }

  const getSourceBadgeColor = (source) => {
    const colors = {
      'manual': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      'import': 'bg-green-500/10 text-green-400 border-green-500/20',
      'invoice': 'bg-purple-500/10 text-purple-400 border-purple-500/20'
    }
    return colors[source] || colors.manual
  }

  const getSourceLabel = (source) => {
    const labels = {
      'manual': 'Manuell',
      'import': 'Import',
      'invoice': 'Rechnung'
    }
    return labels[source] || source
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('de-DE')
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
          <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">Meine Services</h1>
          <p className="text-slate-400">
            Verwalten Sie Ihre Dienstleistungen für schnellere Rechnungserstellung
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

      {/* Updated Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Services */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Gesamt Services</p>
              <p className="text-2xl font-bold text-white">{serviceStats.totalServices}</p>
            </div>
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white">
              ✏️
            </div>
          </div>
        </div>
        
        {/* Most Popular Service */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Beliebteste Service</p>
              {serviceStats.mostPopular ? (
                <>
                  <p className="text-lg font-bold text-white truncate" title={serviceStats.mostPopular.name}>
                    {serviceStats.mostPopular.name.length > 15 
                      ? serviceStats.mostPopular.name.substring(0, 15) + '...'
                      : serviceStats.mostPopular.name
                    }
                  </p>
                  <p className="text-xs text-slate-500">{serviceStats.mostPopular.count}x verwendet</p>
                </>
              ) : (
                <p className="text-lg font-bold text-slate-400">Noch keine Daten</p>
              )}
            </div>
            <div className="w-10 h-10 bg-yellow-600 rounded-lg flex items-center justify-center text-white">
              ⭐
            </div>
          </div>
        </div>

        {/* Average Price */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Ø Service Preis</p>
              <p className="text-2xl font-bold text-white">
                {serviceStats.averagePrice > 0 ? formatCurrency(serviceStats.averagePrice) : '0€'}
              </p>
            </div>
            <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center text-white">
              💰
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
              placeholder="Services suchen..."
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
            <select
              value={filterBySource}
              onChange={(e) => setFilterBySource(e.target.value)}
              className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
            >
              <option value="all">Alle Quellen</option>
              <option value="manual">Manuell</option>
              <option value="import">Import</option>
              <option value="invoice">Aus Rechnungen</option>
            </select>
            
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-')
                setSortBy(field)
                setSortOrder(order)
              }}
              className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
            >
              <option value="usage_count-desc">Meist genutzt</option>
              <option value="usage_count-asc">Wenig genutzt</option>
              <option value="name-asc">Name A-Z</option>
              <option value="name-desc">Name Z-A</option>
              <option value="created_at-desc">Neueste zuerst</option>
              <option value="created_at-asc">Älteste zuerst</option>
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
            + Neue Service
          </button>
        </div>
      </div>

      {/* Services List */}
      {services.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <div className="text-4xl mb-4">🔧</div>
          <p className="text-lg mb-2">
            {searchTerm ? 'Keine Services gefunden' : 'Noch keine Services'}
          </p>
          <p className="text-sm mb-4">
            {searchTerm 
              ? 'Versuchen Sie einen anderen Suchbegriff' 
              : 'Erstellen Sie Ihre erste Service oder importieren Sie aus einer Excel-Datei'
            }
          </p>
          {!searchTerm && (
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleCreateClick}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Erste Service erstellen
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
          {services.map((service) => (
            <div key={service.id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 hover:border-slate-600 transition-colors">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-white font-semibold text-lg">{service.name}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs border ${getSourceBadgeColor(service.source)}`}>
                      {getSourceLabel(service.source)}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-6 text-sm text-slate-400">
                    <span>📊 {service.usage_count || 0}x verwendet</span>
                    <span>📅 Erstellt: {formatDate(service.created_at)}</span>
                    {service.last_used_at && (
                      <span>⏰ Zuletzt: {formatDate(service.last_used_at)}</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => handleEditClick(service)}
                    className="bg-slate-700 text-white px-3 py-2 rounded text-sm hover:bg-slate-600 transition-colors"
                  >
                    ✏️ Bearbeiten
                  </button>
                  
                  <button
                    onClick={() => handleDeleteService(service)}
                    className="bg-red-600 text-white px-3 py-2 rounded text-sm hover:bg-red-700 transition-colors"
                  >
                    🗑️ Löschen
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Service Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg w-full max-w-md">
            <div className="flex justify-between items-center p-6 border-b border-slate-700">
              <h3 className="text-xl font-semibold text-white">
                {editingService ? 'Service bearbeiten' : 'Neue Service'}
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Service Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                  className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white"
                  placeholder="z.B. Wasserrohr reparieren"
                />
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
                    : (editingService ? 'Service aktualisieren' : 'Service erstellen')
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
                  <p>• <strong>name</strong> oder <strong>Name</strong></p>
                  <p>• <strong>service</strong> oder <strong>Service</strong></p>
                  <p>• <strong>Dienstleistung</strong></p>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Nur eine Spalte mit dem Service-Namen ist erforderlich
                </p>
              </div>

              {importResults && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                  <h4 className="text-green-300 font-medium mb-2">Import Ergebnisse:</h4>
                  <div className="text-sm text-slate-300 space-y-1">
                    <p>✅ {importResults.imported} Services erfolgreich importiert</p>
                    <p>⚠️ {importResults.skipped} Einträge übersprungen (bereits vorhanden)</p>
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
    </div>
  )
}

export default function ServicesPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="text-white text-xl">Laden...</div>
      </div>
    }>
      <ServicesPageContent />
    </Suspense>
  )
}