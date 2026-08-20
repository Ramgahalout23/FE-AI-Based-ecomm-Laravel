import { useState, useEffect } from 'react';
import '../../styles/admin-staff.css';
import { adminAPI } from '../../api/admin';
import PasswordInput from '../../components/common/PasswordInput';
import AdminFormField from '../../components/admin/AdminFormField';
import SaveButton from '../../components/admin/SaveButton';
import ActionButton from '../../components/admin/ActionButton';
import PasswordStrengthMeter from '../../components/admin/PasswordStrengthMeter';
import { useAdminFormValidation } from '../../hooks/useAdminFormValidation';
import { requiredField, emailAddress, passwordPolicy } from '../../hooks/validationRules';
import { formatDate } from '../../utils/formatters';
import toast from '../../utils/toast';

/**
 * Defined permissions that can be assigned to MANAGER-role users.
 * Grouped by module for a clear UI.
 */
const PERMISSION_GROUPS = [
  {
    module: 'Dashboard & Analytics',
    permissions: [
      { key: 'dashboard:view', label: 'View Dashboard' },
      { key: 'analytics:view', label: 'View Analytics' },
      { key: 'reports:view', label: 'View Reports' },
    ],
  },
  {
    module: 'Products',
    permissions: [
      { key: 'product:view', label: 'View Products' },
      { key: 'product:create', label: 'Create Products' },
      { key: 'product:update', label: 'Update Products' },
      { key: 'product:delete', label: 'Delete Products' },
      { key: 'product:publish', label: 'Publish Products' },
      { key: 'product:import', label: 'Import Products (CSV)' },
    ],
  },
  {
    module: 'Product Variants',
    permissions: [
      { key: 'variant:view', label: 'View Variants' },
      { key: 'variant:create', label: 'Create Variants' },
      { key: 'variant:update', label: 'Update Variants' },
      { key: 'variant:delete', label: 'Delete Variants' },
    ],
  },
  {
    module: 'Categories',
    permissions: [
      { key: 'category:view', label: 'View Categories' },
      { key: 'category:create', label: 'Create Categories' },
      { key: 'category:update', label: 'Update Categories' },
      { key: 'category:delete', label: 'Delete Categories' },
    ],
  },
  {
    module: 'Brands',
    permissions: [
      { key: 'brand:view', label: 'View Brands' },
      { key: 'brand:create', label: 'Create Brands' },
      { key: 'brand:update', label: 'Update Brands' },
      { key: 'brand:delete', label: 'Delete Brands' },
    ],
  },
  {
    module: 'Orders',
    permissions: [
      { key: 'order:view', label: 'View Orders' },
      { key: 'order:view:all', label: 'View All Orders' },
      { key: 'order:update', label: 'Update Orders' },
      { key: 'order:cancel', label: 'Cancel Orders' },
      { key: 'order:refund', label: 'Refund Orders' },
    ],
  },
  {
    module: 'Payments',
    permissions: [
      { key: 'payment:view', label: 'View Payments' },
      { key: 'payment:refund', label: 'Process Refunds' },
    ],
  },
  {
    module: 'Returns & Refunds',
    permissions: [
      { key: 'return:view', label: 'View Returns' },
      { key: 'return:process', label: 'Process Returns' },
    ],
  },
  {
    module: 'Inventory',
    permissions: [
      { key: 'inventory:view', label: 'View Inventory' },
      { key: 'inventory:view:all', label: 'View All Inventory' },
      { key: 'inventory:update', label: 'Update Inventory' },
    ],
  },
  {
    module: 'Users',
    permissions: [
      { key: 'user:view', label: 'View Users' },
      { key: 'user:create', label: 'Create Users' },
      { key: 'user:update', label: 'Update Users' },
      { key: 'user:block', label: 'Block Users' },
    ],
  },
  {
    module: 'Staff',
    permissions: [
      { key: 'staff:view', label: 'View Staff' },
      { key: 'staff:create', label: 'Add Staff' },
      { key: 'staff:update', label: 'Update Staff' },
      { key: 'staff:delete', label: 'Remove Staff' },
    ],
  },
  {
    module: 'Reviews',
    permissions: [
      { key: 'review:view', label: 'View Reviews' },
      { key: 'review:moderate', label: 'Moderate Reviews' },
    ],
  },
  {
    module: 'Coupons',
    permissions: [
      { key: 'coupon:view', label: 'View Coupons' },
      { key: 'coupon:create', label: 'Create Coupons' },
      { key: 'coupon:update', label: 'Update Coupons' },
      { key: 'coupon:delete', label: 'Delete Coupons' },
    ],
  },
  {
    module: 'Promotions',
    permissions: [
      { key: 'promotion:view', label: 'View Promotions' },
      { key: 'promotion:create', label: 'Create Promotions' },
      { key: 'promotion:update', label: 'Update Promotions' },
      { key: 'promotion:delete', label: 'Delete Promotions' },
    ],
  },
  {
    module: 'Banners',
    permissions: [
      { key: 'banner:view', label: 'View Banners' },
      { key: 'banner:create', label: 'Create Banners' },
      { key: 'banner:update', label: 'Update Banners' },
      { key: 'banner:delete', label: 'Delete Banners' },
    ],
  },
  {
    module: 'Shipping',
    permissions: [
      { key: 'shipping:view', label: 'View Shipping' },
      { key: 'shipping:update', label: 'Update Shipping' },
    ],
  },
  {
    module: 'Tax',
    permissions: [
      { key: 'tax:view', label: 'View Tax Rates' },
      { key: 'tax:update', label: 'Update Tax Rates' },
    ],
  },
  {
    module: 'Support Tickets',
    permissions: [
      { key: 'ticket:view', label: 'View Tickets' },
      { key: 'ticket:update', label: 'Manage Tickets' },
      { key: 'ticket:close', label: 'Close Tickets' },
    ],
  },
  {
    module: 'Pages & CMS',
    permissions: [
      { key: 'page:view', label: 'View Pages' },
      { key: 'page:create', label: 'Create Pages' },
      { key: 'page:update', label: 'Update Pages' },
      { key: 'page:delete', label: 'Delete Pages' },
    ],
  },
  {
    module: 'Content — Reels',
    permissions: [
      { key: 'reel:view', label: 'View Reels' },
      { key: 'reel:create', label: 'Create Reels' },
      { key: 'reel:update', label: 'Update Reels' },
      { key: 'reel:delete', label: 'Delete Reels' },
    ],
  },
  {
    module: 'Content — Curated Looks',
    permissions: [
      { key: 'curated_look:view', label: 'View Curated Looks' },
      { key: 'curated_look:create', label: 'Create Curated Looks' },
      { key: 'curated_look:update', label: 'Update Curated Looks' },
      { key: 'curated_look:delete', label: 'Delete Curated Looks' },
    ],
  },
  {
    module: 'Content — Custom Designs',
    permissions: [
      { key: 'custom_design:view', label: 'View Custom Designs' },
      { key: 'custom_design:moderate', label: 'Moderate Custom Designs' },
    ],
  },
  {
    module: 'SEO',
    permissions: [
      { key: 'seo:view', label: 'View SEO' },
      { key: 'seo:update', label: 'Update SEO' },
    ],
  },
  {
    module: 'Notifications',
    permissions: [
      { key: 'notification:view', label: 'View Notifications' },
      { key: 'notification:send', label: 'Send Notifications' },
    ],
  },
  {
    module: 'Email Templates',
    permissions: [
      { key: 'email_template:view', label: 'View Templates' },
      { key: 'email_template:update', label: 'Edit Templates' },
    ],
  },
  {
    module: 'Notification Templates',
    permissions: [
      { key: 'notification_template:view', label: 'View Templates' },
      { key: 'notification_template:update', label: 'Edit Templates' },
    ],
  },
  {
    module: 'Marketing & Campaigns',
    permissions: [
      { key: 'marketing:view', label: 'View Marketing' },
      { key: 'marketing:create', label: 'Create Campaigns' },
      { key: 'marketing:update', label: 'Update Campaigns' },
    ],
  },
  {
    module: 'Abandoned Carts',
    permissions: [
      { key: 'abandoned_cart:view', label: 'View Abandoned Carts' },
      { key: 'abandoned_cart:manage', label: 'Manage Abandoned Carts' },
    ],
  },
  {
    module: 'Settings',
    permissions: [
      { key: 'settings:view', label: 'View Settings' },
      { key: 'settings:update', label: 'Update Settings' },
    ],
  },
  {
    module: 'Translations',
    permissions: [
      { key: 'translation:view', label: 'View Translations' },
      { key: 'translation:update', label: 'Update Translations' },
    ],
  },
  {
    module: 'Currencies',
    permissions: [
      { key: 'currency:view', label: 'View Currencies' },
      { key: 'currency:update', label: 'Manage Currencies' },
    ],
  },
  {
    module: 'Webhooks',
    permissions: [
      { key: 'webhook:view', label: 'View Webhooks' },
      { key: 'webhook:create', label: 'Create Webhooks' },
      { key: 'webhook:update', label: 'Update Webhooks' },
      { key: 'webhook:delete', label: 'Delete Webhooks' },
    ],
  },
  {
    module: 'Backups & Logs',
    permissions: [
      { key: 'backup:view', label: 'View Backups' },
      { key: 'backup:create', label: 'Create Backups' },
      { key: 'audit_log:view', label: 'View Audit Logs' },
      { key: 'system_log:view', label: 'View System Logs' },
    ],
  },
];

