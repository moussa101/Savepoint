'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { signIn, getSession } from 'next-auth/react';
import GoogleSignInButton from '@/components/ui/GoogleSignInButton';
import DiscordSignInButton from '@/components/ui/DiscordSignInButton';
import XboxSignInButton from '@/components/ui/XboxSignInButton';
import SteamSignInButton from '@/components/ui/SteamSignInButton';
import { MailIcon, LockIcon, EyeIcon, EyeOffIcon } from '@/components/ui/Icons';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const registered = searchParams.get('registered');
  const oauthError = searchParams.get('error');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const oauthErrorMessage =
    oauthError === 'OAuthAccountNotLinked'
      ? 'That Google account is linked to a different Savepoint user. Sign out completely (clear site cookies if needed), then try Google again.'
      : oauthError === 'AccessDenied'
        ? 'Sign-in was denied. If your account is banned, contact support.'
        : oauthError === 'steam_not_linked'
          ? 'This Steam account isn’t linked yet. Sign in with Google, Discord, Xbox, or email first, then connect Steam from Settings or Library.'
          : oauthError === 'steam_cancelled'
            ? 'Steam sign-in was cancelled.'
            : oauthError === 'steam'
              ? 'Steam sign-in failed. Please try again.'
              : oauthError
                ? 'Sign-in failed. Please try again.'
                : '';

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      if (result.error.includes('unverified_email') || result.code === 'unverified_email') {
        setError('Please verify your email address before signing in. Check your inbox.');
      } else {
        setError('Invalid email or password');
      }
      setLoading(false);
      return;
    }

    // Check session to determine where to route
    const session = await getSession();
    if ((session?.user as any)?.isAdmin) {
      router.push('/admin');
    } else {
      router.push('/feed');
    }
    
    router.refresh();
  }

  return (
    <div className="auth-page">
      <div className="auth-bg" />
      <div className="auth-container animate-fade-in-up">
        <div className="auth-header">
          <Link href="/" className="auth-logo">
            <span className="navbar-brand-icon">⟐</span>
            <span className="font-display" style={{ fontWeight: 800, fontSize: 'var(--text-xl)' }}>
              Savepoint
            </span>
          </Link>
        </div>

        <div className="auth-card">
          <h1 className="auth-title font-display">Welcome Back</h1>
          <p className="auth-subtitle">Continue your gaming journey</p>

          {registered && (
            <div className="auth-success">
              Account created successfully! Sign in to continue.
            </div>
          )}

          {(error || oauthErrorMessage) && (
            <div className="auth-error">{error || oauthErrorMessage}</div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <div className="input-group">
                <span className="input-icon"><MailIcon size={16} /></span>
                <input
                  type="email"
                  name="email"
                  placeholder="Email"
                  className="input input-with-icon"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="form-group">
              <div className="input-group">
                <span className="input-icon"><LockIcon size={16} /></span>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Password"
                  className="input input-with-icon"
                  style={{ paddingRight: '40px' }}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0
                  }}
                  tabIndex={-1}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                </button>
              </div>
            </div>

            <div style={{ textAlign: 'right', marginBottom: 'var(--space-lg)' }}>
              <Link href="/forgot-password" style={{ fontSize: 'var(--text-sm)' }}>
                Forgot Password?
              </Link>
            </div>

            <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          <div className="divider" style={{ margin: 'var(--space-lg) 0' }}>
            or continue with
          </div>

          <div className="auth-social">
            <GoogleSignInButton />
            <DiscordSignInButton />
            <XboxSignInButton />
            <SteamSignInButton />
          </div>
          <p className="auth-social-note">
            Steam signs you into an existing account after you link it in Settings — Steam
            doesn&apos;t provide an email, so it can&apos;t create a new Savepoint account.
          </p>

          <p className="auth-footer">
            Don&apos;t have an account? <Link href="/register">Sign Up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
