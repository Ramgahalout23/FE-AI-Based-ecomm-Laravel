import { useState, useEffect } from 'react';
import { adminAPI } from '../../api/admin';
import { NOTIFICATION_TYPES } from '../../utils/constants';
import { formatDateTime } from '../../utils/formatters';
import toast from '../../utils/toast';

const EMPTY = { title: '', message: '', type: 'SYSTEM', targetAudience: 'ALL', selectedUserId: '' };

export default function NotificationsAdminPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [searchUsers, setSearchUsers] = useState('');
  const [userOptions, setUserOptions] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

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

  const load = async (page = 1) => {
    setLoading(true);
    try {
      const r = await adminAPI.getNotifications({ page, limit, search: debouncedSearch || undefined });
      const payload = r.data?.data;
      const list = Array.isArray(payload)
        ? payload
        : payload?.notifications || payload?.items || r.data?.notifications || [];
      setNotifications(Array.isArray(list) ? list : []);
      const pag = r.data?.pagination || payload?.pagination || (payload?.total !== undefined ? { page: payload.page, pages: payload.total_pages, total: payload.total, per_page: payload.limit } : {});
      setCurrentPage(pag.page || page);
      setTotalPages(pag.pages || pag.totalPages || Math.ceil((pag.total || list.length) / limit) || 1);
      setTotalItems(pag.total || list.length);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  // Reset page when search changes
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    } else {
      load(1);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    load(currentPage);
  }, [currentPage]);

  // Resolve target audience -> array of userIds for the bulk endpoint.
  // Backend has no "audience" concept; it requires explicit userIds.
  const resolveAudienceUserIds = async (audience) => {
    // Fetch a large page; backend pagination caps may apply.
    const res = await adminAPI.getAllUsers({ page: 1, limit: 1000 });
    const payload = res.data?.data;
    const users = Array.isArray(payload)
      ? payload
      : payload?.users || payload?.items || [];
    let filtered = users;
    if (audience === 'VIP') {
      // Best-effort: prefer a flag if present, else fall back to all
      filtered = users.filter((u) => u.isVip || u.vip || u.tier === 'VIP');
      if (filtered.length === 0) filtered = users;
    } else if (audience === 'NEW_USERS') {
      const thirtyDaysAgo = Date.now() - 30 
      * 24 * 60 * 60 * 1000;
      filtered = users.filter((u) => {
        const created = u.createdAt ? new Date(u.createdAt).getTime() : 0;
        return created >= thirtyDaysAgo;
      });
    }
    return filtered.map((u) => u.id).filter(Boolean);
  };

  const validateForm = () => {
    if (!form.title || form.title.trim().length < 3) {
      toast.error('Title must be at least 3 characters');
      return false;
    }
    if (!form.message || form.message.trim().length < 5) {
      toast.error('Message must be at least 5 characters');
      return false;
    }
    return true;
  };

  const handleSend = async () => {
    if (!validateForm()) return;
    try {
      // If sending to a specific user, use the single notification endpoint
      if (form.targetAudience === 'SPECIFIC_USER') {
        if (!form.selectedUserId) {
          toast.error('Please select a user');
          return;
        }
        await adminAPI.sendNotification({
          userId: form.selectedUserId,
          type: form.type,
          title: form.title,
          message: form.message,
        });
        setShowModal(false);
        setForm(EMPTY);
        toast.success('Notification sent to selected user');
        await load(currentPage);
        return;
      }

      // For bulk audiences (ALL, VIP, NEW_USERS)
      const userIds = await resolveAudienceUserIds(form.targetAudience);
      if (userIds.length === 0) {
        toast.error('No recipients match the selected audience');
        return;
      }
      // Backend POST /notifications requires single userId; use /bulk for multiple.
      await adminAPI.sendBulkNotification({
        userIds,
        type: form.type,
        title: form.title,
        message: form.message,
      });
      setShowModal(false);
      setForm(EMPTY);
      toast.success(`Notification sent to ${userIds.length} user(s)`);
      await load(currentPage);
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to send';
      toast.error(msg);
    }
  };

  const handleSchedule = async () => {
    // Backend does not support scheduling. Inform admin instead of silently
    // creating an immediate notification labeled "scheduled".
    toast.error('Scheduling is not supported by the backend yet');
  };

  const handleDelete = async (id) => {
    try { 
      await adminAPI.deleteNotification(id); 
      setNotifications(notifications.filter(n => n.id !== id)); 
      toast.success('Deleted'); 
      await load(currentPage);
    } catch { 
      toast.error('Failed'); 
    }
  };

  const handleTargetAudienceChange = (e) => {
    const value = e.target.value;
    if (value !== 'SPECIFIC_USER') {
      setForm({ ...form, targetAudience: value, selectedUserId: '' });
      setSelectedUserId('');
      setUserOptions([]);
    } else {
      setForm({ ...form, targetAudience: value });
    }
  };

  const handleUserSearch = (e) => {
    setSearchUsers(e.target.value);
  };

  useEffect(() => {
    const fetchUsers = async () => {
      if (!searchUsers.trim()) {
        setUserOptions([]);
        return;
      }
      setLoadingUsers(true);
      try {
        const res = await adminAPI.getAllUsers({
          page: 1,
          limit: 10,
          search: searchUsers,
        });
        const payload = res.data?.data;
        const users = Array.isArray(payload)
          ? payload
          : payload?.users || payload?.items || [];
        setUserOptions(
          users.map((u) => ({
            value: u.id,
            label: u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
            email: u.email,
          }))
        );
      } catch (err) {
        console.error('Failed to fetch users:', err);
        setUserOptions([]);
      } finally {
        setLoadingUsers(false);
      }
    };
    const handler = setTimeout(fetchUsers, 300);
    return () => clearTimeout(handler);
  }, [searchUsers]);

  const handleUserSelect = (userId) => {
    setSelectedUserId(userId);
    setForm({ ...form, selectedUserId: userId });
    setSearchUsers('');
    setUserOptions([]);
  };

  const clearUserSelection = () => {
    setSelectedUserId('');
    setForm({ ...form, selectedUserId: '' });
    setSearchUsers('');
    setUserOptions([]);
  };

  return (
    <div>
      <div className="admin-header admin-header-row">
        <div><h2>Notifications</h2><p>Send and manage push notifications</p></div>
        <button className="btn-dark btn-sm" onClick={() => setShowModal(true)}>📢 New Notification</button>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="stat-card"><div className="stat-icon orders">📤</div><div className="stat-label">Total Sent</div><div className="stat-val">{notifications.length}</div></div>
        <div className="stat-card"><div className="stat-icon users">📨</div><div className="stat-label">Promotional</div><div className="stat-val">{notifications.filter(n => n.type === 'PROMOTION').length}</div></div>
        <div className="stat-card"><div className="stat-icon revenue">⚙️</div><div className="stat-label">System</div><div className="stat-val">{notifications.filter(n => n.type === 'SYSTEM').length}</div></div>
      </div>

      <div className="table-card">
        <div className="table-toolbar">
          <input className="table-search" placeholder="Search notifications..." value={search} onChange={e => setSearch(e.target.value)} autoComplete="off" />
          <span className="table-count">{totalItems} notifications</span>
        </div>
        <table className="admin-table">
          <thead><tr><th>Title</th><th>Message</th><th>Type</th><th>Target</th><th>Sent At</th><th>Actions</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={6}><div className="loading-page" style={{ padding: '2rem' }}><div className="spinner" /></div></td></tr> :
            notifications.length === 0 ? <tr><td colSpan={6}><div className="empty-state"><div className="empty-state-icon">🔔</div><h3>No notifications</h3></div></td></tr> :
            notifications.map(n => (
              <tr key={n.id}>
                <td><strong>{n.title}</strong></td>
                <td style={{ maxWidth: 280, fontSize: '0.82rem', color: 'var(--muted)' }}>{n.message || n.body || '—'}</td>
                <td><span className={`status-badge ${n.type === 'PROMOTION' ? 'status-info' : n.type === 'ORDER' ? 'status-active' : 'status-pending'}`}>{n.type}</span></td>
                <td>{n.targetAudience || 'ALL'}</td>
                <td style={{ fontSize: '0.82rem' }}>{formatDateTime(n.createdAt)}</td>
                <td><div className="row-actions"><button className="btn-del" onClick={() => handleDelete(n.id)}>Delete</button></div></td>
              </tr>
            ))}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="pagination-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', padding: '1rem', borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({totalItems} notifications)</span>
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

      {showModal && (
        <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header"><h3>📢 Send Notification</h3><button className="modal-close" onClick={() => setShowModal(false)}>✕</button></div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group"><label>Title</label><input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Flash Sale Alert!" /></div>
                <div className="form-group"><label>Type</label><select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>{NOTIFICATION_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
                <div className="form-group">
                  <label>Target</label>
                  <select
                    value={form.targetAudience}
                    onChange={handleTargetAudienceChange}
                  >
                    <option value="ALL">ALL</option>
                    <option value="VIP">VIP</option>
                    <option value="NEW_USERS">NEW_USERS</option>
                    <option value="SPECIFIC_USER">SPECIFIC_USER</option>
                  </select>
                </div>

                {form.targetAudience === 'SPECIFIC_USER' && (
                  <div className="form-group form-full">
                    <label>Recipient</label>
                    {selectedUserId ? (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.75rem',
                          padding: '0.75rem 1rem',
                          background: 'var(--off-white, #f7f7f7)',
                          border: '1px solid var(--border, #e5e5e5)',
                          borderRadius: '8px',
                        }}
                      >
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>
                            Selected user
                          </div>
                          <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {userOptions.find(opt => opt.value === selectedUserId)?.label || 'Selected user'}
                          </div>
                          {userOptions.find(opt => opt.value === selectedUserId)?.email && (
                            <div style={{ fontSize: '0.8rem', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {userOptions.find(opt => opt.value === selectedUserId)?.email}
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          className="btn-ghost btn-sm"
                          onClick={clearUserSelection}
                        >
                          Change
                        </button>
                      </div>
                    ) : (
                      <>
                        <div style={{ position: 'relative' }}>
                          <input
                            type="text"
                            placeholder="Search users by name or email..."
                            value={searchUsers}
                            onChange={handleUserSearch}
                            autoComplete="off"
                          />
                          {loadingUsers && (
                            <span
                              style={{
                                position: 'absolute',
                                right: 12,
                                top: '50%',
                                transform: 'translateY(-50%)',
                                fontSize: '0.75rem',
                                color: 'var(--muted)',
                              }}
                            >
                              Searching…
                            </span>
                          )}
                        </div>

                        {userOptions.length > 0 && (
                          <div
                            style={{
                              maxHeight: '200px',
                              overflowY: 'auto',
                              marginTop: '0.5rem',
                              border: '1px solid var(--border, #e5e5e5)',
                              borderRadius: '8px',
                              background: '#fff',
                            }}
                          >
                            {userOptions.map((option, idx) => (
                              <div
                                key={option.value}
                                onClick={() => handleUserSelect(option.value)}
                                style={{
                                  padding: '0.6rem 0.75rem',
                                  cursor: 'pointer',
                                  borderTop: idx === 0 ? 'none' : '1px solid var(--border, #eee)',
                                }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'var(--off-white, #f7f7f7)')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                              >
                                <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{option.label}</div>
                                {option.email && (
                                  <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{option.email}</div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {searchUsers.trim() && !loadingUsers && userOptions.length === 0 && (
                          <div
                            style={{
                              marginTop: '0.5rem',
                              padding: '0.75rem',
                              textAlign: 'center',
                              color: 'var(--muted)',
                              fontSize: '0.85rem',
                              border: '1px dashed var(--border, #e5e5e5)',
                              borderRadius: '8px',
                            }}
                          >
                            No users match "{searchUsers}".
                          </div>
                        )}

                        {!searchUsers.trim() && (
                          <div style={{ marginTop: '0.4rem', fontSize: '0.78rem', color: 'var(--muted)' }}>
                            Type a name or email to find a user.
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
                
                <div className="form-group form-full">
                  <label>Message</label>
                  <textarea 
                    rows={3} 
                    value={form.message} 
                    onChange={e => setForm({ ...form, message: e.target.value })} 
                    placeholder="Your notification message..."
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-ghost btn-sm" onClick={handleSchedule}>⏰ Schedule</button>
              <button className="btn-dark btn-sm" onClick={handleSend}>📤 Send Now</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
