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
  const [exportLoading, setExportLoading] = useState(false)

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

  const handleExport = async () => {
    setExportLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/user/export', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      })
      if (!res.ok) throw new Error('Export fehlgeschlagen')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `pro-meister-export-${new Date().toISOString().split('T')[0]}.zip`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert('Fehler: ' + err.message)
    } finally {
      setExportLoading(false)
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
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-slate-400 hover:text-white transition-colors"
          >
            ← Zurück
          </Link>
          <button
            onClick={async () => { if (!confirm('Möchten Sie sich wirklich abmelden?')) return; await supabase.auth.signOut(); router.push('/login') }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-400 hover:text-red-400 border border-slate-700 hover:border-red-500/50 rounded-lg transition-colors"
          >
            🚪 Abmelden
          </button>
        </div>
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
            {isLocked ? (
              <a
                href="/dashboard/subscription"
                className="self-start px-3 py-1.5 bg-slate-600 hover:bg-slate-500 text-white light-invert-text text-sm font-medium rounded-lg transition-colors"
              >
                🔒 PRO freischalten →
              </a>
            ) : (
              <a
                href="/dashboard/invoices?tab=settings"
                className="self-start px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Zu den Einstellungen →
              </a>
            )}
          </div>
        </div>

        {/* Quick Actions Section */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Schnellzugriff</h3>
          
          <div className="space-y-3">
            {isLocked ? (
              <div className="block p-3 bg-slate-700/30 rounded-lg opacity-50 cursor-not-allowed">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm" style={{ backgroundColor: '#9333ea' }}>💰</div>
                  <div className="flex-1">
                    <h4 className="text-white font-medium">Rechnungseinstellungen</h4>
                    <p className="text-slate-400 text-xs">Steuer, Bank, Logo, Zahlungsbedingungen</p>
                  </div>
                  <span className="text-xs text-white px-2 py-1 rounded-full" style={{ backgroundColor: '#2563eb' }}>🔒 Pro</span>
                </div>
              </div>
            ) : (
              <Link href="/dashboard/invoices?tab=settings" className="block p-3 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm" style={{ backgroundColor: '#9333ea' }}>💰</div>
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
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm" style={{ backgroundColor: '#16a34a' }}>🔧</div>
                  <div className="flex-1">
                    <h4 className="text-white font-medium">Meine Services</h4>
                    <p className="text-slate-400 text-xs">Dienstleistungen verwalten</p>
                  </div>
                  <span className="text-xs text-white px-2 py-1 rounded-full" style={{ backgroundColor: '#2563eb' }}>🔒 Pro</span>
                </div>
              </div>
            ) : (
              <Link href="/dashboard/services" className="block p-3 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm" style={{ backgroundColor: '#16a34a' }}>🔧</div>
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
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm" style={{ backgroundColor: '#2563eb' }}>👥</div>
                  <div className="flex-1">
                    <h4 className="text-white font-medium">Meine Kunden</h4>
                    <p className="text-slate-400 text-xs">Kundendatenbank verwalten</p>
                  </div>
                  <span className="text-xs text-white px-2 py-1 rounded-full" style={{ backgroundColor: '#2563eb' }}>🔒 Pro</span>
                </div>
              </div>
            ) : (
              <Link href="/dashboard/customers" className="block p-3 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm" style={{ backgroundColor: '#2563eb' }}>👥</div>
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
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm" style={{ backgroundColor: '#ea580c' }}>
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

      {/* Buchhalter-Zugang */}
      <BuchhalterZugangSection majstorId={majstor?.id} />

      {/* Daten exportieren */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
        <h3 className="text-white font-semibold mb-2">Meine Daten exportieren</h3>
        <p className="text-slate-400 text-sm mb-4">
          Laden Sie alle Ihre Daten als ZIP-Datei herunter (DSGVO Art. 20).
          Enthält: Profil, Rechnungen, Angebote, Kunden, Leistungen, Ausgaben.
        </p>
        <button
          onClick={handleExport}
          disabled={exportLoading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {exportLoading ? (
            <>
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
              Wird exportiert...
            </>
          ) : (
            '📥 Daten herunterladen'
          )}
        </button>
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
                className="w-full sm:w-64 px-3 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:border-red-500 transition-colors"
              />
            </div>

            {deleteError && (
              <p className="text-red-400 text-sm">{deleteError}</p>
            )}

            <button
              onClick={requestDeletion}
              disabled={deleteInput !== 'LÖSCHEN' || deleteLoading}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
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

function BuchhalterZugangSection({ majstorId }) {
  const [access, setAccess] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!majstorId) return
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { setLoading(false); return }
      fetch('/api/buchhalter-access', { headers: { Authorization: `Bearer ${session.access_token}` } })
        .then(r => r.json())
        .then(json => setAccess(json.data?.[0] || null))
        .catch(console.error)
        .finally(() => setLoading(false))
    })
  }, [majstorId])

  return (
    <div className="bg-slate-800/50 border border-teal-900/40 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-white mb-1">📒 Buchhalter-Zugang</h3>
      <p className="text-slate-400 text-sm mb-3">E-Mail für den Versand von ZIP-Exporten und optionalem Portal-Zugang.</p>

      {loading ? (
        <div className="h-6 w-6 border-[3px] border-slate-600 border-t-teal-500 rounded-full animate-spin" />
      ) : access ? (
        <div className="space-y-3">
          <div className="bg-slate-700/40 border border-slate-600 rounded-lg px-4 py-3">
            <p className="text-white text-sm font-medium">{access.buchhalter_email}</p>
            <a href="/dashboard/pdf-archive" className="inline-block mt-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors">
              Verwalten →
            </a>
          </div>
          <div className={`rounded-lg px-4 py-3 flex items-center gap-2 border ${access.buchhalter_id ? 'border-green-500' : 'border-slate-600'}`} style={{ backgroundColor: '#ffffff' }}>
            {access.buchhalter_id ? (
              <>
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs">✓</div>
                <span style={{ color: '#16a34a' }} className="text-sm font-medium">Portal-Zugang aktiv</span>
              </>
            ) : (
              <>
                <div className="w-6 h-6 bg-slate-600 rounded-full flex items-center justify-center text-slate-400 text-xs">—</div>
                <span style={{ color: '#64748b' }} className="text-sm">Kein Portal-Zugang</span>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 text-slate-400 text-sm">
          <span>Noch keine E-Mail gespeichert.</span>
          <a href="/dashboard/pdf-archive" className="text-teal-400 hover:text-teal-300 underline text-sm">Jetzt einrichten →</a>
        </div>
      )}
    </div>
  )
}