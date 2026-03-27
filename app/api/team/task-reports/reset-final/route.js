// app/api/team/task-reports/reset-final/route.js — Remove is_final flag from task reports
import { createClient } from '@supabase/supabase-js'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { task_id } = body

    if (!task_id) return Response.json({ error: 'Missing task_id' }, { status: 400 })

    const admin = getAdmin()

    // Set all final reports back to update
    await admin
      .from('task_reports')
      .update({ is_final: false, phase: 'update' })
      .eq('task_id', task_id)
      .eq('is_final', true)

    return Response.json({ success: true })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
