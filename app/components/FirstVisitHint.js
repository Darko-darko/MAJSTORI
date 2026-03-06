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
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: '12px',
      backgroundColor: '#1e3a5f',
      border: '1px solid #2563eb',
      borderRadius: '12px',
      padding: '14px 16px',
      marginBottom: '20px',
    }}>
      <span style={{ fontSize: '22px', lineHeight: 1, flexShrink: 0, marginTop: '2px' }}>{hint.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ color: '#93c5fd', fontWeight: 600, fontSize: '14px', marginBottom: '3px' }}>{hint.title}</p>
        <p style={{ color: '#cbd5e1', fontSize: '13px', lineHeight: '1.5' }}>{hint.text}</p>
      </div>
      <button
        onClick={dismiss}
        style={{
          flexShrink: 0,
          backgroundColor: '#2563eb',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          padding: '5px 12px',
          fontSize: '12px',
          fontWeight: 500,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          marginTop: '1px',
        }}
      >
        OK ✓
      </button>
    </div>
  )
}
