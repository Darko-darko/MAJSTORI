// app/dashboard/pdf-archive/page.js - MIT DETAIL VIEW
'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function PDFArchivePage() {
  // State management
  const [majstor, setMajstor] = useState(null)
  const [archivedPDFs, setArchivedPDFs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // 🆕 DETAIL VIEW STATE
  const [selectedPDF, setSelectedPDF] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // Bulk selection state
  const [selectedPDFs, setSelectedPDFs] = useState(new Set())
  const [bulkEmailModal, setBulkEmailModal] = useState(false)
  const [bulkEmailLoading, setBulkEmailLoading] = useState(false)

  // Bookkeeper settings
  const [bookkeeperSettings, setBookkeeperSettings] = useState({
    showSettings: false,
    email: '',
    name: 'Buchhalter'
  })

  // Filters
  const [filters, setFilters] = useState({
    type: 'invoice', // invoice (default) or quote - no 'all' to prevent mixed document types
    dateRange: 'thisMonth', // thisMonth default - prevents massive email attachments
    customer: '',
    customMonth: new Date().getMonth() + 1, // 1-12
    customYear: new Date().getFullYear()
  })

  // 🚨 MAX PDFs per email to prevent attachment size issues
  const MAX_PDFS_PER_EMAIL = 50

  // Load data on mount
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        setError('Authentication required')
        return
      }

      // Get majstor profile
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
      
      // Load bookkeeper email from majstor settings
      if (majstorData.bookkeeper_email) {
        setBookkeeperSettings(prev => ({
          ...prev,
          email: majstorData.bookkeeper_email,
          name: majstorData.bookkeeper_name || 'Buchhalter'
        }))
      }
      
      await loadArchivedPDFs(user.id)

    } catch (err) {
      console.error('Error loading data:', err)
      setError('Fehler beim Laden der Daten')
    } finally {
      setLoading(false)
    }
  }

  const loadArchivedPDFs = async (majstorId) => {
    try {
      console.log('📂 Loading archived PDFs for majstor:', majstorId)
      
      let query = supabase
        .from('invoices')
        .select(`
          id, type, invoice_number, quote_number, customer_name, 
          total_amount, pdf_generated_at, pdf_storage_path, pdf_file_size,
          created_at, status, customer_email, issue_date
        `)
        .eq('majstor_id', majstorId)
        .not('pdf_storage_path', 'is', null)
        .neq('status', 'dummy') // Exclude dummy entries

      // Apply filters - type filter always applies (no 'all' option)
      query = query.eq('type', filters.type)

      if (filters.customer) {
        query = query.eq('customer_name', filters.customer)
      }

      // Date filter - always applies (no "show all" option to prevent massive emails)
      if (filters.dateRange === 'thisMonth') {
        const startOfMonth = new Date()
        startOfMonth.setDate(1)
        startOfMonth.setHours(0, 0, 0, 0)
        query = query.gte('pdf_generated_at', startOfMonth.toISOString())
      } else if (filters.dateRange === 'lastMonth') {
        const now = new Date()
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)
        query = query
          .gte('pdf_generated_at', startOfLastMonth.toISOString())
          .lte('pdf_generated_at', endOfLastMonth.toISOString())
      } else if (filters.dateRange === 'custom') {
        // Custom month and year
        const startOfCustomMonth = new Date(filters.customYear, filters.customMonth - 1, 1)
        const endOfCustomMonth = new Date(filters.customYear, filters.customMonth, 0, 23, 59, 59)
        query = query
          .gte('pdf_generated_at', startOfCustomMonth.toISOString())
          .lte('pdf_generated_at', endOfCustomMonth.toISOString())
      }

      const { data: pdfsData, error } = await query.order('pdf_generated_at', { ascending: false })

      if (error) throw error

      setArchivedPDFs(pdfsData || [])
      console.log('✅ Loaded', pdfsData?.length || 0, 'archived PDFs (no dummies)')

    } catch (err) {
      console.error('Archive loading error:', err)
      setError('Fehler beim Laden der PDF-Archive')
    }
  }

  // 🆕 LOAD FULL INVOICE DETAILS FOR DETAIL VIEW
  const loadInvoiceDetails = async (pdfId) => {
    try {
      setDetailLoading(true)
      
      const { data: invoice, error } = await supabase
        .from('invoices')
        .select('*') // Get full invoice data
        .eq('id', pdfId)
        .single()

      if (error) throw error
      
      setSelectedPDF(invoice)
      console.log('✅ Loaded full invoice details for:', invoice.invoice_number || invoice.quote_number)

    } catch (err) {
      console.error('Error loading invoice details:', err)
      alert('Fehler beim Laden der Details: ' + err.message)
    } finally {
      setDetailLoading(false)
    }
  }

  // 🆕 REPLACE openPDF with showDetails
  const showDetails = (pdfId) => {
    loadInvoiceDetails(pdfId)
  }

  // 🆕 BACK TO LIST
  const backToList = () => {
    setSelectedPDF(null)
  }

  // Helper function to get unique customers with PDF counts
  const getCustomersWithCounts = () => {
    const customerCounts = {}
    
    archivedPDFs.forEach(pdf => {
      const customerName = pdf.customer_name
      if (customerName) {
        customerCounts[customerName] = (customerCounts[customerName] || 0) + 1
      }
    })
    
    return Object.entries(customerCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count) // Sort by PDF count descending
  }
  const validateEmails = (emailString) => {
    if (!emailString.trim()) return { valid: false, emails: [] }
    
    const emails = emailString
      .split(',')
      .map(email => email.trim())
      .filter(email => email.length > 0)
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const validEmails = emails.filter(email => emailRegex.test(email))
    
    return {
      valid: validEmails.length > 0 && validEmails.length === emails.length,
      emails: validEmails,
      invalidEmails: emails.filter(email => !emailRegex.test(email))
    }
  }

  // Bulk selection functions
  const togglePDFSelection = (pdfId) => {
    setSelectedPDFs(prev => {
      const newSet = new Set(prev)
      if (newSet.has(pdfId)) {
        newSet.delete(pdfId)
      } else {
        newSet.add(pdfId)
      }
      return newSet
    })
  }

  const toggleAllPDFs = () => {
    if (selectedPDFs.size === archivedPDFs.length) {
      setSelectedPDFs(new Set())
    } else {
      setSelectedPDFs(new Set(archivedPDFs.map(pdf => pdf.id)))
    }
  }

  const clearSelection = () => {
    setSelectedPDFs(new Set())
  }

  // PDF operations
  const downloadPDF = async (pdfId) => {
    try {
      const response = await fetch(`/api/invoices/${pdfId}/pdf`)
      if (!response.ok) throw new Error('PDF download failed')
      
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `invoice-${pdfId}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert('Download fehlgeschlagen: ' + err.message)
    }
  }

  const openPDFInNewTab = (pdfId) => {
    window.open(`/api/invoices/${pdfId}/pdf`, '_blank')
  }

  // Bulk email functionality
  const handleBulkEmail = async (emailData) => {
    setBulkEmailLoading(true)
    
    try {
      const selectedItems = archivedPDFs.filter(pdf => selectedPDFs.has(pdf.id))
      const selectedIds = Array.from(selectedPDFs)
      
      // 🚨 CHECK IF TOO MANY PDFs - SPLIT IF NEEDED
      if (selectedIds.length > MAX_PDFS_PER_EMAIL) {
        const emailCount = Math.ceil(selectedIds.length / MAX_PDFS_PER_EMAIL)
        const confirmed = confirm(
          `⚠️ ${selectedIds.length} PDFs sind zu viele für eine E-Mail!\n\n` +
          `Soll ich sie in ${emailCount} separate E-Mails aufteilen?\n\n` +
          `📧 Max ${MAX_PDFS_PER_EMAIL} PDFs pro E-Mail\n` +
          `📊 Das bedeutet ${emailCount} E-Mails an jeden Empfänger\n\n` +
          `Tipp: Verwenden Sie Monatsfilter für kleinere Mengen.`
        )
        
        if (!confirmed) {
          setBulkEmailLoading(false)
          return
        }
        
        // SPLIT INTO CHUNKS
        console.log(`📦 Splitting ${selectedIds.length} PDFs into ${emailCount} emails`)
        
        const emailValidation = validateEmails(emailData.email)
        if (!emailValidation.valid) {
          alert(`❌ Ungültige E-Mail-Adressen: ${emailValidation.invalidEmails.join(', ')}`)
          setBulkEmailLoading(false)
          return
        }
        
        let successfulEmails = 0
        let failedEmails = 0
        
        // Send emails in chunks
        for (let i = 0; i < selectedIds.length; i += MAX_PDFS_PER_EMAIL) {
          const chunk = selectedIds.slice(i, i + MAX_PDFS_PER_EMAIL)
          const chunkNumber = Math.floor(i / MAX_PDFS_PER_EMAIL) + 1
          
          console.log(`📧 Sending email ${chunkNumber}/${emailCount} with ${chunk.length} PDFs`)
          
          try {
            const response = await fetch('/api/invoices/bulk-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                invoiceIds: chunk,
                majstorId: majstor.id,
                recipients: emailValidation.emails,
                subject: `${emailData.subject} (Teil ${chunkNumber}/${emailCount})`,
                message: emailData.message + `\n\n📦 Teil ${chunkNumber} von ${emailCount} (${chunk.length} PDFs)`
              })
            })
            
            if (response.ok) {
              successfulEmails++
            } else {
              failedEmails++
              console.error(`Failed to send email chunk ${chunkNumber}:`, await response.text())
            }
            
            // Small delay between emails to avoid rate limiting
            if (i + MAX_PDFS_PER_EMAIL < selectedIds.length) {
              await new Promise(resolve => setTimeout(resolve, 1000))
            }
            
          } catch (chunkError) {
            console.error(`Error sending email chunk ${chunkNumber}:`, chunkError)
            failedEmails++
          }
        }
        
        // Final result
        if (successfulEmails === emailCount) {
          alert(`✅ Erfolgreich! Alle ${emailCount} E-Mails gesendet.\n\n📧 ${selectedItems.length} PDFs an ${emailValidation.emails.length} Empfänger`)
        } else {
          alert(`⚠️ Teilweise erfolgreich:\n\n✅ ${successfulEmails} E-Mails gesendet\n❌ ${failedEmails} E-Mails fehlgeschlagen`)
        }
        
        clearSelection()
        setBulkEmailModal(false)
        return
      }
      
      // 👍 NORMAL CASE - Single email
      const emailValidation = validateEmails(emailData.email)
      if (!emailValidation.valid) {
        alert(`❌ Ungültige E-Mail-Adressen: ${emailValidation.invalidEmails.join(', ')}`)
        return
      }
      
      console.log('📧 Sending single bulk email to:', emailValidation.emails)
      
      const response = await fetch('/api/invoices/bulk-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceIds: selectedIds,
          majstorId: majstor.id,
          recipients: emailValidation.emails,
          subject: emailData.subject,
          message: emailData.message
        })
      })
      
      const result = await response.json()
      
      if (response.ok) {
        alert(`✅ Erfolgreich! ${selectedItems.length} PDFs an ${emailValidation.emails.length} Empfänger gesendet.`)
        clearSelection()
        setBulkEmailModal(false)
      } else {
        throw new Error(result.error || 'Email sending failed')
      }
      
    } catch (err) {
      console.error('Bulk email error:', err)
      alert('❌ Fehler beim E-Mail Versand: ' + err.message)
    } finally {
      setBulkEmailLoading(false)
    }
  }

  // Filter change handler with smart reset
  const handleFilterChange = (newFilters) => {
    setFilters(prev => {
      // 🔥 FIX: Reset customer filter when type changes
      if (newFilters.type && newFilters.type !== prev.type) {
        return { 
          ...prev, 
          ...newFilters,
          customer: '' // Reset customer when type changes
        }
      }
      
      // 🔥 FIX: Reset customer filter when date range changes significantly  
      if (newFilters.dateRange && newFilters.dateRange !== prev.dateRange) {
        return { 
          ...prev, 
          ...newFilters,
          customer: '' // Reset customer when date changes
        }
      }
      
      return { ...prev, ...newFilters }
    })
  }

  // Apply filters when they change
  useEffect(() => {
    if (majstor?.id) {
      loadArchivedPDFs(majstor.id)
    }
  }, [filters])

  // Helper functions
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('de-DE')
  }

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B'
    const kb = bytes / 1024
    if (kb < 1024) return `${Math.round(kb)} KB`
    return `${Math.round(kb / 1024 * 10) / 10} MB`
  }

  const getDocumentTypeColor = (type) => {
    return type === 'quote' 
      ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
      : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
  }

  const getStatusColor = (status) => {
    const colors = {
      'draft': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
      'sent': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      'paid': 'bg-green-500/10 text-green-400 border-green-500/20',
      'overdue': 'bg-red-500/10 text-red-400 border-red-500/20',
      'cancelled': 'bg-slate-500/10 text-slate-400 border-slate-500/20',
      'converted': 'bg-purple-500/10 text-purple-400 border-purple-500/20'
    }
    return colors[status] || colors.draft
  }

  // 🆕 DETAIL VIEW COMPONENT
// Replace the DetailView component in pdf-archive/page.js

const DetailView = ({ invoice }) => {
  if (!invoice) return null

  const items = JSON.parse(invoice.items || '[]')
  const isQuote = invoice.type === 'quote'

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center justify-between">
        <button
          onClick={backToList}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
        >
          ← Zurück zur Liste
        </button>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => openPDFInNewTab(invoice.id)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            👁️ PDF öffnen
          </button>
          <button 
            onClick={() => downloadPDF(invoice.id)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            📥 Download
          </button>
        </div>
      </div>

      {/* Document Details Card */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h4 className="text-white font-semibold text-lg">
                {invoice.invoice_number || invoice.quote_number}
              </h4>
              <span className={`px-3 py-1 rounded-full text-sm border ${getDocumentTypeColor(invoice.type)}`}>
                {isQuote ? 'Angebot' : 'Rechnung'}
              </span>
            </div>
            <p className="text-slate-400">{invoice.customer_name}</p>
            <p className="text-slate-500 text-sm">{invoice.customer_email}</p>
            {invoice.customer_phone && (
              <p className="text-slate-500 text-sm">Tel: {invoice.customer_phone}</p>
            )}
            {invoice.customer_address && (
              <p className="text-slate-500 text-sm">{invoice.customer_address}</p>
            )}
          </div>
          <span className={`px-3 py-1 rounded-full text-sm border ${getStatusColor(invoice.status)}`}>
            {invoice.status === 'draft' && 'Entwurf'}
            {invoice.status === 'sent' && 'Gesendet'}
            {invoice.status === 'paid' && 'Bezahlt'}
            {invoice.status === 'overdue' && 'Überfällig'}
            {invoice.status === 'cancelled' && 'Storniert'}
            {invoice.status === 'converted' && 'Umgewandelt'}
          </span>
        </div>

        {/* Document Info Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-slate-400">Betrag:</span>
            <p className="text-white font-semibold">{formatCurrency(invoice.total_amount)}</p>
          </div>
          <div>
            <span className="text-slate-400">{isQuote ? 'Angebotsdatum:' : 'Rechnungsdatum:'}</span>
            <p className="text-white">{formatDate(invoice.issue_date)}</p>
          </div>
          <div>
            <span className="text-slate-400">
              {isQuote ? 'Gültig bis:' : 'Fälligkeitsdatum:'}
            </span>
            <p className="text-white">
              {formatDate(isQuote ? invoice.valid_until : invoice.due_date)}
            </p>
          </div>
          <div>
            <span className="text-slate-400">Positionen:</span>
            <p className="text-white">{items.length}</p>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
        <h5 className="text-white font-semibold mb-4">📋 Positionen</h5>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-600">
                <th className="text-left py-3 text-slate-400">Pos.</th>
                <th className="text-left py-3 text-slate-400">Beschreibung</th>
                <th className="text-right py-3 text-slate-400">Menge</th>
                <th className="text-right py-3 text-slate-400">Einzelpreis</th>
                <th className="text-right py-3 text-slate-400">Gesamtpreis</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index} className="border-b border-slate-700 last:border-b-0">
                  <td className="py-3 text-slate-300">{index + 1}</td>
                  <td className="py-3 text-white">{item.description}</td>
                  <td className="py-3 text-right text-slate-300">{item.quantity}</td>
                  <td className="py-3 text-right text-slate-300">{formatCurrency(item.price)}</td>
                  <td className="py-3 text-right text-white font-semibold">{formatCurrency(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="mt-6 border-t border-slate-600 pt-4">
          <div className="max-w-md ml-auto space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400">
                {invoice.is_kleinunternehmer ? 'Gesamtbetrag:' : 'Nettobetrag:'}
              </span>
              <span className="text-white">{formatCurrency(invoice.subtotal)}</span>
            </div>
            
            {!invoice.is_kleinunternehmer && (
              <div className="flex justify-between">
                <span className="text-slate-400">zzgl. MwSt ({invoice.tax_rate}%):</span>
                <span className="text-white">{formatCurrency(invoice.tax_amount)}</span>
              </div>
            )}
            
            {invoice.is_kleinunternehmer && (
              <div className="text-xs text-slate-500 italic">
                * Gemäß §19 UStG wird keine Umsatzsteuer berechnet
              </div>
            )}
            
            {!invoice.is_kleinunternehmer && (
              <div className="border-t border-slate-600 pt-2">
                <div className="flex justify-between font-semibold">
                  <span className="text-white">Bruttobetrag:</span>
                  <span className="text-white text-lg">{formatCurrency(invoice.total_amount)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Notes */}
      {invoice.notes && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
          <h5 className="text-white font-semibold mb-2">📝 Notizen</h5>
          <p className="text-slate-300">{invoice.notes}</p>
        </div>
      )}
    </div>
  )
}

  // Bookkeeper Settings Modal (lokalni state)
  const BookkeeperSettingsModal = () => {
    const [localSettings, setLocalSettings] = useState({
      name: bookkeeperSettings.name,
      email: bookkeeperSettings.email
    })

    useEffect(() => {
      if (bookkeeperSettings.showSettings) {
        setLocalSettings({
          name: bookkeeperSettings.name,
          email: bookkeeperSettings.email
        })
      }
    }, [bookkeeperSettings.showSettings, bookkeeperSettings.name, bookkeeperSettings.email])

    const handleSave = async () => {
      try {
        const { error } = await supabase
          .from('majstors')
          .update({ 
            bookkeeper_email: localSettings.email,
            bookkeeper_name: localSettings.name,
            updated_at: new Date().toISOString()
          })
          .eq('id', majstor.id)

        if (error) throw error
        
        setBookkeeperSettings(prev => ({
          ...prev,
          email: localSettings.email,
          name: localSettings.name,
          showSettings: false
        }))
        
        alert('✅ Buchhalter E-Mail gespeichert!')
        
      } catch (err) {
        alert('❌ Fehler beim Speichern: ' + err.message)
      }
    }

    if (!bookkeeperSettings.showSettings) return null

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-slate-800 rounded-xl max-w-md w-full p-6">
          
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-white">🔧 Buchhalter Einstellungen</h3>
            <button 
              onClick={() => setBookkeeperSettings(prev => ({ ...prev, showSettings: false }))}
              className="text-slate-400 hover:text-white text-2xl"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Buchhalter Name
              </label>
              <input
                type="text"
                value={localSettings.name}
                onChange={(e) => setLocalSettings(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white"
                placeholder="Buchhalter Name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Buchhalter E-Mail *
              </label>
              <input
                type="email"
                value={localSettings.email}
                onChange={(e) => setLocalSettings(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white"
                placeholder="buchhalter@beispiel.de"
                required
              />
            </div>
            
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
              <p className="text-blue-300 text-sm">
                💡 Diese E-Mail wird automatisch als Standard beim Bulk-Versand verwendet.
              </p>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setBookkeeperSettings(prev => ({ ...prev, showSettings: false }))}
              className="flex-1 bg-slate-600 text-white py-3 rounded-lg hover:bg-slate-700 transition-colors"
            >
              Abbrechen
            </button>
            <button
              onClick={handleSave}
              disabled={!localSettings.email}
              className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              Speichern
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Bulk Email Modal Component
  const BulkEmailModal = () => {
    const [emailData, setEmailData] = useState({
      email: bookkeeperSettings.email,
      subject: `Rechnungen ${new Date().getMonth() + 1}/${new Date().getFullYear()} - ${majstor?.business_name || majstor?.full_name}`,
      message: `Sehr geehrte Damen und Herren,\n\nanbei senden wir Ihnen unsere Rechnungen zur Buchführung.\n\nAnzahl Dokumente: ${selectedPDFs.size}\n\nMit freundlichen Grüßen`
    })

    const [emailValidation, setEmailValidation] = useState({ valid: true, emails: [], invalidEmails: [] })

    useEffect(() => {
      if (emailData.email) {
        const validation = validateEmails(emailData.email)
        setEmailValidation(validation)
      }
    }, [emailData.email])

    if (!bulkEmailModal) return null

    const selectedItems = archivedPDFs.filter(pdf => selectedPDFs.has(pdf.id))

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-slate-800 rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
          
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-white">📧 Bulk E-Mail versenden</h3>
            <button 
              onClick={() => setBulkEmailModal(false)}
              className="text-slate-400 hover:text-white text-2xl"
            >
              ✕
            </button>
          </div>

          <div className="mb-6">
            <h4 className="text-white font-medium mb-3">
              Ausgewählte Dokumente ({selectedItems.length}):
            </h4>
            
            {/* 🚨 WARNING for too many PDFs */}
            {selectedItems.length > MAX_PDFS_PER_EMAIL && (
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <span className="text-orange-400 text-xl">⚠️</span>
                  <div>
                    <h5 className="text-orange-300 font-medium mb-2">Zu viele PDFs!</h5>
                    <div className="text-orange-200 text-sm space-y-1">
                      <p>• {selectedItems.length} PDFs sind zu viele für eine E-Mail</p>
                      <p>• Werden automatisch in {Math.ceil(selectedItems.length / MAX_PDFS_PER_EMAIL)} E-Mails aufgeteilt</p>
                      <p>• Jede E-Mail max {MAX_PDFS_PER_EMAIL} PDFs (≈5-10MB)</p>
                      <p><strong>💡 Tipp:</strong> Verwenden Sie Monatsfilter für kleinere Mengen</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div className="bg-slate-900/50 rounded-lg p-4 max-h-32 overflow-y-auto">
              {selectedItems.map(item => (
                <div key={item.id} className="flex justify-between items-center text-sm mb-2 last:mb-0">
                  <span className="text-slate-300 font-medium">
                    {item.invoice_number || item.quote_number}
                  </span>
                  <span className="text-white">
                    {formatCurrency(item.total_amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={(e) => {
            e.preventDefault()
            handleBulkEmail(emailData)
          }}>
            
            <div className="space-y-4">
              
              {bookkeeperSettings.email && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-green-300 font-medium">{bookkeeperSettings.name}</p>
                      <p className="text-green-200 text-sm">{bookkeeperSettings.email}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEmailData(prev => ({ ...prev, email: bookkeeperSettings.email }))}
                      className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700"
                    >
                      Verwenden
                    </button>
                  </div>
                </div>
              )}

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-slate-300">
                    Empfänger E-Mail * 
                    <span className="text-xs text-slate-500">(mehrere durch Komma trennen)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setBookkeeperSettings(prev => ({ ...prev, showSettings: true }))}
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    ⚙️ Buchhalter einstellen
                  </button>
                </div>
                <input
                  type="text"
                  value={emailData.email}
                  onChange={(e) => setEmailData({...emailData, email: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white"
                  placeholder="email1@beispiel.de, email2@beispiel.de"
                  required
                />
                
                {emailValidation.emails.length > 0 && (
                  <div className="mt-2 text-xs">
                    <p className="text-green-400">✅ Gültige E-Mails ({emailValidation.emails.length}):</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {emailValidation.emails.map((email, index) => (
                        <span key={index} className="bg-green-500/20 text-green-300 px-2 py-1 rounded text-xs">
                          {email}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {emailValidation.invalidEmails.length > 0 && (
                  <div className="mt-2 text-xs">
                    <p className="text-red-400">❌ Ungültige E-Mails:</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {emailValidation.invalidEmails.map((email, index) => (
                        <span key={index} className="bg-red-500/20 text-red-300 px-2 py-1 rounded text-xs">
                          {email}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Betreff
                </label>
                <input
                  type="text"
                  value={emailData.subject}
                  onChange={(e) => setEmailData({...emailData, subject: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Nachricht
                </label>
                <textarea
                  value={emailData.message}
                  onChange={(e) => setEmailData({...emailData, message: e.target.value})}
                  rows={6}
                  className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setBulkEmailModal(false)}
                className="flex-1 bg-slate-600 text-white py-3 rounded-lg hover:bg-slate-700 transition-colors"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={bulkEmailLoading || !emailValidation.valid}
                className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {bulkEmailLoading ? 'Sende E-Mails...' : `${selectedItems.length} PDFs senden`}
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  // Bulk Action Bar Component
  const BulkActionBar = () => {
    if (selectedPDFs.size === 0) return null
    
    return (
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40">
        <div className="bg-slate-800 border border-slate-600 rounded-lg shadow-lg p-4">
          <div className="flex items-center gap-4">
            <div className="text-white">
              <span className="font-semibold">{selectedPDFs.size}</span> PDF{selectedPDFs.size > 1 ? 's' : ''} ausgewählt
            </div>
            
            <button 
              onClick={() => setBulkEmailModal(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm flex items-center gap-2"
            >
              ✉️ E-Mail senden
            </button>
            
            <button 
              onClick={clearSelection}
              className="text-slate-400 hover:text-white text-sm px-3 py-2"
            >
              ✕ Auswahl aufheben
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <div className="text-white text-xl">Lade PDF Archiv...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">⚠️ {error}</div>
          <button 
            onClick={loadData}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Erneut versuchen
          </button>
        </div>
      </div>
    )
  }

  // 🆕 SHOW DETAIL VIEW if selectedPDF is set
  if (selectedPDF) {
    if (detailLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <div className="text-white text-xl">Lade Details...</div>
          </div>
        </div>
      )
    }
    
    return <DetailView invoice={selectedPDF} />
  }

  // MAIN LIST VIEW
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">📂 PDF Archiv</h1>
          <p className="text-slate-400">
            Alle gespeicherte Rechnungen und Angebote mit Bulk E-Mail Funktion
          </p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex items-center text-slate-400 hover:text-white transition-colors"
        >
          ← Zurück zum Dashboard
        </Link>
      </div>

     {/* Stats - DINAMIČKA KARTICA */}
<div className="grid grid-cols-1 gap-4">
  <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 max-w-sm">
    <div className="text-2xl mb-2">
      {filters.type === 'invoice' ? '🧾' : '📋'}
    </div>
    <div className="text-white font-semibold">{archivedPDFs.length}</div>
    <div className="text-slate-400 text-sm">
      {filters.type === 'invoice' ? 'Rechnungen' : 'Angebote'} 
      {filters.dateRange === 'thisMonth' && ' (dieser Monat)'}
      {filters.dateRange === 'lastMonth' && ' (letzter Monat)'}
      {filters.dateRange === 'custom' && ` (${filters.customMonth}/${filters.customYear})`}
      {filters.customer && ` - ${filters.customer}`}
    </div>
  </div>
</div>

      {/* Filters */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Typ</label>
            <select
              value={filters.type}
              onChange={(e) => handleFilterChange({ type: e.target.value })}
              className="bg-slate-900/50 border border-slate-600 rounded text-white px-3 py-1 text-sm"
            >
              <option value="invoice">Rechnungen</option>
              <option value="quote">Angebote</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">Zeitraum</label>
            <select
              value={filters.dateRange}
              onChange={(e) => handleFilterChange({ dateRange: e.target.value })}
              className="bg-slate-900/50 border border-slate-600 rounded text-white px-3 py-1 text-sm"
            >
              <option value="thisMonth">Dieser Monat</option>
              <option value="lastMonth">Letzter Monat</option>
              <option value="custom">Monat auswählen</option>
            </select>
          </div>

          {/* Custom Month selector */}
          {filters.dateRange === 'custom' && (
            <>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Monat</label>
                <select
                  value={filters.customMonth}
                  onChange={(e) => handleFilterChange({ customMonth: parseInt(e.target.value) })}
                  className="bg-slate-900/50 border border-slate-600 rounded text-white px-3 py-1 text-sm"
                >
                  <option value="1">Januar</option>
                  <option value="2">Februar</option>
                  <option value="3">März</option>
                  <option value="4">April</option>
                  <option value="5">Mai</option>
                  <option value="6">Juni</option>
                  <option value="7">Juli</option>
                  <option value="8">August</option>
                  <option value="9">September</option>
                  <option value="10">Oktober</option>
                  <option value="11">November</option>
                  <option value="12">Dezember</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Jahr</label>
                <select
                  value={filters.customYear}
                  onChange={(e) => handleFilterChange({ customYear: parseInt(e.target.value) })}
                  className="bg-slate-900/50 border border-slate-600 rounded text-white px-3 py-1 text-sm"
                >
                  {Array.from({ length: 6 }, (_, i) => {
                    const year = new Date().getFullYear() - i
                    return (
                      <option key={year} value={year}>{year}</option>
                    )
                  })}
                </select>
              </div>
            </>
          )}

          <div>
            <label className="block text-sm text-slate-400 mb-1">Kunde</label>
            <select
              value={filters.customer}
              onChange={(e) => handleFilterChange({ customer: e.target.value })}
              className="bg-slate-900/50 border border-slate-600 rounded text-white px-3 py-1 text-sm w-48"
            >
              <option value="">Alle Kunden</option>
              {getCustomersWithCounts().map(customer => (
                <option key={customer.name} value={customer.name}>
                  {customer.name} ({customer.count})
                </option>
              ))}
            </select>
          </div>

          {/* Bulk Select All */}
          {archivedPDFs.length > 0 && (
            <div className="ml-auto">
              <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedPDFs.size > 0 && selectedPDFs.size === archivedPDFs.length}
                  onChange={toggleAllPDFs}
                  className="w-4 h-4 text-green-600 bg-slate-700 border-slate-500 rounded"
                />
                Alle auswählen ({archivedPDFs.length})
              </label>
            </div>
          )}
        </div>
      </div>

      {/* PDF List */}
      {archivedPDFs.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <div className="text-4xl mb-4">📄</div>
          <p>Keine PDFs im Archiv gefunden</p>
          <p className="text-sm mt-2">PDFs werden automatisch gespeichert wenn Sie Rechnungen oder Angebote erstellen</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {archivedPDFs.map((pdf) => (
            <div key={pdf.id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
              <div className="flex items-center gap-4">
                
                {/* Selection Checkbox */}
                <input
                  type="checkbox"
                  checked={selectedPDFs.has(pdf.id)}
                  onChange={() => togglePDFSelection(pdf.id)}
                  className="w-4 h-4 text-green-600 bg-slate-700 border-slate-500 rounded focus:ring-green-500"
                />

                {/* Document Number & Type */}
                <div className="flex items-center gap-2">
                  <h4 className="text-white font-semibold">
                    {pdf.invoice_number || pdf.quote_number}
                  </h4>
                  <span className={`px-2 py-1 rounded text-xs ${getDocumentTypeColor(pdf.type)}`}>
                    {pdf.type === 'quote' ? 'Angebot' : 'Rechnung'}
                  </span>
                </div>

                {/* Customer - only if space allows */}
                <div className="hidden sm:block text-slate-400 flex-1">
                  {pdf.customer_name}
                </div>

                {/* Amount */}
                <div className="text-white font-semibold">
                  {formatCurrency(pdf.total_amount)}
                </div>

                {/* Actions - 🆕 CHANGED: showDetails instead of openPDF */}
                <button 
                  onClick={() => showDetails(pdf.id)}
                  className="bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 transition-colors"
                >
                  👁️ Ansehen
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <BulkActionBar />
      <BulkEmailModal />
      <BookkeeperSettingsModal />
    </div>
  )
}