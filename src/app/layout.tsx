import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FileOmni | Local-First Utility Suite",
  description: "A privacy-obsessed, high-performance web utility suite where all processing happens in the browser.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-RDBBHRP57V"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){window.dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', 'G-RDBBHRP57V');
          `}
        </Script>
      </head>
      <body className={`${inter.variable} font-sans antialiased text-foreground bg-background`}>
        {children}
      </body>
    </html>
  );
}
