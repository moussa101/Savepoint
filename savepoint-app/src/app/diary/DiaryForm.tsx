'use client';

import { useState, useTransition } from 'react';
import StarRating from '@/components/ui/StarRating';
import { createDiaryEntry } from '@/app/actions/games';
import GameAutocomplete from '@/components/ui/GameAutocomplete';

interface DiaryFormProps {
  games?: { id: string; name: string }[]; // Optional now since we fetch live
}

export default function DiaryForm({ games = [] }: DiaryFormProps) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [selectedGameId, setSelectedGameId] = useState('');
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    if (rating > 0) formData.set('rating', rating.toString());

    startTransition(async () => {
      const result = await createDiaryEntry(formData);
      if (result.success) {
        setOpen(false);
        setRating(0);
        window.location.reload();
      }
    });
  }

  return (
    <>
      <button className="btn btn-primary" onClick={() => setOpen(true)}>
        📝 Log Game
      </button>

      {open && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="modal animate-slide-up">
            <div className="modal-header">
              <h2 className="font-display" style={{ fontWeight: 700 }}>Log Game</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Game</label>
                  <input type="hidden" name="gameId" value={selectedGameId} required />
                  <GameAutocomplete onSelect={setSelectedGameId} placeholder="Search IGDB for a game..." />
                </div>
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input type="date" name="date" className="input" required defaultValue={new Date().toISOString().split('T')[0]} />
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select name="status" className="input">
                    <option value="">No status change</option>
                    <option value="PLAYING">Playing</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="WANT_TO_PLAY">Want to Play</option>
                    <option value="DROPPED">Dropped</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Rating (optional)</label>
                  <StarRating rating={rating} size="lg" interactive onRate={setRating} />
                </div>
                <div className="form-group">
                  <label className="form-label">Notes (optional)</label>
                  <textarea name="notes" className="textarea" placeholder="How was your session?" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={isPending}>
                  {isPending ? 'Logging...' : 'Log Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
