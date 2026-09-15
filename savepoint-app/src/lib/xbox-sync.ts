/** How often we auto-refresh a linked Xbox library when the user opens Library. */
export const XBOX_AUTO_SYNC_MS = 6 * 60 * 60 * 1000;

/** True when we should pull Xbox again (never synced, just linked, or older than TTL). */
export function shouldAutoSyncXbox(
  xboxLastSyncAt: Date | null | undefined,
  force = false
) {
  if (force) return true;
  if (!xboxLastSyncAt) return true;
  return Date.now() - xboxLastSyncAt.getTime() >= XBOX_AUTO_SYNC_MS;
}
