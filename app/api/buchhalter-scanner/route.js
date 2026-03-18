import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const ALLOWED_USERS = ['d9a02afc-1508-4e36-8a26-e53aa9bf7dc8', '2f9f6665-3524-44a6-9a74-215571ad5690']

const FREE_SCAN_LIMIT = 500

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

async function checkBuchhalter(userId) {
  const { data } = await supabase.from('majstors').select('role, scan_count').eq('id', userId).single()
  if (!data || data.role !== 'buchhalter') return null
  return data
}

// GET — folders list OR belege for a folder
export async function GET(request) {
  try {
    const user = await getUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!ALLOWED_USERS.includes(user.id)) return NextResponse.json({ error: 'Feature nicht verfügbar' }, { status: 403 })

    const profile = await checkBuchhalter(user.id)
    if (!profile) return NextResponse.json({ error: 'Nur für Buchhalter' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const folderId = searchParams.get('folder_id')
    const month = searchParams.get('month')
    const year = searchParams.get('year')

    // If folder_id provided → return belege for that folder
    if (folderId) {
      let query = supabase
        .from('buchhalter_belege')
        .select('*')
        .eq('buchhalter_id', user.id)
        .eq('folder_id', folderId)
        .order('created_at', { ascending: false })

      if (month && year) {
        query = query.eq('month', parseInt(month)).eq('year', parseInt(year))
      }

      const { data, error } = await query
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      return NextResponse.json({ belege: data || [], scan_count: profile.scan_count || 0, scan_limit: FREE_SCAN_LIMIT })
    }

    // Otherwise → return folders list
    const { data: folders, error } = await supabase
      .from('buchhalter_folders')
      .select('*')
      .eq('buchhalter_id', user.id)
      .order('name')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Get beleg counts per folder
    const { data: counts } = await supabase
      .from('buchhalter_belege')
      .select('folder_id')
      .eq('buchhalter_id', user.id)

    const countMap = {}
    for (const b of (counts || [])) {
      countMap[b.folder_id] = (countMap[b.folder_id] || 0) + 1
    }

    const foldersWithCounts = (folders || []).map(f => ({
      ...f,
      beleg_count: countMap[f.id] || 0
    }))

    return NextResponse.json({ folders: foldersWithCounts, scan_count: profile.scan_count || 0, scan_limit: FREE_SCAN_LIMIT })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST — create folder, upload beleg metadata, or scan beleg
export async function POST(request) {
  try {
    const user = await getUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!ALLOWED_USERS.includes(user.id)) return NextResponse.json({ error: 'Feature nicht verfügbar' }, { status: 403 })

    const profile = await checkBuchhalter(user.id)
    if (!profile) return NextResponse.json({ error: 'Nur für Buchhalter' }, { status: 403 })

    const body = await request.json()
    const { action } = body

    // CREATE FOLDER
    if (action === 'create_folder') {
      const { name } = body
      if (!name?.trim()) return NextResponse.json({ error: 'Name erforderlich' }, { status: 400 })

      const { data, error } = await supabase
        .from('buchhalter_folders')
        .insert({ buchhalter_id: user.id, name: name.trim() })
        .select()
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ folder: data })
    }

    // SAVE BELEG METADATA (after client upload to storage)
    if (action === 'save_beleg') {
      const { folder_id, storage_path, filename, file_type, month, year } = body
      if (!folder_id || !storage_path) return NextResponse.json({ error: 'folder_id und storage_path erforderlich' }, { status: 400 })

      const { data, error } = await supabase
        .from('buchhalter_belege')
        .insert({
          buchhalter_id: user.id,
          folder_id,
          storage_path,
          filename: filename || null,
          file_type: file_type || null,
          month: month || new Date().getMonth() + 1,
          year: year || new Date().getFullYear()
        })
        .select()
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ beleg: data })
    }

    // SCAN BELEG (KI)
    if (action === 'scan') {
      const scanCount = profile.scan_count || 0

      // Check platform majstors for unlimited
      const { count: majstorCount } = await supabase
        .from('buchhalter_access')
        .select('id', { count: 'exact', head: true })
        .eq('buchhalter_id', user.id)
        .eq('status', 'active')

      const isUnlimited = (majstorCount || 0) >= 3
      if (!isUnlimited && scanCount >= FREE_SCAN_LIMIT) {
        return NextResponse.json({
          error: `Scan-Limit erreicht (${FREE_SCAN_LIMIT} kostenlose Scans).`,
          limit_reached: true,
          scan_count: scanCount
        }, { status: 429 })
      }

      const { image_url, beleg_id } = body
      if (!image_url) return NextResponse.json({ error: 'image_url required' }, { status: 400 })

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
      if (!raw) return NextResponse.json({ error: 'Keine Antwort vom AI-Modell' }, { status: 500 })

      let parsed
      try {
        const clean = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
        parsed = JSON.parse(clean)
      } catch {
        console.error('AI parse error, raw:', raw)
        return NextResponse.json({ error: 'AI-Antwort konnte nicht verarbeitet werden' }, { status: 500 })
      }

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

      if (beleg_id) {
        await supabase
          .from('buchhalter_belege')
          .update({ ...result, scanned_at: new Date().toISOString() })
          .eq('id', beleg_id)
          .eq('buchhalter_id', user.id)
      }

      await supabase
        .from('majstors')
        .update({ scan_count: scanCount + 1 })
        .eq('id', user.id)

      return NextResponse.json({ success: true, data: result, scan_count: scanCount + 1, scan_limit: FREE_SCAN_LIMIT })
    }

    return NextResponse.json({ error: 'Unbekannte Aktion' }, { status: 400 })
  } catch (err) {
    console.error('Scanner error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// PATCH — rename folder or update beleg scan data
export async function PATCH(request) {
  try {
    const user = await getUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!ALLOWED_USERS.includes(user.id)) return NextResponse.json({ error: 'Feature nicht verfügbar' }, { status: 403 })

    const body = await request.json()

    if (body.folder_id && body.name) {
      const { error } = await supabase
        .from('buchhalter_folders')
        .update({ name: body.name.trim() })
        .eq('id', body.folder_id)
        .eq('buchhalter_id', user.id)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true })
    }

    if (body.beleg_id) {
      const { beleg_id, ...updates } = body
      const { error } = await supabase
        .from('buchhalter_belege')
        .update(updates)
        .eq('id', beleg_id)
        .eq('buchhalter_id', user.id)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'folder_id oder beleg_id erforderlich' }, { status: 400 })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE — folder or beleg(s)
