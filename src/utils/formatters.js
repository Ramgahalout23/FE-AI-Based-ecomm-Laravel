const CURRENCY_SYMBOLS = {
  INR: 'Rs.',
  USD: '$',
  EUR: '€',
  GBP: '£',
  AED: 'AED',
  SAR: 'SAR',
  SGD: 'S$',
  MYR: 'RM',
  AUD: 'A$',
  CAD: 'C$',
};

const CURRENCY_LOCALES = {
  INR: 'en-IN',
  USD: 'en-US',
  EUR: 'de-DE',
  GBP: 'en-GB',
  AED: 'ar-AE',
  SAR: 'ar-SA',
  SGD: 'en-SG',
  MYR: 'ms-MY',
  AUD: 'en-AU',
  CAD: 'en-CA',
};

/**
 * Module-level default currency used when formatCurrency() is called without a currency argument.
 * Components that read the currency from settings can update this via setDefaultCurrency().
 */
let _defaultCurrency = 'INR';

/**
 * Set the global default currency for all formatCurrency() calls.
 * Call this from your settings context/provider whenever the currency setting changes.
 */
export const setDefaultCurrency = (currency) => {
  _defaultCurrency = currency || 'INR';
};

/**
 * Map common timezone abbreviations to IANA timezone names for Intl.DateTimeFormat.
 * The timezone setting is stored as an abbreviation (e.g. 'IST'), but the Intl API
 * requires IANA names (e.g. 'Asia/Kolkata').
 */
const TIMEZONE_MAP = {
  IST: 'Asia/Kolkata',
  EST: 'America/New_York',
  CST: 'America/Chicago',
  MST: 'America/Denver',
  PST: 'America/Los_Angeles',
  GMT: 'Europe/London',
  CET: 'Europe/Paris',
  EET: 'Europe/Helsinki',
  AEST: 'Australia/Sydney',
  AEDT: 'Australia/Sydney',
  JST: 'Asia/Tokyo',
  KST: 'Asia/Seoul',
  CST_CN: 'Asia/Shanghai',
  HKT: 'Asia/Hong_Kong',
  SGT: 'Asia/Singapore',
  GST: 'Asia/Dubai',
  NZST: 'Pacific/Auckland',
  NZDT: 'Pacific/Auckland',
  BST: 'Europe/London',
  AST: 'America/Halifax',
  NST: 'America/St_Johns',
  AKST: 'America/Anchorage',
  HST: 'Pacific/Honolulu',
};

/**
 * Resolve a stored timezone abbreviation/IANA name to a valid IANA timezone.
 * If the input is already a valid IANA name it will be returned as-is.
 */
const resolveTimezone = (tz) => {
  if (!tz) return null;
  // If it's already an IANA name (contains '/'), use it directly
  if (tz.includes('/')) return tz;
  // Map common abbreviations
  return TIMEZONE_MAP[tz.toUpperCase()] || null;
};

/**
 * Module-level default timezone used by formatDate / formatDateTime when no timezone is specified.
 * Components can update this via setDefaultTimezone().
 */
let _defaultTimezone = null;

/**
 * Set the global default timezone for all formatDate / formatDateTime calls.
 * Call this from your settings context/provider whenever the timezone setting changes.
 * Accepts IANA timezone names (e.g. 'Asia/Kolkata') or common abbreviations (e.g. 'IST').
 */
export const setDefaultTimezone = (tz) => {
  _defaultTimezone = resolveTimezone(tz);
};

