import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: 'FileOmni | Privacy-First Universal Tools',
  description: 'Scan, convert, extract, and calculate. One secure interface for all your daily tasks, running entirely on your machine for maximum privacy.',
  keywords: ['PDF tools', 'image converter', 'EXIF scrubber', 'local file tools', 'privacy tools', 'offline utilities'],
  authors: [{ name: 'FileOmni' }],
  metadataBase: new URL('https://fileomni.com'),
  openGraph: {
    title: 'FileOmni | Privacy-First Universal Tools',
    description: 'Secure, local-first file tools. Scan, convert, and calculate right in your browser without uploading your sensitive data to the cloud.',
    url: 'https://fileomni.com',
    siteName: 'FileOmni',
    images: [
      {
        url: '/og-image.jpg', 
        width: 1200,
        height: 630,
        alt: 'FileOmni Utility Suite',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FileOmni | Privacy-First Universal Tools',
    description: 'Secure, local-first file tools running entirely on your machine.',
    images: ['/og-image.jpg'],
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
