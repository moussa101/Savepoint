import { prisma } from '@/lib/db';
import Link from 'next/link';

export const metadata = {
  title: 'Verify Email — Savepoint',
};

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const tokenParams = await searchParams;
  const token = typeof tokenParams.token === 'string' ? tokenParams.token : null;

  if (!token) {
    return <VerifyMessage type="error" title="Invalid Link" message="Missing verification token." />;
  }

  const existingToken = await prisma.verificationToken.findUnique({
    where: { token }
  });

  if (!existingToken) {
    return <VerifyMessage type="error" title="Invalid Link" message="This verification link is invalid or has already been used." />;
  }

  if (new Date(existingToken.expires) < new Date()) {
    // Delete expired token
    await prisma.verificationToken.delete({ where: { token } });
    return <VerifyMessage type="error" title="Link Expired" message="This verification link has expired. Please sign up again." />;
  }

  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email: existingToken.identifier }
  });

  if (!user) {
    return <VerifyMessage type="error" title="User Not Found" message="The account associated with this email does not exist." />;
  }

  if (user.emailVerified) {
    await prisma.verificationToken.delete({ where: { token } });
    return <VerifyMessage type="success" title="Already Verified" message="Your email is already verified. You can log in now." />;
  }

  // Update user and delete token
  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: new Date() }
  });

  await prisma.verificationToken.delete({ where: { token } });

  return <VerifyMessage type="success" title="Email Verified!" message="Your account is now fully verified. You can log in to start using Savepoint." />;
}

function VerifyMessage({ type, title, message }: { type: 'success' | 'error', title: string, message: string }) {
  return (
    <main className="main-content" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card card-glass" style={{ maxWidth: '400px', width: '100%', textAlign: 'center', padding: 'var(--space-2xl)' }}>
        <div style={{ fontSize: '3rem', marginBottom: 'var(--space-md)' }}>
          {type === 'success' ? '✅' : '❌'}
        </div>
        <h1 className="font-display" style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-sm)' }}>
          {title}
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-xl)' }}>
          {message}
        </p>
        <Link href="/login" className="btn btn-primary" style={{ width: '100%' }}>
          Go to Login
        </Link>
      </div>
    </main>
  );
}
