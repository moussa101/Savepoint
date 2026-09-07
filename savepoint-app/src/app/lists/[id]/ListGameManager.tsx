'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { addGameToList, removeGameFromList, reorderListItems } from '@/app/actions/games';
import GameAutocomplete from '@/components/ui/GameAutocomplete';

interface ListItemRow {
  id: string;
  gameId: string;
  game: {
    slug: string;
    name: string;
    coverImage: string | null;
    avgRating: number;
    genres: { id: string; genre: string }[];
  };
}

export default function ListGameManager({
  listId,
  items,
}: {
  listId: string;
  items: ListItemRow[];
}) {
  const router = useRouter();
  const [selectedGame, setSelectedGame] = useState('');
  const [orderedItems, setOrderedItems] = useState(items);
  const [isPending, startTransition] = useTransition();

  function handleAdd() {
    if (!selectedGame) return;
    startTransition(async () => {
      await addGameToList(listId, selectedGame);
      setSelectedGame('');
      router.refresh();
    });
  }

  function handleRemove(gameId: string) {
    startTransition(async () => {
      await removeGameFromList(listId, gameId);
      setOrderedItems((prev) => prev.filter((item) => item.gameId !== gameId));
      router.refresh();
    });
  }

  function moveItem(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= orderedItems.length) return;

    const next = [...orderedItems];
    const [moved] = next.splice(index, 1);
    next.splice(nextIndex, 0, moved);
    setOrderedItems(next);

    startTransition(async () => {
      await reorderListItems(listId, next.map((item) => item.gameId));
      router.refresh();
    });
  }

  return (
    <div style={{ marginTop: 'var(--space-xl)' }}>
      {orderedItems.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)' }}>
          <h3 style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', fontWeight: 600 }}>Manage order</h3>
          {orderedItems.map((item, index) => (
            <div key={item.id} className="card list-game-row" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', padding: 'var(--space-sm) var(--space-md)' }}>
              <span style={{ width: 24, textAlign: 'center', color: 'var(--text-muted)', fontWeight: 700 }}>{index + 1}</span>
              <span style={{ flex: 1, minWidth: 0, fontWeight: 600, fontSize: 'var(--text-sm)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.game.name}</span>
              <div className="friend-row-actions" style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => moveItem(index, -1)} disabled={isPending || index === 0}>Up</button>
                <button className="btn btn-ghost btn-sm" onClick={() => moveItem(index, 1)} disabled={isPending || index === orderedItems.length - 1}>Down</button>
                <button className="btn btn-ghost btn-sm" onClick={() => handleRemove(item.gameId)} disabled={isPending} style={{ color: 'var(--danger)' }}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card list-game-row" style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <GameAutocomplete onSelect={setSelectedGame} placeholder="Search for a game to add..." />
        </div>
        <button className="btn btn-primary" onClick={handleAdd} disabled={!selectedGame || isPending} style={{ flexShrink: 0 }}>
          {isPending ? '...' : '+ Add'}
        </button>
      </div>
    </div>
  );
}
