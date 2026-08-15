/**
 * SEO title helpers — one consistent title convention across the storefront.
 *
 * buildSeoTitle — product / category / section titles with a fallback chain:
 *   1. metaTitle  (backend-provided SEO title) wins when present
 *   2. name — seoTitle  (item-specific SEO fragment, e.g. product SEO title)
 *   3. name — storeName (final fallback)
 * Missing segments are skipped, so a dangling separator never renders.
 *
 *   buildSeoTitle({ metaTitle, name: 'Urban Oversized Tee — Black', storeName: 'THREVOLT' })
 *   // -> 'Urban Oversized Tee — Black — THREVOLT'
 *
 * withStoreName — append the store name to a static page title.
 *   withStoreName('My Orders', 'THREVOLT') -> 'My Orders | THREVOLT'
 */
export const buildSeoTitle = ({ metaTitle, name = '', seoTitle, storeName, separator = ' — ' }) => {
  if (metaTitle) return metaTitle;
  const tail = seoTitle || storeName;
  return tail ? `${name}${separator}${tail}` : name;
};

export const withStoreName = (title, storeName) =>
  storeName ? `${title} | ${storeName}` : title;
