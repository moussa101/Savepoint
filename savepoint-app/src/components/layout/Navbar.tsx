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
} from '@/components/ui/Icons';
import NotificationsDropdown from './NotificationsDropdown';
import MobileNavDrawer from './MobileNavDrawer';
import MobileBottomNav from './MobileBottomNav';

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

  const navLinks = [
    { href: '/games', label: 'Discover' },
    { href: '/lists', label: 'Lists' },
  ];

  const isAdmin = (session?.user as { isAdmin?: boolean } | undefined)?.isAdmin;

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
                className={`navbar-link ${pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href)) ? 'navbar-link-active' : ''}`}
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
                  className="avatar avatar-sm navbar-avatar-btn"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  aria-label="Account menu"
                  aria-expanded={dropdownOpen}
                >
                  {session.user.image ? (
                    <img src={session.user.image} alt="" />
                  ) : (
                    (session.user.name || session.user.username || 'U').charAt(0).toUpperCase()
                  )}
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
