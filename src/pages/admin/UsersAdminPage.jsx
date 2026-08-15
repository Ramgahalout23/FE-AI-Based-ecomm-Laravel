import { useState, useEffect } from 'react';
import { adminAPI } from '../../api/admin';
import { formatDate, getInitials, getUserFullName } from '../../utils/formatters';
import { USER_ROLES } from '../../utils/constants';
import toast from '../../utils/toast';
import { downloadBlob } from '../../utils/download';
import ExportCSVModal from '../../components/admin/ExportCSVModal';
import Pagination from '../../components/admin/Pagination';
import AdminPageShell from '../../components/admin/AdminPageShell';

export default function UsersAdminPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [detail, setDetail] = useState(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const pageSizeOptions = [10, 25, 50, 100];

  // Search debouncing
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // CSV Export state (async job-based)
  const [showExportModal, setShowExportModal] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState(null);
  const [exportError, setExportError] = useState(null);

  const USER_COLUMNS = [
    { key: 'id', label: 'User ID' },
    { key: 'firstName', label: 'First Name' },
    { key: 'lastName', label: 'Last Name' },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Role' },
    { key: 'phone', label: 'Phone' },
    { key: 'emailVerified', label: 'Email Verified' },
    { key: 'blocked', label: 'Status (Blocked)' },
    { key: 'createdAt', label: 'Joined Date' },
  ];

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  const handleExportCSV = async (selectedColumns) => {
    setExporting(true);
    setExportStatus('dispatching');
    setExportError(null);
    try {
      // 1. Dispatch the export job
      const filters = {
        role: roleFilter !== 'ALL' ? roleFilter : undefined,
        search: debouncedSearch || undefined,
      };
      Object.keys(filters).forEach(k => { if (filters[k] === undefined) delete filters[k]; });

      const dispatchRes = await adminAPI.dispatchExport({
        type: 'users',
        filters,
        columns: selectedColumns,
      });

      const jobId = dispatchRes.data?.data?.id;
      if (!jobId) throw new Error('No job ID returned');

      setExportStatus('processing');

      // 2. Poll for completion
      const poll = async () => {
        try {
          const statusRes = await adminAPI.checkExportStatus(jobId);
          const status = statusRes.data?.data?.status;

          if (status === 'completed') {
            // 3. Download the completed file
            const downloadRes = await adminAPI.downloadExport(jobId);
            const filename = statusRes.data?.data?.file_name || `users-export-${new Date().toISOString().slice(0, 10)}.csv`;
            downloadBlob(downloadRes, filename);
            setExportStatus('completed');
            toast.success('Users exported successfully');
            setTimeout(() => {
              setShowExportModal(false);
              setExportStatus(null);
            }, 1500);
          } else if (status === 'failed') {
            throw new Error(statusRes.data?.data?.error_message || 'Export failed');
          } else {
            setTimeout(poll, 1500);
          }
        } catch (pollErr) {
          console.error('Export poll error:', pollErr);
          if (!exportStatus || exportStatus === 'processing') {
            setExportStatus('failed');
            setExportError(pollErr.response?.data?.message || pollErr.message || 'Export failed');
            toast.error('Export failed');
          }
        }
      };

      poll().catch(() => {});
    } catch (err) {
      console.error('Export failed:', err);
      setExportStatus('failed');
      setExportError(err.response?.data?.message || err.message || 'Failed to export users');
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  const load = async (page = 1) => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: pageSize,
        role: roleFilter !== 'ALL' ? roleFilter : undefined,
        search: debouncedSearch || undefined
      };

      const r = await adminAPI.getAllUsers(params);
      // Laravel returns raw paginator: { success: true, data: { data: [...items], current_page, last_page, total } }
      const raw = r.data?.data || r.data || {};
      const list = raw?.data || raw?.users || raw || [];
      setUsers(Array.isArray(list) ? list : []);

      // Pagination from raw paginator: current_page, last_page, total
      setCurrentPage(raw.current_page || raw.page || page);
      setTotalPages(raw.last_page || raw.pages || raw.totalPages || Math.ceil((raw.total || list.length) / pageSize) || 1);
      setTotalItems(raw.total || list.length);
    } catch (err) {
      console.error('Failed to load users:', err);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  // Reset page on search, role filter, or page size change
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    } else {
      load(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- currentPage/load intentionally excluded: load is recreated each render
  }, [debouncedSearch, roleFilter, pageSize]);

  // Reload when page changes
  useEffect(() => {
    load(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load is recreated each render; page changes are the only intended trigger
  }, [currentPage]);

  const handleManage = async (id, action) => {
    try {
      await adminAPI.manageUser(id, { action });
      setUsers(users.map(u => u.id === id ? { ...u, blocked: action === 'block' } : u));
      if (detail?.id === id) setDetail({ ...detail, blocked: action === 'block' });
      toast.success(`User ${action}ed successfully`);
      await load(currentPage);
    } catch { toast.error(`Failed to ${action} user`); }
  };

  const handleRole = async (id, role) => {
    try {
      await adminAPI.updateUserRole(id, { role });
      setUsers(users.map(u => u.id === id ? { ...u, role } : u));
      if (detail?.id === id) setDetail({ ...detail, role });
      toast.success(`Role updated to ${role}`);
      await load(currentPage);
    } catch { toast.error('Failed to update role'); }
  };

  const viewDetail = async (user) => {
    try { const r = await adminAPI.getUserDetails(user.id); setDetail(r.data || user); }
    catch { setDetail(user); }
  };

  return (
      <AdminPageShell
        title="Users"
        subtitle={`Manage customer accounts and roles (${totalItems} total)`}
        loading={loading}
        page="users"
      >
      {/* User Detail */}
      {detail && (
        <div className="detail-panel">
          <div className="detail-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg, var(--gold), var(--gold-dark))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '1rem' }}>
                {getInitials(detail.firstName || detail.first_name, detail.lastName || detail.last_name)}
              </div>
              <div><h3>{getUserFullName(detail) || '—'}</h3><span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{detail.email}</span></div>
            </div>
            <button className="btn-ghost btn-sm" onClick={() => setDetail(null)}>✕ Close</button>
          </div>
          <div className="detail-grid">
            <div className="detail-item"><span className="label">User ID</span><span className="value" style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{detail.id}</span></div>
            <div className="detail-item"><span className="label">Phone</span><span className="value">{detail.phone || '—'}</span></div>
            <div className="detail-item"><span className="label">Role</span><span className="value"><span className={`status-badge ${detail.role === 'ADMIN' ? 'status-info' : detail.role === 'SUPER_ADMIN' ? 'status-warning' : 'status-active'}`}>{detail.role}</span></span></div>
            <div className="detail-item"><span className="label">Status</span><span className="value"><span className={`status-badge ${detail.blocked ? 'status-cancelled' : 'status-active'}`}>{detail.blocked ? 'Blocked' : 'Active'}</span></span></div>
            <div className="detail-item"><span className="label">Joined</span><span className="value">{formatDate(detail.createdAt)}</span></div>
            <div className="detail-item"><span className="label">Email Verified</span><span className="value">{detail.emailVerified ? '✅ Yes' : '❌ No'}</span></div>
          </div>
          <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
            <button className={`btn-sm ${detail.blocked ? 'btn-dark' : 'btn-danger'}`} onClick={() => handleManage(detail.id, detail.blocked ? 'unblock' : 'block')}>
              {detail.blocked ? '🔓 Unblock User' : '🔒 Block User'}
            </button>
            <select className="table-filter" style={{ fontSize: '0.78rem', padding: '0.4rem' }} value={detail.role} onChange={e => handleRole(detail.id, e.target.value)}>
              {Object.keys(USER_ROLES).filter(r => r !== 'ADMIN' && r !== 'SUPER_ADMIN').map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="table-card">
        <div className="table-toolbar">
          <input className="table-search" placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)} autoComplete="off" />
          <select className="table-filter" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
            <option value="ALL">All Roles</option>
            {Object.keys(USER_ROLES).map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <button className="btn-ghost btn-sm" onClick={() => setShowExportModal(true)}>
            📥 Export CSV
          </button>
          <span className="table-count">{totalItems} users</span>
        </div>
        <table className="admin-table">
          <thead><tr><th>User</th><th>Email</th><th>Role</th><th>Status</th><th>Joined</th><th>Actions</th></tr></thead>
          <tbody>
            {users.length === 0 ? (
              <tr><td colSpan={6}><div className="empty-state"><div className="empty-state-icon">👥</div><h3>No users found</h3></div></td></tr>
            ) : users.map(u => (
              <tr key={u.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--off-white)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, color: 'var(--muted)', flexShrink: 0 }}>{getInitials(u.firstName || u.first_name, u.lastName || u.last_name)}</div>
                    <strong>{getUserFullName(u) || '—'}</strong>
                  </div>
                </td>
                <td style={{ fontSize: '0.82rem' }}>{u.email}</td>
                <td><span className={`status-badge ${u.role === 'ADMIN' ? 'status-info' : u.role === 'SUPER_ADMIN' ? 'status-warning' : 'status-active'}`}>{u.role}</span></td>
                <td><span className={`status-badge ${u.blocked ? 'status-cancelled' : 'status-active'}`}>{u.blocked ? 'Blocked' : 'Active'}</span></td>
                <td style={{ fontSize: '0.82rem' }}>{formatDate(u.createdAt)}</td>
                <td>
                  <div className="row-actions">
                    <button className="btn-view" onClick={() => viewDetail(u)}>View</button>
                    <button className={u.blocked ? 'btn-approve' : 'btn-del'} onClick={() => handleManage(u.id, u.blocked ? 'unblock' : 'block')}>
                      {u.blocked ? 'Unblock' : 'Block'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          onPageChange={setCurrentPage}
          itemLabel="user"
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          pageSizeOptions={pageSizeOptions}
        />
      </div>

      {/* CSV Export Modal */}
      <ExportCSVModal
        isOpen={showExportModal}
        onClose={() => { setShowExportModal(false); setExportStatus(null); setExportError(null); }}
        columns={USER_COLUMNS}
        onExport={handleExportCSV}
        exporting={exporting}
        exportStatus={exportStatus}
        exportError={exportError}
        filename={`users-export-${new Date().toISOString().slice(0, 10)}.csv`}
      />
      </AdminPageShell>
  );
}
