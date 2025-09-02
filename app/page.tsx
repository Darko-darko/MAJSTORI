export default function Home() {
  return (
    <main className="min-h-screen bg-white text-gray-900">
      <div className="mx-auto max-w-5xl px-6 py-16">
        <header className="mb-12">
          <h1 className="text-4xl font-extrabold tracking-tight">
            Hallo, Handwerker!
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            Einfache Plattform für Visitenkarte + QR, Anfragen mit Fotos,
            Rechnungen & Garantien – mit E-Mail-Benachrichtigungen und Erinnerungen.
          </p>
        </header>

        <div className="flex flex-wrap gap-4">
          <a
            href="/signup"
            className="rounded-xl border border-gray-900 bg-gray-900 px-6 py-3 text-white hover:bg-black"
          >
            Jetzt registrieren
          </a>
          <a
            href="/login"
            className="rounded-xl border border-gray-300 px-6 py-3 hover:bg-gray-50"
          >
            Anmelden
          </a>
        </div>

        <section className="mt-12 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border p-6">
            <h2 className="text-xl font-semibold">Was ist drin (MVP)</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-gray-700">
              <li>Digitale Visitenkarte mit QR-Code</li>
              <li>Anfragen von Kunden inkl. Foto-Upload</li>
              <li>Rechnungen (PDF) mit IBAN</li>
              <li>Garantien (PDF) + Erinnerung vor Ablauf</li>
              <li>E-Mail-Bestätigungen &amp; Benachrichtigungen</li>
            </ul>
          </div>
          <div className="rounded-2xl border p-6">
            <h2 className="text-xl font-semibold">Bald danach</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-gray-700">
              <li>Web-Push-Benachrichtigungen</li>
              <li>Mehr Zahlungsmethoden für Abo</li>
              <li>Weitere Sprachen</li>
            </ul>
          </div>
        </section>

        <footer className="mt-16 text-sm text-gray-500">
          © {new Date().getFullYear()} Majstori — Plattform für Handwerker
        </footer>
      </div>
    </main>
  );
}
