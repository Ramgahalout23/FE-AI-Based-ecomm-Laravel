import { useState, useEffect, useCallback, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { inventoryAPI } from '../../api/inventory';
import { formatDateTime } from '../../utils/formatters';
import { downloadBlob } from '../../utils/download';
import { PageSkeleton } from '../../components/admin/pageSkeletonConfig';
import BarcodeScannerModal from '../../components/admin/BarcodeScannerModal';
import Pagination from '../../components/admin/Pagination';
import toast from '../../utils/toast';

const STOCK_REASONS = [
  { value: 'restock', label: '📦 Restock from Supplier' },
  { value: 'return', label: '🔄 Customer Return' },
  { value: 'damage', label: '⚠️ Damaged / Defective' },
  { value: 'correction', label: '✏️ Inventory Correction' },
  { value: 'adjustment', label: '📊 Manual Adjustment' },
  { value: 'transfer', label: '🚚 Warehouse Transfer' },
  { value: 'sample', label: '🎁 Sample / Marketing' },
  { value: 'other', label: '📝 Other' },
];

function StockAdjustModal({ isOpen, onClose, variant, onSuccess, defaultType = 'add' }) {
  const [type, setType] = useState('add');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('restock');
  const [customReason, setCustomReason] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      setType(defaultType);
      setQuantity('');
      setReason('restock');
      setCustomReason('');
      setNotes('');
    }
  }, [isOpen, defaultType]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const qty = parseInt(quantity, 10);
    if (!qty || qty <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }
    if (type === 'reduce' && qty > (variant?.quantity || 0)) {
      toast.error(`Cannot reduce below 0. Current stock: ${variant?.quantity || 0}`);
      return;
    }

    setSaving(true);
    try {
      const finalReason = reason === 'other' ? customReason.trim() || 'other' : reason;
      await inventoryAPI.adjustVariantStock(variant.id, {
        type,
        quantity: qty,
        reason: finalReason,
        notes: notes.trim() || null,
      });
      toast.success(`Stock ${type === 'add' ? 'added' : type === 'reduce' ? 'reduced' : 'set'} successfully`);
      onSuccess();
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to adjust stock';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !variant) return null;

  return (
    <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <h3>📦 Adjust Stock — {variant.name || variant.sku || 'Variant'}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Current stock info */}
            <div style={{
              background: 'linear-gradient(135deg, #f8f9fc, #eef1f6)',
              borderRadius: 10,
              padding: '0.75rem 1rem',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              border: '1px solid #e2e5ec',
            }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Stock</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: variant.quantity < 5 ? '#ef4444' : '#1a1a1a' }}>
                  {variant.quantity ?? 0}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>SKU</div>
                <div style={{ fontSize: '0.82rem', fontFamily: 'monospace', fontWeight: 600 }}>{variant.sku || '—'}</div>
              </div>
            </div>

            {/* Type selector */}
            <div className="form-group">
              <label>Action Type</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {[
                  { value: 'add', label: '+ Add Stock', color: '#22c55e', bg: '#f0fdf4' },
                  { value: 'reduce', label: '− Reduce Stock', color: '#ef4444', bg: '#fef2f2' },
                  { value: 'set', label: '= Set Exact', color: '#3b82f6', bg: '#eff6ff' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setType(opt.value)}
                    style={{
                      flex: 1,
                      padding: '0.6rem 0.5rem',
                      borderRadius: 8,
                      border: `2px solid ${type === opt.value ? opt.color : '#e5e7eb'}`,
                      background: type === opt.value ? opt.bg : '#fff',
                      color: type === opt.value ? opt.color : '#6b7280',
                      fontWeight: 600,
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      textAlign: 'center',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity */}
            <div className="form-group">
              <label>{type === 'add' ? 'Quantity to Add' : type === 'reduce' ? 'Quantity to Reduce' : 'New Stock Level'}</label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                placeholder="Enter quantity..."
                autoFocus
                style={{
                  width: '100%',
                  padding: '0.6rem 0.75rem',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  fontSize: '1rem',
                  fontWeight: 600,
                  outline: 'none',
                }}
              />
            </div>

            {/* Reason */}
            <div className="form-group">
              <label>Reason</label>
              <select
                value={reason}
                onChange={e => setReason(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.75rem',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  fontSize: '0.85rem',
                  outline: 'none',
                  background: '#fff',
                }}
              >
                {STOCK_REASONS.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              {reason === 'other' && (
                <input
                  type="text"
                  value={customReason}
                  onChange={e => setCustomReason(e.target.value)}
                  placeholder="Describe the reason..."
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    fontSize: '0.82rem',
                    outline: 'none',
                    marginTop: '0.4rem',
                  }}
                />
              )}
            </div>

            {/* Notes */}
            <div className="form-group">
              <label>Notes (Optional)</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Additional notes about this adjustment..."
                rows={2}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  fontSize: '0.82rem',
                  outline: 'none',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                }}
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-ghost btn-sm" onClick={onClose}>Cancel</button>
            <button
              type="submit"
              disabled={saving || !quantity || parseInt(quantity) <= 0}
              className="btn-dark btn-sm"
              style={{
                background: type === 'add' ? '#22c55e' : type === 'reduce' ? '#ef4444' : '#3b82f6',
                color: '#fff',
                border: 'none',
                opacity: saving || !quantity || parseInt(quantity) <= 0 ? 0.6 : 1,
                cursor: saving || !quantity || parseInt(quantity) <= 0 ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? (
                <><span className="spinner" style={{ width: 12, height: 12, marginRight: 6 }} /> Processing...</>
              ) : (
                type === 'add' ? '+ Add Stock' : type === 'reduce' ? '− Reduce Stock' : '= Set Stock'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MovementHistoryModal({ isOpen, onClose, variant }) {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && variant?.id) {
      setLoading(true);
      inventoryAPI.variantStockMovements(variant.id)
        .then(res => {
          const data = res.data?.data || {};
          setMovements(data.movements || []);
        })
        .catch(() => setMovements([]))
        .finally(() => setLoading(false));
    }
  }, [isOpen, variant?.id]);

  // ESC key handling
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getTypeStyle = (type) => {
    switch (type?.toUpperCase()) {
      case 'ADD': return { color: '#22c55e', bg: '#f0fdf4', label: '+ Added' };
      case 'REDUCE': return { color: '#ef4444', bg: '#fef2f2', label: '− Reduced' };
      case 'SET': return { color: '#3b82f6', bg: '#eff6ff', label: '= Set' };
      default: return { color: '#6b7280', bg: '#f9fafb', label: type || '—' };
    }
  };

  const getReasonLabel = (reason) => {
    const found = STOCK_REASONS.find(r => r.value === reason);
    return found ? found.label : reason || '—';
  };

  return (
    <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 600 }}>
        <div className="modal-header">
          <h3>📋 Stock Movement History</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" style={{ maxHeight: 500, overflow: 'auto' }}>
          {variant && (
            <div style={{
              background: '#f8f9fc',
              borderRadius: 8,
              padding: '0.6rem 0.9rem',
              marginBottom: '1rem',
              display: 'flex',
              gap: '1.5rem',
              alignItems: 'center',
              border: '1px solid #e2e5ec',
            }}>
              <div><strong style={{ fontSize: '0.85rem' }}>{variant.name}</strong></div>
              <div style={{ fontSize: '0.72rem', color: '#6b7280', fontFamily: 'monospace' }}>SKU: {variant.sku}</div>
              <div style={{ marginLeft: 'auto', fontSize: '0.85rem' }}>
                Current: <strong style={{ color: (variant.quantity || 0) < 5 ? '#ef4444' : '#1a1a1a' }}>{variant.quantity ?? 0}</strong>
              </div>
            </div>
          )}

          {loading ? (
            <div className="loading-page" style={{ padding: '2rem' }}><div className="spinner" /></div>
          ) : movements.length === 0 ? (
            <div className="empty-state" style={{ padding: '2rem' }}>
              <div className="empty-state-icon">📋</div>
              <h3>No movement history</h3>
              <p style={{ fontSize: '0.82rem', color: '#6b7280' }}>Stock adjustments will appear here.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {movements.map((m, i) => {
                const ts = getTypeStyle(m.type);
                return (
                  <div key={m.id || i} style={{
                    display: 'flex',
                    gap: '0.75rem',
                    padding: '0.65rem 0.75rem',
                    background: ts.bg,
                    borderRadius: 8,
                    border: `1px solid ${ts.color}20`,
                    alignItems: 'flex-start',
                  }}>
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      background: ts.bg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      color: ts.color,
                      border: `1px solid ${ts.color}30`,
                      flexShrink: 0,
                    }}>
                      {m.type === 'ADD' ? '+' : m.type === 'REDUCE' ? '−' : '='}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.85rem', color: ts.color }}>{ts.label}</span>
                        <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{m.quantity} units</span>
                        <span style={{ fontSize: '0.72rem', color: '#6b7280' }}>
                          Before: {m.stock_before} → After: {m.stock_after}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.2rem' }}>
                        {getReasonLabel(m.reason)}
                        {m.notes && <span style={{ color: '#9ca3af' }}> — {m.notes}</span>}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#9ca3af', marginTop: '0.15rem' }}>
                        {formatDateTime(m.created_at)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn-ghost btn-sm" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

function BulkAdjustModal({ isOpen, onClose, variants, onSuccess }) {
  const [adjustments, setAdjustments] = useState([]);
  const [reason, setReason] = useState('restock');
  const [customReason, setCustomReason] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && variants?.length) {
      setAdjustments(variants.map(v => ({
        variant_id: v.id,
        sku: v.sku,
        name: v.name,
        current_stock: v.quantity || 0,
        type: 'add',
        quantity: '',
      })));
      setReason('restock');
      setCustomReason('');
    }
  }, [isOpen, variants]);

  const updateAdj = (index, field, value) => {
    setAdjustments(prev => prev.map((a, i) => i === index ? { ...a, [field]: value } : a));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validAdjustments = adjustments.filter(a => {
      const qty = parseInt(a.quantity, 10);
      return qty && qty > 0;
    });

    if (validAdjustments.length === 0) {
      toast.error('No valid adjustments to make');
      return;
    }

    setSaving(true);
    try {
      const finalReason = reason === 'other' ? customReason.trim() || 'other' : reason;
      await inventoryAPI.bulkAdjustVariantStock({
        adjustments: validAdjustments.map(a => ({
          variant_id: a.variant_id,
          type: a.type,
          quantity: parseInt(a.quantity),
          reason: finalReason,
        })),
      });
      toast.success(`Bulk update applied to ${validAdjustments.length} variant(s)`);
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Bulk update failed');
    } finally {
      setSaving(false);
    }
  };

  // ESC key handling
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 640 }}>
        <div className="modal-header">
          <h3>📦 Bulk Stock Adjustment</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ maxHeight: 400, overflow: 'auto' }}>
            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>Reason for All</label>
              <select
                value={reason}
                onChange={e => setReason(e.target.value)}
                style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '0.82rem', outline: 'none' }}
              >
                {STOCK_REASONS.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              {reason === 'other' && (
                <input
                  type="text"
                  value={customReason}
                  onChange={e => setCustomReason(e.target.value)}
                  placeholder="Describe the reason..."
                  style={{ width: '100%', padding: '0.45rem 0.7rem', borderRadius: 6, border: '1px solid var(--border)', fontSize: '0.8rem', marginTop: '0.3rem', outline: 'none' }}
                />
              )}
            </div>

            <table className="admin-table" style={{ fontSize: '0.78rem' }}>
              <thead>
                <tr>
                  <th>Variant</th>
                  <th>SKU</th>
                  <th>Current</th>
                  <th>Action</th>
                  <th>Qty</th>
                </tr>
              </thead>
              <tbody>
                {adjustments.map((adj, i) => (
                  <tr key={adj.variant_id}>
                    <td style={{ fontWeight: 500 }}>{adj.name || '—'}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.72rem' }}>{adj.sku || '—'}</td>
                    <td><strong style={{ color: adj.current_stock < 5 ? '#ef4444' : '#1a1a1a' }}>{adj.current_stock}</strong></td>
                    <td>
                      <select
                        value={adj.type}
                        onChange={e => updateAdj(i, 'type', e.target.value)}
                        style={{ padding: '0.25rem 0.4rem', borderRadius: 4, border: '1px solid var(--border)', fontSize: '0.72rem', outline: 'none' }}
                      >
                        <option value="add">+ Add</option>
                        <option value="reduce">− Reduce</option>
                        <option value="set">= Set</option>
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        min="1"
                        value={adj.quantity}
                        onChange={e => updateAdj(i, 'quantity', e.target.value)}
                        placeholder="Qty"
                        style={{ width: 70, padding: '0.25rem 0.4rem', borderRadius: 4, border: '1px solid var(--border)', fontSize: '0.72rem', outline: 'none' }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-ghost btn-sm" onClick={onClose}>Cancel</button>
            <button
              type="submit"
              disabled={saving}
              className="btn-dark btn-sm"
            >
              {saving ? 'Processing...' : `Apply to ${adjustments.filter(a => a.quantity && parseInt(a.quantity) > 0).length} variants`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function InventoryAdminPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [expandedProductId, setExpandedProductId] = useState(null);

  // Batch barcode selection
  const [selectedVariantIds, setSelectedVariantIds] = useState(new Set());
  const [batchBarcoding, setBatchBarcoding] = useState(false);
  const [barcodeProgress, setBarcodeProgress] = useState({ attempts: 0, maxAttempts: 30 });

  // Modals
  const [stockModal, setStockModal] = useState({ open: false, variant: null });
  const [historyModal, setHistoryModal] = useState({ open: false, variant: null });
  const [bulkModal, setBulkModal] = useState({ open: false, variants: [] });
  const [barcodeModal, setBarcodeModal] = useState(false);

  // PDF Barcode Labels handler
  const [printing, setPrinting] = useState(false);

  const handlePrintLabels = async () => {
    setPrinting(true);
    try {
      const response = await inventoryAPI.getBarcodeLabels();

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers?.['content-disposition'];
      let filename = `barcode-labels-${new Date().toISOString().split('T')[0]}.pdf`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match) filename = match[1];
      }

      const blob = response.data;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Downloaded ${filename}`);
    } catch (err) {
      toast.error('Failed to generate barcode labels');
      console.warn('Barcode labels failed:', err);
    } finally {
      setPrinting(false);
    }
  };

  // CSV Export handler
  const handleExport = async () => {
    setExporting(true);
    try {
      const params = { search: debouncedSearch || undefined };
      if (filter !== 'ALL') params.stockStatus = filter;

      const response = await inventoryAPI.exportInventory(params);

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers?.['content-disposition'];
      let filename = `inventory-export-${new Date().toISOString().split('T')[0]}.csv`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match) filename = match[1];
      }

      // Create blob download (response.data is already a Blob with responseType: 'blob')
      const blob = response.data;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Exported to ${filename}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to export inventory');
      console.warn('Export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(handler);
  }, [search]);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const pageSizeOptions = [10, 25, 50, 100];

  const loadData = async () => {
    setLoading(true);
    try {
      const params = { page: currentPage, per_page: pageSize, search: debouncedSearch || undefined };
      if (filter !== 'ALL') params.stockStatus = filter;

      const r = await inventoryAPI.getAll(params);
      const data = r.data?.data || r.data;
      const inv = data?.inventory || data?.items || data || [];
      setItems(Array.isArray(inv) ? inv : []);
      const pag = r.data?.pagination || data?.pagination || {};
      setCurrentPage(pag.page || currentPage);
      setTotalPages(pag.pages || pag.totalPages || Math.ceil((pag.total || inv.length) / pageSize) || 1);
      setTotalItems(pag.total || inv.length);
    } catch (e) {
      setError('Failed to load inventory');
      console.warn('Failed to load inventory:', e);
    }
    try {
      const r = await inventoryAPI.getStats();
      const s = r.data?.data || r.data;
      if (s) setStats(s);
    } catch (e) {
      console.warn('Failed to load inventory stats:', e);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (currentPage !== 1) { setCurrentPage(1); }
    else { loadData(); }
  }, [debouncedSearch, filter, pageSize]);

  useEffect(() => { loadData(); }, [currentPage]);

  const toggleVariantSelection = (variantId) => {
    setSelectedVariantIds(prev => {
      const next = new Set(prev);
      if (next.has(variantId)) next.delete(variantId);
      else next.add(variantId);
      return next;
    });
  };

  const toggleAllVariants = () => {
    const allVariantIds = new Set();
    items.forEach(item => {
      (item.variants || []).forEach(v => allVariantIds.add(v.id));
    });
    setSelectedVariantIds(prev => prev.size === allVariantIds.size ? new Set() : allVariantIds);
  };

  const handleBatchBarcodeDownload = async () => {
    if (selectedVariantIds.size === 0) {
      toast.error('Select at least one variant');
      return;
    }
    setBatchBarcoding(true);
    try {
      // 1. Dispatch background job
      const dispatchRes = await inventoryAPI.dispatchBatchBarcodeLabels([...selectedVariantIds]);
      const { batch_id, variant_count } = dispatchRes.data?.data || {};
      if (!batch_id) {
        toast.error('Failed to start barcode generation');
        setBatchBarcoding(false);
        return;
      }

      toast('⏳ Generating barcodes in background...');

      // 2. Poll for completion (max 60 seconds)
      let attempts = 0;
      const maxAttempts = 30;
      let ready = false;
      setBarcodeProgress({ attempts: 0, maxAttempts });

      while (attempts < maxAttempts) {
        await new Promise(r => setTimeout(r, 2000));
        attempts++;
        setBarcodeProgress({ attempts, maxAttempts });

        try {
          const statusRes = await inventoryAPI.getBarcodeBatchStatus(batch_id);
          const status = statusRes.data?.data?.status;

          if (status === 'ready') {
            ready = true;
            break;
          }
          if (status === 'failed') {
            toast.error('Barcode generation failed');
            setBatchBarcoding(false);
            setBarcodeProgress({ attempts: 0, maxAttempts });
            return;
          }
        } catch {
          // Continue polling on transient errors
        }
      }

      if (!ready) {
        toast.error('Barcode generation timed out. Check the queue worker is running.');
        setBatchBarcoding(false);
        setBarcodeProgress({ attempts: 0, maxAttempts: 30 });
        return;
      }

      // 3. Download the completed PDF
      const downloadRes = await inventoryAPI.downloadBarcodeBatch(batch_id);
      downloadBlob(downloadRes, `barcode-variants-${variant_count}-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success(`Downloaded barcodes for ${variant_count} variant(s)`);
      setSelectedVariantIds(new Set());
    } catch (err) {
      toast.error('Failed to download batch barcodes');
    } finally {
      setBatchBarcoding(false);
      setBarcodeProgress({ attempts: 0, maxAttempts: 30 });
    }
  };

  const handleAdjustSuccess = () => { loadData(); };

  const openStockModal = (variant, defaultType = 'add') => {
    setStockModal({ open: true, variant, defaultType });
  };

  const handleBarcodeVariantFound = (variant) => {
    // Open the stock adjustment modal with the scanned variant
    openStockModal(variant, 'add');
  };

  const openHistoryModal = (variant) => {
    setHistoryModal({ open: true, variant });
  };

  const openBulkModal = () => {
    // Collect all variants from expanded items
    const allVariants = [];
    items.forEach(item => {
      if (item.variants && item.variants.length > 0) {
        item.variants.forEach(v => {
          allVariants.push({
            id: v.id,
            name: v.name || `${item.productName || ''} - ${v.attributes?.color || ''} ${v.attributes?.size || ''}`.trim(),
            sku: v.sku,
            quantity: v.quantity || 0,
          });
        });
      }
    });
    setBulkModal({ open: true, variants: allVariants });
  };

  const getStockStatusInfo = (qty) => {
    if (qty === 0) return { label: 'Out of Stock', className: 'status-cancelled', color: '#ef4444' };
    if (qty < 5) return { label: 'Low Stock', className: 'status-pending', color: '#f59e0b' };
    return { label: 'In Stock', className: 'status-active', color: '#22c55e' };
  };

  return (
    <div>
      {/* Header */}
      <div className="admin-header admin-header-row" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h2>📦 Advanced Inventory</h2>
          <p>Manage stock levels, adjustments, and movement history for all variants</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            className="btn-dark btn-sm"
            onClick={() => navigate('/admin/variants')}
            style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--charcoal)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            🎨 Manage Variants
          </button>
          <button
            className="btn-dark btn-sm"
            onClick={openBulkModal}
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            📊 Bulk Adjust
          </button>
          <button
            className="btn-dark btn-sm"
            onClick={() => setBarcodeModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              background: '#8b5cf6',
              border: 'none',
              color: '#fff',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#7c3aed'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#8b5cf6'; }}
          >
            📷 Scan Barcode
          </button>
          <button
            className="btn-dark btn-sm"
            onClick={handleExport}
            disabled={exporting}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              opacity: exporting ? 0.6 : 1,
              cursor: exporting ? 'not-allowed' : 'pointer',
            }}
          >
            {exporting ? (
              <><span className="spinner" style={{ width: 12, height: 12 }} /> Exporting...</>
            ) : (
              <><span>📥</span> Export CSV</>
            )}
          </button>
          <button
            className="btn-dark btn-sm"
            onClick={handlePrintLabels}
            disabled={printing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              background: '#1a1a2e',
              border: 'none',
              color: '#fff',
              opacity: printing ? 0.6 : 1,
              cursor: printing ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={e => { if (!printing) e.currentTarget.style.background = '#000'; }}
            onMouseLeave={e => { if (!printing) e.currentTarget.style.background = '#1a1a2e'; }}
          >
            {printing ? (
              <><span className="spinner" style={{ width: 12, height: 12 }} /> Generating...</>
            ) : (
              <><span>🏷️</span> Download PDF</>
            )}
          </button>
          <button
            className="btn-dark btn-sm"
            onClick={async () => {
              try {
                await inventoryAPI.printBarcodeLabels();
              } catch { toast.error('Failed to open for printing'); }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              background: '#2563eb',
              border: 'none',
              color: '#fff',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#1d4ed8'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#2563eb'; }}
          >
            🖨️ Print Labels
          </button>
        </div>
      </div>

      {error && (
        <div className="admin-alert danger mb-4">
          <span className="admin-alert-icon">⚠️</span>
          <div className="admin-alert-body">
            <div className="admin-alert-title">Error Loading Data</div>
            <div>{error}</div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-icon orders">📦</div>
          <div className="stat-label">Total Products</div>
          <div className="stat-val">{stats?.total_products ?? items.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon revenue">💰</div>
          <div className="stat-label">Total Available</div>
          <div className="stat-val">{stats?.total_available ?? 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon alerts" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
            ⚠️
          </div>
          <div className="stat-label">Low Stock</div>
          <div className="stat-val" style={{ color: '#f59e0b' }}>
            {stats?.low_stock ?? items.filter(i => (i.effective_stock ?? i.quantity ?? i.stock ?? 0) < 5 && (i.effective_stock ?? i.quantity ?? i.stock ?? 0) > 0).length}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon alerts">🚫</div>
          <div className="stat-label">Out of Stock</div>
          <div className="stat-val" style={{ color: 'var(--danger)' }}>
            {stats?.out_of_stock ?? items.filter(i => (i.effective_stock ?? i.quantity ?? i.stock ?? 0) === 0).length}
          </div>
        </div>
        {stats?.variant_managed !== undefined && (
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(139,92,246,0.12)', color: '#8b5cf6' }}>🎨</div>
            <div className="stat-label">Variant-Managed</div>
            <div className="stat-val" style={{ color: '#8b5cf6' }}>{stats.variant_managed}</div>
          </div>
        )}
      </div>

      {/* Alerts — use effective_stock */}
      {(() => {
        const effQty = (i) => i.effective_stock ?? i.quantity ?? i.stock ?? 0;
        const outOfStock = items.filter(i => effQty(i) === 0);
        const lowStock = items.filter(i => effQty(i) > 0 && effQty(i) < 5);
        return (
          <>
            {outOfStock.length > 0 && (
              <div className="admin-alert danger">
                <span className="admin-alert-icon">🚫</span>
                <div className="admin-alert-body">
                  <div className="admin-alert-title">Out of Stock Alert</div>
                  <div>{outOfStock.length} product{outOfStock.length !== 1 ? 's' : ''} {outOfStock.length === 1 ? 'is' : 'are'} completely out of stock.</div>
                </div>
              </div>
            )}
            {lowStock.length > 0 && (
              <div className="admin-alert warning">
                <span className="admin-alert-icon">⚠️</span>
                <div className="admin-alert-body">
                  <div className="admin-alert-title">Low Stock Warning</div>
                  <div>{lowStock.length} product{lowStock.length !== 1 ? 's' : ''} ha{lowStock.length === 1 ? 's' : 've'} stock below threshold.</div>
                </div>
              </div>
            )}
          </>
        );
      })()}

      {/* Main Table */}
      {loading ? <PageSkeleton page="inventory" /> : (
      <div className="table-card">
        <div className="table-toolbar">
          <input
            className="table-search"
            placeholder="Search by product or SKU..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoComplete="off"
          />
          <select className="table-filter" value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="ALL">All Items</option>
            <option value="OK">In Stock</option>
            <option value="LOW">Low Stock</option>
            <option value="OUT">Out of Stock</option>
          </select>
          <span className="table-count">{totalItems} products</span>
        </div>

        <table className="admin-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th style={{ textAlign: 'center' }}>Stock</th>
              <th style={{ textAlign: 'center' }}>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={5}><div className="empty-state"><div className="empty-state-icon">📦</div><h3>No items found</h3></div></td></tr>
            ) : items.map(item => {
              // Use effective_stock (variant sum or product.quantity) — not inventory.available_quantity which may be stale
              const qty = item.effective_stock ?? item.quantity ?? item.stock ?? 0;
              const itemId = item.id || item.productId;
              const isExpanded = expandedProductId === itemId;
              const variants = item.variants || [];

              return (
                <Fragment key={itemId}>
                  {/* Product row */}
                  <tr>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {/* Expand variants toggle */}
                        {variants.length > 0 && (
                          <button
                            onClick={() => setExpandedProductId(isExpanded ? null : itemId)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              fontSize: '0.7rem',
                              color: 'var(--muted)',
                              padding: '2px',
                              transition: 'transform 0.15s ease',
                              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                            }}
                            title={isExpanded ? 'Collapse variants' : 'Expand variants'}
                          >▶</button>
                        )}
                        <strong>{item.productName || item.name || '—'}</strong>
                        {variants.length > 0 && (
                          <span style={{
                            background: 'rgba(139,92,246,0.1)',
                            color: '#8b5cf6',
                            fontSize: '0.65rem',
                            padding: '1px 6px',
                            borderRadius: 4,
                            whiteSpace: 'nowrap',
                            fontWeight: 500,
                          }}>
                            🎨 {variants.length} variants
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{item.sku || '—'}</td>
                    <td style={{ textAlign: 'center' }}>
                      <strong style={{ color: qty < 5 ? 'var(--danger)' : 'var(--charcoal)' }}>{qty}</strong>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`status-badge ${getStockStatusInfo(qty).className}`}>
                        {getStockStatusInfo(qty).label}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="row-actions" style={{ justifyContent: 'flex-end' }}>
                        <button
                          className="btn-edit"
                          onClick={() => navigate('/admin/variants')}
                          style={{ fontSize: '0.68rem' }}
                        >
                          Manage
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Expanded variants */}
                  {isExpanded && variants.length > 0 && (
                    <tr key={`${itemId}-variants`}>
                      <td colSpan={5} style={{ padding: 0, borderBottom: 'none' }}>
                        <div style={{
                          background: '#f9f9fb',
                          borderBottom: '1px solid var(--border)',
                          overflowX: 'auto',
                        }}>
                          <table style={{ width: '100%', fontSize: '0.78rem', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr style={{ color: 'var(--muted)', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                <th style={{ textAlign: 'center', padding: '0.5rem 0.5rem 0.5rem 2.5rem', width: 32 }}>
                                  <input
                                    type="checkbox"
                                    checked={selectedVariantIds.size > 0 && items.every(item => (item.variants || []).every(v => selectedVariantIds.has(v.id)))}
                                    onChange={toggleAllVariants}
                                    title="Select all variants"
                                    style={{ cursor: 'pointer' }}
                                  />
                                </th>
                                <th style={{ textAlign: 'left', padding: '0.5rem 0.5rem' }}>Variant</th>
                                <th style={{ textAlign: 'left', padding: '0.5rem 0.5rem' }}>SKU</th>
                                <th style={{ textAlign: 'left', padding: '0.5rem 0.5rem' }}>Size</th>
                                <th style={{ textAlign: 'left', padding: '0.5rem 0.5rem' }}>Color</th>
                                <th style={{ textAlign: 'center', padding: '0.5rem 0.5rem' }}>Stock</th>
                                <th style={{ textAlign: 'center', padding: '0.5rem 0.5rem' }}>Status</th>
                                <th style={{ textAlign: 'right', padding: '0.5rem 0.5rem' }}>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {variants.map(v => {
                                const vQty = v.quantity || 0;
                                const attrs = v.attributes || {};
                                const statusInfo = getStockStatusInfo(vQty);
                                return (
                                  <tr key={v.id} style={{ borderTop: '1px solid var(--border)', background: selectedVariantIds.has(v.id) ? '#eef2ff' : 'transparent' }}>
                                    <td style={{ textAlign: 'center', padding: '0.5rem 0.5rem 0.5rem 2.5rem', width: 32 }}>
                                      <input
                                        type="checkbox"
                                        checked={selectedVariantIds.has(v.id)}
                                        onChange={() => toggleVariantSelection(v.id)}
                                        style={{ cursor: 'pointer' }}
                                      />
                                    </td>
                                    <td style={{ padding: '0.5rem 0.5rem', fontWeight: 600 }}>
                                      {v.name || '—'}
                                    </td>
                                    <td style={{ padding: '0.5rem 0.5rem', fontFamily: 'monospace', fontSize: '0.72rem' }}>
                                      {v.sku || '—'}
                                    </td>
                                    <td style={{ padding: '0.5rem 0.5rem' }}>
                                      {attrs.size || '—'}
                                    </td>
                                    <td style={{ padding: '0.5rem 0.5rem' }}>
                                      {attrs.color ? (
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                          <span style={{
                                            display: 'inline-block',
                                            width: 10,
                                            height: 10,
                                            borderRadius: '50%',
                                            background: attrs.color.toLowerCase(),
                                            border: '1px solid var(--border)',
                                          }} />
                                          {attrs.color}
                                        </span>
                                      ) : '—'}
                                    </td>
                                    <td style={{ padding: '0.5rem 0.5rem', textAlign: 'center' }}>
                                      <strong style={{ color: vQty < 5 ? 'var(--danger)' : 'var(--charcoal)', fontSize: '0.85rem' }}>
                                        {vQty}
                                      </strong>
                                    </td>
                                    <td style={{ padding: '0.5rem 0.5rem', textAlign: 'center' }}>
                                      <span className={`status-badge ${statusInfo.className}`} style={{ fontSize: '0.65rem' }}>
                                        {statusInfo.label}
                                      </span>
                                    </td>
                                    <td style={{ padding: '0.5rem 0.5rem', textAlign: 'right' }}>
                                      <div className="row-actions" style={{ justifyContent: 'flex-end' }}>
                                        <button
                                          onClick={() => openStockModal(v, 'add')}
                                          title="Add Stock"
                                          style={{
                                            fontSize: '0.68rem',
                                            padding: '0.25rem 0.5rem',
                                            color: '#22c55e',
                                            border: '1px solid rgba(34,197,94,0.3)',
                                            borderRadius: 4,
                                            background: '#f0fdf4',
                                            cursor: 'pointer',
                                            fontWeight: 500,
                                            whiteSpace: 'nowrap',
                                            transition: 'all 0.15s',
                                          }}
                                          onMouseEnter={e => { e.currentTarget.style.background = '#22c55e'; e.currentTarget.style.color = '#fff'; }}
                                          onMouseLeave={e => { e.currentTarget.style.background = '#f0fdf4'; e.currentTarget.style.color = '#22c55e'; }}
                                        >
                                          + Add
                                        </button>
                                        <button
                                          onClick={() => openStockModal(v, 'reduce')}
                                          title="Reduce Stock"
                                          style={{
                                            fontSize: '0.68rem',
                                            padding: '0.25rem 0.5rem',
                                            color: '#ef4444',
                                            border: '1px solid rgba(239,68,68,0.3)',
                                            borderRadius: 4,
                                            background: '#fef2f2',
                                            cursor: 'pointer',
                                            fontWeight: 500,
                                            whiteSpace: 'nowrap',
                                            transition: 'all 0.15s',
                                          }}
                                          onMouseEnter={e => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.color = '#fff'; }}
                                          onMouseLeave={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#ef4444'; }}
                                        >
                                          − Reduce
                                        </button>
                                        <button
                                          onClick={() => openHistoryModal(v)}
                                          title="View Stock History"
                                          style={{
                                            fontSize: '0.68rem',
                                            padding: '0.25rem 0.5rem',
                                            color: '#6b7280',
                                            border: '1px solid var(--border)',
                                            borderRadius: 4,
                                            background: '#fff',
                                            cursor: 'pointer',
                                            fontWeight: 500,
                                            whiteSpace: 'nowrap',
                                            transition: 'all 0.15s',
                                          }}
                                          onMouseEnter={e => { e.currentTarget.style.background = '#f3f4f6'; }}
                                          onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}
                                        >
                                          📋 History
                                        </button>
                                        <button
                                          onClick={async () => {
                                            try {
                                              const res = await inventoryAPI.getVariantBarcodeLabel(v.id);
                                              downloadBlob(res, `barcode-${v.sku || v.id}.pdf`);
                                              toast.success('Barcode label downloaded');
                                            } catch (err) {
                                              toast.error('Failed to download barcode');
                                            }
                                          }}
                                          title="Download Barcode Label"
                                          style={{
                                            fontSize: '0.68rem',
                                            padding: '0.25rem 0.5rem',
                                            color: '#1a1a2e',
                                            border: '1px solid rgba(26,26,46,0.3)',
                                            borderRadius: 4,
                                            background: '#f8f9fc',
                                            cursor: 'pointer',
                                            fontWeight: 500,
                                            whiteSpace: 'nowrap',
                                            transition: 'all 0.15s',
                                          }}
                                          onMouseEnter={e => { e.currentTarget.style.background = '#1a1a2e'; e.currentTarget.style.color = '#fff'; }}
                                          onMouseLeave={e => { e.currentTarget.style.background = '#f8f9fc'; e.currentTarget.style.color = '#1a1a2e'; }}
                                        >
                                          🏷️
                                        </button>
                                        <button
                                          onClick={async () => {
                                            try {
                                              await inventoryAPI.printVariantBarcodeLabel(v.id);
                                            } catch { toast.error('Failed to open for printing'); }
                                          }}
                                          title="Open Barcode in New Tab for Printing"
                                          style={{
                                            fontSize: '0.68rem',
                                            padding: '0.25rem 0.5rem',
                                            color: '#2563eb',
                                            border: '1px solid rgba(37,99,235,0.3)',
                                            borderRadius: 4,
                                            background: '#eff6ff',
                                            cursor: 'pointer',
                                            fontWeight: 500,
                                            whiteSpace: 'nowrap',
                                            transition: 'all 0.15s',
                                          }}
                                          onMouseEnter={e => { e.currentTarget.style.background = '#2563eb'; e.currentTarget.style.color = '#fff'; }}
                                          onMouseLeave={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.color = '#2563eb'; }}
                                        >
                                          🖨️
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          onPageChange={setCurrentPage}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          pageSizeOptions={pageSizeOptions}
        />
      </div>
      )}

      {/* Stock Adjustment Modal */}
      <StockAdjustModal
        isOpen={stockModal.open}
        onClose={() => setStockModal({ open: false, variant: null })}
        variant={stockModal.variant}
        onSuccess={handleAdjustSuccess}
        defaultType={stockModal.defaultType || 'add'}
      />

      {/* Movement History Modal */}
      <MovementHistoryModal
        isOpen={historyModal.open}
        onClose={() => setHistoryModal({ open: false, variant: null })}
        variant={historyModal.variant}
      />

      {/* Bulk Adjust Modal */}
      <BulkAdjustModal
        isOpen={bulkModal.open}
        onClose={() => setBulkModal({ open: false, variants: [] })}
        variants={bulkModal.variants}
        onSuccess={handleAdjustSuccess}
      />

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={barcodeModal}
        onClose={() => setBarcodeModal(false)}
        onVariantFound={handleBarcodeVariantFound}
      />

      {/* Batch Barcode Download Bar */}
      {selectedVariantIds.size > 0 && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: '#1a1a2e',
          color: '#fff',
          padding: '0.75rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          zIndex: 1000,
          boxShadow: '0 -4px 20px rgba(0,0,0,0.3)',
          flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: '0.85rem' }}>
            <strong>{selectedVariantIds.size}</strong> variant{selectedVariantIds.size !== 1 ? 's' : ''} selected
          </span>

          {/* Progress bar during generation */}
          {batchBarcoding && (
            <div style={{
              flex: '1 1 100%',
              maxWidth: 400,
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}>
              <div style={{
                flex: 1,
                height: 6,
                borderRadius: 3,
                background: '#374151',
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min((barcodeProgress.attempts / barcodeProgress.maxAttempts) * 100, 100)}%`,
                  borderRadius: 3,
                  background: 'linear-gradient(90deg, #22c55e, #16a34a)',
                  transition: 'width 0.4s ease',
                }} />
              </div>
              <span style={{ fontSize: '0.72rem', color: '#9ca3af', whiteSpace: 'nowrap', minWidth: 140, textAlign: 'right' }}>
                {(() => {
                  const remaining = Math.round((barcodeProgress.maxAttempts - barcodeProgress.attempts) * 2);
                  return `${barcodeProgress.attempts}/${barcodeProgress.maxAttempts} — ~${remaining}s left`;
                })()}
              </span>
            </div>
          )}

          <button
            onClick={handleBatchBarcodeDownload}
            disabled={batchBarcoding}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: 8,
              background: '#22c55e',
              color: '#fff',
              border: 'none',
              fontWeight: 600,
              fontSize: '0.82rem',
              cursor: batchBarcoding ? 'not-allowed' : 'pointer',
              opacity: batchBarcoding ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            {batchBarcoding ? (
              <><span className="spinner" style={{ width: 12, height: 12 }} /> Waiting...</>
            ) : (
              <><span>🏷️</span> Download</>
            )}
          </button>          <button
            onClick={async () => {
              if (selectedVariantIds.size === 0) return;
              setBatchBarcoding(true);
              try {
                const dispatchRes = await inventoryAPI.dispatchBatchBarcodeLabels([...selectedVariantIds]);
                const { batch_id } = dispatchRes.data?.data || {};
                if (!batch_id) { toast.error('Failed to start'); setBatchBarcoding(false); setBarcodeProgress({ attempts: 0, maxAttempts: 30 }); return; }
                toast('⏳ Opening for printing...');
                let attempts = 0;
                const maxAttempts = 30;
                setBarcodeProgress({ attempts: 0, maxAttempts });
                while (attempts < maxAttempts) {
                  await new Promise(r => setTimeout(r, 2000));
                  attempts++;
                  setBarcodeProgress({ attempts, maxAttempts });
                  try {
                    const statusRes = await inventoryAPI.getBarcodeBatchStatus(batch_id);
                    const status = statusRes.data?.data?.status;
                    if (status === 'ready') {
                      const downloadRes = await inventoryAPI.downloadBarcodeBatch(batch_id);
                      const blobUrl = URL.createObjectURL(downloadRes.data);
                      window.open(blobUrl, '_blank');
                      setSelectedVariantIds(new Set());
                      break;
                    }
                    if (status === 'failed') { toast.error('Generation failed'); break; }
                  } catch {}
                }
                setBarcodeProgress({ attempts: 0, maxAttempts: 30 });
              } catch { toast.error('Failed'); }
              setBatchBarcoding(false);
            }}
            disabled={batchBarcoding}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: 8,
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              fontWeight: 600,
              fontSize: '0.82rem',
              cursor: batchBarcoding ? 'not-allowed' : 'pointer',
              opacity: batchBarcoding ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            {batchBarcoding ? (
              <><span className="spinner" style={{ width: 12, height: 12 }} /> Waiting...</>
            ) : (
              <><span>🖨️</span> Print</>
            )}
          </button>
          <button
            onClick={() => setSelectedVariantIds(new Set())}
            style={{
              padding: '0.5rem 0.75rem',
              borderRadius: 8,
              background: 'transparent',
              color: '#9ca3af',
              border: '1px solid #4b5563',
              fontWeight: 500,
              fontSize: '0.78rem',
              cursor: 'pointer',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#6b7280'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#9ca3af'; e.currentTarget.style.borderColor = '#4b5563'; }}
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
