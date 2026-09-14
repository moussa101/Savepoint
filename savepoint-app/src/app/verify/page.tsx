import { prisma } from '@/lib/db';
import Link from 'next/link';
import { CheckCircleIcon, XCircleIcon } from '@/components/ui/Icons';

export const metadata = {
  title: 'Verify Email — Savepoint',
};

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const tokenParams = await searchParams;
  const token = typeof tokenParams.token === 'string' ? tokenParams.token : null;

  if (!token) {
    return <VerifyMessage type="error" title="Invalid Link" message="Missing verification token." />;
  }

  // Prefer pending signup (new flow). Fall back to legacy VerificationToken for older emails.
  const pending = await prisma.pendingSignup.findUnique({ where: { token } });

  if (pending) {
    if (new Date(pending.expires) < new Date()) {
      await prisma.pendingSignup.delete({ where: { id: pending.id } }).catch(() => null);
      return (
        <VerifyMessage
          type="error"
          title="Link Expired"
          message="This verification link has expired. Please sign up again."
        />
      );
    }

    const clash = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: pending.email, mode: 'insensitive' } },
          { username: { equals: pending.username, mode: 'insensitive' } },
        ],
      },
      select: { id: true },
    });

    if (clash) {
      await prisma.pendingSignup.delete({ where: { id: pending.id } }).catch(() => null);
      return (
        <VerifyMessage
          type="error"
          title="Account Already Exists"
          message="An account with that email or username already exists. Please sign in."
        />
      );
    }

    try {
      await prisma.$transaction([
        prisma.user.create({
          data: {
            username: pending.username,
            email: pending.email,
            password: pending.passwordHash,
            name: pending.name || pending.username,
            emailVerified: new Date(),
          },
        }),
        prisma.pendingSignup.delete({ where: { id: pending.id } }),
      ]);
    } catch (err) {
      console.error('Pending signup → user create failed', err);
      return (
        <VerifyMessage
          type="error"
          title="Couldn’t Finish Signup"
          message="Something went wrong creating your account. Please try signing up again."
        />
      );
    }

    return (
      <VerifyMessage
        type="success"
        title="Email Verified!"
        message="Your account is ready. You can log in and start using Savepoint."
      />
    );
  }

  // —— Legacy path: user already created, token only marks emailVerified ——
  const existingToken = await prisma.verificationToken.findUnique({
    where: { token },
  });

  if (!existingToken) {
    return (
      <VerifyMessage
        type="error"
        title="Invalid Link"
        message="This verification link is invalid or has already been used."
      />
    );
  }

  if (new Date(existingToken.expires) < new Date()) {
    await prisma.verificationToken.delete({ where: { token } }).catch(() => null);
    return (
      <VerifyMessage
        type="error"
        title="Link Expired"
        message="This verification link has expired. Please sign up again."
      />
    );
  }

  const user = await prisma.user.findUnique({
    where: { email: existingToken.identifier },
  });

  if (!user) {
    await prisma.verificationToken.delete({ where: { token } }).catch(() => null);
    return (
      <VerifyMessage
        type="error"
        title="User Not Found"
        message="The account associated with this email does not exist. Please sign up again."
      />
    );
  }

  if (user.emailVerified) {
    await prisma.verificationToken.delete({ where: { token } }).catch(() => null);
    return (
      <VerifyMessage
        type="success"
        title="Already Verified"
        message="Your email is already verified. You can log in now."
      />
    );
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: new Date() },
  });
  await prisma.verificationToken.delete({ where: { token } }).catch(() => null);

  return (
    <VerifyMessage
      type="success"
      title="Email Verified!"
      message="Your account is now fully verified. You can log in to start using Savepoint."
    />
  );
}

function VerifyMessage({
  type,
  title,
  message,
}: {
  type: 'success' | 'error';
  title: string;
  message: string;
}) {
  return (
    <main
      className="main-content"
      style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <div
        className="card card-glass"
        style={{ maxWidth: '400px', width: '100%', textAlign: 'center', padding: 'var(--space-2xl)' }}
      >
        <div style={{ fontSize: '3rem', marginBottom: 'var(--space-md)' }}>
          {type === 'success' ? (
            <CheckCircleIcon size={48} color="var(--status-completed)" />
          ) : (
            <XCircleIcon size={48} color="var(--danger)" />
          )}
        </div>
        <h1 className="font-display" style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-sm)' }}>
          {title}
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-xl)' }}>{message}</p>
        <Link href="/login" className="btn btn-primary" style={{ width: '100%' }}>
          Go to Login
        </Link>
      </div>
    </main>
  );
}