export async function DELETE(request) {
  try {
    const user = await getUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!ALLOWED_USERS.includes(user.id)) return NextResponse.json({ error: 'Feature nicht verfügbar' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const folderId = searchParams.get('folder_id')
    const belegId = searchParams.get('beleg_id')
    const belegIds = searchParams.get('beleg_ids') // comma-separated for bulk

    if (folderId) {
      // Delete all belege storage files first
      const { data: belege } = await supabase
        .from('buchhalter_belege')
        .select('storage_path')
        .eq('folder_id', folderId)
        .eq('buchhalter_id', user.id)

      if (belege?.length) {
        const paths = belege.map(b => b.storage_path).filter(Boolean)
        if (paths.length) {
          await supabase.storage.from('buchhalter-belege').remove(paths)
        }
      }

      // CASCADE will delete belege rows
      const { error } = await supabase
        .from('buchhalter_folders')
        .delete()
        .eq('id', folderId)
        .eq('buchhalter_id', user.id)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true })
    }

    if (belegIds) {
      const ids = belegIds.split(',')
      const { data: belege } = await supabase
        .from('buchhalter_belege')
        .select('id, storage_path')
        .in('id', ids)
        .eq('buchhalter_id', user.id)

      if (belege?.length) {
        const paths = belege.map(b => b.storage_path).filter(Boolean)
        if (paths.length) await supabase.storage.from('buchhalter-belege').remove(paths)
        await supabase.from('buchhalter_belege').delete().in('id', belege.map(b => b.id))
      }
      return NextResponse.json({ success: true })
    }

    if (belegId) {
      const { data: beleg } = await supabase
        .from('buchhalter_belege')
        .select('storage_path')
        .eq('id', belegId)
        .eq('buchhalter_id', user.id)
        .single()

      if (beleg?.storage_path) {
        await supabase.storage.from('buchhalter-belege').remove([beleg.storage_path])
      }

      const { error } = await supabase
        .from('buchhalter_belege')
        .delete()
        .eq('id', belegId)
        .eq('buchhalter_id', user.id)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'folder_id oder beleg_id erforderlich' }, { status: 400 })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
