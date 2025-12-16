// app/dashboard/invoices/page.js - COMPLETE FILE WITH OVERDUE FILTER
'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import InvoiceCreator from '@/app/components/InvoiceCreator'
import EmailInvoiceModal from '@/app/components/EmailInvoiceModal'
import LogoUpload from '@/app/components/LogoUpload'


function DashboardPageContent() {

  
  

  const [activeTab, setActiveTab] = useState('quotes')
  const [quotes, setQuotes] = useState([])
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [majstor, setMajstor] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createType, setCreateType] = useState('quote')
  const [quoteInvoiceMap, setQuoteInvoiceMap] = useState({})
  
  // Hard Reset states
  const [showHardResetModal, setShowHardResetModal] = useState(false)
  const [hardResetLoading, setHardResetLoading] = useState(false)
  
  const [editingItem, setEditingItem] = useState(null)
  const [isEditMode, setIsEditMode] = useState(false)

  const [pendingInvoiceCreation, setPendingInvoiceCreation] = useState(false)
  const [pendingInvoiceType, setPendingInvoiceType] = useState('quote')

  const [showEmailModal, setShowEmailModal] = useState(false)
  const [emailItem, setEmailItem] = useState(null)

  // 🔥 OVERDUE FILTER
  const [showOnlyOverdue, setShowOnlyOverdue] = useState(false)

  //početak
  const [pdfLoading, setPdfLoading] = useState(false)

  const [settingsData, setSettingsData] = useState({
    is_kleinunternehmer: false,
    tax_number: '',
    vat_id: '',
    default_tax_rate: 19.00,
    iban: '',
    bic: '',
    bank_name: '',
    payment_terms_days: 14,
    invoice_footer: '',
    full_name: '',
    business_name: '',
    phone: '',
    city: '',
    address: ''
  })
  const [settingsLoading, setSettingsLoading] = useState(false)
  const [settingsError, setSettingsError] = useState('')
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const fromCustomers = searchParams.get('from') === 'customers'  // 🔥 DODAJ OVO
  const fromInquiries = searchParams.get('from') === 'inquiries' // 🔥 DODAJ OVO

  useEffect(() => {
    const tabFromUrl = searchParams.get('tab')
    const fromInvoice = searchParams.get('from')
    
    if (tabFromUrl && ['quotes', 'invoices', 'settings'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl)
      console.log('Setting active tab from URL:', tabFromUrl)
    }

    if (fromInvoice === 'invoice-creation') {
      setPendingInvoiceCreation(true)
      setPendingInvoiceType(searchParams.get('type') || 'quote')
      console.log('User came from invoice creation, will redirect back after settings', {
        type: searchParams.get('type'),
        pending: true
      })
    }
  }, [searchParams])
  // 🔥 NOVO: Auto-open invoice/quote from URL when coming from customers page
