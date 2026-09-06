'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { LockIcon, EyeIcon, EyeOffIcon } from '@/components/ui/Icons';
import { resetPassword } from '@/app/actions/auth';

function ResetPasswordForm() {
  const router = useRouter();
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
        <br /><br />
        <Link href="/forgot-password" style={{ textDecoration: 'underline' }}>Go back</Link>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const formData = new FormData(e.currentTarget);
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
      <div className="auth-success" style={{ textAlign: 'center', padding: 'var(--space-xl) var(--space-lg)' }}>
        <h3 style={{ marginBottom: 'var(--space-md)' }}>Password Reset Successful!</h3>
        <p style={{ color: 'var(--text-secondary)' }}>
          Your password has been securely updated.
        </p>
        <div style={{ marginTop: 'var(--space-xl)' }}>
          <Link href="/login" className="btn btn-primary" style={{ width: '100%' }}>
            Sign In Now
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <div className="input-group">
          <span className="input-icon"><LockIcon size={16} /></span>
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            placeholder="New Password"
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
              position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0
            }}
            tabIndex={-1}
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
            placeholder="Confirm New Password"
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
              position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0
            }}
            tabIndex={-1}
          >
            {showConfirmPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
          </button>
        </div>
      </div>

      {error && <div className="auth-error" style={{ marginBottom: 'var(--space-md)' }}>{error}</div>}

      <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 'var(--space-md)' }} disabled={loading}>
        {loading ? 'Updating Password...' : 'Update Password'}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
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
        <h1 className="auth-title font-display">Create New Password</h1>
        <p className="auth-subtitle">Please enter a strong new password</p>

        <Suspense fallback={<div style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>Loading...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
