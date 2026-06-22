/**
 * Convert common camelCase payload fields to snake_case.
 * Backend (Laravel) expects snake_case request bodies.
 *
 * Usage:
 *   import { toSnakePayload } from '../../utils/apiUtils';
 *   client.post('/endpoint', toSnakePayload(data));
 *
 * @param {object|undefined|null} data - The camelCase payload
 * @param {object} [extraMappings] - Additional field mappings specific to a module
 * @returns {object} The snake_case payload
 */
export function toSnakePayload(data, extraMappings = {}) {
  if (!data || typeof data !== 'object') return data;

  const defaultMappings = {
    productId: 'product_id',
    variantId: 'variant_id',
    userId: 'user_id',
    isActive: 'is_active',
    imageUrl: 'image_url',
    displayOrder: 'display_order',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  };

  // Merge default with extra mappings (extra overrides default)
  const mappings = { ...defaultMappings, ...extraMappings };

  const mapped = {};
  for (const [key, value] of Object.entries(data)) {
    if (mappings[key] !== undefined) {
      mapped[mappings[key]] = value;
    } else {
      mapped[key] = value;
    }
  }
  return mapped;
}
