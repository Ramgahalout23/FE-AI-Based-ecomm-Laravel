import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSettings } from '../../store/useSettings';
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

export default function Footer() {
  const { getSetting } = useSettings();
  const siteName = getSetting('storeName', 'THREVOLT');
  const settingsLogo = getSetting('logoDarkUrl') || getSetting('logoUrl') || null;
  const socialLinks = [
    { platform: 'IG', url: getSetting('instagram', '#') },
    { platform: 'FB', url: getSetting('facebook', '#') },
    { platform: 'TW', url: getSetting('twitter', '#') },
    { platform: 'YT', url: getSetting('youtube', '#') }
  ];

  const features = [
    { icon: 'local_shipping', title: 'Free Shipping', desc: 'On orders over ₹499' },
    { icon: 'refresh', title: 'Easy Returns', desc: '7-day return policy' },
    { icon: 'payments', title: 'Secure Payment', desc: '100% secure transactions' },
    { icon: 'support_agent', title: '24/7 Support', desc: 'Dedicated customer service' },
  ];

  return (
    <footer className="bg-charcoal text-white/70 mt-auto pb-[70px] md:pb-0">

      {/* ════════════════════════════════════════════
          BRAND ASSURANCE STRIP
          desktop: 4-column grid with icon circles
          mobile: 2x2 compact grid, icon+text horizontal
          ════════════════════════════════════════════ */}
      <div className="border-b border-gray-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-0">
            {features.map((item, idx) => (
              <div
                key={idx}
                className="feature-item group flex items-center gap-3 px-3 py-3.5 md:flex-col md:text-center md:py-14 border-b md:border-b-0 md:border-r border-gray-100 last:border-r-0 md:hover:bg-gray-50/80 md:hover:-translate-y-0.5 transition-all duration-300 cursor-default"
                style={{ transitionDelay: `${100 + idx * 100}ms` }}
              >
                {/* Icon — no circle bg on mobile */}
                <div className="w-9 h-9 md:w-14 md:h-14 rounded-full md:bg-gray-50 md:border md:border-gray-100 flex items-center justify-center shrink-0 md:group-hover:border-gray-200 md:group-hover:bg-gray-100 md:group-hover:shadow-md md:group-hover:scale-110 transition-all duration-300">
                  <span className="material-symbols-outlined text-gray-500 text-lg md:text-3xl md:group-hover:text-gray-700 transition-colors duration-300">
                    {item.icon}
                  </span>
                </div>
                {/* Text */}
                <div className="md:text-center">
                  <div className="text-[12px] md:text-sm font-semibold text-gray-800 tracking-tight leading-tight md:group-hover:text-gray-900 transition-colors duration-300">
                    {item.title}
                  </div>
                  <div className="text-[10px] md:text-xs text-gray-400 font-medium hidden md:block mt-1">
                    {item.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════
          MAIN FOOTER CONTENT
          ── Mobile: brand centered, accordion links, newsletter
          ── Desktop: full grid layout
          ════════════════════════════════════════════ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-14">

        {/* ── MOBILE LAYOUT ── */}
        <div className="md:hidden">

          {/* Brand + Social — centered */}
          <div className="text-center mb-6">
            <Link to="/" className="inline-flex items-center justify-center mb-3 group">
              {settingsLogo ? (
                <div className="h-9 flex items-center transition-transform group-hover:scale-105">
                  <img loading="lazy" src={getImageUrl(settingsLogo)}
                    alt={siteName}
                    className="h-full w-auto max-w-[160px] object-contain"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                </div>
              ) : (
                <span className="font-display text-xl font-bold text-white tracking-tight">
                  {siteName}
                </span>
              )}
            </Link>
            <p className="text-xs leading-relaxed text-white/50 max-w-xs mx-auto mb-4">
              India's favorite t-shirt brand. Premium quality, bold designs, and unbeatable comfort. 🔥
            </p>
            <div className="flex justify-center gap-2.5">
              {socialLinks.map((social, idx) => (
                <SocialIcon key={idx} platform={social.platform} url={social.url} />
              ))}
            </div>
          </div>

          {/* Links — Accordion */}
          <div className="border-t border-white/10 pt-1 mb-5">
            <MobileAccordion title="Shop">
              <Link to="/products?category=oversized" className="hover:text-white transition-colors w-fit">Oversized Tees</Link>
              <Link to="/products?category=graphic" className="hover:text-white transition-colors w-fit">Graphic Tees</Link>
              <Link to="/products?category=polo" className="hover:text-white transition-colors w-fit">Polo T-Shirts</Link>
              <Link to="/products?category=plain" className="hover:text-white transition-colors w-fit">Plain T-Shirts</Link>
              <Link to="/products?category=combo" className="hover:text-white transition-colors w-fit">Combo Packs</Link>
            </MobileAccordion>
            <MobileAccordion title="Help">
              <Link to="/track-order" className="hover:text-white transition-colors w-fit">Track Order</Link>
              <Link to="/about" className="hover:text-white transition-colors w-fit">About Us</Link>
              <Link to="/contact" className="hover:text-white transition-colors w-fit">Contact Us</Link>
              <span className="hover:text-white transition-colors cursor-pointer w-fit">Size Guide</span>
              <span className="hover:text-white transition-colors cursor-pointer w-fit">Shipping Info</span>
              <Link to="/return-policy" className="hover:text-white transition-colors w-fit">Returns & Exchange</Link>
              <Link to="/privacy-policy" className="hover:text-white transition-colors w-fit">Privacy Policy</Link>
            </MobileAccordion>
          </div>

          {/* Newsletter */}
          <div className="bg-white/5 rounded-2xl p-4">
            <h4 className="text-white text-xs font-semibold mb-1 uppercase tracking-wider">Get 10% Off</h4>
            <p className="text-xs text-white/50 mb-3">Subscribe for early access to new drops & exclusive deals 🎉</p>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="Your email"
                className="flex-1 bg-white/10 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-primary transition-colors min-w-0"
                autoComplete="email"
              />
              <button className="bg-[#ff6b35] text-white px-4 py-2.5 rounded-xl font-semibold text-xs hover:bg-[#e55a2b] transition-colors flex items-center justify-center gap-1 whitespace-nowrap shadow-lg shadow-orange-500/20">
                Join <ArrowRight size={14} />
              </button>
            </div>
          </div>

        </div>

        {/* ── DESKTOP LAYOUT (unchanged) ── */}
        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-12">

          {/* Brand */}
          <div className="lg:col-span-4 lg:border-r lg:border-white/10 lg:pr-10">
            <Link to="/" className="flex items-center mb-5 group">
              {settingsLogo ? (
                <div className="h-10 sm:h-12 flex items-center transition-transform group-hover:scale-105">
                  <img loading="lazy" src={getImageUrl(settingsLogo)}
                    alt={siteName}
                    className="h-full w-auto max-w-[200px] object-contain"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                </div>
              ) : (
                <span className="font-display text-2xl font-bold text-white tracking-tight">
                  {siteName}
                </span>
              )}
            </Link>
            <p className="text-sm leading-relaxed text-white/50 mb-6 max-w-sm">
              India's favorite t-shirt brand. Premium quality, bold designs, and unbeatable comfort — all at prices that make you smile. 🔥
            </p>
            <div className="flex gap-2.5">
              {socialLinks.map((social, idx) => (
                <SocialIcon key={idx} platform={social.platform} url={social.url} />
              ))}
            </div>
          </div>

          {/* Shop */}
          <div className="lg:col-span-2">
            <h4 className="text-white text-sm font-semibold mb-6 uppercase tracking-wider">Shop</h4>
            <div className="flex flex-col gap-2.5 text-sm">
              <Link to="/products?category=oversized" className="hover:text-primary hover:translate-x-1 transition-all duration-200 w-fit">Oversized Tees</Link>
              <Link to="/products?category=graphic" className="hover:text-primary hover:translate-x-1 transition-all duration-200 w-fit">Graphic Tees</Link>
              <Link to="/products?category=polo" className="hover:text-primary hover:translate-x-1 transition-all duration-200 w-fit">Polo T-Shirts</Link>
              <Link to="/products?category=plain" className="hover:text-primary hover:translate-x-1 transition-all duration-200 w-fit">Plain T-Shirts</Link>
              <Link to="/products?category=combo" className="hover:text-primary hover:translate-x-1 transition-all duration-200 w-fit">Combo Packs</Link>
            </div>
          </div>

          {/* Help */}
          <div className="lg:col-span-2">
            <h4 className="text-white text-sm font-semibold mb-6 uppercase tracking-wider">Help</h4>
            <div className="flex flex-col gap-2.5 text-sm">
              <Link to="/track-order" className="hover:text-primary hover:translate-x-1 transition-all duration-200 w-fit">Track Order</Link>
              <Link to="/about" className="hover:text-primary hover:translate-x-1 transition-all duration-200 w-fit">About Us</Link>
              <Link to="/contact" className="hover:text-primary hover:translate-x-1 transition-all duration-200 w-fit">Contact Us</Link>
              <span className="hover:text-primary hover:translate-x-1 transition-all duration-200 cursor-pointer w-fit">Size Guide</span>
              <span className="hover:text-primary hover:translate-x-1 transition-all duration-200 cursor-pointer w-fit">Shipping Info</span>
              <Link to="/return-policy" className="hover:text-primary hover:translate-x-1 transition-all duration-200 w-fit">Returns & Exchange</Link>
              <Link to="/privacy-policy" className="hover:text-primary hover:translate-x-1 transition-all duration-200 w-fit">Privacy Policy</Link>
            </div>
          </div>

          {/* Newsletter */}
          <div className="lg:col-span-4">
            <div className="bg-white/5 rounded-2xl p-7">
              <h4 className="text-white text-sm font-semibold mb-3 uppercase tracking-wider">Get 10% Off</h4>
              <p className="text-sm text-white/50 mb-5 leading-relaxed">
                Subscribe &amp; get 10% off your first order + early access to new drops! 🎉
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="email"
                  placeholder="Your email address"
                  className="flex-1 bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/60 transition-colors min-w-0"
                  autoComplete="email"
                />
                <button className="bg-[#ff6b35] text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-[#e55a2b] hover:shadow-lg hover:shadow-orange-500/25 transition-all duration-200 flex items-center justify-center gap-1.5 whitespace-nowrap shadow-md">
                  Join <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ════════════════════════════════════════════
          BOTTOM BAR
          mobile: stacked compact
          desktop: horizontal row
          ════════════════════════════════════════════ */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 md:py-6 flex flex-col md:flex-row justify-between items-center gap-3 md:gap-4 text-[11px] md:text-xs text-white/40">
          <div className="flex gap-5 md:gap-8">
            <span className="hover:text-white/80 transition-colors cursor-pointer relative after:absolute after:bottom-0 after:left-0 after:h-px after:w-0 after:bg-white/40 after:transition-all hover:after:w-full">Privacy Policy</span>
            <span className="hover:text-white/80 transition-colors cursor-pointer relative after:absolute after:bottom-0 after:left-0 after:h-px after:w-0 after:bg-white/40 after:transition-all hover:after:w-full">Terms of Service</span>
            <span className="hover:text-white/80 transition-colors cursor-pointer relative after:absolute after:bottom-0 after:left-0 after:h-px after:w-0 after:bg-white/40 after:transition-all hover:after:w-full">Refund Policy</span>
          </div>
          <div className="text-center md:text-right tracking-wide">© {new Date().getFullYear()} {siteName}. Made with 🧡 in India</div>
        </div>
      </div>
    </footer>
  );
}