'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';

const sidebarLinks = [
  { href: '/feed', label: 'Home', icon: '🏠' },
  { href: '/games', label: 'Browse Games', icon: '🎮' },
  { href: '/diary', label: 'My Diary', icon: '📖' },
  { href: '/lists', label: 'My Lists', icon: '📋' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  if (!session) return null;

  return (
    <aside className="sidebar">
      <Link href={`/profile/${session.user.username}`} className="sidebar-profile" style={{ textDecoration: 'none', color: 'inherit' }}>
        <div className="avatar avatar-xl avatar-ring">
          {session.user.image ? (
            <img src={session.user.image} alt={session.user.name || ''} />
          ) : (
            (session.user.name || session.user.username || 'U').charAt(0).toUpperCase()
          )}
        </div>
        <div className="sidebar-profile-name">{session.user.name || session.user.username}</div>
      </Link>

      <nav className="sidebar-nav">
        {sidebarLinks.map((link) => {
          let isActive = pathname === link.href;
          if (link.href === '/games' && pathname.startsWith('/games')) isActive = true;
          if (link.href === '/feed' && pathname === '/feed') isActive = true;

          // Profile link
          const profileHref = `/profile/${session.user.username}`;
          
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
          <span>👤</span>
          My Profile
        </Link>
      </nav>
    </aside>
  );
}
