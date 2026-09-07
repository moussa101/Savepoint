'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { LockIcon, EyeIcon, EyeOffIcon } from '@/components/ui/Icons';
import { resetPassword } from '@/app/actions/auth';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  if (!token) {
    return (
      <div className="auth-error" style={{ textAlign: 'center' }}>
        Invalid or missing reset token. Please request a new link.
        <div style={{ marginTop: 'var(--space-lg)' }}>
          <Link href="/forgot-password" className="btn btn-secondary">
            Request a new link
          </Link>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const password = String(formData.get('password') || '');
    const confirmPassword = String(formData.get('confirmPassword') || '');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    formData.append('token', token as string);
    const result = await resetPassword(formData);
    setLoading(false);

    if (result?.error) {
      setError(result.error);
    } else {
      setSuccess(true);
    }
  }

  if (success) {
    return (
      <div style={{ textAlign: 'center' }}>
        <h3 className="font-display" style={{ marginBottom: 'var(--space-md)', fontWeight: 700 }}>
          Password updated
        </h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-xl)', lineHeight: 1.55 }}>
          Your password has been changed. You can sign in with your new credentials.
        </p>
        <Link href="/login" className="btn btn-primary btn-lg" style={{ width: '100%' }}>
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="auth-error">{error}</div>}

      <div className="form-group">
        <div className="input-group">
          <span className="input-icon">
            <LockIcon size={16} />
          </span>
          <input
            type={showPassword ? 'text' : 'password'}
            name="password"
            placeholder="New password"
            className="input input-with-icon"
            style={{ paddingRight: '40px' }}
            required
            minLength={8}
            autoComplete="new-password"
            autoFocus
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
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
              padding: 0,
            }}
            tabIndex={-1}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
          </button>
        </div>
      </div>

      <div className="form-group">
        <div className="input-group">
          <span className="input-icon">
            <LockIcon size={16} />
          </span>
          <input
            type={showConfirmPassword ? 'text' : 'password'}
            name="confirmPassword"
            placeholder="Confirm new password"
            className="input input-with-icon"
            style={{ paddingRight: '40px' }}
            required
            minLength={8}
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword((v) => !v)}
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
              padding: 0,
            }}
            tabIndex={-1}
            aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
          >
            {showConfirmPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
          </button>
        </div>
      </div>

      <button
        type="submit"
        className="btn btn-primary btn-lg"
        style={{ width: '100%', marginTop: 'var(--space-md)' }}
        disabled={loading}
      >
        {loading ? 'Updating…' : 'Update password'}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
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
          <h1 className="auth-title font-display">Create new password</h1>
          <p className="auth-subtitle">Choose a strong password with at least 8 characters</p>

          <Suspense
            fallback={
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--space-xl)' }}>
                Loading…
              </p>
            }
          >
            <ResetPasswordForm />
          </Suspense>

          <p className="auth-footer" style={{ marginTop: 'var(--space-xl)' }}>
            <Link href="/login">Back to sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
