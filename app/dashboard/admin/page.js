'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

const ADMIN_EMAILS = ['darko.jocic.ns@gmail.com', 'novakovicdusan555@gmail.com']

const STATUS_COLORS = {
  active:    'bg-green-500/20 text-green-400 border border-green-500/30',
  trial:     'bg-orange-500/20 text-orange-400 border border-orange-500/30',
  cancelled: 'bg-red-500/20 text-red-400 border border-red-500/30',
  expired:   'bg-slate-500/20 text-slate-400 border border-slate-500/30',
}

function StatusBadge({ status, cancelAtPeriodEnd, periodEnd }) {
  const isCancelled = cancelAtPeriodEnd || status === 'cancelled'
  const effectiveStatus = isCancelled ? 'cancelled' : status
  const cls = STATUS_COLORS[effectiveStatus] || 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
  const label = isCancelled
    ? (periodEnd ? new Date(periodEnd).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' }) : 'Gekündigt')
    : status === null ? '—' : status
  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${cls}`}>
      {label}
    </span>
  )
}

function StatCard({ label, value, color = 'text-white' }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value ?? '—'}</p>
    </div>
  )
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function AdminPage() {
  const router = useRouter()
  const [authChecked, setAuthChecked] = useState(false)
  const [token, setToken]   = useState(null)
  const [stats, setStats]   = useState(null)
  const [users, setUsers]   = useState([])
  const [buchhalters, setBuchhalters] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState('')

  // Client-side admin guard — also grab access token for API calls
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user || !ADMIN_EMAILS.includes(session.user.email)) {
        router.replace('/dashboard')
      } else {
        setToken(session.access_token)
        setAuthChecked(true)
      }
    })
  }, [router])

  // Fetch stats
  useEffect(() => {
    if (!authChecked || !token) return
    fetch('/api/admin/stats', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => setStats(d))
      .catch(() => {})
  }, [authChecked, token])

  // Fetch users
  useEffect(() => {
    if (!authChecked || !token) return
    setLoading(true)
    const params = new URLSearchParams()
    if (search)       params.set('search', search)
    if (statusFilter) params.set('status', statusFilter)
    fetch(`/api/admin/users?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => { setUsers(d.users || []); setBuchhalters(d.buchhalters || []); setError('') })
      .catch(() => setError('Fehler beim Laden der Benutzer.'))
      .finally(() => setLoading(false))
  }, [authChecked, token, search, statusFilter])

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const FILTERS = [
    { label: 'Alle',      value: '' },
    { label: 'Active',    value: 'active' },
    { label: 'Trial',     value: 'trial' },
    { label: 'Cancelled', value: 'cancelled' },
  ]

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
            <p className="text-slate-400 text-sm mt-1">Read-only overview</p>
          </div>
          <Link href="/dashboard" className="text-sm text-slate-400 hover:text-white transition-colors">
            ← Dashboard
          </Link>
        </div>

        {/* Quick links */}
        <div className="flex gap-3 mb-8">
          <Link
            href="/dashboard/admin/partners"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600/20 border border-blue-500/40 hover:bg-blue-600/30 text-blue-400 rounded-lg text-sm font-medium transition-colors"
          >
            🤝 Partner-Verwaltung
          </Link>
        </div>

        {/* Stats */}
        {stats && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
              <StatCard label="Registrierte Nutzer" value={stats.totalUsers} />
              <StatCard label="Aktive Abos"          value={stats.activeSubs}    color="text-green-400" />
              <StatCard label="Trial"                value={stats.trialSubs}     color="text-orange-400" />
              <StatCard label="E-Mails heute"        value={`${stats.emailsToday} / 100`} color={stats.emailsToday >= 80 ? 'text-red-400' : stats.emailsToday >= 50 ? 'text-yellow-400' : 'text-green-400'} />
            </div>
            <hr className="border-slate-700 my-4" />
            <div className="grid grid-cols-2 gap-4 mb-8">
              <StatCard label="📒 Buchhalter" value={buchhalters.length} color="text-blue-400" />
              <StatCard label="📒 Mandanten" value={buchhalters.reduce((sum, b) => sum + (b.mandant_count || 0), 0)} color="text-teal-400" />
            </div>
          </>
        )}

        {/* Search + Filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <input
            type="text"
            placeholder="Suche nach E-Mail oder Firma..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-2">
            {FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`px-3 py-2 text-xs rounded-lg font-medium transition-colors ${
                  statusFilter === f.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm mb-4">{error}</div>
        )}

        <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-slate-700 text-left">
                <th className="px-4 py-3 text-slate-400 font-medium">E-Mail</th>
                <th className="px-4 py-3 text-slate-400 font-medium">Firma</th>
                <th className="px-4 py-3 text-slate-400 font-medium">Plan</th>
                <th className="px-4 py-3 text-slate-400 font-medium">Status</th>
                <th className="px-4 py-3 text-slate-400 font-medium">Rechnungen</th>
                <th className="px-4 py-3 text-slate-400 font-medium">Anfragen</th>
                <th className="px-4 py-3 text-slate-400 font-medium">Läuft bis</th>
                <th className="px-4 py-3 text-slate-400 font-medium">Registriert</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">Laden...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">Keine Nutzer gefunden.</td>
                </tr>
              ) : (
                users.map(u => (
                  <tr key={u.id} className="border-b border-slate-700/50 last:border-0 hover:bg-slate-700/30 transition-colors">
                    <td className="px-4 py-3 text-white">{u.email}</td>
                    <td className="px-4 py-3 text-slate-300">{u.business_name || '—'}</td>
                    <td className="px-4 py-3 text-slate-300">{u.sub_plan || '—'}</td>
                    <td className="px-4 py-3"><StatusBadge status={u.sub_status} cancelAtPeriodEnd={u.cancel_at_period_end} periodEnd={u.current_period_end} /></td>
                    <td className="px-4 py-3 text-slate-300 text-center">{u.invoice_count ?? 0}</td>
                    <td className="px-4 py-3 text-slate-300 text-center">{u.inquiry_count ?? 0}</td>
                    <td className="px-4 py-3 text-slate-400">{formatDate(u.current_period_end)}</td>
                    <td className="px-4 py-3 text-slate-400">{formatDate(u.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <p className="text-slate-600 text-xs mt-4 text-right">{users.length} Nutzer</p>

        {/* Buchhalter Section */}
        {buchhalters.length > 0 && (
          <div className="mt-10">
            <h2 className="text-lg font-bold text-white mb-4">📒 Buchhalter</h2>
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-x-auto">
              <table className="w-full text-sm min-w-[480px]">
                <thead>
                  <tr className="border-b border-slate-700 text-left">
                    <th className="px-4 py-3 text-slate-400 font-medium">E-Mail</th>
                    <th className="px-4 py-3 text-slate-400 font-medium">Name</th>
                    <th className="px-4 py-3 text-slate-400 font-medium text-center">Mandanten</th>
                    <th className="px-4 py-3 text-slate-400 font-medium text-center">Ausstehend</th>
                    <th className="px-4 py-3 text-slate-400 font-medium">Registriert</th>
                  </tr>
                </thead>
                <tbody>
                  {buchhalters.map(b => (
                    <tr key={b.id} className="border-b border-slate-700/50 last:border-0 hover:bg-slate-700/30 transition-colors">
                      <td className="px-4 py-3 text-white">{b.email}</td>
                      <td className="px-4 py-3 text-slate-300">{b.full_name || b.business_name || '—'}</td>
                      <td className="px-4 py-3 text-center">
                        {b.mandant_count > 0
                          ? <span className="text-green-400 font-medium">{b.mandant_count}</span>
                          : <span className="text-slate-500">0</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-center">
                        {b.pending_count > 0
                          ? <span className="text-amber-400 font-medium">{b.pending_count}</span>
                          : <span className="text-slate-500">0</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-slate-400">{formatDate(b.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-slate-600 text-xs mt-4 text-right">{buchhalters.length} Buchhalter</p>
          </div>
        )}

        {/* Google Analytics link */}
        <div className="mt-8 bg-slate-800/50 border border-slate-700 rounded-xl p-5 flex items-center justify-between">
          <div>
            <p className="text-white font-medium text-sm">Google Analytics</p>
            <p className="text-slate-400 text-xs mt-0.5">Posjete, lokacije, uređaji — detaljni podaci</p>
          </div>
          <a
            href="https://analytics.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Otvori GA →
          </a>
        </div>
      </div>
    </div>
  )
}
