// app/api/team/conversations/route.js — List & Create conversations
import { createClient } from '@supabase/supabase-js'
import { sendTeamPush } from '@/lib/sendTeamPush'

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

// GET — list conversations
export async function GET(request) {
  try {
    const user = await getUser(request)
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = getAdmin()
    const { data: majstor } = await admin.from('majstors').select('role').eq('id', user.id).single()

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // 'open', 'closed', or null for all
    const workerId = searchParams.get('worker_id')

    let query = admin
      .from('conversations')
      .select('*')
      .neq('status', 'deleted')
      .order('last_message_at', { ascending: false })

    if (majstor?.role === 'worker') {
      query = query.eq('worker_id', user.id)
    } else {
      query = query.eq('owner_id', user.id)
      if (workerId) query = query.eq('worker_id', workerId)
    }

    if (status) query = query.eq('status', status)

    const { data: conversations, error } = await query.limit(50)
    if (error) return Response.json({ error: error.message }, { status: 500 })

    // Get last message for each conversation
    const convIds = conversations.map(c => c.id)
    let lastMessages = {}
    let allMsgs = []
    if (convIds.length > 0) {
      const { data: msgs } = await admin
        .from('messages')
        .select('*')
        .in('conversation_id', convIds)
        .order('created_at', { ascending: false })

      allMsgs = msgs || []
      for (const msg of allMsgs) {
        if (!lastMessages[msg.conversation_id]) {
          lastMessages[msg.conversation_id] = msg
        }
      }
    }

    // Get worker names (for owner) or owner name (for worker)
    const workerNames = {}
    if (majstor?.role !== 'worker') {
      const { data: members } = await admin
        .from('team_members')
        .select('worker_id, worker_name')
        .eq('owner_id', user.id)
        .eq('status', 'active')
      for (const m of (members || [])) {
        if (m.worker_id) workerNames[m.worker_id] = m.worker_name
      }
    }

    // Calculate unread counts — use already-fetched messages
    const isWorkerRole = majstor?.role === 'worker'
    let unreadCounts = {}
    if (allMsgs.length > 0) {
      for (const c of conversations) {
        const readAt = isWorkerRole ? c.worker_read_at : c.owner_read_at
        const otherMsgs = allMsgs.filter(m => m.conversation_id === c.id && m.sender_id !== user.id)
        if (!readAt) {
          unreadCounts[c.id] = otherMsgs.length
        } else {
          unreadCounts[c.id] = otherMsgs.filter(m => new Date(m.created_at) > new Date(readAt)).length
        }
      }
    }

    // Enrich conversations
    const enriched = conversations.map(c => ({
      ...c,
      worker_name: workerNames[c.worker_id] || null,
      last_message: lastMessages[c.id] || null,
      unread_count: unreadCounts[c.id] || 0,
    }))

    return Response.json({ conversations: enriched })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

// POST — create conversation + first message
export async function POST(request) {
  try {
    const user = await getUser(request)
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = getAdmin()
    const { data: majstor } = await admin.from('majstors').select('role').eq('id', user.id).single()

    const body = await request.json()
    const { worker_id, text, title, location, due_date } = body

    if (!text?.trim()) {
      return Response.json({ error: 'Bitte Text eingeben' }, { status: 400 })
    }

    // Determine owner_id and worker_id based on role
    let ownerId, workerId

    if (majstor?.role === 'worker') {
      // Worker starts conversation → find owner
      const { data: membership } = await admin
        .from('team_members')
        .select('owner_id')
        .eq('worker_id', user.id)
        .eq('status', 'active')
        .single()
      if (!membership) return Response.json({ error: 'Kein Team gefunden' }, { status: 404 })
      ownerId = membership.owner_id
      workerId = user.id
    } else {
      // Owner starts conversation → worker_id required
      if (!worker_id) return Response.json({ error: 'Mitarbeiter auswählen' }, { status: 400 })
      ownerId = user.id
      workerId = worker_id
    }

    // Create conversation — sender has read it by definition
    const now = new Date().toISOString()
    const senderReadField = majstor?.role === 'worker' ? 'worker_read_at' : 'owner_read_at'
    const { data: conversation, error: convError } = await admin
      .from('conversations')
      .insert({
        owner_id: ownerId,
        worker_id: workerId,
        started_by: user.id,
        title: title?.trim() || null,
        location: location?.trim() || null,
        due_date: due_date || null,
        status: 'open',
        last_message_at: now,
        message_count: 1,
        [senderReadField]: now,
      })
      .select()
      .single()

    if (convError) return Response.json({ error: convError.message }, { status: 500 })

    // Create first message
    const { data: message, error: msgError } = await admin
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        sender_id: user.id,
        text: text.trim(),
      })
      .select()
      .single()

    if (msgError) return Response.json({ error: msgError.message }, { status: 500 })

    // Push notification
    if (majstor?.role === 'worker') {
      // Worker → notify owner
      const { data: workerInfo } = await admin.from('team_members').select('worker_name').eq('worker_id', user.id).eq('status', 'active').single()
      sendTeamPush({
        majstorId: ownerId,
        title: `💬 ${workerInfo?.worker_name || 'Mitarbeiter'}: Neue Nachricht`,
        message: text.trim().slice(0, 100),
        url: '/dashboard/team/feed',
      })
    } else {
      // Owner → notify worker
      sendTeamPush({
        majstorId: workerId,
        title: title ? `📋 Neuer Auftrag: ${title}` : '💬 Neue Nachricht vom Chef',
        message: text.trim().slice(0, 100),
        url: '/dashboard/worker/feed',
      })
    }

    return Response.json({ conversation, message })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
