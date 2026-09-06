import { prisma } from '@/lib/db';
import ReportsList from './ReportsList';

export const metadata = { title: 'Reports — Admin' };
export const dynamic = 'force-dynamic';

export default async function AdminReportsPage() {
  const reports = await prisma.report.findMany({
    where: { status: 'OPEN' },
    include: {
      reporter: { select: { username: true, name: true } },
      reportedUser: { select: { username: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return (
    <div style={{ padding: 'var(--space-2xl)' }}>
      <h1 className="page-title font-display">Reports</h1>
      <p className="page-subtitle" style={{ marginBottom: 'var(--space-xl)' }}>
        Review user-submitted reports for spam, harassment, and other violations.
      </p>
      <ReportsList reports={reports} />
    </div>
  );
}
