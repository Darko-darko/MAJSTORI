// netlify/functions/onboarding-reminder.js
// Scheduled: runs daily at 09:00 UTC
// Sends onboarding reminder emails to users who registered but never chose a plan.
// Day 1: friendly nudge
// Day 7: last reminder + option to delete account
//
// Also: freemium grace period expiry email
// Sent once when freemium user's 7-day grace period expires (created_at 7+ days ago)

const { createClient } = require('@supabase/supabase-js')
const { Resend } = require('resend')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const resend = new Resend(process.env.RESEND_API_KEY)

const BASE_URL = 'https://pro-meister.de'

async function incrementEmailCount() {
  try {
    const today = new Date().toISOString().slice(0, 10)
    await supabase.rpc('increment_email_counter', { target_date: today })
  } catch (e) {
    console.error('Email counter increment failed (non-critical):', e)
  }
}

// ---------------------------------------------------------------------------
// Email templates
// ---------------------------------------------------------------------------

function emailDay1(firstName) {
  const name = firstName || 'dort'
  return {
    subject: 'Ihr Pro-Meister Konto wartet auf Sie',
    html: `
<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 20px;">

    <!-- Header -->
    <div style="text-align:center;margin-bottom:32px;">
      <img src="${BASE_URL}/logo.png" alt="Pro-Meister" width="140" style="height:auto;" />
    </div>

    <!-- Card -->
    <div style="background:#1e293b;border-radius:16px;padding:36px;border:1px solid #334155;">
      <h1 style="color:#f1f5f9;font-size:22px;font-weight:700;margin:0 0 12px;">
        Hallo${name !== 'dort' ? ` ${name}` : ''},
      </h1>
      <p style="color:#94a3b8;font-size:15px;line-height:1.6;margin:0 0 24px;">
        Sie haben sich gestern bei <strong style="color:#f1f5f9;">Pro-Meister</strong> registriert – herzlich willkommen!
        Ein letzter Schritt fehlt noch: Wählen Sie Ihren Plan und legen Sie los.
      </p>

      <!-- Plans -->
      <div style="background:#0f172a;border-radius:12px;padding:20px;margin-bottom:28px;">
        <div style="margin-bottom:14px;">
          <span style="color:#34d399;font-weight:700;">✓ Kostenlos</span>
          <span style="color:#64748b;font-size:14px;"> — QR-Visitenkarte, für immer gratis</span>
        </div>
        <div>
          <span style="color:#818cf8;font-weight:700;">★ Pro (30 Tage gratis)</span>
          <span style="color:#64748b;font-size:14px;"> — Rechnungen, ZUGFeRD 2.4, KI-Assistent, <strong style="color:#a78bfa;">Sprachdiktat</strong> und mehr</span>
        </div>
      </div>

      <!-- CTA -->
      <div style="text-align:center;">
        <a href="${BASE_URL}/welcome/choose-plan"
           style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;font-weight:700;font-size:16px;padding:14px 32px;border-radius:10px;text-decoration:none;">
          Plan auswählen →
        </a>
      </div>
    </div>

    <!-- Footer -->
    <p style="color:#475569;font-size:12px;text-align:center;margin-top:24px;">
      Pro-Meister.de · <a href="${BASE_URL}/impressum" style="color:#475569;">Impressum</a>
    </p>
  </div>
</body>
</html>`,
  }
}

