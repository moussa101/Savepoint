import type { Metadata } from 'next';
import { SITE_NAME, absoluteUrl } from '@/lib/seo';
import RegisterClient from './RegisterClient';

export const metadata: Metadata = {
  title: 'Create Account',
  description: `Create your free ${SITE_NAME} account — the Letterboxd for video games. Track your backlog, write reviews, and share your gaming journey.`,
  alternates: { canonical: absoluteUrl('/register') },
  robots: { index: true, follow: true },
  openGraph: {
    title: `Create Account · ${SITE_NAME}`,
    description: `Join ${SITE_NAME} free. Track your backlog, write game reviews, and connect with other gamers.`,
    url: absoluteUrl('/register'),
    type: 'website',
  },
};

export default function RegisterPage() {
  return <RegisterClient />;
}
