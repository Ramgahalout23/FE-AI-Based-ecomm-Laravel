import { memo, useMemo } from 'react';

/**
 * "Buy More, Save More" progress widget (selektt-style).
 *
 * Shows how close the cart is to the next volume-discount tier with a
 * segmented progress bar + tier chips, so the progress visibly follows the
 * bundle offer tiers instead of living as plain text.
 *
 * Renders nothing when there are no discount tiers. When the top tier is
 * reached the bar fills to 100% and a "max savings" message shows.
 *
 * @param {number}  totalQty  Total quantity across all cart items.
 * @param {Array}   tiers     Bundle tiers [{minQty, discount, maxQty?}].
 * @param {string}  className Extra classes for the wrapper (e.g. spacing).
 */
function BundleTierProgress({ totalQty = 0, tiers = [], className = '' }) {
  const data = useMemo(() => {
    const discountTiers = (tiers || [])
      .filter((t) => (t?.discount || 0) > 0)
      .sort((a, b) => (a.minQty || 0) - (b.minQty || 0));
    if (!discountTiers.length) return null;

    const topMinQty = discountTiers[discountTiers.length - 1].minQty;
    const current = discountTiers.filter((t) => totalQty >= (t.minQty || 0)).pop() || null;
    const next = discountTiers.find((t) => totalQty < (t.minQty || 0)) || null;
    const progress = Math.min(100, (totalQty / topMinQty) * 100);

    return { discountTiers, topMinQty, current, next, progress, maxed: !next };
  }, [totalQty, tiers]);

  if (!data) return null;

  const { discountTiers, topMinQty, current, next, progress, maxed } = data;
  const needed = next ? next.minQty - totalQty : 0;
  const shownQty = Math.min(totalQty, topMinQty);

  return (
    <div className={`bg-gradient-to-b from-amber-50 to-amber-100/70 border border-amber-200 rounded-xl px-3.5 py-3 ${className}`}>
      {/* Headline */}
      <div className="flex items-start gap-2">
        <span className="text-sm leading-none shrink-0 mt-0.5">{maxed ? '🎉' : '🔥'}</span>
        <div className="min-w-0">
          {maxed ? (
            <p className="text-xs font-bold text-amber-900 leading-tight">
              You've unlocked {current?.discount}% off your order!
            </p>
          ) : (
            <p className="text-xs font-bold text-amber-900 leading-tight">
              Add {needed} more item{needed > 1 ? 's' : ''} to get {next?.discount}% off!
            </p>
          )}
          <p className="text-[10px] font-medium text-amber-700/80 mt-0.5">
            {shownQty} of {topMinQty} items {maxed ? '— max savings reached' : 'in your cart'}
          </p>
        </div>
      </div>

      {/* Segmented progress bar */}
      <div
        className="relative mt-2.5 h-[6px] bg-amber-200/70 rounded-full overflow-visible"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
        aria-label={`${shownQty} of ${topMinQty} items`}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 transition-all duration-700 ease-out"
          style={{ width: `${progress}%` }}
        />
        {discountTiers.map((tier) => {
          const pos = (tier.minQty / topMinQty) * 100;
          const reached = totalQty >= (tier.minQty || 0);
          return (
            <span
              key={tier.minQty}
              className={`absolute top-1/2 -translate-y-1/2 w-[10px] h-[10px] rounded-full border-2 transition-colors duration-300 ${
                reached ? 'bg-amber-600 border-white shadow-sm' : 'bg-amber-200 border-white'
              }`}
              style={{ left: `calc(${pos}% - 5px)` }}
              aria-hidden="true"
            />
          );
        })}
      </div>

      {/* Tier chips */}
      <div className="mt-2 flex items-center justify-between gap-1">
        {discountTiers.map((tier) => {
          const reached = totalQty >= (tier.minQty || 0);
          const isNext = next && tier.minQty === next.minQty;
          return (
            <span
              key={tier.minQty}
              className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap transition-colors duration-300 ${
                reached
                  ? 'bg-amber-500 text-white'
                  : isNext
                    ? 'bg-amber-100 text-amber-800 ring-1 ring-amber-400'
                    : 'text-amber-700/50 bg-amber-100/60'
              }`}
            >
              {tier.minQty}+ · {tier.discount}% off
            </span>
          );
        })}
      </div>
    </div>
  );
}

export default memo(BundleTierProgress);
