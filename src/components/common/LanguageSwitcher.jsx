import { ChevronDown, Globe } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
;
import { useAppInit } from '../../contexts/AppInitContext';
import { switchLanguage } from '../../utils/i18n';
import { useTranslation } from 'react-i18next';

/**
 * LanguageSwitcher — a dropdown that lets users switch the site language.
 * Languages are read from the AppInitContext (already fetched by app-init endpoint).
 */
export default function LanguageSwitcher({ variant = 'navbar' }) {
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const ref = useRef(null);
  const { i18n } = useTranslation();

  // Read languages from app-init (already fetched, no separate API call needed)
  const { data: appInitData, loading: appInitLoading } = useAppInit();
  const languages = appInitData?.languages || [];
  const loading = appInitLoading;

  // On mount, sync the displayed language with the persisted preference in localStorage.
  // This ensures the component reflects the language even if i18next's internal state
  // is out of sync (e.g. after a full page reload or language change from another tab).
  useEffect(() => {
    const storedLang = localStorage.getItem('luxe_language');
    if (storedLang && storedLang !== i18n.language) {
      switchLanguage(storedLang).catch(() => {});
    }
  }, []);

  // Listen for storage events from other tabs to keep the switcher in sync
  // when the language is changed in a different browser tab.
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === 'luxe_language' && e.newValue && e.newValue !== i18n.language) {
        switchLanguage(e.newValue).catch(() => {});
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [i18n.language]);

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

  const handleSwitch = useCallback(async (code) => {
    if (switching) return;
    setSwitching(true);
    try {
      await switchLanguage(code);
      setOpen(false);
    } catch {
      // If loading translations fails, language remains unchanged
    } finally {
      setSwitching(false);
    }
  }, [switching]);

  // Don't render while loading or if no languages are available
  if (loading || languages.length === 0) return null;

  const active = languages.find((l) => l.code === i18n.language) || languages[0];

  // If only one language is active, show a static language pill instead of a dropdown
  // so users can always see that the site supports multiple languages.
  if (languages.length === 1) {
    return (
      <div className={`flex items-center gap-1.5 rounded-lg text-xs font-semibold ${
        variant === 'navbar'
          ? 'px-2.5 py-1.5 text-white/70'
          : variant === 'mobile'
          ? 'px-2.5 py-1.5 text-white/60'
          : 'px-3 py-2 text-gray-700'
      }`}>
        <Globe size={14} />
        <span>{active.native_name || active.name || active.code}</span>
      </div>
    );
  }

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
        <Globe size={14} />
        <span>{active.native_name || active.name || active.code}</span>
        <ChevronDown size={12} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={`absolute right-0 top-full mt-1.5 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50 min-w-[160px] ${
              variant === 'mobile' ? 'left-0 right-auto' : variant === 'navbar' ? '' : 'left-0 right-auto'
            }`}
          >
            {languages.map((lang) => {
              const isActive = lang.code === i18n.language;
              return (
                <button
                  key={lang.code}
                  onClick={() => handleSwitch(lang.code)}
                  disabled={switching}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-sm transition-colors ${
                    isActive
                      ? 'bg-gray-100 text-black font-bold'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-black'
                  } ${switching ? 'opacity-50 cursor-wait' : ''}`}
                >
                  <span className="flex-1 text-left">{lang.native_name || lang.name}</span>
                  <span className="text-xs text-gray-400 uppercase">{lang.code}</span>
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
