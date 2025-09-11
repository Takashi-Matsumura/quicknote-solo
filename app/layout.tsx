import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import PWAProvider from "@/components/PWAProvider";
import { FontSizeProvider } from "@/contexts/FontSizeContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "QuickNote Solo",
  description: "個人用1行メモPWA - オフラインでも使える簡単メモアプリ",
  manifest: "/manifest.json",
  appleWebApp: {
    title: "QuickNote Solo",
    statusBarStyle: "default",
    capable: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#3b82f6",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        <link rel="icon" href="/icon-192x192.png" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <script src="https://accounts.google.com/gsi/client" async defer></script>
        {process.env.NODE_ENV === 'development' && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                // 開発環境でのキャッシュバスター
                if ('serviceWorker' in navigator) {
                  navigator.serviceWorker.getRegistrations().then(registrations => {
                    registrations.forEach(registration => registration.unregister());
                  });
                }
                // CSSのリロードを強制
                const links = document.querySelectorAll('link[rel="stylesheet"]');
                links.forEach(link => {
                  const href = link.href.split('?')[0];
                  link.href = href + '?v=' + Date.now();
                });
              `
            }}
          />
        )}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <FontSizeProvider>
          <PWAProvider>
            {children}
          </PWAProvider>
        </FontSizeProvider>
      </body>
    </html>
  );
}
