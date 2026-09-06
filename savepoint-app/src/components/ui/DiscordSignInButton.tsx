'use client';

import { signIn } from 'next-auth/react';
import { DiscordIcon } from '@/components/ui/Icons';

export default function DiscordSignInButton() {
  return (
    <button
      type="button"
      className="btn btn-oauth"
      onClick={() => signIn('discord', { callbackUrl: '/onboarding' })}
    >
      <DiscordIcon size={22} />
      Continue with Discord
    </button>
  );
}
