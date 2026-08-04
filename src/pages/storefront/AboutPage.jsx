import { ArrowRight, Gem, Palette, BadgeCheck, Truck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import SEOHead from '../../components/seo/SEOHead';
import Breadcrumb from '../../components/common/Breadcrumb';
import { useSettings } from '../../store/useSettings';

/* ── Brand design tokens (matches tailwind.config.js / tokens.css) ── */
const INK = "#1a1a1a";
const PAPER = "#ffffff";
const THREAD = "#4a4a5a";
const STONE = "#8a8a9a";
const displayFont = { fontFamily: "var(--font-display)", fontWeight: 800 };

export default function AboutPage() {
  const { t } = useTranslation();
  const { getSetting } = useSettings();
  const storeName = getSetting('storeName', 'THREVOLT');
  const brandTagline = getSetting('brandTagline', 'Premium Fashion & Lifestyle');

  const stats = [
    { num: '50K+', label: t('about.stat_customers', { defaultValue: 'Total Customers' }) },
    { num: '10K+', label: t('about.stat_sold', { defaultValue: 'Products Sold' }) },
    { num: '50K+', label: t('about.stat_orders', { defaultValue: 'Orders Delivered' }) },
    { num: '4.8★', label: t('about.stat_rating', { defaultValue: 'Average Rating' }) },
  ];

  const values = [
    { icon: Gem, title: t('about.values_quality_title', { defaultValue: 'Premium Quality' }), desc: t('about.values_quality_desc', { defaultValue: '240 GSM combed cotton — soft, structured, and made to last.' }) },
    { icon: Palette, title: t('about.values_design_title', { defaultValue: 'Bold & Unique Designs' }), desc: t('about.values_design_desc', { defaultValue: "Exclusive graphics from our in-house studio. You won't find them anywhere else." }) },
    { icon: BadgeCheck, title: t('about.values_satisfaction_title', { defaultValue: 'Satisfaction Guaranteed' }), desc: t('about.values_satisfaction_desc', { defaultValue: 'Love your purchase or return it within 7 days — no questions asked.' }) },
    { icon: Truck, title: t('about.values_shipping_title', { defaultValue: 'Free Shipping ₹499+' }), desc: t('about.values_shipping_desc', { defaultValue: 'Free shipping across India with easy 7-day returns and free pickup.' }) },
  ];

  const steps = [
    { num: '01', title: t('about.process_design', { defaultValue: 'Design' }), desc: t('about.process_design_desc', { defaultValue: 'Exclusive graphics sketched by our in-house studio — never mass-produced.' }) },
    { num: '02', title: t('about.process_fabric', { defaultValue: 'Fabric' }), desc: t('about.process_fabric_desc', { defaultValue: '240 GSM premium combed cotton — soft, structured, and built to last.' }) },
    { num: '03', title: t('about.process_print', { defaultValue: 'Print' }), desc: t('about.process_print_desc', { defaultValue: 'High-durability inks that stay bold through washes and years.' }) },
    { num: '04', title: t('about.process_quality', { defaultValue: 'Quality' }), desc: t('about.process_quality_desc', { defaultValue: 'Every piece is checked, measured, and approved before it ships.' }) },
  ];

  return (
    <div className="page-content bg-white">
      <style>{`
        .about-hero-mark { animation: about-rise 0.8s cubic-bezier(0.16, 1, 0.3, 1) both; }
        @keyframes about-rise { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        .about-marquee { animation: about-marquee 26s linear infinite; }
        @keyframes about-marquee { to { transform: translateX(-50%); } }
        .about-card { transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease; }
        .about-card:hover { transform: translateY(-4px); box-shadow: 0 14px 36px rgba(0,0,0,0.1); border-color: ${INK} !important; }
        .about-step { transition: background 0.25s ease, transform 0.25s ease; }
        .about-step:hover { background: rgba(255,255,255,0.04); transform: translateY(-3px); }
        @media (max-width: 900px) {
          .about-story-grid { grid-template-columns: 1fr !important; }
          .about-col-4 { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 560px) {
          .about-col-4 { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <SEOHead
        title={`${storeName} — About Us`}
        description={`${storeName} — ${brandTagline} Discover our story: premium quality, bold designs, and streetwear crafted in India.`}
        keywords="about us, streetwear brand, premium fashion, our story"
      />

      {/* ── HERO ── */}
      <header style={{ background: "linear-gradient(165deg, #141416 0%, #000000 100%)", color: PAPER, padding: "96px 24px 84px", position: "relative", overflow: "hidden", textAlign: "center" }}>
        {/* Decorative watermark */}
        <div aria-hidden style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", fontSize: "clamp(110px, 22vw, 320px)", fontWeight: 800, color: "rgba(255,255,255,0.035)", letterSpacing: "-0.04em", whiteSpace: "nowrap", pointerEvents: "none", ...displayFont }}>
          {storeName}
        </div>
        <div style={{ position: "relative", zIndex: 1, maxWidth: 820, margin: "0 auto" }}>
          <Breadcrumb
            items={[
              { label: t('nav.home', { defaultValue: 'Home' }), href: '/' },
              { label: t('about.hero_title', { defaultValue: 'About Us' }) },
            ]}
            variant="dark"
            className="justify-center mb-6"
          />
          <div style={{ fontSize: 11, letterSpacing: "0.35em", textTransform: "uppercase", color: "rgba(255,255,255,0.55)", fontWeight: 700, marginBottom: 18 }}>
            {t('about.eyebrow', { defaultValue: 'Our Story' })}
          </div>
          <h1 className="about-hero-mark" style={{ fontSize: "clamp(46px, 7vw, 78px)", lineHeight: 1.02, letterSpacing: "-0.03em", margin: "0 0 22px", ...displayFont }}>
            {storeName}
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.7, color: "rgba(255,255,255,0.72)", maxWidth: 560, margin: "0 auto 38px" }}>
            {t('about.hero_desc', { defaultValue: 'Premium streetwear for those who refuse to blend in.' })}
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <a
              href="/products"
              style={{ display: "inline-flex", alignItems: "center", gap: 8, background: PAPER, color: INK, textDecoration: "none", borderRadius: 999, padding: "14px 30px", fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", boxShadow: "0 8px 24px rgba(0,0,0,0.35)", transition: "all 0.2s" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#f2f2f2'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = PAPER; }}
            >
              {t('about.cta_primary', { defaultValue: 'Explore Collection' })} <ArrowRight size={15} />
            </a>
            <a
              href="#values"
              style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "transparent", color: PAPER, textDecoration: "none", borderRadius: 999, padding: "14px 30px", fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", border: "1px solid rgba(255,255,255,0.35)", transition: "all 0.2s" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              {t('about.cta_secondary', { defaultValue: 'Why Choose Us' })}
            </a>
          </div>
        </div>
      </header>

      {/* ── MARQUEE ── */}
      <div style={{ background: INK, overflow: "hidden", padding: "16px 0" }}>
        <div className="about-marquee" style={{ display: "flex", width: "max-content" }}>
          {[0, 1].map((k) => (
            <span key={k} style={{ display: "flex", alignItems: "center", gap: 48, paddingRight: 48, fontSize: 11, fontWeight: 700, letterSpacing: "0.28em", textTransform: "uppercase", color: "rgba(255,255,255,0.55)", whiteSpace: "nowrap" }}>
              {t('about.marquee_item', { defaultValue: 'Premium Streetwear ✦ Crafted in India ✦ Unapologetically Bold' })}
              {t('about.marquee_item', { defaultValue: 'Premium Streetwear ✦ Crafted in India ✦ Unapologetically Bold' })}
            </span>
          ))}
        </div>
      </div>

      {/* ── STATS ── */}
      <section style={{ background: INK, padding: "0 24px 56px" }}>
        <div className="about-col-4" style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}>
          {stats.map((s, i) => (
            <div key={i} style={{ textAlign: "center", padding: "10px 12px", borderLeft: i > 0 ? "1px solid rgba(255,255,255,0.1)" : "none" }}>
              <div style={{ fontSize: 40, lineHeight: 1, fontWeight: 800, color: PAPER, marginBottom: 10, ...displayFont }}>{s.num}</div>
              <div style={{ fontSize: 10.5, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.55)", fontWeight: 600 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── OUR STORY ── */}
      <section className="about-story-grid" style={{ maxWidth: 1200, margin: "0 auto", padding: "96px 24px", display: "grid", gridTemplateColumns: "1.15fr 0.85fr", gap: 64, alignItems: "center" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <span style={{ width: 34, height: 2, background: INK }} />
            <span style={{ fontSize: 11, letterSpacing: "0.3em", textTransform: "uppercase", color: STONE, fontWeight: 700 }}>
              {t('about.story_label', { defaultValue: 'The Story' })}
            </span>
          </div>
          <h2 style={{ fontSize: "clamp(30px, 4vw, 44px)", lineHeight: 1.08, letterSpacing: "-0.02em", margin: "0 0 22px", ...displayFont }}>
            {t('about.story_heading', { defaultValue: 'Born to Stand Out' })}
          </h2>
          <p style={{ fontSize: 15.5, lineHeight: 1.85, color: THREAD, margin: "0 0 18px" }}>
            {t('about.story_p1', { defaultValue: 'It started with a simple mission — create tees that make a statement. From the first sketch to the latest drop, every piece is crafted with precision, care, and an unapologetic attention to detail.' })}
          </p>
          <p style={{ fontSize: 15.5, lineHeight: 1.85, color: THREAD, margin: "0 0 28px" }}>
            {t('about.story_p2', { defaultValue: "We believe fashion should be bold, unapologetic, and accessible — inspired by the energy of India's streets, the heritage of our culture, and the forward-thinking trends of the global stage." })}
          </p>
          <div style={{ paddingTop: 18, borderTop: `1px dashed ${STONE}` }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: INK }}>
              {t('about.story_badge', { defaultValue: 'Est. 2026 · Crafted in India' })}
            </span>
          </div>
        </div>

        {/* Brand patch visual */}
        <div style={{ background: "linear-gradient(165deg, #1a1a1a, #0c0c0e)", borderRadius: 24, padding: "58px 36px", color: PAPER, position: "relative", overflow: "hidden", textAlign: "center", boxShadow: "0 24px 60px rgba(0,0,0,0.25)" }}>
          <div aria-hidden style={{ position: "absolute", inset: 14, border: "1px dashed rgba(255,255,255,0.22)", borderRadius: 18, pointerEvents: "none" }} />
          <div style={{ fontSize: 10, letterSpacing: "0.35em", color: "rgba(255,255,255,0.55)", fontWeight: 700 }}>
            {t('about.story_badge_est', { defaultValue: 'EST. 2026' })}
          </div>
          <div style={{ fontSize: "clamp(34px, 5vw, 48px)", fontWeight: 800, margin: "22px 0 10px", letterSpacing: "-0.02em", ...displayFont }}>{storeName}</div>
          <div style={{ fontSize: 10.5, letterSpacing: "0.3em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>
            {t('about.story_badge_sub', { defaultValue: 'Crafted in India' })}
          </div>
          <div style={{ height: 1, background: "repeating-linear-gradient(90deg, rgba(255,255,255,0.4) 0px, rgba(255,255,255,0.4) 6px, transparent 6px, transparent 12px)", maxWidth: 260, margin: "28px auto 0" }} />
        </div>
      </section>

      {/* ── VALUES ── */}
      <section id="values" style={{ background: "#fafafa", padding: "96px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 52 }}>
            <div style={{ fontSize: 11, letterSpacing: "0.3em", textTransform: "uppercase", color: STONE, fontWeight: 700, marginBottom: 14 }}>
              {t('about.values_label', { defaultValue: 'Why Choose Us' })}
            </div>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 40px)", lineHeight: 1.1, letterSpacing: "-0.02em", margin: 0, ...displayFont }}>
              {t('about.values_heading', { defaultValue: 'Built Different' })}
            </h2>
          </div>
          <div className="about-col-4" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}>
            {values.map((v, i) => {
              const Icon = v.icon;
              return (
                <div key={i} className="about-card" style={{ background: PAPER, border: "1px solid rgba(0,0,0,0.07)", borderRadius: 18, padding: "30px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                  <div style={{ width: 46, height: 46, borderRadius: 13, background: INK, color: PAPER, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                    <Icon size={20} strokeWidth={1.8} />
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: INK, margin: "0 0 8px" }}>{v.title}</h3>
                  <p style={{ fontSize: 13, lineHeight: 1.65, color: STONE, margin: 0 }}>{v.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── PROCESS ── */}
      <section style={{ background: "linear-gradient(165deg, #141416, #000000)", color: PAPER, padding: "96px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ marginBottom: 52 }}>
            <div style={{ fontSize: 11, letterSpacing: "0.3em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)", fontWeight: 700, marginBottom: 14 }}>
              {t('about.process_label', { defaultValue: 'The Process' })}
            </div>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 40px)", lineHeight: 1.1, letterSpacing: "-0.02em", margin: 0, ...displayFont }}>
              {t('about.process_heading', { defaultValue: 'From Sketch to Stitch' })}
            </h2>
          </div>
          <div className="about-col-4" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24 }}>
            {steps.map((s, i) => (
              <div key={i} className="about-step" style={{ borderTop: "1px solid rgba(255,255,255,0.18)", padding: "20px 8px 6px 0", borderRadius: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.25em", color: "rgba(255,255,255,0.35)" }}>{s.num}</div>
                <div style={{ fontSize: 18, fontWeight: 700, margin: "12px 0 8px", fontFamily: "var(--font-display)" }}>{s.title}</div>
                <div style={{ fontSize: 13, lineHeight: 1.65, color: "rgba(255,255,255,0.55)" }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "96px 24px", textAlign: "center" }}>
        <h2 style={{ fontSize: "clamp(30px, 4.5vw, 44px)", lineHeight: 1.1, letterSpacing: "-0.02em", margin: "0 0 14px", ...displayFont }}>
          {t('about.ready_make_statement')}
        </h2>
        <p style={{ fontSize: 15.5, color: THREAD, margin: "0 auto 36px", maxWidth: 480, lineHeight: 1.7 }}>
          {t('about.explore_collection')}
        </p>
        <a
          href="/products"
          style={{ display: "inline-flex", alignItems: "center", gap: 8, background: INK, color: PAPER, textDecoration: "none", borderRadius: 999, padding: "15px 36px", fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", boxShadow: "0 10px 28px rgba(26,26,26,0.25)", transition: "all 0.2s" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#000'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = INK; e.currentTarget.style.transform = 'none'; }}
        >
          {t('about.shop_now')} <ArrowRight size={16} />
        </a>
      </section>
    </div>
  );
}
