'use client';

import { signIn } from 'next-auth/react';
import { XboxIcon } from '@/components/ui/Icons';

export default function XboxSignInButton() {
  return (
    <button
      type="button"
      className="btn btn-oauth"
      onClick={() => signIn('microsoft-entra-id', { callbackUrl: '/onboarding' })}
    >
      <XboxIcon size={22} />
      Continue with Xbox
    </button>
  );
}
