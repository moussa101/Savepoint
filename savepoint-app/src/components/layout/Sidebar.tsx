'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { HomeIcon, GamepadIcon, BookOpenIcon, ListIcon, SettingsIcon, UserIcon, UsersIcon, MessageIcon, ForumIcon } from '@/components/ui/Icons';
import UserAvatar from '@/components/ui/UserAvatar';
import { ReactNode } from 'react';

const sidebarLinks: { href: string; label: string; icon: ReactNode }[] = [
  { href: '/feed', label: 'Home', icon: <HomeIcon size={18} /> },
  { href: '/games', label: 'Browse Games', icon: <GamepadIcon size={18} /> },
  { href: '/library', label: 'My Library', icon: <BookOpenIcon size={18} /> },
  { href: '/forums', label: 'Forums', icon: <ForumIcon size={18} /> },
  { href: '/lists', label: 'My Lists', icon: <ListIcon size={18} /> },
  { href: '/friends', label: 'Friends', icon: <UsersIcon size={18} /> },
  { href: '/messages', label: 'Messages', icon: <MessageIcon size={18} /> },
  { href: '/settings', label: 'Settings', icon: <SettingsIcon size={18} /> },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  if (!session) return null;

  return (
    <aside className="sidebar">
      <Link href={`/profile/${session.user.username}`} className="sidebar-profile" style={{ textDecoration: 'none', color: 'inherit' }}>
        <UserAvatar
          className="avatar avatar-xl avatar-ring"
          src={session.user.image}
          name={session.user.name}
          username={session.user.username}
        />
        <div className="sidebar-profile-name">{session.user.name || session.user.username}</div>
      </Link>

      <nav className="sidebar-nav">
        {sidebarLinks.map((link) => {
          let isActive = pathname === link.href;
          if (link.href === '/games' && pathname.startsWith('/games')) isActive = true;
          if (link.href === '/library' && pathname.startsWith('/library')) isActive = true;
          if (link.href === '/forums' && pathname.startsWith('/forums')) isActive = true;
          if (link.href === '/friends' && pathname.startsWith('/friends')) isActive = true;
          if (link.href === '/messages' && pathname.startsWith('/messages')) isActive = true;
          if (link.href === '/feed' && pathname === '/feed') isActive = true;

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}
            >
              <span>{link.icon}</span>
              {link.label}
            </Link>
          );
        })}
        <Link
          href={`/profile/${session.user.username}`}
          className={`sidebar-link ${pathname.startsWith('/profile') ? 'sidebar-link-active' : ''}`}
        >
          <span><UserIcon size={18} /></span>
          My Profile
        </Link>
      </nav>
    </aside>
  );
}
