// faq-data.js - FAQ System für Pro-Meister.de
// Struktur: Kategorien mit Fragen und Antworten

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
          answer: `**Pro-meister.de** ist eine digitale Plattform, die speziell für Handwerker und Meister in Deutschland entwickelt wurde.

Die Plattform ermöglicht Ihnen:
- ✅ **Professionelle digitale Visitenkarte** mit QR-Code erstellen
- ✅ **Kundendatenbank** an einem Ort verwalten
- ✅ **Rechnungen und Angebote** nach DIN 5008 Standard erstellen
- ✅ **Kundenanfragen** direkt über die Plattform empfangen
- ✅ **Alle Ihre Dienstleistungen** und Projekte organisieren

Das Ziel der Plattform ist es, Ihnen Zeit zu sparen und die täglichen administrativen Aufgaben zu erleichtern, sodass Sie sich auf das konzentrieren können, was Sie am besten können - Ihr Handwerk.`,
          tags: ['plattform', 'einführung', 'überblick', 'handwerk'],
          category: 'grundlagen'
        },
        {
          id: 'wer-kann-nutzen',
          question: 'Ist die Plattform nur für bestimmte Handwerke gedacht?',
          answer: `**Nein!** Die Plattform ist für **alle Handwerker und Meister** konzipiert, unabhängig von der Branche:

- ⚡ Elektriker
- 🚰 Installateur / Sanitär
- 🪚 Schreiner / Tischler
- 🧱 Maurer und Maler
- 🚗 Kfz-Mechaniker
- 🏠 Dachdecker
- 🔧 Schlosser / Metallbau
- 🏺 Fliesenleger
- 🌿 Garten- und Landschaftsbau
- ➕ Und alle anderen Handwerksberufe

Die Plattform ist flexibel und passt sich Ihren spezifischen Anforderungen an, unabhängig von der Art der Arbeit, die Sie ausführen.`,
          tags: ['zielgruppe', 'handwerker', 'berufe'],
          category: 'grundlagen'
        },
        {
          id: 'technische-kenntnisse',
          question: 'Wie viel technisches Wissen benötige ich für die Nutzung der Plattform?',
          answer: `**Absolut nicht!** Die Plattform ist so gestaltet, dass sie **einfach zu bedienen** ist, auch wenn Sie nicht technisch versiert sind:

- ✅ Intuitive Benutzeroberfläche auf Deutsch
- ✅ Klare Symbole und Beschriftungen
- ✅ Schritt-für-Schritt-Anleitung für alle Funktionen
- ✅ Einfaches Ausfüllen von Formularen
- ✅ Automatische PDF-Dokumentenerstellung
- ✅ Alles mit wenigen Klicks erledigt

**Wenn Sie E-Mails versenden und im Internet surfen können, können Sie pro-meister.de problemlos nutzen!**`,
          tags: ['benutzerfreundlich', 'einfach', 'keine-vorkenntnisse'],
          category: 'grundlagen'
        },
        {
          id: 'kosten-preise',
          question: 'Was kostet die Nutzung von pro-meister.de?',
          answer: `Wir bieten **drei Pläne** entsprechend Ihren Bedürfnissen:

### 🆓 FREEMIUM - 0€ für immer
- QR-Digitale Visitenkarte
- Kundenanfragen empfangen
- Kostenlos ohne zeitliche Begrenzung

### 💎 PRO - 19,90€ monatlich (+ MwSt.)
- Alles aus dem Freemium-Plan
- Kundenverwaltung
- Rechnungen und Angebote erstellen (ZUGFeRD PDF)
- Dienstleistungsverwaltung
- PDF-Archiv
- Testzeitraum verfügbar

### 🚀 PRO+ - Demnächst verfügbar
- Enterprise-Lösung für größere Unternehmen

Sie können **völlig kostenlos** mit dem Freemium-Plan beginnen und upgraden, wenn Sie mehr Funktionen benötigen.`,
          tags: ['preise', 'kosten', 'freemium', 'pro', 'abonnement'],
          category: 'grundlagen'
        },
        {
          id: 'kostenlose-funktionen',
          question: 'Welche Funktionen sind im kostenlosen Freemium-Plan enthalten?',
          answer: `Der **Freemium-Plan ist dauerhaft kostenlos** und beinhaltet:

### ✅ Inkludierte Funktionen:
- 📱 **QR-Digitale Visitenkarte** - Erstellen und teilen Sie Ihre professionelle digitale Visitenkarte
- 📬 **Kundenanfragen empfangen** - Potenzielle Kunden können Sie direkt über die Plattform kontaktieren
- 👤 **Basis-Profil** - Ihr öffentliches Handwerkerprofil mit Kontaktdaten
- 📊 **Dashboard-Zugriff** - Überblick über eingegangene Anfragen

### 🔒 Nicht im Freemium enthalten (nur PRO):
- Kundenverwaltung
- Rechnungen und Angebote erstellen
- PDF-Archiv
- Erweiterte Einstellungen

**Der Freemium-Plan ist perfekt zum Ausprobieren und für Handwerker, die nur eine digitale Visitenkarte benötigen!**`,
          tags: ['freemium', 'kostenlos', 'funktionen', 'einschränkungen'],
          category: 'grundlagen'
        },
        {
          id: 'probezeitraum',
          question: 'Gibt es einen Testzeitraum für PRO-Funktionen?',
          answer: `**Ja!** Wenn Sie sich für den **PRO-Plan** registrieren, erhalten Sie automatisch einen **Testzeitraum**, mit dem Sie alle Premium-Funktionen testen können:

⏰ **Testzeitraum** (Dauer gemäß Paddle-System)
- Sofortiger Zugriff auf alle PRO-Funktionen
- Kreditkarte bei der Registrierung erforderlich
- **Erste Abbuchung erst nach Ablauf des Testzeitraums**
- Sie können jederzeit während des Testzeitraums kündigen

📌 **Was Sie testen können:**
- Unbegrenzte Kundenverwaltung
- Professionelle Rechnungen und Angebote erstellen
- PDF-Archiv aller Dokumente
- Verwaltung Ihrer Dienstleistungen

**Keine Verpflichtung** - wenn es Ihnen nicht gefällt, kündigen Sie einfach vor Ablauf des Testzeitraums und es werden keine Gebühren erhoben!`,
          tags: ['testzeitraum', 'trial', 'pro', 'kostenlos-testen'],
          category: 'grundlagen'
        },
        {
          id: 'kuendigung',
          question: 'Kann ich das PRO-Abonnement jederzeit kündigen?',
          answer: `**Ja**, Sie können jederzeit kündigen! So funktioniert es:

✅ **Kündigung**:
- Kündigen Sie direkt in Ihrem Konto (Meine Mitgliedschaft)
- **Kündigungsfrist: 30 Tage**
- Sie behalten den Zugriff auf PRO-Funktionen bis zum Ende des bezahlten Zeitraums
- Keine versteckten Kosten oder Strafen

📅 **Nach der Kündigung:**
- Sie wechseln automatisch zum **Freemium-Plan**
- Ihre Daten bleiben gespeichert
- QR-Visitenkarte und Anfragen funktionieren weiterhin
- Sie können PRO jederzeit wieder aktivieren

🔄 **Reaktivierung:**
- Mit einem einfachen Klick können Sie PRO wieder aktivieren
- Setzen Sie dort fort, wo Sie aufgehört haben
- Alle vorherigen Daten sind gespeichert

**Wir haben eine transparente Richtlinie - keine Komplikationen bei der Kündigung!**`,
          tags: ['kündigung', 'abonnement', 'kündigungsfrist', 'flexibel'],
          category: 'grundlagen'
        },
        
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
          answer: `Die Registrierung ist **einfach und schnell** (nur 2-3 Minuten):

### 📝 Schritt-für-Schritt Anleitung:

**1. Zur Registrierungsseite gehen**
- Besuchen Sie [pro-meister.de](https://pro-meister.de)
- Klicken Sie auf **"Registrieren"** oder **"Kostenlos starten"**

**2. Wählen Sie Ihre Registrierungsmethode:**
- 📧 **E-Mail-Registrierung** - Mit Ihrer E-Mail-Adresse und Passwort
- 🔐 **Google-Konto** - Schnelle Anmeldung mit Ihrem Google-Konto (empfohlen)

**3. Bestätigen Sie Ihre E-Mail**
- Sie erhalten eine Bestätigungs-E-Mail
- Klicken Sie auf den Bestätigungslink

**4. Profil ausfüllen**
- Geben Sie Ihre Geschäftsdaten ein
- Fügen Sie Ihre Handwerksdienstleistungen hinzu
- Fertig! 🎉

**Das war's - Sie können sofort loslegen!**`,
          tags: ['registrierung', 'anmeldung', 'erste-schritte', 'konto-erstellen'],
          category: 'registrierung'
        },
        {
          id: 'google-login',
          question: 'Kann ich mich mit meinem Google-Konto anmelden?',
          answer: `**Ja!** Die Anmeldung mit Google ist **die schnellste und sicherste** Methode:

✅ **Vorteile der Google-Anmeldung:**
- ⚡ **Schneller** - Nur 1 Klick zur Anmeldung
- 🔒 **Sicherer** - Google's hochsichere Authentifizierung
- 🔑 **Kein Passwort merken** - Google verwaltet Ihre Anmeldedaten
- 📱 **Automatische Synchronisierung** - Auf allen Ihren Geräten

### 🚀 So funktioniert's:
1. Klicken Sie auf **"Mit Google anmelden"**
2. Wählen Sie Ihr Google-Konto aus
3. Bestätigen Sie die Berechtigungen
4. Fertig - Sie sind eingeloggt!

### 🔐 Datenschutz:
- Wir erhalten nur Ihren Namen und E-Mail-Adresse
- Ihr Google-Passwort wird **niemals** mit uns geteilt
- Sie können die Verknüpfung jederzeit in Ihren Google-Einstellungen aufheben

**Hinweis:** Sie können auch eine klassische E-Mail-Registrierung verwenden, wenn Sie das bevorzugen.`,
          tags: ['google', 'anmeldung', 'oauth', 'social-login'],
          category: 'registrierung'
        },
        {
          id: 'setup-dauer',
          question: 'Wie lange dauert die Einrichtung meines Kontos?',
          answer: `Die Einrichtung ist **schnell und unkompliziert**:

### ⏱️ Zeitaufwand:

**Minimale Einrichtung** - 5 Minuten
- Registrierung abschließen
- Grundlegende Geschäftsdaten eingeben
- QR-Visitenkarte erstellen
- ✅ **Sofort einsatzbereit!**

**Vollständige Einrichtung** - 15-20 Minuten
- Detailliertes Firmenprofil
- Logo und Bilder hochladen
- Alle Dienstleistungen hinzufügen
- Erste Kunden anlegen (optional)
- Rechnungseinstellungen konfigurieren

### 📋 Was Sie benötigen:
- ✅ E-Mail-Adresse
- ✅ Geschäftsdaten (Name, Adresse, Steuernummer)
- ✅ Ihr Firmenlogo (optional, aber empfohlen)
- ✅ Liste Ihrer Hauptdienstleistungen

### 💡 Tipp:
**Sie müssen nicht alles auf einmal einrichten!** Sie können mit den Grundlagen beginnen und Ihr Profil nach und nach vervollständigen.

**Wichtig:** Mit dem Freemium-Plan können Sie sofort mit der QR-Visitenkarte loslegen. Für Rechnungen und Kundenverwaltung benötigen Sie den PRO-Plan.`,
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
          answer: `Eine **QR-Visitenkarte** ist Ihre **digitale Geschäftspräsenz**, die Kunden mit einem einfachen Scan erreichen können.

### 📱 So funktioniert es:

**1. Sie erstellen Ihre digitale Visitenkarte**
- Fügen Sie Ihre Geschäftsdaten hinzu
- Laden Sie Ihr Logo hoch
- Listen Sie Ihre Dienstleistungen auf
- Fügen Sie Kontaktinformationen hinzu

**2. Sie erhalten einen einzigartigen QR-Code**
- Jede Visitenkarte hat einen eindeutigen QR-Code
- Auch als direkter Link verfügbar
- Kann überall geteilt werden

**3. Kunden scannen Ihren Code**
- Mit jedem Smartphone (Kamera-App)
- Keine App-Installation erforderlich
- Funktioniert auf Android und iPhone

**4. Kunden sehen Ihr professionelles Profil**
- Alle Ihre Dienstleistungen
- Kontaktmöglichkeiten (Anruf, E-Mail, WhatsApp)
- Möglichkeit, direkt eine Anfrage zu senden

### ✨ Vorteile:
- ♻️ **Umweltfreundlich** - Keine gedruckten Visitenkarten mehr
- 🔄 **Immer aktuell** - Änderungen sind sofort sichtbar
- 📊 **Professionell** - Modernes Auftreten
- 💰 **Kosteneffizient** - Im Freemium-Plan enthalten`,
          tags: ['qr-code', 'visitenkarte', 'digital', 'erklärung'],
          category: 'visitenkarte'
        },
        {
          id: 'visitenkarte-erstellen',
          question: 'Wie erstelle ich meine digitale Visitenkarte?',
          answer: `Die Erstellung Ihrer QR-Visitenkarte ist **einfach und intuitiv**:

### 🎨 Schritt-für-Schritt:

**1. Gehen Sie zu "Meine Visitenkarte"**
- Nach der Anmeldung finden Sie den Menüpunkt im Dashboard
- Oder über das Hauptmenü zugänglich

**2. Füllen Sie Ihre Geschäftsinformationen aus:**
- 🏢 **Firmenname** - Ihr Handwerksbetrieb
- 📍 **Adresse** - Wo Sie tätig sind
- 📞 **Kontaktdaten** - Telefon, E-Mail, WhatsApp
- 🌐 **Website** - Falls vorhanden (optional)
- 📝 **Beschreibung** - Kurze Vorstellung Ihres Betriebs

**3. Fügen Sie visuelle Elemente hinzu:**
- 🖼️ **Logo hochladen** - Ihr Firmenlogo
- 📸 **Profilbild** - Ihr Foto oder Teambild (optional)
- 🎨 **Farbschema** - Passt zu Ihrer Marke

**4. Listen Sie Ihre Dienstleistungen auf:**
- ⚡ Wählen Sie aus vordefinierten Kategorien
- ➕ Oder erstellen Sie eigene Dienstleistungen
- 💰 Optional: Preise hinzufügen

**5. Vorschau & Veröffentlichen:**
- 👁️ Sehen Sie eine Vorschau Ihrer Visitenkarte
- ✅ Klicken Sie auf "Speichern & Veröffentlichen"
- 🎉 **Ihre QR-Visitenkarte ist live!**

### ⏱️ Zeitaufwand: 5-10 Minuten

**Tipp:** Sie können Ihre Visitenkarte jederzeit bearbeiten und aktualisieren!`,
          tags: ['erstellen', 'anleitung', 'visitenkarte', 'setup'],
          category: 'visitenkarte'
        },
        {
          id: 'visitenkarte-zugriff',
          question: 'Wie greifen Kunden auf meine Visitenkarte zu?',
          answer: `Kunden können auf **drei einfache Arten** auf Ihre digitale Visitenkarte zugreifen:

### 📱 Methode 1: QR-Code scannen
- Kunde öffnet die Kamera-App seines Smartphones
- Richtet die Kamera auf Ihren QR-Code
- Tippt auf die Benachrichtigung
- **Fertig** - Ihre Visitenkarte wird angezeigt

### 🔗 Methode 2: Direkter Link
- Jede Visitenkarte hat eine eindeutige URL
- Format: \`pro-meister.de/p/ihr-name\`
- Kann per SMS, WhatsApp, E-Mail geteilt werden
- Funktioniert auf jedem Gerät (Handy, Tablet, PC)

### 📧 Methode 3: In Ihrer E-Mail-Signatur
- QR-Code in Ihre E-Mail-Signatur einbetten
- Empfänger können den Code direkt scannen
- Professioneller Auftritt in jeder E-Mail

### ✅ Wichtig zu wissen:
- 🚫 **Kein Login erforderlich** - Kunden brauchen kein Konto
- 📱 **Keine App nötig** - Funktioniert im Browser
- 🌍 **Überall zugänglich** - Online 24/7 erreichbar
- 🔄 **Immer aktuell** - Änderungen sind sofort sichtbar

### 🎯 Perfekt für:
- Kundentermine vor Ort
- Messeauftritte
- Fahrzeugbeschriftung
- Werkstatteingang
- Flyer und Broschüren`,
          tags: ['zugriff', 'kunden', 'qr-code', 'link'],
          category: 'visitenkarte'
        },
        {
          id: 'visitenkarte-design',
          question: 'Kann ich das Design meiner Visitenkarte anpassen?',
          answer: `**Ja!** Sie können das Erscheinungsbild Ihrer digitalen Visitenkarte personalisieren:

### 🎨 Anpassungsmöglichkeiten:

**Visuelle Elemente:**
- 🖼️ **Firmenlogo** - Laden Sie Ihr Logo hoch (empfohlen)
- 📸 **Profilbild** - Ihr persönliches oder Teambild
- 🎨 **Farbschema** - Wählen Sie Farben, die zu Ihrer Marke passen
- 📐 **Layout** - Moderne, professionelle Vorlage

**Inhaltliche Anpassungen:**
- ✏️ **Firmenbeschreibung** - Stellen Sie Ihr Unternehmen vor
- 🛠️ **Dienstleistungen** - Wählen und ordnen Sie Ihre Services
- 📞 **Kontaktoptionen** - Telefon, E-Mail, WhatsApp, Website
- 📍 **Standort** - Zeigen Sie, wo Sie tätig sind

**Struktur:**
- 📋 **Reihenfolge der Elemente** - Organisieren Sie die Informationen
- 🔍 **Sichtbarkeit** - Wählen Sie, welche Infos angezeigt werden
- ⭐ **Hervorhebungen** - Betonen Sie wichtige Informationen

### 💡 Profi-Tipps:
- Verwenden Sie ein **hochwertiges Logo** (PNG mit transparentem Hintergrund)
- Wählen Sie **klare, professionelle Farben**
- Halten Sie die **Beschreibung kurz** und prägnant
- Fügen Sie **aussagekräftige Dienstleistungen** hinzu

### 🔄 Jederzeit änderbar:
Sie können Ihre Visitenkarte **jederzeit aktualisieren** - Änderungen sind sofort für alle sichtbar, die Ihren QR-Code scannen!`,
          tags: ['design', 'anpassung', 'personalisierung', 'branding'],
          category: 'visitenkarte'
        },
        {
          id: 'logo-bilder-hinzufuegen',
          question: 'Kann ich mein Logo und Bilder zur Visitenkarte hinzufügen?',
          answer: `**Ja, auf jeden Fall!** Visuelle Elemente machen Ihre Visitenkarte professioneller und einprägsamer:

### 🖼️ Was Sie hinzufügen können:

**1. Firmenlogo:**
- ✅ **Empfohlenes Format:** PNG mit transparentem Hintergrund
- ✅ **Alternative Formate:** JPG, SVG
- ✅ **Maximale Größe:** 5 MB
- ✅ **Empfohlene Auflösung:** Mindestens 500x500 Pixel
- 💡 **Tipp:** Hohe Qualität für scharfe Darstellung auf allen Geräten

**2. Profilbild:**
- 👤 Ihr persönliches Foto oder Teambild
- 📸 Professionelles Erscheinungsbild empfohlen
- 🎯 Schafft Vertrauen bei Kunden
- ⭕ Runde oder quadratische Darstellung

**3. Header-Bild (optional):**
- 🏗️ Zeigen Sie Ihre Arbeit
- 🎨 Werkstattfotos oder Projektbilder
- 📐 Breites Format für Banner

### 📤 So fügen Sie Bilder hinzu:

**Schritt 1:** Gehen Sie zu "Meine Visitenkarte"
**Schritt 2:** Klicken Sie auf "Logo hochladen" oder "Bild hinzufügen"
**Schritt 3:** Wählen Sie Ihre Datei vom Computer
**Schritt 4:** Optional: Zuschneiden und anpassen
**Schritt 5:** Speichern - **Fertig!**

### ⚡ Technische Details:
- ✅ **Unterstützte Formate:** PNG, JPG, JPEG, SVG
- ✅ **Maximale Dateigröße:** 5 MB pro Bild
- ✅ **Automatische Optimierung** für schnelles Laden
- ✅ **Responsive Darstellung** auf allen Geräten

### 💡 Best Practices:
- Verwenden Sie **hochauflösende** Bilder
- Achten Sie auf **gute Lichtverhältnisse** bei Fotos
- **Professionelle Aufnahmen** wirken vertrauenserweckender
- Logo sollte Ihre **Markenidentität** widerspiegeln`,
          tags: ['logo', 'bilder', 'upload', 'design', 'branding'],
          category: 'visitenkarte'
        },
        {
          id: 'visitenkarte-teilen',
          question: 'Wie kann ich meine digitale Visitenkarte mit Kunden teilen?',
          answer: `Pro-meister.de bietet Ihnen **mehrere Möglichkeiten**, Ihre QR-Visitenkarte zu teilen:

### 📱 1. Direkt vom Bildschirm:
- Zeigen Sie den QR-Code direkt auf Ihrem Handy/Tablet
- Kunde scannt den Code mit seiner Handy-Kamera
- **Sofortiger Zugriff** auf Ihre professionelle Visitenkarte

### 🖨️ 2. Gedruckte Materialien:
- Laden Sie den QR-Code als Bild herunter (PNG/SVG)
- Platzieren Sie ihn auf Flyern, Visitenkarten, Firmenfahrzeugen
- Fügen Sie ihn zu Rechnungen oder Angeboten hinzu

### 🔗 3. Link teilen:
- Jede QR-Visitenkarte hat einen eindeutigen Link
- Senden Sie den Link direkt per SMS, WhatsApp oder E-Mail
- Der Link funktioniert genauso wie der QR-Code

### ✉️ 4. E-Mail-Signatur:
- Fügen Sie den QR-Code zu Ihrer E-Mail-Signatur hinzu
- Alle, die Ihre Nachricht erhalten, können den Code scannen

### 🚗 5. Fahrzeugbeschriftung:
- QR-Code auf Ihrem Firmenfahrzeug anbringen
- Potenzielle Kunden können Sie unterwegs finden
- Großer QR-Code ist auch aus Entfernung scannbar

### 🏪 6. Geschäftsstandort:
- QR-Code am Eingang Ihrer Werkstatt
- Auf Schaufenstern oder Schaukästen
- Kunden können Infos auch außerhalb der Öffnungszeiten abrufen

### ✅ Wichtig:
**Kunden benötigen KEIN Konto** auf pro-meister.de, um Ihre Visitenkarte zu sehen!

### 💡 Profi-Tipp:
Kombinieren Sie mehrere Methoden für maximale Reichweite - QR-Code auf Visitenkarten UND Fahrzeug UND in der E-Mail-Signatur!`,
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
          answer: `Das Hinzufügen von Kunden ist **schnell und einfach**. Pro-meister.de ermöglicht es Ihnen, alle Kundendaten an einem Ort zu speichern.

### ➕ Kunden hinzufügen - ZWEI WEGE:

**WEG 1: Manuelles Hinzufügen**

**Schritt 1:** Gehen Sie zu **"Kunden"** im Hauptmenü  
**Schritt 2:** Klicken Sie auf **"Neuer Kunde"**  
**Schritt 3:** Füllen Sie die Grunddaten aus:
- 👤 **Name und Nachname** oder **Firmenname**
- 📧 **E-Mail-Adresse**
- 📞 **Telefon** (optional)
- 📍 **Adresse** (Straße, Stadt, Postleitzahl)
- 📝 **Notizen** - beliebige zusätzliche Informationen

**Schritt 4:** Klicken Sie auf **"Speichern"**

---

**WEG 2: Automatisch beim Erstellen einer Rechnung** ⚡

Wenn Sie eine **Rechnung** oder ein **Angebot** erstellen, speichert das System **automatisch** die Kundendaten in Ihrer Datenbank!

✅ **Vorteile:**
- Kunde wird automatisch zu "Meine Kunden" hinzugefügt
- Sie müssen Daten nicht zweimal eingeben
- Alle Rechnungen sofort mit dem Kunden verknüpft
- Schneller und effizienter!

---

### 💡 Profi-Tipps:
- ✅ Füllen Sie **alle Kontaktdaten** aus - einfacher für spätere Kontaktaufnahme
- ✅ Fügen Sie **Notizen** über Kundenpräferenzen hinzu
- ✅ **Erstellen Sie sofort eine Rechnung** - der Kunde wird automatisch gespeichert!

### 📊 Was Sie mit Kunden machen können:
- 📄 Rechnungen und Angebote erstellen
- 📜 Historie aller Rechnungen einsehen
- 📞 Schneller Zugriff auf Kontaktinformationen
- 🔍 Suche nach Name oder Firma

### ⚠️ Hinweis:
Die Kundenverwaltung ist nur im **PRO-Plan** verfügbar!`,
          tags: ['kunden', 'hinzufügen', 'verwaltung', 'neu'],
          category: 'kunden'
        },
        {
          id: 'kunden-suchen',
          question: 'Wie kann ich nach Kunden suchen?',
          answer: `Pro-meister.de verfügt über eine **leistungsstarke Suchfunktion**, mit der Sie jeden Kunden schnell finden können.

### 🔍 Kundensuche:

**Wo:** Im Bereich **"Kunden"** im Hauptmenü

**Was Sie durchsuchen können:**
- 👤 **Vor- und Nachname**
- 🏢 **Firmenname**
- 📧 **E-Mail-Adresse**
- 📞 **Telefon**
- 📍 **Stadt oder Adresse**

### ⚡ So funktioniert es:

**Schritt 1:** Gehen Sie zu **"Kunden"**  
**Schritt 2:** Geben Sie einen beliebigen Suchbegriff in das Suchfeld ein  
**Schritt 3:** Ergebnisse werden **automatisch gefiltert**, während Sie tippen  
**Schritt 4:** Klicken Sie auf den Kunden, um Details anzuzeigen

### 📊 Zusätzliche Optionen:

✅ **Schnellsuche** - Ergebnisse werden in Echtzeit angezeigt  
✅ **Sortierung** - Nach Name, Erstellungsdatum  
✅ **Filter** - Kundenliste filtern  

### 💡 Profi-Tipps:
- Es reicht, **einen Teil des Namens** einzugeben
- Sie können auch nach **Stadt** suchen, wenn Sie mehrere Kunden haben
- Das System erkennt auch **Teileingaben** (z.B. "Mül" für "Müller")

### 🎯 Was Sie nach dem Finden tun können:
- 📄 **Neue Rechnung erstellen** direkt für diesen Kunden
- ✏️ **Kontaktinformationen aktualisieren**
- 📞 **Kunde kontaktieren** (Telefon/E-Mail-Links)
- 📁 **Alle Dokumente einsehen** - gehen Sie zum **PDF Archiv**, um alle Rechnungen und Angebote für diesen Kunden zu sehen

### 📂 Für Dokumentenhistorie:
Alle Rechnungen und Angebote finden Sie im Bereich **"PDF Archiv"**, wo Sie nach Kunden filtern können.`,
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
          answer: `Die Erstellung von Rechnungen und Angeboten in pro-meister.de ist **einfach und professionell**. Das System generiert automatisch PDF-Dokumente nach dem **DIN 5008**-Standard.

### 📄 Rechnung/Angebot erstellen - Schritt für Schritt:

**Schritt 1:** Gehen Sie zu **"Rechnungen"** im Menü  
**Schritt 2:** Wählen Sie:
- 📄 **"+ Neue Rechnung"** (Neue Rechnung)
- 📋 **"+ Neues Angebot"** (Neues Angebot)

**Schritt 3:** Wählen oder geben Sie **Kundendaten** ein:
- 👤 Wählen Sie einen bestehenden Kunden aus der Liste
- ➕ Oder geben Sie neue Daten ein (wird automatisch in "Meine Kunden" gespeichert)

**Schritt 4:** Wählen Sie den **Kundentyp**:
- 🏢 **Mit MwSt. (19%)** - Standardrechnung mit Mehrwertsteuer
- 💼 **Kleinunternehmer (ohne MwSt.)** - Für Kleinunternehmer ohne Mehrwertsteuer

**Schritt 5:** Fügen Sie **Positionen** hinzu:
- 🔧 **Nutzen Sie "Meine Services"** - Schnelles Hinzufügen Ihrer Dienstleistungen mit einem Klick
- ➕ **Oder manuell eingeben**:
  - 📝 **Beschreibung der Dienstleistung/des Produkts**
  - 🔢 **Menge**
  - 💰 **Einzelpreis**
- 🧮 Das System **berechnet automatisch** den Gesamtbetrag

**Schritt 6:** Konfigurieren Sie **Optionen**:
- 📅 **Ausstellungsdatum**
- ⏰ **Zahlungsziel** - 14, 30 oder X Tage
- 🔢 **Nummer** - automatisch vom System generiert (Rechnungsnummer/Angebotsnummer)
- 📝 **Notiz** (optional)

**Schritt 7:** Klicken Sie auf **"Rechnung erstellen"** oder **"Angebot erstellen"**  
**Schritt 8:** **PDF wird automatisch generiert** und ist zum Download bereit!

### 🔧 Vorteil von "Meine Services":

Wenn Sie Ihre **Dienstleistungen** im Bereich **"Meine Services"** bereits erstellt haben, können Sie:
- ⚡ **Mit einem Klick hinzufügen** zur Rechnung/zum Angebot
- 💾 **Alles ist bereits ausgefüllt** - Name, Preis, Beschreibung
- 🚀 **10x schnellere Dokumentenerstellung**
- 🔄 **Konsistente Preise** - keine Tippfehler

### 💼 Kleinunternehmer-Option:

Wenn Sie ein **Kleinunternehmer** ohne Mehrwertsteuerpflicht sind:
- ✅ Wählen Sie die Option **"Kleinunternehmer (ohne MwSt.)"**
- 🚫 **Keine MwSt.-Berechnung** - nur Nettobetrag
- 📋 Fügt automatisch den **gesetzlichen Hinweis** zur Rechnung hinzu
- ✅ Gemäß **§19 UStG** Vorschriften

### ✨ Automatische Funktionen:

✅ **Automatische Nummerierung** - Jede Rechnung/jedes Angebot erhält eine eindeutige Nummer  
✅ **MwSt.-Berechnung** - Berechnet automatisch 19% MwSt. (oder ohne MwSt.)  
✅ **Summenberechnung** - Netto, MwSt. und Brutto automatisch  
✅ **ZUGFeRD PDF** - E-Rechnungsformat für digitale Verarbeitung  
✅ **Ihr Logo** - Wird automatisch hinzugefügt, wenn Sie es hochgeladen haben  

### 💡 Profi-Tipps:
- **Erstellen Sie "Meine Services" zuerst** - erleichtert die spätere Arbeit
- **Speichern Sie den Entwurf**, wenn noch nicht alles fertig ist
- Dokumente werden **automatisch archiviert** im PDF Archiv
- **Kunde wird automatisch hinzugefügt** zu "Meine Kunden"
- **Angebot kann in Rechnung umgewandelt werden**, wenn der Kunde zustimmt

### 📊 Unterschied zwischen Rechnung und Angebot:

**Rechnung (Faktura):**
- 💰 Für geleistete Arbeiten
- 📅 Mit Zahlungsziel
- 🔢 Hat eine Rechnungsnummer

**Angebot (Angebot):**
- 📋 Vor Arbeitsbeginn
- ⏰ Mit Gültigkeitsdauer
- 🔢 Hat eine Angebotsnummer

### ⚠️ Hinweis:
Die Erstellung von Rechnungen und Angeboten ist nur im **PRO-Plan** verfügbar!`,
          tags: ['rechnung', 'angebot', 'erstellen', 'pdf', 'mwst', 'kleinunternehmer'],
          category: 'rechnungen'
        },
        {
          id: 'zugferd-pdf',
          question: 'Was ist ZUGFeRD PDF und warum ist es wichtig?',
          answer: `**ZUGFeRD** ist ein **standardisiertes E-Rechnungsformat**, das ein PDF-Dokument mit strukturierten XML-Daten kombiniert.

### 📋 Was ist ZUGFeRD?

ZUGFeRD = **Z**entraler **U**ser **G**uide des **F**orums **e**lektronische **R**echnung **D**eutschland

**Ein ZUGFeRD PDF enthält:**
- 📄 **Klassisches PDF** - Lesbar und druckbar
- 💾 **XML-Daten** - Eingebettete strukturierte Daten
- 🔄 **Beides in einer Datei** - Keine separaten Dateien erforderlich

### ✨ Vorteile von ZUGFeRD-Rechnungen:

**Für Sie (als Aussteller):**
- ✅ **Schnellere Verarbeitung** - Automatische Buchung
- 💰 **Weniger Fehler** - Automatische Datenübertragung
- 📊 **Bessere Kontrolle** - Digitales Tracking
- 🌱 **Umweltfreundlich** - Papierfrei

**Für Ihre Kunden:**
- ⚡ **Automatische Buchung** - in ihr Buchhaltungssystem
- 🚫 **Keine manuelle Eingabe** - Daten werden automatisch ausgelesen
- 💼 **Professionell** - Entspricht modernen Standards
- 🔍 **Einfacheres Archiv** - Digitale Suche

### 💻 Kompatibilität mit Buchhaltungsprogrammen:

ZUGFeRD-Rechnungen von pro-meister.de sind **vollständig kompatibel** mit:

- ✅ **DATEV** - Führende Buchhaltungssoftware in Deutschland
- ✅ **Lexware**
- ✅ **SAP**
- ✅ **Microsoft Dynamics**
- ✅ **Sage**
- ✅ **Addison**
- ✅ Und allen anderen ZUGFeRD-kompatiblen Systemen

**Das bedeutet:**
- 📥 Buchhalter können Ihre Rechnung **direkt importieren**
- 🔄 **Automatische Übertragung** aller Daten (Betrag, Steuern, Datum)
- ⚡ **Keine manuelle Eingabe** - spart Zeit und Geld
- 🎯 **Weniger Fehler** - keine Tippfehler

### 🏢 Warum ist es wichtig für Handwerker?

**1. Gesetzliche Konformität:**
- 📜 Von deutschen Steuerbehörden anerkannt
- ✅ Entspricht GoBD-Vorschriften
- 🇪🇺 Europäischer Standard (EN 16931)

**2. Professionelles Auftreten:**
- 💼 Größere Unternehmen **verlangen** oft ZUGFeRD
- 🎯 Zeigt, dass Sie **technologisch fortschrittlich** sind
- ⚡ **Schnellere Zahlung** - einfachere Verarbeitung = schnellere Bezahlung

**3. Automatisierung:**
- Pro-meister.de **generiert automatisch** ZUGFeRD
- Kein zusätzlicher Aufwand für Sie
- Alle Ihre Rechnungen sind bereits im richtigen Format!

### 💡 Wie funktioniert es in pro-meister.de?

**Automatisch!** 🎉
- Jede Rechnung, die Sie erstellen, ist **ZUGFeRD-kompatibel**
- Sie müssen nichts Besonderes tun
- Das PDF sieht normal aus, enthält aber eingebettete XML-Daten
- Kunden mit modernen Buchhaltungssystemen (DATEV, Lexware usw.) können Daten automatisch einlesen

### 🔍 Wer nutzt ZUGFeRD?

- 🏢 **Große Unternehmen** - obligatorisch
- 🏛️ **Öffentliche Einrichtungen** - oft erforderlich
- 💼 **Buchhaltungsfirmen** - bevorzugt (besonders DATEV-Nutzer)
- 🏗️ **Bauunternehmen** - Standard

### ⚠️ Hinweis:
Alle im **PRO-Plan** erstellten Rechnungen sind automatisch im ZUGFeRD-Format - ohne zusätzliche Einstellungen!`,
          tags: ['zugferd', 'e-rechnung', 'pdf', 'datev', 'buchhaltung', 'xml'],
          category: 'rechnungen'
        },
        {
          id: 'rechnung-senden',
          question: 'Wie sende ich eine Rechnung an den Kunden?',
          answer: `Nach der Erstellung einer Rechnung ermöglicht Ihnen pro-meister.de das **schnelle Versenden direkt aus der Plattform**.

### 📧 Rechnung versenden:

**Direkt aus der Plattform:**

- 📄 Nach der Rechnungserstellung klicken Sie auf **"Per E-Mail senden"**
- ✉️ Geben Sie die E-Mail-Adresse des Kunden ein (oder automatisch ausgefüllt)
- 📎 Die PDF-Rechnung wird automatisch **als Anhang hinzugefügt**
- ✍️ Sie können eine **persönliche Nachricht** hinzufügen (optional)
- ✅ Klicken Sie auf **"Senden"** - **Fertig in wenigen Sekunden!**

### 📋 Was ist in der E-Mail enthalten?

Wenn Sie eine Rechnung direkt aus der Plattform versenden:

✅ **PDF-Anhang** - ZUGFeRD-Rechnung  
✅ **Professioneller E-Mail-Text** - Automatisch generiert  
✅ **Ihr Unternehmen** - In der E-Mail angezeigt  
✅ **Persönliche Nachricht** - Falls hinzugefügt (optional)  

### 🔄 Erneutes Versenden:

Wenn Sie eine Rechnung erneut versenden müssen:
- 📁 Gehen Sie zum **"PDF Archiv"**
- 🔍 Finden Sie die Rechnung
- 📧 Klicken Sie auf **"Per E-Mail senden"**
- ✅ Senden Sie erneut an denselben oder einen anderen Kunden

### 💾 PDF herunterladen:

Wenn Sie die Rechnung auf Ihren Computer herunterladen möchten:
- 📁 Gehen Sie zum **"PDF Archiv"**
- 🔍 Finden Sie Ihre Rechnung
- 💾 Klicken Sie auf **"PDF herunterladen"**
- 📥 Die Rechnung wird auf Ihren Computer heruntergeladen

Nach dem Download können Sie:
- 💬 Per WhatsApp versenden
- 📧 Über Ihren E-Mail-Client versenden
- 🖨️ Ausdrucken und persönlich übergeben

### 💡 Warum direkt versenden?

⚡ **Schnell** - Rechnung kommt in Sekunden an  
📊 **Aufzeichnung** - Sie sehen, wann die E-Mail gesendet wurde  
✅ **Professionell** - Automatisch formatierte E-Mail  
🔄 **Einfach** - Alles an einem Ort  

### 🔍 Verfolgung:

Nach dem E-Mail-Versand können Sie im PDF Archiv sehen:
- ✅ **Versanddatum**
- 📧 **E-Mail-Adresse** des Empfängers
- 🔄 Möglichkeit zum **erneuten Versenden**

### ⚠️ Hinweis:
- Alle Rechnungen werden **automatisch im PDF Archiv gespeichert**
- Sie können sie **jederzeit später versenden**
- E-Mail-Versand ist **im PRO-Plan enthalten** - ohne zusätzliche Kosten`,
          tags: ['rechnung', 'versenden', 'email', 'pdf', 'download'],
          category: 'rechnungen'
        },
        {
          id: 'din-5008-standard',
          question: 'Was ist der DIN 5008-Standard?',
          answer: `**DIN 5008** ist ein **deutscher Standard** für die Formatierung von Geschäftsdokumenten und Briefen, der ein professionelles und erkennbares Erscheinungsbild gewährleistet.

### 📋 Was ist DIN 5008?

DIN 5008 definiert:
- 📏 **Anordnung der Elemente** im Dokument
- 📝 **Textformatierung** und Überschriften
- 📍 **Positionen von Adressen** und Kontaktdaten
- 🔢 **Nummerierung** und Datumsangaben
- 📄 **Struktur** von Geschäftsbriefen und Rechnungen

### ✨ Warum ist DIN 5008 wichtig?

**1. Professionalität:**
- ✅ **Anerkannter Standard** in Deutschland
- 💼 Von Geschäftspartnern erwartet
- 🎯 Zeigt **Seriosität** Ihres Unternehmens

**2. Klarheit:**
- 👁️ **Leicht lesbar** - standardisierte Struktur
- 📍 Alle **Informationen an erwarteten Stellen**
- 🔍 Schnelles Auffinden wichtiger Daten

**3. Automatische Verarbeitung:**
- 🤖 Kompatibel mit Scan- und OCR-Technologie
- 💾 Einfachere **digitale Archivierung**
- 📊 Vereinfachte **Integration** mit Systemen

**4. Praktikabilität:**
- ✉️ **Bereit für Fensterbriefumschläge** - Kundenadresse genau an der richtigen Stelle
- 📮 **Direktes Drucken** und Versenden per Post ohne zusätzlichen Aufwand

### 📄 Was definiert DIN 5008 auf einer Rechnung?

**Positionierung:**
- 📮 **Ihre Adresse** - Obere linke Ecke
- 📬 **Kundenadresse** - Standardposition für Fensterbriefumschlag (sichtbar durch Fenster!)
- 📅 **Datum und Rechnungsnummer** - Rechte Seite
- 🏢 **Logo** - Oberer Bereich des Dokuments

**Inhaltsstruktur:**
- 📋 **Kopfzeile** - Firmenname und Kontaktdaten
- 📊 **Positionstabelle** - Übersichtlich organisiert
- 🧮 **Beträge** - Netto, MwSt., Brutto präzise ausgerichtet
- 📝 **Rechtliche Hinweise** - Am Ende der Rechnung

**Formatierung:**
- 🔤 **Schriftart und Größe** - Lesbar und professionell
- 📏 **Ränder** - Standardisiert
- ↔️ **Abstände** - Einheitlich

### 💡 Wie nutzt pro-meister.de DIN 5008?

**Automatisch!** 🎉
- ✅ Alle Rechnungen und Angebote **automatisch nach DIN 5008 formatiert**
- 📐 **Sie müssen nichts einstellen** - ist bereits korrekt
- 🎨 **Professionelles Erscheinungsbild** garantiert
- ✉️ **Perfekt für Fensterbriefumschläge** - einfach ausdrucken, falten und eintüten!

### 🏢 Vorteile für Ihr Geschäft:

**Für Sie:**
- 💼 Professionelles Image
- ⚡ Schnellere Zahlung - Kunden erkennen Qualität
- 🎯 Entspricht deutschen Standards
- 📮 **Schneller Postversand** - einfach falten und in Fensterbriefumschlag

**Für Ihre Kunden:**
- 👁️ Leicht lesbare Rechnungen
- 🔍 Schnelles Auffinden von Informationen
- ✅ Sicherheit, dass alles korrekt ist

### 💡 Praktischer Tipp:

Wenn Sie eine Rechnung per Post versenden möchten:
1. 🖨️ Drucken Sie das PDF aus dem **"PDF Archiv"**
2. 📄 Falten Sie das Papier im Standardformat (DIN-Format)
3. ✉️ Legen Sie es in einen **Fensterbriefumschlag** (DIN lang C6/5 oder DL)
4. 👁️ **Die Kundenadresse ist automatisch sichtbar** durch das Fenster!
5. 📮 Versandbereit - ohne Adressaufkleber aufzukleben!

### ⚠️ Hinweis:
Pro-meister.de **generiert automatisch** alle Dokumente nach DIN 5008-Standard - ohne zusätzliche Einstellungen oder Kenntnisse erforderlich!`,
          tags: ['din-5008', 'standard', 'formatierung', 'professionell', 'brief'],
          category: 'rechnungen'
        },
        {
          id: 'rechnungsnummerierung',
          question: 'Wie werden Rechnungen und Angebote nummeriert?',
          answer: `Pro-meister.de **nummeriert automatisch** alle Rechnungen und Angebote gemäß gesetzlichen Vorschriften und Best Practices.

### 🔢 Automatische Nummerierung:

**Für Rechnungen:**
- 📄 Format: **RE-2025-0001**, **RE-2025-0002**, usw.
- 🔄 **Fortlaufende Reihenfolge** - ohne Nummernlücken
- 📅 **Jahr enthalten** - einfacheres Archivieren
- ✅ **Eindeutige Nummern** - jede Rechnung hat ihre Nummer

**Für Angebote:**
- 📋 Format: **AN-2025-0001**, **AN-2025-0002**, usw.
- 🔄 **Getrennt von Rechnungen** - separate Nummerierung
- 📅 **Jahr enthalten** - klare Organisation
- ✅ **Eindeutige Nummern** - jedes Angebot hat seine Nummer

### 🎯 Ersteinrichtung - Startnummer festlegen:

**Beim Erstellen Ihrer ersten Rechnung oder Ihres ersten Angebots:**

Das System fragt Sie **automatisch** nach den Startnummern:

📋 **Einrichtungsdialog:**
- 📄 **Nächste Rechnungsnummer** (Nächste Rechnungsnummer)
- 📋 **Nächste Angebotsnummer** (Nächste Angebotsnummer)

**Zwei Szenarien:**

**1. Neues Geschäft - von null beginnen:**
- ✅ Lassen Sie **leer** oder geben Sie **1** ein
- 📄 Erste Rechnung: **RE-2025-0001**
- 📋 Erstes Angebot: **AN-2025-0001**

**2. Bestehendes Geschäft - Wechsel von anderem System:**
- 📊 Geben Sie die **Nummer ein, ab der Sie starten möchten** (z.B. 151, wenn die letzte 150 war)
- ✅ Das System **beginnt ab dieser Nummer**
- 🔗 **Kontinuität der Nummerierung** bleibt erhalten!

**Beispiel:**
\`\`\`
Ihre letzte Rechnung im alten System: 2025-0150
→ Geben Sie in pro-meister.de ein: 151
→ Erste Rechnung in pro-meister.de: RE-2025-0151
\`\`\`

### 🔄 NEUSTART - Komplettes System-Reset:

**Wenn Sie sich während der Testphase "ausgespielt" haben:**

🎮 **Problem:** Sie haben Test-Rechnungen, -Angebote, PDF-Dokumente erstellt...  
✅ **Lösung:** Nutzen Sie die **"NEUSTART"**-Funktion!

**Was ist NEUSTART?**
- 🔄 **Komplettes System-Reset**
- 🗑️ **Löscht ALLES aus der Testphase:**
  - ❌ Alle Test-Angebote
  - ❌ Alle Test-Rechnungen
  - ❌ Alle PDF-Dateien
- 💡 **Beginnen Sie von vorne** - wie ein neuer Benutzer
- 🔢 **Nummerierung beginnt ab der Nummer, die SIE eingeben**

**So verwenden Sie NEUSTART:**

1. 📍 Klicken Sie oben rechts auf die Schaltfläche **"Neustart (3)"**
2. ⚠️ System zeigt Warnung:
   - 🗑️ **"Komplettes Resetieren des Systems"**
   - ❌ **"Löscht ALLES aus der Testphase"**
   - Listet alles auf, was gelöscht wird (Angebote, Rechnungen, PDFs)
3. 💡 **"Beginnen Sie von vorne - wie ein neuer Benutzer"**
4. 🔢 **"Nummerierung beginnt ab 001"** (oder ab der Nummer, die Sie eingeben)

**Nummerierung bei NEUSTART konfigurieren:**
- 📝 Sie können **die gewünschte Startnummer eingeben**
- 💡 Oder **leer lassen** für automatische Nummer 001
- ✅ **Nummerierung beginnt ab dieser Nummer**

**Löschung bestätigen:**
- ⚡ Geben Sie **"LÖSCHEN"** zur Bestätigung ein
- ✅ Klicken Sie auf **"Bestätigen"** - System wird zurückgesetzt!

**Nach NEUSTART:**
- 🎊 **Sauberes System** - ohne Testdaten
- 📄 Nächste Rechnung: **RE-2025-XXXX** (Nummer, die Sie festgelegt haben)
- 📋 Nächstes Angebot: **AN-2025-XXXX** (Nummer, die Sie festgelegt haben)
- ✨ **Bereit für echte Kunden!**

### ✨ Wie funktioniert es nach der Einrichtung?

**Vollautomatisch:**
1. 📄 Sie erstellen eine neue Rechnung oder ein Angebot
2. 🔢 System **weist automatisch die nächste Nummer** zu
3. ✅ Nummer wird **sofort angezeigt** im Dokument
4. 💾 Nummer wird **dauerhaft gespeichert** - kann nach Erstellung nicht geändert werden

### 📊 Warum ist das wichtig?

**1. Gesetzliche Konformität:**
- ✅ **Erfüllt deutsche gesetzliche Anforderungen** (§14 UStG)
- 📜 Steuervorschriften erfordern **fortlaufende Nummerierung**
- 🔍 **Prüfung** - leicht nachvollziehbar

**2. Kontinuität:**
- 🔗 **Setzen Sie Ihre bestehende Nummerierung fort**
- 📂 **Keine Lücken** in den Nummern
- 📊 **Einfacher Wechsel** von anderen Systemen

**3. Flexibilität:**
- ⚙️ **Sie entscheiden**, ab welcher Nummer begonnen wird
- 🔄 **NEUSTART für Testphasen** - schnell und einfach
- ✅ **Professionell** ab der ersten echten Rechnung

### 🔐 Nummerierungssicherheit:

- 🚫 **Sie können keine Nummern überspringen** nach der Einrichtung
- 🚫 **Sie können dieselbe Nummer nicht zweimal verwenden** - System verhindert dies
- 🚫 **Sie können die Nummer nicht ändern** nach Rechnungserstellung
- ✅ **100% gesetzeskonform**

### 📅 Neues Jahr - neue Nummerierung:

- 🎊 **Automatischer Reset** zu Jahresbeginn
- 🔢 Beginnt bei **RE-2026-0001**, **AN-2026-0001**
- 📊 **Einfachere Jahresberichterstattung**
- 🗂️ **Bessere Archivorganisation**

### 💡 Praktische Beispiele:

**Szenario 1 - Neuer Benutzer:**
- 📝 Bei erster Rechnung fragt System: "Nächste Rechnungsnummer?"
- ✍️ Leer lassen oder eingeben: **1**
- 📄 Erste Rechnung: **RE-2025-0001**
- 📄 Zweite Rechnung: **RE-2025-0002** (automatisch)

**Szenario 2 - Wechsel von anderem System:**
- 📝 Bei erster Rechnung fragt System: "Nächste Rechnungsnummer?"
- ✍️ Sie geben ein: **151** (weil die letzte 150 war)
- 📄 Erste Rechnung in pro-meister.de: **RE-2025-0151**
- 📄 Nächste: **RE-2025-0152** (automatisch)

**Szenario 3 - NEUSTART nach Test:**
- 🎮 Während Trial erstellt: RE-2025-0001 bis 0005, AN-2025-0001 bis 0003
- 🔄 Klicken Sie auf **"Neustart"**-Schaltfläche
- 🗑️ System löscht ALLE Testdaten
- 📝 Geben Sie **1** ein (oder leer lassen)
- 📄 Erste echte Rechnung: **RE-2025-0001** (beginnt ab eingegebener Nummer)

**Szenario 4 - NEUSTART mit angepasster Nummer:**
- 🎮 Während Trial System getestet
- 🔄 Klicken Sie auf **"Neustart"**
- 📝 Geben Sie **100** als Startnummer ein
- 📄 Erste echte Rechnung: **RE-2025-0100**
- 📄 Nächste: **RE-2025-0101** (automatisch)

### ⚠️ Wichtige Hinweise:
- ⚡ **System fragt automatisch** beim Erstellen der ersten Rechnung/des ersten Angebots
- 🎯 **Bereiten Sie sich vor** - wissen Sie, welche Nummer Sie verwenden möchten
- 🔒 **Einmal eingerichtet** - läuft danach automatisch weiter
- 🔄 **NEUSTART löscht ALLES** aus der Testphase
- 💡 **NEUSTART - Nummerierung ab der Nummer, die Sie eingeben**
- ⚠️ **NEUSTART ist dauerhaft** - kann nicht rückgängig gemacht werden!`,
          tags: ['nummerierung', 'rechnungsnummer', 'angebotsnummer', 'automatisch', 'neustart'],
          category: 'rechnungen'
        },
        {
          id: 'pdf-archiv',
          question: 'Wie archiviere ich Rechnungen und wo finde ich sie?',
          answer: `Pro-meister.de **archiviert automatisch** alle Ihre Rechnungen und Angebote im **PDF Archiv**. Sie müssen Dokumente nicht manuell speichern!

### 📁 Automatische Archivierung:

**Was automatisch gespeichert wird:**
- 📄 **Alle Rechnungen** - sofort nach Erstellung
- 📋 **Alle Angebote** - sofort nach Erstellung
- 💾 **PDF-Version** - mit ZUGFeRD-Format
- 📅 **Metadaten** - Datum, Kunde, Betrag, Status

**Wo archivierte Dokumente sind:**
- 📂 Gehen Sie zu **"PDF Archiv"** im Hauptmenü
- 👁️ Sehen Sie **alle Ihre Dokumente** an einem Ort
- 🔍 **Suche und Filter** verfügbar

### 🔍 Suche und Filter im PDF Archiv:

**Zeitfilter:**
- 📅 **Diesen Monat** (thisMonth)
- 📅 **Letzten Monat** (lastMonth)
- 🗓️ **Benutzerdefinierter Zeitraum** - Wählen Sie bestimmten Monat und Jahr

**Weitere Filter:**
- 📄 **Dokumenttyp** - Nur Rechnungen oder nur Angebote
- 👤 **Nach Kunde** - Finden Sie alle Dokumente für einen bestimmten Kunden

**Suche:**
- 🔢 **Rechnungs-/Angebotsnummer** - Suchen nach Nummer (z.B. RE-2025-0050)
- 👤 **Kundenname** - Suche nach Name
- 💰 **Betrag** - Sortieren nach Betrag

**Sortierung:**
- 📅 **Nach Datum** - Neueste oder älteste zuerst
- 💰 **Nach Betrag** - Vom höchsten zum niedrigsten
- 🔢 **Nach Nummer** - Numerisch

### 📥 Was Sie im PDF Archiv tun können:

**Für jede Rechnung/jedes Angebot:**
- 👁️ **Vorschau** - PDF im Browser ansehen
- 💾 **Herunterladen** - PDF auf Computer speichern
- 📧 **Per E-Mail senden** - Direkt an Kunde senden
- 🖨️ **Drucken** - Direkt aus dem Browser
- 📊 **Details** - Alle Informationen anzeigen (Kunde, Positionen, Betrag)

**Gruppenaktionen:**
- ✅ **Mehrere Dokumente auswählen** - Mehrere Rechnungen markieren
- 📧 **Massenversand** - Mehrere Rechnungen auf einmal senden
- 💾 **Einzelner Download** - Ein PDF nach dem anderen

### 📊 Statistiken im PDF Archiv:

**Übersicht oben:**
- 🔢 **Gesamtzahl der Rechnungen** - Für gewählten Zeitraum
- 💰 **Gesamtbetrag der Rechnungen** - Summe aller Rechnungen
- 📋 **Anzahl der Angebote** - Wie viele erstellt wurden
- 📈 **Status** - Bezahlt, Unbezahlt, Ausstehend

### 💼 Spezialfunktionen für Buchhalter:

**Bookkeeper E-Mail:**
- 📧 Sie können die **E-Mail Ihres Buchhalters** einrichten
- 📤 **Massenversand** ausgewählter Rechnungen
- 📨 **Automatische Aufteilung** - System sendet intelligent in mehreren E-Mails, wenn nötig
- ✅ Buchhalter erhält alle Rechnungen für die Buchhaltung

**Wie einrichten:**
1. Gehen Sie zum **"PDF Archiv"**
2. Klicken Sie auf **"Bookkeeper Settings"**
3. Geben Sie **E-Mail des Buchhalters** und Name ein
4. ✅ Speichern

**Verwendung:**
- 📅 **Zeitraum filtern** (z.B. "Diesen Monat" oder "Letzten Monat")
- ✅ **Rechnungen auswählen**, die Sie senden möchten
- 📧 Klicken Sie auf **"Send to Bookkeeper"**
- ⚡ Rechnungen werden gesendet (System teilt automatisch in mehrere E-Mails auf, wenn viele)
- 💼 Buchhalter hat alles für die Buchhaltung!

### 🔐 Archiv-Sicherheit:

- 🔒 **Verschlüsselte Speicherung** - Ihre Dokumente sind sicher
- 💾 **Backup-System** - Automatisches Backup
- ⏰ **Dauerhafte Speicherung** - Dokumente werden gespeichert, solange Sie ein Konto haben
- 🚫 **Niemand sonst sieht sie** - Nur Sie und Ihr Team

### 📅 Langzeitarchiv:

- 📜 **Gesetzliche Anforderung** - Rechnungen 10 Jahre aufbewahren (deutsches Gesetz)
- ✅ **Pro-meister.de speichert alles** - Solange Sie den PRO-Plan haben
- 💾 **Empfehlung** - Regelmäßig Backup erstellen (wichtige herunterladen)
- 📂 **Export-Option** - Sie können PDFs einzeln herunterladen

### 💡 Praktische Tipps:

- 📧 **Sofort senden** - Nutzen Sie direktes Senden aus der Plattform
- 📁 **Nach Monaten organisieren** - Nutzen Sie Filter "Diesen Monat" / "Letzten Monat"
- 💼 **Monatlich an Buchhalter senden** - Wählen Sie Rechnungen für einen Monat aus und senden
- 💾 **Backup wichtiger Rechnungen** - Regelmäßig auf Computer herunterladen
- 🔄 **Keine Sorge über Anzahl** - System optimiert E-Mail-Versand automatisch

### ⚠️ Hinweis:
- **PDF Archiv ist nur im PRO-Plan verfügbar**
- Alle Dokumente werden **automatisch archiviert** - Sie vergessen nichts
- **Rechnungen können nicht gelöscht werden** aus dem Archiv (gesetzliche Anforderung)
- **Filter sind optimiert** für beste Performance`,
          tags: ['pdf', 'archiv', 'speichern', 'dokumente', 'buchhalter'],
          category: 'rechnungen'
        },
        {
          id: 'angebot-zu-rechnung',
          question: 'Kann ich ein Angebot in eine Rechnung umwandeln?',
          answer: `**Ja!** Wenn der Kunde Ihr Angebot akzeptiert, können Sie es **schnell in eine Rechnung umwandeln** mit einem Klick.

### 🔄 So funktioniert die Konvertierung:

**Schritt 1:** Gehen Sie zum **"PDF Archiv"**  
**Schritt 2:** Finden Sie das **Angebot**, das Sie konvertieren möchten  
**Schritt 3:** Klicken Sie auf **"In Rechnung umwandeln"** (In Rechnung konvertieren)  
**Schritt 4:** System macht automatisch:
- 📋 Kopiert **alle Positionen** aus dem Angebot
- 👤 Überträgt **Kundendaten**
- 💰 Behält **Preise und Beträge** bei
- 📅 Setzt **neues Datum** (heute)
- 🔢 Weist **neue Rechnungsnummer** zu (automatisch)

**Schritt 5:** Überprüfen und **anpassen**, falls nötig  
**Schritt 6:** Klicken Sie auf **"Rechnung erstellen"** - Fertig!

### ✨ Vorteile der Konvertierung:

**Schneller und einfacher:**
- ⚡ **Keine erneute Eingabe** - Alles wird automatisch kopiert
- 🚫 **Keine Fehler** - Daten sind identisch mit dem Angebot
- 💾 **Zeitersparnis** - 1 Klick statt 10 Minuten
- ✅ **Konsistenz** - Angebot und Rechnung haben dieselben Positionen

**Automatische Änderungen:**
- 🔢 **Neue Nummer** - Erhält Rechnungsnummer (RE-...) statt Angebotsnummer (AN-...)
- 📄 **Dokumenttyp** - Ändert sich von "Angebot" zu "Rechnung"
- 📅 **Datum** - Wird auf heutiges Datum gesetzt
- ⏰ **Zahlungsziel** - Fügt Zahlungsziel hinzu (z.B. 14/30 Tage)

### 📝 Was Sie ändern können:

Vor Finalisierung der Rechnung können Sie:
- ✏️ **Positionen hinzufügen/entfernen** - Falls nötig
- 💰 **Preise ändern** - Wenn Rabatt vereinbart wurde
- 📅 **Datum anpassen** - Falls erforderlich
- ⏰ **Zahlungsziel ändern** - Gemäß Vereinbarung
- 📝 **Notiz hinzufügen** - Zusätzliche Informationen

### 💼 Praktisches Szenario:

**1. Sie senden ein Angebot:**
- 📋 Sie erstellen **Angebot** (AN-2025-0010)
- 📧 Sie senden es an den Kunden
- ⏰ Kunde überlegt

**2. Kunde akzeptiert:**
- ✅ Kunde sagt "OK, ich akzeptiere!"
- 🔄 Sie konvertieren Angebot in Rechnung
- 📄 Automatisch wird **Rechnung** erstellt (RE-2025-0055)

**3. Sie senden die Rechnung:**
- 📧 Sie senden sofort die Rechnung an den Kunden
- 💰 Mit Zahlungsziel
- ✅ Arbeit schnell und professionell erledigt!

### 🔗 Verbindung zwischen Angebot und Rechnung:

**Verknüpfung:**
- 📎 Rechnung **merkt sich**, dass sie aus Angebot erstellt wurde
- 🔍 Sie können **ursprüngliches Angebot** von der Rechnung aus sehen
- 📊 **Statistik** - Welche Angebote wurden angenommen

**Angebotsstatus:**
- ✅ Nach Konvertierung wird Angebot **als angenommen markiert**
- 📋 Bleibt weiterhin im Archiv
- 🔗 **Link** zur erstellten Rechnung

### 💡 Praktische Tipps:

- 📋 **Erstellen Sie immer zuerst ein Angebot** - Für größere Projekte
- ✅ **Warten Sie auf Bestätigung** vor Konvertierung
- 🔄 **Schnelle Konvertierung** - Kunden schätzen Schnelligkeit
- 📧 **Sofort senden** nach Konvertierung
- 💾 **Beide bleiben im Archiv** - Angebot und Rechnung

### ⚠️ Hinweis:
- **Ursprüngliches Angebot bleibt unverändert** im Archiv
- Konvertierung **erstellt neue Rechnung** - ändert Angebot nicht
- Sie können **dasselbe Angebot mehrmals konvertieren**, falls nötig (z.B. für Projektphasen)`,
          tags: ['angebot', 'rechnung', 'konvertierung', 'umwandeln'],
          category: 'rechnungen'
        },
        {
          id: 'logo-hinzufuegen',
          question: 'Kann ich mein eigenes Logo auf Rechnungen hinzufügen?',
          answer: `**Ja!** Sie können **Ihr Logo** hinzufügen, das automatisch auf allen Rechnungen und Angeboten angezeigt wird.

### 🖼️ So fügen Sie ein Logo hinzu:

**Schritt 1:** Gehen Sie zu **"Einstellungen"**  
**Schritt 2:** Finden Sie den Bereich **"Geschäftslogo"** oder **"Rechnungslogo"**  
**Schritt 3:** Klicken Sie auf **"Logo hochladen"**  
**Schritt 4:** Wählen Sie die Datei von Ihrem Computer  
**Schritt 5:** Speichern - Logo ist sofort aktiv!

### 📐 Technische Anforderungen für Logo:

**Unterstützte Formate:**
- ✅ **PNG** (empfohlen - mit transparentem Hintergrund)
- ✅ **JPG/JPEG**
- ✅ **SVG** (Vektorformat)

**Dateigröße:**
- 📦 **Maximal 5 MB**
- 💡 Empfehlung: **500 KB - 1 MB** für beste Performance

**Abmessungen:**
- 📏 **Empfohlen:** Mindestens 500x500 Pixel
- 🎯 **Optimal:** 1000x1000 Pixel oder höhere Auflösung
- 📐 **Seitenverhältnis:** Logo wird automatisch skaliert

### ✨ Wo das Logo angezeigt wird:

**Automatisch auf allen Dokumenten:**
- 📄 **Rechnungen**
- 📋 **Angebote**
- 📱 **QR-Visitenkarte** - Wenn dasselbe Logo
- 📧 **PDF-Dokumente** - Zum Drucken und Versenden

**Position im Dokument:**
- 📍 **Oberer Bereich der Rechnung** - Gemäß DIN 5008-Standard
- 🎨 **Professionell positioniert** - Automatisch
- 📐 **Passende Größe** - System passt automatisch an

### 💡 Best Practices für Logo:

**Qualität:**
- ✅ **Hohe Auflösung** - Für scharfe Darstellung
- ✅ **Transparenter Hintergrund** (PNG) - Sieht professioneller aus
- ✅ **Lesbar in kleiner Größe** - Logo wird skaliert

**Design:**
- 🎨 **Einfach und sauber** - Leichter erkennbar
- 📏 **Quadratisches oder rechteckiges Format** - Passt sich am besten an
- 🖤 **Guter Kontrast** - Muss auf weißem Hintergrund sichtbar sein

**Datei:**
- 💾 **Optimierte Datei** - Kleinere Größe, bessere Performance
- 🔤 **Keine Sonderzeichen** im Dateinamen
- 📁 **Name:** z.B. "firma-logo.png"

### 🔄 Logo ändern oder entfernen:

**Logo aktualisieren:**
- ✏️ Gehen Sie zu **"Einstellungen"**
- 📤 **Neues Logo hochladen** - Ersetzt das alte
- ✅ Neues Logo wird **sofort angewendet** auf alle zukünftigen Dokumente

**Logo entfernen:**
- 🗑️ Option **"Logo entfernen"** in den Einstellungen
- 📄 Rechnungen werden **ohne Logo** sein (nur Text)

### ⚠️ Wichtige Hinweise:

**Bestehende Dokumente:**
- 📜 **Alte Dokumente bleiben unverändert** - Logo, das zum Zeitpunkt der Erstellung vorhanden war
- 🆕 **Neue Dokumente** verwenden neues/aktualisiertes Logo
- 💾 PDF-Dokumente im Archiv **ändern sich nicht**

**Performance:**
- ⚡ **Ein Logo für alles** - Einmal hochladen, überall verwenden
- 🚀 **Schnelles Laden** - Optimiert
- 📊 **Keine Begrenzung** der Dokumentenanzahl mit Logo

### 💼 Professionelles Image:

**Vorteile von Logo auf Rechnungen:**
- 🎯 **Wiedererkennbarkeit** - Stärkt Ihre Marke
- 💼 **Professionalität** - Seriöser Auftritt gegenüber Kunden
- ✅ **Glaubwürdigkeit** - Kunden sehen organisiertes Unternehmen
- 📈 **Marketing** - Jede Rechnung ist Werbung`,
          tags: ['logo', 'branding', 'design', 'einstellungen'],
          category: 'rechnungen'
        },
        {
          id: 'freemium-downgrade',
          question: 'Was passiert mit meinen Rechnungen, wenn ich den PRO-Plan kündige?',
          answer: `Wenn Sie den **PRO-Plan** kündigen und zu **Freemium** wechseln, **können Sie KEINE neuen Rechnungen erstellen**, behalten aber **Zugriff auf alle alten Dokumente**.

### 📊 Was passiert nach der Kündigung:

**❌ Funktionen, die Sie VERLIEREN:**
- 🚫 **Keine neuen Rechnungen erstellen**
- 🚫 **Keine neuen Angebote erstellen**
- 🚫 **Keine Kundenliste einsehen** (kein Zugriff auf "Meine Kunden")
- 🚫 **Keine neuen Kunden hinzufügen**

**✅ Was VERFÜGBAR bleibt:**
- ✅ **PDF Archiv** - **VOLLSTÄNDIGER ZUGRIFF** auf alle alten Rechnungen und Angebote
- ✅ **PDFs herunterladen** - Sie können alle Dokumente herunterladen
- ✅ **Rechnungen ansehen** - Alle alten Dokumente lesen
- ✅ **Kundendaten IN Rechnungen** - In PDFs sichtbar
- ✅ **QR-Visitenkarte** - Funktioniert weiterhin
- ✅ **Anfragen empfangen** - Kunden können Sie kontaktieren

### 💾 Ihre Daten sind über PDF Archiv ZUGÄNGLICH:

**Zugriff auf alte Dokumente:**
- 👁️ **Alle Rechnungen ansehen** - Im PDF Archiv
- 💾 **Alle PDFs herunterladen** - Ohne Einschränkungen
- 📧 **Alte Rechnungen per E-Mail senden** (erneut)
- 📊 **Historie einsehen** - Alle vorherigen Rechnungen
- 🔍 **Archiv durchsuchen** - Alle Filter funktionieren
- 👤 **Kundendaten in PDFs sichtbar** - Aber nicht in der Liste

**Was Sie NICHT können:**
- 🚫 **NEUE Rechnungen erstellen**
- 🚫 **NEUE Angebote erstellen**
- 🚫 **"Meine Kunden" aufrufen** - Kundenliste nicht verfügbar
- 🚫 **NEUE Kunden hinzufügen**
- 🚫 **Bestehende Dokumente ändern**

### 🔄 PRO-Plan reaktivieren:

**Wenn Sie PRO wieder aktivieren:**
- ✅ **Alle Funktionen kehren zurück** - Sofort
- 📄 **Neue Rechnungen erstellen** - Sofort
- 👥 **Zugriff auf alle Kunden** - Alles wiederhergestellt
- 🔢 **Nummerierung setzt fort** - Automatisch ab letzter Nummer

**Beispiel:**
\`\`\`
Vor Kündigung: Letzte Rechnung RE-2025-0100
↓
3 Monate Freemium (nur PDF Archiv lesen)
↓
PRO-Plan reaktiviert
↓
Nächste Rechnung: RE-2025-0101 (setzt automatisch fort)
\`\`\`

### 💡 Vorteile des Freemium-Zugriffs auf Archiv:

**Warum wir Zugriff auf PDF Archiv ermöglichen:**
- 📜 **Gesetzliche Anforderung** - Sie müssen Rechnungen 10 Jahre aufbewahren
- 🔍 **Referenz** - Sie können alte Daten nachschlagen
- 💾 **Download** - Backup, wenn Sie es brauchen
- 💼 **Professionalität** - Ihre Dokumente sind immer verfügbar
- 🚫 **Keine Sorgen** - Sie verlieren nie Zugriff auf wichtige Dokumente

**Praktische Nutzung:**
- 📧 Sie können **alte Rechnung** an Kunden senden, wenn gewünscht
- 💾 Sie können **alles herunterladen** für Buchhaltung
- 👁️ Sie können **überprüfen**, was Sie in Rechnung gestellt haben
- 📊 Sie können **Geschäftshistorie** einsehen

### 👥 Zugriff auf Kundendaten:

**Im Freemium-Plan:**
- ❌ **Kein Zugriff auf "Meine Kunden"**-Seite
- ✅ **Aber Sie können Kunden IN Rechnungen sehen** - Alle Daten in PDFs
- 💾 **Rechnungen herunterladen** - Sie haben alle Daten offline
- 📊 **Vollständige Historie** - Wer, was, wann

**Bei PRO-Reaktivierung:**
- ✅ **Kundenliste kehrt zurück** - Alle Kunden unberührt
- 👥 **Sie können alles sehen** - Vollständige Datenbank
- ➕ **Sie können neue hinzufügen** - Alle Funktionen aktiv

### 💼 Praktische Szenarien:

**Szenario 1 - Saisonales Geschäft:**
\`\`\`
Januar-März: PRO aktiv → Rechnungen erstellen
April-Dezember: Freemium → Nur alte Rechnungen im PDF Archiv lesen
Nächster Januar: PRO reaktivieren → Mit neuen Rechnungen fortfahren
\`\`\`

**Szenario 2 - Wechsel zu anderem System:**
\`\`\`
6 Monate PRO genutzt
→ Entscheiden sich für andere Software
→ PRO kündigen → Zu Freemium wechseln
→ Haben WEITERHIN Zugriff auf PDF Archiv
→ Alle Rechnungen für Backup herunterladen
\`\`\`

**Szenario 3 - Vorübergehende Pause:**
\`\`\`
Krankheit / Urlaub / Geschäftspause
→ PRO kündigen, um zu sparen
→ Zugriff auf PDF Archiv bleibt
→ Bei Rückkehr → Reaktivieren und fortfahren
\`\`\`

### ⚠️ WICHTIG - Empfehlungen:

**Vor Kündigung (optional):**
- 💾 **Alle wichtigen Rechnungen herunterladen** - Für Offline-Backup
- 📊 **Kundenliste erstellen** - Screenshot oder Export
- 📝 **Letzte Rechnungsnummer notieren** - Für einfachere Fortsetzung

**Aber:**
- ✅ **Nicht erforderlich** - Weil Sie Zugriff auf PDF Archiv haben
- 🔒 **Ihre Daten sind sicher** - Nichts wird gelöscht
- 📄 **Kundendaten in PDFs** - Alle Informationen gespeichert

### 🔐 Datensicherheit:

**Wir garantieren:**
- 🔒 **Daten werden NIEMALS GELÖSCHT** - Auch nicht im Freemium-Plan
- 💾 **Backup-System** - Regelmäßige Sicherheitskopien
- ⏰ **Dauerhafte Speicherung** - Solange Sie ein Konto haben
- ✅ **PDF Archiv immer verfügbar** - Nur-Lesen im Freemium
- 🚫 **Wir verkaufen keine Daten** - DSGVO-konform

### 💰 Flexibilität:

**Unsere Philosophie:**
- 💚 **Ihre Daten bleiben Ihre** - Unabhängig vom Plan
- 🔓 **Kein "Lock-in"-Effekt** - Sie können immer alles herunterladen
- 🔄 **Einfacher Wechsel** - PRO ↔ Freemium ↔ PRO
- 💼 **Professionell** - Wir respektieren Ihre Bedürfnisse

**Praktisch:**
- ✅ Sie können **PRO pausieren**, wenn Sie keine Arbeit haben
- ✅ Sie können **reaktivieren**, wenn Sie es brauchen
- ✅ **Keine Angst**, Daten zu verlieren
- ✅ **Volle Kontrolle** über Ihr Geschäft`,
          tags: ['freemium', 'downgrade', 'kündigung', 'daten', 'archiv'],
          category: 'rechnungen'
        },
        {
          id: 'daten-export',
          question: 'Kann ich Daten aus Rechnungen exportieren (z.B. für Excel)?',
          answer: `Derzeit bietet pro-meister.de **keinen direkten CSV/Excel-Export**, aber alle Ihre Rechnungen sind als **ZUGFeRD-PDF**-Dokumente verfügbar.

### 📥 Was Sie mit Daten tun können:

**Verfügbar:**
- 📄 **Alle Rechnungen als PDF herunterladen** - Aus dem PDF Archiv
- 💾 **ZUGFeRD-Format** - Enthält strukturierte Daten
- 📊 **Statistiken im PDF Archiv** - Gesamtbeträge, Anzahl der Rechnungen
- 🔍 **Suchen und Filtern** - Nach Zeitraum, Kunde, Betrag

### 💼 Für Ihre Buchhaltung:

**Beste Lösung:**
- 📧 **Rechnungen an Buchhalter senden** - Direkt aus der Plattform
- 🤖 **ZUGFeRD-Format** - Buchhaltungssoftware (DATEV, Lexware) **liest Daten automatisch**
- ✅ **Keine manuelle Eingabe erforderlich** - Alles wird automatisch verarbeitet
- 💰 **Buchhalter erhält alle Daten** - Lädt einfach PDF

**Wie:**
1. Gehen Sie zum **"PDF Archiv"**
2. Filtern Sie Zeitraum (z.B. "Diesen Monat")
3. Wählen Sie Rechnungen aus
4. Klicken Sie auf **"Send to Bookkeeper"**
5. **Fertig** - Buchhalter hat alle Daten!

### 🔮 Zukünftige Funktionalität:

**Geplant:**
- 📊 **CSV/Excel-Export** - Direkter Datenexport
- 📥 **Bulk-Download** - Mehrere PDFs gleichzeitig herunterladen
- 📈 **Finanzberichte** - Monatliche/jährliche Übersichten

**Wann:**
- ⏰ **In Entwicklung** - Noch kein festes Datum
- 💡 **Ihr Feedback hilft** - Je mehr Benutzer fragen, desto schneller entwickeln wir

### 💡 Praktischer Tipp:

**Für jetzt:**
- ✅ Nutzen Sie **ZUGFeRD-PDF** - Buchhalter wissen, wie man damit arbeitet
- ✅ **PDF Archiv-Statistiken** - Für schnellen Überblick
- ✅ **Regelmäßig an Buchhalter senden** - Monatlich oder quartalsweise

**In Zukunft:**
- 🎯 Sie erhalten **direkten CSV/Excel-Export**
- 📊 **Detailliertere Berichte**
- 📥 **Massen-Download**

### ⚠️ Hinweis:

- 💡 **CSV/Excel-Export ist geplant** - Aber noch nicht verfügbar
- ✅ **ZUGFeRD-PDF ist professionelles Format** - Buchhaltungssoftware unterstützt es
- 📧 **Senden Sie uns Feedback** - Wenn Sie diese Funktion benötigen`,
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
      questions: []
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
          answer: `**Ja!** Pro-meister.de ist **vollständig konform** mit der DSGVO und nimmt den Schutz Ihrer Daten ernst.

### 🔒 DSGVO-Konformität:

**Was wir garantieren:**
- ✅ **100% DSGVO-konform** - In Übereinstimmung mit allen deutschen und EU-Vorschriften
- ✅ **Transparenz** - Klare Datenschutzrichtlinie
- ✅ **Ihre Kontrolle** - Sie kontrollieren Ihre Daten
- ✅ **Recht auf Löschung** - Sie können Konto und Daten löschen
- ✅ **Recht auf Export** - Laden Sie alle Ihre Daten herunter

### 📋 Ihre Rechte gemäß DSGVO:

**Was Sie tun können:**
- 📥 **Zugang zu Daten** - Sehen Sie alles, was wir über Sie speichern
- 💾 **Daten herunterladen** - Export aller Dokumente
- ✏️ **Daten korrigieren** - Jederzeit aktualisieren
- 🗑️ **Konto löschen** - Konto und alle Daten löschen
- 🚫 **Einwilligung widerrufen** - Jederzeit kündigen

### 🛡️ Wie wir Ihre Daten schützen:

**Technischer Schutz:**
- 🔐 **SSL/TLS-Verschlüsselung** - Alle Daten während der Übertragung verschlüsselt
- 🔒 **Verschlüsselte Datenbank** - Ruhende Daten sind geschützt
- 🔑 **Sichere Authentifizierung** - Google OAuth und sichere Passwörter
- 🚪 **Zugriffskontrolle** - Nur Sie haben Zugriff auf Ihre Daten

**Organisatorischer Schutz:**
- 👥 **Minimaler Zugriff** - Nur autorisiertes Personal
- 📜 **Vertraulichkeitsvereinbarungen** - Mit allen Mitarbeitern
- 🎓 **Regelmäßige Schulungen** - Team ist DSGVO-geschult
- 📊 **Regelmäßige Audits** - Konformitätsprüfung

### 🇪🇺 Serverstandort und Vorschriften:

**Wo sind Ihre Daten:**
- 🇪🇺 **EU-Server** - Daten VERLASSEN die Europäische Union NICHT
- 🇩🇪 **Deutsche Vorschriften** - Strenge Schutzstandards
- 🚫 **Keine Übertragung in Drittländer** - Daten bleiben in der EU
- ✅ **EU-Cloud-Anbieter** - Nur DSGVO-konforme Partner

### 📧 Daten, die wir sammeln:

**Was wir speichern:**
- 👤 **Konto:** Name, E-Mail, Telefon
- 🏢 **Geschäft:** Firma, Adresse, Steuernummer
- 📄 **Dokumente:** Rechnungen, Angebote, die Sie erstellen
- 👥 **Kunden:** Daten, die SIE über IHRE Kunden eingeben

**Was wir NICHT speichern:**
- 🚫 **Kreditkarten** - Paddle verarbeitet Zahlungen (DSGVO-konform)
- 🚫 **Passwörter im Klartext** - Nur gehasht
- 🚫 **Unnötige Daten** - Nur das erforderliche Minimum

### 🔐 Dritte:

**Mit wem wir Daten teilen:**
- 💳 **Paddle** - Nur für Zahlungen (DSGVO-konform)
- 📧 **E-Mail-Dienst** - Nur zum Versenden von Rechnungen (verschlüsselt)
- 🚫 **NIEMAND SONST** - Wir verkaufen keine Daten, keine Werbung, kein Tracking

### 📜 Dokumentation:

**Verfügbar auf der Website:**
- 📋 **Datenschutzerklärung**
- 📄 **Impressum**
- ⚖️ **AGB** (Allgemeine Geschäftsbedingungen)
- 📧 **Kontakt Datenschutzbeauftragter**

### 💡 Praktisch für Sie:

**Was das bedeutet:**
- ✅ **Ihre Daten sind sicher** - Keine Sorgen
- ✅ **Sie können der Plattform vertrauen** - Alle Vorschriften eingehalten
- ✅ **Sie können für Geschäft nutzen** - Vollständig legal
- ✅ **Ihre Kunden sind geschützt** - DSGVO-konforme Datenverarbeitung

### ⚠️ Ihre Verantwortung:

**Sie sind auch verantwortlich:**
- 📋 Wenn Sie pro-meister.de verwenden, sind **Sie "Datenverarbeiter"** für die Daten Ihrer Kunden
- ✅ **Wir sind DSGVO-konform**, aber Sie müssen die Plattform ordnungsgemäß nutzen
- 🔒 **Schützen Sie Ihr Passwort** - Teilen Sie keinen Zugang
- 👥 **Sammeln Sie nur erforderliche Daten** über Kunden`,
          tags: ['dsgvo', 'datenschutz', 'gdpr', 'sicherheit', 'privacy'],
          category: 'sicherheit'
        },
        {
          id: 'daten-speicherort-backup',
          question: 'Wo werden meine Daten gespeichert und gibt es Backups?',
          answer: `Ihre Daten werden auf **sicheren Cloud-Servern** mit **regelmäßigen automatischen Backups** gespeichert.

### 🌍 Datenspeicherort:

**Wo sind Ihre Daten:**
- ☁️ **Cloud-Infrastruktur** - Professionelle Cloud-Anbieter
- 🔒 **DSGVO-konforme Server** - In Übereinstimmung mit EU-Vorschriften
- ✅ **Zertifizierte Anbieter** - ISO 27001, SOC 2
- 🛡️ **Hohe Sicherheit** - Enterprise-Level-Schutz

**Standards:**
- 🇪🇺 **DSGVO/GDPR-konform** - Vollständige Konformität
- ⚖️ **Rechtssicherheit** - In Übereinstimmung mit deutschen Vorschriften
- 🔐 **Strenge Schutzmaßnahmen** - Physische und digitale Sicherheit

### 💾 Automatisches Backup-System:

**Wie Backups funktionieren:**
- ⏰ **Regelmäßiges Backup** - Automatisch jeden Tag
- 🔄 **Mehrfache Backups** - Mehrere Kopien Ihrer Daten
- 📍 **Redundante Systeme** - Backups an verschiedenen Standorten
- 🔐 **Verschlüsselte Backups** - Alle Kopien sind geschützt

**Was gesichert wird:**
- 📄 **Alle Rechnungen und Angebote** - Vollständiges Archiv
- 👥 **Alle Kundendaten** - Gesamte Datenbank
- ⚙️ **Ihre Einstellungen** - Komplette Konfiguration
- 🖼️ **Logo und Bilder** - Alle hochgeladenen Dateien

### 🔄 Datenwiederherstellung:

**Im Problemfall:**
- 🚨 **Automatische Wiederherstellung** - System stellt automatisch aus Backup wieder her
- ⏱️ **Minimale Ausfallzeit** - Schnelle Rückkehr zur Funktion
- 📊 **Kein Datenverlust** - Alles wird wiederhergestellt
- ✅ **Getestetes System** - Regelmäßige Wiederherstellungstests

**Sie MÜSSEN NICHT:**
- 🚫 **Manuell Backups erstellen** - Alles automatisch
- 🚫 **Sich um Verlust sorgen** - System schützt Sie
- 🚫 **Extra bezahlen** - In allen Plänen enthalten

### 🔒 Datensicherheit:

**Wie Daten geschützt sind:**
- 🔐 **Verschlüsselung während Übertragung** - SSL/TLS für alle Verbindungen
- 🔒 **Verschlüsselung im Ruhezustand** - Verschlüsselte Datenbank
- 🔑 **Zugriffskontrolle** - Nur autorisierter Zugriff
- 🛡️ **Firewall-Schutz** - Mehrschichtiges Firewall-System
- 👁️ **24/7-Überwachung** - Ständige Sicherheitsüberprüfung

### 📊 System-Redundanz:

**Mehrfacher Schutz:**
- 💻 **Redundante Server** - Mehrere Server für dieselben Daten
- 🔄 **Load Balancing** - Automatische Lastverteilung
- ⚡ **Failover-System** - Automatischer Ersatz bei Ausfall
- 🌐 **CDN** - Schnelleres Laden

### 💾 Ihre zusätzliche Sicherheit:

**Was Sie tun können:**
- 📥 **PDFs herunterladen** - Aus dem PDF Archiv
- 💾 **Lokales Backup** - Auf Ihrem Computer speichern
- 📂 **Dateien organisieren** - Nach Monaten/Jahren
- 🔐 **Lokal verschlüsseln** - Für zusätzliche Sicherheit

**Empfehlung:**
- ✅ **Regelmäßig wichtige Rechnungen herunterladen** - Besonders für Jahresarchiv
- 📁 **Backup organisieren** - Für einfaches Auffinden
- 💼 **An Buchhalter senden** - Er hat auch Kopie

### ⏰ Aufbewahrungsrichtlinie:

**Wie lange speichern wir:**
- 📜 **Solange Sie Konto haben** - Alle Ihre Daten speichern wir
- 🔄 **Auch im Freemium** - Backup wird weiterhin erstellt
- ⚠️ **Nach Kontolöschung** - Daten können 30 Tage aufbewahrt werden (zur Wiederherstellung)
- 🗑️ **Dauerhafte Deaktivierung** - Nach 30 Tagen dauerhaft gelöscht

**Gesetzliche Anforderungen:**
- 📋 **Sie müssen Rechnungen 10 Jahre aufbewahren** - Deutsches Gesetz
- ✅ **Pro-meister.de speichert, solange Sie Konto haben** - Aber wir empfehlen lokales Backup
- 💾 **Regelmäßig herunterladen** - Für Sicherheit

### 💡 Praktischer Tipp:

**Best Practice:**
1. 📧 Regelmäßig an Buchhalter senden (monatlich)
2. 💾 Jährlich alle Rechnungen herunterladen
3. 📂 Backup auf externer Festplatte organisieren
4. ✅ Auf Plattform für tägliche Arbeit vertrauen

### ⚠️ Hinweis:

- 🔒 **Ihre Daten sind maximal geschützt** - Automatisches Backup jeden Tag
- 🔐 **DSGVO-konforme Infrastruktur** - Professionelle Cloud-Anbieter
- 🚫 **Keine versteckten Kosten** - Backup im Preis enthalten
- ✅ **Keine Sorgen** - System arbeitet für Sie`,
          tags: ['backup', 'speicherort', 'sicherheit', 'cloud', 'daten'],
          category: 'sicherheit'
        },
        {
          id: 'daten-zugriff',
          question: 'Wer hat Zugriff auf meine Daten?',
          answer: `**Nur SIE** haben Zugriff auf Ihre Daten. Pro-meister.de garantiert **vollständige Privatsphäre** und teilt **niemals** Ihre Daten mit Dritten.

### 👤 Wer kann Ihre Daten sehen:

**SIE - Kontoinhaber:**
- ✅ **Volle Kontrolle** - Sie sehen alle Ihre Daten
- ✅ **Verwaltung** - Sie können ändern, löschen, exportieren
- ✅ **Privatsphäre** - Niemand sonst sieht Ihre Daten

**Pro-meister.de technisches Team:**
- 🔒 **Minimaler Zugriff** - Nur autorisiertes Personal
- 🛠️ **Nur für Support** - Wenn Sie um Hilfe bitten
- 📜 **Strenge Vertraulichkeit** - NDA-Verträge
- 🚫 **Wir lesen Ihre Daten nicht** - Außer Sie geben uns Erlaubnis

### 🚫 Wer hat KEINEN Zugriff:

**Wir teilen NIEMALS mit:**
- ❌ **Marketing-Unternehmen** - Keine Werbung
- ❌ **Data Brokern** - Wir verkaufen keine Daten
- ❌ **Sozialen Netzwerken** - Kein Tracking
- ❌ **Wettbewerbern** - Ihre Daten gehören nur Ihnen
- ❌ **Dritten** - Ohne Ausnahme

### 🔐 Dritte, die wir nutzen:

**Nur für technische Funktionalität:**

**1. Paddle (Zahlungen):**
- 💳 **Nur für Zahlungen** - Verarbeitung des PRO-Abonnements
- ✅ **DSGVO-konform** - EU-zertifiziert
- 🚫 **Sehen Ihre Rechnungen nicht** - Nur Abonnementinformationen
- 🔒 **Speichern keine Kreditkarten** - PCI DSS Level 1

**2. Cloud-Anbieter (Hosting):**
- ☁️ **Hosting-Infrastruktur** - Wo Daten gespeichert werden
- ✅ **DSGVO-konform** - Zertifizierter Anbieter
- 🚫 **Lesen Ihre Daten nicht** - Nur technisches Hosting
- 🔐 **Verschlüsselt** - Alle Daten geschützt

**3. E-Mail-Dienst (Rechnungsversand):**
- 📧 **Nur zum E-Mail-Versand** - Wenn Sie auf "Senden" klicken
- ✅ **Verschlüsselt** - SSL/TLS-Schutz
- 🚫 **Speichern keinen Inhalt** - Nur Übertragung
- ⏰ **Vorübergehend** - Löschen nach Zustellung

### 🛡️ Was wir garantieren:

**Unsere Verpflichtungen:**
- ✅ **Wir verkaufen niemals Daten** - Das ist nicht unser Geschäftsmodell
- ✅ **Keine Werbung** - Kein Tracking für Marketing
- ✅ **Ihre Privatsphäre** - Oberste Priorität
- ✅ **Transparenz** - Wir sagen Ihnen klar, was wir tun

### 🔑 Ihre Kontrolle:

**Was Sie kontrollieren:**
- 👁️ **Sichtbarkeit** - Wer Ihre Daten sieht (nur Sie)
- 📥 **Export** - Laden Sie alle Daten jederzeit herunter
- 🗑️ **Löschung** - Löschen Sie Konto und alle Daten
- 🚫 **Widerruf** - Kündigen Sie Zugriff jederzeit

### ⚠️ Ausnahmen (gesetzlich):

**Wann wir Daten teilen müssen:**
- ⚖️ **Gerichtsbeschluss** - Wenn uns Gericht verpflichtet
- 🚔 **Gesetzliche Anforderungen** - Nur wenn gesetzlich vorgeschrieben
- 📜 **Steuervorschriften** - Wenn zuständige Behörden fragen

**Aber:**
- 🔔 **Wir informieren Sie** - Wenn gesetzlich erlaubt
- 📋 **Minimale Daten** - Nur was verlangt wird
- ⚖️ **Rechtsschutz** - Wir verteidigen Ihre Rechte

### 💼 Ihre Kunden:

**Daten Ihrer Kunden:**
- 🔒 **Sie sind Eigentümer** - Das sind IHRE Daten
- 📋 **Sie sind verantwortlich** - Gemäß DSGVO
- ✅ **Wir speichern nur** - Als technischer Anbieter
- 🚫 **Wir nutzen sie nicht** - Für nichts anderes

**Das bedeutet:**
- 👥 **Ihre Kunden vertrauen Ihnen** - Nicht uns
- 📧 **Sie senden Rechnungen** - Wir ermöglichen nur
- 💼 **Sie verwalten** - Wir hosten nur

### 📊 Logs und Analytik:

**Was wir verfolgen:**
- 📈 **Technische Logs** - Zur Systemwartung
- 🐛 **Error Tracking** - Zur Fehlerbehebung
- ⏱️ **Performance** - Zur Geschwindigkeitsverbesserung

**Was wir NICHT verfolgen:**
- 🚫 **Ihre persönlichen Aktivitäten** - Was Sie auf Plattform tun
- 🚫 **Dokumentinhalt** - Was Sie in Rechnungen schreiben
- 🚫 **Verhalten** - Für Marketingzwecke

### 💡 Praktisch:

**Seien Sie beruhigt:**
- ✅ Ihre Daten sind **nur Ihre**
- ✅ Wir **verkaufen niemals** etwas
- ✅ **DSGVO** schützt uns und Sie
- ✅ Wir sind **transparent** in allem`,
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
          answer: `Unser Support-Team ist **immer verfügbar**, um Ihnen zu helfen. Sie können uns **direkt aus der Plattform** oder per E-Mail kontaktieren.

### 📧 Kontaktmöglichkeiten:

**1. Support-Formular (empfohlen):**
- ✉️ Klicken Sie auf das **Briefumschlag-Symbol** oben rechts
- 📋 Füllen Sie das Formular mit Details aus
- 📤 Senden - Sie erhalten Antwort per E-Mail

**2. Direkte E-Mail:**
- 📧 Senden Sie E-Mail an: **support@pro-meister.de**
- ✍️ Beschreiben Sie Ihr Problem oder Ihre Frage
- 📎 Fügen Sie Screenshot bei, falls nötig

### 📋 Support-Kategorien:

**Wählen Sie die richtige Kategorie:**
- ❓ **Allgemeine Frage** - Allgemeine Fragen zur Plattform
- 🔧 **Technisches Problem** - Technische Probleme
- 💳 **Abrechnung & Zahlung** - Fragen zu Abrechnung, Zahlung, Paddle-Rechnungen
- ✨ **Feature-Anfrage** - Vorschlag für neue Funktionalität
- 🐛 **Bug Report** - Fehler melden

### 💳 Besonderer Hinweis zu Zahlungen:

**Paddle-Rechnungen und Zahlungen:**
- 📧 **Paddle sendet Rechnungen** für PRO-Abonnement direkt an Ihre E-Mail
- 💳 **Zahlungsprobleme?** Kontaktieren Sie uns über Kategorie "Abrechnung & Zahlung"
- ✅ **Wir helfen Ihnen** - Oder eskalieren an Paddle, falls nötig
- 🎯 **Sie sind unser Kunde** - Wir sind Ihr Hauptkontakt, nicht Paddle

### ⏰ Antwortzeit:

**Wir garantieren:**
- ⚡ **Antwort so schnell wie möglich**
- 🕐 **Spätestens innerhalb von 24 Stunden** - Normalerweise viel schneller
- 📧 **E-Mail-Benachrichtigung** - Wenn wir antworten
- 🔔 **In-App-Benachrichtigung** - Wenn Sie eingeloggt sind

### 💡 Wie Sie schnellere Antwort erhalten:

**Best Practices:**
1. **Wählen Sie richtige Kategorie** - Erleichtert uns, Sie schneller zu unterstützen
2. **Seien Sie konkret** - Beschreiben Sie Problem detailliert
3. **Fügen Sie Screenshot hinzu** - Ein Bild sagt mehr als tausend Worte
4. **Geben Sie Schritte an** - Wie Problem aufgetreten ist
5. **Browser und Gerät** - Hilft uns, Problem zu reproduzieren

### 📸 Screenshot - Wie erstellen:

**Auf Computer:**
- **Windows:** Windows + Shift + S
- **Mac:** Command + Shift + 4
- **Chrome:** F12 → Screenshot-Tool

**Auf Handy:**
- **iPhone:** Power + Volume Up
- **Android:** Power + Volume Down

### 🎯 Was in Nachricht einschließen:

**Für technische Probleme:**
- 🖥️ Browser, den Sie verwenden (Chrome, Firefox, Safari)
- 📱 Gerät (Desktop, Tablet, Mobil)
- 🔄 Schritte zum Problem
- 📸 Screenshot des Fehlers

**Für Zahlung und Paddle-Rechnungen:**
- 🔢 Transaktions- oder Subscription-ID
- 📅 Transaktionsdatum
- 💰 Betrag
- 📧 E-Mail, die Sie für Paddle verwenden

**Für Feature-Anfragen:**
- 💡 Was Sie sehen möchten
- 🎯 Warum es nützlich ist
- 📊 Wie es Ihnen helfen würde

### ✅ Nach dem Senden:

**Was passiert:**
1. 📨 **Sie erhalten E-Mail-Bestätigung** - Ihre Nachricht wurde empfangen
2. 👀 **Team prüft** - Wir priorisieren nach Dringlichkeit
3. 💬 **Wir antworten** - Mit Lösung oder zusätzlichen Fragen
4. ✅ **Wir lösen** - Wir verfolgen bis zum Ende

### 🌐 Zusätzliche Ressourcen:

**Vor Kontaktaufnahme:**
- 📚 **FAQ-Bereich** - Vielleicht existiert Antwort bereits
- 📖 **Anleitungen** - Schritt-für-Schritt-Guides
- 💡 **Tooltips** - In der Plattform auf jeder Seite

### 💼 Für alle Benutzer:

- ✅ **Kostenloser Support** - Für Freemium- und PRO-Benutzer
- 🎯 **Professionelle Hilfe** - Team bereit zu helfen
- 🚀 **Schnelle Antwort** - Maximal 24 Stunden

### ⚠️ Wichtig:

- 🚫 **Wir teilen keine Passwörter** - Wir fragen niemals nach Ihrem Passwort
- 🔒 **Sicherer Kontakt** - Nur über offizielle Kanäle
- ✉️ **Offizielle E-Mail:** support@pro-meister.de`,
          tags: ['support', 'kontakt', 'hilfe', 'email'],
          category: 'support'
        },
        {
          id: 'problem-melden',
          question: 'Wie melde ich ein Problem oder fordere eine neue Funktion an?',
          answer: `Pro-meister.de **hört aktiv** auf Benutzerfeedback. Ob Sie einen Fehler gefunden haben oder eine Idee zur Verbesserung haben, wir möchten von Ihnen hören!

### 🐛 Problem melden (Bug Report):

**Schritt 1:** Klicken Sie auf **Briefumschlag-Symbol** (✉️) oben rechts  
**Schritt 2:** Wählen Sie Kategorie: **🐛 Bug Report**  
**Schritt 3:** Beschreiben Sie Problem so detailliert wie möglich:

**Was einschließen:**
- 📝 **Was passiert ist** - Kurze Problembeschreibung
- 🔄 **Schritte zur Reproduktion** - Wie Fehler aufgetreten ist
  1. Öffnen Sie Seite X
  2. Klicken Sie auf Button Y
  3. Fehler erscheint
- ❌ **Erwartetes Verhalten** - Was hätte passieren sollen
- 🖥️ **Ihre Umgebung:**
  - Browser (Chrome 120, Firefox 119, Safari 17)
  - Gerät (Desktop Windows, Mac, iPhone, Android)
  - Bildschirmgröße (falls relevant)
- 📸 **Screenshot oder Video** - Unbedingt, wenn möglich!

### ✨ Neue Funktion anfordern (Feature Request):

**Schritt 1:** Klicken Sie auf **Briefumschlag-Symbol** (✉️)  
**Schritt 2:** Wählen Sie Kategorie: **✨ Feature-Anfrage**  
**Schritt 3:** Beschreiben Sie Ihre Idee:

**Was einschließen:**
- 💡 **Was Sie möchten** - Kurze Funktionsbeschreibung
- 🎯 **Warum es nützlich ist** - Welches Problem es löst
- 📊 **Wie es Ihnen helfen würde** - Konkrete Anwendungsbeispiele
- 🌟 **Priorität für Sie** - Wie wichtig es ist (optional)

**Beispiele guter Feature-Anfragen:**
\`\`\`
❌ Schlecht: "Mehr Optionen hinzufügen"
✅ Gut: "Möglichkeit, mehrere MwSt.-Sätze (7%, 19%) hinzuzufügen, 
        da ich mit verschiedenen Dienstleistungsarten arbeite"

❌ Schlecht: "Bessere Rechnungen"
✅ Gut: "Option, automatisch Zahlungserinnerung 7 Tage vor Fälligkeit zu senden - 
        würde mir Zeit sparen"
\`\`\`

### 🔧 Technische Probleme:

**Schritt 1:** Klicken Sie auf **Briefumschlag-Symbol** (✉️)  
**Schritt 2:** Wählen Sie Kategorie: **🔧 Technisches Problem**  
**Schritt 3:** Beschreiben Sie Problem:

**Für technische Probleme:**
- ⚠️ **Aufgetretener Fehler** - Genauer Fehlertext
- 📱 **Wann es passiert** - Immer, manchmal, zum ersten Mal?
- 🔄 **Kann es wiederholt werden** - Konstant oder zufällig?
- 🖥️ **Browser-Konsole** - F12 → Console (für Fortgeschrittene)

### 📊 Was mit Ihren Meldungen passiert:

**Für Bug Report:**
1. 🔍 **Team prüft** - Wir überprüfen, ob wir reproduzieren können
2. 🎯 **Wir priorisieren** - Nach Schwere des Fehlers
3. 🔧 **Wir lösen** - Fix in nächster Version
4. ✅ **Wir informieren Sie** - Wenn Problem gelöst ist

**Für Feature Request:**
1. 💡 **Wir erwägen** - Wie viele Benutzer fordern dasselbe
2. 📊 **Wir analysieren** - Kann es implementiert werden
3. 🗳️ **Wir priorisieren** - Basierend auf Benutzerstimmen
4. 🚀 **Wir implementieren** - In zukünftigen Versionen
5. 📣 **Wir kündigen an** - Im Changelog oder per E-Mail

### 🎯 Best Practices:

**Für Bug Report:**
- ✅ **Ein Problem = eine Meldung** - Mischen Sie nicht mehrere Probleme
- 📸 **Screenshot ist Pflicht** - Erleichtert Verständnis
- 🔄 **Schritte sind entscheidend** - Wir müssen reproduzieren können
- ⏰ **Sofort melden** - Solange es frisch im Gedächtnis ist

**Für Feature Request:**
- ✅ **Seien Sie konkret** - Nicht allgemein
- 🎯 **Erklären Sie Problem** - Das Sie zu lösen versuchen
- 💼 **Realer Anwendungsfall** - Wie würden Sie es nutzen
- 🌟 **Eine Anfrage = eine Meldung** - Einfach zu verfolgen

### 💬 Status verfolgen:

**Wie Sie wissen, was passiert:**
- 📧 **E-Mail-Updates** - Bei Änderungen
- 🔔 **In-App-Benachrichtigungen** - Wenn eingeloggt
- 📊 **Team-Antwort** - Empfangsbestätigung und Plan

### 🌟 Ihr Einfluss:

**Ihr Feedback ist wichtig:**
- 💚 **Wir bauen für Sie** - Ihre Bedürfnisse sind Priorität
- 📈 **Beste Ideen** - Kommen von Benutzern
- 🚀 **Schnellere Entwicklung** - Wir fokussieren uns auf Wichtiges
- 🎉 **Community-getrieben** - Gemeinschaft formt Plattform

### ⚠️ Hinweis:

- ✅ **Jedes Feedback ist willkommen** - Es gibt keine "dummen" Fragen
- 🔒 **Vertraulich** - Ihre Meldungen sind privat
- 🚀 **Schnelle Antwort** - Maximal 24 Stunden
- 💡 **Kostenlos** - Für alle Benutzer`,
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
    lastUpdated: '2025-10-21',
    version: '2.0',
    totalQuestions: 34,
    language: 'de'
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