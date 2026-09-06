'use server';

import { prisma } from '@/lib/db';
import { hash } from 'bcryptjs';
import { signIn } from '@/lib/auth';

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

  await prisma.user.create({
    data: {
      username,
      email,
      password: hashedPassword,
      name: name || username,
    },
  });

  // Auto sign in after registration
  try {
    await signIn('credentials', {
      email,
      password,
      redirect: false,
    });
  } catch {
    // Sign in might throw redirect, that's ok
  }

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
