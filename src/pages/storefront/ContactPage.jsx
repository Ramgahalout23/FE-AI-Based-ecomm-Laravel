import { Send, Mail, MessageCircle, MapPin, Clock, Phone } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import SEOHead from '../../components/seo/SEOHead';
import Breadcrumb from '../../components/common/Breadcrumb';
import { useSettings } from '../../store/useSettings';
import toast from '../../utils/toast';

export default function ContactPage() {
  const { t } = useTranslation();
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [loading, setLoading] = useState(false);
  const { getSetting } = useSettings();
  const storeName = getSetting('storeName', 'THREVOLT');
  const storeAddress = getSetting('storeAddress', 'Mumbai, Maharashtra, India');
  const contactEmail = getSetting('contactEmail', 'support@threvolt.com');
  const contactPhone = getSetting('contactPhone', '+91 98765 43210');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error(t('contact.required_fields'));
      return;
    }
    setLoading(true);
    setTimeout(() => {
      toast.success(t('contact.success_message'));
      setForm({ name: '', email: '', phone: '', message: '' });
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="page-content bg-white">
      {/* SEO meta tags */}
      <SEOHead
        title={`Contact Us | ${storeName}`}
        description={`Get in touch with ${storeName}. Contact our support team for orders, returns, product inquiries, or general questions. We're here to help.`}
        keywords="contact us, customer support, luxury streetwear help, order support"
      />

      {/* Hero */}
      <div className="bg-black text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Breadcrumb
            items={[    {label: t('nav.home'), href: '/' },
    { label: t('contact.hero_title') },
            ]}
            variant="dark"
            className="justify-center mb-6"
          />
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">{t('contact.hero_title')}</h1>
          <p className="text-lg text-gray-300">{t('contact.hero_desc')}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-2 gap-12">
          {/* Contact Info */}
          <div>
            <h2 className="font-display text-2xl font-bold text-black mb-6">{t('contact.get_in_touch')}</h2>
            <p className="text-gray-600 mb-8">
              {t('contact.questions_desc')}
            </p>
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center flex-shrink-0">
                  <Mail size={20} />
                </div>
                <div>
                  <div className="font-semibold text-black">{t('contact.email')}</div>
                  <div className="text-gray-500">{contactEmail}</div>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center flex-shrink-0">
                  <Phone className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="font-semibold text-black">{t('contact.phone')}</div>
                  <div className="text-gray-500">{contactPhone}</div>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="font-semibold text-black">{t('contact.address')}</div>
                  <div className="text-gray-500">{storeAddress}</div>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="font-semibold text-black">{t('contact.hours')}</div>
                  <div className="text-gray-500">{t('contact.hours_value')}</div>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="mt-10 p-6 bg-gray-50 rounded-xl">
              <h3 className="font-semibold text-black mb-4">{t('contact.need_quick_help')}</h3>
              <div className="space-y-2">
                <a href="/faq" className="block text-gray-600 hover:text-black transition-colors">→ {t('contact.faq')}</a>
                <a href="/shipping" className="block text-gray-600 hover:text-black transition-colors">→ {t('contact.shipping_info')}</a>
                <a href="/returns" className="block text-gray-600 hover:text-black transition-colors">→ {t('contact.returns_exchange')}</a>
                <a href="/size-guide" className="block text-gray-600 hover:text-black transition-colors">→ {t('contact.size_guide')}</a>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-gray-50 p-8 rounded-2xl">
            <div className="flex items-center gap-2 mb-6">
              <MessageCircle className="w-6 h-6 text-black" />
              <h2 className="font-display text-2xl font-bold text-black">{t('contact.send_message')}</h2>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('contact.name_label')}</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-black transition-colors"
                  placeholder={t('contact.name_placeholder')}
                  autoComplete="name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('contact.email_label')}</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-black transition-colors"
                  placeholder={t('contact.email_placeholder')}
                  autoComplete="email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('contact.phone_label')}</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-black transition-colors"
                  placeholder={t('contact.phone_placeholder')}
                  autoComplete="tel"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('contact.message_label')}</label>
                <textarea
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  rows={5}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-black transition-colors resize-none"
                  placeholder={t('contact.message_placeholder')}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-black text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                {loading ? t('contact.sending') : <>{t('contact.send')} <Send size={18} /></>}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}