import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TWU — KPI Glance",
  description: "Internal at-a-glance KPI dashboard for Train With Us / Blended Athletics",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-body bg-base text-ink antialiased">{children}</body>
    </html>
  );
}
