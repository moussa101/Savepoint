export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function getClientIpFromHeaders(headerStore: Headers | { get(name: string): string | null }): string {
  const forwarded = headerStore.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  const realIp = headerStore.get('x-real-ip')?.trim();
  if (realIp) return realIp;
  return 'Unknown';
}

export function getClientIpFromRequest(req: { headers: { get(name: string): string | null } }): string {
  return getClientIpFromHeaders(req.headers);
}

export function assertNumericId(value: string, label = 'ID'): string {
  if (!/^\d+$/.test(value)) {
    throw new Error(`Invalid ${label}`);
  }
  return value;
}

export function isValidListVisibility(value: string): value is 'PUBLIC' | 'PRIVATE' {
  return value === 'PUBLIC' || value === 'PRIVATE';
}

export function getInternalApiSecret(): string {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error('Missing AUTH_SECRET');
  }
  return secret;
}

export function assertInternalRequest(req: { headers: { get(name: string): string | null } }) {
  const provided = req.headers.get('x-internal-secret');
  if (!provided || provided !== getInternalApiSecret()) {
    throw new Error('Unauthorized');
  }
}

export function sniffImageMime(buffer: Buffer): { mime: string; ext: string } | null {
  if (buffer.length < 12) return null;

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mime: 'image/jpeg', ext: 'jpg' };
  }
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return { mime: 'image/png', ext: 'png' };
  }
  if (
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return { mime: 'image/webp', ext: 'webp' };
  }

  return null;
}

export function ownedUploadKey(userId: string, objectKey: string, isBanner: boolean): boolean {
  const prefix = isBanner ? 'banners/' : 'avatars/';
  const expectedStart = `${prefix}${userId}_`;
  if (!objectKey.startsWith(expectedStart)) return false;
  if (objectKey.includes('..') || objectKey.includes('\\')) return false;
  return /^[a-z]+\/[a-zA-Z0-9._-]+$/.test(objectKey);
}
