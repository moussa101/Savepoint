'use client';

import { useState } from 'react';
import Link from 'next/link';
import { TrashIcon, ShieldIcon } from '@/components/ui/Icons';
import { removeReview, banUser } from '@/app/actions/admin';
import { formatRelativeTime } from '@/lib/utils';

type Review = any; // simplified for this component

export default function ReviewModerationList({ reviews }: { reviews: Review[] }) {
  const [loading, setLoading] = useState<string | null>(null);
  
  // Modal states
  const [modalType, setModalType] = useState<'remove' | 'ban' | null>(null);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [category, setCategory] = useState('Spam or Self-Promotion');
  const [reason, setReason] = useState('');
  const [banIp, setBanIp] = useState(true);

  function openModal(type: 'remove' | 'ban', item: any) {
    setModalType(type);
    setSelectedItem(item);
    setCategory('Spam or Self-Promotion');
    setReason('');
  }

  function closeModal() {
    setModalType(null);
    setSelectedItem(null);
  }

  async function handleRemoveSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedItem) return;
    
    setLoading(selectedItem.id);
    await removeReview(selectedItem.id, category, reason);
    setLoading(null);
    closeModal();
  }

  async function handleBanSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedItem) return;

    setLoading(selectedItem.id);
    await banUser(selectedItem.id, reason || category, banIp);
    setLoading(null);
    closeModal();
  }

  return (
    <>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--text-sm)' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--bg-surface-border)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
              <th style={{ padding: 'var(--space-md) var(--space-lg)', color: 'var(--text-muted)', fontWeight: 500 }}>Review Content</th>
              <th style={{ padding: 'var(--space-md) var(--space-lg)', color: 'var(--text-muted)', fontWeight: 500 }}>User</th>
              <th style={{ padding: 'var(--space-md) var(--space-lg)', color: 'var(--text-muted)', fontWeight: 500 }}>Game</th>
              <th style={{ padding: 'var(--space-md) var(--space-lg)', color: 'var(--text-muted)', fontWeight: 500, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {reviews.map((review) => (
              <tr key={review.id} style={{ borderBottom: '1px solid var(--bg-surface-border)' }}>
                <td style={{ padding: 'var(--space-md) var(--space-lg)', maxWidth: '400px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span key={i} style={{ color: i < review.rating ? 'var(--accent-primary)' : 'var(--bg-surface-border)', fontSize: '12px' }}>★</span>
                    ))}
                    <span style={{ color: 'var(--text-muted)', marginLeft: '8px', fontSize: '11px' }}>
                      {formatRelativeTime(review.createdAt)}
                    </span>
                  </div>
                  <p style={{ margin: 0, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {review.text}
                  </p>
                </td>
                <td style={{ padding: 'var(--space-md) var(--space-lg)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                    <div className="avatar" style={{ width: '24px', height: '24px', fontSize: '0.8rem' }}>
                      {review.user.image ? <img src={review.user.image} alt="" /> : review.user.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600 }}>{review.user.username}</div>
                      {review.user.isBanned && <span style={{ color: '#eb5757', fontSize: '10px', fontWeight: 'bold' }}>BANNED</span>}
                    </div>
                  </div>
                </td>
                <td style={{ padding: 'var(--space-md) var(--space-lg)', color: 'var(--text-secondary)' }}>
                  <Link href={`/games/${review.game.slug}`} target="_blank" style={{ textDecoration: 'underline' }}>
                    {review.game.name}
                  </Link>
                </td>
                <td style={{ padding: 'var(--space-md) var(--space-lg)', textAlign: 'right' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-xs)' }}>
                    <button 
                      className="btn btn-ghost" 
                      onClick={() => openModal('remove', review)}
                      disabled={loading === review.id}
                      style={{ padding: '6px', color: '#f2994a' }}
                      title="Remove Review"
                    >
                      <TrashIcon size={16} />
                    </button>
                    {!review.user.isBanned && !review.user.isAdmin && (
                      <button 
                        className="btn btn-ghost" 
                        onClick={() => openModal('ban', review.user)}
                        disabled={loading === review.user.id}
                        style={{ padding: '6px', color: '#eb5757' }}
                        title="Ban User"
                      >
                        <ShieldIcon size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Moderation Modal */}
      {modalType && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '450px', position: 'relative' }}>
            <button onClick={closeModal} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
               Close
            </button>
            
            <h2 className="font-display" style={{ marginBottom: 'var(--space-md)' }}>
              {modalType === 'remove' ? 'Remove Review' : 'Ban User'}
            </h2>
            
            <form onSubmit={modalType === 'remove' ? handleRemoveSubmit : handleBanSubmit}>
              <div className="form-group" style={{ marginBottom: 'var(--space-md)' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '13px' }}>Category</label>
                <select 
                  className="input" 
                  value={category} 
                  onChange={(e) => setCategory(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option>Spam or Self-Promotion</option>
                  <option>Harassment or Hate Speech</option>
                  <option>Off-Topic / Not a Review</option>
                  <option>Inappropriate Content</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 'var(--space-md)' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                  Additional Reason (Sent in email)
                </label>
                <textarea 
                  className="input" 
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Optional details to include in the automated email..."
                  rows={3}
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>

              {modalType === 'ban' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--space-lg)' }}>
                  <input 
                    type="checkbox" 
                    id="banIp" 
                    checked={banIp} 
                    onChange={(e) => setBanIp(e.target.checked)} 
                  />
                  <label htmlFor="banIp" style={{ color: '#eb5757', fontWeight: 500, fontSize: '14px' }}>
                    Also ban associated IP Address
                  </label>
                </div>
              )}

              <button type="submit" className="btn btn-primary" style={{ width: '100%', backgroundColor: '#eb5757', color: 'white' }}>
                Confirm {modalType === 'remove' ? 'Removal' : 'Ban'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
