import { Star, Search, CheckCircle, XCircle, AlertCircle, Trash2 } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { reviewsAPI } from '../../api/reviews';
import AdminPageShell from '../../components/admin/AdminPageShell';
import { getStars, formatDate } from '../../utils/formatters';
import toast from '../../utils/toast';
import { downloadBlob } from '../../utils/download';

;
import Pagination from '../../components/admin/Pagination';
import ExportCSVModal from '../../components/admin/ExportCSVModal';

const TABS = [
  { key: 'all', label: 'All Reviews', icon: Star },
  { key: 'pending', label: 'Pending', icon: AlertCircle },
  { key: 'approved', label: 'Approved', icon: CheckCircle },
  { key: 'rejected', label: 'Rejected', icon: XCircle },
];

export default function ReviewsAdminPage() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  // CSV Export
  const [showExportModal, setShowExportModal] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState(null);
  const [exportError, setExportError] = useState(null);

  const REVIEW_COLUMNS = [
    { key: 'customerName', label: 'Customer' },
    { key: 'customerEmail', label: 'Email' },
    { key: 'productName', label: 'Product' },
    { key: 'rating', label: 'Rating' },
    { key: 'title', label: 'Title' },
    { key: 'comment', label: 'Comment' },
    { key: 'isVerified', label: 'Verified Purchase' },
    { key: 'isModerated', label: 'Moderated' },
    { key: 'isFlagged', label: 'Flagged' },
    { key: 'createdAt', label: 'Created Date' },
  ];

  const handleExportCSV = async (selectedColumns) => {
    setExporting(true); setExportStatus('dispatching'); setExportError(null);
    try {
      const filters = { search: debouncedSearch || undefined };
      if (activeTab !== 'all') filters.status = activeTab;
      Object.keys(filters).forEach(k => { if (filters[k] === undefined) delete filters[k]; });
      const dispatchRes = await adminAPI.dispatchExport({ type: 'reviews', filters, columns: selectedColumns });
      const jobId = dispatchRes.data?.data?.id;
      if (!jobId) throw new Error('No job ID returned');
      setExportStatus('processing');
      const poll = async () => {
        try {
          const statusRes = await adminAPI.checkExportStatus(jobId);
          const status = statusRes.data?.data?.status;
          if (status === 'completed') {
            const downloadRes = await adminAPI.downloadExport(jobId);
            const filename = statusRes.data?.data?.file_name || `reviews-export-${new Date().toISOString().slice(0, 10)}.csv`;
            downloadBlob(downloadRes, filename);
            setExportStatus('completed');
            toast.success('Reviews exported successfully');
            setTimeout(() => { setShowExportModal(false); setExportStatus(null); }, 1500);
          } else if (status === 'failed') {
            throw new Error(statusRes.data?.data?.error_message || 'Export failed');
          } else {
            setTimeout(poll, 1500);
          }
        } catch (pollErr) {
          console.error('Export poll error:', pollErr);
          if (!exportStatus || exportStatus === 'processing') {
            setExportStatus('failed'); setExportError(pollErr.response?.data?.message || pollErr.message || 'Export failed');
            toast.error('Export failed');
          }
        }
      };
      poll().catch(() => {});
    } catch (err) {
      console.error('Export failed:', err);
      setExportStatus('failed'); setExportError(err.response?.data?.message || err.message || 'Failed to export reviews');
      toast.error('Export failed');
    } finally { setExporting(false); }
  };

  const [pageSize, setPageSize] = useState(15);
  const pageSizeOptions = [10, 15, 25, 50];

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, debouncedSearch, pageSize]);

  const loadReviews = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      let r;
      const params = { page, limit: pageSize, search: debouncedSearch || undefined };

      if (activeTab === 'pending') {
        r = await reviewsAPI.getPending(params);
      } else {
        r = await reviewsAPI.getAll({ ...params, status: activeTab === 'all' ? undefined : activeTab });
      }

      const body = r.data || {};
      const data = body.data || body;
      const list = data?.reviews || data?.data || data?.items || [];
      setReviews(Array.isArray(list) ? list : []);
      const pag = data?.pagination || data || {};
      setCurrentPage(pag.current_page || pag.page || page);
      setTotalPages(pag.last_page || pag.pages || pag.totalPages || Math.ceil((pag.total || 0) / pageSize) || 1);
      setTotalItems(pag.total || list.length);
    } catch (e) {
      setError('Failed to load reviews');
      console.warn('Failed to load reviews:', e);
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab, debouncedSearch]);

  // Load reviews on mount and when dependencies change
  useEffect(() => {
    loadReviews(currentPage);
  }, [currentPage, activeTab, debouncedSearch, loadReviews]);

  const getUserName = (review) => {
    if (!review) return 'Customer';
    if (review.user) {
      const name = [review.user.first_name, review.user.last_name].filter(Boolean).join(' ');
      return name || review.user.email || 'Customer';
    }
    return review.userName || review.userEmail || 'Customer';
  };

  const getProductName = (review) => {
    if (!review) return '—';
    if (review.product) return review.product.name || '—';
    return review.productName || '—';
  };

  const getStatusBadge = (review) => {
    if (review.is_flagged) {
      return <span className="badge badge-danger" style={{ fontSize: '0.72rem' }}>Rejected</span>;
    }
    if (review.is_moderated) {
      return <span className="badge badge-success" style={{ fontSize: '0.72rem' }}>Approved</span>;
    }
    return <span className="badge badge-warning" style={{ fontSize: '0.72rem' }}>Pending</span>;
  };

  const handleApprove = async (id) => {
    try {
      await reviewsAPI.approve(id);
      setReviews(prev => prev.filter(r => r.id !== id));
      setTotalItems(prev => Math.max(prev - 1, 0));
      toast.success('Review approved');
    } catch {
      toast.error('Failed to approve review');
    }
  };

  const handleReject = async (id) => {
    try {
      await reviewsAPI.reject(id);
      setReviews(prev => prev.filter(r => r.id !== id));
      setTotalItems(prev => Math.max(prev - 1, 0));
      toast.success('Review rejected');
    } catch {
      toast.error('Failed to reject review');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this review permanently? This cannot be undone.')) return;
    try {
      await reviewsAPI.adminDelete(id);
      setReviews(prev => prev.filter(r => r.id !== id));
      setTotalItems(prev => Math.max(prev - 1, 0));
      toast.success('Review deleted');
    } catch {
      toast.error('Failed to delete review');
    }
  };

  const handleBulkApprove = async () => {
    const pending = reviews.filter(r => !r.is_moderated && !r.is_flagged);
    if (pending.length === 0) {
      toast.info('No pending reviews to approve');
      return;
    }
    for (const r of pending) {
      try { await reviewsAPI.approve(r.id); } catch (e) { console.warn('Failed:', e); }
    }
    setReviews([]);
    setTotalItems(0);
    toast.success(`${pending.length} reviews approved`);
  };

  const pendingCount = reviews.filter(r => !r.is_moderated && !r.is_flagged).length;

  return (
    <div>
      <AdminPageShell
        title="Reviews"
        subtitle="Manage all customer reviews — approve, reject, or delete"
        loading={loading}
        error={error}
        page="reviews"
        actions={
          <>
            {activeTab === 'pending' && pendingCount > 0 && (
              <button className="btn-dark btn-sm" onClick={handleBulkApprove}>
                <CheckCircle size={14} /> Approve All ({pendingCount})
              </button>
            )}
            <button className="btn-ghost btn-sm" onClick={() => setShowExportModal(true)}>📥 Export CSV</button>
          </>
        }
      >

      {/* Tab Navigation */}
      <div className="admin-tabs-wrap" style={{
        display: 'flex', gap: '0', borderBottom: '2px solid var(--border)',
        marginBottom: '1rem', overflowX: 'auto',
      }}>
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.65rem 1.2rem', fontSize: '0.85rem',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? 'var(--primary)' : 'var(--muted, #888)',
                background: 'transparent', border: 'none',
                borderBottom: isActive ? '2px solid var(--primary)' : '2px solid transparent',
                marginBottom: '-2px', cursor: 'pointer', transition: 'all 0.2s',
                whiteSpace: 'nowrap', opacity: isActive ? 1 : 0.6,
              }}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="table-card">
        <div className="table-toolbar">
          <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
            <input
              className="table-search"
              placeholder="Search by comment or title..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: '2rem' }}
            />
          </div>
          <span className="table-count">{totalItems} review{totalItems !== 1 ? 's' : ''}</span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Customer</th><th>Product</th><th>Rating</th>
                <th>Comment</th><th>Status</th><th>Date</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reviews.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-state" style={{ padding: '3rem' }}>
                      <div className="empty-state-icon" style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
                        {activeTab === 'pending' ? '✅' : activeTab === 'approved' ? '⭐' : activeTab === 'rejected' ? '🗑️' : '📝'}
                      </div>
                      <h3>
                        {activeTab === 'pending' && 'All caught up!'}
                        {activeTab === 'approved' && 'No approved reviews yet'}
                        {activeTab === 'rejected' && 'No rejected reviews'}
                        {activeTab === 'all' && 'No reviews found'}
                      </h3>
                      <p>
                        {activeTab === 'pending' && 'No reviews pending moderation.'}
                        {activeTab === 'all' && (search ? 'Try a different search term.' : 'No reviews in the system yet.')}
                        {![ 'all', 'pending' ].includes(activeTab) && 'No reviews in this category.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : reviews.map(r => (
                <tr key={r.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {r.user?.avatar && (
                        <img src={r.user.avatar} alt=""
                          style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }}
                          onError={e => { e.target.style.display = 'none'; }}
                        />
                      )}
                      <strong style={{ fontSize: '0.85rem' }}>{getUserName(r)}</strong>
                    </div>
                  </td>
                  <td style={{ fontSize: '0.82rem', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {getProductName(r)}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span style={{ color: 'var(--warning, #f59e0b)', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                        {getStars(r.rating)}
                      </span>
                      <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#666' }}>{r.rating}/5</span>
                    </div>
                  </td>
                  <td style={{ maxWidth: 280, fontSize: '0.85rem', lineHeight: 1.4, color: '#444' }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {r.title && <strong style={{ fontSize: '0.8rem', display: 'block', marginBottom: 2 }}>{r.title}</strong>}
                      {r.comment ? `"${r.comment}"` : 'No comment'}
                    </div>
                  </td>
                  <td>{getStatusBadge(r)}</td>
                  <td style={{ fontSize: '0.8rem', color: '#888', whiteSpace: 'nowrap' }}>{formatDate(r.createdAt)}</td>
                  <td>
                    <div className="row-actions" style={{ gap: '0.3rem', flexWrap: 'nowrap' }}>
                      {(!r.is_moderated && !r.is_flagged) ? (
                        <>
                          <button className="btn-approve" onClick={() => handleApprove(r.id)}
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}><CheckCircle size={12} /> Approve</button>
                          <button className="btn-del" onClick={() => handleReject(r.id)}
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}><XCircle size={12} /> Reject</button>
                        </>
                      ) : (
                        <>
                          {r.is_flagged && (
                            <button className="btn-approve" onClick={() => handleApprove(r.id)}
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}><CheckCircle size={12} /> Restore</button>
                          )}
                          {r.is_moderated && (
                            <button className="btn-del" onClick={() => handleReject(r.id)}
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}><XCircle size={12} /> Reject</button>
                          )}
                        </>
                      )}
                      <button className="btn-ghost btn-sm" onClick={() => handleDelete(r.id)}
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: '#e74c3c' }}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

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
      </AdminPageShell>

      <ExportCSVModal
        isOpen={showExportModal}
        onClose={() => { setShowExportModal(false); setExportStatus(null); setExportError(null); }}
        columns={REVIEW_COLUMNS}
        onExport={handleExportCSV}
        exporting={exporting}
        exportStatus={exportStatus}
        exportError={exportError}
        filename={`reviews-export-${new Date().toISOString().slice(0, 10)}.csv`}
      />
    </div>
  );
}
