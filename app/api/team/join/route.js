// app/api/team/join/route.js — Worker joins team with 6-digit code
import { createClient } from '@supabase/supabase-js'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// POST — worker joins with code + creates account (or links existing)
export async function POST(request) {
  try {
    const body = await request.json()
    const { join_code, worker_email, worker_password } = body

    if (!join_code || join_code.length !== 6) {
      return Response.json({ error: 'Ungültiger Code' }, { status: 400 })
    }

    const admin = getAdmin()

    // Find team member by join code
    const { data: member, error: findError } = await admin
      .from('team_members')
      .select('*, owner:owner_id(full_name, business_name)')
      .eq('join_code', join_code)
      .eq('status', 'pending')
      .single()

    if (findError || !member) {
      return Response.json({ error: 'Code nicht gefunden oder bereits verwendet' }, { status: 404 })
    }

    let workerId = null

    // If email+password provided, create account
    if (worker_email && worker_password) {
      // Check if user already exists
      const { data: existing } = await admin
        .from('majstors')
        .select('id')
        .eq('email', worker_email)
        .single()

      if (existing) {
        // Link existing account
        workerId = existing.id
      } else {
        // Create new auth user
        const { data: authData, error: authError } = await admin.auth.admin.createUser({
          email: worker_email,
          password: worker_password,
          email_confirm: true,
        })

        if (authError) {
          return Response.json({ error: authError.message }, { status: 400 })
        }

        workerId = authData.user.id

        // Create majstor profile for worker
        await admin
          .from('majstors')
          .insert({
            id: workerId,
            email: worker_email,
            full_name: member.worker_name,
            role: 'worker',
            subscription_status: 'worker',
          })
      }
    }

    // Update team member — mark as active
    await admin
      .from('team_members')
      .update({
        worker_id: workerId,
        status: 'active',
        joined_at: new Date().toISOString(),
      })
      .eq('id', member.id)

    const ownerName = member.owner?.business_name || member.owner?.full_name || 'Ihr Arbeitgeber'

    return Response.json({
      success: true,
      team_name: ownerName,
      worker_name: member.worker_name,
    })
  } catch (err) {
    console.error('Join error:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
