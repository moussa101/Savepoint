'use client';

import { signIn } from 'next-auth/react';
import { XboxIcon } from '@/components/ui/Icons';

export default function XboxSignInButton() {
  return (
    <button
      type="button"
      className="btn"
      style={{
        backgroundColor: '#107C10',
        color: '#ffffff',
        border: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--space-sm)'
      }}
      onClick={() => signIn('microsoft-entra-id', { callbackUrl: '/onboarding' })}
    >
      <XboxIcon size={20} />
      Continue with Xbox
    </button>
  );
}
