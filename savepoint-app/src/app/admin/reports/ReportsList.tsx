'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { resolveReport } from '@/app/actions/reports';
import { formatRelativeTime } from '@/lib/utils';

interface ReportRow {
  id: string;
  targetType: string;
  targetId: string;
  reason: string;
  details: string | null;
  status: string;
  createdAt: string | Date;
  reporter: { username: string; name: string | null };
  reportedUser: { username: string; name: string | null } | null;
}

export default function ReportsList({ reports }: { reports: ReportRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleResolve(id: string, status: 'RESOLVED' | 'DISMISSED') {
    startTransition(async () => {
      await resolveReport(id, status);
      router.refresh();
    });
  }

  if (reports.length === 0) {
    return <div className="empty-state"><div className="empty-state-title">No open reports</div></div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
      {reports.map((report) => (
        <div key={report.id} className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
            <div>
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
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
              <button className="btn btn-primary btn-sm" disabled={isPending} onClick={() => handleResolve(report.id, 'RESOLVED')}>
                Resolve
              </button>
              <button className="btn btn-ghost btn-sm" disabled={isPending} onClick={() => handleResolve(report.id, 'DISMISSED')}>
                Dismiss
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
