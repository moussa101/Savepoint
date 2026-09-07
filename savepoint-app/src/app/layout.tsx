import type { Metadata, Viewport } from 'next';
import { Inter, Outfit } from 'next/font/google';
import './globals.css';

// Self-hosted via next/font: no render-blocking request to fonts.googleapis.com,
// fonts are preloaded and served from our own origin with `font-display: swap`.
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const outfit = Outfit({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-outfit',
});

export const metadata: Metadata = {
  title: 'Savepoint — Your Gaming Story, Told Beautifully',
  description:
    'Track, rate, review, and share your gaming experiences. Build your gaming profile and discover your next favorite game.',
  keywords: ['games', 'gaming', 'reviews', 'social', 'game tracking', 'game diary'],
  applicationName: 'Savepoint',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Savepoint',
  },
  formatDetection: {
    telephone: false,
  },
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0f' },
    { media: '(prefers-color-scheme: light)', color: '#0a0a0f' },
  ],
  colorScheme: 'dark',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable}`}>
      <head>
        {/* Almost every page paints IGDB cover art; warm the connection early. */}
        <link rel="preconnect" href="https://images.igdb.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://images.igdb.com" />
      </head>
      <body>{children}</body>
    </html>
  );
}
