// app/terms/page.js — AGB (DE), pravno usklađeno, sa 30-dnevnom probom i FastSpring reseller napomenama
export default function Terms() {
  return (
    <div className="min-h-screen bg-slate-900 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-slate-800 rounded-2xl p-8">
          <h1 className="text-3xl font-bold text-white mb-8">Allgemeine Geschäftsbedingungen (AGB)</h1>

          <div className="space-y-6 text-slate-300">
            {/* 1 */}
            <section>
              <h2 className="text-xl font-semibold text-white mb-4">1. Geltungsbereich</h2>
              <p>
                Diese Allgemeinen Geschäftsbedingungen (AGB) regeln die Nutzung der Plattform
                <span className="text-white font-medium"> Pro-meister.de</span> (&bdquo;Plattform&bdquo;) sowie aller damit
                verbundenen Dienste des Anbieters <span className="text-white font-medium">Kilimanjaro doo</span>.
                Abweichende Bedingungen gelten nicht, es sei denn, ihrer Geltung wurde ausdrücklich schriftlich zugestimmt.
              </p>
            </section>

            {/* 2 */}
            <section>
              <h2 className="text-xl font-semibold text-white mb-4">2. Leistungen</h2>
              <p>Die Plattform stellt insbesondere folgende Funktionen bereit:</p>
              <ul className="list-disc ml-6 mt-2 space-y-1">
                <li>Digitale Visitenkarten mit QR-Code</li>
                <li>Angebots- und Rechnungserstellung (ZUGFeRD 2.1 konform)</li>
                <li>Kundenverwaltung</li>
                <li>Terminplanung</li>
                <li>Garantieverwaltung</li>
                <li>Weitere Geschäftstools für Handwerker</li>
              </ul>
              <p className="mt-3 text-sm text-slate-400">
                Der konkrete Funktionsumfang kann je nach gewähltem Tarif (Freemium/PRO) variieren.
              </p>
            </section>

            {/* 3 */}
            <section>
              <h2 className="text-xl font-semibold text-white mb-4">3. Registrierung und Nutzerkonto</h2>
              <ul className="list-disc ml-6 space-y-1">
                <li>Die Registrierung ist kostenfrei.</li>
                <li>Es ist pro Nutzer/Unternehmen nur ein Konto zulässig.</li>
                <li>Nutzer sind verpflichtet, Zugangsdaten geheim zu halten und gegen unbefugten Zugriff zu schützen.</li>
                <li>Falsche oder irreführende Angaben sind unzulässig.</li>
              </ul>
            </section>

            {/* 4 */}
            <section>
              <h2 className="text-xl font-semibold text-white mb-4">4. Kostenlose Testphase (30 Tage)</h2>
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6 space-y-3">
                <p className="text-white font-medium">
                  Neue Nutzer erhalten eine <strong>30-tägige kostenlose Testphase</strong> mit vollem Funktionsumfang der PRO-Features.
                </p>
                <ul className="list-disc ml-6 space-y-2">
                  <li>Während der Testphase entstehen keine Kosten; es erfolgt keine automatische Abbuchung ohne Ihre ausdrückliche Zustimmung zum Abschluss eines Abonnements.</li>
                  <li>Die Testphase kann jederzeit beendet werden; das Konto kann anschließend weiter im Freemium-Modell genutzt werden.</li>
                  <li>Nach Ablauf der Testphase ist für PRO-Funktionen ein kostenpflichtiges Abonnement erforderlich.</li>
                  <li>Die digitale Visitenkarte bleibt dauerhaft kostenfrei (Freemium).</li>
                </ul>
                <p className="text-sm text-slate-300">
                  Hinweise zu Rückerstattungen entnehmen Sie bitte unserer{" "}
                  <a href="/refund" className="text-blue-400 hover:text-blue-300 underline">Rückerstattungsrichtlinie</a>.
                </p>
              </div>
            </section>

            {/* 5 */}
            <section>
              <h2 className="text-xl font-semibold text-white mb-4">5. Vertragspartner, Abonnement und Zahlungen</h2>
              <p>
                Der <span className="text-white font-medium">Leistungsanbieter</span> der Plattform ist Kilimanjaro doo.
                Der <span className="text-white font-medium">Vertrag über den Erwerb des Abonnements (Zahlung)</span> kommt über unseren autorisierten
                Zahlungsdienstleister <span className="text-white font-medium">FastSpring</span> (Reseller of Record) zustande.
              </p>
              <ul className="list-disc ml-6 mt-3 space-y-2">
                <li><span className="text-white font-medium">Monatliches Abonnement:</span> Verlängert sich automatisch monatlich; Kündigung zum Ende des jeweiligen Abrechnungszeitraums möglich.</li>
                <li><span className="text-white font-medium">Jährliches Abonnement:</span> Verlängert sich automatisch jährlich; Kündigung zum Ende des Jahresabonnements möglich.</li>
                <li>Zahlungen werden ausschließlich über FastSpring abgewickelt; wir erhalten keinen Zugriff auf Zahlungsdaten.</li>
                <li>Bei Zahlungsausfall können PRO-Funktionen vorübergehend eingeschränkt werden.</li>
                <li>Preisänderungen werden mindestens 30 Tage vor Wirksamwerden angekündigt.</li>
              </ul>
              <p className="mt-3 text-sm text-slate-400">
                Verwaltung des Abonnements (Rechnungen, Kündigung, Zahlungsarten) erfolgt im FastSpring-Kundenkonto (Account Management).
              </p>
            </section>

            {/* 6 */}
            <section>
              <h2 className="text-xl font-semibold text-white mb-4">6. Kündigung, Widerruf und Rückerstattung</h2>
              <p className="font-medium text-white">Kündigung durch den Nutzer</p>
              <ul className="list-disc ml-6 space-y-2">
                <li>Kündigung ist jederzeit möglich über das FastSpring-Kundenkonto oder per E-Mail an <a href="mailto:support@pro-meister.de" className="text-blue-400 hover:text-blue-300">support@pro-meister.de</a>.</li>
                <li>Die Leistungen bleiben bis zum Ende des bereits bezahlten Zeitraums aktiv.</li>
                <li>Die digitale Visitenkarte bleibt auch nach Kündigung im Freemium-Modell verfügbar.</li>
              </ul>
              <p className="mt-4 font-medium text-white">Widerrufsrecht für Verbraucher</p>
              <p>
                Verbraucher haben ein gesetzliches Widerrufsrecht. Die Einzelheiten ergeben sich aus unserer
                <a href="/withdrawal" className="text-blue-400 hover:text-blue-300 underline"> Widerrufsbelehrung</a>.
              </p>
              <p className="mt-4 font-medium text-white">Rückerstattung</p>
              <p>
                Unabhängig von gesetzlichen Rechten gewähren wir eine <span className="text-white font-medium">14-Tage-Geld-zurück-Garantie</span>
                ab der ersten Zahlung. Näheres regelt die{" "}
                <a href="/refund" className="text-blue-400 hover:text-blue-300 underline">Rückerstattungsrichtlinie</a>.
              </p>
              <p className="mt-4 font-medium text-white">Kündigung durch Pro-meister.de</p>
              <ul className="list-disc ml-6 space-y-2">
                <li>Bei Verstößen gegen diese AGB sind Sperrung und Löschung des Kontos möglich; bei schwerwiegenden Verstößen ohne Vorankündigung.</li>
                <li>Bereits gezahlte Beträge werden in diesem Fall nicht erstattet, sofern keine gesetzlichen Ansprüche entgegenstehen.</li>
              </ul>
            </section>

            {/* 7 */}
            <section>
              <h2 className="text-xl font-semibold text-white mb-4">7. Pflichten des Nutzers und unzulässige Nutzung</h2>
              <ul className="list-disc ml-6 space-y-1">
                <li>Keine rechtswidrige oder missbräuchliche Nutzung der Plattform.</li>
                <li>Keine Belästigung anderer Nutzer; kein Spam.</li>
                <li>Kein Reverse Engineering, keine unbefugten Zugriffe.</li>
                <li>Keine Mehrfachregistrierungen zur Umgehung der Testphase.</li>
                <li>Keine Weitergabe von Zugangsdaten an Dritte.</li>
                <li>Wahrung von Urheberrechten und Rechten Dritter.</li>
              </ul>
            </section>

            {/* 8 */}
            <section>
              <h2 className="text-xl font-semibold text-white mb-4">8. Daten und Datenschutz</h2>
              <p>
                Die Verarbeitung personenbezogener Daten richtet sich nach unserer{" "}
                <a href="/privacy" className="text-blue-400 hover:text-blue-300 underline">Datenschutzerklärung</a>.
              </p>
              <ul className="list-disc ml-6 mt-3 space-y-1">
                <li>Datenspeicherung in der EU (Supabase, Region Frankfurt).</li>
                <li>Verschlüsselte Übertragung (SSL/TLS) und regelmäßige Backups.</li>
              </ul>
              <p className="mt-3 text-sm text-slate-400">
                Trotz angemessener Vorkehrungen kann eine lückenlose Sicherheit nicht garantiert werden.
                Nutzer sind für die Sicherung ihrer Daten (Backups) mitverantwortlich.
              </p>
            </section>

            {/* 9 */}
            <section>
              <h2 className="text-xl font-semibold text-white mb-4">9. Haftung</h2>
              <ul className="list-disc ml-6 mt-2 space-y-2">
                <li><span className="text-white font-medium">Unbeschränkt</span> haften wir bei Vorsatz, grober Fahrlässigkeit sowie bei Verletzung von Leben, Körper oder Gesundheit.</li>
                <li><span className="text-white font-medium">Bei einfacher Fahrlässigkeit</span> haften wir nur für die Verletzung vertragswesentlicher Pflichten (Kardinalpflichten) und der Höhe nach begrenzt auf den vertragstypisch vorhersehbaren Schaden.</li>
                <li>Keine Haftung für mittelbare Schäden, entgangenen Gewinn oder höhere Gewalt.</li>
              </ul>
            </section>

            {/* 10 */}
            <section>
              <h2 className="text-xl font-semibold text-white mb-4">10. Verfügbarkeit der Dienste</h2>
              <ul className="list-disc ml-6 mt-2 space-y-1">
                <li>Angestrebte Verfügbarkeit: 99&nbsp;% im Jahresdurchschnitt.</li>
                <li>Geplante Wartungen werden, soweit möglich, vorab angekündigt.</li>
                <li>Notfall-Wartungen können jederzeit erfolgen.</li>
                <li>Eine ununterbrochene Verfügbarkeit wird nicht garantiert.</li>
              </ul>
            </section>

            {/* 11 */}
            <section>
              <h2 className="text-xl font-semibold text-white mb-4">11. Änderungen dieser AGB</h2>
              <p>
                Wir können diese AGB mit Wirkung für die Zukunft anpassen. Über wesentliche Änderungen informieren wir per E-Mail.
                Änderungen gelten als akzeptiert, sofern nicht innerhalb von 30 Tagen widersprochen wird; bei Widerspruch kann das Nutzungsverhältnis beendet werden.
              </p>
            </section>

            {/* 12 */}
            <section>
              <h2 className="text-xl font-semibold text-white mb-4">12. Anwendbares Recht, Verbraucherprivilegien, Gerichtsstand</h2>
              <p>
                Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts.
                Gegenüber <span className="text-white font-medium">Verbrauchern</span> bleiben zwingende Verbraucherschutzvorschriften
                des Mitgliedstaats ihres gewöhnlichen Aufenthalts unberührt. Soweit gesetzlich zulässig, ist Gerichtsstand der Sitz des Unternehmens.
              </p>
            </section>

            {/* 13 */}
            <section>
              <h2 className="text-xl font-semibold text-white mb-4">13. Salvatorische Klausel</h2>
              <p>
                Sollten einzelne Bestimmungen unwirksam sein oder werden, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt.
                Anstelle der unwirksamen Bestimmung tritt diejenige wirksame Regelung, die dem wirtschaftlichen Zweck am nächsten kommt.
              </p>
            </section>

            {/* 14 */}
            <section>
              <h2 className="text-xl font-semibold text-white mb-4">14. Kontakt</h2>
              <p>
                Fragen zu diesen AGB richten Sie bitte an{" "}
                <a href="mailto:support@pro-meister.de" className="text-blue-400 hover:text-blue-300">support@pro-meister.de</a>.
              </p>
            </section>

            <div className="mt-8 pt-6 border-t border-slate-700">
              <p className="text-sm text-slate-400">
                Stand: {new Date().toLocaleDateString('de-DE')}<br />
                Pro-meister.de – Digitale Lösungen für Handwerker
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}