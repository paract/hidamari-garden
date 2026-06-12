import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThirdwebProvider } from "thirdweb/react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "陽だまりの庭",
  description: "ウォレット登録ページ",
};

// モバイルで正しく拡大縮小されるように設定
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* thirdweb の機能（ConnectButton・useActiveAccount）を全ページで使えるようにする */}
        <ThirdwebProvider>{children}</ThirdwebProvider>
      </body>
    </html>
  );
}
