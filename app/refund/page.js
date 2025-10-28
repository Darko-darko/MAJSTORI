// app/refund/page.js - Refund Policy za Paddle zahteve
import Link from 'next/link';

export default function RefundPolicy() {
  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="border-b border-slate-800 py-6 px-6">
        <div className="max-w-6xl mx-auto">
          <Link 
            href="/" 
            className="text-2xl font-bold text-white hover:text-blue-400 transition-colors"
          >
            pro-meister.de
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-slate-800 rounded-2xl p-8 md:p-12">
            
            {/* Title */}
            <div className="mb-12">
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Rückerstattungsrichtlinie
              </h1>
              <p className="text-slate-400">
                Stand: {new Date().toLocaleDateString('de-DE')}
              </p>
            </div>

            {/* Content Sections */}
            <div className="space-y-10 text-slate-300 leading-relaxed">

              {/* Kostenlose Testphase */}
              <section>
                <h2 className="text-2xl font-bold text-white mb-6">
                  1. Kostenlose Testphase (30 Tage)
                </h2>
                <div className="space-y-4">
                  <p>
                    Wir bieten allen neuen Nutzern eine <strong className="text-white">30-tägige kostenlose Testphase</strong> mit 
                    vollem Zugriff auf alle PRO-Funktionen der Plattform an.
                  </p>
                  <ul className="list-disc ml-6 space-y-2">
                    <li>
                      Während der Testphase entstehen <strong className="text-white">keine Kosten</strong>
                    </li>
                    <li>
                      Sie können die Testphase <strong className="text-white">jederzeit ohne Angabe von Gründen beenden</strong>
                    </li>
                    <li>
                      Es erfolgt keine automatische Abbuchung während der Testphase
                    </li>
                    <li>
                      Nach Ablauf der Testphase können Sie entscheiden, ob Sie ein kostenpflichtiges 
                      Abonnement abschließen möchten
                    </li>
                  </ul>
                </div>
              </section>

              {/* Abonnement & Kündigung */}
              <section>
                <h2 className="text-2xl font-bold text-white mb-6">
                  2. Abonnement und Kündigung
                </h2>
                <div className="space-y-4">
                  <p>
                    Nach der kostenlosen Testphase können Sie ein monatliches oder jährliches 
                    Abonnement abschließen.
                  </p>
                  <ul className="list-disc ml-6 space-y-2">
                    <li>
                      <strong className="text-white">Monatliches Abonnement:</strong> Kündigung jederzeit möglich, 
                      wirksam zum Ende des aktuellen Abrechnungszeitraums
                    </li>
                    <li>
                      <strong className="text-white">Jährliches Abonnement:</strong> Kündigung jederzeit möglich, 
                      wirksam zum Ende des Jahresabonnements
                    </li>
                    <li>
                      Die Kündigung erfolgt direkt über Ihr Paddle-Kundenkonto oder per E-Mail an 
                      <a href="mailto:support@pro-meister.de" className="text-blue-400 hover:text-blue-300 ml-1">
                        support@pro-meister.de
                      </a>
                    </li>
                  </ul>
                </div>
              </section>

              {/* Rückerstattung */}
              <section>
                <h2 className="text-2xl font-bold text-white mb-6">
                  3. Rückerstattungsrichtlinie
                </h2>
                <div className="space-y-4">
                  <p>
                    Wir möchten, dass Sie mit unserem Service vollständig zufrieden sind. 
                    Daher bieten wir folgende Rückerstattungsmöglichkeiten:
                  </p>
                  
                  <div className="bg-slate-700/50 border border-slate-600 rounded-xl p-6 space-y-3">
                    <h3 className="text-xl font-semibold text-white">
                      14-Tage-Geld-zurück-Garantie
                    </h3>
                    <p>
                      Wenn Sie innerhalb von <strong className="text-white">14 Tagen nach der ersten Zahlung</strong> (nach 
                      Ablauf der Testphase) mit unserem Service nicht zufrieden sind, erstatten wir Ihnen 
                      den vollen Betrag zurück.
                    </p>
                    <ul className="list-disc ml-6 space-y-2 text-sm">
                      <li>Keine Fragen, keine komplizierten Prozesse</li>
                      <li>Kontaktieren Sie uns einfach per E-Mail</li>
                      <li>Rückerstattung erfolgt auf das ursprüngliche Zahlungsmittel</li>
                      <li>Bearbeitungszeit: 5-10 Werktage</li>
                    </ul>
                  </div>

                  <div className="space-y-3 mt-6">
                    <h3 className="text-xl font-semibold text-white">
                      Keine Rückerstattung nach 14 Tagen
                    </h3>
                    <p>
                      Nach Ablauf der 14-tägigen Geld-zurück-Garantie sind Rückerstattungen 
                      <strong className="text-white"> nicht mehr möglich</strong>. Sie können jedoch jederzeit 
                      Ihr Abonnement kündigen, um zukünftige Zahlungen zu vermeiden.
                    </p>
                  </div>

                  <div className="space-y-3 mt-6">
                    <h3 className="text-xl font-semibold text-white">
                      Ausnahmen von der Rückerstattung
                    </h3>
                    <p>Eine Rückerstattung ist in folgenden Fällen ausgeschlossen:</p>
                    <ul className="list-disc ml-6 space-y-2">
                      <li>Bei Verstoß gegen unsere Nutzungsbedingungen</li>
                      <li>Bei missbräuchlicher Nutzung der Plattform</li>
                      <li>Bei mehrfachen Rückerstattungsanfragen (Missbrauch der Garantie)</li>
                      <li>Für zusätzliche Dienstleistungen oder Add-ons nach deren Nutzung</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Prozess */}
              <section>
                <h2 className="text-2xl font-bold text-white mb-6">
                  4. So beantragen Sie eine Rückerstattung
                </h2>
                <div className="space-y-4">
                  <p>
                    Um eine Rückerstattung zu beantragen, gehen Sie wie folgt vor:
                  </p>
                  <ol className="list-decimal ml-6 space-y-3">
                    <li>
                      <strong className="text-white">Kontaktieren Sie uns</strong> per E-Mail an{' '}
                      <a href="mailto:support@pro-meister.de" className="text-blue-400 hover:text-blue-300">
                        support@pro-meister.de
                      </a>
                    </li>
                    <li>
                      <strong className="text-white">Betreff:</strong> &quot;Rückerstattungsantrag - [Ihr Name/Benutzername]&quot;
                    </li>
                    <li>
                      <strong className="text-white">Angaben:</strong> Benutzername, E-Mail-Adresse und Transaktions-ID 
                      (falls verfügbar)
                    </li>
                    <li>
                      <strong className="text-white">Grund (optional):</strong> Sie können uns mitteilen, warum Sie 
                      eine Rückerstattung wünschen – dies hilft uns, unseren Service zu verbessern
                    </li>
                  </ol>
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6 mt-6">
                    <p className="text-blue-300">
                      <strong>Schnelle Bearbeitung:</strong> Wir bearbeiten Rückerstattungsanträge innerhalb 
                      von 48 Stunden. Die Rückerstattung erfolgt auf Ihr ursprüngliches Zahlungsmittel 
                      und kann je nach Bank/Zahlungsanbieter 5-10 Werktage dauern.
                    </p>
                  </div>
                </div>
              </section>

              {/* Zahlungsanbieter */}
              <section>
                <h2 className="text-2xl font-bold text-white mb-6">
                  5. Zahlungsabwicklung über Paddle
                </h2>
                <div className="space-y-4">
                  <p>
                    Alle Zahlungen und Rückerstattungen werden über unseren Zahlungsdienstleister 
                    <strong className="text-white"> Paddle</strong> abgewickelt.
                  </p>
                  <ul className="list-disc ml-6 space-y-2">
                    <li>
                      Paddle fungiert als Reseller und wickelt alle Transaktionen sicher ab
                    </li>
                    <li>
                      Ihre Zahlungsinformationen werden gemäß PCI-DSS-Standards geschützt
                    </li>
                    <li>
                      Rückerstattungen erfolgen über Paddle zurück auf Ihr Zahlungsmittel
                    </li>
                    <li>
                      Bei Fragen zu Transaktionen kontaktieren Sie uns oder direkt Paddle Support
                    </li>
                  </ul>
                </div>
              </section>

              {/* Kontakt */}
              <section>
                <h2 className="text-2xl font-bold text-white mb-6">
                  6. Kontakt & Support
                </h2>
                <div className="space-y-4">
                  <p>
                    Bei Fragen zu unserer Rückerstattungsrichtlinie oder zu Ihrem Abonnement 
                    stehen wir Ihnen gerne zur Verfügung:
                  </p>
                  <div className="bg-slate-700/50 border border-slate-600 rounded-xl p-6">
                    <div className="space-y-2">
                      <p>
                        <strong className="text-white">E-Mail:</strong>{' '}
                        <a href="mailto:support@pro-meister.de" className="text-blue-400 hover:text-blue-300">
                          support@pro-meister.de
                        </a>
                      </p>
                      <p>
                        <strong className="text-white">Antwortzeit:</strong> Innerhalb von 24 Stunden (an Werktagen)
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Änderungen */}
              <section className="border-t border-slate-700 pt-10">
                <h2 className="text-2xl font-bold text-white mb-6">
                  7. Änderungen dieser Richtlinie
                </h2>
                <div className="text-slate-300 leading-relaxed">
                  <p>
                    Wir behalten uns vor, diese Rückerstattungsrichtlinie bei Bedarf zu aktualisieren. 
                    Wesentliche Änderungen werden wir Ihnen per E-Mail mitteilen. Die aktuelle Version 
                    finden Sie stets auf dieser Seite.
                  </p>
                  <p className="mt-4 text-sm text-slate-400">
                    <strong>Letzte Aktualisierung:</strong> {new Date().toLocaleDateString('de-DE')}
                  </p>
                </div>
              </section>

            </div>

            {/* Summary Box */}
            <div className="mt-12 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/30 rounded-2xl p-8">
              <h3 className="text-2xl font-bold text-white mb-4">
                Zusammenfassung
              </h3>
              <ul className="space-y-3 text-slate-200">
                <li className="flex items-start gap-3">
                  <span className="text-green-400 text-xl flex-shrink-0">✓</span>
                  <span><strong>30 Tage kostenlos testen</strong> – ohne Risiko, ohne Zahlungsverpflichtung</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-400 text-xl flex-shrink-0">✓</span>
                  <span><strong>14-Tage-Geld-zurück-Garantie</strong> nach der ersten Zahlung</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-400 text-xl flex-shrink-0">✓</span>
                  <span><strong>Jederzeit kündbar</strong> – keine versteckten Kosten</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-400 text-xl flex-shrink-0">✓</span>
                  <span><strong>Schnelle Bearbeitung</strong> – Rückerstattung innerhalb von 48 Stunden</span>
                </li>
              </ul>
            </div>

            {/* Back to Home */}
            <div className="text-center mt-12">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors font-medium text-lg"
              >
                ← Zurück zur Startseite
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 px-6 mt-12">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-wrap justify-center gap-6 mb-4">
            <Link href="/privacy" className="text-slate-400 hover:text-white transition-colors text-sm">
              Datenschutz
            </Link>
            <Link href="/terms" className="text-slate-400 hover:text-white transition-colors text-sm">
              AGB
            </Link>
            <Link href="/refund" className="text-slate-400 hover:text-white transition-colors text-sm font-semibold">
              Rückerstattung
            </Link>
            <Link href="/imprint" className="text-slate-400 hover:text-white transition-colors text-sm">
              Impressum
            </Link>
          </div>
          <p className="text-slate-400 text-sm text-center">
            &copy; {new Date().getFullYear()} pro-meister.de – Digitale Lösungen für Handwerker
          </p>
        </div>
      </footer>
    </div>
  );
}