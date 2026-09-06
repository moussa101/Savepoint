'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { BellIcon, SettingsIcon, CheckCircleIcon, UsersIcon, StarIcon, MessageIcon } from '@/components/ui/Icons';
import { formatRelativeTime } from '@/lib/utils';

type Notification = {
  id: string;
  type: string; // 'FOLLOW', 'REVIEW_LIKE'
  isRead: boolean;
  createdAt: string;
  source?: {
    name: string | null;
    username: string;
    image: string | null;
  } | null;
  review?: {
    game: {
      name: string;
      slug: string;
    }
  } | null;
};

export default function NotificationsDropdown() {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    // Fetch notifications on mount
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (e) {
      console.error('Failed to fetch notifications', e);
    } finally {
      setLoading(false);
    }
  };

  const markAllAsRead = async () => {
    if (unreadCount === 0) return;
    
    // Optimistic UI
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    
    try {
      await fetch('/api/notifications', { method: 'POST', body: JSON.stringify({}) });
    } catch (e) {
      console.error('Failed to mark all as read', e);
    }
  };

  const markAsRead = async (id: string) => {
    const notification = notifications.find(n => n.id === id);
    if (!notification || notification.isRead) return;
    
    // Optimistic UI
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    
    try {
      await fetch('/api/notifications', { method: 'POST', body: JSON.stringify({ notificationIds: [id] }) });
    } catch (e) {
      console.error('Failed to mark as read', e);
    }
  };

  const handleToggle = () => {
    setNotificationsOpen(!notificationsOpen);
    if (!notificationsOpen && unreadCount > 0) {
      // Mark as read when opening dropdown
      markAllAsRead();
    }
  };

  return (
    <div className={`dropdown ${notificationsOpen ? 'dropdown-open' : ''}`} ref={notifRef}>
      <button 
        className={`btn btn-ghost btn-icon touch-target ${notificationsOpen ? 'active' : ''}`} 
        title="Notifications"
        aria-label="Notifications"
        onClick={handleToggle}
        style={{ position: 'relative' }}
      >
        <BellIcon size={18} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '4px',
            right: '4px',
            width: '8px',
            height: '8px',
            backgroundColor: 'var(--danger)',
            borderRadius: '50%',
            border: '2px solid var(--bg-surface)'
          }} />
        )}
      </button>

      {notificationsOpen && (
        <div className="dropdown-menu dropdown-menu-right notifications-panel" style={{ padding: 0, maxHeight: 'min(80vh, 80dvh)', overflowY: 'auto' }}>
          <div style={{ padding: 'var(--space-md)', borderBottom: '1px solid var(--bg-surface-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, backgroundColor: 'var(--bg-surface)', zIndex: 10 }}>
            <h3 style={{ margin: 0, fontSize: 'var(--text-base)', fontWeight: 600 }}>Notifications</h3>
            <Link href="/settings" style={{ color: 'var(--text-muted)' }} onClick={() => setNotificationsOpen(false)}>
              <SettingsIcon size={16} />
            </Link>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {loading && notifications.length === 0 ? (
              <div style={{ padding: 'var(--space-xl)', textAlign: 'center', color: 'var(--text-muted)' }}>
                Loading...
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: 'var(--space-2xl) var(--space-md)', textAlign: 'center', color: 'var(--text-muted)' }}>
                <CheckCircleIcon size={32} color="var(--accent-primary)" style={{ marginBottom: 'var(--space-sm)' }} />
                <p style={{ margin: 0, fontWeight: 500 }}>You're all caught up!</p>
                <p style={{ margin: '4px 0 0 0', fontSize: 'var(--text-xs)' }}>Activity from people you follow will appear here.</p>
              </div>
            ) : (
              notifications.map((n) => {
                let icon, text, link;
                
                if (n.type === 'FOLLOW') {
                  icon = <UsersIcon size={16} color="var(--accent-primary)" />;
                  text = <><span style={{ fontWeight: 600 }}>{n.source?.name || n.source?.username}</span> followed you</>;
                  link = `/profile/${n.source?.username}`;
                } else if (n.type === 'REVIEW_LIKE') {
                  icon = <StarIcon size={16} color="var(--star-gold)" />;
                  text = <><span style={{ fontWeight: 600 }}>{n.source?.name || n.source?.username}</span> liked your review of <strong>{n.review?.game?.name}</strong></>;
                  link = `/games/${n.review?.game?.slug}`;
                } else if (n.type === 'COMMENT') {
                  icon = <MessageIcon size={16} color="var(--accent-secondary)" />;
                  text = <><span style={{ fontWeight: 600 }}>{n.source?.name || n.source?.username}</span> commented on your review of <strong>{n.review?.game?.name}</strong></>;
                  link = `/games/${n.review?.game?.slug}#comments`;
                } else {
                  return null;
                }

                return (
                  <Link 
                    key={n.id} 
                    href={link}
                    onClick={() => {
                      setNotificationsOpen(false);
                      markAsRead(n.id);
                    }}
                    style={{ 
                      padding: 'var(--space-md)', 
                      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                      display: 'flex',
                      gap: 'var(--space-md)',
                      textDecoration: 'none',
                      color: 'inherit',
                      backgroundColor: n.isRead ? 'transparent' : 'rgba(0, 229, 160, 0.05)',
                      transition: 'background-color 0.2s'
                    }}
                  >
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0, overflow: 'hidden', backgroundColor: 'var(--bg-surface-elevated)' }}>
                      {n.source?.image ? (
                        <img src={n.source.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                          {(n.source?.name || n.source?.username || '?').charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 'var(--text-sm)', lineHeight: 1.4, marginBottom: '4px' }}>
                        {text}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                        {icon}
                        <span>{formatRelativeTime(new Date(n.createdAt))}</span>
                      </div>
                    </div>
                    {!n.isRead && (
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--accent-primary)', alignSelf: 'center' }} />
                    )}
                  </Link>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
