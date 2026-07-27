import type { Metadata } from "next";
import { Figtree, Geist_Mono } from "next/font/google";
import "./globals.css";

// Figtree IS a variable font (wght 300–900), so no weight array is needed —
// every weight the UI asks for is a real cut, not a synthesised one.
const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
  display: "swap",
});

// Kept for tabular figures and NIM columns — Figtree has no monospace cut.
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "BAP System - Berita Acara Perkuliahan",
  description: "Sistem Informasi Berita Acara Perkuliahan (BAP)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      /* `figtree.className` sets font-family directly on <html>; `.variable`
         only exposes a CSS custom property. Both are applied on purpose: the
         variable feeds Tailwind's `font-sans`, and the className guarantees the
         typeface lands even if the theme indirection is stale or misspelt —
         which is exactly how the first attempt at this failed silently. */
      className={`${figtree.className} ${figtree.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
