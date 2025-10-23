// faq-data.js - FAQ System für Pro-Meister.de
// SKRAĆENA VERZIJA - Kratki i koncizni odgovori za majstore

export const faqData = {
  categories: [
    {
      id: 'grundlagen',
      title: 'Grundlegende Informationen',
      icon: '📋',
      description: 'Alles über die Plattform und ihre Funktionen',
      questions: [
        {
          id: 'was-ist-pro-meister',
          question: 'Was ist pro-meister.de und wie kann es meinem Handwerksbetrieb helfen?',
          answer: `**Pro-meister.de** ist Ihre digitale Lösung für Handwerker:

✅ Digitale Visitenkarte mit QR-Code
✅ Kundenverwaltung an einem Ort
✅ Rechnungen & Angebote erstellen (DIN 5008)
✅ Kundenanfragen empfangen
✅ Dienstleistungen organisieren

**Spart Zeit bei Büroarbeit - mehr Zeit fürs Handwerk!**`,
          tags: ['plattform', 'einführung', 'überblick', 'handwerk'],
          category: 'grundlagen'
        },
        {
          id: 'wer-kann-nutzen',
          question: 'Ist die Plattform nur für bestimmte Handwerke gedacht?',
          answer: `**Nein!** Für **alle Handwerker**:

⚡ Elektriker • 🚰 Installateur • 🪚 Schreiner • 🧱 Maurer/Maler
🚗 Kfz-Mechaniker • 🏠 Dachdecker • 🔧 Schlosser • 🌿 Gartenbau
**+ alle anderen Handwerksberufe**

Die Plattform passt sich Ihren Bedürfnissen an.`,
          tags: ['zielgruppe', 'handwerker', 'berufe'],
          category: 'grundlagen'
        },
        {
          id: 'technische-kenntnisse',
          question: 'Wie viel technisches Wissen benötige ich für die Nutzung der Plattform?',
          answer: `**Keines!** Einfach zu bedienen:

✅ Deutsche Benutzeroberfläche
✅ Klare Symbole und Anleitung
✅ Einfache Formulare
✅ Automatische PDF-Erstellung

**Wenn Sie E-Mails verschicken können, können Sie pro-meister.de nutzen!**`,
          tags: ['benutzerfreundlich', 'einfach', 'keine-vorkenntnisse'],
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
- **Testzeitraum verfügbar**

### 🚀 PRO+ - Demnächst
- Enterprise-Lösung`,
          tags: ['preise', 'kosten', 'freemium', 'pro', 'abonnement'],
          category: 'grundlagen'
        },
        {
          id: 'kostenlose-funktionen',
          question: 'Welche Funktionen sind im kostenlosen Freemium-Plan enthalten?',
          answer: `**Freemium (kostenlos für immer):**

✅ QR-Digitale Visitenkarte
✅ Kundenanfragen empfangen
✅ Basis-Profil
✅ Dashboard

**Nicht enthalten (nur PRO):**
❌ Kundenverwaltung
❌ Rechnungen erstellen
❌ PDF-Archiv`,
          tags: ['freemium', 'kostenlos', 'funktionen', 'einschränkungen'],
          category: 'grundlagen'
        },
        {
          id: 'probezeitraum',
          question: 'Gibt es einen Testzeitraum für PRO-Funktionen?',
          answer: `**Ja!** Bei PRO-Registrierung:

⏰ Testzeitraum mit allen PRO-Funktionen
💳 Kreditkarte erforderlich
✅ Erste Abbuchung erst nach Testzeitraum
🔄 Jederzeit kündbar

**Testen Sie alles ohne Verpflichtung!**`,
          tags: ['testzeitraum', 'trial', 'pro', 'kostenlos-testen'],
          category: 'grundlagen'
        },
        {
          id: 'kuendigung',
          question: 'Kann ich das PRO-Abonnement jederzeit kündigen?',
          answer: `**Ja!** Ganz einfach:

✅ Kündigung in "Meine Mitgliedschaft"
⏳ **Kündigungsfrist: 30 Tage**
✅ Zugriff bis Ende bezahlter Zeit
🔄 Wechsel zu Freemium automatisch
✅ Jederzeit reaktivierbar

**Keine versteckten Kosten!**`,
          tags: ['kündigung', 'abonnement', 'kündigungsfrist', 'flexibel'],
          category: 'grundlagen'
        }
      ]
    },
    {
      id: 'registrierung',
      title: 'Registrierung und Start',
      icon: '🚀',
      description: 'Erste Schritte auf der Plattform',
      questions: [
        {
          id: 'wie-registrieren',
          question: 'Wie registriere ich mich auf pro-meister.de?',
          answer: `**Schnelle Registrierung (2-3 Minuten):**

1️⃣ Zu pro-meister.de gehen
2️⃣ "Registrieren" klicken
3️⃣ Wählen:
   - 📧 E-Mail-Registrierung
   - 🔐 Google-Konto (empfohlen)
4️⃣ E-Mail bestätigen
5️⃣ Profil ausfüllen

**Fertig! 🎉**`,
          tags: ['registrierung', 'anmeldung', 'erste-schritte', 'konto-erstellen'],
          category: 'registrierung'
        },
        {
          id: 'google-login',
          question: 'Kann ich mich mit meinem Google-Konto anmelden?',
          answer: `**Ja! Die schnellste Methode:**

✅ Nur 1 Klick zur Anmeldung
🔒 Höchste Sicherheit
🔑 Kein Passwort merken
📱 Auto-Sync auf allen Geräten

**Datenschutz:** Wir erhalten nur Name und E-Mail.`,
          tags: ['google', 'anmeldung', 'oauth', 'social-login'],
          category: 'registrierung'
        },
        {
          id: 'setup-dauer',
          question: 'Wie lange dauert die Einrichtung meines Kontos?',
          answer: `**Schneller Start:**

⏱️ **Minimum (5 Min):**
- Registrierung
- Basisdaten eingeben
- QR-Visitenkarte erstellen
- ✅ Sofort einsatzbereit!

⏱️ **Vollständig (15-20 Min):**
- Detailliertes Profil
- Logo hochladen
- Alle Dienstleistungen
- Rechnungseinstellungen

**Tipp:** Nicht alles auf einmal - schrittweise vervollständigen!`,
          tags: ['setup', 'einrichtung', 'dauer', 'erste-schritte'],
          category: 'registrierung'
        }
      ]
    },
    {
      id: 'visitenkarte',
      title: 'QR Visitenkarte',
      icon: '📱',
      description: 'Digitale Visitenkarten erstellen und verwalten',
      questions: [
        {
          id: 'was-ist-qr-visitenkarte',
          question: 'Was ist eine QR-Visitenkarte und wie funktioniert sie?',
          answer: `**Ihre digitale Geschäftspräsenz:**

**So funktioniert's:**
1. Sie erstellen digitale Visitenkarte
2. System generiert QR-Code
3. Kunde scannt Code
4. Kunde sieht Ihr Profil + kann anfragen

**Vorteile:**
♻️ Umweltfreundlich
🔄 Immer aktuell
📊 Professionell
💰 Im Freemium enthalten`,
          tags: ['qr-code', 'visitenkarte', 'digital', 'erklärung'],
          category: 'visitenkarte'
        },
        {
          id: 'visitenkarte-erstellen',
          question: 'Wie erstelle ich meine digitale Visitenkarte?',
          answer: `**Einfach in 5 Schritten:**

1️⃣ "Meine Visitenkarte" öffnen
2️⃣ Geschäftsdaten ausfüllen (Firma, Adresse, Kontakt)
3️⃣ Logo & Bilder hochladen
4️⃣ Dienstleistungen hinzufügen
5️⃣ "Speichern & Veröffentlichen"

**Fertig in 5-10 Minuten!** ⏱️`,
          tags: ['erstellen', 'anleitung', 'visitenkarte', 'setup'],
          category: 'visitenkarte'
        },
        {
          id: 'visitenkarte-zugriff',
          question: 'Wie greifen Kunden auf meine Visitenkarte zu?',
          answer: `**3 einfache Wege:**

📱 **QR-Code scannen** - Kamera aufs Code richten
🔗 **Direkter Link** - z.B. pro-meister.de/p/ihr-name
📧 **E-Mail-Signatur** - QR-Code einbetten

**Wichtig:**
🚫 Kein Login nötig
📱 Keine App nötig
🌐 24/7 erreichbar`,
          tags: ['zugriff', 'kunden', 'qr-code', 'link'],
          category: 'visitenkarte'
        },
        {
          id: 'visitenkarte-design',
          question: 'Kann ich das Design meiner Visitenkarte anpassen?',
          answer: `**Ja! Personalisierung möglich:**

🎨 **Visuelle Elemente:**
- Logo hochladen
- Profilbild
- Farbschema
- Layout

✏️ **Inhalt:**
- Firmenbeschreibung
- Dienstleistungen
- Kontaktoptionen
- Standort

**Jederzeit änderbar!** 🔄`,
          tags: ['design', 'anpassung', 'personalisierung', 'branding'],
          category: 'visitenkarte'
        },
        {
          id: 'logo-bilder-hinzufuegen',
          question: 'Kann ich mein Logo und Bilder zur Visitenkarte hinzufügen?',
          answer: `**Ja! Visuelle Elemente:**

**Was hinzufügen:**
🖼️ Firmenlogo (PNG empfohlen)
👤 Profilbild
📸 Header-Bild

**Technische Details:**
✅ Formate: PNG, JPG, SVG
✅ Max: 5 MB
✅ Empfohlen: 500x500 Pixel

**Tipp:** PNG mit transparentem Hintergrund für bestes Ergebnis!`,
          tags: ['logo', 'bilder', 'upload', 'design', 'branding'],
          category: 'visitenkarte'
        },
        {
          id: 'visitenkarte-teilen',
          question: 'Wie kann ich meine digitale Visitenkarte mit Kunden teilen?',
          answer: `**Mehrere Möglichkeiten:**

📱 **Vom Bildschirm** - QR-Code zeigen
🖨️ **Gedruckt** - Auf Flyer, Visitenkarten, Fahrzeug
🔗 **Link teilen** - SMS, WhatsApp, E-Mail
✉️ **E-Mail-Signatur** - QR-Code einbetten
🚗 **Fahrzeugbeschriftung** - Großer QR-Code
🏪 **Geschäft** - Am Eingang/Fenster

**Kein Konto für Kunden nötig!** 🚫`,
          tags: ['teilen', 'qr-code', 'verbreitung', 'marketing'],
          category: 'visitenkarte'
        }
      ]
    },
    {
      id: 'kunden',
      title: 'Kundenverwaltung',
      icon: '👥',
      description: 'Kunden hinzufügen und organisieren',
      questions: [
        {
          id: 'kunden-hinzufuegen',
          question: 'Wie füge ich einen neuen Kunden hinzu?',
          answer: `**Zwei Wege:**

**1️⃣ Manuell:**
- "Kunden" → "Neuer Kunde"
- Daten eingeben (Name, E-Mail, Telefon, Adresse)
- "Speichern"

**2️⃣ Automatisch (empfohlen):**
- Bei Rechnung erstellen
- System speichert Kunde automatisch
- Schneller und effizienter! ⚡

**⚠️ Nur im PRO-Plan**`,
          tags: ['kunden', 'hinzufügen', 'verwaltung', 'neu'],
          category: 'kunden'
        },
        {
          id: 'kunden-suchen',
          question: 'Wie kann ich nach Kunden suchen?',
          answer: `**Schnelle Suche:**

🔍 "Kunden" → Suchfeld
✅ Suche nach: Name, Firma, E-Mail, Telefon, Stadt
⚡ Ergebnisse in Echtzeit

**Was dann möglich:**
📄 Neue Rechnung erstellen
✏️ Kontaktinfo aktualisieren
📞 Kunde kontaktieren
📂 Dokumente im PDF Archiv sehen`,
          tags: ['suche', 'kunden', 'finden', 'filter'],
          category: 'kunden'
        }
      ]
    },
    {
      id: 'rechnungen',
      title: 'Rechnungen und Angebote',
      icon: '📄',
      description: 'Professionelle Rechnungsstellung',
      questions: [
        {
          id: 'rechnung-erstellen',
          question: 'Wie erstelle ich eine Rechnung oder ein Angebot?',
          answer: `**Schnelle Erstellung:**

1️⃣ "Rechnungen" → "+ Neue Rechnung/Angebot"
2️⃣ Kunde wählen/eingeben (wird auto-gespeichert)
3️⃣ Kundentyp: Mit MwSt. (19%) oder Kleinunternehmer
4️⃣ Positionen hinzufügen:
   - ⚡ "Meine Services" (1-Klick)
   - ✏️ Oder manuell
5️⃣ "Erstellen" - PDF fertig! 🎉

**Automatisch:**
✅ Nummerierung
✅ MwSt.-Berechnung
✅ ZUGFeRD PDF
✅ Archivierung

**⚠️ Nur im PRO-Plan**`,
          tags: ['rechnung', 'angebot', 'erstellen', 'pdf', 'mwst', 'kleinunternehmer'],
          category: 'rechnungen'
        },
        {
          id: 'zugferd-pdf',
          question: 'Was ist ZUGFeRD PDF und warum ist es wichtig?',
          answer: `**ZUGFeRD = E-Rechnungsformat**

**Was ist es:**
📄 Klassisches PDF + 💾 XML-Daten in einer Datei

**Vorteile:**
⚡ Automatische Buchung (DATEV, Lexware, SAP)
🚫 Keine manuelle Eingabe
💰 Schnellere Zahlung
✅ Gesetzlich konform

**Pro-meister.de:**
Alle Rechnungen sind automatisch ZUGFeRD! 🎉`,
          tags: ['zugferd', 'e-rechnung', 'pdf', 'datev', 'buchhaltung', 'xml'],
          category: 'rechnungen'
        },
        {
          id: 'rechnung-senden',
          question: 'Wie sende ich eine Rechnung an den Kunden?',
          answer: `**Direkt aus Plattform:**

📧 Nach Erstellung: "Per E-Mail senden"
✅ E-Mail automatisch vorbereitet
📎 PDF als Anhang
✏️ Persönliche Nachricht möglich

**Oder:**
💾 PDF herunterladen
📱 Per WhatsApp/E-Mail senden
🖨️ Ausdrucken

**Erneutes Senden:**
📂 PDF Archiv → Rechnung finden → "Senden"`,
          tags: ['rechnung', 'versenden', 'email', 'pdf', 'download'],
          category: 'rechnungen'
        },
        {
          id: 'din-5008-standard',
          question: 'Was ist der DIN 5008-Standard?',
          answer: `**DIN 5008 = Deutscher Standard für Geschäftsdokumente**

**Wichtig weil:**
✅ Professionell & anerkannt
✅ Klar & lesbar
✅ Kompatibel mit Scan/OCR
✉️ **Perfekt für Fensterbriefumschlag!**

**Pro-meister.de:**
Alle Rechnungen automatisch DIN 5008-formatiert!

**Tipp:** Einfach ausdrucken, falten, in Fensterbriefumschlag - Adresse sichtbar! 📮`,
          tags: ['din-5008', 'standard', 'formatierung', 'professionell', 'brief'],
          category: 'rechnungen'
        },
        {
          id: 'rechnungsnummerierung',
          question: 'Wie werden Rechnungen und Angebote nummeriert?',
          answer: `**Automatische Nummerierung:**

📄 Rechnungen: RE-2025-0001, RE-2025-0002...
📋 Angebote: AN-2025-0001, AN-2025-0002...

**Erste Einrichtung:**
Beim ersten Dokument fragt System nach Startnummer:
- ✅ Neu: Leer lassen (beginnt bei 1)
- ✅ Bestehend: Z.B. 151 eingeben (setzt fort ab 151)

**NEUSTART-Funktion:**
🔄 Reset während Testphase
🗑️ Löscht ALLE Test-Dokumente
🎯 Beginnt ab Nummer Ihrer Wahl

**Wichtig:**
✅ Gesetzeskonform
✅ Keine Lücken
✅ Jahreswechsel auto-Reset`,
          tags: ['nummerierung', 'rechnungsnummer', 'angebotsnummer', 'automatisch', 'neustart'],
          category: 'rechnungen'
        },
        {
          id: 'pdf-archiv',
          question: 'Wie archiviere ich Rechnungen und wo finde ich sie?',
          answer: `**Automatisches Archiv:**

📂 Alle Dokumente in "PDF Archiv"
💾 Auto-Speicherung nach Erstellung

**Suche & Filter:**
📅 Zeitfilter (Diesen/Letzten Monat, Benutzerdefiniert)
📄 Typ (Rechnung/Angebot)
👤 Kunde
🔢 Nummer/Betrag

**Aktionen:**
👁️ Vorschau
💾 Herunterladen
📧 Per E-Mail senden
🖨️ Drucken

**Buchhalter-Feature:**
📧 E-Mail einrichten
📤 Massenversand an Buchhalter
⚡ Auto-Aufteilung bei vielen Rechnungen

**⚠️ Nur im PRO-Plan**`,
          tags: ['pdf', 'archiv', 'speichern', 'dokumente', 'buchhalter'],
          category: 'rechnungen'
        },
        {
          id: 'angebot-zu-rechnung',
          question: 'Kann ich ein Angebot in eine Rechnung umwandeln?',
          answer: `**Ja! Mit 1 Klick:**

1️⃣ PDF Archiv → Angebot finden
2️⃣ "In Rechnung umwandeln"
3️⃣ System kopiert alles automatisch:
   - Positionen
   - Kundendaten
   - Preise
4️⃣ Neue Rechnungsnummer
5️⃣ "Erstellen" - Fertig! 🎉

**Vorteile:**
⚡ Keine erneute Eingabe
🚫 Keine Fehler
💾 Zeitersparnis`,
          tags: ['angebot', 'rechnung', 'konvertierung', 'umwandeln'],
          category: 'rechnungen'
        },
        {
          id: 'logo-hinzufuegen',
          question: 'Kann ich mein eigenes Logo auf Rechnungen hinzufügen?',
          answer: `**Ja! Einfach hochladen:**

1️⃣ "Einstellungen" → "Geschäftslogo"
2️⃣ Logo hochladen
3️⃣ Speichern

**Technisch:**
✅ PNG (empfohlen), JPG, SVG
✅ Max 5 MB
✅ Empfohlen: 1000x1000 Pixel

**Automatisch auf:**
📄 Alle Rechnungen
📋 Alle Angebote
📱 QR-Visitenkarte

**Tipp:** PNG mit transparentem Hintergrund!`,
          tags: ['logo', 'branding', 'design', 'einstellungen'],
          category: 'rechnungen'
        },
        {
          id: 'freemium-downgrade',
          question: 'Was passiert mit meinen Rechnungen, wenn ich den PRO-Plan kündige?',
          answer: `**Bei Kündigung:**

❌ **Verlieren:**
- Neue Rechnungen erstellen
- Neue Angebote erstellen
- Kundenliste einsehen

✅ **Behalten:**
- **PDF Archiv - Voller Zugriff!**
- Alle PDFs herunterladen
- Rechnungen ansehen
- Alte Rechnungen senden
- QR-Visitenkarte

**Reaktivierung:**
🔄 Jederzeit PRO aktivieren
✅ Alles kehrt zurück
📄 Nummerierung setzt fort

**Ihre Daten sind sicher - Nichts wird gelöscht!** 🔒`,
          tags: ['freemium', 'downgrade', 'kündigung', 'daten', 'archiv'],
          category: 'rechnungen'
        },
        {
          id: 'daten-export',
          question: 'Kann ich Daten aus Rechnungen exportieren (z.B. für Excel)?',
          answer: `**Aktuell:**
❌ Kein CSV/Excel-Export

**Verfügbar:**
✅ PDF-Download (alle Rechnungen)
✅ ZUGFeRD-Format (für DATEV, Lexware)
✅ Statistiken im PDF Archiv
✅ Massenversand an Buchhalter

**Geplant:**
📊 CSV/Excel-Export
📥 Bulk-Download
📈 Finanzberichte

**Für jetzt:** ZUGFeRD-PDF an Buchhalter - automatische Verarbeitung! ⚡`,
          tags: ['export', 'excel', 'csv', 'daten', 'zugferd'],
          category: 'rechnungen'
        }
      ]
    },
    {
      id: 'abonnement',
      title: 'Abonnement und Zahlung',
      icon: '💎',
      description: 'Preise, Pläne und Zahlungen',
      questions: [
        {
          id: 'zahlungsmethoden',
          question: 'Welche Zahlungsmethoden werden akzeptiert?',
          answer: `**Zahlungen über Paddle:**

💳 **Akzeptierte Methoden:**
- Kreditkarte (Visa, Mastercard, Amex)
- PayPal
- SEPA-Lastschrift
- Weitere lokale Zahlungsmethoden

**Sicherheit:**
🔒 Paddle verarbeitet alle Zahlungen
✅ PCI DSS Level 1 zertifiziert
🇪🇺 DSGVO-konform

**Rechnung:**
📧 Paddle sendet Rechnung direkt per E-Mail`,
          tags: ['zahlung', 'payment', 'paddle', 'kreditkarte'],
          category: 'abonnement'
        },
        {
          id: 'paddle-rechnung',
          question: 'Wo finde ich meine Paddle-Rechnung für das Abonnement?',
          answer: `**Paddle-Rechnungen:**

📧 **Per E-Mail:**
- Paddle sendet Rechnung automatisch
- An E-Mail-Adresse Ihres Kontos
- Nach jeder erfolgreichen Zahlung

**In Paddle:**
🔐 Login auf Paddle-Portal
📄 Alle Rechnungen einsehen
💾 Download als PDF

**Problem?**
✉️ Support kontaktieren: Kategorie "Abrechnung & Zahlung"
✅ Wir helfen oder eskalieren an Paddle`,
          tags: ['paddle', 'rechnung', 'invoice', 'abrechnung'],
          category: 'abonnement'
        },
        {
          id: 'plan-wechseln',
          question: 'Kann ich zwischen Freemium und PRO wechseln?',
          answer: `**Ja! Flexibler Wechsel:**

**📈 Freemium → PRO:**
- "Upgrade" in Einstellungen
- Sofortiger Zugriff auf PRO-Funktionen
- Zahlung über Paddle

**📉 PRO → Freemium:**
- Kündigung (30 Tage Frist)
- Automatischer Wechsel
- PDF Archiv bleibt zugänglich!

**🔄 Reaktivierung:**
- Jederzeit PRO wieder aktivieren
- Alle Daten bleiben erhalten
- Nummerierung setzt fort

**Keine Datenverlust!** 🔒`,
          tags: ['upgrade', 'downgrade', 'wechsel', 'plan'],
          category: 'abonnement'
        },
        {
          id: 'rechnung-firma',
          question: 'Kann ich eine Rechnung auf meine Firma bekommen?',
          answer: `**Ja! Geschäftsrechnung möglich:**

**Einrichtung:**
1️⃣ Bei Registrierung/Upgrade
2️⃣ Firmendaten eingeben:
   - Firmenname
   - Steuernummer / USt-IdNr.
   - Geschäftsadresse
3️⃣ Paddle erstellt Rechnung mit Firmendaten

**Änderung:**
⚙️ In Paddle-Einstellungen
📧 Oder Support kontaktieren

**Wichtig:**
✅ Steuerlich absetzbar
📄 Alle Rechnungen von Paddle`,
          tags: ['firmenrechnung', 'steuernummer', 'geschäft', 'firma'],
          category: 'abonnement'
        },
        {
          id: 'mehrwertsteuer',
          question: 'Wie wird die Mehrwertsteuer auf das Abonnement berechnet?',
          answer: `**MwSt-Berechnung:**

**Deutschland:**
💶 19,90€ + 19% MwSt. = **23,68€/Monat**

**EU-Ausland:**
🇪🇺 Mit USt-IdNr.: Reverse Charge (0% MwSt.)
🇪🇺 Ohne USt-IdNr.: Lokale MwSt.

**Nicht-EU:**
🌍 Keine MwSt.

**Paddle:**
✅ Berechnet automatisch korrekte MwSt.
📄 Rechnung mit MwSt-Ausweis`,
          tags: ['mwst', 'steuer', 'mehrwertsteuer', 'vat'],
          category: 'abonnement'
        },
        {
          id: 'zahlungsproblem',
          question: 'Was tun bei Zahlungsproblemen?',
          answer: `**Bei Problemen:**

**1️⃣ Paddle überprüfen:**
- Kreditkarte gültig?
- Genug Deckung?
- PayPal aktiv?

**2️⃣ Paddle-Support:**
📧 E-Mail von Paddle mit Details
🔗 Link zu Paddle-Portal

**3️⃣ Pro-meister.de Support:**
✉️ Kategorie "Abrechnung & Zahlung"
📝 Problem beschreiben
✅ Wir helfen oder eskalieren

**Wichtig:**
⚠️ Bei fehlgeschlagener Zahlung: PRO-Zugang kann gesperrt werden
🔄 Nach Zahlung: Sofortige Reaktivierung`,
          tags: ['zahlung', 'problem', 'fehler', 'support'],
          category: 'abonnement'
        }
      ]
    },
    {
      id: 'sicherheit',
      title: 'Sicherheit und Datenschutz',
      icon: '🔒',
      description: 'GDPR, Datensicherheit und Privatsphäre',
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
🇪🇺 **EU-Server (Daten verlassen EU nicht)**

**Dritte:**
💳 Paddle (nur Zahlungen)
📧 E-Mail-Dienst (nur Versand)
🚫 **KEINE Datenweitergabe!**`,
          tags: ['dsgvo', 'datenschutz', 'gdpr', 'sicherheit', 'privacy'],
          category: 'sicherheit'
        },
        {
          id: 'daten-speicherort-backup',
          question: 'Wo werden meine Daten gespeichert und gibt es Backups?',
          answer: `**Speicherort:**
☁️ DSGVO-konforme Cloud-Server
🇪🇺 EU-Standort
✅ ISO 27001, SOC 2 zertifiziert

**Backup:**
⏰ Automatisch täglich
🔄 Mehrfache Kopien
📍 Verschiedene Standorte
🔐 Verschlüsselt

**Was gesichert:**
📄 Alle Rechnungen & Angebote
👥 Alle Kundendaten
⚙️ Einstellungen
🖼️ Logo & Bilder

**Sie müssen NICHTS tun - Alles automatisch!** 🎉`,
          tags: ['backup', 'speicherort', 'sicherheit', 'cloud', 'daten'],
          category: 'sicherheit'
        },
        {
          id: 'daten-zugriff',
          question: 'Wer hat Zugriff auf meine Daten?',
          answer: `**Zugriff:**

✅ **Nur SIE** - Volle Kontrolle
🔒 Pro-meister.de Team - Nur für Support (mit Ihrer Erlaubnis)

**KEIN Zugriff:**
❌ Marketing-Unternehmen
❌ Data Broker
❌ Soziale Netzwerke
❌ Wettbewerber
❌ **Wir verkaufen KEINE Daten!**

**Dritte (nur technisch):**
💳 Paddle (Zahlungen)
☁️ Cloud-Anbieter (Hosting)
📧 E-Mail-Dienst (Versand)
**Alle DSGVO-konform!**

**Ihre Privatsphäre ist oberste Priorität!** 🛡️`,
          tags: ['zugriff', 'privatsphäre', 'datenschutz', 'sicherheit'],
          category: 'sicherheit'
        }
      ]
    },
    {
      id: 'support',
      title: 'Technischer Support',
      icon: '🛠️',
      description: 'Hilfe und technische Unterstützung',
      questions: [
        {
          id: 'support-kontakt',
          question: 'Wie kontaktiere ich den Support?',
          answer: `**Kontakt:**

1️⃣ **Support-Formular (empfohlen):**
   - ✉️ Briefumschlag-Symbol oben rechts
   - Kategorie wählen
   - Formular ausfüllen

2️⃣ **E-Mail:** support@pro-meister.de

**Kategorien:**
❓ Allgemeine Frage
🔧 Technisches Problem
💳 Abrechnung & Zahlung (inkl. Paddle-Rechnungen)
✨ Feature-Anfrage
🐛 Bug Report

**Antwort:** Max. 24 Stunden (meist schneller)

**Tipp:** Screenshot beifügen für schnellere Hilfe!`,
          tags: ['support', 'kontakt', 'hilfe', 'email'],
          category: 'support'
        },
        {
          id: 'problem-melden',
          question: 'Wie melde ich ein Problem oder fordere eine neue Funktion an?',
          answer: `**Problem melden (Bug):**
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

**Ihr Feedback formt die Plattform!** 🚀`,
          tags: ['bug', 'feature', 'problem', 'feedback', 'anfrage'],
          category: 'support'
        }
      ]
    }
  ],

  // Schnellzugriff auf häufigste Fragen
  popularQuestions: [
    'was-ist-pro-meister',
    'wie-registrieren',
    'kosten-preise',
    'was-ist-qr-visitenkarte',
    'visitenkarte-teilen',
    'rechnung-erstellen',
    'dsgvo-konform',
    'support-kontakt'
  ],

  // Metadaten
  metadata: {
    lastUpdated: '2025-10-23',
    version: '2.0-SHORT',
    totalQuestions: 39,
    language: 'de',
    description: 'Skraćena verzija - Kratki i koncizni odgovori za majstore'
  }
}

// Helper Funktionen
export const getFAQByCategory = (categoryId) => {
  return faqData.categories.find(cat => cat.id === categoryId)
}

export const searchFAQ = (searchTerm) => {
  const results = []
  const term = searchTerm.toLowerCase()
  
  faqData.categories.forEach(category => {
    category.questions.forEach(q => {
      if (
        q.question.toLowerCase().includes(term) ||
        q.answer.toLowerCase().includes(term) ||
        q.tags.some(tag => tag.toLowerCase().includes(term))
      ) {
        results.push({ ...q, categoryTitle: category.title })
      }
    })
  })
  
  return results
}

export const getAllQuestions = () => {
  return faqData.categories.flatMap(cat => 
    cat.questions.map(q => ({ ...q, categoryTitle: cat.title }))
  )
}

export const getQuestionById = (questionId) => {
  for (const category of faqData.categories) {
    const question = category.questions.find(q => q.id === questionId)
    if (question) {
      return { ...question, categoryTitle: category.title }
    }
  }
  return null
}