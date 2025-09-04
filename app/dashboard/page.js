'use client'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function DashboardPage() {
  const [welcomeMessage, setWelcomeMessage] = useState(false)
  const searchParams = useSearchParams()

  useEffect(() => {
    if (searchParams.get('welcome')) {
      setWelcomeMessage(true)
      setTimeout(() => setWelcomeMessage(false), 5000)
    }
  }, [searchParams])

  return (
    <div className="space-y-8">
      {/* Welcome Message */}
      {welcomeMessage && (
        <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20 rounded-2xl p-6">
          <div className="flex items-center space-x-4">
            <div className="text-4xl">🎉</div>
            <div>
              <h3 className="text-xl font-bold text-white mb-2">Willkommen bei Majstori.de!</h3>
              <p className="text-slate-300">
                Ihr Account wurde erfolgreich erstellt. Sie haben 7 Tage kostenlosen Zugang zu allen Funktionen.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Kundenanfragen</p>
              <p className="text-3xl font-bold text-white">0</p>
              <p className="text-sm text-slate-400">Diese Woche</p>
            </div>
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-2xl">
              📧
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Rechnungen</p>
              <p className="text-3xl font-bold text-white">0</p>
              <p className="text-sm text-slate-400">Erstellt</p>
            </div>
            <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center text-2xl">
              📄
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">QR Scans</p>
              <p className="text-3xl font-bold text-white">0</p>
              <p className="text-sm text-slate-400">Heute</p>
            </div>
            <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center text-2xl">
              📱
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-6">Erste Schritte</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-2xl mb-4">
              📱
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">QR Visitenkarte erstellen</h3>
            <p className="text-slate-400 text-sm mb-4">
              Erstellen Sie Ihre digitale Visitenkarte mit QR-Code für Kunden
            </p>
            <Link
              href="/dashboard/business-card/create"
              className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors"
            >
              Erstellen
            </Link>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
            <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center text-2xl mb-4">
              📄
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Erste Rechnung</h3>
            <p className="text-slate-400 text-sm mb-4">
              Erstellen Sie eine professionelle PDF-Rechnung für Ihre Kunden
            </p>
            <Link
              href="/dashboard/invoices/create"
              className="inline-block bg-purple-600 text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-purple-700 transition-colors"
            >
              Rechnung erstellen
            </Link>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-6">Dashboard Navigation</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <Link
            href="/dashboard/customers"
            className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition-colors"
          >
            <div className="text-2xl mb-2">👥</div>
            <div className="text-white font-medium text-sm">Meine Kunden</div>
          </Link>

          <Link
            href="/dashboard/inquiries"
            className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition-colors relative"
          >
            <div className="text-2xl mb-2">📧</div>
            <div className="text-white font-medium text-sm">Kundenanfragen</div>
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              0
            </span>
          </Link>

          <Link
            href="/dashboard/invoices"
            className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition-colors"
          >
            <div className="text-2xl mb-2">📄</div>
            <div className="text-white font-medium text-sm">Rechnungen</div>
          </Link>

          <Link
            href="/dashboard/warranties"
            className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition-colors"
          >
            <div className="text-2xl mb-2">🛡️</div>
            <div className="text-white font-medium text-sm">Garantien</div>
          </Link>

          <Link
            href="/dashboard/referrals"
            className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition-colors"
          >
            <div className="text-2xl mb-2">🎯</div>
            <div className="text-white font-medium text-sm">Empfehlungen</div>
          </Link>

          <Link
            href="/dashboard/analytics"
            className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition-colors"
          >
            <div className="text-2xl mb-2">📈</div>
            <div className="text-white font-medium text-sm">Analytics</div>
          </Link>

          <Link
            href="/dashboard/settings"
            className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition-colors"
          >
            <div className="text-2xl mb-2">⚙️</div>
            <div className="text-white font-medium text-sm">Einstellungen</div>
          </Link>

          <button
            onClick={() => {
              // Sign out logic
              window.location.href = '/'
            }}
            className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:border-red-600 transition-colors text-left"
          >
            <div className="text-2xl mb-2">🚪</div>
            <div className="text-white font-medium text-sm">Abmelden</div>
          </button>
        </div>
      </div>
    </div>
  )
}