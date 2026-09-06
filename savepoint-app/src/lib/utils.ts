// Game tracking statuses
export const GAME_STATUSES = {
  WANT_TO_PLAY: 'WANT_TO_PLAY',
  PLAYING: 'PLAYING',
  COMPLETED: 'COMPLETED',
  DROPPED: 'DROPPED',
} as const;

export type GameStatus = (typeof GAME_STATUSES)[keyof typeof GAME_STATUSES];

export const STATUS_LABELS: Record<GameStatus, string> = {
  WANT_TO_PLAY: 'Want to Play',
  PLAYING: 'Playing',
  COMPLETED: 'Completed',
  DROPPED: 'Dropped',
};

export const STATUS_COLORS: Record<GameStatus, string> = {
  WANT_TO_PLAY: 'want-to-play',
  PLAYING: 'playing',
  COMPLETED: 'completed',
  DROPPED: 'dropped',
};

// List visibility
export const LIST_VISIBILITY = {
  PUBLIC: 'PUBLIC',
  PRIVATE: 'PRIVATE',
} as const;

export type ListVisibility = (typeof LIST_VISIBILITY)[keyof typeof LIST_VISIBILITY];

// Rating helpers
export const RATING_STEPS = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5] as const;

export function formatRating(rating: number): string {
  if (rating % 1 === 0) return rating.toString();
  return rating.toFixed(1);
}

export function getStarDisplay(rating: number): { full: number; half: boolean; empty: number } {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  return { full, half, empty };
}

// Date formatting
export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatRelativeTime(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffWeeks < 4) return `${diffWeeks}w ago`;
  if (diffMonths < 12) return `${diffMonths}mo ago`;
  return formatDate(date);
}

// Slug generation
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Truncate text
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length).trim() + '...';
}
