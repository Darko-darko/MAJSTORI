'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const DEBUG_USER_IDS = [
  '8a69040d-c51d-4eb5-9fbe-2351b86f2395', // tester
  'd5751ee7-595d-406f-91f4-ddd265e50ab0', // Luka
]

export default function DashboardError({ error, reset }) {
  const [userId, setUserId] = useState(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.id) setUserId(data.user.id)
    })
  }, [])

  useEffect(() => {
    console.error('Dashboard error:', error)
  }, [error])

  const isDebugUser = DEBUG_USER_IDS.includes(userId)

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-xl p-6 text-center">
        <div className="text-4xl mb-4">⚠️</div>
        <h2 className="text-white text-xl font-bold mb-2">Ein Fehler ist aufgetreten</h2>
        <p className="text-slate-400 text-sm mb-6">
          Bitte versuchen Sie es erneut. Wenn das Problem weiterhin besteht, kontaktieren Sie den Support.
        </p>

        {isDebugUser && (
          <div className="mb-6 text-left bg-red-500/10 border border-red-500/20 rounded-lg p-4 overflow-auto max-h-60">
            <p className="text-red-400 text-xs font-mono font-bold mb-1">DEBUG ({userId.slice(0, 8)}):</p>
            <p className="text-red-300 text-xs font-mono mb-2">{error?.message}</p>
            <pre className="text-red-400/70 text-[10px] font-mono whitespace-pre-wrap">{error?.stack}</pre>
          </div>
        )}

        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
          >
            Erneut versuchen
          </button>
          <a
            href="/dashboard"
            className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition-colors"
          >
            Zum Dashboard
          </a>
        </div>
      </div>
    </div>
  )
}
