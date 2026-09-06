'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { registerUser } from '@/app/actions/auth';
import GoogleSignInButton from '@/components/ui/GoogleSignInButton';
import { MailIcon, LockIcon } from '@/components/ui/Icons';

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

        <div className="auth-card card-glass">
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
                  type="password"
                  name="password"
                  placeholder="Password"
                  className="input input-with-icon"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div className="form-group">
              <div className="input-group">
                <span className="input-icon"><LockIcon size={16} /></span>
                <input
                  type="password"
                  name="confirmPassword"
                  placeholder="Confirm Password"
                  className="input input-with-icon"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div className="form-group" style={{ display: 'none' }}>
              <input type="text" name="name" value="" readOnly />
            </div>

            <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <div className="divider" style={{ margin: 'var(--space-lg) 0' }}>
            or sign up with
          </div>

          <div className="auth-social">
            <GoogleSignInButton />
          </div>

          <p className="auth-footer">
            Already have an account? <Link href="/login">Sign In</Link>
          </p>
        </div>
      </div>

      <style jsx>{`
        .auth-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
        }
        .auth-bg {
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse at 30% 20%, rgba(0, 229, 160, 0.08) 0%, transparent 60%),
            radial-gradient(ellipse at 70% 80%, rgba(99, 102, 241, 0.06) 0%, transparent 60%),
            var(--bg-primary);
        }
        .auth-container {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 440px;
          padding: var(--space-lg);
        }
        .auth-header {
          text-align: center;
          margin-bottom: var(--space-xl);
        }
        .auth-logo {
          display: inline-flex;
          align-items: center;
          gap: var(--space-sm);
          color: var(--text-primary);
          text-decoration: none;
        }
        .auth-card {
          padding: var(--space-2xl);
          border-radius: var(--radius-xl);
        }
        .auth-title {
          font-size: var(--text-3xl);
          font-weight: 800;
          margin-bottom: var(--space-xs);
        }
        .auth-subtitle {
          color: var(--text-secondary);
          margin-bottom: var(--space-xl);
        }
        .auth-error {
          background: var(--danger-bg);
          color: var(--danger);
          padding: var(--space-md);
          border-radius: var(--radius-md);
          font-size: var(--text-sm);
          margin-bottom: var(--space-lg);
          border: 1px solid rgba(239, 68, 68, 0.2);
        }
        .auth-social {
          display: flex;
          gap: var(--space-sm);
        }
        .auth-social .btn {
          flex: 1;
          opacity: 0.5;
        }
        .auth-footer {
          text-align: center;
          margin-top: var(--space-xl);
          font-size: var(--text-sm);
          color: var(--text-secondary);
        }
      `}</style>
    </div>
  );
}
