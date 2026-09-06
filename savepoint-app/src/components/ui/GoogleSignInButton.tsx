'use client';

import { signIn, signOut } from 'next-auth/react';
import { GoogleIcon } from '@/components/ui/Icons';

export default function GoogleSignInButton() {
  return (
    <button
      type="button"
      className="btn btn-oauth"
      onClick={async () => {
        // Clear any existing session first. Auth.js rejects OAuth if a
        // different user is already signed in (OAuthAccountNotLinked).
        await signOut({ redirect: false });
        await signIn('google', { callbackUrl: '/feed' });
      }}
    >
      <GoogleIcon size={22} />
      Continue with Google
    </button>
  );
}
