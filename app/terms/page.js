// app/terms/page.js - ISPRAVLJEN AGB sa 30-dnevnom test fazom
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
                <li>Rechnungs- und Angebotserstellung (ZUGFeRD 2.1 konform)</li>
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
                <li>Es wird eine <strong className="text-white">30-tägige kostenlose Testphase</strong> gewährt</li>
                <li>Nutzer sind für die Sicherheit ihrer Zugangsdaten verantwortlich</li>
                <li>Falsche Angaben bei der Registrierung sind nicht gestattet</li>
                <li>Pro Nutzer ist nur ein Konto erlaubt</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">4. Kostenlose Testphase (30 Tage)</h2>
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6 space-y-3">
                <p className="text-white font-medium">
                  Neue Nutzer erhalten eine <strong>30-tägige kostenlose Testphase</strong> mit 
                  vollem Funktionsumfang aller PRO-Features.
                </p>
                <ul className="list-disc ml-6 space-y-2">
                  <li>
                    Während der Testphase entstehen <strong className="text-white">keine Kosten</strong> 
                    und es erfolgt keine automatische Abbuchung
                  </li>
                  <li>
                    Sie können die Testphase <strong className="text-white">jederzeit ohne Angabe 
                    von Gründen beenden</strong>
                  </li>
                  <li>
                    Nach Ablauf der Testphase ist ein kostenpflichtiges Abonnement erforderlich, 
                    um weiterhin alle Funktionen nutzen zu können
                  </li>
                  <li>
                    Die digitale Visitenkarte bleibt auch nach der Testphase kostenlos nutzbar 
                    (FREEMIUM-Modell)
                  </li>
                </ul>
                <p className="text-sm text-slate-300 mt-3">
                  Weitere Informationen zu Rückerstattungen finden Sie in unserer{' '}
                  <a href="/refund" className="text-blue-400 hover:text-blue-300 underline">
                    Rückerstattungsrichtlinie
                  </a>.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">5. Abonnement und Zahlungen</h2>
              <ul className="list-disc ml-6 space-y-2">
                <li>
                  <strong className="text-white">Monatliches Abonnement:</strong> Verlängert sich 
                  automatisch jeden Monat, Kündigung jederzeit möglich zum Ende des aktuellen 
                  Abrechnungszeitraums
                </li>
                <li>
                  <strong className="text-white">Jährliches Abonnement:</strong> Verlängert sich 
                  automatisch jährlich, Kündigung jederzeit möglich zum Ende des Jahresabonnements
                </li>
                <li>
                  Zahlungen erfolgen über unseren autorisierten Zahlungsdienstleister Paddle
                </li>
                <li>
                  Bei Zahlungsausfall wird der Zugang zu PRO-Funktionen eingeschränkt
                </li>
                <li>
                  Preisänderungen werden mindestens 30 Tage im Voraus angekündigt
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">6. Kündigung und Rückerstattung</h2>
              <div className="space-y-3">
                <p>
                  <strong className="text-white">Kündigung durch den Nutzer:</strong>
                </p>
                <ul className="list-disc ml-6 space-y-2">
                  <li>Nutzer können ihr Abonnement jederzeit kündigen</li>
                  <li>Die Kündigung erfolgt über das Paddle-Kundenkonto oder per E-Mail</li>
                  <li>Nach der Kündigung bleibt der Zugang bis zum Ende des bezahlten Zeitraums aktiv</li>
                  <li>Die digitale Visitenkarte bleibt auch nach Kündigung verfügbar</li>
                </ul>
                
                <p className="mt-4">
                  <strong className="text-white">14-Tage-Geld-zurück-Garantie:</strong>
                </p>
                <p>
                  Bei Unzufriedenheit innerhalb von 14 Tagen nach der ersten Zahlung erstatten 
                  wir den vollen Betrag zurück. Details finden Sie in unserer{' '}
                  <a href="/refund" className="text-blue-400 hover:text-blue-300 underline">
                    Rückerstattungsrichtlinie
                  </a>.
                </p>

                <p className="mt-4">
                  <strong className="text-white">Kündigung durch Pro-meister.de:</strong>
                </p>
                <ul className="list-disc ml-6 space-y-2">
                  <li>Bei Verstoß gegen diese AGB können wir Konten sperren oder löschen</li>
                  <li>Bei schwerwiegenden Verstößen erfolgt die Sperrung ohne Vorankündigung</li>
                  <li>Bereits gezahlte Beträge werden in diesem Fall nicht erstattet</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">7. Nutzerverhalten</h2>
              <p>Nicht gestattet sind:</p>
              <ul className="list-disc ml-6 mt-2 space-y-1">
                <li>Missbrauch der Plattform für illegale Zwecke</li>
                <li>Belästigung anderer Nutzer</li>
                <li>Spam oder unerwünschte Nachrichten</li>
                <li>Verletzung von Urheberrechten oder geistigem Eigentum</li>
                <li>Reverse Engineering oder unbefugte Zugriffe auf Systeme</li>
                <li>Mehrfache Registrierungen zur Umgehung der Testphase</li>
                <li>Weitergabe von Zugangsdaten an Dritte</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">8. Daten und Sicherheit</h2>
              <p>
                Nutzerdaten werden gemäß unserer{' '}
                <a href="/privacy" className="text-blue-400 hover:text-blue-300 underline">
                  Datenschutzerklärung
                </a>{' '}
                behandelt. Wir verwenden moderne Sicherheitsstandards zum Schutz Ihrer Daten:
              </p>
              <ul className="list-disc ml-6 mt-3 space-y-1">
                <li>Datenspeicherung auf EU-Servern (Supabase)</li>
                <li>Verschlüsselte Datenübertragung (SSL/TLS)</li>
                <li>Regelmäßige Sicherheits-Updates</li>
                <li>Backups Ihrer Daten</li>
              </ul>
              <p className="mt-3 text-sm text-slate-400">
                Trotz aller Sicherheitsmaßnahmen können wir keine absolute Sicherheit garantieren. 
                Nutzer sollten sichere Passwörter verwenden und diese regelmäßig ändern.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">9. Haftung</h2>
              <p>
                Die Haftung von Pro-meister.de ist wie folgt geregelt:
              </p>
              <ul className="list-disc ml-6 mt-3 space-y-2">
                <li>
                  <strong className="text-white">Unbegrenzte Haftung:</strong> Bei Vorsatz, 
                  grober Fahrlässigkeit, Verletzung von Leben, Körper oder Gesundheit
                </li>
                <li>
                  <strong className="text-white">Begrenzte Haftung:</strong> Bei leichter 
                  Fahrlässigkeit nur für vertragswesentliche Pflichten
                </li>
                <li>
                  <strong className="text-white">Keine Haftung:</strong> Für mittelbare Schäden, 
                  entgangenen Gewinn oder Datenverlust durch höhere Gewalt
                </li>
              </ul>
              <p className="mt-3 text-sm text-slate-400">
                Nutzer sind selbst für die Sicherung ihrer Daten und für regelmäßige Backups 
                verantwortlich.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">10. Verfügbarkeit</h2>
              <p>
                Wir bemühen uns um eine hohe Verfügbarkeit der Plattform:
              </p>
              <ul className="list-disc ml-6 mt-2 space-y-1">
                <li>Angestrebte Verfügbarkeit: 99% im Jahresdurchschnitt</li>
                <li>Geplante Wartungsarbeiten werden angekündigt</li>
                <li>Notfall-Wartungen können ohne Vorankündigung erfolgen</li>
                <li>Keine Garantie für ununterbrochene Verfügbarkeit</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">11. Änderungen der AGB</h2>
              <p>
                Wir behalten uns vor, diese AGB bei Bedarf zu ändern:
              </p>
              <ul className="list-disc ml-6 mt-2 space-y-1">
                <li>Nutzer werden über wesentliche Änderungen per E-Mail informiert</li>
                <li>Änderungen gelten als akzeptiert, wenn nicht innerhalb von 30 Tagen widersprochen wird</li>
                <li>Bei Widerspruch kann das Nutzungsverhältnis beendet werden</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">12. Anwendbares Recht und Gerichtsstand</h2>
              <p>
                Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des 
                UN-Kaufrechts. Gerichtsstand für alle Streitigkeiten ist, soweit gesetzlich 
                zulässig, der Sitz des Unternehmens.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">13. Salvatorische Klausel</h2>
              <p>
                Sollten einzelne Bestimmungen dieser AGB unwirksam sein oder werden, bleibt 
                die Wirksamkeit der übrigen Bestimmungen davon unberührt. Die unwirksame 
                Bestimmung wird durch eine wirksame ersetzt, die dem wirtschaftlichen Zweck 
                der unwirksamen Bestimmung am nächsten kommt.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">14. Kontakt</h2>
              <p>
                Bei Fragen zu diesen AGB kontaktieren Sie uns:<br/>
                <a href="mailto:support@pro-meister.de" className="text-blue-400 hover:text-blue-300">
                  support@pro-meister.de
                </a>
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