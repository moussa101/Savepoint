'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  createGroupChat,
  getPublicKeysForUsers,
  listFriendsForShare,
  publishE2EPublicKey,
} from '@/app/actions/messages';
import { uploadChatImage } from '@/app/actions/upload';
import {
  ensureLocalKeyPair,
  exportGroupKeyRawB64,
  generateGroupAesKey,
  wrapGroupKeyForPeer,
} from '@/lib/e2e-crypto';
import UserAvatar from '@/components/ui/UserAvatar';

type Friend = {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
  e2ePublicKey: string | null;
};

export default function NewGroupForm() {
  const router = useRouter();
  const { data: session } = useSession();
  const myUserId = session?.user?.id;
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [name, setName] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    (async () => {
      const list = await listFriendsForShare();
      setFriends(list as Friend[]);
      try {
        const { publicKeyB64 } = await ensureLocalKeyPair();
        await publishE2EPublicKey(publicKeyB64);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function onImage(file: File | null) {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.set('file', file);
      const result = await uploadChatImage(fd);
      if ('error' in result && result.error) setError(result.error);
      else if (result.imageUrl) setImageUrl(result.imageUrl);
    } finally {
      setUploading(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!myUserId) {
      setError('Not signed in');
      return;
    }
    setError('');
    startTransition(async () => {
      try {
        const { publicKeyB64, pair } = await ensureLocalKeyPair();
        await publishE2EPublicKey(publicKeyB64);

        const memberIds = Array.from(selected);
        if (memberIds.length < 1) {
          setError('Select at least one friend');
          return;
        }

        const allIds = Array.from(new Set([myUserId, ...memberIds]));
        const keyRows = await getPublicKeysForUsers(allIds);
        const keyMap = new Map(keyRows.map((u) => [u.id, u.e2ePublicKey]));
        keyMap.set(myUserId, publicKeyB64);

        for (const id of allIds) {
          if (!keyMap.get(id)) {
            const u = friends.find((f) => f.id === id);
            setError(
              `@${u?.username || 'A member'} needs to open Messages once before joining a group.`
            );
            return;
          }
        }

        const groupKey = await generateGroupAesKey();
        const raw = await exportGroupKeyRawB64(groupKey);
        const wraps: { userId: string; wrappedKey: string }[] = [];
        for (const id of allIds) {
          const theirPub = keyMap.get(id)!;
          const wrappedKey = await wrapGroupKeyForPeer(raw, pair.privateKey, publicKeyB64, theirPub);
          wraps.push({ userId: id, wrappedKey });
        }

        const result = await createGroupChat({
          name,
          imageUrl,
          memberIds,
          wraps,
        });
        if ('error' in result && result.error) {
          setError(result.error);
          return;
        }
        if (result.conversationId) router.push(`/messages/${result.conversationId}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create group');
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="card" style={{ padding: 'var(--space-xl)', maxWidth: 560 }}>
      <label style={{ display: 'block', marginBottom: 12 }}>
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>Group name</span>
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={2}
          maxLength={60}
          style={{ marginTop: 6 }}
          placeholder="Weekend raid squad"
        />
      </label>

      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div className="avatar" style={{ width: 56, height: 56, overflow: 'hidden', borderRadius: '50%' }}>
          {imageUrl ? (
            <img src={imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            (name || 'G').charAt(0).toUpperCase()
          )}
        </div>
        <label className="btn btn-outline btn-sm" style={{ cursor: 'pointer' }}>
          {uploading ? 'Uploading…' : 'Group photo'}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            hidden
            disabled={uploading}
            onChange={(e) => onImage(e.target.files?.[0] || null)}
          />
        </label>
      </div>

      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 8 }}>Add friends</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 280, overflowY: 'auto', marginBottom: 16 }}>
        {friends.map((f) => (
          <label
            key={f.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: 8,
              borderRadius: 8,
              background: selected.has(f.id) ? 'rgba(0,229,160,0.08)' : 'transparent',
              cursor: 'pointer',
            }}
          >
            <input type="checkbox" checked={selected.has(f.id)} onChange={() => toggle(f.id)} />
            <UserAvatar className="avatar" style={{ width: 32, height: 32 }} src={f.image} name={f.name} username={f.username} />
            <span style={{ fontSize: 'var(--text-sm)' }}>
              {f.name || f.username} <span style={{ color: 'var(--text-muted)' }}>@{f.username}</span>
            </span>
          </label>
        ))}
        {friends.length === 0 && (
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>No friends yet.</p>
        )}
      </div>

      {error && <p style={{ color: '#eb5757', fontSize: 'var(--text-sm)', marginBottom: 12 }}>{error}</p>}
      <button type="submit" className="btn btn-primary" disabled={pending || uploading || !myUserId}>
        {pending ? 'Creating…' : 'Create group'}
      </button>
    </form>
  );
}
