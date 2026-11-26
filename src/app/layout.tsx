import type { Metadata } from "next";
import {
  Noto_Sans,
  Noto_Sans_Malayalam,
  Noto_Naskh_Arabic,
  Amiri_Quran,
} from "next/font/google";
import { LocaleProvider } from "@/components/LocaleContext";
import "./globals.css";

const notoSans = Noto_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-noto-sans",
  display: "swap",
});

const notoMalayalam = Noto_Sans_Malayalam({
  subsets: ["malayalam"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-malayalam",
  display: "swap",
});

const notoArabic = Noto_Naskh_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-arabic",
  display: "swap",
});

const amiriQuran = Amiri_Quran({
  subsets: ["arabic"],
  weight: ["400"],
  variable: "--font-amiri-quran",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Kerala Initial Screening | India Holy Quran Award",
  description:
    "Official Kerala State Initial Screening Examination & Live Quran Recitation Assessment Portal of the India Holy Quran Award.",
  icons: {
    icon: "/brand/Favicon-Color.png",
    apple: "/brand/Favicon-Color.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${notoSans.variable} ${notoMalayalam.variable} ${notoArabic.variable} ${amiriQuran.variable}`}
    >
      <body className="min-h-screen flex flex-col bg-white text-[#1c1c1c]">
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
