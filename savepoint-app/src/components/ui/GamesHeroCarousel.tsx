'use client';

import { useEffect, useRef, useState, type SyntheticEvent } from 'react';
import Link from 'next/link';
import { StarIcon } from '@/components/ui/Icons';

function Chevron({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {dir === 'left' ? <polyline points="15 18 9 12 15 6" /> : <polyline points="9 18 15 12 9 6" />}
    </svg>
  );
}

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
  // Per-game fit: landscape banners fill the box (cover), portrait/square stay uncropped (contain).
  const [fits, setFits] = useState<Record<string, 'cover' | 'contain'>>({});
  const stripRef = useRef<HTMLDivElement>(null);

  const total = games.length;

  const applyFit = (id: string | number, img: HTMLImageElement | null) => {
    if (!img || !img.naturalWidth || !img.naturalHeight) return;
    const fit: 'cover' | 'contain' = img.naturalWidth >= img.naturalHeight * 1.2 ? 'cover' : 'contain';
    setFits((prev) => (prev[id] === fit ? prev : { ...prev, [id]: fit }));
  };

  const handleArtLoad = (id: string | number) => (e: SyntheticEvent<HTMLImageElement>) => {
    applyFit(id, e.currentTarget);
  };

  useEffect(() => {
    if (total < 2 || paused) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % total);
    }, 6500);
    return () => clearInterval(interval);
  }, [total, paused]);

  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    const el = strip.querySelector<HTMLElement>(`[data-hero-thumb="${currentIndex}"]`);
    if (!el) return;
    // Scroll only the thumbnail strip — never the page (scrollIntoView jumps to top).
    const left = el.offsetLeft - (strip.clientWidth - el.clientWidth) / 2;
    strip.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
  }, [currentIndex]);

  if (!total) return null;

  const active = games[currentIndex];
  const go = (dir: number) => setCurrentIndex((prev) => (prev + dir + total) % total);

  return (
    <section
      className="hero-spot"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Featured games"
    >
      <div className="hero-spot-stage">
        {games.map((game, index) => {
          const imageUrl = artUrl(game, '1080p');
          const isActive = index === currentIndex;
          const bg = imageUrl ? `url('${imageUrl}')` : undefined;
          const fit = fits[game.id] || 'contain';
          return (
            <div
              key={game.id}
              className={`hero-spot-slide${isActive ? ' is-active' : ''}`}
              aria-hidden={!isActive}
            >
              <div className="hero-spot-fill" style={{ backgroundImage: bg }} />
              {imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  className="hero-spot-art"
                  data-fit={fit}
                  src={imageUrl}
                  alt=""
                  decoding="async"
                  loading={index < 3 ? 'eager' : 'lazy'}
                  ref={(el) => {
                    if (el && el.complete) applyFit(game.id, el);
                  }}
                  onLoad={handleArtLoad(game.id)}
                />
              )}
            </div>
          );
        })}

        <div className="hero-spot-scrim" />

        <div className="hero-spot-copy">
          <p className="hero-spot-kicker">
            <span className="hero-spot-dot" /> Spotlight
          </p>
          <h2 className="hero-spot-title font-display">{active.name}</h2>
          {active.summary && <p className="hero-spot-summary">{active.summary}</p>}
          <div className="hero-spot-actions">
            <Link href={`/games/${active.slug}`} className="btn btn-primary">
              View Game
            </Link>
            {active.total_rating != null && active.total_rating > 0 && (
              <span className="hero-spot-rating">
                <StarIcon size={18} color="var(--star-gold)" />
                {(active.total_rating / 10).toFixed(1)}
              </span>
            )}
          </div>
        </div>

        {total > 1 && (
          <div className="hero-spot-nav" aria-hidden={false}>
            <button type="button" className="hero-spot-arrow" onClick={() => go(-1)} aria-label="Previous game">
              <Chevron dir="left" />
            </button>
            <button type="button" className="hero-spot-arrow" onClick={() => go(1)} aria-label="Next game">
              <Chevron dir="right" />
            </button>
          </div>
        )}
      </div>

      {total > 1 && (
        <div className="hero-spot-strip" ref={stripRef} role="tablist" aria-label="Featured game picker">
          {games.map((game, idx) => {
            const thumb = artUrl(game, 'cover_big') || artUrl(game, '1080p');
            const selected = idx === currentIndex;
            return (
              <button
                key={game.id}
                type="button"
                role="tab"
                aria-selected={selected}
                data-hero-thumb={idx}
                className={`hero-spot-thumb${selected ? ' is-active' : ''}`}
                onClick={() => setCurrentIndex(idx)}
                title={game.name}
              >
                {thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumb} alt="" loading={idx < 5 ? 'eager' : 'lazy'} decoding="async" />
                ) : (
                  <span className="hero-spot-thumb-fallback">{game.name}</span>
                )}
                <span className="hero-spot-thumb-label">{game.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
