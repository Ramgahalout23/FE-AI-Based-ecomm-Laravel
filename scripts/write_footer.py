import os

content = '''import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronDown, Truck, RefreshCw, ShieldCheck, Headphones } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSettings } from '../../store/settingsStore';
import { getImageUrl } from '../../utils/formatters';

const SocialIcon = ({ platform, url }) => {
  const getIcon = () => {
    switch (platform?.toUpperCase()) {
      case 'IG': return <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.069-4.85.069-3.204 0-3.584-.012-4.849-.069-3.225-.149-4.771-1.664-4.919-4.919-.058-1.265-.069-1.645-.069-4.849 0-3.204.012-3.584.069-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>;
      case 'FB': return <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>;
      case 'TW': return <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>;
      case 'YT': return <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>;
      default: return <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><circle cx="12" cy="12" r="10"/></svg>;
    }
  };
  return (
    <a
      href={url || '#'}
      target="_blank"
      rel="noopener noreferrer"
      className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center text-white/60 hover:bg-primary hover:text-white transition-all hover:shadow-glow-orange"
    >
      {getIcon()}
    </a>
  );
};

/* ── Animated Accordion Section for Mobile (framer-motion) ── */
function MobileAccordion({ title, children }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-white/10 last:border-b-0">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        className="flex items-center justify-between w-full py-3.5 px-1 text-sm font-semibold text-white uppercase tracking-wider cursor-pointer select-none bg-transparent border-none"
      >
        {title}
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          <ChevronDown size={16} className="text-white/40" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="pb-3 px-1 flex flex-col gap-2.5 text-sm text-white/60">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Helper: safely parse JSON with fallback ── */
function parseJsonOrFallback(raw, fallback) {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export default function Footer() {
  const { getSetting } = useSettings();

  // Social links from branding settings
  const socialLinks = [
    { platform: 'IG', url: getSetting('instagram', '#') },
    { platform: 'FB', url: getSetting('facebook', '#') },
    { platform: 'TW', url: getSetting('twitter', '#') },
    { platform: 'YT', url: getSetting('youtube', '#') },
  ];

  const siteName = getSetting('storeName', 'THREVOLT');
  const settingsLogo = getSetting('logoDarkUrl') || getSetting('logoUrl');

  // Footer content from settings
  const brandTagline = getSetting(
    'footerBrandTagline',
    "India's favorite t-shirt brand. Premium quality, bold designs, and unbeatable comfort — all at prices that make you smile."
  );

  const newsletterEnabled = getSetting('footerNewsletterEnabled', 'true') !== 'false';
  const newsletterTitle = getSetting('footerNewsletterTitle', 'Get 10% Off');
  const newsletterSubtitle = getSetting(
    'footerNewsletterSubtitle',
    'Subscribe for early access to new drops & exclusive deals!'
  );
  const newsletterBtnText = getSetting('footerNewsletterBtnText', 'Join');

  // Editable link lists
  const shopLinks = parseJsonOrFallback(getSetting('footerShopLinks'), [
    { label: 'Oversized Tees', to: '/products?category=oversized' },
    { label: 'Graphic Tees', to: '/products?category=graphic' },
    { label: 'Polo T-Shirts', to: '/products?category=polo' },
    { label: 'Plain T-Shirts', to: '/products?category=plain' },
    { label: 'Combo Packs', to: '/products?category=combo' },
  ]);

  const helpLinks = parseJsonOrFallback(getSetting('footerHelpLinks'), [
    { label: 'Track Order', to: '/orders' },
    { label: 'About Us', to: '/about' },
    { label: 'Contact Us', to: '/contact' },
    { label: 'Size Guide', to: '' },
    { label: 'Shipping Info', to: '' },
    { label: 'Returns & Exchange', to: '/return-policy' },
    { label: 'Privacy Policy', to: '/privacy-policy' },
  ]);

  const bottomLinks = parseJsonOrFallback(getSetting('footerBottomLinks'), [
    { label: 'Privacy Policy' },
    { label: 'Terms of Service' },
    { label: 'Refund Policy' },
  ]);

  // Trust badges (editable from settings)
  const trustBadges = parseJsonOrFallback(getSetting('footerTrustBadges'), [
    { title: 'Free Shipping', desc: 'On orders over Rs 499' },
    { title: 'Easy Returns', desc: '7-day return policy' },
    { title: 'Secure Payment', desc: '100% secure transactions' },
    { title: '24/7 Support', desc: 'Dedicated customer service' },
  ]);

  const badgeIconMap = {
    'Free Shipping': Truck,
    'Easy Returns': RefreshCw,
    'Secure Payment': ShieldCheck,
    '24/7 Support': Headphones,
  };

  const getBadgeIcon = (title, fallback) => {
    return badgeIconMap[title] || fallback;
  };

  return (
    <footer className="bg-charcoal text-white/70 mt-auto pb-[70px] md:pb-0">

      {/* ── Brand Assurance Strip ── */}
      <div className="border-b border-gray-100 bg-white relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-0">
            {trustBadges.map((item, idx) => {
              const IconComponent = getBadgeIcon(item.title, Truck);
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={{ duration: 0.5, delay: idx * 0.1, ease: [0.16, 1, 0.3, 1] }}
                  className="group relative flex items-start gap-3 md:gap-4 px-3 md:px-5 py-4 md:py-6 md:hover:bg-gradient-to-b md:hover:from-gray-50 md:hover:to-white transition-all duration-500 ease-out cursor-default"
                >
                  {/* Icon Circle */}
                  <div className="flex items-center justify-center shrink-0 w-10 h-10 md:w-16 md:h-16 rounded-full bg-gray-50 border border-gray-100 md:group-hover:shadow-lg md:group-hover:shadow-gray-200/60 md:group-hover:scale-110 md:hover:scale-110 transition-all duration-500 ease-out overflow-hidden">
                    <div className="relative w-4 h-4 md:w-6 md:h-6 text-gray-500 md:group-hover:text-gray-700 transition-all duration-500 ease-out">
                      <IconComponent className="w-full h-full" />
                    </div>
                  </div>
                  {/* Text */}
                  <div className="min-w-0 pt-0.5 md:pt-1.5">
                    <p className="text-xs md:text-sm font-semibold text-gray-800 md:group-hover:text-gray-900 transition-colors duration-500 leading-tight">
                      {item.title}
                    </p>
                    <p className="text-[10px] md:text-xs text-gray-400 md:group-hover:text-gray-500 transition-colors duration-500 leading-tight mt-0.5">
                      {item.desc}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Main Footer Grid ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12">

          {/* Column 1: Brand + Newsletter */}
          <div className="md:col-span-5 flex flex-col gap-6">
            {/* Logo & Description */}
            <div>
              <Link to="/" className="inline-block">
                {settingsLogo ? (
                  <img
                    src={getImageUrl(settingsLogo)}
                    alt={siteName}
                    className="h-8 md:h-9 brightness-0 invert"
                  />
                ) : (
                  <span className="text-2xl font-bold tracking-tight text-white">{siteName}</span>
                )}
              </Link>
              <p className="mt-3 text-sm text-white/50 leading-relaxed max-w-md">
                {brandTagline}
              </p>
            </div>

            {/* Newsletter */}
            {newsletterEnabled && (
              <form
                onSubmit={(e) => e.preventDefault()}
                className="bg-white/5 rounded-xl p-4 md:p-5 border border-white/10"
              >
                <p className="font-semibold text-sm text-white mb-1">{newsletterTitle}</p>
                <p className="text-xs text-white/40 mb-3">{newsletterSubtitle}</p>
                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder="Enter your email"
                    className="flex-1 min-w-0 rounded-lg bg-white/10 border border-white/10 px-3.5 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/30 transition-colors"
                  />
                  <button
                    type="submit"
                    className="shrink-0 rounded-lg bg-primary hover:bg-primary/90 transition-colors px-4 py-2 text-sm font-semibold text-white flex items-center gap-1.5"
                  >
                    {newsletterBtnText}
                    <ArrowRight size={14} />
                  </button>
                </div>
              </form>
            )}

            {/* Social Links */}
            <div>
              <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">Follow Us</p>
              <div className="flex gap-2">
                {socialLinks.map((s) => (
                  <SocialIcon key={s.platform} platform={s.platform} url={s.url} />
                ))}
              </div>
            </div>
          </div>

          {/* Column 2: Shop (Desktop) — hidden on mobile (accordion) */}
          <div className="hidden md:block md:col-span-3">
            <p className="text-xs font-semibold text-white uppercase tracking-widest mb-5">Shop</p>
            <div className="flex flex-col gap-3 text-sm">
              {shopLinks.map((link, i) => (
                <Link key={i} to={link.to || '#'} className="text-white/50 hover:text-white transition-colors">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Column 3: Help (Desktop) — hidden on mobile (accordion) */}
          <div className="hidden md:block md:col-span-2">
            <p className="text-xs font-semibold text-white uppercase tracking-widest mb-5">Help</p>
            <div className="flex flex-col gap-3 text-sm">
              {helpLinks.map((link, i) => (
                <Link key={i} to={link.to || '#'} className="text-white/50 hover:text-white transition-colors">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Column 4: Contact (Desktop) */}
          <div className="hidden md:flex md:col-span-2 flex-col">
            <p className="text-xs font-semibold text-white uppercase tracking-widest mb-5">Contact</p>
            <div className="flex flex-col gap-3 text-sm text-white/50">
              <a href="mailto:support@threvolt.com" className="hover:text-white transition-colors">
                support@threvolt.com
              </a>
              <a href="tel:+919999999999" className="hover:text-white transition-colors">
                +91 99999 99999
              </a>
            </div>
          </div>

          {/* Mobile Accordion Links — shown only on mobile */}
          <div className="md:hidden col-span-full -mx-4 mt-2">
            <MobileAccordion title="Shop">
              {shopLinks.map((link, i) => (
                <Link key={i} to={link.to || '#'} className="text-white/50 hover:text-white transition-colors">
                  {link.label}
                </Link>
              ))}
            </MobileAccordion>
            <MobileAccordion title="Help">
              {helpLinks.map((link, i) => (
                <Link key={i} to={link.to || '#'} className="text-white/50 hover:text-white transition-colors">
                  {link.label}
                </Link>
              ))}
            </MobileAccordion>
            <MobileAccordion title="Contact">
              <a href="mailto:support@threvolt.com" className="hover:text-white transition-colors">support@threvolt.com</a>
              <a href="tel:+919999999999" className="hover:text-white transition-colors">+91 99999 99999</a>
            </MobileAccordion>
          </div>

        </div>
      </div>

      {/* ── Bottom Bar ── */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-xs text-white/30">
            &copy; {new Date().getFullYear()} {siteName}. All rights reserved.
          </p>
          <div className="flex gap-4 text-xs text-white/30">
            {bottomLinks.map((link, i) => (
              <Link key={i} to={link.to || '#'} className="hover:text-white/60 transition-colors">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
'''

path = 'Frontend/luxe-ecommerce/src/components/layout/Footer.jsx'
os.makedirs(os.path.dirname(path), exist_ok=True)
with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print(f'Wrote {len(content)} chars to {path}')
