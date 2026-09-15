'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useEffect } from 'react';
import {
  HomeIcon,
  GamepadIcon,
  BookOpenIcon,
  ListIcon,
  SettingsIcon,
  UserIcon,
  LogOutIcon,
  XIcon,
  UsersIcon,
  MessageIcon,
  ForumIcon,
} from '@/components/ui/Icons';
import UserAvatar from '@/components/ui/UserAvatar';
import type { ReactNode } from 'react';
import {
  GUEST_NAV,
  MEMBER_NAV,
  isNavActive,
  profileHref,
  type NavId,
} from '@/lib/nav';

type Props = {
  open: boolean;
  onClose: () => void;
};

const MEMBER_ICONS: Record<NavId, ReactNode> = {
  home: <HomeIcon size={20} />,
  discover: <GamepadIcon size={20} />,
  library: <BookOpenIcon size={20} />,
  forums: <ForumIcon size={20} />,
  lists: <ListIcon size={20} />,
  friends: <UsersIcon size={20} />,
  messages: <MessageIcon size={20} />,
  settings: <SettingsIcon size={20} />,
  profile: <UserIcon size={20} />,
};

export default function MobileNavDrawer({ open, onClose }: Props) {
  const pathname = usePathname();
  const { data: session } = useSession();

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const username = session?.user?.username;

  const links = username
    ? [
        {
          id: 'profile' as const,
          href: profileHref(username),
          label: 'My Profile',
          icon: MEMBER_ICONS.profile,
        },
        ...MEMBER_NAV.map((item) => ({
          id: item.id,
          href: item.href,
          label: item.sidebarLabel || item.label,
          icon: MEMBER_ICONS[item.id],
        })),
      ]
    : [
        { id: 'home' as const, href: '/', label: 'Home', icon: <HomeIcon size={20} /> },
        ...GUEST_NAV.map((item) => ({
          id: item.id,
          href: item.href,
          label: item.label,
          icon: MEMBER_ICONS[item.id] || <GamepadIcon size={20} />,
        })),
        { id: 'profile' as const, href: '/login', label: 'Sign In', icon: <UserIcon size={20} /> },
        {
          id: 'friends' as const,
          href: '/register',
          label: 'Get Started',
          icon: <UsersIcon size={20} />,
        },
      ];

  return (
    <div className={`mobile-nav-root ${open ? 'is-open' : ''}`} aria-hidden={!open}>
      <button
        type="button"
        className="mobile-nav-backdrop"
        aria-label="Close menu"
        tabIndex={open ? 0 : -1}
        onClick={onClose}
      />
      <aside
        className="mobile-nav-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        <div className="mobile-nav-drawer-header">
          {session?.user && username ? (
            <Link href={profileHref(username)} className="mobile-nav-user" onClick={onClose}>
              <UserAvatar
                className="avatar avatar-md avatar-ring"
                src={session.user.image}
                name={session.user.name}
                username={username}
              />
              <div>
                <div className="mobile-nav-user-name">{session.user.name || username}</div>
                <div className="mobile-nav-user-handle">@{username}</div>
              </div>
            </Link>
          ) : (
            <div className="mobile-nav-user">
              <span className="navbar-brand-icon" style={{ fontSize: '1.4rem' }}>
                ⟐
              </span>
              <div>
                <div className="mobile-nav-user-name">Savepoint</div>
                <div className="mobile-nav-user-handle">Browse as guest</div>
              </div>
            </div>
          )}
          <button type="button" className="mobile-nav-close" onClick={onClose} aria-label="Close menu">
            <XIcon size={22} />
          </button>
        </div>

        <nav className="mobile-nav-links">
          {links.map((link) => {
            const active =
              link.href === '/'
                ? pathname === '/'
                : isNavActive(pathname, link.href, link.id);
            return (
              <Link
                key={`${link.label}-${link.href}`}
                href={link.href}
                className={`mobile-nav-link ${active ? 'is-active' : ''}`}
                aria-current={active ? 'page' : undefined}
                onClick={onClose}
              >
                {link.icon}
                {link.label}
              </Link>
            );
          })}
        </nav>

        {session?.user && (
          <button
            type="button"
            className="mobile-nav-link mobile-nav-signout"
            onClick={() => {
              onClose();
              signOut({ callbackUrl: '/' });
            }}
          >
            <LogOutIcon size={20} />
            Sign Out
          </button>
        )}
      </aside>
    </div>
  );
}
