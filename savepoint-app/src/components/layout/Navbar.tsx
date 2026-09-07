'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useState, useRef, useEffect } from 'react';
import {
  UserIcon,
  BookOpenIcon,
  ListIcon,
  SettingsIcon,
  LogOutIcon,
  MenuIcon,
  UsersIcon,
  MessageIcon,
} from '@/components/ui/Icons';
import NotificationsDropdown from './NotificationsDropdown';
import MobileNavDrawer from './MobileNavDrawer';
import MobileBottomNav from './MobileBottomNav';
import UserAvatar from '@/components/ui/UserAvatar';

export default function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setDropdownOpen(false);
    setMobileMenuOpen(false);
  }, [pathname]);

  const isAdmin = (session?.user as { isAdmin?: boolean } | undefined)?.isAdmin;

  const guestLinks = [
    { href: '/games', label: 'Discover' },
    { href: '/lists', label: 'Lists' },
  ];

  const memberLinks = [
    { href: '/feed', label: 'Feed' },
    { href: '/games', label: 'Discover' },
    { href: '/library', label: 'Library' },
    { href: '/lists', label: 'Lists' },
    { href: '/friends', label: 'Friends' },
    { href: '/messages', label: 'Messages' },
  ];

  const navLinks = session && !isAdmin ? memberLinks : guestLinks;

  function linkActive(href: string) {
    if (href === '/feed') return pathname === '/feed';
    if (href === '/games') return pathname === '/games' || pathname.startsWith('/games/');
    if (href === '/library') return pathname === '/library' || pathname.startsWith('/library/');
    if (href === '/lists') return pathname === '/lists' || pathname.startsWith('/lists/');
    if (href === '/friends') return pathname.startsWith('/friends');
    if (href === '/messages') return pathname.startsWith('/messages');
    return pathname === href || pathname.startsWith(href);
  }

  return (
    <>
      <nav className="navbar" aria-label="Main">
        <div className="navbar-leading">
          {session && !isAdmin && (
            <button
              type="button"
              className="navbar-menu-btn"
              aria-label="Open menu"
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen(true)}
            >
              <MenuIcon size={22} />
            </button>
          )}

          <Link
            href={isAdmin ? '/admin' : session ? '/feed' : '/'}
            className="navbar-brand"
          >
            <span className="navbar-brand-icon">⟐</span>
            <span className="navbar-brand-text">Savepoint</span>
          </Link>
        </div>

        {!isAdmin && (
          <div className="navbar-nav">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`navbar-link ${linkActive(link.href) ? 'navbar-link-active' : ''}`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}

        <div className="navbar-actions">
          {session ? (
            <>
              <NotificationsDropdown />

              <div className={`dropdown navbar-user-dropdown ${dropdownOpen ? 'dropdown-open' : ''}`} ref={dropdownRef}>
                <button
                  type="button"
                  className="navbar-avatar-btn"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  aria-label="Account menu"
                  aria-expanded={dropdownOpen}
                >
                  <UserAvatar
                    className="avatar avatar-sm"
                    src={session.user.image}
                    name={session.user.name}
                    username={session.user.username}
                  />
                </button>
                <div className="dropdown-menu">
                  {!isAdmin && (
                    <>
                      <Link
                        href={`/profile/${session.user.username}`}
                        className="dropdown-item"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <UserIcon size={16} /> My Profile
                      </Link>
                      <Link href="/library" className="dropdown-item" onClick={() => setDropdownOpen(false)}>
                        <BookOpenIcon size={16} /> My Library
                      </Link>
                      <Link href="/lists" className="dropdown-item" onClick={() => setDropdownOpen(false)}>
                        <ListIcon size={16} /> My Lists
                      </Link>
                      <Link href="/friends" className="dropdown-item" onClick={() => setDropdownOpen(false)}>
                        <UsersIcon size={16} /> Friends
                      </Link>
                      <Link href="/messages" className="dropdown-item" onClick={() => setDropdownOpen(false)}>
                        <MessageIcon size={16} /> Messages
                      </Link>
                    </>
                  )}
                  <Link
                    href="/settings"
                    className="dropdown-item"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <SettingsIcon size={16} /> Settings
                  </Link>
                  {isAdmin && (
                    <>
                      <div className="dropdown-divider" />
                      <Link
                        href="/admin"
                        className="dropdown-item"
                        onClick={() => setDropdownOpen(false)}
                        style={{ color: 'var(--accent-primary)' }}
                      >
                        Admin Dashboard
                      </Link>
                    </>
                  )}
                  <div className="dropdown-divider" />
                  <button
                    type="button"
                    className="dropdown-item"
                    onClick={() => signOut({ callbackUrl: '/' })}
                  >
                    <LogOutIcon size={16} /> Sign Out
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost navbar-auth-signin">
                Sign In
              </Link>
              <Link href="/register" className="btn btn-primary navbar-auth-cta">
                Get Started
              </Link>
            </>
          )}
        </div>
      </nav>

      {session && !isAdmin && (
        <>
          <MobileNavDrawer open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
          <MobileBottomNav />
        </>
      )}
    </>
  );
}
