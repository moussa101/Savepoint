import { prisma } from '@/lib/db';
import ReportsList from './ReportsList';

export const metadata = { title: 'Reports — Admin' };
export const dynamic = 'force-dynamic';

export default async function AdminReportsPage() {
  const reports = await prisma.report.findMany({
    where: { status: 'OPEN' },
    include: {
      reporter: { select: { username: true, name: true } },
      reportedUser: { select: { id: true, username: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return (
    <div style={{ padding: 'var(--space-2xl)' }}>
      <h1 className="page-title font-display">Reports</h1>
      <p className="page-subtitle" style={{ marginBottom: 'var(--space-xl)' }}>
        Review reports, read attached chat logs, warn via Gmail, or ban users.
      </p>
      <ReportsList reports={reports} />
    </div>
  );
}
