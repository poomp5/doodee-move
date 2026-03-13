import type { Metadata } from "next";
import { Noto_Sans_Thai, Geist_Mono } from "next/font/google";
import "./globals.css";
import RatingPrompt from "./components/RatingPrompt";

const notoSansThai = Noto_Sans_Thai({
  variable: "--font-sans",
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://move.doodee-future.com"),

  title: {
    default: "Doodee Move | เดินทางอัจฉริยะ ลดคาร์บอน",
    template: "%s | Doodee Move",
  },

  description:
    "Doodee Move แพลตฟอร์มเดินทางอัจฉริยะที่ช่วยเลือกเส้นทางที่เร็วที่สุด ถูกที่สุด และเป็นมิตรกับสิ่งแวดล้อม พร้อมติดตาม Carbon Footprint แบบ Real-time",

  keywords: [
    "Doodee Move",
    "Smart Mobility",
    "Carbon Footprint",
    "Sustainable Transport",
    "Eco Travel",
    "Thailand Smart City",
    "Green Transportation",
    "ขนส่งสาธารณะ",
    "ลดคาร์บอน",
  ],

  authors: [{ name: "Doodee Future Team" }],
  creator: "Doodee Future",
  publisher: "Doodee Future",

  openGraph: {
    title: "Doodee Move | เดินทางอัจฉริยะ ลดคาร์บอน",
    description:
      "เลือกเส้นทางที่ดีที่สุด ลด CO₂ และร่วมสร้างเมืองที่ยั่งยืน",
    url: "https://move.doodee-future.com",
    siteName: "Doodee Move",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "Doodee Move - Smart Sustainable Mobility Platform",
      },
    ],
    locale: "th_TH",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "Doodee Move | เดินทางอัจฉริยะ ลดคาร์บอน",
    description:
      "เลือกเส้นทางที่ดีที่สุด ลด CO₂ และร่วมสร้างเมืองที่ยั่งยืน",
    images: ["/logo.png"],
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
        className={`${notoSansThai.variable} antialiased`}
      >
        {children}
        <RatingPrompt />
      </body>
    </html>
  );
}