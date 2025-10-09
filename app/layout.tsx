import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

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
    default: "Pro-Meister - Handwerker Dashboard",
    template: "%s | Pro-Meister"
  },
  description: "Die moderne Plattform für Handwerker - Kundenverwaltung, Rechnungen & mehr",
  
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}