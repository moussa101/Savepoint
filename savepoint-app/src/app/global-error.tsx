'use client';

import { useEffect } from 'react';

/**
 * Catches errors in the root layout. Must define its own <html>/<body>
 * because it replaces the root layout when active.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global error boundary:', error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100dvh',
          display: 'grid',
          placeItems: 'center',
          padding: 24,
          boxSizing: 'border-box',
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
          background: '#0a0a0f',
          color: '#eee',
        }}
      >
        <div style={{ maxWidth: 420, textAlign: 'center' }}>
          <div
            style={{
              fontSize: 'clamp(4rem, 16vw, 6rem)',
              fontWeight: 800,
              lineHeight: 0.9,
              letterSpacing: '-0.04em',
              background: 'linear-gradient(180deg, rgba(0,229,160,0.4), rgba(0,229,160,0.06))',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
              marginBottom: 12,
              userSelect: 'none',
            }}
            aria-hidden
          >
            500
          </div>
          <h1 style={{ fontSize: '1.5rem', margin: '0 0 8px' }}>Savepoint crashed</h1>
          <p style={{ color: '#9aa0a6', fontSize: 14, lineHeight: 1.55, margin: '0 0 24px' }}>
            A critical error stopped the app from loading. Try again — your progress is still on
            the server.
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                appearance: 'none',
                border: 'none',
                borderRadius: 10,
                padding: '12px 18px',
                fontWeight: 700,
                cursor: 'pointer',
                background: 'linear-gradient(135deg, #00e5a0, #00b87d)',
                color: '#0a0a0f',
              }}
            >
              Try again
            </button>
            <a
              href="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                borderRadius: 10,
                padding: '12px 18px',
                fontWeight: 600,
                textDecoration: 'none',
                background: 'rgba(255,255,255,0.06)',
                color: '#eee',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              Home
            </a>
          </div>
          {error.digest ? (
            <p style={{ marginTop: 20, fontSize: 12, color: '#6b7280' }}>Ref: {error.digest}</p>
          ) : null}
        </div>
      </body>
    </html>
  );
}
