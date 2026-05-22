import type { Metadata } from "next";
import "./globals.css";
import { Suspense } from "react";
import { HeaderWithCategories } from "@/components/HeaderWithCategories";
import { HeaderFallback } from "@/components/HeaderFallback";
import Footer from "@/components/Footer";
import Script from "next/script";
import { Mukta_Malar } from "next/font/google";
import { ModalsContainer } from "@/components/ModalsContainer";
import { Providers } from "@/providers";

const muktaMalar = Mukta_Malar({
  subsets: ["tamil", "latin"],
  // Keep only commonly used weights to reduce initial font preload pressure.
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-mukta-malar",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SERVER_URL || "https://dinasuvadu.com"),
  title: "Dinasuvadu - Latest Tamil News",
  description: "Tamil news portal with latest updates on politics, cinema, and sports.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ta" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://media.dinasuvadu.com" />
        <link rel="dns-prefetch" href="https://media.dinasuvadu.com" />
      </head>
      <body className={muktaMalar.variable} suppressHydrationWarning>
        <Providers>
          <Suspense fallback={<HeaderFallback />}>
            <HeaderWithCategories />
          </Suspense>
          <main id="main-content">{children}</main>
          <ModalsContainer />
          <Footer />
        </Providers>
        {/* Google Analytics GA4 */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=G-YJ4CSJH2VC`}
          strategy="lazyOnload"
        />
        <Script id="google-analytics" strategy="lazyOnload">
          {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-YJ4CSJH2VC');
          `}
        </Script>

      </body>
    </html>
  );
}
