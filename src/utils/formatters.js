export const formatCurrency = (amount) => {
  const num = Number(amount);
  if (isNaN(num)) return 'Rs. 0.00';
  return `Rs. ${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const formatDate = (date, options = {}) => {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', ...options });
};

export const formatDateTime = (date) => {
  const d = new Date(date);
  return d.toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
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

export const getImageUrl = (url) => {
  if (!url) return TRANSPARENT_PIXEL;
  // Normalize Windows-style backslashes to standard forward slashes
  const normalizedUrl = url.replace(/\\/g, '/');
  if (normalizedUrl.startsWith('http://') || normalizedUrl.startsWith('https://') || normalizedUrl.startsWith('data:')) {
    return normalizedUrl;
  }
  const apiBase = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
  const backendBase = apiBase.replace('/api/v1', '');
  const cleanUrl = normalizedUrl.startsWith('/') ? normalizedUrl : `/${normalizedUrl}`;
  return `${backendBase}${cleanUrl}`;
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
