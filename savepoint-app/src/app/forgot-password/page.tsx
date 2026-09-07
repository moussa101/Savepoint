'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MailIcon } from '@/components/ui/Icons';
import { requestPasswordReset } from '@/app/actions/auth';

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await requestPasswordReset(formData);

    setLoading(false);

    if (result?.error) {
      setError(result.error);
    } else {
      setSuccess(true);
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-header">
        <Link href="/" className="auth-logo">
          <span className="navbar-brand-icon">⟐</span>
          <span className="font-display" style={{ fontWeight: 800, fontSize: 'var(--text-xl)' }}>
            Savepoint
          </span>
        </Link>
      </div>

      <div className="auth-card card-glass">
        <h1 className="auth-title font-display">Reset Password</h1>
        <p className="auth-subtitle">We will email you a link to choose a new password</p>

        {error && <div className="auth-error">{error}</div>}

        {success ? (
          <div className="auth-success" style={{ textAlign: 'center', padding: 'var(--space-xl) var(--space-lg)' }}>
            <h3 style={{ marginBottom: 'var(--space-md)' }}>Check your inbox</h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              If an account exists for that email, we sent a password reset link from{' '}
              <strong style={{ color: 'var(--text-primary)' }}>Savepoint</strong>. The link expires in 1 hour.
              <br />
              <br />
              Check spam or promotions if you do not see it within a few minutes.
            </p>
            <div style={{ marginTop: 'var(--space-xl)' }}>
              <Link href="/login" className="btn btn-primary" style={{ width: '100%' }}>
                Return to Login
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <div className="input-group">
                <span className="input-icon">
                  <MailIcon size={16} />
                </span>
                <input
                  type="email"
                  name="email"
                  placeholder="Email"
                  className="input input-with-icon"
                  required
                  autoComplete="email"
                  autoFocus
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              style={{ width: '100%', marginTop: 'var(--space-md)' }}
              disabled={loading}
            >
              {loading ? 'Sending Link…' : 'Send Reset Link'}
            </button>
          </form>
        )}

        {!success && (
          <p className="auth-footer" style={{ marginTop: 'var(--space-xl)' }}>
            Remembered your password? <Link href="/login">Sign In</Link>
          </p>
        )}
      </div>
    </div>
  );
}
