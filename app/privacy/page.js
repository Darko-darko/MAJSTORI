// app/privacy/page.js - Brza Privacy Policy za Google OAuth
export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-slate-900 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-slate-800 rounded-2xl p-8">
          <h1 className="text-3xl font-bold text-white mb-8">Datenschutzerklärung</h1>
          
          <div className="space-y-6 text-slate-300">
            <section>
              <h2 className="text-xl font-semibold text-white mb-4">1. Verantwortliche Stelle</h2>
              <p>
                Pro-meister.de<br/>
                E-Mail: support@pro-meister.de
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">2. Erhebung und Verarbeitung personenbezogener Daten</h2>
              <p>
                Wir erheben und verarbeiten personenbezogene Daten nur im Rahmen der gesetzlichen Bestimmungen. 
                Bei der Nutzung unserer Dienste können folgende Daten erfasst werden:
              </p>
              <ul className="list-disc ml-6 mt-2">
                <li>E-Mail-Adresse (für Kontenerstellung und Kommunikation)</li>
                <li>Name (für Profilgestaltung)</li>
                <li>Technische Daten (IP-Adresse, Browser-Information für Sicherheit)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">3. Google OAuth</h2>
              <p>
                Bei der Anmeldung über Google erhalten wir nur die von Ihnen freigegebenen Informationen 
                (E-Mail-Adresse und Name). Wir verwenden diese Daten ausschließlich für die Kontenerstellung 
                und zur Bereitstellung unserer Dienste.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">4. Zweck der Datenverarbeitung</h2>
              <ul className="list-disc ml-6">
                <li>Bereitstellung der Plattform-Dienste</li>
                <li>Kontoverwaltung und Authentifizierung</li>
                <li>Kommunikation mit Nutzern</li>
                <li>Sicherheit und Betrugsschutz</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">5. Datenspeicherung</h2>
              <p>
                Ihre Daten werden in Europa (Supabase) gespeichert und verarbeitet. 
                Wir halten uns an die DSGVO-Bestimmungen.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">6. Ihre Rechte</h2>
              <p>Sie haben das Recht auf:</p>
              <ul className="list-disc ml-6 mt-2">
                <li>Auskunft über Ihre gespeicherten Daten</li>
                <li>Berichtigung unrichtiger Daten</li>
                <li>Löschung Ihrer Daten</li>
                <li>Einschränkung der Verarbeitung</li>
                <li>Datenübertragbarkeit</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">7. Cookies</h2>
              <p>
                Wir verwenden technisch notwendige Cookies für die Authentifizierung und 
                Sicherheit der Plattform. Diese sind für die Funktionalität erforderlich.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">8. Kontakt</h2>
              <p>
                Bei Fragen zum Datenschutz kontaktieren Sie uns unter:<br/>
                E-Mail: support@pro-meister.de
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">9. Änderungen</h2>
              <p>
                Wir behalten uns vor, diese Datenschutzerklärung bei Bedarf zu aktualisieren. 
                Die aktuelle Version finden Sie stets auf dieser Seite.
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