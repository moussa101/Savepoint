/**
 * Single source of truth for app navigation destinations and active matching.
 * Icon rendering stays in each shell (sizes differ).
 */

export type NavId =
  | 'home'
  | 'discover'
  | 'library'
  | 'forums'
  | 'lists'
  | 'friends'
  | 'messages'
  | 'settings'
  | 'profile';

export type NavItemDef = {
  id: NavId;
  href: string;
  /** Short label for top nav / bottom tabs */
  label: string;
  /** Longer label for sidebar / drawer */
  sidebarLabel?: string;
};

export const GUEST_NAV: NavItemDef[] = [
  { id: 'discover', href: '/games', label: 'Discover' },
  { id: 'forums', href: '/forums', label: 'Forums' },
];

/** Full member destinations (sidebar + drawer). */
export const MEMBER_NAV: NavItemDef[] = [
  { id: 'home', href: '/feed', label: 'Feed', sidebarLabel: 'Home' },
  { id: 'discover', href: '/games', label: 'Discover', sidebarLabel: 'Browse Games' },
  { id: 'library', href: '/library', label: 'Library', sidebarLabel: 'My Library' },
  { id: 'forums', href: '/forums', label: 'Forums' },
  { id: 'lists', href: '/lists', label: 'Lists', sidebarLabel: 'My Lists' },
  { id: 'friends', href: '/friends', label: 'Friends' },
  { id: 'messages', href: '/messages', label: 'Messages' },
  { id: 'settings', href: '/settings', label: 'Settings' },
];

/** Compact top navbar (desktop) — same routes as sidebar minus Settings (in user menu). */
export const MEMBER_TOP_NAV: NavItemDef[] = MEMBER_NAV.filter((i) => i.id !== 'settings');

/** Primary mobile bottom tabs. Overflow (Lists/Forums/Settings) lives in the drawer. */
export const MEMBER_BOTTOM_NAV: NavItemDef[] = [
  { id: 'home', href: '/feed', label: 'Home' },
  { id: 'discover', href: '/games', label: 'Discover' },
  { id: 'library', href: '/library', label: 'Library' },
  { id: 'messages', href: '/messages', label: 'Chat' },
  { id: 'profile', href: '/profile', label: 'Profile' },
];

export function isNavActive(
  pathname: string,
  href: string,
  id?: NavId,
  opts?: { chatTab?: boolean }
): boolean {
  if (id === 'home' || href === '/feed') return pathname === '/feed';
  if (id === 'discover' || href === '/games') {
    return pathname === '/games' || pathname.startsWith('/games/');
  }
  if (id === 'library' || href === '/library') {
    return pathname === '/library' || pathname.startsWith('/library/');
  }
  if (id === 'lists' || href === '/lists') {
    return pathname === '/lists' || pathname.startsWith('/lists/');
  }
  if (id === 'forums' || href === '/forums') {
    return pathname === '/forums' || pathname.startsWith('/forums/');
  }
  if (id === 'friends' || href === '/friends') {
    return pathname.startsWith('/friends');
  }
  if (id === 'messages' || href === '/messages') {
    if (opts?.chatTab) {
      return pathname.startsWith('/messages') || pathname.startsWith('/friends');
    }
    return pathname.startsWith('/messages');
  }
  if (id === 'settings' || href === '/settings') {
    return pathname.startsWith('/settings');
  }
  if (id === 'profile' || href.startsWith('/profile')) {
    return pathname.startsWith('/profile');
  }
  return pathname === href || pathname.startsWith(href + '/');
}

export function profileHref(username: string) {
  return `/profile/${username}`;
}
