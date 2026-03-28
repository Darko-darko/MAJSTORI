// app/api/team/conversations/[id]/messages/route.js — Send messages + upload photos
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

// POST — send a message in a conversation
export async function POST(request, { params }) {
  try {
    const user = await getUser(request)
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: conversationId } = await params
    const admin = getAdmin()

    // Verify conversation exists and user is participant
    const { data: conversation } = await admin
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single()

    if (!conversation) return Response.json({ error: 'Konversation nicht gefunden' }, { status: 404 })
    if (conversation.owner_id !== user.id && conversation.worker_id !== user.id) {
      return Response.json({ error: 'Nicht autorisiert' }, { status: 403 })
    }
    if (conversation.status === 'closed') {
      return Response.json({ error: 'Konversation ist abgeschlossen' }, { status: 400 })
    }
    if (conversation.status === 'deleted') {
      return Response.json({ error: 'Konversation nicht gefunden' }, { status: 404 })
    }

    const body = await request.json()
    if (!body.text?.trim()) {
      return Response.json({ error: 'Bitte Text eingeben' }, { status: 400 })
    }

    // Create message
    const { data: message, error: msgError } = await admin
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        text: body.text.trim(),
      })
      .select()
      .single()

    if (msgError) return Response.json({ error: msgError.message }, { status: 500 })

    // Update conversation metadata + mark sender as read
    const isOwner = conversation.owner_id === user.id
    const readField = isOwner ? 'owner_read_at' : 'worker_read_at'
    await admin
      .from('conversations')
      .update({
        last_message_at: new Date().toISOString(),
        message_count: (conversation.message_count || 0) + 1,
        updated_at: new Date().toISOString(),
        [readField]: new Date().toISOString(),
      })
      .eq('id', conversationId)

    // Push notification to the other participant
    const recipientId = isOwner ? conversation.worker_id : conversation.owner_id

    if (isOwner) {
      sendTeamPush({
        majstorId: recipientId,
        title: '💬 Nachricht vom Chef',
        message: body.text.trim().slice(0, 100),
        url: '/dashboard/worker/feed',
      })
    } else {
      const { data: workerInfo } = await admin.from('team_members').select('worker_name').eq('worker_id', user.id).eq('status', 'active').single()
      sendTeamPush({
        majstorId: recipientId,
        title: `💬 ${workerInfo?.worker_name || 'Mitarbeiter'}`,
        message: body.text.trim().slice(0, 100),
        url: '/dashboard/team/feed',
      })
    }

    return Response.json({ message })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

// PUT — upload photo to a message
export async function PUT(request, { params }) {
  try {
    const user = await getUser(request)
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: conversationId } = await params
    const admin = getAdmin()

    // Verify conversation access
    const { data: conversation } = await admin
      .from('conversations')
      .select('owner_id, worker_id')
      .eq('id', conversationId)
      .single()

    if (!conversation) return Response.json({ error: 'Nicht gefunden' }, { status: 404 })
    if (conversation.owner_id !== user.id && conversation.worker_id !== user.id) {
      return Response.json({ error: 'Nicht autorisiert' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('photo')
    const messageId = formData.get('message_id')

    if (!file || !messageId) return Response.json({ error: 'Foto und Nachricht-ID erforderlich' }, { status: 400 })

    // Verify message belongs to user and conversation
    const { data: message } = await admin
      .from('messages')
      .select('photos, sender_id, conversation_id')
      .eq('id', messageId)
      .single()

    if (!message) return Response.json({ error: 'Nachricht nicht gefunden' }, { status: 404 })
    if (message.sender_id !== user.id) return Response.json({ error: 'Nicht autorisiert' }, { status: 403 })
    if (message.conversation_id !== conversationId) return Response.json({ error: 'Falsche Konversation' }, { status: 400 })

    const photos = message.photos || []
    if (photos.length >= 10) return Response.json({ error: 'Max. 10 Fotos pro Nachricht' }, { status: 400 })

    // Upload to Supabase Storage
    const timestamp = Date.now()
    const path = `conversations/${conversationId}/${messageId}/${timestamp}.jpg`

    const buffer = Buffer.from(await file.arrayBuffer())
    const { error: uploadError } = await admin.storage
      .from('team-files')
      .upload(path, buffer, { contentType: file.type || 'image/jpeg' })

    if (uploadError) return Response.json({ error: uploadError.message }, { status: 500 })

    const { data: urlData } = admin.storage.from('team-files').getPublicUrl(path)
    photos.push({ url: urlData.publicUrl, uploaded_at: new Date().toISOString() })

    await admin
      .from('messages')
      .update({ photos })
      .eq('id', messageId)

    return Response.json({ success: true, photo: urlData.publicUrl, count: photos.length })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
