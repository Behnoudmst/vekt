import CookieBanner from "@/components/cookie-banner";
import SiteFooter from "@/components/site-footer";
import SiteHeader from "@/components/site-header";
import { Toaster } from "@/components/ui/sonner";
import { COMPANY_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import AuthProvider from "./providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: `${COMPANY_NAME} — Automated Recruitment`,
  description: "Automated Recruitment Orchestration Engine",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", inter.variable)}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50 text-gray-900`}
      >
        <AuthProvider>
          <SiteHeader />
          {children}
          <SiteFooter />
        </AuthProvider>
        <Toaster richColors={true} theme="light" position="top-center"/>
        <CookieBanner />
      </body>
    </html>
  );
}
