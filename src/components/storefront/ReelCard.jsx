import { Crown, Play, ShoppingCart, Heart, Check, X, ShoppingBag, Minus, Plus } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { formatCurrency, getImageUrl, getVideoUrl } from '../../utils/formatters';
import { getColorHex, isLightColor } from '../../utils/constants';

/* ═══════════════════════════════════════════════════════════
   SHARED REEL CARD — used by the homepage carousel AND the
   /watch-and-buy grid so both always render identically.
   Compact 9:16 card with badge, product bar, LIKE/CART pills
   and an inline variant picker.
   ═══════════════════════════════════════════════════════════ */

export function discountPercent(oldPrice, price) {
  if (!oldPrice || !price) return 0;
  const oNum = Number(oldPrice);
  const pNum = Number(price);
  if (!oNum || !pNum) return 0;
  return Math.round(((oNum - pNum) / oNum) * 100);
}

export function getReelBadge(reel, fallback = 'THREVOLT') {
  // Per-reel badge set from admin wins; fall back to the linked product's badge
  return reel?.badge || reel?.products?.[0]?.badge || fallback;
}

export function isYouTubeUrl(url) {
  if (!url) return false;
  return /youtube\.com\/shorts\//i.test(url) || /youtube\.com\/watch\?v=/i.test(url) || /youtu\.be\//i.test(url);
}

export function isUnsupportedVideoUrl(url) {
  if (!url) return false;
  return isYouTubeUrl(url) || /vimeo\.com\//i.test(url) || /dailymotion\.com\//i.test(url);
}

/* ── Shared variant extraction helper ── */
export function extractVariantData(variants, selectedColor = '', selectedSize = '') {
  const pv = variants || [];
  const hasVariants = pv.length > 0;

  const cSet = new Set();
  const sSet = new Set();
  pv.forEach(v => {
    if (v.attributes?.color) cSet.add(v.attributes.color);
    if (v.attributes?.size) sSet.add(v.attributes.size);
  });
  const colors = cSet.size > 0 ? [...cSet] : [];
  const sizes = sSet.size > 0 ? [...sSet] : [];

  const oosColors = new Set();
  const oosSizes = new Set();
  colors.forEach(c => {
    if (!pv.some(v => v.attributes?.color === c && (v.quantity || 0) > 0)) oosColors.add(c);
  });
  sizes.forEach(s => {
    if (!pv.some(v => v.attributes?.size === s && (v.quantity || 0) > 0)) oosSizes.add(s);
  });

  const matched = pv.find(v =>
    (!colors.length || v.attributes?.color === selectedColor) &&
    (!sizes.length || v.attributes?.size === selectedSize)
  ) || null;

  const firstAvailable = pv.find(v => (v.quantity || 0) > 0) || pv[0] || null;

  const allSelected = (!colors.length || selectedColor) && (!sizes.length || selectedSize);

  return {
    colors,
    sizes,
    oosColors,
    oosSizes,
    matched,
    firstAvailable,
    allSelected,
    hasVariants,
  };
}

/* ── Per-color thumbnail from the variant's first image ── */
export function getColorThumb(color, variants) {
  const pv = variants || [];
  const v = pv.find(x => (x.attributes || {}).color === color && Array.isArray(x.images) && x.images.length > 0);
  const img = v?.images?.[0];
  return typeof img === 'string' ? getImageUrl(img) : null;
}

