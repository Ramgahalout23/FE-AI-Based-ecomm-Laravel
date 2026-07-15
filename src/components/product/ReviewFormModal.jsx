import { Star, X, RefreshCw, Camera, Image, Trash2, Sparkles, ChevronRight } from 'lucide-react';
import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

;
import { useTranslation } from 'react-i18next';
import { reviewsAPI } from '../../api/reviews';
import toast from '../../utils/toast';

const MAX_IMAGES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/* ═══════════════════════════════════════════════════
   Brand Tokens
   ═══════════════════════════════════════════════════ */
const INK = '#1a1a1a';
const PAPER = '#ffffff';
const THREAD = '#4a4a5a';
const STONE = '#8a8a9a';
const PANEL = '#f5f5f5';
const GOLD = '#1a1a1a';

/* ── Premium star labels with emoji accents ── */
const starLabels = ['', 'Poor 😕', 'Fair 😐', 'Good 🙂', 'Very Good 😊', 'Excellent 🔥'];

/* ── Glass morphism backdrop variants ── */
const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.94, y: 30 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', duration: 0.5, bounce: 0.18 } },
  exit: { opacity: 0, scale: 0.96, y: 20, transition: { duration: 0.2, ease: 'easeIn' } },
};

const contentVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.08 + i * 0.04, duration: 0.35, ease: [0.16, 1, 0.3, 1] },
  }),
};

