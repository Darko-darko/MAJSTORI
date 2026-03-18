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

Regeln:
- Beträge immer als Zahl mit 2 Dezimalstellen (Punkt als Trennzeichen)
- vat_rate: 19 oder 7 (Standard in Deutschland). Falls gemischte Sätze, nimm den höheren.
- Falls kein MwSt erkennbar: vat_rate=19, berechne amount_net = amount_gross / 1.19, vat_amount = amount_gross - amount_net
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

    // Check scan limit (10 free, unlimited if 3+ majstors)
    const { data: profile } = await supabase
      .from('majstors')
      .select('scan_count')
      .eq('id', user.id)
      .single()

    const scanCount = profile?.scan_count || 0

    // Check if buchhalter has 3+ active majstors → unlimited
    const { count: majstorCount } = await supabase
      .from('buchhalter_access')
      .select('id', { count: 'exact', head: true })
      .eq('buchhalter_id', user.id)
      .eq('status', 'active')

    const isUnlimited = (majstorCount || 0) >= 3
    if (!isUnlimited && scanCount >= 10) {
      return NextResponse.json({
        error: 'Scan-Limit erreicht (10 kostenlose Scans). Mit 3+ Mandanten ist der Service kostenlos.',
        limit_reached: true,
        scan_count: scanCount
      }, { status: 429 })
    }

    const { image_url, ausgabe_id } = await request.json()
    if (!image_url) {
      return NextResponse.json({ error: 'image_url required' }, { status: 400 })
    }

    // Call GPT-4o Vision
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Analysiere diesen Beleg:' },
            { type: 'image_url', image_url: { url: image_url, detail: 'high' } }
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
    const result = {
      vendor: String(parsed.vendor || '').slice(0, 200),
      receipt_date: parsed.receipt_date || null,
      amount_gross: parseFloat(parsed.amount_gross) || 0,
      amount_net: parseFloat(parsed.amount_net) || 0,
      vat_rate: parseFloat(parsed.vat_rate) || 19,
      vat_amount: parseFloat(parsed.vat_amount) || 0,
      category: CATEGORIES.includes(parsed.category) ? parsed.category : 'Sonstiges',
      description: String(parsed.description || '').slice(0, 200),
    }

    // If ausgabe_id provided, auto-save to DB (with ownership check)
    if (ausgabe_id) {
      await supabase
        .from('ausgaben')
        .update({ ...result, scanned_at: new Date().toISOString() })
        .eq('id', ausgabe_id)
        .eq('majstor_id', user.id)
    }

    // Increment scan count
    await supabase
      .from('majstors')
      .update({ scan_count: scanCount + 1 })
      .eq('id', user.id)

    return NextResponse.json({
      success: true,
      data: result,
      scan_count: scanCount + 1,
      is_unlimited: isUnlimited
    })
  } catch (err) {
    console.error('Scan error:', err)
    return NextResponse.json({ error: 'Interner Fehler beim Scannen' }, { status: 500 })
  }
}
