import { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../../api/admin';
import { formatCurrency, formatDate } from '../../utils/formatters';
import toast from '../../utils/toast';
import Pagination from '../../components/admin/Pagination';
import AdminPageShell from '../../components/admin/AdminPageShell';
import { useSocketEvent, useOrderCreated } from '../../hooks/useSocket';
import { Search, RefreshCw, Eye, CheckCircle, XCircle, Clock, Truck, ShieldCheck, MessageSquare, Image as ImageIcon } from 'lucide-react';

/* ═══════════ CUSTOM DESIGN STATUSES ═══════════ */
const DESIGN_STATUSES = {
  PENDING_REVIEW: { label: 'Pending Review', color: '#f59e0b', bg: '#fffbeb', icon: Clock },
  APPROVED: { label: 'Approved', color: '#10b981', bg: '#ecfdf5', icon: CheckCircle },
  IN_PRODUCTION: { label: 'In Production', color: '#3b82f6', bg: '#eff6ff', icon: ShieldCheck },
  SHIPPED: { label: 'Shipped', color: '#8b5cf6', bg: '#f5f3ff', icon: Truck },
  COMPLETED: { label: 'Completed', color: '#059669', bg: '#f0fdf4', icon: CheckCircle },
  REJECTED: { label: 'Rejected', color: '#ef4444', bg: '#fef2f2', icon: XCircle },
};

const STATUS_TRANSITIONS = {
  PENDING_REVIEW: ['APPROVED', 'REJECTED'],
  APPROVED: ['IN_PRODUCTION', 'REJECTED'],
  IN_PRODUCTION: ['SHIPPED', 'REJECTED'],
  SHIPPED: ['COMPLETED'],
  COMPLETED: [],
  REJECTED: [],
};

/* ═══════════ HELPER: Compute status counts from design list ═══════════ */
function computeCounts(designs) {
  const counts = { ALL: designs.length };
  Object.keys(DESIGN_STATUSES).forEach(s => { counts[s] = 0; });
  designs.forEach(d => {
    const st = d.status || 'PENDING_REVIEW';
    if (counts[st] !== undefined) counts[st]++;
  });
  return counts;
}

/* ═══════════ EXTRACT BACK DESIGN URL FROM DESIGN_NOTES JSON ═══════════ */
function getBackDesignUrl(design) {
  if (!design?.design_notes) return null;
  try {
    const parsed = JSON.parse(design.design_notes);
    return parsed?.backDesignUrl || null;
  } catch {
    return null;
  }
}

/* ═══════════ MAIN PAGE ═══════════ */
export default function CustomDesignsAdminPage() {
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [expandedDesign, setExpandedDesign] = useState(null); // design id
  const [designNotes, setDesignNotes] = useState({}); // designId -> admin notes text
  const [savingNotes, setSavingNotes] = useState({});  // designId -> bool
  // designId -> timestamp of last successful notes save (drives the brief
  // green "Saved" flash on the notes row).
  const [savedNotes, setSavedNotes] = useState({});

  // ── Load custom designs from the dedicated API ──
  const load = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 50,
      };
      if (search) params.search = search;
      if (statusFilter !== 'ALL') params.status = statusFilter;

      const r = await adminAPI.getCustomDesigns(params);
      const list = r.data?.data || [];
      setDesigns(Array.isArray(list) ? list : []);

      const pag = r.data?.pagination || {};
      setCurrentPage(pag.page || page);
      setTotalPages(pag.pages || Math.ceil((pag.total || list.length) / 50) || 1);
      setTotalItems(pag.total || list.length);
    } catch (err) {
      console.error('Failed to load custom designs:', err);
      toast.error('Failed to load custom designs');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => { load(1); }, [load]);

  // ── Update design status via dedicated API ──
  const updateDesignStatus = useCallback(async (designId, newStatus) => {
    try {
      // Optimistic update
      setDesigns(prev => prev.map(d =>
        d.id === designId ? { ...d, status: newStatus } : d
      ));

      await adminAPI.updateCustomDesignStatus(designId, { status: newStatus });
      toast.success(`Design status updated to ${DESIGN_STATUSES[newStatus]?.label}`);
    } catch (err) {
      toast.error('Failed to update status');
      load(currentPage);
    }
  }, [currentPage, load]);

  // ── Save admin notes via dedicated API ──
  const handleSaveNotes = useCallback(async (designId) => {
    setSavingNotes(prev => ({ ...prev, [designId]: true }));
    try {
      await adminAPI.updateCustomDesignNotes(designId, {
        admin_notes: designNotes[designId] || '',
      });
      // Update local state with saved notes
      setDesigns(prev => prev.map(d =>
        d.id === designId ? { ...d, admin_notes: designNotes[designId] || '' } : d
      ));
      toast.success('Notes saved');
      // Brief inline "Saved" state so the row gives the same feedback as the
      // shared form system (green border + check, fades after ~2.5s).
      setSavedNotes(prev => ({ ...prev, [designId]: Date.now() }));
      setTimeout(() => {
        setSavedNotes(prev => {
          if (!prev[designId]) return prev;
          const next = { ...prev };
          delete next[designId];
          return next;
        });
      }, 2500);
    } catch (err) {
      toast.error('Failed to save notes');
    } finally {
      setSavingNotes(prev => ({ ...prev, [designId]: false }));
    }
  }, [designNotes]);

  // ── Real-time updates ──
  const handleDesignUpdate = useCallback(() => { load(currentPage); }, [currentPage, load]);
  useSocketEvent('order:updated', handleDesignUpdate, [currentPage, load]);
  useOrderCreated(() => { load(1); }, [load]);

  const counts = computeCounts(designs);

  return (
    <AdminPageShell
      title="Custom Designs"
      subtitle={`Manage custom t-shirt design orders (${totalItems} total)`}
      loading={loading}
      page="custom-designs"
    >
      {/* ── Stats ── */}
      <div className="stats-grid">
        {Object.entries(DESIGN_STATUSES).map(([status, config]) => {
          const Icon = config.icon;
          return (
            <div key={status} className="stat-card" style={{ cursor: 'pointer', borderLeft: `3px solid ${config.color}` }}
              onClick={() => setStatusFilter(statusFilter === status ? 'ALL' : status)}>
              <div className="stat-label flex items-center gap-1.5">
                <Icon size={14} /> {config.label}
              </div>
              <div className="stat-val" style={{ color: config.color }}>{counts[status] || 0}</div>
            </div>
          );
        })}
      </div>

      {/* ── Table ── */}
      <div className="table-card">
        <div className="table-toolbar">
          <div className="flex items-center gap-2 flex-1">
            <Search size={16} className="text-gray-400" />
            <input className="table-search flex-1" placeholder="Search by order ID, customer, or design notes..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="table-filter" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="ALL">All Statuses ({counts.ALL})</option>
            {Object.entries(DESIGN_STATUSES).map(([s, c]) => (
              <option key={s} value={s}>{c.label} ({counts[s] || 0})</option>
            ))}
          </select>
          <button className="btn-ghost btn-sm" onClick={() => load(1)}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {designs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><ImageIcon size={40} /></div>
            <h3>No custom design orders found</h3>
            <p className="text-gray-400 text-sm mt-1">Custom designs will appear here once customers place orders with uploaded artwork.</p>
          </div>
        ) : (
          <div className="space-y-4 p-4">
            {designs.map((design) => {
              const order = design.order || {};
              const currentStatus = design.status || 'PENDING_REVIEW';
              const StatusIcon = DESIGN_STATUSES[currentStatus]?.icon || Clock;
              const isExpanded = expandedDesign === design.id;

              return (
                <div key={design.id} className="border border-gray-200 rounded-xl overflow-hidden bg-white hover:border-gray-300 transition-all">
                  {/* ── Collapsed Header ── */}
                  <div className="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setExpandedDesign(isExpanded ? null : design.id)}>
                    {/* Thumbnails */}
                    <div className="flex -space-x-2 shrink-0">
                      {/* Front design thumbnail */}
                      <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-100 border-2 border-amber-400 flex items-center justify-center relative z-10 ring-1 ring-white">
                        {design.design_file_url ? (
                          <img src={design.design_file_url} alt="Front design" className="w-full h-full object-cover"
                            onError={(e) => { e.target.style.display = 'none'; }} />
                        ) : (
                          <ImageIcon size={20} className="text-gray-300" />
                        )}
                        <span className="absolute bottom-0 left-0 right-0 bg-amber-400 text-white text-[6px] font-bold text-center leading-tight py-[1px]">FRONT</span>
                      </div>
                      {/* Back design thumbnail (parsed from design_notes JSON) */}
                      {getBackDesignUrl(design) && (
                        <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-100 border-2 border-indigo-400 flex items-center justify-center relative ring-1 ring-white">
                          <img src={getBackDesignUrl(design)} alt="Back design" className="w-full h-full object-cover"
                            onError={(e) => { e.target.style.display = 'none'; }} />
                          <span className="absolute bottom-0 left-0 right-0 bg-indigo-400 text-white text-[6px] font-bold text-center leading-tight py-[1px]">BACK</span>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-mono font-bold text-gray-800">#{design.order_id?.slice(0, 8)}</span>
                        <span className="text-[10px] text-gray-400">·</span>
                        <span className="text-xs font-medium text-gray-600 truncate">{design.customer_name || 'Guest'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-gray-400">
                        <span>{design.design_filename || 'Uploaded design'}</span>
                        <span>·</span>
                        <span>{design.color || '-'} / {design.size || '-'}</span>
                        <span>·</span>
                        <span>Qty: {design.quantity || 1}</span>
                        <span>·</span>
                        <span>{formatCurrency(design.price || 0)}</span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold"
                        style={{ background: DESIGN_STATUSES[currentStatus]?.bg || '#f3f4f6', color: DESIGN_STATUSES[currentStatus]?.color || '#6b7280' }}>
                        <StatusIcon size={11} />
                        {DESIGN_STATUSES[currentStatus]?.label || currentStatus}
                      </span>
                      <span className="text-gray-300 text-xs">{isExpanded ? '▲' : '▼'}</span>
                    </div>
                  </div>

                  {/* ── Expanded Details ── */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 p-4 space-y-4 bg-gray-50/50">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Left: Design Preview */}
                        <div>
                          <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                            Design Artwork
                            {design.placement === 'both' && (
                              <span className="ml-2 text-[8px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full">Front & Back</span>
                            )}
                          </h4>
                          <div className="flex gap-3 flex-wrap">
                            {/* Front design */}
                            <div className="relative">
                              <div className="aspect-square rounded-xl overflow-hidden border-2 border-amber-400 bg-white flex items-center justify-center w-[160px]">
                                {design.design_file_url ? (
                                  <img src={design.design_file_url} alt="Front design" className="w-full h-full object-contain p-2" />
                                ) : (
                                  <div className="text-center text-gray-300 p-4">
                                    <ImageIcon size={32} className="mx-auto mb-2" />
                                    <p className="text-[10px]">No preview</p>
                                  </div>
                                )}
                              </div>
                              <span className="absolute top-1 left-1 bg-amber-400 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-[3px]">FRONT</span>
                            </div>
                            {/* Back design (parsed from design_notes JSON) */}
                            {getBackDesignUrl(design) && (
                              <div className="relative">
                                <div className="aspect-square rounded-xl overflow-hidden border-2 border-indigo-400 bg-white flex items-center justify-center w-[160px]">
                                  <img src={getBackDesignUrl(design)} alt="Back design" className="w-full h-full object-contain p-2" />
                                </div>
                                <span className="absolute top-1 left-1 bg-indigo-400 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-[3px]">BACK</span>
                              </div>
                            )}
                          </div>
                          {design.design_filename && (
                            <p className="text-[10px] text-gray-400 mt-1">File: {design.design_filename}</p>
                          )}
                        </div>

                        {/* Right: Details */}
                        <div className="space-y-3">
                          {/* Order info */}
                          <div>
                            <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Order Details</h4>
                            <div className="space-y-1 text-xs">
                              <div className="flex justify-between"><span className="text-gray-400">Order ID</span><span className="font-mono font-medium">#{design.order_id?.slice(0, 12)}</span></div>
                              <div className="flex justify-between"><span className="text-gray-400">Customer</span><span className="font-medium">{design.customer_name || 'Guest'}</span></div>
                              <div className="flex justify-between"><span className="text-gray-400">Email</span><span className="font-medium">{design.customer_email || '-'}</span></div>
                              <div className="flex justify-between"><span className="text-gray-400">Date</span><span className="font-medium">{formatDate(design.created_at)}</span></div>
                              <div className="flex justify-between"><span className="text-gray-400">Total</span><span className="font-bold">{formatCurrency(order.total || order.totalAmount || design.price || 0)}</span></div>
                            </div>
                          </div>

                          {/* Design specs */}
                          <div>
                            <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Design Specifications</h4>
                            <div className="space-y-1 text-xs">
                              <div className="flex justify-between"><span className="text-gray-400">T-Shirt Color</span><span className="font-medium">{design.color || '-'}</span></div>
                              <div className="flex justify-between"><span className="text-gray-400">Size</span><span className="font-medium">{design.size || '-'}</span></div>
                              <div className="flex justify-between"><span className="text-gray-400">Quantity</span><span className="font-medium">{design.quantity || 1}</span></div>
                              <div className="flex justify-between"><span className="text-gray-400">Placement</span><span className="font-medium">{design.placement || 'Front'}</span></div>
                              <div className="flex justify-between"><span className="text-gray-400">Price</span><span className="font-medium">{formatCurrency(design.price || 0)}</span></div>
                            </div>
                          </div>

                          {/* Customer Notes */}
                          {design.design_notes && (
                            <div>
                              <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                <MessageSquare size={12} /> Customer Notes
                              </h4>
                              <p className="text-xs text-gray-600 bg-white rounded-lg p-3 border border-gray-200">{design.design_notes}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* ── Status Actions ── */}
                      <div className="border-t border-gray-200 pt-3">
                        <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Update Status</h4>
                        <div className="flex flex-wrap gap-1.5">
                          {STATUS_TRANSITIONS[currentStatus]?.map(nextStatus => {
                            const config = DESIGN_STATUSES[nextStatus];
                            const NextIcon = config.icon;
                            return (
                              <button key={nextStatus} onClick={() => updateDesignStatus(design.id, nextStatus)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all hover:scale-105 active:scale-95"
                                style={{ background: config.bg, color: config.color, border: `1px solid ${config.color}30` }}>
                                <NextIcon size={13} />
                                Mark as {config.label}
                              </button>
                            );
                          })}
                          {STATUS_TRANSITIONS[currentStatus]?.length === 0 && (
                            <span className="text-[11px] text-gray-400 italic">No further transitions available</span>
                          )}
                        </div>
                      </div>

                      {/* ── Admin Notes ── */}
                      <div className="border-t border-gray-200 pt-3">
                        <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Admin Notes</h4>
                        <div className="flex gap-2">
                          <textarea value={designNotes[design.id] ?? design.admin_notes ?? ''}
                            onChange={e => setDesignNotes(prev => ({ ...prev, [design.id]: e.target.value }))}
                            placeholder="Add internal notes about this custom design order..."
                            className={`flex-1 px-3 py-2 rounded-lg border border-gray-200 text-xs min-h-[60px] focus:outline-none focus:ring-1 focus:ring-gray-400 resize-none transition-all ${savedNotes[design.id] ? 'field-valid' : ''}`} />
                          <div className="flex flex-col items-end gap-1">
                            <button onClick={() => handleSaveNotes(design.id)} disabled={savingNotes[design.id]}
                              className="self-end px-3 py-1.5 rounded-lg bg-gray-900 text-white text-[10px] font-bold hover:bg-gray-800 transition-all disabled:opacity-50 flex items-center gap-1">
                              {savingNotes[design.id] ? '...' : 'Save'}
                            </button>
                            {savedNotes[design.id] && (
                              <span className="field-saved-flash flex items-center gap-0.5 text-[10px] font-bold text-green-600">
                                <CheckCircle size={12} /> Saved
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* ── View Full Order ── */}
                      <div className="pt-1">
                        <a href={`/admin/orders/${design.order_id}`}
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-700 transition-colors">
                          <Eye size={12} /> View full order details →
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          onPageChange={setCurrentPage}
          itemLabel="custom design"
          pageSize={50}
          onPageSizeChange={() => {}}
          pageSizeOptions={[50]}
        />
      </div>
    </AdminPageShell>
  );
}
