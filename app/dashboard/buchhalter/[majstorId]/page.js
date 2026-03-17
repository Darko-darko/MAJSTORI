'use client'
import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function Thumbnail({ url }) {
  if (!url) return <div className="w-full h-full bg-slate-600 animate-pulse" />
  return <img src={url} alt="Beleg" className="w-full h-full object-cover" />
}

function groupByMonth(ausgaben) {
  const groups = {}
  for (const a of ausgaben) {
    const d = new Date(a.created_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
    if (!groups[key]) groups[key] = { key, label, items: [] }
    groups[key].items.push(a)
  }
  return Object.values(groups).sort((a, b) => b.key.localeCompare(a.key))
}

export default function BuchhalterMandantPage({ params }) {
  const { majstorId } = use(params)
  const router = useRouter()

  const [majstorInfo, setMajstorInfo] = useState(null)
  const [invoices, setInvoices] = useState([])
  const [ausgaben, setAusgaben] = useState([])
  const [activeTab, setActiveTab] = useState('rechnungen')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [token, setToken] = useState(null)

  const [ausgabenMonth, setAusgabenMonth] = useState(new Date().getMonth())
  const [ausgabenYear, setAusgabenYear] = useState(new Date().getFullYear())
  const [filters, setFilters] = useState({
    dateRange: 'thisMonth',
    customMonth: new Date().getMonth() + 1,
    customYear: new Date().getFullYear(),
    status: '',
    customer: '',
  })
  const [invoicesLoading, setInvoicesLoading] = useState(false)
  const [ausgabenLoading, setAusgabenLoading] = useState(false)
  const [previewItem, setPreviewItem] = useState(null)
  const [previewBlobUrl, setPreviewBlobUrl] = useState(null)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [zipLoading, setZipLoading] = useState(false)

  useEffect(() => {
    loadData()
  }, [majstorId])

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      // Provjeri da li je buchhalter
      const { data: profile } = await supabase
        .from('majstors')
        .select('role')
        .eq('id', user.id)
        .single()

      if (!profile || profile.role !== 'buchhalter') {
        router.push('/dashboard')
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      setToken(session.access_token)

      // Dohvati majstor info
      const { data: majstorData } = await supabase
        .from('majstors')
        .select('full_name, business_name, city')
        .eq('id', majstorId)
        .single()

      setMajstorInfo(majstorData)

      // Dohvati invoices
      setInvoicesLoading(true)
      const res = await fetch(`/api/buchhalter-archive?majstor_id=${majstorId}&type=invoices`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      })
      const json = await res.json()
      setInvoicesLoading(false)
      if (!res.ok) { setError(json.error || 'Kein Zugang'); return }
      setInvoices(json.data || [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const loadAusgaben = async (month, year) => {
    if (!token) return
    setAusgabenLoading(true)
    try {
      const res = await fetch(`/api/buchhalter-archive?majstor_id=${majstorId}&type=ausgaben&month=${month}&year=${year}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const json = await res.json()
      setAusgaben(json.data || [])
    } catch (e) { console.error(e) }
    finally { setAusgabenLoading(false) }
  }

  useEffect(() => {
    if (activeTab === 'ausgaben' && token) {
      loadAusgaben(ausgabenMonth, ausgabenYear)
    }
  }, [activeTab, ausgabenMonth, ausgabenYear, token])

  const openPDF = (signedUrl) => {
    if (!signedUrl) return
    const tab = window.open('', '_blank')
    if (!tab) { window.open(signedUrl, '_blank'); return }
    tab.document.write(`<!DOCTYPE html><html><head><title>PDF wird geladen…</title>
      <style>*{margin:0;padding:0;box-sizing:border-box}body{background:#0f172a;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif}
      .wrap{text-align:center;color:#94a3b8}.spin{width:44px;height:44px;border:3px solid #1e293b;border-top-color:#14b8a6;border-radius:50%;animation:s .8s linear infinite;margin:0 auto 16px}
      @keyframes s{to{transform:rotate(360deg)}}p{font-size:14px}</style></head>
      <body><div class="wrap"><div class="spin"></div><p>PDF wird geladen…</p></div>
      <script>window.location.href=${JSON.stringify(signedUrl)}</script></body></html>`)
    tab.document.close()
  }

  const formatCurrency = (amount) => amount != null
    ? new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount)
    : '—'

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('de-DE') : '—'

  const typeLabel = (type) => ({ invoice: 'Rechnung', quote: 'Angebot', storno: 'Storno' })[type] || type

  const toggleSelect = (id) => setSelectedIds(prev => {
    const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s
  })

  const toggleGroup = (items) => {
    const ids = items.map(i => i.id)
    const allSel = ids.every(id => selectedIds.has(id))
    setSelectedIds(prev => {
      const s = new Set(prev); ids.forEach(id => allSel ? s.delete(id) : s.add(id)); return s
    })
  }

  const triggerDownload = (url, filename) => {
    const a = document.createElement('a')
    a.href = url; a.download = filename
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
  }

  const downloadSelected = async () => {
    if (!selectedIds.size || !token) return
    setZipLoading(true)
    try {
      if (activeTab === 'rechnungen') {
        if (selectedIds.size >= 10) {
          const res = await fetch('/api/buchhalter-archive', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ type: 'invoices', invoiceIds: [...selectedIds], majstorId })
          })
          const json = await res.json()
          if (json.zipUrl) triggerDownload(json.zipUrl, `Rechnungen_${new Date().toLocaleDateString('de-DE').replace(/\./g, '-')}.zip`)
        } else {
          const items = invoices.filter(i => selectedIds.has(i.id))
          for (const inv of items) {
            if (!inv.signedUrl) continue
            try {
              const res = await fetch(inv.signedUrl)
              const blob = await res.blob()
              const url = URL.createObjectURL(blob)
              const num = inv.invoice_number || inv.quote_number || 'Dok'
              const prefix = inv.type === 'quote' ? 'Angebot' : inv.type === 'storno' ? 'Storno' : 'Rechnung'
              triggerDownload(url, `${prefix}_${num}.pdf`)
              URL.revokeObjectURL(url)
              await new Promise(r => setTimeout(r, 300))
            } catch { /* skip */ }
          }
        }
      } else {
        // ausgaben
        if (selectedIds.size >= 10) {
          const res = await fetch('/api/buchhalter-archive', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ type: 'ausgaben', ausgabenIds: [...selectedIds], majstorId })
          })
          const json = await res.json()
          if (json.zipUrl) triggerDownload(json.zipUrl, `Ausgaben_${new Date().toLocaleDateString('de-DE').replace(/\./g, '-')}.zip`)
        } else {
          const items = ausgaben.filter(a => selectedIds.has(a.id))
          for (const item of items) {
            if (!item.signedUrl) continue
            try {
              const res = await fetch(item.signedUrl)
              const blob = await res.blob()
              const url = URL.createObjectURL(blob)
              triggerDownload(url, item.filename || 'Beleg')
              URL.revokeObjectURL(url)
              await new Promise(r => setTimeout(r, 300))
            } catch { window.open(item.signedUrl, '_blank') }
          }
        }
      }
    } catch (e) { console.error(e) }
    finally { setZipLoading(false) }
  }

  const getSelectedInvoiceStatus = () => {
    const selected = invoices.filter(inv => selectedIds.has(inv.id) && inv.type === 'invoice')
    if (selected.length === 0) return null
    const allPaid = selected.every(inv => inv.status === 'paid')
    const allUnpaid = selected.every(inv => inv.status !== 'paid')
    if (allPaid) return 'paid'
    if (allUnpaid) return 'unpaid'
    return 'mixed'
  }

  const handleBulkTogglePaid = async () => {
    const status = getSelectedInvoiceStatus()
    const selected = invoices.filter(inv => selectedIds.has(inv.id) && inv.type === 'invoice')

    if (status === 'paid') {
      const confirmed = confirm(`${selected.length} Rechnung(en) als offen markieren?`)
      if (!confirmed) return

      try {
        const { data: { session } } = await supabase.auth.getSession()
        const res = await fetch('/api/buchhalter-archive', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`
          },
          body: JSON.stringify({
            majstorId,
            invoiceIds: selected.map(i => i.id),
            action: 'unpaid'
          })
        })
        const result = await res.json()
        if (!res.ok) throw new Error(result.error)
        alert(`${selected.length} Rechnung(en) als offen markiert.`)
        setSelectedIds(new Set())
        loadData()
      } catch (err) {
        alert('Fehler: ' + err.message)
      }
    } else {
      const unpaidIds = selected.filter(inv => inv.status !== 'paid').map(inv => inv.id)
      if (unpaidIds.length === 0) return

      const confirmed = confirm(`${unpaidIds.length} Rechnung(en) als bezahlt markieren?`)
      if (!confirmed) return

      try {
        const { data: { session } } = await supabase.auth.getSession()
        const res = await fetch('/api/buchhalter-archive', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`
          },
          body: JSON.stringify({
            majstorId,
            invoiceIds: unpaidIds,
            action: 'paid'
          })
        })
        const result = await res.json()
        if (!res.ok) throw new Error(result.error)
        alert(`${unpaidIds.length} Rechnung(en) als bezahlt markiert.`)
        setSelectedIds(new Set())
        loadData()
      } catch (err) {
        alert('Fehler: ' + err.message)
      }
    }
  }

  const months = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez']

  // Set of original invoice numbers that have been storno-ed (e.g. STOR-RE-2026-0057 → RE-2026-0057)
  const cancelledNums = new Set(
    invoices
      .filter(i => i.type === 'storno' && i.invoice_number?.startsWith('STOR-'))
      .map(i => i.invoice_number.replace(/^STOR-/, ''))
  )

  const handleFilterChange = (newFilters) => {
    setFilters(prev => {
      if (newFilters.dateRange && newFilters.dateRange !== prev.dateRange) {
        return { ...prev, ...newFilters, customer: '' }
      }
      return { ...prev, ...newFilters }
    })
    setSelectedIds(new Set())
  }

  const getCustomersWithCounts = () => {
    const counts = {}
    for (const inv of invoices) {
      if (inv.customer_name) {
        counts[inv.customer_name] = (counts[inv.customer_name] || 0) + 1
      }
    }
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  const filteredInvoices = invoices.filter(inv => {
    const d = new Date(inv.issue_date || inv.pdf_generated_at)
    if (filters.dateRange === 'thisMonth') {
      const now = new Date()
      if (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) return false
    } else if (filters.dateRange === 'lastMonth') {
      const last = new Date(); last.setMonth(last.getMonth() - 1)
      if (d.getMonth() !== last.getMonth() || d.getFullYear() !== last.getFullYear()) return false
    } else if (filters.dateRange === 'year') {
      if (d.getFullYear() !== filters.customYear) return false
    } else if (filters.dateRange === 'custom') {
      if (d.getMonth() !== filters.customMonth - 1 || d.getFullYear() !== filters.customYear) return false
    }
    if (filters.status === 'paid') {
      if (inv.status !== 'paid' || inv.type !== 'invoice') return false
    } else if (filters.status === 'overdue') {
      const today = new Date().toISOString().slice(0, 10)
      if (!(['sent', 'draft'].includes(inv.status) && inv.type === 'invoice' && inv.due_date && inv.due_date < today)) return false
    }
    if (filters.customer && inv.customer_name !== filters.customer) return false
    return true
  }).sort((a, b) => {
    if (filters.status === 'overdue') {
      return (a.due_date || '').localeCompare(b.due_date || '')
    }
    return (b.issue_date || b.pdf_generated_at || '').localeCompare(a.issue_date || a.pdf_generated_at || '')
  })

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="h-10 w-10 border-[3px] border-slate-600 border-t-teal-500 rounded-full animate-spin" />
    </div>
  )

  if (error) return (
    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
      <p className="text-red-400">{error}</p>
      <button onClick={() => router.push('/dashboard/buchhalter')} className="mt-3 text-slate-400 hover:text-white text-sm">← Zurück</button>
    </div>
  )

  return (
    <>
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div>
        <button onClick={() => router.push('/dashboard/buchhalter')} className="text-slate-400 hover:text-white text-sm mb-3 inline-block">← Zurück</button>
        <h1 className="text-2xl font-bold text-white">
          {majstorInfo?.business_name || majstorInfo?.full_name || 'Auftraggeber'}
        </h1>
        {majstorInfo?.city && <p className="text-slate-400 text-sm">{majstorInfo.city}</p>}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-800/50 rounded-lg p-1 w-fit">
        {['rechnungen', 'ausgaben'].map(tab => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setSelectedIds(new Set()) }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab === 'rechnungen' ? '📄 Rechnungen' : '🧾 Ausgaben'}
          </button>
        ))}
      </div>

      {/* Rechnungen Tab */}
      {activeTab === 'rechnungen' && (
        <div className="space-y-3">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
              <p className="text-slate-400 text-sm">Rechnungen ({new Date().getFullYear()})</p>
              <p className="text-2xl font-bold text-white">
                {invoices.filter(i => i.type !== 'storno' && new Date(i.issue_date || i.pdf_generated_at).getFullYear() === new Date().getFullYear()).length}
              </p>
            </div>
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
              <p className="text-slate-400 text-sm">Bezahlt ({new Date().getFullYear()})</p>
              <p className="text-2xl font-bold text-green-400">
                {invoices.filter(i => i.status === 'paid' && i.type === 'invoice' && new Date(i.issue_date || i.pdf_generated_at).getFullYear() === new Date().getFullYear()).length}
              </p>
            </div>
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
              <p className="text-slate-400 text-sm">Überfällig (Gesamt)</p>
              <p className="text-2xl font-bold text-orange-400">
                {invoices.filter(i => {
                  if (i.type !== 'invoice' || !['sent','draft'].includes(i.status) || !i.due_date) return false
                  return i.due_date < new Date().toISOString().slice(0, 10)
                }).length}
              </p>
            </div>
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
              <p className="text-slate-400 text-sm">Umsatz ({new Date().getFullYear()})</p>
              <p className="text-2xl font-bold text-white">
                {invoices
                  .filter(i => i.status === 'paid' && i.type === 'invoice' && new Date(i.issue_date || i.pdf_generated_at).getFullYear() === new Date().getFullYear())
                  .reduce((sum, i) => sum + (i.total_amount || 0), 0)
                  .toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
              </p>
            </div>
          </div>

          {/* Filtered Summary */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 max-w-sm">
            <div className="text-2xl mb-2">🧾</div>
            <div className="text-white font-semibold">{filteredInvoices.length}</div>
            <div className="text-slate-400 text-sm">
              Rechnungen
              {filters.dateRange === 'thisMonth' && ' (dieser Monat)'}
              {filters.dateRange === 'lastMonth' && ' (letzter Monat)'}
              {filters.dateRange === 'custom' && ` (${filters.customMonth}/${filters.customYear})`}
              {filters.dateRange === 'year' && ` (${filters.customYear})`}
              {filters.dateRange === 'all' && ' (Alle Jahre)'}
              {filters.status === 'paid' && ' — Bezahlt'}
              {filters.status === 'overdue' && ' — Überfällig'}
              {filters.customer && ` — ${filters.customer}`}
            </div>
          </div>

          {/* Filters */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
            <div className="flex flex-wrap gap-4 items-center">
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
                      {['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'].map((m, i) => (
                        <option key={i} value={i + 1}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Jahr</label>
                    <select
                      value={filters.customYear}
                      onChange={(e) => handleFilterChange({ customYear: parseInt(e.target.value) })}
                      className="bg-slate-900/50 border border-slate-600 rounded text-white px-3 py-1 text-sm"
                    >
                      {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i).map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
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
                    {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i).map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              )}

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

              <div>
                <label className="block text-sm text-slate-400 mb-1">Kunde</label>
                <select
                  value={filters.customer}
                  onChange={(e) => handleFilterChange({ customer: e.target.value })}
                  className="bg-slate-900/50 border border-slate-600 rounded text-white px-3 py-1 text-sm w-48"
                >
                  <option value="">Alle Kunden</option>
                  {getCustomersWithCounts().map(c => (
                    <option key={c.name} value={c.name}>{c.name} ({c.count})</option>
                  ))}
                </select>
              </div>

              {filteredInvoices.length > 0 && (
                <div className="ml-auto">
                  <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedIds.size > 0 && filteredInvoices.every(i => selectedIds.has(i.id))}
                      onChange={() => toggleGroup(filteredInvoices)}
                      className="w-4 h-4 text-green-600 bg-slate-700 border-slate-500 rounded"
                    />
                    Alle auswählen ({filteredInvoices.length})
                  </label>
                </div>
              )}
            </div>
          </div>

          {invoicesLoading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 border-[3px] border-slate-600 border-t-teal-500 rounded-full animate-spin" />
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center py-12 text-slate-400">Keine Rechnungen für diesen Zeitraum</div>
          ) : (
            <>
              {filteredInvoices.map(inv => {
                const selected = selectedIds.has(inv.id)
                const isOverdue = inv.type === 'invoice' && ['sent', 'draft'].includes(inv.status) && inv.due_date && inv.due_date < new Date().toISOString().slice(0, 10)
                return (
                  <div
                    key={inv.id}
                    className={`relative border rounded-xl p-4 transition-colors ${selected ? 'border-blue-500 bg-blue-500/10' : isOverdue ? 'border-amber-500/40 hover:border-amber-500/60' : 'border-slate-700 hover:border-slate-600'}`}
                  >
                    {/* Checkbox */}
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleSelect(inv.id) }}
                      className={`absolute top-1/2 -translate-y-1/2 left-3 w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs transition-colors shrink-0 ${selected ? 'bg-blue-500 border-blue-500 text-white' : 'bg-slate-900/70 border-slate-500'}`}
                    >
                      {selected && '✓'}
                    </button>
                    {/* Content */}
                    <div
                      onClick={() => openPDF(inv.signedUrl)}
                      className="pl-8 flex items-center justify-between gap-4 cursor-pointer"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`text-xs px-2 py-0.5 rounded border ${inv.type === 'storno' ? 'border-red-500/50 text-red-400' : 'border-slate-600 text-slate-400'}`}>
                            {typeLabel(inv.type)}
                          </span>
                          {isOverdue && <span title="Überfällig" className="text-amber-400 text-sm">⚠️</span>}
                          {inv.status === 'paid' && inv.type !== 'quote' && <span title="Bezahlt" className="text-green-400 text-sm">✅</span>}
                          <span className={`font-mono text-sm ${cancelledNums.has(inv.invoice_number) ? 'text-red-400 line-through' : 'text-white'}`}>{inv.invoice_number || inv.quote_number || '—'}</span>
                        </div>
                        <p className="text-slate-300 text-sm truncate">{inv.customer_name}</p>
                        <p className="text-slate-500 text-xs">{formatDate(inv.issue_date)}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-white font-semibold">{formatCurrency(inv.total_amount)}</p>
                        <span className="text-teal-400 text-xs">📄 PDF öffnen</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </>
          )}
        </div>
      )}

      {/* Ausgaben Tab */}
      {activeTab === 'ausgaben' && (
        <div className="space-y-4">
          {/* Month picker */}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={ausgabenMonth}
              onChange={e => setAusgabenMonth(parseInt(e.target.value))}
              className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none"
            >
              {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
            <select
              value={ausgabenYear}
              onChange={e => setAusgabenYear(parseInt(e.target.value))}
              className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none"
            >
              {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          {ausgabenLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 border-[3px] border-slate-600 border-t-teal-500 rounded-full animate-spin" />
            </div>
          ) : ausgaben.length === 0 ? (
            <div className="text-center py-12 text-slate-400">Keine Ausgaben für diesen Monat</div>
          ) : groupByMonth(ausgaben).map(group => {
            const allSel = group.items.every(i => selectedIds.has(i.id))
            return (
              <div key={group.key} className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
                  <h2 className="text-white font-semibold text-sm">{group.label}</h2>
                  <button
                    onClick={() => toggleGroup(group.items)}
                    className="text-xs text-slate-400 hover:text-white transition-colors"
                  >
                    {allSel ? 'Alle abwählen' : 'Alle auswählen'}
                  </button>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 p-3">
                  {group.items.map(item => {
                    const isPDF = item.storage_path?.endsWith('.pdf')
                    const selected = selectedIds.has(item.id)
                    return (
                      <div key={item.id} className="relative">
                        <div
                          onClick={async () => {
                            if (isPDF) { window.open(item.signedUrl, '_blank'); return }
                            setPreviewItem(item)
                            setPreviewBlobUrl(null)
                            try {
                              const res = await fetch(item.signedUrl)
                              const blob = await res.blob()
                              setPreviewBlobUrl(URL.createObjectURL(blob))
                            } catch { setPreviewBlobUrl(item.signedUrl) }
                          }}
                          className={`aspect-square rounded-lg overflow-hidden cursor-pointer border-2 bg-slate-700 flex items-center justify-center hover:border-teal-500 transition-colors ${selected ? 'border-blue-500' : 'border-transparent'}`}
                        >
                          {isPDF ? (
                            <div className="flex flex-col items-center justify-center w-full h-full p-2 gap-1">
                              <span className="text-2xl">📄</span>
                              <span className="text-slate-400 text-xs text-center leading-tight line-clamp-2 break-all">
                                {item.filename || 'PDF'}
                              </span>
                            </div>
                          ) : (
                            <Thumbnail url={item.signedUrl} />
                          )}
                        </div>
                        {/* Select checkbox */}
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleSelect(item.id) }}
                          className={`absolute top-1 left-1 w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs transition-colors ${selected ? 'bg-blue-500 border-blue-500 text-white' : 'bg-slate-900/70 border-slate-500'}`}
                        >
                          {selected && '✓'}
                        </button>
                        <p className="text-slate-500 text-xs mt-1 truncate px-0.5">
                          {new Date(item.created_at).toLocaleDateString('de-DE')}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>

    {/* Floating action bar */}
    {selectedIds.size > 0 && (
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60]">
        <div className="bg-slate-800 border border-slate-600 rounded-xl shadow-xl px-4 py-3 flex flex-col gap-2">
          <div className="flex items-center gap-4">
            <span className="text-white text-sm">
              <span className="font-semibold">{selectedIds.size}</span>{' '}
              {activeTab === 'rechnungen'
                ? `Rechnung${selectedIds.size > 1 ? 'en' : ''} ausgewählt`
                : `Beleg${selectedIds.size > 1 ? 'e' : ''} ausgewählt`
              }
            </span>
            {(activeTab !== 'rechnungen' || (filters.dateRange !== 'year' && filters.dateRange !== 'all')) && (
              <button
                onClick={downloadSelected}
                disabled={zipLoading}
                className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors"
              >
                {zipLoading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : '📥'}
                {zipLoading
                  ? (selectedIds.size >= 10 ? 'ZIP wird erstellt...' : 'Wird heruntergeladen...')
                  : (selectedIds.size >= 10 ? 'Als ZIP herunterladen' : 'Herunterladen')
                }
              </button>
            )}
            {activeTab === 'rechnungen' && getSelectedInvoiceStatus() && (
              <button
                onClick={handleBulkTogglePaid}
                className={`text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${
                  getSelectedInvoiceStatus() === 'paid'
                    ? 'bg-slate-600 hover:bg-slate-700'
                    : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                {getSelectedInvoiceStatus() === 'paid' ? '↩️ Als offen' : '💰 Als bezahlt'}
              </button>
            )}
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-slate-400 hover:text-white text-sm px-2 py-2 transition-colors"
            >✕</button>
          </div>
          {activeTab === 'rechnungen' && (filters.dateRange === 'year' || filters.dateRange === 'all') && (
            <p className="text-slate-400 text-xs">ZIP-Download ist nur im Monatsfilter verfügbar.</p>
          )}
        </div>
      </div>
    )}

    {/* Image preview modal */}
    {previewItem && (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => { setPreviewItem(null); if (previewBlobUrl?.startsWith('blob:')) URL.revokeObjectURL(previewBlobUrl); setPreviewBlobUrl(null) }}>
        <div className="max-w-2xl w-full" onClick={e => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-3">
            <span className="text-slate-400 text-sm">{new Date(previewItem.created_at).toLocaleDateString('de-DE')}</span>
            <button onClick={() => { setPreviewItem(null); if (previewBlobUrl?.startsWith('blob:')) URL.revokeObjectURL(previewBlobUrl); setPreviewBlobUrl(null) }} className="text-slate-400 hover:text-white text-2xl leading-none">×</button>
          </div>
          {previewBlobUrl
            ? <img src={previewBlobUrl} alt="Beleg" className="w-full rounded-xl max-h-[70vh] object-contain bg-slate-900" />
            : <div className="w-full h-64 bg-slate-800 rounded-xl flex items-center justify-center">
                <div className="h-8 w-8 border-[3px] border-slate-600 border-t-teal-500 rounded-full animate-spin" />
              </div>
          }
        </div>
      </div>
    )}
    </>
  )
}
