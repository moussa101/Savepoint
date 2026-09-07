'use client';

import { signOut } from 'next-auth/react';
import { SteamIcon } from '@/components/ui/Icons';

/**
 * Sign into an existing Savepoint account via Steam.
 * Only works after Steam was linked from Settings/Library — never creates accounts.
 */
export default function SteamSignInButton() {
  return (
    <button
      type="button"
      className="btn btn-oauth"
      onClick={async () => {
        await signOut({ redirect: false });
        window.location.href = '/api/auth/steam?mode=login';
      }}
    >
      <SteamIcon size={22} />
      Continue with Steam
    </button>
  );
}
