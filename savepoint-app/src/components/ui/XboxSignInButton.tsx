'use client';

import { signIn, signOut } from 'next-auth/react';
import { XboxIcon } from '@/components/ui/Icons';

export default function XboxSignInButton() {
  return (
    <button
      type="button"
      className="btn btn-oauth"
      onClick={async () => {
        await signOut({ redirect: false });
        await signIn('microsoft-entra-id', { callbackUrl: '/feed' });
      }}
    >
      <XboxIcon size={22} />
      Continue with Xbox
    </button>
  );
}
