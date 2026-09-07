/** In-place Fisher–Yates shuffle (unbiased). */
export function shuffleInPlace<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

export function shuffleCopy<T>(items: T[]): T[] {
  return shuffleInPlace([...items]);
}

/**
 * Shuffle within quality tiers so popular titles stay present but order feels random.
 * `tiers` is highest-priority first; each tier is shuffled, then concatenated.
 */
export function shuffleTier<T>(tiers: T[][]): T[] {
  return tiers.flatMap((tier) => shuffleCopy(tier));
}
