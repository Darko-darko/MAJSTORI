// faq-data.js - FAQ System für Pro-Meister.de
// VERZIJA 3.0 - HIBRIDNI SISTEM: Pretraga + Navigacija po poglavljima

export const faqData = {
  categories: [
    {
      id: 'grundlagen',
      title: 'Grundlegende Informationen',
      icon: '📋',
      description: 'Alles über die Plattform',
      anchor: '#grundlagen',
      questions: [
        {
          id: 'was-ist-pro-meister',
          question: 'Was ist pro-meister.de und wie kann es meinem Handwerksbetrieb helfen?',
          answer: `**Digitale Lösung für Handwerker:**

✅ Rechnungen & Angebote (DIN 5008)
✅ QR-Visitenkarte
✅ Kundenanfragen mit Fotos
✅ Kundenverwaltung
✅ Dienstleistungen organisieren

**Weniger Papierkram - mehr Zeit fürs Handwerk!**`,
          tags: ['plattform', 'einführung', 'überblick'],
          category: 'grundlagen'
        },
        {
          id: 'wer-kann-nutzen',
          question: 'Ist die Plattform nur für bestimmte Handwerke gedacht?',
          answer: `**Nein! Für alle Handwerker:**

⚡ Elektriker • 🚰 Installateur • 🪚 Schreiner • 🧱 Maurer/Maler
🚗 Kfz-Mechaniker • 🏠 Dachdecker • 🔧 Schlosser • 🌿 Gartenbau

**Die Plattform passt sich Ihren Bedürfnissen an.**`,
          tags: ['zielgruppe', 'handwerker', 'berufe'],
          category: 'grundlagen'
        },
        {
          id: 'technische-kenntnisse',
          question: 'Wie viel technisches Wissen benötige ich?',
          answer: `**Keines! Einfach:**

✅ Deutsche Oberfläche
✅ Klare Symbole
✅ Einfache Formulare
✅ Automatische PDF-Erstellung
✅ Rechnungsversand per E-Mail

**Wenn Sie E-Mails können, können Sie pro-meister.de nutzen!**`,
          tags: ['benutzerfreundlich', 'einfach'],
          category: 'grundlagen'
        },
        {
          id: 'kosten-preise',
          question: 'Was kostet die Nutzung von pro-meister.de?',
          answer: `**Drei Pläne:**

### 🆓 FREEMIUM - 0€
- QR-Visitenkarte
- Kundenanfragen empfangen
- **Kostenlos für immer**

### 💎 PRO - 19,90€/Monat (+ MwSt.)
- Alles aus Freemium
- Kundenverwaltung
- Rechnungen & Angebote (ZUGFeRD)
- PDF-Archiv
- **30 Tage Probezeitraum**

### 🚀 PRO+ - Demnächst
- Enterprise-Lösung`,
          tags: ['preise', 'kosten', 'freemium', 'pro'],
          category: 'grundlagen'
        },
        {
          id: 'kostenlose-funktionen',
          question: 'Welche Funktionen sind im Freemium-Plan enthalten?',
          answer: `**Freemium (kostenlos):**

✅ QR-Digitale Visitenkarte
✅ Kundenanfragen mit Fotos empfangen
✅ Basis-Profil
✅ Dashboard

**Nur PRO:**
❌ Kunden-/Dienstleistungsverwaltung
❌ Rechnungen erstellen
❌ PDF-Archiv`,
          tags: ['freemium', 'kostenlos', 'funktionen'],
          category: 'grundlagen'
        },
        {
          id: 'probezeitraum',
          question: 'Gibt es einen Testzeitraum für PRO?',
          answer: `**Ja! 30 Tage testen:**

⏰ 30 Tage mit allen PRO-Funktionen
💳 Kreditkarte erforderlich
✅ Erste Abbuchung nach Probezeitraum
🔄 Jederzeit kündbar

**Risikofrei testen!**`,
          tags: ['testzeitraum', 'trial', 'pro'],
          category: 'grundlagen'
        },
        {
          id: 'kuendigung',
          question: 'Kann ich PRO jederzeit kündigen?',
          answer: `**Ja! Einfach:**

✅ Klick auf PRO-Badge
⏳ Kündigungsfrist: 30 Tage
✅ Zugriff bis Ende bezahlter Zeit
🔄 Wechsel zu Freemium automatisch
✅ Jederzeit reaktivierbar

**Keine verstecken Kosten!**`,
          tags: ['kündigung', 'abonnement', 'flexibel'],
          category: 'grundlagen'
        }
      ]
    },
    {
      id: 'registrierung',
      title: 'Registrierung und Start',
      icon: '🚀',
      description: 'Erste Schritte',
      anchor: '#registrierung',
      questions: [
        {
          id: 'wie-registrieren',
          question: 'Wie registriere ich mich?',
          answer: `**Schnell (2-3 Minuten):**

1️⃣ Zu pro-meister.de
2️⃣ "Registrieren" klicken
3️⃣ E-Mail oder Google wählen
4️⃣ E-Mail bestätigen
5️⃣ Profil später ausfüllen

**Fertig!**`,
          tags: ['registrierung', 'anmeldung', 'start'],
          category: 'registrierung'
        },
        {
          id: 'google-login',
          question: 'Kann ich mich mit Google anmelden?',
          answer: `**Ja! Schnellste Methode:**

✅ 1-Klick-Anmeldung
🔒 Höchste Sicherheit
🔑 Kein Passwort merken
📱 Auto-Sync auf allen Geräten`,
          tags: ['google', 'anmeldung', 'oauth'],
          category: 'registrierung'
        },
        {
          id: 'setup-dauer',
          question: 'Wie lange dauert die Einrichtung?',
          answer: `**Schneller Start:**

⏱️ **Minimum (5 Min):**
- Registrierung
- QR-Visitenkarte
- ✅ Sofort einsatzbereit!

⏱️ **Komplett (10 Min):**
- Logo-Upload
- Alle Dienstleistungen
- Rechnungseinstellungen

**Tipp: Schrittweise ergänzen!**`,
          tags: ['setup', 'einrichtung', 'dauer'],
          category: 'registrierung'
        }
      ]
    },
    {
      id: 'visitenkarte',
      title: 'QR Visitenkarte',
      icon: '📱',
      description: 'Digitale Visitenkarten',
      anchor: '#visitenkarte',
      questions: [
        {
          id: 'was-ist-qr-visitenkarte',
          question: 'Was ist eine QR-Visitenkarte?',
          answer: `**Digitale Geschäftspräsenz:**

1. Sie erstellen Visitenkarte
2. System generiert QR-Code
3. Kunde scannt Code
4. Kunde sieht Profil & kann anfragen mit Fotos

**Vorteile:**
♻️ Umweltfreundlich
🔄 Immer aktuell
📊 Professionell
💰 In Freemium enthalten`,
          tags: ['qr-code', 'visitenkarte', 'digital'],
          category: 'visitenkarte'
        },
        {
          id: 'visitenkarte-erstellen',
          question: 'Wie erstelle ich meine Visitenkarte?',
          answer: `**5 Schritte:**

1️⃣ "Meine Visitenkarte" öffnen
2️⃣ Geschäftsdaten ausfüllen
3️⃣ Logo & Bilder hochladen
4️⃣ Dienstleistungen hinzufügen
5️⃣ "Speichern & Veröffentlichen"

**Fertig in 5 Minuten!**`,
          tags: ['erstellen', 'anleitung', 'visitenkarte'],
          category: 'visitenkarte'
        },
        {
          id: 'visitenkarte-zugriff',
          question: 'Wie greifen Kunden auf meine Visitenkarte zu?',
          answer: `**2 einfache Wege:**

📱 QR-Code scannen
🔗 Direkter Link (z.B. pro-meister.de/p/ihr-name)

**Wichtig:**
🚫 Kein Login nötig
📱 Keine App nötig
🌐 24/7 erreichbar`,
          tags: ['zugriff', 'kunden', 'qr-code'],
          category: 'visitenkarte'
        },
        {
          id: 'visitenkarte-design',
          question: 'Kann ich das Design anpassen?',
          answer: `**Ja! Personalisierung:**

**Visuell:**
- Logo-Upload
- Profilbild
- Bildergalerie
- Farbschema

**Inhalt:**
- Firmenbeschreibung
- Dienstleistungen
- Kontaktoptionen
- Website

**Jederzeit änderbar!**`,
          tags: ['design', 'anpassung', 'branding'],
          category: 'visitenkarte'
        },
        {
          id: 'logo-bilder-hinzufuegen',
          question: 'Kann ich Logo und Bilder hinzufügen?',
          answer: `**Ja! Visuelle Elemente:**

🖼️ Firmenlogo (PNG empfohlen)
👤 Profilbild
📸 Bildergalerie

**Technisch:**
✅ PNG, JPG, SVG
✅ Max 5 MB
✅ Empfohlen: 1000x1000 Pixel

**Tipp: PNG mit transparentem Hintergrund!**`,
          tags: ['logo', 'bilder', 'upload'],
          category: 'visitenkarte'
        },
        {
          id: 'visitenkarte-teilen',
          question: 'Wie teile ich meine Visitenkarte?',
          answer: `**Mehrere Möglichkeiten:**

📱 Vom Bildschirm - QR-Code zeigen
🖨️ Gedruckt - Flyer, Visitenkarten, Fahrzeug
🔗 Link teilen - SMS, WhatsApp, E-Mail
🚗 Fahrzeug - Großer QR-Code
🏪 Geschäft - Eingang/Fenster

**Kunden brauchen kein Konto!**`,
          tags: ['teilen', 'qr-code', 'link'],
          category: 'visitenkarte'
        }
      ]
    },
    {
      id: 'kunden',
      title: 'Kundenverwaltung',
      icon: '👥',
      description: 'Kunden verwalten',
      anchor: '#kunden',
      questions: [
        {
          id: 'kunden-hinzufuegen',
          question: 'Wie füge ich Kunden hinzu?',
          answer: `**Zwei Wege:**

**1️⃣ Manuell:**
"Kunden" → "Neuer Kunde" → Daten eingeben

**2️⃣ Automatisch (empfohlen):**
Bei Rechnungserstellung
System speichert automatisch

⚠️ Nur im PRO-Plan`,
          tags: ['kunden', 'hinzufügen', 'verwaltung'],
          category: 'kunden'
        },
        {
          id: 'kunden-suchen',
          question: 'Wie suche ich Kunden?',
          answer: `**Schnelle Suche:**

🔍 "Kunden" → Suchfeld
✅ Suche nach: Name, Firma, E-Mail, Telefon, Stadt
⚡ Ergebnisse in Echtzeit

**Dann möglich:**
📄 Neue Rechnung erstellen
✏️ Kontaktinfo aktualisieren
📞 Kunde kontaktieren
📂 Dokumente sehen`,
          tags: ['suchen', 'finden', 'kunden'],
          category: 'kunden'
        },
        {
          id: 'kunden-import-export',
          question: 'Kann ich Kunden importieren/exportieren?',
          answer: `**Ja! Import/Export:**

**Kunden:**
📥 Import - Massenhinzufügen aus Datei
📤 Export - Liste herunterladen
✅ Auto-Speichern bei Rechnung

**Dienstleistungen:**
📥 Import - Massenhinzufügen
✅ Auto-Speichern beim Hinzufügen

**Zugriff:**
"Meine Kunden" → Import/Export
"Meine Services" → Import

⚠️ Nur im PRO-Plan`,
          tags: ['import', 'export', 'kunden', 'dienste'],
          category: 'kunden'
        }
      ]
    },
    {
      id: 'rechnungen',
      title: 'Rechnungen und Angebote',
      icon: '📄',
      description: 'Dokumente erstellen',
      anchor: '#rechnungen',
      questions: [
        {
          id: 'rechnung-erstellen',
          question: 'Wie erstelle ich eine Rechnung?',
          answer: `**Schnell:**

1️⃣ "Rechnungen" → "+ Neue Rechnung"
2️⃣ Kunde wählen (wird auto-gespeichert)
3️⃣ Kundentyp: Mit MwSt. (19%) oder Kleinunternehmer
4️⃣ Positionen hinzufügen:
   ⚡ "Meine Services" (1-Klick)
   ✏️ Oder manuell
5️⃣ "Erstellen" - PDF fertig!

**Automatisch:**
✅ Nummerierung
✅ MwSt.-Berechnung
✅ ZUGFeRD PDF
✅ Archivierung

⚠️ Nur im PRO-Plan`,
          tags: ['rechnung', 'erstellen', 'anleitung'],
          category: 'rechnungen'
        },
        {
          id: 'zugferd-pdf',
          question: 'Was ist ZUGFeRD PDF?',
          answer: `**E-Rechnungsformat:**

📄 Klassisches PDF + 💾 XML-Daten

**Vorteile:**
⚡ Automatische Buchung
🚫 Keine manuelle Eingabe
💰 Schnellere Zahlung
✅ Gesetzlich konform

**Pro-meister.de: Alle Rechnungen automatisch ZUGFeRD!**`,
          tags: ['zugferd', 'e-rechnung', 'format'],
          category: 'rechnungen'
        },
        {
          id: 'rechnung-senden',
          question: 'Wie sende ich eine Rechnung?',
          answer: `**Direkt von Plattform:**

📧 Nach Erstellung: "Per E-Mail senden"
✅ E-Mail vorbereitet
📎 PDF als Anhang
✏️ Persönliche Nachricht möglich

**Oder:**
💾 PDF herunterladen
📱 Per WhatsApp/E-Mail
🖨️ Ausdrucken

**Erneut senden:**
🔄 "Resend"-Option
📂 Oder PDF-Archiv → "Senden"`,
          tags: ['senden', 'versand', 'email'],
          category: 'rechnungen'
        },
        {
          id: 'din-5008',
          question: 'Was ist DIN 5008?',
          answer: `**Deutscher Standard für Geschäftsdokumente**

**Wichtig:**
✅ Professionell & anerkannt
✅ Klar & lesbar
✅ Kompatibel mit Scan/OCR
✉️ Perfekt für Fensterbriefumschlag!

**Pro-meister.de: Alle Rechnungen automatisch nach DIN 5008!**

**Tipp: Ausdrucken, falten, in Briefumschlag - Adresse sichtbar!**`,
          tags: ['din-5008', 'standard', 'format'],
          category: 'rechnungen'
        },
        {
          id: 'nummerierung',
          question: 'Wie werden Rechnungen nummeriert?',
          answer: `**Automatisch:**

📄 Rechnungen: RE-2025-0001, RE-2025-0002...
📋 Angebote: AN-2025-0001, AN-2025-0002...

**Ersteinrichtung:**
Bei erstem Dokument → Startnummer wählen
✅ Neu: 1 eingeben
✅ Bestehend: Z.B. 151 (setzt ab 151 fort)

**NEUSTART-Funktion:**
🔄 Reset während Probephase
🗑️ Löscht ALLE Test-Dokumente
🎯 Beginnt ab Wahl-Nummer

**Wichtig:**
✅ Gesetzeskonform
✅ Keine Lücken
✅ Auto-Reset zum Neujahr`,
          tags: ['nummerierung', 'rechnungsnummer'],
          category: 'rechnungen'
        },
        {
          id: 'pdf-archiv',
          question: 'Wo finde ich meine Rechnungen?',
          answer: `**Automatisches Archiv:**

📂 Alle Dokumente in "PDF Archiv"
💾 Auto-Speicherung

**Suche & Filter:**
📅 Zeitfilter
📄 Typ (Rechnung/Angebot)
👤 Kunde
🔢 Nummer/Betrag

**Aktionen:**
👁️ Vorschau
💾 Herunterladen
📧 Senden
🖨️ Drucken

**Buchhalter-Feature:**
📧 E-Mail einrichten
📤 Massenversand
⚡ Auto-Aufteilung

⚠️ Nur im PRO-Plan`,
          tags: ['archiv', 'pdf', 'suchen'],
          category: 'rechnungen'
        },
        {
          id: 'mehrere-adressen',
          question: 'Kann ich mehrere Adressen auf Rechnung verwenden?',
          answer: `**Ja! Flexible Adressen:**

**Drei Optionen:**
1. Kundenadresse - Hauptadresse
2. Zusätzliche Adresse - Zweite Lokation
3. Ort der Leistung - Freie Beschreibung

**Ideal für:**
- WEG (Hausverwaltungen)
- Unterschiedliche Arbeitsorte
- Komplexe Projekte

**Automatische DIN 5008-Formatierung**`,
          tags: ['adressen', 'rechnung', 'flexibel'],
          category: 'rechnungen'
        },
        {
          id: 'angebot-zu-rechnung',
          question: 'Kann ich Angebot in Rechnung umwandeln?',
          answer: `**Ja! Mit 1 Klick:**

1️⃣ PDF-Archiv → Angebot finden
2️⃣ "In Rechnung umwandeln"
3️⃣ System kopiert:
   - Positionen
   - Kundendaten
   - Preise
4️⃣ Neue Rechnungsnummer
5️⃣ "Erstellen" - Fertig!

**Vorteile:**
⚡ Keine erneute Eingabe
🚫 Keine Fehler
💾 Zeitersparnis`,
          tags: ['angebot', 'rechnung', 'umwandeln'],
          category: 'rechnungen'
        },
        {
          id: 'logo-auf-rechnung',
          question: 'Kann ich Logo auf Rechnungen hinzufügen?',
          answer: `**Ja! Einfach:**

1️⃣ "Einstellungen" → "Geschäftslogo"
2️⃣ Logo hochladen
3️⃣ Automatisch angewendet

**Technisch:**
✅ PNG (empfohlen), JPG, SVG
✅ Max 5 MB
✅ Empfohlen: 1000x1000 Pixel

**Automatisch auf:**
📄 Allen Rechnungen
📋 Allen Angeboten

**Tipp: PNG mit transparentem Hintergrund!**`,
          tags: ['logo', 'rechnung', 'branding'],
          category: 'rechnungen'
        },
        {
          id: 'rechnungen-nach-kuendigung',
          question: 'Was passiert mit Rechnungen bei Kündigung?',
          answer: `**Bei Kündigung:**

**❌ Verlieren:**
- Neue Rechnungen erstellen
- Neue Angebote erstellen
- Kundenliste einsehen

**✅ Behalten:**
- PDF-Archiv - Voller Zugriff!
- Alle PDFs herunterladen
- Rechnungen ansehen
- Alte Rechnungen senden
- QR-Visitenkarte

**Reaktivierung:**
🔄 Jederzeit PRO aktivieren
✅ Alles kehrt zurück
📄 Nummerierung setzt fort

**Ihre Daten sind sicher!**`,
          tags: ['kündigung', 'daten', 'archiv'],
          category: 'rechnungen'
        },
        {
          id: 'daten-export',
          question: 'Kann ich Daten exportieren?',
          answer: `**Verfügbar:**

✅ Kundenexport (aus "Meine Kunden")
✅ Kunden- & Dienstleistungsimport
✅ PDF-Download (alle Rechnungen)
✅ ZUGFeRD-Format (für Buchhaltung)
✅ Statistiken im PDF-Archiv
✅ Massenversand an Buchhalter

**Geplant:**
📊 CSV-Export von Rechnungen
📥 Bulk-Download
📈 Finanzberichte

**Für jetzt: ZUGFeRD-PDF an Buchhalter - automatische Verarbeitung!**`,
          tags: ['export', 'daten', 'excel'],
          category: 'rechnungen'
        }
      ]
    },
    {
      id: 'ki-sprache',
      title: 'KI & Sprachassistent',
      icon: '🎙',
      description: 'Rechnungen per Sprache diktieren — die KI erledigt den Rest',
      anchor: '#ki-sprache',
      questions: [
        {
          id: 'was-ist-sprachdiktat',
          question: 'Was ist die KI-Sprachdiktat-Funktion?',
          answer: `**Rechnung sprechen statt tippen:**

Mit der KI-Sprachfunktion können Sie eine Rechnung einfach diktieren — ohne eine einzige Taste zu drücken.

🎙 Mikrofon-Taste gedrückt halten → sprechen → loslassen

Die KI versteht Sie und füllt automatisch aus:
✅ Kundenname
✅ Leistungen und Positionen
✅ Preise (Brutto)
✅ Menge und Einheit

**Beispiel:** „Kunde ist Müller, Leistung ist Rohrreparatur, Preis ist 500 Euro"

→ Formular ist sofort ausgefüllt.`,
          tags: ['sprache', 'ki', 'diktat', 'stimme', 'mikrofon', 'spracherkennung'],
          category: 'ki-sprache'
        },
        {
          id: 'wie-sprachdiktat-nutzen',
          question: 'Wie benutze ich die Sprachfunktion Schritt für Schritt?',
          answer: `**So einfach geht's:**

1. Neuen Auftrag öffnen (Neue Rechnung / Neues Angebot)
2. 🎙 Mikrofon-Taste gedrückt halten
3. Rechnung diktieren:
   **„Kunde ist [Name], Leistung ist [Leistung], Preis ist [Betrag] Euro"**
4. Taste loslassen → KI füllt das Formular aus
5. Fehlende Felder bei Bedarf manuell ergänzen und speichern

**Tipp:** Bekannte Kunden werden automatisch aus Ihrer Kundendatenbank erkannt — einfach den Namen nennen und alle Daten werden ausgefüllt!`,
          tags: ['anleitung', 'bedienung', 'mikrofon', 'schritt'],
          category: 'ki-sprache'
        },
        {
          id: 'welche-sprachen-sprache',
          question: 'Welche Sprachen versteht der Sprachassistent?',
          answer: `**Mehrsprachig:**

✅ Deutsch (empfohlen für den deutschen Markt)
✅ Serbisch / Bosnisch / Kroatisch
✅ Weitere Sprachen werden automatisch erkannt

**Wichtig:** Die Leistungsbeschreibungen werden genau so übernommen, wie Sie sie sprechen — keine automatische Übersetzung.`,
          tags: ['sprachen', 'deutsch', 'mehrsprachig'],
          category: 'ki-sprache'
        },
        {
          id: 'sprachdiktat-kosten',
          question: 'Kostet die Sprachfunktion extra?',
          answer: `**Nein — im PRO-Plan inklusive.**

Die KI-Sprachdiktier-Funktion ist im PRO-Plan ohne Aufpreis enthalten.

✅ Unbegrenzte Nutzung
✅ Automatische Kundenerkennung aus Ihrer Datenbank
✅ Brutto-Preise werden automatisch korrekt berechnet
✅ KI-Assistent für App-Fragen ebenfalls inklusive`,
          tags: ['preis', 'kosten', 'pro', 'inklusive'],
          category: 'ki-sprache'
        }
      ]
    },
    {
      id: 'abonnement',
      title: 'Abonnement und Zahlung',
      icon: '💳',
      description: 'Bezahlung und Verwaltung',
      anchor: '#abonnement',
      questions: [
        {
          id: 'zahlungsmethoden',
          question: 'Welche Zahlungsmethoden werden akzeptiert?',
          answer: `**Zahlungen über FastSpring:**

💳 **Akzeptiert:**
- Kreditkarte (Visa, Mastercard, Amex)
- PayPal
- SEPA-Lastschrift
- Weitere lokale Methoden

**Sicherheit:**
🔒 FastSpring verarbeitet alle Zahlungen
✅ PCI DSS Level 1 zertifiziert
🇪🇺 DSGVO-konform

**Rechnung:**
📧 FastSpring sendet automatisch`,
          tags: ['zahlung', 'methoden', 'fastspring'],
          category: 'abonnement'
        },
        {
          id: 'fastspring-rechnung',
          question: 'Wo finde ich meine FastSpring-Rechnung?',
          answer: `**FastSpring-Rechnungen:**

📧 **Per E-Mail:**
- FastSpring sendet automatisch
- Nach jeder Zahlung
- An Konto-E-Mail

**Im FastSpring-Portal:**
🔍 Login auf FastSpring
📄 Alle Rechnungen einsehen
💾 Download als PDF

**Problem?**
✉️ Support: Kategorie "Abrechnung & Zahlung"`,
          tags: ['fastspring', 'rechnung', 'invoice'],
          category: 'abonnement'
        },
        {
          id: 'plan-wechsel',
          question: 'Kann ich zwischen Freemium und PRO wechseln?',
          answer: `**Ja! Flexibel:**

**📈 Freemium → PRO:**
- "Upgrade" in Einstellungen
- Sofortiger Zugriff
- Zahlung über FastSpring

**📉 PRO → Freemium:**
- Kündigung (30 Tage Frist)
- Automatischer Wechsel
- PDF-Archiv bleibt!

**🔄 Reaktivierung:**
- Jederzeit PRO aktivieren
- Alle Daten bleiben
- Nummerierung setzt fort

**Kein Datenverlust!**`,
          tags: ['wechsel', 'upgrade', 'downgrade'],
          category: 'abonnement'
        },
        {
          id: 'rechnung-firma',
          question: 'Kann ich Rechnung auf Firma bekommen?',
          answer: `**Ja! Geschäftsrechnung:**

**Einrichtung:**
1️⃣ Bei Registrierung/Upgrade
2️⃣ Firmendaten eingeben:
   - Firmenname
   - Steuernummer / USt-IdNr.
   - Geschäftsadresse
3️⃣ FastSpring erstellt Rechnung

**Änderung:**
⚙️ In FastSpring-Einstellungen
📧 Oder Support kontaktieren

**Wichtig:**
✅ Steuerlich absetzbar
📄 Alle Rechnungen von FastSpring`,
          tags: ['firmenrechnung', 'steuernummer'],
          category: 'abonnement'
        },
        {
          id: 'mehrwertsteuer',
          question: 'Wie wird MwSt berechnet?',
          answer: `**MwSt-Berechnung:**

**Deutschland:**
💶 19,90€ + 19% MwSt. = 23,68€/Monat

**EU-Ausland:**
🇪🇺 Mit USt-IdNr.: Reverse Charge (0%)
🇪🇺 Ohne USt-IdNr.: Lokale MwSt.

**Nicht-EU:**
🌍 Keine MwSt.

**FastSpring:**
✅ Berechnet automatisch
📄 Rechnung mit MwSt-Ausweis`,
          tags: ['mwst', 'steuer', 'vat'],
          category: 'abonnement'
        },
        {
          id: 'zahlungsproblem',
          question: 'Was tun bei Zahlungsproblemen?',
          answer: `**Bei Problemen:**

**1️⃣ FastSpring überprüfen:**
- Kreditkarte gültig?
- Genug Deckung?
- PayPal aktiv?

**2️⃣ FastSpring-Support:**
📧 E-Mail von FastSpring
🔗 Link zu Portal

**3️⃣ Pro-meister.de Support:**
✉️ Kategorie "Abrechnung & Zahlung"
📝 Problem beschreiben

**Wichtig:**
⚠️ Bei Zahlungsausfall: PRO-Zugang kann gesperrt werden
🔄 Nach Zahlung: Sofortige Reaktivierung`,
          tags: ['zahlung', 'problem', 'support'],
          category: 'abonnement'
        }
      ]
    },
    {
      id: 'sicherheit',
      title: 'Sicherheit und Datenschutz',
      icon: '🔒',
      description: 'DSGVO und Datensicherheit',
      anchor: '#sicherheit',
      questions: [
        {
          id: 'dsgvo-konform',
          question: 'Ist pro-meister.de DSGVO-konform?',
          answer: `**Ja! 100% DSGVO-konform:**

✅ EU-Vorschriften eingehalten
✅ Transparente Datenschutzrichtlinie
✅ Ihre Kontrolle über Daten
✅ Recht auf Löschung & Export

**Schutz:**
🔐 SSL/TLS-Verschlüsselung
🔒 Verschlüsselte Datenbank
🚪 Zugriffskontrolle
☁️ Sichere Cloud-Server

**Dritte:**
💳 FastSpring (nur Zahlungen)
📧 E-Mail-Dienst (nur Versand)
🚫 **KEINE Datenweitergabe!**`,
          tags: ['dsgvo', 'datenschutz', 'gdpr'],
          category: 'sicherheit'
        },
        {
          id: 'daten-speicherort-backup',
          question: 'Wo werden Daten gespeichert?',
          answer: `**Speicherort:**

☁️ DSGVO-konforme Cloud
✅ ISO 27001, SOC 2 zertifiziert

**Backup:**
⏰ Automatisch täglich
🔄 Mehrere Kopien
📍 Verschiedene Standorte
🔐 Verschlüsselt

**Was gesichert:**
📄 Alle Rechnungen & Angebote
👥 Alle Kundendaten
⚙️ Einstellungen
🖼️ Logo & Bilder

**Sie müssen NICHTS tun - alles automatisch!**`,
          tags: ['backup', 'speicherort', 'cloud'],
          category: 'sicherheit'
        },
        {
          id: 'daten-zugriff',
          question: 'Wer hat Zugriff auf meine Daten?',
          answer: `**Zugriff:**

✅ **Nur SIE** - Volle Kontrolle
🔒 Pro-meister.de Team - Nur für Support (mit Erlaubnis)

**KEIN Zugriff:**
❌ Marketing-Unternehmen
❌ Data Broker
❌ Soziale Netzwerke
❌ Wettbewerber
❌ **Wir verkaufen KEINE Daten!**

**Dritte (nur technisch):**
💳 FastSpring (Zahlungen)
☁️ Cloud-Anbieter (Hosting)
📧 E-Mail-Dienst (Versand)

**Alle DSGVO-konform! Ihre Privatsphäre ist Priorität!**`,
          tags: ['zugriff', 'privatsphäre', 'datenschutz'],
          category: 'sicherheit'
        }
      ]
    },
    {
      id: 'support',
      title: 'Technischer Support',
      icon: '🛠️',
      description: 'Hilfe und Support',
      anchor: '#support',
      questions: [
        {
          id: 'support-kontakt',
          question: 'Wie kontaktiere ich den Support?',
          answer: `**Kontakt:**

**1️⃣ Support-Formular (empfohlen):**
✉️ Briefumschlag-Symbol oben rechts
Kategorie wählen
Formular ausfüllen

**2️⃣ E-Mail:** support@pro-meister.de

**Kategorien:**
❓ Allgemeine Frage
🔧 Technisches Problem
💳 Abrechnung & Zahlung
✨ Feature-Anfrage
🐛 Bug Report

**Antwort: Max. 24 Stunden**

**Tipp: Screenshot beifügen!**`,
          tags: ['support', 'kontakt', 'hilfe'],
          category: 'support'
        },
        {
          id: 'problem-melden',
          question: 'Wie melde ich Problem oder Feature?',
          answer: `**Problem (Bug):**

✉️ Support-Formular → "🐛 Bug Report"
📝 Beschreiben: Was, Schritte, Erwartung
📸 Screenshot beifügen
🖥️ Browser & Gerät angeben

**Feature anfragen:**

✉️ Support-Formular → "✨ Feature-Anfrage"
💡 Was Sie möchten
🎯 Warum nützlich
📊 Wie es hilft

**Beispiel:**
✅ "Automatische Zahlungserinnerung 7 Tage vor Fälligkeit"
❌ "Bessere Rechnungen"

**Ihr Feedback formt die Plattform!**`,
          tags: ['bug', 'feature', 'feedback'],
          category: 'support'
        }
      ]
    }
  ],

  popularQuestions: [
    'was-ist-pro-meister',
    'wie-registrieren',
    'kosten-preise',
    'was-ist-qr-visitenkarte',
    'rechnung-erstellen',
    'zugferd-pdf',
    'dsgvo-konform',
    'support-kontakt'
  ],

  metadata: {
    lastUpdated: '2025-10-23',
    version: '3.0-HYBRID',
    totalQuestions: 40,
    language: 'de',
    description: 'Hibridni sistem: Pretraga po rečima + Navigacija po poglavljima'
  }
}

