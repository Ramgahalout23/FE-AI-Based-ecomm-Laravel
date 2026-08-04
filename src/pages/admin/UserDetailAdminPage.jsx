import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminAPI } from '../../api/admin';
import { formatDate, formatCurrency, getInitials, getUserFullName } from '../../utils/formatters';
import { USER_ROLES } from '../../utils/constants';
import { ArrowLeft, Mail, Phone, Calendar, Shield, Activity } from 'lucide-react';
import toast from '../../utils/toast';

export default function UserDetailAdminPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      try {
        const r = await adminAPI.getUserDetails(id);
        setUser(r.data?.data || r.data || r);
      } catch {
        toast.error('Failed to load user details');
        navigate('/admin/users');
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [id, navigate]);

  // Fetch user's orders
  useEffect(() => {
    if (!user?.id) return;
    const fetchOrders = async () => {
      setOrdersLoading(true);
      try {
        const r = await adminAPI.getOrders({ userId: user.id, limit: 5 });
        const raw = r.data?.data || r.data || {};
        const list = raw?.orders || raw?.data || [];
        setOrders(Array.isArray(list) ? list : []);
      } catch {
        // silent
      } finally {
        setOrdersLoading(false);
      }
    };
    fetchOrders();
  }, [user?.id]);

  const handleManage = async (action) => {
    try {
      await adminAPI.manageUser(id, { action });
      setUser((prev) => ({ ...prev, blocked: action === 'block' }));
      toast.success(`User ${action}ed successfully`);
    } catch {
      toast.error(`Failed to ${action} user`);
    }
  };

  const handleRole = async (role) => {
    try {
      await adminAPI.updateUserRole(id, { role });
      setUser((prev) => ({ ...prev, role }));
      toast.success(`Role updated to ${role}`);
    } catch {
      toast.error('Failed to update role');
    }
  };

  if (loading) {
    return (
      <div className="loading-page" style={{ padding: '3rem' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div>
      {/* Header */}
      <div className="admin-header admin-header-row">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={() => navigate('/admin/users')}
            className="btn-ghost btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <ArrowLeft size={16} /> Back
          </button>
          <div>
            <h2>User Details</h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
              View and manage user account
            </p>
          </div>
        </div>
      </div>

      {/* User Profile Card */}
      <div className="detail-panel" style={{ marginBottom: '1.5rem' }}>
        <div className="detail-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--gold), var(--gold-dark))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 700,
                fontSize: '1.25rem',
              }}
            >
              {getInitials(user.firstName || user.first_name, user.lastName || user.last_name)}
            </div>
            <div>
              <h3 style={{ margin: 0 }}>
                {getUserFullName(user) || '—'}
              </h3>
              <span style={{ fontSize: '0.85rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.15rem' }}>
                <Mail size={12} /> {user.email}
              </span>
            </div>
          </div>
        </div>

        <div className="detail-grid">
          <div className="detail-item">
            <span className="label"><Shield size={12} /> User ID</span>
            <span className="value" style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{user.id}</span>
          </div>
          <div className="detail-item">
            <span className="label"><Phone size={12} /> Phone</span>
            <span className="value">{user.phone || '—'}</span>
          </div>
          <div className="detail-item">
            <span className="label"><Shield size={12} /> Role</span>
            <span className="value">
              <span className={`status-badge ${user.role === 'ADMIN' ? 'status-info' : user.role === 'SUPER_ADMIN' ? 'status-warning' : 'status-active'}`}>
                {user.role}
              </span>
            </span>
          </div>
          <div className="detail-item">
            <span className="label"><Activity size={12} /> Status</span>
            <span className="value">
              <span className={`status-badge ${user.blocked ? 'status-cancelled' : 'status-active'}`}>
                {user.blocked ? 'Blocked' : 'Active'}
              </span>
            </span>
          </div>
          <div className="detail-item">
            <span className="label"><Calendar size={12} /> Joined</span>
            <span className="value">{formatDate(user.createdAt)}</span>
          </div>
          <div className="detail-item">
            <span className="label"><Mail size={12} /> Email Verified</span>
            <span className="value">{user.emailVerified ? '✅ Yes' : '❌ No'}</span>
          </div>
        </div>

        {/* Actions */}
        <div
          style={{
            marginTop: '1.25rem',
            display: 'flex',
            gap: '0.75rem',
            flexWrap: 'wrap',
            borderTop: '1px solid var(--border)',
            paddingTop: '1rem',
            alignItems: 'center',
          }}
        >
          <button
            className={`btn-sm ${user.blocked ? 'btn-dark' : 'btn-danger'}`}
            onClick={() => handleManage(user.blocked ? 'unblock' : 'block')}
          >
            {user.blocked ? '🔓 Unblock User' : '🔒 Block User'}
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>Change Role:</span>
            <select
              className="table-filter"
              style={{ fontSize: '0.78rem', padding: '0.4rem' }}
              value={user.role}
              onChange={(e) => handleRole(e.target.value)}
            >
              {Object.keys(USER_ROLES)
                .filter((r) => r !== 'ADMIN' && r !== 'SUPER_ADMIN')
                .map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
            </select>
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="table-card">
        <div className="table-head">
          <h3>Recent Orders</h3>
          <button
            className="btn-ghost btn-sm"
            onClick={() => navigate('/admin/orders')}
          >
            View All Orders →
          </button>
        </div>
        {ordersLoading ? (
          <div className="loading-page" style={{ padding: '2rem' }}>
            <div className="spinner" />
          </div>
        ) : orders.length === 0 ? (
          <div className="empty-state" style={{ padding: '2rem' }}>
            <div className="empty-state-icon">📦</div>
            <h3>No orders yet</h3>
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Total</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>
                    #{o.id?.slice(0, 8)}
                  </td>
                  <td style={{ fontWeight: 600 }}>
                    {formatCurrency(o.total || o.totalAmount)}
                  </td>
                  <td>
                    <span className={`status-badge ${o.status === 'DELIVERED' ? 'status-delivered' : o.status === 'CANCELLED' ? 'status-cancelled' : 'status-processing'}`}>
                      {o.status}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.82rem' }}>{formatDate(o.createdAt)}</td>
                  <td>
                    <button
                      className="btn-view"
                      onClick={() => navigate(`/admin/orders/${o.id}`)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
