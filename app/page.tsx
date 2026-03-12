import { Suspense } from 'react'
import RefCapture from './components/RefCapture'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Suspense fallback={null}><RefCapture /></Suspense>

      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/10 backdrop-blur-md border-b border-white/10 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-3 sm:py-4 gap-3 sm:gap-0">
            <div className="flex items-center gap-2 justify-center sm:justify-start">
              <img src="/logo.png" alt="Pro-Meister Logo" className="w-7 h-7 sm:w-8 sm:h-8" />
              <span className="text-xl sm:text-2xl font-bold text-white">Pro-meister<span className="text-blue-400">.de</span></span>
            </div>
            <div className="flex gap-2 sm:gap-4 justify-center items-center">
              <a href="/faq" className="text-white/80 hover:text-white px-3 sm:px-4 py-2 transition-colors text-sm sm:text-base">FAQ</a>
              <a href="/login" className="text-white/80 hover:text-white px-3 sm:px-4 py-2 transition-colors text-sm sm:text-base">Anmelden</a>
              <a href="/signup" className="bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-6 py-2 rounded-full font-medium transition-all duration-300 hover:scale-105 text-sm sm:text-base">
                Registrieren
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 sm:pt-28 md:pt-36 pb-12 sm:pb-16 md:pb-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto text-center">

          {/* Badges */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-6 sm:mb-8">
            <div className="inline-flex items-center gap-2 bg-orange-500/15 border border-orange-500/30 rounded-full px-3 sm:px-4 py-2">
              <span className="text-orange-300 text-xs sm:text-sm font-medium">✦ KI-gestützt</span>
            </div>
            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-3 sm:px-4 py-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-blue-300 text-xs sm:text-sm font-medium">ZUGFeRD 2.4 • DIN 5008 • DATEV-kompatibel</span>
            </div>
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-extrabold text-white mb-4 sm:mb-6 leading-tight">
            Weniger Büro.
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-orange-400">
              Mehr Handwerk.
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-slate-300 mb-4 sm:mb-6 max-w-3xl mx-auto leading-relaxed px-2">
            Pro-Meister ist kein Buchhaltungsprogramm — es ist der digitale Assistent, der Handwerkern ihre Zeit zurückgibt.
          </p>
          <p className="text-sm sm:text-base md:text-lg text-slate-400 mb-8 sm:mb-10 max-w-2xl mx-auto px-2">
            Rechnungen & Angebote in Sekunden. Direkt vom Handy auf der Baustelle. Buchhalter bekommt alles per Knopfdruck.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-10 sm:mb-14 px-2">
            <a href="/signup" className="group bg-gradient-to-r from-blue-600 to-orange-500 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-full font-semibold text-base sm:text-lg transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-orange-500/25">
              30 Tage kostenlos testen
              <span className="ml-2 group-hover:translate-x-1 transition-transform duration-300">→</span>
            </a>
            <a href="#features" className="border-2 border-white/20 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-full font-semibold text-base sm:text-lg hover:bg-white/10 transition-all duration-300">
              Funktionen ansehen
            </a>
          </div>

          {/* Hero Screenshot Placeholder */}
          <div className="relative max-w-5xl mx-auto px-2">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
              {/* Mini features */}
              <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-xl p-5 border border-slate-600 shadow-2xl text-left">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-900 rounded-lg p-3 border border-slate-600">
                    <div className="text-xl mb-1">📄</div>
                    <h3 className="text-white font-semibold text-xs mb-1">Rechnung in Sekunden</h3>
                    <p className="text-slate-400 text-xs">Vom Handy — sofort per E-Mail</p>
                  </div>
                  <div className="bg-slate-900 rounded-lg p-3 border border-slate-600">
                    <div className="text-xl mb-1">🔄</div>
                    <h3 className="text-white font-semibold text-xs mb-1">Angebot → Rechnung</h3>
                    <p className="text-slate-400 text-xs">1-Klick Umwandlung</p>
                  </div>
                  <div className="bg-slate-900 rounded-lg p-3 border border-slate-600">
                    <div className="text-xl mb-1">🎙</div>
                    <h3 className="text-white font-semibold text-xs mb-1">KI-Sprachdiktat</h3>
                    <p className="text-slate-400 text-xs">Rechnung diktieren, KI füllt aus</p>
                  </div>
                  <div className="bg-slate-900 rounded-lg p-3 border border-slate-600">
                    <div className="text-xl mb-1">📱</div>
                    <h3 className="text-white font-semibold text-xs mb-1">QR-Visitenkarte</h3>
                    <p className="text-slate-400 text-xs">Kostenlos für immer</p>
                  </div>
                </div>
              </div>

              <div className="relative rounded-2xl overflow-hidden aspect-video">
                <video
                  src="/LPvideo.mp4"
                  autoPlay
                  muted
                  loop
                  playsInline
                  controls
                  className="w-full h-full object-cover rounded-2xl"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Punchy strip */}
      <section className="py-10 px-4 sm:px-6 border-y border-slate-700/50 bg-slate-800/30">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 text-center">
            <div>
              <p className="text-white font-semibold text-base sm:text-lg leading-snug">
                "Rechnung auf der Baustelle erstellt,<br />
                <span className="text-blue-400">beim Kunden schon im Posteingang."</span>
              </p>
            </div>
            <div className="border-l border-r border-slate-700 px-6 hidden md:block">
              <p className="text-white font-semibold text-base sm:text-lg leading-snug">
                "Buchhalter bekommt alles —<br />
                <span className="text-orange-400">ein Klick, eine E-Mail, fertig."</span>
              </p>
            </div>
            <div className="md:hidden">
              <p className="text-white font-semibold text-base sm:text-lg leading-snug">
                "Buchhalter bekommt alles —<br />
                <span className="text-orange-400">ein Klick, eine E-Mail, fertig."</span>
              </p>
            </div>
            <div>
              <p className="text-white font-semibold text-base sm:text-lg leading-snug">
                "Angebot fertig? Mit einem Klick<br />
                <span className="text-green-400">zur fertigen Rechnung."</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Alles, was Sie brauchen.
              <span className="text-blue-400"> Nichts, was Sie nicht brauchen.</span>
            </h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              Entwickelt für Handwerker — nicht für Buchhalter.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">

            {/* Feature 1 - Rechnungen (MAIN) */}
            <div className="group bg-gradient-to-br from-blue-500/10 to-orange-500/10 border-2 border-blue-500/30 rounded-2xl p-8 hover:border-orange-400/50 transition-all duration-300 hover:-translate-y-2 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-gradient-to-r from-blue-600 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap">KERNFUNKTION</span>
              </div>
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-orange-500 rounded-2xl mb-6 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 mt-2">
                <span className="text-2xl">📄</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Rechnungen & Angebote</h3>
              <p className="text-slate-300 mb-6 leading-relaxed">
                ZUGFeRD-Rechnung in Sekunden — direkt vom Handy auf der Baustelle erstellen und sofort an den Kunden schicken.
              </p>
              <ul className="text-slate-400 space-y-2">
                <li>✓ <span className="text-orange-400 font-medium">Angebot → Rechnung (1-Klick)</span></li>
                <li>✓ ZUGFeRD 2.4 — DATEV-kompatibel</li>
                <li>✓ Automatische Nummerierung</li>
                <li>✓ Sofort per E-Mail versenden</li>
              </ul>
            </div>

            {/* Feature 2 - KI Assistent + Sprachdiktat */}
            <div className="group bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-2 border-yellow-500/30 rounded-2xl p-8 hover:border-yellow-400/50 transition-all duration-300 hover:-translate-y-2 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap">✦ KI-FEATURE</span>
              </div>
              <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-2xl mb-6 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 mt-2">
                <span className="text-3xl">🎙</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">KI-Sprachdiktat</h3>
              <p className="text-slate-300 mb-6 leading-relaxed">
                Rechnung diktieren statt tippen — einfach Mikrofon-Taste halten, sprechen, fertig. Die KI füllt Kunde, Leistung und Preis automatisch aus.
              </p>
              <ul className="text-slate-400 space-y-2">
                <li>✓ <span className="text-yellow-400 font-medium">„Kunde ist Müller, Preis ist 500 Euro" — fertig</span></li>
                <li>✓ Bekannte Kunden werden automatisch erkannt</li>
                <li>✓ Deutsch, Serbisch & weitere Sprachen</li>
                <li>✓ KI-Assistent für App-Fragen inklusive</li>
              </ul>
            </div>

            {/* Feature 3 - Buchhalter Export */}
            <div className="group bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-8 hover:border-indigo-500/50 transition-all duration-300 hover:-translate-y-2">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl mb-6 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <span className="text-2xl">📂</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Buchhalter-Export</h3>
              <p className="text-slate-300 mb-6 leading-relaxed">
                Alle Rechnungen gesammelt an den Buchhalter — ein Klick, eine E-Mail, alle PDFs. DATEV kann die eingebetteten ZUGFeRD-Daten direkt importieren.
              </p>
              <ul className="text-slate-400 space-y-2">
                <li>✓ Massenversand per Knopfdruck</li>
                <li>✓ <span className="text-indigo-400 font-medium">ZUGFeRD → DATEV-Import direkt</span></li>
                <li>✓ PDF-Archiv immer verfügbar</li>
              </ul>
            </div>

            {/* Feature 4 - Digitale Visitenkarte */}
            <div className="group bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-8 hover:border-blue-500/50 transition-all duration-300 hover:-translate-y-2">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl mb-6 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <span className="text-2xl">📱</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Digitale Visitenkarte</h3>
              <p className="text-slate-300 mb-6 leading-relaxed">
                Ihr eigener Link — Kunden scannen den QR-Code und schicken direkt Anfragen mit Fotos. Kein App-Download nötig.
              </p>
              <ul className="text-slate-400 space-y-2">
                <li>✓ QR-Code automatisch generiert</li>
                <li>✓ Kundenanfragen mit Fotos empfangen</li>
                <li>✓ <span className="text-blue-400 font-medium">FREEMIUM — kostenlos für immer</span></li>
              </ul>
            </div>

            {/* Feature 5 - Kundenverwaltung */}
            <div className="group bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-8 hover:border-green-500/50 transition-all duration-300 hover:-translate-y-2">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-teal-500 rounded-2xl mb-6 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <span className="text-2xl">👥</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Kundenverwaltung</h3>
              <p className="text-slate-300 mb-6 leading-relaxed">
                Alle Kunden an einem Ort. Wird beim Erstellen einer Rechnung automatisch gespeichert — kein doppeltes Eintippen.
              </p>
              <ul className="text-slate-400 space-y-2">
                <li>✓ Auto-Speicherung bei Rechnungserstellung</li>
                <li>✓ Import/Export</li>
                <li>✓ <span className="text-green-400 font-medium">Schnelle Suche nach Name, Firma, Stadt</span></li>
              </ul>
            </div>

            {/* Feature 6 - Mahnungen + Push */}
            <div className="group bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-8 hover:border-orange-500/50 transition-all duration-300 hover:-translate-y-2">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl mb-6 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <span className="text-2xl">🔔</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Mahnungen & Benachrichtigungen</h3>
              <p className="text-slate-300 mb-6 leading-relaxed">
                Überfällige Rechnungen werden farblich markiert. Zahlungserinnerung mit einem Klick direkt aus der Rechnungsübersicht.
              </p>
              <ul className="text-slate-400 space-y-2">
                <li>✓ Mahnung per Klick aus der Übersicht</li>
                <li>✓ <span className="text-orange-400 font-medium">Push-Benachrichtigungen für neue Anfragen</span></li>
                <li>✓ Überfällige Rechnungen sofort erkennbar</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Mid-page CTA */}
      <section className="py-12 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-3">30 Tage PRO kostenlos testen</h2>
          <p className="text-slate-400 mb-8">Voller Zugriff auf alle Funktionen. Keine Abbuchung während der Testphase.</p>
          <a href="/signup" className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white px-8 py-4 rounded-full font-bold text-lg transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-blue-500/25">
            PRO jetzt testen →
          </a>
        </div>
      </section>

      {/* PDF Screenshot Placeholder + Testimonial */}
      <section className="py-16 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

            {/* PDF Screenshot */}
            <div className="relative rounded-2xl overflow-hidden shadow-2xl order-2 lg:order-1">
              <img
                src="/racun.jpg"
                alt="Pro-Meister Rechnung — ZUGFeRD PDF Beispiel"
                className="w-full h-auto rounded-2xl"
              />
            </div>

            {/* Testimonial + text */}
            <div className="order-1 lg:order-2">
              <p className="text-blue-400 font-semibold text-sm mb-4 uppercase tracking-wider">Was Handwerker sagen</p>
              <blockquote className="text-2xl sm:text-3xl font-bold text-white leading-snug mb-6">
                "Früher hab ich abends noch am Schreibtisch Rechnungen getippt. Heute erledige ich das auf dem Handy — bevor ich das Werkzeug einpacke."
              </blockquote>
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-lg">A</div>
                <div>
                  <p className="text-white font-semibold">Antonio D.</p>
                  <p className="text-slate-400 text-sm">Hausmeister · München</p>
                  <p className="text-yellow-400 text-sm mt-0.5">★★★★★</p>
                </div>
              </div>
              <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5">
                <p className="text-slate-300 text-sm leading-relaxed">
                  So sieht das Ergebnis aus — eine professionelle ZUGFeRD-Rechnung, DIN 5008 konform, mit Ihrem Logo und IBAN. Der Buchhalter liest die Daten automatisch aus, ohne manuellen Aufwand.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quote / Highlight Block */}
      <section className="py-16 px-4 sm:px-6 bg-gradient-to-r from-blue-600/10 to-orange-500/10 border-y border-orange-500/20">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-white leading-snug mb-6">
            "Pro-Meister ist kein Buchhaltungsprogramm —<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-orange-400">
              es ist das Werkzeug, das Handwerkern ihre Zeit zurückgibt.
            </span>"
          </p>
          <p className="text-slate-400 text-lg mb-10">
            Rechnungen, Angebote, Mahnungen, Kundenverwaltung — alles an einem Ort. Keine Buchhaltungskenntnisse nötig.
          </p>
          <a href="/signup" className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-orange-500 text-white px-8 py-4 rounded-full font-bold text-lg transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-orange-500/25">
            Jetzt kostenlos starten →
          </a>
        </div>
      </section>

      {/* How it works - quick 3 steps */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              In 3 Schritten einsatzbereit
            </h2>
            <p className="text-slate-400 text-lg">Keine Installation. Kein Vertrag. Keine versteckten Kosten.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold text-2xl">1</div>
              <h3 className="text-white font-semibold text-xl mb-2">Registrieren</h3>
              <p className="text-slate-400">E-Mail-Adresse eingeben — in 2 Minuten startklar. 30 Tage PRO kostenlos.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold text-2xl">2</div>
              <h3 className="text-white font-semibold text-xl mb-2">Einrichten</h3>
              <p className="text-slate-400">Firmenname, Steuernummer, IBAN — einmal eingeben, auf jeder Rechnung automatisch.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold text-2xl">3</div>
              <h3 className="text-white font-semibold text-xl mb-2">Erste Rechnung</h3>
              <p className="text-slate-400">Kunde auswählen, Leistung eintippen, absenden. Buchhalter bekommt sie automatisch als ZUGFeRD-PDF.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-6 bg-slate-800/20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Einfache Preisgestaltung
            </h2>
            <p className="text-xl text-slate-300">
              Freemium kostenlos für immer · PRO: 30 Tage kostenlos testen
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">

            {/* PRO Plan */}
            <div className="bg-gradient-to-br from-blue-500/10 to-orange-500/10 border-2 border-blue-500/50 rounded-2xl p-8 relative transform scale-105">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-gradient-to-r from-blue-600 to-orange-500 text-white px-4 py-1 rounded-full text-sm font-bold whitespace-nowrap">EMPFOHLEN</span>
              </div>
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-white mb-4">PRO</h3>
                <div className="mb-6">
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="text-4xl font-bold text-white">19,90€</span>
                    <span className="text-slate-400">/Monat</span>
                  </div>
                  <p className="text-slate-400 text-xs mt-0.5">zzgl. 19% MwSt.</p>
                </div>
                <p className="text-slate-300">Vollzugang zu allen Funktionen</p>
              </div>
              <div className="space-y-3 mb-8">
                {[
                  'Alles aus Freemium',
                  'Rechnungen & Angebote (ZUGFeRD)',
                  'Angebot → Rechnung (1-Klick)',
                  'Buchhalter-Export per Knopfdruck',
                  'Kundenverwaltung',
                  'Mahnungen versenden',
                  'PDF-Archiv',
                  '✦ KI-Assistent',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs">✓</span>
                    </div>
                    <span className="text-slate-300 text-sm">{item}</span>
                  </div>
                ))}
              </div>
              <a href="/signup" className="w-full bg-gradient-to-r from-blue-600 to-orange-500 text-white px-6 py-3 rounded-lg font-bold hover:opacity-90 transition-opacity block text-center">
                30 Tage kostenlos testen
              </a>
            </div>

            {/* Freemium Plan */}
            <div className="bg-slate-800/50 border border-slate-600 rounded-2xl p-8">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-white mb-4">FREEMIUM</h3>
                <div className="flex items-baseline justify-center gap-2 mb-6">
                  <span className="text-4xl font-bold text-white">0€</span>
                  <span className="text-slate-400">/für immer</span>
                </div>
                <p className="text-slate-300">Digitale Visitenkarte — kostenlos für immer</p>
                <p className="text-blue-400 text-sm mt-2 font-medium">🎁 7 Tage alle PRO-Funktionen gratis</p>
              </div>
              <div className="space-y-3 mb-8">
                {[
                  'QR-Visitenkarte',
                  'Kundenanfragen mit Fotos empfangen',
                  'Basis-Profil',
                  '✦ KI-Assistent',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs">✓</span>
                    </div>
                    <span className="text-slate-300 text-sm">{item}</span>
                  </div>
                ))}
              </div>
              <a href="/signup" className="w-full bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg font-bold transition-colors block text-center">
                Nur QR-Visitenkarte nutzen
              </a>
            </div>
          </div>

          {/* Trial Explanation */}
          <div className="max-w-3xl mx-auto mt-12 bg-blue-500/10 border border-blue-500/20 rounded-2xl p-8 text-center">
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-xl">30</span>
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">30 Tage PRO-Probezeitraum</h3>
            <p className="text-blue-200 mb-6 text-lg">
              Nach der Registrierung haben Sie 30 Tage Vollzugang zu allen PRO-Funktionen.
              Danach wählen Sie zwischen Freemium (kostenlos) oder PRO (19,90€/Monat zzgl. MwSt.).
            </p>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="bg-slate-800/50 rounded-lg p-4">
                <div className="text-blue-300 font-semibold mb-2">Tag 1–30</div>
                <div className="text-slate-300">Vollzugang zu PRO-Funktionen</div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-4">
                <div className="text-green-300 font-semibold mb-2">Nach 30 Tagen</div>
                <div className="text-slate-300">Freemium (nur QR-Karte)</div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-4">
                <div className="text-blue-300 font-semibold mb-2">Upgrade</div>
                <div className="text-slate-300">PRO: Jederzeit aktivieren</div>
              </div>
            </div>
          </div>

          <div className="text-center mt-8">
            <p className="text-slate-400 text-sm">
              Alle Preise zzgl. 19% MwSt. • 30 Tage Probezeitraum • Jederzeit kündbar • 14 Tage Geld-zurück-Garantie
            </p>
          </div>
        </div>
      </section>

      {/* Benefits strip */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-bold text-white mb-4">
              Warum Handwerker Pro-Meister wählen
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🇩🇪</span>
              </div>
              <h3 className="text-white font-semibold mb-2">Deutsche Standards</h3>
              <p className="text-slate-400 text-sm">ZUGFeRD 2.4, DIN 5008 — DATEV-kompatibel</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⚡</span>
              </div>
              <h3 className="text-white font-semibold mb-2">Sofort einsatzbereit</h3>
              <p className="text-slate-400 text-sm">In 2 Minuten erste Rechnung erstellt</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🔒</span>
              </div>
              <h3 className="text-white font-semibold mb-2">DSGVO-konform</h3>
              <p className="text-slate-400 text-sm">EU-Server, SSL-Verschlüsselung, tägliche Backups</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📱</span>
              </div>
              <h3 className="text-white font-semibold mb-2">Mobil optimiert</h3>
              <p className="text-slate-400 text-sm">Handy, Tablet, PC — keine App nötig</p>
            </div>
          </div>
        </div>
      </section>

      {/* ZUGFeRD Validator CTA */}
      <section className="py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 sm:p-10 flex flex-col sm:flex-row items-center gap-6">
            <div className="flex-1 text-center sm:text-left">
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
                ZUGFeRD Validator — kostenlos
              </h3>
              <p className="text-slate-400">
                Prüfen Sie jede PDF-Rechnung auf ZUGFeRD / Factur-X / EN16931 Konformität. Sofort, ohne Registrierung.
              </p>
            </div>
            <a
              href="/zugferd-validator"
              className="shrink-0 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors"
            >
              Jetzt prüfen →
            </a>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4">Häufige Fragen</h2>
            <p className="text-slate-400 text-lg">Alles, was Sie vor der Registrierung wissen möchten.</p>
          </div>
          <div className="space-y-4">
            {[
              {
                q: "Brauche ich eine Kreditkarte für die Testphase?",
                a: "Für Freemium (QR-Visitenkarte) wird keine Kreditkarte benötigt — kostenlos für immer. Für den 30-tägigen PRO-Test ist eine Kreditkarte erforderlich. Sie können jederzeit vor Ablauf kündigen.",
              },
              {
                q: "Was passiert nach den 30 Tagen?",
                a: "Nach der Testphase wechseln Sie automatisch in den Freemium-Plan (QR-Visitenkarte kostenlos). Ihre Daten bleiben erhalten. PRO können Sie jederzeit über die Einstellungen aktivieren.",
              },
              {
                q: "Ist Pro-Meister wirklich DATEV-kompatibel?",
                a: "Ja. Jede Rechnung wird im ZUGFeRD 2.4-Format erstellt — DATEV kann die eingebetteten Daten direkt importieren, ohne manuelle Eingabe. Ihr Buchhalter bekommt alles per Knopfdruck.",
              },
              {
                q: "Was kann der KI-Assistent?",
                a: "Der KI-Assistent beantwortet alle Fragen zur App — Funktionen, Einstellungen, Rechnungsdetails. Direkt in Pro-Meister erreichbar, rund um die Uhr. In allen Plänen inklusive.",
              },
              {
                q: "Kann ich jederzeit kündigen?",
                a: "Ja — direkt über die Einstellungen in Ihrem Konto, ohne Anruf oder E-Mail. Kein Vertrag, keine Mindestlaufzeit.",
              },
            ].map(({ q, a }) => (
              <div key={q} className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                <h3 className="text-white font-semibold mb-2">{q}</h3>
                <p className="text-slate-400 leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 px-6 bg-slate-800/20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Mehr Zeit für die Arbeit.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-orange-400">
              Weniger Zeit am Schreibtisch.
            </span>
          </h2>
          <p className="text-xl text-slate-300 mb-4 max-w-2xl mx-auto">
            Registrieren Sie sich heute — 30 Tage Vollzugang zu allen PRO-Funktionen. Danach 19,90€/Monat oder kostenlos im Freemium bleiben.
          </p>
          <p className="text-slate-400 mb-10">
            Nicht überzeugt? Die QR-Visitenkarte ist für immer kostenlos.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/signup" className="bg-gradient-to-r from-blue-600 to-orange-500 text-white px-10 py-4 rounded-full font-bold text-lg transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-orange-500/25">
              30 Tage kostenlos testen →
            </a>
            <a href="/faq" className="border-2 border-slate-600 text-white px-10 py-4 rounded-full font-bold text-lg hover:bg-slate-800 transition-all duration-300">
              Fragen? FAQ ansehen
            </a>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 mt-8">
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <span>🔒</span> SSL-verschlüsselt
            </div>
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <span>🇩🇪</span> Deutsche Server
            </div>
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <span className="text-green-400">✓</span> DSGVO-konform
            </div>
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <span className="text-blue-400">↩</span> 14 Tage Geld-zurück
            </div>
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <span className="text-green-400">✓</span> Freemium ohne Kreditkarte
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <img src="/logo.png" alt="Pro-Meister Logo" className="w-7 h-7" />
                <span className="text-2xl font-bold text-white">Pro-meister<span className="text-blue-400">.de</span></span>
              </div>
              <p className="text-slate-400">
                Der digitale Assistent für Handwerker. Rechnungen, Angebote und Kundenverwaltung — ohne Buchhaltungskenntnisse.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Produkt</h4>
              <div className="space-y-2">
                <a href="#features" className="block text-slate-400 hover:text-white transition-colors">Funktionen</a>
                <a href="#pricing" className="block text-slate-400 hover:text-white transition-colors">Preise</a>
                <a href="/login" className="block text-slate-400 hover:text-white transition-colors">Anmelden</a>
                <a href="/signup" className="block text-slate-400 hover:text-white transition-colors">Registrieren</a>
                <a href="/zugferd-validator" className="block text-slate-400 hover:text-white transition-colors">ZUGFeRD Validator <span className="text-green-400 text-xs">kostenlos</span></a>
              </div>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Support</h4>
              <div className="space-y-2">
                <a href="/faq" className="block text-slate-400 hover:text-white transition-colors">Hilfe & FAQ</a>
                <a href="mailto:support@pro-meister.de?subject=Anfrage%20von%20pro-meister.de" className="block text-slate-400 hover:text-white transition-colors">E-Mail Support</a>
              </div>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Rechtliches</h4>
              <div className="space-y-2">
                <a href="/privacy" className="block text-slate-400 hover:text-white transition-colors">Datenschutz</a>
                <a href="/terms" className="block text-slate-400 hover:text-white transition-colors">AGB</a>
                <a href="/imprint" className="block text-slate-400 hover:text-white transition-colors">Impressum</a>
                <a href="/refund" className="block text-slate-400 hover:text-white transition-colors">Rückerstattung</a>
              </div>
            </div>
          </div>
          <div className="border-t border-slate-800 mt-12 pt-8 text-center text-slate-400">
            <p className="text-xs opacity-60 mb-2">
              DATEV ist eine eingetragene Marke der DATEV eG. Wir sind kein zertifizierter DATEV-Partner und stehen in keiner geschäftlichen Verbindung zu DATEV. Die ZUGFeRD-Kompatibilität basiert auf dem offenen ZUGFeRD-Standard.
            </p>
            <p>&copy; {new Date().getFullYear()} pro-meister.de — Der digitale Assistent für Handwerker</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
