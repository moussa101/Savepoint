'use client';

import { useCallback, useEffect, useRef, useState, useTransition, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import StarRating from '@/components/ui/StarRating';
import {
  CheckCircleIcon,
  GamepadIcon,
  PinIcon,
  XCircleIcon,
} from '@/components/ui/Icons';
import { addToLibrary } from '@/app/actions/games';
import { STATUS_LABELS, type GameStatus } from '@/lib/utils';
import { formatPlaytimeHours } from '@/lib/playtime';

const HOLD_MS = 420;

const STATUS_OPTIONS: {
  value: GameStatus;
  label: string;
  icon: ReactNode;
}[] = [
  { value: 'PLAYING', label: STATUS_LABELS.PLAYING, icon: <GamepadIcon size={16} /> },
  { value: 'WANT_TO_PLAY', label: STATUS_LABELS.WANT_TO_PLAY, icon: <PinIcon size={16} /> },
  { value: 'COMPLETED', label: STATUS_LABELS.COMPLETED, icon: <CheckCircleIcon size={16} /> },
  { value: 'DROPPED', label: STATUS_LABELS.DROPPED, icon: <XCircleIcon size={16} /> },
];

type Props = {
  gameId: string;
  slug: string;
  name: string;
  coverImage: string | null;
  status: GameStatus;
  rating: number | null;
  playtimeMinutes: number | null;
  avgPlaytimeMinutes: number | null;
  playtimeSampleCount: number;
  source: string | null;
};

export default function LibraryGameCard({
  gameId,
  slug,
  name,
  coverImage,
  status,
  rating,
  playtimeMinutes,
  avgPlaytimeMinutes,
  playtimeSampleCount,
  source,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [currentStatus, setCurrentStatus] = useState(status);
  const holdTimer = useRef<number | null>(null);
  const suppressNav = useRef(false);

  useEffect(() => {
    setCurrentStatus(status);
  }, [status]);

  const clearHold = useCallback(() => {
    if (holdTimer.current != null) {
      window.clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  }, []);

  useEffect(() => () => clearHold(), [clearHold]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !pending) setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, pending]);

  function startHold(e: React.PointerEvent) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    clearHold();
    holdTimer.current = window.setTimeout(() => {
      suppressNav.current = true;
      setOpen(true);
      setError('');
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate?.(12);
        } catch {
          /* ignore */
        }
      }
    }, HOLD_MS);
  }

  function endHold() {
    clearHold();
  }

  function onNavigateClick(e: React.MouseEvent) {
    if (suppressNav.current) {
      e.preventDefault();
      suppressNav.current = false;
    }
  }

  function openSheet(e?: React.SyntheticEvent) {
    e?.preventDefault();
    e?.stopPropagation();
    clearHold();
    setOpen(true);
    setError('');
  }

  function setStatus(next: GameStatus) {
    if (next === currentStatus) {
      setOpen(false);
      return;
    }
    setError('');
    const prev = currentStatus;
    setCurrentStatus(next);
    startTransition(async () => {
      const result = await addToLibrary(gameId, next);
      if (result?.error) {
        setCurrentStatus(prev);
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  const yours = formatPlaytimeHours(playtimeMinutes);
  const avg = formatPlaytimeHours(avgPlaytimeMinutes);

  return (
    <>
      <div className="library-game-card">
        <div
          className="library-game-cover-wrap"
          onPointerDown={startHold}
          onPointerUp={endHold}
          onPointerCancel={endHold}
          onPointerLeave={endHold}
          onContextMenu={openSheet}
        >
          <Link
            href={`/games/${slug}`}
            className="library-game-cover-link"
            onClick={onNavigateClick}
            draggable={false}
          >
            <div className="game-cover">
              {coverImage ? (
                <img src={coverImage} alt={name} loading="lazy" decoding="async" draggable={false} />
              ) : (
                <div style={{ width: '100%', height: '100%', background: 'var(--bg-surface-hover)' }} />
              )}
            </div>
          </Link>
          <button
            type="button"
            className="library-game-status-btn"
            aria-label={`Change status for ${name}`}
            title="Change status"
            onClick={openSheet}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <span aria-hidden="true">···</span>
          </button>
        </div>

        <Link
          href={`/games/${slug}`}
          className="landing-game-info library-game-info-link"
          onClick={onNavigateClick}
        >
          <div className="landing-game-title">{name}</div>
          {rating != null && rating > 0 && <StarRating rating={rating} size="sm" />}
          <div className="library-game-meta">
            {yours && <span>You {yours}</span>}
            {avg && playtimeSampleCount > 0 && <span>Avg {avg}</span>}
            {source === 'STEAM' && <span className="pill">Steam</span>}
            {source === 'XBOX' && <span className="pill">Xbox</span>}
            {source === 'PSN' && <span className="pill">PSN</span>}
          </div>
        </Link>
      </div>

      {open && (
        <div
          className="library-status-sheet-root"
          role="dialog"
          aria-modal="true"
          aria-label={`Set status for ${name}`}
          onClick={() => !pending && setOpen(false)}
        >
          <div
            className="library-status-sheet card animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="library-status-sheet-header">
              <strong className="font-display">{name}</strong>
              <p className="library-status-sheet-hint">Hold the cover to change status</p>
            </div>
            <div className="library-status-options">
              {STATUS_OPTIONS.map((opt) => {
                const active = opt.value === currentStatus;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    className={`btn btn-sm library-status-option ${active ? 'is-active' : 'btn-secondary'}`}
                    disabled={pending}
                    onClick={() => setStatus(opt.value)}
                  >
                    {opt.icon}
                    {opt.label}
                    {active ? ' · Current' : ''}
                  </button>
                );
              })}
            </div>
            {error ? (
              <p className="library-status-error" role="alert">
                {error}
              </p>
            ) : null}
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ width: '100%', marginTop: 'var(--space-sm)' }}
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}