// ==========================================
// HIBRIDNI PRETRAGA SISTEM
// ==========================================

/**
 * searchFAQ - Pretraga po rečima bez sugestija
 * Vraća pitanja i odgovore koji sadrže pretragu
 */
export const searchFAQ = (searchTerm) => {
  if (!searchTerm || searchTerm.trim().length === 0) {
    return []
  }

  const results = []
  const term = searchTerm.toLowerCase().trim()
  
  faqData.categories.forEach(category => {
    category.questions.forEach(q => {
      const matchInQuestion = q.question.toLowerCase().includes(term)
      const matchInAnswer = q.answer.toLowerCase().includes(term)
      const matchInTags = q.tags.some(tag => tag.toLowerCase().includes(term))
      
      if (matchInQuestion || matchInAnswer || matchInTags) {
        results.push({
          ...q,
          categoryTitle: category.title,
          categoryId: category.id,
          categoryIcon: category.icon,
          categoryAnchor: category.anchor
        })
      }
    })
  })
  
  return results
}

/**
 * getAllCategories - Sve kategorije za padajući meni
 * Za navigaciju po poglavljima
 */
export const getAllCategories = () => {
  return faqData.categories.map(cat => ({
    id: cat.id,
    title: cat.title,
    icon: cat.icon,
    description: cat.description,
    anchor: cat.anchor,
    questionCount: cat.questions.length
  }))
}

