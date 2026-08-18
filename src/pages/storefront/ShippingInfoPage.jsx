import { Truck, Package, Clock, MapPin, ShieldCheck, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import SEOHead from '../../components/seo/SEOHead';
import { withStoreName } from '../../utils/seo';
import ContentPageHero from '../../components/storefront/ContentPageHero';
import ContentMarquee from '../../components/storefront/ContentMarquee';
import ContentCtaCard from '../../components/storefront/ContentCtaCard';
import {
  ContentFeatureGrid,
  ContentDarkSteps,
  ContentFaqList,
  ContentMeta,
} from '../../components/storefront/ContentSections';
import { useSettings } from '../../store/useSettings';

export default function ShippingInfoPage() {
  const { t } = useTranslation();
  const { getSetting } = useSettings();
  const storeName = getSetting('storeName', 'THREVOLT');

  const methods = [
    {
      icon: Package,
      title: t('shipping.standard_title', { defaultValue: 'Standard Delivery' }),
      desc: t('shipping.standard_desc', { defaultValue: '3–5 business days across India. Free on orders above ₹499, otherwise ₹49 flat.' }),
      footer: (
        <div style={{ borderTop: '1px dashed rgba(0,0,0,0.1)', paddingTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
          <ContentMeta icon={Clock}>{t('shipping.standard_time', { defaultValue: '3–5 business days' })}</ContentMeta>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#1a1a1a' }}>{t('shipping.standard_price', { defaultValue: 'FREE above ₹499 · ₹49 flat' })}</span>
        </div>
      ),
    },
    {
      icon: Truck,
      title: t('shipping.express_title', { defaultValue: 'Express Delivery' }),
      desc: t('shipping.express_desc', { defaultValue: 'Next-day or 2-day delivery in metro cities. Dispatched same day when ordered before 1 PM.' }),
      footer: (
        <div style={{ borderTop: '1px dashed rgba(0,0,0,0.1)', paddingTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
          <ContentMeta icon={Clock}>{t('shipping.express_time', { defaultValue: '1–2 business days' })}</ContentMeta>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#1a1a1a' }}>{t('shipping.express_price', { defaultValue: '₹99 flat' })}</span>
        </div>
      ),
    },
    {
      icon: MapPin,
      title: t('shipping.pickup_title', { defaultValue: 'Store Pickup' }),
      desc: t('shipping.pickup_desc', { defaultValue: 'Order online and pick up in-store within 2 business days. We\'ll notify you the moment it\'s ready.' }),
      footer: (
        <div style={{ borderTop: '1px dashed rgba(0,0,0,0.1)', paddingTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
          <ContentMeta icon={Clock}>{t('shipping.pickup_time', { defaultValue: 'Ready in 2 business days' })}</ContentMeta>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#1a1a1a' }}>{t('shipping.pickup_price', { defaultValue: 'FREE' })}</span>
        </div>
      ),
    },
  ];

  const steps = [
    { num: '01', title: t('shipping.step1_title', { defaultValue: 'Order Confirmed' }), desc: t('shipping.step1_desc', { defaultValue: 'You\'ll get an instant confirmation with your order number and estimated delivery window.' }) },
    { num: '02', title: t('shipping.step2_title', { defaultValue: 'Packed & Dispatched' }), desc: t('shipping.step2_desc', { defaultValue: 'Orders placed before 1 PM ship the same day. You\'ll receive tracking details via email and SMS.' }) },
    { num: '03', title: t('shipping.step3_title', { defaultValue: 'In Transit' }), desc: t('shipping.step3_desc', { defaultValue: 'Track your package in real-time from the Track Order page — no login needed.' }) },
    { num: '04', title: t('shipping.step4_title', { defaultValue: 'Delivered' }), desc: t('shipping.step4_desc', { defaultValue: 'Unbox your order and enjoy. Easy 7-day returns and free pickup if anything\'s not perfect.' }) },
  ];

  const faqs = [
    { q: t('shipping.faq1_q', { defaultValue: 'How long does delivery take?' }), a: t('shipping.faq1_a', { defaultValue: 'Standard delivery takes 3–5 business days across India. Metro cities typically receive orders within 2–3 days. Express delivery is 1–2 days.' }) },
    { q: t('shipping.faq2_q', { defaultValue: 'Do you ship internationally?' }), a: t('shipping.faq2_a', { defaultValue: 'Currently we ship across India. International shipping is coming soon — join our newsletter to be the first to know.' }) },
    { q: t('shipping.faq3_q', { defaultValue: 'Can I change my delivery address after ordering?' }), a: t('shipping.faq3_a', { defaultValue: 'Yes — contact us within 2 hours of placing your order and we\'ll update the address at no charge. After that, the order may already be in transit.' }) },
    { q: t('shipping.faq4_q', { defaultValue: 'What if my package is lost or damaged?' }), a: t('shipping.faq4_a', { defaultValue: 'We\'ve got you covered. Every order is insured — if your package arrives damaged or gets lost, we\'ll send a free replacement or issue a full refund.' }) },
  ];

  return (
    <div className="page-content bg-white">
      <SEOHead
        title={withStoreName('Shipping Info', storeName)}
        description={`Shipping details for ${storeName}: delivery methods, timelines, and costs across India. Free shipping on orders above ₹499.`}
      />

      <ContentPageHero
        watermark={t('shipping.watermark', { defaultValue: 'SHIP' })}
        eyebrow={t('shipping.eyebrow', { defaultValue: 'Fast & Reliable' })}
        title={t('shipping.title', { defaultValue: 'Shipping Info' })}
        description={t('shipping.hero_desc', { store: storeName, defaultValue: `From our warehouse to your doorstep — fast, tracked, and always on time.` })}
        breadcrumb={[
          { label: t('nav.home', { defaultValue: 'Home' }), href: '/' },
          { label: t('shipping.title', { defaultValue: 'Shipping Info' }) },
        ]}
        ctas={[
          { label: t('shipping.cta_track', { defaultValue: 'Track Your Order' }), href: '/track-order' },
        ]}
      />

      <ContentMarquee
        items={[
          t('shipping.marquee_1', { defaultValue: 'Free Shipping Above ₹499' }),
          t('shipping.marquee_2', { defaultValue: 'Same-Day Dispatch Before 1 PM' }),
          t('shipping.marquee_3', { defaultValue: 'Real-Time Tracking' }),
        ]}
      />

      {/* Delivery methods */}
      <ContentFeatureGrid
        eyebrow={t('shipping.methods_label', { defaultValue: 'Delivery Options' })}
        title={t('shipping.methods_heading', { defaultValue: 'Choose Your Speed' })}
        items={methods}
      />

      {/* Timeline */}
      <ContentDarkSteps
        eyebrow={t('shipping.timeline_label', { defaultValue: 'The Journey' })}
        title={t('shipping.timeline_heading', { defaultValue: 'From Order to Doorstep' })}
        steps={steps}
      />

      {/* FAQ */}
      <ContentFaqList
        eyebrow={t('shipping.faq_label', { defaultValue: 'FAQs' })}
        title={t('shipping.faq_heading', { defaultValue: 'Shipping Questions' })}
        faqs={faqs}
        note={t('shipping.insurance_note', { defaultValue: 'Every order is insured against loss and damage — replacements and refunds guaranteed.' })}
        noteIcon={ShieldCheck}
      />

      <ContentCtaCard
        title={t('shipping.cta_title', { defaultValue: 'Questions About Your Order?' })}
        description={t('shipping.cta_desc', { defaultValue: 'Track your package in real-time or reach our support team — we\'re here 7 days a week.' })}
      >
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a
            href="/track-order"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#ffffff', color: '#1a1a1a', textDecoration: 'none', borderRadius: 999, padding: '15px 36px', fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', boxShadow: '0 10px 28px rgba(0,0,0,0.35)', transition: 'all 0.2s' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#f2f2f2'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.transform = 'none'; }}
          >
            {t('shipping.cta_track', { defaultValue: 'Track Your Order' })} <ArrowRight size={16} />
          </a>
          <Link
            to="/contact"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'transparent', color: '#ffffff', textDecoration: 'none', borderRadius: 999, padding: '15px 36px', fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', border: '1px solid rgba(255,255,255,0.35)', transition: 'all 0.2s' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            {t('shipping.cta_contact', { defaultValue: 'Contact Support' })}
          </Link>
        </div>
      </ContentCtaCard>
    </div>
  );
}
