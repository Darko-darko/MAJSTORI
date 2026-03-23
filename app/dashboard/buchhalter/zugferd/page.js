'use client'
import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'

export default function BuchhalterZugferdPage() {
  const [file, setFile] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [steps, setSteps] = useState([])
  const inputRef = useRef(null)
  const router = useRouter()

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
        new Promise(r => setTimeout(r, 3200))
      ])
      const json = await res.json()

      if (!res.ok) {
        setError(json.error || 'Fehler bei der Validierung')
      } else {
        setResult(json)
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
    setSteps([])
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="pb-20">
      {/* Back link */}
      <button
        onClick={() => router.push('/dashboard/buchhalter')}
        className="text-slate-400 hover:text-white text-sm mb-6 flex items-center gap-1 transition-colors"
      >
        ← Zurück zu Auftraggeber
      </button>

      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold text-white mb-1">ZUGFeRD / Factur-X prüfen</h1>
        <p className="text-slate-400 text-sm mb-8">
          Prüfen Sie PDF-Rechnungen auf ZUGFeRD 2.x / EN16931 Konformität.
        </p>

        {/* Upload Area */}
        {!result && !loading && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={`relative cursor-pointer border-2 border-dashed rounded-xl p-10 sm:p-14 text-center transition-all ${
              dragging
                ? 'border-teal-500 bg-teal-500/10'
                : 'border-slate-600 bg-slate-800/30 hover:border-teal-600 hover:bg-slate-800/50'
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            <div className="text-4xl mb-3">📄</div>
            <p className="text-white text-lg font-medium mb-1">
              PDF-Rechnung hier ablegen
            </p>
            <p className="text-slate-400 text-sm">
              oder klicken zum Auswählen — max. 10 MB
            </p>
          </div>
        )}

        {/* Info cards — visible when no result */}
        {!result && !loading && (
          <div className="grid grid-cols-3 gap-3 mt-6">
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
              <div className="text-xl mb-1.5">🔒</div>
              <p className="text-white text-xs font-medium mb-1">Datenschutz</p>
              <p className="text-slate-500 text-[10px]">Dateien werden nicht gespeichert.</p>
            </div>
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
              <div className="text-xl mb-1.5">⚡</div>
              <p className="text-white text-xs font-medium mb-1">Sofort-Ergebnis</p>
              <p className="text-slate-500 text-[10px]">EN16931, Pflichtfelder, Beträge.</p>
            </div>
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
              <div className="text-xl mb-1.5">📋</div>
              <p className="text-white text-xs font-medium mb-1">ZUGFeRD 2.x</p>
              <p className="text-slate-500 text-[10px]">ZUGFeRD, Factur-X, XRechnung.</p>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-slate-600 border-t-teal-500" />
              <p className="text-white font-medium truncate">{file?.name}</p>
            </div>
            <div className="space-y-2.5">
              {steps.map((step, i) => {
                const isLatest = i === steps.length - 1
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
        {error && (
          <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center">
            <p className="text-red-300">{error}</p>
            <button onClick={reset} className="mt-2 text-sm text-slate-400 hover:text-white underline">
              Erneut versuchen
            </button>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="space-y-4">
            {/* Status Banner */}
            <div className={`rounded-xl p-5 border ${
              result.valid
                ? 'bg-teal-500/10 border-teal-500/30'
                : result.zugferd
                  ? 'bg-amber-500/10 border-amber-500/30'
                  : 'bg-red-500/10 border-red-500/30'
            }`}>
              <div className="flex items-start gap-3">
                <div className="text-3xl">
                  {result.valid ? '✅' : result.zugferd ? '⚠️' : '❌'}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className={`text-lg font-bold ${
                    result.valid ? 'text-teal-300' : result.zugferd ? 'text-amber-300' : 'text-red-300'
                  }`}>
                    {result.valid
                      ? 'ZUGFeRD-konform'
                      : result.zugferd
                        ? 'ZUGFeRD erkannt — mit Fehlern'
                        : 'Kein ZUGFeRD-Dokument'
                    }
                  </h2>
                  <p className="text-slate-300 text-sm mt-1">{result.message}</p>
                  <p className="text-slate-500 text-xs mt-1 truncate">{file?.name}</p>
                </div>
              </div>
            </div>

            {/* Data Summary */}
            {result.data && Object.keys(result.data).length > 0 && (
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
                <h3 className="text-white font-semibold mb-3 text-sm">Dokumentdaten</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  {result.data.invoiceNumber && (
                    <div><span className="text-slate-500">Rechnungsnr.:</span> <span className="text-white ml-1">{result.data.invoiceNumber}</span></div>
                  )}
                  {result.data.issueDate && (
                    <div><span className="text-slate-500">Datum:</span> <span className="text-white ml-1">{result.data.issueDate}</span></div>
                  )}
                  {result.data.sellerName && (
                    <div><span className="text-slate-500">Verkäufer:</span> <span className="text-white ml-1">{result.data.sellerName}</span></div>
                  )}
                  {result.data.buyerName && (
                    <div><span className="text-slate-500">Käufer:</span> <span className="text-white ml-1">{result.data.buyerName}</span></div>
                  )}
                  {result.data.grandTotal !== undefined && (
                    <div><span className="text-slate-500">Gesamtbetrag:</span> <span className="text-white ml-1 font-medium">{result.data.grandTotal?.toFixed(2)} {result.data.currency || 'EUR'}</span></div>
                  )}
                  {result.data.taxTotal !== undefined && (
                    <div><span className="text-slate-500">MwSt.:</span> <span className="text-white ml-1">{result.data.taxTotal?.toFixed(2)} {result.data.currency || 'EUR'}</span></div>
                  )}
                  {result.data.lineItemCount > 0 && (
                    <div><span className="text-slate-500">Positionen:</span> <span className="text-white ml-1">{result.data.lineItemCount}</span></div>
                  )}
                  {result.data.typeCode && (
                    <div><span className="text-slate-500">Typ:</span> <span className="text-white ml-1">{result.data.typeCode === '380' ? 'Rechnung' : result.data.typeCode === '381' ? 'Gutschrift' : result.data.typeCode}</span></div>
                  )}
                </div>
              </div>
            )}

            {/* Errors */}
            {result.errors?.length > 0 && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5">
                <h3 className="text-red-300 font-semibold mb-2 text-sm">{result.errors.length} Fehler</h3>
                <div className="space-y-1.5">
                  {result.errors.map((err, i) => (
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

            {/* Warnings */}
            {result.warnings?.length > 0 && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-5">
                <h3 className="text-amber-300 font-semibold mb-2 text-sm">{result.warnings.length} Hinweis{result.warnings.length > 1 ? 'e' : ''}</h3>
                <div className="space-y-1.5">
                  {result.warnings.map((w, i) => (
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

            {/* Reset button */}
            <button
              onClick={reset}
              className="w-full py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-medium transition-colors text-sm"
            >
              Weitere PDF prüfen
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
