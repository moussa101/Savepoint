/** Public site origin for emails, Steam OpenID, and absolute links. */
export function getAppBaseUrl() {
  const explicit = (process.env.AUTH_URL || process.env.NEXTAUTH_URL || '').replace(/\/$/, '');
  if (explicit) return explicit;

  // Production custom domain fallback when AUTH_URL / NEXTAUTH_URL are unset on Vercel
  if (process.env.VERCEL_ENV === 'production') {
    return 'https://www.savepoint.life';
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, '')}`;
  }

  return 'http://localhost:3000';
}
