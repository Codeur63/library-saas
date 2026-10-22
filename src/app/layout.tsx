import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/constants/site";

// Police auto-hébergée (fichiers Inter variables livrés avec le dépôt) :
// aucun appel réseau à Google Fonts au build/à l'exécution, builds reproductibles.
const inter = localFont({
  src: [
    { path: "./fonts/Inter-latin.woff2", weight: "100 900", style: "normal" },
    { path: "./fonts/Inter-latin-ext.woff2", weight: "100 900", style: "normal" },
  ],
  variable: "--font-inter",
  display: "swap",
  fallback: ["system-ui", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_NAME,
  description: SITE_DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={`${inter.variable} min-h-screen antialiased`}>{children}</body>
    </html>
  );
}
