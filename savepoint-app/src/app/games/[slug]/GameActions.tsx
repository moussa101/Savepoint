'use client';

import { useState, useTransition } from 'react';
import StarRating from '@/components/ui/StarRating';
import {
  addToLibrary,
  removeFromLibrary,
  rateGame,
  toggleFavoriteGame,
  toggleReleaseNotify,
} from '@/app/actions/games';
import { PinIcon, GamepadIcon, CheckCircleIcon, XCircleIcon, TrashIcon, HeartIcon, BellIcon } from '@/components/ui/Icons';
import { ReactNode } from 'react';

const ALL_STATUSES: { value: string; label: string; icon: ReactNode }[] = [
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
  isUnreleased?: boolean;
  isWatchingRelease?: boolean;
}

export default function GameActions({
  gameId,
  currentStatus,
  currentRating,
  isFavorited: initialIsFavorited,
  isLoggedIn,
  isUnreleased = false,
  isWatchingRelease: initialWatching = false,
}: GameActionsProps) {
  const [status, setStatus] = useState(currentStatus);
  const [rating, setRating] = useState(currentRating || 0);
  const [isFavorited, setIsFavorited] = useState(initialIsFavorited);
  const [watching, setWatching] = useState(initialWatching);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const statuses = isUnreleased
    ? ALL_STATUSES.filter((s) => s.value === 'WANT_TO_PLAY')
    : ALL_STATUSES;

  function handleStatusChange(newStatus: string) {
    setStatus(newStatus);
    setDropdownOpen(false);
    setMessage(null);
    startTransition(async () => {
      const result = await addToLibrary(gameId, newStatus);
      if (result?.error) {
        setStatus(currentStatus);
        setMessage(result.error);
      }
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
    if (isUnreleased) return;
    setRating(newRating);
    setMessage(null);
    startTransition(async () => {
      const result = await rateGame(gameId, newRating);
      if (result?.error) {
        setRating(currentRating || 0);
        setMessage(result.error);
      }
    });
  }

  function handleFavoriteToggle() {
    setIsFavorited(!isFavorited);
    toggleFavoriteGame(gameId).then((res) => {
      if (res?.error) {
        setIsFavorited(isFavorited);
        alert(res.error);
      }
    }).catch((err) => {
      console.error(err);
      setIsFavorited(isFavorited);
    });
  }

  function handleNotifyToggle() {
    const next = !watching;
    setWatching(next);
    setMessage(null);
    startTransition(async () => {
      const result = await toggleReleaseNotify(gameId);
      if (result?.error) {
        setWatching(!next);
        setMessage(result.error);
        return;
      }
      if (typeof result.watching === 'boolean') setWatching(result.watching);
    });
  }

  if (!isLoggedIn) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', alignItems: 'center' }}>
        <a href="/login" className="btn btn-primary">Sign in to track</a>
      </div>
    );
  }

  const currentStatusObj = ALL_STATUSES.find((s) => s.value === status);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)', alignItems: 'center', width: '100%', maxWidth: '280px' }}>
      {isUnreleased ? (
        <div style={{ textAlign: 'center', maxWidth: 260 }}>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-sm)' }}>
            Not released yet — ratings open on launch. Wishlist it or get notified.
          </div>
          <button
            type="button"
            className={`btn ${watching ? 'btn-secondary' : 'btn-primary'} btn-sm`}
            onClick={handleNotifyToggle}
            disabled={isPending}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <BellIcon size={16} />
            {watching ? 'Notifications on' : 'Notify on release'}
          </button>
        </div>
      ) : (
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
              onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.90)')}
              onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              <HeartIcon size={24} filled={isFavorited} />
            </button>
          </div>
        </div>
      )}

      {/* Status Dropdown */}
      <div className={`dropdown ${dropdownOpen ? 'dropdown-open' : ''}`} style={{ width: '100%' }}>
        <button
          className={`btn ${status ? 'btn-secondary' : 'btn-primary'}`}
          style={{ width: '100%' }}
          onClick={() => setDropdownOpen(!dropdownOpen)}
          disabled={isPending}
        >
          {isPending
            ? '...'
            : currentStatusObj
              ? <>{currentStatusObj.icon} {isUnreleased && status === 'WANT_TO_PLAY' ? 'Wishlisted' : currentStatusObj.label}</>
              : isUnreleased
                ? '+ Add to Wishlist'
                : '+ Add to Library'}
        </button>
        <div className="dropdown-menu" style={{ width: '100%', left: 0, right: 0 }}>
          {statuses.map((s) => (
            <button
              key={s.value}
              className="dropdown-item"
              onClick={() => handleStatusChange(s.value)}
              style={{ fontWeight: s.value === status ? 700 : 400, color: s.value === status ? 'var(--accent-primary)' : undefined }}
            >
              {s.icon} {isUnreleased && s.value === 'WANT_TO_PLAY' ? 'Wishlist' : s.label}
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

      {isUnreleased && (
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={handleFavoriteToggle}
          style={{ color: isFavorited ? 'var(--accent-primary)' : 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <HeartIcon size={16} filled={isFavorited} /> {isFavorited ? 'Favorited' : 'Favorite'}
        </button>
      )}

      {message && (
        <p role="status" style={{ fontSize: 'var(--text-xs)', color: 'var(--danger)', textAlign: 'center', margin: 0 }}>
          {message}
        </p>
      )}
    </div>
  );
}
