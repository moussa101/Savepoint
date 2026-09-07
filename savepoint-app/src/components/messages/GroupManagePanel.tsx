'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  addGroupMembers,
  getPublicKeysForUsers,
  leaveGroup,
  listFriendsForShare,
  removeGroupMember,
  updateGroupInfo,
} from '@/app/actions/messages';
import { uploadChatImage } from '@/app/actions/upload';
import {
  ensureLocalKeyPair,
  exportGroupKeyRawB64,
  wrapGroupKeyForPeer,
} from '@/lib/e2e-crypto';
import UserAvatar from '@/components/ui/UserAvatar';

type Member = {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
  role?: string;
  e2ePublicKey?: string | null;
};

type Friend = {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
};

export default function GroupManagePanel({
  conversationId,
  groupName,
  groupImageUrl,
  members,
  myUserId,
  myRole,
  groupKey,
  onClose,
}: {
  conversationId: string;
  groupName: string;
  groupImageUrl: string | null;
  members: Member[];
  myUserId: string;
  myRole: string | null;
  groupKey: CryptoKey | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const canAdmin = myRole === 'OWNER' || myRole === 'ADMIN';
  const [name, setName] = useState(groupName);
  const [imageUrl, setImageUrl] = useState(groupImageUrl);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [addIds, setAddIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!canAdmin) return;
    listFriendsForShare().then((list) => {
      const memberSet = new Set(members.map((m) => m.id));
      setFriends((list as Friend[]).filter((f) => !memberSet.has(f.id)));
    });
  }, [canAdmin, members]);

  async function onPhoto(file: File | null) {
    if (!file || !canAdmin) return;
    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.set('file', file);
      const uploaded = await uploadChatImage(fd);
      if ('error' in uploaded && uploaded.error) {
        setError(uploaded.error);
        return;
      }
      if (!uploaded.imageUrl) return;
      const result = await updateGroupInfo({
        conversationId,
        imageUrl: uploaded.imageUrl,
      });
      if ('error' in result && result.error) {
        setError(result.error);
        return;
      }
      setImageUrl(uploaded.imageUrl);
      setMessage('Group photo updated');
      router.refresh();
    } finally {
      setUploading(false);
    }
  }

  function saveName() {
    if (!canAdmin) return;
    setError('');
    startTransition(async () => {
      const result = await updateGroupInfo({ conversationId, name });
      if ('error' in result && result.error) setError(result.error);
      else {
        setMessage('Group renamed');
        router.refresh();
      }
    });
  }

  function removeMember(memberUserId: string) {
    setError('');
    startTransition(async () => {
      const result = await removeGroupMember(conversationId, memberUserId);
      if ('error' in result && result.error) setError(result.error);
      else {
        setMessage('Member removed');
        router.refresh();
      }
    });
  }

  function doLeave() {
    setError('');
    startTransition(async () => {
      const result = await leaveGroup(conversationId);
      if ('error' in result && result.error) setError(result.error);
      else router.push('/messages');
    });
  }

  function addSelected() {
    if (!canAdmin || !groupKey || addIds.size === 0) {
      setError(!groupKey ? 'Group key not ready' : 'Select friends to add');
      return;
    }
    setError('');
    startTransition(async () => {
      try {
        const { publicKeyB64, pair } = await ensureLocalKeyPair();
        const ids = Array.from(addIds);
        const keyRows = await getPublicKeysForUsers(ids);
        const keyMap = new Map(keyRows.map((u) => [u.id, u.e2ePublicKey]));
        for (const id of ids) {
          if (!keyMap.get(id)) {
            const f = friends.find((x) => x.id === id);
            setError(`@${f?.username || id} must open Messages once first`);
            return;
          }
        }
        const raw = await exportGroupKeyRawB64(groupKey);
        const wraps = [];
        for (const id of ids) {
          wraps.push({
            userId: id,
            wrappedKey: await wrapGroupKeyForPeer(raw, pair.privateKey, publicKeyB64, keyMap.get(id)!),
          });
        }
        const result = await addGroupMembers({
          conversationId,
          memberIds: ids,
          wraps,
        });
        if ('error' in result && result.error) {
          setError(result.error);
          return;
        }
        setAddIds(new Set());
        setMessage('Members added');
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to add members');
      }
    });
  }

  return (
    <div
      className="card"
      style={{
        position: 'absolute',
        top: '100%',
        right: 0,
        marginTop: 8,
        width: 'min(360px, 92vw)',
        maxHeight: 'min(70vh, 520px)',
        overflowY: 'auto',
        padding: 14,
        zIndex: 50,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <strong>Group info</strong>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
          Close
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div className="avatar" style={{ width: 56, height: 56, overflow: 'hidden', borderRadius: '50%' }}>
          {imageUrl ? (
            <img src={imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            (name || 'G').charAt(0).toUpperCase()
          )}
        </div>
        {canAdmin && (
          <label className="btn btn-outline btn-sm" style={{ cursor: 'pointer' }}>
            {uploading ? 'Uploading…' : 'Change photo'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              hidden
              disabled={uploading || pending}
              onChange={(e) => onPhoto(e.target.files?.[0] || null)}
            />
          </label>
        )}
      </div>

      {canAdmin ? (
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} style={{ flex: 1 }} />
          <button type="button" className="btn btn-primary btn-sm" disabled={pending} onClick={saveName}>
            Rename
          </button>
        </div>
      ) : (
        <p style={{ fontWeight: 600, marginBottom: 14 }}>{groupName}</p>
      )}

      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 6 }}>
        Members ({members.length})
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
        {members.map((m) => (
          <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <UserAvatar className="avatar" style={{ width: 28, height: 28 }} src={m.image} name={m.name} username={m.username} />
            <div style={{ flex: 1, minWidth: 0, fontSize: 'var(--text-sm)' }}>
              @{m.username}
              <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>{m.role}</span>
            </div>
            {canAdmin && m.id !== myUserId && m.role !== 'OWNER' && (
              <button type="button" className="btn btn-ghost btn-sm" style={{ color: '#eb5757' }} disabled={pending} onClick={() => removeMember(m.id)}>
                Remove
              </button>
            )}
          </div>
        ))}
      </div>

      {canAdmin && friends.length > 0 && (
        <>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 6 }}>Add friends</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 140, overflowY: 'auto', marginBottom: 8 }}>
            {friends.map((f) => (
              <label key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--text-sm)' }}>
                <input
                  type="checkbox"
                  checked={addIds.has(f.id)}
                  onChange={() => {
                    setAddIds((prev) => {
                      const next = new Set(prev);
                      if (next.has(f.id)) next.delete(f.id);
                      else next.add(f.id);
                      return next;
                    });
                  }}
                />
                @{f.username}
              </label>
            ))}
          </div>
          <button type="button" className="btn btn-primary btn-sm" disabled={pending || addIds.size === 0} onClick={addSelected} style={{ marginBottom: 10 }}>
            Add selected
          </button>
        </>
      )}

      <button type="button" className="btn btn-outline btn-sm" style={{ width: '100%', color: '#eb5757' }} disabled={pending} onClick={doLeave}>
        Leave group
      </button>

      {message && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--accent-primary)', marginTop: 8 }}>{message}</p>}
      {error && <p style={{ fontSize: 'var(--text-xs)', color: '#eb5757', marginTop: 8 }}>{error}</p>}
    </div>
  );
}
