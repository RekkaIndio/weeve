import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
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
  title: "Weeve",
  description: "Weeve - Social Media Reimagined",
  icons: {
    icon: '/weeve-logo.png',
    shortcut: '/weeve-logo.png',
    apple: '/weeve-logo.png',
  },
  openGraph: {
    title: 'Weeve',
    description: 'Weeve - Social Media Reimagined',
    images: ['/weeve-logo.png'],
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

import AuthProvider from "./components/AuthProvider";
import StoreInitializer from "./components/StoreInitializer";
import InviteHandler from "./components/InviteHandler";
import CrashlyticsInitializer from "./components/CrashlyticsInitializer";
import PushNotificationInitializer from "./components/PushNotificationInitializer";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <StoreInitializer />
          <InviteHandler />
          <CrashlyticsInitializer />
          <PushNotificationInitializer />
          {children}
          <Analytics />
        </AuthProvider>
      </body>
    </html>
  );
}
