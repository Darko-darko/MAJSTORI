// app/api/team/feed/route.js — Feed: conversations + messages + work_times
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
    const isWorker = majstor?.role === 'worker'

    // Fetch conversations for this user
    let convQuery = admin
      .from('conversations')
      .select('*')
      .neq('status', 'deleted')
      .order('last_message_at', { ascending: false })
      .limit(50)

    if (isWorker) {
      convQuery = convQuery.eq('worker_id', user.id)
    } else {
      convQuery = convQuery.eq('owner_id', user.id)
    }

    const { data: conversations } = await convQuery

    // Fetch messages for all conversations
    const convIds = (conversations || []).map(c => c.id)
    let allMessages = []
    if (convIds.length > 0) {
      const { data: msgs } = await admin
        .from('messages')
        .select('*')
        .in('conversation_id', convIds)
        .order('created_at', { ascending: true })
      allMessages = msgs || []
    }

    // Build worker name map
    const workerNames = {}
    if (!isWorker) {
      const { data: members } = await admin
        .from('team_members')
        .select('worker_id, worker_name')
        .eq('owner_id', user.id)
        .eq('status', 'active')
      for (const m of (members || [])) {
        if (m.worker_id) workerNames[m.worker_id] = m.worker_name
      }
    } else {
      // Worker needs owner name
      const { data: membership } = await admin
        .from('team_members')
        .select('owner_id, owner:owner_id(full_name, business_name)')
        .eq('worker_id', user.id)
        .eq('status', 'active')
        .single()
      if (membership?.owner_id) {
        workerNames[membership.owner_id] = membership.owner?.business_name || membership.owner?.full_name || 'Chef'
      }
    }

    // Group messages by conversation
    const messagesByConv = {}
    for (const msg of allMessages) {
      if (!messagesByConv[msg.conversation_id]) messagesByConv[msg.conversation_id] = []
      messagesByConv[msg.conversation_id].push(msg)
    }

    // Enrich conversations
    const enrichedConversations = (conversations || []).map(c => ({
      ...c,
      worker_name: workerNames[c.worker_id] || null,
      messages: messagesByConv[c.id] || [],
    }))

    // Fetch work_times
    let timeItems = []
    if (isWorker) {
      const { data: times } = await admin
        .from('work_times')
        .select('*')
        .eq('worker_id', user.id)
        .order('start_time', { ascending: false })
        .limit(20)
      timeItems = (times || []).map(t => ({
        type: 'time',
        ...t,
        timestamp: t.start_time,
      }))
    } else {
      const workerIds = Object.keys(workerNames)
      if (workerIds.length > 0) {
        const { data: times } = await admin
          .from('work_times')
          .select('*')
          .in('worker_id', workerIds)
          .order('start_time', { ascending: false })
          .limit(20)
        timeItems = (times || []).map(t => ({
          type: 'time',
          worker_name: workerNames[t.worker_id],
          ...t,
          timestamp: t.start_time,
        }))
      }
    }

    return Response.json({
      conversations: enrichedConversations,
      timeEntries: timeItems,
      workerNames,
    })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
