'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { HomeIcon, GamepadIcon, BookOpenIcon, MessageIcon, UserIcon } from '@/components/ui/Icons';
import type { ReactNode } from 'react';
import { MEMBER_BOTTOM_NAV, isNavActive, profileHref, type NavId } from '@/lib/nav';

const ICONS: Partial<Record<NavId, ReactNode>> = {
  home: <HomeIcon size={22} />,
  discover: <GamepadIcon size={22} />,
  library: <BookOpenIcon size={22} />,
  messages: <MessageIcon size={22} />,
  profile: <UserIcon size={22} />,
};

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { data: session } = useSession();

  if (!session?.user || (session.user as { isAdmin?: boolean }).isAdmin) return null;

  const username = session.user.username;

  return (
    <nav className="mobile-bottom-nav" aria-label="Primary">
      {MEMBER_BOTTOM_NAV.map((item) => {
        const href = item.id === 'profile' ? profileHref(username) : item.href;
        const active = isNavActive(pathname, href, item.id, {
          chatTab: item.id === 'messages',
        });
        return (
          <Link
            key={item.id}
            href={href}
            className={`mobile-bottom-nav-item ${active ? 'is-active' : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            {ICONS[item.id]}
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
