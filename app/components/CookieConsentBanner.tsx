'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

// ─── Window type declarations ────────────────────────────────────────────────
declare global {
  interface Window {
    gtag: (...args: unknown[]) => void
    dataLayer: unknown[]
  }
}

// ─── Types ───────────────────────────────────────────────────────────────────
interface ConsentPrefs {
  ads: boolean
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function parseCookieConsent(): ConsentPrefs | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(/(^|; )cookie_consent=([^;]*)/)
  if (!match) return null
  try {
    return JSON.parse(decodeURIComponent(match[2]))
  } catch {
    return null
  }
}

function setConsentCookie(prefs: ConsentPrefs) {
  const expires = new Date()
  expires.setFullYear(expires.getFullYear() + 1)
  document.cookie =
    `cookie_consent=${encodeURIComponent(JSON.stringify(prefs))}` +
    `; expires=${expires.toUTCString()}; path=/; SameSite=Lax`
}

function applyConsent(prefs: ConsentPrefs) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return
  window.gtag('consent', 'update', {
    ad_storage:         prefs.ads ? 'granted' : 'denied',
    ad_user_data:       prefs.ads ? 'granted' : 'denied',
    ad_personalization: prefs.ads ? 'granted' : 'denied',
    analytics_storage:  'denied', // GA4 not active yet
  })
}

// ─── CookieConsentBanner (default export) ────────────────────────────────────
export default function CookieConsentBanner() {
  const [bannerVisible, setBannerVisible] = useState(false)
  const [modalVisible,  setModalVisible]  = useState(false)
  const [adsChecked,    setAdsChecked]    = useState(false)

  useEffect(() => {
    const prefs = parseCookieConsent()
    if (prefs !== null) {
      // Consent already saved — apply silently, no banner
      applyConsent(prefs)
    } else {
      setBannerVisible(true)
    }

    // Allow /privacy page (and any other page) to reopen the modal
    const handleOpen = () => {
      setAdsChecked(parseCookieConsent()?.ads ?? false)
      setModalVisible(true)
    }
    window.addEventListener('openCookieSettings', handleOpen)
    return () => window.removeEventListener('openCookieSettings', handleOpen)
  }, [])

  // ── Actions ──
  const acceptAll = () => {
    const prefs: ConsentPrefs = { ads: true }
    setConsentCookie(prefs)
    applyConsent(prefs)
    setBannerVisible(false)
    setModalVisible(false)
  }

  const rejectAll = () => {
    const prefs: ConsentPrefs = { ads: false }
    setConsentCookie(prefs)
    applyConsent(prefs)
    setBannerVisible(false)
    setModalVisible(false)
  }

  const openCustomize = () => {
    setAdsChecked(parseCookieConsent()?.ads ?? false)
    setModalVisible(true)
  }

  const saveCustom = () => {
    const prefs: ConsentPrefs = { ads: adsChecked }
    setConsentCookie(prefs)
    applyConsent(prefs)
    setBannerVisible(false)
    setModalVisible(false)
  }

  // Nothing to render (consent already set, no pending interaction)
  if (!bannerVisible && !modalVisible) return null

  return (
    <>
      {/* ── Customize Modal ───────────────────────────────────────────── */}
      {modalVisible && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h2 className="text-white text-lg font-bold mb-5">Cookie-Einstellungen</h2>

            {/* Notwendige Cookies — always on */}
            <div className="flex items-start gap-3 mb-4 pb-4 border-b border-slate-700">
              <div className="mt-0.5 flex-shrink-0 w-10 h-6 rounded-full bg-slate-600 flex items-center justify-end px-1 opacity-50 cursor-not-allowed">
                <span className="w-4 h-4 bg-white rounded-full block" />
              </div>
              <div>
                <p className="text-white text-sm font-semibold">Notwendige Cookies</p>
                <p className="text-slate-400 text-xs mt-1">
                  Für Anmeldung, Sitzungsverwaltung und Sicherheit. Immer aktiv,
                  keine Einwilligung erforderlich (§&nbsp;25 Abs.&nbsp;2 TTDSG).
                </p>
              </div>
            </div>

            {/* Google Ads — toggleable */}
            <div className="flex items-start gap-3 mb-6">
              <button
                role="switch"
                aria-checked={adsChecked}
                onClick={() => setAdsChecked(!adsChecked)}
                className={`mt-0.5 flex-shrink-0 w-10 h-6 rounded-full transition-colors ${
                  adsChecked ? 'bg-blue-600' : 'bg-slate-600'
                }`}
              >
                <span
                  className={`block w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    adsChecked ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
              <div>
                <p className="text-white text-sm font-semibold">Google Ads (Werbung)</p>
                <p className="text-slate-400 text-xs mt-1">
                  Conversion-Tracking für unsere Google-Werbekampagnen.
                  Rechtsgrundlage: Art.&nbsp;6 Abs.&nbsp;1 lit.&nbsp;a DSGVO.
                </p>
              </div>
            </div>

            {/* Buttons — accept and reject equally accessible (GDPR) */}
            <div className="flex flex-col gap-2">
              <button
                onClick={saveCustom}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-semibold text-sm transition-colors"
              >
                Auswahl speichern
              </button>
              <button
                onClick={acceptAll}
                className="w-full bg-slate-700 hover:bg-slate-600 text-white py-2.5 rounded-xl font-semibold text-sm transition-colors"
              >
                Alle akzeptieren
              </button>
              <button
                onClick={rejectAll}
                className="w-full bg-slate-700 hover:bg-slate-600 text-white py-2.5 rounded-xl font-semibold text-sm transition-colors"
              >
                Alle ablehnen
              </button>
            </div>

            <p className="text-slate-500 text-xs mt-4 text-center">
              <Link href="/privacy" className="hover:text-slate-300">Datenschutz</Link>
              {' · '}
              <Link href="/imprint" className="hover:text-slate-300">Impressum</Link>
            </p>
          </div>
        </div>
      )}

      {/* ── Bottom Banner ─────────────────────────────────────────────── */}
      {bannerVisible && !modalVisible && (
        <div className="fixed bottom-0 left-0 right-0 z-[9998] bg-slate-900 border-t border-slate-700 p-4 shadow-2xl">
          <div className="max-w-4xl mx-auto">
            <p className="text-slate-300 text-sm mb-3 text-center">
              Wir verwenden Cookies. Notwendige Cookies sind immer aktiv. Mit Ihrer Einwilligung
              setzen wir <strong className="text-white">Google Ads Cookies</strong> ein,
              um die Wirksamkeit unserer Werbung zu messen.{' '}
              <Link href="/privacy" className="text-blue-400 hover:text-blue-300 underline">
                Datenschutzerklärung
              </Link>
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              <button
                onClick={acceptAll}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-semibold text-sm transition-colors"
              >
                Alles akzeptieren
              </button>
              <button
                onClick={rejectAll}
                className="bg-slate-700 hover:bg-slate-600 text-white px-5 py-2 rounded-lg font-semibold text-sm transition-colors"
              >
                Ablehnen
              </button>
              <button
                onClick={openCustomize}
                className="border border-slate-600 hover:border-slate-400 text-slate-300 hover:text-white px-5 py-2 rounded-lg font-semibold text-sm transition-colors bg-transparent"
              >
                Anpassen
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─── CookieSettingsButton (named export) ─────────────────────────────────────
// Used on /privacy to let returning users change their preferences.
export function CookieSettingsButton() {
  return (
    <button
      onClick={() => window.dispatchEvent(new Event('openCookieSettings'))}
      className="mt-4 inline-flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
    >
      Cookie-Einstellungen ändern
    </button>
  )
}
