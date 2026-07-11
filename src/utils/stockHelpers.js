/**
 * Computes stock availability status for a product.
 *
 * Matches the product detail page's logic:
 * - Variant product: out of stock ONLY when EVERY variant has quantity <= 0
 * - Simple product: out of stock when product.quantity <= 0
 * - Low stock when total stock is 1-threshold (for both variant and simple products)
 *
 * @param {Object} product - The product object from API response
 * @param {Array}  [product.variants] - Variants array (camelCase, from Eloquent API)
 * @param {Array}  [product.productvariant] - Variants array (snake_case, legacy)
 * @param {number} [product.quantity] - Parent product quantity (used for simple products)
 * @param {number} [threshold=5] - Low stock threshold
 * @returns {{ effectiveStockQty: number, isOutOfStock: boolean, isLowStock: boolean, hasStockIssue: boolean }}
 */
export function computeStockStatus(product, threshold = 5) {
  if (!product) {
    return { effectiveStockQty: 0, isOutOfStock: true, isLowStock: false, hasStockIssue: true };
  }

  const variants = product.variants || product.productvariant;
  const hasVariants = Array.isArray(variants) && variants.length > 0;

  // ── Determine if out of stock (matches detail page logic) ──
  const isOutOfStock = hasVariants
    ? variants.every(v => (v.quantity || 0) <= 0)
    : (product.quantity ?? 0) <= 0;

  // ── Total effective stock (for low stock check & display) ──
  const effectiveStockQty = hasVariants
    ? variants.reduce((sum, v) => sum + (v.quantity || 0), 0)
    : (product.quantity ?? 0);

  // ── Low stock: not out of stock, but total stock is 1-threshold ──
  const isLowStock = !isOutOfStock && effectiveStockQty > 0 && effectiveStockQty <= threshold;
  const hasStockIssue = isOutOfStock || isLowStock;

  return { effectiveStockQty, isOutOfStock, isLowStock, hasStockIssue };
}
