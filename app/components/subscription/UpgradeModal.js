// app/components/subscription/UpgradeModal.js
'use client'
import { useState } from 'react'

/**
 * Hook za upravljanje Upgrade Modal-om
 */
export function useUpgradeModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [modalProps, setModalProps] = useState({})

  const showUpgradeModal = (feature, featureName, currentPlan) => {
    setModalProps({ feature, featureName, currentPlan })
    setIsOpen(true)
  }

  const hideUpgradeModal = () => {
    setIsOpen(false)
    setModalProps({})
  }

  return {
    isOpen,
    modalProps,
    showUpgradeModal,
    hideUpgradeModal
  }
}

/**
 * Centralni Upgrade Modal - prikazuje se kada Freemium korisnik pokuša da pristupi premium funkciji
 */
export function UpgradeModal({ isOpen, onClose, feature, featureName, currentPlan = 'Freemium' }) {
  if (!isOpen) return null

  const featureDescriptions = {
    'customer_inquiries': {
      icon: '📧',
      title: 'Online Kundenanfragen',
      description: 'Empfangen Sie Anfragen mit Fotos direkt über Ihre digitale Visitenkarte',
      benefits: [
        'Bis zu 5 Fotos pro Anfrage',
        'Automatische E-Mail-Benachrichtigungen', 
        'Strukturierte Anfragenverwaltung',
        'Direkter Kundenkontakt'
      ]
    },
    'customer_management': {
      icon: '👥',
      title: 'Kundenverwaltung',
      description: 'Verwalten Sie alle Ihre Kunden professionell an einem Ort',
      benefits: [
        'Unbegrenzte Kundenanzahl',
        'Kontakthistorie und Notizen',
        'Automatische Rechnungszuordnung',
        'Export-Funktionen'
      ]
    },
    'invoicing': {
      icon: '🧾',
      title: 'Professionelle Rechnungen',
      description: 'Erstellen Sie rechtskonforme Angebote und Rechnungen in Sekunden',
      benefits: [
        'Deutsche Rechnungsstandards (ZUGFeRD)',
        'Automatische Nummerierung',
        'SEPA QR-Codes für schnelle Zahlung',
        'PDF-Export und E-Mail-Versand'
      ]
    },
    'services_management': {
      icon: '🔧',
      title: 'Service Management',
      description: 'Verwalten Sie Ihre Dienstleistungen und Preise zentral',
      benefits: [
        'Unbegrenzte Services',
        'Standard-Preise definieren',
        'Schnelle Rechnungserstellung',
        'Service-Kategorien'
      ]
    }
  }

  const featureInfo = featureDescriptions[feature] || {
    icon: '⭐',
    title: featureName || 'Premium Feature',
    description: 'Diese Funktion ist ab dem Basic Plan verfügbar',
    benefits: ['Alle Premium-Funktionen', 'Professioneller Support']
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                <span className="text-2xl">{featureInfo.icon}</span>
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">{featureInfo.title}</h3>
                <p className="text-blue-400 text-sm">Premium Feature</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="text-slate-400 hover:text-white text-xl"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Description */}
          <p className="text-slate-300 mb-6 leading-relaxed">
            {featureInfo.description}
          </p>

          {/* Current Plan Info */}
          <div className="bg-slate-900/50 border border-slate-600 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-slate-400 text-sm">Aktueller Plan:</span>
                <div className="text-white font-semibold">{currentPlan}</div>
              </div>
              <div className="text-right">
                <span className="text-slate-400 text-sm">Benötigt:</span>
                <div className="text-blue-400 font-semibold">Basic Plan+</div>
              </div>
            </div>
          </div>

          {/* Benefits */}
          <div className="mb-6">
            <h4 className="text-white font-semibold mb-3">Was Sie erhalten:</h4>
            <div className="space-y-2">
              {featureInfo.benefits.map((benefit, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <span className="text-slate-300 text-sm">{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing Info */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-white font-bold text-lg">19,90€ <span className="text-sm font-normal text-blue-300">/Monat</span></div>
                <div className="text-blue-300 text-sm">Basic Plan - Alle aktuellen Features</div>
              </div>
              <div className="text-blue-300 text-sm">
                💡 7 Tage kostenlos
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                // TODO: Redirect to upgrade/billing page
                alert('Upgrade flow - uskoro implementiran!')
                onClose()
              }}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity"
            >
              🚀 Jetzt upgraden
            </button>
            <button
              onClick={onClose}
              className="bg-slate-600 text-white px-6 py-2 rounded-lg hover:bg-slate-700 transition-colors"
            >
              Später entscheiden
            </button>
          </div>

          {/* Footer Note */}
          <p className="text-slate-500 text-xs text-center mt-4">
            ✨ Keine Kreditkarte erforderlich • Jederzeit kündbar
          </p>
        </div>
      </div>
    </div>
  )
}