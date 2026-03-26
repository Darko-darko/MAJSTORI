// app/api/team/task-reports/route.js — Task reports (multi-phase)
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

// GET — list reports for a task or all tasks
export async function GET(request) {
  try {
    const user = await getUser(request)
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = getAdmin()
    const { searchParams } = new URL(request.url)
    const taskId = searchParams.get('task_id')
    const workerId = searchParams.get('worker_id')

    let query = admin.from('task_reports').select('*')

    if (taskId) {
      query = query.eq('task_id', taskId)
    } else if (workerId) {
      query = query.eq('worker_id', workerId)
    } else {
      // Check role
      const { data: majstor } = await admin.from('majstors').select('role').eq('id', user.id).single()
      if (majstor?.role === 'worker') {
        query = query.eq('worker_id', user.id)
      } else {
        // Owner — get reports for all their tasks
        const { data: tasks } = await admin.from('tasks').select('id').eq('owner_id', user.id)
        const taskIds = (tasks || []).map(t => t.id)
        if (taskIds.length > 0) {
          query = query.in('task_id', taskIds)
        } else {
          return Response.json({ reports: [] })
        }
      }
    }

    const { data: reports, error } = await query.order('created_at', { ascending: true })
    if (error) return Response.json({ error: error.message }, { status: 500 })

    return Response.json({ reports })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

// POST — create report (text only, photos added via PUT)
export async function POST(request) {
  try {
    const user = await getUser(request)
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { task_id, text, is_final } = body

    if (!task_id) return Response.json({ error: 'Task-ID erforderlich' }, { status: 400 })

    const admin = getAdmin()

    // Verify task exists and is assigned to worker
    const { data: task } = await admin.from('tasks').select('id, status, assigned_to').eq('id', task_id).single()
    if (!task) return Response.json({ error: 'Aufgabe nicht gefunden' }, { status: 404 })
    if (task.assigned_to !== user.id) return Response.json({ error: 'Nicht autorisiert' }, { status: 403 })
    if (task.status === 'done') return Response.json({ error: 'Aufgabe bereits abgeschlossen' }, { status: 400 })

    if (!text?.trim()) {
      return Response.json({ error: 'Bitte Text eingeben' }, { status: 400 })
    }

    const { data: report, error } = await admin
      .from('task_reports')
      .insert({
        task_id,
        worker_id: user.id,
        text: text.trim(),
        phase: is_final ? 'final' : 'update',
        is_final: !!is_final,
      })
      .select()
      .single()

    if (error) return Response.json({ error: error.message }, { status: 500 })

    // If final, mark task as done
    if (is_final) {
      await admin.from('tasks')
        .update({ status: 'done', completed_at: new Date().toISOString() })
        .eq('id', task_id)
    }

    return Response.json({ report })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

// PUT — upload photo to report
export async function PUT(request) {
  try {
    const user = await getUser(request)
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await request.formData()
    const file = formData.get('photo')
    const reportId = formData.get('report_id')

    if (!file || !reportId) return Response.json({ error: 'Foto und Report-ID erforderlich' }, { status: 400 })

    const admin = getAdmin()

    const { data: report } = await admin
      .from('task_reports')
      .select('photos, worker_id')
      .eq('id', reportId)
      .single()

    if (!report) return Response.json({ error: 'Bericht nicht gefunden' }, { status: 404 })
    if (report.worker_id !== user.id) return Response.json({ error: 'Nicht autorisiert' }, { status: 403 })

    const photos = report.photos || []
    if (photos.length >= 10) return Response.json({ error: 'Max. 10 Fotos pro Bericht' }, { status: 400 })

    const timestamp = Date.now()
    const path = `task-reports/${user.id}/${reportId}/${timestamp}.jpg`

    const buffer = Buffer.from(await file.arrayBuffer())
    const { error: uploadError } = await admin.storage
      .from('team-files')
      .upload(path, buffer, { contentType: file.type || 'image/jpeg' })

    if (uploadError) return Response.json({ error: uploadError.message }, { status: 500 })

    const { data: urlData } = admin.storage.from('team-files').getPublicUrl(path)
    photos.push({ url: urlData.publicUrl, uploaded_at: new Date().toISOString() })

    await admin
      .from('task_reports')
      .update({ photos })
      .eq('id', reportId)

    return Response.json({ success: true, photo: urlData.publicUrl, count: photos.length })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
