'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  banFromReport,
  resolveReport,
  sendReportWarningEmail,
} from '@/app/actions/reports';
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
  reportedUserId: string | null;
  reporter: { username: string; name: string | null };
  reportedUser: {
    id: string;
    username: string;
    name: string | null;
    email: string | null;
  } | null;
}

const DEFAULT_WARNING =
  'Your recent messages were reported and reviewed by Savepoint moderation. Please keep conversations respectful and follow our community guidelines. Further violations may result in a ban.';

export default function ReportsList({ reports }: { reports: ReportRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [warningDrafts, setWarningDrafts] = useState<Record<string, string>>({});
  const [banDrafts, setBanDrafts] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const chatReportsOpen = useMemo(
    () =>
      Object.fromEntries(
        reports.map((r) => {
          const isChat = r.targetType === 'CONVERSATION' || r.targetType === 'MESSAGE';
          return [r.id, isChat && collapsed[r.id] !== true];
        })
      ),
    [reports, collapsed]
  );

  function setMsg(id: string, text: string) {
    setFeedback((prev) => ({ ...prev, [id]: text }));
  }

  function handleResolve(id: string, status: 'RESOLVED' | 'DISMISSED') {
    startTransition(async () => {
      const result = await resolveReport(id, status);
      if ('error' in result && result.error) setMsg(id, result.error);
      else router.refresh();
    });
  }

  function handleSendWarning(id: string) {
    const message = warningDrafts[id]?.trim() || DEFAULT_WARNING;
    startTransition(async () => {
      const result = await sendReportWarningEmail(id, message);
      setMsg(
        id,
        'success' in result && result.success
          ? 'Warning email sent via Gmail.'
          : ('error' in result && result.error) || 'Failed to send'
      );
    });
  }

  function handleBan(id: string, report: ReportRow) {
    const reason =
      banDrafts[id]?.trim() ||
      `Banned after ${report.targetType} report (${report.reason.replaceAll('_', ' ')})`;
    if (!window.confirm(`Ban @${report.reportedUser?.username || 'user'} and resolve this report?`)) {
      return;
    }
    startTransition(async () => {
      const result = await banFromReport(id, reason, true);
      if ('error' in result && result.error) setMsg(id, result.error);
      else {
        setMsg(id, 'User banned and report resolved.');
        router.refresh();
      }
    });
  }

  if (reports.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-title">No open reports</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      {reports.map((report) => {
        const isChat =
          report.targetType === 'CONVERSATION' || report.targetType === 'MESSAGE';
        const showLog = chatReportsOpen[report.id];
        const subject = report.reportedUser;

        return (
          <div key={report.id} className="card" style={{ padding: 'var(--space-lg)' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 'var(--space-md)',
                flexWrap: 'wrap',
                marginBottom: 12,
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>
                  {report.targetType} · {report.reason.replaceAll('_', ' ')}
                </div>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: 4 }}>
                  Reported by @{report.reporter.username}
                  {subject ? ` · against @${subject.username}` : ''}
                  {' · '}
                  {formatRelativeTime(report.createdAt)}
                </div>
                {subject?.email && (
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 4 }}>
                    Email on file: {subject.email}
                  </div>
                )}
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 4 }}>
                  Target ID: {report.targetId}
                </div>
                {report.details && (
                  <p style={{ marginTop: 8, color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
                    {report.details}
                  </p>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <button
                  className="btn btn-primary btn-sm"
                  disabled={isPending}
                  onClick={() => handleResolve(report.id, 'RESOLVED')}
                >
                  Resolve
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={isPending}
                  onClick={() => handleResolve(report.id, 'DISMISSED')}
                >
                  Dismiss
                </button>
              </div>
            </div>

            {isChat && (
              <div style={{ marginBottom: 16 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  <strong style={{ fontSize: 'var(--text-sm)' }}>Chat transcript</strong>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() =>
                      setCollapsed((prev) => ({ ...prev, [report.id]: !prev[report.id] }))
                    }
                  >
                    {showLog ? 'Collapse' : 'Expand'}
                  </button>
                </div>
                {showLog && (
                  report.chatLog ? (
                    <pre
                      style={{
                        margin: 0,
                        padding: 14,
                        maxHeight: 420,
                        overflow: 'auto',
                        fontSize: 12,
                        lineHeight: 1.5,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        background: 'rgba(0,0,0,0.35)',
                        borderRadius: 10,
                        border: '1px solid rgba(255,255,255,0.08)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {report.chatLog}
                    </pre>
                  ) : (
                    <p
                      style={{
                        margin: 0,
                        padding: 12,
                        fontSize: 'var(--text-sm)',
                        color: 'var(--text-muted)',
                        background: 'rgba(255,255,255,0.03)',
                        borderRadius: 8,
                      }}
                    >
                      No chat log was attached to this report. Ask the reporter to submit again from
                      the conversation (transcript is captured on their device).
                    </p>
                  )
                )}
              </div>
            )}

            {subject && (
              <div
                style={{
                  display: 'grid',
                  gap: 16,
                  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                  paddingTop: 8,
                  borderTop: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <div>
                  <label className="form-label">Warning email to @{subject.username}</label>
                  <textarea
                    className="textarea"
                    value={warningDrafts[report.id] ?? DEFAULT_WARNING}
                    onChange={(e) =>
                      setWarningDrafts((prev) => ({ ...prev, [report.id]: e.target.value }))
                    }
                    style={{ minHeight: 100, marginTop: 6 }}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ marginTop: 8 }}
                    disabled={isPending || !subject.email}
                    onClick={() => handleSendWarning(report.id)}
                    title={!subject.email ? 'User has no email on file' : undefined}
                  >
                    {isPending ? 'Sending…' : 'Send warning + chat log'}
                  </button>
                </div>

                <div>
                  <label className="form-label">Ban @{subject.username}</label>
                  <textarea
                    className="textarea"
                    value={
                      banDrafts[report.id] ??
                      `Banned after ${report.targetType} report (${report.reason.replaceAll('_', ' ')})`
                    }
                    onChange={(e) =>
                      setBanDrafts((prev) => ({ ...prev, [report.id]: e.target.value }))
                    }
                    style={{ minHeight: 100, marginTop: 6 }}
                    placeholder="Ban reason"
                  />
                  <button
                    type="button"
                    className="btn btn-sm"
                    style={{
                      marginTop: 8,
                      background: 'rgba(235, 87, 87, 0.15)',
                      color: '#eb5757',
                      border: '1px solid rgba(235, 87, 87, 0.35)',
                    }}
                    disabled={isPending}
                    onClick={() => handleBan(report.id, report)}
                  >
                    Ban user & resolve
                  </button>
                </div>
              </div>
            )}

            {!subject && (
              <p style={{ marginTop: 12, fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                No reported user linked — warning/ban actions unavailable.
              </p>
            )}

            {feedback[report.id] && (
              <p
                style={{
                  marginTop: 12,
                  marginBottom: 0,
                  fontSize: 'var(--text-sm)',
                  color: feedback[report.id].toLowerCase().includes('fail') ||
                    feedback[report.id].toLowerCase().includes('error') ||
                    feedback[report.id].toLowerCase().includes('no ')
                    ? 'var(--danger, #eb5757)'
                    : 'var(--status-completed, #00e5a0)',
                }}
              >
                {feedback[report.id]}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
