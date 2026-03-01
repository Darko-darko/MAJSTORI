import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import CookieConsentBanner from "./components/CookieConsentBanner";
import { ThemeProvider } from "@/lib/context/ThemeContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Pro-Meister | Rechnungen für Handwerker — Kostenlos testen",
    template: "%s | Pro-Meister"
  },
  description: "Rechnungen direkt auf der Baustelle erstellen. Angebot mit 1 Klick zur Rechnung. ZUGFeRD-PDF automatisch, DATEV-kompatibel. 30 Tage kostenlos testen.",
  
  // 🔥 PWA Manifest
  manifest: "/site.webmanifest",
  
  // 🎨 Theme Color
  themeColor: "#2563eb",
  
  // 🖼️ Icons
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  
  // 🍎 Apple Web App
  appleWebApp: {
    capable: true,
    statusBarStyle: "black",
    title: "Pro-Meister",
  },
  
  // 📱 Viewport
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
  },

  // 🌐 Open Graph - ZA VIBER, WHATSAPP, FACEBOOK
  openGraph: {
    type: 'website',
    locale: 'de_DE',
    url: 'https://pro-meister.de',
    siteName: 'Pro-Meister',
    title: 'Pro-Meister - Handwerker Dashboard',
    description: 'Die moderne Plattform für Handwerker - Kundenverwaltung, Rechnungen & mehr',
    images: [
      {
        url: 'https://pro-meister.de/og-image-1200.png',
        width: 1200,
        height: 630,
        alt: 'Pro-Meister Logo',
      }
    ],
  },

  // 🐦 Twitter Cards
  twitter: {
    card: 'summary_large_image',
    title: 'Pro-Meister - Handwerker Dashboard',
    description: 'Die moderne Plattform für Handwerker - Kundenverwaltung, Rechnungen & mehr',
    images: ['https://pro-meister.de/og-image-1200.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <head>
        {/*
          KORAK 1 — Consent defaults — mora biti PRVI u <head>, pre gtag.js.
          Sve kategorije DENIED po defaultu — GDPR / TTDSG compliant.
        */}
        <Script id="google-consent-init" strategy="beforeInteractive">{`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('consent', 'default', {
            analytics_storage:  'denied',
            ad_storage:         'denied',
            ad_user_data:       'denied',
            ad_personalization: 'denied',
            wait_for_update:    500
          });
        `}</Script>

        {/*
          KORAK 2 — Učitaj gtag.js (async, afterInteractive).
          Vidi 'denied' u dataLayer-u → ne šalje podatke.
        */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=AW-17973690084"
          strategy="afterInteractive"
        />

        {/*
          KORAK 3 — Konfiguriši tag (afterInteractive).
        */}
        <Script id="google-gtag-config" strategy="afterInteractive">{`
          gtag('js', new Date());
          gtag('config', 'AW-17973690084');
          gtag('config', 'G-YDYNE78GSB');
        `}</Script>
      </head>

      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-900`}
      >
        <ThemeProvider>
          {children}

          {/* KORAK 4 — Banner; applyConsent() poziva gtag('consent','update',...) */}
          <CookieConsentBanner />
        </ThemeProvider>
      </body>
    </html>
  );
}