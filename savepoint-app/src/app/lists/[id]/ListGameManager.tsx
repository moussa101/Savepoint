'use client';

import { useState, useTransition } from 'react';
import { addGameToList } from '@/app/actions/games';
import GameAutocomplete from '@/components/ui/GameAutocomplete';

export default function ListGameManager({ listId, games }: { listId: string; games?: { id: string; name: string }[] }) {
  const [selectedGame, setSelectedGame] = useState('');
  const [isPending, startTransition] = useTransition();

  function handleAdd() {
    if (!selectedGame) return;
    startTransition(async () => {
      await addGameToList(listId, selectedGame);
      setSelectedGame('');
      window.location.reload();
    });
  }

  return (
    <div className="card" style={{ marginTop: 'var(--space-xl)', display: 'flex', gap: 'var(--space-md)', alignItems: 'center' }}>
      <div style={{ flex: 1 }}>
        <GameAutocomplete onSelect={setSelectedGame} placeholder="Search for a game to add..." />
      </div>
      <button className="btn btn-primary" onClick={handleAdd} disabled={!selectedGame || isPending}>
        {isPending ? '...' : '+ Add'}
      </button>
    </div>
  );
}
