import { Check, Bell, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

;
import SEOHead from '../../components/seo/SEOHead';
import Breadcrumb from '../../components/common/Breadcrumb';
import { notificationsAPI } from '../../api/notifications';
import NotificationsSkeleton from '../../components/ui/NotificationsSkeleton';
import { formatDateTime } from '../../utils/formatters';
import { notificationIsRead, getNotificationRoute } from '../../utils/notificationUtils';
import { useSettings } from '../../store/useSettings';
import useAuthStore from '../../store/authStore';
import toast from '../../utils/toast';

export default function NotificationsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { getSetting } = useSettings();
  const { isAdmin } = useAuthStore();

  // Keep the header bell badge in sync with changes made on this page.
  const syncBell = () => queryClient.invalidateQueries({ queryKey: ['notificationBell'] });
  const storeName = getSetting('storeName', 'THREVOLT');
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await notificationsAPI.getAll();
        const payload = res.data?.data;
        const list = Array.isArray(payload)
          ? payload
          : payload?.notifications || payload?.items || [];
        setNotifications(Array.isArray(list) ? list : []);
      } catch {
        // silent — empty list renders
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await notificationsAPI.markAllRead();
      setNotifications(notifications.map((n) => ({ ...n, isRead: true, is_read: true })));
      toast.success(t('notifications.marked_read'));
    } catch {
      toast.error(t('notifications.failed_mark_read'));
    } finally {
      syncBell();
    }
  };

  const handleMarkOne = async (id) => {
    try {
      await notificationsAPI.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true, is_read: true } : n)),
      );
    } catch {
      toast.error('Failed to mark as read');
    } finally {
      syncBell();
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    try {
      await notificationsAPI.delete(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      toast.success(t('notifications.deleted'));
    } catch {
      toast.error(t('notifications.failed_delete'));
    } finally {
      syncBell();
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm(t('notifications.delete_confirm'))) return;
    try {
      await notificationsAPI.clearAll();
      setNotifications([]);
      toast.success(t('notifications.cleared'));
    } catch {
      toast.error(t('notifications.failed_clear'));
    } finally {
      syncBell();
    }
  };

  const handleOpen = async (n) => {
    if (!notificationIsRead(n)) {
      await handleMarkOne(n.id);
    }
    const route = getNotificationRoute(n, isAdmin);
    if (route) navigate(route);
  };

  if (loading) return <NotificationsSkeleton />;

  const hasUnread = notifications.some((n) => !notificationIsRead(n));

  return (
    <div className="page-content bg-white flex-1">
      <SEOHead
        title={`Notifications | ${storeName}`}
        description={`View your notifications and order updates from ${storeName}.`}
        noIndex={true}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        <Breadcrumb
          items={[    {label: t('nav.home'), href: '/' },
    { label: t('profile.title'), href: '/profile' },
    { label: t('notifications.title') },
          ]}
          variant="light"
          className="mb-4"
        />
        <div className="flex items-center justify-between mb-6">
          <div>
            <span className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">{t('notifications.your')}</span>
            <h1 className="font-display text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">{t('notifications.title')}</h1>
          </div>
          <div className="flex items-center gap-2">
            {notifications.length > 0 && (
              <button
                onClick={handleClearAll}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-xs font-medium text-gray-700 hover:border-danger hover:text-danger transition-all"
              >
                <Trash2 size={14} /> {t('notifications.clear_all')}
              </button>
            )}
            {hasUnread && (
              <button
                onClick={handleMarkAllRead}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-xs font-medium text-gray-700 hover:border-gray-400 hover:text-gray-900 transition-all"
              >
                <Check size={14} /> {t('notifications.mark_all_read')}
              </button>
            )}
          </div>
        </div>

        {notifications.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell size={32} />
            </div>
            <h3 className="font-display text-lg font-bold text-gray-900 mb-2">{t('notifications.no_notifications')}</h3>
            <p className="text-sm text-gray-500">{t('notifications.all_caught_up')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => (
              <div
                key={n.id}
                role="button"
                tabIndex={0}
                onClick={() => handleOpen(n)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleOpen(n); } }}
                className={`group w-full text-left rounded-xl p-4 md:p-5 border transition-all cursor-pointer ${
                  notificationIsRead(n)
                    ? 'bg-white border-gray-100'
                    : 'bg-gray-50 border-l-4 border-l-gray-900 border-gray-100 hover:bg-gray-100/80'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-1">
                  <strong className={`text-sm ${notificationIsRead(n) ? 'text-gray-700' : 'text-gray-900'}`}>
                    {n.title}
                  </strong>
                  <div className="flex items-center gap-2 shrink-0">
                    {n.createdAt && (
                      <span className="text-[11px] text-gray-400 whitespace-nowrap">
                        {formatDateTime(n.createdAt)}
                      </span>
                    )}
                    <button
                      onClick={(e) => handleDelete(e, n.id)}
                      className="p-1.5 -m-1 rounded-lg text-gray-400 hover:text-danger hover:bg-danger/10 transition-colors"
                      aria-label={t('notifications.delete_notification', 'Delete notification')}
                      title={t('notifications.delete_notification', 'Delete notification')}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-500 leading-relaxed">{n.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
