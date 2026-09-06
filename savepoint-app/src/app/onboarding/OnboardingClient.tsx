'use client';

import { useState, useTransition } from 'react';
import { submitOnboarding } from '@/app/actions/onboarding';

interface Game {
  id: string;
  name: string;
  coverUrl: string | null;
}

interface OnboardingClientProps {
  games: Game[];
}

export default function OnboardingClient({ games }: OnboardingClientProps) {
  // Store the user's ratings as { [gameId]: 'LIKE' | 'DISLIKE' }
  const [ratings, setRatings] = useState<Record<string, 'LIKE' | 'DISLIKE'>>({});
  const [isPending, startTransition] = useTransition();

  const handleRate = (gameId: string, rating: 'LIKE' | 'DISLIKE') => {
    setRatings(prev => ({
      ...prev,
      [gameId]: prev[gameId] === rating ? undefined : rating, // Toggle off if clicked again
    } as Record<string, 'LIKE' | 'DISLIKE'>));
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
        {games.map((game) => {
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
                    {currentRating === 'LIKE' ? '👍' : '👎'}
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
                    flex: 1, padding: '0.5rem', borderRadius: 'var(--radius-md)',
                    background: currentRating === 'DISLIKE' ? 'var(--danger)' : 'var(--bg-surface-hover)',
                    color: currentRating === 'DISLIKE' ? 'white' : 'var(--text-secondary)',
                    border: '1px solid var(--bg-surface-border)', transition: 'all 0.2s'
                  }}
                >
                  👎
                </button>
                <button
                  onClick={() => handleRate(game.id, 'LIKE')}
                  style={{
                    flex: 1, padding: '0.5rem', borderRadius: 'var(--radius-md)',
                    background: currentRating === 'LIKE' ? 'var(--accent-primary)' : 'var(--bg-surface-hover)',
                    color: currentRating === 'LIKE' ? '#000' : 'var(--text-secondary)',
                    border: '1px solid var(--bg-surface-border)', transition: 'all 0.2s'
                  }}
                >
                  👍
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
