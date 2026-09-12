import type { Viewport } from 'next';
import { Inter, Outfit } from 'next/font/google';
import './globals.css';
import SessionProvider from '@/components/SessionProvider';
import UpdateAnnouncement from '@/components/ui/UpdateAnnouncement';
import { buildRootMetadata, organizationJsonLd, websiteJsonLd } from '@/lib/seo';

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

export const metadata = buildRootMetadata();

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
  const jsonLd = [websiteJsonLd(), organizationJsonLd()];

  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable}`}>
      <head>
        <link rel="preconnect" href="https://images.igdb.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://images.igdb.com" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        <SessionProvider>
          {children}
          <UpdateAnnouncement />
        </SessionProvider>
      </body>
    </html>
  );
}
