// app/dashboard/settings/page.js - SIMPLE VERSION
'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useTheme } from '@/lib/context/ThemeContext'
import AvatarUpload from '@/app/components/AvatarUpload'
import { usePushNotifications } from '@/lib/hooks/usePushNotifications'
import { useSubscription } from '@/lib/hooks/useSubscription'
import FirstVisitHint from '@/app/components/FirstVisitHint'

export default function SettingsPage() {
  const [majstor, setMajstor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const router = useRouter()
  const { theme, toggleTheme } = useTheme()
  const { supported, subscribed, loading: pushLoading, subscribe, unsubscribe } = usePushNotifications(majstor?.id)
  const { isFreemium, isInGracePeriod } = useSubscription(majstor?.id)
  const isLocked = isFreemium && !isInGracePeriod

  // Account deletion state
  const [deleteInput, setDeleteInput] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [pendingDeletion, setPendingDeletion] = useState(null) // deletion_scheduled_at date string

  useEffect(() => {
    loadMajstorData()
  }, [])

  const loadMajstorData = async () => {
    try {
      setLoading(true)
      
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        router.push('/login')
        return
      }

      // Get majstor profile
      const { data: majstorData, error: majstorError } = await supabase
        .from('majstors')
        .select('*')
        .eq('id', user.id)
        .single()

      if (majstorError) {
        setError('Fehler beim Laden des Profils')
        return
      }

      setMajstor(majstorData)
      if (majstorData.pending_deletion && majstorData.deletion_scheduled_at) {
        setPendingDeletion(majstorData.deletion_scheduled_at)
      }

    } catch (err) {
      console.error('Error loading majstor data:', err)
      setError('Fehler beim Laden der Daten')
    } finally {
      setLoading(false)
    }
  }

  const requestDeletion = async () => {
    setDeleteLoading(true)
    setDeleteError('')
    try {
      const res = await fetch('/api/account/delete', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Fehler')
      setPendingDeletion(data.deletion_scheduled_at)
      setDeleteInput('')
    } catch (err) {
      setDeleteError(err.message)
    } finally {
      setDeleteLoading(false)
    }
  }

  const cancelDeletion = async () => {
    setDeleteLoading(true)
    try {
      await fetch('/api/account/delete', { method: 'DELETE' })
      setPendingDeletion(null)
    } catch (err) {
      setDeleteError(err.message)
    } finally {
      setDeleteLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white text-xl">Laden...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
        <p className="text-red-400">{error}</p>
      </div>
    )
  }

  if (!majstor) return null

  return (
    <div className="space-y-6">
      <FirstVisitHint pageKey="einstellungen" />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">Einstellungen</h1>
          <p className="text-slate-400">
            Verwalten Sie Ihr Geschäftsprofil und allgemeine Einstellungen
          </p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex items-center text-slate-400 hover:text-white transition-colors"
        >
          ← Zurück zum Dashboard
        </Link>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Profilbild */}
        <div className="col-span-full">
          <AvatarUpload
            majstor={majstor}
            onAvatarUpdate={(url) => setMajstor(prev => ({ ...prev, avatar_url: url }))}
          />
        </div>

        {/* Erscheinungsbild (Tema) */}
        <div className="col-span-full bg-slate-800/50 border border-slate-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Erscheinungsbild</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Farbschema</p>
              <p className="text-slate-400 text-sm">
                {theme === 'dark' ? 'Dunkles Design (Standard)' : 'Helles Design'}
              </p>
            </div>
            <button
              onClick={toggleTheme}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                theme === 'light' ? 'bg-blue-600' : 'bg-slate-600'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                theme === 'light' ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>

          {supported && (
            <div className="flex items-center justify-between mt-5 pt-5 border-t border-slate-700">
              <div>
                <p className="text-white font-medium">Push-Benachrichtigungen</p>
                <p className="text-slate-400 text-sm">
                  {subscribed ? 'Aktiv — neue Anfragen & überfällige Rechnungen' : 'Deaktiviert'}
                </p>
              </div>
              <button
                onClick={subscribed ? unsubscribe : subscribe}
                disabled={pushLoading}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
                  subscribed ? 'bg-blue-600' : 'bg-slate-600'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  subscribed ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
          )}
        </div>

        {/* Geschäftsprofil Section */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Geschäftsprofil</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Vollständiger Name</label>
              <div className="px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white">
                {majstor?.full_name || 'Nicht angegeben'}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Firmenname</label>
              <div className="px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white">
                {majstor?.business_name || 'Nicht angegeben'}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">E-Mail</label>
              <div className="px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white">
                {majstor?.email || 'Nicht angegeben'}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Telefon</label>
              <div className="px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white">
                {majstor?.phone || 'Nicht angegeben'}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Stadt</label>
              <div className="px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white">
                {majstor?.city || 'Nicht angegeben'}
              </div>
            </div>

            {/* Logo Status */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Geschäftslogo</label>
              <div className="px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg">
                {majstor?.business_logo_url ? (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-xs">
                      ✓
                    </div>
                    <span className="text-green-400">Logo hochgeladen</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center text-slate-400 text-xs">
                      📷
                    </div>
                    <span className="text-slate-400">Kein Logo</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Logo Upload verfügbar in Rechnungen → Einstellungen
              </p>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg flex flex-col gap-2">
            <p className="text-blue-300 text-sm">
              💡 Geschäftsdaten können in den Rechnungseinstellungen bearbeitet werden
            </p>
            <a
              href="/dashboard/invoices?tab=settings"
              className="self-start px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Zu den Einstellungen →
            </a>
          </div>
        </div>

        {/* Quick Actions Section */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Schnellzugriff</h3>
          
          <div className="space-y-3">
            {isLocked ? (
              <div className="block p-3 bg-slate-700/30 rounded-lg opacity-50 cursor-not-allowed">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center text-white text-sm">💰</div>
                  <div className="flex-1">
                    <h4 className="text-white font-medium">Rechnungseinstellungen</h4>
                    <p className="text-slate-400 text-xs">Steuer, Bank, Logo, Zahlungsbedingungen</p>
                  </div>
                  <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded-full">🔒 Pro</span>
                </div>
              </div>
            ) : (
              <Link href="/dashboard/invoices?tab=settings" className="block p-3 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center text-white text-sm">💰</div>
                  <div>
                    <h4 className="text-white font-medium">Rechnungseinstellungen</h4>
                    <p className="text-slate-400 text-xs">Steuer, Bank, Logo, Zahlungsbedingungen</p>
                  </div>
                </div>
              </Link>
            )}

            {isLocked ? (
              <div className="block p-3 bg-slate-700/30 rounded-lg opacity-50 cursor-not-allowed">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center text-white text-sm">🔧</div>
                  <div className="flex-1">
                    <h4 className="text-white font-medium">Meine Services</h4>
                    <p className="text-slate-400 text-xs">Dienstleistungen verwalten</p>
                  </div>
                  <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded-full">🔒 Pro</span>
                </div>
              </div>
            ) : (
              <Link href="/dashboard/services" className="block p-3 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center text-white text-sm">🔧</div>
                  <div>
                    <h4 className="text-white font-medium">Meine Services</h4>
                    <p className="text-slate-400 text-xs">Dienstleistungen verwalten</p>
                  </div>
                </div>
              </Link>
            )}
            
            {isLocked ? (
              <div className="block p-3 bg-slate-700/30 rounded-lg opacity-50 cursor-not-allowed">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-sm">👥</div>
                  <div className="flex-1">
                    <h4 className="text-white font-medium">Meine Kunden</h4>
                    <p className="text-slate-400 text-xs">Kundendatenbank verwalten</p>
                  </div>
                  <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded-full">🔒 Pro</span>
                </div>
              </div>
            ) : (
              <Link href="/dashboard/customers" className="block p-3 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-sm">👥</div>
                  <div>
                    <h4 className="text-white font-medium">Meine Kunden</h4>
                    <p className="text-slate-400 text-xs">Kundendatenbank verwalten</p>
                  </div>
                </div>
              </Link>
            )}

            <Link
              href="/dashboard/business-card/create"
              className="block p-3 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center text-white text-sm">
                  📱
                </div>
                <div>
                  <h4 className="text-white font-medium">QR Visitenkarte</h4>
                  <p className="text-slate-400 text-xs">Digitale Visitenkarte erstellen</p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Konto löschen */}
      <div className="bg-slate-800/50 border border-red-900/40 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-red-400 mb-2">Konto löschen</h3>

        {pendingDeletion ? (
          <div className="space-y-3">
            <p className="text-slate-300 text-sm">
              Ihr Konto wird am <strong className="text-white">{new Date(pendingDeletion).toLocaleDateString('de-DE')}</strong> unwiderruflich gelöscht.
              Sie können dies jederzeit rückgängig machen.
            </p>
            <button
              onClick={cancelDeletion}
              disabled={deleteLoading}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {deleteLoading ? 'Bitte warten...' : 'Löschung abbrechen'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-slate-400 text-sm leading-relaxed">
              Alle Ihre Daten (Rechnungen, Angebote, Kundendaten) werden dauerhaft gelöscht.
              {majstor?.subscription_status === 'active'
                ? ' Da Sie ein aktives Pro-Abonnement haben, wird Ihr Konto nach Ablauf des Abonnements gelöscht.'
                : ' Das Konto wird nach 30 Tagen endgültig entfernt.'}
            </p>

            <div>
              <label className="block text-sm text-slate-400 mb-2">
                Geben Sie <strong className="text-white">LÖSCHEN</strong> ein, um fortzufahren:
              </label>
              <input
                type="text"
                value={deleteInput}
                onChange={e => { setDeleteInput(e.target.value); setDeleteError('') }}
                placeholder="LÖSCHEN"
                className="w-full sm:w-64 px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-red-500 transition-colors"
              />
            </div>

            {deleteError && (
              <p className="text-red-400 text-sm">{deleteError}</p>
            )}

            <button
              onClick={requestDeletion}
              disabled={deleteInput !== 'LÖSCHEN' || deleteLoading}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg text-sm font-medium transition-colors disabled:cursor-not-allowed"
            >
              {deleteLoading ? 'Bitte warten...' : 'Konto löschen'}
            </button>
          </div>
        )}
      </div>

      {/* System Info Section */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">System & Sicherheit</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-slate-400">Konto erstellt:</p>
            <p className="text-white">{majstor?.created_at ? new Date(majstor.created_at).toLocaleDateString('de-DE') : 'Unbekannt'}</p>
          </div>
          <div>
            <p className="text-slate-400">Letzte Aktualisierung:</p>
            <p className="text-white">{majstor?.updated_at ? new Date(majstor.updated_at).toLocaleDateString('de-DE') : 'Unbekannt'}</p>
          </div>
          <div>
            <p className="text-slate-400">Kontostatus:</p>
            <p className="text-green-400">{pendingDeletion ? `Löschung geplant: ${new Date(pendingDeletion).toLocaleDateString('de-DE')}` : 'Aktiv'}</p>
          </div>
          <div>
            <p className="text-slate-400">Rechnungsnummerierung:</p>
            <p className="text-white">{majstor?.numbers_initialized ? 'Eingerichtet' : 'Nicht eingerichtet'}</p>
          </div>
        </div>
      </div>
    </div>
  )
}