import NextAuth, { CredentialsSignin } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import Discord from 'next-auth/providers/discord';
import MicrosoftEntraID from 'next-auth/providers/microsoft-entra-id';
import { compare } from 'bcryptjs';
import { prisma } from '@/lib/db';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { touchLastIp } from '@/lib/user-ip';
import { verifySteamLoginToken } from '@/lib/steam-auth';

class UnverifiedEmailError extends CredentialsSignin {
  code = 'unverified_email';
}

class BannedUserError extends CredentialsSignin {
  code = 'banned';
}

/** How long JWT claims (username, avatar, onboarded, isAdmin, ban state) are trusted before re-reading the DB. */
const SESSION_CLAIMS_TTL_MS = 2 * 60 * 1000;

async function loadSessionUser(where: { id?: string; email?: string }) {
  if (!where.id && !where.email) return null;
  return prisma.user.findUnique({
    where: where.id ? { id: where.id } : { email: where.email! },
    select: {
      id: true,
      username: true,
      image: true,
      onboarded: true,
      isAdmin: true,
      isBanned: true,
      email: true,
    },
  });
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  // Required on Vercel/proxies so Auth.js uses the request host when AUTH_URL is unset
  trustHost: true,
  adapter: {
    ...PrismaAdapter(prisma),
    createUser: async (user) => {
      const username = user.email!.split('@')[0] + Math.floor(Math.random() * 10000);
      return prisma.user.create({
        data: {
          ...user,
          username,
        },
      });
    },
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      // Link Google to an existing email/password account when Google verifies the email
      allowDangerousEmailAccountLinking: true,
    }),
    Discord({
      clientId: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
    MicrosoftEntraID({
      clientId: process.env.XBOX_CLIENT_ID,
      clientSecret: process.env.XBOX_CLIENT_SECRET,
      // @ts-expect-error tenantId is supported by the provider at runtime
      tenantId: 'common',
      allowDangerousEmailAccountLinking: true,
    }),
    // Steam OpenID → short-lived token → credentials. Only works for users who
    // already linked Steam to an existing Savepoint account (never creates users).
    Credentials({
      id: 'steam',
      name: 'Steam',
      credentials: {
        token: { label: 'Token', type: 'text' },
      },
      async authorize(credentials) {
        const steamId = verifySteamLoginToken(
          typeof credentials?.token === 'string' ? credentials.token : null
        );
        if (!steamId) return null;

        const user = await prisma.user.findUnique({ where: { steamId } });
        if (!user || user.isBanned) return null;

        await touchLastIp(user.id);

        return {
          id: user.id,
          email: user.email,
          name: user.name || user.username,
          image: user.image,
        };
      },
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

        if (user.isBanned) {
          throw new BannedUserError();
        }

        const isPasswordValid = await compare(
          credentials.password as string,
          user.password
        );

        if (!isPasswordValid) {
          return null;
        }

        await touchLastIp(user.id);

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
    async signIn({ user }) {
      if (!user?.email) return false;
      const dbUser = await prisma.user.findUnique({
        where: { email: user.email },
        select: { id: true, isBanned: true },
      });
      if (dbUser?.isBanned) return false;
      if (dbUser?.id) {
        await touchLastIp(dbUser.id);
      }
      return true;
    },
    async jwt({ token, user, trigger }) {
      // Every `auth()` call and every `/api/auth/session` poll runs this callback.
      // Hitting the database each time added a round-trip to every page render, so
      // claims are re-read only on sign-in, explicit `update()`, or after the TTL.
      const refreshedAt = (token as { refreshedAt?: number }).refreshedAt ?? 0;
      const isFresh = Date.now() - refreshedAt < SESSION_CLAIMS_TTL_MS;
      if (!user && trigger !== 'update' && token.id && isFresh) {
        return token;
      }

      const lookup = user?.email
        ? { email: user.email }
        : token.id
          ? { id: token.id as string }
          : token.email
            ? { email: token.email as string }
            : null;

      if (!lookup) {
        return token;
      }

      const dbUser = await loadSessionUser(lookup);

      if (!dbUser || dbUser.isBanned) {
        return {
          error: 'Banned',
        };
      }

      token.sub = dbUser.id;
      token.id = dbUser.id;
      token.email = dbUser.email;
      token.username = dbUser.username;
      token.image = dbUser.image;
      token.onboarded = dbUser.onboarded;
      token.isAdmin = dbUser.isAdmin;
      (token as { refreshedAt?: number }).refreshedAt = Date.now();
      delete (token as { error?: string }).error;

      // Record IP on fresh sign-in only (avoid writing on every request)
      if (user) {
        await touchLastIp(dbUser.id);
      }

      return token;
    },
    async session({ session, token }) {
      if ((token as { error?: string }).error === 'Banned' || !token.id) {
        return {
          ...session,
          user: {
            ...session.user,
            id: '',
            username: '',
            image: null,
            email: '',
            name: '',
          },
          expires: new Date(0).toISOString(),
        };
      }

      session.user.id = token.id as string;
      session.user.username = token.username as string;
      session.user.image = (token.image as string | null) ?? null;
      (session.user as { onboarded?: boolean }).onboarded = token.onboarded as boolean;
      (session.user as { isAdmin?: boolean }).isAdmin = token.isAdmin as boolean;
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60, // refresh claims at least hourly
  },
});