export default function ReviewFormModal({ isOpen, onClose, productId, productName, onSuccess, orderId }) {
  const { t } = useTranslation();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [images, setImages] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  /* ── Reset ── */
  const resetForm = () => {
    setRating(0);
    setHoverRating(0);
    setTitle('');
    setComment('');
    images.forEach(img => {
      if (img.preview && img.preview.startsWith('blob:')) URL.revokeObjectURL(img.preview);
    });
    setImages([]);
    setError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  /* ── Image Selection ── */
  const handleFileSelect = useCallback((e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const remaining = MAX_IMAGES - images.length;
    const toAdd = files.slice(0, remaining);
    const validFiles = [];
    for (const file of toAdd) {
      if (!file.type.startsWith('image/')) { toast.error(`${file.name} is not a supported image format`); continue; }
      if (file.size > MAX_FILE_SIZE) { toast.error(`${file.name} exceeds the 10MB limit`); continue; }
      validFiles.push({ file, preview: URL.createObjectURL(file) });
    }
    if (validFiles.length === 0) return;
    setImages(prev => [...prev, ...validFiles]);
    if (validFiles.length < files.length) toast.warning(`You can upload up to ${MAX_IMAGES} images`);
  }, [images.length]);

  const removeImage = useCallback((index) => {
    setImages(prev => {
      const img = prev[index];
      if (img.preview && img.preview.startsWith('blob:')) URL.revokeObjectURL(img.preview);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  /* ── Drag & Drop ── */
  const [isDragOver, setIsDragOver] = useState(false);
  const handleDragOver = useCallback((e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); }, []);
  const handleDragLeave = useCallback((e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); }, []);
  const handleDrop = useCallback((e) => {
    e.preventDefault(); e.stopPropagation(); setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length === 0) return;
    const remaining = MAX_IMAGES - images.length;
    const toAdd = files.slice(0, remaining);
    const validFiles = [];
    for (const file of toAdd) {
      if (!file.type.startsWith('image/')) continue;
      if (file.size > MAX_FILE_SIZE) continue;
      validFiles.push({ file, preview: URL.createObjectURL(file) });
    }
    if (validFiles.length > 0) setImages(prev => [...prev, ...validFiles]);
  }, [images.length]);

  /* ── Submit ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (rating === 0) { setError(t('reviews.select_rating_error') || 'Please select a rating'); return; }
    if (!comment.trim()) { setError(t('reviews.write_comment_error') || 'Please write a review'); return; }
    setSubmitting(true);
    try {
      let imageUrls = [];
      if (images.length > 0) {
        setUploading(true);
        const files = images.map(img => img.file);
        if (files.length === 1) {
          const res = await reviewsAPI.uploadImage(files[0]);
          const url = res.data?.data?.url || '';
          if (url) imageUrls.push(url);
        } else {
          const res = await reviewsAPI.uploadImages(files);
          const urls = (res.data?.data?.files || []).map(f => f.url).filter(Boolean);
          imageUrls.push(...urls);
        }
        setUploading(false);
      }
      const payload = { product_id: productId, rating, title: title.trim() || undefined, comment: comment.trim(), images: imageUrls.length > 0 ? imageUrls : undefined };
      if (orderId) payload.order_id = orderId;
      await reviewsAPI.create(payload);
      toast.success(t('reviews.submitted_success') || 'Review submitted!');
      resetForm();
      onSuccess?.();
      onClose();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || t('reviews.submit_failed') || 'Something went wrong';
      setError(msg);
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* ── Backdrop ── */}
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* ── Modal ── */}
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-[301] flex items-center justify-center p-3 sm:p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col ring-1 ring-black/5">

              {/* ══ Top Decorative Accent Bar ══ */}
              <div className="h-1 bg-gradient-to-r from-black via-gray-600 to-black shrink-0" />

              {/* ══ Header ══ */}
              <div className="flex items-center justify-between px-5 sm:px-6 pt-5 pb-4 shrink-0 border-b border-gray-100/80">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center shadow-sm shrink-0">
                    <Sparkles size={16} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-display font-extrabold text-black tracking-tight">
                      {t('reviews.write_title') || 'Write a Review'}
                    </h3>
                    <p className="text-[11px] sm:text-xs text-gray-400 mt-0.5 line-clamp-1 max-w-[180px] sm:max-w-[260px]">
                      {productName || 'Share your experience'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-all duration-200 active:scale-90 group"
                >
                  <X size={16} className="text-gray-400 group-hover:text-gray-600 transition-colors" />
                </button>
              </div>

              {/* ══ Scrollable Form Content ══ */}
              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto overscroll-contain px-5 sm:px-6 py-5 space-y-5">

                {/* ══ 1. Star Rating ══ */}
                <motion.div custom={0} variants={contentVariants} initial="hidden" animate="visible">
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2.5">
                    {t('reviews.your_rating') || 'Your Rating'} <span className="text-red-500 not-italic">*</span>
                  </label>
                  <div className="flex flex-col items-center sm:items-start gap-2">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => {
                        const active = star <= (hoverRating || rating);
                        return (
                          <motion.button
                            key={star}
                            type="button"
                            onClick={() => setRating(star)}
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(0)}
                            whileHover={{ scale: 1.15 }}
                            whileTap={{ scale: 0.9 }}
                            className="p-1 -m-1 relative"
                          >
                            <Star
                              size={32}
                              strokeWidth={active ? 0 : 1.5}
                              className={`transition-all duration-200 ${
                                active
                                  ? 'fill-amber-400 text-amber-400 drop-shadow-sm'
                                  : 'fill-gray-100 text-gray-200 hover:fill-gray-200'
                              }`}
                            />
                            {active && (
                              <motion.span
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5"
                              >
                                <span className="absolute inset-0 rounded-full bg-amber-400/30 animate-ping" />
                                <span className="absolute inset-0.5 rounded-full bg-amber-400" />
                              </motion.span>
                            )}
                          </motion.button>
                        );
                      })}
                    </div>
                    <AnimatePresence mode="wait">
                      {(hoverRating || rating) > 0 && (
                        <motion.span
                          key={hoverRating || rating}
                          initial={{ opacity: 0, y: -4, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 4, scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                          className="text-sm font-semibold text-gray-700 bg-gray-50 px-3 py-1 rounded-lg"
                        >
                          {starLabels[hoverRating || rating]}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>

                {/* ══ 2. Review Title ══ */}
                <motion.div custom={1} variants={contentVariants} initial="hidden" animate="visible">
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                    {t('reviews.review_title') || 'Review Title'} <span className="text-gray-300 font-normal normal-case">({t('reviews.optional') || 'optional'})</span>
                  </label>
                  <div className="relative group">
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder={t('reviews.title_placeholder') || 'Summarize your experience...'}
                      maxLength={255}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-300 focus:border-black focus:ring-1 focus:ring-black/10 outline-none transition-all duration-200 group-hover:border-gray-300"
                    />
                    <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-black/0 group-focus-within:ring-black/5 pointer-events-none transition-all duration-200" />
                  </div>
                </motion.div>

                {/* ══ 3. Review Comment ══ */}
                <motion.div custom={2} variants={contentVariants} initial="hidden" animate="visible">
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                    {t('reviews.your_review') || 'Your Review'} <span className="text-red-500 not-italic">*</span>
                  </label>
                  <div className="relative group">
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder={t('reviews.comment_placeholder') || 'What did you like or dislike? Share details to help others...'}
                      rows={4}
                      maxLength={1000}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-300 focus:border-black focus:ring-1 focus:ring-black/10 outline-none transition-all duration-200 resize-none group-hover:border-gray-300"
                    />
                    <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-black/0 group-focus-within:ring-black/5 pointer-events-none transition-all duration-200" />
                  </div>
                  <div className="flex justify-between items-center mt-1.5">
                    <span className="text-[10px] text-gray-400 flex items-center gap-1">
                      <ChevronRight size={8} />
                      {t('reviews.share_details') || 'Be honest & helpful'}
                    </span>
                    <span className={`text-[10px] font-mono tabular-nums ${
                      comment.length > 900 ? 'text-amber-500' : comment.length > 0 ? 'text-gray-500' : 'text-gray-300'
                    }`}>
                      {comment.length}/1000
                    </span>
                  </div>
                </motion.div>

                {/* ══ 4. Premium Photo Upload ══ */}
                <motion.div custom={3} variants={contentVariants} initial="hidden" animate="visible">
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    <Camera size={12} />
                    {t('reviews.add_photos') || 'Add Photos'}
                    <span className="text-gray-300 font-normal normal-case text-[10px]">
                      ({images.length}/{MAX_IMAGES} · {t('reviews.optional') || 'optional'})
                    </span>
                  </label>

                  {/* Image preview grid */}
                  {images.length > 0 && (
                    <div className="grid grid-cols-5 gap-2 mb-3">
                      {images.map((img, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, scale: 0.8, y: 8 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          transition={{ duration: 0.25, delay: idx * 0.06, ease: [0.16, 1, 0.3, 1] }}
                          className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 bg-gray-50 group/shadow"
                        >
                          <img src={img.preview} alt={`Review photo ${idx + 1}`} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/0 group-hover/shadow:bg-black/5 transition-colors duration-200" />
                          <motion.button
                            type="button"
                            onClick={() => removeImage(idx)}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/70 backdrop-blur-sm text-white flex items-center justify-center opacity-0 group-hover/shadow:opacity-100 transition-all duration-200 shadow-md hover:bg-red-500"
                          >
                            <Trash2 size={11} />
                          </motion.button>
                          {/* Index badge */}
                          <div className="absolute bottom-1.5 left-1.5 w-5 h-5 rounded-md bg-black/60 backdrop-blur-sm flex items-center justify-center">
                            <span className="text-[8px] font-bold text-white/90">{idx + 1}</span>
                          </div>
                        </motion.div>
                      ))}
                      {images.length < MAX_IMAGES && (
                        <motion.button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          whileHover={{ scale: 1.04 }}
                          whileTap={{ scale: 0.96 }}
                          className="aspect-square rounded-xl border-2 border-dashed border-gray-200 hover:border-gray-400 hover:bg-gray-50/50 flex items-center justify-center transition-all duration-200 group/add"
                        >
                          <Image size={16} className="text-gray-300 group-hover/add:text-gray-500 transition-colors" />
                        </motion.button>
                      )}
                    </div>
                  )}

                  {/* Drag & drop zone */}
                  <motion.div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => !submitting && fileInputRef.current?.click()}
                    whileHover={!submitting && images.length < MAX_IMAGES ? { scale: 1.005 } : {}}
                    className={`relative border-2 border-dashed rounded-xl p-4 sm:p-5 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-2 min-h-[90px] overflow-hidden ${
                      images.length >= MAX_IMAGES
                        ? 'border-green-200 bg-green-50/50'
                        : isDragOver
                        ? 'border-black bg-gray-50 scale-[1.01]'
                        : 'border-gray-200 hover:border-gray-400 hover:bg-gray-50/50'
                    }`}
                  >
                    {/* Subtle gradient overlay on drag */}
                    {isDragOver && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 bg-gradient-to-br from-black/[0.02] to-transparent pointer-events-none"
                      />
                    )}

                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                      disabled={images.length >= MAX_IMAGES}
                    />

                    {uploading ? (
                      <RefreshCw size={20} className="text-gray-400 animate-spin" />
                    ) : images.length >= MAX_IMAGES ? (
                      <>
                        <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center">
                          <Camera size={16} className="text-green-600" />
                        </div>
                        <span className="text-xs font-bold text-green-600">{t('reviews.max_photos') || 'Photos limit reached'}</span>
                      </>
                    ) : (
                      <>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors duration-200 ${
                          isDragOver ? 'bg-black text-white' : 'bg-gray-100 text-gray-500'
                        }`}>
                          <Camera size={17} />
                        </div>
                        <div className="text-xs font-semibold text-gray-600">
                          {isDragOver
                            ? (t('reviews.drop_images_here') || 'Drop images here')
                            : (t('reviews.drag_drop_or_click') || 'Drag & drop or click to upload')
                          }
                        </div>
                        <p className="text-[10px] text-gray-400">{t('reviews.photo_formats') || 'PNG, JPG, WebP · Up to 10MB each'}</p>
                      </>
                    )}
                  </motion.div>
                </motion.div>

                {/* ══ 5. Error Banner ══ */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: 'auto' }}
                      exit={{ opacity: 0, y: -6, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 py-3 rounded-xl bg-gradient-to-r from-red-50 to-red-50/50 border border-red-200 text-sm text-red-600 font-medium flex items-center gap-2.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0 animate-pulse" />
                        {error}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                {/* ══ Footer: Submit ══ */}
                <div className="pt-3 pb-1 border-t border-gray-100/80 bg-gradient-to-t from-white via-white to-transparent">
                  <motion.button
                    type="submit"
                    disabled={submitting}
                    whileHover={!submitting ? { scale: 1.01 } : {}}
                    whileTap={!submitting ? { scale: 0.98 } : {}}
                    className="w-full py-3.5 rounded-xl bg-black text-white text-sm font-bold hover:bg-gray-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-black/15 hover:shadow-xl hover:shadow-black/20 active:shadow-md"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw size={15} className="animate-spin" />
                        <span>{uploading ? (t('reviews.uploading_photos') || 'Uploading...') : (t('reviews.submitting') || 'Submitting...')}</span>
                      </>
                    ) : (
                      <>
                        <Star size={14} className="fill-white/20" />
                        <span>{t('reviews.submit_review') || 'Submit Review'}</span>
                        <ChevronRight size={14} className="opacity-50" />
                      </>
                    )}
                  </motion.button>
                  <p className="text-[10px] text-gray-400 text-center mt-3 leading-relaxed">
                    {t('reviews.review_moderated') || 'Your review will be published after moderation. Honest feedback helps everyone.'}
                  </p>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
