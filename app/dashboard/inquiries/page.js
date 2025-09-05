'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function InquiriesPage() {
  const [inquiries, setInquiries] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all, new, read, responded, closed
  const [sortBy, setSortBy] = useState('newest') // newest, oldest, priority
  const [selectedInquiry, setSelectedInquiry] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [inquiryImages, setInquiryImages] = useState([])
  const [currentUser, setCurrentUser] = useState(null)

  useEffect(() => {
    loadInquiries()
    getCurrentUser()
  }, [filter, sortBy])

  const getCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)
    } catch (error) {
      console.error('Error getting user:', error)
    }
  }

  // Real-time subscription (trenutno isključeno)
  /*
  useEffect(() => {
    let channel = null

    const setupRealtime = () => {
      if (!currentUser) return

      channel = supabase
        .channel('inquiries-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'inquiries',
            filter: `majstor_id=eq.${currentUser.id}`
          },
          (payload) => {
            console.log('Real-time update:', payload)
            loadInquiries()
          }
        )
        .subscribe()
    }

    if (currentUser) {
      setupRealtime()
    }

    // Cleanup function
    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [currentUser])
  */

  // Fallback refresh every 60 seconds - respecting current filters
  useEffect(() => {
    const interval = setInterval(() => {
      // Pozovi loadInquiries bez menjanja filter/sortBy state
      loadInquiries()
    }, 60000) // Povećano na 60 sekundi
    return () => clearInterval(interval)
  }, [filter, sortBy]) // Dodaj dependencies da se restartuje kada se filtri menjaju

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
      const { error } = await supabase
        .from('inquiries')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', inquiryId)

      if (error) {
        console.error('Error updating status:', error)
        alert('Fehler beim Aktualisieren des Status')
      } else {
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
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const setPriority = async (inquiryId, priority) => {
    try {
      const { error } = await supabase
        .from('inquiries')
        .update({ 
          priority,
          updated_at: new Date().toISOString()
        })
        .eq('id', inquiryId)

      if (error) {
        console.error('Error updating priority:', error)
      } else {
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
      }
    } catch (error) {
      console.error('Error:', error)
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
                className="p-6 hover:bg-slate-700/30 transition-colors cursor-pointer"
                onClick={() => openInquiryModal(inquiry)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(inquiry.status)}`}></div>
                      <h3 className="text-lg font-semibold text-white">{inquiry.subject}</h3>
                      <span className={`text-sm font-medium ${getPriorityColor(inquiry.priority)}`}>
                        {inquiry.priority === 'urgent' && '🔥 Urgent'}
                        {inquiry.priority === 'high' && '⚠️ Hoch'}
                        {inquiry.priority === 'normal' && '📝 Normal'}
                        {inquiry.priority === 'low' && '📋 Niedrig'}
                      </span>
                    </div>
                    
                    <div className="text-slate-300 mb-2">
                      <strong>{inquiry.customer_name}</strong>
                      {inquiry.customer_phone && (
                        <span className="ml-4 text-slate-400">📞 {inquiry.customer_phone}</span>
                      )}
                    </div>
                    
                    <p className="text-slate-400 text-sm mb-3 line-clamp-2">
                      {inquiry.message}
                    </p>
                    
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span>📅 {formatDate(inquiry.created_at)}</span>
                      <span>✉️ {inquiry.customer_email}</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-2 ml-4">
                    <select
                      value={inquiry.status}
                      onChange={(e) => {
                        e.stopPropagation()
                        updateInquiryStatus(inquiry.id, e.target.value)
                      }}
                      className="px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                      className="px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
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
            
            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href={`mailto:${selectedInquiry.customer_email}?subject=Re: ${selectedInquiry.subject}`}
                className="flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                📧 E-Mail antworten
              </a>
              
              {selectedInquiry.customer_phone && (
                <a
                  href={`tel:${selectedInquiry.customer_phone}`}
                  className="flex items-center justify-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
                >
                  📞 Anrufen
                </a>
              )}
              
              <Link
                href={`/dashboard/invoices/create?customer_email=${selectedInquiry.customer_email}&customer_name=${selectedInquiry.customer_name}&inquiry_id=${selectedInquiry.id}`}
                className="flex items-center justify-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors"
              >
                💼 Rechnung erstellen
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}