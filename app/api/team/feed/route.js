// app/api/team/feed/route.js — Feed: all activity from all workers
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

export async function GET(request) {
  try {
    const user = await getUser(request)
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = getAdmin()
    const { data: majstor } = await admin.from('majstors').select('role').eq('id', user.id).single()

    let feedItems = []

    if (majstor?.role === 'worker') {
      // Worker sees own feed + replies to own posts
      const { data: ownReports } = await admin
        .from('task_reports')
        .select('id')
        .eq('worker_id', user.id)

      const ownIds = (ownReports || []).map(r => r.id)

      const { data: reports } = await admin
        .from('task_reports')
        .select('*, task:task_id(title, location)')
        .or(`worker_id.eq.${user.id}${ownIds.length > 0 ? `,parent_id.in.(${ownIds.join(',')})` : ''}`)
        .order('created_at', { ascending: false })
        .limit(50)

      const { data: times } = await admin
        .from('work_times')
        .select('*')
        .eq('worker_id', user.id)
        .order('start_time', { ascending: false })
        .limit(20)

      feedItems = [
        ...(reports || []).map(r => ({ type: 'report', ...r, timestamp: r.created_at })),
        ...(times || []).map(t => ({ type: 'time', ...t, timestamp: t.start_time })),
      ]
    } else {
      // Owner sees all workers
      const { data: members } = await admin
        .from('team_members')
        .select('worker_id, worker_name')
        .eq('owner_id', user.id)
        .eq('status', 'active')

      const workerIds = (members || []).map(m => m.worker_id).filter(Boolean)
      const workerNames = {}
      ;(members || []).forEach(m => { if (m.worker_id) workerNames[m.worker_id] = m.worker_name })

      if (workerIds.length > 0) {
        const { data: reports } = await admin
          .from('task_reports')
          .select('*, task:task_id(title, location)')
          .in('worker_id', workerIds)
          .order('created_at', { ascending: false })
          .limit(50)

        const { data: times } = await admin
          .from('work_times')
          .select('*')
          .in('worker_id', workerIds)
          .order('start_time', { ascending: false })
          .limit(20)

        // Get completed tasks
        const { data: doneTasks } = await admin
          .from('tasks')
          .select('id, title, location, completed_at, assigned_to')
          .eq('owner_id', user.id)
          .eq('status', 'done')
          .order('completed_at', { ascending: false })
          .limit(20)

        feedItems = [
          ...(reports || []).map(r => ({ type: 'report', worker_name: workerNames[r.worker_id], ...r, timestamp: r.created_at })),
          ...(times || []).map(t => ({ type: 'time', worker_name: workerNames[t.worker_id], ...t, timestamp: t.start_time })),
          ...(doneTasks || []).map(t => ({ type: 'task_done', worker_name: workerNames[t.assigned_to], ...t, timestamp: t.completed_at })),
        ]
      }
    }

    // Sort by timestamp descending
    feedItems.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

    return Response.json({ feed: feedItems.slice(0, 50) })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
