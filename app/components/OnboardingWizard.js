// app/components/OnboardingWizard.js - FLOATING ONBOARDING WIDGET

'use client'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

export default function OnboardingWizard({ majstor, trialInfo }) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState(new Set())
  const [isDismissed, setIsDismissed] = useState(false)
  const pathname = usePathname()

  // 🎯 Onboarding steps with smart triggers
  const getOnboardingSteps = () => {
    const baseSteps = [
      {
        id: 'welcome',
        title: '👋 Willkommen bei Majstori.de!',
        description: 'Lassen Sie uns Ihre digitale Handwerker-Präsenz aufbauen',
        action: 'Los geht\'s!',
        href: '/dashboard',
        completedWhen: () => true // Always show first
      },
      {
        id: 'business_card',
        title: '📱 QR Visitenkarte erstellen',
        description: 'Erstellen Sie Ihre digitale Visitenkarte mit QR-Code für Kunden',
        action: 'Visitenkarte erstellen',
        href: '/dashboard/business-card/create',
        completedWhen: () => majstor?.business_cards?.length > 0
      },
      {
        id: 'first_customer',
        title: '👥 Ersten Kunden hinzufügen',
        description: 'Fügen Sie Ihre ersten Kunden hinzu für bessere Verwaltung',
        action: 'Kunden hinzufügen',
        href: '/dashboard/customers',
        completedWhen: () => majstor?.customers_count > 0
      },
      {
        id: 'first_invoice',
        title: '📄 Erste Rechnung erstellen',
        description: 'Erstellen Sie professionelle PDF-Rechnungen für Ihre Kunden',
        action: 'Rechnung erstellen',
        href: '/dashboard/invoices',
        completedWhen: () => majstor?.invoices_count > 0
      }
    ]

    // 🔥 TRIAL-specific steps
    if (trialInfo?.isTrialUser) {
      baseSteps.push({
        id: 'trial_ending',
        title: '⚠️ Trial läuft ab',
        description: `Nur noch ${trialInfo.daysRemaining} Tage! Upgraden Sie jetzt für unbegrenzten Zugang.`,
        action: 'Jetzt upgraden',
        href: '/dashboard/billing',
        completedWhen: () => false, // Always show during trial
        priority: trialInfo.daysRemaining <= 2 ? 'high' : 'normal'
      })
    }

    return baseSteps
  }

  // 🎯 Get current step based on completion
  const getCurrentStep = () => {
    const steps = getOnboardingSteps()
    const incompletedSteps = steps.filter(step => !step.completedWhen())
    
    if (incompletedSteps.length === 0) {
      return steps[steps.length - 1] // Last step or trial ending
    }
    
    // Prioritize high-priority steps (like trial ending)
    const highPrioritySteps = incompletedSteps.filter(step => step.priority === 'high')
    if (highPrioritySteps.length > 0) {
      return highPrioritySteps[0]
    }
    
    return incompletedSteps[0]
  }

  // 🎯 Smart auto-show logic
  useEffect(() => {
    if (isDismissed || !majstor) return

    const currentStepData = getCurrentStep()
    if (!currentStepData) return

    // Auto-show conditions
    const shouldAutoShow = 
      trialInfo?.isTrialUser && 
      (trialInfo.daysRemaining <= 2 || pathname === '/dashboard')

    if (shouldAutoShow) {
      setTimeout(() => setIsOpen(true), 2000) // Show after 2 seconds
    }
  }, [pathname, trialInfo, majstor, isDismissed])

  // Save dismissal to localStorage
  const handleDismiss = () => {
    setIsOpen(false)
    setIsDismissed(true)
    localStorage.setItem('onboarding_dismissed', Date.now().toString())
  }

  // Check if previously dismissed (within 24 hours)
  useEffect(() => {
    const dismissed = localStorage.getItem('onboarding_dismissed')
    if (dismissed) {
      const dismissedTime = parseInt(dismissed)
      const now = Date.now()
      const hoursSinceDismissed = (now - dismissedTime) / (1000 * 60 * 60)
      
      if (hoursSinceDismissed < 24) {
        setIsDismissed(true)
      }
    }
  }, [])

  if (!majstor || isDismissed) return null

  const currentStepData = getCurrentStep()
  if (!currentStepData) return null

  const isHighPriority = currentStepData.priority === 'high'

  return (
    <>
      {/* 🎯 Floating Widget Button */}
      <div className="fixed bottom-6 right-6 z-50">
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            className={`relative w-16 h-16 rounded-full shadow-lg transition-all duration-300 hover:scale-105 ${
              isHighPriority 
                ? 'bg-gradient-to-r from-red-500 to-orange-500 animate-pulse' 
                : 'bg-gradient-to-r from-blue-500 to-purple-500'
            }`}
          >
            <span className="text-2xl text-white">
              {isHighPriority ? '⚠️' : '🎯'}
            </span>
            
            {/* Pulse effect for high priority */}
            {isHighPriority && (
              <div className="absolute inset-0 rounded-full bg-red-500 opacity-30 animate-ping"></div>
            )}
            
            {/* Notification badge */}
            <div className={`absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
              isHighPriority ? 'bg-red-600' : 'bg-blue-600'
            }`}>
              {getOnboardingSteps().filter(s => !s.completedWhen()).length}
            </div>
          </button>
        )}
      </div>

      {/* 🎯 Expanded Widget Panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-80 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl animate-in slide-in-from-bottom-4">
          {/* Header */}
          <div className={`p-4 rounded-t-2xl ${
            isHighPriority 
              ? 'bg-gradient-to-r from-red-500/20 to-orange-500/20 border-b border-red-500/30' 
              : 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-b border-blue-500/30'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  isHighPriority ? 'bg-red-500' : 'bg-blue-500'
                }`}>
                  <span className="text-white text-sm">
                    {isHighPriority ? '⚠️' : '🎯'}
                  </span>
                </div>
                <div>
                  <h3 className={`font-semibold ${
                    isHighPriority ? 'text-red-300' : 'text-blue-300'
                  }`}>
                    Handwerker-Assistent
                  </h3>
                  <p className="text-xs text-slate-400">
                    {trialInfo?.isTrialUser 
                      ? `Trial: ${trialInfo.daysRemaining} Tage übrig` 
                      : 'Ihr digitaler Helfer'
                    }
                  </p>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="text-slate-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Current Step Content */}
          <div className="p-4">
            <div className="mb-4">
              <h4 className="text-white font-semibold mb-2">
                {currentStepData.title}
              </h4>
              <p className="text-slate-300 text-sm leading-relaxed">
                {currentStepData.description}
              </p>
            </div>

            {/* Progress Indicator */}
            <div className="mb-4">
              <div className="flex justify-between text-xs text-slate-400 mb-2">
                <span>Fortschritt</span>
                <span>
                  {getOnboardingSteps().filter(s => s.completedWhen()).length} / {getOnboardingSteps().length}
                </span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-500 ${
                    isHighPriority 
                      ? 'bg-gradient-to-r from-red-500 to-orange-500' 
                      : 'bg-gradient-to-r from-blue-500 to-purple-500'
                  }`}
                  style={{ 
                    width: `${(getOnboardingSteps().filter(s => s.completedWhen()).length / getOnboardingSteps().length) * 100}%` 
                  }}
                />
              </div>
            </div>

            {/* Action Button */}
            <Link
              href={currentStepData.href}
              onClick={() => setIsOpen(false)}
              className={`w-full py-3 px-4 rounded-lg font-semibold text-center block transition-colors ${
                isHighPriority
                  ? 'bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white'
                  : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white'
              }`}
            >
              {currentStepData.action}
            </Link>

            {/* Quick Links */}
            <div className="mt-4 pt-4 border-t border-slate-700">
              <p className="text-xs text-slate-400 mb-2">Schnellzugriff:</p>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/dashboard/business-card/create"
                  className="text-xs text-slate-300 hover:text-white p-2 bg-slate-700/50 rounded transition-colors"
                >
                  📱 Visitenkarte
                </Link>
                <Link
                  href="/dashboard/invoices"
                  className="text-xs text-slate-300 hover:text-white p-2 bg-slate-700/50 rounded transition-colors"
                >
                  📄 Rechnungen
                </Link>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-4 py-3 bg-slate-900/50 rounded-b-2xl border-t border-slate-700">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">
                💡 Tipp: Klicken Sie jederzeit auf das Symbol für Hilfe
              </span>
              <button
                onClick={handleDismiss}
                className="text-slate-400 hover:text-white transition-colors"
              >
                Für heute schließen
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}