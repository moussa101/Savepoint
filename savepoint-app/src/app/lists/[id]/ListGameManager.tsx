'use client';

import { useState, useTransition } from 'react';
import { addGameToList } from '@/app/actions/games';

export default function ListGameManager({ listId, games }: { listId: string; games: { id: string; name: string }[] }) {
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
      <select
        className="input"
        value={selectedGame}
        onChange={(e) => setSelectedGame(e.target.value)}
        style={{ flex: 1 }}
      >
        <option value="">Add a game to this list...</option>
        {games.map((game) => (
          <option key={game.id} value={game.id}>{game.name}</option>
        ))}
      </select>
      <button className="btn btn-primary" onClick={handleAdd} disabled={!selectedGame || isPending}>
        {isPending ? '...' : '+ Add'}
      </button>
    </div>
  );
}
