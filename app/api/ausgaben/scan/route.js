import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Allowed users for testing (Buchhalter)
const ALLOWED_USERS = ['d9a02afc-1508-4e36-8a26-e53aa9bf7dc8', '2f9f6665-3524-44a6-9a74-215571ad5690']

const CATEGORIES = [
  'Material', 'Werkzeug', 'Fahrzeug', 'Büro',
  'Versicherung', 'Telefon/Internet', 'Miete',
  'Reise', 'Bewirtung', 'Sonstiges'
]

const SYSTEM_PROMPT = `Du bist ein Experte für deutsche Belege und Kassenbons. Analysiere das Bild und extrahiere folgende Daten als JSON:

{
  "vendor": "Name des Geschäfts/Händlers",
  "receipt_date": "YYYY-MM-DD",
  "amount_gross": 0.00,
  "amount_net": 0.00,
  "vat_rate": 19,
  "vat_amount": 0.00,
  "category": "eine der Kategorien",
  "description": "kurze Beschreibung (max 50 Zeichen, was wurde gekauft)"
}

WICHTIG — Definitionen:
- amount_gross = GESAMTBETRAG inkl. MwSt (der Betrag der bezahlt wird, z.B. "Gesamt", "Total", "Za uplatu", "Brutto", "Summe")
- amount_net = Nettobetrag OHNE MwSt (z.B. "Netto", "Osnovica", "Zwischensumme")
- vat_amount = Steuerbetrag (z.B. "MwSt", "USt", "PDV", "Mehrwertsteuer")
- amount_gross = amount_net + vat_amount (IMMER!)

Regeln:
- Beträge immer als Zahl mit 2 Dezimalstellen (Punkt als Trennzeichen)
- Suche den HÖCHSTEN Gesamtbetrag auf dem Beleg — das ist amount_gross
- vat_rate: Lies den EXAKTEN Steuersatz vom Beleg ab (z.B. 19, 7, 10, 13, 5, 0 etc.). Nicht raten!
- Falls gemischte Sätze auf dem Beleg: nimm den höheren
- Kleinunternehmerregelung (§19 UStG): Wenn "Steuer nicht ausgewiesen", "Kleinunternehmer", "kein Ausweis von USt" o.ä. → vat_rate=0, vat_amount=0, amount_gross=amount_net
- NUR falls kein MwSt-Satz erkennbar UND kein Kleinunternehmer: vat_rate=19, berechne amount_net = amount_gross / 1.19, vat_amount = amount_gross - amount_net
- amount_gross, amount_net und vat_amount immer DIREKT vom Beleg ablesen, nicht selbst berechnen!
- Prüfe: amount_gross MUSS größer oder gleich amount_net sein!
- category muss eine von: ${CATEGORIES.join(', ')}
- receipt_date im ISO-Format YYYY-MM-DD
- description: kurze Zusammenfassung der gekauften Artikel (deutsch)
- Antworte NUR mit dem JSON-Objekt, kein anderer Text`

async function getUser(request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return null
  const { data: { user } } = await supabase.auth.getUser(token)
  return user || null
}

