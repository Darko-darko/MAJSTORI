// app/api/team/conversations/[id]/route.js — Single conversation: get, update, delete
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

// GET — single conversation with all messages
export async function GET(request, { params }) {
  try {
    const user = await getUser(request)
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const admin = getAdmin()

    // Fetch conversation
    const { data: conversation, error } = await admin
      .from('conversations')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !conversation) return Response.json({ error: 'Nicht gefunden' }, { status: 404 })

    // Verify access
    if (conversation.owner_id !== user.id && conversation.worker_id !== user.id) {
      return Response.json({ error: 'Nicht autorisiert' }, { status: 403 })
    }

    // Fetch all messages
    const { data: messages } = await admin
      .from('messages')
      .select('*')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true })

    // Get worker name
    let workerName = null
    if (conversation.owner_id === user.id) {
      const { data: member } = await admin
        .from('team_members')
        .select('worker_name')
        .eq('worker_id', conversation.worker_id)
        .eq('owner_id', user.id)
        .single()
      workerName = member?.worker_name
    }

    return Response.json({
      conversation: { ...conversation, worker_name: workerName },
      messages: messages || [],
    })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

// PATCH — close, reopen, update fields (owner only)
export async function PATCH(request, { params }) {
  try {
    const user = await getUser(request)
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const admin = getAdmin()

    // Verify participation
    const { data: conversation } = await admin
      .from('conversations')
      .select('owner_id, worker_id')
      .eq('id', id)
      .single()

    if (!conversation) return Response.json({ error: 'Nicht gefunden' }, { status: 404 })

    const isOwner = conversation.owner_id === user.id
    // For broadcasts (worker_id=NULL), check if user is a team member of the owner
    let isBroadcastMember = false
    if (conversation.worker_id === null) {
      const { data: mem } = await admin.from('team_members')
        .select('worker_id')
        .eq('owner_id', conversation.owner_id)
        .eq('worker_id', user.id)
        .eq('status', 'active')
        .maybeSingle()
      isBroadcastMember = !!mem
    }
    const isParticipant = isOwner || conversation.worker_id === user.id || isBroadcastMember

    const body = await request.json()

    // Mark read — both owner and worker can do this
    if (body.mark_read) {
      if (!isParticipant) return Response.json({ error: 'Nicht autorisiert' }, { status: 403 })
      const readField = isOwner ? 'owner_read_at' : 'worker_read_at'
      await admin.from('conversations').update({ [readField]: new Date().toISOString() }).eq('id', id)
      return Response.json({ success: true })
    }

    // React to broadcast — worker only
    if (body.react) {
      if (!isParticipant) return Response.json({ error: 'Nicht autorisiert' }, { status: 403 })
      // Fetch current reactions
      const { data: conv } = await admin.from('conversations').select('reactions').eq('id', id).single()
      const reactions = conv?.reactions || []
      // Toggle: remove if exists, add if not
      const existing = reactions.findIndex(r => r.user_id === user.id)
      if (existing >= 0) {
        reactions.splice(existing, 1)
      } else {
        reactions.push({ user_id: user.id, emoji: '👍', at: new Date().toISOString() })
      }
      await admin.from('conversations').update({ reactions }).eq('id', id)
      return Response.json({ success: true, reactions })
    }

    // All other actions — owner only
    if (!isOwner) return Response.json({ error: 'Nur der Chef kann Konversationen bearbeiten' }, { status: 403 })

    const updates = { updated_at: new Date().toISOString() }

    if (body.status === 'closed') {
      updates.status = 'closed'
      updates.closed_at = new Date().toISOString()
    } else if (body.status === 'open') {
      updates.status = 'open'
      updates.closed_at = null
    } else if (body.status === 'archived') {
      updates.status = 'archived'
    }

    if (body.title !== undefined) updates.title = body.title?.trim() || null
    if (body.location !== undefined) updates.location = body.location?.trim() || null
    if (body.due_date !== undefined) updates.due_date = body.due_date || null

    const { data: updated, error } = await admin
      .from('conversations')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) return Response.json({ error: error.message }, { status: 500 })

    return Response.json({ conversation: updated })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

// DELETE — soft delete (owner only)
export async function DELETE(request, { params }) {
  try {
    const user = await getUser(request)
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const admin = getAdmin()

    // Verify ownership
    const { data: conversation } = await admin
      .from('conversations')
      .select('owner_id')
      .eq('id', id)
      .single()

    if (!conversation) return Response.json({ error: 'Nicht gefunden' }, { status: 404 })
    if (conversation.owner_id !== user.id) return Response.json({ error: 'Nur der Chef kann Konversationen löschen' }, { status: 403 })

    const { error } = await admin
      .from('conversations')
      .update({ status: 'deleted', updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) return Response.json({ error: error.message }, { status: 500 })

    return Response.json({ success: true })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
