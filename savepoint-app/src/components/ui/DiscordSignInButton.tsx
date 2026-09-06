'use client';

import { signIn, signOut } from 'next-auth/react';
import { DiscordIcon } from '@/components/ui/Icons';

export default function DiscordSignInButton() {
  return (
    <button
      type="button"
      className="btn btn-oauth"
      onClick={async () => {
        await signOut({ redirect: false });
        await signIn('discord', { callbackUrl: '/feed' });
      }}
    >
      <DiscordIcon size={22} />
      Continue with Discord
    </button>
  );
}
