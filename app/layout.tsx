import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/shop/SiteHeader";
import { Toaster } from "react-hot-toast";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sticker Trendz — Trending Stickers, Delivered",
  description: "Shop trending stickers, delivered fast.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geist.variable} antialiased bg-gray-50`}>
        <SiteHeader />
        {children}
        <Toaster position="bottom-center" />
      </body>
    </html>
  );
}
