'use client';

import { useState, useTransition } from 'react';
import { submitOnboarding, getSimilarGamesForOnboarding } from '@/app/actions/onboarding';

interface Game {
  id: string;
  name: string;
  coverUrl: string | null;
}

interface OnboardingClientProps {
  games: Game[];
}

export default function OnboardingClient({ games }: OnboardingClientProps) {
  const [gameList, setGameList] = useState<Game[]>(games);
  const [fetchedSimilar, setFetchedSimilar] = useState<Set<string>>(new Set());
  const [ratings, setRatings] = useState<Record<string, 'LIKE' | 'DISLIKE'>>({});
  const [isPending, startTransition] = useTransition();

  const handleRate = async (gameId: string, rating: 'LIKE' | 'DISLIKE') => {
    let isRemoving = false;

    setRatings((prev) => {
      isRemoving = prev[gameId] === rating;
      return { ...prev, [gameId]: isRemoving ? undefined : rating } as Record<
        string,
        'LIKE' | 'DISLIKE'
      >;
    });

    if (rating === 'LIKE' && !isRemoving && !fetchedSimilar.has(gameId)) {
      setFetchedSimilar((prev) => new Set(prev).add(gameId));

      try {
        const similarGames = await getSimilarGamesForOnboarding(gameId);
        if (similarGames && similarGames.length > 0) {
          setGameList((prevList) => {
            const existingIds = new Set(prevList.map((g) => g.id));
            const newGames = similarGames.filter((g: Game) => !existingIds.has(g.id));

            if (newGames.length === 0) return prevList;

            const likedIndex = prevList.findIndex((g) => g.id === gameId);
            if (likedIndex !== -1) {
              const newList = [...prevList];
              newList.splice(likedIndex + 1, 0, ...newGames);
              return newList;
            }
            return [...prevList, ...newGames];
          });
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const ratedCount = Object.values(ratings).filter(Boolean).length;
  const canSubmit = ratedCount >= 5;

  const handleSubmit = () => {
    if (!canSubmit) return;
    startTransition(async () => {
      const finalRatings = Object.entries(ratings)
        .filter(([_, val]) => val !== undefined)
        .map(([id, rating]) => ({ id, rating: rating! }));

      await submitOnboarding(finalRatings);
    });
  };

  return (
    <div>
      <div className="onboarding-progress">
        <div style={{ flex: 1, minWidth: 120, height: 6, background: 'var(--bg-surface-border)', borderRadius: 999, overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              background: 'var(--accent-primary)',
              width: `${Math.min((ratedCount / 5) * 100, 100)}%`,
              transition: 'width 0.25s ease',
            }}
          />
        </div>
        <span
          style={{
            fontWeight: 600,
            fontSize: 'var(--text-sm)',
            color: canSubmit ? 'var(--accent-primary)' : 'var(--text-secondary)',
            whiteSpace: 'nowrap',
          }}
        >
          {ratedCount} / 5
        </span>
        <button
          className="btn btn-primary btn-sm"
          style={{ opacity: canSubmit ? 1 : 0.5, pointerEvents: canSubmit ? 'auto' : 'none' }}
          onClick={handleSubmit}
          disabled={!canSubmit || isPending}
        >
          {isPending ? 'Saving…' : 'Continue'}
        </button>
      </div>

      <div className="game-grid onboarding-grid">
        {gameList.map((game) => {
          const currentRating = ratings[game.id];
          return (
            <div
              key={game.id}
              className="card"
              style={{ position: 'relative', overflow: 'hidden' }}
            >
              <div className="game-cover" style={{ position: 'relative' }}>
                {game.coverUrl ? (
                  <img
                    src={game.coverUrl}
                    alt={game.name}
                    style={{ opacity: currentRating ? 0.55 : 1, transition: 'opacity 0.15s' }}
                  />
                ) : (
                  <div style={{ width: '100%', height: '100%', background: 'var(--bg-surface-hover)' }} />
                )}

                {currentRating && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background:
                        currentRating === 'LIKE' ? 'rgba(0, 229, 160, 0.18)' : 'rgba(239, 68, 68, 0.18)',
                    }}
                  >
                    {currentRating === 'LIKE' ? (
                      <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="#00e5a0" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    )}
                  </div>
                )}
              </div>

              <div
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  textAlign: 'center',
                  marginBottom: 6,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  padding: '0 2px',
                }}
              >
                {game.name}
              </div>

              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  type="button"
                  aria-label={`Dislike ${game.name}`}
                  onClick={() => handleRate(game.id, 'DISLIKE')}
                  style={{
                    flex: 1,
                    padding: '0.35rem',
                    minHeight: 36,
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: currentRating === 'DISLIKE' ? 'var(--danger)' : 'var(--bg-surface-hover)',
                    color: currentRating === 'DISLIKE' ? 'white' : 'var(--text-secondary)',
                    border: '1px solid var(--bg-surface-border)',
                  }}
                >
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
                <button
                  type="button"
                  aria-label={`Like ${game.name}`}
                  onClick={() => handleRate(game.id, 'LIKE')}
                  style={{
                    flex: 1,
                    padding: '0.35rem',
                    minHeight: 36,
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: currentRating === 'LIKE' ? 'var(--accent-primary)' : 'var(--bg-surface-hover)',
                    color: currentRating === 'LIKE' ? '#0a0a0f' : 'var(--text-secondary)',
                    border: '1px solid var(--bg-surface-border)',
                  }}
                >
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
