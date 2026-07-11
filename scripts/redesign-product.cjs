const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../src/pages/storefront/ProductDetailPage.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// Helper: simple string replacement
function replaceAll(str, from, to) {
  return str.split(from).join(to);
}

// 1. Page background: bg-gray-50 -> bg-white (main, loading, error)
content = replaceAll(content, 'className="bg-gray-50 min-h-screen pb-24 lg:pb-20">\n      \n      {/* SEO', 'className="bg-white min-h-screen pb-24 lg:pb-20">\n      \n      {/* SEO');

// 2. Loading state background
content = replaceAll(content, 'className="min-h-screen bg-gray-50 pb-24 lg:pb-20">\n        {/* Breadcrumb skeleton */}\n        <div className="max-w-[1400px]', 'className="min-h-screen bg-white pb-24 lg:pb-20">\n        {/* Breadcrumb skeleton */}\n        <div className="max-w-[1400px]');

// 3. Not found state background
content = replaceAll(content, 'className="min-h-screen bg-gray-50 flex items-center justify-center px-4">', 'className="min-h-screen bg-white flex items-center justify-center px-4">');

// 4. Layout container - wider, less gap
content = replaceAll(content, 'max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">\n        <div className="flex flex-col lg:flex-row gap-8 lg:gap-16">', 'max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">\n        <div className="flex flex-col lg:flex-row gap-6 lg:gap-12">');

// 5. Info card - remove thick border + shadow combo, use refined shadow
content = replaceAll(
  content,
  'rounded-3xl border border-gray-200/80 shadow-[0_2px_30px_-8px_rgba(0,0,0,0.08),0_0_0_1px_rgba(0,0,0,0.02)_inset]',
  'rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.04)]'
);

// 6. Category badge - from pill to text-only
content = replaceAll(
  content,
  'text-[10px] font-bold text-white bg-black/80 px-3.5 py-1.5 rounded-full uppercase tracking-[0.15em] mb-3 shadow-sm',
  'text-[11px] font-medium text-gray-400 uppercase tracking-[0.2em] mb-4'
);

// 7. Product title - refined typography
content = replaceAll(
  content,
  'text-[22px] md:text-[34px] font-display font-extrabold text-gray-900 leading-[1.15] mb-3 tracking-tight',
  'text-[24px] md:text-[36px] font-display font-bold text-gray-900 leading-[1.1] mb-4 tracking-[-0.02em]'
);

// 8. Rating stars - smaller, more refined
content = replaceAll(
  content,
  '<Star size={13} key={i} className={i < Math.floor(product.rating || 5) ? "text-amber-500 fill-amber-500" : "text-gray-200 fill-gray-200"} />',
  '<Star size={12} key={i} className={i < Math.floor(product.rating || 5) ? "text-amber-400 fill-amber-400" : "text-gray-200 fill-gray-200"} />'
);

// 9. Rating row - more refined
content = replaceAll(
  content,
  'mb-2">\n                  <div className="flex items-center gap-0.5">\n                    {[...Array(5)].map((_, i) => (\n                      <Star size={12}',
  'mb-2">\n                  <div className="flex items-center gap-1">\n                    <div className="flex items-center gap-0.5">\n                      {[...Array(5)].map((_, i) => (\n                      <Star size={12}'
);

// 10. Price styling - cleaner
content = replaceAll(
  content,
  'text-[26px] md:text-[32px] font-display font-extrabold text-black tracking-tight',
  'text-[28px] md:text-[34px] font-display font-bold text-gray-900 tracking-[-0.02em]'
);

// 11. Discount badge - cleaner
content = replaceAll(
  content,
  'bg-black text-white text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm',
  'bg-gray-900 text-white text-[10px] font-bold px-2 py-0.5 rounded-md tracking-wider'
);

// 12. Color section label - more refined
content = replaceAll(
  content,
  'text-sm font-bold text-black uppercase tracking-wider',
  'text-[11px] font-semibold text-gray-500 uppercase tracking-[0.12em]'
);

