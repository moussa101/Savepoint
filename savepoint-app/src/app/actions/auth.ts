'use server';

import { prisma } from '@/lib/db';
import { hash } from 'bcryptjs';
import { signIn } from '@/lib/auth';
import { sendVerificationEmail, sendPasswordResetEmail } from '@/lib/mail';
import crypto from 'crypto';
import { headers } from 'next/headers';
import { getClientIpFromHeaders } from '@/lib/security';

const resetAttempts = new Map<string, { count: number; resetAt: number }>();
const registerAttempts = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(
  store: Map<string, { count: number; resetAt: number }>,
  key: string,
  limit: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const entry = store.get(key);
  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count += 1;
  return true;
}

async function clientKey(suffix: string) {
  try {
    const h = await headers();
    const ip = getClientIpFromHeaders(h);
    return `${ip}:${suffix}`;
  } catch {
    return `unknown:${suffix}`;
  }
}

export async function registerUser(formData: FormData) {
  const username = formData.get('username') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const name = formData.get('name') as string;

  if (!username || !email || !password) {
    return { error: 'All fields are required' };
  }

  const rateKey = await clientKey(email.toLowerCase());
  if (!checkRateLimit(registerAttempts, rateKey, 5, 60 * 60 * 1000)) {
    return { error: 'Too many registration attempts. Please try again later.' };
  }

  if (username.length < 3 || username.length > 30) {
    return { error: 'Username must be between 3 and 30 characters' };
  }

  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return { error: 'Username can only contain letters, numbers, and underscores' };
  }

  if (password.length < 8) {
    return { error: 'Password must be at least 8 characters' };
  }

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { username }],
    },
  });

  if (existingUser) {
    // Generic message to reduce account enumeration
    return { error: 'Unable to create account with those details. Try a different username or sign in.' };
  }

  const hashedPassword = await hash(password, 12);

  await prisma.user.create({
    data: {
      username,
      email,
      password: hashedPassword,
      name: name || username,
    },
  });

  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(new Date().getTime() + 1000 * 60 * 60 * 24);

  await prisma.verificationToken.create({
    data: {
      identifier: email,
      token,
      expires,
    },
  });

  await sendVerificationEmail(email, token);

  return { success: true };
}

export async function loginUser(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Email and password are required' };
  }

  try {
    await signIn('credentials', {
      email,
      password,
      redirect: false,
    });
    return { success: true };
  } catch {
    return { error: 'Invalid email or password' };
  }
}

export async function requestPasswordReset(formData: FormData) {
  const emailRaw = (formData.get('email') as string | null) || '';
  const email = emailRaw.trim().toLowerCase();
  if (!email) return { error: 'Email is required' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'Enter a valid email address' };
  }

  const rateKey = await clientKey(email);
  if (!checkRateLimit(resetAttempts, rateKey, 3, 60 * 60 * 1000)) {
    // Still return success to avoid enumeration / timing tells
    return { success: true };
  }

  // Case-insensitive match (emails are usually stored lowercase; OAuth may vary)
  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
    select: { id: true, email: true, password: true },
  });

  if (!user) {
    return { success: true };
  }

  // OAuth-only accounts can still set a password via reset
  await prisma.passwordResetToken.deleteMany({ where: { email: user.email } });

  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

  await prisma.passwordResetToken.create({
    data: {
      email: user.email,
      token,
      expires,
    },
  });

  const sent = await sendPasswordResetEmail(user.email, token);
  if (!sent) {
    // Clean up unused token so the user can retry
    await prisma.passwordResetToken.deleteMany({ where: { token } });
    return {
      error:
        'We could not send the reset email right now. Check that Gmail is configured, then try again.',
    };
  }

  return { success: true };
}

export async function resetPassword(formData: FormData) {
  const token = ((formData.get('token') as string | null) || '').trim();
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  if (!token || !password) return { error: 'Missing required fields' };
  if (password !== confirmPassword) return { error: 'Passwords do not match' };
  if (password.length < 8) return { error: 'Password must be at least 8 characters' };

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token },
  });

  if (!resetToken) return { error: 'Invalid or expired reset link. Request a new one.' };
  if (new Date() > resetToken.expires) {
    await prisma.passwordResetToken.deleteMany({ where: { token } });
    return { error: 'This reset link has expired. Request a new one.' };
  }

  const user = await prisma.user.findUnique({
    where: { email: resetToken.email },
    select: { id: true },
  });
  if (!user) {
    await prisma.passwordResetToken.deleteMany({ where: { token } });
    return { error: 'Account not found for this reset link.' };
  }

  const hashedPassword = await hash(password, 12);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    }),
    prisma.passwordResetToken.deleteMany({
      where: { email: resetToken.email },
    }),
    // Force re-login on other devices after a password change
    prisma.session.deleteMany({
      where: { userId: user.id },
    }),
  ]);

  return { success: true };
}
