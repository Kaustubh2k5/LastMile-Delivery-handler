import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LastMile — Delivery Tracker",
  description:
    "Zone-based rate engine, agent assignment, and live delivery tracking",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
