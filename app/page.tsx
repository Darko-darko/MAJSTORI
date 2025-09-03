export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/10 backdrop-blur-md border-b border-white/10 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold text-white">
            Majstori<span className="text-blue-400">.de</span>
          </div>
          <div className="flex gap-4">
            <a
              href="/login"
              className="text-white/80 hover:text-white px-4 py-2 transition-colors"
            >
              Anmelden
            </a>
            <a
              href="/signup"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full font-medium transition-all duration-300 hover:scale-105"
            >
              Registrieren
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-6xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-2 mb-8">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-blue-300 text-sm font-medium">Über 500+ Handwerker vertrauen uns bereits</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-6 leading-tight">
            Digitale
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
              Visitenkarte
            </span>
            für Handwerker
          </h1>

          {/* Subheadline */}
          <p className="text-xl md:text-2xl text-slate-300 mb-12 max-w-3xl mx-auto leading-relaxed">
            QR-Code, Kundenanfragen mit Fotos, automatische Rechnungen und Garantien. 
            Alles in einer professionellen Plattform.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <a
              href="/signup"
              className="group bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-full font-semibold text-lg transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-blue-500/25"
            >
              7 Tage kostenlos testen
              <span className="ml-2 group-hover:translate-x-1 transition-transform duration-300">→</span>
            </a>
            <a
              href="#features"
              className="border-2 border-white/20 text-white px-8 py-4 rounded-full font-semibold text-lg hover:bg-white/10 transition-all duration-300"
            >
              Funktionen ansehen
            </a>
          </div>

          {/* Hero Image/Demo */}
          <div className="relative max-w-4xl mx-auto">
            <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-2xl p-8 border border-slate-600 shadow-2xl">
              <div className="grid md:grid-cols-3 gap-6 text-left">
                <div className="bg-slate-900 rounded-lg p-6 border border-slate-600">
                  <div className="w-12 h-12 bg-blue-500 rounded-lg mb-4 flex items-center justify-center">
                    <span className="text-white font-bold text-xl">QR</span>
                  </div>
                  <h3 className="text-white font-semibold mb-2">QR-Code</h3>
                  <p className="text-slate-400 text-sm">Digitale Visitenkarte sofort verfügbar</p>
                </div>
                <div className="bg-slate-900 rounded-lg p-6 border border-slate-600">
                  <div className="w-12 h-12 bg-green-500 rounded-lg mb-4 flex items-center justify-center">
                    <span className="text-white font-bold text-xl">📧</span>
                  </div>
                  <h3 className="text-white font-semibold mb-2">Anfragen</h3>
                  <p className="text-slate-400 text-sm">Kunden senden Fotos + Beschreibung</p>
                </div>
                <div className="bg-slate-900 rounded-lg p-6 border border-slate-600">
                  <div className="w-12 h-12 bg-purple-500 rounded-lg mb-4 flex items-center justify-center">
                    <span className="text-white font-bold text-xl">€</span>
                  </div>
                  <h3 className="text-white font-semibold mb-2">Rechnungen</h3>
                  <p className="text-slate-400 text-sm">Automatische PDF-Erstellung</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Alles was Sie brauchen,
              <span className="text-blue-400"> in einer Plattform</span>
            </h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              Professionelle Tools für moderne Handwerker. Sparen Sie Zeit und beeindrucken Sie Ihre Kunden.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="group bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-8 hover:border-blue-500/50 transition-all duration-300 hover:-translate-y-2">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl mb-6 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <span className="text-2xl">📱</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Digitale Visitenkarte</h3>
              <p className="text-slate-300 mb-6 leading-relaxed">
                Erstellen Sie eine professionelle digitale Visitenkarte mit QR-Code. Kunden scannen und haben sofort Zugriff auf alle Ihre Kontaktdaten.
              </p>
              <ul className="text-slate-400 space-y-2">
                <li>✓ QR-Code automatisch generiert</li>
                <li>✓ Logo und Branding</li>
                <li>✓ Kontaktdaten & Services</li>
              </ul>
            </div>

            {/* Feature 2 */}
            <div className="group bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-8 hover:border-green-500/50 transition-all duration-300 hover:-translate-y-2">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl mb-6 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <span className="text-2xl">📸</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Kundenanfragen mit Fotos</h3>
              <p className="text-slate-300 mb-6 leading-relaxed">
                Kunden können direkt über Ihren QR-Code Anfragen senden - inklusive Fotos vom Problem. Sie sehen den Schaden vor dem Besuch.
              </p>
              <ul className="text-slate-400 space-y-2">
                <li>✓ Bis zu 5 Fotos pro Anfrage</li>
                <li>✓ Detaillierte Beschreibung</li>
                <li>✓ Sofortige E-Mail-Benachrichtigung</li>
              </ul>
            </div>

            {/* Feature 3 */}
            <div className="group bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-8 hover:border-purple-500/50 transition-all duration-300 hover:-translate-y-2">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl mb-6 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <span className="text-2xl">📄</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">PDF Rechnungen</h3>
              <p className="text-slate-300 mb-6 leading-relaxed">
                Erstellen Sie professionelle Rechnungen in Sekundenschnelle. Automatische PDF-Generierung und E-Mail-Versand an Kunden.
              </p>
              <ul className="text-slate-400 space-y-2">
                <li>✓ Deutsche Rechnungsstandards</li>
                <li>✓ Automatische Nummerierung</li>
                <li>✓ IBAN & Zahlungsdetails</li>
              </ul>
            </div>

            {/* Feature 4 */}
            <div className="group bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-8 hover:border-orange-500/50 transition-all duration-300 hover:-translate-y-2">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl mb-6 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <span className="text-2xl">🛡️</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Garantien & Erinnerungen</h3>
              <p className="text-slate-300 mb-6 leading-relaxed">
                Automatische Garantie-PDFs für jede Arbeit. Das System erinnert Sie 10 Tage vor Ablauf - für bessere Kundenbindung.
              </p>
              <ul className="text-slate-400 space-y-2">
                <li>✓ Automatische PDF-Generierung</li>
                <li>✓ Erinnerungen vor Ablauf</li>
                <li>✓ Kundenvertrauen stärken</li>
              </ul>
            </div>

            {/* Feature 5 */}
            <div className="group bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-8 hover:border-cyan-500/50 transition-all duration-300 hover:-translate-y-2">
              <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-2xl mb-6 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <span className="text-2xl">📧</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Smart E-Mail System</h3>
              <p className="text-slate-300 mb-6 leading-relaxed">
                Automatische E-Mails an Kunden: Bestätigungen, Erinnerungen, Terminbenachrichtigungen. Alles läuft automatisch im Hintergrund.
              </p>
              <ul className="text-slate-400 space-y-2">
                <li>✓ Anfragebestätigungen</li>
                <li>✓ Terminerinnerungen</li>
                <li>✓ Garantie-Benachrichtigungen</li>
              </ul>
            </div>

            {/* Feature 6 */}
            <div className="group bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-8 hover:border-pink-500/50 transition-all duration-300 hover:-translate-y-2">
              <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-pink-600 rounded-2xl mb-6 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <span className="text-2xl">💎</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Referral System</h3>
              <p className="text-slate-300 mb-6 leading-relaxed">
                Verdienen Sie Geld durch Weiterempfehlungen. Empfehlen Sie andere Handwerker und erhalten Sie einen Monat gratis für jeden neuen Nutzer.
              </p>
              <ul className="text-slate-400 space-y-2">
                <li>✓ 1 Monat gratis pro Empfehlung</li>
                <li>✓ Einfacher Empfehlungslink</li>
                <li>✓ Passives Einkommen</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Einfache, faire Preise
          </h2>
          <p className="text-xl text-slate-300 mb-12">
            Starten Sie mit einer kostenlosen 7-Tage-Testversion. Keine Einrichtungsgebühr, jederzeit kündbar.
          </p>

          {/* Pricing Card */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-blue-500 rounded-3xl p-8 md:p-12 relative overflow-hidden">
            {/* Popular Badge */}
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-2 rounded-full text-sm font-bold">
                BELIEBT
              </div>
            </div>

            <div className="mb-8">
              <h3 className="text-3xl font-bold text-white mb-4">Profi Plan</h3>
              <div className="flex items-baseline justify-center gap-2 mb-6">
                <span className="text-5xl md:text-6xl font-bold text-white">19,99€</span>
                <span className="text-2xl text-slate-400">/Monat</span>
              </div>
              <p className="text-slate-300 text-lg">
                Alle Funktionen inklusive - perfekt für professionelle Handwerker
              </p>
            </div>

            {/* Features List */}
            <div className="grid md:grid-cols-2 gap-6 text-left mb-8">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm">✓</span>
                  </div>
                  <span className="text-slate-300">Unbegrenzte Kundenanfragen</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm">✓</span>
                  </div>
                  <span className="text-slate-300">QR-Code + Digitale Visitenkarte</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm">✓</span>
                  </div>
                  <span className="text-slate-300">PDF Rechnungen & Garantien</span>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm">✓</span>
                  </div>
                  <span className="text-slate-300">Automatische E-Mail-Benachrichtigungen</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm">✓</span>
                  </div>
                  <span className="text-slate-300">Referral System (Geld verdienen)</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm">✓</span>
                  </div>
                  <span className="text-slate-300">Priorität E-Mail Support</span>
                </div>
              </div>
            </div>

            <a
              href="/signup"
              className="inline-block bg-gradient-to-r from-blue-600 to-purple-600 text-white px-12 py-4 rounded-full font-bold text-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/25"
            >
              7 Tage kostenlos testen
            </a>

            <p className="text-slate-400 text-sm mt-4">
              Keine Kreditkarte erforderlich • Jederzeit kündbar
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Bereit für den nächsten Schritt?
          </h2>
          <p className="text-xl text-slate-300 mb-12 max-w-2xl mx-auto">
            Schließen Sie sich über 500 zufriedenen Handwerkern an, die bereits mehr Zeit für ihr Geschäft haben.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/signup"
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-10 py-4 rounded-full font-bold text-lg transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-blue-500/25"
            >
              Kostenlos registrieren
            </a>
            <a
              href="mailto:support@majstori.de"
              className="border-2 border-slate-600 text-white px-10 py-4 rounded-full font-bold text-lg hover:bg-slate-800 transition-all duration-300"
            >
              Fragen? Kontaktieren Sie uns
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="text-2xl font-bold text-white mb-4">
                Majstori<span className="text-blue-400">.de</span>
              </div>
              <p className="text-slate-400">
                Die digitale Plattform für moderne Handwerker in Deutschland.
              </p>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Produkt</h4>
              <div className="space-y-2">
                <a href="#features" className="block text-slate-400 hover:text-white transition-colors">Funktionen</a>
                <a href="/pricing" className="block text-slate-400 hover:text-white transition-colors">Preise</a>
                <a href="/faq" className="block text-slate-400 hover:text-white transition-colors">FAQ</a>
              </div>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Unternehmen</h4>
              <div className="space-y-2">
                <a href="/about" className="block text-slate-400 hover:text-white transition-colors">Über uns</a>
                <a href="/contact" className="block text-slate-400 hover:text-white transition-colors">Kontakt</a>
                <a href="/blog" className="block text-slate-400 hover:text-white transition-colors">Blog</a>
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
            <p>&copy; {new Date().getFullYear()} Majstori.de - Alle Rechte vorbehalten.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}