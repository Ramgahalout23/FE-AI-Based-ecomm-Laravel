import { useRef, useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BadgePercent, Zap, Gift, Wallet, Sparkles, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import { roundINR } from '../../utils/constants';

function formatPromoCard(promo) {
  const title = promo.title || 'Special Offer';
  const theme = promo.offerTheme || promo.theme || null;

  if (promo.offerBadge || promo.offerHighlight || promo.offerTagline) {
    return {
      id: promo.id,
      title,
      badge: promo.offerBadge || null,
      highlight: promo.offerHighlight || promo.description || 'Special offer',
      tagline: promo.offerTagline || (promo.couponCode ? `Use code: ${promo.couponCode}` : 'Auto-applied at checkout'),
      theme,
    };
  }

  const highlight = promo.description || (promo.minPurchase
    ? `On orders above \u20B9${roundINR(promo.minPurchase)}`
    : 'On all orders');

  const tagline = promo.couponCode
    ? `Use code: ${promo.couponCode}`
    : promo.maxDiscount
      ? `Up to \u20B9${roundINR(promo.maxDiscount)} off`
      : 'Auto-applied at checkout';

  return { id: promo.id, title, badge: null, highlight, tagline, theme };
}

/**
 * Theme → icon mapping. Cards stay light + monochrome (black brand, no gold);
 * the tint chip gives each offer a subtle distinguishing surface.
 */
const THEMES = {
  'smart-deal':    { Icon: BadgePercent, tint: '#EDEDEF' },
  'prepaid-offer': { Icon: Wallet,       tint: '#F0F0F2' },
  'summer-bonus':  { Icon: Gift,         tint: '#ECECEE' },
  'flash-sale':    { Icon: Zap,          tint: '#F5F3EF' },
  'new-offer':     { Icon: Sparkles,     tint: '#F0F0F2' },
};
const FALLBACK = { Icon: BadgePercent, tint: '#F2F2F3' };
const themeFor = (offer) => {
  const t = THEMES[(offer.theme || offer.offerTheme || '').toLowerCase()];
  return t || FALLBACK;
};

const INK = '#1C1C1E';
const MUTED = '#6E6A66';
const FAINT = '#8C8883';

export default function OffersSection({ promotions = [] }) {
  const scrollerRef = useRef(null);
  const dragState = useRef(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);

  const activeOffers = promotions.filter(p => {
    if (p.isActive === false) return false;
    if (p.status && p.status !== 'ACTIVE') return false;
    return true;
  });

  const allOffers = activeOffers.map(formatPromoCard);

  /** Update arrow availability based on scroll position */
  const updateArrows = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  // Sync arrow state on mount and whenever the viewport resizes, so the
  // arrows never show when there's nothing to scroll (e.g. few offers).
  useEffect(() => {
    updateArrows();
    window.addEventListener('resize', updateArrows);
    return () => window.removeEventListener('resize', updateArrows);
  }, [updateArrows]);

  /** Scroll by one card width (with wrap-around at the edges) */
  const nudge = (dir) => {
    const el = scrollerRef.current;
    if (!el) return;
    const card = el.firstElementChild;
    const step = (card ? card.offsetWidth : 220) + 12; // card + gap
    const target = dir === 'next'
      ? Math.min(el.scrollLeft + step, el.scrollWidth - el.clientWidth)
      : Math.max(el.scrollLeft - step, 0);
    el.scrollTo({ left: target, behavior: 'smooth' });
  };

  // ── Drag-to-scroll (pointer events — works with mouse AND touch) ──
  const onPointerDown = (e) => {
    const el = scrollerRef.current;
    if (!el) return;
    dragState.current = {
      startX: e.clientX,
      startScroll: el.scrollLeft,
      moved: false,
    };
    el.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e) => {
    const st = dragState.current;
    const el = scrollerRef.current;
    if (!st || !el) return;
    const dx = e.clientX - st.startX;
    if (Math.abs(dx) > 4) st.moved = true;
    if (st.moved) el.scrollLeft = st.startScroll - dx;
  };
  const onPointerUp = (e) => {
    const st = dragState.current;
    dragState.current = null;
    if (st && st.moved) e.preventDefault();
    updateArrows();
  };

  // Prevent a stray click from firing right after a drag gesture.
  const onClickCapture = (e) => {
    if (dragState.current?.moved) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  // NOTE: this early return MUST stay after every hook (useCallback/useEffect)
  // above — offers load asynchronously, so returning before the hooks would
  // change the hook count between renders and crash React.
  if (!allOffers.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-20px' }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* ── Header (mirrors BundleOffer header pattern) ── */}
      <div className="flex items-center gap-2 mb-4">
        <span
          className="w-[30px] h-[30px] rounded-[10px] flex items-center justify-center shrink-0"
          style={{ background: '#EFEFF0', border: '1px solid rgba(0,0,0,0.06)' }}
        >
          <BadgePercent size={15} color={INK} strokeWidth={2.2} />
        </span>
        <div className="text-left">
          <h3 className="text-[11px] font-bold text-gray-800 uppercase tracking-[0.16em] leading-tight">
            Offers for you
          </h3>
          <p className="inline-flex items-center gap-1 text-[9px] mt-[2px]" style={{ color: FAINT }}>
            <CheckCircle2 size={9} color={MUTED} strokeWidth={2.5} />
            Auto-applied at checkout
          </p>
        </div>
        <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, rgba(0,0,0,0.12), transparent)' }} />
        <span
          className="text-[9px] font-bold tracking-[0.06em] whitespace-nowrap px-2.5 py-[5px] rounded-full"
          style={{
            color: '#FFFFFF',
            background: 'linear-gradient(135deg,#2A2A2E,#1A1A1D)',
            border: '1px solid rgba(0,0,0,0.9)',
          }}
        >
          {allOffers.length} OFFERS
        </span>
      </div>

      {/* ── Carousel: arrows + drag-to-scroll row ── */}
      <div className="relative group/offers">
        {/* Prev arrow (desktop) */}
        <button
          type="button"
          aria-label="Previous offers"
          onClick={() => nudge('prev')}
          className={`absolute left-0 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 border border-black/10 bg-white hover:bg-gray-50 active:scale-95 ${
            canPrev ? 'opacity-100' : 'opacity-0 pointer-events-none'
          } hidden sm:flex`}
        >
          <ChevronLeft size={16} color={INK} strokeWidth={2.4} />
        </button>
        {/* Next arrow (desktop) */}
        <button
          type="button"
          aria-label="Next offers"
          onClick={() => nudge('next')}
          className={`absolute right-0 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 border border-black/10 bg-white hover:bg-gray-50 active:scale-95 ${
            canNext ? 'opacity-100' : 'opacity-0 pointer-events-none'
          } hidden sm:flex`}
        >
          <ChevronRight size={16} color={INK} strokeWidth={2.4} />
        </button>

        <div
          ref={scrollerRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onClickCapture={onClickCapture}
          onScroll={updateArrows}
          className="flex flex-row gap-2.5 sm:gap-3 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2 -mx-3 px-3 select-none cursor-grab active:cursor-grabbing [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          style={{ touchAction: 'pan-y' }}
        >
          {allOffers.map((offer, idx) => {
            const { Icon, tint } = themeFor(offer);
            return (
              <motion.div
                key={offer.id || idx}
                initial={{ opacity: 0, y: 14, scale: 0.97 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.07, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ y: -4, transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] } }}
                className="group relative w-[142px] sm:w-[184px] shrink-0 snap-start rounded-xl sm:rounded-2xl border bg-white p-2.5 sm:p-3.5 flex flex-col overflow-hidden cursor-default transition-all duration-300 hover:shadow-[0_14px_34px_rgba(0,0,0,0.10)]"
                style={{
                  borderColor: 'rgba(0,0,0,0.07)',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.05), 0 6px 18px rgba(0,0,0,0.04)',
                  touchAction: 'pan-y',
                }}
              >
                {/* Top accent bar */}
                <span
                  className="absolute top-0 left-3 right-3 h-px pointer-events-none"
                  style={{ background: 'linear-gradient(90deg, transparent, rgba(0,0,0,0.14), transparent)' }}
                />

                {/* Top row: icon chip + badge */}
                <div className="flex items-center justify-between mb-2 sm:mb-2.5 relative z-10">
                  <span
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-[10px] flex items-center justify-center shrink-0"
                    style={{ background: tint, border: '1px solid rgba(0,0,0,0.05)' }}
                  >
                    <Icon size={12} color={INK} strokeWidth={2} className="sm:hidden" />
                    <Icon size={14} color={INK} strokeWidth={2} className="hidden sm:block" />
                  </span>
                  {offer.badge ? (
                    <span
                      className="text-[8px] font-extrabold uppercase tracking-[0.12em] px-1.5 py-[2px] rounded-full"
                      style={{ background: INK, color: '#FFFFFF' }}
                    >
                      {offer.badge}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[8px] font-bold uppercase tracking-[0.12em]" style={{ color: FAINT }}>
                      <CheckCircle2 size={10} color={MUTED} />
                      Auto-applied
                    </span>
                  )}
                </div>

                {/* Offer title */}
                <div
                  className="text-[8px] sm:text-[9px] font-semibold uppercase tracking-[0.1em] mb-0.5 relative z-10"
                  style={{ color: FAINT }}
                >
                  {offer.title}
                </div>

                {/* Highlight — the big offer line */}
                <div
                  className="text-[13px] sm:text-[15px] font-black leading-tight whitespace-normal relative z-10"
                  style={{ fontFamily: "'Jost', sans-serif", color: INK }}
                >
                  {offer.highlight}
                </div>

                {/* Tagline */}
                <div className="mt-auto pt-2 sm:pt-2.5 flex items-start gap-1.5 relative z-10">
                  <span className="w-1 h-1 rounded-full mt-[4px] shrink-0" style={{ background: MUTED }} />
                  <span className="text-[8px] sm:text-[9px] font-medium leading-snug line-clamp-2" style={{ color: MUTED }}>
                    {offer.tagline}
                  </span>
                </div>

                {/* Hover accent line */}
                <span
                  className="absolute bottom-0 left-0 right-0 h-[2px] rounded-b-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ background: 'linear-gradient(90deg, rgba(28,28,30,0.6), transparent)' }}
                />
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
