export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Navigation - FIXED ZA MOBILNI */}
      <nav className="fixed top-0 w-full bg-white/10 backdrop-blur-md border-b border-white/10 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          {/* Mobile: Dva reda */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-3 sm:py-4 gap-3 sm:gap-0">
            {/* Logo - uvek na vrhu */}
            <div className="text-xl sm:text-2xl font-bold text-white text-center sm:text-left">
              Pro-meister<span className="text-blue-400">.de</span>
            </div>
            
            {/* Dugmad - ispod na mobilnom */}
            <div className="flex gap-2 sm:gap-4 justify-center">
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

      {/* Hero Section - ADJUSTED PADDING ZA MOBILNI */}
      <section className="pt-32 sm:pt-28 md:pt-32 pb-12 sm:pb-16 md:pb-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto text-center">
          {/* Badge - SPUŠTEN MALO DOLE */}
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-3 sm:px-4 py-2 mb-6 sm:mb-8">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-blue-300 text-xs sm:text-sm font-medium">Deutsche Rechnungsstandards • ZUGFeRD 2.1 konform</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-extrabold text-white mb-4 sm:mb-6 leading-tight">
            Professionelle
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
              Rechnungen
            </span>
            <span className="block sm:inline"> für Handwerker</span>
          </h1>

          {/* Subheadline */}
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-slate-300 mb-8 sm:mb-10 md:mb-12 max-w-3xl mx-auto leading-relaxed px-2">
            Digitale Visitenkarte mit QR-Code + rechtskonforme PDF-Rechnungen in Sekunden. 
            Automatische Nummerierung, SEPA QR-Codes und direkter E-Mail-Versand.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-10 sm:mb-12 md:mb-16 px-2">
            <a
              href="/signup"
              className="group bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-full font-semibold text-base sm:text-lg transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-blue-500/25"
            >
              Kostenlos registrieren
              <span className="ml-2 group-hover:translate-x-1 transition-transform duration-300">→</span>
            </a>
            <a
              href="#features"
              className="border-2 border-white/20 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-full font-semibold text-base sm:text-lg hover:bg-white/10 transition-all duration-300"
            >
              Funktionen ansehen
            </a>
          </div>

          {/* Hero Demo */}
          <div className="relative max-w-4xl mx-auto px-2">
            <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 border border-slate-600 shadow-2xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 text-left">
                <div className="bg-slate-900 rounded-lg p-4 sm:p-6 border border-slate-600">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-500 rounded-lg mb-3 sm:mb-4 flex items-center justify-center">
                    <span className="text-white font-bold text-lg sm:text-xl">QR</span>
                  </div>
                  <h3 className="text-white font-semibold mb-2 text-sm sm:text-base">QR-Visitenkarte</h3>
                  <p className="text-slate-400 text-xs sm:text-sm">Kunden scannen & senden Anfragen</p>
                </div>
                <div className="bg-slate-900 rounded-lg p-4 sm:p-6 border border-slate-600">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-500 rounded-lg mb-3 sm:mb-4 flex items-center justify-center">
                    <span className="text-white font-bold text-lg sm:text-xl">📄</span>
                  </div>
                  <h3 className="text-white font-semibold mb-2 text-sm sm:text-base">PDF Rechnungen</h3>
                  <p className="text-slate-400 text-xs sm:text-sm">ZUGFeRD 2.1 • Automatische Nummerierung</p>
                </div>
                <div className="bg-slate-900 rounded-lg p-4 sm:p-6 border border-slate-600 sm:col-span-2 md:col-span-1">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-500 rounded-lg mb-3 sm:mb-4 flex items-center justify-center">
                    <span className="text-white font-bold text-lg sm:text-xl">€</span>
                  </div>
                  <h3 className="text-white font-semibold mb-2 text-sm sm:text-base">SEPA Zahlung</h3>
                  <p className="text-slate-400 text-xs sm:text-sm">QR-Code für sofortiges Bezahlen</p>
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
              Rechtskonforme Rechnungen
              <span className="text-blue-400"> in Sekunden</span>
            </h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              Deutsche Standards • ZUGFeRD 2.1 • Automatische Workflows • SEPA Integration
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            
            {/* Feature 1 - QR Visitenkarte */}
            <div className="group bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-8 hover:border-blue-500/50 transition-all duration-300 hover:-translate-y-2">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl mb-6 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <span className="text-2xl">📱</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Digitale Visitenkarte</h3>
              <p className="text-slate-300 mb-6 leading-relaxed">
                QR-Code mit allen Kontaktdaten und Services. Kunden scannen und können sofort Anfragen mit Fotos senden.
              </p>
              <ul className="text-slate-400 space-y-2">
                <li>✓ QR-Code automatisch generiert</li>
                <li>✓ Logo und Firmendaten</li>
                <li>✓ <span className="text-blue-400 font-medium">FREEMIUM verfügbar</span></li>
              </ul>
            </div>

            {/* Feature 2 - Rechnungen (Main Feature) */}
            <div className="group bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-2 border-purple-500/30 rounded-2xl p-8 hover:border-purple-400/50 transition-all duration-300 hover:-translate-y-2 relative">
              {/* Badge - Responsive pozicija */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 sm:top-4 sm:left-auto sm:right-4 sm:translate-x-0">
                <span className="bg-purple-500 text-white px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap">HAUPTPRODUKT</span>
              </div>
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl mb-6 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 mt-2 sm:mt-0">
                <span className="text-2xl">📄</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Professionelle Rechnungen</h3>
              <p className="text-slate-300 mb-6 leading-relaxed">
                Deutsche Rechnungsstandards (ZUGFeRD 2.1). Automatische Nummerierung, PDF-Export und E-Mail-Versand.
              </p>
              <ul className="text-slate-400 space-y-2">
                <li>✓ ZUGFeRD 2.1 konform</li>
                <li>✓ Automatische RE-2025-001 Nummerierung</li>
                <li>✓ SEPA QR-Codes für schnelle Zahlung</li>
                <li>✓ Angebote → Rechnungen Workflow</li>
              </ul>
            </div>

            {/* Feature 3 - Kundenanfragen */}
            <div className="group bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-8 hover:border-green-500/50 transition-all duration-300 hover:-translate-y-2">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl mb-6 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <span className="text-2xl">📸</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Kundenanfragen mit Fotos</h3>
              <p className="text-slate-300 mb-6 leading-relaxed">
                Kunden senden Anfragen direkt über QR-Code mit bis zu 5 Fotos. Sie sehen den Schaden vor dem Besuch.
              </p>
              <ul className="text-slate-400 space-y-2">
                <li>✓ Bis zu 5 Fotos pro Anfrage</li>
                <li>✓ Detaillierte Problembeschreibung</li>
                <li>✓ Sofortige E-Mail-Benachrichtigung</li>
              </ul>
            </div>

            {/* Feature 4 - Kundenverwaltung */}
            <div className="group bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-8 hover:border-cyan-500/50 transition-all duration-300 hover:-translate-y-2">
              <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-2xl mb-6 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <span className="text-2xl">👥</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Kundenverwaltung</h3>
              <p className="text-slate-300 mb-6 leading-relaxed">
                Zentrale Verwaltung aller Kunden mit Kontakthistorie, automatischer Rechnungszuordnung und Export-Funktionen.
              </p>
              <ul className="text-slate-400 space-y-2">
                <li>✓ Unbegrenzte Kundenanzahl</li>
                <li>✓ Kontakthistorie und Notizen</li>
                <li>✓ CSV Import/Export</li>
              </ul>
            </div>

            {/* Feature 5 - Services Management */}
            <div className="group bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-8 hover:border-orange-500/50 transition-all duration-300 hover:-translate-y-2">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl mb-6 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <span className="text-2xl">🔧</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Services Verwaltung</h3>
              <p className="text-slate-300 mb-6 leading-relaxed">
                Definieren Sie Ihre Dienstleistungen mit Standardpreisen. Schnelle Rechnungserstellung per Autocomplete.
              </p>
              <ul className="text-slate-400 space-y-2">
                <li>✓ Unbegrenzte Services</li>
                <li>✓ Standard-Preise festlegen</li>
                <li>✓ Autocomplete in Rechnungen</li>
              </ul>
            </div>

            {/* Feature 6 - Coming Soon Features */}
            <div className="group bg-slate-800/30 backdrop-blur-sm border border-slate-600/50 rounded-2xl p-8 opacity-75 relative">
              {/* Badge - Responsive pozicija */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 sm:static sm:translate-x-0 sm:mb-2">
                <span className="bg-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap">BALD VERFÜGBAR</span>
              </div>
              <div className="w-16 h-16 bg-gradient-to-br from-slate-500 to-slate-600 rounded-2xl mb-6 flex items-center justify-center mt-2 sm:mt-0">
                <span className="text-2xl">🚀</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">
                Weitere Features
              </h3>
              <p className="text-slate-400 mb-6 leading-relaxed">
                Planner für Terminverwaltung und Referral-System für passives Einkommen kommen bald.
              </p>
              <ul className="text-slate-500 space-y-2">
                <li>○ Terminplaner & Kalender</li>
                <li>○ Referral System</li>
                <li>○ Erweiterte Analytics</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Einfache, transparente Preise
            </h2>
            <p className="text-xl text-slate-300 mb-12">
              Jeder Nutzer erhält 7 Tage kostenlosen Vollzugang. Danach wählen Sie Ihren Plan.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            
            {/* Freemium Plan */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-white mb-4">Freemium</h3>
                <div className="flex items-baseline justify-center gap-2 mb-6">
                  <span className="text-4xl font-bold text-white">Kostenlos</span>
                </div>
                <p className="text-slate-300">
                  Nur QR-Visitenkarte (nach Trial-Periode)
                </p>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <span className="text-slate-300">QR-Code Visitenkarte</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <span className="text-slate-300">Kontaktdaten & Services anzeigen</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-slate-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-slate-400 text-xs">✗</span>
                  </div>
                  <span className="text-slate-500">Keine Kundenanfragen</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-slate-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-slate-400 text-xs">✗</span>
                  </div>
                  <span className="text-slate-500">Keine Rechnungsfunktion</span>
                </div>
              </div>

              <a
                href="/signup"
                className="w-full bg-slate-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-slate-700 transition-colors block text-center"
              >
                Kostenlos starten
              </a>
            </div>

            {/* PRO Plan - Popular */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-blue-500 rounded-2xl p-8 relative">
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-2 rounded-full text-sm font-bold">
                  EMPFOHLEN
                </div>
              </div>

              <div className="text-center mb-8 pt-4">
                <h3 className="text-2xl font-bold text-white mb-4">PRO</h3>
                <div className="flex items-baseline justify-center gap-2 mb-6">
                  <span className="text-4xl font-bold text-white">19,90€</span>
                  <span className="text-slate-400">/Monat</span>
                </div>
                <p className="text-slate-300">
                  Vollzugang zu allen Rechnungsfunktionen
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
                  <span className="text-slate-300">Kundenanfragen mit Fotos</span>
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
                  <span className="text-slate-300">Services Management</span>
                </div>
              </div>

              <a
                href="/signup"
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-bold hover:opacity-90 transition-opacity block text-center"
              >
                Jetzt registrieren
              </a>
            </div>

            {/* PRO+ Plan - Coming Soon */}
            <div className="bg-slate-800/30 border border-slate-600/50 rounded-2xl p-8 opacity-75 relative">
              {/* Badge - Responsive pozicija */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 sm:static sm:translate-x-0 sm:mb-4">
                <span className="bg-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap">BALD VERFÜGBAR</span>
              </div>
              <div className="text-center mb-8 mt-2 sm:mt-0">
                <h3 className="text-2xl font-bold text-white mb-4">
                  PRO+
                </h3>
                <div className="flex items-baseline justify-center gap-2 mb-6">
                  <span className="text-4xl font-bold text-slate-400">39,90€</span>
                  <span className="text-slate-500">/Monat</span>
                </div>
                <p className="text-slate-400">
                  PRO + Planner & Referral System
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
                  <span className="text-slate-400">Terminplaner & Kalender</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs">○</span>
                  </div>
                  <span className="text-slate-400">Referral System</span>
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
              <span className="text-white font-bold">7</span>
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">
              7 Tage kostenloser Vollzugang für jeden
            </h3>
            <p className="text-blue-200 mb-6 text-lg">
              Nach der Registrierung haben Sie 7 Tage Vollzugang zu allen PRO-Funktionen. 
              Danach wählen Sie zwischen Freemium (kostenlos) oder PRO (19,90€/Monat).
            </p>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="bg-slate-800/50 rounded-lg p-4">
                <div className="text-blue-300 font-semibold mb-2">Tag 1-7</div>
                <div className="text-slate-300">Vollzugang zu allen Funktionen</div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-4">
                <div className="text-green-300 font-semibold mb-2">Tag 8+</div>
                <div className="text-slate-300">Freemium: nur QR-Karte</div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-4">
                <div className="text-purple-300 font-semibold mb-2">Upgrade</div>
                <div className="text-slate-300">PRO: alle Funktionen</div>
              </div>
            </div>
          </div>

          {/* Note */}
          <div className="text-center mt-12">
            <p className="text-slate-400 text-sm">
              Alle Preise zzgl. 19% MwSt. • 7 Tage Vollzugang für jeden • Jederzeit kündbar
            </p>
          </div>
        </div>
      </section>

      {/* Social Proof / Benefits Section */}
      <section className="py-20 px-6 bg-slate-800/20">
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
              <p className="text-slate-400 text-sm">ZUGFeRD 2.1 konform und rechtssicher</p>
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
                <span className="text-2xl">💶</span>
              </div>
              <h3 className="text-white font-semibold mb-2">Schnelle Zahlung</h3>
              <p className="text-slate-400 text-sm">SEPA QR-Codes für sofortiges Bezahlen</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📱</span>
              </div>
              <h3 className="text-white font-semibold mb-2">Mobil optimiert</h3>
              <p className="text-slate-400 text-sm">Funktioniert perfekt auf Handy & Tablet</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Bereit für professionelle Rechnungen?
          </h2>
          <p className="text-xl text-slate-300 mb-12 max-w-2xl mx-auto">
            Registrieren Sie sich heute und erhalten Sie 7 Tage Vollzugang zu allen PRO-Funktionen.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/signup"
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-10 py-4 rounded-full font-bold text-lg transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-blue-500/25"
            >
              Kostenlos starten
            </a>
            <a
              href="mailto:support@pro-meister.de"
              className="border-2 border-slate-600 text-white px-10 py-4 rounded-full font-bold text-lg hover:bg-slate-800 transition-all duration-300"
            >
              Fragen? Kontakt
            </a>
          </div>

          <p className="text-slate-400 text-sm mt-6">
            ✨ 7 Tage Vollzugang für jeden • Deutsche Server • DSGVO konform
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
                Professionelle Rechnungslösung für deutsche Handwerker. Deutsche Server, DSGVO konform.
              </p>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Produkt</h4>
              <div className="space-y-2">
                <a href="#features" className="block text-slate-400 hover:text-white transition-colors">Funktionen</a>
                <a href="/login" className="block text-slate-400 hover:text-white transition-colors">Anmelden</a>
                <a href="/signup" className="block text-slate-400 hover:text-white transition-colors">Registrieren</a>
              </div>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Support</h4>
              <div className="space-y-2">
                <a href="mailto:support@pro-meister.de" className="block text-slate-400 hover:text-white transition-colors">E-Mail Support</a>
                <a href="/help" className="block text-slate-400 hover:text-white transition-colors">Hilfe & FAQ</a>
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
            <p>&copy; {new Date().getFullYear()} pro-meister.de - Deutsche Rechnungslösung für Handwerker</p>
          </div>
        </div>
      </footer>
    </div>
  );
}