/**
 * getFAQByCategory - Kategorija po ID
 */
export const getFAQByCategory = (categoryId) => {
  return faqData.categories.find(cat => cat.id === categoryId)
}

/**
 * getAllQuestions - Sva pitanja
 */
export const getAllQuestions = () => {
  return faqData.categories.flatMap(cat => 
    cat.questions.map(q => ({ 
      ...q, 
      categoryTitle: cat.title,
      categoryId: cat.id,
      categoryIcon: cat.icon,
      categoryAnchor: cat.anchor
    }))
  )
}

/**
 * getQuestionById - Pitanje po ID
 */
export const getQuestionById = (questionId) => {
  for (const category of faqData.categories) {
    const question = category.questions.find(q => q.id === questionId)
    if (question) {
      return { 
        ...question, 
        categoryTitle: category.title,
        categoryId: category.id,
        categoryIcon: category.icon,
        categoryAnchor: category.anchor
      }
    }
  }
  return null
}

/**
 * hybridSearch - Hibridna pretraga
 * Vraća kategorije (uvek) + rezultate pretrage (samo kad ima teksta)
 */
export const hybridSearch = (searchTerm) => {
  const categories = getAllCategories()
  
  if (!searchTerm || searchTerm.trim().length === 0) {
    return {
      categories: categories,
      questions: [],
      searchActive: false
    }
  }

  const questions = searchFAQ(searchTerm)
  
  return {
    categories: categories,
    questions: questions,
    searchActive: true
  }
}