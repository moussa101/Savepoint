'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MailIcon } from '@/components/ui/Icons';
import { requestPasswordReset } from '@/app/actions/auth';

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [formatError, setFormatError] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormatError('');
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = String(formData.get('email') || '').trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFormatError('Enter a valid email address');
      setLoading(false);
      return;
    }

    // Always show the same confirmation — server never reveals if the email exists.
    await requestPasswordReset(formData).catch(() => null);
    setLoading(false);
    setDone(true);
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
          <h1 className="auth-title font-display">Reset password</h1>
          <p className="auth-subtitle">Enter your email and we will send a reset link if an account matches.</p>

          {done ? (
            <div style={{ textAlign: 'center' }}>
              <div className="auth-success" style={{ textAlign: 'left' }}>
                If an account exists for that email, you will receive a reset link shortly. The link
                expires in 1 hour — check spam if you do not see it.
              </div>
              <Link href="/login" className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 'var(--space-lg)' }}>
                Return to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {formatError && <div className="auth-error">{formatError}</div>}
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
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
          )}

          {!done && (
            <p className="auth-footer" style={{ marginTop: 'var(--space-xl)' }}>
              Remembered your password? <Link href="/login">Sign in</Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
