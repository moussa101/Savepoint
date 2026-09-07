'use client';

import { useEffect, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { createReport } from '@/app/actions/reports';
import { AlertTriangleIcon, XIcon } from '@/components/ui/Icons';

const REASONS = [
  { value: 'SPAM', label: 'Spam' },
  { value: 'HARASSMENT', label: 'Harassment' },
  { value: 'HATE_SPEECH', label: 'Hate speech' },
  { value: 'SEXUAL_CONTENT', label: 'Sexual content' },
  { value: 'COPYRIGHT', label: 'Copyright infringement' },
  { value: 'OTHER', label: 'Other' },
];

interface ReportButtonProps {
  targetType: 'REVIEW' | 'COMMENT' | 'PROFILE' | 'LIST' | 'FORUM' | 'FORUM_TOPIC' | 'FORUM_REPLY' | 'CONVERSATION' | 'MESSAGE';
  targetId: string;
  reportedUserId?: string;
  /** Decrypted transcript (string or lazy builder) for MESSAGE/CONVERSATION reports. */
  chatLog?: string | (() => string);
  label?: string;
}

export default function ReportButton({
  targetType,
  targetId,
  reportedUserId,
  chatLog,
  label = 'Report',
}: ReportButtonProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [reason, setReason] = useState('SPAM');
  const [details, setDetails] = useState('');
  const [message, setMessage] = useState('');
  const [isPending, startTransition] = useTransition();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const log =
        typeof chatLog === 'function' ? chatLog() : typeof chatLog === 'string' ? chatLog : undefined;
      const result = await createReport({
        targetType,
        targetId,
        reason,
        details,
        reportedUserId,
        chatLog: log,
      });
      if (result.success) {
        setMessage('Report submitted. Thanks for helping keep Savepoint safe.');
        setTimeout(() => {
          setOpen(false);
          setMessage('');
          setDetails('');
        }, 1200);
      } else {
        setMessage(result.error || 'Failed to submit report');
      }
    });
  }

  const attachesChat =
    (targetType === 'CONVERSATION' || targetType === 'MESSAGE') && !!chatLog;

  return (
    <>
      <button className="btn btn-ghost btn-sm" onClick={() => setOpen(true)} style={{ color: 'var(--text-muted)' }}>
        <AlertTriangleIcon size={14} /> {label}
      </button>

      {open && mounted && createPortal(
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="modal animate-slide-up">
            <div className="modal-header">
              <h2 className="font-display" style={{ fontWeight: 700 }}>Report content</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setOpen(false)}><XIcon size={18} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Reason</label>
                  <select className="input" value={reason} onChange={(e) => setReason(e.target.value)}>
                    {REASONS.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Details (optional)</label>
                  <textarea
                    className="textarea"
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    placeholder="Add any context that helps moderators"
                    style={{ minHeight: '90px' }}
                  />
                </div>
                {attachesChat && (
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: 0 }}>
                    A decrypted copy of this chat (visible on your device) will be sent to moderators for review.
                  </p>
                )}
                {message && (
                  <p style={{ fontSize: 'var(--text-sm)', color: message.includes('Thanks') ? 'var(--status-completed)' : 'var(--danger)' }}>
                    {message}
                  </p>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={isPending}>
                  {isPending ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
