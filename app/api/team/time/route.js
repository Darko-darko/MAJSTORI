// app/api/team/time/route.js — Zeiterfassung Start/Stop/List
import { createClient } from '@supabase/supabase-js'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

async function getUser(request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return null
  const admin = getAdmin()
  const { data: { user } } = await admin.auth.getUser(token)
  return user || null
}

// GET — list time entries (worker sees own, owner sees all team)
export async function GET(request) {
  try {
    const user = await getUser(request)
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = getAdmin()
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') // YYYY-MM-DD
    const workerId = searchParams.get('worker_id')

    // Check if user is owner or worker
    const { data: majstor } = await admin
      .from('majstors')
      .select('role')
      .eq('id', user.id)
      .single()

    let query = admin.from('work_times').select('*')

    if (majstor?.role === 'worker') {
      // Worker sees only own entries
      query = query.eq('worker_id', user.id)
    } else {
      // Owner sees all team entries
      query = query.eq('owner_id', user.id)
      if (workerId) query = query.eq('worker_id', workerId)
    }

    if (date) {
      query = query.gte('start_time', `${date}T00:00:00`)
        .lt('start_time', `${date}T23:59:59`)
    }

    const { data: entries, error } = await query.order('start_time', { ascending: false })

    if (error) return Response.json({ error: error.message }, { status: 500 })

    return Response.json({ entries })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

// POST — start or stop time tracking
export async function POST(request) {
  try {
    const user = await getUser(request)
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { action, lat, lng, note, break_minutes } = body
    const admin = getAdmin()

    // Get owner_id from team_members
    const { data: membership } = await admin
      .from('team_members')
      .select('owner_id')
      .eq('worker_id', user.id)
      .eq('status', 'active')
      .single()

    if (!membership) {
      return Response.json({ error: 'Kein aktives Team gefunden' }, { status: 403 })
    }

    if (action === 'start') {
      // Check if already running
      const { data: running } = await admin
        .from('work_times')
        .select('id')
        .eq('worker_id', user.id)
        .eq('status', 'running')
        .single()

      if (running) {
        return Response.json({ error: 'Zeiterfassung läuft bereits' }, { status: 400 })
      }

      const { data: entry, error } = await admin
        .from('work_times')
        .insert({
          worker_id: user.id,
          owner_id: membership.owner_id,
          start_time: new Date().toISOString(),
          start_lat: lat || null,
          start_lng: lng || null,
          status: 'running',
        })
        .select()
        .single()

      if (error) return Response.json({ error: error.message }, { status: 500 })

      return Response.json({ entry, action: 'started' })
    }

    if (action === 'stop') {
      // Find running entry
      const { data: running } = await admin
        .from('work_times')
        .select('*')
        .eq('worker_id', user.id)
        .eq('status', 'running')
        .single()

      if (!running) {
        return Response.json({ error: 'Keine laufende Zeiterfassung' }, { status: 400 })
      }

      const { data: entry, error } = await admin
        .from('work_times')
        .update({
          end_time: new Date().toISOString(),
          end_lat: lat || null,
          end_lng: lng || null,
          break_minutes: break_minutes || 0,
          note: note || null,
          status: 'completed',
        })
        .eq('id', running.id)
        .select()
        .single()

      if (error) return Response.json({ error: error.message }, { status: 500 })

      return Response.json({ entry, action: 'stopped' })
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

// DELETE — owner deletes a time entry
export async function DELETE(request) {
  try {
    const user = await getUser(request)
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const entryId = searchParams.get('id')
    if (!entryId) return Response.json({ error: 'Missing id' }, { status: 400 })

    const admin = getAdmin()

    // Only owner can delete
    const { data: entry } = await admin
      .from('work_times')
      .select('owner_id')
      .eq('id', entryId)
      .single()

    if (!entry) return Response.json({ error: 'Nicht gefunden' }, { status: 404 })
    if (entry.owner_id !== user.id) return Response.json({ error: 'Nicht berechtigt' }, { status: 403 })

    const { error } = await admin
      .from('work_times')
      .delete()
      .eq('id', entryId)

    if (error) return Response.json({ error: error.message }, { status: 500 })

    return Response.json({ deleted: true })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
