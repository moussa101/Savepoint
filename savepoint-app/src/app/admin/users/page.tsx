import { prisma } from '@/lib/db';
import Link from 'next/link';
import { ShieldIcon, TrashIcon, SearchIcon } from '@/components/ui/Icons';
import VerifiedBadge from '@/components/ui/VerifiedBadge';
import UserVerificationToggles from './UserVerificationToggles';

export const metadata = {
  title: 'User Management — Admin',
};

// Force dynamic so the user list is always up to date
export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { reviews: true, lists: true }
      }
    }
  });

  return (
    <div style={{ padding: 'var(--space-2xl)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-2xl)' }}>
        <div>
          <h1 className="font-display" style={{ fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-xs)' }}>Users Directory</h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage and view all registered users</p>
        </div>
        
        <div className="input-group" style={{ width: '300px' }}>
          <span className="input-icon"><SearchIcon size={16} /></span>
          <input type="text" className="input input-with-icon" placeholder="Search users..." />
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 'var(--text-sm)' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--bg-surface-border)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                <th style={{ padding: 'var(--space-md) var(--space-lg)', color: 'var(--text-muted)', fontWeight: 500 }}>User</th>
                <th style={{ padding: 'var(--space-md) var(--space-lg)', color: 'var(--text-muted)', fontWeight: 500 }}>Email</th>
                <th style={{ padding: 'var(--space-md) var(--space-lg)', color: 'var(--text-muted)', fontWeight: 500 }}>Role</th>
                <th style={{ padding: 'var(--space-md) var(--space-lg)', color: 'var(--text-muted)', fontWeight: 500 }}>Badges</th>
                <th style={{ padding: 'var(--space-md) var(--space-lg)', color: 'var(--text-muted)', fontWeight: 500 }}>Joined</th>
                <th style={{ padding: 'var(--space-md) var(--space-lg)', color: 'var(--text-muted)', fontWeight: 500, textAlign: 'right' }}>Stats</th>
                <th style={{ padding: 'var(--space-md) var(--space-lg)', color: 'var(--text-muted)', fontWeight: 500, textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} style={{ borderBottom: '1px solid var(--bg-surface-border)' }}>
                  <td style={{ padding: 'var(--space-md) var(--space-lg)' }}>
                    <Link href={`/profile/${user.username}`} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', color: 'inherit', textDecoration: 'none' }}>
                      <div className="avatar" style={{ width: '32px', height: '32px', fontSize: '1rem' }}>
                        {user.image ? <img src={user.image} alt={user.username} /> : (user.name || user.username).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          {user.name || user.username}
                          <VerifiedBadge isOfficial={user.isOfficial} username={user.username} size={14} />
                        </div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>@{user.username}</div>
                      </div>
                    </Link>
                  </td>
                  <td style={{ padding: 'var(--space-md) var(--space-lg)', color: 'var(--text-secondary)' }}>
                    {user.email}
                  </td>
                  <td style={{ padding: 'var(--space-md) var(--space-lg)' }}>
                    {user.isAdmin ? (
                      <span className="badge" style={{ backgroundColor: 'rgba(0, 229, 160, 0.1)', color: 'var(--accent-primary)' }}>
                        <ShieldIcon size={12} style={{ marginRight: '4px' }} /> Admin
                      </span>
                    ) : (
                      <span className="badge">User</span>
                    )}
                  </td>
                  <td style={{ padding: 'var(--space-md) var(--space-lg)' }}>
                    <UserVerificationToggles
                      userId={user.id}
                      isOfficial={user.isOfficial}
                      username={user.username}
                    />
                  </td>
                  <td style={{ padding: 'var(--space-md) var(--space-lg)', color: 'var(--text-muted)' }}>
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: 'var(--space-md) var(--space-lg)', textAlign: 'right', color: 'var(--text-muted)' }}>
                    {user._count.reviews} Reviews • {user._count.lists} Lists
                  </td>
                  <td style={{ padding: 'var(--space-md) var(--space-lg)', textAlign: 'center' }}>
                    <button 
                      className="btn btn-ghost" 
                      style={{ padding: '6px', color: '#eb5757' }}
                      title="Delete User (Not Implemented Yet)"
                      disabled
                    >
                      <TrashIcon size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
