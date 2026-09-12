/**
 * Apple/iOS-style emoji images via emoji-datasource-apple CDN.
 */

const APPLE_EMOJI_CDN =
  'https://cdn.jsdelivr.net/npm/emoji-datasource-apple@15.1.2/img/apple/64';

/** Convert an emoji grapheme to the Apple emoji sheet filename (hex codepoints). */
export function emojiToAppleCode(emoji: string): string {
  const points: string[] = [];
  for (const char of emoji) {
    const cp = char.codePointAt(0);
    if (cp == null) continue;
    // Drop variation selector-16; keep ZWJ (200d) and skin tones.
    if (cp === 0xfe0f) continue;
    points.push(cp.toString(16));
  }
  return points.join('-');
}

export function appleEmojiUrl(emoji: string): string {
  return `${APPLE_EMOJI_CDN}/${emojiToAppleCode(emoji)}.png`;
}

export function isEmojiOnlyMessage(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  // Strip emoji + whitespace; if nothing left, it's emoji-only.
  const without = trimmed
    .replace(/\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic}|\p{Emoji_Modifier})*/gu, '')
    .replace(/\s+/g, '');
  return without.length === 0;
}
