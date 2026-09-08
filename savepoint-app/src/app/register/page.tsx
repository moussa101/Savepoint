'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { registerUser } from '@/app/actions/auth';
import GoogleSignInButton from '@/components/ui/GoogleSignInButton';
import DiscordSignInButton from '@/components/ui/DiscordSignInButton';
import XboxSignInButton from '@/components/ui/XboxSignInButton';
import { UserIcon, MailIcon, LockIcon, EyeIcon, EyeOffIcon } from '@/components/ui/Icons';

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    const result = await registerUser(formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.push('/login?registered=true');
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
          <h1 className="auth-title font-display">Join Savepoint</h1>
          <p className="auth-subtitle">Start building your gaming profile</p>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <div className="input-group">
                <span className="input-icon">@</span>
                <input
                  type="text"
                  name="username"
                  placeholder="Username"
                  className="input input-with-icon"
                  required
                  minLength={3}
                  maxLength={30}
                  pattern="^[a-zA-Z0-9_]+$"
                  autoComplete="username"
                />
              </div>
            </div>

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
                  minLength={8}
                  autoComplete="new-password"
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

            <div className="form-group">
              <div className="input-group">
                <span className="input-icon"><LockIcon size={16} /></span>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  placeholder="Confirm Password"
                  className="input input-with-icon"
                  style={{ paddingRight: '40px' }}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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
                  title={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                </button>
              </div>
            </div>

            <div className="form-group" style={{ display: 'none' }}>
              <input type="text" name="name" value="" readOnly />
            </div>

            <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>

            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textAlign: 'center', marginTop: 'var(--space-md)', lineHeight: 1.5 }}>
              By creating an account you agree to our{' '}
              <Link href="/terms">Terms of Service</Link> and{' '}
              <Link href="/privacy">Privacy Policy</Link>.
            </p>
          </form>

          <div className="divider" style={{ margin: 'var(--space-lg) 0' }}>
            or sign up with
          </div>

          <div className="auth-social">
            <GoogleSignInButton />
            <DiscordSignInButton />
            <XboxSignInButton />
          </div>
          <p className="auth-social-note">
            No Steam signup — Steam OpenID doesn&apos;t share an email. Create an account
            here, then connect Steam from Settings or Library to sync your games.
          </p>

          <p className="auth-footer">
            Already have an account? <Link href="/login">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
