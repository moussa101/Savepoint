import { useState, useEffect } from 'react';

interface Notification {
  id: string;
  type: 'follow' | 'like' | 'comment' | 'mention' | 'system';
  message: string;
  createdAt: string;
  read: boolean;
  url?: string;
}

interface UseNotificationsResult {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: Error | null;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
  clearNotifications: () => Promise<void>;
}

export function useNotifications(): UseNotificationsResult {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchNotifications = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/notifications');
      if (!response.ok) {
        throw new Error(`Failed to fetch notifications: ${response.status}`);
      }
      const data: Notification[] = await response.json();
      setNotifications(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('An unknown error occurred'));
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      // Optimistically update the UI
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId ? { ...notif, read: true } : notif
        )
      );
      
      // In a real app, you would make an API call here
      // await fetch(`/api/notifications/${notificationId}`, { method: 'PATCH' });
    } catch (err) {
      // Rollback optimistic update on error
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId ? { ...notif, read: false } : notif
        )
      );
      console.error('Error marking notification as read:', err);
      throw err;
    }
  };

  const markAllAsRead = async () => {
    try {
      setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
      // In a real app, you would make an API call here
      // await fetch('/api/notifications/read-all', { method: 'POST' });
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      throw err;
    }
  };

  const clearNotifications = async () => {
    try {
      setNotifications([]);
      // In a real app, you would make an API call here
      // await fetch('/api/notifications', { method: 'DELETE' });
    } catch (err) {
      console.error('Error clearing notifications:', err);
      throw err;
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    fetchNotifications();
  }, []);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    fetchNotifications,
    clearNotifications,
  };
}
