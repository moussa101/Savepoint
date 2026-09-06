'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useState, useRef, useEffect } from 'react';
import { SearchIcon, BellIcon, UserIcon, BookOpenIcon, ListIcon, SettingsIcon, LogOutIcon } from '@/components/ui/Icons';

export default function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [dropdownOpen, setDropdownOpen] = useState(false);
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

  const navLinks = [
    { href: '/games', label: 'Browse' },
    { href: '/games?view=discover', label: 'Discover' },
  ];

  return (
    <nav className="navbar">
      <Link href={session ? '/feed' : '/'} className="navbar-brand">
        <span className="navbar-brand-icon">⟐</span>
        Savepoint
      </Link>

      <div className="navbar-nav">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`navbar-link ${pathname === link.href ? 'navbar-link-active' : ''}`}
          >
            {link.label}
          </Link>
        ))}
      </div>

      <div className="navbar-actions">
        {session ? (
          <>
            <Link href="/games" className="btn btn-ghost btn-icon" title="Search">
              <SearchIcon size={18} />
            </Link>
            <Link href="/feed" className="btn btn-ghost btn-icon" title="Notifications">
              <BellIcon size={18} />
            </Link>
            <div className={`dropdown ${dropdownOpen ? 'dropdown-open' : ''}`} ref={dropdownRef}>
              <button
                className="avatar avatar-sm"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                style={{ cursor: 'pointer' }}
              >
                {session.user.image ? (
                  <img src={session.user.image} alt={session.user.name || ''} />
                ) : (
                  (session.user.name || session.user.username || 'U').charAt(0).toUpperCase()
                )}
              </button>
              <div className="dropdown-menu">
                <Link
                  href={`/profile/${session.user.username}`}
                  className="dropdown-item"
                  onClick={() => setDropdownOpen(false)}
                >
                  <UserIcon size={16} /> My Profile
                </Link>
                <Link href="/diary" className="dropdown-item" onClick={() => setDropdownOpen(false)}>
                  <BookOpenIcon size={16} /> My Diary
                </Link>
                <Link href="/lists" className="dropdown-item" onClick={() => setDropdownOpen(false)}>
                  <ListIcon size={16} /> My Lists
                </Link>
                <Link
                  href="/settings"
                  className="dropdown-item"
                  onClick={() => setDropdownOpen(false)}
                >
                  <SettingsIcon size={16} /> Settings
                </Link>
                <div style={{ height: '1px', background: 'var(--bg-surface-border)', margin: '4px 0' }} />
                <button
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
            <Link href="/login" className="btn btn-ghost">
              Sign In
            </Link>
            <Link href="/register" className="btn btn-primary">
              Get Started
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
