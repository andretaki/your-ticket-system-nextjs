import 'bootstrap/dist/css/bootstrap.min.css';
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Script from 'next/script';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import AuthSessionProvider from '@/components/AuthSessionProvider';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: 'Alliance Chemical Ticket System',
  description: 'Modern ticket management system for Alliance Chemical',
  icons: {
    icon: '/assets/logo.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <Script src="https://kit.fontawesome.com/17af746abc.js" crossOrigin="anonymous" strategy="lazyOnload" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthSessionProvider>
          <Navbar />
          <div className="wrapper">
            <Sidebar />
            <div id="content">
              {children}
            </div>
          </div>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