function emailDay7(firstName, deleteToken) {
  const name = firstName || 'dort'
  const deleteUrl = `${BASE_URL}/api/account/delete?token=${deleteToken}`
  return {
    subject: 'Noch dabei? Ihr Konto wartet auf Sie',
    html: `
<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 20px;">

    <!-- Header -->
    <div style="text-align:center;margin-bottom:32px;">
      <img src="${BASE_URL}/logo.png" alt="Pro-Meister" width="140" style="height:auto;" />
    </div>

    <!-- Card -->
    <div style="background:#1e293b;border-radius:16px;padding:36px;border:1px solid #334155;">
      <h1 style="color:#f1f5f9;font-size:22px;font-weight:700;margin:0 0 12px;">
        Hallo${name !== 'dort' ? ` ${name}` : ''},
      </h1>
      <p style="color:#94a3b8;font-size:15px;line-height:1.6;margin:0 0 20px;">
        Vor einer Woche haben Sie sich bei Pro-Meister registriert – aber noch keinen Plan gewählt.
        Vielleicht war der Moment nicht der richtige. Kein Problem.
      </p>

      <!-- Feature highlight -->
      <div style="background:#1e1b4b;border:1px solid #4338ca;border-radius:12px;padding:18px;margin-bottom:28px;">
        <p style="color:#818cf8;font-weight:700;margin:0 0 6px;font-size:14px;">Wussten Sie schon?</p>
        <p style="color:#c7d2fe;font-size:14px;margin:0;line-height:1.6;">
          Mit dem Pro-Plan können Sie <strong>Rechnungen per Sprache diktieren</strong> —
          einfach Positionen aussprechen, die App erstellt die Rechnung. Ideal auf der Baustelle.
        </p>
      </div>

      <!-- Primary CTA -->
      <div style="text-align:center;margin-bottom:32px;">
        <a href="${BASE_URL}/welcome/choose-plan"
           style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;font-weight:700;font-size:16px;padding:14px 32px;border-radius:10px;text-decoration:none;">
          Jetzt einloggen →
        </a>
      </div>

      <!-- Divider -->
      <hr style="border:none;border-top:1px solid #334155;margin:0 0 24px;" />

      <!-- Delete option -->
      <p style="color:#64748b;font-size:13px;line-height:1.6;margin:0 0 12px;">
        Falls Sie Ihr Konto nicht mehr benötigen, können Sie es hier unwiderruflich löschen:
      </p>
      <div style="text-align:center;">
        <a href="${deleteUrl}"
           style="display:inline-block;color:#ef4444;font-size:13px;text-decoration:underline;">
          Konto unwiderruflich löschen
        </a>
      </div>
    </div>

    <!-- Footer -->
    <p style="color:#475569;font-size:12px;text-align:center;margin-top:24px;">
      Pro-Meister.de · <a href="${BASE_URL}/impressum" style="color:#475569;">Impressum</a>
    </p>
  </div>
</body>
</html>`,
  }
}

// ---------------------------------------------------------------------------
// Delete token — simple signed token (HMAC-SHA256)
// ---------------------------------------------------------------------------

const crypto = require('crypto')

function signDeleteToken(userId) {
  const secret = process.env.INTERNAL_FUNCTION_SECRET
  if (!secret) throw new Error('INTERNAL_FUNCTION_SECRET not set')
  const payload = `${userId}:delete`
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex')
  return Buffer.from(`${payload}:${sig}`).toString('base64url')
}

// ---------------------------------------------------------------------------
// Grace period expiry email template (freemium users, 7 days after registration)
// ---------------------------------------------------------------------------

