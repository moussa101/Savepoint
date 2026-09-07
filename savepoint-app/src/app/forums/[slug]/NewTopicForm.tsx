'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createTopic } from '@/app/actions/forums';
import { uploadForumImage } from '@/app/actions/upload';

export default function NewTopicForm({ forumId }: { forumId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  async function onFile(file: File | null) {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.set('file', file);
      const result = await uploadForumImage(fd);
      if ('error' in result && result.error) {
        setError(result.error);
      } else if (result.imageUrl) {
        setImageUrls((prev) => [...prev, result.imageUrl!].slice(0, 4));
      }
    } finally {
      setUploading(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    startTransition(async () => {
      const result = await createTopic({ forumId, title, body, imageUrls });
      if ('error' in result) {
        setError(result.error);
        return;
      }
      if (result.slug && result.topicId) {
        router.push(`/forums/${result.slug}/${result.topicId}`);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="card" style={{ padding: 'var(--space-lg)', marginBottom: 'var(--space-xl)' }}>
      <h3 className="font-display" style={{ marginBottom: 'var(--space-md)', fontSize: 'var(--text-lg)' }}>
        Ask a question
      </h3>
      <input
        className="input"
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
        minLength={3}
        maxLength={160}
        style={{ marginBottom: 'var(--space-sm)' }}
      />
      <textarea
        className="input"
        placeholder="Describe the problem. You can include https:// links."
        value={body}
        onChange={(e) => setBody(e.target.value)}
        required
        rows={5}
        maxLength={20000}
        style={{ marginBottom: 'var(--space-sm)', resize: 'vertical' }}
      />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 'var(--space-sm)' }}>
        {imageUrls.map((url) => (
          <div key={url} style={{ position: 'relative' }}>
            <img src={url} alt="" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8 }} />
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ position: 'absolute', top: -6, right: -6, padding: 2 }}
              onClick={() => setImageUrls((prev) => prev.filter((u) => u !== url))}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <label className="btn btn-outline btn-sm" style={{ cursor: 'pointer' }}>
          {uploading ? 'Uploading…' : 'Add image'}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hidden
            disabled={uploading || imageUrls.length >= 4}
            onChange={(e) => onFile(e.target.files?.[0] || null)}
          />
        </label>
        <button type="submit" className="btn btn-primary btn-sm" disabled={pending || uploading}>
          {pending ? 'Posting…' : 'Post topic'}
        </button>
      </div>
      {error && <p style={{ color: '#eb5757', fontSize: 'var(--text-sm)', marginTop: 8 }}>{error}</p>}
    </form>
  );
}
