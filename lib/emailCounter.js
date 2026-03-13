// lib/emailCounter.js — Increment daily email counter (fire-and-forget)
import { createClient } from '@supabase/supabase-js'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function incrementEmailCount() {
  try {
    const today = new Date().toISOString().slice(0, 10)
    await admin.rpc('increment_email_counter', { target_date: today })
  } catch (e) {
    console.error('Email counter increment failed (non-critical):', e)
  }
}
