import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";

// Inter self-hosted via next/font — no runtime fetch against
// fonts.googleapis.com per request. The CSS var `--font-sans` is
// what Tailwind's `fontFamily.sans` picks up.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Quickstart · Esus Health",
    template: "%s · Quickstart",
  },
  description:
    "A reference Next.js app showing what a full Esus BaaS integration looks like — tenant auth, FHIR data plane, and a clean shell to build on.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-neutral-50 text-neutral-900 antialiased">{children}</body>
    </html>
  );
}
