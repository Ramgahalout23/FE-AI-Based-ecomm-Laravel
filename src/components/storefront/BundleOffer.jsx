import { Check, ChevronDown, Flame, PartyPopper, TrendingUp, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { formatCurrency } from '../../utils/formatters';
import { BUNDLE_TIERS } from '../../utils/constants';

/**
 * Human label for a tier: shows the quantity window when a maxQty cap is set
 * (e.g. "Buy 2–3") or an open-ended "Buy X+" style label otherwise.
 */
const tierLabel = (t) =>
  t.maxQty
    ? `Buy ${t.minQty}–${t.maxQty}`
    : t.discount > 0 ? `Buy ${t.minQty}+` : `Buy ${t.minQty}`;

// Derived from the shared BUNDLE_TIERS so the display and the actual
// cart/checkout calculation can never drift apart.
const DEFAULT_TIERS = BUNDLE_TIERS.map((t) => ({
  ...t,
  label: tierLabel(t),
  badge: t.discount > 0 ? `Save ${t.discount}%` : null,
}));

/**
 * Normalize admin-configured tiers ({minQty, discount, maxQty?}) into
 * display-ready tiers with a human label + badge, matching the derived
 * DEFAULT_TIERS shape.
 */
const normalizeTiers = (tiers) =>
  (tiers && tiers.length ? tiers : DEFAULT_TIERS).map((t) => ({
    ...t,
    label: t.label || tierLabel(t),
    badge: t.badge ?? (t.discount > 0 ? `Save ${t.discount}%` : null),
  }));

// ── Palette: light premium (black brand, no gold) ──
const INK = '#1C1C1E';
const INK_70 = 'rgba(28,28,30,0.70)';
const INK_55 = 'rgba(28,28,30,0.55)';
const INK_40 = 'rgba(28,28,30,0.40)';
const INK_12 = 'rgba(28,28,30,0.10)';
const INK_08 = 'rgba(28,28,30,0.07)';
const INK_05 = 'rgba(28,28,30,0.05)';

const CARD_BG = '#FFFFFF';
const CARD_BORDER = '1px solid rgba(0,0,0,0.09)';

export default function BundleOffer({ 
  basePrice = 0, 
  tiers = DEFAULT_TIERS,
  onSelectTier,
  selectedQty = 1,
  isInStock = true,
}) {
  const [expanded, setExpanded] = useState(false);

  if (!basePrice || !isInStock) return null;

  // Normalize admin-configured tiers (they may lack label/badge) for display
  const normalizedTiers = normalizeTiers(tiers);

  // Find the current tier based on selected qty — honors per-tier maxQty windows
  const currentTier = normalizedTiers.reduce((best, t) => {
    const inWindow = selectedQty >= t.minQty && (!t.maxQty || selectedQty <= t.maxQty);
    return inWindow && t.discount > (best ? best.discount : -1) ? t : best;
  }, null) || normalizedTiers[0];

  const currentTierIndex = normalizedTiers.findIndex(t => t.minQty === currentTier.minQty);

  // Effective qty used for the total/savings preview — capped at the tier's maxQty
  const effQtyFor = (tier) => {
    const qty = Math.max(tier.minQty, selectedQty);
    return tier.maxQty ? Math.min(qty, tier.maxQty) : qty;
  };

  // Calculate per-unit pricing for each tier
  const tierPrices = normalizedTiers.map(tier => ({
    ...tier,
    unitPrice: basePrice * (1 - tier.discount / 100),
    totalPrice: basePrice * (1 - tier.discount / 100) * effQtyFor(tier),
    savings: tier.discount > 0 ? basePrice * (tier.discount / 100) * effQtyFor(tier) : 0,
  }));

  // Highest-discount tier (tiers are sorted ascending by minQty, so the last
  // one with a discount is the top tier) — adapts to admin-configured tiers.
  const bestTier = [...normalizedTiers].reverse().find(t => t.discount > 0);

  const showUpTo = bestTier && currentTier.minQty < bestTier.minQty;

  // ── Savings-meter derived state ──
  // The next (unlocked) tier strictly above the current quantity.
  const nextTier = normalizedTiers.find(
    (t) => t.discount > 0 && selectedQty < t.minQty && (!t.maxQty || selectedQty < t.maxQty)
  ) || null;
  const itemsToNext = nextTier ? Math.max(1, nextTier.minQty - selectedQty) : 0;
  const maxTierReached = !nextTier;

  // Live savings at the current quantity (from the active tier) — only
  // counts once the user has actually reached the tier's min quantity.
  const tierReached = currentTier && selectedQty >= currentTier.minQty;
  const currentSavings = tierReached && currentTier?.discount > 0
    ? Math.round(basePrice * (currentTier.discount / 100) * effQtyFor(currentTier))
    : 0;

  // Filled / active / future state per tier segment
  const segmentState = (tier) => {
    const reached = selectedQty >= tier.minQty;
    const isActive = reached && (tier.minQty === currentTier?.minQty);
    const isNext = !reached && nextTier && tier.minQty === nextTier.minQty;
    return { reached, isActive, isNext };
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="pt-1"
    >
      {/* ── Light premium card container ── */}
      <div
        style={{
          background: CARD_BG,
          border: CARD_BORDER,
          borderRadius: 18,
          padding: '18px 16px 16px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.05), 0 10px 30px rgba(0,0,0,0.06)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Soft ambient glow */}
        <div
          style={{
            position: 'absolute',
            top: -60,
            right: -60,
            width: 180,
            height: 180,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(0,0,0,0.035) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 16,
            right: 16,
            height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(0,0,0,0.14), transparent)',
            pointerEvents: 'none',
          }}
        />

        {/* ── Header row ── */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center gap-2 mb-4 group relative z-10"
        >
          <div className="flex items-center gap-2">
            <span
              className="w-[30px] h-[30px] rounded-[10px] flex items-center justify-center shrink-0"
              style={{ background: INK_08, color: INK }}
            >
              <TrendingUp size={15} strokeWidth={2.2} />
            </span>
            <div className="text-left">
              <h3 className="text-[11px] font-bold text-gray-800 uppercase tracking-[0.16em] leading-tight">
                Buy More, Save More
              </h3>
              <p className="text-[9px] mt-[2px]" style={{ color: INK_55 }}>
                Auto-applied at checkout
              </p>
            </div>
          </div>
          <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, rgba(0,0,0,0.12), transparent)' }} />
          {showUpTo && (
            <span
              className="text-[9px] font-bold tracking-[0.08em] whitespace-nowrap px-2.5 py-[5px] rounded-full animate-pulse"
              style={{ color: '#FFFFFF', background: INK, border: '1px solid rgba(0,0,0,0.9)' }}
            >
              UP TO {bestTier.discount}% OFF
            </span>
          )}
          <span
            className="w-[26px] h-[26px] rounded-full flex items-center justify-center transition-all duration-300"
            style={{
              background: expanded ? INK : INK_08,
              color: expanded ? '#FFFFFF' : INK_70,
            }}
          >
            <ChevronDown size={14} style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }} />
          </span>
        </button>

        {/* ── Savings meter ── */}
        <div className="relative z-10 mb-4">
          {/* Meter top row: savings so far + next-tier nudge */}
          <div className="flex items-end justify-between gap-3 mb-3">
            <div>
              <p className="text-[11px] font-bold" style={{ color: INK }}>
                {maxTierReached
                  ? `Best price unlocked — ${bestTier.discount}% off`
                  : `Add ${itemsToNext} more item${itemsToNext > 1 ? 's' : ''} → ${nextTier.discount}% off`}
              </p>
              <p className="text-[10px] mt-[2px]" style={{ color: INK_55 }}>
                {maxTierReached
                  ? `You're saving ${formatCurrency(currentSavings)} on this tier`
                  : currentSavings > 0
                    ? `You're saving ${formatCurrency(currentSavings)} on this tier`
                    : `Auto-applied at checkout · Up to ${bestTier.discount}% off`}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[9px] font-bold uppercase tracking-[0.1em]" style={{ color: INK_40 }}>
                Saved
              </p>
              <p className="text-[18px] font-black leading-none" style={{ color: INK }}>
                {formatCurrency(currentSavings)}
              </p>
            </div>
          </div>

          {/* Segmented progress bar */}
          <div className="flex gap-1.5">
            {tierPrices.map((tier) => {
              const { reached, isActive, isNext } = segmentState(tier);
              const pct = tier.discount;
              return (
                <button
                  key={tier.minQty}
                  onClick={() => onSelectTier?.(tier.minQty)}
                  aria-label={`${tier.minQty}+ items → ${pct}% off`}
                  className="flex-1 flex flex-col gap-1.5 items-stretch cursor-pointer group/seg"
                >
                  {/* Segment label */}
                  <div className="flex items-center justify-between px-0.5">
                    <span
                      className="text-[9px] font-extrabold tracking-wide"
                      style={{ color: reached ? INK : isNext ? INK : INK_40 }}
                    >
                      {tier.minQty}+
                    </span>
                    <span
                      className={`text-[9px] font-bold ${isNext ? 'animate-pulse' : ''}`}
                      style={{ color: reached ? INK : isNext ? INK : INK_40 }}
                    >
                      {pct}%
                    </span>
                  </div>
                  {/* Segment track */}
                  <span
                    className="block h-[7px] rounded-full transition-all duration-300 group-hover/seg:opacity-80"
                    style={{
                      background: reached
                        ? `linear-gradient(90deg, ${INK}, ${isActive ? INK : INK_70})`
                        : isNext
                          ? 'repeating-linear-gradient(45deg, rgba(28,28,30,0.45) 0 5px, rgba(28,28,30,0.18) 5px 10px)'
                          : INK_12,
                      boxShadow: isActive ? `0 0 0 2px rgba(28,28,30,0.15)` : 'none',
                    }}
                  />
                  {/* Active marker */}
                  {isActive && (
                    <span className="flex items-center justify-center gap-1 text-[8px] font-bold uppercase tracking-[0.08em]" style={{ color: INK }}>
                      <Check size={9} strokeWidth={3.5} /> you're here
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Next-tier callout CTA (when a tier is still unlocked) ── */}
        {!maxTierReached && nextTier && (
          <button
            onClick={() => onSelectTier?.(nextTier.minQty)}
            className="relative z-10 w-full flex items-center justify-between gap-3 rounded-[12px] px-3.5 py-3 cursor-pointer transition-all duration-200 group/cta"
            style={{ background: INK, border: '1px solid rgba(0,0,0,0.9)' }}
          >
            <span className="w-[30px] h-[30px] rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.14)' }}>
              <Flame size={14} color="#FFFFFF" strokeWidth={2.2} />
            </span>
            <span className="flex-1 text-left min-w-0">
              <span className="block text-[12px] font-bold text-white leading-tight">
                Unlock {nextTier.discount}% off with {nextTier.minQty} items
              </span>
              <span className="block text-[10px] mt-[2px]" style={{ color: 'rgba(255,255,255,0.65)' }}>
                {formatCurrency(tierPrices.find(t => t.minQty === nextTier.minQty)?.unitPrice || 0)}/item · you save {formatCurrency(Math.round(basePrice * (nextTier.discount / 100) * nextTier.minQty))}
              </span>
            </span>
            <span className="w-[26px] h-[26px] rounded-full flex items-center justify-center shrink-0 transition-transform duration-200 group-hover/cta:translate-x-0.5" style={{ background: 'rgba(255,255,255,0.14)' }}>
              <ArrowRight size={13} color="#FFFFFF" strokeWidth={2.4} />
            </span>
          </button>
        )}

        {/* ── Best price achieved CTA ── */}          {maxTierReached && bestTier && currentSavings > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="relative z-10 w-full flex items-center justify-between gap-3 rounded-[12px] px-3.5 py-3 cursor-pointer transition-all duration-200 group/cta"
            style={{ background: INK_05, border: '1px solid rgba(0,0,0,0.08)' }}
          >
            <span className="w-[30px] h-[30px] rounded-full flex items-center justify-center shrink-0" style={{ background: INK }}>
              <PartyPopper size={14} color="#FFFFFF" strokeWidth={2.2} />
            </span>
            <span className="flex-1 text-left min-w-0">
              <span className="block text-[12px] font-bold leading-tight" style={{ color: INK }}>
                Best bundle price applied — {bestTier.discount}% off
              </span>
              <span className="block text-[10px] mt-[2px]" style={{ color: INK_55 }}>
                {formatCurrency(currentSavings)} saved · tap for per-item pricing
              </span>
            </span>
            <ChevronDown size={15} color={INK} style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }} />
          </button>
        )}

        {/* ── Expandable per-tier detail ── */}
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              key="bundle-tiers"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden relative z-10"
            >
              <div className="h-px my-4" style={{ background: 'rgba(0,0,0,0.07)' }} />
              <p className="text-[11px] mb-4 leading-relaxed" style={{ color: INK_55 }}>
                Volume pricing applied to your whole order automatically at checkout.
              </p>

              {/* Tier Cards — 2×2 on mobile, 4 across on ≥640px */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
                {tierPrices.map((tier, idx) => {
                  const { reached, isActive } = segmentState(tier);
                  const isSelected = tier.minQty === currentTier.minQty;
                  const isRecommended = tier.minQty === bestTier?.minQty && bestTier?.minQty > 1 && !isSelected;
                  const isDark = isSelected || reached;

                  return (
                    <motion.button
                      key={tier.minQty}
                      onClick={() => {
                        onSelectTier?.(tier.minQty);
                      }}
                      whileTap={{ scale: 0.96 }}
                      whileHover={!isSelected ? { y: -2, scale: 1.02, transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] } } : {}}
                      aria-label={`${tier.label} — save ${tier.discount}%`}
                      className="relative rounded-[14px] transition-all duration-200 overflow-hidden cursor-pointer"
                      style={{
                        background: isDark
                          ? 'linear-gradient(160deg, #26262A 0%, #141416 100%)'
                          : 'linear-gradient(160deg, #FFFFFF, #F7F7F8)',
                        border: isDark ? '1px solid rgba(0,0,0,0.9)' : '1px solid rgba(0,0,0,0.08)',
                        boxShadow: isSelected ? '0 10px 26px rgba(0,0,0,0.28)' : '0 2px 8px rgba(0,0,0,0.05)',
                      }}
                    >
                      {/* Glass overlay */}
                      <div className={`absolute inset-0 pointer-events-none ${isDark ? '' : 'bg-gradient-to-b from-black/[0.02] to-transparent'}`} />

                      {/* Top accent bar */}
                      <div
                        className="absolute top-0 inset-x-0 h-[2px]"
                        style={{ background: `linear-gradient(90deg, transparent, ${isDark ? '#FFFFFF' : INK}${isDark ? '' : '44'}, transparent)` }}
                      />

                      {/* Content */}
                      <div className="relative z-10 p-[12px_8px] flex flex-col items-center gap-1">
                        <span
                          className="text-[22px] font-black leading-none tracking-tight"
                          style={{ color: isDark ? '#FFFFFF' : INK }}
                        >
                          {tier.maxQty ? `${tier.minQty}–${tier.maxQty}` : `${tier.minQty}+`}
                        </span>
                        <span
                          className="text-[8px] font-semibold uppercase tracking-[0.14em]"
                          style={{ color: isDark ? 'rgba(255,255,255,0.55)' : INK_55 }}
                        >
                          Items
                        </span>

                        <div className="w-5 h-px rounded-full my-1" style={{ background: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)' }} />

                        {/* Discount badge */}
                        <span
                          className="text-[13px] font-extrabold leading-none"
                          style={{ color: isDark ? '#FFFFFF' : INK }}
                        >
                          {tier.discount}% off
                        </span>
                        <span
                          className="text-[8px]"
                          style={{ color: isDark ? 'rgba(255,255,255,0.55)' : INK_55 }}
                        >
                          {formatCurrency(tier.unitPrice)} each
                        </span>

                        {/* Selected check */}
                        {isSelected && (
                          <span className="absolute top-2 right-2 w-[16px] h-[16px] rounded-full flex items-center justify-center" style={{ background: '#FFFFFF' }}>
                            <Check size={9} color={INK} strokeWidth={3} />
                          </span>
                        )}
                        {/* Recommended flame */}
                        {isRecommended && (
                          <span className="absolute top-2 right-2 w-[16px] h-[16px] rounded-full flex items-center justify-center" style={{ background: INK, boxShadow: '0 2px 8px rgba(0,0,0,0.18)' }}>
                            <Flame size={9} color="#FFFFFF" strokeWidth={2.5} />
                          </span>
                        )}
                        {/* Reached check */}
                        {reached && !isSelected && (
                          <span className="absolute top-2 right-2 w-[16px] h-[16px] rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.85)' }}>
                            <Check size={9} color={INK} strokeWidth={3} />
                          </span>
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {/* Active savings callout */}
              {currentTier.discount > 0 && (
                <div
                  className="flex items-center gap-3 rounded-[12px] px-3.5 py-3"
                  style={{ background: INK_05, border: '1px solid rgba(0,0,0,0.08)' }}
                >
                  <div className="w-[32px] h-[32px] rounded-full flex items-center justify-center shrink-0" style={{ background: INK, color: '#FFFFFF' }}>
                    <PartyPopper size={15} strokeWidth={2.2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold" style={{ color: INK }}>
                      You save {formatCurrency(currentSavings)} with this tier!
                    </p>
                    <p className="text-[10px] mt-[2px]" style={{ color: INK_55 }}>
                      {currentTier.discount}% off each item · {formatCurrency(tierPrices[currentTierIndex]?.unitPrice || 0)}/unit
                    </p>
                  </div>
                  <span className="text-[22px] font-black shrink-0" style={{ color: INK }}>
                    {currentTier.discount}%
                  </span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
