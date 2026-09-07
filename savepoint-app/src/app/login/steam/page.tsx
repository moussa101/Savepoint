'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn, getSession } from 'next-auth/react';
import Link from 'next/link';

function SteamCompleteInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function finish() {
      if (!token) {
        setError('Missing Steam login token. Try again.');
        return;
      }

      const result = await signIn('steam', {
        token,
        redirect: false,
      });

      if (cancelled) return;

      if (result?.error) {
        setError('Steam sign-in failed. Please try again.');
        return;
      }

      const session = await getSession();
      if ((session?.user as { isAdmin?: boolean } | undefined)?.isAdmin) {
        router.replace('/admin');
      } else if ((session?.user as { onboarded?: boolean } | undefined)?.onboarded === false) {
        router.replace('/onboarding');
      } else {
        router.replace('/feed');
      }
      router.refresh();
    }

    finish().catch(() => {
      if (!cancelled) setError('Steam sign-in failed. Please try again.');
    });

    return () => {
      cancelled = true;
    };
  }, [token, router]);

  return (
    <div className="auth-page" style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center' }}>
      <div className="card" style={{ padding: 'var(--space-2xl)', textAlign: 'center', maxWidth: 400 }}>
        {error ? (
          <>
            <div className="auth-error" style={{ marginBottom: 'var(--space-md)' }}>
              {error}
            </div>
            <Link href="/login" className="btn btn-primary">
              Back to login
            </Link>
          </>
        ) : (
          <p style={{ color: 'var(--text-secondary)' }}>Finishing Steam sign-in…</p>
        )}
      </div>
    </div>
  );
}

export default function SteamCompletePage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', color: 'var(--text-muted)' }}>
          Finishing Steam sign-in…
        </div>
      }
    >
      <SteamCompleteInner />
    </Suspense>
  );
}
