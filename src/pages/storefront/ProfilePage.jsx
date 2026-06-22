import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingBag, Heart, Gift, HeadphonesIcon,
  MapPin, User, LogOut, ChevronRight
} from 'lucide-react';
import SEOHead from '../../components/seo/SEOHead';
import Breadcrumb from '../../components/common/Breadcrumb';
import useAuthStore from '../../store/authStore';

export default function ProfilePage() {
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
        <ChevronRight size={16} className="sm:w-[18px] sm:h-[18px] text-gray-400" />
      </div>
    </Link>
  );

  // Shared breadcrumb for both views
  const breadcrumb = (
    <Breadcrumb
      items={[
        { label: 'Home', href: '/' },
        { label: isAuthenticated ? 'My Profile' : 'Profile' },
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
          title="My Profile | Threvolt"
          description="Sign in to your Threvolt account to manage orders, addresses, and preferences."
          noIndex={true}
        />
        <div className="max-w-md mx-auto px-4 pt-5 sm:pt-8 pb-[calc(2rem+env(safe-area-inset-bottom,0px))]">
          {breadcrumb}
          {/* Welcome Card */}
          <div className="bg-gradient-to-r from-[#ff6b35] to-[#ff8f5e] rounded-2xl p-5 sm:p-6 text-white mb-5 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold mb-2">Welcome</h2>
            <p className="text-white/80 text-sm mb-4">To access account and manage orders</p>
            <div className="flex gap-3">
              <Link
                to="/login"
                className="flex-1 bg-white text-[#ff6b35] py-3 rounded-xl font-semibold text-sm text-center hover:bg-gray-100 transition-colors active:scale-[0.98] touch-manipulation"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="flex-1 bg-transparent border-2 border-white text-white py-3 rounded-xl font-semibold text-sm text-center hover:bg-white/10 transition-colors active:scale-[0.98] touch-manipulation"
              >
                Signup
              </Link>
            </div>
          </div>

          {/* Quick Links for Guests */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden divide-y divide-gray-100">
            <MenuItem icon={ShoppingBag} label="Orders" to="/login?redirect=/orders" />
            <MenuItem icon={Heart} label="Wishlist" to="/login?redirect=/wishlist" />
            <MenuItem icon={Gift} label="Gift Cards" to="/contact" />
            <MenuItem icon={HeadphonesIcon} label="Contact Us" to="/contact" />
          </div>
        </div>
      </div>
    );
  }

  // Logged in view
  return (
    <div className="page-content bg-white flex-1">
      <SEOHead
        title="My Profile | Threvolt"
        description="Manage your Threvolt account, orders, wishlist, and saved addresses."
        noIndex={true}
      />
      <div className="max-w-md mx-auto px-4 pt-5 sm:pt-8 pb-[calc(2rem+env(safe-area-inset-bottom,0px))]">
        {breadcrumb}

        {/* User Welcome Card */}
        <div className="bg-gradient-to-r from-[#ff6b35] to-[#ff8f5e] rounded-2xl p-5 sm:p-6 text-white mb-5 sm:mb-6">
          <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/20 rounded-full flex items-center justify-center shrink-0">
              <User size={22} className="text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-bold truncate">Hello, {user?.firstName || 'User'}!</h2>
              <p className="text-white/80 text-xs sm:text-sm truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 text-white/90 hover:text-white text-sm transition-colors touch-manipulation"
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>

        {/* Account Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-5 sm:mb-6 divide-y divide-gray-100">
          <div className="px-4 py-2.5 sm:py-3 bg-gray-50 border-b border-gray-100">
            <span className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider">Account</span>
          </div>
          <MenuItem icon={ShoppingBag} label="Orders" to="/orders" />
          <MenuItem icon={Heart} label="Wishlist" to="/wishlist" />
          <MenuItem icon={Gift} label="Gift Cards" to="/contact" />
          <MenuItem icon={HeadphonesIcon} label="Contact Us" to="/contact" />
        </div>

        {/* Saved Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-5 sm:mb-6 divide-y divide-gray-100">
          <div className="px-4 py-2.5 sm:py-3 bg-gray-50 border-b border-gray-100">
            <span className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider">Saved</span>
          </div>
          <MenuItem icon={MapPin} label="Saved Addresses" to="/addresses" />
        </div>

        {/* Account Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden divide-y divide-gray-100">
          <div className="px-4 py-2.5 sm:py-3 bg-gray-50 border-b border-gray-100">
            <span className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider">Settings</span>
          </div>
          <MenuItem icon={User} label="Edit Profile" to="/profile" />
        </div>
      </div>
    </div>
  );
}
