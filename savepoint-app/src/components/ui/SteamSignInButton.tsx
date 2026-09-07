'use client';

import { signOut } from 'next-auth/react';
import { SteamIcon } from '@/components/ui/Icons';

export default function SteamSignInButton() {
  return (
    <button
      type="button"
      className="btn btn-oauth"
      onClick={async () => {
        // Clear any existing session first (same pattern as Google/Discord).
        await signOut({ redirect: false });
        window.location.href = '/api/auth/steam?mode=login';
      }}
    >
      <SteamIcon size={22} />
      Continue with Steam
    </button>
  );
}
