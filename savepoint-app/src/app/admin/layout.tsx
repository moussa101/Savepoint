import { ensureAdmin } from '@/lib/authz';
import AdminNav from './AdminNav';

export const metadata = {
  title: 'Admin — Savepoint',
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await ensureAdmin();

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <AdminNav />
      </aside>
      <main className="admin-main">{children}</main>
    </div>
  );
}
