'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { HomeIcon, GamepadIcon, BookOpenIcon, ListIcon, UserIcon } from '@/components/ui/Icons';

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { data: session } = useSession();

  if (!session?.user || (session.user as { isAdmin?: boolean }).isAdmin) return null;

  const username = session.user.username;
  const items = [
    { href: '/feed', label: 'Home', icon: <HomeIcon size={22} />, match: (p: string) => p === '/feed' },
    { href: '/games', label: 'Discover', icon: <GamepadIcon size={22} />, match: (p: string) => p.startsWith('/games') },
    { href: '/library', label: 'Library', icon: <BookOpenIcon size={22} />, match: (p: string) => p.startsWith('/library') },
    { href: '/lists', label: 'Lists', icon: <ListIcon size={22} />, match: (p: string) => p.startsWith('/lists') },
    {
      href: `/profile/${username}`,
      label: 'Profile',
      icon: <UserIcon size={22} />,
      match: (p: string) => p.startsWith('/profile'),
    },
  ];

  return (
    <nav className="mobile-bottom-nav" aria-label="Primary">
      {items.map((item) => {
        const active = item.match(pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`mobile-bottom-nav-item ${active ? 'is-active' : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            {item.icon}
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
