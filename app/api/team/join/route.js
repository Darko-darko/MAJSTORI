// app/api/team/join/route.js — Worker joins/logs in with 6-digit code
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
    const { join_code } = body

    if (!join_code || join_code.length !== 6) {
      return Response.json({ error: 'Ungültiger Code' }, { status: 400 })
    }

    const admin = getAdmin()

    // Find team member by join code
    const { data: member, error: findError } = await admin
      .from('team_members')
      .select('*, owner:owner_id(full_name, business_name)')
      .eq('join_code', join_code)
      .single()

    if (findError || !member) {
      return Response.json({ error: 'Code nicht gefunden' }, { status: 404 })
    }

    if (member.status === 'removed') {
      return Response.json({ error: 'Dieser Zugang wurde deaktiviert' }, { status: 403 })
    }

    const fakeEmail = `worker_${join_code}@promeister.local`
    const ownerName = member.owner?.business_name || member.owner?.full_name || 'Team'

    // Already registered — just return login credentials
    if (member.status === 'active' && member.worker_id) {
      return Response.json({
        success: true,
        action: 'login',
        email: fakeEmail,
        password: join_code,
        team_name: ownerName,
        worker_name: member.worker_name,
      })
    }

    // First time — create account
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email: fakeEmail,
      password: join_code,
      email_confirm: true,
    })

    if (authError) {
      // User might already exist (edge case)
      if (authError.message?.includes('already been registered')) {
        return Response.json({
          success: true,
          action: 'login',
          email: fakeEmail,
          password: join_code,
          team_name: ownerName,
          worker_name: member.worker_name,
        })
      }
      return Response.json({ error: authError.message }, { status: 400 })
    }

    const workerId = authData.user.id

    // Create majstor profile for worker
    await admin
      .from('majstors')
      .insert({
        id: workerId,
        email: fakeEmail,
        full_name: member.worker_name,
        role: 'worker',
        subscription_status: 'worker',
      })

    // Activate team member
    await admin
      .from('team_members')
      .update({
        worker_id: workerId,
        status: 'active',
        joined_at: new Date().toISOString(),
      })
      .eq('id', member.id)

    return Response.json({
      success: true,
      action: 'registered',
      email: fakeEmail,
      password: join_code,
      team_name: ownerName,
      worker_name: member.worker_name,
    })
  } catch (err) {
    console.error('Join error:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
