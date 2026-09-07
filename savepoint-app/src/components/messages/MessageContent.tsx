'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { escapeHtml } from '@/lib/security';
import UserAvatar from '@/components/ui/UserAvatar';

export type RichPayload =
  | { type: 'TEXT'; text: string }
  | { type: 'IMAGE'; url: string }
  | { type: 'GIF'; url: string; previewUrl?: string; tenorId?: string }
  | { type: 'LINK'; url: string }
  | { type: 'PROFILE_SHARE'; userId: string; username: string; name?: string | null; image?: string | null }
  | { type: string; [key: string]: unknown };

export function parseMessagePayload(plain: string): RichPayload {
  const trimmed = plain.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const obj = JSON.parse(trimmed) as RichPayload;
      if (obj && typeof obj === 'object' && typeof obj.type === 'string') return obj;
    } catch {
      /* plain text */
    }
  }
  return { type: 'TEXT', text: plain };
}

function linkify(text: string) {
  const escaped = escapeHtml(text);
  const re = /(https:\/\/[^\s<]+[^.,;:!?\s<>)"'\]])/gi;
  const parts: ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  const regex = new RegExp(re);
  while ((match = regex.exec(escaped)) !== null) {
    if (match.index > last) parts.push(escaped.slice(last, match.index));
    const href = match[1];
    parts.push(
      <a
        key={key++}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: 'var(--accent-primary)', wordBreak: 'break-all' }}
      >
        {href}
      </a>
    );
    last = match.index + match[0].length;
  }
  if (last < escaped.length) parts.push(escaped.slice(last));
  return parts;
}

export function MessageContent({ plain }: { plain: string }) {
  const payload = parseMessagePayload(plain);

  if (payload.type === 'IMAGE' && typeof payload.url === 'string') {
    return (
      <a href={payload.url} target="_blank" rel="noopener noreferrer">
        <img
          src={payload.url}
          alt=""
          style={{ maxWidth: 'min(280px, 70vw)', maxHeight: 320, borderRadius: 10, display: 'block' }}
        />
      </a>
    );
  }

  if (payload.type === 'GIF' && typeof payload.url === 'string') {
    const src =
      (typeof payload.previewUrl === 'string' && payload.previewUrl) || payload.url;
    // Prefer the main url for playback, but fall back if needed
    const play = payload.url || src;
    return (
      <img
        src={play}
        alt="GIF"
        loading="lazy"
        decoding="async"
        style={{
          maxWidth: 'min(240px, 70vw)',
          maxHeight: 220,
          borderRadius: 10,
          display: 'block',
          background: 'rgba(255,255,255,0.04)',
        }}
      />
    );
  }

  if (payload.type === 'LINK' && typeof payload.url === 'string') {
    return (
      <a href={payload.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)' }}>
        {payload.url}
      </a>
    );
  }

  if (payload.type === 'PROFILE_SHARE' && typeof payload.username === 'string') {
    return (
      <Link
        href={`/profile/${payload.username}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          textDecoration: 'none',
          color: 'inherit',
          padding: 8,
          borderRadius: 10,
          background: 'rgba(255,255,255,0.04)',
        }}
      >
        <UserAvatar
          className="avatar"
          style={{ width: 40, height: 40 }}
          src={(payload.image as string | null) || null}
          name={(payload.name as string | null) || null}
          username={payload.username}
        />
        <div>
          <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>
            {(payload.name as string) || payload.username}
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>@{payload.username}</div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--accent-primary)', marginTop: 2 }}>
            View profile
          </div>
        </div>
      </Link>
    );
  }

  const text = payload.type === 'TEXT' && typeof (payload as { text?: unknown }).text === 'string'
    ? (payload as { text: string }).text
    : plain;
  return (
    <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{linkify(text)}</div>
  );
}
