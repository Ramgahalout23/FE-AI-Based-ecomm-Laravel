import { motion } from 'framer-motion';

function formatPromoCard(promo) {
  const title = promo.title || 'Special Offer';

  if (promo.offerBadge || promo.offerHighlight || promo.offerTagline) {
    return {
      id: promo.id,
      title,
      badge: promo.offerBadge || null,
      highlight: promo.offerHighlight || promo.description || 'Special offer',
      tagline: promo.offerTagline || (promo.couponCode ? `Use code: ${promo.couponCode}` : 'Auto-applied at checkout'),
    };
  }

  const highlight = promo.description || (promo.minPurchase
    ? `On orders above \u20B9${Math.round(promo.minPurchase)}`
    : 'On all orders');

  const tagline = promo.couponCode
    ? `Use code: ${promo.couponCode}`
    : promo.maxDiscount
      ? `Up to \u20B9${Math.round(promo.maxDiscount)} off`
      : 'Auto-applied at checkout';

  return { id: promo.id, title, badge: null, highlight, tagline };
}

/**
 * Premium gradient backgrounds for each offer card — cycles through
 * an elegant palette of dark, saturated tones with gold/caramel accents.
 */
const CARD_GRADIENTS = [
  { bg: 'linear-gradient(135deg, #1C1C1E, #2A2722, #1C1C1E)', accent: '#C9A96E', shadow: 'rgba(201,169,110,0.08)' },
  { bg: 'linear-gradient(135deg, #1A1A24, #252236, #1A1A24)', accent: '#A78BFA', shadow: 'rgba(167,139,250,0.08)' },
  { bg: 'linear-gradient(135deg, #1C1E1C, #1F2A1E, #1C1E1C)', accent: '#6EE7B7', shadow: 'rgba(110,231,183,0.08)' },
  { bg: 'linear-gradient(135deg, #1E1C1C, #2A1F1E, #1E1C1C)', accent: '#FCA5A5', shadow: 'rgba(252,165,165,0.08)' },
];

export default function OffersSection({ promotions = [] }) {
  const activeOffers = promotions.filter(p => {
    if (p.isActive === false) return false;
    if (p.status && p.status !== 'ACTIVE') return false;
    return true;
  });

  const allOffers = activeOffers.map(formatPromoCard);

  if (!allOffers.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-20px' }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Section header — refined, minimal */}
      <div className="flex items-center gap-2 mb-3.5">
        <div className="flex items-center gap-1.5">
          <div className="w-1 h-4 rounded-full bg-gradient-to-b from-[#C9A96E] to-[#A68B4E]" />
          <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em]">
            Offers for you
          </h3>
        </div>
        <div className="flex-1 h-px bg-gradient-to-r from-gray-200/60 via-gray-200/30 to-transparent" />
      </div>

      {/* Scrollable row — single line, never wraps */}
      <div
        className="flex flex-row gap-3 overflow-x-auto scroll-smooth snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {allOffers.map((offer, idx) => {
          const gradient = CARD_GRADIENTS[idx % CARD_GRADIENTS.length];
          return (
            <motion.div
              key={offer.id || idx}
              initial={{ opacity: 0, y: 14, scale: 0.96 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.08, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -3, scale: 1.01, transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] } }}
              className="group relative rounded-[14px] border border-white/[0.06] shadow-sm hover:shadow-xl transition-all duration-300 cursor-default min-w-[195px] max-h-[135px] shrink-0 snap-start flex flex-col overflow-hidden"
              style={{
                background: gradient.bg,
                boxShadow: `0 4px 20px ${gradient.shadow}, inset 0 1px 0 rgba(255,255,255,0.06)`,
              }}
            >
              {/* Glass-morphism overlay */}
              <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />

              {/* Subtle radial glow */}
              <div
                className="absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-20 blur-2xl pointer-events-none"
                style={{ background: `radial-gradient(circle, ${gradient.accent}40 0%, transparent 70%)` }}
              />

              {/* Decorative corner accent */}
              <div
                className="absolute top-0 right-0 w-16 h-16 opacity-[0.03] pointer-events-none"
                style={{
                  background: `radial-gradient(circle at top right, ${gradient.accent} 0%, transparent 70%)`,
                }}
              />

              {/* Thin top accent bar with gradient */}
              <div
                className="absolute top-0 inset-x-0 h-[2px] opacity-60"
                style={{
                  background: `linear-gradient(90deg, transparent, ${gradient.accent}60, transparent)`,
                }}
              />

              {/* Content — inner padding */}
              <div className="relative z-10 flex flex-col gap-1 p-[14px_16px] flex-1">
                {/* Offer title badge */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-semibold uppercase tracking-[0.12em]"
                    style={{ color: `${gradient.accent}CC` }}>
                    {offer.title}
                  </span>
                </div>

                {/* Highlight — main offer text */}
                <div
                  className="text-[16px] font-black leading-tight text-white flex-1 whitespace-pre-line drop-shadow-sm"
                  style={{ fontFamily: "'Jost', sans-serif" }}
                >
                  {offer.highlight}
                </div>

                {/* Tagline + subtle decorative dot */}
                <div className="flex items-center gap-1.5 mt-auto">
                  <span
                    className="w-1 h-1 rounded-full shrink-0"
                    style={{ background: gradient.accent }}
                  />
                  <span className="text-[8px] font-medium leading-tight text-white/50 group-hover:text-white/70 transition-colors duration-300">
                    {offer.tagline}
                  </span>
                </div>
              </div>

              {/* Hover shine effect */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                <div
                  className="absolute inset-0"
                  style={{
                    background: `linear-gradient(105deg, transparent 40%, ${gradient.accent}08 50%, transparent 60%)`,
                  }}
                />
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
