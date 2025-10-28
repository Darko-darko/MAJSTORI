// app/imprint/page.js - ISPRAVLJEN Impressum sa DDG (umesto TMG)
import Link from 'next/link'

export default function Imprint() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/10 backdrop-blur-md border-b border-white/10 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-3 sm:py-4 gap-3 sm:gap-0">
            <Link href="/" className="text-xl sm:text-2xl font-bold text-white text-center sm:text-left hover:text-blue-400 transition-colors">
              Pro-meister<span className="text-blue-400">.de</span>
            </Link>
            
            <div className="flex gap-2 sm:gap-4 justify-center">
              <Link
                href="/login"
                className="text-white/80 hover:text-white px-3 sm:px-4 py-2 transition-colors text-sm sm:text-base"
              >
                Anmelden
              </Link>
              <Link
                href="/signup"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-6 py-2 rounded-full font-medium transition-all duration-300 hover:scale-105 text-sm sm:text-base"
              >
                Registrieren
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-32 pb-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Impressum
            </h1>
            <p className="text-slate-400">
              Angaben gemäß § 5 DDG
            </p>
          </div>

          {/* Content Card */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-8 md:p-12">
            
            {/* Company Information */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-white mb-6">Anbieter</h2>
              <div className="text-slate-300 space-y-2 leading-relaxed">
                <p className="font-medium text-white text-lg">Kilimanjaro doo</p>
                <p>Milenka Grcica 11</p>
                <p>21000 Novi Sad</p>
                <p>Serbien</p>
              </div>
            </section>

            {/* Contact */}
            <section className="mb-10 border-t border-slate-700 pt-10">
              <h2 className="text-2xl font-bold text-white mb-6">Kontakt</h2>
              <div className="text-slate-300 space-y-3">
                <p>
                  <span className="text-slate-400 font-medium">E-Mail:</span>{' '}
                  <a href="mailto:support@pro-meister.de" className="text-blue-400 hover:text-blue-300 transition-colors">
                    support@pro-meister.de
                  </a>
                </p>
                <p>
                  <span className="text-slate-400 font-medium">Telefon:</span>{' '}
                  <span className="text-white">+491 763 21 84 774</span>
                  <span className="text-slate-500 text-sm ml-2">(Bitte Ihre Telefonnummer hier eintragen)</span>
                </p>
                <p>
                  <span className="text-slate-400 font-medium">Website:</span>{' '}
                  <a href="https://pro-meister.de" className="text-blue-400 hover:text-blue-300 transition-colors">
                    www.pro-meister.de
                  </a>
                </p>
              </div>
            </section>

            {/* Registration Details */}
            <section className="mb-10 border-t border-slate-700 pt-10">
              <h2 className="text-2xl font-bold text-white mb-6">Registrierung</h2>
              <div className="text-slate-300 space-y-2">
                <p>
                  <span className="text-slate-400">Registergericht:</span>{' '}
                  <span className="text-white">Handelsregister Novi Sad, Serbien</span>
                </p>
                <p>
                  <span className="text-slate-400">PIB (Steuer-ID):</span>{' '}
                  <span className="text-white">114269817</span>
                </p>
                <p>
                  <span className="text-slate-400">Matični broj (Registrierungsnummer):</span>{' '}
                  <span className="text-white">21997587</span>
                </p>
              </div>
              
              {/* Add VAT if applicable */}
              <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <p className="text-sm text-blue-300">
                  <strong>Hinweis:</strong> Falls Sie eine deutsche Umsatzsteuer-Identifikationsnummer 
                  (USt-IdNr.) haben, fügen Sie diese hier hinzu.
                </p>
              </div>
            </section>

            {/* Responsible Person */}
            <section className="mb-10 border-t border-slate-700 pt-10">
              <h2 className="text-2xl font-bold text-white mb-6">Verantwortlich für den Inhalt</h2>
              <div className="text-slate-300 space-y-2">
                <p className="text-slate-400">gemäß § 18 Abs. 2 MStV:</p>
                <p className="text-white font-medium mt-3">Darko Jocic</p>
                <p className="text-slate-400 text-sm">Geschäftsführer / Direktor</p>
                <p className="mt-2">Kilimanjaro doo</p>
                <p>Milenka Grcica 11</p>
                <p>21000 Novi Sad, Serbien</p>
              </div>
            </section>

            {/* Payment Provider */}
            <section className="mb-10 border-t border-slate-700 pt-10">
              <h2 className="text-2xl font-bold text-white mb-6">Zahlungsabwicklung</h2>
              <div className="text-slate-300 space-y-3">
                <p>
                  Die Zahlungsabwicklung erfolgt über unseren autorisierten Zahlungsdienstleister:
                </p>
                <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4 mt-3">
                  <p className="font-medium text-white">Paddle.com Market Limited</p>
                  <p className="text-sm mt-2">Judd House, 18-29 Mora Street</p>
                  <p className="text-sm">London EC1V 8BT, United Kingdom</p>
                  <p className="text-sm mt-2">
                    <span className="text-slate-400">VAT Number:</span> GB 123 4567 89
                  </p>
                </div>
                <p className="text-sm text-slate-400 mt-3">
                  Paddle agiert als Reseller für alle Transaktionen und ist für die Zahlungsabwicklung, 
                  Rechnungsstellung und Kundenservice in Bezug auf Zahlungen verantwortlich.
                </p>
              </div>
            </section>

            {/* EU Dispute Resolution */}
            <section className="mb-10 border-t border-slate-700 pt-10">
              <h2 className="text-2xl font-bold text-white mb-6">EU-Streitschlichtung</h2>
              <div className="text-slate-300 leading-relaxed space-y-4">
                <p>
                  Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:
                </p>
                <a 
                  href="https://ec.europa.eu/consumers/odr/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-block text-blue-400 hover:text-blue-300 transition-colors break-all"
                >
                  https://ec.europa.eu/consumers/odr/
                </a>
                <p>
                  Unsere E-Mail-Adresse finden Sie oben im Impressum.
                </p>
              </div>
            </section>

            {/* Consumer Dispute Resolution */}
            <section className="border-t border-slate-700 pt-10">
              <h2 className="text-2xl font-bold text-white mb-6">Verbraucherstreitbeilegung</h2>
              <div className="text-slate-300 leading-relaxed">
                <p>
                  Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer 
                  Verbraucherschlichtungsstelle teilzunehmen.
                </p>
              </div>
            </section>

            {/* Copyright & Liability */}
            <section className="mt-10 border-t border-slate-700 pt-10">
              <h2 className="text-2xl font-bold text-white mb-6">Haftung für Inhalte</h2>
              <div className="text-slate-300 leading-relaxed space-y-4">
                <p>
                  Als Diensteanbieter sind wir gemäß § 7 Abs.1 DDG für eigene Inhalte auf diesen Seiten 
                  nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 DDG sind wir als 
                  Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde 
                  Informationen zu überwachen oder nach Umständen zu forschen, die auf eine 
                  rechtswidrige Tätigkeit hinweisen.
                </p>
                <p>
                  Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach 
                  den allgemeinen Gesetzen bleiben hiervon unberührt. Eine diesbezügliche Haftung 
                  ist jedoch erst ab dem Zeitpunkt der Kenntnis einer konkreten Rechtsverletzung 
                  möglich. Bei Bekanntwerden von entsprechenden Rechtsverletzungen werden wir 
                  diese Inhalte umgehend entfernen.
                </p>
              </div>
            </section>

          </div>

          {/* Back to Home */}
          <div className="text-center mt-12">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors font-medium"
            >
              ← Zurück zur Startseite
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex flex-wrap justify-center gap-6 mb-4">
            <Link href="/privacy" className="text-slate-400 hover:text-white transition-colors text-sm">
              Datenschutz
            </Link>
            <Link href="/terms" className="text-slate-400 hover:text-white transition-colors text-sm">
              AGB
            </Link>
            <Link href="/refund" className="text-slate-400 hover:text-white transition-colors text-sm">
              Rückerstattung
            </Link>
            <Link href="/imprint" className="text-slate-400 hover:text-white transition-colors text-sm font-semibold">
              Impressum
            </Link>
          </div>
          <p className="text-slate-400 text-sm">
            &copy; {new Date().getFullYear()} pro-meister.de
          </p>
        </div>
      </footer>
    </div>
  );
}