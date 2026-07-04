import { Home, Grid, ShoppingBag, User, Heart } from 'lucide-react';
import { memo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import useCartStore from '../../store/cartStore';
import useAuthStore from '../../store/authStore';

export default memo(function MobileNav() {
  const { t } = useTranslation();
  const location = useLocation();
  const { count } = useCartStore();
  const { isAuthenticated } = useAuthStore();

  // Don't show on checkout or product detail pages (PDP has its own sticky bottom bar).
  // Section product pages (/products/section/...) should still show MobileNav.
  // Admin routes are excluded structurally — MobileNav only renders in StorefrontLayout.
  if (location.pathname === '/checkout' || 
      (location.pathname.startsWith('/products/') && !location.pathname.startsWith('/products/section/'))) {
    return null;
  }

  const navItems = [
    { path: '/', icon: Home, label: t('mobile.home') },
    { path: '/products', icon: Grid, label: t('mobile.category') },
    { path: '/wishlist', icon: Heart, label: t('mobile.wishlist') },
    { path: isAuthenticated ? '/profile' : '/login', icon: User, label: t('mobile.account') },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 lg:hidden safe-area-bottom">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path ||
            (item.path === '/products' && location.pathname.startsWith('/products'));
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-1 px-4 py-2 min-w-[60px] transition-all duration-200 ${
                isActive ? 'text-black' : 'text-gray-500'
              }`}
            >
              <div className="relative">
                <Icon className={`w-[22px] h-[22px] transition-transform duration-200 ${isActive ? 'scale-110' : ''}`} />
                {/* Cart badge */}
                {item.path === '/' && count > 0 && (
                  <span className="absolute -top-1 -right-1 bg-black text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                    {count > 9 ? '9+' : count}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}

        {/* Cart - separate since it has special behavior */}
        <Link
          to="/cart"
          className={`flex flex-col items-center gap-1 px-4 py-2 min-w-[60px] transition-all duration-200 ${
            location.pathname === '/cart' ? 'text-black' : 'text-gray-500'
          }`}
        >
          <div className="relative">
            <ShoppingBag className={`w-[22px] h-[22px] transition-transform duration-200 ${location.pathname === '/cart' ? 'scale-110' : ''}`} />
            {count > 0 && (
              <span className="absolute -top-1 -right-1 bg-black text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                {count > 9 ? '9+' : count}
              </span>
            )}
          </div>
          <span className="text-[10px] font-medium">{t('mobile.cart')}</span>
        </Link>
      </div>
    </div>
  );
});
