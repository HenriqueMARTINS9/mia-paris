import type { Metadata } from "next";
import { IBM_Plex_Mono, Manrope } from "next/font/google";

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
  title: {
    default: "MIA PARIS CRM",
    template: "%s | MIA PARIS CRM",
  },
  description:
    "CRM textile B2B MIA PARIS pour piloter les demandes, tâches, deadlines, validations et productions.",
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
        {children}
        <Toaster />
      </body>
    </html>
  );
}
