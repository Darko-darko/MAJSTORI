// app/api/team/route.js — Team members CRUD
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

function generateJoinCode() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// GET — list team members for current owner
export async function GET(request) {
  try {
    const user = await getUser(request)
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = getAdmin()
    const { data: members, error } = await admin
      .from('team_members')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: true })

    if (error) return Response.json({ error: error.message }, { status: 500 })

    return Response.json({ members })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

// POST — create new team member (generate join code)
export async function POST(request) {
  try {
    const user = await getUser(request)
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { worker_name } = body

    if (!worker_name || worker_name.trim().length < 2) {
      return Response.json({ error: 'Name muss mindestens 2 Zeichen haben' }, { status: 400 })
    }

    const admin = getAdmin()

    // Count existing members
    const { data: existing } = await admin
      .from('team_members')
      .select('id')
      .eq('owner_id', user.id)
      .neq('status', 'removed')

    const memberCount = existing?.length || 0
    const includedMembers = 2

    // Generate unique join code
    let joinCode
    let attempts = 0
    while (attempts < 10) {
      joinCode = generateJoinCode()
      const { data: exists } = await admin
        .from('team_members')
        .select('id')
        .eq('join_code', joinCode)
        .single()
      if (!exists) break
      attempts++
    }

    const { data: member, error } = await admin
      .from('team_members')
      .insert({
        owner_id: user.id,
        worker_name: worker_name.trim(),
        join_code: joinCode,
        role: 'worker',
        status: 'pending',
      })
      .select()
      .single()

    if (error) return Response.json({ error: error.message }, { status: 500 })

    return Response.json({
      member,
      needsPayment: memberCount >= includedMembers,
      memberCount: memberCount + 1,
    })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

// DELETE — remove team member
export async function DELETE(request) {
  try {
    const user = await getUser(request)
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const memberId = searchParams.get('id')

    if (!memberId) return Response.json({ error: 'Missing member id' }, { status: 400 })

    const admin = getAdmin()
    const { error } = await admin
      .from('team_members')
      .update({ status: 'removed' })
      .eq('id', memberId)
      .eq('owner_id', user.id)

    if (error) return Response.json({ error: error.message }, { status: 500 })

    return Response.json({ success: true })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
