import { Ruler, Shirt, RefreshCw, HelpCircle, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import SEOHead from '../../components/seo/SEOHead';
import { withStoreName } from '../../utils/seo';
import ContentPageHero from '../../components/storefront/ContentPageHero';
import ContentMarquee from '../../components/storefront/ContentMarquee';
import ContentCtaCard from '../../components/storefront/ContentCtaCard';
import {
  ContentSectionHeader,
  ContentFeatureGrid,
  ContentSizeTable,
  ContentHelpStrip,
} from '../../components/storefront/ContentSections';
import { useSettings } from '../../store/useSettings';

const TEES = [
  { size: 'S', chest: '38–40"', length: '26–27"', shoulder: '17–18"', sleeve: '7–8"' },
  { size: 'M', chest: '40–42"', length: '27–28"', shoulder: '18–19"', sleeve: '8–9"' },
  { size: 'L', chest: '42–44"', length: '28–29"', shoulder: '19–20"', sleeve: '8.5–9.5"' },
  { size: 'XL', chest: '44–46"', length: '29–30"', shoulder: '20–21"', sleeve: '9–10"' },
  { size: 'XXL', chest: '46–48"', length: '30–31"', shoulder: '21–22"', sleeve: '9.5–10.5"' },
];

const HOODIES = [
  { size: 'S', chest: '40–42"', length: '26–27"', sleeve: '32–33"' },
  { size: 'M', chest: '42–44"', length: '27–28"', sleeve: '33–34"' },
  { size: 'L', chest: '44–46"', length: '28–29"', sleeve: '34–35"' },
  { size: 'XL', chest: '46–48"', length: '29–30"', sleeve: '35–36"' },
  { size: 'XXL', chest: '48–50"', length: '30–31"', sleeve: '36–37"' },
];

const BOTTOMS = [
  { size: 'S', waist: '28–30"', hip: '38–40"', inseam: '30–31"' },
  { size: 'M', waist: '30–32"', hip: '40–42"', inseam: '31–32"' },
  { size: 'L', waist: '32–34"', hip: '42–44"', inseam: '32–33"' },
  { size: 'XL', waist: '34–36"', hip: '44–46"', inseam: '33–34"' },
  { size: 'XXL', waist: '36–38"', hip: '46–48"', inseam: '34–35"' },
];

export default function SizeGuidePage() {
  const { t } = useTranslation();
  const { getSetting } = useSettings();
  const storeName = getSetting('storeName', 'THREVOLT');

  const tips = [
    { icon: Shirt, title: t('size_guide.tip_chest_title', { defaultValue: 'Measure Your Chest' }), desc: t('size_guide.tip_chest_desc', { defaultValue: 'Wrap the tape around the fullest part of your chest, keeping it level under your arms.' }) },
    { icon: Ruler, title: t('size_guide.tip_compare_title', { defaultValue: 'Compare to a Favourite Tee' }), desc: t('size_guide.tip_compare_desc', { defaultValue: 'Lay a tee you love flat and measure across the chest — match that number to the chart.' }) },
    { icon: RefreshCw, title: t('size_guide.tip_fit_title', { defaultValue: 'Between Sizes?' }), desc: t('size_guide.tip_fit_desc', { defaultValue: 'Size up for an oversized streetwear look, or stay true to size for a classic slim fit.' }) },
  ];

  const sizeCol = t('size_guide.size_col', { defaultValue: 'Size' });
  const chestCol = t('size_guide.chest_col', { defaultValue: 'Chest' });
  const lengthCol = t('size_guide.length_col', { defaultValue: 'Length' });
  const sleeveCol = t('size_guide.sleeve_col', { defaultValue: 'Sleeve' });
  const measureNote = t('size_guide.measure_note', { defaultValue: 'Measurements are garment measurements, taken flat. Order a size up if you prefer a relaxed/oversized fit.' });

  return (
    <div className="page-content bg-white">
      <SEOHead
        title={withStoreName('Size Guide', storeName)}
        description={`Find your perfect fit at ${storeName}. Garment measurements, fit tips, and size charts for tees, hoodies, and bottoms.`}
      />

      <ContentPageHero
        watermark={t('size_guide.watermark', { defaultValue: 'SIZES' })}
        eyebrow={t('size_guide.eyebrow', { defaultValue: 'Find Your Fit' })}
        title={t('size_guide.title', { defaultValue: 'Size Guide' })}
        description={t('size_guide.hero_desc', { store: storeName, defaultValue: `Garment measurements and fit tips to help you pick the perfect ${storeName} size — every time.` })}
        breadcrumb={[
          { label: t('nav.home', { defaultValue: 'Home' }), href: '/' },
          { label: t('size_guide.title', { defaultValue: 'Size Guide' }) },
        ]}
        ctas={[
          { label: t('size_guide.cta_shop', { defaultValue: 'Shop the Collection' }), href: '/products' },
        ]}
      />

      <ContentMarquee
        items={[
          t('size_guide.marquee_1', { defaultValue: 'Garment Measurements' }),
          t('size_guide.marquee_2', { defaultValue: 'Oversized Fit Friendly' }),
          t('size_guide.marquee_3', { defaultValue: '7-Day Easy Exchange' }),
        ]}
      />

      {/* Fit tips */}
      <ContentFeatureGrid
        eyebrow={t('size_guide.tips_label', { defaultValue: 'How to Measure' })}
        title={t('size_guide.tips_heading', { defaultValue: 'Get the Right Fit' })}
        items={tips}
      />

      {/* Size charts */}
      <section style={{ maxWidth: 1000, margin: '0 auto', padding: '56px 24px 28px' }}>
        <ContentSectionHeader
          eyebrow={t('size_guide.charts_label', { defaultValue: 'Size Charts' })}
          title={t('size_guide.charts_heading', { defaultValue: 'Garment Measurements' })}
          align="left"
          style={{ marginBottom: 36 }}
        />

        <ContentSizeTable
          title={t('size_guide.tees_title', { defaultValue: 'T-Shirts & Tees' })}
          subtitle={t('size_guide.tees_subtitle', { defaultValue: 'Classic & oversized tees — 240 GSM combed cotton.' })}
          columns={[sizeCol, chestCol, lengthCol, t('size_guide.shoulder_col', { defaultValue: 'Shoulder' }), sleeveCol]}
          rows={TEES}
          note={measureNote}
        />

        <ContentSizeTable
          title={t('size_guide.hoodies_title', { defaultValue: 'Hoodies & Sweatshirts' })}
          subtitle={t('size_guide.hoodies_subtitle', { defaultValue: 'Heavyweight fleece — relaxed streetwear fit.' })}
          columns={[sizeCol, chestCol, lengthCol, sleeveCol]}
          rows={HOODIES}
          note={measureNote}
        />

        <ContentSizeTable
          title={t('size_guide.bottoms_title', { defaultValue: 'Bottoms & Joggers' })}
          subtitle={t('size_guide.bottoms_subtitle', { defaultValue: 'Cargo pants & joggers — relaxed tapered fit.' })}
          columns={[sizeCol, t('size_guide.waist_col', { defaultValue: 'Waist' }), t('size_guide.hip_col', { defaultValue: 'Hip' }), t('size_guide.inseam_col', { defaultValue: 'Inseam' })]}
          rows={BOTTOMS}
          note={measureNote}
        />
      </section>

      {/* Help strip */}
      <ContentHelpStrip
        icon={HelpCircle}
        title={t('size_guide.help_title', { defaultValue: 'Still unsure about your size?' })}
        desc={t('size_guide.help_desc', { defaultValue: 'Our team will help you find the perfect fit — we usually reply within 24 hours.' })}
        ctaLabel={t('size_guide.help_cta', { defaultValue: 'Contact Us' })}
        ctaTo="/contact"
      />

      <ContentCtaCard
        title={t('size_guide.cta_title', { defaultValue: 'Ready to Shop?' })}
        description={t('size_guide.cta_desc', { defaultValue: 'Explore our latest drops — with 7-day easy exchange, your perfect fit is guaranteed.' })}
      >
        <a
          href="/products"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#ffffff', color: '#1a1a1a', textDecoration: 'none', borderRadius: 999, padding: '15px 36px', fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', boxShadow: '0 10px 28px rgba(0,0,0,0.35)', transition: 'all 0.2s' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#f2f2f2'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.transform = 'none'; }}
        >
          {t('size_guide.cta_button', { defaultValue: 'Shop Now' })} <ArrowRight size={16} />
        </a>
      </ContentCtaCard>
    </div>
  );
}
