'use client';

import { useState } from 'react';

interface StarRatingProps {
  rating: number;
  maxStars?: number;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  onRate?: (rating: number) => void;
  showValue?: boolean;
}

export default function StarRating({
  rating,
  maxStars = 5,
  size = 'md',
  interactive = false,
  onRate,
  showValue = false,
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState(0);
  const displayRating = hoverRating || rating;

  const sizeClass = {
    sm: { fontSize: '0.875rem', gap: '1px' },
    md: { fontSize: '1.125rem', gap: '2px' },
    lg: { fontSize: '1.5rem', gap: '3px' },
  }[size];

  function handleClick(starIndex: number, isHalf: boolean) {
    if (!interactive || !onRate) return;
    const newRating = isHalf ? starIndex - 0.5 : starIndex;
    onRate(newRating);
  }

  function handleMouseMove(e: React.MouseEvent, starIndex: number) {
    if (!interactive) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const isHalf = e.clientX - rect.left < rect.width / 2;
    setHoverRating(isHalf ? starIndex - 0.5 : starIndex);
  }

  return (
    <div className="stars" style={{ gap: sizeClass.gap }}>
      {Array.from({ length: maxStars }, (_, i) => {
        const starIndex = i + 1;
        const isFull = displayRating >= starIndex;
        const isHalf = !isFull && displayRating >= starIndex - 0.5;

        return (
          <span
            key={i}
            className={`star ${isFull ? 'star-filled' : ''} ${interactive ? 'star-interactive' : ''}`}
            style={{
              fontSize: sizeClass.fontSize,
              position: 'relative',
              cursor: interactive ? 'pointer' : 'default',
            }}
            onMouseMove={(e) => handleMouseMove(e, starIndex)}
            onMouseLeave={() => setHoverRating(0)}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const isHalfClick = e.clientX - rect.left < rect.width / 2;
              handleClick(starIndex, isHalfClick);
            }}
          >
            {isHalf ? (
              <span style={{ position: 'relative', display: 'inline-block' }}>
                <span style={{ color: 'var(--star-empty)' }}>★</span>
                <span
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    overflow: 'hidden',
                    width: '50%',
                    color: 'var(--star-gold)',
                  }}
                >
                  ★
                </span>
              </span>
            ) : (
              '★'
            )}
          </span>
        );
      })}
      {showValue && rating > 0 && (
        <span
          style={{
            marginLeft: '0.375rem',
            fontSize: 'var(--text-sm)',
            color: 'var(--text-secondary)',
            fontWeight: 600,
          }}
        >
          {rating % 1 === 0 ? rating : rating.toFixed(1)}
        </span>
      )}
    </div>
  );
}
