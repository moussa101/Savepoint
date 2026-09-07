/** How often we auto-refresh a linked PSN library when the user opens Library. */
export const PSN_AUTO_SYNC_MS = 6 * 60 * 60 * 1000;

/** True when we should pull PSN again (never synced, just linked, or older than TTL). */
export function shouldAutoSyncPsn(
  psnLastSyncAt: Date | null | undefined,
  force = false
) {
  if (force) return true;
  if (!psnLastSyncAt) return true;
  return Date.now() - psnLastSyncAt.getTime() >= PSN_AUTO_SYNC_MS;
}
