'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { MessageIcon, XIcon } from '@/components/ui/Icons';
import {
  RELEASE_FORUM_SLUG,
  SITE_UPDATE_ID,
  SITE_VERSION,
  UPDATE_RELEASED_AT,
} from '@/lib/site-version';

const STORAGE_KEY = `savepoint:seen-update:${SITE_UPDATE_ID}`;

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  rot: number;
  vr: number;
  color: string;
  life: number;
};

const COLORS = ['#00e5a0', '#00cc8e', '#5eead4', '#fbbf24', '#f472b6', '#60a5fa', '#ffffff'];

function burstConfetti(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const resize = () => {
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();

  const particles: Particle[] = [];
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight * 0.28;
  for (let i = 0; i < 120; i++) {
    const angle = (Math.PI * 2 * i) / 120 + (Math.random() - 0.5) * 0.4;
    const speed = 4 + Math.random() * 9;
    particles.push({
      x: cx + (Math.random() - 0.5) * 40,
      y: cy + (Math.random() - 0.5) * 20,
      vx: Math.cos(angle) * speed * (0.6 + Math.random()),
      vy: Math.sin(angle) * speed * 0.55 - (2 + Math.random() * 6),
      w: 5 + Math.random() * 6,
      h: 8 + Math.random() * 10,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.35,
      color: COLORS[i % COLORS.length]!,
      life: 1,
    });
  }

  let frame = 0;
  let raf = 0;
  let stopped = false;

  const tick = () => {
    if (stopped) return;
    frame += 1;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    let alive = 0;
    for (const p of particles) {
      p.vy += 0.18;
      p.vx *= 0.995;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      p.life -= 0.008;
      if (p.life <= 0) continue;
      alive += 1;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    if (alive > 0 && frame < 220) {
      raf = requestAnimationFrame(tick);
    } else {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    }
  };

  raf = requestAnimationFrame(tick);
  window.addEventListener('resize', resize);

  return () => {
    stopped = true;
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  };
}

function isExistingUser(createdAt?: string) {
  if (!createdAt) return false;
  const t = new Date(createdAt).getTime();
  if (Number.isNaN(t)) return false;
  return t < UPDATE_RELEASED_AT.getTime();
}

function seenKey(userId: string) {
  return `${STORAGE_KEY}:${userId}`;
}

function UpdateAnnouncementInner() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const openedForUserRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (status === 'loading') return;

    // Guests, admins, and new accounts never see this modal.
    if (status !== 'authenticated' || !session?.user?.id) return;
    if (session.user.isAdmin) return;
    if (!isExistingUser(session.user.createdAt)) return;

    if (pathname?.startsWith('/admin')) return;
    if (pathname?.startsWith('/login') || pathname?.startsWith('/register')) return;
    if (pathname?.startsWith('/onboarding')) return;
    if (pathname?.startsWith('/forgot-password') || pathname?.startsWith('/reset-password')) return;
    if (pathname?.startsWith('/verify')) return;

    const userId = session.user.id;
    try {
      if (localStorage.getItem(seenKey(userId)) === '1') return;
    } catch {
      /* private mode — still allow one in-memory show */
      if (openedForUserRef.current === userId) return;
    }

    // Already scheduled/open for this user in this session
    if (openedForUserRef.current === userId) return;
    openedForUserRef.current = userId;

    const t = window.setTimeout(() => {
      // Persist before paint so a refresh cannot show it again.
      try {
        localStorage.setItem(seenKey(userId), '1');
      } catch {
        /* ignore */
      }
      setOpen(true);
    }, 700);
    return () => window.clearTimeout(t);
  }, [
    pathname,
    session?.user?.id,
    session?.user?.createdAt,
    session?.user?.isAdmin,
    status,
  ]);

  useEffect(() => {
    if (!open || !canvasRef.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    return burstConfetti(canvasRef.current);
  }, [open]);

  function dismiss() {
    const userId = session?.user?.id;
    if (userId) {
      try {
        localStorage.setItem(seenKey(userId), '1');
      } catch {
        /* ignore */
      }
    }
    setOpen(false);
  }

  if (!open) return null;

  const forumHref = `/forums/${RELEASE_FORUM_SLUG}`;

  return (
    <>
      <canvas ref={canvasRef} className="update-confetti" aria-hidden />
      <div className="update-announce-overlay" role="presentation" onClick={dismiss}>
        <div
          className="update-announce-card animate-fade-in-up"
          role="dialog"
          aria-modal="true"
          aria-labelledby="update-announce-title"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="update-announce-close btn btn-ghost btn-icon"
            onClick={dismiss}
            aria-label="Dismiss"
          >
            <XIcon size={18} />
          </button>

          <div className="update-announce-badge">
            <MessageIcon size={16} /> {SITE_VERSION} update
          </div>
          <h2 id="update-announce-title" className="font-display update-announce-title">
            Savepoint {SITE_VERSION} is here
          </h2>
          <p className="update-announce-lead">
            Messaging, PlayStation sync, forums, and safer chats — built for the community that was
            already here.
          </p>

          <ul className="update-announce-list">
            <li>Group chats, GIFs, media, and on-device message cache</li>
            <li>PlayStation Network: library + trophy sync</li>
            <li>Forums with votes, pins, and official Savepoint posts</li>
            <li>Report chats with transcripts — warn or ban from Admin</li>
          </ul>

          <div className="update-announce-actions">
            <Link href={forumHref} className="btn btn-primary" onClick={dismiss}>
              Read full notes
            </Link>
            <Link href="/messages" className="btn btn-secondary" onClick={dismiss}>
              Open Messages
            </Link>
            <button type="button" className="btn btn-ghost" onClick={dismiss}>
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/** Uses the root SessionProvider from app/layout.tsx. */
export default function UpdateAnnouncement() {
  return <UpdateAnnouncementInner />;
}
