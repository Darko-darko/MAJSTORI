// app/privacy/page.js - POBOLJŠANA Privacy Policy sa Paddle i detaljima
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
                Verantwortlich für die Datenverarbeitung auf dieser Website ist:
              </p>
              <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4 mt-3">
                <p className="font-medium text-white">Kilimanjaro doo</p>
                <p>Milenka Grcica 11</p>
                <p>21000 Novi Sad, Serbien</p>
                <p className="mt-2">
                  E-Mail:{' '}
                  <a href="mailto:support@pro-meister.de" className="text-blue-400 hover:text-blue-300">
                    support@pro-meister.de
                  </a>
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">2. Erhebung und Verarbeitung personenbezogener Daten</h2>
              <p>
                Wir erheben und verarbeiten personenbezogene Daten nur im Rahmen der gesetzlichen 
                Bestimmungen der Datenschutz-Grundverordnung (DSGVO) und des Bundesdatenschutzgesetzes (BDSG).
              </p>
              <p className="mt-3">
                Bei der Nutzung unserer Dienste können folgende Daten erfasst werden:
              </p>
              <ul className="list-disc ml-6 mt-2 space-y-2">
                <li>
                  <strong className="text-white">Kontodaten:</strong> E-Mail-Adresse, Name, 
                  Profilbild (optional)
                </li>
                <li>
                  <strong className="text-white">Unternehmensdaten:</strong> Firmenname, Adresse, 
                  Steuernummer, Logo (für Rechnungen)
                </li>
                <li>
                  <strong className="text-white">Kundendaten:</strong> Namen, Adressen, 
                  Kontaktdaten Ihrer Kunden (die Sie selbst eingeben)
                </li>
                <li>
                  <strong className="text-white">Nutzungsdaten:</strong> IP-Adresse, Browser-Typ, 
                  Zugriffszeitpunkte (für Sicherheit und Fehleranalyse)
                </li>
                <li>
                  <strong className="text-white">Zahlungsdaten:</strong> Werden ausschließlich 
                  von unserem Zahlungsdienstleister Paddle verarbeitet
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">3. Google OAuth Anmeldung</h2>
              <p>
                Bei der Anmeldung über Google erhalten wir nur die von Ihnen freigegebenen 
                Informationen:
              </p>
              <ul className="list-disc ml-6 mt-2 space-y-1">
                <li>E-Mail-Adresse (erforderlich)</li>
                <li>Name und Profilbild (optional)</li>
              </ul>
              <p className="mt-3">
                Wir verwenden diese Daten ausschließlich für die Kontenerstellung und zur 
                Bereitstellung unserer Dienste. Wir haben keinen Zugriff auf Ihr Google-Passwort 
                oder andere Google-Dienste.
              </p>
              <p className="mt-2 text-sm text-slate-400">
                Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung)
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">4. Zweck der Datenverarbeitung</h2>
              <p>Wir verarbeiten Ihre personenbezogenen Daten für folgende Zwecke:</p>
              <ul className="list-disc ml-6 mt-2 space-y-2">
                <li>
                  <strong className="text-white">Bereitstellung der Plattform:</strong> 
                  Digitale Visitenkarte, Rechnungserstellung, Kundenverwaltung
                </li>
                <li>
                  <strong className="text-white">Kontoverwaltung:</strong> Authentifizierung, 
                  Profilverwaltung, Abonnementverwaltung
                </li>
                <li>
                  <strong className="text-white">Kommunikation:</strong> Wichtige Benachrichtigungen, 
                  Support, Updates zu Funktionen
                </li>
                <li>
                  <strong className="text-white">Sicherheit:</strong> Betrugsschutz, 
                  Missbrauchserkennung, Fehlerbehebung
                </li>
                <li>
                  <strong className="text-white">Verbesserung:</strong> Analyse der Nutzung zur 
                  Optimierung unserer Dienste (anonymisiert)
                </li>
              </ul>
              <p className="mt-3 text-sm text-slate-400">
                Rechtsgrundlagen: Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung), 
                Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse)
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">5. Datenspeicherung und Serverstandort</h2>
              <div className="space-y-3">
                <p>
                  <strong className="text-white">Serverstandort:</strong> Alle Ihre Daten werden 
                  in Europa auf Servern von Supabase (EU-Region) gespeichert und verarbeitet. 
                  Wir halten uns strikt an die DSGVO-Bestimmungen.
                </p>
                <p>
                  <strong className="text-white">Speicherdauer:</strong>
                </p>
                <ul className="list-disc ml-6 space-y-1">
                  <li>
                    Während der Nutzung: Solange Ihr Konto aktiv ist
                  </li>
                  <li>
                    Nach Kündigung: Daten werden nach 30 Tagen automatisch gelöscht
                  </li>
                  <li>
                    Gesetzliche Aufbewahrungsfristen: Rechnungsdaten werden gemäß 
                    steuerrechtlicher Vorgaben aufbewahrt (10 Jahre in Deutschland)
                  </li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">6. Zahlungsabwicklung mit Paddle</h2>
              <div className="space-y-3">
                <p>
                  Für die Zahlungsabwicklung nutzen wir <strong className="text-white">Paddle</strong> 
                  als autorisierten Reseller:
                </p>
                <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
                  <p className="font-medium text-white">Paddle.com Market Limited</p>
                  <p className="text-sm">Judd House, 18-29 Mora Street</p>
                  <p className="text-sm">London EC1V 8BT, United Kingdom</p>
                  <p className="text-sm mt-2">
                    Website:{' '}
                    <a 
                      href="https://www.paddle.com/legal/privacy" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300"
                    >
                      paddle.com/legal/privacy
                    </a>
                  </p>
                </div>
                <p className="mt-3">
                  <strong className="text-white">Was Paddle verarbeitet:</strong>
                </p>
                <ul className="list-disc ml-6 space-y-1">
                  <li>Zahlungsinformationen (Kreditkarte, PayPal, etc.)</li>
                  <li>Rechnungsadresse und Kontaktdaten</li>
                  <li>Transaktionshistorie</li>
                </ul>
                <p className="mt-3">
                  <strong className="text-white">Wichtig:</strong> Wir haben <u>keinen Zugriff</u> 
                  auf Ihre Zahlungsdaten. Diese werden ausschließlich von Paddle gemäß 
                  PCI-DSS-Standards verarbeitet.
                </p>
                <p className="mt-2 text-sm text-slate-400">
                  Mit Paddle haben wir einen Auftragsverarbeitungsvertrag (AVV) gemäß 
                  Art. 28 DSGVO geschlossen.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">7. Cookies und Tracking</h2>
              <div className="space-y-3">
                <p>
                  Wir verwenden Cookies sparsam und nur soweit notwendig:
                </p>
                
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                  <h3 className="font-semibold text-white mb-2">
                    Notwendige Cookies (ohne Zustimmung)
                  </h3>
                  <p className="text-sm">
                    Diese Cookies sind für die grundlegende Funktionalität der Website 
                    erforderlich und werden automatisch gesetzt:
                  </p>
                  <ul className="list-disc ml-6 mt-2 text-sm space-y-1">
                    <li>
                      <strong className="text-white">Session-Cookie:</strong> Für Ihre Anmeldung 
                      und Authentifizierung
                    </li>
                    <li>
                      <strong className="text-white">Sicherheits-Cookies:</strong> Zum Schutz vor 
                      CSRF-Angriffen
                    </li>
                    <li>
                      <strong className="text-white">Präferenz-Cookies:</strong> Für Sprache und 
                      Darstellungsoptionen
                    </li>
                  </ul>
                  <p className="text-sm text-slate-300 mt-2">
                    Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse)
                  </p>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <h3 className="font-semibold text-white mb-2">
                    Keine Marketing- oder Tracking-Cookies
                  </h3>
                  <p className="text-sm">
                    Wir verwenden <strong className="text-white">keine</strong> Cookies für:
                  </p>
                  <ul className="list-disc ml-6 mt-2 text-sm space-y-1">
                    <li>Werbenetzwerke (Google Ads, Facebook Pixel, etc.)</li>
                    <li>Tracking über mehrere Websites hinweg</li>
                    <li>Verkauf Ihrer Daten an Dritte</li>
                    <li>Verhaltensanalyse für Werbezwecke</li>
                  </ul>
                </div>

                <p className="mt-3 text-sm text-slate-400">
                  Sie können Cookies in Ihren Browser-Einstellungen jederzeit löschen oder 
                  blockieren. Dies kann jedoch die Funktionalität der Website einschränken.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">8. Ihre Rechte gemäß DSGVO</h2>
              <p>Sie haben folgende Rechte in Bezug auf Ihre personenbezogenen Daten:</p>
              <ul className="list-disc ml-6 mt-3 space-y-2">
                <li>
                  <strong className="text-white">Recht auf Auskunft (Art. 15 DSGVO):</strong> 
                  Sie können Auskunft über Ihre gespeicherten Daten verlangen
                </li>
                <li>
                  <strong className="text-white">Recht auf Berichtigung (Art. 16 DSGVO):</strong> 
                  Sie können unrichtige Daten korrigieren lassen
                </li>
                <li>
                  <strong className="text-white">Recht auf Löschung (Art. 17 DSGVO):</strong> 
                  Sie können die Löschung Ihrer Daten verlangen (&quot;Recht auf Vergessenwerden&quot;)
                </li>
                <li>
                  <strong className="text-white">Recht auf Einschränkung (Art. 18 DSGVO):</strong> 
                  Sie können die Einschränkung der Verarbeitung verlangen
                </li>
                <li>
                  <strong className="text-white">Recht auf Datenübertragbarkeit (Art. 20 DSGVO):</strong> 
                  Sie können Ihre Daten in einem strukturierten Format erhalten
                </li>
                <li>
                  <strong className="text-white">Widerspruchsrecht (Art. 21 DSGVO):</strong> 
                  Sie können der Verarbeitung Ihrer Daten widersprechen
                </li>
              </ul>
              <p className="mt-4 text-sm bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                <strong className="text-white">So machen Sie Ihre Rechte geltend:</strong><br/>
                Kontaktieren Sie uns per E-Mail an{' '}
                <a href="mailto:support@pro-meister.de" className="text-blue-400 hover:text-blue-300">
                  support@pro-meister.de
                </a>
                . Wir bearbeiten Ihre Anfrage innerhalb von 30 Tagen.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">9. Datenweitergabe an Dritte</h2>
              <div className="space-y-3">
                <p>
                  Wir geben Ihre personenbezogenen Daten nur in folgenden Fällen an Dritte weiter:
                </p>
                <ul className="list-disc ml-6 space-y-2">
                  <li>
                    <strong className="text-white">Paddle (Zahlungsabwicklung):</strong> 
                    Für die Verarbeitung von Zahlungen und Rechnungen
                  </li>
                  <li>
                    <strong className="text-white">Supabase (Hosting):</strong> 
                    Für die Speicherung und Verarbeitung Ihrer Daten (AVV vorhanden)
                  </li>
                  <li>
                    <strong className="text-white">Gesetzliche Verpflichtungen:</strong> 
                    Wenn wir dazu rechtlich verpflichtet sind
                  </li>
                </ul>
                <p className="mt-3 text-sm bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-200">
                  <strong>Wir verkaufen Ihre Daten niemals!</strong> Wir geben Ihre Daten nicht 
                  für Werbezwecke an Dritte weiter.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">10. Datensicherheit</h2>
              <p>
                Wir ergreifen umfassende technische und organisatorische Maßnahmen zum Schutz 
                Ihrer Daten:
              </p>
              <ul className="list-disc ml-6 mt-2 space-y-1">
                <li>SSL/TLS-Verschlüsselung für alle Datenübertragungen</li>
                <li>Verschlüsselte Datenspeicherung in der Datenbank</li>
                <li>Regelmäßige Sicherheits-Updates und Penetrationstests</li>
                <li>Zugriffskontrolle und Authentifizierung</li>
                <li>Regelmäßige Backups Ihrer Daten</li>
                <li>Schulung unserer Mitarbeiter im Datenschutz</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">11. Beschwerderecht</h2>
              <p>
                Sie haben das Recht, sich bei einer Datenschutz-Aufsichtsbehörde über die 
                Verarbeitung Ihrer personenbezogenen Daten zu beschweren.
              </p>
              <p className="mt-3">
                <strong className="text-white">Zuständige Aufsichtsbehörde in Deutschland:</strong>
              </p>
              <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4 mt-2">
                <p>Die Bundesbeauftragte für den Datenschutz und die Informationsfreiheit</p>
                <p className="text-sm mt-2">Graurheindorfer Str. 153</p>
                <p className="text-sm">53117 Bonn</p>
                <p className="text-sm mt-2">
                  Website:{' '}
                  <a 
                    href="https://www.bfdi.bund.de" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300"
                  >
                    www.bfdi.bund.de
                  </a>
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">12. Kontakt für Datenschutzfragen</h2>
              <p>
                Bei Fragen zum Datenschutz oder zur Ausübung Ihrer Rechte kontaktieren Sie uns:
              </p>
              <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4 mt-3">
                <p className="font-medium text-white">Datenschutz bei Pro-meister.de</p>
                <p className="mt-2">
                  E-Mail:{' '}
                  <a href="mailto:support@pro-meister.de" className="text-blue-400 hover:text-blue-300">
                    support@pro-meister.de
                  </a>
                </p>
                <p className="text-sm text-slate-400 mt-2">
                  Betreff: &quot;Datenschutzanfrage&quot;
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">13. Änderungen dieser Datenschutzerklärung</h2>
              <p>
                Wir behalten uns vor, diese Datenschutzerklärung bei Bedarf zu aktualisieren, 
                um sie an geänderte Rechtslage oder Änderungen unserer Dienste anzupassen.
              </p>
              <p className="mt-2">
                Wesentliche Änderungen werden wir Ihnen per E-Mail mitteilen. Die aktuelle 
                Version finden Sie stets auf dieser Seite.
              </p>
            </section>

            <div className="mt-8 pt-6 border-t border-slate-700">
              <p className="text-sm text-slate-400">
                <strong className="text-white">Stand:</strong> {new Date().toLocaleDateString('de-DE')}<br/>
                <strong className="text-white">Version:</strong> 2.0<br/>
                Pro-meister.de - Digitale Lösungen für Handwerker
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}