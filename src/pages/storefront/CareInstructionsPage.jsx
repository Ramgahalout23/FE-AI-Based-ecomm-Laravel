import { Droplets, Sun, Shirt, ShieldCheck, Ban, Waves, Sparkles, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import SEOHead from '../../components/seo/SEOHead';
import { withStoreName } from '../../utils/seo';
import ContentPageHero from '../../components/storefront/ContentPageHero';
import ContentMarquee from '../../components/storefront/ContentMarquee';
import ContentCtaCard from '../../components/storefront/ContentCtaCard';
import {
  ContentSectionHeader,
  ContentFeatureGrid,
  ContentFeatureCard,
  ContentHelpStrip,
} from '../../components/storefront/ContentSections';
import { useSettings } from '../../store/useSettings';

const INK = '#1a1a1a';
const PAPER = '#ffffff';
const THREAD = '#4a4a5a';

export default function CareInstructionsPage() {
  const { t } = useTranslation();
  const { getSetting } = useSettings();
  const storeName = getSetting('storeName', 'THREVOLT');

  const washMethods = [
    { icon: Droplets, title: t('care.wash_title', { defaultValue: 'Machine Wash Cold' }), desc: t('care.wash_desc', { defaultValue: 'Turn your garment inside out and machine wash at 30°C (cold) with similar colours. Cold water keeps the print and fabric looking fresh.' }) },
    { icon: Shirt, title: t('care.dry_title', { defaultValue: 'Hang Dry Only' }), desc: t('care.dry_desc', { defaultValue: 'Hang your garment to dry in the shade. Avoid tumble drying — the heat can shrink the fabric and crack the print.' }) },
    { icon: Sun, title: t('care.iron_title', { defaultValue: 'Iron Inside-Out' }), desc: t('care.iron_desc', { defaultValue: 'Iron on a low-medium setting, always on the inside of the garment. Never iron directly over the print.' }) },
    { icon: Waves, title: t('care.detergent_title', { defaultValue: 'Mild Detergent' }), desc: t('care.detergent_desc', { defaultValue: 'Use a mild liquid detergent. Avoid bleach, fabric softeners, and harsh chemicals that fade colour and damage prints.' }) },
  ];

  const doList = [
    { icon: Sparkles, text: t('care.do1', { defaultValue: 'Wash with similar colours to avoid colour transfer.' }) },
    { icon: Sparkles, text: t('care.do2', { defaultValue: 'Zip up hoodies and fasten buttons before washing.' }) },
    { icon: Sparkles, text: t('care.do3', { defaultValue: 'Store folded in a cool, dry place away from direct sunlight.' }) },
  ];

  const dontList = [
    { icon: Ban, text: t('care.dont1', { defaultValue: 'Do not use bleach or chlorine-based cleaners.' }) },
    { icon: Ban, text: t('care.dont2', { defaultValue: 'Do not tumble dry or wring out your garment.' }) },
    { icon: Ban, text: t('care.dont3', { defaultValue: 'Do not iron or steam directly over the printed design.' }) },
  ];

  const guarantee = [
    { icon: ShieldCheck, title: t('care.g1_title', { defaultValue: '240 GSM Combed Cotton' }), desc: t('care.g1_desc', { defaultValue: 'Premium heavyweight fabric that holds its shape through washes.' }) },
    { icon: ShieldCheck, title: t('care.g2_title', { defaultValue: 'High-Durability Prints' }), desc: t('care.g2_desc', { defaultValue: 'Inks engineered to stay bold — no cracking or fading when cared for properly.' }) },
    { icon: ShieldCheck, title: t('care.g3_title', { defaultValue: '7-Day Exchange' }), desc: t('care.g3_desc', { defaultValue: 'Not happy with your piece? Exchange it within 7 days, free pickup.' }) },
  ];

  return (
    <div className="page-content bg-white">
      <SEOHead
        title={withStoreName('Care Instructions', storeName)}
        description={`How to care for your ${storeName} garments: washing, drying, ironing, and storage tips to keep your streetwear looking fresh for years.`}
        canonicalUrl={`${window.location.origin}/care-instructions`}
      />

      <ContentPageHero
        watermark={t('care.watermark', { defaultValue: 'CARE' })}
        eyebrow={t('care.eyebrow', { defaultValue: 'Look After Your Drop' })}
        title={t('care.title', { defaultValue: 'Care Instructions' })}
        description={t('care.hero_desc', { store: storeName, defaultValue: `Simple steps to keep your ${storeName} pieces looking fresh — wash after wash.` })}
        breadcrumb={[
          { label: t('nav.home', { defaultValue: 'Home' }), href: '/' },
          { label: t('care.title', { defaultValue: 'Care Instructions' }) },
        ]}
        ctas={[
          { label: t('care.cta_shop', { defaultValue: 'Shop New Drops' }), href: '/products' },
        ]}
      />

      <ContentMarquee
        items={[
          t('care.marquee_1', { defaultValue: 'Machine Wash Cold' }),
          t('care.marquee_2', { defaultValue: 'Hang Dry Only' }),
          t('care.marquee_3', { defaultValue: 'Iron Inside-Out' }),
        ]}
      />

      {/* Wash methods */}
      <ContentFeatureGrid
        eyebrow={t('care.methods_label', { defaultValue: 'The Golden Rules' })}
        title={t('care.methods_heading', { defaultValue: 'How to Wash & Dry' })}
        items={washMethods}
      />

      {/* Do / Don't */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '56px 24px 28px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
          {[
            { heading: t('care.do_title', { defaultValue: '✓ Do' }), list: doList, color: '#16a34a', bg: 'rgba(34,197,94,0.12)' },
            { heading: t('care.dont_title', { defaultValue: '✕ Don\'t' }), list: dontList, color: '#dc2626', bg: 'rgba(239,68,68,0.12)' },
          ].map((panel, pi) => (
            <div key={pi} style={{ background: '#fafafa', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 20, padding: '32px 28px' }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: INK, margin: '0 0 18px', fontFamily: 'var(--font-display)' }}>{panel.heading}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {panel.list.map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <span style={{ width: 30, height: 30, borderRadius: 10, background: panel.bg, color: panel.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon size={15} strokeWidth={2.2} />
                      </span>
                      <span style={{ fontSize: 14, lineHeight: 1.6, color: THREAD }}>{item.text}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Quality guarantee — dark section with feature cards */}
      <section style={{ background: 'linear-gradient(165deg, #141416, #000000)', color: PAPER, padding: '84px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <ContentSectionHeader
            eyebrow={t('care.guarantee_label', { defaultValue: 'Built to Last' })}
            title={t('care.guarantee_heading', { defaultValue: 'Our Quality Promise' })}
            dark
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
            {guarantee.map((g, i) => (
              <ContentFeatureCard key={i} {...g} dark />
            ))}
          </div>
        </div>
      </section>

      {/* Help strip */}
      <ContentHelpStrip
        icon={Shirt}
        title={t('care.help_title', { defaultValue: 'Questions about your garment?' })}
        desc={t('care.help_desc', { defaultValue: 'Our team is happy to help with sizing, fabric, or care questions.' })}
        ctaLabel={t('care.help_cta', { defaultValue: 'Contact Us' })}
        ctaTo="/contact"
      />

      <ContentCtaCard
        title={t('care.cta_title', { defaultValue: 'Care For It. Wear It Forever.' })}
        description={t('care.cta_desc', { defaultValue: 'Shop the latest drops — premium fabrics designed to stay fresh with simple care.' })}
      >
        <a
          href="/products"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: PAPER, color: INK, textDecoration: 'none', borderRadius: 999, padding: '15px 36px', fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', boxShadow: '0 10px 28px rgba(0,0,0,0.35)', transition: 'all 0.2s' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#f2f2f2'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = PAPER; e.currentTarget.style.transform = 'none'; }}
        >
          {t('care.cta_button', { defaultValue: 'Shop Now' })} <ArrowRight size={16} />
        </a>
      </ContentCtaCard>
    </div>
  );
}
