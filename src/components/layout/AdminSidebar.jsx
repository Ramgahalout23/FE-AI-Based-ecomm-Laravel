import { BarChart3, Globe, Upload, ShoppingBag, Users, Star, Megaphone, TrendingUp, DollarSign, Settings, Menu, Smartphone, Download, Eye, Package, Tag, CreditCard, RotateCcw, Truck, MessageCircle, Bell, FileText, Image, Video, Layout, Mail, LogOut, Store, ClipboardList, Palette, Ticket, Percent, BellPlus, Grid, Languages, Terminal, ShieldCheck, Clock, Link, Target, History, ShoppingCart, Sparkles, BookOpen, SearchCode } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { adminAPI } from '../../api/admin';
import { useSettings } from '../../store/useSettings';
import useAuthStore from '../../store/authStore';
import { getImageUrl } from '../../utils/formatters';
import { useSocketEvent, useSocketConnection, useOrderCreated, useReviewCreated } from '../../hooks/useSocket';
import { notificationsAPI } from '../../api/notifications';

const links = [
  {
    section: 'Overview',
    icon: BarChart3,
    items: [
      { to: '/admin', icon: BarChart3, label: 'Dashboard', end: true },
      { to: '/admin/analytics', icon: TrendingUp, label: 'Analytics' },
      { to: '/admin/tracking', icon: Eye, label: 'User Tracking' },
      { to: '/admin/seo/dashboard', icon: Globe, label: 'SEO Dashboard' },
    ]
  },
  {
    section: 'Catalog',
    icon: Package,
    items: [
      { to: '/admin/products', icon: Package, label: 'Products' },
      { to: '/admin/products/import', icon: Upload, label: 'CSV Import' },
      { to: '/admin/categories', icon: Tag, label: 'Categories' },
      { to: '/admin/brands', icon: Store, label: 'Brands' },
      { to: '/admin/inventory', icon: ClipboardList, label: 'Inventory' },
      { to: '/admin/variants', icon: Palette, label: 'Variants' },
    ]
  },
  {
    section: 'Sales & Orders',
    icon: ShoppingBag,
    items: [
      { to: '/admin/orders', icon: ShoppingBag, label: 'Orders' },
      { to: '/admin/abandoned-carts', icon: ShoppingCart, label: 'Abandoned Carts' },
      { to: '/admin/coupons', icon: Ticket, label: 'Coupons' },
      { to: '/admin/promotions', icon: Sparkles, label: 'Promotions' },
      { to: '/admin/payments', icon: CreditCard, label: 'Payments' },
      { to: '/admin/returns', icon: RotateCcw, label: 'Returns' },
      { to: '/admin/shipping', icon: Truck, label: 'Shipping' },
      { to: '/admin/tax', icon: Percent, label: 'Tax Rates' },
    ]
  },
  {
    section: 'Marketing',
    icon: Megaphone,
    items: [
      { to: '/admin/marketing', icon: Megaphone, label: 'Marketing' },
      { to: '/admin/ads', icon: Target, label: 'Ad Campaigns' },
    ]
  },
  {
    section: 'Users & Support',
    icon: Users,
    items: [
      { to: '/admin/users', icon: Users, label: 'Users' },
      { to: '/admin/support', icon: MessageCircle, label: 'Support Tickets' },
      { to: '/admin/reviews', icon: Star, label: 'Reviews' },
      { to: '/admin/notifications', icon: Bell, label: 'Notifications' },
    ]
  },
  {
    section: 'Content',
    icon: BookOpen,
    items: [
      { to: '/admin/pages', icon: FileText, label: 'Custom Pages' },
      { to: '/admin/curated-looks', icon: Image, label: 'Curated Looks' },
      { to: '/admin/reels', icon: Video, label: 'Reels' },
      { to: '/admin/banners', icon: Layout, label: 'Banners' },
    ]
  },
  {
    section: 'System',
    icon: Settings,
    items: [
      { to: '/admin/notification-templates', icon: BellPlus, label: 'Notif. Templates' },
      { to: '/admin/campaign-templates', icon: Grid, label: 'Campaign Templates' },
      { to: '/admin/email-templates', icon: Mail, label: 'Email Templates' },
      { to: '/admin/currencies', icon: DollarSign, label: 'Currencies' },
      { to: '/admin/translations', icon: Languages, label: 'Translations' },
      { to: '/admin/seo', icon: SearchCode, label: 'SEO Settings' },
      { to: '/admin/audit-logs', icon: History, label: 'Audit Log' },
      { to: '/admin/sms', icon: Smartphone, label: 'SMS Management' },
      { to: '/admin/logs', icon: Terminal, label: 'Server Logs' },
      { to: '/admin/staff', icon: ShieldCheck, label: 'Staff Roles' },
      { to: '/admin/backups', icon: Download, label: 'Backups' },
      { to: '/admin/queue', icon: Clock, label: 'Queue Monitor' },
      { to: '/admin/webhooks', icon: Link, label: 'Webhooks' },
      { to: '/admin/settings', icon: Settings, label: 'Settings' },
    ]
  },
];

