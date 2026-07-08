import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TWU · The Readout: Systems",
  description: "Live operations dashboard for Train With Us / Blended Athletics automation flows.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
