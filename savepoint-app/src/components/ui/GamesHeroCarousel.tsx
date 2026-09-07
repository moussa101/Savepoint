'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { StarIcon } from '@/components/ui/Icons';

export type HeroGame = {
  id: number | string;
  name: string;
  slug: string;
  summary?: string | null;
  total_rating?: number | null;
  artworks?: { image_id: string }[];
  cover?: { image_id: string } | null;
};

function artUrl(game: HeroGame, size: '1080p' | 'screenshot_med' | 'cover_big' = '1080p') {
  const imageId = game.artworks?.[0]?.image_id || game.cover?.image_id;
  if (!imageId) return '';
  return `https://images.igdb.com/igdb/image/upload/t_${size}/${imageId}.jpg`;
}

export default function GamesHeroCarousel({ games }: { games: HeroGame[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const stripRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!games.length || paused) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % games.length);
    }, 6500);
    return () => clearInterval(interval);
  }, [games, paused]);

  useEffect(() => {
    const el = stripRef.current?.querySelector<HTMLElement>(`[data-hero-thumb="${currentIndex}"]`);
    el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [currentIndex]);

  if (!games.length) return null;

  const active = games[currentIndex];
  const bg = artUrl(active, '1080p');

  return (
    <section
      className="discover-hero"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Featured games"
    >
      <div className="discover-hero-stage">
        {games.map((game, index) => {
          const imageUrl = artUrl(game, '1080p');
          const isActive = index === currentIndex;
          return (
            <div
              key={game.id}
              className={`discover-hero-slide${isActive ? ' is-active' : ''}`}
              aria-hidden={!isActive}
            >
              <div
                className="discover-hero-bg"
                style={{ backgroundImage: imageUrl ? `url('${imageUrl}')` : undefined }}
              />
            </div>
          );
        })}

        <div className="discover-hero-veil discover-hero-veil-x" />
        <div className="discover-hero-veil discover-hero-veil-y" />

        <div className="discover-hero-copy container">
          <p className="discover-hero-kicker">Spotlight</p>
          <h2 className="discover-hero-title font-display">{active.name}</h2>
          {active.summary && (
            <p className="discover-hero-summary">{active.summary}</p>
          )}
          <div className="discover-hero-actions">
            <Link href={`/games/${active.slug}`} className="btn btn-primary">
              View Game
            </Link>
            {active.total_rating != null && active.total_rating > 0 && (
              <span className="discover-hero-rating">
                <StarIcon size={16} color="var(--star-gold)" />
                {(active.total_rating / 10).toFixed(1)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Scrolling menu / filmstrip */}
      <div className="discover-hero-strip-wrap">
        <div className="discover-hero-strip-fade discover-hero-strip-fade-left" aria-hidden />
        <div className="discover-hero-strip-fade discover-hero-strip-fade-right" aria-hidden />
        <div className="discover-hero-strip" ref={stripRef} role="tablist" aria-label="Featured game picker">
          {games.map((game, idx) => {
            const thumb = artUrl(game, 'cover_big') || artUrl(game, 'screenshot_med');
            const selected = idx === currentIndex;
            return (
              <button
                key={game.id}
                type="button"
                role="tab"
                aria-selected={selected}
                data-hero-thumb={idx}
                className={`discover-hero-thumb${selected ? ' is-active' : ''}`}
                onClick={() => setCurrentIndex(idx)}
              >
                <span className="discover-hero-thumb-media">
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumb} alt="" loading={idx < 4 ? 'eager' : 'lazy'} decoding="async" />
                  ) : (
                    <span className="discover-hero-thumb-fallback" />
                  )}
                </span>
                <span className="discover-hero-thumb-meta">
                  <span className="discover-hero-thumb-name">{game.name}</span>
                  {game.total_rating != null && game.total_rating > 0 && (
                    <span className="discover-hero-thumb-score">
                      {(game.total_rating / 10).toFixed(1)}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
