import { Star, X, ChevronDown, MessageCircle, Check, RefreshCw } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { getImageUrl, formatDate } from '../../utils/formatters';
import { reviewsAPI } from '../../api/reviews';
import ReviewImageLightbox from '../product/ReviewImageLightbox';
import StoreReviewFormModal from './StoreReviewFormModal';
import toast from '../../utils/toast';

/* ── Map raw review to display format ── */
function mapModalReview(review) {
  const user = review.user || {};
  const product = review.product || {};
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email || 'Customer';
  const avatar = user.avatar ? getImageUrl(user.avatar) : `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=random&color=fff&size=120`;

  let images = [];
  try {
    if (typeof review.images === 'string') images = JSON.parse(review.images);
    else if (Array.isArray(review.images)) images = review.images;
  } catch { images = []; }

  return {
    id: review.id,
    name: fullName,
    avatar,
    rating: review.rating || 5,
    text: review.comment || review.title || '',
    title: review.title || '',
    product: product.name || '',
    productSlug: product.slug || '',
    productImage: product.imageUrl || product.image || '',
    date: review.created_at ? formatDate(review.created_at) : '',
    images: images.filter(Boolean),
  };
}

/* ── Star Breakdown Calculator ── */
function calcStarDistribution(reviews) {
  const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  reviews.forEach(r => {
    const star = Math.floor(r.rating || 5);
    if (star >= 1 && star <= 5) dist[star]++;
  });
  return dist;
}

