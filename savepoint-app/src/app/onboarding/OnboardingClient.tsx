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

    setRatings(prev => {
      isRemoving = prev[gameId] === rating;
      return { ...prev, [gameId]: isRemoving ? undefined : rating } as Record<string, 'LIKE' | 'DISLIKE'>;
    });
      
    // Side effects must happen outside the setState updater function in React!
    if (rating === 'LIKE' && !isRemoving && !fetchedSimilar.has(gameId)) {
      setFetchedSimilar(prev => new Set(prev).add(gameId));
      
      try {
        const similarGames = await getSimilarGamesForOnboarding(gameId);
        if (similarGames && similarGames.length > 0) {
          setGameList(prevList => {
            const existingIds = new Set(prevList.map(g => g.id));
            const newGames = similarGames.filter((g: any) => !existingIds.has(g.id));
            
            if (newGames.length === 0) return prevList;
            
            const likedIndex = prevList.findIndex(g => g.id === gameId);
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
      // Filter out undefined ratings just in case
      const finalRatings = Object.entries(ratings)
        .filter(([_, val]) => val !== undefined)
        .map(([id, rating]) => ({ id, rating: rating! }));
        
      await submitOnboarding(finalRatings);
      // The server action will redirect to /feed
    });
  };

  return (
    <div>
      {/* Sticky Progress Bar */}
      <div style={{
        position: 'sticky', top: '20px', zIndex: 100,
        background: 'var(--bg-glass)', backdropFilter: 'blur(20px)',
        border: '1px solid var(--bg-glass-border)', borderRadius: 'var(--radius-full)',
        padding: 'var(--space-md) var(--space-xl)', marginBottom: 'var(--space-2xl)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: 'var(--shadow-lg)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', flex: 1 }}>
          <div style={{ flex: 1, height: '8px', background: 'var(--bg-surface-border)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              background: 'var(--accent-primary)',
              width: `${Math.min((ratedCount / 5) * 100, 100)}%`,
              transition: 'width 0.3s ease'
            }} />
          </div>
          <span style={{ fontWeight: 600, color: canSubmit ? 'var(--accent-primary)' : 'var(--text-secondary)' }}>
            {ratedCount} / 5 Rated
          </span>
        </div>
        
        <button
          className="btn btn-primary"
          style={{ marginLeft: 'var(--space-xl)', opacity: canSubmit ? 1 : 0.5, pointerEvents: canSubmit ? 'auto' : 'none' }}
          onClick={handleSubmit}
          disabled={!canSubmit || isPending}
        >
          {isPending ? 'Saving...' : 'Complete Profile →'}
        </button>
      </div>

      {/* Games Grid */}
      <div className="game-grid game-grid-lg">
        {gameList.map((game) => {
          const currentRating = ratings[game.id];
          return (
            <div key={game.id} className="card card-interactive" style={{ padding: 'var(--space-sm)', position: 'relative', overflow: 'hidden' }}>
              <div className="game-cover" style={{ marginBottom: 'var(--space-md)' }}>
                {game.coverUrl ? (
                  <img src={game.coverUrl} alt={game.name} style={{ opacity: currentRating ? 0.6 : 1, transition: 'opacity 0.2s' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', background: 'var(--bg-surface-hover)' }} />
                )}
                
                {/* Overlay for rating status */}
                {currentRating && (
                  <div style={{
                    position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: currentRating === 'LIKE' ? 'rgba(0, 229, 160, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                    fontSize: '4rem', textShadow: '0 4px 12px rgba(0,0,0,0.5)'
                  }}>
                    {currentRating === 'LIKE' ? (
                      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#00e5a0" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    ) : (
                      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    )}
                  </div>
                )}
              </div>
              
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, textAlign: 'center', marginBottom: 'var(--space-md)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {game.name}
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                <button
                  onClick={() => handleRate(game.id, 'DISLIKE')}
                  style={{
                    flex: 1, padding: '0.5rem', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: currentRating === 'DISLIKE' ? 'var(--danger)' : 'var(--bg-surface-hover)',
                    color: currentRating === 'DISLIKE' ? 'white' : 'var(--text-secondary)',
                    border: '1px solid var(--bg-surface-border)', transition: 'all 0.2s'
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
                <button
                  onClick={() => handleRate(game.id, 'LIKE')}
                  style={{
                    flex: 1, padding: '0.5rem', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: currentRating === 'LIKE' ? 'var(--accent-primary)' : 'var(--bg-surface-hover)',
                    color: currentRating === 'LIKE' ? '#0a0a0f' : 'var(--text-secondary)',
                    border: '1px solid var(--bg-surface-border)', transition: 'all 0.2s'
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
