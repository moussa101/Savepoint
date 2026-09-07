/** How often we auto-refresh a linked Steam library when the user opens Library. */
export const STEAM_AUTO_SYNC_MS = 6 * 60 * 60 * 1000;

/** True when we should pull Steam again (never synced, just linked, or older than TTL). */
export function shouldAutoSyncSteam(
  steamLastSyncAt: Date | null | undefined,
  force = false
) {
  if (force) return true;
  if (!steamLastSyncAt) return true;
  return Date.now() - steamLastSyncAt.getTime() >= STEAM_AUTO_SYNC_MS;
}
