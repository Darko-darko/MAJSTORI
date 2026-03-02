import OpenAI from 'openai'

const PARSE_PROMPT = `Du bist ein Rechnungsparser für Handwerker. Das Diktat kann auf Deutsch, Serbisch, Bosnisch oder Kroatisch sein.
Extrahiere aus dem Diktat folgende Informationen und gib NUR valides JSON zurück:

{
  "customer": {
    "name": string | null,
    "email": string | null,
    "phone": string | null,
    "street": string | null,
    "postal_code": string | null,
    "city": string | null,
    "country": string | null
  },
  "items": [
    {
      "description": string,
      "quantity": number,
      "unit": string | null,
      "price": number,
      "price_source": "netto" | "brutto"
    }
  ]
}

Regeln:
- Standard: price_source ist immer "brutto" (Handwerker nennen Bruttopreise)
- Nur wenn der Nutzer explizit "netto" sagt → price_source: "netto"
- Preise immer als Zahl (z.B. 45.50, nicht "45,50 €")
- Mengen als Zahl (z.B. 4, nicht "vier")
- Wenn eine Information nicht genannt wurde → null
- customer.name: immer mit großem Anfangsbuchstaben (z.B. "miler" → "Miler", "müller" → "Müller")
- customer.name: Anrede beibehalten wenn genannt (z.B. "Frau Elza" → "Frau Elza", "Herr Müller" → "Herr Müller")
- Beschreibungen: genau so übernehmen wie diktiert, NICHT übersetzen
- country: falls nicht genannt, "Deutschland"

Deutsch Sprachmuster:
- "Kunde ist [Name]" oder "Auftraggeber ist [Name]" → customer.name
- "Leistung ist [Beschreibung]" oder "Arbeit ist [Beschreibung]" oder "Position ist [Beschreibung]" → item.description
- "Preis ist [Preis]" oder "kostet [Preis]" → Preis
- Standardformat: "Kunde ist [Name], Leistung ist [Beschreibung], Preis ist [Preis] Euro"
- Beispiel: "Kunde ist Müller, Leistung ist Rohrreparatur, Preis ist 500 Euro" →
  customer.name: "Müller", items[0].description: "Rohrreparatur", items[0].price: 500

Serbisch/Bosnisch/Kroatisch Sprachmuster — wichtig für korrektes Parsing:
- "kupac je [Name]" oder "faktura za [Name]" oder "račun za [Name]" → customer.name ist NUR der Name
- "usluga je [Beschreibung]" oder "radnja je [Beschreibung]" oder "posao je [Beschreibung]" → item.description (NICHT übersetzen), NIEMALS Teil des Kundennamens
- "cena je [Preis]" oder "cijena je [Preis]" → Preis
- "evra" / "eura" / "€" → Euro
- Standardformat: "kupac je [Name], usluga je [Leistung], cena je [Preis] evra"
- Beispiel: "kupac je Luka, usluga je popravka cevi, cena je 500 evra" →
  customer.name: "Luka", items[0].description: "popravka cevi", items[0].price: 500
- Beispiel: "faktura za Luka, radnja je zamena slavine, cena 200 evra" →
  customer.name: "Luka", items[0].description: "zamena slavine", items[0].price: 200
`

export async function POST(req) {
  try {
    const formData = await req.formData()
    const audioFile = formData.get('audio')

    if (!audioFile) {
      return Response.json({ error: 'Keine Audiodatei' }, { status: 400 })
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    // 1. Whisper: Audio → Text (auto-detect language)
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      prompt: 'Kupac je, usluga je, cena je, Kunde ist, Leistung ist, Preis ist',
    })

    const transcript = transcription.text
    if (!transcript?.trim()) {
      return Response.json({ error: 'Keine Sprache erkannt' }, { status: 400 })
    }

    // 2. GPT-4o-mini: Text → strukturiertes JSON
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: PARSE_PROMPT },
        { role: 'user', content: transcript },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 800,
      temperature: 0.1,
    })

    const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}')

    return Response.json({
      transcript,
      customer: parsed.customer || null,
      items: parsed.items || [],
    })
  } catch (err) {
    console.error('Voice invoice error:', err)
    return Response.json({
      error: 'Fehler bei der Sprachverarbeitung',
      detail: err?.message || String(err)
    }, { status: 500 })
  }
}