const ALL_ROLES = [
  { id: 'SUPPORT_AGENT', label: 'Support Agent', desc: 'Can manage orders, users, tickets, and products with specific permissions' },
  { id: 'FINANCE', label: 'Finance', desc: 'Can view analytics, orders, and payments with specific permissions' },
];

export default function StaffAdminPage() {
  // Only SUPPORT_AGENT and FINANCE roles are available for assignment
  const ROLES = ALL_ROLES;

  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', role: 'SUPPORT_AGENT', status: 'ACTIVE', permissions: [] });
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  // Only the setter is used — the per-module select-all state is derived
  // from `selectedPermissions` at render time.
  const [, setSelectAllByModule] = useState({});

  // ── Inline form validation ──
  // Password is optional (blank = auto-generate), but when filled it must meet
  // the same security rules the backend enforces.
  const validation = useAdminFormValidation({
    firstName: requiredField('First name'),
    lastName: requiredField('Last name'),
    email: emailAddress(),
    password: passwordPolicy(),
  });

  const currentRoleIsManager = form.role === 'SUPPORT_AGENT' || form.role === 'FINANCE';

  const load = async () => {
    try {
      const r = await adminAPI.getStaff();
      const list = r.data?.data?.staff || r.data?.staff || r.data?.data || [];
      setStaff(Array.isArray(list) ? list : []);
    } catch (e) { setError('Failed to load staff'); console.warn('Failed to load staff:', e); } finally { setLoading(false); }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ firstName: '', lastName: '', email: '', password: '', role: 'SUPPORT_AGENT', status: 'ACTIVE', permissions: [] });
    setSelectedPermissions([]);
    setSelectAllByModule({});
    validation.reset();
    setShowModal(true);
  };
  const openEdit = (s) => {          const existingPerms = Array.isArray(s.permissions) ? s.permissions : [];
    setSelectedPermissions(existingPerms);
    // The backend now accepts SUPPORT_AGENT and FINANCE directly
    const defaultRole = ROLES.find(r => r.id === s.role) ? s.role : 'SUPPORT_AGENT';
    setEditing(s);
    const staffStatus = s.is_active !== false ? 'ACTIVE' : 'REVOKED';
    setForm({ firstName: s.firstName || s.first_name || '', lastName: s.lastName || s.last_name || '', email: s.email || '', password: '', role: defaultRole, status: staffStatus, permissions: existingPerms });
    // Init selectAll state from existing permissions
    const moduleState = {};
    PERMISSION_GROUPS.forEach((group) => {
      const allKeys = group.permissions.map((p) => p.key);
      moduleState[group.module] = allKeys.every((k) => existingPerms.includes(k));
    });
    setSelectAllByModule(moduleState);
    validation.reset();
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!validation.validateForm(form)) return;
    try {
      const payload = {
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim(),
        email: form.email.trim(),
        // The backend now accepts SUPPORT_AGENT and FINANCE directly
        role: form.role,
        // Map frontend status string (ACTIVE/REVOKED) to backend is_active boolean
        is_active: form.status === 'ACTIVE',
        permissions: selectedPermissions,
      };
      // Include password only when creating new staff (backend expects it for new users)
      if (!editing && form.password) {
        payload.password = form.password;
      }
      if (editing) {
        await adminAPI.updateStaff(editing.id, payload);
        // When an admin sets a password on an existing staff member, route it
        // through the same-policy reset endpoint (never the plain profile
        // update) so the shared PasswordPolicy can't be bypassed.
        if (form.password) {
          await adminAPI.resetStaffPassword(editing.id, form.password);
          toast.success('Staff member updated — password reset');
        } else {
          toast.success('Staff member updated');
        }
      } else {
        await adminAPI.createStaff(payload);
        toast.success('Staff member added');
      }
      await load();
      return true;
    } catch { toast.error('Failed to save staff member'); return false; }
  };

  const togglePermission = (key) => {
    setSelectedPermissions((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key],
    );
  };

  const toggleModulePermissions = (moduleName, keys) => {
    const isAllSelected = keys.every((k) => selectedPermissions.includes(k));
    setSelectedPermissions((prev) =>
      isAllSelected ? prev.filter((p) => !keys.includes(p)) : [...new Set([...prev, ...keys])],
    );
    setSelectAllByModule((prev) => ({
      ...prev,
      [moduleName]: !isAllSelected,
    }));
  };

  const handleRevoke = async (id) => {
    try { 
      await adminAPI.updateStaff(id, { is_active: false }); 
      toast.success('Access revoked'); 
      await load();
      return true;
    } catch { 
      toast.error('Failed'); 
      return false;
    }
  };

  return (
    <div>
      <div className="admin-header admin-header-row">
        <div><h2>Staff & Permissions</h2><p>Manage admin access and role-based permissions</p></div>
        <button className="btn-dark btn-sm" onClick={openCreate}>+ Add Staff</button>
      </div>

      {error && <div className="admin-alert danger mb-4"><span className="admin-alert-icon">⚠️</span><div className="admin-alert-body"><div className="admin-alert-title">Error Loading Data</div><div>{error}</div></div></div>}
      <div className="table-card">
        <div className="table-head"><h3>Active Staff Accounts</h3></div>
        <table className="admin-table">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Last Active</th><th>Actions</th></tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6}><div className="loading-page" style={{ padding: '2rem' }}><div className="spinner" /></div></td></tr>
            ) : staff.length === 0 ? (
              <tr><td colSpan={6}><div className="empty-state"><div className="empty-state-icon">🛡️</div><h3>No staff accounts</h3></div></td></tr>
            ) : staff.map(s => (
              <tr key={s.id}>
                <td><strong>{s.firstName || s.first_name || 'Staff'} {s.lastName || s.last_name || ''}</strong></td>
                <td style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>{s.email}</td>
                <td><span className="status-badge" style={{ background: 'var(--off-white)', color: 'var(--charcoal)', border: '1px solid var(--border)' }}>
                  {ALL_ROLES.find(r => r.id === s.role)?.label || s.role}
                </span></td>
                <td><span className={`status-badge ${s.is_active !== false ? 'status-active' : 'status-cancelled'}`}>{s.is_active !== false ? 'Active' : 'Revoked'}</span></td>
                <td style={{ fontSize: '0.82rem' }}>{s.last_login_at ? formatDate(s.last_login_at) : s.updatedAt ? formatDate(s.updatedAt) : '—'}</td>
                <td>
                  <div className="row-actions">
                    <button className="btn-edit" onClick={() => openEdit(s)}>Edit</button>
                    {s.is_active !== false && <ActionButton className="btn-del" confirm="Revoke access for this user? They will no longer be able to log in." onClick={() => handleRevoke(s.id)} idle="Revoke" />}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>              {showModal && (
        <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal staff-modal" style={{ maxWidth: 600 }}>
            <div className="modal-header"><h3>{editing ? '✏️ Edit Staff Account' : '🛡️ Add Staff Account'}</h3><button className="modal-close" onClick={() => setShowModal(false)}>✕</button></div>
            <div className="modal-body">
              <AdminFormField label="First Name" required error={validation.errors.firstName} valid={validation.validFields.firstName}>
                <input value={form.firstName} onChange={e => { setForm({ ...form, firstName: e.target.value }); validation.handleChange('firstName', e.target.value); }} placeholder="Jane" autoComplete="given-name" />
              </AdminFormField>
              <AdminFormField label="Last Name" required error={validation.errors.lastName} valid={validation.validFields.lastName}>
                <input value={form.lastName} onChange={e => { setForm({ ...form, lastName: e.target.value }); validation.handleChange('lastName', e.target.value); }} placeholder="Doe" autoComplete="family-name" />
              </AdminFormField>
              <AdminFormField label="Email Address" required error={validation.errors.email} valid={validation.validFields.email}>
                <input type="email" value={form.email} onChange={e => { setForm({ ...form, email: e.target.value }); validation.handleChange('email', e.target.value); }} placeholder="jane@luxe.com" autoComplete="email" />
              </AdminFormField>
              {!editing ? (
                <>
                  <AdminFormField label="Password" error={validation.errors.password} valid={validation.validFields.password}>
                    <PasswordInput value={form.password} onChange={e => { setForm({ ...form, password: e.target.value }); validation.handleChange('password', e.target.value); }} placeholder="Min. 8 characters" autoComplete="new-password" minLength={8} />
                  </AdminFormField>
                  <PasswordStrengthMeter value={form.password} />
                  <p style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '0.35rem' }}>Leave blank to auto-generate a random password</p>
                </>
              ) : (
                <div style={{ borderTop: '1px solid var(--border)', marginTop: '0.5rem', paddingTop: '1rem' }}>
                  <AdminFormField label="Reset Password" error={validation.errors.password} valid={form.password && validation.validFields.password}>
                    <PasswordInput value={form.password} onChange={e => { setForm({ ...form, password: e.target.value }); validation.handleChange('password', e.target.value); }} placeholder="Leave blank to keep current password" autoComplete="new-password" minLength={8} />
                  </AdminFormField>
                  {form.password && <PasswordStrengthMeter value={form.password} />}
                  <p style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '0.35rem' }}>Filling this enforces the same password policy and signs out all of this staff member's sessions.</p>
                </div>
              )}
              <div className="form-group form-full">
                <label>Assigned Role</label>
                <div className="role-radio-group">
                  {ROLES.map(r => (
                    <label key={r.id} className={`role-radio ${form.role === r.id ? 'role-radio-active' : ''}`}>
                      <input type="radio" name="role" value={r.id} checked={form.role === r.id} onChange={e => { setForm({ ...form, role: e.target.value, permissions: [] }); setSelectedPermissions([]); setSelectAllByModule({}); }} />
                      <div>
                        <div className="role-radio-label">{r.label}</div>
                        <div className="role-radio-desc">{r.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {currentRoleIsManager && (
                <div className="form-group form-full" style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                  <label>Granular Permissions</label>
                  <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: '0.75rem' }}>
                    Select specific permissions for this staff member. Only granted permissions will be available.
                  </p>

                  <div className="permissions-grid">
                    {PERMISSION_GROUPS.map((group) => {
                      const allSelected = group.permissions.every((p) => selectedPermissions.includes(p.key));
                      return (
                        <div key={group.module} className="permission-group">
                          <div className="permission-group-header">
                            <span className="permission-group-title">{group.module}</span>
                            <button
                              className="btn-select-all"
                              onClick={() => toggleModulePermissions(group.module, group.permissions.map(p => p.key))}
                            >
                              {allSelected ? 'Deselect All' : 'Select All'}
                            </button>
                          </div>
                          <div className="permission-checkboxes">
                            {group.permissions.map((perm) => (
                              <label key={perm.key} className="permission-checkbox-label">
                                <input
                                  type="checkbox"
                                  checked={selectedPermissions.includes(perm.key)}
                                  onChange={() => togglePermission(perm.key)}
                                />
                                <span>{perm.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {selectedPermissions.length > 0 && (
                    <div className="selected-permissions-summary">
                      <span className="selected-count">{selectedPermissions.length} permission{selectedPermissions.length !== 1 ? 's' : ''} selected</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="modal-footer"><button className="btn-ghost btn-sm" onClick={() => setShowModal(false)}>Cancel</button><SaveButton onClick={handleSave} onSuccess={() => setShowModal(false)} idleLabel={editing ? 'Update Access' : 'Send Invite'} /></div>
          </div>
        </div>
      )}
    </div>
  );
}
