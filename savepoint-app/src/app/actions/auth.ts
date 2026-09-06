'use server';

import { prisma } from '@/lib/db';
import { hash } from 'bcryptjs';
import { signIn } from '@/lib/auth';
import { sendVerificationEmail } from '@/lib/mail';
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
