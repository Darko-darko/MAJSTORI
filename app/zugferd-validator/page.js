// app/zugferd-validator/page.js — Public ZUGFeRD Validator (free tool)
'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function ZugferdValidatorPage() {
  const [file, setFile] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [steps, setSteps] = useState([])
  const inputRef = useRef(null)

  // localStorage soft limit (3 free validations — logged-in users unlimited)
  const FREE_LIMIT = 3
  const getCount = () => typeof window !== 'undefined' ? parseInt(localStorage.getItem('zfv_count') || '0') : 0
  const incCount = () => { if (typeof window !== 'undefined') localStorage.setItem('zfv_count', String(getCount() + 1)) }
  const [limited, setLimited] = useState(false)
  const [loggedIn, setLoggedIn] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setLoggedIn(true)
    })
  }, [])

  useEffect(() => {
    if (!loggedIn) setLimited(getCount() >= FREE_LIMIT)
  }, [result, loggedIn])

  const handleFile = useCallback(async (f) => {
    if (!f || !f.name.toLowerCase().endsWith('.pdf')) {
      setError('Bitte laden Sie eine PDF-Datei hoch.')
      return
    }
    if (f.size > 10 * 1024 * 1024) {
      setError('Datei zu groß — maximal 10 MB.')
      return
    }

    setFile(f)
    setError('')
    setResult(null)
    setSteps([])
    setLoading(true)

    const validationSteps = [
      { label: 'PDF-Struktur wird geprüft…', delay: 0 },
      { label: 'Eingebettete Dateien durchsuchen…', delay: 400 },
      { label: 'ZUGFeRD/Factur-X XML extrahieren…', delay: 900 },
      { label: 'XML-Schema validieren…', delay: 1500 },
      { label: 'EN16931 Pflichtfelder prüfen…', delay: 2100 },
      { label: 'Beträge & Steuerberechnung verifizieren…', delay: 2600 },
    ]

    const timers = validationSteps.map(({ label, delay }) =>
      setTimeout(() => setSteps(prev => [...prev, label]), delay)
    )

    try {
      const formData = new FormData()
      formData.append('pdf', f)

      const [res] = await Promise.all([
        fetch('/api/zugferd-validate', { method: 'POST', body: formData }),
        new Promise(r => setTimeout(r, 3200)) // min display time
      ])
      const json = await res.json()

      if (!res.ok) {
        setError(json.error || 'Fehler bei der Validierung')
      } else {
        setResult(json)
        if (!loggedIn) incCount()
      }
    } catch (err) {
      setError('Netzwerkfehler — bitte erneut versuchen.')
    } finally {
      timers.forEach(clearTimeout)
      setLoading(false)
    }
  }, [])

  const onDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer?.files?.[0]
    if (f) handleFile(f)
  }, [handleFile])

  const reset = () => {
    setFile(null)
    setResult(null)
    setError('')
  }

  return (
    <div className="zfv-page min-h-screen bg-white text-slate-900">
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        .zfv-page .border,
        .zfv-page .border-b,
        .zfv-page .border-t { border-width: 1px !important; }
        .zfv-page, .zfv-page * {
          --color-white: #ffffff !important;
          --color-slate-900: #0f172a !important;
          --color-slate-800: #1e293b !important;
          --color-slate-700: #334155 !important;
          --color-slate-600: #475569 !important;
          --color-slate-500: #64748b !important;
          --color-slate-400: #94a3b8 !important;
          --color-slate-300: #cbd5e1 !important;
          --color-slate-200: #e2e8f0 !important;
          --color-slate-100: #f1f5f9 !important;
          --color-slate-50: #f8fafc !important;
          --color-green-50: #f0fdf4 !important;
          --color-green-200: #bbf7d0 !important;
          --color-green-600: #16a34a !important;
          --color-green-700: #15803d !important;
          --color-red-50: #fef2f2 !important;
          --color-red-200: #fecaca !important;
          --color-red-500: #ef4444 !important;
          --color-red-700: #b91c1c !important;
          --color-amber-50: #fffbeb !important;
          --color-amber-200: #fde68a !important;
          --color-amber-500: #f59e0b !important;
          --color-amber-700: #b45309 !important;
          --color-blue-50: #eff6ff !important;
          --color-blue-200: #bfdbfe !important;
          --color-blue-300: #93c5fd !important;
          --color-blue-400: #60a5fa !important;
          --color-blue-500: #3b82f6 !important;
          --color-blue-600: #2563eb !important;
          --color-blue-700: #1d4ed8 !important;
        }
      `}</style>
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-slate-900">
            Pro-meister<span className="text-blue-600">.de</span>
          </Link>
          <Link
            href="/login"
            className="text-sm text-slate-500 hover:text-slate-900 transition-colors"
          >
            Anmelden →
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12 sm:py-16">
        {/* Title */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 rounded-full px-4 py-1.5 mb-4">
            <span className="text-green-700 text-sm font-medium">Kostenloses Tool</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3">
            ZUGFeRD / Factur-X Validator
          </h1>
          <p className="text-slate-500 text-lg max-w-xl mx-auto">
            Prüfen Sie Ihre elektronischen Rechnungen auf ZUGFeRD 2.x / EN16931 Konformität — kostenlos und sofort.
          </p>
        </div>

        {/* Limit reached */}
        {!result && !loading && limited && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-10 sm:p-14 text-center">
            <div className="text-4xl mb-4">📋</div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">
              Alle {FREE_LIMIT} Prüfungen ohne Anmeldung aufgebraucht
            </h2>
            <p className="text-slate-500 mb-6 max-w-md mx-auto">
              Registrieren Sie sich kostenlos als Buchhalter — unbegrenzte Validierungen, eigenes Portal, Mandanten-Anbindung.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/signup"
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Kostenlos registrieren →
              </Link>
              <Link
                href="/login"
                className="px-6 py-2.5 bg-white border border-slate-300 hover:border-slate-400 text-slate-700 rounded-lg font-medium transition-colors"
              >
                Anmelden
              </Link>
            </div>
          </div>
        )}

        {/* Upload Area */}
        {!result && !loading && !limited && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={`relative cursor-pointer border-2 border-dashed rounded-2xl p-12 sm:p-16 text-center transition-all ${
              dragging
                ? 'border-blue-400 bg-blue-50'
                : 'border-slate-300 bg-slate-50 hover:border-blue-300 hover:bg-blue-50/50'
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            <div className="text-5xl mb-4">📄</div>
            <p className="text-slate-900 text-lg font-medium mb-2">
              PDF-Rechnung hier ablegen
            </p>
            <p className="text-slate-500 text-sm">
              oder klicken zum Auswählen — max. 10 MB
            </p>
            {!loggedIn && getCount() > 0 && (
              <p className="text-slate-400 text-xs mt-4">
                {FREE_LIMIT - getCount()} von {FREE_LIMIT} Prüfungen ohne Anmeldung verbleibend
              </p>
            )}
          </div>
        )}

        {/* Loading — animated steps */}
        {loading && (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-slate-300 border-t-blue-600"></div>
              <p className="text-slate-900 font-medium">{file?.name}</p>
            </div>
            <div className="space-y-3">
              {steps.map((step, i) => {
                const isLatest = i === steps.length - 1
                return (
                  <div
                    key={i}
                    className="flex items-center gap-3 text-sm"
                    style={{ animation: 'fadeIn 0.3s ease-out' }}
                  >
                    {isLatest ? (
                      <div className="h-4 w-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin flex-shrink-0"></div>
                    ) : (
                      <span className="text-green-600 flex-shrink-0">✓</span>
                    )}
                    <span className={isLatest ? 'text-slate-900' : 'text-slate-500'}>
                      {step}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-4 text-center">
            <p className="text-red-700">{error}</p>
            <button onClick={reset} className="mt-3 text-sm text-slate-500 hover:text-slate-900 underline">
              Erneut versuchen
            </button>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="space-y-6">
            {/* Status Banner */}
            <div className={`rounded-2xl p-6 border ${
              result.valid
                ? 'bg-green-50 border-green-200'
                : result.zugferd
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-start gap-4">
                <div className="text-4xl">
                  {result.valid ? '✅' : result.zugferd ? '⚠️' : '❌'}
                </div>
                <div className="flex-1">
                  <h2 className={`text-xl font-bold ${
                    result.valid ? 'text-green-700' : result.zugferd ? 'text-amber-700' : 'text-red-700'
                  }`}>
                    {result.valid
                      ? 'ZUGFeRD-konform'
                      : result.zugferd
                        ? 'ZUGFeRD erkannt — mit Fehlern'
                        : 'Kein ZUGFeRD-Dokument'
                    }
                  </h2>
                  <p className="text-slate-600 mt-1">{result.message}</p>
                  <p className="text-slate-400 text-sm mt-2">{file?.name}</p>
                </div>
              </div>
            </div>

            {/* Data Summary */}
            {result.data && Object.keys(result.data).length > 0 && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
                <h3 className="text-slate-900 font-semibold mb-4">Dokumentdaten</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  {result.data.invoiceNumber && (
                    <div>
                      <span className="text-slate-500">Rechnungsnummer:</span>
                      <span className="text-slate-900 ml-2">{result.data.invoiceNumber}</span>
                    </div>
                  )}
                  {result.data.issueDate && (
                    <div>
                      <span className="text-slate-500">Datum:</span>
                      <span className="text-slate-900 ml-2">{result.data.issueDate}</span>
                    </div>
                  )}
                  {result.data.sellerName && (
                    <div>
                      <span className="text-slate-500">Verkäufer:</span>
                      <span className="text-slate-900 ml-2">{result.data.sellerName}</span>
                    </div>
                  )}
                  {result.data.buyerName && (
                    <div>
                      <span className="text-slate-500">Käufer:</span>
                      <span className="text-slate-900 ml-2">{result.data.buyerName}</span>
                    </div>
                  )}
                  {result.data.grandTotal !== undefined && (
                    <div>
                      <span className="text-slate-500">Gesamtbetrag:</span>
                      <span className="text-slate-900 ml-2 font-medium">{result.data.grandTotal?.toFixed(2)} {result.data.currency || 'EUR'}</span>
                    </div>
                  )}
                  {result.data.taxTotal !== undefined && (
                    <div>
                      <span className="text-slate-500">MwSt.:</span>
                      <span className="text-slate-900 ml-2">{result.data.taxTotal?.toFixed(2)} {result.data.currency || 'EUR'}</span>
                    </div>
                  )}
                  {result.data.lineItemCount > 0 && (
                    <div>
                      <span className="text-slate-500">Positionen:</span>
                      <span className="text-slate-900 ml-2">{result.data.lineItemCount}</span>
                    </div>
                  )}
                  {result.data.typeCode && (
                    <div>
                      <span className="text-slate-500">Typ:</span>
                      <span className="text-slate-900 ml-2">
                        {result.data.typeCode === '380' ? 'Rechnung' : result.data.typeCode === '381' ? 'Gutschrift' : result.data.typeCode}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Errors */}
            {result.errors?.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                <h3 className="text-red-700 font-semibold mb-3">
                  {result.errors.length} Fehler
                </h3>
                <div className="space-y-2">
                  {result.errors.map((err, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm">
                      <span className="text-red-500 mt-0.5">●</span>
                      <div>
                        <span className="text-slate-700 font-mono text-xs bg-slate-200/80 px-1.5 py-0.5 rounded mr-2">{err.code}</span>
                        <span className="text-slate-700">{err.message}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Warnings */}
            {result.warnings?.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
                <h3 className="text-amber-700 font-semibold mb-3">
                  {result.warnings.length} Hinweis{result.warnings.length > 1 ? 'e' : ''}
                </h3>
                <div className="space-y-2">
                  {result.warnings.map((w, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm">
                      <span className="text-amber-500 mt-0.5">●</span>
                      <div>
                        <span className="text-slate-700 font-mono text-xs bg-slate-200/80 px-1.5 py-0.5 rounded mr-2">{w.code}</span>
                        <span className="text-slate-700">{w.message}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={reset}
                className="flex-1 py-3 bg-white border border-slate-300 hover:border-slate-400 text-slate-900 rounded-xl font-medium transition-colors"
              >
                Weitere PDF prüfen
              </button>
            </div>

            {/* CTA */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
              <p className="text-slate-900 font-medium mb-1">
                Rechnungen Ihrer Mandanten — automatisch auf Ihrem Schreibtisch.
              </p>
              <p className="text-slate-500 text-sm mb-4">
                Mit Pro-Meister verbinden sich Handwerker direkt mit ihrem Buchhalter. Alle Rechnungen landen als ZUGFeRD-PDF bei Ihnen — ohne Nachfragen, ohne Papier.
              </p>
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Kostenlos als Buchhalter registrieren →
              </Link>
            </div>
          </div>
        )}

        {/* Info Section */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
            <div className="text-2xl mb-2">🔒</div>
            <h3 className="text-slate-900 font-medium mb-1">Datenschutz</h3>
            <p className="text-slate-500 text-sm">Dateien werden nur zur Prüfung verarbeitet und nicht gespeichert.</p>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
            <div className="text-2xl mb-2">⚡</div>
            <h3 className="text-slate-900 font-medium mb-1">Sofort-Ergebnis</h3>
            <p className="text-slate-500 text-sm">Validierung in Sekunden — EN16931, Pflichtfelder, Betragsberechnung.</p>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
            <div className="text-2xl mb-2">📋</div>
            <h3 className="text-slate-900 font-medium mb-1">ZUGFeRD 2.x</h3>
            <p className="text-slate-500 text-sm">Unterstützt ZUGFeRD 2.0–2.4, Factur-X und XRechnung Profile.</p>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-slate-200 text-center text-slate-400 text-sm">
          <p>
            Ein kostenloses Tool von{' '}
            <Link href="/" className="text-blue-600 hover:text-blue-700">Pro-meister.de</Link>
            {' '}— Die Handwerker-Plattform für digitale Rechnungen.
          </p>
          <div className="flex justify-center gap-6 mt-3">
            <Link href="/impressum" className="hover:text-slate-600">Impressum</Link>
            <Link href="/datenschutz" className="hover:text-slate-600">Datenschutz</Link>
          </div>
        </footer>
      </main>
    </div>
  )
}
