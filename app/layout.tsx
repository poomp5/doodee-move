import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://doodeemove.com"), // เปลี่ยนเป็น domain จริง

  title: {
    default: "Doodee Move | Smart & Sustainable Mobility Platform",
    template: "%s | Doodee Move",
  },

  description:
    "Doodee Move helps you choose the fastest, cheapest, and most eco-friendly routes while tracking your carbon footprint in real time.",

  keywords: [
    "Smart Mobility",
    "Carbon Footprint Tracker",
    "Sustainable Transport",
    "Eco Travel",
    "Thailand Smart City",
    "Green Transportation",
  ],

  authors: [{ name: "Doodee Future Team" }],
  creator: "Doodee Future",
  publisher: "Doodee Future",

  openGraph: {
    title: "Doodee Move | Smart Sustainable Travel",
    description:
      "Track your eco-friendly commutes, reduce CO₂ emissions, and contribute to smarter cities.",
    url: "https://doodeemove.com",
    siteName: "Doodee Move",
    images: [
      {
        url: "/og-image.png", // ใส่ไฟล์ใน public/
        width: 1200,
        height: 630,
        alt: "Doodee Move Smart Mobility Platform",
      },
    ],
    locale: "en_US",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "Doodee Move | Sustainable Mobility",
    description:
      "Choose smarter routes. Reduce CO₂. Build better cities.",
    images: ["/og-image.png"],
  },

  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}