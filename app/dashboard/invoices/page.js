'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import InvoiceCreator from '@/app/components/InvoiceCreator'

export default function InvoicesPage() {
  const [activeTab, setActiveTab] = useState('quotes') // quotes, invoices, settings
  const [quotes, setQuotes] = useState([])
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [majstor, setMajstor] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createType, setCreateType] = useState('quote') // quote or invoice
  const router = useRouter()

  useEffect(() => {
    loadMajstorAndData()
  }, [])

  const loadMajstorAndData = async () => {
    try {
      setLoading(true)
      
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        router.push('/login')
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
      // Load quotes (type: 'quote')
      const { data: quotesData, error: quotesError } = await supabase
        .from('invoices')
        .select('*')
        .eq('majstor_id', majstorId)
        .eq('type', 'quote')
        .order('created_at', { ascending: false })

      // Load invoices (type: 'invoice')  
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select('*')
        .eq('majstor_id', majstorId)
        .eq('type', 'invoice')
        .order('created_at', { ascending: false })

      if (!quotesError) setQuotes(quotesData || [])
      if (!invoicesError) setInvoices(invoicesData || [])

    } catch (err) {
      console.error('Error loading invoices:', err)
    }
  }

  // Dodaj nedostajuću funkciju
  const handleCreateSuccess = (newData) => {
    console.log('Created successfully:', newData)
    // Reload data
    if (majstor?.id) {
      loadInvoicesData(majstor.id)
    }
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

  const convertQuoteToInvoice = async (quote) => {
    try {
      // Create invoice from quote
      const invoiceData = {
        ...quote,
        id: undefined, // Remove ID to create new record
        type: 'invoice',
        status: 'draft',
        invoice_number: `RE-${new Date().getFullYear()}-${String(invoices.length + 1).padStart(3, '0')}`,
        issue_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 14 days
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('invoices')
        .insert(invoiceData)
        .select()
        .single()

      if (error) throw error

      // Update quote status to converted
      await supabase
        .from('invoices')
        .update({ status: 'converted', updated_at: new Date().toISOString() })
        .eq('id', quote.id)

      // Reload data
      await loadInvoicesData(majstor.id)
      
      alert('Angebot erfolgreich in Rechnung umgewandelt!')

    } catch (err) {
      console.error('Error converting quote:', err)
      alert('Fehler beim Umwandeln des Angebots')
    }
  }

  const QuotesList = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white">Angebote (Profakture)</h3>
        <button
          onClick={() => {
            setCreateType('quote')
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
              setShowCreateModal(true)
            }}
            className="mt-4 text-blue-400 hover:text-blue-300"
          >
            Erstes Angebot erstellen
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {quotes.map((quote) => (
            <div key={quote.id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="text-white font-semibold text-lg">{quote.quote_number || quote.invoice_number}</h4>
                  <p className="text-slate-400">{quote.customer_name}</p>
                  <p className="text-slate-500 text-sm">{quote.customer_email}</p>
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
                <button className="bg-slate-700 text-white px-3 py-2 rounded text-sm hover:bg-slate-600 transition-colors">
                  📄 PDF ansehen
                </button>
                <button className="bg-slate-700 text-white px-3 py-2 rounded text-sm hover:bg-slate-600 transition-colors">
                  ✏️ Bearbeiten
                </button>
                <button className="bg-slate-700 text-white px-3 py-2 rounded text-sm hover:bg-slate-600 transition-colors">
                  📧 Per E-Mail senden
                </button>
                {quote.status !== 'converted' && (
                  <button
                    onClick={() => convertQuoteToInvoice(quote)}
                    className="bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700 transition-colors"
                  >
                    📄 In Rechnung umwandeln
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const InvoicesList = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white">Rechnungen</h3>
        <button
          onClick={() => {
            setCreateType('invoice')
            setShowCreateModal(true)
          }}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
        >
          + Neue Rechnung
        </button>
      </div>

      {invoices.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <div className="text-4xl mb-4">📋</div>
          <p>Noch keine Rechnungen erstellt</p>
          <p className="text-sm mt-2">Wandeln Sie Angebote in Rechnungen um oder erstellen Sie direkt eine neue Rechnung</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {invoices.map((invoice) => (
            <div key={invoice.id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="text-white font-semibold text-lg">{invoice.invoice_number}</h4>
                  <p className="text-slate-400">{invoice.customer_name}</p>
                  <p className="text-slate-500 text-sm">{invoice.customer_email}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm border ${getStatusColor(invoice.status)}`}>
                  {invoice.status === 'draft' && 'Entwurf'}
                  {invoice.status === 'sent' && 'Gesendet'}
                  {invoice.status === 'paid' && 'Bezahlt'}
                  {invoice.status === 'overdue' && 'Überfällig'}
                  {invoice.status === 'cancelled' && 'Storniert'}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                <div>
                  <span className="text-slate-400">Betrag:</span>
                  <p className="text-white font-semibold">{formatCurrency(invoice.total_amount)}</p>
                </div>
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
                <button className="bg-slate-700 text-white px-3 py-2 rounded text-sm hover:bg-slate-600 transition-colors">
                  📄 PDF ansehen
                </button>
                <button className="bg-slate-700 text-white px-3 py-2 rounded text-sm hover:bg-slate-600 transition-colors">
                  ✏️ Bearbeiten
                </button>
                <button className="bg-slate-700 text-white px-3 py-2 rounded text-sm hover:bg-slate-600 transition-colors">
                  📧 Per E-Mail senden
                </button>
                {invoice.status === 'sent' && (
                  <button
                    onClick={() => {
                      // Mark as paid
                      supabase
                        .from('invoices')
                        .update({ 
                          status: 'paid', 
                          paid_date: new Date().toISOString().split('T')[0],
                          updated_at: new Date().toISOString()
                        })
                        .eq('id', invoice.id)
                        .then(() => loadInvoicesData(majstor.id))
                    }}
                    className="bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700 transition-colors"
                  >
                    ✅ Als bezahlt markieren
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const SettingsTab = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-white">Rechnungseinstellungen</h3>
      
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
        <h4 className="text-white font-semibold mb-4">Firmendaten für Rechnungen</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Firmenname</label>
            <input
              type="text"
              defaultValue={majstor?.business_name || majstor?.full_name}
              className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Steuernummer</label>
            <input
              type="text"
              placeholder="12/345/67890"
              className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">USt-IdNr (optional)</label>
            <input
              type="text"
              placeholder="DE123456789"
              className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white"
            />
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="kleinunternehmer"
              className="mr-2"
            />
            <label htmlFor="kleinunternehmer" className="text-slate-300 text-sm">
              Kleinunternehmer nach §19 UStG (keine Mehrwertsteuer)
            </label>
          </div>
        </div>
      </div>

      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
        <h4 className="text-white font-semibold mb-4">Bankdaten</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">IBAN</label>
            <input
              type="text"
              placeholder="DE89 3704 0044 0532 0130 00"
              className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">BIC</label>
            <input
              type="text"
              placeholder="COBADEFFXXX"
              className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-300 mb-2">Bank</label>
            <input
              type="text"
              placeholder="Commerzbank Berlin"
              className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white"
            />
          </div>
        </div>
      </div>

      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
        <h4 className="text-white font-semibold mb-4">Zahlungsbedingungen</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Standard Zahlungsziel</label>
            <select className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white">
              <option value="14">14 Tage</option>
              <option value="30">30 Tage</option>
              <option value="7">7 Tage</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Angebot gültig für</label>
            <select className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white">
              <option value="30">30 Tage</option>
              <option value="14">14 Tage</option>
              <option value="60">60 Tage</option>
            </select>
          </div>
        </div>
      </div>

      <button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
        Einstellungen speichern
      </button>
    </div>
  )

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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">Rechnungen & Angebote</h1>
          <p className="text-slate-400">
            Erstellen und verwalten Sie Angebote und Rechnungen für Ihre Kunden
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
              <p className="text-slate-400 text-sm">Angebote</p>
              <p className="text-2xl font-bold text-white">{quotes.length}</p>
            </div>
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white">
              📄
            </div>
          </div>
        </div>
        
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Rechnungen</p>
              <p className="text-2xl font-bold text-white">{invoices.length}</p>
            </div>
            <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center text-white">
              📋
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Offene Rechnungen</p>
              <p className="text-2xl font-bold text-white">
                {invoices.filter(inv => inv.status === 'sent').length}
              </p>
            </div>
            <div className="w-10 h-10 bg-yellow-600 rounded-lg flex items-center justify-center text-white">
              ⏰
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
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
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-700">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-300 hover:border-slate-300'
              }`}
            >
              {tab.name}
              {tab.count !== undefined && (
                <span className="ml-2 px-2 py-1 text-xs bg-slate-700 text-slate-300 rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'quotes' && <QuotesList />}
        {activeTab === 'invoices' && <InvoicesList />}
        {activeTab === 'settings' && <SettingsTab />}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <InvoiceCreator
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          type={createType}
          majstor={majstor}
          onSuccess={handleCreateSuccess}
        />
      )}
    </div>
  )
}