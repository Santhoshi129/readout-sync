import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TWU Status Report",
  description: "Internal at-a-glance KPI dashboard for Train With Us / Blended Athletics",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/*
          Same pairing the Readout dashboard uses: Space Grotesk for
          headings, Inter for body. Loaded by stylesheet rather than
          next/font so the build does not depend on reaching Google's
          servers; both have local system fallbacks in the Tailwind stack.
        */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;700&display=swap"
        />
      </head>
      <body className="bg-base font-body text-ink antialiased">{children}</body>
    </html>
  );
}
