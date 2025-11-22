import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AppLayout from "./components/AppLayout";

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
  description: "Weeve - share short-form moments",
  icons: {
    icon: '/weeve-logo.png',
    shortcut: '/weeve-logo.png',
    apple: '/weeve-logo.png',
  },
  openGraph: {
    title: 'Weeve',
    description: 'Weeve - share short-form moments',
    images: ['/weeve-logo.png'],
  },
};

import AuthProvider from "./components/AuthProvider";
import StoreInitializer from "./components/StoreInitializer";

import { Toaster } from 'sonner';

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
          <AppLayout>{children}</AppLayout>
          <Toaster richColors position="top-center" />
        </AuthProvider>
      </body>
    </html>
  );
}