// 13. Color swatches - simpler selection ring
content = replaceAll(
  content,
  'border-2 border-black shadow-lg shadow-black/10',
  'ring-2 ring-gray-900 ring-offset-2'
);

content = replaceAll(
  content,
  'border-2 border-transparent group-hover/swatch:border-gray-300',
  'border-2 border-transparent'
);

// 14. Size buttons layout - from grid to flex wrap
content = replaceAll(
  content,
  'grid grid-cols-5 gap-2',
  'flex flex-wrap gap-2'
);

// 15. Size buttons - pill style, refined
content = replaceAll(
  content,
  'py-2.5 md:py-3.5 rounded-xl border-2 font-bold text-xs md:text-sm transition-all duration-200 relative active:scale-[0.97]',
  'min-w-[52px] px-4 py-2.5 rounded-lg text-xs font-semibold transition-all duration-200 active:scale-95'
);

// 16. Selected size - dark fill
content = replaceAll(
  content,
  'selectedSize === size \n                              ? \'border-black bg-black/5 text-black shadow-sm\' \n                              : isOOS\n                              ? \'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed line-through\'\n                              : isLow\n                              ? \'border-amber-300 bg-amber-50/40 text-black hover:border-amber-400 hover:bg-amber-50/60 hover:shadow-sm\'\n                              : \'border-gray-200 text-black hover:border-gray-400 hover:bg-gray-50/50 hover:shadow-sm\'',
  'selectedSize === size\n                              ? \'bg-gray-900 text-white shadow-sm\'\n                              : isOOS\n                              ? \'bg-gray-50 text-gray-300 cursor-not-allowed line-through\'\n                              : \'bg-gray-50 text-gray-700 hover:bg-gray-100 hover:text-gray-900 border border-gray-200/60\''
);

// 17. Remove size inner span placeholder
content = replaceAll(
  content,
  '<span className="flex flex-col items-center gap-0.5 min-h-[2rem] justify-center">\n                            <span>{size}</span>\n                            <span className="text-[9px] leading-none invisible">-</span>\n                          </span>',
  '{size}'
);

// 18. Action buttons - from rounded-xl to rounded-lg
content = replaceAll(
  content,
  'rounded-xl font-bold text-sm md:text-base flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.97]',
  'rounded-lg text-xs md:text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98]'
);

content = replaceAll(
  content,
  'rounded-xl font-bold text-sm md:text-base transition-all duration-200 active:scale-[0.97] border-2',
  'rounded-lg text-xs font-semibold transition-all duration-200 active:scale-[0.98] border'
);

// 19. Action section gap
content = replaceAll(
  content,
  'gap-3 pt-4',
  'gap-2.5 pt-1'
);

// 20. Wishlist/share buttons size
content = replaceAll(
  content,
  'w-12 h-12 md:w-14 md:h-14 rounded-xl border-2',
  'w-11 h-11 md:w-12 md:h-12 rounded-lg'
);

// 21. Wishlist fill states
content = replaceAll(
  content,
  'inWishlist ? \'border-black text-black bg-black/5\' : \'border-gray-200 text-gray-400 hover:border-gray-400 hover:text-gray-600 hover:bg-gray-50\'',
  'inWishlist ? \'bg-gray-100 text-gray-900\' : \'bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600 border border-gray-200/60\''
);

// 22. Share button style
content = replaceAll(
  content,
  'className="w-12 h-12 md:w-14 md:h-14 rounded-xl border-2 border-gray-200 flex items-center justify-center text-gray-400 transition-all duration-200 flex-shrink-0 active:scale-90 hover:shadow-sm hover:border-gray-400 hover:text-gray-600 hover:bg-gray-50"',
  'className="w-11 h-11 md:w-12 md:h-12 rounded-lg bg-gray-50 border border-gray-200/60 flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all duration-200 active:scale-90"'
);

// 23. Heart icon size
content = replaceAll(
  content,
  '<Heart size={22}',
  '<Heart size={18}'
);

