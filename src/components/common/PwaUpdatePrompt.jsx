import { RefreshCw, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
;

/**
 * PwaUpdatePrompt
 * Shows a slide-up banner when a new version of the app is available.
 * Uses vite-plugin-pwa's virtual:pwa-register module.
 * In dev mode (where VitePWA plugin is disabled), this component does nothing.
 */
export default function PwaUpdatePrompt() {
  const { t } = useTranslation();
  const [needRefresh, setNeedRefresh] = useState(false);
  const [updateSW, setUpdateSW] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // In dev mode, vite-plugin-pwa is not active so virtual:pwa-register doesn't
    // exist — the dynamic import below fails and is caught. @vite-ignore prevents
    // Vite's static analysis from trying to resolve the virtual module (which
    // only exists in production builds).
    const pwaModule = 'virtual:pwa-register';
    import(/* @vite-ignore */ pwaModule).then(({ registerSW }) => {
      const swRegistration = registerSW({
        onNeedRefresh() {
          setNeedRefresh(true);
          setUpdateSW(() => () => {
            swRegistration?.updateServiceWorker();
            window.location.reload();
          });
        },
        onOfflineReady() {
          console.log('[PWA] App ready for offline use');
        },
      });
    }).catch(() => {
      // virtual:pwa-register not available — that's fine
    });
  }, []);

  // Dev mode has no PWA plugin — nothing to prompt for.
  if (import.meta.env.DEV) return null;

  if (!needRefresh || dismissed) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[10001] animate-slide-up">
      <div className="bg-[#0a0a0a] text-white rounded-2xl shadow-2xl px-5 py-4 flex items-center gap-4 min-w-[320px] max-w-md border border-white/10 backdrop-blur-xl">
        <div className="flex-1">
          <p className="text-sm font-semibold">{t('pwa.update_available')}</p>
          <p className="text-xs text-white/60 mt-0.5">{t('pwa.new_version_ready')}</p>
        </div>
        <button
          onClick={() => {
            if (updateSW) updateSW();
          }}
          className="flex items-center gap-1.5 bg-white text-black px-4 py-2 rounded-xl text-sm font-semibold hover:bg-white/90 transition-all active:scale-95"
        >
          <RefreshCw size={14} />
          {t('pwa.refresh')}
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="text-white/40 hover:text-white/80 transition-colors p-1"
          aria-label={t('pwa.dismiss')}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
