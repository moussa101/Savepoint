'use client';

import { signIn } from 'next-auth/react';
import { DiscordIcon } from '@/components/ui/Icons';

export default function DiscordSignInButton() {
  return (
    <button
      type="button"
      className="btn"
      style={{
        backgroundColor: '#5865F2',
        color: '#ffffff',
        border: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--space-sm)'
      }}
      onClick={() => signIn('discord', { callbackUrl: '/onboarding' })}
    >
      <DiscordIcon size={20} />
      Continue with Discord
    </button>
  );
}
