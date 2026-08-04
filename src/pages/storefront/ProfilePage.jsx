import { ChevronRight, LogOut, ShoppingBag, Heart, MapPin, User, RotateCcw, Headphones, LifeBuoy, Loader2, Upload } from 'lucide-react';
import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SEOHead from '../../components/seo/SEOHead';
import Breadcrumb from '../../components/common/Breadcrumb';
import { useSettings } from '../../store/useSettings';
import useAuthStore from '../../store/authStore';
import { userProfileAPI } from '../../api/userProfile';
import { getImageUrl, getInitials, getUserFullName } from '../../utils/formatters';
import toast from '../../utils/toast';

export default function ProfilePage() {
  const { t } = useTranslation();
  const { getSetting } = useSettings();
  const storeName = getSetting('storeName', 'THREVOLT');
  const { isAuthenticated, user, logout, setUser } = useAuthStore();
  const navigate = useNavigate();

  // Edit profile state
  const [showEditForm, setShowEditForm] = useState(false);
  const [editForm, setEditForm] = useState({ firstName: '', lastName: '', phone: '', avatar: '' });
  const [submitting, setSubmitting] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef(null);

  // Populate form when user data loads or form opens
  const openEditForm = () => {
    setEditForm({
      firstName: user?.firstName || user?.first_name || '',
      lastName: user?.lastName || user?.last_name || '',
      phone: user?.phone || '',
      avatar: user?.avatar || '',
    });
    setShowEditForm(true);
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await userProfileAPI.uploadAvatar(formData);
      const url = res.data?.data?.url || '';
      if (url) {
        setEditForm({ ...editForm, avatar: url });
        toast.success('Photo uploaded');
      }
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to upload photo';
      toast.error(msg);
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const updateData = {
        first_name: editForm.firstName,
        last_name: editForm.lastName,
        phone: editForm.phone,
      };
      if (editForm.avatar) {
        updateData.avatar = editForm.avatar;
      }
      await userProfileAPI.update(updateData);
      setUser({ ...user, firstName: editForm.firstName, lastName: editForm.lastName, first_name: editForm.firstName, last_name: editForm.lastName, phone: editForm.phone, avatar: editForm.avatar || user?.avatar });
      setShowEditForm(false);
      toast.success('Profile updated');
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to update profile';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

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
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden shrink-0 bg-white/20 flex items-center justify-center">
              {user?.avatar ? (
                <img
                  src={getImageUrl(user.avatar)}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <span className="text-white font-bold text-lg">{getInitials(user?.firstName || user?.first_name, user?.lastName || user?.last_name) || <User size={22} />}</span>
              )}
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-bold truncate">{t('profile.hello_user', { name: getUserFullName(user) || 'User' })}</h2>
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
          <MenuItem icon={Headphones} label={t('profile.contact_us')} to="/contact" />
          <MenuItem icon={LifeBuoy} label={t('profile.support')} to="/support" />
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
          <button
            onClick={openEditForm}
            className="w-full flex items-center justify-between px-4 py-3.5 sm:py-4 hover:bg-gray-50 transition-colors active:bg-gray-100"
          >
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 bg-gray-100">
                <User size={18} className="text-gray-700" />
              </div>
              <span className="text-sm font-medium text-gray-800 truncate">{t('profile.edit_profile')}</span>
            </div>
            <ChevronRight size={16} />
          </button>

          {/* Edit Profile Form */}
          {showEditForm && (
            <div className="px-4 py-4 bg-gray-50 border-t border-gray-100">
              <form onSubmit={handleSaveProfile} className="space-y-3">
                {/* Avatar Upload */}
                <div className="flex items-center gap-4 mb-1">
                  <div className="relative w-16 h-16 rounded-full overflow-hidden bg-gray-200 shrink-0">
                    {editForm.avatar ? (
                      <img
                        src={getImageUrl(editForm.avatar)}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <User size={24} />
                      </div>
                    )}
                    {uploadingAvatar && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Loader2 size={20} className="text-white animate-spin" />
                      </div>
                    )}
                  </div>
                  <div>
                    <input
                      type="file"
                      ref={avatarInputRef}
                      onChange={handleAvatarChange}
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={uploadingAvatar}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50 hover:border-gray-400 transition-colors disabled:opacity-50"
                    >
                      <Upload size={14} />
                      {uploadingAvatar ? 'Uploading...' : 'Change Photo'}
                    </button>
                    <p className="text-[10px] text-gray-400 mt-1">JPEG, PNG or WebP (max 5MB)</p>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">{t('auth.first_name')}</label>
                  <input
                    type="text"
                    value={editForm.firstName}
                    onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:border-gray-900 transition-all"
                    autoComplete="given-name"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">{t('auth.last_name')}</label>
                  <input
                    type="text"
                    value={editForm.lastName}
                    onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:border-gray-900 transition-all"
                    autoComplete="family-name"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">{t('auth.phone')}</label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:border-gray-900 transition-all"
                    autoComplete="tel"
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-gray-900 text-white py-2.5 rounded-lg text-xs font-bold hover:bg-gray-800 transition-colors disabled:opacity-50"
                  >
                    {submitting ? 'Saving...' : t('addresses.save')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowEditForm(false)}
                    className="flex-1 border-2 border-gray-200 text-gray-700 py-2.5 rounded-lg text-xs font-bold hover:border-gray-400 transition-colors"
                  >
                    {t('addresses.cancel')}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
