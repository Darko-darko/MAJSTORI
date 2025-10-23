export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/10 backdrop-blur-md border-b border-white/10 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-3 sm:py-4 gap-3 sm:gap-0">
            <div className="text-xl sm:text-2xl font-bold text-white text-center sm:text-left">
              Pro-meister<span className="text-blue-400">.de</span>
            </div>
            <div className="flex gap-2 sm:gap-4 justify-center items-center">
              <a
                href="/faq"
                className="text-white/80 hover:text-white px-3 sm:px-4 py-2 transition-colors text-sm sm:text-base"
              >
                FAQ
              </a>
              <a
                href="/login"
                className="text-white/80 hover:text-white px-3 sm:px-4 py-2 transition-colors text-sm sm:text-base"
              >
                Anmelden
              </a>
              <a
                href="/signup"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-6 py-2 rounded-full font-medium transition-all duration-300 hover:scale-105 text-sm sm:text-base"
              >
                Registrieren
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 sm:pt-28 md:pt-32 pb-12 sm:pb-16 md:pb-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-3 sm:px-4 py-2 mb-6 sm:mb-8">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-blue-300 text-xs sm:text-sm font-medium">ZUGFeRD 2.1 • DIN 5008 • SEPA QR-Codes</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-extrabold text-white mb-4 sm:mb-6 leading-tight">
            Professionelle
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
              Rechnungen & Angebote
            </span>
            <span className="block sm:inline"> für Handwerker</span>
          </h1>

          {/* Subheadline */}
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-slate-300 mb-8 sm:mb-10 md:mb-12 max-w-3xl mx-auto leading-relaxed px-2">
            ZUGFeRD-Rechnungen in Sekunden erstellen. Mit QR-Visitenkarte, automatischer Nummerierung und direktem E-Mail-Versand.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-10 sm:mb-12 md:mb-16 px-2">
            <a
              href="/signup"
              className="group bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-full font-semibold text-base sm:text-lg transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-blue-500/25"
            >
              30 Tage kostenlos testen
              <span className="ml-2 group-hover:translate-x-1 transition-transform duration-300">→</span>
            </a>
            <a
              href="#features"
              className="border-2 border-white/20 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-full font-semibold text-base sm:text-lg hover:bg-white/10 transition-all duration-300"
            >
              Funktionen ansehen
            </a>
          </div>

          {/* Hero Demo - Key Features */}
          <div className="relative max-w-4xl mx-auto px-2">
            <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 border border-slate-600 shadow-2xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 text-left">
                <div className="bg-slate-900 rounded-lg p-4 sm:p-6 border border-slate-600">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-500 rounded-lg mb-3 sm:mb-4 flex items-center justify-center">
                    <span className="text-white font-bold text-lg sm:text-xl">📄</span>
                  </div>
                  <h3 className="text-white font-semibold mb-2 text-sm sm:text-base">ZUGFeRD Rechnungen</h3>
                  <p className="text-slate-400 text-xs sm:text-sm">E-Rechnungen • Automatische Buchung</p>
                </div>
                <div className="bg-slate-900 rounded-lg p-4 sm:p-6 border border-slate-600">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-500 rounded-lg mb-3 sm:mb-4 flex items-center justify-center">
                    <span className="text-white font-bold text-lg sm:text-xl">QR</span>
                  </div>
                  <h3 className="text-white font-semibold mb-2 text-sm sm:text-base">QR-Visitenkarte</h3>
                  <p className="text-slate-400 text-xs sm:text-sm">Digital • Immer aktuell • Umweltfreundlich</p>
                </div>
                <div className="bg-slate-900 rounded-lg p-4 sm:p-6 border border-slate-600 sm:col-span-2 md:col-span-1">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-500 rounded-lg mb-3 sm:mb-4 flex items-center justify-center">
                    <span className="text-white font-bold text-lg sm:text-xl">€</span>
                  </div>
                  <h3 className="text-white font-semibold mb-2 text-sm sm:text-base">SEPA QR-Codes</h3>
                  <p className="text-slate-400 text-xs sm:text-sm">Sofortige Zahlung • Banking-App</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Alles für Ihre
              <span className="text-blue-400"> Rechnungsstellung</span>
            </h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              Deutsche Standards • ZUGFeRD 2.1 • DIN 5008 • SEPA Integration
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            
            {/* Feature 1 - ZUGFeRD (MAIN) */}
            <div className="group bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-2 border-purple-500/30 rounded-2xl p-8 hover:border-purple-400/50 transition-all duration-300 hover:-translate-y-2 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-purple-500 text-white px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap">HAUPTPRODUKT</span>
              </div>
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl mb-6 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 mt-2">
                <span className="text-2xl">📄</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">ZUGFeRD Rechnungen</h3>
              <p className="text-slate-300 mb-6 leading-relaxed">
                E-Rechnungsstandard ZUGFeRD 2.1. Automatische Verarbeitung in Buchhaltungssoftware. Gesetzlich konform.
              </p>
              <ul className="text-slate-400 space-y-2">
                <li>✓ PDF + XML in einer Datei</li>
                <li>✓ Automatische Buchung</li>
                <li>✓ <span className="text-purple-400 font-medium">DIN 5008 Standard</span></li>
              </ul>
            </div>

            {/* Feature 2 - QR Visitenkarte */}
            <div className="group bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-8 hover:border-blue-500/50 transition-all duration-300 hover:-translate-y-2">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl mb-6 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <span className="text-2xl">📱</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Digitale Visitenkarte</h3>
              <p className="text-slate-300 mb-6 leading-relaxed">
                QR-Code mit allen Kontaktdaten. Kunden scannen und können sofort Anfragen mit Fotos senden.
              </p>
              <ul className="text-slate-400 space-y-2">
                <li>✓ QR-Code automatisch generiert</li>
                <li>✓ Kundenanfragen mit Fotos</li>
                <li>✓ <span className="text-blue-400 font-medium">FREEMIUM verfügbar</span></li>
              </ul>
            </div>

            {/* Feature 3 - SEPA QR-Codes */}
            <div className="group bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-8 hover:border-green-500/50 transition-all duration-300 hover:-translate-y-2">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl mb-6 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <span className="text-2xl">€</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">SEPA QR-Codes</h3>
              <p className="text-slate-300 mb-6 leading-relaxed">
                QR-Codes für sofortige Überweisung. Kunden scannen mit Banking-App und zahlen in Sekunden.
              </p>
              <ul className="text-slate-400 space-y-2">
                <li>✓ GiroCode Standard</li>
                <li>✓ Sofortige Zahlung</li>
                <li>✓ <span className="text-green-400 font-medium">Auf jeder Rechnung</span></li>
              </ul>
            </div>

            {/* Feature 4 - Kundenverwaltung */}
            <div className="group bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-8 hover:border-blue-500/50 transition-all duration-300 hover:-translate-y-2">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl mb-6 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <span className="text-2xl">👥</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Kundenverwaltung</h3>
              <p className="text-slate-300 mb-6 leading-relaxed">
                Alle Kunden an einem Ort. Import/Export, Suche und automatische Speicherung bei Rechnungserstellung.
              </p>
              <ul className="text-slate-400 space-y-2">
                <li>✓ Import/Export</li>
                <li>✓ Schnelle Suche</li>
                <li>✓ Auto-Speicherung</li>
              </ul>
            </div>

            {/* Feature 5 - Angebote & Rechnungen */}
            <div className="group bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-8 hover:border-blue-500/50 transition-all duration-300 hover:-translate-y-2">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl mb-6 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <span className="text-2xl">📋</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Angebote erstellen</h3>
              <p className="text-slate-300 mb-6 leading-relaxed">
                Professionelle Angebote in Sekunden. Mit einem Klick in Rechnung umwandeln.
              </p>
              <ul className="text-slate-400 space-y-2">
                <li>✓ Angebot → Rechnung (1-Klick)</li>
                <li>✓ Automatische Nummerierung</li>
                <li>✓ DIN 5008 konform</li>
              </ul>
            </div>

            {/* Feature 6 - PDF Archiv */}
            <div className="group bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-8 hover:border-blue-500/50 transition-all duration-300 hover:-translate-y-2">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl mb-6 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <span className="text-2xl">📂</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">PDF-Archiv</h3>
              <p className="text-slate-300 mb-6 leading-relaxed">
                Automatische Archivierung aller Dokumente. Suche, Filter und Massenversand an Buchhalter.
              </p>
              <ul className="text-slate-400 space-y-2">
                <li>✓ Automatische Speicherung</li>
                <li>✓ Massenversand an Buchhalter</li>
                <li>✓ <span className="text-indigo-400 font-medium">Nach Kündigung zugänglich</span></li>
              </ul>
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
              30 Tage kostenlos alle PRO-Funktionen testen
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Freemium Plan */}
            <div className="bg-slate-800/50 border border-slate-600 rounded-2xl p-8">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-white mb-4">FREEMIUM</h3>
                <div className="flex items-baseline justify-center gap-2 mb-6">
                  <span className="text-4xl font-bold text-white">0€</span>
                  <span className="text-slate-400">/für immer</span>
                </div>
                <p className="text-slate-300">
                  Digitale Visitenkarte für immer kostenlos
                </p>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <span className="text-slate-300">QR-Visitenkarte</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <span className="text-slate-300">Kundenanfragen empfangen</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <span className="text-slate-300">Basis-Profil</span>
                </div>
              </div>

              <a
                href="/signup"
                className="w-full bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg font-bold transition-colors block text-center"
              >
                Kostenlos starten
              </a>
            </div>

            {/* PRO Plan */}
            <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-2 border-blue-500/50 rounded-2xl p-8 relative transform scale-105">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-1 rounded-full text-sm font-bold whitespace-nowrap">EMPFOHLEN</span>
              </div>
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-white mb-4">PRO</h3>
                <div className="flex items-baseline justify-center gap-2 mb-6">
                  <span className="text-4xl font-bold text-white">19,90€</span>
                  <span className="text-slate-400">/Monat</span>
                </div>
                <p className="text-slate-300">
                  Vollzugang zu allen Funktionen
                </p>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <span className="text-slate-300">Alles aus Freemium</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <span className="text-slate-300">ZUGFeRD 2.1 Rechnungen</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <span className="text-slate-300">SEPA QR-Codes</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <span className="text-slate-300">Kundenverwaltung</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <span className="text-slate-300">Angebote erstellen</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <span className="text-slate-300">PDF-Archiv</span>
                </div>
              </div>

              <a
                href="/signup"
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-bold hover:opacity-90 transition-opacity block text-center"
              >
                30 Tage kostenlos testen
              </a>
            </div>

            {/* PRO+ Plan */}
            <div className="bg-slate-800/30 border border-slate-600/50 rounded-2xl p-8 opacity-75 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap">BALD VERFÜGBAR</span>
              </div>
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-white mb-4">PRO+</h3>
                <div className="flex items-baseline justify-center gap-2 mb-6">
                  <span className="text-4xl font-bold text-slate-400">39,90€</span>
                  <span className="text-slate-500">/Monat</span>
                </div>
                <p className="text-slate-400">
                  Enterprise-Lösung
                </p>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <span className="text-slate-400">Alles aus PRO</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs">○</span>
                  </div>
                  <span className="text-slate-400">Terminplaner</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs">○</span>
                  </div>
                  <span className="text-slate-400">Erweiterte Analytics</span>
                </div>
              </div>

              <button
                disabled
                className="w-full bg-slate-600 text-slate-400 px-6 py-3 rounded-lg font-semibold cursor-not-allowed"
              >
                Bald verfügbar
              </button>
            </div>
          </div>

          {/* Trial Explanation */}
          <div className="max-w-3xl mx-auto mt-12 bg-blue-500/10 border border-blue-500/20 rounded-2xl p-8 text-center">
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-xl">30</span>
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">
              30 Tage PRO-Probezeitraum
            </h3>
            <p className="text-blue-200 mb-6 text-lg">
              Nach der Registrierung haben Sie 30 Tage Vollzugang zu allen PRO-Funktionen. 
              Danach wählen Sie zwischen Freemium (kostenlos) oder PRO (19,90€/Monat + MwSt.).
            </p>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="bg-slate-800/50 rounded-lg p-4">
                <div className="text-blue-300 font-semibold mb-2">Tag 1-30</div>
                <div className="text-slate-300">Vollzugang zu PRO-Funktionen</div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-4">
                <div className="text-green-300 font-semibold mb-2">Nach 30 Tagen</div>
                <div className="text-slate-300">Freemium (nur QR-Karte)</div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-4">
                <div className="text-purple-300 font-semibold mb-2">Upgrade</div>
                <div className="text-slate-300">PRO: Jederzeit aktivieren</div>
              </div>
            </div>
          </div>

          {/* Note */}
          <div className="text-center mt-12">
            <p className="text-slate-400 text-sm">
              Alle Preise zzgl. 19% MwSt. • 30 Tage Probezeitraum • Jederzeit kündbar
            </p>
          </div>
        </div>
      </section>

      {/* Social Proof / Benefits Section */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-6">
              Warum deutsche Handwerker uns wählen
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🇩🇪</span>
              </div>
              <h3 className="text-white font-semibold mb-2">Deutsche Standards</h3>
              <p className="text-slate-400 text-sm">ZUGFeRD 2.1 & DIN 5008 konform</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⚡</span>
              </div>
              <h3 className="text-white font-semibold mb-2">Sofort einsatzbereit</h3>
              <p className="text-slate-400 text-sm">In 2 Minuten erste Rechnung</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">💶</span>
              </div>
              <h3 className="text-white font-semibold mb-2">Schnelle Zahlung</h3>
              <p className="text-slate-400 text-sm">SEPA QR-Codes für sofortige Überweisung</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📱</span>
              </div>
              <h3 className="text-white font-semibold mb-2">Mobil optimiert</h3>
              <p className="text-slate-400 text-sm">Perfekt auf Handy & Tablet</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-slate-800/20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Bereit für professionelle Rechnungen?
          </h2>
          <p className="text-xl text-slate-300 mb-12 max-w-2xl mx-auto">
            Registrieren Sie sich heute und erhalten Sie 30 Tage Vollzugang zu allen PRO-Funktionen.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/signup"
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-10 py-4 rounded-full font-bold text-lg transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-blue-500/25"
            >
              30 Tage kostenlos testen
            </a>
            <a
              href="/faq"
              className="border-2 border-slate-600 text-white px-10 py-4 rounded-full font-bold text-lg hover:bg-slate-800 transition-all duration-300"
            >
              Fragen? FAQ ansehen
            </a>
          </div>

          <p className="text-slate-400 text-sm mt-6">
            ✨ 30 Tage Probezeitraum • Deutsche Server • DSGVO konform
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="text-2xl font-bold text-white mb-4">
                Pro-meister<span className="text-blue-400">.de</span>
              </div>
              <p className="text-slate-400">
                Professionelle Rechnungslösung für deutsche Handwerker. ZUGFeRD 2.1 konform.
              </p>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Produkt</h4>
              <div className="space-y-2">
                <a href="#features" className="block text-slate-400 hover:text-white transition-colors">Funktionen</a>
                <a href="#pricing" className="block text-slate-400 hover:text-white transition-colors">Preise</a>
                <a href="/login" className="block text-slate-400 hover:text-white transition-colors">Anmelden</a>
                <a href="/signup" className="block text-slate-400 hover:text-white transition-colors">Registrieren</a>
              </div>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Support</h4>
              <div className="space-y-2">
                <a href="/faq" className="block text-slate-400 hover:text-white transition-colors">Hilfe & FAQ</a>
                <a href="mailto:support@pro-meister.de" className="block text-slate-400 hover:text-white transition-colors">E-Mail Support</a>
                <a href="/contact" className="block text-slate-400 hover:text-white transition-colors">Kontakt</a>
              </div>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Rechtliches</h4>
              <div className="space-y-2">
                <a href="/privacy" className="block text-slate-400 hover:text-white transition-colors">Datenschutz</a>
                <a href="/terms" className="block text-slate-400 hover:text-white transition-colors">AGB</a>
                <a href="/imprint" className="block text-slate-400 hover:text-white transition-colors">Impressum</a>
              </div>
            </div>
          </div>
          
          <div className="border-t border-slate-800 mt-12 pt-8 text-center text-slate-400">
            <p>&copy; {new Date().getFullYear()} pro-meister.de - ZUGFeRD 2.1 Rechnungslösung für Handwerker</p>
          </div>
        </div>
      </footer>
    </div>
  );
}