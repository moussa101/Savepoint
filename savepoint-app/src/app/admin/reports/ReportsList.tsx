'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { resolveReport, sendReportWarningEmail } from '@/app/actions/reports';
import { formatRelativeTime } from '@/lib/utils';

interface ReportRow {
  id: string;
  targetType: string;
  targetId: string;
  reason: string;
  details: string | null;
  chatLog: string | null;
  status: string;
  createdAt: string | Date;
  reporter: { username: string; name: string | null };
  reportedUser: { username: string; name: string | null; email?: string | null } | null;
}

export default function ReportsList({ reports }: { reports: ReportRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [warningDrafts, setWarningDrafts] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [expandedLog, setExpandedLog] = useState<Record<string, boolean>>({});

  function handleResolve(id: string, status: 'RESOLVED' | 'DISMISSED') {
    startTransition(async () => {
      await resolveReport(id, status);
      router.refresh();
    });
  }

  function handleSendWarning(id: string) {
    const message =
      warningDrafts[id]?.trim() ||
      'Your recent messages were reported and reviewed by Savepoint moderation. Please keep conversations respectful and follow our community guidelines.';
    startTransition(async () => {
      const result = await sendReportWarningEmail(id, message);
      if (result.success) {
        setFeedback((prev) => ({ ...prev, [id]: 'Warning email sent.' }));
      } else {
        setFeedback((prev) => ({ ...prev, [id]: result.error || 'Failed to send' }));
      }
    });
  }

  if (reports.length === 0) {
    return <div className="empty-state"><div className="empty-state-title">No open reports</div></div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
      {reports.map((report) => {
        const isChat =
          report.targetType === 'CONVERSATION' || report.targetType === 'MESSAGE';
        const showLog = expandedLog[report.id];

        return (
          <div key={report.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700 }}>
                  {report.targetType} · {report.reason.replaceAll('_', ' ')}
                </div>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: 4 }}>
                  Reported by @{report.reporter.username}
                  {report.reportedUser ? ` · against @${report.reportedUser.username}` : ''}
                  {' · '}{formatRelativeTime(report.createdAt)}
                </div>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginTop: 8 }}>
                  Target ID: {report.targetId}
                </div>
                {report.details && (
                  <p style={{ marginTop: 8, color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>{report.details}</p>
                )}

                {isChat && (
                  <div style={{ marginTop: 12 }}>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() =>
                        setExpandedLog((prev) => ({ ...prev, [report.id]: !prev[report.id] }))
                      }
                    >
                      {showLog ? 'Hide chat log' : report.chatLog ? 'View chat log' : 'No chat log attached'}
                    </button>
                    {showLog && report.chatLog && (
                      <pre
                        style={{
                          marginTop: 10,
                          padding: 12,
                          maxHeight: 320,
                          overflow: 'auto',
                          fontSize: 12,
                          lineHeight: 1.45,
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          background: 'var(--bg-surface-hover)',
                          borderRadius: 8,
                          border: '1px solid rgba(255,255,255,0.06)',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        {report.chatLog}
                      </pre>
                    )}
                  </div>
                )}

                {isChat && report.reportedUser && (
                  <div style={{ marginTop: 14 }}>
                    <label className="form-label" style={{ fontSize: 'var(--text-xs)' }}>
                      Warning email to @{report.reportedUser.username}
                    </label>
                    <textarea
                      className="textarea"
                      value={
                        warningDrafts[report.id] ??
                        'Your recent messages were reported and reviewed by Savepoint moderation. Please keep conversations respectful and follow our community guidelines.'
                      }
                      onChange={(e) =>
                        setWarningDrafts((prev) => ({ ...prev, [report.id]: e.target.value }))
                      }
                      style={{ minHeight: 80, marginTop: 6 }}
                    />
                    <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        disabled={isPending}
                        onClick={() => handleSendWarning(report.id)}
                      >
                        {isPending ? 'Sending…' : 'Send warning + chat log via Gmail'}
                      </button>
                      {feedback[report.id] && (
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                          {feedback[report.id]}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'flex-start' }}>
                <button className="btn btn-primary btn-sm" disabled={isPending} onClick={() => handleResolve(report.id, 'RESOLVED')}>
                  Resolve
                </button>
                <button className="btn btn-ghost btn-sm" disabled={isPending} onClick={() => handleResolve(report.id, 'DISMISSED')}>
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
