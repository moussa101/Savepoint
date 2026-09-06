'use client';

import { signIn } from 'next-auth/react';
import { GoogleIcon } from '@/components/ui/Icons';

export default function GoogleSignInButton() {
  return (
    <button
      type="button"
      onClick={() => signIn('google', { callbackUrl: '/onboarding' })}
      className="btn btn-oauth"
    >
      <GoogleIcon size={22} />
      Continue with Google
    </button>
  );
}
