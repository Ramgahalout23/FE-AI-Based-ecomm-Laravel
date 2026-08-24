import { ArrowRight, Package, Truck, RefreshCw, CreditCard, HelpCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import SEOHead from '../../components/seo/SEOHead';
import { withStoreName } from '../../utils/seo';
import ContentPageHero from '../../components/storefront/ContentPageHero';
import ContentMarquee from '../../components/storefront/ContentMarquee';
import ContentCtaCard from '../../components/storefront/ContentCtaCard';
import { ContentFaqAccordion } from '../../components/storefront/ContentSections';
import { useSettings } from '../../store/useSettings';

export default function FaqPage() {
  const { t } = useTranslation();
  const { getSetting } = useSettings();
  const storeName = getSetting('storeName', 'THREVOLT');

  const groups = [
    {
      icon: Package,
      label: t('faq.group_orders', { defaultValue: 'Orders' }),
      faqs: [
        { q: t('faq.o1_q', { defaultValue: 'How do I track my order?' }), a: t('faq.o1_a', { defaultValue: 'Go to the Track Order page and enter your order number — no login needed. You\'ll see live status, shipping details, and estimated delivery.' }) },
        { q: t('faq.o2_q', { defaultValue: 'Can I cancel or modify my order?' }), a: t('faq.o2_a', { defaultValue: 'Orders can be modified or cancelled within 2 hours of placing them. Contact us right away and we\'ll do our best to help.' }) },
        { q: t('faq.o3_q', { defaultValue: 'Where is my order confirmation?' }), a: t('faq.o3_a', { defaultValue: 'A confirmation email with your order number is sent instantly after checkout. Check your spam folder if you don\'t see it within 5 minutes.' }) },
      ],
    },
    {
      icon: Truck,
      label: t('faq.group_shipping', { defaultValue: 'Shipping & Delivery' }),
      faqs: [
        { q: t('faq.s1_q', { defaultValue: 'How long does delivery take?' }), a: t('faq.s1_a', { defaultValue: 'Standard delivery is 3–5 business days across India (2–3 days in metro cities). Express is 1–2 days. Orders placed before 1 PM ship the same day.' }) },
        { q: t('faq.s2_q', { defaultValue: 'Is shipping really free?' }), a: t('faq.s2_a', { defaultValue: 'Yes — free shipping on all orders above ₹499. Below that, standard delivery is a flat ₹49.' }) },
        { q: t('faq.s3_q', { defaultValue: 'Do you ship internationally?' }), a: t('faq.s3_a', { defaultValue: 'Currently we ship across India. International shipping is coming soon — join our newsletter to be the first to know.' }) },
      ],
    },
    {
      icon: RefreshCw,
      label: t('faq.group_returns', { defaultValue: 'Returns & Exchanges' }),
      faqs: [
        { q: t('faq.r1_q', { defaultValue: 'What is your return policy?' }), a: t('faq.r1_a', { defaultValue: 'Easy 7-day returns and exchanges on every order. Free pickup across India, full refunds on eligible items — no questions asked.' }) },
        { q: t('faq.r2_q', { defaultValue: 'How do I start a return?' }), a: t('faq.r2_a', { defaultValue: 'Head to the Returns page from your account, select the order and items, and we\'ll arrange a free pickup within 24 hours.' }) },
        { q: t('faq.r3_q', { defaultValue: 'When will I get my refund?' }), a: t('faq.r3_a', { defaultValue: 'Refunds are processed within 3–5 business days after the returned items are received and inspected.' }) },
      ],
    },
    {
      icon: CreditCard,
      label: t('faq.group_payments', { defaultValue: 'Payments' }),
      faqs: [
        { q: t('faq.p1_q', { defaultValue: 'What payment methods do you accept?' }), a: t('faq.p1_a', { defaultValue: 'We accept all major UPI apps, credit/debit cards, net banking, and Cash on Delivery (COD) on eligible orders.' }) },
        { q: t('faq.p2_q', { defaultValue: 'Is my payment secure?' }), a: t('faq.p2_a', { defaultValue: 'Yes — all payments are encrypted and processed through trusted, PCI-DSS compliant payment gateways. We never store your card details.' }) },
        { q: t('faq.p3_q', { defaultValue: 'Do you offer Cash on Delivery?' }), a: t('faq.p3_a', { defaultValue: 'Yes, COD is available on most orders across India at a small convenience fee.' }) },
      ],
    },
    {
      icon: HelpCircle,
      label: t('faq.group_product', { defaultValue: 'Products & Sizing' }),
      faqs: [
        { q: t('faq.pr1_q', { defaultValue: 'How do I find my size?' }), a: t('faq.pr1_a', { defaultValue: 'Use our Size Guide — it has garment measurements for tees, hoodies, and bottoms plus tips on measuring yourself.' }) },
        { q: t('faq.pr2_q', { defaultValue: 'Will the print fade or crack?' }), a: t('faq.pr2_a', { defaultValue: 'Our prints use high-durability inks that stay bold through washes — just follow the care instructions (wash cold, hang dry, iron inside-out).' }) },
        { q: t('faq.pr3_q', { defaultValue: 'Do your clothes shrink?' }), a: t('faq.pr3_a', { defaultValue: 'Our 240 GSM combed cotton is pre-shrunk. Follow the care label (cold wash, no tumble dry) and your fit stays true.' }) },
      ],
    },
  ];

  return (
    <div className="page-content bg-white">
      <SEOHead
        title={withStoreName('FAQs', storeName)}
        description={`Frequently asked questions about ${storeName}: orders, shipping, returns, payments, and sizing. Quick answers to everything you need to know.`}
        canonicalUrl={`${window.location.origin}/faq`}
      />
      {/* FAQPage JSON-LD for Google rich results */}
      <Helmet>
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: groups.flatMap(g => g.faqs.map(faq => ({
            '@type': 'Question',
            name: faq.q,
            acceptedAnswer: {
              '@type': 'Answer',
              text: faq.a,
            },
          }))),
        })}</script>
      </Helmet>

      <ContentPageHero
        watermark={t('faq.watermark', { defaultValue: 'HELP' })}
        eyebrow={t('faq.eyebrow', { defaultValue: 'We\'ve Got Answers' })}
        title={t('faq.title', { defaultValue: 'FAQs' })}
        description={t('faq.hero_desc', { store: storeName, defaultValue: `Everything you need to know about ordering, shipping, and returns at ${storeName}.` })}
        breadcrumb={[
          { label: t('nav.home', { defaultValue: 'Home' }), href: '/' },
          { label: t('faq.title', { defaultValue: 'FAQs' }) },
        ]}
        ctas={[
          { label: t('faq.cta_contact', { defaultValue: 'Contact Support' }), href: '/contact' },
        ]}
      />

      <ContentMarquee
        items={[
          t('faq.marquee_1', { defaultValue: '24-Hour Response' }),
          t('faq.marquee_2', { defaultValue: '7-Day Easy Returns' }),
          t('faq.marquee_3', { defaultValue: 'Free Shipping Above ₹499' }),
        ]}
      />

      {/* Searchable accordion */}
      <ContentFaqAccordion
        groups={groups}
        placeholder={t('faq.search_placeholder', { defaultValue: 'Search questions — e.g. "return" or "shipping"' })}
      />

      <ContentCtaCard
        title={t('faq.cta_title', { defaultValue: 'Still Have Questions?' })}
        description={t('faq.cta_desc', { defaultValue: 'Our support team replies within 24 hours — 7 days a week.' })}
      >
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link
            to="/contact"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#ffffff', color: '#1a1a1a', textDecoration: 'none', borderRadius: 999, padding: '15px 36px', fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', boxShadow: '0 10px 28px rgba(0,0,0,0.35)', transition: 'all 0.2s' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#f2f2f2'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.transform = 'none'; }}
          >
            {t('faq.cta_contact', { defaultValue: 'Contact Support' })} <ArrowRight size={16} />
          </Link>
          <Link
            to="/track-order"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'transparent', color: '#ffffff', textDecoration: 'none', borderRadius: 999, padding: '15px 36px', fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', border: '1px solid rgba(255,255,255,0.35)', transition: 'all 0.2s' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            {t('faq.cta_track', { defaultValue: 'Track an Order' })}
          </Link>
        </div>
      </ContentCtaCard>
    </div>
  );
}
