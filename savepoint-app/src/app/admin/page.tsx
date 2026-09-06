import { prisma } from '@/lib/db';
import Link from 'next/link';
import { formatRelativeTime } from '@/lib/utils';
import { UsersIcon, ActivityIcon, CheckCircleIcon, ServerIcon } from '@/components/ui/Icons';
import { TrafficChart, SignupsChart } from './AdminCharts';

export const metadata = {
  title: 'Admin Dashboard — Savepoint',
};

// Next.js dynamic rendering since we are reading live logs
export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  // Fetch aggregate statistics
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [
    totalUsers,
    totalLogs,
    recentUsers,
    trafficLogs,
    recentSignups
  ] = await Promise.all([
    prisma.user.count(),
    prisma.trafficLog.count(),
    prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }),
    prisma.trafficLog.findMany({ orderBy: { timestamp: 'desc' }, take: 30 }),
    prisma.user.findMany({ where: { createdAt: { gte: sevenDaysAgo } }, select: { createdAt: true } })
  ]);

  // Aggregate traffic data for the last 7 days from the DB
  // For production with massive datasets, raw SQL `GROUP BY` is better.
  // For standard usage, fetching the last 7 days and grouping in TS is perfectly fine.
  const weekLogs = await prisma.trafficLog.findMany({
    where: { timestamp: { gte: sevenDaysAgo } },
    select: { timestamp: true }
  });

  const chartData = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    const dayLogs = weekLogs.filter(log => new Date(log.timestamp).getDate() === d.getDate());
    
    return {
      date: dateStr,
      views: dayLogs.length,
    };
  });

  const signupData = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    
    const daySignups = recentSignups.filter(u => new Date(u.createdAt).getDate() === d.getDate());
    
    return {
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      users: daySignups.length,
    };
  });

  return (
    <div style={{ padding: 'var(--space-2xl)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-2xl)' }}>
        <div>
          <h1 className="font-display" style={{ fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-xs)' }}>Analytics Overview</h1>
          <p style={{ color: 'var(--text-muted)' }}>Real-time metrics and traffic logs</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          <span className="badge" style={{ backgroundColor: 'rgba(235, 87, 87, 0.1)', color: '#eb5757' }}>
            Live
          </span>
        </div>
      </div>

      {/* Metrics Row */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
        gap: 'var(--space-lg)', 
        marginBottom: 'var(--space-3xl)' 
      }}>
        <MetricCard title="Total Users" value={totalUsers} icon={<UsersIcon size={24} />} />
        <MetricCard title="Total API Requests" value={totalLogs} icon={<ServerIcon size={24} />} />
        <MetricCard title="Active Features" value={4} icon={<CheckCircleIcon size={24} />} />
        <MetricCard title="System Status" value="Healthy" icon={<ActivityIcon size={24} />} />
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-xl)', marginBottom: 'var(--space-3xl)' }}>
        <div className="card">
          <h2 className="section-title font-display" style={{ marginBottom: 'var(--space-xl)', fontSize: 'var(--text-lg)' }}>Traffic (Last 7 Days)</h2>
          <TrafficChart data={chartData} />
        </div>
        <div className="card">
          <h2 className="section-title font-display" style={{ marginBottom: 'var(--space-xl)', fontSize: 'var(--text-lg)' }}>Signups (Last 7 Days)</h2>
          <SignupsChart data={signupData} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 'var(--space-2xl)', alignItems: 'start' }}>
        
        {/* Traffic Log Table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: 'var(--space-xl)', borderBottom: '1px solid var(--bg-surface-border)' }}>
            <h2 className="section-title font-display" style={{ margin: 0, fontSize: 'var(--text-lg)' }}>Traffic Log</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', marginTop: 'var(--space-xs)' }}>
              API requests and page visits. Forwarded IPs shown.
            </p>
          </div>
          
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--text-sm)' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--bg-surface-border)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                  <th style={{ padding: 'var(--space-md) var(--space-lg)', color: 'var(--text-muted)', fontWeight: 500 }}>Time</th>
                  <th style={{ padding: 'var(--space-md) var(--space-lg)', color: 'var(--text-muted)', fontWeight: 500 }}>Method</th>
                  <th style={{ padding: 'var(--space-md) var(--space-lg)', color: 'var(--text-muted)', fontWeight: 500 }}>Path</th>
                  <th style={{ padding: 'var(--space-md) var(--space-lg)', color: 'var(--text-muted)', fontWeight: 500 }}>IP</th>
                  <th style={{ padding: 'var(--space-md) var(--space-lg)', color: 'var(--text-muted)', fontWeight: 500 }}>User Agent</th>
                </tr>
              </thead>
              <tbody>
                {trafficLogs.length > 0 ? trafficLogs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid var(--bg-surface-border)' }}>
                    <td style={{ padding: 'var(--space-md) var(--space-lg)', whiteSpace: 'nowrap' }}>
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td style={{ padding: 'var(--space-md) var(--space-lg)' }}>
                      <span style={{ 
                        padding: '2px 8px', 
                        borderRadius: '4px', 
                        fontSize: '11px',
                        fontWeight: 600,
                        backgroundColor: log.method === 'GET' ? 'rgba(0, 229, 160, 0.1)' : 'rgba(136, 132, 216, 0.1)',
                        color: log.method === 'GET' ? 'var(--accent-primary)' : '#8884d8'
                      }}>
                        {log.method}
                      </span>
                    </td>
                    <td style={{ padding: 'var(--space-md) var(--space-lg)', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                      {log.path}
                    </td>
                    <td style={{ padding: 'var(--space-md) var(--space-lg)', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                      {log.ip}
                    </td>
                    <td style={{ padding: 'var(--space-md) var(--space-lg)', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-muted)' }} title={log.userAgent || ''}>
                      {log.userAgent}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} style={{ padding: 'var(--space-xl)', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No traffic logged yet. (Make sure you are not on a _next route!)
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sidebar: New Users */}
        <div>
          <h2 className="section-title font-display" style={{ marginBottom: 'var(--space-lg)', fontSize: 'var(--text-lg)' }}>Newest Users</h2>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {recentUsers.map(user => (
              <Link key={user.id} href={`/profile/${user.username}`} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', textDecoration: 'none', color: 'inherit' }}>
                <div className="avatar" style={{ width: '40px', height: '40px', fontSize: '1.2rem' }}>
                  {user.image ? (
                    <img src={user.image} alt={user.username} />
                  ) : (
                    (user.name || user.username).charAt(0).toUpperCase()
                  )}
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontWeight: 600, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                    {user.name || user.username}
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    Joined {formatRelativeTime(user.createdAt)}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon }: { title: string, value: string | number, icon: React.ReactNode }) {
  return (
    <div className="card" style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      justifyContent: 'space-between',
      padding: 'var(--space-xl)',
      background: 'linear-gradient(135deg, rgba(26,26,46,0.8) 0%, rgba(13,13,26,0.9) 100%)',
      borderTop: '2px solid rgba(255,255,255,0.05)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
          {title}
        </span>
        <div style={{ color: 'var(--accent-primary)', opacity: 0.8 }}>
          {icon}
        </div>
      </div>
      <div className="font-display" style={{ fontSize: '2.5rem', fontWeight: 800, lineHeight: 1 }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
    </div>
  );
}
