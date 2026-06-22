import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, X, Loader2 } from 'lucide-react';
import { reviewsAPI } from '../../api/reviews';
import toast from '../../utils/toast';

export default function ReviewFormModal({ isOpen, onClose, productId, productName, onSuccess }) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const resetForm = () => {
    setRating(0);
    setHoverRating(0);
    setTitle('');
    setComment('');
    setError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (rating === 0) {
      setError('Please select a star rating');
      return;
    }
    if (!comment.trim()) {
      setError('Please write a review comment');
      return;
    }

    setSubmitting(true);
    try {
      await reviewsAPI.create({
        product_id: productId,
        rating,
        title: title.trim() || undefined,
        comment: comment.trim(),
      });
      toast.success('Review submitted! It will appear after moderation.');
      resetForm();
      onSuccess?.();
      onClose();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || 'Failed to submit review. Please try again.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const starLabels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

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
            className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-[101] flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between p-5 pb-3 border-b border-gray-100">
                <div>
                  <h3 className="text-lg font-display font-extrabold text-black">Write a Review</h3>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{productName}</p>
                </div>
                <button
                  onClick={handleClose}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                {/* Star Rating */}
                <div>
                  <label className="block text-sm font-bold text-black mb-2">
                    Your Rating <span className="text-red-500">*</span>
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
                          <Star
                            size={28}
                            className={`transition-colors duration-150 ${
                              star <= (hoverRating || rating)
                                ? 'fill-amber-400 text-amber-400'
                                : 'fill-gray-200 text-gray-200'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                    {rating > 0 && (
                      <span className="text-sm font-medium text-gray-600 ml-1">
                        {starLabels[rating]}
                      </span>
                    )}
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-sm font-bold text-black mb-1.5">
                    Review Title <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Summarize your experience"
                    maxLength={255}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-black focus:ring-1 focus:ring-black/10 outline-none transition-all placeholder:text-gray-400"
                  />
                </div>

                {/* Comment */}
                <div>
                  <label className="block text-sm font-bold text-black mb-1.5">
                    Your Review <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Tell others about your experience with this product..."
                    rows={4}
                    maxLength={1000}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-black focus:ring-1 focus:ring-black/10 outline-none transition-all resize-none placeholder:text-gray-400"
                  />
                  <div className="flex justify-end mt-1">
                    <span className="text-[10px] text-gray-400">{comment.length}/1000</span>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div className="px-3.5 py-2.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600 font-medium">
                    {error}
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 rounded-xl bg-black text-white text-sm font-bold hover:bg-gray-800 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Review'
                  )}
                </button>

                <p className="text-[10px] text-gray-400 text-center leading-relaxed">
                  Your review will be moderated before appearing on the site.
                </p>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
