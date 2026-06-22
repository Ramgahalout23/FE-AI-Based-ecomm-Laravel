import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, X, TrendingUp, Star, ArrowRight, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { productsAPI } from '../../api/products';
import SearchProductCard from '../../components/product/SearchProductCard';

const TRENDING_SEARCHES = [
  'Oversized T-Shirt',
  'Graphic Tees',
  'White Polo',
  'Black Hoodie',
  'Cotton Crew Neck',
  'Streetwear',
  'Minimal Print',
  'Boxy Fit',
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};

export default memo(function SearchModal({ isOpen, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const inputRef = useRef(null);
  const [query, setQuery] = useState('');
  const [popularProducts, setPopularProducts] = useState([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  // Fetch popular/featured products
  useEffect(() => {
    if (!isOpen) return;
    setIsLoadingProducts(true);
    const fetchPopular = async () => {
      try {
        const res = await productsAPI.getFeatured();
        const products = res.data?.data?.products || res.data?.data || [];
        setPopularProducts(products.slice(0, 8));
      } catch {
        // Fallback to best sellers
        try {
          const res = await productsAPI.getBestSellers();
          const products = res.data?.data?.products || res.data?.data || [];
          setPopularProducts(products.slice(0, 8));
        } catch {
          setPopularProducts([]);
        }
      }
      setIsLoadingProducts(false);
    };
    fetchPopular();
  }, [isOpen]);

  // Auto-focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery('');
    }
  }, [isOpen]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Close on navigation (e.g. clicking a ProductCard)
  const prevPathRef = useRef(location.pathname);
  useEffect(() => {
    if (isOpen && location.pathname !== prevPathRef.current) {
      onClose();
    }
    prevPathRef.current = location.pathname;
  }, [location.pathname]);

  // Escape key
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const handleSearch = useCallback((e) => {
    e?.preventDefault();
    const q = query.trim();
    if (q) {
      navigate(`/products?q=${encodeURIComponent(q)}`);
      onClose();
    }
  }, [query, navigate, onClose]);

  const handleTrendingClick = useCallback((term) => {
    navigate(`/products?q=${encodeURIComponent(term)}`);
    onClose();
  }, [navigate, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[300] flex items-start justify-center pt-[10vh] sm:pt-[12vh]">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            aria-hidden="true"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Search products"
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 20 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-2xl mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[75vh] flex flex-col"
          >
            {/* Search Input */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 shrink-0">
              <Search size={20} className="text-gray-400 shrink-0" />
              <form onSubmit={handleSearch} className="flex-1 min-w-0">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search products..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full text-lg font-medium text-black placeholder:text-gray-300 bg-transparent outline-none"
                />
              </form>
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-black hover:bg-gray-100 transition-colors shrink-0"
                >
                  <X size={16} />
                </button>
              )}
              <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gray-100 text-[11px] font-bold text-gray-400 shrink-0">
                <span>ESC</span>
              </kbd>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-black hover:bg-gray-100 transition-colors shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto flex-1 p-5 sm:p-6">
              {query.trim() ? (
                /* Search results preview */
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
                    <Search size={28} className="text-gray-300" />
                  </div>
                  <p className="text-base font-semibold text-black mb-1">
                    Search for &ldquo;{query}&rdquo;
                  </p>
                  <p className="text-sm text-gray-400 mb-6">
                    Press Enter to see all results
                  </p>
                  <button
                    onClick={handleSearch}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-black text-white text-sm font-bold hover:bg-gray-800 transition-colors"
                  >
                    <Search size={16} />
                    Search Products
                  </button>
                </div>
              ) : (
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="space-y-8"
                >
                  {/* Trending Searches */}
                  <motion.div variants={itemVariants}>
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp size={16} className="text-primary" />
                      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                        Trending Searches
                      </h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {TRENDING_SEARCHES.map((term) => (
                        <button
                          key={term}
                          onClick={() => handleTrendingClick(term)}
                          className="group flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-50 border border-gray-100 text-sm font-medium text-gray-600 hover:bg-black hover:text-white hover:border-black transition-all duration-200"
                        >
                          <Clock size={12} className="opacity-40 group-hover:opacity-70" />
                          {term}
                        </button>
                      ))}
                    </div>
                  </motion.div>

                  {/* Popular Products */}
                  <motion.div variants={itemVariants}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Star size={16} className="text-amber-500" />
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                          Popular Products
                        </h3>
                      </div>
                      <button
                        onClick={() => { navigate('/products'); onClose(); }}
                        className="flex items-center gap-1 text-xs font-semibold text-gray-400 hover:text-black transition-colors"
                      >
                        View All <ArrowRight size={12} />
                      </button>
                    </div>

                    {isLoadingProducts ? (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {Array.from({ length: 4 }).map((_, i) => (
                          <div key={i} className="animate-pulse">
                            <div className="aspect-[3/4] bg-gray-100 rounded-xl mb-2" />
                            <div className="h-3 bg-gray-100 rounded w-3/4 mb-1.5" />
                            <div className="h-3 bg-gray-100 rounded w-1/2" />
                          </div>
                        ))}
                      </div>
                    ) : popularProducts.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {popularProducts.map((product) => (
                          <SearchProductCard key={product.id} product={product} />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-sm text-gray-400">
                        No popular products available
                      </div>
                    )}
                  </motion.div>
                </motion.div>
              )}
            </div>

            {/* Footer — keyboard hints hidden on mobile */}
            <div className="hidden sm:flex px-5 py-3 border-t border-gray-100 shrink-0 items-center justify-between text-[11px] text-gray-400">
              <span>
                <kbd className="inline-flex items-center px-1.5 py-0.5 rounded bg-gray-100 font-bold mr-1">↑↓</kbd>
                Navigate
                <kbd className="inline-flex items-center px-1.5 py-0.5 rounded bg-gray-100 font-bold mx-1">Enter</kbd>
                Select
              </span>
              <span>
                <kbd className="inline-flex items-center px-1.5 py-0.5 rounded bg-gray-100 font-bold mr-1">ESC</kbd>
                Close
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
});
