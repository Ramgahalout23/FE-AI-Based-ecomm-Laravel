import { Plus, MapPin, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

;
import SEOHead from '../../components/seo/SEOHead';
import Breadcrumb from '../../components/common/Breadcrumb';
import { userProfileAPI } from '../../api/userProfile';
import AddressSkeleton from '../../components/ui/AddressSkeleton';
import { useSettings } from '../../store/useSettings';
import toast from '../../utils/toast';

export default function AddressesPage() {
  const { t } = useTranslation();
  const { getSetting } = useSettings();
  const storeName = getSetting('storeName', 'THREVOLT');
  const [addresses, setAddresses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ type: 'SHIPPING', firstName: '', lastName: '', addressLine1: '', city: '', state: '', zipCode: '', country: 'USA' });

  useEffect(() => {
    const fetch = async () => { try { setLoading(true); const res = await userProfileAPI.getAddresses(); setAddresses(res.data?.data?.addresses || res.data?.data || []);      } catch (e) { setError(t('addresses.failed_to_load')); console.warn('Failed to load addresses:', e); } finally { setLoading(false); } };
    fetch();
  }, []);

  const handleSave = async () => {
    try { const res = await userProfileAPI.createAddress(form); setAddresses([...addresses, res.data?.data || res.data?.data]); setShowForm(false); toast.success(t('addresses.added')); } catch { toast.error(t('addresses.failed_add')); }
  };

  const handleDelete = async (id) => {
    try { await userProfileAPI.deleteAddress(id); setAddresses(addresses.filter((a) => a.id !== id)); toast.success(t('addresses.deleted')); } catch { toast.error(t('addresses.failed_delete')); }
  };

  const handleSetDefault = async (id) => {
    try { await userProfileAPI.setDefaultAddress(id); setAddresses(addresses.map((a) => ({ ...a, isDefault: a.id === id }))); toast.success(t('addresses.default_updated')); } catch (e) { toast.error(t('addresses.failed_default')); }
  };

  if (loading) {
    return <AddressSkeleton />;
  }

  return (
    <div className="section">
      <SEOHead
        title={`My Addresses | ${storeName}`}
        description={`Manage your saved shipping addresses at ${storeName} for faster checkout.`}
        noIndex={true}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        <Breadcrumb
          items={[    {label: t('nav.home'), href: '/' },
    { label: t('profile.title'), href: '/profile' },
    { label: t('addresses.title') },
          ]}
          variant="light"
          className="mb-6"
        />
      </div>
      {error && (
        <div className="mx-4 sm:mx-6 lg:mx-8 mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 flex items-center gap-2">
          <span>⚠️</span>
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800 p-1">✕</button>
        </div>
      )}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <span className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">{t('addresses.manage')}</span>
            <h2 className="font-display text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">{t('addresses.title')}</h2>
          </div>
          <button className="inline-flex items-center gap-1.5 bg-gray-900 text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-gray-800 transition-colors" onClick={() => setShowForm(true)}>
            <Plus size={14} /> {t('addresses.add')}
          </button>
        </div>
      </div>
      {showForm && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 md:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('addresses.first_name')}</label>
                <input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} autoComplete="given-name" className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-gray-900 transition-colors text-sm" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('addresses.last_name')}</label>
                <input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} autoComplete="family-name" className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-gray-900 transition-colors text-sm" />
              </div>
              <div className="sm:col-span-2 flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('addresses.address')}</label>
                <input value={form.addressLine1} onChange={(e) => setForm({ ...form, addressLine1: e.target.value })} autoComplete="address-line1" className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-gray-900 transition-colors text-sm" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('addresses.city')}</label>
                <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} autoComplete="address-level2" className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-gray-900 transition-colors text-sm" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('addresses.state')}</label>
                <input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} autoComplete="address-level1" className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-gray-900 transition-colors text-sm" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('addresses.zip_code')}</label>
                <input value={form.zipCode} onChange={(e) => setForm({ ...form, zipCode: e.target.value })} autoComplete="postal-code" className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-gray-900 transition-colors text-sm" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('addresses.country')}</label>
                <input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} autoComplete="country-name" className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-gray-900 transition-colors text-sm" />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button className="px-4 py-2.5 rounded-xl border-2 border-gray-200 text-xs font-medium text-gray-700 hover:border-gray-400 transition-colors" onClick={() => setShowForm(false)}>{t('addresses.cancel')}</button>
              <button className="px-4 py-2.5 rounded-xl bg-gray-900 text-white text-xs font-bold hover:bg-gray-800 transition-colors" onClick={handleSave}>{t('addresses.save')}</button>
            </div>
          </div>
        </div>
      )}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {addresses.map((a) => (
            <div key={a.id} className={`bg-white border-2 rounded-xl p-4 md:p-5 transition-all hover:shadow-md ${
              a.isDefault ? 'border-gray-900 shadow-sm' : 'border-gray-100 hover:border-gray-300'
            }`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <MapPin size={16} />
                  <strong className="text-sm text-gray-900">{a.type}</strong>
                </div>
                {a.isDefault && (
                  <span className="text-[10px] font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full">{t('addresses.default')}</span>
                )}
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                {a.firstName} {a.lastName}<br />
                {a.addressLine1}<br />
                {a.city}, {a.state} {a.zipCode}<br />
                {a.country}
              </p>
              <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
                {!a.isDefault && (
                  <button className="text-xs font-medium text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-gray-400 transition-all" onClick={() => handleSetDefault(a.id)}>
                    {t('addresses.set_default')}
                  </button>
                )}
                <button className="text-xs font-medium text-red-600 hover:text-red-700 px-3 py-1.5 rounded-lg border border-red-200 hover:border-red-400 transition-all ml-auto" onClick={() => handleDelete(a.id)}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
