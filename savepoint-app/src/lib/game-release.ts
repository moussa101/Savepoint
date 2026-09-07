/** True when the game has a known future release date. Missing date → treat as released. */
export function isGameUnreleased(releaseDate: Date | string | null | undefined): boolean {
  if (!releaseDate) return false;
  const d = releaseDate instanceof Date ? releaseDate : new Date(releaseDate);
  if (Number.isNaN(d.getTime())) return false;
  return d.getTime() > Date.now();
}

export function isGameReleased(releaseDate: Date | string | null | undefined): boolean {
  return !isGameUnreleased(releaseDate);
}
