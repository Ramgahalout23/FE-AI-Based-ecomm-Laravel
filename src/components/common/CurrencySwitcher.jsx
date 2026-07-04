import { ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
;
import { useDisplayCurrency } from '../../hooks/useDisplayCurrency';

/**
 * CurrencySwitcher — a dropdown that lets users switch the display currency.
 * All price formatting uses `setDefaultCurrency()` under the hood.
 */
export default function CurrencySwitcher({ variant = 'navbar' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const { currencies, displayCurrency, setDisplayCurrency, loading } = useDisplayCurrency();

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Don't render if there's only one currency
  if (loading || currencies.length <= 1) return null;

  const active = currencies.find((c) => c.code === displayCurrency) || currencies[0];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 rounded-lg text-xs font-semibold transition-colors ${
          variant === 'navbar'
            ? 'px-2.5 py-1.5 text-white/70 hover:text-white hover:bg-white/10'
            : variant === 'mobile'
            ? 'px-2.5 py-1.5 text-white/60 hover:text-white hover:bg-white/10'
            : 'px-3 py-2 text-gray-700 hover:text-black hover:bg-gray-100'
        }`}
      >
        <span>{active.symbol || active.code}</span>
        <ChevronDown size={12} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={`absolute right-0 top-full mt-1.5 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50 min-w-[140px] ${
              variant === 'mobile' ? 'left-0 right-auto' : variant === 'navbar' ? '' : 'left-0 right-auto'
            }`}
          >
            {currencies.map((currency) => {
              const isActive = currency.code === displayCurrency;
              return (
                <button
                  key={currency.code}
                  onClick={() => {
                    setDisplayCurrency(currency.code);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-sm transition-colors ${
                    isActive
                      ? 'bg-gray-100 text-black font-bold'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-black'
                  }`}
                >
                  <span className="w-8 text-center font-semibold">{currency.symbol}</span>
                  <span className="flex-1 text-left">{currency.code}</span>
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-black" />
                  )}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
