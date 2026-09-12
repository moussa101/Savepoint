import Link from 'next/link';
import { LockIcon, HomeIcon } from '@/components/ui/Icons';
import StatusPage from '@/components/ui/StatusPage';

export default function Forbidden() {
  return (
    <StatusPage
      code="403"
      title="Access denied"
      description="You don’t have permission to view this page. If you think that’s a mistake, sign in with a different account or contact support."
      icon={<LockIcon size={36} color="var(--accent-primary)" />}
      actions={[
        { href: '/', label: 'Home', variant: 'primary', icon: <HomeIcon size={16} /> },
        { href: '/feed', label: 'Feed', variant: 'ghost' },
      ]}
      footer={
        <p className="status-page-hint">
          Need an account? <Link href="/login">Sign in</Link>
        </p>
      }
    />
  );
}
