'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const SCAN_CATEGORIES = ['Material', 'Werkzeug', 'Fahrzeug', 'Büro', 'Versicherung', 'Telefon/Internet', 'Miete', 'Reise', 'Bewirtung', 'Sonstiges']
const months = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez']

const SCANNER_TESTERS = ['2f9f6665-3524-44a6-9a74-215571ad5690', 'd9a02afc-1508-4e36-8a26-e53aa9bf7dc8']

const PRICING_PLANS = [
  { name: 'Mini', scans: 500, price: '15', color: 'slate' },
  { name: 'Pro', scans: 1000, price: '20', color: 'blue', popular: true },
  { name: 'Pro+', scans: 3000, price: '35', color: 'violet' },
  { name: 'Max', scans: 5000, price: '60', color: 'amber' },
  { name: 'Ultra', scans: 10000, price: '100', color: 'teal' },
]

export default function BuchhalterScanner() {
  const router = useRouter()
  const fileInputRef = useRef(null)

  // Auth
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)

  // Folders
  const [folders, setFolders] = useState([])
  const [selectedFolder, setSelectedFolder] = useState(null)
  const [newFolderName, setNewFolderName] = useState('')
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [renamingFolder, setRenamingFolder] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const [deletingFolder, setDeletingFolder] = useState(null)

  // Belege
  const [belege, setBelege] = useState([])
  const [loadingBelege, setLoadingBelege] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({ done: 0, total: 0 })
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  // Scan
  const [scanCount, setScanCount] = useState(0)
  const [scanLimit, setScanLimit] = useState(500)
  const [scanningId, setScanningId] = useState(null)
  const [bulkScanning, setBulkScanning] = useState(false)
  const [bulkScanProgress, setBulkScanProgress] = useState({ done: 0, total: 0 })
  const [scanEditItem, setScanEditItem] = useState(null)
  const [scanResult, setScanResult] = useState(null)

  // Drag & drop
  const [dragging, setDragging] = useState(false)

  // Selection for bulk ops
  const [selectedIds, setSelectedIds] = useState(new Set())

  // Modals
  const [showPricing, setShowPricing] = useState(false)
  const [previewImage, setPreviewImage] = useState(null)

  // Init
  useEffect(() => {
    initAuth()
  }, [])

  const initAuth = async () => {
    const { data: { user: u } } = await supabase.auth.getUser()
    if (!u) { router.push('/login'); return }
    if (!SCANNER_TESTERS.includes(u.id)) { router.push('/dashboard/buchhalter'); return }
    const { data: { session } } = await supabase.auth.getSession()
    setUser(u)
    setToken(session?.access_token)
    loadFolders(session?.access_token)
  }

  const authHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  }), [token])

  // ---- FOLDERS ----
  const loadFolders = async (tkn) => {
    try {
      const res = await fetch('/api/buchhalter-scanner', {
        headers: { Authorization: `Bearer ${tkn || token}` }
      })
      const data = await res.json()
      if (data.folders) setFolders(data.folders)
      if (data.scan_count !== undefined) setScanCount(data.scan_count)
      if (data.scan_limit) setScanLimit(data.scan_limit)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const createFolder = async () => {
    if (!newFolderName.trim()) return
    setCreatingFolder(true)
    try {
      const res = await fetch('/api/buchhalter-scanner', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ action: 'create_folder', name: newFolderName.trim() })
      })
      const data = await res.json()
      if (data.folder) {
        setFolders(prev => [...prev, { ...data.folder, beleg_count: 0 }].sort((a, b) => a.name.localeCompare(b.name)))
        setNewFolderName('')
      }
    } catch (e) { console.error(e) }
    finally { setCreatingFolder(false) }
  }

  const renameFolder = async (id) => {
    if (!renameValue.trim()) return
    try {
      await fetch('/api/buchhalter-scanner', {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ folder_id: id, name: renameValue.trim() })
      })
      setFolders(prev => prev.map(f => f.id === id ? { ...f, name: renameValue.trim() } : f))
      setRenamingFolder(null)
    } catch (e) { console.error(e) }
  }

  const deleteFolder = async (id) => {
    try {
      await fetch(`/api/buchhalter-scanner?folder_id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      setFolders(prev => prev.filter(f => f.id !== id))
      if (selectedFolder?.id === id) {
        setSelectedFolder(null)
        setBelege([])
      }
      setDeletingFolder(null)
    } catch (e) { console.error(e) }
  }

  const selectFolder = (folder) => {
    setSelectedFolder(folder)
    setSelectedIds(new Set())
    loadBelege(folder.id)
  }

  // ---- BELEGE ----
  const loadBelege = async (folderId, m, y) => {
    setLoadingBelege(true)
    try {
      const mo = m || selectedMonth
      const yr = y || selectedYear
      const res = await fetch(`/api/buchhalter-scanner?folder_id=${folderId}&month=${mo}&year=${yr}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.belege) setBelege(data.belege)
      if (data.scan_count !== undefined) setScanCount(data.scan_count)
    } catch (e) { console.error(e) }
    finally { setLoadingBelege(false) }
  }

  const handleMonthChange = (m, y) => {
    setSelectedMonth(m)
    setSelectedYear(y)
    if (selectedFolder) loadBelege(selectedFolder.id, m, y)
  }

  // Upload files
  const handleFileUpload = async (files) => {
    if (!selectedFolder || !files?.length) return
    setUploading(true)
    setUploadProgress({ done: 0, total: files.length })

    const newBelege = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const ext = file.name.split('.').pop().toLowerCase()
      const allowed = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf']
      if (!allowed.includes(ext)) continue

      const path = `${user.id}/${selectedFolder.id}/${Date.now()}_${file.name}`
      const { error } = await supabase.storage.from('buchhalter-belege').upload(path, file)
      if (error) { console.error('Upload error:', error); continue }

      const res = await fetch('/api/buchhalter-scanner', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          action: 'save_beleg',
          folder_id: selectedFolder.id,
          storage_path: path,
          filename: file.name,
          file_type: file.type,
          month: selectedMonth,
          year: selectedYear
        })
      })
      const data = await res.json()
      if (data.beleg) newBelege.push(data.beleg)
      setUploadProgress({ done: i + 1, total: files.length })
    }

    setBelege(prev => [...newBelege, ...prev])
    setFolders(prev => prev.map(f => f.id === selectedFolder.id ? { ...f, beleg_count: (f.beleg_count || 0) + newBelege.length } : f))
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    const files = e.dataTransfer?.files
    if (files?.length) handleFileUpload(Array.from(files))
  }

  // Delete belege
  const deleteBelege = async (ids) => {
    const idsArray = Array.isArray(ids) ? ids : [ids]
    try {
      await fetch(`/api/buchhalter-scanner?beleg_ids=${idsArray.join(',')}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      setBelege(prev => prev.filter(b => !idsArray.includes(b.id)))
      setSelectedIds(new Set())
      setFolders(prev => prev.map(f => f.id === selectedFolder?.id ? { ...f, beleg_count: Math.max(0, (f.beleg_count || 0) - idsArray.length) } : f))
    } catch (e) { console.error(e) }
  }

  // ---- SCAN ----
  const getImageUrl = async (storagePath) => {
    const { data } = await supabase.storage.from('buchhalter-belege').createSignedUrl(storagePath, 300)
    return data?.signedUrl
  }

  const scanBeleg = async (beleg) => {
    if (scanCount >= scanLimit) { setShowPricing(true); return }
    setScanningId(beleg.id)
    try {
      const imageUrl = await getImageUrl(beleg.storage_path)
      if (!imageUrl) { alert('Bild konnte nicht geladen werden'); return }

      const res = await fetch('/api/buchhalter-scanner', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ action: 'scan', image_url: imageUrl, beleg_id: beleg.id })
      })
      const data = await res.json()
      if (data.limit_reached) { setShowPricing(true); return }
      if (data.success) {
        setBelege(prev => prev.map(b => b.id === beleg.id ? { ...b, ...data.data, scanned_at: new Date().toISOString() } : b))
        setScanCount(data.scan_count)
        setScanEditItem({ ...beleg, ...data.data, scanned_at: new Date().toISOString() })
        setScanResult(data.data)
      } else {
        alert(data.error || 'Scan fehlgeschlagen')
      }
    } catch (e) { console.error(e); alert('Scan fehlgeschlagen') }
    finally { setScanningId(null) }
  }

  const bulkScanAll = async () => {
    const unscanned = belege.filter(b => !b.scanned_at && !b.file_type?.includes('pdf'))
    if (!unscanned.length) return
    if (scanCount >= scanLimit) { setShowPricing(true); return }

    setBulkScanning(true)
    setBulkScanProgress({ done: 0, total: unscanned.length })

    for (let i = 0; i < unscanned.length; i++) {
      if (scanCount + i >= scanLimit) { setShowPricing(true); break }
      const b = unscanned[i]
      try {
        const imageUrl = await getImageUrl(b.storage_path)
        if (!imageUrl) continue

        const res = await fetch('/api/buchhalter-scanner', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ action: 'scan', image_url: imageUrl, beleg_id: b.id })
        })
        const data = await res.json()
        if (data.limit_reached) { setShowPricing(true); break }
        if (data.success) {
          setBelege(prev => prev.map(x => x.id === b.id ? { ...x, ...data.data, scanned_at: new Date().toISOString() } : x))
          setScanCount(data.scan_count)
        }
      } catch (e) { console.error(e) }
      setBulkScanProgress({ done: i + 1, total: unscanned.length })
    }
    setBulkScanning(false)
  }

  const saveScanEdit = async (beleg, updates) => {
    try {
      await fetch('/api/buchhalter-scanner', {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ beleg_id: beleg.id, ...updates })
      })
      setBelege(prev => prev.map(b => b.id === beleg.id ? { ...b, ...updates } : b))
      setScanEditItem(null)
      setScanResult(null)
    } catch (e) { console.error(e) }
  }

  // ---- EXPORTS ----
  const exportExcel = () => {
    const scanned = belege.filter(b => b.scanned_at)
    if (!scanned.length) { alert('Keine gescannten Belege zum Exportieren.'); return }

    const groups = {}
    for (const b of scanned) {
      const cat = b.category || 'Sonstiges'
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(b)
    }

    const ORDER = ['Material', 'Werkzeug', 'Fahrzeug', 'Büro', 'Versicherung', 'Telefon/Internet', 'Miete', 'Reise', 'Bewirtung', 'Sonstiges']
    const sortedCats = Object.keys(groups).sort((a, b) => {
      const ia = ORDER.indexOf(a), ib = ORDER.indexOf(b)
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
    })

    const sep = ';'
    let csv = '\uFEFF'
    let grandBrutto = 0, grandNetto = 0, grandVat = 0

    for (const cat of sortedCats) {
      const items = groups[cat]
      csv += `\n${cat}\n`
      csv += `Datum${sep}Händler${sep}Brutto (€)${sep}Netto (€)${sep}MwSt-Satz${sep}MwSt (€)${sep}Beschreibung${sep}Dateiname\n`
      let catB = 0, catN = 0, catV = 0
      for (const b of items) {
        const brutto = parseFloat(b.amount_gross) || 0, netto = parseFloat(b.amount_net) || 0, vat = parseFloat(b.vat_amount) || 0
        catB += brutto; catN += netto; catV += vat
        const datum = b.receipt_date ? new Date(b.receipt_date + 'T00:00:00').toLocaleDateString('de-DE') : ''
        csv += `${datum}${sep}${(b.vendor||'').replace(/;/g,',')}${sep}${brutto.toFixed(2).replace('.',',')}${sep}${netto.toFixed(2).replace('.',',')}${sep}${b.vat_rate||19}%${sep}${vat.toFixed(2).replace('.',',')}${sep}${(b.description||'').replace(/;/g,',')}${sep}${(b.filename||'').replace(/;/g,',')}\n`
      }
      csv += `${sep}Summe ${cat}${sep}${catB.toFixed(2).replace('.',',')}${sep}${catN.toFixed(2).replace('.',',')}${sep}${sep}${catV.toFixed(2).replace('.',',')}${sep}${sep}\n`
      grandBrutto += catB; grandNetto += catN; grandVat += catV
    }
    csv += `\n${sep}GESAMT${sep}${grandBrutto.toFixed(2).replace('.',',')}${sep}${grandNetto.toFixed(2).replace('.',',')}${sep}${sep}${grandVat.toFixed(2).replace('.',',')}${sep}${sep}\n`

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Ausgaben_${selectedFolder?.name || 'Export'}_${months[selectedMonth-1]}_${selectedYear}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportDATEV = () => {
    const scanned = belege.filter(b => b.scanned_at)
    if (!scanned.length) { alert('Keine gescannten Belege zum Exportieren.'); return }

    const SKR03 = {
      'Material': { konto: 3400 }, 'Werkzeug': { konto: 4980 }, 'Fahrzeug': { konto: 4530 },
      'Büro': { konto: 4930 }, 'Versicherung': { konto: 4360 }, 'Telefon/Internet': { konto: 4920 },
      'Miete': { konto: 4210 }, 'Reise': { konto: 4660 }, 'Bewirtung': { konto: 4650 }, 'Sonstiges': { konto: 4900 },
    }
    const GEGENKONTO = 1200
    const buSchluessel = (rate) => { const r = parseFloat(rate) || 19; if (r === 19) return 9; if (r === 7) return 8; return 0 }

    const sep = ';'
    let csv = '\uFEFF'
    csv += `"EXTF"${sep}700${sep}21${sep}"Buchungsstapel"${sep}7${sep}""${sep}""${sep}""${sep}""${sep}""${sep}${selectedYear}0101${sep}${sep}""${sep}""${sep}""${sep}""${sep}0${sep}""${sep}""${sep}""${sep}""${sep}""${sep}""${sep}""${sep}""${sep}""${sep}""${sep}""${sep}""${sep}""${sep}\n`
    csv += `Umsatz (ohne Soll/Haben-Kz)${sep}Soll/Haben-Kennzeichen${sep}WKZ Umsatz${sep}Kurs${sep}Basis-Umsatz${sep}WKZ Basis-Umsatz${sep}Konto${sep}Gegenkonto (ohne BU)${sep}BU-Schlüssel${sep}Belegdatum${sep}Belegfeld 1${sep}Belegfeld 2${sep}Skonto${sep}Buchungstext\n`

    for (const b of scanned) {
      const brutto = parseFloat(b.amount_gross) || 0
      const cat = b.category || 'Sonstiges'
      const kontoInfo = SKR03[cat] || SKR03['Sonstiges']
      const bu = buSchluessel(b.vat_rate)
      const vendor = (b.vendor || '').replace(/"/g, '""')
      const desc = (b.description || '').replace(/"/g, '""')
      const buchungstext = vendor ? `${vendor}${desc ? ' - ' + desc : ''}` : desc || cat
      let belegdatum = ''
      if (b.receipt_date) {
        const d = new Date(b.receipt_date + 'T00:00:00')
        belegdatum = String(d.getDate()).padStart(2, '0') + String(d.getMonth() + 1).padStart(2, '0')
      }
      const row = [brutto.toFixed(2).replace('.',','), '"S"', '"EUR"', '', '', '', kontoInfo.konto, GEGENKONTO, bu, belegdatum, `"${b.filename || ''}"`, '', '', `"${buchungstext}"`]
      while (row.length < 116) row.push('')
      csv += row.join(sep) + '\n'
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Buchhaltung_Export_${selectedFolder?.name || 'Export'}_${months[selectedMonth-1]}_${selectedYear}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ---- RENDER ----
  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="h-10 w-10 border-[3px] border-slate-600 border-t-teal-500 rounded-full animate-spin" /></div>
  }

  const isLimitReached = scanCount >= scanLimit
  const unscannedCount = belege.filter(b => !b.scanned_at).length
  const scannedCount = belege.filter(b => b.scanned_at).length

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/dashboard/buchhalter')} className="text-slate-400 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <img src="/robot.png" alt="KI" className="w-8 h-8" /> Beleg-Scanner
            </h1>
          </div>
          <p className="text-slate-400 text-sm mt-1 ml-8">Belege hochladen, scannen und exportieren</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Scan counter */}
          <div
            className={`px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer transition-colors ${isLimitReached ? 'bg-red-500/20 border border-red-500/40 text-red-400' : 'bg-slate-800 border border-slate-700 text-slate-300'}`}
            onClick={() => isLimitReached && setShowPricing(true)}
          >
            {isLimitReached && <span className="mr-1">🔒</span>}
            {scanCount} / {scanLimit} Scans
          </div>
        </div>
      </div>

      <div className="flex gap-6 min-h-[60vh]">
        {/* Sidebar — Folders */}
        <div className="w-64 shrink-0 space-y-3">
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 space-y-3">
            <h3 className="text-white font-semibold text-sm">Firmen / Mandanten</h3>

            {/* New folder */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && createFolder()}
                placeholder="Neue Firma..."
                className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-1.5 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-teal-500"
              />
              <button
                onClick={createFolder}
                disabled={creatingFolder || !newFolderName.trim()}
                className="bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              >
                +
              </button>
            </div>

            {/* Folder list */}
            <div className="space-y-1 max-h-[50vh] overflow-y-auto">
              {folders.length === 0 && (
                <p className="text-slate-500 text-xs text-center py-4">Erstellen Sie einen Ordner für Ihre erste Firma</p>
              )}
              {folders.map(f => (
                <div key={f.id} className="group">
                  {renamingFolder === f.id ? (
                    <div className="flex gap-1">
                      <input
                        type="text"
                        value={renameValue}
                        onChange={e => setRenameValue(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') renameFolder(f.id); if (e.key === 'Escape') setRenamingFolder(null) }}
                        className="flex-1 bg-slate-900 border border-teal-500 rounded px-2 py-1 text-white text-sm focus:outline-none"
                        autoFocus
                      />
                      <button onClick={() => renameFolder(f.id)} className="text-teal-400 hover:text-teal-300 text-xs px-1">✓</button>
                      <button onClick={() => setRenamingFolder(null)} className="text-slate-400 hover:text-white text-xs px-1">✕</button>
                    </div>
                  ) : (
                    <div
                      className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                        selectedFolder?.id === f.id ? 'bg-teal-600/20 border border-teal-500/40 text-teal-300' : 'hover:bg-slate-700/50 text-slate-300'
                      }`}
                      onClick={() => selectFolder(f)}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-lg">📁</span>
                        <span className="text-sm truncate">{f.name}</span>
                        {f.beleg_count > 0 && <span className="text-xs text-slate-500">({f.beleg_count})</span>}
                      </div>
                      <div className="hidden group-hover:flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        <button onClick={() => { setRenamingFolder(f.id); setRenameValue(f.name) }} className="text-slate-400 hover:text-white text-xs p-1" title="Umbenennen">✏️</button>
                        <button onClick={() => setDeletingFolder(f)} className="text-slate-400 hover:text-red-400 text-xs p-1" title="Löschen">🗑️</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 space-y-4">
          {!selectedFolder ? (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-12 text-center">
              <div className="text-5xl mb-4">📁</div>
              <h3 className="text-white font-semibold text-lg mb-2">Firma auswählen</h3>
              <p className="text-slate-400 text-sm">Wählen Sie links eine Firma aus oder erstellen Sie eine neue, um Belege hochzuladen.</p>
            </div>
          ) : (
            <>
              {/* Toolbar */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <h2 className="text-white font-semibold text-lg">{selectedFolder.name}</h2>
                  {/* Month picker */}
                  <select
                    value={selectedMonth}
                    onChange={e => handleMonthChange(parseInt(e.target.value), selectedYear)}
                    className="bg-slate-800 border border-slate-600 rounded-lg px-2 py-1 text-white text-sm focus:outline-none focus:border-teal-500"
                  >
                    {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                  </select>
                  <select
                    value={selectedYear}
                    onChange={e => handleMonthChange(selectedMonth, parseInt(e.target.value))}
                    className="bg-slate-800 border border-slate-600 rounded-lg px-2 py-1 text-white text-sm focus:outline-none focus:border-teal-500"
                  >
                    {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Upload button */}
                  <label className="bg-teal-600 hover:bg-teal-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer transition-colors flex items-center gap-1.5">
                    📎 Hochladen
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={e => handleFileUpload(Array.from(e.target.files))}
                    />
                  </label>
                  {/* Bulk scan */}
                  {unscannedCount > 0 && !isLimitReached && (
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
                  {unscannedCount > 0 && isLimitReached && (
                    <button onClick={() => setShowPricing(true)} className="bg-red-500/20 border border-red-500/40 text-red-400 px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5">
                      🔒 Scan-Limit erreicht
                    </button>
                  )}
                  {/* Exports */}
                  {scannedCount > 0 && (<>
                    <button onClick={exportExcel} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition-colors">
                      📊 Excel
                    </button>
                    <button onClick={exportDATEV} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition-colors">
                      📁 Buchhaltung-Export
                    </button>
                  </>)}
                  {/* Bulk delete */}
                  {selectedIds.size > 0 && (
                    <button onClick={() => deleteBelege(Array.from(selectedIds))} className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition-colors">
                      🗑️ {selectedIds.size} löschen
                    </button>
                  )}
                </div>
              </div>

              {/* Bulk scan progress */}
              {bulkScanning && (
                <div className="bg-slate-800 border border-violet-500/30 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-violet-400 text-sm font-medium">KI-Scan läuft...</span>
                    <span className="text-slate-400 text-sm">{bulkScanProgress.done} / {bulkScanProgress.total}</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div className="bg-violet-500 h-2 rounded-full transition-all duration-300" style={{ width: `${(bulkScanProgress.done / bulkScanProgress.total) * 100}%` }} />
                  </div>
                </div>
              )}

              {/* Upload progress */}
              {uploading && (
                <div className="bg-slate-800 border border-teal-500/30 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-teal-400 text-sm font-medium">Hochladen...</span>
                    <span className="text-slate-400 text-sm">{uploadProgress.done} / {uploadProgress.total}</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div className="bg-teal-500 h-2 rounded-full transition-all duration-300" style={{ width: `${(uploadProgress.done / uploadProgress.total) * 100}%` }} />
                  </div>
                </div>
              )}

              {/* Drop zone + Beleg grid */}
              <div
                className={`min-h-[300px] border-2 border-dashed rounded-2xl p-4 transition-all duration-200 ${
                  dragging
                    ? 'border-teal-400 bg-teal-500/10 scale-[1.01] shadow-lg shadow-teal-500/10'
                    : 'border-slate-700 hover:border-slate-600'
                }`}
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false) }}
                onDrop={e => { setDragging(false); handleDrop(e) }}
              >
                {loadingBelege ? (
                  <div className="flex items-center justify-center h-40"><div className="h-8 w-8 border-[3px] border-slate-600 border-t-teal-500 rounded-full animate-spin" /></div>
                ) : belege.length === 0 ? (
                  <div
                    className="flex flex-col items-center justify-center py-16 cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className={`text-6xl mb-4 transition-transform duration-200 ${dragging ? 'scale-125' : ''}`}>
                      {dragging ? '📥' : '📄'}
                    </div>
                    <p className={`text-lg font-medium mb-2 transition-colors ${dragging ? 'text-teal-300' : 'text-slate-300'}`}>
                      {dragging ? 'Loslassen zum Hochladen' : 'Belege hierher ziehen'}
                    </p>
                    <p className="text-slate-500 text-sm">
                      oder klicken zum Auswählen — JPG, PNG, PDF
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {belege.map(b => (
                      <BelegCard
                        key={b.id}
                        beleg={b}
                        selected={selectedIds.has(b.id)}
                        scanning={scanningId === b.id}
                        isLimitReached={isLimitReached}
                        onToggleSelect={() => setSelectedIds(prev => {
                          const next = new Set(prev)
                          next.has(b.id) ? next.delete(b.id) : next.add(b.id)
                          return next
                        })}
                        onScan={() => scanBeleg(b)}
                        onView={async () => {
                          const url = await getImageUrl(b.storage_path)
                          if (url) setPreviewImage({ url, filename: b.filename })
                        }}
                        onEdit={() => { setScanEditItem(b); setScanResult(b) }}
                        onShowPricing={() => setShowPricing(true)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Scan Edit Modal */}
      {scanEditItem && (
        <ScanEditModal
          item={scanEditItem}
          result={scanResult}
          categories={SCAN_CATEGORIES}
          onSave={(updates) => saveScanEdit(scanEditItem, updates)}
          onClose={() => { setScanEditItem(null); setScanResult(null) }}
        />
      )}

      {/* Delete Folder Confirm */}
      {deletingFolder && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setDeletingFolder(null)}>
          <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-sm p-5 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-semibold">Ordner löschen?</h3>
            <p className="text-slate-300 text-sm">
              <strong>{deletingFolder.name}</strong> und alle {deletingFolder.beleg_count || 0} Belege werden unwiderruflich gelöscht.
            </p>
            <div className="flex gap-3">
              <button onClick={() => deleteFolder(deletingFolder.id)} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-sm font-medium transition-colors">
                Löschen
              </button>
              <button onClick={() => setDeletingFolder(null)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 py-2 rounded-lg text-sm transition-colors">
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4" onClick={() => setPreviewImage(null)}>
          <div className="relative max-w-4xl max-h-[90vh]">
            <button onClick={() => setPreviewImage(null)} className="absolute -top-3 -right-3 bg-slate-700 hover:bg-slate-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-lg z-10">×</button>
            <img src={previewImage.url} alt={previewImage.filename} className="max-h-[85vh] rounded-lg" />
            <p className="text-slate-400 text-sm text-center mt-2">{previewImage.filename}</p>
          </div>
        </div>
      )}

      {/* Pricing Modal */}
      {showPricing && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowPricing(false)}>
          <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-2xl p-6 space-y-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-white font-bold text-xl">🔒 Scan-Limit erreicht</h3>
              <button onClick={() => setShowPricing(false)} className="text-slate-400 hover:text-white text-xl">×</button>
            </div>
            <p className="text-slate-300 text-sm">
              Sie haben {scanCount} von {scanLimit} kostenlosen Scans verbraucht. Wählen Sie ein Paket für weitere Scans:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {PRICING_PLANS.map(plan => (
                <div
                  key={plan.name}
                  className={`border rounded-xl p-4 space-y-2 transition-colors ${
                    plan.popular ? 'border-blue-500 bg-blue-500/10' : 'border-slate-600 bg-slate-900/50'
                  }`}
                >
                  {plan.popular && <span className="text-xs text-blue-400 font-medium">Beliebt</span>}
                  <h4 className="text-white font-bold text-lg">{plan.name}</h4>
                  <p className="text-slate-400 text-sm">bis {plan.scans.toLocaleString('de-DE')} Scans/Monat</p>
                  <p className="text-white text-2xl font-bold">{plan.price}€<span className="text-sm text-slate-400 font-normal">/Monat</span></p>
                  <button className="w-full mt-2 py-2 rounded-lg text-sm font-medium bg-slate-700 text-slate-400 cursor-not-allowed">
                    Demnächst verfügbar
                  </button>
                </div>
              ))}
            </div>
            <p className="text-slate-500 text-xs text-center">
              Alle Preise zzgl. 19% MwSt. Kontaktieren Sie uns: info@pro-meister.de
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// ---- Beleg Card Component ----
function BelegCard({ beleg, selected, scanning, isLimitReached, onToggleSelect, onScan, onView, onEdit, onShowPricing }) {
  const isPdf = beleg.file_type?.includes('pdf')
  const isScanned = !!beleg.scanned_at

  return (
    <div className={`bg-slate-800/80 border rounded-xl overflow-hidden transition-all ${
      selected ? 'border-teal-500 ring-1 ring-teal-500/30' : 'border-slate-700 hover:border-slate-600'
    }`}>
      {/* Thumbnail */}
      <div className="relative aspect-[3/4] bg-slate-900 cursor-pointer" onClick={onView}>
        {isPdf ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-4xl mb-1">📄</div>
              <p className="text-slate-500 text-xs">PDF</p>
            </div>
          </div>
        ) : (
          <BelegThumbnail storagePath={beleg.storage_path} filename={beleg.filename} />
        )}
        {/* Select checkbox — top left */}
        <div className="absolute top-2 left-2 z-10" onClick={e => { e.stopPropagation(); onToggleSelect() }}>
          <div className={`w-6 h-6 rounded border-2 flex items-center justify-center cursor-pointer transition-colors shadow-sm ${
            selected ? 'bg-teal-500 border-teal-500 text-white' : 'border-slate-400 bg-slate-900/60 hover:border-slate-300'
          }`}>
            {selected && <span className="text-xs font-bold">✓</span>}
          </div>
        </div>
        {/* Scan status badge — only show when scanned */}
        {isScanned && (
          <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-md bg-green-500 text-white text-xs font-medium shadow-sm">
            ✓
          </div>
        )}
      </div>
      {/* Info */}
      <div className="p-2 space-y-1.5">
        <p className="text-white text-xs truncate" title={beleg.filename}>{beleg.filename}</p>
        {isScanned ? (
          <div className="space-y-0.5">
            <p className="text-teal-400 text-xs font-medium truncate">{beleg.vendor}</p>
            <p className="text-white text-xs font-bold">{parseFloat(beleg.amount_gross).toFixed(2).replace('.', ',')} €</p>
            <button onClick={onEdit} className="text-slate-400 hover:text-white text-xs underline">Bearbeiten</button>
          </div>
        ) : (
          <button
            onClick={isLimitReached ? onShowPricing : onScan}
            disabled={scanning}
            className={`w-full py-1 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
              isLimitReached ? 'bg-red-500/20 text-red-400' : 'bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-50'
            }`}
          >
            {scanning ? (
              <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : isLimitReached ? (
              <>🔒 Gesperrt</>
            ) : (
              <><img src="/robot.png" alt="KI" className="w-3.5 h-3.5" /> Scannen</>
            )}
          </button>
        )}
      </div>
    </div>
  )
}

// ---- Beleg Thumbnail (lazy load signed URL) ----
function BelegThumbnail({ storagePath, filename }) {
  const [url, setUrl] = useState(null)

  useEffect(() => {
    let cancelled = false
    supabase.storage.from('buchhalter-belege').createSignedUrl(storagePath, 300).then(({ data }) => {
      if (!cancelled && data?.signedUrl) setUrl(data.signedUrl)
    })
    return () => { cancelled = true }
  }, [storagePath])

  if (!url) return <div className="flex items-center justify-center h-full"><div className="h-5 w-5 border-2 border-slate-600 border-t-teal-500 rounded-full animate-spin" /></div>
  return <img src={url} alt={filename} className="w-full h-full object-cover" />
}

// ---- Scan Edit Modal ----
function ScanEditModal({ item, result, categories, onSave, onClose }) {
  const [form, setForm] = useState({
    vendor: result?.vendor || '',
    receipt_date: result?.receipt_date || '',
    amount_gross: result?.amount_gross || 0,
    amount_net: result?.amount_net || 0,
    vat_rate: result?.vat_rate || 19,
    vat_amount: result?.vat_amount || 0,
    category: result?.category || 'Sonstiges',
    description: result?.description || '',
  })

  const updateField = (key, val) => setForm(prev => {
    const next = { ...prev, [key]: val }
    if (key === 'amount_gross' || key === 'vat_rate') {
      const gross = key === 'amount_gross' ? parseFloat(val) || 0 : parseFloat(next.amount_gross) || 0
      const rate = key === 'vat_rate' ? parseFloat(val) || 19 : parseFloat(next.vat_rate) || 19
      next.amount_net = parseFloat((gross / (1 + rate / 100)).toFixed(2))
      next.vat_amount = parseFloat((gross - next.amount_net).toFixed(2))
    }
    return next
  })

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-md p-5 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-white font-semibold text-lg flex items-center gap-2"><img src="/robot.png" alt="KI" className="w-7 h-7" /> KI-Scan Ergebnis</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl">×</button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-slate-400 text-xs">Händler</label>
            <input type="text" value={form.vendor} onChange={e => updateField('vendor', e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-teal-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 text-xs">Datum</label>
              <input type="date" value={form.receipt_date} onChange={e => updateField('receipt_date', e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-teal-500" />
            </div>
            <div>
              <label className="text-slate-400 text-xs">Kategorie</label>
              <select value={form.category} onChange={e => updateField('category', e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-teal-500">
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-slate-400 text-xs">Brutto (€)</label>
              <input type="number" step="0.01" value={form.amount_gross} onChange={e => updateField('amount_gross', e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-teal-500" />
            </div>
            <div>
              <label className="text-slate-400 text-xs">MwSt %</label>
              <select value={form.vat_rate} onChange={e => updateField('vat_rate', e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-teal-500">
                <option value="19">19%</option>
                <option value="7">7%</option>
                <option value="0">0%</option>
              </select>
            </div>
            <div>
              <label className="text-slate-400 text-xs">Netto (€)</label>
              <input type="text" value={form.amount_net.toFixed ? form.amount_net.toFixed(2) : form.amount_net} readOnly
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-400 text-sm" />
            </div>
          </div>
          <div>
            <label className="text-slate-400 text-xs">Beschreibung</label>
            <input type="text" value={form.description} onChange={e => updateField('description', e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-teal-500" />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={() => onSave({
              vendor: form.vendor,
              receipt_date: form.receipt_date || null,
              amount_gross: parseFloat(form.amount_gross) || 0,
              amount_net: parseFloat(form.amount_net) || 0,
              vat_rate: parseFloat(form.vat_rate) || 19,
              vat_amount: parseFloat(form.vat_amount) || 0,
              category: form.category,
              description: form.description,
            })}
            className="flex-1 bg-teal-600 hover:bg-teal-500 text-white py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Speichern
          </button>
          <button onClick={onClose} className="px-4 bg-slate-700 hover:bg-slate-600 text-slate-300 py-2 rounded-lg text-sm transition-colors">
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  )
}
