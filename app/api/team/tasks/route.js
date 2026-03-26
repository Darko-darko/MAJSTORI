// app/api/team/tasks/route.js — Tasks CRUD
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

// GET — list tasks (owner sees all, worker sees assigned)
export async function GET(request) {
  try {
    const user = await getUser(request)
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = getAdmin()
    const { data: majstor } = await admin
      .from('majstors')
      .select('role')
      .eq('id', user.id)
      .single()

    let query = admin.from('tasks').select('*, assigned:assigned_to(full_name)')

    if (majstor?.role === 'worker') {
      query = query.eq('assigned_to', user.id)
    } else {
      query = query.eq('owner_id', user.id)
    }

    const { data: tasks, error } = await query.order('created_at', { ascending: false })

    if (error) return Response.json({ error: error.message }, { status: 500 })

    return Response.json({ tasks })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

// POST — create task (owner only)
export async function POST(request) {
  try {
    const user = await getUser(request)
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { title, description, location, assigned_to, due_date } = body

    if (!title?.trim()) {
      return Response.json({ error: 'Titel ist erforderlich' }, { status: 400 })
    }

    const admin = getAdmin()
    const { data: task, error } = await admin
      .from('tasks')
      .insert({
        owner_id: user.id,
        assigned_to: assigned_to || null,
        title: title.trim(),
        description: description?.trim() || null,
        location: location?.trim() || null,
        due_date: due_date || null,
        status: 'pending',
      })
      .select('*, assigned:assigned_to(full_name)')
      .single()

    if (error) return Response.json({ error: error.message }, { status: 500 })

    // Push notification to assigned worker
    if (assigned_to) {
      sendTeamPush({
        majstorId: assigned_to,
        title: '📋 Neue Aufgabe',
        message: title.trim().slice(0, 100),
        url: '/dashboard/worker/tasks',
      })
    }

    return Response.json({ task })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

// PATCH — update task status (worker marks done, owner edits)
export async function PATCH(request) {
  try {
    const user = await getUser(request)
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { id, status, title, description, location, assigned_to, due_date, worker_comment, photos_before, photos_after } = body

    if (!id) return Response.json({ error: 'Missing task id' }, { status: 400 })

    const admin = getAdmin()
    const { data: majstor } = await admin
      .from('majstors')
      .select('role')
      .eq('id', user.id)
      .single()

    const updateData = { updated_at: new Date().toISOString() }

    if (majstor?.role === 'worker') {
      // Worker can change status, comment, photos
      if (status) {
        updateData.status = status
        if (status === 'done') updateData.completed_at = new Date().toISOString()
      }
      if (worker_comment !== undefined) updateData.worker_comment = worker_comment
      if (photos_before !== undefined) updateData.photos_before = photos_before
      if (photos_after !== undefined) updateData.photos_after = photos_after
    } else {
      // Owner can edit everything
      if (status) updateData.status = status
      if (title) updateData.title = title.trim()
      if (description !== undefined) updateData.description = description?.trim() || null
      if (location !== undefined) updateData.location = location?.trim() || null
      if (assigned_to !== undefined) updateData.assigned_to = assigned_to || null
      if (due_date !== undefined) updateData.due_date = due_date || null
      if (status === 'done') updateData.completed_at = new Date().toISOString()
      if (status === 'pending') updateData.completed_at = null
    }

    const { data: task, error } = await admin
      .from('tasks')
      .update(updateData)
      .eq('id', id)
      .select('*, assigned:assigned_to(full_name)')
      .single()

    if (error) return Response.json({ error: error.message }, { status: 500 })

    return Response.json({ task })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

// PUT — upload photo to task (worker)
export async function PUT(request) {
  try {
    const user = await getUser(request)
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await request.formData()
    const file = formData.get('photo')
    const taskId = formData.get('task_id')
    const photoType = formData.get('type') // 'before' or 'after'

    if (!file || !taskId || !photoType) {
      return Response.json({ error: 'Foto, Task-ID und Typ erforderlich' }, { status: 400 })
    }

    const admin = getAdmin()

    const { data: task } = await admin
      .from('tasks')
      .select('photos_before, photos_after, owner_photos, assigned_to, owner_id')
      .eq('id', taskId)
      .single()

    if (!task) return Response.json({ error: 'Aufgabe nicht gefunden' }, { status: 404 })
    // Owner or assigned worker can upload
    if (task.assigned_to !== user.id && task.owner_id !== user.id) {
      return Response.json({ error: 'Nicht autorisiert' }, { status: 403 })
    }

    const photosMap = { before: task.photos_before || [], after: task.photos_after || [], owner: task.owner_photos || [] }
    const photos = photosMap[photoType] || []
    if (photos.length >= 5) {
      return Response.json({ error: `Max. 5 Fotos pro Kategorie` }, { status: 400 })
    }

    // Upload
    const timestamp = Date.now()
    const ext = file.name?.split('.').pop() || 'jpg'
    const path = `tasks/${user.id}/${taskId}/${photoType}_${timestamp}.${ext}`

    const buffer = Buffer.from(await file.arrayBuffer())
    const { error: uploadError } = await admin.storage
      .from('team-files')
      .upload(path, buffer, { contentType: file.type || 'image/jpeg' })

    if (uploadError) return Response.json({ error: uploadError.message }, { status: 500 })

    const { data: urlData } = admin.storage.from('team-files').getPublicUrl(path)
    photos.push({ url: urlData.publicUrl, uploaded_at: new Date().toISOString() })

    const fieldMap = { before: 'photos_before', after: 'photos_after', owner: 'owner_photos' }
    const updateField = fieldMap[photoType] || 'photos_before'
    console.log('📷 Saving photo to field:', updateField, 'count:', photos.length)
    const { error: updateError } = await admin
      .from('tasks')
      .update({ [updateField]: photos, updated_at: new Date().toISOString() })
      .eq('id', taskId)

    if (updateError) {
      console.error('📷 Update error:', updateError)
      return Response.json({ error: updateError.message }, { status: 500 })
    }
    console.log('📷 Photo saved successfully')

    return Response.json({ success: true, photo: urlData.publicUrl, count: photos.length })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

// DELETE — remove task (owner only)
export async function DELETE(request) {
  try {
    const user = await getUser(request)
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return Response.json({ error: 'Missing task id' }, { status: 400 })

    const admin = getAdmin()
    const { error } = await admin
      .from('tasks')
      .delete()
      .eq('id', id)
      .eq('owner_id', user.id)

    if (error) return Response.json({ error: error.message }, { status: 500 })

    return Response.json({ success: true })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
