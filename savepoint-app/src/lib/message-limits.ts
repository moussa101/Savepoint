/** Windows for mutating own messages. */
export const MESSAGE_EDIT_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 hours
export const MESSAGE_DELETE_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 hours

export function withinMessageWindow(createdAt: Date | string, windowMs: number) {
  const t = new Date(createdAt).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t <= windowMs;
}
