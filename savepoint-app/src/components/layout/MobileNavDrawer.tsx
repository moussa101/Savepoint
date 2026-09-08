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

type Props = {
  open: boolean;
  onClose: () => void;
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
  const memberLinks = username
    ? [
        { href: `/profile/${username}`, label: 'My Profile', icon: <UserIcon size={20} /> },
        { href: '/feed', label: 'Home', icon: <HomeIcon size={20} /> },
        { href: '/games', label: 'Discover', icon: <GamepadIcon size={20} /> },
        { href: '/library', label: 'My Library', icon: <BookOpenIcon size={20} /> },
        { href: '/forums', label: 'Forums', icon: <ForumIcon size={20} /> },
        { href: '/lists', label: 'My Lists', icon: <ListIcon size={20} /> },
        { href: '/friends', label: 'Friends', icon: <UsersIcon size={20} /> },
        { href: '/messages', label: 'Messages', icon: <MessageIcon size={20} /> },
        { href: '/settings', label: 'Settings', icon: <SettingsIcon size={20} /> },
      ]
    : [
        { href: '/', label: 'Home', icon: <HomeIcon size={20} /> },
        { href: '/games', label: 'Discover', icon: <GamepadIcon size={20} /> },
        { href: '/forums', label: 'Forums', icon: <ForumIcon size={20} /> },
        { href: '/login', label: 'Sign In', icon: <UserIcon size={20} /> },
        { href: '/register', label: 'Get Started', icon: <UsersIcon size={20} /> },
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
            <Link href={`/profile/${username}`} className="mobile-nav-user" onClick={onClose}>
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
          {memberLinks.map((link) => {
            const active =
              pathname === link.href ||
              (link.href === '/games' && pathname.startsWith('/games')) ||
              (link.href === '/library' && pathname.startsWith('/library')) ||
              (link.href === '/friends' && pathname.startsWith('/friends')) ||
              (link.href === '/messages' && pathname.startsWith('/messages')) ||
              (link.href === '/forums' && pathname.startsWith('/forums')) ||
              (link.href.startsWith('/profile') && pathname.startsWith('/profile'));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`mobile-nav-link ${active ? 'is-active' : ''}`}
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
