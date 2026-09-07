'use client';

import { useEffect, useState } from 'react';

type GifResult = { id: string; url: string; previewUrl: string };

export default function GifPicker({
  onSelect,
  onClose,
}: {
  onSelect: (gif: GifResult) => void;
  onClose: () => void;
}) {
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
    <div className="gif-picker-panel">
      <div className="gif-picker-header">
        <input
          className="input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search GIFs…"
          autoFocus
        />
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
          Close
        </button>
      </div>
      {error && <p className="gif-picker-error">{error}</p>}
      <div className="gif-picker-grid">
        {loading &&
          Array.from({ length: 6 }).map((_, i) => <div key={i} className="gif-picker-skel" />)}
        {!loading &&
          results.map((g) => (
            <button
              key={g.id}
              type="button"
              className="gif-picker-tile"
              onClick={() => onSelect(g)}
              aria-label="Select GIF"
            >
              <img src={g.previewUrl || g.url} alt="" loading="lazy" decoding="async" />
            </button>
          ))}
      </div>
    </div>
  );
}