export default function AdminSidebar() {
  const location = useLocation();
  const { getSetting } = useSettings();
  const { user } = useAuthStore();
  const adminLogo = getSetting('logoDarkUrl') || getSetting('logoUrl') || null;
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('adminSidebarCollapsed') === 'true');
  const [mobileOpen, setMobileOpen] = useState(false);

  const isLinkActive = useCallback((to, end) => {
    if (end) return location.pathname === to;
    return location.pathname === to || location.pathname.startsWith(to + '/');
  }, [location.pathname]);

  // ── Determine active tab from current route ──
  const getActiveTab = useCallback(() => {
    for (const group of links) {
      if (group.items.some(link => isLinkActive(link.to, link.end))) {
        return group.section;
      }
    }
    return 'Overview';
  }, [isLinkActive]);

  const [activeTab, setActiveTab] = useState(getActiveTab());

  useEffect(() => {
    setActiveTab(getActiveTab());
  }, [location.pathname, getActiveTab]);

  // ── Badge counts ──
  const [badgeCounts, setBadgeCounts] = useState({ products: null, orders: null, abandoned: null, reviews: null, notifications: null });

  useEffect(() => {
    let active = true;
    const fetchCounts = async () => {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('authToken');
      if (!token) return;
      try {
        const [metricsRes, productsRes, abandonedRes, notifRes] = await Promise.all([
          adminAPI.getDashboardMetrics().catch(() => ({ data: null })),
          adminAPI.getProducts({ limit: 1 }).catch(() => ({ data: null })),
          adminAPI.getAbandonedCarts().catch(() => ({ data: null })),
          notificationsAPI.getUnread().catch(() => ({ data: null })),
        ]);
        if (!active) return;
        const metrics = metricsRes.data?.data || metricsRes.data || {};
        const productsData = productsRes.data?.data || productsRes.data || {};
        const abandonedList = abandonedRes.data?.data?.carts || abandonedRes.data?.carts || abandonedRes.data?.data || [];
        const notifPayload = notifRes?.data?.data;
        let notifCount = null;
        if (Array.isArray(notifPayload)) notifCount = notifPayload.length;
        else if (notifPayload?.count !== undefined) notifCount = notifPayload.count;
        else if (typeof notifPayload === 'number') notifCount = notifPayload;
        setBadgeCounts({
          products: productsData.total !== undefined ? productsData.total : null,
          orders: metrics.totalOrders !== undefined ? metrics.totalOrders : null,
          abandoned: Array.isArray(abandonedList) ? abandonedList.length : null,
          reviews: metrics.pendingReviews !== undefined ? metrics.pendingReviews : null,
          notifications: notifCount,
        });
      } catch (err) { console.warn('Failed to load sidebar counts:', err); }
    };
    fetchCounts();
    return () => { active = false; };
  }, [location.pathname]);

  const socketConnected = useSocketConnection();

  const handleNewNotif = useCallback(() => {
    setBadgeCounts(prev => ({ ...prev, notifications: (prev.notifications || 0) + 1 }));
  }, []);
  useSocketEvent('notification:new', handleNewNotif, []);

  const handleNewOrder = useCallback(() => {
    setBadgeCounts(prev => ({ ...prev, orders: (prev.orders || 0) + 1 }));
  }, []);
  useOrderCreated(handleNewOrder, []);

  const handleNewReview = useCallback(() => {
    setBadgeCounts(prev => ({ ...prev, reviews: (prev.reviews || 0) + 1 }));
  }, []);
  useReviewCreated(handleNewReview, []);

  const getBadgeValue = (label) => {
    switch (label) {
      case 'Products': return badgeCounts.products !== null ? Number(badgeCounts.products) : null;
      case 'Orders': return badgeCounts.orders !== null ? Number(badgeCounts.orders) : null;
      case 'Abandoned Carts': return badgeCounts.abandoned !== null ? Number(badgeCounts.abandoned) : null;
      case 'Reviews': return badgeCounts.reviews !== null ? Number(badgeCounts.reviews) : null;
      case 'Notifications': return badgeCounts.notifications !== null && badgeCounts.notifications > 0 ? Number(badgeCounts.notifications) : null;
      default: return null;
    }
  };

  const toggleCollapsed = () => {
    setCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('adminSidebarCollapsed', String(next));
      return next;
    });
  };

  const activeGroup = links.find(g => g.section === activeTab) || links[0];

  // ── Admin initials ──
  const initials = user?.firstName
    ? `${user.firstName[0]}${user.lastName?.[0] || ''}`.toUpperCase()
    : user?.email?.[0]?.toUpperCase() || 'A';

  return (
    <>
      {/* Mobile FAB */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-[#1a1a1a] text-white rounded-2xl shadow-2xl flex items-center justify-center z-40 border border-white/10"
      >
        <Menu size={22} />
      </button>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 bg-black/60 z-30" onClick={() => setMobileOpen(false)} />
      )}

      {/* ═══ Sidebar ═══ */}
      <aside className={`
        fixed md:sticky top-0 md:top-[60px] z-30 md:z-auto
        h-screen md:h-[calc(100vh-60px)]
        transition-all duration-300
        flex flex-col
        ${collapsed ? 'md:w-[72px]' : 'md:w-[240px]'}
        ${mobileOpen ? 'left-0' : '-left-full md:left-0'}
        bg-[#111] text-white border-r border-white/5
        shadow-2xl shadow-black/50
        shrink-0
      `}>
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-4 h-[60px] shrink-0 border-b border-white/5">
          <div className={`flex items-center gap-3 overflow-hidden transition-all duration-300 ${collapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>
            {adminLogo ? (
              <div className="h-7 flex items-center">
                <img src={getImageUrl(adminLogo)} alt="Store" className="h-full w-auto max-w-[140px] object-contain"
                  onError={(e) => { e.target.style.display = 'none'; }} />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#C9A96E] to-[#A8864A] flex items-center justify-center">
                  <span className="text-white font-bold text-sm">A</span>
                </div>
                <div>
                  <span className="font-semibold text-sm text-white/90 block leading-tight">Admin</span>
                  <span className="text-[8px] text-white/30 uppercase tracking-wider">Console</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* Mobile Close */}
            <button onClick={() => setMobileOpen(false)}
              className="md:hidden w-7 h-7 flex items-center justify-center rounded text-white/40 hover:text-white hover:bg-white/10">
              ✕
            </button>

            {/* Collapse Toggle */}
            <button onClick={toggleCollapsed}
              className="hidden md:flex w-7 h-7 items-center justify-center rounded text-white/30 hover:text-white hover:bg-white/10 transition-colors"
              title={collapsed ? 'Expand' : 'Collapse'}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                className={`transition-transform ${collapsed ? 'rotate-180' : ''}`}>
                <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Main Tabs ── */}
        <div className="shrink-0">
          <div className={`flex flex-col gap-0.5 px-2 py-2 ${collapsed ? 'items-center' : ''}`}>
            {links.map((group) => {
              const isActive = group.section === activeTab;
              const Icon = group.icon;
              const tabBadge = getBadgeValue(
                group.items.find(l => ['Products','Orders','Abandoned Carts','Reviews','Notifications'].includes(l.label))?.label || ''
              );

              return (
                <button
                  key={group.section}
                  onClick={() => setActiveTab(group.section)}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm
                    transition-all duration-150
                    ${collapsed ? 'justify-center w-10 h-10 p-0' : 'w-full min-h-[44px]'}
                    ${isActive
                      ? 'bg-[#C9A96E]/15 text-white font-medium'
                      : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                    }
                  `}
                  title={group.section}
                >
                  <Icon size={18} />
                  {!collapsed && <span className="text-sm">{group.section}</span>}
                  {!collapsed && tabBadge !== null && tabBadge > 0 && (
                    <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#C9A96E]/20 text-[#C9A96E]">
                      {tabBadge > 99 ? '99+' : tabBadge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Divider */}
          <div className="mx-4 h-px bg-white/5" />
        </div>

        {/* ── Subtabs ── */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="px-2 py-2">
            {/* Section label */}
            {!collapsed && (
              <div className="flex items-center gap-2 px-3 py-1.5 mb-1">
                <activeGroup.icon size={14} className="text-[#C9A96E]/60" />
                <span className="text-[9px] font-semibold tracking-wider uppercase text-white/25">{activeGroup.section}</span>
                <span className="flex-1 h-px bg-white/5" />
              </div>
            )}

            {/* Subtab links */}
            <div className="flex flex-col gap-0.5">
              {activeGroup.items.map((link) => {
                const active = isLinkActive(link.to, link.end);
                const LinkIcon = link.icon;
                const badgeVal = getBadgeValue(link.label);

                return (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.end}
                    onClick={() => setMobileOpen(false)}
                    className={`
                      flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm
                      transition-all duration-150
                      ${collapsed ? 'justify-center w-10 h-10 p-0' : 'w-full min-h-[44px]'}
                      ${active
                        ? 'bg-white/10 text-white font-medium'
                        : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                      }
                    `}
                    title={collapsed ? link.label : undefined}
                  >
                    <LinkIcon size={18} />
                    {!collapsed && (
                      <>
                        <span className="text-sm">{link.label}</span>
                        {badgeVal !== null && badgeVal > 0 && (
                          <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full
                            ${link.label === 'Orders' ? 'bg-red-500/20 text-red-400' : 'bg-[#C9A96E]/20 text-[#C9A96E]'}`}>
                            {badgeVal > 99 ? '99+' : badgeVal}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="shrink-0 border-t border-white/5">
          {/* User section */}
          <div className={`flex items-center gap-2.5 px-3 py-2.5 ${collapsed ? 'justify-center' : ''}`}>
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
              <span className="text-[10px] font-bold text-white/50">{initials}</span>
            </div>

            {!collapsed && (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white/60 truncate leading-tight">
                    {user?.firstName ? `${user.firstName} ${user.lastName || ''}` : 'Admin'}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${socketConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className={`text-[9px] font-medium ${socketConnected ? 'text-green-400/60' : 'text-red-400/50'}`}>
                      {socketConnected ? 'Live' : 'Offline'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => { useAuthStore.getState().logout(); window.location.href = '/admin/login'; }}
                  className="w-7 h-7 flex items-center justify-center rounded text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  title="Logout"
                >
                  <LogOut size={14} />
                </button>
              </>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
