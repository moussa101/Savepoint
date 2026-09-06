'use server';

import { prisma } from '@/lib/db';
import { hash } from 'bcryptjs';
import { signIn } from '@/lib/auth';
import { sendVerificationEmail, sendPasswordResetEmail } from '@/lib/mail';
import crypto from 'crypto';

export async function registerUser(formData: FormData) {
  const username = formData.get('username') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const name = formData.get('name') as string;

  if (!username || !email || !password) {
    return { error: 'All fields are required' };
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

  // Check if username or email already exists
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { username }],
    },
  });

  if (existingUser) {
    if (existingUser.email === email) {
      return { error: 'An account with this email already exists' };
    }
    return { error: 'This username is already taken' };
  }

  const hashedPassword = await hash(password, 12);

  const user = await prisma.user.create({
    data: {
      username,
      email,
      password: hashedPassword,
      name: name || username,
    },
  });

  // Generate Verification Token
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(new Date().getTime() + 1000 * 60 * 60 * 24); // 24 hours
  
  await prisma.verificationToken.create({
    data: {
      identifier: email,
      token,
      expires
    }
  });

  // Send the email
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
  const email = formData.get('email') as string;
  if (!email) return { error: 'Email is required' };

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    // Return success anyway to prevent email enumeration
    return { success: true };
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

  await prisma.passwordResetToken.create({
    data: {
      email,
      token,
      expires,
    }
  });

  await sendPasswordResetEmail(email, token);

  return { success: true };
}

export async function resetPassword(formData: FormData) {
  const token = formData.get('token') as string;
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  if (!token || !password) return { error: 'Missing required fields' };
  if (password !== confirmPassword) return { error: 'Passwords do not match' };
  if (password.length < 8) return { error: 'Password must be at least 8 characters' };

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token }
  });

  if (!resetToken) return { error: 'Invalid token' };
  if (new Date() > resetToken.expires) return { error: 'Token has expired' };

  const hashedPassword = await hash(password, 12);

  await prisma.user.update({
    where: { email: resetToken.email },
    data: { password: hashedPassword }
  });

  await prisma.passwordResetToken.delete({
    where: { id: resetToken.id }
  });

  return { success: true };
}
