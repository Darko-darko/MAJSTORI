// app/api/team/reports/route.js — Daily reports CRUD + photo upload
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

// GET — list reports (worker sees own, owner sees all team)
export async function GET(request) {
  try {
    const user = await getUser(request)
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = getAdmin()
    const { searchParams } = new URL(request.url)
    const workerId = searchParams.get('worker_id')
    const date = searchParams.get('date')

    const { data: majstor } = await admin
      .from('majstors')
      .select('role')
      .eq('id', user.id)
      .single()

    let query = admin.from('daily_reports').select('*')

    if (majstor?.role === 'worker') {
      query = query.eq('worker_id', user.id)
    } else {
      query = query.eq('owner_id', user.id)
      if (workerId) query = query.eq('worker_id', workerId)
    }

    if (date) query = query.eq('report_date', date)

    const { data: reports, error } = await query.order('report_date', { ascending: false })

    if (error) return Response.json({ error: error.message }, { status: 500 })

    return Response.json({ reports })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

// POST — create or update today's report
export async function POST(request) {
  try {
    const user = await getUser(request)
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = getAdmin()
    const contentType = request.headers.get('content-type') || ''

    // Photo upload
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const file = formData.get('photo')
      const reportId = formData.get('report_id')

      if (!file || !reportId) {
        return Response.json({ error: 'Foto und Report-ID erforderlich' }, { status: 400 })
      }

      // Check daily photo limit
      const { data: report } = await admin
        .from('daily_reports')
        .select('photos, locked, worker_id')
        .eq('id', reportId)
        .single()

      if (!report) return Response.json({ error: 'Bericht nicht gefunden' }, { status: 404 })
      if (report.locked) return Response.json({ error: 'Bericht ist gesperrt' }, { status: 403 })
      if (report.worker_id !== user.id) return Response.json({ error: 'Nicht autorisiert' }, { status: 403 })

      const photos = report.photos || []
      if (photos.length >= 10) {
        return Response.json({ error: 'Tageslimit erreicht (max. 10 Fotos)' }, { status: 400 })
      }

      // Upload to Supabase Storage
      const timestamp = Date.now()
      const ext = file.name?.split('.').pop() || 'jpg'
      const path = `reports/${user.id}/${timestamp}.${ext}`

      const buffer = Buffer.from(await file.arrayBuffer())
      const { error: uploadError } = await admin.storage
        .from('team-files')
        .upload(path, buffer, { contentType: file.type || 'image/jpeg' })

      if (uploadError) return Response.json({ error: uploadError.message }, { status: 500 })

      const { data: urlData } = admin.storage.from('team-files').getPublicUrl(path)

      // Add photo URL to report
      photos.push({ url: urlData.publicUrl, uploaded_at: new Date().toISOString() })

      await admin
        .from('daily_reports')
        .update({ photos, updated_at: new Date().toISOString() })
        .eq('id', reportId)

      return Response.json({ success: true, photo: urlData.publicUrl, count: photos.length })
    }

    // Text report create/update
    const body = await request.json()
    const { text } = body

    // Get owner_id from team_members
    const { data: membership } = await admin
      .from('team_members')
      .select('owner_id')
      .eq('worker_id', user.id)
      .eq('status', 'active')
      .single()

    if (!membership) return Response.json({ error: 'Kein aktives Team' }, { status: 403 })

    const today = new Date().toISOString().split('T')[0]

    // Check if today's report exists
    const { data: existing } = await admin
      .from('daily_reports')
      .select('*')
      .eq('worker_id', user.id)
      .eq('report_date', today)
      .single()

    if (existing) {
      if (existing.locked) return Response.json({ error: 'Bericht ist gesperrt' }, { status: 403 })

      const { data: report, error } = await admin
        .from('daily_reports')
        .update({ text: text || '', updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) return Response.json({ error: error.message }, { status: 500 })
      return Response.json({ report })
    }

    // Create new
    const { data: report, error } = await admin
      .from('daily_reports')
      .insert({
        worker_id: user.id,
        owner_id: membership.owner_id,
        report_date: today,
        text: text || '',
      })
      .select()
      .single()

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ report })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

// DELETE — remove photo from report
export async function DELETE(request) {
  try {
    const user = await getUser(request)
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const reportId = searchParams.get('report_id')
    const photoUrl = searchParams.get('photo_url')

    if (!reportId || !photoUrl) return Response.json({ error: 'Missing params' }, { status: 400 })

    const admin = getAdmin()
    const { data: report } = await admin
      .from('daily_reports')
      .select('photos, locked, worker_id')
      .eq('id', reportId)
      .single()

    if (!report) return Response.json({ error: 'Nicht gefunden' }, { status: 404 })
    if (report.locked) return Response.json({ error: 'Gesperrt' }, { status: 403 })
    if (report.worker_id !== user.id) return Response.json({ error: 'Nicht autorisiert' }, { status: 403 })

    const photos = (report.photos || []).filter(p => p.url !== photoUrl)

    await admin
      .from('daily_reports')
      .update({ photos, updated_at: new Date().toISOString() })
      .eq('id', reportId)

    return Response.json({ success: true, count: photos.length })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
