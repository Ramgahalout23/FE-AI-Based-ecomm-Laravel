import { useSettings } from '../store/useSettings';

// Logos + favicon — bundled in FE assets, zero API dependency, instant on page load
import defaultLogoDark from '../assets/logo-dark.png';
import defaultLogoLight from '../assets/logo-white.png';
import defaultFavicon from '../assets/favicon.png';

/**
 * Always returns logos from FE assets — never depends on API.
 * Replace the PNG files in src/assets/ to change the logo.
 */
export function useLogo({ variant = 'light' } = {}) {
  const { getSetting } = useSettings();

  const storeName = getSetting('storeName', 'THREVOLT');
  const logoUrl = variant === 'light' ? defaultLogoLight : defaultLogoDark;
  const faviconUrl = defaultFavicon;

  return { logoUrl, faviconUrl, storeName };
}

export default useLogo;
