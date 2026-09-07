'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { closeTopic, createReply } from '@/app/actions/forums';
import { uploadForumImage } from '@/app/actions/upload';

export function ReplyForm({
  topicId,
  parentId,
  onDone,
  compact,
}: {
  topicId: string;
  parentId?: string | null;
  onDone?: () => void;
  compact?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
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
      if ('error' in result && result.error) setError(result.error);
      else if (result.imageUrl) setImageUrls((prev) => [...prev, result.imageUrl!].slice(0, 4));
    } finally {
      setUploading(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    startTransition(async () => {
      const result = await createReply({ topicId, body, imageUrls, parentId });
      if ('error' in result) {
        setError(result.error);
        return;
      }
      setBody('');
      setImageUrls([]);
      onDone?.();
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className={compact ? undefined : 'card'}
      style={{
        padding: compact ? 'var(--space-sm) 0' : 'var(--space-lg)',
        marginTop: compact ? 8 : 'var(--space-xl)',
      }}
    >
      {!compact && (
        <h3 className="font-display" style={{ marginBottom: 'var(--space-md)', fontSize: 'var(--text-lg)' }}>
          Your answer
        </h3>
      )}
      <textarea
        className="input"
        placeholder={parentId ? 'Write a reply…' : 'Write a helpful reply. https:// links are supported.'}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        required
        rows={compact ? 3 : 4}
        maxLength={20000}
        style={{ marginBottom: 'var(--space-sm)', resize: 'vertical' }}
      />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 'var(--space-sm)' }}>
        {imageUrls.map((url) => (
          <img key={url} src={url} alt="" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8 }} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
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
          {pending ? 'Posting…' : parentId ? 'Reply' : 'Post reply'}
        </button>
        {compact && onDone && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={onDone}>
            Cancel
          </button>
        )}
      </div>
      {error && <p style={{ color: '#eb5757', fontSize: 'var(--text-sm)', marginTop: 8 }}>{error}</p>}
    </form>
  );
}

export function CloseTopicButton({ topicId }: { topicId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          await closeTopic(topicId);
          router.refresh();
        });
      }}
    >
      Close topic
    </button>
  );
}
