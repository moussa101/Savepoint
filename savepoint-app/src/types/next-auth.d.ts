import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      username: string;
      image: string | null;
      onboarded?: boolean;
      isAdmin?: boolean;
      /** ISO timestamp — used to gate release announcements to existing accounts */
      createdAt?: string;
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    username?: string;
    image?: string | null;
    onboarded?: boolean;
    isAdmin?: boolean;
    createdAt?: string;
    error?: string;
  }
}
