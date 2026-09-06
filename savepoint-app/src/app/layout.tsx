import type { Metadata, Viewport } from 'next';
import './globals.css';

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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
