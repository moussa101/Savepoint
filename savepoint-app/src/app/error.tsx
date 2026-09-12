'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangleIcon, HomeIcon, RefreshCwIcon } from '@/components/ui/Icons';
import StatusPage from '@/components/ui/StatusPage';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Route error boundary:', error);
  }, [error]);

  return (
    <StatusPage
      code="500"
      title="Something broke"
      description="This screen hit an unexpected error. You can try again, or jump back to a safe page."
      icon={<AlertTriangleIcon size={36} color="var(--accent-primary)" />}
      actions={[
        { href: '/', label: 'Home', variant: 'secondary', icon: <HomeIcon size={16} /> },
        { href: '/feed', label: 'Feed', variant: 'ghost' },
      ]}
      footer={
        <div className="status-page-footer">
          <button type="button" className="btn btn-primary" onClick={() => reset()}>
            <RefreshCwIcon size={16} /> Try again
          </button>
          {error.digest ? <p className="status-page-digest">Ref: {error.digest}</p> : null}
          <p className="status-page-hint">
            Still stuck? <Link href="/settings">Open Settings</Link>
          </p>
        </div>
      }
    />
  );
}
