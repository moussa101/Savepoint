'use client';

import { signIn } from 'next-auth/react';

export default function GoogleSignInButton() {
  return (
    <button 
      type="button" 
      onClick={() => signIn('google', { callbackUrl: '/onboarding' })}
      className="btn btn-secondary" 
      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '0.75rem', background: 'white', color: '#000', border: 'none', fontWeight: 600 }}
    >
      <img src="https://authjs.dev/img/providers/google.svg" alt="Google" width={24} height={24} />
      Continue with Google
    </button>
  );
}
