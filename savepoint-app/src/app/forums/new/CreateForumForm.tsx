'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createForum } from '@/app/actions/forums';

export default function CreateForumForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    startTransition(async () => {
      const result = await createForum({ name, description });
      if ('error' in result) {
        setError(result.error);
        return;
      }
      if (result.slug) router.push(`/forums/${result.slug}`);
    });
  }

  return (
    <form onSubmit={onSubmit} className="card" style={{ padding: 'var(--space-xl)', maxWidth: 640 }}>
      <label style={{ display: 'block', marginBottom: 'var(--space-md)' }}>
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>Name</span>
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={3}
          maxLength={80}
          placeholder="e.g. Elden Ring help"
          style={{ marginTop: 6 }}
        />
      </label>
      <label style={{ display: 'block', marginBottom: 'var(--space-md)' }}>
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>Description</span>
        <textarea
          className="input"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={2000}
          rows={4}
          placeholder="What is this community for?"
          style={{ marginTop: 6, resize: 'vertical' }}
        />
      </label>
      {error && (
        <p style={{ color: '#eb5757', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-md)' }}>
          {error}
        </p>
      )}
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? 'Creating…' : 'Create forum'}
      </button>
    </form>
  );
}
