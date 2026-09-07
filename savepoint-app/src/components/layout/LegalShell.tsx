import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import SessionProvider from '@/components/SessionProvider';

export default function LegalShell({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <Navbar />
      <main className="main-content" style={{ padding: 'var(--space-xl)' }}>
        <article className="container legal-doc">
          <p className="legal-kicker">
            <Link href="/">Savepoint</Link>
            {' · '}
            <Link href="/terms">Terms</Link>
            {' · '}
            <Link href="/privacy">Privacy</Link>
          </p>
          <h1 className="page-title font-display">{title}</h1>
          <p className="legal-updated">Last updated: {updated}</p>
          <div className="legal-body">{children}</div>
        </article>
      </main>
    </SessionProvider>
  );
}
