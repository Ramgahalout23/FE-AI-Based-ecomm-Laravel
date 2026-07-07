import { Star, X, RefreshCw, Camera, Image, Trash2, Store } from 'lucide-react';
import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { reviewsAPI } from '../../api/reviews';
import toast from '../../utils/toast';

const MAX_IMAGES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export default function StoreReviewFormModal({ isOpen, onClose, onSuccess }) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [images, setImages] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const resetForm = () => {
    setName('');
    setEmail('');
    setRating(0);
    setHoverRating(0);
    setComment('');
    setImages([]);
    setError('');
    images.forEach(img => {
      if (img.preview && img.preview.startsWith('blob:')) {
        URL.revokeObjectURL(img.preview);
      }
    });
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleFileSelect = useCallback((e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const remaining = MAX_IMAGES - images.length;
    const toAdd = files.slice(0, remaining);

    const validFiles = [];
    for (const file of toAdd) {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not a supported image format`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} exceeds the 10MB limit`);
        continue;
      }
      validFiles.push({
        file,
        preview: URL.createObjectURL(file),
      });
    }

    if (validFiles.length === 0) return;
    setImages(prev => [...prev, ...validFiles]);

    if (validFiles.length < files.length) {
      toast.warning(`You can upload up to ${MAX_IMAGES} images`);
    }
  }, [images.length]);

  const removeImage = useCallback((index) => {
    setImages(prev => {
      const img = prev[index];
      if (img.preview && img.preview.startsWith('blob:')) {
        URL.revokeObjectURL(img.preview);
      }
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files || []);
    if (files.length === 0) return;

    const remaining = MAX_IMAGES - images.length;
    const toAdd = files.slice(0, remaining);

    const validFiles = [];
    for (const file of toAdd) {
      if (!file.type.startsWith('image/')) continue;
      if (file.size > MAX_FILE_SIZE) continue;
      validFiles.push({
        file,
        preview: URL.createObjectURL(file),
      });
    }

    if (validFiles.length > 0) {
      setImages(prev => [...prev, ...validFiles]);
    }
  }, [images.length]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError(t('store_review.name_required', 'Name is required'));
      return;
    }
    if (!email.trim()) {
      setError(t('store_review.email_required', 'Email is required'));
      return;
    }
    if (rating === 0) {
      setError(t('reviews.select_rating_error'));
      return;
    }
    if (!comment.trim()) {
      setError(t('reviews.write_comment_error'));
      return;
    }

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

      const payload = {
        type: 'store',
        name: name.trim(),
        email: email.trim(),
        rating,
        comment: comment.trim(),
        images: imageUrls.length > 0 ? imageUrls : undefined,
      };

      await reviewsAPI.create(payload);
      toast.success(t('reviews.submitted_success'));
      resetForm();
      onSuccess?.();
      onClose();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || t('reviews.submit_failed');
      setError(msg);
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  const starLabels = ['', t('reviews.poor'), t('reviews.fair'), t('reviews.good'), t('reviews.very_good'), t('reviews.excellent')];

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
            className="fixed inset-0 z-[300] bg-black/50 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-[301] flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between p-5 pb-3 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-black/5 flex items-center justify-center">
                    <Store size={16} className="text-gray-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-display font-extrabold text-black">
                      {t('store_review.write_title', 'Write a Store Review')}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {t('store_review.header_desc', 'Share your overall shopping experience')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-bold text-black mb-1.5">
                    {t('store_review.name', 'Your Name')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('store_review.name_placeholder', 'Enter your full name')}
                    maxLength={255}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-black focus:ring-1 focus:ring-black/10 outline-none transition-all placeholder:text-gray-400"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-bold text-black mb-1.5">
                    {t('store_review.email', 'Email Address')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('store_review.email_placeholder', 'your@email.com')}
                    maxLength={255}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-black focus:ring-1 focus:ring-black/10 outline-none transition-all placeholder:text-gray-400"
                  />
                </div>

                {/* Star Rating */}
                <div>
                  <label className="block text-sm font-bold text-black mb-2">
                    {t('reviews.your_rating')} <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          className="p-0.5 transition-transform hover:scale-110 active:scale-90"
                        >
                          <Star size={28} className={`transition-colors duration-150 ${star <= (hoverRating || rating) ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200'}`} />
                        </button>
                      ))}
                    </div>
                    {rating > 0 && (
                      <span className="text-sm font-medium text-gray-600 ml-1">{starLabels[rating]}</span>
                    )}
                  </div>
                </div>

                {/* Comment */}
                <div>
                  <label className="block text-sm font-bold text-black mb-1.5">
                    {t('reviews.your_review')} <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder={t('store_review.comment_placeholder', 'Tell us about your experience with our store — quality, shipping, service, and more...')}
                    rows={4}
                    maxLength={1000}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-black focus:ring-1 focus:ring-black/10 outline-none transition-all resize-none placeholder:text-gray-400"
                  />
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-gray-400">{t('reviews.share_details')}</span>
                    <span className="text-[10px] text-gray-400">{comment.length}/1000</span>
                  </div>
                </div>

                {/* Image Upload */}
                <div>
                  <label className="block text-sm font-bold text-black mb-2 flex items-center gap-1.5">
                    <Camera size={14} />
                    {t('reviews.add_photos')} <span className="text-gray-400 font-normal text-xs">({images.length}/{MAX_IMAGES} · {t('reviews.optional')})</span>
                  </label>

                  {images.length > 0 && (
                    <div className="grid grid-cols-5 gap-2 mb-3">
                      {images.map((img, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.2, delay: idx * 0.05 }}
                          className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 bg-gray-50 group"
                        >
                          <img src={img.preview} alt={`Review photo ${idx + 1}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removeImage(idx)}
                            className="absolute top-1 right-1 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-md"
                          >
                            <Trash2 size={14} />
                          </button>
                          <div className="absolute inset-0 ring-1 ring-black/5 rounded-xl pointer-events-none" />
                        </motion.div>
                      ))}
                      {images.length < MAX_IMAGES && (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="aspect-square rounded-xl border-2 border-dashed border-gray-200 hover:border-gray-400 hover:bg-gray-50/50 flex items-center justify-center transition-all duration-200 group"
                        >
                          <Image size={16} />
                        </button>
                      )}
                    </div>
                  )}

                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-1.5 min-h-[80px] ${
                      images.length >= MAX_IMAGES
                        ? 'border-green-200 bg-green-50/50'
                        : isDragOver
                        ? 'border-black bg-gray-50 scale-[1.01]'
                        : 'border-gray-200 hover:border-gray-400 hover:bg-gray-50/50'
                    }`}
                  >
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
                      <RefreshCw size={20} className="animate-spin" />
                    ) : images.length >= MAX_IMAGES ? (
                      <>
                        <Camera size={18} />
                        <span className="text-xs font-semibold text-green-600">{t('reviews.max_photos')}</span>
                      </>
                    ) : (
                      <>
                        <Camera size={18} />
                        <div className="text-xs font-semibold text-gray-600">
                          {isDragOver ? t('reviews.drop_images_here') : t('reviews.drag_drop_or_click')}
                        </div>
                        <p className="text-[10px] text-gray-400">{t('reviews.photo_formats')}</p>
                      </>
                    )}
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="px-3.5 py-2.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600 font-medium flex items-center gap-2"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                    {error}
                  </motion.div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 rounded-xl bg-black text-white text-sm font-bold hover:bg-gray-800 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-black/10"
                >
                  {submitting ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      {uploading ? t('reviews.uploading_photos') : t('reviews.submitting')}
                    </>
                  ) : (
                    <>
                      <Store size={14} />
                      {t('store_review.submit', 'Submit Store Review')}
                    </>
                  )}
                </button>

                <p className="text-[10px] text-gray-400 text-center leading-relaxed">
                  {t('reviews.review_moderated')}
                </p>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
