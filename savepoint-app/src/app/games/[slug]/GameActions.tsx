'use client';

import { useState, useTransition } from 'react';
import StarRating from '@/components/ui/StarRating';
import { addToLibrary, removeFromLibrary, rateGame, toggleFavoriteGame } from '@/app/actions/games';
import { PinIcon, GamepadIcon, CheckCircleIcon, XCircleIcon, TrashIcon, HeartIcon } from '@/components/ui/Icons';
import { ReactNode } from 'react';

const STATUSES: { value: string; label: string; icon: ReactNode }[] = [
  { value: 'WANT_TO_PLAY', label: 'Want to Play', icon: <PinIcon size={16} /> },
  { value: 'PLAYING', label: 'Playing', icon: <GamepadIcon size={16} /> },
  { value: 'COMPLETED', label: 'Completed', icon: <CheckCircleIcon size={16} /> },
  { value: 'DROPPED', label: 'Dropped', icon: <XCircleIcon size={16} /> },
];

interface GameActionsProps {
  gameId: string;
  currentStatus: string | null;
  currentRating: number | null;
  isFavorited: boolean;
  isLoggedIn: boolean;
}

export default function GameActions({ gameId, currentStatus, currentRating, isFavorited: initialIsFavorited, isLoggedIn }: GameActionsProps) {
  const [status, setStatus] = useState(currentStatus);
  const [rating, setRating] = useState(currentRating || 0);
  const [isFavorited, setIsFavorited] = useState(initialIsFavorited);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleStatusChange(newStatus: string) {
    setStatus(newStatus);
    setDropdownOpen(false);
    startTransition(async () => {
      await addToLibrary(gameId, newStatus);
    });
  }

  function handleRemove() {
    setStatus(null);
    setRating(0);
    setDropdownOpen(false);
    startTransition(async () => {
      await removeFromLibrary(gameId);
    });
  }

  function handleRate(newRating: number) {
    setRating(newRating);
    startTransition(async () => {
      await rateGame(gameId, newRating);
    });
  }

  function handleFavoriteToggle() {
    setIsFavorited(!isFavorited);
    
    // Fire and forget server action - no await, no startTransition blocking
    toggleFavoriteGame(gameId).then((res) => {
      if (res?.error) {
        setIsFavorited(isFavorited); // revert on error
        alert(res.error);
      }
    }).catch((err) => {
      console.error(err);
      setIsFavorited(isFavorited);
    });
  }

  if (!isLoggedIn) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', alignItems: 'center' }}>
        <a href="/login" className="btn btn-primary">Sign in to track</a>
      </div>
    );
  }

  const currentStatusObj = STATUSES.find((s) => s.value === status);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)', alignItems: 'center', minWidth: '200px' }}>
      {/* Rate and Favorite */}
      <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-sm)' }}>
            Rate
          </div>
          <StarRating rating={rating} size="lg" interactive onRate={handleRate} />
        </div>
        
        <div style={{ width: '1px', height: '40px', background: 'var(--bg-surface-border)' }} />

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-sm)' }}>
            Favorite
          </div>
          <button 
            className="btn btn-ghost btn-icon" 
            onClick={handleFavoriteToggle} 
            style={{ 
              color: isFavorited ? 'var(--accent-primary)' : 'var(--text-muted)',
              transition: 'transform 0.1s ease, color 0.2s ease',
              transform: 'scale(1)',
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.90)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <HeartIcon size={24} filled={isFavorited} />
          </button>
        </div>
      </div>

      {/* Status Dropdown */}
      <div className={`dropdown ${dropdownOpen ? 'dropdown-open' : ''}`} style={{ width: '100%' }}>
        <button
          className={`btn ${status ? 'btn-secondary' : 'btn-primary'}`}
          style={{ width: '100%' }}
          onClick={() => setDropdownOpen(!dropdownOpen)}
          disabled={isPending}
        >
          {isPending ? '...' : currentStatusObj ? <>{currentStatusObj.icon} {currentStatusObj.label}</> : '+ Add to Library'}
        </button>
        <div className="dropdown-menu" style={{ width: '100%', left: 0, right: 0 }}>
          {STATUSES.map((s) => (
            <button
              key={s.value}
              className="dropdown-item"
              onClick={() => handleStatusChange(s.value)}
              style={{ fontWeight: s.value === status ? 700 : 400, color: s.value === status ? 'var(--accent-primary)' : undefined }}
            >
              {s.icon} {s.label}
            </button>
          ))}
          {status && (
            <>
              <div style={{ height: '1px', background: 'var(--bg-surface-border)', margin: '4px 0' }} />
              <button className="dropdown-item" onClick={handleRemove} style={{ color: 'var(--danger)' }}>
                <TrashIcon size={16} /> Remove from Library
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
