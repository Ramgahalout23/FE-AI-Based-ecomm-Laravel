/**
 * Computes stock availability status for a product.
 *
 * For variant products (products with `productvariant` array), sums stock
 * across all variants. For simple products, uses `product.quantity` directly.
 *
 * @param {Object} product - The product object from API response
 * @param {Array}  [product.productvariant] - Variants array with { quantity, attributes }
 * @param {number} [product.quantity] - Parent product quantity (used for simple products)
 * @param {number} [threshold=5] - Low stock threshold
 * @returns {{ effectiveStockQty: number, isOutOfStock: boolean, isLowStock: boolean, hasStockIssue: boolean }}
 */
export function computeStockStatus(product, threshold = 5) {
  if (!product) {
    return { effectiveStockQty: 0, isOutOfStock: true, isLowStock: false, hasStockIssue: true };
  }

  const variants = product.productvariant;
  const hasVariants = Array.isArray(variants) && variants.length > 0;

  const effectiveStockQty = hasVariants
    ? variants.reduce((sum, v) => sum + (v.quantity || 0), 0)
    : (product.quantity ?? 0);

  const hasStockIssue = effectiveStockQty <= threshold;
  const isOutOfStock = hasStockIssue && effectiveStockQty <= 0;
  const isLowStock = hasStockIssue && effectiveStockQty > 0 && effectiveStockQty <= threshold;

  return { effectiveStockQty, isOutOfStock, isLowStock, hasStockIssue };
}
