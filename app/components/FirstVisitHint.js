// app/components/FirstVisitHint.js
'use client'
import { useState, useEffect } from 'react'

const HINTS = {
  ubersicht: {
    icon: '📊',
    title: 'Willkommen bei Pro-Meister!',
    text: 'Hier sehen Sie Umsatz, offene Rechnungen und neue Kundenanfragen auf einen Blick. Bei Fragen hilft Ihnen jederzeit der KI-Assistent unten rechts.',
  },

  visitenkarte: {
    icon: '📇',
    title: 'Ihre digitale Visitenkarte',
    text: 'Erstellen Sie Ihren QR-Code oder teilen Sie den Link Ihrer Visitenkarte mit Kunden. Kunden können Sie direkt kontaktieren und Anfragen mit Fotos senden.',
  },

  anfragen: {
    icon: '📬',
    title: 'Kundenanfragen',
    text: 'Hier erscheinen alle Anfragen von Ihrer Visitenkarte. Fotos ansehen, antworten oder direkt ein Angebot erstellen.',
  },

  kunden: {
    icon: '👥',
    title: 'Kunden',
    text: 'Alle Kunden an einem Ort. Wenn Sie zum ersten Mal eine Rechnung für einen neuen Kunden erstellen, wird dieser automatisch für zukünftige Rechnungen gespeichert.',
  },

  rechnungen: {
    icon: '📋',
    title: 'Rechnungen & Angebote',
    text: 'Erstellen Sie professionelle Rechnungen, kompatibel mit Buchhaltungsprogrammen. Vor der ersten Rechnung müssen Sie in den Rechnungseinstellungen Ihre Firmen-, Steuer- und Bankdaten eintragen.',
  },

  services: {
    icon: '🔧',
    title: 'Leistungen',
    text: 'Legen Sie Ihre Standardleistungen mit Preisen an. Wenn Sie eine neue Leistung erstmals in eine Rechnung eintragen, merkt sich das System diese automatisch für später.',
  },

  archiv: {
    icon: '📁',
    title: 'PDF-Archiv',
    text: 'Hier finden Sie alle Rechnungen als PDF sowie Ihre Ausgaben-Belege. Filtern Sie nach Zeitraum und senden Sie alles gesammelt an Ihren Buchhalter.',
  },

  einstellungen: {
    icon: '⚙️',
    title: 'Einstellungen',
    text: 'Hier können Sie Ihr Profilbild ändern, Benachrichtigungen verwalten, zwischen Dark- und Light-Modus wechseln und Ihre Daten einsehen.',
  },

  ausgaben: {
    icon: '🧾',
    title: 'Ausgaben & Belege',
    text: 'Fotografieren Sie Ihre Belege direkt mit der Kamera oder laden Sie Fotos hoch. Alle Ausgaben werden gesammelt gespeichert und stehen für die Buchhaltung bereit.',
  },

  aufmass: {
    icon: '📐',
    title: 'Aufmaß',
    text: 'Erfassen Sie Raummaße direkt vor Ort. Räume anlegen, Maße eintragen und als PDF exportieren oder direkt in ein Angebot übernehmen.',
  },
}
export default function FirstVisitHint({ pageKey }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const key = `pm_hint_${pageKey}`
    if (!localStorage.getItem(key)) {
      setVisible(true)
    }
  }, [pageKey])

  if (!visible) return null

  const hint = HINTS[pageKey]
  if (!hint) return null

  const dismiss = () => {
    localStorage.setItem(`pm_hint_${pageKey}`, '1')
    setVisible(false)
  }

  return (
    <div className="bg-blue-500/10 border border-blue-600/40 rounded-xl p-3.5 mb-5 flex items-start gap-3">
      <span className="text-xl leading-none shrink-0 mt-0.5">{hint.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-blue-300 font-semibold text-sm mb-0.5">{hint.title}</p>
        <p className="text-slate-300 text-[13px] leading-relaxed">{hint.text}</p>
      </div>
      <button
        onClick={dismiss}
        className="shrink-0 bg-blue-600 text-white rounded-lg px-3 py-1 text-xs font-medium cursor-pointer whitespace-nowrap mt-0.5 hover:bg-blue-700 transition-colors"
      >
        OK ✓
      </button>
    </div>
  )
}
