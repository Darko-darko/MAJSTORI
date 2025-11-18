// app/privacy/page.js — Finalna pravna verzija (DE, 2025) sa FastSpring
export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-slate-900 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-slate-800 rounded-2xl p-8">
          <h1 className="text-3xl font-bold text-white mb-8">Datenschutzerklärung</h1>

          <div className="space-y-6 text-slate-300">
            {/* 1. Verantwortliche Stelle */}
            <section>
              <h2 className="text-xl font-semibold text-white mb-4">1. Verantwortliche Stelle</h2>
              <p>Verantwortlich im Sinne der DSGVO ist:</p>
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

            {/* 2. EU-Vertreter */}
            <section>
              <h2 className="text-xl font-semibold text-white mb-4">2. EU-Vertreter gemäß Art. 27 DSGVO</h2>
              <p>
                Da wir personenbezogene Daten von betroffenen Personen innerhalb der Europäischen Union im Rahmen
                unserer Dienste verarbeiten, benennen wir einen EU-Vertreter gemäß Art.&nbsp;27&nbsp;DSGVO.
                Die Benennung befindet sich derzeit im Umsetzungsprozess; die Kontaktdaten werden hier ergänzt,
                sobald der Vertreter bestellt ist.
              </p>
              {/* TODO: Nach Bestellung ersetzen:
              <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4 mt-3">
                <p className="font-medium text-white">[Name des EU-Vertreters]</p>
                <p>[Straße Hausnr.]</p>
                <p>[PLZ Ort], [Land]</p>
                <p className="mt-2">
                  E-Mail:{' '}
                  <a href="mailto:[...]" className="text-blue-400 hover:text-blue-300">[...]</a>
                </p>
              </div>
              */}
            </section>

            {/* 3. Datenerhebung */}
            <section>
              <h2 className="text-xl font-semibold text-white mb-4">3. Erhebung und Verarbeitung personenbezogener Daten</h2>
              <p>
                Wir verarbeiten personenbezogene Daten ausschließlich im Rahmen der Datenschutz-Grundverordnung (DSGVO)
                und des Bundesdatenschutzgesetzes (BDSG).
              </p>
              <ul className="list-disc ml-6 mt-3 space-y-2">
                <li><strong className="text-white">Kontodaten:</strong> E-Mail-Adresse, Name, Profilbild (optional)</li>
                <li><strong className="text-white">Unternehmensdaten:</strong> Firmenname, Anschrift, Steuernummer, Logo (für Rechnungen)</li>
                <li><strong className="text-white">Kundendaten:</strong> von Ihnen eingegebene Kunden- und Auftragsdaten</li>
                <li><strong className="text-white">Nutzungsdaten:</strong> IP-Adresse, Browsertyp, Zugriffszeitpunkte</li>
                <li><strong className="text-white">Zahlungsdaten:</strong> ausschließlich durch FastSpring verarbeitet</li>
              </ul>
            </section>

            {/* 4. Google OAuth */}
            <section>
              <h2 className="text-xl font-semibold text-white mb-4">4. Anmeldung über Google (OAuth)</h2>
              <p>Wir erhalten nur die von Ihnen freigegebenen Informationen:</p>
              <ul className="list-disc ml-6 mt-2 space-y-1">
                <li>E-Mail-Adresse (erforderlich)</li>
                <li>Name und Profilbild (optional)</li>
              </ul>
              <p className="mt-3">
                Diese Daten werden ausschließlich zur Kontoerstellung und Bereitstellung unserer Dienste verwendet.
                Wir haben keinen Zugriff auf Ihr Google-Passwort oder andere Google-Dienste.
              </p>
              <p className="mt-2 text-sm text-slate-400">Rechtsgrundlage: Art.&nbsp;6&nbsp;Abs.&nbsp;1&nbsp;lit.&nbsp;b DSGVO.</p>
            </section>

            {/* 5. Zwecke */}
            <section>
              <h2 className="text-xl font-semibold text-white mb-4">5. Zwecke der Verarbeitung und Rechtsgrundlagen</h2>
              <ul className="list-disc ml-6 mt-2 space-y-2">
                <li><strong className="text-white">Plattformbetrieb:</strong> Digitale Visitenkarte, Angebots-/Rechnungserstellung, Kundenverwaltung</li>
                <li><strong className="text-white">Kontoverwaltung:</strong> Authentifizierung, Profil- und Abonnementverwaltung</li>
                <li><strong className="text-white">Kommunikation:</strong> Support-Anfragen, Funktionshinweise</li>
                <li><strong className="text-white">Sicherheit:</strong> Betrugsprävention, Missbrauchserkennung</li>
                <li><strong className="text-white">Optimierung:</strong> anonyme Nutzungsanalyse</li>
              </ul>
              <p className="mt-3 text-sm text-slate-400">
                Rechtsgrundlagen: Art.&nbsp;6&nbsp;Abs.&nbsp;1&nbsp;lit.&nbsp;b&nbsp;DSGVO (Vertragserfüllung),
                Art.&nbsp;6&nbsp;Abs.&nbsp;1&nbsp;lit.&nbsp;f&nbsp;DSGVO (berechtigtes Interesse).
              </p>
            </section>

            {/* 6. Speicherung / Standort */}
            <section>
              <h2 className="text-xl font-semibold text-white mb-4">6. Datenspeicherung und Serverstandort</h2>
              <p>
                Unsere Plattform wird vollständig in der EU betrieben. Daten werden bei
                <strong className="text-white"> Supabase</strong> in der
                <strong className="text-white"> EU-Region Frankfurt am Main (AWS eu-central-1)</strong> gespeichert.
                Mit Supabase besteht ein <strong className="text-white">Datenverarbeitungsvertrag (DPA)</strong> nach Art.&nbsp;28&nbsp;DSGVO.
              </p>
              <ul className="list-disc ml-6 mt-3 space-y-1">
                <li>Während der aktiven Nutzung: Speicherung bis zur Kontolöschung</li>
                <li>Nach Kündigung: Löschung der Kontodaten binnen 30 Tagen</li>
                <li>Rechnungsdaten: Aufbewahrung 10 Jahre (steuerrechtlich)</li>
              </ul>
              <p className="mt-3">
                <strong className="text-white">Server-Logfiles:</strong> IP-Adressen und technische Metadaten werden
                aus Sicherheitsgründen bis zu 7&nbsp;Tagen gespeichert und danach automatisch gelöscht.
              </p>
            </section>

           {/* 7. FastSpring */}
            <section>
              <h2 className="text-xl font-semibold text-white mb-4">7. Zahlungsabwicklung über FastSpring (Reseller of Record)</h2>
              <p>
                Die Zahlungsabwicklung erfolgt über <strong className="text-white">FastSpring</strong>,
                801 Garden Street, Suite 201, Santa Barbara, CA 93101, USA.
                FastSpring agiert als <strong className="text-white">Reseller of Record</strong> und ist eigenständiger Verantwortlicher für die Zahlungsverarbeitung.
              </p>
              <p className="mt-2">
                <a href="https://fastspring.com/privacy/" target="_blank" rel="noopener noreferrer"
                   className="text-blue-400 hover:text-blue-300">fastspring.com/privacy/</a>
              </p>
              <p className="mt-3">
                Wir erhalten keinen Zugriff auf Zahlungsdaten. FastSpring verarbeitet Zahlungs- und Rechnungsinformationen
                ausschließlich gemäß PCI-DSS Level 1 Standards.
              </p>
            </section>

            {/* 8. Cookies */}
            <section>
              <h2 className="text-xl font-semibold text-white mb-4">8. Cookies und vergleichbare Technologien</h2>
              <p>
                Es werden ausschließlich technisch notwendige Cookies eingesetzt (Sitzung, Sicherheit, Sprache).
                Für diese ist gemäß § 25 Abs. 2 Nr. 2 TTDSG keine Einwilligung erforderlich.
                Tracking- oder Marketing-Cookies werden nicht verwendet.
              </p>
            </section>

            {/* 9. Kontakt */}
            <section>
              <h2 className="text-xl font-semibold text-white mb-4">9. Kontaktaufnahme</h2>
              <p>
                Eine öffentliche Kontaktform besteht nicht. Die Kontaktaufnahme ist ausschließlich
                für registrierte Nutzer innerhalb der Plattform sowie per E-Mail an{' '}
                <a href="mailto:support@pro-meister.de" className="text-blue-400 hover:text-blue-300">
                  support@pro-meister.de
                </a>{' '}möglich. Eingehende Mitteilungen werden nur zur Bearbeitung der Anfrage verwendet.
              </p>
            </section>

           {/* 10. Weitergabe */}
            <section>
              <h2 className="text-xl font-semibold text-white mb-4">10. Weitergabe von Daten an Dritte</h2>
              <ul className="list-disc ml-6 space-y-2">
                <li><strong className="text-white">FastSpring:</strong> Zahlungsabwicklung (Reseller of Record)</li>
                <li><strong className="text-white">Supabase:</strong> Hosting innerhalb der EU (DPA vorhanden)</li>
                <li><strong className="text-white">Gesetzliche Verpflichtungen:</strong> nur bei rechtlicher Pflicht</li>
              </ul>
              <p className="mt-3 text-sm bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-200">
                Keine Datenveräußerung oder Nutzung zu Werbezwecken.
              </p>
            </section>

            {/* 11. Verantwortung für Kundendaten */}
            <section>
              <h2 className="text-xl font-semibold text-white mb-4">11. Verantwortung für Kundendaten innerhalb der Plattform</h2>
              <p>
                Nutzer der Plattform (z.&nbsp;B. Handwerksbetriebe oder selbstständige Meister) können in ihrem Konto
                personenbezogene Daten ihrer eigenen Kunden speichern und verarbeiten (z.&nbsp;B. Namen, Adressen, Telefonnummern,
                E-Mail-Adressen, Auftrags- oder Rechnungsdaten). Für diese Datenverarbeitung ist
                <strong className="text-white"> ausschließlich der jeweilige Nutzer selbst</strong> Verantwortlicher im Sinne von Art.&nbsp;4 Nr.&nbsp;7 DSGVO.
              </p>
              <p className="mt-3">
                Pro-meister.de stellt lediglich die technische Infrastruktur bereit und verarbeitet diese Daten
                <strong className="text-white"> im Auftrag und nach Weisung des Nutzers</strong> gemäß Art.&nbsp;28 DSGVO.
                Eine inhaltliche Kontrolle, Nutzung oder Weitergabe durch uns erfolgt nicht.
              </p>
              <p className="mt-3">
                Der Nutzer ist verpflichtet, seine Kunden eigenständig über die Datenverarbeitung zu informieren und
                alle gesetzlichen Informationspflichten (Art.&nbsp;13 ff.&nbsp;DSGVO) zu erfüllen.
              </p>
            </section>

            {/* 12. Rechte */}
            <section>
              <h2 className="text-xl font-semibold text-white mb-4">12. Rechte der betroffenen Personen</h2>
              <p>
                Sie haben insbesondere folgende Rechte: Auskunft (Art.&nbsp;15), Berichtigung (Art.&nbsp;16),
                Löschung (Art.&nbsp;17), Einschränkung (Art.&nbsp;18), Datenübertragbarkeit (Art.&nbsp;20)
                und Widerspruch (Art.&nbsp;21 DSGVO).
              </p>
              <p className="mt-3 text-sm bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                Zur Ausübung Ihrer Rechte kontaktieren Sie uns per E-Mail an{' '}
                <a href="mailto:support@pro-meister.de" className="text-blue-400 hover:text-blue-300">
                  support@pro-meister.de
                </a>. Wir beantworten Anfragen innerhalb von 30 Tagen.
              </p>
            </section>

            {/* 13. Datensicherheit */}
            <section>
              <h2 className="text-xl font-semibold text-white mb-4">13. Technische und organisatorische Maßnahmen</h2>
              <ul className="list-disc ml-6 mt-2 space-y-1">
                <li>SSL/TLS-Verschlüsselung sämtlicher Übertragungen</li>
                <li>Verschlüsselte Datenspeicherung</li>
                <li>Regelmäßige Sicherheits-Updates</li>
                <li>Zugriffskontrollen und Authentifizierung</li>
                <li>Regelmäßige Backups</li>
              </ul>
            </section>

            {/* 14. Beschwerderecht */}
            <section>
              <h2 className="text-xl font-semibold text-white mb-4">14. Beschwerderecht</h2>
              <p>
                Sie haben das Recht, sich bei einer Datenschutz-Aufsichtsbehörde zu beschweren, insbesondere in dem
                Mitgliedstaat Ihres gewöhnlichen Aufenthaltsorts, Ihres Arbeitsplatzes oder des Orts des mutmaßlichen Verstoßes.
              </p>
              <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4 mt-3">
                <p>Die Bundesbeauftragte für den Datenschutz und die Informationsfreiheit</p>
                <p className="text-sm mt-2">Graurheindorfer Str. 153 – 53117 Bonn</p>
                <p className="text-sm mt-2">
                  Website:{' '}
                  <a href="https://www.bfdi.bund.de" target="_blank" rel="noopener noreferrer"
                     className="text-blue-400 hover:text-blue-300">
                    www.bfdi.bund.de
                  </a>
                </p>
              </div>
            </section>

            {/* 15. Änderungen */}
            <section>
              <h2 className="text-xl font-semibold text-white mb-4">15. Änderungen dieser Datenschutzerklärung</h2>
              <p>
                Wir behalten uns vor, diese Datenschutzerklärung bei Bedarf anzupassen.
                Die aktuelle Fassung ist jederzeit auf dieser Seite abrufbar.
              </p>
            </section>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-slate-700">
              <p className="text-sm text-slate-400">
                <strong className="text-white">Stand:</strong> {new Date().toLocaleDateString('de-DE')}<br/>
                <strong className="text-white">Version:</strong> 2.2<br/>
                Pro-meister.de – Digitale Lösungen für Handwerker
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}