// app/imprint/page.js — Impressum (DE) sa Hosting-Info i EU-Vertreter placeholderom
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
              <Link href="/login" className="text-white/80 hover:text-white px-3 sm:px-4 py-2 transition-colors text-sm sm:text-base">
                Anmelden
              </Link>
              <Link href="/signup" className="bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-6 py-2 rounded-full font-medium transition-all duration-300 hover:scale-105 text-sm sm:text-base">
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
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Impressum</h1>
            <p className="text-slate-400">Angaben gemäß § 5 DDG</p>
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
                  <span className="text-white">+49 176 32184774</span>
                </p>
                <p>
                  <span className="text-slate-400 font-medium">Web:</span>{' '}
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
                <p><span className="text-slate-400">Registergericht:</span> <span className="text-white">Handelsregister Novi Sad, Serbien</span></p>
                <p><span className="text-slate-400">PIB (Steuer-ID):</span> <span className="text-white">114269817</span></p>
                <p><span className="text-slate-400">Matični broj (Registrierungsnummer):</span> <span className="text-white">21997587</span></p>
                <p className="text-sm text-slate-400">Sofern vorhanden, ergänzen Sie hier eine EU-USt-IdNr. (z. B. DE…)</p>
              </div>
            </section>

            {/* Responsible Person */}
            <section className="mb-10 border-t border-slate-700 pt-10">
              <h2 className="text-2xl font-bold text-white mb-6">Verantwortlich für den Inhalt</h2>
              <div className="text-slate-300 space-y-2">
                <p className="text-slate-400">gemäß § 18 Abs. 2 MStV</p>
                <p className="text-white font-medium mt-3">Darko Jocic</p>
                <p className="text-slate-400 text-sm">Geschäftsführer / Direktor</p>
                <p className="mt-2">Kilimanjaro doo, Milenka Grcica 11, 21000 Novi Sad, Serbien</p>
              </div>
            </section>

            {/* EU Representative (placeholder) */}
            <section className="mb-10 border-t border-slate-700 pt-10">
              <h2 className="text-2xl font-bold text-white mb-6">EU-Vertreter (Art. 27 DSGVO)</h2>
              <p className="text-slate-300">
                Die Benennung eines EU-Vertreters befindet sich im Umsetzungsprozess. Nach Bestellung werden die Kontaktdaten hier veröffentlicht.
              </p>
              {/* Nach Bestellung ersetzen:
              <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4 mt-3">
                <p className="font-medium text-white">[Name des EU-Vertreters]</p>
                <p>[Straße Hausnr.]</p>
                <p>[PLZ Ort], [Land]</p>
                <p className="mt-2">E-Mail: <a href="mailto:[...]" className="text-blue-400">[...]</a></p>
              </div>
              */}
            </section>

            {/* Hosting */}
            <section className="mb-10 border-t border-slate-700 pt-10">
              <h2 className="text-2xl font-bold text-white mb-6">Hosting</h2>
              <div className="text-slate-300 space-y-2">
                <p>Diese Website wird gehostet bei:</p>
                <p className="text-white font-medium">Netlify, Inc.</p>
                <p>2325 3rd Street, Suite 296, San Francisco, CA 94107, USA</p>
                <p className="text-sm text-slate-400">
                  Die Datenspeicherung der Plattformdienste erfolgt in der EU (Supabase, Region Frankfurt am Main).
                </p>
              </div>
            </section>

         {/* Payment Provider */}
            <section className="mb-10 border-t border-slate-700 pt-10">
              <h2 className="text-2xl font-bold text-white mb-6">Zahlungsabwicklung</h2>
              <div className="text-slate-300 space-y-3">
                <p>Die Zahlungsabwicklung erfolgt über unseren autorisierten Reseller:</p>
                <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4 mt-3">
                  <p className="font-medium text-white">FastSpring Inc.</p>
                  <p className="text-sm mt-2">801 Garden Street, Suite 201</p>
                  <p className="text-sm">Santa Barbara, CA 93101, USA</p>
                </div>
                <p className="text-sm text-slate-400 mt-3">
                  FastSpring ist Vertragspartner beim Kauf, verantwortlich für Zahlungsabwicklung, Rechnungsstellung und zahlungsbezogenen Support.
                  Die jeweilige VAT-Nummer entnehmen Sie bitte der FastSpring-Rechnung.
                </p>
              </div>
            </section>

            {/* EU Dispute Resolution */}
            <section className="mb-10 border-t border-slate-700 pt-10">
              <h2 className="text-2xl font-bold text-white mb-6">EU-Streitschlichtung</h2>
              <div className="text-slate-300 leading-relaxed space-y-4">
                <p>Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:</p>
                <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer" className="inline-block text-blue-400 hover:text-blue-300 transition-colors break-all">
                  https://ec.europa.eu/consumers/odr/
                </a>
                <p>Unsere E-Mail-Adresse finden Sie oben im Impressum.</p>
              </div>
            </section>

            {/* Consumer Dispute Resolution */}
            <section className="border-t border-slate-700 pt-10">
              <h2 className="text-2xl font-bold text-white mb-6">Verbraucherstreitbeilegung</h2>
              <div className="text-slate-300 leading-relaxed">
                <p>Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p>
              </div>
            </section>

            {/* Haftung für Inhalte */}
            <section className="mt-10 border-t border-slate-700 pt-10">
              <h2 className="text-2xl font-bold text-white mb-6">Haftung für Inhalte</h2>
              <div className="text-slate-300 leading-relaxed space-y-4">
                <p>Als Diensteanbieter sind wir gemäß § 7 Abs. 1 DDG für eigene Inhalte nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8–10 DDG sind wir jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.</p>
                <p>Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach den allgemeinen Gesetzen bleiben unberührt. Eine Haftung ist jedoch erst ab Kenntnis einer konkreten Rechtsverletzung möglich. Bei Bekanntwerden entsprechender Rechtsverletzungen entfernen wir diese Inhalte umgehend.</p>
              </div>
            </section>
          </div>

          {/* Back to Home */}
          <div className="text-center mt-12">
            <Link href="/" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors font-medium">
              ← Zurück zur Startseite
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex flex-wrap justify-center gap-6 mb-4">
            <Link href="/privacy" className="text-slate-400 hover:text-white transition-colors text-sm">Datenschutz</Link>
            <Link href="/terms" className="text-slate-400 hover:text-white transition-colors text-sm">AGB</Link>
            <Link href="/withdrawal" className="text-slate-400 hover:text-white transition-colors text-sm">Widerrufsbelehrung</Link>
            <Link href="/refund" className="text-slate-400 hover:text-white transition-colors text-sm">Rückerstattung</Link>
            <Link href="/imprint" className="text-slate-400 hover:text-white transition-colors text-sm font-semibold">Impressum</Link>
          </div>
          <p className="text-slate-400 text-sm">&copy; {new Date().getFullYear()} pro-meister.de</p>
        </div>
      </footer>
    </div>
  );
}
