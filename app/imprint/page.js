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
              Angaben gemäß § 5 TMG
            </p>
          </div>

          {/* Content Card */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-8 md:p-12">
            
            {/* Company Information */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-white mb-6">Anbieter</h2>
              <div className="text-slate-300 space-y-2 leading-relaxed">
                <p className="font-medium text-white">Kilimanjaro doo</p>
                <p>Milenka Grcica 11</p>
                <p>21000 Novi Sad</p>
                <p>Serbien</p>
              </div>
            </section>

            {/* Contact */}
            <section className="mb-10 border-t border-slate-700 pt-10">
              <h2 className="text-2xl font-bold text-white mb-6">Kontakt</h2>
              <div className="text-slate-300 space-y-2">
                <p>
                  <span className="text-slate-400">E-Mail:</span>{' '}
                  <a href="mailto:support@pro-meister.de" className="text-blue-400 hover:text-blue-300 transition-colors">
                    support@pro-meister.de
                  </a>
                </p>
              </div>
            </section>

            <section className="mb-10 border-t border-slate-700 pt-10">
              <h2 className="text-2xl font-bold text-white mb-6">Registrierung</h2>
              <div className="text-slate-300 space-y-2">
                <p>
                  <span className="text-slate-400">PIB:</span>{' '}
                  <span className="text-white">114269817</span>
                </p>
                <p>
                  <span className="text-slate-400">Matični broj:</span>{' '}
                  <span className="text-white">21997587</span>
                </p>
              </div>
            </section>

            {/* Responsible Person */}
            <section className="mb-10 border-t border-slate-700 pt-10">
              <h2 className="text-2xl font-bold text-white mb-6">Verantwortlich für den Inhalt</h2>
              <div className="text-slate-300 space-y-2">
                <p>
                  <span className="text-slate-400">nach § 55 Abs. 2 RStV:</span>
                </p>
                <p className="text-white mt-2">Darko Jocic, Direktor</p>
                <p>Kilimanjaro doo</p>
                <p>Milenka Grcica 11</p>
                <p>21000 Novi Sad, Serbien</p>
              </div>
            </section>

            {/* EU Dispute Resolution */}
            <section className="mb-10 border-t border-slate-700 pt-10">
              <h2 className="text-2xl font-bold text-white mb-6">EU-Streitschlichtung</h2>
              <div className="text-slate-300 leading-relaxed">
                <p className="mb-4">
                  Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:
                </p>
                <a 
                  href="https://ec.europa.eu/consumers/odr/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 transition-colors break-all"
                >
                  https://ec.europa.eu/consumers/odr/
                </a>
                <p className="mt-4">
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
            <Link href="/imprint" className="text-slate-400 hover:text-white transition-colors text-sm">
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