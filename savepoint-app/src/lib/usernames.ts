/**
 * Reserved / branded usernames — blocked at signup with light easter eggs.
 */

const ADMIN_EXACT = new Set([
  'admin',
  'administrator',
  'admins',
  'mod',
  'mods',
  'moderator',
  'moderators',
  'staff',
  'root',
  'sysadmin',
  'sysops',
  'owner',
  'official',
]);

const SAVEPOINT_EXACT = new Set([
  'savepoint',
  'savepoints',
  'thesavepoint',
  'save_point',
  'save__point',
]);

function compactUsername(username: string) {
  return username.toLowerCase().replace(/_/g, '');
}

/** Returns a friendly error if the username is reserved; otherwise null. */
export function reservedUsernameMessage(username: string): string | null {
  const raw = username.trim();
  if (!raw) return null;

  const lower = raw.toLowerCase();
  const compact = compactUsername(raw);

  if (
    ADMIN_EXACT.has(lower) ||
    ADMIN_EXACT.has(compact) ||
    compact.startsWith('admin') ||
    lower.startsWith('admin_') ||
    lower.startsWith('mod_') ||
    compact.startsWith('moderator')
  ) {
    return "You don't look like an admin lol";
  }

  if (
    SAVEPOINT_EXACT.has(lower) ||
    SAVEPOINT_EXACT.has(compact) ||
    compact.includes('savepoint') ||
    lower.includes('save_point')
  ) {
    return 'Maybe you want to really name yourself after the website?';
  }

  return null;
}

export function isReservedUsername(username: string): boolean {
  return reservedUsernameMessage(username) !== null;
}

/** Pick a safe auto username for OAuth (never reserved). */
export function safeAutoUsername(emailLocalPart: string): string {
  let base = emailLocalPart.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 18);
  if (!base || isReservedUsername(base) || isReservedUsername(base + '1')) {
    base = 'player';
  }
  return `${base}${Math.floor(Math.random() * 10000)}`;
}
