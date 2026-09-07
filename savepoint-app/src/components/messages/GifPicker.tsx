'use client';

import { useEffect, useState } from 'react';

type GifResult = { id: string; url: string; previewUrl: string };

export default function GifPicker({ onSelect, onClose }: { onSelect: (gif: GifResult) => void; onClose: () => void }) {
  const [q, setQ] = useState('gaming');
  const [results, setResults] = useState<GifResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const t = window.setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/gifs/search?q=${encodeURIComponent(q.trim() || 'gaming')}`, {
          signal: controller.signal,
          cache: 'no-store',
        });
        const data = await res.json();
        if (cancelled) return;
        setResults(data.results || []);
        if (!(data.results || []).length) {
          setError(data.error || (res.status === 401 ? 'Sign in again to search GIFs' : 'No GIFs found'));
        }
      } catch (e) {
        if (cancelled || (e instanceof DOMException && e.name === 'AbortError')) return;
        setError('Could not load GIFs');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(t);
    };
  }, [q]);

  return (
    <div
      className="card"
      style={{
        position: 'absolute',
        bottom: '100%',
        left: 0,
        right: 0,
        marginBottom: 8,
        padding: 12,
        maxHeight: 300,
        overflow: 'hidden',
        zIndex: 30,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          className="input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search GIFs…"
          autoFocus
          style={{ flex: 1 }}
        />
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
          Close
        </button>
      </div>
      {error && (
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: 0 }}>{error}</p>
      )}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 6,
          overflowY: 'auto',
          flex: 1,
          minHeight: 120,
        }}
      >
        {loading &&
          Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              style={{
                height: 72,
                borderRadius: 6,
                background: 'rgba(255,255,255,0.06)',
                animation: 'pulse 1.2s ease-in-out infinite',
              }}
            />
          ))}
        {!loading &&
          results.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => onSelect(g)}
              style={{ padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }}
            >
              <img
                src={g.previewUrl || g.url}
                alt=""
                loading="lazy"
                decoding="async"
                style={{
                  width: '100%',
                  height: 72,
                  objectFit: 'cover',
                  borderRadius: 6,
                  background: 'rgba(255,255,255,0.04)',
                }}
              />
            </button>
          ))}
      </div>
    </div>
  );
}
