'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  HomeIcon,
  GamepadIcon,
  BookOpenIcon,
  ListIcon,
  SettingsIcon,
  UserIcon,
  UsersIcon,
  MessageIcon,
  ForumIcon,
} from '@/components/ui/Icons';
import UserAvatar from '@/components/ui/UserAvatar';
import type { ReactNode } from 'react';
import { MEMBER_NAV, isNavActive, profileHref, type NavId } from '@/lib/nav';

const ICONS: Record<NavId, ReactNode> = {
  home: <HomeIcon size={18} />,
  discover: <GamepadIcon size={18} />,
  library: <BookOpenIcon size={18} />,
  forums: <ForumIcon size={18} />,
  lists: <ListIcon size={18} />,
  friends: <UsersIcon size={18} />,
  messages: <MessageIcon size={18} />,
  settings: <SettingsIcon size={18} />,
  profile: <UserIcon size={18} />,
};

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  if (!session) return null;

  const profilePath = profileHref(session.user.username);
  const profileActive = isNavActive(pathname, profilePath, 'profile');

  return (
    <aside className="sidebar">
      <Link href={profilePath} className="sidebar-profile" style={{ textDecoration: 'none', color: 'inherit' }}>
        <UserAvatar
          className="avatar avatar-xl avatar-ring"
          src={session.user.image}
          name={session.user.name}
          username={session.user.username}
        />
        <div className="sidebar-profile-name">{session.user.name || session.user.username}</div>
      </Link>

      <nav className="sidebar-nav" aria-label="Sidebar">
        <Link
          href={profilePath}
          className={`sidebar-link ${profileActive ? 'sidebar-link-active' : ''}`}
          aria-current={profileActive ? 'page' : undefined}
        >
          <span>{ICONS.profile}</span>
          My Profile
        </Link>
        {MEMBER_NAV.map((link) => {
          const active = isNavActive(pathname, link.href, link.id);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`sidebar-link ${active ? 'sidebar-link-active' : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              <span>{ICONS[link.id]}</span>
              {link.sidebarLabel || link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
