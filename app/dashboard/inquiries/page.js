'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import InvoiceCreator from '@/app/components/InvoiceCreator'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function InquiriesPage() {
  const [inquiries, setInquiries] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all, new, read, responded, closed
  const [sortBy, setSortBy] = useState('newest') // newest, oldest, priority
  const [selectedInquiry, setSelectedInquiry] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [inquiryImages, setInquiryImages] = useState([])
  const [currentUser, setCurrentUser] = useState(null)

  // Invoice modal states
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [selectedInquiryForInvoice, setSelectedInquiryForInvoice] = useState(null)
  const [invoiceType, setInvoiceType] = useState(null) // null, 'quote', ili 'invoice'
  const [majstor, setMajstor] = useState(null)

  // 🔥 NOVO: Contact question states
  const [showContactQuestion, setShowContactQuestion] = useState(false)
  const [contactMethod, setContactMethod] = useState('') // 'email' ili 'phone'

  const router = useRouter()

  useEffect(() => {
    loadInquiries()
    getCurrentUser()
  }, [filter, sortBy])

  const getCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)
      
      // Load majstor data for InvoiceCreator
      if (user) {
        const { data: majstorData } = await supabase
          .from('majstors')
          .select('*')
          .eq('id', user.id)
          .single()
        
        setMajstor(majstorData)
      }
    } catch (error) {
      console.error('Error getting user:', error)
    }
  }

  // Fallback refresh every 60 seconds - respecting current filters
  useEffect(() => {
    const interval = setInterval(() => {
      loadInquiries()
    }, 60000)
    return () => clearInterval(interval)
  }, [filter, sortBy])

  const loadInquiries = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      let query = supabase
        .from('inquiries')
        .select('*')
        .eq('majstor_id', user.id)

      // Apply filter
      if (filter !== 'all') {
        query = query.eq('status', filter)
      }

      // Apply sorting
      if (sortBy === 'newest') {
        query = query.order('created_at', { ascending: false })
      } else if (sortBy === 'oldest') {
        query = query.order('created_at', { ascending: true })
      } else if (sortBy === 'priority') {
        query = query.order('priority', { ascending: false }).order('created_at', { ascending: false })
      }

      const { data, error } = await query

      if (error) {
        console.error('Error loading inquiries:', error)
      } else {
        setInquiries(data || [])
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadInquiryImages = async (inquiryId) => {
    try {
      const { data, error } = await supabase
        .from('inquiry_images')
        .select('*')
        .eq('inquiry_id', inquiryId)

      if (error) {
        console.error('Error loading images:', error)
      } else {
        setInquiryImages(data || [])
      }
    } catch (error) {
      console.error('Error loading images:', error)
    }
  }

  const updateInquiryStatus = async (inquiryId, newStatus) => {
    try {
      console.log('🔄 Updating inquiry status:', inquiryId, 'to', newStatus)
      
      const response = await fetch('/api/inquiries', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          inquiry_id: inquiryId,
          status: newStatus,
          majstor_id: currentUser.id
        })
      })

      const result = await response.json()

      if (!response.ok) {
        console.error('❌ API error:', result)
        throw new Error(result.error || `HTTP ${response.status}`)
      }

      if (!result.success) {
        throw new Error(result.error || 'Unknown API error')
      }

      console.log('✅ Status updated successfully:', result.inquiry)

      // Update local state
      setInquiries(prev => 
        prev.map(inquiry => 
          inquiry.id === inquiryId 
            ? { ...inquiry, status: newStatus }
            : inquiry
        )
      )
      
      // Update selected inquiry if it's open
      if (selectedInquiry?.id === inquiryId) {
        setSelectedInquiry(prev => ({ ...prev, status: newStatus }))
      }

    } catch (error) {
      console.error('💥 Error updating status:', error)
      alert('Fehler beim Aktualisieren des Status: ' + error.message)
    }
  }

  const setPriority = async (inquiryId, priority) => {
    try {
      console.log('🔄 Updating inquiry priority:', inquiryId, 'to', priority)
      
      const response = await fetch('/api/inquiries', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          inquiry_id: inquiryId,
          priority: priority,
          majstor_id: currentUser.id
        })
      })

      const result = await response.json()

      if (!response.ok) {
        console.error('❌ API error:', result)
        throw new Error(result.error || `HTTP ${response.status}`)
      }

      if (!result.success) {
        throw new Error(result.error || 'Unknown API error')
      }

      console.log('✅ Priority updated successfully:', result.inquiry)

      // Update local state
      setInquiries(prev => 
        prev.map(inquiry => 
          inquiry.id === inquiryId 
            ? { ...inquiry, priority }
            : inquiry
        )
      )
      
      if (selectedInquiry?.id === inquiryId) {
        setSelectedInquiry(prev => ({ ...prev, priority }))
      }

    } catch (error) {
      console.error('💥 Error updating priority:', error)
      alert('Fehler beim Aktualisieren der Priorität: ' + error.message)
    }
  }

  const openInquiryModal = async (inquiry) => {
    setSelectedInquiry(inquiry)
    setShowModal(true)
    await loadInquiryImages(inquiry.id)
    
    // Mark as read if it's new
    if (inquiry.status === 'new') {
      updateInquiryStatus(inquiry.id, 'read')
    }
  }

  const closeModal = () => {
    setShowModal(false)
    setSelectedInquiry(null)
    setInquiryImages([])
    
    // 🔥 NOVO: Reset contact question states
    setShowContactQuestion(false)
    setContactMethod('')
  }

  // Invoice handling functions
  const handleNewInvoiceClick = (inquiry) => {
    console.log('🚀 New Invoice clicked for inquiry:', inquiry.id)
    setSelectedInquiryForInvoice(inquiry)
    setInvoiceType(null)
    setShowInvoiceModal(true)
  }

  const handleInvoiceTypeSelect = (type) => {
    console.log('📄 Invoice type selected:', type)
    setInvoiceType(type)
  }

  const handleInvoiceModalClose = () => {
    setShowInvoiceModal(false)
    setSelectedInquiryForInvoice(null)
    setInvoiceType(null)
  }

  // 🔥 UPDATED: handleInvoiceSuccess sa automatskim zatvaranjem
  const handleInvoiceSuccess = async (createdInvoice) => {
    console.log('✅ Invoice created:', createdInvoice)
    
    // 🔥 AUTOMATIZACIJA: inquiry workflow
    if (selectedInquiryForInvoice?.id) {
      // Ako je status 'read' → promeni na 'responded' 
      if (selectedInquiryForInvoice.status === 'read') {
        console.log('📈 Auto-updating inquiry: read → responded')
        await updateInquiryStatus(selectedInquiryForInvoice.id, 'responded')
      }
      // Ako je status 'responded' → promeni na 'closed'
      else if (selectedInquiryForInvoice.status === 'responded') {
        console.log('📈 Auto-updating inquiry: responded → closed')  
        await updateInquiryStatus(selectedInquiryForInvoice.id, 'closed')
      }
      // Ako je 'new' ili bilo koji drugi → direktno na 'closed' (kompletiran workflow)
      else {
        console.log('📈 Auto-updating inquiry: any → closed (workflow completed)')
        await updateInquiryStatus(selectedInquiryForInvoice.id, 'closed')
      }
    }
    
    // Zatvori modal i idi na invoices page
    handleInvoiceModalClose()
    router.push('/dashboard/invoices')
  }

  const formatInquiryForInvoice = (inquiry) => {
    return {
      name: inquiry.customer_name,
      email: inquiry.customer_email,
      phone: inquiry.customer_phone || '',
      address: ''
    }
  }

  // 🔥 NOVO: Contact handling functions
  const handleContactClick = (method, contactInfo) => {
    // Otvori email/phone kao pre
    if (method === 'email') {
      window.open(`mailto:${contactInfo}?subject=Re: ${selectedInquiry.subject}`, '_blank')
    } else if (method === 'phone') {
      window.open(`tel:${contactInfo}`, '_blank')
    }
    
    // Prikaži pitanje SAMO ako je status 'read' (pročitano)
    if (selectedInquiry.status === 'read') {
      setContactMethod(method)
      setShowContactQuestion(true)
    }
  }

  // 🔥 NOVO: Handler za odgovor na pitanje
  const handleContactConfirmation = async (contacted) => {
    setShowContactQuestion(false)
    setContactMethod('')
    
    if (contacted && selectedInquiry.status === 'read') {
      // Promeni status na 'responded' (odgovoreno)
      await updateInquiryStatus(selectedInquiry.id, 'responded')
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'new': return 'bg-red-500'
      case 'read': return 'bg-yellow-500'
      case 'responded': return 'bg-blue-500'
      case 'closed': return 'bg-green-500'
      default: return 'bg-gray-500'
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'text-red-400'
      case 'high': return 'text-orange-400'
      case 'normal': return 'text-slate-300'
      case 'low': return 'text-slate-500'
      default: return 'text-slate-300'
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const filteredInquiries = inquiries

  const stats = {
    total: inquiries.length,
    new: inquiries.filter(i => i.status === 'new').length,
    read: inquiries.filter(i => i.status === 'read').length,
    responded: inquiries.filter(i => i.status === 'responded').length,
    closed: inquiries.filter(i => i.status === 'closed').length
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
          <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">Kundenanfragen</h1>
          <p className="text-slate-400">
            Verwalten Sie alle Anfragen von Ihren Kunden
          </p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex items-center text-slate-400 hover:text-white transition-colors"
        >
          ← Zurück zum Dashboard
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <div className="text-2xl font-bold text-white">{stats.total}</div>
          <div className="text-sm text-slate-400">Gesamt</div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <div className="text-2xl font-bold text-white">{stats.new}</div>
          </div>
          <div className="text-sm text-slate-400">Neu</div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <div className="text-2xl font-bold text-white">{stats.read}</div>
          </div>
          <div className="text-sm text-slate-400">Gelesen</div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <div className="text-2xl font-bold text-white">{stats.responded}</div>
          </div>
          <div className="text-sm text-slate-400">Beantwortet</div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <div className="text-2xl font-bold text-white">{stats.closed}</div>
          </div>
          <div className="text-sm text-slate-400">Abgeschlossen</div>
        </div>
      </div>

      {/* Filters and Sort */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Alle Status</option>
            <option value="new">Neu</option>
            <option value="read">Gelesen</option>
            <option value="responded">Beantwortet</option>
            <option value="closed">Abgeschlossen</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="newest">Neueste zuerst</option>
            <option value="oldest">Älteste zuerst</option>
            <option value="priority">Nach Priorität</option>
          </select>
        </div>
      </div>

      {/* Inquiries List */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
        {filteredInquiries.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-6xl mb-4">📧</div>
            <h3 className="text-xl font-bold text-white mb-2">Keine Anfragen</h3>
            <p className="text-slate-400">
              {filter === 'all' 
                ? 'Sie haben noch keine Kundenanfragen erhalten.'
                : `Keine Anfragen mit Status "${filter}".`
              }
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-700">


{filteredInquiries.map((inquiry) => (
  <div 
    key={inquiry.id}
    className="p-4 sm:p-6 hover:bg-slate-700/30 transition-colors cursor-pointer"
    onClick={() => openInquiryModal(inquiry)}
  >
    {/* MOBILE: Potpuno odvojeni kontejneri */}
    <div className="block sm:hidden">
      
      {/* KONTEJNER 1: Header sa dot + naslov + prioritet */}
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-3 h-3 rounded-full flex-shrink-0 ${getStatusColor(inquiry.status)}`}></div>
        <h3 className="text-lg font-semibold text-white truncate flex-1">{inquiry.subject}</h3>
        <span className={`text-sm font-medium whitespace-nowrap ${getPriorityColor(inquiry.priority)}`}>
          {inquiry.priority === 'urgent' && '🔥 Urgent'}
          {inquiry.priority === 'high' && '⚠️ Hoch'}
          {inquiry.priority === 'normal' && '📄 Normal'}
          {inquiry.priority === 'low' && '📋 Niedrig'}
        </span>
      </div>
      
      {/* KONTEJNER 2: Kunde info */}
      <div className="text-slate-300 mb-3">
        <strong className="text-white">{inquiry.customer_name}</strong>
        {inquiry.customer_phone && (
          <span className="ml-2 text-slate-400 text-sm">{inquiry.customer_phone}</span>
        )}
      </div>
      
      {/* KONTEJNER 3: Message */}
      <p className="text-slate-400 text-sm mb-3 line-clamp-2">
        {inquiry.message}
      </p>
      
      {/* KONTEJNER 4: Datum i email - VERTIKALNO, ne utiče na dropdown-ove */}
      <div className="mb-4 space-y-1">
        <div className="text-xs text-slate-500">{formatDate(inquiry.created_at)}</div>
        <div className="text-xs text-slate-500 break-all">{inquiry.customer_email}</div>
      </div>
      
      {/* KONTEJNER 5: DROPDOWN-OVI - Potpuno izolovani */}
      <div className="grid grid-cols-2 gap-3">
        <select
          value={inquiry.status}
          onChange={(e) => {
            e.stopPropagation()
            updateInquiryStatus(inquiry.id, e.target.value)
          }}
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="new">Neu</option>
          <option value="read">Gelesen</option>
          <option value="responded">Beantwortet</option>
          <option value="closed">Abgeschlossen</option>
        </select>
        
        <select
          value={inquiry.priority}
          onChange={(e) => {
            e.stopPropagation()
            setPriority(inquiry.id, e.target.value)
          }}
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="low">Niedrig</option>
          <option value="normal">Normal</option>
          <option value="high">Hoch</option>
          <option value="urgent">Urgent</option>
        </select>
      </div>
    </div>

    {/* DESKTOP: Postojeći kod koji funkcioniše */}
    <div className="hidden sm:grid grid-cols-[1fr_auto] gap-4 items-start">
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <div className={`w-3 h-3 rounded-full flex-shrink-0 ${getStatusColor(inquiry.status)}`}></div>
          <h3 className="text-lg font-semibold text-white truncate">{inquiry.subject}</h3>
          <span className={`text-sm font-medium whitespace-nowrap ${getPriorityColor(inquiry.priority)}`}>
             {inquiry.priority === 'urgent' && '🔥 Urgent'}
             {inquiry.priority === 'high' && '⚠️ Hoch'}
             {inquiry.priority === 'normal' && '📄 Normal'}
             {inquiry.priority === 'low' && '📋 Niedrig'}
          </span>
        </div>
        
        <div className="text-slate-300 mb-2">
          <div className="truncate">
            <strong className="text-white">{inquiry.customer_name}</strong>
            {inquiry.customer_phone && (
              <span className="ml-2 text-slate-400 text-sm">{inquiry.customer_phone}</span>
            )}
          </div>
        </div>
        
        <p className="text-slate-400 text-sm mb-3 line-clamp-2">
          {inquiry.message}
        </p>
        
        <div className="flex gap-4 text-xs text-slate-500">
          <span className="truncate">{formatDate(inquiry.created_at)}</span>
          <span className="truncate">{inquiry.customer_email}</span>
        </div>
      </div>
      
      <div className="flex flex-col gap-2 w-36">
        <select
          value={inquiry.status}
          onChange={(e) => {
            e.stopPropagation()
            updateInquiryStatus(inquiry.id, e.target.value)
          }}
          className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="new">Neu</option>
          <option value="read">Gelesen</option>
          <option value="responded">Beantwortet</option>
          <option value="closed">Abgeschlossen</option>
        </select>
        
        <select
          value={inquiry.priority}
          onChange={(e) => {
            e.stopPropagation()
            setPriority(inquiry.id, e.target.value)
          }}
          className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="low">Niedrig</option>
          <option value="normal">Normal</option>
          <option value="high">Hoch</option>
          <option value="urgent">Urgent</option>
        </select>
      </div>
    </div>
  </div>
))}




          </div>
        )}
      </div>

      {/* Modal for detailed view */}
      {showModal && selectedInquiry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">{selectedInquiry.subject}</h2>
              <button
                onClick={closeModal}
                className="text-slate-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>
            
            {/* Customer Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-white">Kundeninformationen</h3>
                <div className="space-y-2 text-slate-300">
                  <p><strong>Name:</strong> {selectedInquiry.customer_name}</p>
                  <p><strong>E-Mail:</strong> {selectedInquiry.customer_email}</p>
                  {selectedInquiry.customer_phone && (
                    <p><strong>Telefon:</strong> {selectedInquiry.customer_phone}</p>
                  )}
                  <p><strong>Datum:</strong> {formatDate(selectedInquiry.created_at)}</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-white">Status & Priorität</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Status</label>
                    <select
                      value={selectedInquiry.status}
                      onChange={(e) => updateInquiryStatus(selectedInquiry.id, e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="new">Neu</option>
                      <option value="read">Gelesen</option>
                      <option value="responded">Beantwortet</option>
                      <option value="closed">Abgeschlossen</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Priorität</label>
                    <select
                      value={selectedInquiry.priority}
                      onChange={(e) => setPriority(selectedInquiry.id, e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="low">Niedrig</option>
                      <option value="normal">Normal</option>
                      <option value="high">Hoch</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                  
                  {/* 🔥 NOVO: Inline Contact Question */}
                  {showContactQuestion && (
                    <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-2xl">
                          {contactMethod === 'email' ? '📧' : '📞'}
                        </span>
                        <div>
                          <p className="text-blue-300 font-medium">
                            Haben Sie den Kunden kontaktiert?
                          </p>
                          <p className="text-blue-200 text-sm">
                            {contactMethod === 'email' ? 'E-Mail gesendet?' : 'Anruf getätigt?'}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleContactConfirmation(true)}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                        >
                          ✅ Ja - Als Beantwortet markieren
                        </button>
                        <button
                          onClick={() => handleContactConfirmation(false)}
                          className="flex-1 bg-slate-600 hover:bg-slate-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                        >
                          ❌ Nein - Als Gelesen lassen
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Message */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-3">Nachricht</h3>
              <div className="bg-slate-900/50 border border-slate-600 rounded-lg p-4">
                <p className="text-slate-300 whitespace-pre-wrap">{selectedInquiry.message}</p>
              </div>
            </div>
            
            {/* Images */}
            {inquiryImages.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-3">Angehängte Bilder</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {inquiryImages.map((image, index) => (
                    <div key={image.id} className="aspect-square">
                      <img 
                        src={image.image_url} 
                        alt={`Bild ${index + 1}`}
                        className="w-full h-full object-cover rounded-lg border border-slate-600 hover:border-blue-500 transition-colors cursor-pointer"
                        onClick={() => window.open(image.image_url, '_blank')}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* 🔥 NOVA ACTION BUTTONS SEKCIJA - koristi handleContactClick umesto direktne linkove */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => handleContactClick('email', selectedInquiry.customer_email)}
                className={`flex items-center justify-center gap-2 px-6 py-3 rounded-lg transition-colors ${
                  selectedInquiry.preferred_contact === 'email' || selectedInquiry.preferred_contact === 'both'
                    ? 'bg-blue-600 text-white hover:bg-blue-700 ring-2 ring-blue-300'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                📧 E-Mail antworten
                {(selectedInquiry.preferred_contact === 'email' || selectedInquiry.preferred_contact === 'both') && (
                  <span className="text-xs bg-white/20 px-2 py-1 rounded-full ml-2">bevorzugt</span>
                )}
              </button>
              
              {selectedInquiry.customer_phone && (
                <button
                  onClick={() => handleContactClick('phone', selectedInquiry.customer_phone)}
                  className={`flex items-center justify-center gap-2 px-6 py-3 rounded-lg transition-colors ${
                    selectedInquiry.preferred_contact === 'phone' || selectedInquiry.preferred_contact === 'both'
                      ? 'bg-green-600 text-white hover:bg-green-700 ring-2 ring-green-300'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  📞 Anrufen
                  {(selectedInquiry.preferred_contact === 'phone' || selectedInquiry.preferred_contact === 'both') && (
                    <span className="text-xs bg-white/20 px-2 py-1 rounded-full ml-2">bevorzugt</span>
                  )}
                </button>
              )}
              
              <button
                onClick={() => handleNewInvoiceClick(selectedInquiry)}
                className="flex items-center justify-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors"
              >
                💼 Rechnung erstellen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Type Selection Modal */}
      {showInvoiceModal && selectedInquiryForInvoice && !invoiceType && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-white mb-4 text-center">
              Was möchten Sie für <span className="text-blue-400">{selectedInquiryForInvoice.customer_name}</span> erstellen?
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

      {/* Invoice Creator Modal */}
      {showInvoiceModal && selectedInquiryForInvoice && invoiceType && majstor && (
        <InvoiceCreator
          isOpen={true}
          onClose={handleInvoiceModalClose}
          type={invoiceType}
          majstor={majstor}
          prefilledCustomer={formatInquiryForInvoice(selectedInquiryForInvoice)}
          onSuccess={handleInvoiceSuccess}
        />
      )}
    </div>
  )
}