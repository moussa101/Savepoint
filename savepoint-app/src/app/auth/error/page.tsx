'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { KeyIcon, LockIcon, ShieldIcon, AlertTriangleIcon, HomeIcon } from '@/components/ui/Icons';
import StatusPage from '@/components/ui/StatusPage';

type AuthErrorInfo = {
  title: string;
  description: string;
  code: string;
  icon: 'key' | 'lock' | 'shield' | 'alert';
};

const AUTH_ERRORS: Record<string, AuthErrorInfo> = {
  Configuration: {
    code: 'Auth',
    title: 'Sign-in misconfigured',
    description:
      'Something is wrong with the server auth setup. Try again later or use another sign-in method.',
    icon: 'alert',
  },
  AccessDenied: {
    code: '403',
    title: 'Access denied',
    description: 'Sign-in was blocked. If your account is banned, contact support.',
    icon: 'lock',
  },
  Verification: {
    code: 'Auth',
    title: 'Verification failed',
    description: 'That verification link is invalid or expired. Request a new one and try again.',
    icon: 'shield',
  },
  OAuthSignin: {
    code: 'Auth',
    title: 'Couldn’t start sign-in',
    description: 'The OAuth provider didn’t start correctly. Try again or use email.',
    icon: 'alert',
  },
  OAuthCallback: {
    code: 'Auth',
    title: 'Sign-in callback failed',
    description: 'We couldn’t finish signing you in with that provider. Try again.',
    icon: 'alert',
  },
  OAuthCreateAccount: {
    code: 'Auth',
    title: 'Couldn’t create account',
    description: 'Creating your account from that provider failed. Try another method.',
    icon: 'alert',
  },
  EmailCreateAccount: {
    code: 'Auth',
    title: 'Couldn’t create account',
    description: 'We couldn’t create an account with that email. Try signing in instead.',
    icon: 'alert',
  },
  Callback: {
    code: 'Auth',
    title: 'Callback error',
    description: 'Sign-in hit a callback error. Please try again.',
    icon: 'alert',
  },
  OAuthAccountNotLinked: {
    code: 'Auth',
    title: 'Account already linked',
    description:
      'That login is tied to a different Savepoint user. Sign out completely, then try the original provider.',
    icon: 'shield',
  },
  EmailSignin: {
    code: 'Auth',
    title: 'Email sign-in failed',
    description: 'We couldn’t send or verify that email sign-in. Check the address and try again.',
    icon: 'alert',
  },
  CredentialsSignin: {
    code: 'Auth',
    title: 'Invalid credentials',
    description: 'Email or password didn’t match. Double-check and try again.',
    icon: 'lock',
  },
  SessionRequired: {
    code: '401',
    title: 'Sign in required',
    description: 'You need to be signed in to view that page.',
    icon: 'lock',
  },
  WebAuthnVerificationError: {
    code: 'Auth',
    title: 'Passkey verification failed',
    description:
      'We couldn’t verify that passkey. Use https://www.savepoint.life, unlock your device, then try again from Settings.',
    icon: 'key',
  },
  Default: {
    code: 'Auth',
    title: 'Sign-in error',
    description: 'Something went wrong while signing in. Please try again.',
    icon: 'alert',
  },
};

function AuthErrorIcon({ kind }: { kind: AuthErrorInfo['icon'] }) {
  const color = 'var(--accent-primary)';
  if (kind === 'key') return <KeyIcon size={36} color={color} />;
  if (kind === 'lock') return <LockIcon size={36} color={color} />;
  if (kind === 'shield') return <ShieldIcon size={36} color={color} />;
  return <AlertTriangleIcon size={36} color={color} />;
}

function AuthErrorContent() {
  const params = useSearchParams();
  const raw = params.get('error') || 'Default';
  const info = AUTH_ERRORS[raw] || {
    ...AUTH_ERRORS.Default!,
    description: `Sign-in failed (${raw}). Please try again.`,
  };

  return (
    <StatusPage
      code={info.code}
      title={info.title}
      description={info.description}
      icon={<AuthErrorIcon kind={info.icon} />}
      actions={[
        { href: '/login', label: 'Back to sign in', variant: 'primary' },
        { href: '/', label: 'Home', variant: 'secondary', icon: <HomeIcon size={16} /> },
      ]}
      footer={
        <p className="status-page-hint">
          Need help? <Link href="/settings">Settings</Link> ·{' '}
          <Link href="/register">Create account</Link>
        </p>
      }
    />
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense
      fallback={
        <StatusPage
          code="Auth"
          title="Sign-in error"
          description="Loading…"
          icon={<AlertTriangleIcon size={36} color="var(--accent-primary)" />}
        />
      }
    >
      <AuthErrorContent />
    </Suspense>
  );
}
