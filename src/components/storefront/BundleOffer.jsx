import { Check, ChevronDown } from 'lucide-react';
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

const ACCENT_GOLD = '#C9A96E';

const TIER_GRADIENTS = [
  { bg: 'linear-gradient(135deg, #1C1C1E, #2A2722, #1C1C1E)', accent: '#C9A96E', border: '1px solid rgba(201,169,110,0.12)' },
  { bg: 'linear-gradient(135deg, #1A1A24, #252236, #1A1A24)', accent: '#A78BFA', border: '1px solid rgba(167,139,250,0.12)' },
  { bg: 'linear-gradient(135deg, #1C1E1C, #1F2A1E, #1C1E1C)', accent: '#6EE7B7', border: '1px solid rgba(110,231,183,0.12)' },
  { bg: 'linear-gradient(135deg, #1E1C1C, #2A1F1E, #1E1C1C)', accent: '#FCA5A5', border: '1px solid rgba(252,165,165,0.12)' },
];

const DEFAULT_BG = 'linear-gradient(135deg, #1C1C1E, #2A2722, #1C1C1E)';

/**
 * Returns a gradient definition for a tier card based on its state.
 */
function getTierGradient(index, isSelected, isRecommended) {
  const base = TIER_GRADIENTS[index % TIER_GRADIENTS.length];
  if (isSelected) return {
    bg: 'linear-gradient(135deg, #0A0A0B, #1C1C1E, #0A0A0B)',
    accent: '#C9A96E',
    border: '1px solid rgba(201,169,110,0.35)',
    shadow: '0 8px 32px rgba(201,169,110,0.12)',
  };
  if (isRecommended) return {
    ...base,
    shadow: '0 4px 20px rgba(201,169,110,0.08)',
  };
  return {
    bg: 'linear-gradient(135deg, #161618, #1E1E20, #161618)',
    accent: '#6B7280',
    border: '1px solid rgba(255,255,255,0.04)',
    shadow: 'none',
  };
}

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="pt-2"
    >
      {/* Section Header — refined, matching OffersSection language */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 mb-3 group"
      >
        <div className="flex items-center gap-1.5">
          <div
            className="w-1 h-4 rounded-full"
            style={{ background: `linear-gradient(180deg, ${ACCENT_GOLD}, #A68B4E)` }}
          />
          <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em]">
            Buy More, Save More
          </h3>
        </div>
        <div className="flex-1 h-px bg-gradient-to-r from-gray-200/60 via-gray-200/30 to-transparent" />
        {bestTier && currentTier.minQty < bestTier.minQty && (
          <span
            className="text-[9px] font-bold tracking-[0.08em] whitespace-nowrap px-2.5 py-1 rounded-full animate-pulse"
            style={{
              color: ACCENT_GOLD,
              background: `${ACCENT_GOLD}12`,
              border: `1px solid ${ACCENT_GOLD}25`,
            }}
          >
            Up to {bestTier.discount}% off
          </span>
        )}
        <ChevronDown 
          size={13} 
          className={`text-gray-500 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} 
        />
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="bundle-tiers"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <p className="text-[11px] text-gray-500 mb-3.5 leading-relaxed">
              Add more items to your bag and unlock exclusive volume discounts automatically applied at checkout.
            </p>

            {/* Tier Cards — premium gradient design */}
            <div className="grid grid-cols-4 gap-2.5 mb-3.5">                {tierPrices.map((tier, idx) => {
                const isSelected = tier.minQty === currentTier.minQty;
                const isRecommended = tier.minQty === bestTier?.minQty && bestTier?.minQty > 1 && !isSelected;
                const grad = getTierGradient(idx, isSelected, isRecommended);

                return (
                  <motion.button
                    key={tier.minQty}
                    onClick={() => {
                      onSelectTier?.(tier.minQty);
                      setExpanded(false);
                    }}
                    whileTap={{ scale: 0.95 }}
                    whileHover={!isSelected ? { y: -2, scale: 1.02, transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] } } : {}}
                    className="group/tier relative rounded-[12px] transition-all duration-200 overflow-hidden cursor-pointer"
                    style={{
                      background: grad.bg,
                      border: grad.border,
                      boxShadow: grad.shadow || '0 1px 3px rgba(0,0,0,0.2)',
                    }}
                  >
                    {/* Glass-morphism overlay */}
                    <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />

                    {/* Selected/recommended glow */}
                    {(isSelected || isRecommended) && (
                      <div
                        className="absolute -top-6 -right-6 w-16 h-16 rounded-full opacity-15 blur-xl pointer-events-none"
                        style={{ background: `radial-gradient(circle, ${ACCENT_GOLD} 0%, transparent 70%)` }}
                      />
                    )}

                    {/* Top accent bar */}
                    <div
                      className="absolute top-0 inset-x-0 h-[2px] opacity-50"
                      style={{
                        background: `linear-gradient(90deg, transparent, ${isSelected ? ACCENT_GOLD : grad.accent}60, transparent)`,
                      }}
                    />

                    {/* Content */}
                    <div className="relative z-10 p-[10px_8px] flex flex-col items-center gap-0.5">
                      {/* Quantity badge */}
                      <span className="text-[16px] font-black leading-none tracking-tight text-white drop-shadow-sm">
                        {tier.maxQty ? `${tier.minQty}–${tier.maxQty}` : tier.minQty}
                      </span>
                      <span className="text-[8px] font-semibold leading-tight text-white/50">
                        {tier.maxQty ? 'Items' : tier.minQty === 4 ? '4+' : 'Items'}
                      </span>

                      {/* Divider */}
                      <div className="w-5 h-px rounded-full my-1.5 bg-white/[0.08]" />

                      {/* Unit Price */}
                      <span className="text-[12px] font-bold text-white">
                        {formatCurrency(tier.unitPrice)}
                      </span>
                      <span className="text-[7px] text-white/40">each</span>

                      {/* Selected checkmark */}
                      {isSelected && (
                        <div className="absolute -top-1.5 -right-1.5 w-[18px] h-[18px] rounded-full flex items-center justify-center shadow-md"
                          style={{ background: ACCENT_GOLD }}>
                          <Check size={9} className="text-[#1C1C1E]" strokeWidth={3} />
                        </div>
                      )}

                      {/* Recommended badge */}
                      {isRecommended && (
                        <div className="absolute -top-1.5 -right-1.5">
                          <span className="text-[10px] drop-shadow-sm">🔥</span>
                        </div>
                      )}
                    </div>

                    {/* Hover shine effect */}
                    <div className="absolute inset-0 opacity-0 group-hover/tier:opacity-100 transition-opacity duration-500 pointer-events-none">
                      <div
                        className="absolute inset-0"
                        style={{
                          background: `linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.03) 45%, rgba(255,255,255,0.05) 50%, transparent 60%)`,
                        }}
                      />
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* Active savings callout — premium styled */}
            {currentTier.discount > 0 && (
              <div
                className="flex items-center gap-3 rounded-[10px] px-3.5 py-3"
                style={{
                  background: `linear-gradient(135deg, ${ACCENT_GOLD}08, ${ACCENT_GOLD}03)`,
                  border: `1px solid ${ACCENT_GOLD}20`,
                }}
              >
                <div
                  className="w-[30px] h-[30px] rounded-full flex items-center justify-center shrink-0"
                  style={{ background: `${ACCENT_GOLD}15` }}
                >
                  <span className="font-black text-[12px]" style={{ color: ACCENT_GOLD }}>₹</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold" style={{ color: ACCENT_GOLD }}>
                    You save {formatCurrency(tierPrices[currentTierIndex]?.savings || 0)} with this tier!
                  </p>
                  <p className="text-[10px] text-white/50">
                    {currentTier.discount}% off each item • {formatCurrency(currentTier.unitPrice)}/unit
                  </p>
                </div>
                <span
                  className="text-[18px] font-black shrink-0"
                  style={{ color: ACCENT_GOLD }}
                >
                  {currentTier.discount}%
                </span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapsed state - show mini summary */}
      {!expanded && currentTier.discount > 0 && (
        <div 
          onClick={() => setExpanded(true)}
          className="flex items-center justify-between rounded-[10px] px-3.5 py-[10px] cursor-pointer transition-all duration-200 group"
          style={{
            background: `linear-gradient(135deg, ${ACCENT_GOLD}15, ${ACCENT_GOLD}08)`,
            border: `1px solid ${ACCENT_GOLD}30`,
          }}
        >
          <div className="flex items-center gap-2.5">
            <span className="text-base">🎉</span>
            <div>
              <p className="text-[11px] font-bold" style={{ color: ACCENT_GOLD }}>
                {currentTier.label} Bundle — Save {currentTier.discount}%
              </p>
              <p className="text-[10px]" style={{ color: `${ACCENT_GOLD}BB` }}>
                {formatCurrency(tierPrices[currentTierIndex]?.savings || 0)} in savings
              </p>
            </div>
          </div>
          <span
            className="text-[9px] font-semibold px-2.5 py-1 rounded-full transition-colors duration-200"
            style={{
              color: ACCENT_GOLD,
              background: `${ACCENT_GOLD}20`,
            }}
          >
            View tiers
          </span>
        </div>
      )}

      {/* No active discount - show preview of best tier */}
      {!expanded && (!currentTier.discount || currentTier.discount === 0) && (
        <div 
          onClick={() => setExpanded(true)}
          className="flex items-center justify-between rounded-[10px] px-3.5 py-[10px] cursor-pointer transition-all duration-200 group bg-gray-100/60 border border-gray-200/80"
        >
          <div className="flex items-center gap-2.5">
            <span className="text-base">📦</span>
            <div>
              <p className="text-[11px] font-bold text-gray-700">
                Buy more & save up to {bestTier?.discount || 0}%
              </p>
              <p className="text-[10px] text-gray-500">
                Add {bestTier?.minQty || 2}+ items to unlock exclusive pricing
              </p>
            </div>
          </div>
          <span className="text-[9px] font-semibold text-gray-500 bg-gray-200/70 px-2.5 py-1 rounded-full group-hover:bg-gray-300/70 transition-colors duration-200">
            Show
          </span>
        </div>
      )}
    </motion.div>
  );
}
