/**
 * Heuristics + blocklists for automated signup spam.
 * Not a substitute for CAPTCHA — slows down bulk bots.
 */

const SMS_GATEWAY_DOMAINS = new Set([
  'txt.att.net',
  'mms.att.net',
  'tmomail.net',
  'vtext.com',
  'vzwpix.com',
  'messaging.sprintpcs.com',
  'pm.sprint.com',
  'msg.fi.google.com',
  'sms.mycricket.com',
  'email.uscc.net',
  'mms.uscc.net',
  'vmobl.com',
  'mymetropcs.com',
]);

const DISPOSABLE_EMAIL_DOMAINS = new Set([
  'mailinator.com',
  'guerrillamail.com',
  'guerrillamail.net',
  'sharklasers.com',
  'tempmail.com',
  'temp-mail.org',
  '10minutemail.com',
  'yopmail.com',
  'trashmail.com',
  'discard.email',
  'getnada.com',
  'fakeinbox.com',
]);

function emailDomain(email: string): string {
  const at = email.lastIndexOf('@');
  if (at < 0) return '';
  return email.slice(at + 1).trim().toLowerCase();
}

/** Carrier SMS/MMS email gateways used by signup bots. */
export function isSmsGatewayEmail(email: string): boolean {
  return SMS_GATEWAY_DOMAINS.has(emailDomain(email));
}

export function isDisposableEmail(email: string): boolean {
  const domain = emailDomain(email);
  if (!domain) return true;
  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) return true;
  // Common disposable patterns
  if (/(^|\.)(temp|trash|fake|spam|mailinator)/i.test(domain)) return true;
  return false;
}

/**
 * Random bot usernames like `iVVgMunqFibPbPVFKZHO`: long, mixed case,
 * no separators, few vowels relative to length.
 */
export function looksLikeGeneratedUsername(username: string): boolean {
  const u = username.trim();
  if (u.length < 14) return false;
  if (/_/.test(u)) return false;
  if (!/^[A-Za-z0-9]+$/.test(u)) return false;
  // Must have both upper and lower (typical of random tokens)
  if (!/[a-z]/.test(u) || !/[A-Z]/.test(u)) return false;
  const vowels = (u.match(/[aeiouAEIOU]/g) || []).length;
  if (vowels / u.length < 0.18) return true;
  // Alternating case density
  let flips = 0;
  for (let i = 1; i < u.length; i++) {
    const a = u[i - 1]!;
    const b = u[i]!;
    if (/[A-Za-z]/.test(a) && /[A-Za-z]/.test(b) && a === a.toLowerCase() !== (b === b.toLowerCase())) {
      flips += 1;
    }
  }
  return flips / (u.length - 1) > 0.45;
}

export function signupBlockedReason(opts: {
  email: string;
  username: string;
  /** Honeypot field — real users leave blank */
  website?: string | null;
}): string | null {
  if (opts.website && opts.website.trim().length > 0) {
    return 'Unable to create account. Please try again.';
  }
  if (isSmsGatewayEmail(opts.email)) {
    return 'Please use a regular email address, not a phone SMS gateway.';
  }
  if (isDisposableEmail(opts.email)) {
    return 'Please use a permanent email address.';
  }
  if (looksLikeGeneratedUsername(opts.username)) {
    return 'That username looks automated. Pick something more readable.';
  }
  return null;
}
