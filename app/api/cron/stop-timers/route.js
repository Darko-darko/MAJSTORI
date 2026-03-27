// app/api/cron/stop-timers/route.js
// Scheduled: runs daily at 00:05 CET (23:05 UTC)
// Auto-stops any running timers — sets end_time to 23:59 of the start day.

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Find all running timers
    const { data: running, error: fetchErr } = await supabase
      .from('work_times')
      .select('id, start_time')
      .eq('status', 'running')

    if (fetchErr) throw fetchErr
    if (!running || running.length === 0) {
      return Response.json({ message: 'Keine laufenden Timer', stopped: 0 })
    }

    let stopped = 0
    for (const entry of running) {
      // End time = 23:59:59 of the day the timer started
      const startDate = new Date(entry.start_time)
      const endOfDay = new Date(startDate)
      endOfDay.setHours(23, 59, 59, 0)

      const { error: updateErr } = await supabase
        .from('work_times')
        .update({
          end_time: endOfDay.toISOString(),
          status: 'completed',
          note: 'Automatisch gestoppt (Mitternacht)',
        })
        .eq('id', entry.id)

      if (!updateErr) stopped++
    }

    return Response.json({ message: `${stopped} Timer automatisch gestoppt`, stopped })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
