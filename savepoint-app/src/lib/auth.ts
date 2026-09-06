import NextAuth, { CredentialsSignin } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import { compare } from 'bcryptjs';
import { prisma } from '@/lib/db';
import { PrismaAdapter } from '@auth/prisma-adapter';

class UnverifiedEmailError extends CredentialsSignin {
  code = "unverified_email"
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: {
    ...PrismaAdapter(prisma),
    createUser: async (user) => {
      // Generate a random username if not provided (for OAuth users)
      const username = user.email.split('@')[0] + Math.floor(Math.random() * 10000);
      return prisma.user.create({
        data: {
          ...user,
          username,
        }
      });
    }
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user || !user.password) {
          return null;
        }

        if (!user.emailVerified) {
          throw new UnverifiedEmailError();
        }

        const isPasswordValid = await compare(
          credentials.password as string,
          user.password
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name || user.username,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email! },
          select: { id: true, username: true, image: true, onboarded: true },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.username = dbUser.username;
          token.image = dbUser.image;
          token.onboarded = dbUser.onboarded;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.username = token.username as string;
        session.user.image = token.image as string | null;
        (session.user as any).onboarded = token.onboarded;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
});
