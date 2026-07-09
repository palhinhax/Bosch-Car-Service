import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/toaster";
import { ServiceWorkerRegister } from "@/components/service-worker-register";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Bosch Car Service Lousa — Gestão de Oficina",
  description: "Gestão interna para oficina Bosch Car Service.",
  // Point at the PWA manifest that makes the app installable on Android/desktop.
  manifest: "/manifest.json",
  // Standard favicons + the iOS home-screen icon.
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
    ],
    apple: "/apple-touch-icon.png",
  },
  // iOS PWA support. Next.js renders these as:
  //   <meta name="apple-mobile-web-app-capable" content="yes">
  //   <meta name="apple-mobile-web-app-title" content="Bosch Car Service">
  //   <meta name="apple-mobile-web-app-status-bar-style" content="default">
  // which lets iPhone users "Add to Home Screen" and launch full-screen.
  appleWebApp: {
    capable: true,
    title: "Bosch Car Service",
    statusBarStyle: "default",
  },
};

// The theme color drives the Android status/toolbar tint and the iOS status bar
// background. It lives in `viewport` (not `metadata`) per the Next.js 14 API and
// is set to the Bosch brand red.
export const viewport: Viewport = {
  themeColor: "#E20015",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-PT" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          {children}
          <Toaster />
        </Providers>
        {/* Registers the PWA service worker (public/sw.js) on the client. */}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
