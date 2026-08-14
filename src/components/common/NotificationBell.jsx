import { Bell, X } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { notificationsAPI } from '../../api/notifications';
import { useSocketEvent } from '../../hooks/useSocket';
import { formatDateTime } from '../../utils/formatters';
import { notificationIsRead, getNotificationRoute } from '../../utils/notificationUtils';
import useAuthStore from '../../store/authStore';
import toast from '../../utils/toast';

export default function NotificationBell() {
  const { t } = useTranslation();
  const [show, setShow] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();
  const { isAdmin } = useAuthStore();
  const queryClient = useQueryClient();

  // Invalidate all notification queries (used by socket listener & mutation handlers)
  const invalidateNotifications = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['notificationBell'] });
  }, [queryClient]);

  // Use React Query for notifications — prevents canceled requests on re-render
  const { data: allRes, isLoading: loading } = useQuery({
    queryKey: ['notificationBell', 'all'],
    queryFn: () => notificationsAPI.getAll().catch(() => ({ data: null })),
    staleTime: 30000,
    retry: false,
  });

  const { data: unreadRes } = useQuery({
    queryKey: ['notificationBell', 'unread'],
    queryFn: () => notificationsAPI.getUnread().catch(() => ({ data: { count: 0 } })),
    staleTime: 30000,
    retry: false,
  });

  const allPayload = allRes?.data?.data;
  const list = Array.isArray(allPayload)
    ? allPayload
    : allPayload?.notifications || allPayload?.items || [];
  const recent = Array.isArray(list) ? list.slice(0, 5) : [];

  const unreadPayload = unreadRes?.data?.data;
  let unreadCount = 0;
  if (Array.isArray(unreadPayload)) {
    unreadCount = unreadPayload.length;
  } else if (unreadPayload?.count !== undefined) {
    unreadCount = unreadPayload.count;
  } else if (typeof unreadPayload === 'number') {
    unreadCount = unreadPayload;
  } else if (Array.isArray(list)) {
    unreadCount = list.filter((n) => !notificationIsRead(n)).length;
  }

  // Real-time socket listener — invalidates query cache on new notification
  const handleNewNotification = useCallback(() => {
    invalidateNotifications();
  }, [invalidateNotifications]);

  useSocketEvent('notification:new', handleNewNotification, [handleNewNotification]);

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
      invalidateNotifications();
    } catch {
      // silent
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsAPI.markAllRead();
      invalidateNotifications();
    } catch {
      // silent
    }
  };

  const handleDelete = async (e, n) => {
    e.stopPropagation();
    // Optimistically drop the item from the cached list so it disappears
    // instantly; invalidate() then reconciles with the server.
    queryClient.setQueryData(['notificationBell', 'all'], (old) => {
      if (!old) return old;
      const payload = old?.data?.data;
      const list = Array.isArray(payload)
        ? payload
        : payload?.notifications || payload?.items || [];
      if (!Array.isArray(list)) return old;
      const filtered = list.filter((x) => x.id !== n.id);
      let nextPayload = filtered;
      if (payload && !Array.isArray(payload)) {
        nextPayload = { ...payload };
        if (Array.isArray(payload.notifications)) nextPayload.notifications = filtered;
        if (Array.isArray(payload.items)) nextPayload.items = filtered;
      }
      return { ...old, data: { ...old.data, data: nextPayload } };
    });
    try {
      await notificationsAPI.delete(n.id);
    } catch {
      toast.error(t('notifications.failed_delete'));
    } finally {
      invalidateNotifications();
    }
  };

  const handleClearAll = async (e) => {
    e.stopPropagation();
    try {
      await notificationsAPI.clearAll();
      invalidateNotifications();
    } catch {
      toast.error(t('notifications.failed_clear'));
    }
  };

  const handleBellClick = () => {
    setShow((prev) => !prev);
    if (!show) {
      invalidateNotifications(); // Refresh when opening
    }
  };

  const handleOpen = (n) => {
    if (!notificationIsRead(n)) handleMarkAsRead(n.id);
    setShow(false);
    const route = getNotificationRoute(n, isAdmin);
    if (route) navigate(route);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleBellClick}
        className="relative p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-white/80 hover:text-primary transition-colors rounded-lg hover:bg-white/10"
        aria-label={t('notifications.bell.title')}
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
                {t('notifications.bell.title')}
                {unreadCount > 0 && (
                  <span className="ml-2 text-xs font-medium text-danger">{t('notifications.bell.new', { count: unreadCount })}</span>
                )}
              </span>
              <div className="flex items-center gap-2">
                {recent.length > 0 && (
                  <button
                    onClick={handleClearAll}
                    className="text-xs text-muted hover:text-danger transition-colors font-medium"
                    title={t('notifications.clear_all')}
                  >
                    {t('notifications.bell.clear_all')}
                  </button>
                )}
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs text-primary hover:text-primary-dark font-medium transition-colors"
                  >
                    {t('notifications.bell.mark_all_read')}
                  </button>
                )}
                <button
                  onClick={() => { setShow(false); navigate('/notifications'); }}
                  className="text-xs text-muted hover:text-text-primary transition-colors"
                >
                  {t('notifications.bell.view_all')}
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
                  <Bell size={28} />
                  <p className="text-sm text-muted">{t('notifications.bell.no_notifications')}</p>
                </div>
              ) : (
                recent.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => handleOpen(n)}
                    className={`group px-4 py-3 border-b border-border last:border-b-0 cursor-pointer transition-colors ${
                      notificationIsRead(n)
                        ? 'hover:bg-off-white'
                        : 'bg-off-white hover:bg-off-white/80'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                        notificationIsRead(n) ? 'bg-transparent' : 'bg-primary'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-sm truncate ${notificationIsRead(n) ? 'text-text-secondary' : 'text-text-primary font-medium'}`}>
                            {n.title}
                          </span>
                          {n.createdAt && (
                            <span className="text-[0.65rem] text-muted whitespace-nowrap flex-shrink-0">
                              {formatDateTime(n.createdAt)}
                            </span>
                          )}
                        </div>
                        <p className={`text-xs mt-0.5 line-clamp-2 ${notificationIsRead(n) ? 'text-muted' : 'text-text-secondary'}`}>
                          {n.message}
                        </p>
                      </div>
                      <button
                        onClick={(e) => handleDelete(e, n)}
                        className="p-1.5 -m-1 rounded-md text-muted/70 hover:text-danger hover:bg-danger/10 flex-shrink-0 transition-colors"
                        aria-label={t('notifications.delete_notification', 'Delete notification')}
                        title={t('notifications.delete_notification', 'Delete notification')}
                      >
                        <X size={14} />
                      </button>
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
