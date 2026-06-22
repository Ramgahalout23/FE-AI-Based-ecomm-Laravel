import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { notificationsAPI } from '../../api/notifications';
import { useSocketEvent } from '../../hooks/useSocket';
import { formatDateTime } from '../../utils/formatters';

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [recent, setRecent] = useState([]);
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  // Fetch unread count + recent on mount
  const fetchUnread = useCallback(async () => {
    setLoading(true);
    try {
      const [unreadRes, allRes] = await Promise.all([
        notificationsAPI.getUnread().catch(() => ({ data: null })),
        notificationsAPI.getAll().catch(() => ({ data: null })),
      ]);

      // Recent notifications for dropdown
      const allPayload = allRes?.data?.data;
      const list = Array.isArray(allPayload)
        ? allPayload
        : allPayload?.notifications || allPayload?.items || [];
      if (Array.isArray(list)) {
        setRecent(list.slice(0, 5));
        const unreadList = list.filter(n => !n.isRead);

        // Prefer unread endpoint, fall back to deriving from the list
        const unreadPayload = unreadRes?.data?.data;
        if (Array.isArray(unreadPayload)) {
          setUnreadCount(unreadPayload.length);
        } else if (unreadPayload?.count !== undefined) {
          setUnreadCount(unreadPayload.count);
        } else {
          setUnreadCount(unreadList.length);
        }
      } else {
        // No list at all — just use unread endpoint
        const unreadPayload = unreadRes?.data?.data;
        if (Array.isArray(unreadPayload)) {
          setUnreadCount(unreadPayload.length);
        } else if (unreadPayload?.count !== undefined) {
          setUnreadCount(unreadPayload.count);
        } else if (typeof unreadPayload === 'number') {
          setUnreadCount(unreadPayload);
        }
      }
    } catch {
      // Silent — zero state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUnread();
  }, [fetchUnread]);

  // Real-time socket listener for new notifications
  const handleNewNotification = useCallback((data) => {
    setUnreadCount(prev => prev + 1);
    // Prepend to recent list
    setRecent(prev => {
      const updated = [
        {
          id: data.notificationId,
          title: data.title,
          message: data.message,
          type: data.type,
          isRead: false,
          createdAt: data.createdAt,
        },
        ...prev,
      ].slice(0, 5);
      return updated;
    });
  }, []);

  useSocketEvent('notification:new', handleNewNotification, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setShow(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      await notificationsAPI.markAsRead(id);
      setRecent(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(prev - 1, 0));
    } catch {
      // silent
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsAPI.markAllRead();
      setRecent(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // silent
    }
  };

  const handleBellClick = () => {
    setShow(prev => !prev);
    if (!show) {
      fetchUnread(); // Refresh when opening
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleBellClick}
        className="relative p-2 text-white/80 hover:text-primary transition-colors rounded-lg hover:bg-white/10"
        aria-label="Notifications"
      >
        <Bell size={22} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-danger text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-glow-red">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-lift border border-border min-w-[320px] max-w-[360px] overflow-hidden z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-sm font-semibold text-text-primary">
                Notifications
                {unreadCount > 0 && (
                  <span className="ml-2 text-xs font-medium text-danger">{unreadCount} new</span>
                )}
              </span>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs text-primary hover:text-primary-dark font-medium transition-colors"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => { setShow(false); navigate('/notifications'); }}
                  className="text-xs text-muted hover:text-text-primary transition-colors"
                >
                  View all
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="max-h-[300px] overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="spinner w-5 h-5" />
                </div>
              ) : recent.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-center">
                  <Bell size={28} className="text-muted mb-2" />
                  <p className="text-sm text-muted">No notifications yet</p>
                </div>
              ) : (
                recent.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => {
                      if (!n.isRead) handleMarkAsRead(n.id);
                      setShow(false);
                      navigate('/notifications');
                    }}
                    className={`px-4 py-3 border-b border-border last:border-b-0 cursor-pointer transition-colors ${
                      n.isRead
                        ? 'hover:bg-off-white'
                        : 'bg-off-white hover:bg-off-white/80'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                        n.isRead ? 'bg-transparent' : 'bg-primary'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-sm truncate ${n.isRead ? 'text-text-secondary' : 'text-text-primary font-medium'}`}>
                            {n.title}
                          </span>
                          {n.createdAt && (
                            <span className="text-[0.65rem] text-muted whitespace-nowrap flex-shrink-0">
                              {formatDateTime(n.createdAt)}
                            </span>
                          )}
                        </div>
                        <p className={`text-xs mt-0.5 line-clamp-2 ${n.isRead ? 'text-muted' : 'text-text-secondary'}`}>
                          {n.message}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
