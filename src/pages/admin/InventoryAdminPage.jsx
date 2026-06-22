import { useState, useEffect, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { inventoryAPI } from '../../api/inventory';
import { formatCurrency } from '../../utils/formatters';

export default function InventoryAdminPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [expandedVariantId, setExpandedVariantId] = useState(null);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const limit = 10;

  const loadData = async () => {
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        limit,
        search: debouncedSearch || undefined,
        stockStatus: filter !== 'ALL' ? filter : undefined
      };
      const r = await inventoryAPI.getAll(params);
      const data = r.data?.data || r.data;
      const inv = data?.inventory || data?.items || data || [];
      setItems(Array.isArray(inv) ? inv : []);
      const pag = r.data?.pagination || data?.pagination || {};
      setCurrentPage(pag.page || currentPage);
      setTotalPages(pag.pages || pag.totalPages || Math.ceil((pag.total || inv.length) / limit) || 1);
      setTotalItems(pag.total || inv.length);
    } catch (e) { setError('Failed to load inventory'); console.warn('Failed to load inventory:', e); }
    try {
      const r = await inventoryAPI.getStats();
      const s = r.data?.data || r.data;
      if (s) setStats(s);
    } catch (e) { setError(prev => prev || 'Failed to load data'); console.warn('Failed to load inventory stats:', e); }
    setLoading(false);
  };

  // Reset page when search or filter changes
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    } else {
      loadData();
    }
  }, [debouncedSearch, filter]);

  useEffect(() => {
    loadData();
  }, [currentPage]);

  return (
    <div>
      <div className="admin-header admin-header-row">
        <div><h2>Inventory</h2><p>Monitor stock levels and manage movements</p><p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '0.25rem' }}>Every product has variants — click <strong>▶</strong> to expand and see variant-level stock breakdown. Use the <strong>Variants</strong> page to manage stock per variant.</p></div>

      </div>

      {error && <div className="admin-alert danger mb-4"><span className="admin-alert-icon">⚠️</span><div className="admin-alert-body"><div className="admin-alert-title">Error Loading Data</div><div>{error}</div></div></div>}
      <div className="stats-grid">
        <div className="stat-card"><div className="stat-icon orders">📦</div><div className="stat-label">Total SKUs</div><div className="stat-val">{stats.totalSkus ?? items.length ?? 0}</div></div>
        <div className="stat-card"><div className="stat-icon alerts">⚠️</div><div className="stat-label">Low Stock</div><div className="stat-val" style={{ color: 'var(--warning)' }}>{stats.lowStock ?? items.filter(i => (i.quantity || i.stock || 0) < 5 && (i.quantity || i.stock || 0) > 0).length}</div></div>
        <div className="stat-card"><div className="stat-icon alerts">🚫</div><div className="stat-label">Out of Stock</div><div className="stat-val" style={{ color: 'var(--danger)' }}>{stats.outOfStock ?? items.filter(i => (i.quantity || i.stock || 0) === 0).length}</div></div>
        <div className="stat-card"><div className="stat-icon revenue">💎</div><div className="stat-label">Total Value</div><div className="stat-val">{formatCurrency(stats.totalValue ?? 0)}</div></div>
      </div>

      {items.filter(i => (i.quantity || i.stock || 0) === 0).length > 0 && (
        <div className="admin-alert danger mb-4">
          <span className="admin-alert-icon">🚫</span>
          <div className="admin-alert-body">
            <div className="admin-alert-title">Out of Stock Alert</div>
            <div>{items.filter(i => (i.quantity || i.stock || 0) === 0).length} products are completely out of stock. Immediate restock recommended.</div>
          </div>
        </div>
      )}

      {items.filter(i => (i.quantity || i.stock || 0) < 5 && (i.quantity || i.stock || 0) > 0).length > 0 && (
        <div className="admin-alert warning">
          <span className="admin-alert-icon">⚠️</span>
          <div className="admin-alert-body">
            <div className="admin-alert-title">Low Stock Warning</div>
            <div>{items.filter(i => (i.quantity || i.stock || 0) < 5 && (i.quantity || i.stock || 0) > 0).length} products have stock below the threshold. Consider restocking soon.</div>
          </div>
        </div>
      )}

      <div className="table-card">
        <div className="table-toolbar">
          <input className="table-search" placeholder="Search by product or SKU..." value={search} onChange={e => setSearch(e.target.value)} autoComplete="off" />
          <select className="table-filter" value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="ALL">All Items</option>
            <option value="OK">In Stock</option>
            <option value="LOW">Low Stock</option>
            <option value="OUT">Out of Stock</option>
          </select>
          <span className="table-count">{totalItems} items</span>
        </div>
        <table className="admin-table">
          <thead><tr><th>Product</th><th>SKU</th><th>In Stock</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5}><div className="loading-page" style={{ padding: '2rem' }}><div className="spinner" /></div></td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={5}><div className="empty-state"><div className="empty-state-icon">📦</div><h3>No items found</h3></div></td></tr>
            ) : items.map(item => {
              const qty = item.quantity || item.stock || 0;
              const itemId = item.id || item.productId;
              const isExpanded = expandedVariantId === itemId;
              return (
                <Fragment key={itemId}>
                <tr>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <button
                        onClick={() => setExpandedVariantId(isExpanded ? null : itemId)}
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
                      >
                        ▶
                      </button>
                      <strong>{item.productName || item.name || '—'}</strong>
                      <span 
                        className="status-badge" 
                        style={{ 
                          background: 'var(--primary-bg)', 
                          color: 'var(--primary)', 
                          fontSize: '0.65rem', 
                          padding: '1px 6px',
                          whiteSpace: 'nowrap'
                        }}
                        title="Each product has variants with individual stock levels. Click ▶ to expand and see breakdown. Use the Variants page to update stock."
                      >
                        🎨 {item.variants?.length || 0} variants
                      </span>
                    </div>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{item.sku || '—'}</td>
                  <td><strong style={{ color: qty < 5 ? 'var(--danger)' : 'var(--charcoal)' }}>{qty}</strong></td>
                  <td><span className={`status-badge ${qty === 0 ? 'status-cancelled' : qty < 5 ? 'status-pending' : 'status-active'}`}>{qty === 0 ? 'Out of Stock' : qty < 5 ? 'Low Stock' : 'In Stock'}</span></td>
                  <td>
                    <div className="row-actions">
                      <button
                        onClick={() => navigate('/admin/variants')}
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--primary)',
                          cursor: 'pointer',
                          background: 'var(--primary-bg)',
                          border: '1px solid var(--primary)',
                          borderRadius: '4px',
                          padding: '2px 8px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          whiteSpace: 'nowrap',
                          transition: 'all 0.15s ease',
                        }}
                        title="Go to Variants page to manage stock per variant (size, color, etc.)"
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--primary)'; e.currentTarget.style.color = '#fff'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'var(--primary-bg)'; e.currentTarget.style.color = 'var(--primary)'; }}
                      >
                        🔄 Manage Variants
                      </button>
                    </div>
                  </td>
                </tr>
                {isExpanded && item.variants && item.variants.length > 0 && (
                  <tr key={`${itemId}-variants`}>
                    <td colSpan={5} style={{ padding: 0, borderBottom: 'none' }}>
                      <div style={{
                        background: '#f9f9fb',
                        padding: '0.75rem 1rem 0.75rem 2.5rem',
                        borderBottom: '1px solid var(--border)',
                      }}>
                        <table style={{ width: '100%', fontSize: '0.78rem', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ color: 'var(--muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              <th style={{ textAlign: 'left', padding: '0.25rem 0.5rem' }}>Variant</th>
                              <th style={{ textAlign: 'left', padding: '0.25rem 0.5rem' }}>SKU</th>
                              <th style={{ textAlign: 'left', padding: '0.25rem 0.5rem' }}>Size</th>
                              <th style={{ textAlign: 'left', padding: '0.25rem 0.5rem' }}>Color</th>
                              <th style={{ textAlign: 'right', padding: '0.25rem 0.5rem' }}>Stock</th>
                              <th style={{ textAlign: 'right', padding: '0.25rem 0.5rem' }}>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {item.variants.map(v => {
                              const vQty = v.quantity || 0;
                              const attrs = v.attributes || {};
                              return (
                                <tr key={v.id} style={{ borderTop: '1px solid var(--border)' }}>
                                  <td style={{ padding: '0.4rem 0.5rem', fontWeight: 600 }}>{v.name || '—'}</td>
                                  <td style={{ padding: '0.4rem 0.5rem', fontFamily: 'monospace', fontSize: '0.72rem' }}>{v.sku || '—'}</td>
                                  <td style={{ padding: '0.4rem 0.5rem' }}>{attrs.size || '—'}</td>
                                  <td style={{ padding: '0.4rem 0.5rem' }}>
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
                                  <td style={{ padding: '0.4rem 0.5rem', textAlign: 'right' }}>
                                    <strong style={{ color: vQty < 5 ? 'var(--danger)' : 'var(--charcoal)' }}>{vQty}</strong>
                                  </td>
                                  <td style={{ padding: '0.4rem 0.5rem', textAlign: 'right' }}>
                                    <span className={`status-badge ${vQty === 0 ? 'status-cancelled' : vQty < 5 ? 'status-pending' : 'status-active'}`}>
                                      {vQty === 0 ? 'OOS' : vQty < 5 ? 'Low' : 'OK'}
                                    </span>
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

        {totalPages > 1 && (
          <div className="pagination-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', padding: '1rem', borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({totalItems} items)</span>
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              <button className="btn-ghost btn-sm" disabled={currentPage <= 1} onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}>◀ Prev</button>
              {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map(p => (
                <button key={p} className={p === currentPage ? 'btn-dark btn-sm' : 'btn-ghost btn-sm'} onClick={() => setCurrentPage(p)} style={{ minWidth: '32px' }}>{p}</button>
              ))}
              <button className="btn-ghost btn-sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}>Next ▶</button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
