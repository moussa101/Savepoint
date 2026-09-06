import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Savepoint — Your Gaming Story, Told Beautifully',
  description:
    'Track, rate, review, and share your gaming experiences. Build your gaming profile and discover your next favorite game.',
  keywords: ['games', 'gaming', 'reviews', 'social', 'game tracking', 'game diary'],
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
