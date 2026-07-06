import { Check, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { formatCurrency } from '../../utils/formatters';

const DEFAULT_TIERS = [
  { minQty: 1, label: 'Buy 1', discount: 0, badge: null },
  { minQty: 2, label: 'Buy 2', discount: 5, badge: 'Save 5%' },
  { minQty: 3, label: 'Buy 3', discount: 10, badge: 'Save 10%' },
  { minQty: 4, label: 'Buy 4+', discount: 15, badge: 'Save 15%' },
];

function getTierColor(index, isSelected, isRecommended) {
  if (isRecommended) return { bg: 'from-amber-400 to-orange-500', border: 'border-amber-400', shadow: 'shadow-amber-200/50', text: 'text-amber-900', textLight: 'text-amber-700' };
  if (isSelected) return { bg: 'from-gray-800 to-gray-900', border: 'border-gray-800', shadow: 'shadow-gray-200/50', text: 'text-white', textLight: 'text-gray-300' };
  return { bg: 'from-gray-50 to-gray-100', border: 'border-gray-200', shadow: 'shadow-transparent', text: 'text-gray-900', textLight: 'text-gray-500' };
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

  // Find the current tier based on selected qty
  const currentTier = [...tiers]
    .reverse()
    .find(t => selectedQty >= t.minQty) || tiers[0];
  
  const currentTierIndex = tiers.findIndex(t => t.minQty === currentTier.minQty);

  // Calculate per-unit pricing for each tier
  const tierPrices = tiers.map(tier => ({
    ...tier,
    unitPrice: basePrice * (1 - tier.discount / 100),
    totalPrice: basePrice * (1 - tier.discount / 100) * Math.max(tier.minQty, selectedQty >= tier.minQty ? selectedQty : tier.minQty),
    savings: tier.discount > 0 ? basePrice * (tier.discount / 100) * Math.max(tier.minQty, selectedQty >= tier.minQty ? selectedQty : tier.minQty) : 0,
  }));

  const bestTier = [...tiers].reverse().find(t => t.discount > 0 && t.minQty <= 4);
  const bestTierIndex = tiers.findIndex(t => t.minQty === bestTier?.minQty);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="pt-2"
    >
      {/* Section Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 mb-2.5 group"
      >
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-5 rounded-full bg-gradient-to-b from-amber-500 to-orange-500" />
          <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
            Buy More, Save More
          </h3>
        </div>
        <div className="flex-1 h-px bg-gradient-to-r from-amber-200 via-amber-100 to-transparent" />
        {bestTier && currentTier.minQty < 4 && (
          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 whitespace-nowrap animate-pulse">
            🔥 Up to {bestTier.discount}% off
          </span>
        )}
        <ChevronDown 
          size={14} 
          className={`text-gray-400 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} 
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
            <p className="text-[11px] text-gray-500 mb-3 leading-relaxed">
              Add more items to your bag and unlock exclusive volume discounts automatically applied at checkout.
            </p>

            {/* Tier Cards */}
            <div className="grid grid-cols-4 gap-2 mb-3">
              {tierPrices.map((tier, idx) => {
                const isSelected = tier.minQty === currentTier.minQty;
                const isRecommended = tier.minQty === bestTier?.minQty && bestTier?.minQty > 1 && !isSelected;
                const colors = getTierColor(idx, isSelected, isRecommended);
                const savings = tier.savings;

                return (
                  <motion.button
                    key={tier.minQty}
                    onClick={() => {
                      onSelectTier?.(tier.minQty);
                      setExpanded(false);
                    }}
                    whileTap={{ scale: 0.96 }}
                    className={`relative rounded-xl border-2 transition-all duration-200 overflow-hidden
                      ${isSelected ? colors.border + ' shadow-lg ' + colors.shadow : ''}
                      ${isRecommended ? colors.border + ' shadow-md' : ''}
                      ${!isSelected && !isRecommended ? 'border-gray-200 hover:border-gray-300 hover:shadow-sm' : ''}
                    `}
                  >
                    {/* Gradient background for selected/recommended */}
                    {(isSelected || isRecommended) && (
                      <div className={`absolute inset-0 bg-gradient-to-b ${colors.bg} opacity-[0.97]`} />
                    )}

                    {/* Content */}
                    <div className={`relative p-2.5 flex flex-col items-center gap-0.5 ${isSelected || isRecommended ? 'text-white' : ''}`}>
                      {/* Quantity badge */}
                      <span className={`text-[17px] font-black leading-none tracking-tight ${isSelected || isRecommended ? 'text-white' : 'text-gray-900'}`}>
                        {tier.minQty}
                      </span>
                      <span className={`text-[9px] font-semibold leading-tight ${isSelected || isRecommended ? 'text-white/80' : 'text-gray-500'}`}>
                        {tier.minQty === 4 ? '4+' : 'Items'}
                      </span>

                      {/* Divider */}
                      <div className={`w-6 h-[2px] rounded-full my-1.5 ${isSelected || isRecommended ? 'bg-white/30' : 'bg-gray-200'}`} />

                      {/* Unit Price */}
                      <span className={`text-[12px] font-bold ${isSelected || isRecommended ? 'text-white' : 'text-gray-900'}`}>
                        {formatCurrency(tier.unitPrice)}
                      </span>
                      <span className={`text-[8px] ${isSelected || isRecommended ? 'text-white/60' : 'text-gray-400'}`}>each</span>

                      {/* Selected checkmark */}
                      {isSelected && (
                        <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white flex items-center justify-center shadow-md">
                          <Check size={10} className="text-gray-900" />
                        </div>
                      )}

                      {/* Recommended badge */}
                      {isRecommended && (
                        <div className="absolute -top-2 -right-2">
                          <span className="text-[8px]">🔥</span>
                        </div>
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* Active savings callout */}
            {currentTier.discount > 0 && (
              <div className="flex items-center gap-2 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg px-3 py-2.5">
                <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                  <span className="text-amber-600 font-bold text-[11px]">₹</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-amber-800">
                    You save {formatCurrency(savings)} with this tier!
                  </p>
                  <p className="text-[10px] text-amber-600">
                    {currentTier.discount}% off each item • {formatCurrency(currentTier.unitPrice)}/unit
                  </p>
                </div>
                <span className="text-[18px] font-black text-amber-500 shrink-0">{currentTier.discount}%</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapsed state - show mini summary */}
      {!expanded && currentTier.discount > 0 && (
        <div 
          onClick={() => setExpanded(true)}
          className="flex items-center justify-between bg-gradient-to-r from-amber-50/80 to-orange-50/80 rounded-lg px-3 py-2 border border-amber-200/60 cursor-pointer hover:from-amber-50 hover:to-orange-50 transition-all duration-200 group"
        >
          <div className="flex items-center gap-2">
            <span className="text-base">🎉</span>
            <div>
              <p className="text-[11px] font-bold text-amber-800">
                {currentTier.label} Bundle — Save {currentTier.discount}%
              </p>
              <p className="text-[10px] text-amber-600">
                {formatCurrency(tierPrices[currentTierIndex]?.savings || 0)} in savings
              </p>
            </div>
          </div>
          <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 px-2 py-1 rounded-full group-hover:bg-amber-200 transition-colors">
            View tiers
          </span>
        </div>
      )}

      {/* No active discount - show preview of best tier */}
      {!expanded && (!currentTier.discount || currentTier.discount === 0) && (
        <div 
          onClick={() => setExpanded(true)}
          className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 border border-gray-200 cursor-pointer hover:bg-gray-100 transition-all duration-200 group"
        >
          <div className="flex items-center gap-2">
            <span className="text-base">📦</span>
            <div>
              <p className="text-[11px] font-bold text-gray-700">
                Buy more & save up to {bestTier?.discount || 15}%
              </p>
              <p className="text-[10px] text-gray-500">
                Add 2+ items to unlock exclusive pricing
              </p>
            </div>
          </div>
          <span className="text-[10px] font-semibold text-gray-500 bg-gray-200 px-2 py-1 rounded-full group-hover:bg-gray-300 transition-colors">
            Show
          </span>
        </div>
      )}
    </motion.div>
  );
}
