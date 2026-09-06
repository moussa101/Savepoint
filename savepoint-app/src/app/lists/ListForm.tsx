'use client';

import { useState, useTransition } from 'react';
import { createList } from '@/app/actions/games';
import { PlusIcon, XIcon } from '@/components/ui/Icons';

export default function ListForm() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await createList(formData);
      if (result.success) {
        setOpen(false);
        window.location.reload();
      }
    });
  }

  return (
    <>
      <button className="btn btn-primary" onClick={() => setOpen(true)}>
        <PlusIcon size={16} /> Create New List
      </button>

      {open && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="modal animate-slide-up">
            <div className="modal-header">
              <h2 className="font-display" style={{ fontWeight: 700 }}>Create New List</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setOpen(false)}><XIcon size={18} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Title</label>
                  <input type="text" name="title" className="input" placeholder="e.g., My All-Time Favorites" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Description (optional)</label>
                  <textarea name="description" className="textarea" placeholder="What's this list about?" style={{ minHeight: '80px' }} />
                </div>
                <div className="form-group">
                  <label className="form-label">Visibility</label>
                  <select name="visibility" className="input">
                    <option value="PUBLIC">Public</option>
                    <option value="PRIVATE">Private</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={isPending}>
                  {isPending ? 'Creating...' : 'Create List'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
