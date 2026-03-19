'use client'
import { useState, useEffect, useRef, use } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { pdfToImages } from '@/lib/pdfToImages'

function AusgabenThumbnail({ storagePath, filename, majstorId, getToken, isPdf }) {
  const [url, setUrl] = useState(null)
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!storagePath) return
    let cancelled = false
    ;(async () => {
      try {
        const t = await getToken()
        const res = await fetch(`/api/buchhalter-archive/sign?majstor_id=${majstorId}&path=${encodeURIComponent(storagePath)}&bucket=ausgaben`, {
          headers: { Authorization: `Bearer ${t}` }
        })
        const { signedUrl } = await res.json()
        if (!cancelled && signedUrl) setUrl(signedUrl)
      } catch { /* skip */ }
    })()
    return () => { cancelled = true }
  }, [storagePath])

  useEffect(() => {
    if (!url || !isPdf || !canvasRef.current) return
    let cancelled = false
    ;(async () => {
      try {
        const pages = await pdfToImages(url, { scale: 1, quality: 0.7, maxPages: 1 })
        if (!cancelled && pages[0] && canvasRef.current) {
          const img = new Image()
          img.onload = () => {
            if (cancelled || !canvasRef.current) return
            const canvas = canvasRef.current
            const ctx = canvas.getContext('2d')
            canvas.width = canvas.offsetWidth * 2
            canvas.height = canvas.offsetHeight * 2
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
          }
          img.src = pages[0]
        }
      } catch { /* fallback — canvas stays empty */ }
    })()
    return () => { cancelled = true }
  }, [url, isPdf])

  if (!url) return <div className="flex items-center justify-center h-full"><div className="h-5 w-5 border-2 border-slate-600 border-t-teal-500 rounded-full animate-spin" /></div>

  if (isPdf) {
    return (
      <div className="relative w-full h-full bg-white flex items-center justify-center">
        <canvas ref={canvasRef} className="w-full h-full object-cover" />
        <div className="absolute bottom-1 left-1 bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">PDF</div>
      </div>
    )
  }

  return <img src={url} alt={filename || 'Beleg'} className="w-full h-full object-cover" />
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
  const searchParams = useSearchParams()

  const [majstorInfo, setMajstorInfo] = useState(null)
  const [invoices, setInvoices] = useState([])
  const [ausgaben, setAusgaben] = useState([])
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'rechnungen')
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
  const [ausgabenUploading, setAusgabenUploading] = useState(false)
  const ausgabenFileRef = useRef(null)
  const [previewItem, setPreviewItem] = useState(null)
  const [previewBlobUrl, setPreviewBlobUrl] = useState(null)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [zipLoading, setZipLoading] = useState(false)

  // AI Scan states
  const [scanningId, setScanningId] = useState(null)
  const [scanResult, setScanResult] = useState(null)
  const [scanEditItem, setScanEditItem] = useState(null)
  const [scanSaving, setScanSaving] = useState(false)
  const [bulkScanning, setBulkScanning] = useState(false)
  const [bulkScanProgress, setBulkScanProgress] = useState({ done: 0, total: 0 })

  useEffect(() => {
    loadData()
    // Silent auto-refresh every 10 minutes (no loading spinner)
    const interval = setInterval(async () => {
      try {
        const t = await getFreshToken()
        const res = await fetch(`/api/buchhalter-archive?majstor_id=${majstorId}&type=invoices`, {
          headers: { Authorization: `Bearer ${t}` }
        })
        const json = await res.json()
        if (res.ok && json.data) setInvoices(json.data)
      } catch { /* silent */ }
    }, 10 * 60 * 1000)
    return () => clearInterval(interval)
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

  // Always get fresh token (session may have refreshed)
  const getFreshToken = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token || token
  }

  const loadAusgaben = async (month, year) => {
    if (!token) return
    setAusgabenLoading(true)
    try {
      const t = await getFreshToken()
      const res = await fetch(`/api/buchhalter-archive?majstor_id=${majstorId}&type=ausgaben&month=${month}&year=${year}`, {
        headers: { Authorization: `Bearer ${t}` }
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

  const openPDF = async (storagePath) => {
    if (!storagePath) return
    const tab = window.open('', '_blank')
    if (!tab) return
    tab.document.write(`<!DOCTYPE html><html><head><title>PDF wird geladen…</title>
      <style>*{margin:0;padding:0;box-sizing:border-box}body{background:#0f172a;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif}
      .wrap{text-align:center;color:#94a3b8}.spin{width:44px;height:44px;border:3px solid #1e293b;border-top-color:#14b8a6;border-radius:50%;animation:s .8s linear infinite;margin:0 auto 16px}
      @keyframes s{to{transform:rotate(360deg)}}p{font-size:14px}</style></head>
      <body><div class="wrap"><div class="spin"></div><p>PDF wird geladen…</p></div></body></html>`)
    tab.document.close()
    try {
      const freshToken = await getFreshToken()
      const res = await fetch(`/api/buchhalter-archive/sign?majstor_id=${majstorId}&path=${encodeURIComponent(storagePath)}`, {
        headers: { Authorization: `Bearer ${freshToken}` }
      })
      const { signedUrl } = await res.json()
      if (signedUrl) tab.location.href = signedUrl
      else { tab.close(); alert('PDF konnte nicht geladen werden.') }
    } catch {
      tab.close()
      alert('Verbindungsfehler beim Laden des PDFs.')
    }
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
      const t = await getFreshToken()
      if (activeTab === 'rechnungen') {
        if (selectedIds.size >= 10) {
          const res = await fetch('/api/buchhalter-archive', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
            body: JSON.stringify({ type: 'invoices', invoiceIds: [...selectedIds], majstorId })
          })
          const json = await res.json()
          if (json.zipUrl) triggerDownload(json.zipUrl, `Rechnungen_${new Date().toLocaleDateString('de-DE').replace(/\./g, '-')}.zip`)
        } else {
          const items = invoices.filter(i => selectedIds.has(i.id))
          for (const inv of items) {
            if (!inv.pdf_storage_path) continue
            try {
              const signRes = await fetch(`/api/buchhalter-archive/sign?majstor_id=${majstorId}&path=${encodeURIComponent(inv.pdf_storage_path)}`, {
                headers: { Authorization: `Bearer ${t}` }
              })
              const { signedUrl } = await signRes.json()
              if (!signedUrl) continue
              const res = await fetch(signedUrl)
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
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
            body: JSON.stringify({ type: 'ausgaben', ausgabenIds: [...selectedIds], majstorId })
          })
          const json = await res.json()
          if (json.zipUrl) triggerDownload(json.zipUrl, `Ausgaben_${new Date().toLocaleDateString('de-DE').replace(/\./g, '-')}.zip`)
        } else {
          const items = ausgaben.filter(a => selectedIds.has(a.id))
          for (const item of items) {
            if (!item.storage_path) continue
            try {
              const signRes = await fetch(`/api/buchhalter-archive/sign?majstor_id=${majstorId}&path=${encodeURIComponent(item.storage_path)}&bucket=ausgaben`, {
                headers: { Authorization: `Bearer ${t}` }
              })
              const { signedUrl } = await signRes.json()
              if (!signedUrl) continue
              const res = await fetch(signedUrl)
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

  // AI Scan functions
  const scanBeleg = async (item) => {
    if (scanningId) return
    setScanningId(item.id)
    setScanResult(null)
    try {
      const ft = await getFreshToken()
      // Get fresh signed URL for the image
      const signRes = await fetch(`/api/buchhalter-archive/sign?majstor_id=${majstorId}&path=${encodeURIComponent(item.storage_path)}&bucket=ausgaben`, {
        headers: { Authorization: `Bearer ${ft}` }
      })
      const { signedUrl } = await signRes.json()
      if (!signedUrl) throw new Error('Bild-URL konnte nicht erstellt werden')

      const isPdf = item.storage_path?.toLowerCase().endsWith('.pdf') || item.filename?.toLowerCase().endsWith('.pdf')
      let scanBody = { ausgabe_id: item.id }

      if (isPdf) {
        const pages = await pdfToImages(signedUrl)
        if (!pages.length) throw new Error('PDF konnte nicht gelesen werden')
        scanBody.image_urls = pages
      } else {
        scanBody.image_url = signedUrl
      }

      const res = await fetch('/api/ausgaben/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ft}` },
        body: JSON.stringify(scanBody)
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Scan fehlgeschlagen')

      setScanResult(json.data)
      setScanEditItem({ ...item, ...json.data })
      // Update local state
      setAusgaben(prev => prev.map(a => a.id === item.id ? { ...a, ...json.data, scanned_at: new Date().toISOString() } : a))
    } catch (err) {
      alert('Scan-Fehler: ' + err.message)
    } finally {
      setScanningId(null)
    }
  }

  const saveScanEdit = async () => {
    if (!scanEditItem) return
    setScanSaving(true)
    try {
      const ft = await getFreshToken()
      const res = await fetch('/api/buchhalter-archive', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ft}` },
        body: JSON.stringify({
          majstorId,
          type: 'ausgabe_scan',
          ausgabeId: scanEditItem.id,
          scanData: {
            vendor: scanEditItem.vendor,
            receipt_date: scanEditItem.receipt_date,
            amount_gross: parseFloat(scanEditItem.amount_gross) || 0,
            amount_net: parseFloat(scanEditItem.amount_net) || 0,
            vat_rate: parseFloat(scanEditItem.vat_rate) ?? 19,
            vat_amount: parseFloat(scanEditItem.vat_amount) || 0,
            category: scanEditItem.category,
            description: scanEditItem.description,
          }
        })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      // Update local state
      setAusgaben(prev => prev.map(a => a.id === scanEditItem.id ? { ...a, ...json.ausgabe } : a))
      setScanEditItem(null)
      setScanResult(null)
    } catch (err) {
      alert('Speichern fehlgeschlagen: ' + err.message)
    } finally {
      setScanSaving(false)
    }
  }

  // Delete ausgaben (buchhalter)
  const deleteAusgaben = async (ids) => {
    if (!ids.length) return
    if (!confirm(`${ids.length} Beleg${ids.length > 1 ? 'e' : ''} löschen?`)) return
    try {
      const ft = await getFreshToken()
      const res = await fetch('/api/buchhalter-archive', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ft}` },
        body: JSON.stringify({ majstorId, ausgabenIds: ids })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setAusgaben(prev => prev.filter(a => !ids.includes(a.id)))
      setSelectedIds(prev => {
        const s = new Set(prev)
        ids.forEach(id => s.delete(id))
        return s
      })
    } catch (err) {
      alert('Löschen fehlgeschlagen: ' + err.message)
    }
  }

  // Upload ausgaben (buchhalter uploading for majstor)
  const compressImage = (file, maxWidth = 1600) => new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      let { width, height } = img
      if (width > maxWidth) { height = Math.round((height * maxWidth) / width); width = maxWidth }
      const canvas = document.createElement('canvas')
      canvas.width = width; canvas.height = height
      canvas.getContext('2d').drawImage(img, 0, 0, width, height)
      canvas.toBlob(resolve, 'image/jpeg', 0.82)
    }
    img.src = URL.createObjectURL(file)
  })

  const handleAusgabenUpload = async (files) => {
    if (!files?.length) return
    setAusgabenUploading(true)
    try {
      const ft = await getFreshToken()
      for (const file of Array.from(files)) {
        const isPDF = file.type === 'application/pdf'
        let uploadBlob = file
        let ext = 'pdf'
        if (!isPDF) {
          uploadBlob = await compressImage(file)
          ext = 'jpg'
        }
        const timestamp = Date.now()
        const path = `${majstorId}/${timestamp}_${Math.random().toString(36).slice(2)}.${ext}`

        // Get signed upload URL from API
        const urlRes = await fetch('/api/buchhalter-archive', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ft}` },
          body: JSON.stringify({ majstorId, type: 'upload_url', path })
        })
        const urlData = await urlRes.json()
        if (!urlRes.ok) { console.error(urlData.error); continue }

        // Upload directly to storage using signed URL
        const uploadRes = await fetch(urlData.signedUrl, {
          method: 'PUT',
          headers: { 'Content-Type': isPDF ? 'application/pdf' : 'image/jpeg' },
          body: uploadBlob
        })
        if (!uploadRes.ok) { console.error('Upload failed'); continue }

        // Create DB record
        await fetch('/api/buchhalter-archive', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ft}` },
          body: JSON.stringify({
            majstorId,
            type: 'upload_ausgabe',
            storage_path: path,
            filename: file.name.replace(/\.[^.]+$/, '') + '.' + ext
          })
        })
      }
      // Refresh list
      await loadAusgaben(ausgabenMonth, ausgabenYear)
    } catch (err) {
      alert('Upload fehlgeschlagen: ' + err.message)
    } finally {
      setAusgabenUploading(false)
      if (ausgabenFileRef.current) ausgabenFileRef.current.value = ''
    }
  }

  // Bulk scan all unscanned ausgaben
  const bulkScanAll = async () => {
    const unscanned = ausgaben.filter(a => !a.scanned_at)
    if (!unscanned.length) { alert('Alle Belege sind bereits gescannt.'); return }
    if (!confirm(`${unscanned.length} Beleg${unscanned.length > 1 ? 'e' : ''} mit KI scannen?`)) return

    setBulkScanning(true)
    setBulkScanProgress({ done: 0, total: unscanned.length })

    for (let i = 0; i < unscanned.length; i++) {
      const item = unscanned[i]
      try {
        const ft = await getFreshToken()
        const signRes = await fetch(`/api/buchhalter-archive/sign?majstor_id=${majstorId}&path=${encodeURIComponent(item.storage_path)}&bucket=ausgaben`, {
          headers: { Authorization: `Bearer ${ft}` }
        })
        const { signedUrl } = await signRes.json()
        if (!signedUrl) continue

        const isPdf = item.storage_path?.toLowerCase().endsWith('.pdf') || item.filename?.toLowerCase().endsWith('.pdf')
        let scanBody = { ausgabe_id: item.id }

        if (isPdf) {
          try {
            const pages = await pdfToImages(signedUrl)
            if (!pages.length) continue
            scanBody.image_urls = pages
          } catch { continue }
        } else {
          scanBody.image_url = signedUrl
        }

        const res = await fetch('/api/ausgaben/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ft}` },
          body: JSON.stringify(scanBody)
        })
        const json = await res.json()
        if (res.ok && json.data) {
          setAusgaben(prev => prev.map(a => a.id === item.id ? { ...a, ...json.data, scanned_at: new Date().toISOString() } : a))
        }
      } catch { /* continue with next */ }
      setBulkScanProgress({ done: i + 1, total: unscanned.length })
    }

    setBulkScanning(false)
  }

  // Excel export grouped by category
  const exportExcel = () => {
    const scanned = ausgaben.filter(a => a.scanned_at)
    if (!scanned.length) { alert('Keine gescannten Belege zum Exportieren.'); return }

    // Group by category
    const groups = {}
    for (const a of scanned) {
      const cat = a.category || 'Sonstiges'
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(a)
    }

    const CATEGORIES_ORDER = ['Material', 'Werkzeug', 'Fahrzeug', 'Büro', 'Versicherung', 'Telefon/Internet', 'Miete', 'Reise', 'Bewirtung', 'Sonstiges']
    const sortedCats = Object.keys(groups).sort((a, b) => {
      const ia = CATEGORIES_ORDER.indexOf(a), ib = CATEGORIES_ORDER.indexOf(b)
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
    })

    // Build CSV with BOM for Excel UTF-8 compatibility
    const sep = ';'
    let csv = '\uFEFF' // BOM
    let grandBrutto = 0, grandNetto = 0, grandVat = 0

    for (const cat of sortedCats) {
      const items = groups[cat]
      csv += `\n${cat}\n`
      csv += `Datum${sep}Händler${sep}Brutto (€)${sep}Netto (€)${sep}MwSt-Satz${sep}MwSt (€)${sep}Beschreibung${sep}Dateiname\n`

      let catBrutto = 0, catNetto = 0, catVat = 0
      for (const a of items) {
        const brutto = parseFloat(a.amount_gross) || 0
        const netto = parseFloat(a.amount_net) || 0
        const vat = parseFloat(a.vat_amount) || 0
        catBrutto += brutto
        catNetto += netto
        catVat += vat

        const datum = a.receipt_date ? new Date(a.receipt_date + 'T00:00:00').toLocaleDateString('de-DE') : ''
        const vendor = (a.vendor || '').replace(/;/g, ',')
        const desc = (a.description || '').replace(/;/g, ',')
        const fname = (a.filename || '').replace(/;/g, ',')
        csv += `${datum}${sep}${vendor}${sep}${brutto.toFixed(2).replace('.', ',')}${sep}${netto.toFixed(2).replace('.', ',')}${sep}${a.vat_rate != null ? a.vat_rate : 19}%${sep}${vat.toFixed(2).replace('.', ',')}${sep}${desc}${sep}${fname}\n`
      }

      csv += `${sep}Summe ${cat}${sep}${catBrutto.toFixed(2).replace('.', ',')}${sep}${catNetto.toFixed(2).replace('.', ',')}${sep}${sep}${catVat.toFixed(2).replace('.', ',')}${sep}${sep}\n`
      grandBrutto += catBrutto
      grandNetto += catNetto
      grandVat += catVat
    }

    csv += `\n${sep}GESAMT${sep}${grandBrutto.toFixed(2).replace('.', ',')}${sep}${grandNetto.toFixed(2).replace('.', ',')}${sep}${sep}${grandVat.toFixed(2).replace('.', ',')}${sep}${sep}\n`

    const monthName = months[ausgabenMonth]
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Ausgaben_${majstorInfo?.business_name || 'Mandant'}_${monthName}_${ausgabenYear}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // DATEV Buchungsstapel (EXTF) export
  const exportDATEV = () => {
    const scanned = ausgaben.filter(a => a.scanned_at)
    if (!scanned.length) { alert('Keine gescannten Belege zum Exportieren.'); return }

    // SKR03 Kontenrahmen mapping
    const SKR03 = {
      'Material': { konto: 3400, label: 'Wareneingang' },
      'Werkzeug': { konto: 4980, label: 'Sonstige betriebliche Aufwendungen' },
      'Fahrzeug': { konto: 4530, label: 'Kfz-Kosten' },
      'Büro': { konto: 4930, label: 'Bürobedarf' },
      'Versicherung': { konto: 4360, label: 'Versicherungen' },
      'Telefon/Internet': { konto: 4920, label: 'Telefon' },
      'Miete': { konto: 4210, label: 'Miete' },
      'Reise': { konto: 4660, label: 'Reisekosten' },
      'Bewirtung': { konto: 4650, label: 'Bewirtungskosten' },
      'Sonstiges': { konto: 4900, label: 'Sonstige betriebliche Aufwendungen' },
    }

    const GEGENKONTO = 1200 // Bank (SKR03)

    // BU-Schlüssel for VAT rates
    const buSchluessel = (rate) => {
      const r = rate != null ? parseFloat(rate) : 19
      if (r === 19) return 9
      if (r === 7) return 8
      return 0
    }

    const sep = ';'
    const monthName = months[ausgabenMonth]

    // DATEV EXTF header lines
    let csv = '\uFEFF' // BOM
    // Header line 1: EXTF metadata
    csv += `"EXTF"${sep}700${sep}21${sep}"Buchungsstapel"${sep}7${sep}""${sep}""${sep}""${sep}""${sep}""${sep}${ausgabenYear}0101${sep}${sep}""${sep}""${sep}""${sep}""${sep}0${sep}""${sep}""${sep}""${sep}""${sep}""${sep}""${sep}""${sep}""${sep}""${sep}""${sep}""${sep}""${sep}""${sep}\n`

    // Header line 2: Column names
    csv += `Umsatz (ohne Soll/Haben-Kz)${sep}Soll/Haben-Kennzeichen${sep}WKZ Umsatz${sep}Kurs${sep}Basis-Umsatz${sep}WKZ Basis-Umsatz${sep}Konto${sep}Gegenkonto (ohne BU)${sep}BU-Schlüssel${sep}Belegdatum${sep}Belegfeld 1${sep}Belegfeld 2${sep}Skonto${sep}Buchungstext${sep}Postensperre${sep}Diverse Adressnummer${sep}Geschäftspartnerbank${sep}Sachverhalt${sep}Zinssperre${sep}Beleglink${sep}Beleginfo - Art 1${sep}Beleginfo - Inhalt 1${sep}Beleginfo - Art 2${sep}Beleginfo - Inhalt 2${sep}Beleginfo - Art 3${sep}Beleginfo - Inhalt 3${sep}Beleginfo - Art 4${sep}Beleginfo - Inhalt 4${sep}Beleginfo - Art 5${sep}Beleginfo - Inhalt 5${sep}Beleginfo - Art 6${sep}Beleginfo - Inhalt 6${sep}Beleginfo - Art 7${sep}Beleginfo - Inhalt 7${sep}Beleginfo - Art 8${sep}Beleginfo - Inhalt 8${sep}KOST1 - Kostenstelle${sep}KOST2 - Kostenstelle${sep}Kost-Menge${sep}EU-Land u. UStID${sep}EU-Steuersatz${sep}Abw. Versteuerungsart${sep}Sachverhalt L+L${sep}Funktionsergänzung L+L${sep}BU 49 Hauptfunktionstyp${sep}BU 49 Hauptfunktionsnummer${sep}BU 49 Funktionsergänzung${sep}Zusatzinformation - Art 1${sep}Zusatzinformation- Inhalt 1${sep}Zusatzinformation - Art 2${sep}Zusatzinformation- Inhalt 2${sep}Zusatzinformation - Art 3${sep}Zusatzinformation- Inhalt 3${sep}Zusatzinformation - Art 4${sep}Zusatzinformation- Inhalt 4${sep}Zusatzinformation - Art 5${sep}Zusatzinformation- Inhalt 5${sep}Zusatzinformation - Art 6${sep}Zusatzinformation- Inhalt 6${sep}Zusatzinformation - Art 7${sep}Zusatzinformation- Inhalt 7${sep}Zusatzinformation - Art 8${sep}Zusatzinformation- Inhalt 8${sep}Zusatzinformation - Art 9${sep}Zusatzinformation- Inhalt 9${sep}Zusatzinformation - Art 10${sep}Zusatzinformation- Inhalt 10${sep}Zusatzinformation - Art 11${sep}Zusatzinformation- Inhalt 11${sep}Zusatzinformation - Art 12${sep}Zusatzinformation- Inhalt 12${sep}Zusatzinformation - Art 13${sep}Zusatzinformation- Inhalt 13${sep}Zusatzinformation - Art 14${sep}Zusatzinformation- Inhalt 14${sep}Zusatzinformation - Art 15${sep}Zusatzinformation- Inhalt 15${sep}Zusatzinformation - Art 16${sep}Zusatzinformation- Inhalt 16${sep}Zusatzinformation - Art 17${sep}Zusatzinformation- Inhalt 17${sep}Zusatzinformation - Art 18${sep}Zusatzinformation- Inhalt 18${sep}Zusatzinformation - Art 19${sep}Zusatzinformation- Inhalt 19${sep}Zusatzinformation - Art 20${sep}Zusatzinformation- Inhalt 20${sep}Stück${sep}Gewicht${sep}Zahlweise${sep}Forderungsart${sep}Veranlagungsjahr${sep}Zugeordnete Fälligkeit${sep}Skontotyp${sep}Auftragsnummer${sep}Buchungstyp${sep}USt-Schlüssel (Anzahlungen)${sep}EU-Land (Anzahlungen)${sep}Sachverhalt L+L (Anzahlungen)${sep}EU-Steuersatz (Anzahlungen)${sep}Erlöskonto (Anzahlungen)${sep}Herkunft-Kz${sep}Buchungs GUID${sep}KOST-Datum${sep}SEPA-Mandatsreferenz${sep}Skontosperre${sep}Gesellschaftername${sep}Beteiligtennummer${sep}Identifikationsnummer${sep}Zeichnernummer${sep}Postensperre bis${sep}Bezeichnung SoBil-Sachverhalt${sep}Kennzeichen SoBil-Buchung${sep}Festschreibung${sep}Leistungsdatum${sep}Datum Zuord. Steuerperiode${sep}Fälligkeit${sep}Generalumkehr (GU)${sep}Steuersatz${sep}Land\n`

    // Data rows
    for (const a of scanned) {
      const brutto = parseFloat(a.amount_gross) || 0
      const cat = a.category || 'Sonstiges'
      const kontoInfo = SKR03[cat] || SKR03['Sonstiges']
      const bu = buSchluessel(a.vat_rate)
      const vendor = (a.vendor || '').replace(/"/g, '""')
      const desc = (a.description || '').replace(/"/g, '""')
      const buchungstext = vendor ? `${vendor}${desc ? ' - ' + desc : ''}` : desc || cat

      // Belegdatum: DDMM format (no year, no separators)
      let belegdatum = ''
      if (a.receipt_date) {
        const d = new Date(a.receipt_date + 'T00:00:00')
        const dd = String(d.getDate()).padStart(2, '0')
        const mm = String(d.getMonth() + 1).padStart(2, '0')
        belegdatum = dd + mm
      }

      // Umsatz with comma decimal
      const umsatz = brutto.toFixed(2).replace('.', ',')

      // Build row — only fill required fields, rest empty
      const row = [
        umsatz,           // Umsatz
        '"S"',            // Soll (expense = debit)
        '"EUR"',          // WKZ
        '',               // Kurs
        '',               // Basis-Umsatz
        '',               // WKZ Basis-Umsatz
        kontoInfo.konto,  // Konto (Aufwandskonto)
        GEGENKONTO,       // Gegenkonto (Bank)
        bu,               // BU-Schlüssel
        belegdatum,       // Belegdatum DDMM
        `"${a.filename || ''}"`, // Belegfeld 1
        '',               // Belegfeld 2
        '',               // Skonto
        `"${buchungstext}"`, // Buchungstext (max 60 chars)
      ]

      // Pad remaining columns with empty values (DATEV expects 116 columns total)
      while (row.length < 116) row.push('')
      csv += row.join(sep) + '\n'
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Buchhaltung_Export_${majstorInfo?.business_name || 'Mandant'}_${monthName}_${ausgabenYear}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const SCAN_CATEGORIES = ['Material', 'Werkzeug', 'Fahrzeug', 'Büro', 'Versicherung', 'Telefon/Internet', 'Miete', 'Reise', 'Bewirtung', 'Sonstiges']

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
    // Überfällig: filter by due_date month instead of issue_date
    const d = filters.status === 'overdue' && inv.due_date
      ? new Date(inv.due_date)
      : new Date(inv.issue_date || inv.pdf_generated_at)
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
      const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' })
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
    <div className="pb-20">
      {/* Back button */}
      <button onClick={() => router.push('/dashboard/buchhalter')} className="text-slate-400 hover:text-white text-sm mb-4 inline-block">← Zurück</button>

      {/* Main layout: sidebar + content */}
      <div className="flex flex-col lg:flex-row gap-6 min-h-[60vh]">
        {/* Left sidebar — company info + tabs */}
        <div className="w-full lg:w-64 shrink-0 space-y-4">
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <h1 className="text-lg font-bold text-white leading-tight">
              {majstorInfo?.business_name || majstorInfo?.full_name || 'Auftraggeber'}
            </h1>
            {majstorInfo?.city && <p className="text-slate-400 text-sm mt-1">{majstorInfo.city}</p>}
          </div>

          {/* Tabs */}
          <div className="flex lg:flex-col gap-1 bg-slate-800/50 rounded-xl p-1">
            {['rechnungen', 'ausgaben'].map(tab => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setSelectedIds(new Set()); const url = new URL(window.location); url.searchParams.set('tab', tab); window.history.replaceState({}, '', url) }}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                  activeTab === tab ? 'bg-teal-600/20 text-teal-400 border border-teal-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-700/50 border border-transparent'
                }`}
              >
                {tab === 'rechnungen' ? '📄 Rechnungen' : '🧾 Ausgaben'}
              </button>
            ))}
          </div>
        </div>

        {/* Right content area */}
        <div className="flex-1 min-w-0 space-y-4">

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
                  return i.due_date < new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' })
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
                const isOverdue = inv.type === 'invoice' && ['sent', 'draft'].includes(inv.status) && inv.due_date && inv.due_date < new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' })
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
                      onClick={() => openPDF(inv.pdf_storage_path)}
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
                        <p className="text-slate-500 text-xs">{formatDate(inv.issue_date)}{isOverdue && inv.due_date && <span className="text-amber-400"> · Fällig: {formatDate(inv.due_date)}</span>}</p>
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
          {/* Toolbar — scanner style */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <h2 className="text-white font-semibold text-lg">{majstorInfo?.business_name || majstorInfo?.full_name || 'Auftraggeber'}</h2>
              <select
                value={ausgabenMonth}
                onChange={e => setAusgabenMonth(parseInt(e.target.value))}
                className="bg-slate-800 border border-slate-600 rounded-lg px-2 py-1 text-white text-sm focus:outline-none focus:border-teal-500"
              >
                {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
              <select
                value={ausgabenYear}
                onChange={e => setAusgabenYear(parseInt(e.target.value))}
                className="bg-slate-800 border border-slate-600 rounded-lg px-2 py-1 text-white text-sm focus:outline-none focus:border-teal-500"
              >
                {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <input
                ref={ausgabenFileRef}
                type="file"
                accept="image/*,application/pdf"
                multiple
                className="hidden"
                onChange={e => { handleAusgabenUpload(e.target.files); }}
              />
              {ausgaben.some(a => !a.scanned_at) && (
                <button
                  onClick={bulkScanAll}
                  disabled={bulkScanning || !!scanningId}
                  className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition-colors"
                >
                  {bulkScanning ? (
                    <><span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> {bulkScanProgress.done}/{bulkScanProgress.total}</>
                  ) : (
                    <><img src="/robot.png" alt="KI" className="w-4 h-4" /> Alle scannen</>
                  )}
                </button>
              )}
              {ausgaben.some(a => a.scanned_at) && (<>
                <button onClick={exportExcel} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition-colors">
                  📊 Excel
                </button>
                <button onClick={exportDATEV} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition-colors">
                  📁 Buchhaltung-Export
                </button>
              </>)}
              {selectedIds.size > 0 && (
                <button onClick={() => deleteAusgaben([...selectedIds])} className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition-colors">
                  🗑️ {selectedIds.size} löschen
                </button>
              )}
            </div>
          </div>

          {/* Bulk scan progress bar */}
          {bulkScanning && (
            <div className="bg-slate-800 border border-violet-500/30 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-violet-400 text-sm font-medium">KI-Scan läuft...</span>
                <span className="text-slate-400 text-sm">{bulkScanProgress.done} / {bulkScanProgress.total}</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div
                  className="bg-violet-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${bulkScanProgress.total ? (bulkScanProgress.done / bulkScanProgress.total * 100) : 0}%` }}
                />
              </div>
            </div>
          )}

          {/* Dashed border content area — like scanner */}
          <div className="min-h-[300px] border-2 border-dashed rounded-2xl p-4 border-slate-700 hover:border-slate-600 transition-colors">
          {ausgabenLoading ? (
              <div className="flex items-center justify-center h-40">
                <div className="h-8 w-8 border-[3px] border-slate-600 border-t-teal-500 rounded-full animate-spin" />
              </div>
            ) : ausgaben.length === 0 ? (
              <div
                onClick={() => ausgabenFileRef.current?.click()}
                className="flex flex-col items-center justify-center py-16 cursor-pointer hover:bg-slate-800/30 rounded-xl transition-colors"
              >
                {ausgabenUploading ? (
                  <>
                    <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="text-slate-400 text-sm">Wird hochgeladen...</p>
                  </>
                ) : (
                  <>
                    <svg className="w-10 h-10 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ color: '#94a3b8' }}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13" /></svg>
                    <p className="text-slate-300 text-lg font-medium mb-2">Keine Ausgaben</p>
                    <p className="text-slate-500 text-sm">Klicken zum Hochladen — JPG, PNG oder PDF</p>
                  </>
                )}
              </div>
            ) : groupByMonth(ausgaben).map((group, gi) => {
            const allSel = group.items.every(i => selectedIds.has(i.id))
            return (
              <div key={group.key} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-white font-semibold text-sm">{group.label}</h2>
                  <button
                    onClick={() => toggleGroup(group.items)}
                    className="text-xs text-slate-400 hover:text-white transition-colors"
                  >
                    {allSel ? 'Alle abwählen' : 'Alle auswählen'}
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {group.items.map(item => {
                    const isPDF = item.storage_path?.endsWith('.pdf')
                    const selected = selectedIds.has(item.id)
                    const isScanned = !!item.scanned_at
                    const isScanning = scanningId === item.id
                    return (
                      <div key={item.id} className={`bg-slate-800/80 border rounded-xl overflow-hidden transition-all ${
                        selected ? 'border-teal-500 ring-1 ring-teal-500/30' : 'border-slate-700 hover:border-slate-600'
                      }`}>
                        {/* Thumbnail */}
                        <div
                          className="relative aspect-[3/4] bg-slate-900 cursor-pointer"
                          onClick={async () => {
                            try {
                              const ft = await getFreshToken()
                              const signRes = await fetch(`/api/buchhalter-archive/sign?majstor_id=${majstorId}&path=${encodeURIComponent(item.storage_path)}&bucket=ausgaben`, {
                                headers: { Authorization: `Bearer ${ft}` }
                              })
                              const { signedUrl: freshUrl } = await signRes.json()
                              if (!freshUrl) return
                              if (isPDF) { window.open(freshUrl, '_blank'); return }
                              setPreviewItem(item)
                              setPreviewBlobUrl(null)
                              const res = await fetch(freshUrl)
                              const blob = await res.blob()
                              setPreviewBlobUrl(URL.createObjectURL(blob))
                            } catch { /* skip */ }
                          }}
                        >
                          <AusgabenThumbnail storagePath={item.storage_path} filename={item.filename} majstorId={majstorId} getToken={getFreshToken} isPdf={isPDF} />
                          {/* Select checkbox — top left */}
                          <div className="absolute top-2 left-2 z-10" onClick={e => { e.stopPropagation(); toggleSelect(item.id) }}>
                            <div className={`w-6 h-6 rounded border-2 flex items-center justify-center cursor-pointer transition-colors shadow-sm ${
                              selected ? 'bg-teal-500 border-teal-500 text-white' : 'border-slate-400 bg-slate-900/60 hover:border-slate-300'
                            }`}>
                              {selected && <span className="text-xs font-bold">✓</span>}
                            </div>
                          </div>
                          {/* Scan status badge — bottom right (only when scanned) */}
                          {isScanned && (
                            <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-md bg-green-500 text-white text-xs font-medium shadow-sm">
                              ✓
                            </div>
                          )}
                        </div>
                        {/* Info */}
                        <div className="p-2 space-y-1.5">
                          <p className="text-white text-xs truncate" title={item.filename}>{item.filename}</p>
                          {item.uploaded_by && item.uploaded_by !== majstorId && (
                            <span className="text-[9px] bg-teal-500/20 text-teal-400 px-1.5 py-0.5 rounded">Vom Buchhalter</span>
                          )}
                          {isScanned ? (
                            <div className="space-y-0.5">
                              <p className="text-teal-400 text-xs font-medium truncate">{item.vendor}</p>
                              <p className="text-white text-xs font-bold">{parseFloat(item.amount_gross).toFixed(2).replace('.', ',')} €</p>
                              {item.receipt_date && <p className="text-slate-400 text-[10px]">{new Date(item.receipt_date + 'T00:00:00').toLocaleDateString('de-DE')}</p>}
                              <button
                                onClick={(e) => { e.stopPropagation(); setScanEditItem({ ...item }); setScanResult(item) }}
                                className="text-slate-400 hover:text-white text-xs underline"
                              >
                                Bearbeiten
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={(e) => { e.stopPropagation(); scanBeleg(item) }}
                              disabled={isScanning || !!scanningId}
                              className="w-full py-1 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1 bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-50"
                            >
                              {isScanning ? (
                                <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <><img src="/robot.png" alt="KI" className="w-3.5 h-3.5" /> Scannen</>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  {/* Upload card — last item in newest group */}
                  {gi === 0 && (
                    <div
                      onClick={() => ausgabenFileRef.current?.click()}
                      className="border-2 border-dashed border-slate-500 hover:border-teal-500 rounded-xl flex flex-col items-center justify-center min-h-[200px] gap-3 px-2 cursor-pointer transition-colors"
                    >
                      {ausgabenUploading ? (
                        <>
                          <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                          <span className="text-slate-400 text-xs">Hochladen...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ color: '#94a3b8' }}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13" /></svg>
                          <span className="text-slate-400 text-xs text-center">Beleg hinzufügen</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
          </div>{/* /dashed border */}
        </div>
      )}

        </div>{/* /flex-1 content */}
      </div>{/* /flex container */}
    </div>{/* /pb-20 */}

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
            {activeTab === 'ausgaben' && (
              <button
                onClick={() => deleteAusgaben([...selectedIds])}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors"
              >
                🗑️ Löschen
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

    {/* Scan Edit Modal */}
    {scanEditItem && (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => { setScanEditItem(null); setScanResult(null) }}>
        <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-md p-5 space-y-4" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between">
            <h3 className="text-white font-semibold text-lg flex items-center gap-2"><img src="/robot.png" alt="KI" className="w-7 h-7" /> KI-Scan Ergebnis</h3>
            <button onClick={() => { setScanEditItem(null); setScanResult(null) }} className="text-slate-400 hover:text-white text-xl">×</button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-slate-400 text-xs mb-1">Händler</label>
              <input
                type="text"
                value={scanEditItem.vendor || ''}
                onChange={e => setScanEditItem(prev => ({ ...prev, vendor: e.target.value }))}
                className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 text-xs mb-1">Brutto (€)</label>
                <input
                  type="number"
                  step="0.01"
                  value={scanEditItem.amount_gross || ''}
                  onChange={e => {
                    const gross = parseFloat(e.target.value) || 0
                    const rate = parseFloat(scanEditItem.vat_rate) ?? 19
                    const net = rate === 0 ? gross : Math.round(gross / (1 + rate / 100) * 100) / 100
                    const vat = rate === 0 ? 0 : Math.round((gross - net) * 100) / 100
                    setScanEditItem(prev => ({ ...prev, amount_gross: e.target.value, amount_net: net, vat_amount: vat }))
                  }}
                  className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 text-xs mb-1">Netto (€)</label>
                <input
                  type="number"
                  step="0.01"
                  value={scanEditItem.amount_net || ''}
                  readOnly
                  className="w-full bg-slate-900/30 border border-slate-700 rounded-lg px-3 py-2 text-slate-400 text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 text-xs mb-1">MwSt-Satz (%)</label>
                <select
                  value={scanEditItem.vat_rate != null ? scanEditItem.vat_rate : 19}
                  onChange={e => {
                    const rate = parseFloat(e.target.value)
                    const gross = parseFloat(scanEditItem.amount_gross) || 0
                    const net = rate === 0 ? gross : Math.round(gross / (1 + rate / 100) * 100) / 100
                    const vat = rate === 0 ? 0 : Math.round((gross - net) * 100) / 100
                    setScanEditItem(prev => ({ ...prev, vat_rate: rate, amount_net: net, vat_amount: vat }))
                  }}
                  className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500"
                >
                  <option value="19">19%</option>
                  <option value="16">16%</option>
                  <option value="13">13%</option>
                  <option value="10">10%</option>
                  <option value="7">7%</option>
                  <option value="5">5%</option>
                  <option value="0">0%</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-400 text-xs mb-1">MwSt (€)</label>
                <input
                  type="number"
                  step="0.01"
                  value={scanEditItem.vat_amount || ''}
                  readOnly
                  className="w-full bg-slate-900/30 border border-slate-700 rounded-lg px-3 py-2 text-slate-400 text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 text-xs mb-1">Datum</label>
                <input
                  type="date"
                  value={scanEditItem.receipt_date || ''}
                  onChange={e => setScanEditItem(prev => ({ ...prev, receipt_date: e.target.value }))}
                  className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 text-xs mb-1">Kategorie</label>
                <select
                  value={scanEditItem.category || 'Sonstiges'}
                  onChange={e => setScanEditItem(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500"
                >
                  {SCAN_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-slate-400 text-xs mb-1">Beschreibung</label>
              <input
                type="text"
                value={scanEditItem.description || ''}
                onChange={e => setScanEditItem(prev => ({ ...prev, description: e.target.value }))}
                className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500"
                placeholder="z.B. Schrauben, Dübel, Silikon"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => { setScanEditItem(null); setScanResult(null) }}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2.5 rounded-lg text-sm transition-colors"
            >
              Abbrechen
            </button>
            <button
              onClick={saveScanEdit}
              disabled={scanSaving}
              className="flex-1 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white py-2.5 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors"
            >
              {scanSaving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : '💾'}
              Speichern
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Image preview modal */}
    {previewItem && (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 cursor-pointer" onClick={() => { setPreviewItem(null); if (previewBlobUrl?.startsWith('blob:')) URL.revokeObjectURL(previewBlobUrl); setPreviewBlobUrl(null) }}>
        <div className="max-w-2xl w-full" onClick={e => e.stopPropagation()}>
          {previewBlobUrl
            ? <img src={previewBlobUrl} alt="Beleg" className="w-full rounded-xl max-h-[70vh] object-contain bg-slate-900" />
            : <div className="w-full h-64 bg-slate-800 rounded-xl flex items-center justify-center">
                <div className="h-8 w-8 border-[3px] border-slate-600 border-t-teal-500 rounded-full animate-spin" />
              </div>
          }
          <p className="text-slate-400 text-sm text-center mt-2">{previewItem.filename}</p>
        </div>
      </div>
    )}
    </>
  )
}
