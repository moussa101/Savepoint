'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateList, deleteList } from '@/app/actions/games';
import { EditIcon, TrashIcon, XIcon } from '@/components/ui/Icons';

interface ListControlsProps {
  list: {
    id: string;
    title: string;
    description: string | null;
    visibility: string;
  };
}

export default function ListControls({ list }: ListControlsProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateList(list.id, formData);
      if (result.success) {
        setOpen(false);
        router.refresh();
      } else if (result.error) {
        alert(result.error);
      }
    });
  }

  function handleDelete() {
    if (!confirm('Delete this list permanently?')) return;
    startTransition(async () => {
      const result = await deleteList(list.id);
      if (result.success) {
        router.push('/lists');
      } else if (result.error) {
        alert(result.error);
      }
    });
  }

  return (
    <>
      <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
        <button className="btn btn-secondary btn-sm" onClick={() => setOpen(true)} disabled={isPending}>
          <EditIcon size={14} /> Edit
        </button>
        <button className="btn btn-ghost btn-sm" onClick={handleDelete} disabled={isPending} style={{ color: 'var(--danger)' }}>
          <TrashIcon size={14} /> Delete
        </button>
      </div>

      {open && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="modal animate-slide-up">
            <div className="modal-header">
              <h2 className="font-display" style={{ fontWeight: 700 }}>Edit List</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setOpen(false)}><XIcon size={18} /></button>
            </div>
            <form onSubmit={handleUpdate}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Title</label>
                  <input type="text" name="title" className="input" defaultValue={list.title} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea name="description" className="textarea" defaultValue={list.description || ''} style={{ minHeight: '80px' }} />
                </div>
                <div className="form-group">
                  <label className="form-label">Visibility</label>
                  <select name="visibility" className="input" defaultValue={list.visibility}>
                    <option value="PUBLIC">Public</option>
                    <option value="PRIVATE">Private</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={isPending}>
                  {isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