// 24. Share icon size
content = replaceAll(
  content,
  '<Share2 size={20}',
  '<Share2 size={16}'
);

// 25. Quantity control styling
content = replaceAll(
  content,
  'border-2 border-gray-200 rounded-xl w-[110px] md:w-[130px] h-12 md:h-14 bg-gray-50/50',
  'border border-gray-200 rounded-lg h-11 md:h-12 bg-gray-50'
);

content = replaceAll(
  content,
  'px-4 text-gray-400 hover:text-black disabled:text-gray-200 disabled:cursor-not-allowed h-full transition-colors',
  'px-3 h-full text-gray-400 hover:text-gray-700 disabled:text-gray-200 transition-colors'
);

content = replaceAll(
  content,
  'font-bold text-lg w-8 text-center tabular-nums',
  'w-8 text-center text-sm font-semibold tabular-nums'
);

content = replaceAll(
  content,
  'px-4 h-full transition-colors',
  'px-3 h-full transition-colors'
);

content = replaceAll(
  content,
  '<Minus size={18} />',
  '<Minus size={15} />'
);

content = replaceAll(
  content,
  '<Plus size={18} />',
  '<Plus size={15} />'
);

// 26. Add to Cart button dark bg
content = replaceAll(
  content,
  'bg-black text-white hover:bg-gray-800 shadow-lg shadow-black/10 hover:shadow-xl hover:shadow-black/15',
  'bg-gray-900 text-white hover:bg-gray-800 shadow-sm'
);

// 27. Buy Now button style
content = replaceAll(
  content,
  'bg-black text-white hover:bg-gray-800 shadow-md hover:shadow-lg border-black',
  'bg-white text-gray-900 hover:bg-gray-50 border-gray-300 hover:border-gray-400'
);

content = replaceAll(
  content,
  'isStockUnavailable\n                        ? \'bg-red-50 text-red-500 cursor-not-allowed border border-red-200/60\'\n                        : \'bg-gray-100 text-gray-400 cursor-not-allowed\'',
  'isStockUnavailable\n                        ? \'bg-gray-100 text-gray-400 cursor-not-allowed\'\n                        : \'bg-gray-100 text-gray-400 cursor-not-allowed\''
);

// 28. Buy Now disabled state
content = replaceAll(
  content,
  'isStockUnavailable\n                        ? \'bg-red-50 text-red-500 cursor-not-allowed border-red-200/60\'\n                        : \'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-100\'',
  'isStockUnavailable\n                        ? \'bg-gray-50 text-gray-400 cursor-not-allowed border-gray-100\'\n                        : \'bg-gray-50 text-gray-400 cursor-not-allowed border-gray-100\''
);

// 29. Stock status - refined badge
content = replaceAll(
  content,
  'flex items-center gap-2 text-sm font-semibold text-emerald-700 bg-emerald-50/80 border border-emerald-200/60 px-4 py-2.5 rounded-xl',
  'flex items-center gap-2 text-xs font-medium text-emerald-700 bg-emerald-50/50 border border-emerald-200/50 px-3.5 py-2 rounded-lg'
);

content = replaceAll(
  content,
  'w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0',
  'w-1 h-1 rounded-full bg-emerald-500 shrink-0'
);

// 30. Trust badges - cleaner grid
content = replaceAll(
  content,
  'grid grid-cols-3 gap-2 py-5 border-y border-gray-100 my-2',
  'grid grid-cols-3 gap-px bg-gray-100 rounded-lg overflow-hidden'
);

// 31. Trust badge individual cards
content = replaceAll(
  content,
  'flex flex-col items-center text-center gap-1.5 group',
  'bg-white px-3 py-3.5 flex flex-col items-center text-center gap-1'
);

content = replaceAll(
  content,
  'w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 group-hover:bg-black group-hover:text-white transition-all duration-300',
  'text-gray-500 mb-0'
);

// 32. Trust badge text
content = replaceAll(
  content,
  'text-[10px] font-bold text-gray-600 group-hover:text-black transition-colors duration-300',
  'text-[9px] font-semibold text-gray-700 leading-tight'
);

