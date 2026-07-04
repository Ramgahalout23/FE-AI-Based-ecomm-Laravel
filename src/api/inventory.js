import client from './client';
import { adminClient } from './client';

export const inventoryAPI = {
  getForProduct: (productId) => client.get(`/inventory/${productId}`),
  checkStock: (productId, quantity) => client.get(`/inventory/${productId}/check`, { params: { quantity } }),
  // Admin
  getAll: (params) => adminClient.get('/admin/inventory', { params }),
  getStats: () => adminClient.get('/admin/inventory/stats'),
  getLowStock: () => adminClient.get('/admin/inventory/low-stock'),
  addStock: (data) => adminClient.post('/admin/inventory/add', data),
  reduceStock: (data) => adminClient.post('/admin/inventory/reduce', data),
  getMovement: (productId) => adminClient.get(`/admin/inventory/${productId}/movement`),
  batchUpdate: (data) => adminClient.post('/admin/inventory/batch-update', data),
  // CSV Export
  exportInventory: (params) => adminClient.get('/admin/inventory/export', { params, responseType: 'blob' }),
  // PDF Barcode Labels
  getBarcodeLabels: () => adminClient.get('/admin/inventory/barcode-labels', { responseType: 'blob' }),
  // Single variant barcode label download
  getVariantBarcodeLabel: (variantId) => adminClient.get(`/admin/variants/${variantId}/barcode-label`, { responseType: 'blob' }),
  // Print via blob (downloads with auth first, then opens in new tab via blob URL)
  printVariantBarcodeLabel: async (variantId) => {
    const res = await adminClient.get(`/admin/variants/${variantId}/barcode-label?print=1`, { responseType: 'blob' });
    const blobUrl = URL.createObjectURL(res.data);
    window.open(blobUrl, '_blank');
  },
  printBarcodeLabels: async () => {
    const res = await adminClient.get('/admin/inventory/barcode-labels?print=1', { responseType: 'blob' });
    const blobUrl = URL.createObjectURL(res.data);
    window.open(blobUrl, '_blank');
  },
  // Batch variant barcode labels — dispatches a background job
  dispatchBatchBarcodeLabels: (variantIds) => adminClient.post('/admin/variants/batch-barcode-labels', { variant_ids: variantIds }),
  // Poll batch barcode generation status
  getBarcodeBatchStatus: (batchId) => adminClient.get(`/admin/barcode-batches/${batchId}/status`),
  // Download completed batch barcode PDF
  downloadBarcodeBatch: (batchId) => adminClient.get(`/admin/barcode-batches/${batchId}/download`, { responseType: 'blob' }),
  // Barcode scanner: look up variant/product by SKU
  lookupVariantBySku: (sku) => adminClient.get(`/admin/variants/lookup-sku/${encodeURIComponent(sku)}`),
  // Variant-level stock management (Advanced Inventory)
  adjustVariantStock: (variantId, data) => adminClient.post(`/admin/variants/${variantId}/adjust-stock`, data),
  variantStockMovements: (variantId) => adminClient.get(`/admin/variants/${variantId}/stock-movements`),
  bulkAdjustVariantStock: (data) => adminClient.post('/admin/variants/bulk-adjust-stock', data),
};
