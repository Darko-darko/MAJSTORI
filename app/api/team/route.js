// app/api/team/route.js — Team members CRUD + seat management
import { createClient } from '@supabase/supabase-js'

const INCLUDED_MEMBERS = 2
const MAX_PAID_SEATS = 50

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

// GET — list team members + seat info
export async function GET(request) {
  try {
    const user = await getUser(request)
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = getAdmin()

    const [membersResult, ownerResult] = await Promise.all([
      admin.from('team_members').select('*').eq('owner_id', user.id).order('created_at', { ascending: true }),
      admin.from('majstors').select('paid_seats, seat_subscription_id').eq('id', user.id).single()
    ])

    if (membersResult.error) return Response.json({ error: membersResult.error.message }, { status: 500 })

    const paidSeats = ownerResult.data?.paid_seats || 0
    const totalSlots = INCLUDED_MEMBERS + paidSeats

    return Response.json({
      members: membersResult.data,
      paidSeats,
      totalSlots,
      includedMembers: INCLUDED_MEMBERS,
      seatSubscriptionId: ownerResult.data?.seat_subscription_id || null
    })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

// POST — create new team member (enforce seat limit)
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

    // Fetch seat info + count existing members
    const [existingResult, ownerResult] = await Promise.all([
      admin.from('team_members').select('id').eq('owner_id', user.id).neq('status', 'removed'),
      admin.from('majstors').select('paid_seats').eq('id', user.id).single()
    ])

    const memberCount = existingResult.data?.length || 0
    const paidSeats = ownerResult.data?.paid_seats || 0
    const totalSlots = INCLUDED_MEMBERS + paidSeats

    // Block if no available seats
    if (memberCount >= totalSlots) {
      return Response.json({
        error: 'Keine freien Plätze. Bitte buchen Sie zuerst zusätzliche Plätze.',
        needsPayment: true,
        memberCount,
        totalSlots
      }, { status: 402 })
    }

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
      memberCount: memberCount + 1,
      totalSlots
    })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

// PATCH — reduce paid seats (after removing members)
export async function PATCH(request) {
  try {
    const user = await getUser(request)
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { reduceTo } = body

    if (typeof reduceTo !== 'number' || reduceTo < 0 || reduceTo > MAX_PAID_SEATS) {
      return Response.json({ error: 'Ungültige Anzahl' }, { status: 400 })
    }

    const admin = getAdmin()

    // Check current state
    const [membersResult, ownerResult] = await Promise.all([
      admin.from('team_members').select('id').eq('owner_id', user.id).neq('status', 'removed'),
      admin.from('majstors').select('paid_seats, seat_subscription_id').eq('id', user.id).single()
    ])

    const activeMembers = membersResult.data?.length || 0
    const currentPaidSeats = ownerResult.data?.paid_seats || 0
    const seatSubId = ownerResult.data?.seat_subscription_id

    // Can't reduce below what's needed
    const minSeats = Math.max(0, activeMembers - INCLUDED_MEMBERS)
    if (reduceTo < minSeats) {
      return Response.json({
        error: `Sie haben noch ${activeMembers} aktive Mitglieder. Bitte entfernen Sie zuerst Mitglieder.`,
        activeMembers,
        minSeats
      }, { status: 400 })
    }

    if (!seatSubId) {
      return Response.json({ error: 'Kein Platz-Abonnement gefunden' }, { status: 400 })
    }

    // Call FastSpring API to update quantity or cancel
    const credentials = Buffer.from(
      `${process.env.FASTSPRING_USERNAME}:${process.env.FASTSPRING_PASSWORD}`
    ).toString('base64')

    if (reduceTo === 0) {
      // Cancel seat subscription entirely
      const fsRes = await fetch(`https://api.fastspring.com/subscriptions/${seatSubId}`, {
        method: 'DELETE',
        headers: { Authorization: `Basic ${credentials}` }
      })
      if (!fsRes.ok) {
        const err = await fsRes.text()
        console.error('FS cancel error:', err)
        return Response.json({ error: 'FastSpring Fehler beim Kündigen' }, { status: 500 })
      }

      await admin.from('majstors').update({
        paid_seats: 0,
        seat_subscription_id: null,
        updated_at: new Date().toISOString()
      }).eq('id', user.id)

    } else {
      // Update quantity on FastSpring
      const fsRes = await fetch('https://api.fastspring.com/subscriptions', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subscriptions: [{
            subscription: seatSubId,
            quantity: reduceTo
          }]
        })
      })
      if (!fsRes.ok) {
        const err = await fsRes.text()
        console.error('FS update error:', err)
        return Response.json({ error: 'FastSpring Fehler beim Ändern' }, { status: 500 })
      }

      await admin.from('majstors').update({
        paid_seats: reduceTo,
        updated_at: new Date().toISOString()
      }).eq('id', user.id)
    }

    console.log(`💺 Seats reduced: ${currentPaidSeats} → ${reduceTo} for user ${user.id}`)

    return Response.json({
      success: true,
      paidSeats: reduceTo,
      totalSlots: INCLUDED_MEMBERS + reduceTo
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

    // Get worker_id before removing
    const { data: member } = await admin
      .from('team_members')
      .select('worker_id')
      .eq('id', memberId)
      .eq('owner_id', user.id)
      .single()

    const { error } = await admin
      .from('team_members')
      .update({ status: 'removed' })
      .eq('id', memberId)
      .eq('owner_id', user.id)

    if (error) return Response.json({ error: error.message }, { status: 500 })

    // Stop any running timers for removed worker
    if (member?.worker_id) {
      await admin
        .from('work_times')
        .update({ status: 'completed', end_time: new Date().toISOString() })
        .eq('worker_id', member.worker_id)
        .eq('status', 'running')
    }

    // Return updated counts for UI
    const [membersResult, ownerResult] = await Promise.all([
      admin.from('team_members').select('id').eq('owner_id', user.id).neq('status', 'removed'),
      admin.from('majstors').select('paid_seats').eq('id', user.id).single()
    ])

    const activeMembers = membersResult.data?.length || 0
    const paidSeats = ownerResult.data?.paid_seats || 0
    const unusedSeats = Math.max(0, (INCLUDED_MEMBERS + paidSeats) - activeMembers)

    return Response.json({
      success: true,
      activeMembers,
      paidSeats,
      unusedSeats
    })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
