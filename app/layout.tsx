import "./globals.css";
import type { Metadata } from "next";
import { Space_Grotesk, Inter } from "next/font/google";

const display = Space_Grotesk({ subsets: ["latin"], weight: ["500", "700"], variable: "--font-display" });
const body = Inter({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-body" });

export const metadata: Metadata = {
  title: "TWU · The Readout: Systems",
  description: "Live operations dashboard for Train With Us / Blended Athletics automation flows.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
