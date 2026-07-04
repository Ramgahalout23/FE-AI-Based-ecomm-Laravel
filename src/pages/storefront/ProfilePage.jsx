import { ChevronRight, LogOut, ShoppingBag, Heart, Gift, MapPin, User, RotateCcw, Headphones } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SEOHead from '../../components/seo/SEOHead';
import Breadcrumb from '../../components/common/Breadcrumb';
import { useSettings } from '../../store/useSettings';
import useAuthStore from '../../store/authStore';

export default function ProfilePage() {
  const { t } = useTranslation();
  const { getSetting } = useSettings();
  const storeName = getSetting('storeName', 'THREVOLT');
  const { isAuthenticated, user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const MenuItem = ({ icon: Icon, label, to, badge, onClick, danger }) => (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center justify-between px-4 py-3.5 sm:py-4 hover:bg-gray-50 transition-colors active:bg-gray-100 ${danger ? 'text-red-600' : ''}`}
    >
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 ${danger ? 'bg-red-50' : 'bg-gray-100'}`}>
          <Icon size={18} className={danger ? 'text-red-600' : 'text-gray-700'} />
        </div>
        <span className="text-sm font-medium text-gray-800 truncate">{label}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0 ml-2">
        {badge && (
          <span className={`text-[10px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 rounded ${
            badge === 'New' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700'
          }`}>
            {badge}
          </span>
        )}
        <ChevronRight size={16} />
      </div>
    </Link>
  );

  // Shared breadcrumb for both views
  const breadcrumb = (
    <Breadcrumb
      items={[
        { label: t('nav.home'), href: '/' },
        { label: isAuthenticated ? t('profile.title') : t('profile.profile') },
      ]}
      variant="light"
      className="mb-4 sm:mb-6"
    />
  );

  // Not logged in view
  if (!isAuthenticated) {
    return (
      <div className="page-content bg-white flex-1">
        <SEOHead
          title={`My Profile | ${storeName}`}
          description={`Sign in to your ${storeName} account to manage orders, addresses, and preferences.`}
          noIndex={true}
        />
        <div className="max-w-md mx-auto px-4 pt-5 sm:pt-8 pb-[calc(2rem+env(safe-area-inset-bottom,0px))]">
          {breadcrumb}
          {/* Welcome Card */}
          <div className="bg-gradient-to-r from-[#ff6b35] to-[#ff8f5e] rounded-2xl p-5 sm:p-6 text-white mb-5 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold mb-2">{t('profile.welcome')}</h2>
            <p className="text-white/80 text-sm mb-4">{t('profile.access_account')}</p>
            <div className="flex gap-3">
              <Link
                to="/login"
                className="flex-1 bg-white text-[#ff6b35] py-3 rounded-xl font-semibold text-sm text-center hover:bg-gray-100 transition-colors active:scale-[0.98] touch-manipulation"
              >
                {t('profile.login')}
              </Link>
              <Link
                to="/register"
                className="flex-1 bg-transparent border-2 border-white text-white py-3 rounded-xl font-semibold text-sm text-center hover:bg-white/10 transition-colors active:scale-[0.98] touch-manipulation"
              >
                {t('profile.signup')}
              </Link>
            </div>
          </div>

          {/* Quick Links for Guests */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden divide-y divide-gray-100">
            <MenuItem icon={ShoppingBag} label={t('profile.orders')} to="/login?redirect=/orders" />
            <MenuItem icon={Heart} label={t('profile.wishlist')} to="/login?redirect=/wishlist" />
            <MenuItem icon={Gift} label={t('profile.gift_cards')} to="/contact" />
            <MenuItem icon={Headphones} label={t('profile.contact_us')} to="/contact" />
          </div>
        </div>
      </div>
    );
  }

  // Logged in view
  return (
    <div className="page-content bg-white flex-1">
      <SEOHead
        title={`My Profile | ${storeName}`}
        description={`Manage your ${storeName} account, orders, wishlist, and saved addresses.`}
        noIndex={true}
      />
      <div className="max-w-md mx-auto px-4 pt-5 sm:pt-8 pb-[calc(2rem+env(safe-area-inset-bottom,0px))]">
        {breadcrumb}

        {/* User Welcome Card */}
        <div className="bg-gradient-to-r from-[#ff6b35] to-[#ff8f5e] rounded-2xl p-5 sm:p-6 text-white mb-5 sm:mb-6">
          <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/20 rounded-full flex items-center justify-center shrink-0">
              <User size={22} />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-bold truncate">{t('profile.hello_user', { name: user?.firstName || 'User' })}</h2>
              <p className="text-white/80 text-xs sm:text-sm truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 text-white/90 hover:text-white text-sm transition-colors touch-manipulation"
          >
            <LogOut size={16} /> {t('profile.sign_out')}
          </button>
        </div>

        {/* Account Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-5 sm:mb-6 divide-y divide-gray-100">
          <div className="px-4 py-2.5 sm:py-3 bg-gray-50 border-b border-gray-100">
            <span className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider">{t('profile.account_section')}</span>
          </div>
          <MenuItem icon={ShoppingBag} label={t('profile.orders')} to="/orders" />
          <MenuItem icon={Heart} label={t('profile.wishlist')} to="/wishlist" />
          <MenuItem icon={Gift} label={t('profile.gift_cards')} to="/contact" />
          <MenuItem icon={Headphones} label={t('profile.contact_us')} to="/contact" />
          <MenuItem icon={RotateCcw} label={t('profile.returns')} to="/returns" />
        </div>

        {/* Saved Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-5 sm:mb-6 divide-y divide-gray-100">
          <div className="px-4 py-2.5 sm:py-3 bg-gray-50 border-b border-gray-100">
            <span className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider">{t('profile.saved_section')}</span>
          </div>
          <MenuItem icon={MapPin} label={t('profile.saved_addresses')} to="/addresses" />
        </div>

        {/* Account Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden divide-y divide-gray-100">
          <div className="px-4 py-2.5 sm:py-3 bg-gray-50 border-b border-gray-100">
            <span className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider">{t('profile.settings_section')}</span>
          </div>
          <MenuItem icon={User} label={t('profile.edit_profile')} to="/profile" />
        </div>
      </div>
    </div>
  );
}
