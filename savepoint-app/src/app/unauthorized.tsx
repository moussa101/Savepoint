import Link from 'next/link';
import { UserIcon, HomeIcon } from '@/components/ui/Icons';
import StatusPage from '@/components/ui/StatusPage';

export default function Unauthorized() {
  return (
    <StatusPage
      code="401"
      title="Sign in required"
      description="This page is for signed-in players only. Log in to continue your save."
      icon={<UserIcon size={36} color="var(--accent-primary)" />}
      actions={[
        { href: '/login', label: 'Sign in', variant: 'primary', icon: <UserIcon size={16} /> },
        { href: '/register', label: 'Create account', variant: 'secondary' },
        { href: '/', label: 'Home', variant: 'ghost', icon: <HomeIcon size={16} /> },
      ]}
      footer={
        <p className="status-page-hint">
          Already registered? <Link href="/login">Sign in</Link>
        </p>
      }
    />
  );
}
