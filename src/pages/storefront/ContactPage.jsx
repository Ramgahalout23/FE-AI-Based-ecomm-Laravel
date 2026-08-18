import { ArrowRight, Clock, Mail, MapPin, MessageCircle, Phone, Send } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import SEOHead from '../../components/seo/SEOHead';
import { withStoreName } from '../../utils/seo';
import Breadcrumb from '../../components/common/Breadcrumb';
import { useSettings } from '../../store/useSettings';
import { contactAPI } from '../../api/contact';
import toast from '../../utils/toast';

/* Brand design tokens (matches tailwind.config.js / tokens.css) */
const INK = '#1a1a1a';
const PAPER = '#ffffff';
const THREAD = '#4a4a5a';
const STONE = '#8a8a9a';
const displayFont = { fontFamily: 'var(--font-display)', fontWeight: 800 };

export default function ContactPage() {
  const { t } = useTranslation();
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [loading, setLoading] = useState(false);
  const { getSetting } = useSettings();
  const storeName = getSetting('storeName', 'THREVOLT');
  const storeAddress = getSetting('storeAddress', 'Girdharkunj Colony, Sonkh Rd, near Narsi Vihar Colony, Mathura, Maholi, Uttar Pradesh 281004');
  const contactEmail = getSetting('contactEmail', 'support@threvolt.com');
  const contactPhone = getSetting('contactPhone', '+91 98765 43210');
  const whatsappNumber = String(getSetting('whatsappButtonNumber', '') || '');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error(t('contact.required_fields'));
      return;
    }
    setLoading(true);
    try {
      await contactAPI.send({
        name: form.name,
        email: form.email,
        phone: form.phone,
        message: form.message,
      });
      toast.success(t('contact.success_message'));
      setForm({ name: '', email: '', phone: '', message: '' });
    } catch (err) {
      const msg = err.response?.data?.message;
      toast.error(msg || t('contact.error_message'));
    } finally {
      setLoading(false);
    }
  };

  const channels = [
    { icon: Mail, label: t('contact.email'), value: contactEmail, href: 'mailto:' + contactEmail },
    { icon: Phone, label: t('contact.phone'), value: contactPhone, href: 'tel:' + contactPhone.replace(/[^+\d]/g, '') },
    ...(whatsappNumber
      ? [{ icon: MessageCircle, label: t('contact.whatsapp'), value: whatsappNumber, href: 'https://wa.me/' + whatsappNumber.replace(/[^0-9]/g, '') }]
      : []),
    { icon: MapPin, label: t('contact.address'), value: storeAddress, href: null },
    { icon: Clock, label: t('contact.hours'), value: t('contact.hours_value'), href: null },
  ];

  const quickLinks = [
    { label: t('contact.faq'), href: '/support' },
    { label: t('contact.shipping_info'), href: '/track-order' },
    { label: t('contact.returns_exchange'), href: '/return-policy' },
    { label: t('contact.size_guide'), href: '/products' },
  ];

  return (
    <div className="page-content bg-white">
      <style>{`
        .contact-hero-mark { animation: contact-rise 0.8s cubic-bezier(0.16, 1, 0.3, 1) both; }
        @keyframes contact-rise { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        .contact-marquee { animation: contact-marquee 26s linear infinite; }
        @keyframes contact-marquee { to { transform: translateX(-50%); } }
        .contact-card { transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease; }
        .contact-card:hover { transform: translateY(-4px); box-shadow: 0 14px 36px rgba(0,0,0,0.1); border-color: ${INK} !important; }
        .contact-link { text-decoration: underline; text-underline-offset: 3px; text-decoration-color: transparent; transition: text-decoration-color 0.2s ease; }
        .contact-link:hover { text-decoration-color: ${INK}; }
        .contact-input {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.12);
          color: #fff;
          border-radius: 12px;
          padding: 13px 16px;
          width: 100%;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
        }
        .contact-input::placeholder { color: rgba(255,255,255,0.3); }
        .contact-input:focus { border-color: rgba(255,255,255,0.5); box-shadow: 0 0 0 3px rgba(255,255,255,0.08); background: rgba(255,255,255,0.08); }
        @media (max-width: 900px) {
          .contact-main-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <SEOHead
        title={withStoreName('Contact Us', storeName)}
        description={'Get in touch with ' + storeName + '. Contact our support team for orders, returns, product inquiries, or general questions. We\'re here to help.'}
        keywords="contact us, customer support, luxury streetwear help, order support"
      />

      {/* HERO */}
      <header style={{ background: 'linear-gradient(165deg, #141416 0%, #000000 100%)', color: PAPER, padding: '96px 24px 84px', position: 'relative', overflow: 'hidden', textAlign: 'center' }}>
        <div aria-hidden style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: 'clamp(110px, 22vw, 320px)', fontWeight: 800, color: 'rgba(255,255,255,0.035)', letterSpacing: '-0.04em', whiteSpace: 'nowrap', pointerEvents: 'none', ...displayFont }}>
          {t('contact.hero_watermark', { defaultValue: 'HELLO' })}
        </div>
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 820, margin: '0 auto' }}>
          <Breadcrumb
            items={[
              { label: t('nav.home', { defaultValue: 'Home' }), href: '/' },
              { label: t('contact.hero_title', { defaultValue: 'Contact Us' }) },
            ]}
            variant="dark"
            className="justify-center mb-6"
          />
          <div style={{ fontSize: 11, letterSpacing: '0.35em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', fontWeight: 700, marginBottom: 18 }}>
            {t('contact.eyebrow', { defaultValue: 'Get in Touch' })}
          </div>
          <h1 className="contact-hero-mark" style={{ fontSize: 'clamp(46px, 7vw, 78px)', lineHeight: 1.02, letterSpacing: '-0.03em', margin: '0 0 22px', ...displayFont }}>
            {t('contact.hero_title', { defaultValue: 'Contact Us' })}
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.7, color: 'rgba(255,255,255,0.72)', maxWidth: 560, margin: '0 auto 38px' }}>
            {t('contact.hero_desc', { defaultValue: "We'd love to hear from you. Drop us a message!" })}
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a
              href={'mailto:' + contactEmail}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: PAPER, color: INK, textDecoration: 'none', borderRadius: 999, padding: '14px 30px', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', boxShadow: '0 8px 24px rgba(0,0,0,0.35)', transition: 'all 0.2s' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#f2f2f2'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = PAPER; }}
            >
              {t('contact.cta_button', { defaultValue: 'Email Us' })} <Mail size={15} />
            </a>
            <a
              href={'tel:' + contactPhone.replace(/[^+\d]/g, '')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'transparent', color: PAPER, textDecoration: 'none', borderRadius: 999, padding: '14px 30px', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', border: '1px solid rgba(255,255,255,0.35)', transition: 'all 0.2s' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              {t('contact.phone', { defaultValue: 'Phone' })} <Phone size={15} />
            </a>
          </div>
        </div>
      </header>

      {/* MARQUEE */}
      <div style={{ background: INK, overflow: 'hidden', padding: '16px 0' }}>
        <div className="contact-marquee" style={{ display: 'flex', width: 'max-content' }}>
          {[0, 1].map((k) => (
            <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 48, paddingRight: 48, fontSize: 11, fontWeight: 700, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', whiteSpace: 'nowrap' }}>
              {t('contact.marquee_item', { defaultValue: 'Email Us ✦ Call Us ✦ We Reply Within 24 Hours ✦ Support 7 Days a Week' })}
              {t('contact.marquee_item', { defaultValue: 'Email Us ✦ Call Us ✦ We Reply Within 24 Hours ✦ Support 7 Days a Week' })}
            </span>
          ))}
        </div>
      </div>

      {/* MAIN */}
      <section style={{ background: '#fafafa', padding: '96px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div className="contact-main-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <span style={{ width: 34, height: 2, background: INK }} />
                <span style={{ fontSize: 11, letterSpacing: '0.3em', textTransform: 'uppercase', color: STONE, fontWeight: 700 }}>
                  {t('contact.info_label', { defaultValue: 'Direct Lines' })}
                </span>
              </div>
              <h2 style={{ fontSize: 'clamp(30px, 4vw, 44px)', lineHeight: 1.08, letterSpacing: '-0.02em', margin: '0 0 14px', ...displayFont }}>
                {t('contact.get_in_touch', { defaultValue: 'Get in Touch' })}
              </h2>
              <p style={{ fontSize: 15.5, lineHeight: 1.85, color: THREAD, margin: '0 0 26px' }}>
                {t('contact.questions_desc', { defaultValue: 'Have questions about our products, orders, or anything else? We\'re here to help!' })}
              </p>

              {channels.map((c, i) => {
                const Icon = c.icon;
                return (
                  <div key={i} style={{ display: 'flex', gap: 18, alignItems: 'flex-start', padding: '18px 0', borderBottom: i < channels.length - 1 ? '1px dashed rgba(0,0,0,0.1)' : 'none' }}>
                    <div style={{ width: 46, height: 46, borderRadius: 13, background: INK, color: PAPER, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={20} strokeWidth={1.8} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: STONE, marginBottom: 4 }}>
                        {c.label}
                      </div>
                      {c.href ? (
                        <a href={c.href} className="contact-link" style={{ fontSize: 15.5, fontWeight: 600, color: INK, textDecoration: 'none', wordBreak: 'break-word' }}>
                          {c.value}
                        </a>
                      ) : (
                        <div style={{ fontSize: 15.5, fontWeight: 600, color: INK }}>{c.value}</div>
                      )}
                    </div>
                  </div>
                );
              })}

              <div style={{ marginTop: 24, display: 'inline-flex', alignItems: 'center', gap: 10, background: PAPER, border: '1px solid rgba(0,0,0,0.07)', borderRadius: 999, padding: '10px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <span style={{ width: 8, height: 8, borderRadius: 99, background: '#22c55e', flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: THREAD }}>
                  {t('contact.response_time', { defaultValue: 'We usually respond within 24 hours on business days.' })}
                </span>
              </div>

              <div style={{ marginTop: 40 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: INK, margin: '0 0 16px' }}>
                  {t('contact.need_quick_help', { defaultValue: 'Need Quick Help?' })}
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                  {quickLinks.map((q, i) => (
                    <a
                      key={i}
                      href={q.href}
                      className="contact-card"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, background: PAPER, border: '1px solid rgba(0,0,0,0.07)', borderRadius: 16, padding: '16px 18px', textDecoration: 'none', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
                    >
                      <span style={{ fontSize: 13.5, fontWeight: 600, color: INK }}>{q.label}</span>
                      <ArrowRight size={15} style={{ color: STONE, flexShrink: 0 }} />
                    </a>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ background: 'linear-gradient(165deg, #1a1a1a, #0c0c0e)', borderRadius: 24, padding: '44px 36px', color: PAPER, position: 'relative', overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,0.25)' }}>
              <div aria-hidden style={{ position: 'absolute', inset: 14, border: '1px dashed rgba(255,255,255,0.18)', borderRadius: 18, pointerEvents: 'none' }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 13, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <MessageCircle size={20} strokeWidth={1.8} />
                  </div>
                  <h2 style={{ fontSize: 'clamp(22px, 2.6vw, 26px)', margin: 0, ...displayFont }}>
                    {t('contact.send_message', { defaultValue: 'Send us a Message' })}
                  </h2>
                </div>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.04em', color: 'rgba(255,255,255,0.6)', marginBottom: 8, display: 'block' }}>
                      {t('contact.name_label', { defaultValue: 'Name *' })}
                    </label>
                    <input type="text" className="contact-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t('contact.name_placeholder', { defaultValue: 'Your name' })} autoComplete="name" />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.04em', color: 'rgba(255,255,255,0.6)', marginBottom: 8, display: 'block' }}>
                      {t('contact.email_label', { defaultValue: 'Email *' })}
                    </label>
                    <input type="email" className="contact-input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder={t('contact.email_placeholder', { defaultValue: 'your@email.com' })} autoComplete="email" />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.04em', color: 'rgba(255,255,255,0.6)', marginBottom: 8, display: 'block' }}>
                      {t('contact.phone_label', { defaultValue: 'Phone' })}
                    </label>
                    <input type="tel" className="contact-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder={t('contact.phone_placeholder', { defaultValue: '+91 98765 43210' })} autoComplete="tel" />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.04em', color: 'rgba(255,255,255,0.6)', marginBottom: 8, display: 'block' }}>
                      {t('contact.message_label', { defaultValue: 'Message *' })}
                    </label>
                    <textarea className="contact-input" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={5} style={{ resize: 'none' }} placeholder={t('contact.message_placeholder', { defaultValue: 'How can we help you?' })} />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: PAPER, color: INK, border: 'none', cursor: 'pointer', borderRadius: 999, padding: '15px 24px', fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', transition: 'all 0.2s', opacity: loading ? 0.55 : 1 }}
                    onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = '#f2f2f2'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = PAPER; }}
                  >
                    {loading ? t('contact.sending', { defaultValue: 'Sending...' }) : (<>{t('contact.send', { defaultValue: 'Send Message' })} <Send size={16} /></>)}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '96px 24px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 'clamp(30px, 4.5vw, 44px)', lineHeight: 1.1, letterSpacing: '-0.02em', margin: '0 0 14px', ...displayFont }}>
          {t('contact.cta_title', { defaultValue: 'Prefer Email?' })}
        </h2>
        <p style={{ fontSize: 15.5, color: THREAD, margin: '0 auto 36px', maxWidth: 480, lineHeight: 1.7 }}>
          {t('contact.cta_desc', { defaultValue: 'Drop us a line — we usually reply within 24 hours.' })}
        </p>
        <a
          href={'mailto:' + contactEmail}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: INK, color: PAPER, textDecoration: 'none', borderRadius: 999, padding: '15px 36px', fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', boxShadow: '0 10px 28px rgba(26,26,26,0.25)', transition: 'all 0.2s' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#000'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = INK; e.currentTarget.style.transform = 'none'; }}
        >
          {t('contact.cta_button', { defaultValue: 'Email Us' })} <ArrowRight size={16} />
        </a>
      </section>
    </div>
  );
}