export async function POST(request) {
  try {
    const user = await getUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Check if user is allowed (testing phase)
    if (!ALLOWED_USERS.includes(user.id)) {
      return NextResponse.json({ error: 'Feature nicht verfügbar' }, { status: 403 })
    }

    const { image_url, image_urls, ausgabe_id } = await request.json()

    // Scan from Buchhalter Portal (ausgabe_id = majstor's receipt) → always free
    // Standalone Beleg-Scanner (no ausgabe_id) → 200 free, then subscription
    let isUnlimited = false

    if (ausgabe_id) {
      // Scanning a platform majstor's receipt → always unlimited
      isUnlimited = true
    } else {
      // Standalone scanner — check limit
      const { data: profile } = await supabase
        .from('majstors')
        .select('scan_count')
        .eq('id', user.id)
        .single()

      const scanCount = profile?.scan_count || 0

      if (scanCount >= 200) {
        return NextResponse.json({
          error: 'Scan-Limit erreicht (200 kostenlose Scans). Bitte wählen Sie ein Abo für weitere Scans.',
          limit_reached: true,
          scan_count: scanCount
        }, { status: 429 })
      }
    }
    const urls = (image_urls || (image_url ? [image_url] : [])).slice(0, 2)
    if (!urls.length) {
      return NextResponse.json({ error: 'image_url required' }, { status: 400 })
    }

    const imageContent = urls.map(u => ({ type: 'image_url', image_url: { url: u, detail: 'high' } }))

    // Call GPT-4o Vision
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: urls.length > 1
              ? `Analysiere diesen Beleg (${urls.length} Seiten). Fasse alle Seiten zu EINEM Ergebnis zusammen:`
              : 'Analysiere diesen Beleg:' },
            ...imageContent
          ]
        }
      ],
      max_tokens: 500,
      temperature: 0.1,
    })

    const raw = response.choices[0]?.message?.content?.trim()
    if (!raw) {
      return NextResponse.json({ error: 'Keine Antwort vom AI-Modell' }, { status: 500 })
    }

    // Parse JSON from response (strip markdown code fences if present)
    let parsed
    try {
      const clean = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
      parsed = JSON.parse(clean)
    } catch {
      console.error('AI parse error, raw:', raw)
      return NextResponse.json({ error: 'AI-Antwort konnte nicht verarbeitet werden' }, { status: 500 })
    }

    // Validate and sanitize
    let gross = parseFloat(parsed.amount_gross) || 0
    let net = parseFloat(parsed.amount_net) || 0
    let rate = parsed.vat_rate != null ? parseFloat(parsed.vat_rate) : 19
    if (isNaN(rate)) rate = 19
    let vat = parseFloat(parsed.vat_amount) || 0

    // Kleinunternehmer: if gross == net and vat == 0, force rate to 0
    if (gross > 0 && net > 0 && Math.abs(gross - net) < 0.01 && vat === 0) {
      rate = 0
    }

    // Sanity check: if AI swapped gross/net, fix it
    if (gross > 0 && net > 0 && gross < net) {
      ;[gross, net] = [net, gross]
      vat = gross - net
    }
    // If only one amount provided, derive the other
    if (gross > 0 && net === 0 && rate > 0) {
      net = Math.round((gross / (1 + rate / 100)) * 100) / 100
      vat = Math.round((gross - net) * 100) / 100
    }
    if (net > 0 && gross === 0 && rate > 0) {
      gross = Math.round(net * (1 + rate / 100) * 100) / 100
      vat = Math.round((gross - net) * 100) / 100
    }
    // If vat_amount is 0 but we have both, derive it
    if (vat === 0 && gross > 0 && net > 0) {
      vat = Math.round((gross - net) * 100) / 100
    }

    const result = {
      vendor: String(parsed.vendor || '').slice(0, 200),
      receipt_date: parsed.receipt_date || null,
      amount_gross: gross,
      amount_net: net,
      vat_rate: rate,
      vat_amount: vat,
      category: CATEGORIES.includes(parsed.category) ? parsed.category : 'Sonstiges',
      description: String(parsed.description || '').slice(0, 200),
    }

    // If ausgabe_id provided, auto-save to DB
    if (ausgabe_id) {
      // Get the ausgabe to verify ownership or buchhalter access
      const { data: ausgabe } = await supabase
        .from('ausgaben')
        .select('majstor_id')
        .eq('id', ausgabe_id)
        .single()

      if (ausgabe) {
        const isMajstor = ausgabe.majstor_id === user.id
        let hasBuchhalterAccess = false
        if (!isMajstor) {
          const { count } = await supabase
            .from('buchhalter_access')
            .select('id', { count: 'exact', head: true })
            .eq('buchhalter_id', user.id)
            .eq('majstor_id', ausgabe.majstor_id)
            .eq('status', 'active')
          hasBuchhalterAccess = (count || 0) > 0
        }
        if (isMajstor || hasBuchhalterAccess) {
          await supabase
            .from('ausgaben')
            .update({ ...result, scanned_at: new Date().toISOString() })
            .eq('id', ausgabe_id)
        }
      }
    }

    // Increment scan count (only for standalone scanner, not platform scans)
    if (!isUnlimited) {
      const { data: curr } = await supabase.from('majstors').select('scan_count').eq('id', user.id).single()
      await supabase.from('majstors').update({ scan_count: (curr?.scan_count || 0) + 1 }).eq('id', user.id)
    }

    return NextResponse.json({
      success: true,
      data: result,
      is_unlimited: isUnlimited
    })
  } catch (err) {
    console.error('Scan error:', err)
    return NextResponse.json({ error: 'Interner Fehler beim Scannen' }, { status: 500 })
  }
}
