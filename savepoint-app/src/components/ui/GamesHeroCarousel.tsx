'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getIGDBImageUrl } from '@/lib/igdb';
import { StarIcon } from '@/components/ui/Icons';

export default function GamesHeroCarousel({ games }: { games: any[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!games || games.length === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % games.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [games]);

  if (!games || games.length === 0) return null;

  return (
    <div style={{
      position: 'relative',
      width: '100vw',
      marginLeft: 'calc(-50vw + 50%)',
      height: '65vh',
      minHeight: '400px',
      maxHeight: '700px',
      marginTop: 'calc(-1 * var(--space-xl))',
      marginBottom: 'var(--space-2xl)',
      overflow: 'hidden',
      background: 'var(--bg-background)'
    }}>
      {games.map((game, index) => {
        // Use the first artwork, or fallback to cover
        const imageId = game.artworks?.[0]?.image_id || game.cover?.image_id;
        const imageUrl = imageId ? `https://images.igdb.com/igdb/image/upload/t_1080p/${imageId}.jpg` : '';
        const isActive = index === currentIndex;

        return (
          <div
            key={game.id}
            style={{
              position: 'absolute',
              inset: 0,
              opacity: isActive ? 1 : 0,
              transition: 'opacity 1.5s cubic-bezier(0.4, 0, 0.2, 1)',
              zIndex: isActive ? 1 : 0,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {/* Background Image */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: `url('${imageUrl}')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center 30%',
                transform: isActive ? 'scale(1.05)' : 'scale(1)',
                transition: 'transform 10s ease-out',
              }}
            />
            {/* Gradient Overlays for readability and smooth blend into page */}
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(90deg, rgba(9,9,11,0.9) 0%, rgba(9,9,11,0.6) 40%, transparent 100%)'
            }} />
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(0deg, var(--bg-background) 0%, transparent 20%, transparent 80%, var(--bg-background) 100%)'
            }} />

            {/* Content */}
            <div className="container" style={{ position: 'relative', zIndex: 2, padding: 'var(--space-2xl) var(--space-xl)' }}>
              <div style={{ maxWidth: '600px', transform: isActive ? 'translateY(0)' : 'translateY(20px)', opacity: isActive ? 1 : 0, transition: 'all 1s cubic-bezier(0.4, 0, 0.2, 1) 0.3s' }}>
                <h2 className="font-display" style={{ 
                  fontSize: 'clamp(2.5rem, 5vw, 4.5rem)', 
                  fontWeight: 900, 
                  lineHeight: 1.1,
                  marginBottom: 'var(--space-md)',
                  textShadow: '0 4px 20px rgba(0,0,0,0.5)'
                }}>
                  {game.name}
                </h2>
                {game.summary && (
                  <p style={{ 
                    fontSize: 'var(--text-lg)', 
                    color: 'rgba(255,255,255,0.8)', 
                    display: '-webkit-box', 
                    WebkitLineClamp: 3, 
                    WebkitBoxOrient: 'vertical', 
                    overflow: 'hidden',
                    marginBottom: 'var(--space-xl)',
                    lineHeight: 'var(--leading-relaxed)',
                    textShadow: '0 2px 10px rgba(0,0,0,0.5)'
                  }}>
                    {game.summary}
                  </p>
                )}
                <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
                  <Link href={`/games/${game.slug}`} className="btn btn-primary" style={{ padding: '0.75rem 2rem', fontSize: 'var(--text-base)' }}>
                    View Game
                  </Link>
                  {game.total_rating && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.75rem 1.5rem', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', borderRadius: 'var(--radius-md)', fontWeight: 600 }}>
                      <StarIcon size={18} color="var(--star-gold)" />
                      {(game.total_rating / 10).toFixed(1)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Progress Indicators */}
      <div style={{ position: 'absolute', bottom: 'var(--space-xl)', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 'var(--space-sm)', zIndex: 10 }}>
        {games.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            style={{
              width: currentIndex === idx ? '32px' : '8px',
              height: '8px',
              borderRadius: '4px',
              background: currentIndex === idx ? 'var(--accent-primary)' : 'rgba(255,255,255,0.3)',
              transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              padding: 0
            }}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
