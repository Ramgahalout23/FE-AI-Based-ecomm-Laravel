import { useState, useEffect, useCallback } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, BarChart3, Package, Tag, ClipboardList, Palette, ShoppingBag, Ticket, CreditCard, Truck, Users, Star, Bell, Image, Settings, FileText, Zap, Shield, Search as SearchIcon, Megaphone, TrendingUp, Eye, MessageCircle, Building2, Video } from 'lucide-react';
import { adminAPI } from '../../api/admin';
import { useSettings } from '../../store/useSettings';
import { getImageUrl } from '../../utils/formatters';
import { useSocketEvent, useSocketConnection, useOrderCreated, useReviewCreated } from '../../hooks/useSocket';
import { notificationsAPI } from '../../api/notifications';

const links = [
  {
    section: 'Overview', items: [
      { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
      { to: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
      { to: '/admin/tracking', icon: Eye, label: 'User Tracking' },
      { to: '/admin/seo/dashboard', icon: BarChart3, label: 'SEO Dashboard' },
    ]
  },
  {
    section: 'Catalog', items: [
      { to: '/admin/products', icon: Package, label: 'Products' },
      { to: '/admin/products/import', icon: Package, label: 'CSV Import' },
      { to: '/admin/categories', icon: Tag, label: 'Categories' },
      { to: '/admin/brands', icon: Building2, label: 'Brands' },
      { to: '/admin/inventory', icon: ClipboardList, label: 'Inventory' },
      { to: '/admin/variants', icon: Palette, label: 'Variants' },
    ]
  },
  {
    section: 'Commerce', items: [
      { to: '/admin/orders', icon: ShoppingBag, label: 'Orders' },
      { to: '/admin/abandoned-carts', icon: ShoppingBag, label: 'Abandoned Carts' },
      { to: '/admin/coupons', icon: Ticket, label: 'Coupons' },
      { to: '/admin/promotions', icon: Zap, label: 'Promotions' },
      { to: '/admin/marketing', icon: Megaphone, label: 'Marketing' },
      { to: '/admin/ads', icon: TrendingUp, label: 'Ad Campaigns' },
      { to: '/admin/payments', icon: CreditCard, label: 'Payments' },
      { to: '/admin/shipping', icon: Truck, label: 'Shipping' },
    ]
  },
  {
    section: 'Users & Support', items: [
      { to: '/admin/users', icon: Users, label: 'Users' },
      { to: '/admin/support', icon: Users, label: 'Support Tickets' },
      { to: '/admin/reviews', icon: Star, label: 'Reviews' },
      { to: '/admin/notifications', icon: Bell, label: 'Notifications' },
    ]
  },
  {
    section: 'System', items: [
      { to: '/admin/pages', icon: FileText, label: 'Custom Pages' },
      { to: '/admin/curated-looks', icon: Image, label: 'Curated Looks' },
      { to: '/admin/reels', icon: Video, label: 'Reels' },
      { to: '/admin/banners', icon: Image, label: 'Banners' },
      { to: '/admin/email-templates', icon: FileText, label: 'Email Templates' },
      { to: '/admin/seo', icon: SearchIcon, label: 'SEO Settings' },
      { to: '/admin/audit-logs', icon: ClipboardList, label: 'Audit Log' },
      { to: '/admin/staff', icon: Shield, label: 'Staff Roles' },
      { to: '/admin/settings', icon: Settings, label: 'Settings' },
    ]
  },
];

export default function AdminSidebar() {
  const location = useLocation();
  const { getSetting } = useSettings();
  const adminLogo = getSetting('logoDarkUrl') || getSetting('logoUrl') || null;
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('adminSidebarCollapsed') === 'true');
  const [hovered, setHovered] = useState(false);
  const toggleCollapsed = useCallback(() => {
    setCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('adminSidebarCollapsed', String(next));
      return next;
    });
  }, []);

  const [badgeCounts, setBadgeCounts] = useState({
    products: null,
    orders: null,
    abandoned: null,
    reviews: null,
    notifications: null,
  });

  useEffect(() => {
    let active = true;
    const fetchCounts = async () => {
      // Check if we have an admin/auth token first
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

        // Notification unread count
        const notifPayload = notifRes?.data?.data;
        let notifCount = null;
        if (Array.isArray(notifPayload)) {
          notifCount = notifPayload.length;
        } else if (notifPayload?.count !== undefined) {
          notifCount = notifPayload.count;
        } else if (typeof notifPayload === 'number') {
          notifCount = notifPayload;
        }

        setBadgeCounts({
          products: productsData.total !== undefined ? productsData.total : null,
          orders: metrics.totalOrders !== undefined ? metrics.totalOrders : null,
          abandoned: Array.isArray(abandonedList) ? abandonedList.length : null,
          reviews: metrics.pendingReviews !== undefined ? metrics.pendingReviews : null,
          notifications: notifCount,
        });
      } catch (err) {
        console.warn('Failed to load dynamic sidebar counts:', err);
      }
    };

    fetchCounts();
    return () => {
      active = false;
    };
  }, [location.pathname]); // Re-fetch when route changes (e.g. after login or actions)

  // WebSocket connection state
  const socketConnected = useSocketConnection();

  // Real-time socket listener for new notifications
  const handleNewNotif = useCallback(() => {
    setBadgeCounts(prev => ({
      ...prev,
      notifications: (prev.notifications || 0) + 1,
    }));
  }, []);

  useSocketEvent('notification:new', handleNewNotif, []);

  // Real-time socket: increment Orders badge when a new order is created
  const handleNewOrder = useCallback(() => {
    setBadgeCounts(prev => ({
      ...prev,
      orders: (prev.orders || 0) + 1,
    }));
  }, []);

  useOrderCreated(handleNewOrder, []);

  // Real-time socket: increment Reviews badge when a new review is submitted
  const handleNewReview = useCallback(() => {
    setBadgeCounts(prev => ({
      ...prev,
      reviews: (prev.reviews || 0) + 1,
    }));
  }, []);

  useReviewCreated(handleNewReview, []);

  const getBadgeValue = (label) => {
    switch (label) {
      case 'Products':
        return badgeCounts.products !== null ? String(badgeCounts.products) : null;
      case 'Orders':
        return badgeCounts.orders !== null ? String(badgeCounts.orders) : null;
      case 'Abandoned Carts':
        return badgeCounts.abandoned !== null ? String(badgeCounts.abandoned) : null;
      case 'Reviews':
        return badgeCounts.reviews !== null ? String(badgeCounts.reviews) : null;
      case 'Notifications':
        return badgeCounts.notifications !== null && badgeCounts.notifications > 0 ? String(badgeCounts.notifications) : null;
      default:
        return null;
    }
  };

  return (
    <aside
      className={`w-full ${collapsed && !hovered ? 'md:w-[64px]' : 'md:w-[240px]'} bg-gradient-to-b from-[#1A1A1A] to-[#111] text-white flex flex-row md:flex-col sticky md:top-[60px] md:h-[calc(100vh-60px)] overflow-x-auto md:overflow-y-auto shrink-0 border-r border-gold/10 z-dropdown md:z-auto transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]`}
      onMouseEnter={() => collapsed && setHovered(true)}
      onMouseLeave={() => collapsed && setHovered(false)}
    >
      <div className="hidden md:flex items-center justify-between px-3 py-4 border-b border-white/5 min-h-[56px]">
        {/* Logo/Title — hidden when collapsed */}
        <div className={`overflow-hidden transition-all duration-300 ${collapsed && !hovered ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
          {adminLogo ? (
            <div className="h-7 flex items-center">
              <img 
                src={getImageUrl(adminLogo)} 
                alt="Store" 
                className="h-full w-auto max-w-[140px] object-contain" 
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-gold rounded-full shadow-[0_0_8px_rgba(201,169,110,0.4)]"></span>
              <span className="font-display text-xs tracking-widest uppercase text-gold whitespace-nowrap">Admin Console</span>
            </div>
          )}
        </div>

        {/* Hamburger Toggle */}
        <button
          onClick={toggleCollapsed}
          className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-all duration-200"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`}>
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </div>

      <div className="flex md:flex-col p-2 md:p-0">
        {links.map((group) => (
          <div key={group.section} className="flex md:block items-center">
            <div className={`hidden md:block pt-6 px-4 pb-2 text-[0.6rem] tracking-[0.18em] uppercase text-white/25 font-semibold overflow-hidden transition-all duration-300 ${collapsed && !hovered ? 'max-h-0 pt-0 pb-0 opacity-0' : 'max-h-12 opacity-100 pt-6 pb-2'}`}>
              {group.section}
            </div>

            <div className="flex md:flex-col flex-row gap-1 md:gap-0 px-2 md:px-0">
              {group.items.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  className={({ isActive }) => `
                    flex flex-col items-center gap-0.5 px-2 py-1.5 md:flex-row md:items-center md:gap-3 md:px-5 md:py-2.5 text-white/55 cursor-pointer transition-all duration-200 text-sm md:text-[0.82rem] whitespace-nowrap
                    md:border-l-4 border-transparent md:my-[1px] rounded-lg md:rounded-none
                    ${isActive
                      ? 'text-white bg-gold/10 md:border-l-gold font-medium'
                      : 'hover:text-white/95 hover:bg-gold/5 md:hover:border-l-gold/30'}
                  `}
                >
                  {({ isActive }) => {
                    const badgeVal = getBadgeValue(link.label);
                    return (
                      <>
                        <span className={`w-[18px] text-center flex items-center justify-center ${isActive ? 'opacity-100' : 'opacity-70 hover:opacity-100'}`}>
                          <link.icon size={16} />
                        </span>
                        <span className={`text-[0.48rem] leading-[0.6rem] text-center max-w-[56px] truncate transition-all duration-200 ${collapsed && !hovered ? 'md:opacity-0 md:invisible md:max-w-0 md:overflow-hidden' : 'md:opacity-100 md:visible md:max-w-none md:text-[0.82rem] md:block md:text-left'} ${isActive ? 'text-white/90 font-medium' : 'text-white/55'}`}>
                          {link.label}
                        </span>

                        {badgeVal && (
                          <span
                            className={`hidden ml-auto bg-gradient-to-br from-gold to-gold-dark text-white text-[0.58rem] font-bold px-2 py-0.5 rounded-full tracking-wider transition-all duration-200 ${collapsed && !hovered ? 'md:opacity-0 md:invisible md:w-0 md:overflow-hidden' : 'md:block md:opacity-100 md:visible'}`}
                            style={link.label === 'Orders' ? { background: '#C0392B' } : {}}
                          >
                            {badgeVal}
                          </span>
                        )}
                      </>
                    );
                  }}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* WebSocket Connection Status Indicator */}
      <div className="hidden md:flex items-center gap-2 mt-auto px-5 py-4 border-t border-white/5">
        <span style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: socketConnected ? '#4CAF50' : '#ef4444',
          boxShadow: socketConnected
            ? '0 0 6px rgba(76, 175, 80, 0.6)'
            : '0 0 6px rgba(239, 68, 68, 0.6)',
          transition: 'all 0.3s ease',
          flexShrink: 0,
        }} />
        <span style={{
          fontSize: '0.68rem',
          color: socketConnected ? 'rgba(76, 175, 80, 0.9)' : 'rgba(239, 68, 68, 0.8)',
          letterSpacing: '0.5px',
          fontWeight: 500,
          transition: 'color 0.3s ease',
        }}>
          {socketConnected ? 'Live' : 'Offline'}
        </span>
      </div>
    </aside>
  );
}