function emailGracePeriodExpired(firstName) {
  const name = firstName || 'dort'
  return {
    subject: 'Wie war Ihre Pro-Testphase?',
    html: `
<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 20px;">

    <!-- Header -->
    <div style="text-align:center;margin-bottom:32px;">
      <img src="${BASE_URL}/logo.png" alt="Pro-Meister" width="140" style="height:auto;" />
    </div>

    <!-- Card -->
    <div style="background:#1e293b;border-radius:16px;padding:36px;border:1px solid #334155;">
      <h1 style="color:#f1f5f9;font-size:22px;font-weight:700;margin:0 0 12px;">
        Hallo${name !== 'dort' ? ` ${name}` : ''},
      </h1>
      <p style="color:#94a3b8;font-size:15px;line-height:1.6;margin:0 0 20px;">
        Ihre <strong style="color:#f1f5f9;">7-tägige Pro-Testphase</strong> ist abgelaufen.
        Wir hoffen, Sie konnten Pro-Meister in vollen Zügen ausprobieren!
      </p>

      <!-- What they had access to -->
      <div style="background:#0f172a;border-radius:12px;padding:20px;margin-bottom:28px;">
        <p style="color:#64748b;font-size:13px;font-weight:600;margin:0 0 12px;text-transform:uppercase;letter-spacing:0.05em;">Das hatten Sie im Pro-Plan:</p>
        <div style="color:#94a3b8;font-size:14px;line-height:2;">
          <div>📄 <span>Unbegrenzte Rechnungen & Angebote</span></div>
          <div>🤖 <span>KI-Assistent & <strong style="color:#a78bfa;">Sprachdiktat</strong></span></div>
          <div>📊 <span>DATEV-Export & ZUGFeRD 2.4</span></div>
          <div>👥 <span>Kundenverwaltung & Mahnwesen</span></div>
        </div>
      </div>

      <!-- CTA -->
      <div style="text-align:center;margin-bottom:24px;">
        <a href="${BASE_URL}/dashboard/subscription"
           style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;font-weight:700;font-size:16px;padding:14px 32px;border-radius:10px;text-decoration:none;">
          Jetzt Pro testen →
        </a>
        <p style="color:#475569;font-size:12px;margin:12px 0 0;">
          19,90 € / Monat · 30 Tage kostenlos testen · jederzeit kündbar
        </p>
      </div>

      <!-- Free plan note -->
      <div style="border-top:1px solid #1e293b;padding-top:20px;text-align:center;">
        <p style="color:#64748b;font-size:13px;line-height:1.6;margin:0;">
          Möchten Sie nur die <strong style="color:#94a3b8;">QR-Visitenkarte</strong> und
          <strong style="color:#94a3b8;">Kundenanfragen</strong> nutzen?
          Das bleibt für immer <strong style="color:#34d399;">kostenlos</strong> —
          kein Upgrade nötig.
        </p>
      </div>
    </div>

    <!-- Footer -->
    <p style="color:#475569;font-size:12px;text-align:center;margin-top:24px;">
      Pro-Meister.de · <a href="${BASE_URL}/impressum" style="color:#475569;">Impressum</a>
    </p>
  </div>
</body>
</html>`,
  }
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

exports.handler = async () => {
  try {
    const now = new Date()

    // --- 1. Onboarding reminders: users who never chose a plan ---
    const { data: candidates, error } = await supabase
      .from('majstors')
      .select('id, email, full_name, created_at, onboarding_email_1d_sent_at, onboarding_email_7d_sent_at')
      .is('subscription_status', null)
      .eq('pending_deletion', false)

    if (error) {
      console.error('❌ Supabase fetch error (onboarding):', error)
    } else {
      let sent1d = 0, sent7d = 0

      for (const user of (candidates || [])) {
        const created = new Date(user.created_at)
        const hoursAgo = (now - created) / 1000 / 60 / 60

        const firstName = (user.full_name || '').split(' ')[0] || ''

        // Day 7 email (check first so we don't double-send on same day)
        if (hoursAgo >= 167 && hoursAgo < 193 && !user.onboarding_email_7d_sent_at) {
          const deleteToken = signDeleteToken(user.id)
          const { subject, html } = emailDay7(firstName, deleteToken)
          try {
            await resend.emails.send({
              from: 'Pro-Meister <noreply@pro-meister.de>',
              to: user.email,
              subject,
              html,
            })
            await supabase
              .from('majstors')
              .update({ onboarding_email_7d_sent_at: now.toISOString() })
              .eq('id', user.id)
            sent7d++
            await incrementEmailCount()
            console.log(`✅ Day-7 onboarding email sent to ${user.email}`)
          } catch (err) {
            console.error(`❌ Day-7 email failed for ${user.email}:`, err.message)
          }
          continue // don't also send day-1 if 7 days have passed
        }

        // Day 1 email
        if (hoursAgo >= 23 && hoursAgo < 49 && !user.onboarding_email_1d_sent_at) {
          const { subject, html } = emailDay1(firstName)
          try {
            await resend.emails.send({
              from: 'Pro-Meister <noreply@pro-meister.de>',
              to: user.email,
              subject,
              html,
            })
            await supabase
              .from('majstors')
              .update({ onboarding_email_1d_sent_at: now.toISOString() })
              .eq('id', user.id)
            sent1d++
            await incrementEmailCount()
            console.log(`✅ Day-1 onboarding email sent to ${user.email}`)
          } catch (err) {
            console.error(`❌ Day-1 email failed for ${user.email}:`, err.message)
          }
        }
      }

      console.log(`📧 Onboarding reminders — day1: ${sent1d}, day7: ${sent7d}`)
    }

    // --- 2. Grace period expiry: freemium users whose 7-day grace expired ---
    const graceCutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

    const { data: graceCandidates, error: graceError } = await supabase
      .from('majstors')
      .select('id, email, full_name, created_at, grace_period_email_sent_at')
      .eq('subscription_status', 'freemium')
      .is('grace_period_email_sent_at', null)
      .eq('pending_deletion', false)
      .lte('created_at', graceCutoff)

    if (graceError) {
      console.error('❌ Supabase fetch error (grace period):', graceError)
    } else {
      let sentGrace = 0

      for (const user of (graceCandidates || [])) {
        const firstName = (user.full_name || '').split(' ')[0] || ''
        const { subject, html } = emailGracePeriodExpired(firstName)
        try {
          await resend.emails.send({
            from: 'Pro-Meister <noreply@pro-meister.de>',
            to: user.email,
            subject,
            html,
          })
          await supabase
            .from('majstors')
            .update({ grace_period_email_sent_at: now.toISOString() })
            .eq('id', user.id)
          sentGrace++
          await incrementEmailCount()
          console.log(`✅ Grace period expiry email sent to ${user.email}`)
        } catch (err) {
          console.error(`❌ Grace period email failed for ${user.email}:`, err.message)
        }
      }

      console.log(`📧 Grace period emails sent: ${sentGrace}`)
    }

    return { statusCode: 200 }

  } catch (err) {
    console.error('❌ Unexpected error:', err)
    return { statusCode: 500 }
  }
}