/* ════════════════════════════════════════ */
/* ── MAIN AllReviewsModal Component ── */
/* ════════════════════════════════════════ */
export default function AllReviewsModal({ reviews: reviewsProp = [], isOpen, onClose, onReviewSuccess }) {
  const { t } = useTranslation();
  const REVIEWS = (reviewsProp || []).map(mapModalReview);
  const [activeTab, setActiveTab] = useState('reviews');
  const [sortBy, setSortBy] = useState('relevant');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [expandedReview, setExpandedReview] = useState(null);
  const [showStoreReviewForm, setShowStoreReviewForm] = useState(false);
  const [storeReviews, setStoreReviews] = useState([]);
  const [storeReviewsLoading, setStoreReviewsLoading] = useState(false);
  const [storeReviewsLoaded, setStoreReviewsLoaded] = useState(false);
  const [storeTotal, setStoreTotal] = useState(0);
  const sortRef = useRef(null);

  const totalReviews = REVIEWS.length;
  const avgRating = totalReviews > 0
    ? (REVIEWS.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1)
    : '0.0';
  const starDist = calcStarDistribution(REVIEWS);

  // Close sort dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (sortRef.current && !sortRef.current.contains(e.target)) {
        setShowSortDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Keyboard: Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  // Fetch store reviews when the tab becomes active
  useEffect(() => {
    if (isOpen && activeTab === 'store' && !storeReviewsLoaded && !storeReviewsLoading) {
      setStoreReviewsLoading(true);
      reviewsAPI.getStoreReviews({ page: 1, limit: 50 })
        .then(res => {
          const data = res?.data?.data || {};
          const items = (data.reviews || []).map(mapModalReview);
          setStoreReviews(items);
          setStoreTotal(data.pagination?.total || items.length);
          setStoreReviewsLoaded(true);
        })
        .catch(() => {
          toast.error(t('reviews.fetch_failed', 'Could not load store reviews.'));
          setStoreReviewsLoaded(true);
        })
        .finally(() => setStoreReviewsLoading(false));
    }
  }, [isOpen, activeTab, storeReviewsLoaded, storeReviewsLoading, t]);

  // Sort reviews
  const sortedReviews = [...REVIEWS].sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.date) - new Date(a.date);
    if (sortBy === 'highest') return b.rating - a.rating;
    if (sortBy === 'lowest') return a.rating - b.rating;
    return 0; // 'relevant' — default order
  });

  const sortedStoreReviews = [...storeReviews].sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.date) - new Date(a.date);
    if (sortBy === 'highest') return b.rating - a.rating;
    if (sortBy === 'lowest') return a.rating - b.rating;
    return 0;
  });

  // Collect all images for the image grid
  const allImages = REVIEWS.flatMap(r => r.images.map(img => ({ url: img, reviewId: r.id })));

  const openLightbox = (images, idx) => {
    setLightboxImages(images);
    setLightboxIndex(idx);
    setLightboxOpen(true);
  };

  const handleWriteStoreReview = () => {
    setShowStoreReviewForm(true);
  };

  /* ── Shared review card renderer (avoids code duplication) ── */
  const renderReviewCard = (review, idx, showProductLink = true) => {
    const isExpanded = expandedReview === review.id;
    const hasMoreText = review.text.length > 120;
    return (
      <motion.div
        key={review.id || idx}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: idx * 0.03, ease: [0.16, 1, 0.3, 1] }}
        className="bg-white rounded-xl border border-gray-200/80 shadow-sm hover:shadow-md transition-all duration-200 p-4 sm:p-5"
      >
        {/* Top: user + stars + date */}
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden ring-2 ring-gray-100 shrink-0 bg-gradient-to-br from-gray-200 to-gray-300">
              {review.avatar ? (
                <img src={review.avatar} alt={review.name} className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-600 font-bold text-xs">
                  {review.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <h4 className="text-xs sm:text-sm font-bold text-black truncate">{review.name}</h4>
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-[9px] sm:text-[10px] text-gray-400">{review.date || t('product.verified_purchase', 'Verified purchase')}</span>
                <span className="text-[7px] text-gray-300">·</span>
                <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-emerald-600">
                  <Check size={7} />
                  {t('product.verified')}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-0.5 text-amber-400 shrink-0">
            {[1,2,3,4,5].map(i => (
              <Star size={11} key={i} className={i <= review.rating ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200'} />
            ))}
          </div>
        </div>

        {/* Title */}
        {review.title && (
          <h5 className="text-xs sm:text-sm font-bold text-black mb-1">{review.title}</h5>
        )}

        {/* Text */}
        <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
          &ldquo;{isExpanded ? review.text : review.text.slice(0, 120)}{!isExpanded && hasMoreText ? '...' : ''}&rdquo;
          {hasMoreText && (
            <button
              onClick={() => setExpandedReview(isExpanded ? null : review.id)}
              className="text-xs font-semibold text-black hover:underline ml-1"
            >
              {isExpanded ? t('reviews.show_less', 'Show less') : t('reviews.read_more', 'Read more')}
            </button>
          )}
        </p>

        {/* Review Images */}
        {review.images.length > 0 && (
          <div className="flex gap-1.5 mt-3 flex-wrap">
            {review.images.slice(0, 4).map((img, imgIdx) => (
              <button
                key={imgIdx}
                onClick={() => openLightbox(review.images, imgIdx)}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg overflow-hidden border border-gray-100 hover:border-gray-300 hover:shadow-sm transition-all duration-200"
              >
                <img
                  src={getImageUrl(img)}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
            {review.images.length > 4 && (
              <button
                onClick={() => openLightbox(review.images, 4)}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center hover:bg-gray-200 transition-colors"
              >
                <span className="text-[10px] font-bold text-gray-500">+{review.images.length - 4}</span>
              </button>
            )}
          </div>
        )}

        {/* Footer: product link or store badge */}
        {showProductLink && review.product ? (
          <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-gray-50">
            {review.productImage && (
              <div className="w-8 h-8 rounded-md overflow-hidden bg-gray-50 border border-gray-100 shrink-0">
                <img src={getImageUrl(review.productImage)} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            <span className="text-[10px] sm:text-[11px] text-gray-500 font-medium truncate">
              {review.product}
            </span>
          </div>
        ) : !showProductLink ? (
          <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-gray-50">
            <div className="w-8 h-8 rounded-md overflow-hidden bg-black/5 border border-gray-100 shrink-0 flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-400">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 01-8 0" />
              </svg>
            </div>
            <span className="text-[10px] sm:text-[11px] text-gray-500 font-medium">
              {t('reviews.store_review', 'Store Review')}
            </span>
          </div>
        ) : null}
      </motion.div>
    );
  };

  const sortOptions = [
    { value: 'relevant', label: t('reviews.most_relevant', 'Most Relevant') },
    { value: 'newest', label: t('reviews.newest_first', 'Newest First') },
    { value: 'highest', label: t('reviews.highest_rated', 'Highest Rated') },
    { value: 'lowest', label: t('reviews.lowest_rated', 'Lowest Rated') },
  ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.97 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-[201] flex items-center justify-center p-0 sm:p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white w-full h-full sm:max-w-2xl sm:max-h-[90vh] sm:rounded-2xl sm:shadow-2xl flex flex-col overflow-hidden">
              {/* ── Sticky Header ── */}
              <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-gray-100 bg-white sticky top-0 z-10 shrink-0">
                <h2 className="text-lg sm:text-xl font-display font-extrabold text-black tracking-tight">
                  {t('product.customer_reviews')}
                </h2>
                <button
                  onClick={onClose}
                  className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors active:scale-90"
                >
                  <X size={18} />
                </button>
              </div>

              {/* ── Scrollable Content ── */}
              <div className="flex-1 overflow-y-auto overscroll-contain">
                <div className="p-4 sm:p-6 space-y-5">
                  
                  {/* ── Rating Summary ── */}
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6 pb-5 border-b border-gray-100">
                    {/* Average Rating */}
                    <div className="flex sm:flex-col items-center sm:items-start gap-3 sm:gap-1.5">
                      <span className="text-4xl sm:text-5xl font-display font-extrabold text-black leading-none tracking-tight">
                        {avgRating}
                      </span>
                      <div className="flex flex-col gap-0.5">
                        <div className="flex text-amber-400 gap-0.5">
                          {[1,2,3,4,5].map(i => (
                            <Star size={13} key={i} className={i <= Math.round(Number(avgRating)) ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200'} />
                          ))}
                        </div>
                        <span className="text-xs text-gray-500 font-medium">{t('product.reviews', { count: totalReviews })}</span>
                      </div>
                    </div>

                    {/* Star Breakdown Bars */}
                    <div className="flex-1 grid grid-cols-5 gap-1.5 max-w-sm mx-auto sm:mx-0 w-full">
                      {[5,4,3,2,1].map(star => {
                        const count = starDist[star] || 0;
                        const pct = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
                        return (
                          <div key={star} className="flex flex-col items-center gap-1">
                            <div className="flex items-center gap-0.5">
                              <span className="text-[10px] font-bold text-gray-500 tabular-nums">{star}</span>
                              <Star size={8} className="text-gray-400" />
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-gray-100 overflow-hidden">
                              <motion.div
                                initial={{ scaleX: 0 }}
                                animate={{ scaleX: 1 }}
                                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: (5 - star) * 0.06 }}
                                className="h-full rounded-full bg-amber-400 origin-left"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-[9px] text-gray-400 tabular-nums font-medium">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* ── Buyer Images Grid ── */}
                  {allImages.length > 0 && (
                    <div>
                      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2.5">
                        {t('reviews.customer_photos', 'Customer Photos')} ({allImages.length})
                      </h3>
                      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                        {allImages.slice(0, 16).map((img, idx) => (
                          <button
                            key={idx}
                            onClick={() => openLightbox(allImages.map(i => i.url), idx)}
                            className="aspect-square rounded-lg overflow-hidden border border-gray-100 hover:border-gray-300 hover:shadow-md transition-all duration-200 group/img"
                          >
                            <img
                              src={getImageUrl(img.url)}
                              alt={`Customer photo ${idx + 1}`}
                              className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300"
                              loading="lazy"
                            />
                          </button>
                        ))}
                        {allImages.length > 16 && (
                          <button
                            onClick={() => openLightbox(allImages.map(i => i.url), 16)}
                            className="aspect-square rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center hover:bg-gray-200 transition-colors"
                          >
                            <span className="text-xs font-bold text-gray-500">+{allImages.length - 16}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ── Tabs + Sort ── */}
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <div className="flex gap-4">
                      <button
                        onClick={() => setActiveTab('reviews')}
                        className={`text-sm font-bold pb-0.5 border-b-2 transition-colors ${
                          activeTab === 'reviews'
                            ? 'border-black text-black'
                            : 'border-transparent text-gray-400 hover:text-gray-600'
                        }`}
                      >
                        {t('product.reviews', { count: totalReviews })}
                      </button>
                      <button
                        onClick={() => setActiveTab('store')}
                        className={`text-sm font-bold pb-0.5 border-b-2 transition-colors ${
                          activeTab === 'store'
                            ? 'border-black text-black'
                            : 'border-transparent text-gray-400 hover:text-gray-600'
                        }`}
                      >
                        {t('reviews.store_reviews', 'Store Reviews')} ({storeTotal})
                      </button>
                    </div>

                    {/* Sort Dropdown */}
                    <div className="relative" ref={sortRef}>
                      <button
                        onClick={() => setShowSortDropdown(!showSortDropdown)}
                        className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-black transition-colors px-2.5 py-1.5 rounded-lg hover:bg-gray-50"
                      >
                        {sortOptions.find(o => o.value === sortBy)?.label}
                        <ChevronDown size={12} className={`transition-transform duration-200 ${showSortDropdown ? 'rotate-180' : ''}`} />
                      </button>
                      <AnimatePresence>
                        {showSortDropdown && (
                          <motion.div
                            initial={{ opacity: 0, y: -4, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -4, scale: 0.96 }}
                            transition={{ duration: 0.15 }}
                            className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-xl border border-gray-200 py-1.5 z-20"
                          >
                            {sortOptions.map(opt => (
                              <button
                                key={opt.value}
                                onClick={() => { setSortBy(opt.value); setShowSortDropdown(false); }}
                                className={`w-full text-left px-4 py-2 text-xs font-semibold transition-colors hover:bg-gray-50 ${
                                  sortBy === opt.value ? 'text-black bg-gray-50' : 'text-gray-600'
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* ── Store Reviews Tab Content ── */}
                  {activeTab === 'store' && (
                    <div>
                      {/* Store reviews header */}
                      <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200/80 p-4 sm:p-5 mb-4">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-full bg-black/5 flex items-center justify-center shrink-0 mt-0.5">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600">
                              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 01-8 0" />
                            </svg>
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-black">{t('reviews.store_reviews', 'Store Reviews')}</h4>
                            <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                              {t('reviews.store_reviews_desc', 'Reviews about the overall shopping experience — quality, shipping, service, and more.')}
                            </p>
                          </div>
                        </div>

                        {/* ── Write Store Review CTA ── */}
                        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-black/5 flex items-center justify-center shrink-0">
                              <MessageCircle size={15} className="text-gray-600" />
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-black">{t('product.share_thoughts')}</h4>
                              <p className="text-[11px] text-gray-500">{t('product.help_others')}</p>
                            </div>
                          </div>
                          <button
                            onClick={handleWriteStoreReview}
                            className="shrink-0 px-4 py-2 rounded-xl bg-black text-white text-xs font-bold hover:bg-gray-800 transition-all duration-200 active:scale-[0.97] shadow-sm"
                          >
                            {t('product.write_review')}
                          </button>
                        </div>
                      </div>

                      {/* Loading state */}
                      {storeReviewsLoading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                          <RefreshCw size={20} className="text-gray-400 animate-spin mb-3" />
                          <p className="text-sm text-gray-500">{t('common.loading', 'Loading...')}</p>
                        </div>
                      ) : sortedStoreReviews.length > 0 ? (
                        <div className="space-y-3 sm:space-y-4">
                          {sortedStoreReviews.map((review, idx) => renderReviewCard(review, idx, false))}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                          <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 01-8 0" />
                            </svg>
                          </div>
                          <h3 className="text-sm font-bold text-black mb-1">{t('reviews.no_store_reviews', 'No store reviews yet')}</h3>
                          <p className="text-xs text-gray-500 max-w-xs mb-4">{t('reviews.no_store_reviews_desc', 'Share your overall shopping experience — quality, shipping, and service.')}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Product Reviews List ── */}
                  {activeTab === 'reviews' && sortedReviews.length > 0 && (
                    <div className="space-y-3 sm:space-y-4">
                      {sortedReviews.map((review, idx) => renderReviewCard(review, idx, true))}
                    </div>
                  )}

                  {/* ── Empty state (any tab) ── */}
                  {activeTab === 'reviews' && sortedReviews.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                        <MessageCircle size={24} className="text-gray-400" />
                      </div>
                      <h3 className="text-sm font-bold text-black mb-1">{t('product.no_reviews_yet')}</h3>
                      <p className="text-xs text-gray-500 max-w-xs">{t('product.no_reviews_desc')}</p>
                    </div>
                  )}

                  {/* Bottom spacer */}
                  <div className="h-4" />
                </div>

              </div>
            </div>
          </motion.div>

          {/* Lightbox */}
          <AnimatePresence>
            {lightboxOpen && lightboxImages.length > 0 && (
              <ReviewImageLightbox
                images={lightboxImages}
                initialIndex={lightboxIndex}
                onClose={() => setLightboxOpen(false)}
                zIndex={250}
              />
            )}
          </AnimatePresence>

          {/* Store Review Form Modal */}
          <StoreReviewFormModal
            isOpen={showStoreReviewForm}
            onClose={() => setShowStoreReviewForm(false)}
            onSuccess={() => {
              // Refresh store reviews after submission
              setStoreReviewsLoaded(false);
              setStoreReviews([]);
              onReviewSuccess?.();
            }}
          />
        </>
      )}
    </AnimatePresence>
  );
}