content = replaceAll(
  content,
  'text-[9px] text-gray-400',
  'text-[8px] text-gray-400 leading-tight'
);

// 33. Accordion headers - refined
content = replaceAll(
  content,
  'text-sm font-bold text-black text-left group',
  'text-xs font-semibold text-gray-700 uppercase tracking-[0.08em]'
);

// 34. Accordion container
content = replaceAll(
  content,
  'flex flex-col divide-y divide-gray-100',
  '-mx-5 md:-mx-10 px-5 md:px-10 border-t border-gray-100'
);

// 35. Accordion items padding
content = replaceAll(
  content,
  'py-3 md:py-3.5 text-sm font-bold text-black text-left group',
  'py-4 text-xs font-semibold text-gray-700 uppercase tracking-[0.08em]'
);

// 36. Accordion chevron
content = replaceAll(
  content,
  'ChevronDown size={15} className={`text-gray-300 transition-all duration-300 ${openAccordion',
  'ChevronDown size={13} className={`text-gray-300 transition-transform duration-300 ${openAccordion'
);

content = replaceAll(
  content,
  'rotate-180 text-black',
  'rotate-180'
);

// 37. Detail content - refined typography
content = replaceAll(
  content,
  'text-sm text-gray-600 leading-relaxed pb-4 space-y-3',
  'text-xs text-gray-500 leading-relaxed pb-4 space-y-3'
);

content = replaceAll(
  content,
  'text-sm text-gray-600 leading-relaxed pb-4 space-y-2.5',
  'text-xs text-gray-500 leading-relaxed pb-4 space-y-2'
);

// 38. Detail list items
content = replaceAll(
  content,
  'flex items-center gap-2.5 text-gray-500',
  'flex items-center gap-2'
);

content = replaceAll(
  content,
  'w-1 h-1 rounded-full bg-gray-400 shrink-0',
  'w-0.5 h-0.5 rounded-full bg-gray-300'
);

// 39. OOS badge on size buttons - remove
content = replaceAll(
  content,
  '{isOOS && (\n                            <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[8px] font-bold px-1 rounded leading-tight">\n                              {t(\'product.oos\')}\n                            </span>\n                          )}\n                          {/* low stock indicator removed */}\n                        </button>',
  '}\n                        </button>'
);

// 40. Simplify out-of-stock badge
content = replaceAll(
  content,
  'inline-flex items-center gap-1.5 bg-red-50 text-red-700 text-[11px] font-bold px-3 py-1.5 rounded-full border border-red-200/60',
  'text-[11px] font-medium text-red-600 bg-red-50 px-3 py-1.5 rounded-lg border border-red-100'
);

content = replaceAll(
  content,
  'w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse',
  'w-1 h-1 rounded-full bg-red-500 inline-block animate-pulse mr-1.5'
);

// 41. Variant not found - refined
content = replaceAll(
  content,
  'px-4 py-3 rounded-xl bg-red-50/80 text-red-700 text-sm font-semibold flex items-center gap-2.5 border border-red-200/60',
  'text-xs font-medium text-red-600 bg-red-50/50 border border-red-100 px-3.5 py-2 rounded-lg flex items-center gap-2'
);

content = replaceAll(
  content,
  'w-5 h-5 rounded-full bg-red-200 flex items-center justify-center',
  'text-current'
);

// 42. Flash sale - more refined gradient
content = replaceAll(
  content,
  'flex items-center gap-2 md:gap-3 bg-red-50/80 border border-red-200/60 rounded-xl px-3 md:px-4 py-2.5 md:py-3 -mt-2',
  'flex items-center gap-3 bg-gradient-to-r from-rose-50 to-orange-50 border border-rose-200/60 rounded-xl px-4 py-3'
);

// 43. Social proof - make more compact
content = replaceAll(
  content,
  'flex items-center gap-2 mb-2.5',
  'flex items-center gap-1.5'
);

// Write the transformed content
fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Premium redesign applied successfully!');
console.log(`File size: ${content.length} chars`);
