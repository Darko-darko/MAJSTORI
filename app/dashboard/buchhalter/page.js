'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import FirstVisitHint from '@/app/components/FirstVisitHint'

export default function BuchhalterDashboard() {
  const [majstors, setMajstors] = useState([])
  const [pendingInvites, setPendingInvites] = useState([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [confirmRevoke, setConfirmRevoke] = useState(null)
  const [revoking, setRevoking] = useState(false)
  const [accepting, setAccepting] = useState(null)
  const [linkCopied, setLinkCopied] = useState(false)
  const router = useRouter()

  // ZUGFeRD validator state
  const [showZugferd, setShowZugferd] = useState(false)
  const [zfFile, setZfFile] = useState(null)
  const [zfDragging, setZfDragging] = useState(false)
  const [zfLoading, setZfLoading] = useState(false)
  const [zfResult, setZfResult] = useState(null)
  const [zfError, setZfError] = useState('')
  const [zfSteps, setZfSteps] = useState([])
  const zfInputRef = useRef(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) { router.push('/login'); return }
      setUser(currentUser)

      const [profileResult, accessesResult] = await Promise.all([
        supabase.from('majstors').select('role').eq('id', currentUser.id).single(),
        supabase.from('buchhalter_access').select('id, majstor_id, accepted_at').eq('status', 'active').or(`buchhalter_id.eq.${currentUser.id},buchhalter_email.eq.${currentUser.email.toLowerCase()}`),
      ])

      const profile = profileResult.data
      if (!profile || profile.role !== 'buchhalter') {
        router.push('/dashboard')
        return
      }
      const accesses = accessesResult.data

      if (!accesses?.length) { setLoading(false); return }

      const majstorIds = accesses.map(a => a.majstor_id)

      const { data: majstorProfiles } = await supabase
        .from('majstors')
        .select('id, full_name, business_name, city, email')
        .in('id', majstorIds)

      const profileMap = Object.fromEntries((majstorProfiles || []).map(p => [p.id, p]))

      const accepted = []
      const pending = []
      for (const a of accesses) {
        const m = profileMap[a.majstor_id]
        if (!m) continue
        const item = { ...m, access_id: a.id }
        if (a.accepted_at) {
          accepted.push(item)
        } else {
          pending.push(item)
        }
      }

      setMajstors(accepted)
      setPendingInvites(pending)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = async (accessId) => {
    setAccepting(accessId)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/buchhalter-access', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ id: accessId, action: 'accept' })
      })
      if (res.ok) {
        const item = pendingInvites.find(m => m.access_id === accessId)
        if (item) {
          setPendingInvites(prev => prev.filter(m => m.access_id !== accessId))
          setMajstors(prev => [...prev, item])
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setAccepting(null)
    }
  }

  const handleDecline = async (accessId) => {
    setAccepting(accessId)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/buchhalter-access', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ id: accessId, action: 'decline' })
      })
      if (res.ok) {
        setPendingInvites(prev => prev.filter(m => m.access_id !== accessId))
      }
    } catch (e) {
      console.error(e)
    } finally {
      setAccepting(null)
    }
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText('https://pro-meister.de')
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  const handleRevoke = async () => {
    if (!confirmRevoke) return
    setRevoking(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`/api/buchhalter-access?id=${confirmRevoke.accessId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` }
      })
      if (res.ok) {
        setMajstors(prev => prev.filter(m => m.access_id !== confirmRevoke.accessId))
        setConfirmRevoke(null)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setRevoking(false)
    }
  }

  // ─── ZUGFeRD Validator ───
  const handleZfFile = useCallback(async (f) => {
    if (!f || !f.name.toLowerCase().endsWith('.pdf')) {
      setZfError('Bitte laden Sie eine PDF-Datei hoch.')
      return
    }
    if (f.size > 10 * 1024 * 1024) {
      setZfError('Datei zu groß — maximal 10 MB.')
      return
    }

    setZfFile(f)
    setZfError('')
    setZfResult(null)
    setZfSteps([])
    setZfLoading(true)

    const validationSteps = [
      { label: 'PDF-Struktur wird geprüft…', delay: 0 },
      { label: 'Eingebettete Dateien durchsuchen…', delay: 400 },
      { label: 'ZUGFeRD/Factur-X XML extrahieren…', delay: 900 },
      { label: 'XML-Schema validieren…', delay: 1500 },
      { label: 'EN16931 Pflichtfelder prüfen…', delay: 2100 },
      { label: 'Beträge & Steuerberechnung verifizieren…', delay: 2600 },
    ]

    const timers = validationSteps.map(({ label, delay }) =>
      setTimeout(() => setZfSteps(prev => [...prev, label]), delay)
    )

    try {
      const formData = new FormData()
      formData.append('pdf', f)

      const [res] = await Promise.all([
        fetch('/api/zugferd-validate', { method: 'POST', body: formData }),
        new Promise(r => setTimeout(r, 3200))
      ])
      const json = await res.json()

      if (!res.ok) {
        setZfError(json.error || 'Fehler bei der Validierung')
      } else {
        setZfResult(json)
      }
    } catch (err) {
      setZfError('Netzwerkfehler — bitte erneut versuchen.')
    } finally {
      timers.forEach(clearTimeout)
      setZfLoading(false)
    }
  }, [])

  const onZfDrop = useCallback((e) => {
    e.preventDefault()
    setZfDragging(false)
    const f = e.dataTransfer?.files?.[0]
    if (f) handleZfFile(f)
  }, [handleZfFile])

  const resetZf = () => {
    setZfFile(null)
    setZfResult(null)
    setZfError('')
    setZfSteps([])
    if (zfInputRef.current) zfInputRef.current.value = ''
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-10 w-10 border-[3px] border-slate-600 border-t-teal-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="pb-20 max-w-5xl mx-auto">
      <FirstVisitHint pageKey="buchhalter" />

      <div className="space-y-6">
        {/* Title */}
        <div>
          <h1 className="text-2xl font-bold text-white">Meine Auftraggeber</h1>
          <p className="text-slate-400 text-sm mt-1.5">Mandanten, die Ihnen Buchhalter-Zugang erteilt haben</p>
        </div>

        {/* CTA — Mandanten empfehlen */}
        <div className="bg-teal-500/10 border border-teal-500/30 rounded-xl p-5">
          <p className="text-white text-sm font-semibold mb-1">Empfehlen Sie Pro-Meister Ihren Mandanten</p>
          <p className="text-slate-400 text-xs mb-3">Rechnungen und Belege werden automatisch für Sie bereitgestellt — weniger Papierkram für beide Seiten.</p>
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {linkCopied ? '✓ Kopiert!' : 'Link kopieren'}
          </button>
        </div>

        {/* ZUGFeRD Validator — collapsible */}
        <div className="border border-slate-700 rounded-xl overflow-hidden">
          <button
            onClick={() => { setShowZugferd(!showZugferd); if (!showZugferd) resetZf() }}
            className="w-full flex items-center justify-between px-5 py-4 bg-slate-800/50 hover:bg-slate-800/70 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 bg-teal-600/20 rounded-lg flex items-center justify-center text-teal-400 text-sm font-bold shrink-0">✓</span>
              <div className="text-left">
                <p className="text-white text-sm font-semibold">ZUGFeRD / Factur-X prüfen</p>
                <p className="text-slate-500 text-xs">PDF-Rechnungen auf EN16931 Konformität prüfen</p>
              </div>
            </div>
            <svg className={`w-5 h-5 text-slate-400 transition-transform ${showZugferd ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showZugferd && (
            <div className="p-5 border-t border-slate-700 space-y-4">
              {/* Upload Area */}
              {!zfResult && !zfLoading && (
                <div
                  onDragOver={(e) => { e.preventDefault(); setZfDragging(true) }}
                  onDragLeave={() => setZfDragging(false)}
                  onDrop={onZfDrop}
                  onClick={() => zfInputRef.current?.click()}
                  className={`relative cursor-pointer border-2 border-dashed rounded-xl p-10 sm:p-14 text-center transition-all ${
                    zfDragging
                      ? 'border-teal-500 bg-teal-500/10'
                      : 'border-slate-600 bg-slate-800/30 hover:border-teal-600 hover:bg-slate-800/50'
                  }`}
                >
                  <input
                    ref={zfInputRef}
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={(e) => handleZfFile(e.target.files?.[0])}
                  />
                  <div className="text-4xl mb-3">📄</div>
                  <p className="text-white text-lg font-medium mb-1">PDF-Rechnung hier ablegen</p>
                  <p className="text-slate-400 text-sm">oder klicken zum Auswählen — max. 10 MB</p>
                </div>
              )}

              {/* Loading */}
              {zfLoading && (
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-slate-600 border-t-teal-500" />
                    <p className="text-white font-medium truncate">{zfFile?.name}</p>
                  </div>
                  <div className="space-y-2.5">
                    {zfSteps.map((step, i) => {
                      const isLatest = i === zfSteps.length - 1
                      return (
                        <div key={i} className="flex items-center gap-3 text-sm">
                          {isLatest ? (
                            <div className="h-4 w-4 rounded-full border-2 border-teal-500 border-t-transparent animate-spin shrink-0" />
                          ) : (
                            <span className="text-teal-400 shrink-0">✓</span>
                          )}
                          <span className={isLatest ? 'text-white' : 'text-slate-500'}>{step}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Error */}
              {zfError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center">
                  <p className="text-red-300">{zfError}</p>
                  <button onClick={resetZf} className="mt-2 text-sm text-slate-400 hover:text-white underline">Erneut versuchen</button>
                </div>
              )}

              {/* Result */}
              {zfResult && (
                <div className="space-y-4">
                  <div className={`rounded-xl p-5 border ${
                    zfResult.valid
                      ? 'bg-teal-500/10 border-teal-500/30'
                      : zfResult.zugferd
                        ? 'bg-amber-500/10 border-amber-500/30'
                        : 'bg-red-500/10 border-red-500/30'
                  }`}>
                    <div className="flex items-start gap-3">
                      <div className="text-3xl">
                        {zfResult.valid ? '✅' : zfResult.zugferd ? '⚠️' : '❌'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className={`text-lg font-bold ${
                          zfResult.valid ? 'text-teal-300' : zfResult.zugferd ? 'text-amber-300' : 'text-red-300'
                        }`}>
                          {zfResult.valid ? 'ZUGFeRD-konform' : zfResult.zugferd ? 'ZUGFeRD erkannt — mit Fehlern' : 'Kein ZUGFeRD-Dokument'}
                        </h2>
                        <p className="text-slate-300 text-sm mt-1">{zfResult.message}</p>
                        <p className="text-slate-500 text-xs mt-1 truncate">{zfFile?.name}</p>
                      </div>
                    </div>
                  </div>

                  {zfResult.data && Object.keys(zfResult.data).length > 0 && (
                    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
                      <h3 className="text-white font-semibold mb-3 text-sm">Dokumentdaten</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                        {zfResult.data.invoiceNumber && <div><span className="text-slate-500">Rechnungsnr.:</span> <span className="text-white ml-1">{zfResult.data.invoiceNumber}</span></div>}
                        {zfResult.data.issueDate && <div><span className="text-slate-500">Datum:</span> <span className="text-white ml-1">{zfResult.data.issueDate}</span></div>}
                        {zfResult.data.sellerName && <div><span className="text-slate-500">Verkäufer:</span> <span className="text-white ml-1">{zfResult.data.sellerName}</span></div>}
                        {zfResult.data.buyerName && <div><span className="text-slate-500">Käufer:</span> <span className="text-white ml-1">{zfResult.data.buyerName}</span></div>}
                        {zfResult.data.grandTotal !== undefined && <div><span className="text-slate-500">Gesamtbetrag:</span> <span className="text-white ml-1 font-medium">{zfResult.data.grandTotal?.toFixed(2)} {zfResult.data.currency || 'EUR'}</span></div>}
                        {zfResult.data.taxTotal !== undefined && <div><span className="text-slate-500">MwSt.:</span> <span className="text-white ml-1">{zfResult.data.taxTotal?.toFixed(2)} {zfResult.data.currency || 'EUR'}</span></div>}
                        {zfResult.data.lineItemCount > 0 && <div><span className="text-slate-500">Positionen:</span> <span className="text-white ml-1">{zfResult.data.lineItemCount}</span></div>}
                        {zfResult.data.typeCode && <div><span className="text-slate-500">Typ:</span> <span className="text-white ml-1">{zfResult.data.typeCode === '380' ? 'Rechnung' : zfResult.data.typeCode === '381' ? 'Gutschrift' : zfResult.data.typeCode}</span></div>}
                      </div>
                    </div>
                  )}

                  {zfResult.errors?.length > 0 && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5">
                      <h3 className="text-red-300 font-semibold mb-2 text-sm">{zfResult.errors.length} Fehler</h3>
                      <div className="space-y-1.5">
                        {zfResult.errors.map((err, i) => (
                          <div key={i} className="flex items-start gap-2 text-sm">
                            <span className="text-red-400 mt-0.5 shrink-0">●</span>
                            <div>
                              <span className="text-slate-400 font-mono text-xs bg-slate-700/50 px-1.5 py-0.5 rounded mr-1.5">{err.code}</span>
                              <span className="text-slate-300">{err.message}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {zfResult.warnings?.length > 0 && (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-5">
                      <h3 className="text-amber-300 font-semibold mb-2 text-sm">{zfResult.warnings.length} Hinweis{zfResult.warnings.length > 1 ? 'e' : ''}</h3>
                      <div className="space-y-1.5">
                        {zfResult.warnings.map((w, i) => (
                          <div key={i} className="flex items-start gap-2 text-sm">
                            <span className="text-amber-400 mt-0.5 shrink-0">●</span>
                            <div>
                              <span className="text-slate-400 font-mono text-xs bg-slate-700/50 px-1.5 py-0.5 rounded mr-1.5">{w.code}</span>
                              <span className="text-slate-300">{w.message}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={resetZf}
                    className="w-full py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-medium transition-colors text-sm"
                  >
                    Weitere PDF prüfen
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pending Invites */}
        {pendingInvites.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-amber-400">📨 Neue Einladungen</p>
            {pendingInvites.map(m => (
              <div key={m.id} className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-amber-700/30 rounded-full flex items-center justify-center text-amber-300 font-bold text-lg shrink-0">
                    {(m.business_name || m.full_name || '?')[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-white font-semibold truncate">{m.business_name || m.full_name}</p>
                    {m.city && <p className="text-slate-400 text-xs truncate">{m.city}</p>}
                  </div>
                </div>
                <p className="text-slate-300 text-sm mb-4">
                  <strong>{m.business_name || m.full_name}</strong> möchte Ihnen Zugang zu seinen Buchhaltungsdaten gewähren.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleAccept(m.access_id)}
                    disabled={accepting === m.access_id}
                    className="flex-1 px-4 py-2 text-sm text-white bg-teal-600 hover:bg-teal-500 rounded-lg transition-colors disabled:opacity-50 font-medium"
                  >
                    {accepting === m.access_id ? '...' : 'Annehmen'}
                  </button>
                  <button
                    onClick={() => handleDecline(m.access_id)}
                    disabled={accepting === m.access_id}
                    className="px-4 py-2 text-sm text-slate-300 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors disabled:opacity-50"
                  >
                    Ablehnen
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Accepted Majstors */}
        {majstors.length === 0 && pendingInvites.length === 0 ? (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 text-center">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-white font-semibold mb-2">Noch keine Mandanten verbunden</p>
            <p className="text-slate-400 text-sm mb-4">Sobald ein Handwerker Sie als Buchhalter hinzufügt, erscheinen seine Rechnungen und Belege automatisch hier — sortiert nach Monat, als ZIP herunterladbar.</p>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-5 text-left mt-4">
              <p className="text-blue-300 font-semibold text-sm mb-2">💡 So verbinden Sie sich mit Ihren Mandanten:</p>
              <ol className="text-slate-300 text-sm space-y-1.5 list-decimal list-inside">
                <li>Empfehlen Sie <strong className="text-white">Pro-Meister</strong> Ihren Handwerker-Mandanten</li>
                <li>Der Handwerker registriert sich kostenlos auf <strong className="text-white">pro-meister.de</strong></li>
                <li>In seinen Einstellungen trägt er Ihre E-Mail als Buchhalter ein</li>
                <li>Sie erhalten eine Einladung und sehen sofort alle Belege</li>
              </ol>
            </div>
          </div>
        ) : majstors.length > 0 && (
          <div className="grid gap-4">
            {majstors.map(m => (
              <div key={m.id} className="bg-slate-800/50 border border-slate-700 hover:border-teal-700 rounded-xl p-5 transition-colors">
                <button
                  onClick={() => router.push(`/dashboard/buchhalter/${m.id}`)}
                  className="w-full text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-teal-700/30 rounded-full flex items-center justify-center text-teal-300 font-bold text-lg shrink-0">
                      {(m.business_name || m.full_name || '?')[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-white font-semibold truncate">{m.business_name || m.full_name}</p>
                      {m.city && <p className="text-slate-400 text-xs truncate">{m.city}</p>}
                    </div>
                    <span className="ml-auto text-slate-400 text-lg">→</span>
                  </div>
                </button>
                <button
                  onClick={() => setConfirmRevoke({ accessId: m.access_id, name: m.business_name || m.full_name })}
                  className="mt-3 text-xs text-red-400/60 hover:text-red-400 transition-colors"
                >
                  Zugang beenden
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirm Revoke Dialog */}
      {confirmRevoke && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-sm w-full">
            <h3 className="text-white font-semibold text-lg mb-2">Zugang beenden?</h3>
            <p className="text-slate-300 text-sm mb-5">
              Möchten Sie den Zugang zu <strong>{confirmRevoke.name}</strong> wirklich beenden? Sie verlieren den Zugriff auf dessen Daten.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmRevoke(null)}
                className="flex-1 px-4 py-2 text-sm text-slate-300 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleRevoke}
                disabled={revoking}
                className="flex-1 px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {revoking ? 'Wird beendet...' : 'Ja, beenden'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
