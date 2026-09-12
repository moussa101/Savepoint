'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import emojiRegex from 'emoji-regex';
import { escapeHtml } from '@/lib/security';
import { appleEmojiUrl, isEmojiOnlyMessage } from '@/lib/apple-emoji';
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

function AppleEmoji({ emoji, large }: { emoji: string; large?: boolean }) {
  return (
    <img
      src={appleEmojiUrl(emoji)}
      alt={emoji}
      className={`apple-emoji${large ? ' is-large' : ''}`}
      loading="lazy"
      decoding="async"
      draggable={false}
      onError={(e) => {
        const img = e.currentTarget;
        img.replaceWith(document.createTextNode(emoji));
      }}
    />
  );
}

/** Render text with Apple/iOS-style emoji images + linkified URLs. */
function renderRichText(text: string, largeEmoji: boolean) {
  const re = emojiRegex();
  const parts: ReactNode[] = [];
  let last = 0;
  let key = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(...linkifySegment(text.slice(last, match.index), key));
      key += 10;
    }
    parts.push(<AppleEmoji key={`e-${key++}`} emoji={match[0]} large={largeEmoji} />);
    last = match.index + match[0].length;
  }
  if (last < text.length) {
    parts.push(...linkifySegment(text.slice(last), key));
  }
  return parts;
}

function linkifySegment(segment: string, keyBase: number): ReactNode[] {
  const escaped = escapeHtml(segment);
  const re = /(https:\/\/[^\s<]+[^.,;:!?\s<>)"'\]])/gi;
  const parts: ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  let key = keyBase;
  const regex = new RegExp(re);
  while ((match = regex.exec(escaped)) !== null) {
    if (match.index > last) parts.push(escaped.slice(last, match.index));
    const href = match[1];
    parts.push(
      <a
        key={`l-${key++}`}
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

  const text =
    payload.type === 'TEXT' && typeof (payload as { text?: unknown }).text === 'string'
      ? (payload as { text: string }).text
      : plain;
  const emojiOnly = isEmojiOnlyMessage(text);

  return (
    <div
      className={`chat-text-content${emojiOnly ? ' is-emoji-only' : ''}`}
      style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
    >
      {renderRichText(text, emojiOnly)}
    </div>
  );
}
