import { escapeHtml } from '@/lib/security';
import type { ReactNode } from 'react';

const URL_RE = /(https:\/\/[^\s<]+[^.,;:!?\s<>)"'\]])/gi;

/** Escape HTML and turn https URLs into safe links. No raw HTML. */
export default function ForumBody({ text }: { text: string }) {
  const escaped = escapeHtml(text);
  const parts: ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  const re = new RegExp(URL_RE);
  let key = 0;
  while ((match = re.exec(escaped)) !== null) {
    if (match.index > last) {
      parts.push(escaped.slice(last, match.index));
    }
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
  if (last < escaped.length) {
    parts.push(escaped.slice(last));
  }

  return (
    <div
      style={{
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        color: 'var(--text-secondary)',
        lineHeight: 1.6,
        fontSize: 'var(--text-sm)',
      }}
    >
      {parts}
    </div>
  );
}