export const formatCurrency = (amount, currency) => {
  const cur = currency || _defaultCurrency || 'INR';
  const num = Number(amount);
  if (isNaN(num)) return `${CURRENCY_SYMBOLS[cur] || 'Rs.'} 0.00`;
  const locale = CURRENCY_LOCALES[cur] || 'en-IN';
  const symbol = CURRENCY_SYMBOLS[cur] || 'Rs.';
  return `${symbol} ${num.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const formatDate = (date, options = {}) => {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';
  const tz = resolveTimezone(options.timeZone) || _defaultTimezone;
  const dateOptions = { year: 'numeric', month: 'short', day: 'numeric', ...options };
  if (tz) dateOptions.timeZone = tz;
  return d.toLocaleDateString('en-US', dateOptions);
};

export const formatDateTime = (date, options = {}) => {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';
  const tz = resolveTimezone(options.timeZone) || _defaultTimezone;
  const dateOptions = {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
    ...options,
  };
  if (tz) dateOptions.timeZone = tz;
  return d.toLocaleString('en-US', dateOptions);
};

export const formatDateLong = (date, options = {}) => {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';
  const tz = resolveTimezone(options.timeZone) || _defaultTimezone;
  const dateOptions = {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    ...options,
  };
  if (tz) dateOptions.timeZone = tz;
  return d.toLocaleDateString('en-US', dateOptions);
};

export const formatTime = (date, options = {}) => {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';
  const tz = resolveTimezone(options.timeZone) || _defaultTimezone;
  const timeOptions = {
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  };
  if (tz) timeOptions.timeZone = tz;
  return d.toLocaleTimeString('en-US', timeOptions);
};

export const formatNumber = (num) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num?.toLocaleString() || '0';
};

export const truncate = (str, len = 50) => {
  if (!str) return '';
  return str.length > len ? str.slice(0, len) + '...' : str;
};

export const getStars = (rating) => {
  const full = Math.floor(rating || 0);
  const empty = 5 - full;
  return '★'.repeat(full) + '☆'.repeat(empty);
};

export const getInitials = (firstName, lastName) => {
  return `${(firstName || '')[0] || ''}${(lastName || '')[0] || ''}`.toUpperCase();
};

export const slugify = (text) => {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
};

export const TRANSPARENT_PIXEL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

/**
 * Get a fully-qualified image URL.
 *
 * If VITE_CLOUDINARY_CLOUD_NAME is set, images are proxied through Cloudinary's
 * fetch-based CDN pipeline for automatic WebP/AVIF conversion (f_auto), optimal
 * compression (q_auto), and global CDN delivery — zero config, zero uploads needed.
 *
 * Fallback: returns the image URL directly (either absolute or resolved against
 * the backend base URL).
 */
export const getImageUrl = (url) => {
  if (!url) return TRANSPARENT_PIXEL;

  // Normalize Windows-style backslashes to standard forward slashes
  const normalizedUrl = url.replace(/\\/g, '/');

  // If it's already a data URI, return as-is (no optimization possible)
  if (normalizedUrl.startsWith('data:')) return normalizedUrl;

  // Resolve relative URLs against the backend
  let absoluteUrl = normalizedUrl;
  if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
    const apiBase = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
    const backendBase = apiBase.replace('/api/v1', '');
    const cleanUrl = normalizedUrl.startsWith('/') ? normalizedUrl : `/${normalizedUrl}`;
    absoluteUrl = `${backendBase}${cleanUrl}`;
  }

  // If Cloudinary is configured, proxy through fetch-based CDN with auto format + quality
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  if (cloudName) {
    // Cloudinary fetch URL: https://res.cloudinary.com/<CLOUD>/image/fetch/f_auto,q_auto/<URL>
    // f_auto = automatic format (WebP, AVIF, etc. based on browser support)
    // q_auto = automatic quality (balances file size vs visual quality)
    return `https://res.cloudinary.com/${encodeURIComponent(cloudName)}/image/fetch/f_auto,q_auto/${encodeURIComponent(absoluteUrl)}`;
  }

  return absoluteUrl;
};

/**
 * Get the first product image URL from any format the backend returns.
 * Handles Prisma `productimage` relation, legacy `images` array, and direct `imageUrl`/`image` fields.
 */
export const getProductImage = (product) => {
  if (!product) return null;
  // Prisma returns productimage as array of { url, alt, ... }
  if (Array.isArray(product.productimage) && product.productimage.length > 0) {
    return product.productimage[0]?.url || null;
  }
  // Standard images array (can be strings or { url } objects)
  if (Array.isArray(product.images) && product.images.length > 0) {
    const first = product.images[0];
    return typeof first === 'object' ? (first?.url || null) : first;
  }
  // Direct url fields
  return product.imageUrl || product.image || null;
};

/**
 * Get the banner image URL from a banner object.
 * Banners have a single `imageUrl` field (Prisma string, not an array/relation).
 */
export const getBannerImage = (banner) => {
  if (!banner) return null;
  return banner.imageUrl || null;
};

/**
 * Get the banner video URL from a banner object.
 */
export const getBannerVideo = (banner) => {
  if (!banner) return null;
  return banner.videoUrl || null;
};

/**
 * Get the category image URL from a category object.
 * Categories have a single `image` field (Prisma nullable string).
 */
export const getCategoryImage = (category) => {
  if (!category) return null;
  return category.image || null;
};

/**
 * Get the promotion image URL from a promotion object.
 * Promotions have a single `imageUrl` field (Prisma nullable string, same as banners).
 */
export const getPromotionImage = (promotion) => {
  if (!promotion) return null;
  return promotion.imageUrl || null;
};

/**
 * Get all product image URLs from any format the backend returns.
 * Returns an array of URL strings (empty array if none found).
 */
export const getProductImages = (product) => {
  if (!product) return [];
  // Prisma productimage relation
  if (Array.isArray(product.productimage) && product.productimage.length > 0) {
    return product.productimage.map(img => img?.url).filter(Boolean);
  }
  // Standard images array
  if (Array.isArray(product.images) && product.images.length > 0) {
    return product.images.map(img => typeof img === 'object' ? img?.url : img).filter(Boolean);
  }
  // Direct url fields
  if (product.imageUrl) return [product.imageUrl];
  if (product.image) return [product.image];
  return [];
};
