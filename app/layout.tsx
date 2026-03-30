import type { Metadata } from "next";
import { IBM_Plex_Mono, Manrope } from "next/font/google";

import { PwaProvider } from "@/components/pwa/pwa-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  weight: ["400", "500"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  applicationName: "MIA PARIS CRM",
  title: {
    default: "MIA PARIS CRM",
    template: "%s | MIA PARIS CRM",
  },
  description:
    "CRM textile B2B MIA PARIS pour piloter les demandes, tâches, deadlines, validations et productions.",
  manifest: "/manifest.webmanifest",
  icons: {
    apple: "/icons/pwa-icon-maskable.svg",
    icon: "/icons/pwa-icon.svg",
    shortcut: "/icons/pwa-icon.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "MIA PARIS CRM",
  },
  formatDetection: {
    address: false,
    email: false,
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${manrope.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full font-sans text-foreground">
        <PwaProvider>
          {children}
          <Toaster />
        </PwaProvider>
      </body>
    </html>
  );
}
