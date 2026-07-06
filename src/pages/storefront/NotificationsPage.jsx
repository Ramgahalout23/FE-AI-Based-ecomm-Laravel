import { Check, Bell } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

;
import SEOHead from '../../components/seo/SEOHead';
import Breadcrumb from '../../components/common/Breadcrumb';
import { notificationsAPI } from '../../api/notifications';
import NotificationsSkeleton from '../../components/ui/NotificationsSkeleton';
import { formatDateTime } from '../../utils/formatters';
import { useSettings } from '../../store/useSettings';
import toast from '../../utils/toast';

export default function NotificationsPage() {
  const { t } = useTranslation();
  const { getSetting } = useSettings();
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
      setNotifications(notifications.map((n) => ({ ...n, isRead: true })));
      toast.success(t('notifications.marked_read'));
    } catch {
      toast.error(t('notifications.failed_mark_read'));
    }
  };

  const handleMarkOne = async (id) => {
    try {
      await notificationsAPI.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
    } catch {
      toast.error('Failed to mark as read');
    }
  };

  if (loading) return <NotificationsSkeleton />;

  const hasUnread = notifications.some((n) => !n.isRead);

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
          {hasUnread && (
            <button
              onClick={handleMarkAllRead}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-xs font-medium text-gray-700 hover:border-gray-400 hover:text-gray-900 transition-all"
            >
              <Check size={14} /> {t('notifications.mark_all_read')}
            </button>
          )}
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
              <button
                key={n.id}
                onClick={() => !n.isRead && handleMarkOne(n.id)}
                className={`w-full text-left rounded-xl p-4 md:p-5 border transition-all ${
                  n.isRead
                    ? 'bg-white border-gray-100'
                    : 'bg-gray-50 border-l-4 border-l-gray-900 border-gray-100 hover:bg-gray-100/80'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-1">
                  <strong className={`text-sm ${n.isRead ? 'text-gray-700' : 'text-gray-900'}`}>
                    {n.title}
                  </strong>
                  {n.createdAt && (
                    <span className="text-[11px] text-gray-400 whitespace-nowrap shrink-0">
                      {formatDateTime(n.createdAt)}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 leading-relaxed">{n.message}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
