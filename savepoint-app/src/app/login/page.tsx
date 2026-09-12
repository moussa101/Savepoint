import type { Metadata } from 'next';
import { SITE_NAME, absoluteUrl } from '@/lib/seo';
import LoginClient from './LoginClient';

export const metadata: Metadata = {
  title: 'Sign In',
  description: `Sign in to ${SITE_NAME} — track your games, write reviews, and connect with the gaming community.`,
  alternates: { canonical: absoluteUrl('/login') },
  robots: { index: true, follow: true },
  openGraph: {
    title: `Sign In · ${SITE_NAME}`,
    description: `Sign in to ${SITE_NAME} to track games, write reviews, and connect with gamers.`,
    url: absoluteUrl('/login'),
    type: 'website',
  },
};

export default function LoginPage() {
  return <LoginClient />;
}
