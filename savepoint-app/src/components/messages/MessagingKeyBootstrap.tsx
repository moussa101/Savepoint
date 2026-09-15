'use client';

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { ensureLocalKeyPair } from '@/lib/e2e-crypto';

/**
 * Generates + publishes E2E messaging keys as soon as a member is signed in,
 * so chats work without a manual “open Messages first” step.
 */
export default function MessagingKeyBootstrap() {
  const { data: session, status } = useSession();
  const startedForUser = useRef<string | null>(null);

  useEffect(() => {
    if (status !== 'authenticated' || !session?.user?.id) return;
    if ((session.user as { isAdmin?: boolean }).isAdmin) return;
    if (typeof window === 'undefined') return;
    if (!window.isSecureContext || !window.crypto?.subtle) return;

    const userId = session.user.id;
    if (startedForUser.current === userId) return;
    startedForUser.current = userId;

    let cancelled = false;

    const run = () => {
      if (cancelled) return;
      void ensureLocalKeyPair().catch(() => {
        // Allow a retry on next navigation / remount if offline.
        if (startedForUser.current === userId) startedForUser.current = null;
      });
    };

    // Defer so first paint and auth aren’t blocked by WebCrypto + network.
    let idleId: number | undefined;
    let timeoutId: number | undefined;
    if (typeof window.requestIdleCallback === 'function') {
      idleId = window.requestIdleCallback(run, { timeout: 2000 });
    } else {
      timeoutId = window.setTimeout(run, 300);
    }

    return () => {
      cancelled = true;
      if (idleId != null && typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId != null) window.clearTimeout(timeoutId);
    };
  }, [status, session?.user?.id]);

  return null;
}
