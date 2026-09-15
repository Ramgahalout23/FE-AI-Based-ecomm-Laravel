import { ChevronDown, Globe } from 'lucide-react';
import { useState, useEffect, useRef, useCallback, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppInit } from '../../contexts/AppInitContext';
import { switchLanguage } from '../../utils/i18n';
import { useTranslation } from 'react-i18next';

/**
 * LanguageSwitcher — dropdown that lets users change the site language.
 *
 * Languages come from AppInitContext (already fetched by the app-init endpoint),
 * so opening the switcher costs no extra request.
 *
 * Behaviour that matters here:
 *  - the trigger keeps its footprint while languages load (no navbar layout shift)
 *  - full keyboard support: ArrowUp/Down, Home/End, Escape, Enter/Space
 *  - proper listbox semantics for screen readers
 */
export default function LanguageSwitcher({ variant = 'navbar' }) {
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const ref = useRef(null);
  const triggerRef = useRef(null);
  const optionRefs = useRef([]);
  const listboxId = useId();
  const { i18n } = useTranslation();

  const { data: appInitData, loading: appInitLoading } = useAppInit();
  const rawLanguages = appInitData?.languages || [];
  const languages = rawLanguages.map((l) =>
    typeof l === 'string'
      ? { code: l, name: l.toUpperCase(), nativeName: l.toUpperCase(), direction: 'ltr' }
      : l
  );

  // Label for a language, tolerating both nativeName (API) and native_name (legacy payloads).
  const labelFor = (lang) => lang?.nativeName || lang?.native_name || lang?.name || lang?.code || '';

  const active = languages.find((l) => l.code === i18n.language) || languages[0];
  const activeIndex = Math.max(
    languages.findIndex((l) => l.code === (active?.code || '')),
    0
  );

  // On mount, sync the displayed language with the persisted preference in localStorage.
  useEffect(() => {
    const storedLang = localStorage.getItem('luxe_language');
    if (storedLang && storedLang !== i18n.language) {
      switchLanguage(storedLang).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only: applying the stored language once
  }, []);

  // Keep multiple tabs in sync.
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === 'luxe_language' && e.newValue && e.newValue !== i18n.language) {
        switchLanguage(e.newValue).catch(() => {});
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [i18n.language]);

  // Close on click outside and on Escape.
  useEffect(() => {
    if (!open) return undefined;

    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  // Move focus onto the current language when the menu opens.
  useEffect(() => {
    if (open) {
      const target = optionRefs.current[activeIndex] || optionRefs.current[0];
      target?.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- focus only on open/active change
  }, [open]);

  const handleSwitch = useCallback(
    async (code) => {
      if (switching || code === i18n.language) {
        setOpen(false);
        return;
      }
      setSwitching(true);
      try {
        await switchLanguage(code);
        setOpen(false);
      } catch {
        // Loading translations failed — stay on the current language.
      } finally {
        setSwitching(false);
      }
    },
    [switching, i18n.language]
  );

  const moveFocus = (from, delta) => {
    if (languages.length === 0) return;
    const next = (from + delta + languages.length) % languages.length;
    optionRefs.current[next]?.focus();
  };

  const handleOptionKeyDown = (event, index) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveFocus(index, 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveFocus(index, -1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      optionRefs.current[0]?.focus();
    } else if (event.key === 'End') {
      event.preventDefault();
      optionRefs.current[languages.length - 1]?.focus();
    }
  };

  const triggerClasses =
    variant === 'navbar'
      ? 'px-2.5 py-1.5 text-white/70 hover:text-white hover:bg-white/10'
      : variant === 'mobile'
      ? 'px-2.5 py-1.5 text-white/60 hover:text-white hover:bg-white/10'
      : 'px-3 py-2 text-gray-700 hover:text-black hover:bg-gray-100';

  // Keep the same footprint while loading so the navbar does not reflow.
  if (appInitLoading || languages.length === 0) {
    if (appInitLoading) {
      return (
        <div
          className={`flex items-center gap-1.5 rounded-lg text-xs font-semibold ${triggerClasses} opacity-60`}
          aria-hidden="true"
        >
          <Globe size={14} />
          <span className="w-10 h-3 rounded bg-current opacity-20" />
        </div>
      );
    }
    return null;
  }

  // A single language still deserves a visible pill, but no dropdown.
  if (languages.length === 1) {
    return (
      <div className={`flex items-center gap-1.5 rounded-lg text-xs font-semibold ${triggerClasses}`}>
        <Globe size={14} aria-hidden="true" />
        <span lang={active?.code}>{labelFor(active)}</span>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setOpen(true);
          }
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-label={`${labelFor(active)} — change language`}
        className={`flex items-center gap-1.5 rounded-lg text-xs font-semibold transition-colors ${triggerClasses}`}
      >
        <Globe size={14} aria-hidden="true" />
        <span lang={active?.code}>{labelFor(active)}</span>
        <ChevronDown
          size={12}
          aria-hidden="true"
          className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            id={listboxId}
            role="listbox"
            aria-label="Language"
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={`absolute right-0 top-full mt-1.5 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50 min-w-[160px] ${
              variant === 'mobile' ? 'left-0 right-auto' : variant === 'navbar' ? '' : 'left-0 right-auto'
            }`}
          >
            {languages.map((lang, index) => {
              const isActive = lang.code === i18n.language;
              return (
                <button
                  key={lang.code}
                  ref={(el) => {
                    optionRefs.current[index] = el;
                  }}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  onClick={() => handleSwitch(lang.code)}
                  onKeyDown={(e) => handleOptionKeyDown(e, index)}
                  disabled={switching}
                  lang={lang.code}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-black/20 ${
                    isActive ? 'bg-gray-100 text-black font-bold' : 'text-gray-600 hover:bg-gray-50 hover:text-black'
                  } ${switching ? 'opacity-50 cursor-wait' : ''}`}
                >
                  <span className="flex-1 text-left">{labelFor(lang)}</span>
                  <span className="text-xs text-gray-400 uppercase">{lang.code}</span>
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-black" aria-hidden="true" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
