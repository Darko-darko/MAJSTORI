// app/api/team/tasks/route.js — Tasks CRUD
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
    const { id, status, title, description, location, assigned_to, due_date } = body

    if (!id) return Response.json({ error: 'Missing task id' }, { status: 400 })

    const admin = getAdmin()
    const { data: majstor } = await admin
      .from('majstors')
      .select('role')
      .eq('id', user.id)
      .single()

    const updateData = { updated_at: new Date().toISOString() }

    if (majstor?.role === 'worker') {
      // Worker can only change status
      if (status) {
        updateData.status = status
        if (status === 'done') updateData.completed_at = new Date().toISOString()
      }
    } else {
      // Owner can edit everything
      if (status) updateData.status = status
      if (title) updateData.title = title.trim()
      if (description !== undefined) updateData.description = description?.trim() || null
      if (location !== undefined) updateData.location = location?.trim() || null
      if (assigned_to !== undefined) updateData.assigned_to = assigned_to || null
      if (due_date !== undefined) updateData.due_date = due_date || null
      if (status === 'done') updateData.completed_at = new Date().toISOString()
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
