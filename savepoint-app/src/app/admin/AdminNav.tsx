'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentType } from 'react';
import {
  LogOutIcon,
  UsersIcon,
  ActivityIcon,
  SettingsIcon,
  ShieldIcon,
  AlertTriangleIcon,
  ForumIcon,
} from '@/components/ui/Icons';

type IconProps = { size?: number; className?: string; style?: React.CSSProperties };

const LINKS: {
  href: string;
  label: string;
  icon: ComponentType<IconProps>;
  exact?: boolean;
}[] = [
  { href: '/admin', label: 'Dashboard', icon: ActivityIcon, exact: true },
  { href: '/admin/users', label: 'Users', icon: UsersIcon },
  { href: '/admin/reviews', label: 'Reviews', icon: ShieldIcon },
  { href: '/admin/reports', label: 'Reports', icon: AlertTriangleIcon },
  { href: '/admin/forums', label: 'Forums', icon: ForumIcon },
  { href: '/admin/settings', label: 'Settings', icon: SettingsIcon },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <>
      <div className="admin-sidebar-brand">
        <Link href="/admin" className="navbar-brand" style={{ margin: 0 }}>
          <span className="navbar-brand-icon">⟐</span>
          Admin
        </Link>
      </div>

      <nav className="admin-sidebar-nav" aria-label="Admin">
        {LINKS.map(({ href, label, icon: Icon, exact }) => {
          const active = exact
            ? pathname === href
            : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={`btn btn-ghost admin-nav-link ${active ? 'is-active' : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="admin-sidebar-footer">
        <Link href="/" className="btn btn-outline" style={{ width: '100%', justifyContent: 'center' }}>
          <LogOutIcon size={18} />
          Exit Admin
        </Link>
      </div>
    </>
  );
}
