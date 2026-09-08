import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from 'crypto';

function authSecret() {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error('Missing AUTH_SECRET');
  return secret;
}

/** AES-256 key unique per user, derived from AUTH_SECRET. */
function backupKey(userId: string): Buffer {
  return createHmac('sha256', authSecret()).update(`e2e-backup:${userId}`).digest();
}

/**
 * Seal a PKCS8 private key (base64) for DB storage.
 * Format: v1.<ivB64>.<tagB64>.<cipherB64>
 */
export function sealE2EPrivateKey(userId: string, privateKeyB64: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', backupKey(userId), iv);
  const enc = Buffer.concat([cipher.update(privateKeyB64, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString('base64url')}.${tag.toString('base64url')}.${enc.toString('base64url')}`;
}

export function openE2EPrivateKey(userId: string, sealed: string): string | null {
  try {
    const [ver, ivB64, tagB64, bodyB64] = sealed.split('.');
    if (ver !== 'v1' || !ivB64 || !tagB64 || !bodyB64) return null;
    const decipher = createDecipheriv('aes-256-gcm', backupKey(userId), Buffer.from(ivB64, 'base64url'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64url'));
    const plain = Buffer.concat([
      decipher.update(Buffer.from(bodyB64, 'base64url')),
      decipher.final(),
    ]);
    return plain.toString('utf8');
  } catch {
    return null;
  }
}

/** Cheap integrity check that a SPKI/PKCS8 blob looks plausible. */
export function looksLikeKeyB64(b64: string, min = 80, max = 4000): boolean {
  if (!b64 || b64.length < min || b64.length > max) return false;
  return /^[A-Za-z0-9+/=]+$/.test(b64);
}

export function fingerprintPublicKey(publicKeyB64: string): string {
  return createHash('sha256').update(publicKeyB64).digest('hex').slice(0, 16);
}