/*useEffect(() => {
  const viewId = searchParams.get('view')
  const fromPage = searchParams.get('from')
  
  console.log('🔍 URL params check:', { viewId, fromPage, invoicesCount: invoices.length })
  
  // Samo ako ima viewId i invoices su učitani
  if (viewId && invoices.length > 0) {
    // Pronađi invoice/quote koji treba otvoriti
    const invoiceToView = invoices.find(inv => inv.id === viewId)
    
    if (invoiceToView) {
      console.log('📄 Auto-opening document from URL:', {
        id: viewId,
        type: invoiceToView.type,
        number: invoiceToView.invoice_number || invoiceToView.quote_number,
        from: fromPage
      })
      
      // Postavi ispravan tab (invoices ili quotes)
      const correctTab = invoiceToView.type === 'invoice' ? 'invoices' : 'quotes'
      if (activeTab !== correctTab) {
        console.log('📑 Switching tab to:', correctTab)
        setActiveTab(correctTab)
      }
      
      // Otvori dokument u view/edit mode
      setEditingItem(invoiceToView)
      setIsEditMode(true)
      setCreateType(invoiceToView.type)
      setShowCreateModal(true)
      
      console.log('✅ Document opened successfully')
      
      // 🧹 Clean up URL - ukloni 'view' parametar (ali ostavi 'from' za back button)
      setTimeout(() => {
        const url = new URL(window.location.href)
        url.searchParams.delete('view')
        window.history.replaceState({}, '', url.toString())
      }, 100)
    } else {
      console.warn('⚠️ Invoice/Quote not found in list:', viewId)
    }
  }
}, [searchParams, invoices, activeTab])*/

  useEffect(() => {
    if (pendingInvoiceCreation && majstor && isBusinessDataComplete(majstor)) {
      console.log('Business data now complete, redirecting back to invoice creation')
      
      setPendingInvoiceCreation(false)
      
      setActiveTab(pendingInvoiceType === 'invoice' ? 'invoices' : 'quotes')
      setCreateType(pendingInvoiceType)
      setIsEditMode(false)
      setEditingItem(null)
      setShowCreateModal(true)
      
      const url = new URL(window.location.href)
      url.searchParams.delete('from')
      url.searchParams.delete('type')
      url.searchParams.set('tab', pendingInvoiceType === 'invoice' ? 'invoices' : 'quotes')
      window.history.replaceState({}, '', url.toString())
      
      console.log('Opened invoice creation modal automatically')
    }
  }, [majstor, pendingInvoiceCreation, pendingInvoiceType])

  const isBusinessDataComplete = (majstorData) => {
    if (!majstorData) return false
    
    const requiredFields = ['full_name', 'email']
    const recommendedFields = ['business_name', 'phone', 'city']
    
    const isRequiredComplete = requiredFields.every(field => 
      majstorData[field] && majstorData[field].trim().length > 0
    )
    
    const validRecommendedCount = recommendedFields.filter(field => 
      majstorData[field] && majstorData[field].trim().length > 0
    ).length
    
    const isRecommendedSufficient = validRecommendedCount >= 2
    const result = isRequiredComplete && isRecommendedSufficient
    
    console.log('Business data check in invoices page:', {
      requiredFields: requiredFields.map(f => ({ [f]: majstorData[f] || 'MISSING' })),
      validRecommendedCount,
      isRequiredComplete,
      isRecommendedSufficient,
      finalResult: result
    })
    
    return result
  }

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      if (urlParams.has('customerName')) {
        setCreateType('invoice')
        setIsEditMode(false)
        setEditingItem({
          customer_name: urlParams.get('customerName'),
          customer_email: urlParams.get('customerEmail'),
          customer_phone: urlParams.get('customerPhone'),
          customer_address: urlParams.get('customerAddress')
        })
        setShowCreateModal(true)
        
        window.history.replaceState({}, '', '/dashboard/invoices')
      }
    }
  }, [])

  useEffect(() => {
    loadMajstorAndData()
  }, [])

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
      
      setSettingsData({
        is_kleinunternehmer: majstorData.is_kleinunternehmer || false,
        tax_number: majstorData.tax_number || '',
        vat_id: majstorData.vat_id || '',
        default_tax_rate: majstorData.default_tax_rate || 19.00,
        iban: majstorData.iban || '',
        bic: majstorData.bic || '',
        bank_name: majstorData.bank_name || '',
        payment_terms_days: majstorData.payment_terms_days || 14,
        invoice_footer: majstorData.invoice_footer || '',
        full_name: (majstorData.business_name || (majstorData.full_name && majstorData.full_name !== majstorData.email?.split('@')[0])) 
          ? majstorData.full_name || '' 
          : '',
        business_name: majstorData.business_name || '',
        phone: majstorData.phone || '',
        city: majstorData.city || '',
        address: majstorData.address || ''
      })
      
      await loadInvoicesData(majstorData.id)

    } catch (err) {
      console.error('Error loading data:', err)
      setError('Fehler beim Laden der Daten')
    } finally {
      setLoading(false)
    }
  }

  const loadInvoicesData = async (majstorId) => {
    try {
      const { data: quotesData, error: quotesError } = await supabase
        .from('invoices')
        .select('*')
        .eq('majstor_id', majstorId)
        .eq('type', 'quote')
        .neq('status', 'dummy')
        .order('created_at', { ascending: false })

      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select('*')
        .eq('majstor_id', majstorId)
        .eq('type', 'invoice')
        .neq('status', 'dummy')
        .order('created_at', { ascending: false })

      if (!quotesError) setQuotes(quotesData || [])
      if (!invoicesError) setInvoices(invoicesData || [])
      
      buildQuoteInvoiceMap(quotesData || [], invoicesData || [])

    } catch (err) {
      console.error('Error loading invoices:', err)
    }
  }

  // 📍 DODAJ POSLE loadInvoicesData funkcije (oko linije 230-250)

 

 const handlePDFView = async (document) => {
  setPdfLoading(true)
  
  try {
    console.log('📄 Loading PDF from storage:', document.id)
    
    // 1️⃣ Get invoice data
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('id, pdf_storage_path, invoice_number, quote_number, type')
      .eq('id', document.id)
      .single()

    if (invoiceError || !invoice) {
      throw new Error('Invoice not found')
    }

    if (!invoice.pdf_storage_path) {
      throw new Error('PDF not generated yet')
    }

    console.log('📂 PDF path:', invoice.pdf_storage_path)

    // 2️⃣ Download from Storage (while spinner shows!)
    const { data: pdfData, error: downloadError } = await supabase.storage
      .from('invoice-pdfs')
      .download(invoice.pdf_storage_path)

    if (downloadError || !pdfData) {
      throw new Error('PDF download failed: ' + downloadError?.message)
    }

    console.log('✅ PDF loaded, size:', pdfData.size)

    // 3️⃣ Create blob and open (SADA tek otvara tab!)
    const blob = new Blob([pdfData], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    
    const newWindow = window.open(url, '_blank')
    
    if (newWindow) {
      newWindow.onload = () => URL.revokeObjectURL(url)
    } else {
      URL.revokeObjectURL(url)
      alert('Popup wurde blockiert. Bitte erlauben Sie Popups.')
    }
    
    console.log('✅ PDF opened in new tab')

  } catch (error) {
    console.error('❌ PDF viewing error:', error)
    alert('Fehler beim Laden der PDF: ' + error.message)
  } finally {
    setPdfLoading(false)
  }
}

  const buildQuoteInvoiceMap = (quotesData, invoicesData) => {
    const map = {}
    
    invoicesData.forEach(invoice => {
      if (invoice.converted_from_quote_id) {
        map[invoice.converted_from_quote_id] = invoice.id
      }
    })
    
    setQuoteInvoiceMap(map)
  }

  const quoteHasInvoice = (quoteId) => {
    return quoteInvoiceMap.hasOwnProperty(quoteId)
  }

  const handleEditClick = (item) => {
    console.log('Editing item:', item)
    setEditingItem(item)
    setCreateType(item.type)
    setIsEditMode(true)
    setShowCreateModal(true)
  }

  const handleCreateSuccess = (newData) => {
    console.log('Operation successful:', newData)
    
    setEditingItem(null)
    setIsEditMode(false)
    
    if (majstor?.id) {
      loadInvoicesData(majstor.id)
    }
  }

  const handleModalClose = () => {
    setShowCreateModal(false)
    setEditingItem(null)
    setIsEditMode(false)
  }

  const handleEmailClick = (item) => {
    console.log('Opening email modal for:', item.invoice_number || item.quote_number)
    setEmailItem(item)
    setShowEmailModal(true)
  }

  const handleEmailSuccess = (result) => {
    console.log('Email sent successfully:', result)
    setShowEmailModal(false)
    setEmailItem(null)
    
  //  if (majstor?.id) {
   //   loadInvoicesData(majstor.id)
   // }
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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('de-DE')
  }

  const isInvoiceOverdue = (invoice) => {
    if (invoice.status !== 'sent' && invoice.status !== 'draft') {
      return false
    }
    
    if (!invoice.due_date) {
      return false
    }
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const dueDate = new Date(invoice.due_date)
    dueDate.setHours(0, 0, 0, 0)
    
    const isOverdue = today.getTime() > dueDate.getTime()
    
    return isOverdue
  }

  const getDaysOverdue = (invoice) => {
    if (!isInvoiceOverdue(invoice)) return 0
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const dueDate = new Date(invoice.due_date)
    dueDate.setHours(0, 0, 0, 0)
    
    const diffTime = today.getTime() - dueDate.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    
    return Math.max(0, diffDays)
  }

  const convertQuoteToInvoice = async (quote) => {
    try {
      console.log('Converting quote to invoice:', quote.quote_number)

      const year = new Date().getFullYear()
      
      console.log('🔍 Searching for next available invoice number for year:', year)
      
      const { data: existingInvoices, error: searchError } = await supabase
        .from('invoices')
        .select('invoice_number')
        .eq('majstor_id', majstor.id)
        .eq('type', 'invoice')
        .like('invoice_number', `RE-${year}-%`)
        .order('invoice_number', { ascending: false })

      if (searchError) {
        console.error('Error searching existing invoices:', searchError)
        throw new Error('Fehler beim Suchen bestehender Rechnungen')
      }

      let nextNumber = 1

      if (existingInvoices && existingInvoices.length > 0) {
        console.log('📊 Found existing invoices:', existingInvoices.map(inv => inv.invoice_number))
        
        const numbers = existingInvoices
          .map(invoice => {
            const match = invoice.invoice_number.match(/RE-\d{4}-(\d+)/)
            return match ? parseInt(match[1], 10) : 0
          })
          .filter(num => !isNaN(num) && num > 0)
        
        console.log('🔢 Extracted numbers from existing invoices:', numbers)
        
        if (numbers.length > 0) {
          const maxNumber = Math.max(...numbers)
          nextNumber = maxNumber + 1
          console.log('📈 Max existing number:', maxNumber, '→ Next number:', nextNumber)
        }
      } else {
        console.log('🆕 No existing invoices found, starting with 001')
      }

      const finalInvoiceNumber = `RE-${year}-${nextNumber.toString().padStart(4, '0')}`
      
      console.log('✅ Generated sequential invoice number:', finalInvoiceNumber)

      const subtotal = parseFloat(quote.subtotal) || 0
      const isKleinunternehmer = settingsData?.is_kleinunternehmer || false
      const taxRate = isKleinunternehmer ? 0 : (parseFloat(settingsData?.default_tax_rate) || 19.0)
      const taxAmount = isKleinunternehmer ? 0 : Math.round(subtotal * taxRate) / 100
      const totalAmount = subtotal + taxAmount

      const now = new Date()
      const issueDate = now.toISOString().split('T')[0]
      const dueDate = new Date(now)
      dueDate.setDate(dueDate.getDate() + (parseInt(settingsData?.payment_terms_days) || 14))
      const dueDateString = dueDate.toISOString().split('T')[0]

      const invoiceData = {
        majstor_id: quote.majstor_id,
        type: 'invoice',
        invoice_number: finalInvoiceNumber,
        customer_name: quote.customer_name,
        customer_email: quote.customer_email,
        customer_phone: quote.customer_phone || null,
        customer_address: quote.customer_address || null,
        customer_tax_number: quote.customer_tax_number || null, // ✅ FIX: Copy PIB from quote
        items: quote.items,
        subtotal: subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        status: 'draft',
        issue_date: issueDate,
        due_date: dueDateString,
        payment_terms_days: parseInt(settingsData?.payment_terms_days) || 14,
        notes: quote.notes || null,
        is_kleinunternehmer: isKleinunternehmer,
        converted_from_quote_id: quote.id,
        company_name: majstor?.business_name || majstor?.full_name || null,
        company_address: majstor?.address || null,
        tax_number: settingsData?.tax_number || null,
        vat_id: settingsData?.vat_id || null,
        iban: settingsData?.iban || null,
        bic: settingsData?.bic || null,
        bank_name: settingsData?.bank_name || null,
        created_at: now.toISOString(),
        updated_at: now.toISOString()
      }

      console.log('💾 Inserting invoice with data:', {
        invoice_number: finalInvoiceNumber,
        customer: invoiceData.customer_name,
        total: totalAmount,
        tax_rate: taxRate + '%',
        kleinunternehmer: isKleinunternehmer,
        sequence_number: nextNumber
      })

      const { data: newInvoice, error: insertError } = await supabase
        .from('invoices')
        .insert(invoiceData)
        .select(`
          id,
          invoice_number,
          customer_name,
          total_amount,
          status,
          created_at
        `)
        .single()

      if (insertError) {
        console.error('Database insert error:', insertError)
        throw new Error(`Database error: ${insertError.message}`)
      }

      if (!newInvoice) {
        throw new Error('No invoice data returned from database')
      }

   console.log('✅ Invoice successfully created:', newInvoice)

// ✅ DODAJ OVDE - EAGER PDF GENERATION
console.log('📄 Triggering background PDF generation for converted invoice:', newInvoice.id)

fetch(`/api/invoices/${newInvoice.id}/pdf`)
  .then(response => {
    if (response.ok) {
      console.log('✅ Background PDF generated successfully for converted invoice')
    } else {
      console.warn('⚠️ Background PDF generation failed (non-critical)')
    }
  })
  .catch(error => {
    console.warn('⚠️ Background PDF generation error (non-critical):', error.message)
  })

const { error: quoteUpdateError } = await supabase
  .from('invoices')
  .update({ 
    status: 'converted',
    updated_at: now.toISOString()
  })
  .eq('id', quote.id)

if (quoteUpdateError) {
  console.warn('Could not update quote status:', quoteUpdateError.message)
} else {
  console.log('🔄 Quote status updated to converted')
}

console.log('🔄 Refreshing invoices data...')
      
      if (majstor?.id) {
        await loadInvoicesData(majstor.id)
      }

      setActiveTab('invoices')
      
      const successMessage = [
        `✅ Erfolgreich umgewandelt!`,
        ``,
        `📄 Angebot: ${quote.quote_number}`,
        `🧾 Rechnung: ${newInvoice.invoice_number}`,
        ``,
        `👤 Kunde: ${newInvoice.customer_name}`,
        `💰 Betrag: ${formatCurrency(newInvoice.total_amount)}`,
        `📊 Status: ${newInvoice.status}`,
        ``,
        `🔢 Automatische Nummerierung: ${nextNumber}. Rechnung für ${year}`
      ].join('\n')

      alert(successMessage)

      return newInvoice

    } catch (error) {
      console.error('❌ Conversion failed with error:', error)
      
      let userMessage = 'Conversion failed'
      let technicalDetails = error.message || 'Unknown error'
      
      if (error.message?.includes('duplicate key')) {
        userMessage = 'Rechnungsnummer bereits vergeben'
        technicalDetails = 'Database constraint violation'
      } else if (error.message?.includes('permission denied') || error.message?.includes('RLS')) {
        userMessage = 'Keine Berechtigung für diese Aktion'
        technicalDetails = 'Row Level Security or permissions issue'
      } else if (error.message?.includes('connection') || error.message?.includes('network')) {
        userMessage = 'Netzwerkfehler'
        technicalDetails = 'Database connection failed'
      } else if (error.message?.includes('validation') || error.message?.includes('invalid')) {
        userMessage = 'Ungültige Daten'
        technicalDetails = 'Data validation failed'
      }

      const errorMessage = [
        `❌ ${userMessage}`,
        ``,
        `📄 Angebot: ${quote.quote_number}`,
        `👤 Kunde: ${quote.customer_name}`,
        ``,
        `🔧 Technische Details:`,
        technicalDetails,
        ``,
        `🔄 Bitte versuchen Sie es erneut oder kontaktieren Sie den Support.`
      ].join('\n')

      alert(errorMessage)
      
      throw error
    }
  }

  const handleDeleteInvoice = async (invoice) => {
    const isQuote = invoice.type === 'quote'
    const documentType = isQuote ? 'Angebot' : 'Rechnung'
    const documentNumber = isQuote ? invoice.quote_number : invoice.invoice_number
    
    if (isQuote && quoteHasInvoice(invoice.id)) {
      alert('Dieses Angebot kann nicht gelöscht werden da bereits eine Rechnung daraus erstellt wurde.\n\nLöschen Sie zuerst die Rechnung.')
      return
    }
    
    let linkedQuote = null
    if (!isQuote && invoice.converted_from_quote_id) {
      try {
        const { data } = await supabase
          .from('invoices')
          .select('*')
          .eq('id', invoice.converted_from_quote_id)
          .single()
        
        linkedQuote = data
      } catch (err) {
        console.log('No linked quote found')
      }
    }

    let confirmMessage = `Möchten Sie die ${documentType} ${documentNumber} wirklich löschen?\n\n`
    
    if (linkedQuote) {
      confirmMessage += `Diese Rechnung wurde aus dem Angebot ${linkedQuote.quote_number} erstellt.\n\n`
    }
    
    confirmMessage += `Diese Aktion kann NICHT rückgängig gemacht werden!\n\n`
    confirmMessage += `Geben Sie zur Bestätigung "${documentNumber}" ein:`

    const userInput = prompt(confirmMessage)
    
    if (userInput !== documentNumber) {
      if (userInput !== null) {
        alert('Bestätigung fehlgeschlagen. Löschen abgebrochen.')
      }
      return
    }

    let deleteQuoteToo = false
    if (linkedQuote) {
      deleteQuoteToo = confirm(
        `Soll das zugehörige Angebot ${linkedQuote.quote_number} auch gelöscht werden?\n\n` +
        `OK = Beide löschen\nAbbrechen = Nur Rechnung löschen`
      )
    }

    try {
      const { error: mainError } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoice.id)
      
      if (mainError) throw mainError

      let deletedCount = 1
      let deletedDocs = [documentNumber]

      if (deleteQuoteToo && linkedQuote) {
        const { error: quoteError } = await supabase
          .from('invoices')
          .delete()
          .eq('id', linkedQuote.id)
        
        if (!quoteError) {
          deletedCount = 2
          deletedDocs.push(linkedQuote.quote_number)
        }
      }
      
      if (deletedCount === 1) {
        alert(`${documentType} ${documentNumber} wurde gelöscht.`)
      } else {
        alert(`${deletedCount} Dokumente wurden gelöscht: ${deletedDocs.join(', ')}`)
      }
      
      await loadInvoicesData(majstor.id)
      
    } catch (err) {
      console.error('Error deleting invoice:', err)
      alert('Fehler beim Löschen: ' + err.message)
    }
  }

  const handleMarkAsPaid = async (invoice) => {
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ 
          status: 'paid', 
          paid_date: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString()
        })
        .eq('id', invoice.id)
      
      if (error) throw error
      
      alert(`Rechnung ${invoice.invoice_number} wurde als bezahlt markiert.`)
      await loadInvoicesData(majstor.id)
      
    } catch (err) {
      console.error('Error marking as paid:', err)
      alert('Fehler: ' + err.message)
    }
  }

  const handleUndoPaid = async (invoice) => {
    const confirmed = confirm(
      `Möchten Sie die Bezahlung der Rechnung ${invoice.invoice_number} wirklich rückgängig machen?\n\n` +
      `Status wird von "Bezahlt" auf "Gesendet" geändert.`
    )
    
    if (!confirmed) return

    try {
      const { error } = await supabase
        .from('invoices')
        .update({ 
          status: 'sent', 
          paid_date: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', invoice.id)
      
      if (error) throw error
      
      alert(`Rechnung ${invoice.invoice_number} wurde als "Gesendet" markiert.`)
      await loadInvoicesData(majstor.id)
      
    } catch (err) {
      console.error('Error undoing paid status:', err)
      alert('Fehler: ' + err.message)
    }
  }

  const handleSettingsChange = (e) => {
    const { name, value, type, checked } = e.target
    setSettingsData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

// 🔥 HardResetModal - COMPLETE WITH MINIMAL APPROACH
const HardResetModal = () => {
  const [resetData, setResetData] = useState({
    nextQuoteNumber: '',
    nextInvoiceNumber: '',
    confirmText: ''
  })

  const totalDocuments = quotes.length + invoices.length
  const currentYear = new Date().getFullYear()

  const handleNumberInput = (field, value) => {
    const numericValue = value.replace(/[^0-9]/g, '')
    setResetData(prev => ({ ...prev, [field]: numericValue }))
  }

  const getActualNumber = (value) => {
    if (value === '' || value === '0') return 1
    return parseInt(value, 10)
  }

  const handleHardReset = async () => {
    if (resetData.confirmText !== 'LÖSCHEN') {
      alert('❌ Bitte geben Sie "LÖSCHEN" ein um zu bestätigen')
      return
    }

    const actualQuoteNumber = getActualNumber(resetData.nextQuoteNumber)
    const actualInvoiceNumber = getActualNumber(resetData.nextInvoiceNumber)

    const finalConfirm = confirm(
      `⚠️ LETZTE WARNUNG!\n\n` +
      `Sie sind dabei ${totalDocuments} Dokumente unwiderruflich zu löschen.\n\n` +
      `Was wird gelöscht:\n` +
      `• ${quotes.length} Angebote\n` +
      `• ${invoices.length} Rechnungen\n` +
      `• Alle zugehörigen PDF-Dateien\n\n` +
      `Neue Nummerierung:\n` +
      `• Angebote ab: AN-${currentYear}-${String(actualQuoteNumber).padStart(3, '0')}\n` +
      `• Rechnungen ab: RE-${currentYear}-${String(actualInvoiceNumber).padStart(3, '0')}\n\n` +
      `Diese Aktion kann NICHT rückgängig gemacht werden!\n\n` +
      `Wirklich fortfahren?`
    )

    if (!finalConfirm) return

    try {
      setHardResetLoading(true)

      console.log('🔥 Starting hard reset...')

      const { data: allInvoices, error: fetchError } = await supabase
        .from('invoices')
        .select('id, pdf_storage_path, type, invoice_number, quote_number, status')
        .eq('majstor_id', majstor.id)

      if (fetchError) throw fetchError

      console.log(`📋 Found ${allInvoices.length} total invoices`)

      const pdfPaths = allInvoices
        .filter(inv => inv.status !== 'dummy')
        .map(inv => inv.pdf_storage_path)
        .filter(path => path)

      if (pdfPaths.length > 0) {
        console.log(`🗑️ Deleting ${pdfPaths.length} PDFs...`)
        const { error: storageError } = await supabase.storage
          .from('invoice-pdfs')
          .remove(pdfPaths)

        if (storageError) {
          console.warn('⚠️ Some PDFs could not be deleted:', storageError)
        } else {
          console.log('✅ PDFs deleted')
        }
      }

      console.log('🗑️ Deleting all invoices...')
      const { error: deleteError } = await supabase
        .from('invoices')
        .delete()
        .eq('majstor_id', majstor.id)

      if (deleteError) throw deleteError
      console.log('✅ All invoices deleted')

      const dummyQuoteNumber = actualQuoteNumber - 1
      const dummyInvoiceNumber = actualInvoiceNumber - 1
      const now = new Date().toISOString()
      const today = now.split('T')[0]

      if (actualQuoteNumber > 1) {
        console.log(`📝 Creating dummy quote: AN-${currentYear}-${String(dummyQuoteNumber).padStart(3, '0')}`)
        
        const { error: quoteError } = await supabase
          .from('invoices')
          .insert({
            majstor_id: majstor.id,
            type: 'quote',
            quote_number: `AN-${currentYear}-${String(dummyQuoteNumber).padStart(3, '0')}`,
            invoice_number: null,
            customer_name: 'DUMMY_ENTRY_FOR_NUMBERING',
            customer_email: 'dummy@internal.system',
            customer_phone: null,
            customer_address: null,
            items: JSON.stringify([{ description: 'Dummy', quantity: 1, price: 0, total: 0 }]),
            subtotal: 0,
            tax_rate: 0,
            tax_amount: 0,
            total_amount: 0,
            status: 'dummy',
            issue_date: today,
            valid_until: today,
            due_date: today,
            payment_terms_days: 14,
            notes: null,
            is_kleinunternehmer: false,
            converted_from_quote_id: null,
            created_at: now,
            updated_at: now
          })
        
        if (quoteError) throw quoteError
        console.log(`✅ Dummy quote created`)
      }

      if (actualInvoiceNumber > 1) {
        console.log(`📝 Creating dummy invoice: RE-${currentYear}-${String(dummyInvoiceNumber).padStart(3, '0')}`)
        
        const { error: invoiceError } = await supabase
          .from('invoices')
          .insert({
            majstor_id: majstor.id,
            type: 'invoice',
            invoice_number: `RE-${currentYear}-${String(dummyInvoiceNumber).padStart(3, '0')}`,
            quote_number: null,
            customer_name: 'DUMMY_ENTRY_FOR_NUMBERING',
            customer_email: 'dummy@internal.system',
            customer_phone: null,
            customer_address: null,
            items: JSON.stringify([{ description: 'Dummy', quantity: 1, price: 0, total: 0 }]),
            subtotal: 0,
            tax_rate: 0,
            tax_amount: 0,
            total_amount: 0,
            status: 'dummy',
            issue_date: today,
            due_date: today,
            valid_until: null,
            payment_terms_days: 14,
            notes: null,
            is_kleinunternehmer: false,
            converted_from_quote_id: null,
            created_at: now,
            updated_at: now
          })
        
        if (invoiceError) throw invoiceError
        console.log(`✅ Dummy invoice created`)
      }

      const successMessage = [
        '✅ Neustart erfolgreich!',
        '',
        `📊 Gelöscht: ${allInvoices.filter(i => i.status !== 'dummy').length} Dokumente`,
        '',
        `🔢 Neue Nummerierung:`,
        `• AN-${currentYear}-${String(actualQuoteNumber).padStart(3, '0')}`,
        `• RE-${currentYear}-${String(actualInvoiceNumber).padStart(3, '0')}`,
      ].join('\n')

      alert(successMessage)
      setShowHardResetModal(false)

      setTimeout(() => loadMajstorAndData(), 500)

    } catch (error) {
      console.error('❌ Reset failed:', error)
      alert('❌ Fehler beim Neustart:\n\n' + (error.message || 'Unbekannter Fehler'))
    } finally {
      setHardResetLoading(false)
    }
  }

  if (!showHardResetModal) return null

  const previewQuoteNumber = getActualNumber(resetData.nextQuoteNumber)
  const previewInvoiceNumber = getActualNumber(resetData.nextInvoiceNumber)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
      <div className="bg-slate-800 rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center text-2xl">
            🔄
          </div>
          <div>
            <h3 className="text-xl font-semibold text-white">
              Neustart - Alles löschen
            </h3>
            <p className="text-slate-400 text-sm">
              Neue Nummerierung ab Wunschnummer
            </p>
          </div>
        </div>

        <div className="bg-slate-900/50 rounded-lg p-4 mb-4">
          <h4 className="text-white font-medium mb-3">📊 Aktueller Stand</h4>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-slate-400 text-xs mb-1">Angebote</p>
              <p className="text-white font-bold text-xl">{quotes.length}</p>
            </div>
            <div className="text-center">
              <p className="text-slate-400 text-xs mb-1">Rechnungen</p>
              <p className="text-white font-bold text-xl">{invoices.length}</p>
            </div>
            <div className="text-center">
              <p className="text-slate-400 text-xs mb-1">Gesamt</p>
              <p className="text-white font-bold text-xl">{totalDocuments}</p>
            </div>
          </div>
        </div>

        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <span className="text-red-400 text-xl">⚠️</span>
            <div>
              <h5 className="text-red-300 font-medium mb-2">
                Folgendes wird unwiderruflich gelöscht:
              </h5>
              <ul className="text-red-200 text-sm space-y-1">
                <li>❌ Alle {quotes.length} Angebote</li>
                <li>❌ Alle {invoices.length} Rechnungen</li>
                <li>❌ Alle PDF-Dateien</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mb-4">
            <p className="text-blue-300 text-sm">
              💡 Leer lassen = Startet bei 001
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Nächste Angebotsnummer
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={resetData.nextQuoteNumber}
              onChange={(e) => handleNumberInput('nextQuoteNumber', e.target.value)}
              onFocus={(e) => e.target.select()}
              placeholder="1"
              className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white text-lg font-mono placeholder:text-slate-600"
              disabled={hardResetLoading}
            />
            <div className="mt-2 bg-slate-900/50 rounded p-2">
              <p className="text-xs text-slate-400">Vorschau:</p>
              <p className="text-green-400 font-mono text-sm">
                AN-{currentYear}-{String(previewQuoteNumber).padStart(3, '0')}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Nächste Rechnungsnummer
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={resetData.nextInvoiceNumber}
              onChange={(e) => handleNumberInput('nextInvoiceNumber', e.target.value)}
              onFocus={(e) => e.target.select()}
              placeholder="1"
              className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white text-lg font-mono placeholder:text-slate-600"
              disabled={hardResetLoading}
            />
            <div className="mt-2 bg-slate-900/50 rounded p-2">
              <p className="text-xs text-slate-400">Vorschau:</p>
              <p className="text-green-400 font-mono text-sm">
                RE-{currentYear}-{String(previewInvoiceNumber).padStart(3, '0')}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-red-500/20 border-2 border-red-500 rounded-lg p-4 mb-6">
          <label className="block text-sm font-medium text-red-300 mb-2">
            ⚠️ Bestätigung: <strong>&quot;LÖSCHEN&quot;</strong> eingeben:
          </label>
          <input
            type="text"
            value={resetData.confirmText}
            onChange={(e) => setResetData(prev => ({ ...prev, confirmText: e.target.value }))}
            placeholder="LÖSCHEN"
            className="w-full px-3 py-3 bg-slate-900/50 border-2 border-red-500 rounded-lg text-white font-semibold text-center tracking-wider uppercase"
            disabled={hardResetLoading}
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setShowHardResetModal(false)}
            disabled={hardResetLoading}
            className="flex-1 bg-slate-600 text-white py-3 rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            Abbrechen
          </button>
          <button
            onClick={handleHardReset}
            disabled={resetData.confirmText !== 'LÖSCHEN' || hardResetLoading}
            className="flex-1 bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 font-semibold flex items-center justify-center gap-2"
          >
            {hardResetLoading ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                Wird gelöscht...
              </>
            ) : (
              <>
                🔄 Alles löschen
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

  // ✅ DODAJ OVDE (pre QuotesList komponente):
  const PDFLoadingModal = () => {
    if (!pdfLoading) return null

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-slate-800 rounded-lg p-8 max-w-sm">
          <div className="flex flex-col items-center gap-4">
            <div 
              className="w-16 h-16 border-4 border-slate-600 border-t-blue-500 rounded-full"
              style={{ animation: 'spin 1s linear infinite' }}
            ></div>
            <p className="text-white text-lg font-semibold">PDF wird geladen...</p>
            <p className="text-slate-400 text-sm">Bitte warten Sie einen Moment</p>
          </div>
        </div>
        
        <style jsx>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  const QuotesList = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white">Angebote (Profakture)</h3>
        <button
          onClick={() => {
            setCreateType('quote')
            setIsEditMode(false)
            setEditingItem(null)
            setShowCreateModal(true)
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Neues Angebot
        </button>
      </div>

      {quotes.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <div className="text-4xl mb-4">📄</div>
          <p>Noch keine Angebote erstellt</p>
          <button
            onClick={() => {
              setCreateType('quote')
              setIsEditMode(false)
              setEditingItem(null)
              setShowCreateModal(true)
            }}
            className="mt-4 text-blue-400 hover:text-blue-300"
          >
            Erstes Angebot erstellen
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {quotes.map((quote) => {
            const hasInvoice = quoteHasInvoice(quote.id)
            
            return (
              <div key={quote.id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-white font-semibold text-lg">{quote.quote_number}</h4>
                    <p className="text-slate-400">{quote.customer_name}</p>
                    <p className="text-slate-500 text-sm">{quote.customer_email}</p>
                    {hasInvoice && (
                      <div className="mt-2">
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/10 border border-blue-500/20 rounded text-blue-300 text-xs">
                          Hat zugehörige Rechnung
                        </span>
                      </div>
                    )}
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm border ${getStatusColor(quote.status)}`}>
                    {quote.status === 'draft' && 'Entwurf'}
                    {quote.status === 'sent' && 'Gesendet'}
                    {quote.status === 'converted' && 'Umgewandelt'}
                    {quote.status === 'cancelled' && 'Storniert'}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                  <div>
                    <span className="text-slate-400">Betrag:</span>
                    <p className="text-white font-semibold">{formatCurrency(quote.total_amount)}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Erstellt:</span>
                    <p className="text-white">{formatDate(quote.created_at)}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Gültig bis:</span>
                    <p className="text-white">{quote.valid_until ? formatDate(quote.valid_until) : 'Nicht angegeben'}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Positionen:</span>
                    <p className="text-white">{quote.items ? JSON.parse(quote.items).length : 0}</p>
                  </div>
                </div>

                <div className="flex gap-3 flex-wrap">
                  <button 
                    onClick={() => handlePDFView(quote)}
                    className="bg-slate-700 text-white px-3 py-2 rounded text-sm hover:bg-slate-600 transition-colors"
                  >
                    👁️ PDF ansehen
                  </button>
                  
                  <button 
                    onClick={() => handleEditClick(quote)}
                    className="bg-slate-700 text-white px-3 py-2 rounded text-sm hover:bg-slate-600 transition-colors"
                  >
                    Bearbeiten
                  </button>
                  
                  <button 
                    onClick={() => handleEmailClick(quote)}
                    className="bg-slate-700 text-white px-3 py-2 rounded text-sm hover:bg-slate-600 transition-colors"
                  >
                    Per E-Mail senden
                  </button>
                  
                  {quote.status !== 'converted' && !hasInvoice && (
                    <button
                      onClick={() => convertQuoteToInvoice(quote)}
                      className="bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700 transition-colors"
                    >
                      In Rechnung umwandeln
                    </button>
                  )}
                  
                  {!hasInvoice && (
                    <button 
                      onClick={() => handleDeleteInvoice(quote)}
                      className="bg-red-600 text-white px-3 py-2 rounded text-sm hover:bg-red-700 transition-colors"
                      title="Angebot löschen"
                    >
                      Löschen
                    </button>
                  )}
                  
                  {hasInvoice && (
                    <div className="text-slate-400 text-xs italic px-3 py-2">
                      Kann nicht gelöscht werden - hat zugehörige Rechnung
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )

  // 🔥 UPDATED InvoicesList with overdue filter
  const InvoicesList = () => {
    const displayInvoices = showOnlyOverdue 
      ? invoices.filter(inv => isInvoiceOverdue(inv))
      : invoices

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-white">Rechnungen</h3>
            
            {showOnlyOverdue && (
              <p className="text-orange-400 text-sm mt-1">
                ⏰ Zeige nur überfällige Rechnungen ({displayInvoices.length})
              </p>
            )}
          </div>
          
          <button
            onClick={() => {
              setCreateType('invoice')
              setIsEditMode(false)
              setEditingItem(null)
              setShowCreateModal(true)
            }}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
          >
            + Neue Rechnung
          </button>
        </div>

        {displayInvoices.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <div className="text-4xl mb-4">
              {showOnlyOverdue ? '🎉' : '🧾'}
            </div>
            <p>
              {showOnlyOverdue 
                ? 'Keine überfälligen Rechnungen!' 
                : 'Noch keine Rechnungen erstellt'
              }
            </p>
            <p className="text-sm mt-2">
              {showOnlyOverdue 
                ? 'Alle Rechnungen sind rechtzeitig bezahlt oder noch nicht fällig.'
                : 'Wandeln Sie Angebote in Rechnungen um oder erstellen Sie direkt eine neue Rechnung'
              }
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {displayInvoices.map((invoice) => {
              const overdueStatus = isInvoiceOverdue(invoice)
              const daysOverdue = getDaysOverdue(invoice)
           
              
              return (
                <div key={invoice.id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                    <div className="flex items-center gap-2 flex-wrap">
  <h4 className="text-white font-semibold text-lg">{invoice.invoice_number}</h4>
  
  
  
  {overdueStatus && (
    <div 
      className="flex items-center gap-1 text-red-400 text-xs cursor-help bg-red-500/10 px-2 py-1 rounded border border-red-500/20"
                            title={`Überfällig seit ${daysOverdue} Tag(en) - Due: ${invoice.due_date} Status: ${invoice.status}`}
                          >
                            <span className="text-red-400">⏰</span>
                            <span className="font-medium">{daysOverdue}d</span>
                          </div>
                        )}
                      </div>
                      <p className="text-slate-400">{invoice.customer_name}</p>
                      <p className="text-slate-500 text-sm">{invoice.customer_email}</p>
                      {invoice.converted_from_quote_id && (
                        <div className="mt-2">
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/10 border border-green-500/20 rounded text-green-300 text-xs">
                            Aus Angebot erstellt
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <span className={`px-3 py-1 rounded-full text-sm border ${getStatusColor(invoice.status)}`}>
                        {invoice.status === 'draft' && 'Entwurf'}
                        {invoice.status === 'sent' && 'Gesendet'}
                        {invoice.status === 'paid' && 'Bezahlt'}
                        {invoice.status === 'overdue' && 'Überfällig'}
                        {invoice.status === 'cancelled' && 'Storniert'}
                      </span>
                      {invoice.status === 'paid' && (
                        <div className="text-green-400 font-semibold text-sm mt-1">
                          💰 {formatCurrency(invoice.total_amount)}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                    <div>
                      <span className="text-slate-400">Betrag:</span>
                      <p className="text-white font-semibold">{formatCurrency(invoice.total_amount)}</p>
                    </div>
                    </div>



<div className="flex gap-3 flex-wrap">
                    <div>
                      <span className="text-slate-400">Rechnungsdatum:</span>
                      <p className="text-white">{formatDate(invoice.issue_date)}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Fälligkeitsdatum:</span>
                      <p className="text-white">{formatDate(invoice.due_date)}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Positionen:</span>
                      <p className="text-white">{invoice.items ? JSON.parse(invoice.items).length : 0}</p>
                    </div>
                  </div>

                  <div className="flex gap-3 flex-wrap">
                    <button 
                      onClick={() => handlePDFView(invoice)}
                      className="bg-slate-700 text-white px-3 py-2 rounded text-sm hover:bg-slate-600 transition-colors"
                    >
                      👁️ PDF ansehen
                    </button>
                    
                    <button 
                      onClick={() => handleEditClick(invoice)}
                      className="bg-slate-700 text-white px-3 py-2 rounded text-sm hover:bg-slate-600 transition-colors"
                    >
                      Bearbeiten
                    </button>
                    
                 {invoice.email_sent_at ? (
  <button 
    onClick={() => handleEmailClick(invoice)}
    className="bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700 transition-colors"
  >
    🔄 Erneut senden
  </button>
) : (
  <button 
    onClick={() => handleEmailClick(invoice)}
    className="bg-slate-700 text-white px-3 py-2 rounded text-sm hover:bg-slate-600 transition-colors"
  >
    Per E-Mail senden
  </button>
)}
                    
                    {(invoice.status === 'draft' || invoice.status === 'sent') && (
                      <button
                        onClick={() => handleMarkAsPaid(invoice)}
                        className="bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700 transition-colors"
                      >
                        Als bezahlt markieren
                      </button>
                    )}

                    {invoice.status === 'paid' && (
                      <button
                        onClick={() => handleUndoPaid(invoice)}
                        className="bg-orange-600 text-white px-3 py-2 rounded text-sm hover:bg-orange-700 transition-colors"
                      >
                        Bezahlung rückgängig
                      </button>
                    )}
                    
                    <button 
                      onClick={() => handleDeleteInvoice(invoice)}
                      className="bg-red-600 text-white px-3 py-2 rounded text-sm hover:bg-red-700 transition-colors"
                      title="Rechnung löschen"
                    >
                      Löschen
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  const SettingsTab = () => {
    const [localSettings, setLocalSettings] = useState(settingsData)
    const [hasChanges, setHasChanges] = useState(false)

    useEffect(() => {
      setLocalSettings(settingsData)
      setHasChanges(false)
    }, [settingsData])

    const handleLocalChange = (e) => {
      const { name, value, type, checked } = e.target
      const newValue = type === 'checkbox' ? checked : value
      
      setLocalSettings(prev => ({
        ...prev,
        [name]: newValue
      }))
      setHasChanges(true)
    }

  const handleLocalSave = async () => {
  setSettingsLoading(true)
  setSettingsError('')

  try {
    const hasTaxNumber = localSettings.tax_number && localSettings.tax_number.trim().length > 0
    const hasVatId = localSettings.vat_id && localSettings.vat_id.trim().length > 0
    
    if (!hasTaxNumber && !hasVatId) {
      setSettingsError('Bitte geben Sie entweder eine Steuernummer oder eine USt-IdNr ein (mindestens eines ist erforderlich)')
      setSettingsLoading(false)
      return
    }

    const updateData = {
      is_kleinunternehmer: localSettings.is_kleinunternehmer,
      tax_number: localSettings.tax_number || null,
      vat_id: localSettings.vat_id || null,
      default_tax_rate: localSettings.default_tax_rate,
      iban: localSettings.iban || null,
      bic: localSettings.bic || null,
      bank_name: localSettings.bank_name || null,
      payment_terms_days: localSettings.payment_terms_days,
      invoice_footer: localSettings.invoice_footer || null,
      full_name: localSettings.full_name || null,
      business_name: localSettings.business_name || null,
      phone: localSettings.phone || null,
      city: localSettings.city || null,
      address: localSettings.address || null,
      updated_at: new Date().toISOString()
    }

    const { error } = await supabase
      .from('majstors')
      .update(updateData)
      .eq('id', majstor.id)

    if (error) throw error

    const newMajstorData = { ...majstor, ...localSettings }
    
    setSettingsData(localSettings)
    setMajstor(newMajstorData)

    setHasChanges(false)
    
    const isNowComplete = isBusinessDataComplete(newMajstorData)
    
    console.log('Settings saved and states synchronized:', {
      pendingInvoiceCreation,
      pendingInvoiceType,
      businessDataWasComplete: isBusinessDataComplete(majstor),
      businessDataNowComplete: isNowComplete,
      updatedFields: Object.keys(updateData)
    })
    
    if (pendingInvoiceCreation) {
      if (isNowComplete) {
        alert('Einstellungen gespeichert!\n\nSie werden jetzt zur Rechnungserstellung weitergeleitet...')
      } else {
        alert('Einstellungen gespeichert!\n\nFür professionelle Rechnungen fehlen noch einige Daten.')
      }
    } else {
      alert('Einstellungen erfolgreich gespeichert!')
    }

  } catch (err) {
    console.error('Error saving settings:', err)
    setSettingsError('Fehler beim Speichern: ' + err.message)
  } finally {
    setSettingsLoading(false)
  }
}
    const totalDocuments = quotes.length + invoices.length
    const hasDocuments = totalDocuments > 0

    return (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <h3 className="text-lg font-semibold text-white">
        <span className="hidden sm:inline">Rechnungseinstellungen</span>
        <span className="inline sm:hidden">Einstellungen</span>
      </h3>
          
          {hasDocuments && (
            <button
              onClick={() => setShowHardResetModal(true)}
              className="flex items-center gap-2 bg-red-600/10 hover:bg-red-600/20 border border-red-500/30 text-red-400 px-4 py-2 rounded-lg transition-colors text-sm"
            >
              <span>🔄</span>
              <span>Neustart</span>
              <span className="text-xs text-red-300">({totalDocuments})</span>
            </button>
          )}
          
          {pendingInvoiceCreation && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg px-4 py-2">
              <p className="text-blue-300 text-sm">
                Nach dem Speichern wird automatisch zur Rechnungserstellung zurückgekehrt
              </p>
            </div>
          )}
        </div>
        
        <form onSubmit={(e) => { e.preventDefault(); handleLocalSave(); }}>

          <LogoUpload
            majstor={majstor}
            context="invoice"
            onLogoUpdate={(logoUrl) => {
              console.log('Logo updated:', logoUrl)
              setMajstor(prev => ({
                ...prev,
                business_logo_url: logoUrl
              }))
              
              setSettingsData(prev => ({
                ...prev,
                business_logo_url: logoUrl
              }))
              
              alert(logoUrl ? 'Logo erfolgreich hochgeladen!' : 'Logo entfernt!')
            }}
            className="mb-6"
          />
          
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 mb-6">
            <h4 className="text-white font-semibold mb-2">Geschäftsprofil</h4>
            <p className="text-slate-400 text-sm mb-4">
              Diese Daten erscheinen auf Ihren Rechnungen und sind für professionelle Dokumente erforderlich.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Vollständiger Name *
                  <span className="text-slate-500 text-xs ml-1">(Ihr persönlicher Name)</span>
                </label>
                <input
                  type="text"
                  name="full_name"
                  value={localSettings.full_name || ''}
                  onChange={handleLocalChange}
                  placeholder="Max Müller"
                  className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Firmenname *
                  <span className="text-slate-500 text-xs ml-1">(erscheint auf Rechnungen)</span>
                </label>
                <input
                  type="text"
                  name="business_name"
                  value={localSettings.business_name || ''}
                  onChange={handleLocalChange}
                  placeholder="z.B. Mustermann Handwerk GmbH"
                  className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Telefonnummer *
                  <span className="text-slate-500 text-xs ml-1">(für Kundenanfragen)</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={localSettings.phone || ''}
                  onChange={handleLocalChange}
                  placeholder="+49 123 456789"
                  className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Stadt/Ort *
                  <span className="text-slate-500 text-xs ml-1">(Geschäftssitz)</span>
                </label>
                <input
                  type="text"
                  name="city"
                  value={localSettings.city || ''}
                  onChange={handleLocalChange}
                  placeholder="Berlin"
                  className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white"
                  required
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Geschäftsadresse (optional)
                  <span className="text-slate-500 text-xs ml-1">(vollständige Adresse für Rechnungen)</span>
                </label>
                <input
                  type="text"
                  name="address"
                  value={localSettings.address || ''}
                  onChange={handleLocalChange}
                  placeholder="Musterstraße 123, 10115 Berlin"
                  className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white"
                />
              </div>
            </div>
            
            <div className="mt-4 bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <span className="text-blue-400 text-sm">💡</span>
                <div>
                  <p className="text-blue-300 text-sm font-medium mb-1">
                    Warum sind diese Daten wichtig?
                  </p>
                  <ul className="text-blue-200 text-xs space-y-1">
                    <li>• Firmenname erscheint als Absender auf allen Rechnungen</li>
                    <li>• Telefonnummer ermöglicht Kunden direkten Kontakt</li>
                    <li>• Stadt/Ort wird für lokale Auffindbarkeit benötigt</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 mb-6">
            <h4 className="text-white font-semibold mb-4">Steuer-Einstellungen</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="local_kleinunternehmer"
                    name="is_kleinunternehmer"
                    checked={localSettings.is_kleinunternehmer}
                    onChange={handleLocalChange}
                    className="mr-3 w-4 h-4 text-blue-600 bg-slate-700 border-slate-500 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="local_kleinunternehmer" className="text-slate-300">
                    Kleinunternehmer nach §19 UStG (keine Mehrwertsteuer)
                  </label>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Diese Einstellung wird automatisch für alle neuen Rechnungen verwendet
                </p>
              </div>
              
              {!localSettings.is_kleinunternehmer && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Standard MwSt. Satz (%)</label>
                  <select
                    name="default_tax_rate"
                    value={localSettings.default_tax_rate}
                    onChange={handleLocalChange}
                    className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white"
                  >
                    <option value="19">19% (Regelsteuersatz)</option>
                    <option value="7">7% (ermäßigter Steuersatz)</option>
                    <option value="0">0% (steuerbefreit)</option>
                  </select>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Steuernummer</label>
                <input
                  type="text"
                  name="tax_number"
                  value={localSettings.tax_number}
                  onChange={handleLocalChange}
                  placeholder="12/345/67890"
                  className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white"
                 
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">USt-IdNr</label>
                <input
                  type="text"
                  name="vat_id"
                  value={localSettings.vat_id}
                  onChange={handleLocalChange}
                  placeholder="DE123456789"
                  className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white"
                />
              </div>
              <div className="md:col-span-2 bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
  <p className="text-blue-300 text-sm">
    ℹ️ <strong>Hinweis:</strong> Sie müssen mindestens eine Steuernummer ODER eine USt-IdNr angeben. Beide können ausgefüllt werden.
  </p>
</div>
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 mb-6">
            <h4 className="text-white font-semibold mb-4">Bankdaten</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">IBAN</label>
                <input
                  type="text"
                  name="iban"
                  value={localSettings.iban}
                  onChange={handleLocalChange}
                  placeholder="DE89 3704 0044 0532 0130 00"
                  className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">BIC</label>
                <input
                  type="text"
                  name="bic"
                  value={localSettings.bic}
                  onChange={handleLocalChange}
                  placeholder="COBADEFFXXX"
                  className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-2">Bank</label>
                <input
                  type="text"
                  name="bank_name"
                  value={localSettings.bank_name}
                  onChange={handleLocalChange}
                  placeholder="Commerzbank Berlin"
                  className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white"
                  required
                />
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 mb-6">
            <h4 className="text-white font-semibold mb-4">Zahlungsbedingungen</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Standard Zahlungsziel</label>
                <select 
                  name="payment_terms_days"
                  value={localSettings.payment_terms_days}
                  onChange={handleLocalChange}
                  className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white"
                >
                  <option value="7">7 Tage</option>
                  <option value="14">14 Tage</option>
                  <option value="30">30 Tage</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Rechnungs-Fußzeile</label>
                <textarea
                  name="invoice_footer"
                  value={localSettings.invoice_footer}
                  onChange={handleLocalChange}
                  placeholder="z.B. Vielen Dank für Ihr Vertrauen!"
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white"
                />
              </div>
            </div>
          </div>

          {settingsError && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
              <p className="text-red-400">{settingsError}</p>
            </div>
          )}

          {hasChanges && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2">
                <span className="text-yellow-400">⚠️</span>
                <p className="text-yellow-300">Sie haben ungespeicherte Änderungen.</p>
              </div>
            </div>
          )}

          <button 
            type="submit"
            disabled={settingsLoading || !hasChanges}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
              hasChanges
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-slate-600 text-slate-400 cursor-not-allowed'
            } disabled:opacity-50`}
          >
            {settingsLoading ? 'Speichern...' : 'Einstellungen speichern'}
          </button>
          
          <p className="text-xs text-slate-500 mt-2">
            Diese Einstellungen werden automatisch für alle neuen Rechnungen und Angebote verwendet.
          </p>
        </form>
      </div>
    )
  }

  const tabs = [
    { id: 'quotes', name: 'Angebote', count: quotes.length },
    { id: 'invoices', name: 'Rechnungen', count: invoices.length },
    { id: 'settings', name: 'Einstellungen' }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white text-xl">Laden...</div>
      </div>
    )
  }

 return (
  <div className="space-y-6">
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">Rechnungen & Angebote</h1>
        <p className="text-slate-400">
          Erstellen und verwalten Sie Angebote und Rechnungen für Ihre Kunden
        </p>
      </div>
      
      <div className="flex flex-col gap-2 items-start sm:items-end">
        {/* 🔥 Zurück zu Kundenanfragen - prikazuje se SAMO ako dolaziš iz inquiries */}
        {fromInquiries && (
          <Link
            href="/dashboard/inquiries"
            className="inline-flex items-center text-slate-400 hover:text-white transition-colors"
          >
            ← Zurück zu Kundenanfragen
          </Link>
        )}
        {/* 🔥 Zurück zu Kunden - prikazuje se SAMO ako dolaziš iz customers */}
        {fromCustomers && (
          <Link
            href="/dashboard/customers"
            className="inline-flex items-center text-slate-400 hover:text-white transition-colors"
          >
            ← Zurück zu Kunden
          </Link>
        )}
        
        {/* Zurück zum Dashboard - uvek se prikazuje */}
        <Link
          href="/dashboard"
          className="inline-flex items-center text-slate-400 hover:text-white transition-colors"
        >
          ← Zurück zum Dashboard
        </Link>
      </div>
    </div>

    {error && (
      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
        <p className="text-red-400">{error}</p>
      </div>
    )}

      {/* 🔥 UPDATED Stats Cards with overdue filter */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <button
          onClick={() => {
            setActiveTab('quotes')
            setShowOnlyOverdue(false)
            const url = new URL(window.location.href)
            url.searchParams.set('tab', 'quotes')
            window.history.replaceState({}, '', url.toString())
          }}
          className={`bg-slate-800/50 border rounded-lg p-4 text-left transition-all hover:bg-slate-700/50 hover:border-blue-600 hover:scale-105 ${
            activeTab === 'quotes' 
              ? 'border-blue-500 ring-2 ring-blue-500/20' 
              : 'border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Angebote</p>
              <p className="text-2xl font-bold text-white">{quotes.length}</p>
            </div>
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white">
              📄
            </div>
          </div>
        </button>
        
        <button
          onClick={() => {
            setActiveTab('invoices')
            setShowOnlyOverdue(false)
            const url = new URL(window.location.href)
            url.searchParams.set('tab', 'invoices')
            window.history.replaceState({}, '', url.toString())
          }}
          className={`bg-slate-800/50 border rounded-lg p-4 text-left transition-all hover:bg-slate-700/50 hover:border-purple-600 hover:scale-105 ${
            activeTab === 'invoices' && !showOnlyOverdue
              ? 'border-purple-500 ring-2 ring-purple-500/20' 
              : 'border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Rechnungen</p>
              <p className="text-2xl font-bold text-white">{invoices.length}</p>
            </div>
            <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center text-white">
              🧾
            </div>
          </div>
        </button>

        <button
          onClick={() => {
            setActiveTab('invoices')
            setShowOnlyOverdue(true)
            const url = new URL(window.location.href)
            url.searchParams.set('tab', 'invoices')
            window.history.replaceState({}, '', url.toString())
          }}
          className={`bg-slate-800/50 border rounded-lg p-4 text-left transition-all hover:bg-slate-700/50 hover:border-orange-600 hover:scale-105 ${
            activeTab === 'invoices' && showOnlyOverdue
              ? 'border-orange-500 ring-2 ring-orange-500/20' 
              : 'border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Überfällige Rechnungen</p>
              <p className="text-2xl font-bold text-white">
                {invoices.filter(inv => isInvoiceOverdue(inv)).length}
              </p>
            </div>
            <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center text-white">
              ⏰
            </div>
          </div>
        </button>

        <button
          onClick={() => {
            setActiveTab('invoices')
            setShowOnlyOverdue(false)
            const url = new URL(window.location.href)
            url.searchParams.set('tab', 'invoices')
            window.history.replaceState({}, '', url.toString())
          }}
          className={`bg-slate-800/50 border rounded-lg p-4 text-left transition-all hover:bg-slate-700/50 hover:border-green-600 hover:scale-105 ${
            activeTab === 'invoices' && !showOnlyOverdue
              ? 'border-green-500 ring-2 ring-green-500/20' 
              : 'border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Monatsumsatz</p>
              <p className="text-2xl font-bold text-white">
                {formatCurrency(
                  invoices
                    .filter(inv => inv.status === 'paid')
                    .reduce((sum, inv) => sum + (inv.total_amount || 0), 0)
                )}
              </p>
            </div>
            <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center text-white">
              💰
            </div>
          </div>
        </button>
      </div>

      <div className="border-b border-slate-700 overflow-x-auto">
        <nav className="flex space-x-1 sm:space-x-8 min-w-max">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id)
                if (tab.id !== 'invoices') {
                  setShowOnlyOverdue(false)
                }
                const url = new URL(window.location.href)
                url.searchParams.set('tab', tab.id)
                window.history.replaceState({}, '', url.toString())
              }}
              className={`py-2 px-1.5 sm:px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-300 hover:border-slate-300'
              }`}
            >
              {tab.name}
              {tab.count !== undefined && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-slate-700 text-slate-300 rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      <div>
        {activeTab === 'quotes' && <QuotesList />}
        {activeTab === 'invoices' && <InvoicesList />}
        {activeTab === 'settings' && <SettingsTab />}
      </div>

      {showCreateModal && (
        <InvoiceCreator
          isOpen={showCreateModal}
          onClose={handleModalClose}
          type={createType}
          majstor={majstor}
          onSuccess={handleCreateSuccess}
          editData={editingItem}
          isEditMode={isEditMode}
        />
      )}

      {showEmailModal && emailItem && (
        <EmailInvoiceModal
          isOpen={showEmailModal}
          onClose={() => {
            setShowEmailModal(false)
            setEmailItem(null)
          }}
          invoice={emailItem}
          majstor={majstor}
          onSuccess={handleEmailSuccess}
        />
      )}

      <HardResetModal />
      <PDFLoadingModal />
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="text-white">Laden...</div>}>
      <DashboardPageContent />
    </Suspense>
  )
}