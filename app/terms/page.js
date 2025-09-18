// app/terms/page.js - Brze AGB za platformu
export default function Terms() {
  return (
    <div className="min-h-screen bg-slate-900 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-slate-800 rounded-2xl p-8">
          <h1 className="text-3xl font-bold text-white mb-8">Allgemeine Geschäftsbedingungen (AGB)</h1>
          
          <div className="space-y-6 text-slate-300">
            <section>
              <h2 className="text-xl font-semibold text-white mb-4">1. Geltungsbereich</h2>
              <p>
                Diese Allgemeinen Geschäftsbedingungen (AGB) gelten für die Nutzung der Plattform 
                Pro-meister.de und aller damit verbundenen Dienste.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">2. Leistungen</h2>
              <p>Pro-meister.de bietet Handwerkern folgende Dienste:</p>
              <ul className="list-disc ml-6 mt-2">
                <li>Digitale Visitenkarten mit QR-Code</li>
                <li>Rechnungs- und Angebotserstellung</li>
                <li>Kundenverwaltung</li>
                <li>Terminplanung</li>
                <li>Garantieverwaltung</li>
                <li>Weitere Geschäftstools für Handwerker</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">3. Registrierung und Nutzerkonto</h2>
              <ul className="list-disc ml-6">
                <li>Die Registrierung ist kostenfrei möglich</li>
                <li>Es wird eine 7-tägige kostenlose Testphase gewährt</li>
                <li>Nutzer sind für die Sicherheit ihrer Zugangsdaten verantwortlich</li>
                <li>Falsche Angaben bei der Registrierung sind nicht gestattet</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">4. Kostenlose Testphase</h2>
              <p>
                Neue Nutzer erhalten eine 7-tägige kostenlose Testphase mit vollem Funktionsumfang. 
                Nach Ablauf der Testphase ist ein kostenpflichtiges Abonnement erforderlich.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">5. Abonnement und Zahlungen</h2>
              <ul className="list-disc ml-6">
                <li>Abonnements verlängern sich automatisch</li>
                <li>Kündigung ist jederzeit zum Ende der Laufzeit möglich</li>
                <li>Zahlungen erfolgen über sichere Payment-Provider</li>
                <li>Bei Zahlungsausfall wird der Zugang eingeschränkt</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">6. Nutzerverhalten</h2>
              <p>Nicht gestattet sind:</p>
              <ul className="list-disc ml-6 mt-2">
                <li>Missbrauch der Plattform</li>
                <li>Verwendung für illegale Zwecke</li>
                <li>Belästigung anderer Nutzer</li>
                <li>Spam oder unerwünschte Nachrichten</li>
                <li>Verletzung von Urheberrechten</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">7. Daten und Sicherheit</h2>
              <p>
                Nutzerdaten werden gemäß unserer Datenschutzerklärung behandelt. 
                Wir verwenden moderne Sicherheitsstandards zum Schutz Ihrer Daten.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">8. Haftung</h2>
              <p>
                Die Haftung von Pro-meister.de ist auf Vorsatz und grobe Fahrlässigkeit beschränkt. 
                Für mittelbare Schäden wird keine Haftung übernommen.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">9. Kündigung</h2>
              <ul className="list-disc ml-6">
                <li>Nutzer können ihr Konto jederzeit kündigen</li>
                <li>Bei Verstoß gegen diese AGB können wir Konten sperren</li>
                <li>Nach Kündigung werden Daten gemäß Datenschutz behandelt</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">10. Änderungen der AGB</h2>
              <p>
                Wir behalten uns vor, diese AGB bei Bedarf zu ändern. 
                Nutzer werden über wesentliche Änderungen informiert.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">11. Anwendbares Recht</h2>
              <p>
                Es gilt deutsches Recht. Gerichtsstand ist der Sitz des Unternehmens.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">12. Kontakt</h2>
              <p>
                Bei Fragen zu diesen AGB kontaktieren Sie uns:<br/>
                E-Mail: support@pro-meister.de
              </p>
            </section>

            <div className="mt-8 pt-6 border-t border-slate-700">
              <p className="text-sm text-slate-400">
                Stand: {new Date().toLocaleDateString('de-DE')}<br/>
                Pro-meister.de - Digitale Lösungen für Handwerker
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}