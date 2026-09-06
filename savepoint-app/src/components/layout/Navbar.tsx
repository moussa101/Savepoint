'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useState, useRef, useEffect } from 'react';
import { SearchIcon, BellIcon, UserIcon, BookOpenIcon, ListIcon, SettingsIcon, LogOutIcon, XIcon, CheckCircleIcon } from '@/components/ui/Icons';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/games?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

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
            {/* Search Dropdown */}
            <div className={`dropdown ${searchOpen ? 'dropdown-open' : ''}`} ref={searchRef}>
              <button 
                className={`btn btn-ghost btn-icon ${searchOpen ? 'active' : ''}`} 
                title="Search"
                onClick={() => {
                  setSearchOpen(!searchOpen);
                  setNotificationsOpen(false);
                  setDropdownOpen(false);
                }}
              >
                <SearchIcon size={18} />
              </button>
              
              {searchOpen && (
                <div className="dropdown-menu dropdown-menu-right" style={{ width: '300px', padding: 'var(--space-md)' }}>
                  <form onSubmit={handleSearchSubmit}>
                    <div className="input-group">
                      <span className="input-icon"><SearchIcon size={14} /></span>
                      <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Search games..."
                        className="input input-with-icon"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ width: '100%' }}
                      />
                    </div>
                  </form>
                </div>
              )}
            </div>

            {/* Notifications Dropdown */}
            <div className={`dropdown ${notificationsOpen ? 'dropdown-open' : ''}`} ref={notifRef}>
              <button 
                className={`btn btn-ghost btn-icon ${notificationsOpen ? 'active' : ''}`} 
                title="Notifications"
                onClick={() => {
                  setNotificationsOpen(!notificationsOpen);
                  setSearchOpen(false);
                  setDropdownOpen(false);
                }}
              >
                <BellIcon size={18} />
              </button>

              {notificationsOpen && (
                <div className="dropdown-menu dropdown-menu-right" style={{ width: '350px', padding: 0 }}>
                  <div style={{ padding: 'var(--space-md)', borderBottom: '1px solid var(--bg-surface-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: 'var(--text-base)', fontWeight: 600 }}>Notifications</h3>
                    <Link href="/settings" style={{ color: 'var(--text-muted)' }} onClick={() => setNotificationsOpen(false)}><SettingsIcon size={16} /></Link>
                  </div>
                  <div style={{ padding: 'var(--space-2xl) var(--space-md)', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <CheckCircleIcon size={32} color="var(--accent-primary)" style={{ marginBottom: 'var(--space-sm)' }} />
                    <p style={{ margin: 0, fontWeight: 500 }}>You're all caught up!</p>
                    <p style={{ margin: '4px 0 0 0', fontSize: 'var(--text-xs)' }}>Activity from people you follow will appear here.</p>
                  </div>
                </div>
              )}
            </div>

            {/* User Dropdown */}
            <div className={`dropdown ${dropdownOpen ? 'dropdown-open' : ''}`} ref={dropdownRef}>
              <button
                className="avatar avatar-sm"
                onClick={() => {
                  setDropdownOpen(!dropdownOpen);
                  setSearchOpen(false);
                  setNotificationsOpen(false);
                }}
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
