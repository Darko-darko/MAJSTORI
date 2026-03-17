// app/dashboard/pdf-archive/page.js - COMPLETE FIXED VERSION
'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import FirstVisitHint from '@/app/components/FirstVisitHint'
import BuchhalterSendModal from '@/app/components/BuchhalterSendModal'

export default function PDFArchivePage() {
  // State management
  const [majstor, setMajstor] = useState(null)
  const [archivedPDFs, setArchivedPDFs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Detail view state
  const [selectedPDF, setSelectedPDF] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // Bulk selection state
  const [selectedPDFs, setSelectedPDFs] = useState(new Set())
  const [bulkEmailModal, setBulkEmailModal] = useState(false)
  const [bulkZipModal, setBulkZipModal] = useState(false)
  const [bulkZipLoading, setBulkZipLoading] = useState(false)
  const [bulkZipResult, setBulkZipResult] = useState(null)

  // Tabs
  const [activeTab, setActiveTab] = useState('rechnungen')

  // Ausgaben tab state
  const [ausgaben, setAusgaben] = useState([])
  const [ausgabenLoading, setAusgabenLoading] = useState(false)
  const [ausgabenSelected, setAusgabenSelected] = useState(new Set())
  const [ausgabenZipModal, setAusgabenZipModal] = useState(false)
  const [ausgabenZipResult, setAusgabenZipResult] = useState(null)
  const [ausgabenZipLoading, setAusgabenZipLoading] = useState(false)
  const [ausgabenMonth, setAusgabenMonth] = useState(new Date().getMonth())
  const [ausgabenYear, setAusgabenYear] = useState(new Date().getFullYear())

  // Attachments modal
  const [attachmentModal, setAttachmentModal] = useState(null)
  const [attachmentModalLoading, setAttachmentModalLoading] = useState(false)
  const [attachmentCounts, setAttachmentCounts] = useState({}) // {invoiceId: count}
  const [detailAttachments, setDetailAttachments] = useState([])

  // Buchhalter access
  const [buchhalterAccess, setBuchhalterAccess] = useState(null)
  const [buchhalterEmailInput, setBuchhalterEmailInput] = useState('')
  const [buchhalterEmailEditing, setBuchhalterEmailEditing] = useState(false)
  const [buchhalterEmailSaving, setBuchhalterEmailSaving] = useState(false)
  const [buchhalterInviting, setBuchhalterInviting] = useState(false)
  const [buchhalterInviteStatus, setBuchhalterInviteStatus] = useState(null) // 'success' | 'error' | 'already' | 'mismatch' | null
  const [buchhalterInviteOpen, setBuchhalterInviteOpen] = useState(false)
  const [buchhalterConfirmEmail, setBuchhalterConfirmEmail] = useState('')
  const [buchhalterRevokeConfirm, setBuchhalterRevokeConfirm] = useState(false)
  const [buchhalterRevoking, setBuchhalterRevoking] = useState(false)
  const [buchhalterRevoked, setBuchhalterRevoked] = useState(false) // just revoked, show reconnect UI

  // Bookkeeper settings (legacy, kept for BookkeeperSettingsModal)
  const [bookkeeperSettings, setBookkeeperSettings] = useState({
    showSettings: false,
    email: '',
    name: 'Buchhalter'
  })

  // Filters
  const [filters, setFilters] = useState({
    type: 'invoice',
    dateRange: 'thisMonth',
    customer: '',
    customMonth: new Date().getMonth() + 1,
    customYear: new Date().getFullYear(),
    status: '', // '' = alle, 'paid' = bezahlt
  })

  // Load data on mount
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        setError('Authentication required')
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

      if (majstorData.bookkeeper_email) {
        setBookkeeperSettings(prev => ({
          ...prev,
          email: majstorData.bookkeeper_email,
          name: majstorData.bookkeeper_name || 'Buchhalter'
        }))
      }

      // Učitaj buchhalter_access
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          const accessRes = await fetch('/api/buchhalter-access', {
            headers: { Authorization: `Bearer ${session.access_token}` }
          })
          const accessJson = await accessRes.json()
          const first = accessJson.data?.[0] || null
          setBuchhalterAccess(first)
          setBuchhalterEmailInput(first?.buchhalter_email || '')
        }
      } catch (e) { console.warn('buchhalter-access load failed', e) }

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
          created_at, status, customer_email, issue_date, due_date, updated_at,
          email_sent_at, email_sent_to
        `)
        .eq('majstor_id', majstorId)
        .not('pdf_storage_path', 'is', null)
        .neq('status', 'dummy')

      if (filters.type === 'invoice') {
        query = query.in('type', ['invoice', 'storno'])
      } else {
        query = query.eq('type', filters.type)
      }

      if (filters.customer) {
        query = query.eq('customer_name', filters.customer)
      }

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
      } else if (filters.dateRange === 'year') {
        const startOfYear = new Date(filters.customYear, 0, 1)
        const endOfYear = new Date(filters.customYear, 11, 31, 23, 59, 59)
        query = query
          .gte('pdf_generated_at', startOfYear.toISOString())
          .lte('pdf_generated_at', endOfYear.toISOString())
      } else if (filters.dateRange === 'custom') {
        const startOfCustomMonth = new Date(filters.customYear, filters.customMonth - 1, 1)
        const endOfCustomMonth = new Date(filters.customYear, filters.customMonth, 0, 23, 59, 59)
        query = query
          .gte('pdf_generated_at', startOfCustomMonth.toISOString())
          .lte('pdf_generated_at', endOfCustomMonth.toISOString())
      }

      // Status filter (exclude storno when filtering by status)
      if (filters.status === 'paid') {
        query = query.eq('status', 'paid').eq('type', 'invoice')
      } else if (filters.status === 'unpaid') {
        query = query.in('status', ['sent', 'draft']).eq('type', 'invoice')
      } else if (filters.status === 'overdue') {
        const today = new Date().toISOString().slice(0, 10)
        query = query.in('status', ['sent', 'draft']).eq('type', 'invoice').lt('due_date', today)
      }

      const { data: pdfsData, error } = await query.order('issue_date', { ascending: false }).order('created_at', { ascending: false })

      if (error) throw error

      setArchivedPDFs(pdfsData || [])
      console.log('✅ Loaded', pdfsData?.length || 0, 'archived PDFs')

      // Load attachment counts separately
      if (pdfsData?.length > 0) {
        const ids = pdfsData.map(p => p.id)
        const { data: attData } = await supabase
          .from('invoice_attachments')
          .select('invoice_id')
          .in('invoice_id', ids)
        const counts = {}
        attData?.forEach(a => { counts[a.invoice_id] = (counts[a.invoice_id] || 0) + 1 })
        setAttachmentCounts(counts)
      }

    } catch (err) {
      console.error('Archive loading error:', err)
      setError('Fehler beim Laden der PDF-Archive')
    }
  }

  const loadInvoiceDetails = async (pdfId) => {
    try {
      setDetailLoading(true)
      
      const { data: invoice, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', pdfId)
        .single()

      if (error) throw error

      setSelectedPDF(invoice)

      // Load attachments for detail view
      const { data: atts } = await supabase
        .from('invoice_attachments')
        .select('*')
        .eq('invoice_id', pdfId)
      setDetailAttachments(atts || [])

      console.log('✅ Loaded full invoice details')

    } catch (err) {
      console.error('Error loading invoice details:', err)
      alert('Fehler beim Laden der Details: ' + err.message)
    } finally {
      setDetailLoading(false)
    }
  }

  const showDetails = (pdfId) => {
    loadInvoiceDetails(pdfId)
  }

  const backToList = () => {
    setSelectedPDF(null)
  }

  const openAttachmentModal = async (pdf) => {
    setAttachmentModalLoading(true)
    setAttachmentModal({ invoiceId: pdf.id, attachments: [] })
    const { data } = await supabase
      .from('invoice_attachments')
      .select('*')
      .eq('invoice_id', pdf.id)
    setAttachmentModal({ invoiceId: pdf.id, attachments: data || [] })
    setAttachmentModalLoading(false)
  }

  const downloadAttachment = async (att) => {
    const { data } = await supabase.storage
      .from('invoice-pdfs')
      .createSignedUrl(att.storage_path, 300)
    if (!data?.signedUrl) return
    const a = document.createElement('a')
    a.href = data.signedUrl
    a.target = '_blank'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

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
      .sort((a, b) => b.count - a.count)
  }

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

  const getSelectedInvoiceStatus = () => {
    const selected = archivedPDFs.filter(pdf => selectedPDFs.has(pdf.id) && pdf.type === 'invoice')
    if (selected.length === 0) return null
    const allPaid = selected.every(pdf => pdf.status === 'paid')
    const allUnpaid = selected.every(pdf => pdf.status !== 'paid')
    if (allPaid) return 'paid'
    if (allUnpaid) return 'unpaid'
    return 'mixed'
  }

  const handleBulkTogglePaid = async () => {
    const status = getSelectedInvoiceStatus()
    const selected = archivedPDFs.filter(pdf => selectedPDFs.has(pdf.id) && pdf.type === 'invoice')

    if (status === 'paid') {
      // Undo paid → sent
      const confirmed = confirm(`${selected.length} Rechnung(en) als offen markieren?`)
      if (!confirmed) return

      try {
        const { error } = await supabase
          .from('invoices')
          .update({ status: 'sent', paid_date: null, updated_at: new Date().toISOString() })
          .in('id', selected.map(p => p.id))

        if (error) throw error

        alert(`${selected.length} Rechnung(en) als offen markiert.`)
        setSelectedPDFs(new Set())
        if (majstor?.id) await loadArchivedPDFs(majstor.id)
        window.__refreshBadges?.()
        window.__refreshInvoices?.()
      } catch (err) {
        alert('Fehler: ' + err.message)
      }
    } else {
      // Mark as paid
      const unpaidIds = selected.filter(pdf => pdf.status !== 'paid').map(pdf => pdf.id)
      if (unpaidIds.length === 0) return

      const confirmed = confirm(`${unpaidIds.length} Rechnung(en) als bezahlt markieren?`)
      if (!confirmed) return

      try {
        const { error } = await supabase
          .from('invoices')
          .update({
            status: 'paid',
            paid_date: new Date().toISOString().split('T')[0],
            updated_at: new Date().toISOString()
          })
          .in('id', unpaidIds)

        if (error) throw error

        alert(`${unpaidIds.length} Rechnung(en) als bezahlt markiert.`)
        setSelectedPDFs(new Set())
        if (majstor?.id) await loadArchivedPDFs(majstor.id)
        window.__refreshBadges?.()
        window.__refreshInvoices?.()
      } catch (err) {
        alert('Fehler: ' + err.message)
      }
    }
  }

  const handleBulkZip = async () => {
    setBulkZipModal(true)
    setBulkZipResult(null)
    setBulkZipLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const businessSlug = (majstor?.business_name || majstor?.full_name || 'Rechnungen').replace(/\s+/g, '_').substring(0, 30)
      const res = await fetch('/api/invoices/bulk-zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          invoiceIds: Array.from(selectedPDFs),
          majstorId: majstor.id,
          zipFilename: `Rechnungen_${businessSlug}.zip`
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'ZIP fehlgeschlagen')
      setBulkZipResult(data)
    } catch (err) {
      setBulkZipResult({ error: err.message })
    } finally {
      setBulkZipLoading(false)
    }
  }

  // ✅ FIXED - Download PDF directly from Supabase Storage (like email does!)
  const downloadPDF = async (pdfId) => {
    try {
      console.log('📥 Downloading PDF:', pdfId)
      
      // 1️⃣ Get invoice data
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .select('id, pdf_storage_path, invoice_number, quote_number, type')
        .eq('id', pdfId)
        .single()

      if (invoiceError || !invoice) {
        throw new Error('Invoice not found')
      }

      if (!invoice.pdf_storage_path) {
        throw new Error('PDF not generated yet')
      }

      console.log('📂 PDF path:', invoice.pdf_storage_path)

      // 2️⃣ Download directly from Storage (SAME AS EMAIL!)
      const { data: pdfData, error: downloadError } = await supabase.storage
        .from('invoice-pdfs')
        .download(invoice.pdf_storage_path)

      if (downloadError || !pdfData) {
        throw new Error('PDF download failed: ' + downloadError?.message)
      }

      console.log('✅ PDF loaded from storage, size:', pdfData.size)

      // 3️⃣ Create download link
      const blob = new Blob([pdfData], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      
      const documentType = invoice.type === 'quote' ? 'Angebot' : 'Rechnung'
      const documentNumber = invoice.invoice_number || invoice.quote_number
      const filename = `${documentType}_${documentNumber}.pdf`
      
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      
      URL.revokeObjectURL(url)
      
      console.log('✅ Download started:', filename)

    } catch (err) {
      console.error('❌ Download error:', err)
      alert('Download fehlgeschlagen: ' + err.message)
    }
  }

  const openPDFInNewTab = async (pdfId) => {
    const isLight = localStorage.getItem('pm-theme') === 'light'
    const bg = isLight ? '#f1f5f9' : '#0b1220'
    const textColor = isLight ? '#0f172a' : 'white'
    const subtitleColor = isLight ? '#475569' : '#94a3b8'
    const trackColor = isLight ? '#cbd5e1' : '#334155'
    const pdfTab = window.open('', '_blank')
    if (!pdfTab) { alert('Popup wurde blockiert. Bitte erlauben Sie Popups.'); return }
    pdfTab.document.open()
    pdfTab.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>PDF wird geladen...</title>
<style>*{margin:0;padding:0;box-sizing:border-box}html,body{width:100%;height:100%;background:${bg};font-family:-apple-system,sans-serif;color:${textColor}}
.overlay{position:fixed;inset:0;display:flex;align-items:center;justify-content:center}
.content{display:flex;flex-direction:column;align-items:center;gap:16px;text-align:center}
.spinner{width:80px;height:80px;border:6px solid ${trackColor};border-top-color:#3b82f6;border-radius:50%;animation:spin 1s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}.title{font-size:18px;font-weight:700}.subtitle{font-size:14px;color:${subtitleColor}}
</style></head><body><div class="overlay"><div class="content"><div class="spinner"></div><div class="title">PDF wird geladen…</div><div class="subtitle">Einen Moment bitte…</div></div></div></body></html>`)
    pdfTab.document.close()
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { pdfTab.close(); return }
      const response = await fetch(`/api/invoices/${pdfId}/pdf`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      })
      if (!response.ok) throw new Error('HTTP ' + response.status)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      pdfTab.location.href = url
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (error) {
      console.error('❌ Open PDF error:', error)
      pdfTab.close()
      alert('PDF öffnen fehlgeschlagen: ' + error.message)
    }
  }

  const loadAusgaben = async (month, year) => {
    setAusgabenLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await fetch('/api/ausgaben', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      })
      if (!res.ok) return
      const data = await res.json()
      const filtered = (data.ausgaben || []).filter(a => {
        const d = new Date(a.created_at)
        return d.getMonth() === month && d.getFullYear() === year
      })
      setAusgaben(filtered)
    } finally {
      setAusgabenLoading(false)
    }
  }

  const handleFilterChange = (newFilters) => {
    setFilters(prev => {
      if (newFilters.type && newFilters.type !== prev.type) {
        return { ...prev, ...newFilters, customer: '' }
      }

      if (newFilters.dateRange && newFilters.dateRange !== prev.dateRange) {
        return { ...prev, ...newFilters, customer: '' }
      }
      
      return { ...prev, ...newFilters }
    })
  }

  useEffect(() => {
    if (majstor?.id) {
      loadArchivedPDFs(majstor.id)
    }
  }, [filters])

  useEffect(() => {
    if (activeTab === 'ausgaben') {
      loadAusgaben(ausgabenMonth, ausgabenYear)
      setAusgabenSelected(new Set())
    }
  }, [activeTab, ausgabenMonth, ausgabenYear])

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


  const getStatusColor = (status) => {
    const colors = {
      'draft': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
      'sent': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      'paid': 'bg-green-500/10 text-green-400 border-green-500/20',
      'overdue': 'bg-red-500/10 text-red-400 border-red-500/20',
      'cancelled': 'bg-slate-500/10 text-slate-400 border-slate-500/20',
      'converted': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      'storno': 'bg-slate-500/10 text-slate-300 border-slate-500/20',
    }
    return colors[status] || colors.draft
  }

  // ✅ DetailView Component - receives functions as props
  const DetailView = ({ invoice, onDownloadPDF, onOpenPDF }) => {
    if (!invoice) return null

    const items = JSON.parse(invoice.items || '[]')
    const isQuote = invoice.type === 'quote'

    return (
      <div className="space-y-6 pb-24">
        <div className="flex items-center justify-between">
          <button
            onClick={backToList}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            ← Zurück zur Liste
          </button>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => onOpenPDF(invoice.id)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              👁️ PDF öffnen
            </button>
            <button 
              onClick={() => onDownloadPDF(invoice.id)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              📥 Download
            </button>
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h4 className="text-white font-semibold text-lg">
                  {invoice.invoice_number || invoice.quote_number}
                </h4>
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
            <span className={`px-3 py-1 rounded-full text-sm border ${invoice.type === 'storno' ? getStatusColor('storno') : getStatusColor(invoice.status)}`}>
              {invoice.type === 'storno' ? 'Storno'
                : invoice.status === 'draft' ? 'Entwurf'
                : invoice.status === 'sent' ? 'Gesendet'
                : invoice.status === 'paid' ? 'Bezahlt'
                : invoice.status === 'overdue' ? 'Überfällig'
                : invoice.status === 'cancelled' ? 'Storniert'
                : invoice.status === 'converted' ? 'Umgewandelt'
                : ''}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
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

          <div className="bg-slate-900/50 rounded-lg p-3 mb-4">
            <h5 className="text-white font-medium mb-2">📧 Email & PDF Status</h5>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-slate-400">PDF erstellt:</span>
                <p className="text-slate-300">{formatDate(invoice.pdf_generated_at)}</p>
              </div>
              
              {invoice.email_sent_at ? (
                <>
                  <div>
                    <span className="text-slate-400">Zuletzt gesendet:</span>
                    <p className="text-green-300">{formatDate(invoice.email_sent_at)}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Empfänger:</span>
                    <p className="text-slate-300 truncate">{invoice.email_sent_to || 'N/A'}</p>
                  </div>
                </>
              ) : (
                <div className="col-span-2">
                  <span className="text-slate-400">Status:</span>
                  <p className="text-yellow-300">📤 Noch nicht gesendet</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Anhänge */}
        {detailAttachments.length > 0 && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
            <h5 className="text-white font-medium mb-3">📎 Anhänge ({detailAttachments.length})</h5>
            <div className="space-y-1">
              {detailAttachments.map(att => (
                <button
                  key={att.id}
                  onClick={() => downloadAttachment(att)}
                  className="w-full flex items-center justify-between px-3 py-2 bg-slate-700/60 hover:bg-slate-700 rounded-lg transition-colors text-left"
                >
                  <span className="text-slate-300 text-sm truncate">{att.filename}</span>
                  <span className="text-blue-400 text-xs ml-2 shrink-0">👁 Öffnen</span>
                </button>
              ))}
            </div>
          </div>
        )}

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

        {invoice.notes && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
            <h5 className="text-white font-semibold mb-2">📝 Notizen</h5>
            <p className="text-slate-300">{invoice.notes}</p>
          </div>
        )}
      </div>
    )
  }

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
            <h3 className="text-xl font-semibold text-white">📧 Buchhalter Einstellungen</h3>
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


  const BulkActionBar = () => {
    if (selectedPDFs.size === 0) return null
    
    return (
      <>
      <div className="fixed bottom-0 left-0 right-0 h-12 bg-slate-800 border-t border-slate-600 sm:hidden z-39" />
      <div className="fixed bottom-12 left-0 right-0 z-40 sm:bottom-6 sm:left-1/2 sm:right-auto sm:transform sm:-translate-x-1/2">
        <div className="bg-slate-800 border-t border-slate-600 sm:border sm:rounded-lg shadow-lg px-4 pt-3 pb-4 sm:p-4">
          <p className="text-white text-sm font-semibold mb-3 sm:hidden">
            <span>{selectedPDFs.size}</span> PDF{selectedPDFs.size > 1 ? 's' : ''} ausgewählt
          </p>
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-white text-sm font-semibold shrink-0">
              {selectedPDFs.size} PDF{selectedPDFs.size > 1 ? 's' : ''} ausgewählt
            </span>
            {filters.dateRange !== 'year' && filters.dateRange !== 'all' && (
              <>
                <button
                  onClick={() => setBulkEmailModal(true)}
                  className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm flex items-center justify-center gap-2"
                >
                  ✉️ E-Mail senden
                </button>
                <button
                  onClick={handleBulkZip}
                  className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm flex items-center justify-center gap-2"
                >
                  📥 ZIP
                </button>
              </>
            )}
            {filters.type === 'invoice' && getSelectedInvoiceStatus() && (
              <button
                onClick={handleBulkTogglePaid}
                className={`flex-1 sm:flex-none text-white px-4 py-2 rounded text-sm flex items-center justify-center gap-2 ${
                  getSelectedInvoiceStatus() === 'paid'
                    ? 'bg-slate-600 hover:bg-slate-700'
                    : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                {getSelectedInvoiceStatus() === 'paid' ? '↩️ Als offen' : '💰 Als bezahlt'}
              </button>
            )}
            <button
              onClick={clearSelection}
              className="hidden sm:block text-slate-400 hover:text-white text-sm px-3 py-2 shrink-0"
            >
              ✕ Auswahl aufheben
            </button>
          </div>
          {(filters.dateRange === 'year' || filters.dateRange === 'all') && (
            <p className="text-slate-400 text-xs mt-2">E-Mail-Versand und ZIP-Download sind nur im Monatsfilter verfügbar.</p>
          )}
          <button
            onClick={clearSelection}
            className="sm:hidden w-full text-center text-slate-400 hover:text-white text-xs mt-2 py-1"
          >
            ✕ Auswahl aufheben
          </button>
        </div>
      </div>
      </>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-20 w-20 border-[6px] border-slate-600 border-t-blue-500 mx-auto mb-4"></div>
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

  const getPeriodLabel = () => {
    const monthNames = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember']
    if (filters.dateRange === 'thisMonth') {
      const now = new Date()
      return `${monthNames[now.getMonth()]} ${now.getFullYear()}`
    }
    if (filters.dateRange === 'lastMonth') {
      const d = new Date(); d.setMonth(d.getMonth() - 1)
      return `${monthNames[d.getMonth()]} ${d.getFullYear()}`
    }
    if (filters.dateRange === 'year') {
      return `Ganzes Jahr ${filters.customYear}`
    }
    if (filters.dateRange === 'all') {
      return 'Alle Jahre'
    }
    return `${monthNames[filters.customMonth - 1]} ${filters.customYear}`
  }

  if (selectedPDF) {
    if (detailLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-20 w-20 border-[6px] border-slate-600 border-t-blue-500 mx-auto mb-4"></div>
            <div className="text-white text-xl">Lade Details...</div>
          </div>
        </div>
      )
    }
    
    // Pass functions as props to DetailView
    return <DetailView 
      invoice={selectedPDF} 
      onDownloadPDF={downloadPDF}
      onOpenPDF={openPDFInNewTab}
    />
  }

  return (
    <div className="space-y-6">
      <FirstVisitHint pageKey="archiv" />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">🗂️ Buchhalter</h1>
          <p className="text-slate-400">Rechnungen und Ausgaben an den Buchhalter senden</p>
        </div>
        <Link href="/dashboard" className="inline-flex items-center text-slate-400 hover:text-white transition-colors">
          ← Zurück zum Dashboard
        </Link>
      </div>

      {/* Buchhalterin E-Mail */}
      <p className="text-xs text-slate-400 mb-2 font-medium uppercase tracking-wide">Buchhalterin E-Mail</p>
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
        {buchhalterRevoked ? (
          <div className="flex items-center justify-between">
            <span className="text-white text-sm">{buchhalterEmailInput}</span>
            <button onClick={() => { setBuchhalterRevoked(false); setBuchhalterEmailEditing(true); setBuchhalterEmailInput('') }} className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded hover:bg-slate-700 transition-colors">Ändern</button>
          </div>
        ) : buchhalterEmailEditing || !buchhalterAccess ? (
          <div className="flex gap-2 items-center">
            <input
              type="email"
              value={buchhalterEmailInput}
              onChange={e => setBuchhalterEmailInput(e.target.value)}
              placeholder="buchhaltung@kanzlei.de"
              className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-teal-500"
            />
            <button
              onClick={async () => {
                if (!buchhalterEmailInput.trim()) return
                setBuchhalterEmailSaving(true)
                try {
                  const { data: { session } } = await supabase.auth.getSession()
                  const res = await fetch('/api/buchhalter-access', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
                    body: JSON.stringify({ buchhalter_email: buchhalterEmailInput.trim() })
                  })
                  const json = await res.json()
                  if (res.ok) { setBuchhalterAccess(json.data); setBuchhalterEmailEditing(false); setBuchhalterInviteStatus(null) }
                  else { console.error('PATCH failed:', json); alert('Fehler: ' + (json.error || 'Unbekannter Fehler')) }
                } catch (e) { console.error('PATCH exception:', e); alert('Netzwerkfehler: ' + e.message) }
                finally { setBuchhalterEmailSaving(false) }
              }}
              disabled={buchhalterEmailSaving || !buchhalterEmailInput.trim()}
              className="px-3 py-2 bg-teal-700 hover:bg-teal-600 disabled:opacity-40 text-white rounded-lg text-sm transition-colors"
            >
              {buchhalterEmailSaving ? '...' : 'Speichern'}
            </button>
            {buchhalterAccess && (
              <button onClick={() => { setBuchhalterEmailEditing(false); setBuchhalterEmailInput(buchhalterAccess.buchhalter_email) }} className="text-slate-400 hover:text-white text-sm px-2">✕</button>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-white text-sm">{buchhalterAccess.buchhalter_email}</span>
            <button onClick={() => { setBuchhalterEmailEditing(true); setBuchhalterEmailInput('') }} className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded hover:bg-slate-700 transition-colors">Ändern</button>
          </div>
        )}
      </div>

      {/* Zugang beendet — reconnect UI */}
      {buchhalterRevoked && (
        <div className="bg-slate-800/30 border border-red-500/20 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-red-400 text-lg">✕</span>
            <div>
              <p className="text-white text-sm font-medium">Zugang beendet</p>
              <p className="text-slate-400 text-xs mt-0.5">
                Der Buchhalter hat keinen Zugriff mehr auf Ihre Daten.
              </p>
            </div>
          </div>
          <button
            onClick={async () => {
              setBuchhalterEmailSaving(true)
              try {
                const { data: { session } } = await supabase.auth.getSession()
                const res = await fetch('/api/buchhalter-access', {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
                  body: JSON.stringify({ buchhalter_email: buchhalterEmailInput.trim() })
                })
                const json = await res.json()
                if (res.ok) { setBuchhalterAccess(json.data); setBuchhalterRevoked(false) }
              } catch (e) { console.error(e) }
              finally { setBuchhalterEmailSaving(false) }
            }}
            disabled={buchhalterEmailSaving}
            className="px-4 py-2 bg-teal-700 hover:bg-teal-600 disabled:opacity-40 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {buchhalterEmailSaving ? '...' : 'Zugang wiederherstellen'}
          </button>
        </div>
      )}

      {/* Buchhalter verbinden — jedno dugme ispod emaila */}
      {buchhalterAccess && !buchhalterEmailEditing && (
        <button
          onClick={() => setBuchhalterInviteOpen(true)}
          className={`w-full text-center px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
            buchhalterAccess.accepted_at
              ? 'bg-teal-700/30 border border-teal-600/40 text-teal-400'
              : buchhalterAccess.invited_at
              ? 'bg-amber-700/20 border border-amber-600/30 text-amber-300 hover:bg-amber-700/30'
              : 'bg-teal-700 hover:bg-teal-600 text-white border border-teal-600'
          }`}
        >
          {buchhalterAccess.accepted_at
            ? `✓ Buchhalter verbunden seit ${new Date(buchhalterAccess.accepted_at).toLocaleDateString('de-DE')}`
            : buchhalterAccess.invited_at
            ? `📧 Einladung gesendet am ${new Date(buchhalterAccess.invited_at).toLocaleDateString('de-DE')}`
            : '🔗 Mit Buchhalter verbinden'}
        </button>
      )}

      {/* Buchhalter-Verbindung Modal */}
      {buchhalterInviteOpen && buchhalterAccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-sm w-full space-y-4">
            <h3 className="text-white font-semibold text-lg">Buchhalter-Verbindung</h3>
            <p className="text-slate-300 text-sm">
              E-Mail: <strong>{buchhalterAccess.buchhalter_email}</strong>
            </p>

            {/* Status */}
            {buchhalterAccess.accepted_at ? (
              <div className="bg-teal-900/20 border border-teal-700/30 rounded-lg p-3">
                <p className="text-teal-400 text-sm font-medium">✓ Verbunden</p>
                <p className="text-slate-400 text-xs mt-1">
                  Ihr Buchhalter hat Portal-Zugang seit {new Date(buchhalterAccess.accepted_at).toLocaleDateString('de-DE')}.
                </p>
              </div>
            ) : buchhalterAccess.invited_at ? (
              <div className="bg-slate-700/30 border border-slate-600/50 rounded-lg p-3">
                <p className="text-slate-300 text-sm font-medium">📧 Einladung gesendet</p>
                <p className="text-slate-400 text-xs mt-1">
                  Gesendet am {new Date(buchhalterAccess.invited_at).toLocaleDateString('de-DE')}. Warten auf Annahme.
                </p>
              </div>
            ) : (
              <div className="bg-slate-700/30 border border-slate-600/50 rounded-lg p-3">
                <p className="text-slate-400 text-sm">
                  Ihr Buchhalter erhält eine E-Mail mit Zugang zu Ihren Finanzdaten.
                </p>
              </div>
            )}

            {/* Feedback */}
            {buchhalterInviteStatus === 'success' && (
              <p className="text-teal-400 text-sm font-medium">✓ Einladung gesendet!</p>
            )}
            {buchhalterInviteStatus === 'resent' && (
              <p className="text-teal-400 text-sm font-medium">✓ Erneut gesendet!</p>
            )}
            {buchhalterInviteStatus === 'already' && (
              <p className="text-amber-400 text-sm">Dieser Buchhalter hat bereits Zugang.</p>
            )}
            {buchhalterInviteStatus === 'error' && (
              <p className="text-red-400 text-sm">Fehler beim Senden. Bitte erneut versuchen.</p>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-2 pt-2">
              {!buchhalterAccess.accepted_at && buchhalterInviteStatus !== 'success' && buchhalterInviteStatus !== 'resent' && (
                <button
                  onClick={async () => {
                    setBuchhalterInviting(true)
                    setBuchhalterInviteStatus(null)
                    try {
                      const { data: { session } } = await supabase.auth.getSession()
                      const res = await fetch('/api/buchhalter-access', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
                        body: JSON.stringify({ buchhalter_email: buchhalterAccess.buchhalter_email })
                      })
                      if (res.status === 409) {
                        setBuchhalterInviteStatus('already')
                      } else if (res.ok) {
                        const json = await res.json()
                        setBuchhalterAccess(json.data)
                        setBuchhalterInviteStatus(buchhalterAccess.invited_at ? 'resent' : 'success')
                        setTimeout(() => { setBuchhalterInviteOpen(false); setBuchhalterInviteStatus(null) }, 1500)
                      } else {
                        setBuchhalterInviteStatus('error')
                      }
                    } catch (e) {
                      console.error(e)
                      setBuchhalterInviteStatus('error')
                    } finally {
                      setBuchhalterInviting(false)
                    }
                  }}
                  disabled={buchhalterInviting}
                  className="w-full px-4 py-2.5 bg-teal-700 hover:bg-teal-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {buchhalterInviting ? 'Wird gesendet...' : buchhalterAccess.invited_at ? 'Erneut senden' : 'Einladung senden'}
                </button>
              )}
              <button
                onClick={() => { setBuchhalterInviteOpen(false); setBuchhalterInviteStatus(null) }}
                className="w-full px-4 py-2 text-sm text-slate-300 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
              >
                Schließen
              </button>
              <button
                onClick={() => { setBuchhalterInviteOpen(false); setBuchhalterRevokeConfirm(true) }}
                className="text-xs text-red-400/60 hover:text-red-400 transition-colors pt-1"
              >
                Zugang beenden
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Revoke Dialog */}
      {buchhalterRevokeConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-sm w-full">
            <h3 className="text-white font-semibold text-lg mb-2">Buchhalter-Zugang beenden?</h3>
            <p className="text-slate-300 text-sm mb-5">
              Möchten Sie den Zugang für <strong>{buchhalterAccess?.buchhalter_email}</strong> wirklich beenden? Der Buchhalter verliert sofort den Zugriff auf Ihre Daten.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setBuchhalterRevokeConfirm(false)}
                className="flex-1 px-4 py-2 text-sm text-slate-300 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={async () => {
                  setBuchhalterRevoking(true)
                  try {
                    const { data: { session } } = await supabase.auth.getSession()
                    const res = await fetch(`/api/buchhalter-access?id=${buchhalterAccess.id}`, {
                      method: 'DELETE',
                      headers: { Authorization: `Bearer ${session.access_token}` }
                    })
                    if (res.ok) {
                      setBuchhalterRevoked(true)
                      setBuchhalterAccess(null)
                      setBuchhalterRevokeConfirm(false)
                      setBuchhalterInviteStatus(null)
                      setBuchhalterInviteOpen(false)
                    }
                  } catch (e) { console.error(e) }
                  finally { setBuchhalterRevoking(false) }
                }}
                disabled={buchhalterRevoking}
                className="flex-1 px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {buchhalterRevoking ? 'Wird beendet...' : 'Ja, beenden'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-800 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('rechnungen')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'rechnungen' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'}`}
        >
          📄 Rechnungen
        </button>
        <button
          onClick={() => setActiveTab('ausgaben')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'ausgaben' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'}`}
        >
          🧾 Ausgaben
        </button>
      </div>

      {activeTab === 'ausgaben' && <AusgabenTab
        ausgaben={ausgaben}
        loading={ausgabenZipLoading}
        ausgabenLoading={ausgabenLoading}
        selected={ausgabenSelected}
        setSelected={setAusgabenSelected}
        month={ausgabenMonth}
        year={ausgabenYear}
        setMonth={setAusgabenMonth}
        setYear={setAusgabenYear}
        zipModal={ausgabenZipModal}
        setZipModal={setAusgabenZipModal}
        zipResult={ausgabenZipResult}
        setZipResult={setAusgabenZipResult}
        zipLoading={ausgabenZipLoading}
        setZipLoading={setAusgabenZipLoading}
        majstor={majstor}
        bookkeeperEmail={bookkeeperSettings.email}
      />}

      {activeTab === 'rechnungen' && (<>

      <div className="grid grid-cols-1 gap-4">
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 max-w-sm">
          <div className="text-2xl mb-2">
            {filters.type === 'invoice' ? '🧾' : filters.type === 'storno' ? '↩️' : '📋'}
          </div>
          <div className="text-white font-semibold">{archivedPDFs.length}</div>
          <div className="text-slate-400 text-sm">
            {filters.type === 'invoice' ? 'Rechnungen' : filters.type === 'storno' ? 'Stornos' : 'Angebote'}
            {filters.dateRange === 'thisMonth' && ' (dieser Monat)'}
            {filters.dateRange === 'lastMonth' && ' (letzter Monat)'}
            {filters.dateRange === 'custom' && ` (${filters.customMonth}/${filters.customYear})`}
            {filters.dateRange === 'year' && ` (${filters.customYear})`}
            {filters.dateRange === 'all' && ' (Alle Jahre)'}
            {filters.status === 'paid' && ' — Bezahlt'}
            {filters.status === 'unpaid' && ' — Offen'}
            {filters.status === 'overdue' && ' — Überfällig'}
            {filters.customer && ` - ${filters.customer}`}
          </div>
        </div>
      </div>

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
              <option value="storno">Stornos</option>
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
              <option value="year">Ganzes Jahr</option>
              <option value="all">Alle Jahre</option>
            </select>
          </div>

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

          {filters.dateRange === 'year' && (
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
          )}

          {filters.type === 'invoice' && (
            <div>
              <label className="block text-sm text-slate-400 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange({ status: e.target.value })}
                className="bg-slate-900/50 border border-slate-600 rounded text-white px-3 py-1 text-sm"
              >
                <option value="">Alle</option>
                <option value="paid">Bezahlt</option>
                <option value="overdue">Überfällig</option>
              </select>
            </div>
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

      {archivedPDFs.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <div className="text-4xl mb-4">📄</div>
          <p>Keine PDFs im Archiv gefunden</p>
          <p className="text-sm mt-2">PDFs werden automatisch gespeichert wenn Sie Rechnungen oder Angebote erstellen</p>
        </div>
      ) : (
        <div className={`grid gap-3 ${selectedPDFs.size > 0 ? 'pb-36 sm:pb-0' : ''}`}>
          {archivedPDFs.map((pdf) => {
            const isOverdue = pdf.type === 'invoice' && ['sent', 'draft'].includes(pdf.status) && pdf.due_date && pdf.due_date < new Date().toISOString().slice(0, 10)
            return (
            <div key={pdf.id} className={`bg-slate-800/50 border rounded-lg p-4 ${isOverdue ? 'border-amber-500/40' : 'border-slate-700'}`}>
              <div className="flex items-center gap-4">
                <input
                  type="checkbox"
                  checked={selectedPDFs.has(pdf.id)}
                  onChange={() => togglePDFSelection(pdf.id)}
                  className="w-4 h-4 text-green-600 bg-slate-700 border-slate-500 rounded focus:ring-green-500"
                />

                <div className="flex items-center gap-2 flex-1">
                  {isOverdue && <span title="Überfällig" className="text-amber-400 text-sm">⚠️</span>}
                  {pdf.status === 'paid' && pdf.type === 'invoice' && <span title="Bezahlt" className="text-green-400 text-sm">✅</span>}
                  <h4 className="text-white font-semibold">
                    {pdf.invoice_number || pdf.quote_number}
                  </h4>
                  {attachmentCounts[pdf.id] > 0 && (
                    <button
                      onClick={() => openAttachmentModal(pdf)}
                      className="flex items-center gap-1 text-slate-400 hover:text-blue-400 text-xs bg-slate-700/60 hover:bg-slate-700 px-2 py-1 rounded transition-colors"
                      title="Anhänge anzeigen"
                    >
                      📎 {attachmentCounts[pdf.id]}
                    </button>
                  )}
                </div>

                <div className="hidden sm:block text-slate-400 flex-1">
                  {pdf.customer_name}
                </div>

                <div className="text-white font-semibold">
                  {formatCurrency(pdf.total_amount)}
                </div>

                <button
                  onClick={() => showDetails(pdf.id)}
                  className="bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 transition-colors"
                >
                  👁️ Ansehen
                </button>
              </div>
            </div>
            )
          })}
        </div>
      )}

      <BulkActionBar />
      <BuchhalterSendModal
        isOpen={bulkEmailModal}
        onClose={() => setBulkEmailModal(false)}
        selectedIds={Array.from(selectedPDFs)}
        majstor={majstor}
        invoices={archivedPDFs}
        periodLabel={getPeriodLabel()}
        buchhalterEmail={buchhalterAccess?.buchhalter_email || ''}
        onEmailSaved={(data) => setBuchhalterAccess(typeof data === 'object' ? data : (prev => prev ? { ...prev, buchhalter_email: data } : { buchhalter_email: data }))}
      />
      <BookkeeperSettingsModal />

      {/* ZIP Download Modal */}
      {bulkZipModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => { if (!bulkZipLoading) { setBulkZipModal(false); setBulkZipResult(null) } }}>
          <div className="bg-slate-800 rounded-xl w-full max-w-sm border border-slate-700" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b border-slate-700">
              <h3 className="text-white font-semibold">📥 ZIP herunterladen</h3>
              {!bulkZipLoading && (
                <button onClick={() => { setBulkZipModal(false); setBulkZipResult(null) }} className="text-slate-400 hover:text-white text-2xl leading-none">×</button>
              )}
            </div>
            <div className="p-4 space-y-3">
              {bulkZipLoading && (
                <div className="flex items-center gap-3 bg-slate-700/40 rounded-lg p-4">
                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin shrink-0" />
                  <span className="text-slate-300 text-sm">ZIP wird erstellt...</span>
                </div>
              )}
              {bulkZipResult && !bulkZipLoading && (
                bulkZipResult.error ? (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                    <span className="text-red-400 text-sm">❌ {bulkZipResult.error}</span>
                  </div>
                ) : (
                  <>
                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 flex items-center gap-2">
                      <span className="text-green-400">✅</span>
                      <span className="text-green-300 text-sm">ZIP erstellt — {bulkZipResult.count} PDFs</span>
                    </div>
                    <button
                      onClick={() => window.open(bulkZipResult.zipUrl, '_blank')}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      📥 ZIP herunterladen
                    </button>
                    {bulkZipResult.skipped > 0 && (
                      <p className="text-slate-500 text-xs text-center">{bulkZipResult.skipped} ohne PDF übersprungen</p>
                    )}
                  </>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* Attachment Mini-Modal */}
      {attachmentModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setAttachmentModal(null)}>
          <div className="bg-slate-800 rounded-xl w-full max-w-sm border border-slate-700" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b border-slate-700">
              <h3 className="text-white font-semibold">📎 Anhänge</h3>
              <button onClick={() => setAttachmentModal(null)} className="text-slate-400 hover:text-white text-2xl leading-none">×</button>
            </div>
            <div className="p-4 space-y-2">
              {attachmentModalLoading ? (
                <p className="text-slate-400 text-sm text-center py-4">Laden...</p>
              ) : attachmentModal.attachments.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-4">Keine Anhänge</p>
              ) : (
                attachmentModal.attachments.map(att => (
                  <button
                    key={att.id}
                    onClick={() => downloadAttachment(att)}
                    className="w-full flex items-center justify-between px-3 py-2 bg-slate-700/60 hover:bg-slate-700 rounded-lg transition-colors text-left"
                  >
                    <span className="text-slate-300 text-sm truncate">{att.filename}</span>
                    <span className="text-blue-400 text-xs ml-2 shrink-0">👁</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>)}
  </div>
  )
}

// Ausgaben tab component
function AusgabenTab({ ausgaben, ausgabenLoading, selected, setSelected, month, year, setMonth, setYear, zipModal, setZipModal, zipResult, setZipResult, zipLoading, setZipLoading, majstor, bookkeeperEmail: initialEmail }) {
  const [email, setEmail] = useState(initialEmail || '')
  const [previewUrl, setPreviewUrl] = useState(null)
  const [previewIsPDF, setPreviewIsPDF] = useState(false)

  async function openPreview(item) {
    const isPDF = item.storage_path?.endsWith('.pdf')
    const { data } = await supabase.storage.from('ausgaben').createSignedUrl(item.storage_path, 300)
    if (!data?.signedUrl) return
    if (isPDF) {
      window.open(data.signedUrl, '_blank')
    } else {
      setPreviewIsPDF(false)
      setPreviewUrl(data.signedUrl)
    }
  }
  const monthNames = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember']

  useEffect(() => {
    if (zipModal) {
      setZipResult(null)
      generateZip()
    }
  }, [zipModal])

  async function generateZip() {
    setZipLoading(true)
    setZipResult(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const businessSlug = (majstor?.business_name || majstor?.full_name || 'Ausgaben').replace(/\s+/g, '_').substring(0, 30)
      const periodLabel = `${monthNames[month]}_${year}`
      const res = await fetch('/api/ausgaben/bulk-zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ ausgabenIds: [...selected], majstorId: majstor.id, zipFilename: `Ausgaben_${periodLabel}_${businessSlug}.zip` })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setZipResult(data)
    } catch (err) {
      alert('Fehler: ' + err.message)
    } finally {
      setZipLoading(false)
    }
  }

  function getEmailBody() {
    const businessName = majstor?.business_name || majstor?.full_name || ''
    const link = zipResult?.shortUrl || zipResult?.zipUrl || ''
    return `Sehr geehrte Damen und Herren,\n\nanbei finden Sie die Ausgabenbelege für ${monthNames[month]} ${year} zum Download:\n\n${link}\n\n(Link gültig 14 Tage)\n\nMit freundlichen Grüßen\n${businessName}`
  }

  return (
    <div className="space-y-4">
      {/* Month filter */}
      <div className="flex gap-3 items-center flex-wrap">
        <select value={month} onChange={e => setMonth(parseInt(e.target.value))}
          className="bg-slate-900/50 border border-slate-600 rounded text-white px-3 py-1 text-sm">
          {monthNames.map((m, i) => <option key={i} value={i}>{m}</option>)}
        </select>
        <select value={year} onChange={e => setYear(parseInt(e.target.value))}
          className="bg-slate-900/50 border border-slate-600 rounded text-white px-3 py-1 text-sm">
          {[year - 1, year, year + 1].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        {ausgaben.length > 0 && (
          <button onClick={() => setSelected(prev => prev.size === ausgaben.length ? new Set() : new Set(ausgaben.map(a => a.id)))}
            className="text-xs text-slate-400 hover:text-white transition-colors">
            {selected.size === ausgaben.length ? 'Alle abwählen' : 'Alle auswählen'}
          </button>
        )}
      </div>

      {/* Grid */}
      {ausgabenLoading ? (
        <div className="text-slate-400 text-sm">Wird geladen...</div>
      ) : ausgaben.length === 0 ? (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 text-center">
          <p className="text-slate-400 text-sm">Keine Ausgaben für {monthNames[month]} {year}.</p>
          <a href="/dashboard/ausgaben" className="text-blue-400 text-xs hover:underline mt-1 block">→ Belege hinzufügen</a>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {ausgaben.map(item => {
            const sel = selected.has(item.id)
            const isPDF = item.storage_path?.endsWith('.pdf')
            return (
              <div key={item.id} className="relative cursor-pointer">
                <div onClick={() => openPreview(item)} className={`aspect-square rounded-lg overflow-hidden border-2 transition-colors ${sel ? 'border-blue-500' : 'border-transparent'} bg-slate-700 flex items-center justify-center`}>
                  {isPDF ? (
                    <div className="flex flex-col items-center justify-center w-full h-full p-2 gap-1">
                      <span className="text-2xl">📄</span>
                      <span className="text-slate-400 text-xs text-center leading-tight line-clamp-2 break-all">{item.filename || 'PDF'}</span>
                    </div>
                  ) : <AusgabeThumbnail path={item.storage_path} />}
                </div>
                <button
                  onClick={e => { e.stopPropagation(); setSelected(prev => { const s = new Set(prev); s.has(item.id) ? s.delete(item.id) : s.add(item.id); return s }) }}
                  className={`absolute top-1 left-1 w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs ${sel ? 'bg-blue-500 border-blue-500 text-white' : 'bg-slate-900/70 border-slate-500'}`}>
                  {sel && '✓'}
                </button>
                <p className="text-slate-500 text-xs mt-1 truncate">{new Date(item.created_at).toLocaleDateString('de-DE')}</p>
              </div>
            )
          })}
        </div>
      )}

      {/* Floating bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
          <div className="bg-slate-800 border border-slate-600 rounded-xl shadow-xl px-4 py-3 flex items-center gap-4">
            <span className="text-white text-sm"><span className="font-semibold">{selected.size}</span> Beleg{selected.size > 1 ? 'e' : ''} ausgewählt</span>
            <button onClick={() => setZipModal(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm transition-colors">
              📤 An Buchhalter senden
            </button>
            <button onClick={() => setSelected(new Set())} className="text-slate-400 hover:text-white text-sm px-2">✕</button>
          </div>
        </div>
      )}

      {/* ZIP modal */}
      {zipModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl w-full max-w-md border border-slate-700">
            <div className="flex justify-between items-center p-5 border-b border-slate-700">
              <h3 className="text-white font-semibold text-lg">📤 Ausgaben senden</h3>
              <button onClick={() => setZipModal(false)} className="text-slate-400 hover:text-white text-2xl leading-none">×</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">E-Mail Buchhalter</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="buchhalter@beispiel.de"
                  className="w-full px-3 py-2 bg-slate-900/60 border border-slate-600 rounded-lg text-white text-sm" />
              </div>
              {zipLoading && (
                <div className="flex items-center gap-3 bg-slate-700/40 rounded-lg p-4">
                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin shrink-0" />
                  <span className="text-slate-300 text-sm">ZIP wird erstellt...</span>
                </div>
              )}
              {zipResult && !zipLoading && (
                <>
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 flex items-center gap-2">
                    <span className="text-green-400">✅</span>
                    <span className="text-green-300 text-sm">ZIP erstellt — {zipResult.count} Belege</span>
                  </div>
                  <div className="space-y-2">
                    <button onClick={() => { const sub = `Ausgaben ${monthNames[month]} ${year} – ${majstor?.business_name || majstor?.full_name || ''}`; setZipModal(false); window.open(`https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(email)}&su=${encodeURIComponent(sub)}&body=${encodeURIComponent(getEmailBody())}`, '_blank') }}
                      disabled={!email} className="hidden sm:flex w-full py-3 bg-red-600/80 hover:bg-red-600 disabled:opacity-40 text-white rounded-lg font-medium transition-colors items-center justify-center gap-2">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
                      In Gmail öffnen
                    </button>
                    <button onClick={() => { const sub = `Ausgaben ${monthNames[month]} ${year} – ${majstor?.business_name || majstor?.full_name || ''}`; setZipModal(false); window.location.href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(sub)}&body=${encodeURIComponent(getEmailBody())}` }}
                      disabled={!email} className="w-full py-3 bg-slate-600 hover:bg-slate-500 disabled:opacity-40 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
                      📧 Im E-Mail-Programm öffnen
                    </button>
                    <button onClick={() => window.open(zipResult.zipUrl, '_blank')} className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg font-medium transition-colors border border-slate-600 flex items-center justify-center gap-2">
                      📥 ZIP herunterladen
                    </button>
                  </div>
                  <p className="text-slate-500 text-xs text-center">Link gültig 14 Tage · {zipResult.count} Dateien</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Image preview modal */}
      {previewUrl && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setPreviewUrl(null)}>
          <button className="absolute top-4 right-4 text-white text-3xl leading-none">×</button>
          <img src={previewUrl} alt="Beleg" className="max-w-full max-h-[90vh] rounded-xl object-contain" onClick={e => e.stopPropagation()} />
        </div>
      )}
    </div>
  )
}

function AusgabeThumbnail({ path }) {
  const [url, setUrl] = useState(null)
  useEffect(() => {
    supabase.storage.from('ausgaben').createSignedUrl(path, 300).then(({ data }) => {
      if (data?.signedUrl) setUrl(data.signedUrl)
    })
  }, [path])
  if (!url) return <div className="w-full h-full bg-slate-600 animate-pulse" />
  return <img src={url} alt="Beleg" className="w-full h-full object-cover" />
}