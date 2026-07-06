import { Gift, Tag, Percent, Zap, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

const OFFER_ICONS = {
  FIRST_ORDER: Gift,
  PERCENTAGE: Percent,
  FIXED: Tag,
  FREE_SHIPPING: Zap,
};

function getOfferIcon(type) {
  const Icon = OFFER_ICONS[type] || Tag;
  return Icon;
}

function getOfferGradient(type) {
  switch (type) {
    case 'FIRST_ORDER': return { bg: 'from-rose-500 to-pink-600', badge: 'bg-rose-100 text-rose-700 border-rose-200', iconBg: 'bg-rose-100', iconColor: 'text-rose-600' };
    case 'PERCENTAGE': return { bg: 'from-violet-500 to-purple-600', badge: 'bg-violet-100 text-violet-700 border-violet-200', iconBg: 'bg-violet-100', iconColor: 'text-violet-600' };
    case 'FIXED': return { bg: 'from-emerald-500 to-teal-600', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200', iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600' };
    case 'FREE_SHIPPING': return { bg: 'from-amber-500 to-orange-600', badge: 'bg-amber-100 text-amber-700 border-amber-200', iconBg: 'bg-amber-100', iconColor: 'text-amber-600' };
    default: return { bg: 'from-blue-500 to-indigo-600', badge: 'bg-blue-100 text-blue-700 border-blue-200', iconBg: 'bg-blue-100', iconColor: 'text-blue-600' };
  }
}

function formatOfferDescription(promo) {
  const parts = [];
  
  if (promo.type === 'FIRST_ORDER' || promo.title?.toLowerCase().includes('first')) {
    parts.push('First order');
  }
  
  if (promo.discount) {
    if (promo.type === 'PERCENTAGE' || promo.type === 'FIRST_ORDER') {
      parts.push(`${promo.discount}% off`);
    } else {
      parts.push(`Save ₹${Math.round(promo.discount)}`);
    }
  } else {
    parts.push(promo.title || 'Special offer');
  }
  
  if (promo.min_purchase && parseFloat(promo.min_purchase) > 0) {
    parts.push(`on orders above ₹${Math.round(promo.min_purchase)}`);
  } else {
    parts.push('on all orders');
  }
  
  if (promo.max_discount) {
    parts.push(`(up to ₹${Math.round(promo.max_discount)})`);
  }
  
  return parts.join(' ');
}

export default function OffersSection({ promotions = [] }) {
  // Filter to get non-flash-sale general offers
  // General offers are site-wide (no product/category restrictions, or no end date)
  const generalOffers = promotions.filter(p => {
    const isFlashSale = p.endDate || (p.products?.length > 0) || (p.categories?.length > 0);
    return !isFlashSale && p.isActive !== false;
  });

  if (!generalOffers.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="pt-4 mt-2"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-5 rounded-full bg-gradient-to-b from-violet-500 to-pink-500" />
          <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Available Offers</h3>
        </div>
        <div className="flex-1 h-px bg-gradient-to-r from-gray-200 via-gray-200 to-transparent" />
      </div>

      <div className="space-y-2.5">
        {generalOffers.map((promo, idx) => {
          const Icon = getOfferIcon(promo.type);
          const colors = getOfferGradient(promo.type);
          const description = formatOfferDescription(promo);
          
          return (
            <motion.div
              key={promo.id || idx}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: idx * 0.07, ease: [0.16, 1, 0.3, 1] }}
              className="group relative bg-white rounded-xl border border-gray-200/80 hover:border-gray-300/80 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden"
            >
              {/* Left gradient accent bar */}
              <div className={`absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b ${colors.bg} group-hover:w-[4px] transition-all duration-300`} />
              
              <div className="flex items-start gap-3 p-3.5 pl-[18px] group-hover:pl-[19px] transition-all duration-300">
                {/* Icon */}
                <div className={`w-9 h-9 rounded-lg ${colors.iconBg} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300`}>
                  <Icon size={16} className={colors.iconColor} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[13px] font-bold text-gray-900 leading-tight block truncate">
                        {promo.title || 'Special Offer'}
                      </span>
                      <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                        {promo.description || description}
                      </p>
                    </div>
                    <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all duration-200 shrink-0 mt-0.5" />
                  </div>

                  {/* Badges row */}
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    {promo.discount && (
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${colors.badge}`}>
                        {promo.type === 'FIRST_ORDER' || promo.type === 'PERCENTAGE'
                          ? `${Math.round(promo.discount)}% off`
                          : `₹${Math.round(promo.discount)} off`}
                      </span>
                    )}
                    {promo.min_purchase && parseFloat(promo.min_purchase) > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                        Min. ₹{Math.round(promo.min_purchase)}
                      </span>
                    )}
                    {promo.coupon_code && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        <Tag size={9} />
                        {promo.coupon_code}
                      </span>
                    )}
                    {promo.max_discount && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                        Up to ₹{Math.round(promo.max_discount)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Hover shimmer effect */}
              <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <div className="absolute top-0 left-1/3 w-1/3 h-full bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-[-20deg] animate-shimmer" />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Shimmer animation keyframes */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%) skewX(-20deg); }
          100% { transform: translateX(200%) skewX(-20deg); }
        }
        .animate-shimmer {
          animation: shimmer 2s ease-in-out infinite;
        }
      `}</style>
    </motion.div>
  );
}