export default function ReelCard({
  reel,
  index = 0,
  widthClass = 'w-[150px] sm:w-[200px] xl:w-[240px]',
  onOpen,
  badgeFallback = 'THREVOLT',
  liked = false,
  onToggleLike,
  onAddToCart,
  registerVideoRef,
  autoPlayInView = false,
  // Unique per rendered instance — needed when the carousel duplicates the set
  // for its infinite loop, so data-reel-id + video refs never collide.
  instanceKey = null,
  // Duplicated copies render off-screen already-visible; skip the entrance anim.
  skipEntrance = false,
  // Mobile peek carousel: scale/opacity transforms for center vs side cards
  mobileStyle = null,
}) {
  const cardId = instanceKey ?? reel?.id;
  const { t } = useTranslation();
  const p = reel?.products?.[0] || null;
  const cardRef = useRef(null);
  const videoEl = useRef(null);
  const [videoError, setVideoError] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selColor, setSelColor] = useState('');
  const [selSize, setSelSize] = useState('');
  const [qty, setQty] = useState(1);
  // ── Transient "Added ✓" feedback — the CART pill must stay clickable so
  //     users can re-open the picker and add a different size/color. ──
  const [addedFlash, setAddedFlash] = useState(false);
  const addedFlashTimer = useRef(null);

  const flashAdded = () => {
    setAddedFlash(true);
    if (addedFlashTimer.current) clearTimeout(addedFlashTimer.current);
    addedFlashTimer.current = setTimeout(() => setAddedFlash(false), 1500);
  };

  useEffect(() => () => { if (addedFlashTimer.current) clearTimeout(addedFlashTimer.current); }, []);

  // Grid pages (watch-and-buy): play this card's video only while it is
  // actually scrolled into view — pause immediately when it leaves.
  useEffect(() => {
    if (!autoPlayInView) return;
    const el = cardRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => {
      if (!videoEl.current) return;
      if (entry.isIntersecting) videoEl.current.play().catch(() => {});
      else videoEl.current.pause();
    }, { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, [autoPlayInView]);

  const openPicker = (e) => {
    e.stopPropagation();
    if (!p) return;
    const { colors, sizes, hasVariants, firstAvailable } = extractVariantData(p.variants);
    if (hasVariants && (colors.length > 0 || sizes.length > 0)) {
      setSelColor(firstAvailable?.attributes?.color || (colors.length > 0 ? colors[0] : ''));
      setSelSize(firstAvailable?.attributes?.size || (sizes.length > 0 ? sizes[0] : ''));
      setQty(1);
      setPickerOpen(true);
    } else {
      if (addedFlash) return; // debounce: ignore a fast double-click
      onAddToCart?.(p);
      flashAdded();
    }
  };

  const confirmAdd = () => {
    if (!p) return;
    const { matched, allSelected } = extractVariantData(p.variants, selColor, selSize);
    if (!allSelected || !matched || (matched?.quantity || 0) <= 0) return;
    onAddToCart?.(p, { color: selColor, size: selSize, variantId: matched.id, qty });
    setPickerOpen(false);
    flashAdded();
  };

  const hasVideoError = videoError || isUnsupportedVideoUrl(reel?.videoUrl);

  return (
    <motion.div
      ref={cardRef}
      initial={skipEntrance ? { opacity: 1 } : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.45, delay: index * 0.07, ease: [0.16, 1, 0.3, 1] }}
      className={`reel-card snap-start shrink-0 ${widthClass} cursor-pointer group/card`}
      style={mobileStyle || undefined}
      data-reel-id={cardId}
      onClick={onOpen}
    >
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-[0_16px_40px_-16px_rgba(0,0,0,0.22)] hover:-translate-y-0.5 transition-all duration-400 border border-gray-200/80 hover:border-gray-300">
        <div className="relative aspect-[9/16] overflow-hidden bg-gray-100">
          {hasVideoError && reel?.imageUrl ? (
            <div className="relative w-full h-full">
              <img
                src={getImageUrl(reel.imageUrl)}
                alt={reel?.title || ''}
                className="w-full h-full object-cover"
              />
              {isYouTubeUrl(reel?.videoUrl) && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <a href={reel.videoUrl} target="_blank" rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="px-3 py-1.5 rounded-full bg-red-600/90 backdrop-blur-sm text-white text-[9px] font-bold uppercase tracking-wider hover:bg-red-600 transition-all shadow-lg flex items-center gap-1.5">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                    </svg>
                    {t('reels.youtube')}
                  </a>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
            </div>
          ) : hasVideoError ? (
            <div className="w-full h-full flex items-center justify-center bg-gray-200">
              <Play size={32} className="text-gray-400" />
            </div>
          ) : (
            <>
              <video
                ref={(el) => {
                  videoEl.current = el;
                  registerVideoRef?.(cardId, el);
                }}
                src={getVideoUrl(reel?.videoUrl)}
                muted
                loop
                playsInline
                preload="metadata"
                poster={reel?.imageUrl ? getImageUrl(reel.imageUrl) : undefined}
                className="w-full h-full object-cover"
                onError={() => setVideoError(true)}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
            </>
          )}

          <div className="absolute top-2 left-2 z-10">
            <span className="inline-flex items-center gap-1 px-1.5 py-[2px] rounded-[4px] bg-black/85 backdrop-blur-sm text-white text-[6px] font-bold uppercase tracking-[0.08em] shadow-md">
              <Crown size={5.5} />
              {getReelBadge(reel, badgeFallback)}
            </span>
          </div>

          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 pointer-events-none">
            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/25">
              <Play size={18} />
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-1.5 z-10">
            <div className="bg-white/90 backdrop-blur-md rounded-lg px-2 py-1.5 shadow-sm border border-white/20">
              <div className="flex items-center gap-1.5">
                {p?.image_url && (
                  <div className="w-6 h-6 rounded-md overflow-hidden bg-gray-100 shrink-0 border border-gray-200">
                    <img src={getImageUrl(p.image_url)} alt="" loading="lazy" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="card-title text-[10px] leading-tight truncate">{p?.name || reel?.title}</p>
                  <div className="flex items-center gap-1 mt-0 flex-nowrap overflow-hidden">
                    {p?.old_price && <span className="hidden sm:inline text-[8px] text-gray-400 line-through shrink-0">{formatCurrency(p.old_price)}</span>}
                    {p?.price && <span className="price-item text-[10px] font-bold text-gray-900 shrink-0">{formatCurrency(p.price)}</span>}
                    {p?.old_price && p?.price && (
                      <span className="inline-flex items-center px-1 py-0.5 rounded-full bg-gray-900 text-white text-[6px] font-bold shrink-0">
                        {discountPercent(p.old_price, p.price)}% OFF
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Inline Variant Picker ── */}
              <AnimatePresence>
                {pickerOpen && p && (
                  <motion.div
                    key={`variant-picker-${reel?.id}`}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 12 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    className="mt-2 pt-2 border-t border-gray-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <p className="text-[8px] font-bold text-gray-500 uppercase tracking-wider truncate">
                        <ShoppingBag size={9} className="inline mr-1 -mt-0.5" />
                        {t('product.quick_add')}
                      </p>
                      <button onClick={() => setPickerOpen(false)}
                        aria-label="Close variant picker"
                        className="w-5 h-5 flex items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-all duration-150 active:scale-[0.85] shrink-0">
                        <X size={11} />
                      </button>
                    </div>
                    {(() => {
                      const { colors, sizes, oosColors: oosColorsSet, oosSizes: oosSizesSet, matched, allSelected } = extractVariantData(p.variants, selColor, selSize);
                      return (
                        <>
                          {colors.length > 0 && (
                            <div className="mb-2">
                              <p className="text-[7px] font-bold text-gray-400 uppercase tracking-wider mb-1">Color</p>
                              <div className="flex flex-wrap gap-1.5">
                                {colors.map(c => {
                                  const isColorOOS = oosColorsSet.has(c);
                                  const colorThumb = getColorThumb(c, p.variants);
                                  const isLightShade = isLightColor(c);
                                  return (
                                    <button key={c} onClick={() => !isColorOOS && setSelColor(c)}
                                      disabled={isColorOOS}
                                      className={`relative w-6 h-6 rounded-[3px] border-2 overflow-hidden flex items-center justify-center transition-all ${
                                        isColorOOS ? 'border-gray-200 opacity-30 cursor-not-allowed' : selColor === c ? 'border-gray-900 scale-110' : 'border-gray-200 hover:border-gray-400'
                                      }`}>
                                      {colorThumb ? (
                                        <img src={colorThumb} alt={c} loading="lazy" className={`w-full h-full object-cover ${isColorOOS ? 'opacity-50' : ''}`} />
                                      ) : (
                                        <div className={`w-full h-full ${isLightShade ? 'border border-black/10' : ''} ${isColorOOS ? 'opacity-50' : ''}`} style={{ background: getColorHex(c) }} />
                                      )}
                                      {isColorOOS && (<span className="absolute inset-0 flex items-center justify-center"><svg viewBox="0 0 24 24" className="w-3 h-3 text-gray-400 opacity-70" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="4" x2="20" y2="20" /></svg></span>)}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                          {sizes.length > 0 && (
                            <div className="mb-2">
                              <p className="text-[7px] font-bold text-gray-400 uppercase tracking-wider mb-1">Size</p>
                              <div className="flex flex-wrap gap-1">
                                {sizes.map(s => {
                                  const isSizeOOS = oosSizesSet.has(s);
                                  return (
                                    <button key={s} onClick={() => !isSizeOOS && setSelSize(s)}
                                      disabled={isSizeOOS}
                                      className={`px-2 py-1 text-[7px] font-bold rounded-[3px] transition-all ${
                                        isSizeOOS ? 'opacity-25 cursor-not-allowed text-gray-400 bg-gray-50 line-through' : selSize === s ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                      }`}>
                                      {s}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex items-center border border-gray-200 rounded-[3px] overflow-hidden">
                              <button onClick={() => setQty(q => Math.max(1, q - 1))}
                                className="w-6 h-6 flex items-center justify-center text-gray-500 hover:bg-gray-50 text-[10px]">−</button>
                              <span className="w-6 h-6 flex items-center justify-center text-[9px] font-bold bg-gray-50 border-x border-gray-200">{qty}</span>
                              <button onClick={() => setQty(q => q + 1)}
                                className="w-6 h-6 flex items-center justify-center text-gray-500 hover:bg-gray-50 text-[10px]">+</button>
                            </div>
                            <button onClick={confirmAdd}
                              disabled={!allSelected || !matched || (matched?.quantity || 0) <= 0}
                              className={`flex-1 py-1.5 rounded-[3px] text-[8px] font-bold uppercase tracking-wider transition-all ${
                                allSelected && matched && (matched?.quantity || 0) > 0 ? 'bg-gray-900 text-white hover:bg-gray-800' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              }`}>
                              <span className="flex items-center justify-center gap-1">{allSelected && matched && (matched?.quantity || 0) <= 0 ? 'Unavailable' : <><ShoppingBag size={8} /> Add</>}</span>
                            </button>
                          </div>
                        </>
                      );
                    })()}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-center gap-1 mt-1">
                <button onClick={(e) => { e.stopPropagation(); onToggleLike?.(); }}
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[7px] font-bold uppercase tracking-wider transition-all ${
                    liked ? 'bg-black text-white border border-black' : 'bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-200'
                  }`}>
                  <Heart size={8} className={liked ? 'fill-white' : ''} />
                  {liked ? t('reels.liked') : t('reels.like')}
                </button>
                {p && (
                  <button onClick={openPicker}
                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[7px] font-bold uppercase tracking-wider transition-all ${
                      addedFlash ? 'bg-black text-white border border-black' : 'bg-gray-900 text-white border border-gray-900 hover:bg-gray-800'
                    }`}>
                    {addedFlash ? <Check size={8} /> : <ShoppingCart size={8} />}
                    {addedFlash ? t('reels.added') : t('reels.cart')}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        /* Keep the product info compact inside the reel card so the reel stays the focus */
        .reel-card .card-title { font-size: 10px; line-height: 1.3; margin-bottom: 1px; }
        .reel-card .price-item { font-size: 10px; }
      `}</style>
    </motion.div>
  );
}
