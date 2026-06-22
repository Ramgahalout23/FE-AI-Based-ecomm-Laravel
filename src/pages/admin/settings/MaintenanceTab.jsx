import toast from '../../../utils/toast';

function ScheduleModal({ show, onClose, editingSchedule, scheduleForm, setScheduleForm, loading, handleCreateSchedule, handleUpdateSchedule, resetScheduleForm }) {
  if (!show) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(4px)',
      display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999,
    }}>
      <div className="detail-panel" style={{
        width: '90%', maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto',
        boxShadow: 'var(--shadow-xl)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', margin: 'auto',
      }}>
        <div className="detail-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>{editingSchedule ? 'Edit Schedule' : 'Create Maintenance Schedule'}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--muted)' }}>&times;</button>
        </div>

        <div className="form-grid" style={{ marginTop: '1rem' }}>
          <div className="form-group form-full">
            <label>Title *</label>
            <input value={scheduleForm.title} onChange={e => setScheduleForm({ ...scheduleForm, title: e.target.value })} placeholder="e.g. Weekly Database Maintenance" />
          </div>
          <div className="form-group form-full">
            <label>Maintenance Message (optional)</label>
            <textarea rows={2} value={scheduleForm.message} onChange={e => setScheduleForm({ ...scheduleForm, message: e.target.value })} placeholder="We are performing scheduled maintenance..." />
          </div>
          <div className="form-group form-full">
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={scheduleForm.isRecurring} onChange={e => setScheduleForm({ ...scheduleForm, isRecurring: e.target.checked })} />
              <strong>Recurring Schedule</strong>
            </label>
            <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Recurring schedules run automatically on the selected days/times without manual intervention.</span>
          </div>
          {scheduleForm.isRecurring ? (
            <>
              <div className="form-group form-full">
                <label>Recurring Days</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(day => {
                    const selected = scheduleForm.recurringDays.split(',').map(d => d.trim()).includes(day);
                    return (
                      <button key={day} type="button" onClick={() => {
                        const days = scheduleForm.recurringDays.split(',').map(d => d.trim()).filter(Boolean);
                        const updated = selected ? days.filter(d => d !== day) : [...days, day];
                        setScheduleForm({ ...scheduleForm, recurringDays: updated.join(',') });
                      }} style={{
                        padding: '0.35rem 0.65rem', borderRadius: '6px',
                        border: selected ? '2px solid var(--charcoal)' : '1px solid var(--border)',
                        background: selected ? 'var(--charcoal)' : 'var(--off-white)',
                        color: selected ? 'white' : 'var(--charcoal)', cursor: 'pointer',
                        fontSize: '0.78rem', fontWeight: selected ? 600 : 400,
                      }}>{day.slice(0, 3)}</button>
                    );
                  })}
                </div>
              </div>
              <div className="form-group"><label>Start Time</label><input type="time" value={scheduleForm.timeStart} onChange={e => setScheduleForm({ ...scheduleForm, timeStart: e.target.value })} /></div>
              <div className="form-group"><label>End Time</label><input type="time" value={scheduleForm.timeEnd} onChange={e => setScheduleForm({ ...scheduleForm, timeEnd: e.target.value })} /></div>
            </>
          ) : (
            <>
              <div className="form-group"><label>Start Date & Time</label><input type="datetime-local" value={scheduleForm.startsAt} onChange={e => setScheduleForm({ ...scheduleForm, startsAt: e.target.value })} /></div>
              <div className="form-group"><label>End Date & Time</label><input type="datetime-local" value={scheduleForm.endsAt} onChange={e => setScheduleForm({ ...scheduleForm, endsAt: e.target.value })} /><span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Leave empty for indefinite maintenance (turn off manually)</span></div>
            </>
          )}
        </div>

        <div className="form-actions" style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
          <button className="btn-ghost btn-sm" onClick={onClose}>Cancel</button>
          <button className="btn-dark btn-sm" onClick={editingSchedule ? handleUpdateSchedule : handleCreateSchedule} disabled={loading || !scheduleForm.title.trim()}>
            {loading ? 'Saving...' : editingSchedule ? 'Update Schedule' : 'Create Schedule'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MaintenanceTab({
  settings, setSettings, loading, handleSaveSettings, handleQuickToggleMaintenance,
  schedules, schedulesLoading, showScheduleModal, setShowScheduleModal,
  editingSchedule, setEditingSchedule, scheduleForm, setScheduleForm,
  handleCreateSchedule, handleUpdateSchedule, handleDeleteSchedule,
  handleToggleSchedule, openEditSchedule, resetScheduleForm, formatScheduleDate, settingsAPI
}) {
  return (
    <div>
      <div className="detail-panel">
        <div className="detail-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <h3>Maintenance Mode</h3>
            <span className={`status-badge ${settings.maintenanceMode === 'true' ? 'status-active' : 'status-pending'}`}>
              {settings.maintenanceMode === 'true' ? 'Active' : 'Disabled'}
            </span>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={settings.maintenanceMode === 'true'} onChange={e => setSettings({ ...settings, maintenanceMode: e.target.checked ? 'true' : 'false' })} />
            <strong>Enable Maintenance Mode</strong>
          </label>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '1.5rem' }}>
          When enabled, only admin users and allowed IPs can access the storefront. All other visitors will see a maintenance page.
        </p>
        <div className="form-grid">
          <div className="form-group form-full">
            <label>Maintenance Message</label>
            <textarea rows={3} value={settings.maintenanceMessage || 'We are currently under maintenance. Please check back soon.'}
              onChange={e => setSettings({ ...settings, maintenanceMessage: e.target.value })}
              placeholder="We are currently under maintenance. Please check back soon."
              disabled={settings.maintenanceMode !== 'true'} />
            <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>This message will be shown to visitors when maintenance mode is active.</span>
          </div>
          <div className="form-group form-full">
            <label>Allowed IP Addresses (Bypass Maintenance)</label>
            <textarea rows={2} value={settings.maintenanceAllowedIPs || ''}
              onChange={e => setSettings({ ...settings, maintenanceAllowedIPs: e.target.value })}
              placeholder="127.0.0.1,203.0.113.1"
              disabled={settings.maintenanceMode !== 'true'} />
            <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Comma-separated list of IP addresses that can bypass maintenance mode.</span>
          </div>
        </div>
        <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <strong style={{ fontSize: '0.85rem' }}>Maintenance Page Preview</strong>
            <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Non-admin users will see this page</span>
          </div>
          <div style={{
            background: '#f8f6f3', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
            padding: '2rem', textAlign: 'center',
            opacity: settings.maintenanceMode === 'true' ? 1 : 0.5, transition: 'opacity 0.3s ease',
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🛠️</div>
            <div style={{ display: 'inline-block', background: 'rgba(234,179,8,0.1)', color: '#ca8a04', fontSize: '0.7rem', fontWeight: 'bold', padding: '0.25rem 1rem', borderRadius: '9999px', marginBottom: '1rem', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              We'll Be Back Soon
            </div>
            <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Site Under Maintenance</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--muted)', maxWidth: '400px', margin: '0 auto' }}>
              {settings.maintenanceMode === 'true'
                ? (settings.maintenanceMessage || 'We are currently under maintenance. Please check back soon.')
                : 'Preview will appear once maintenance mode is enabled.'}
            </p>
          </div>
        </div>
        <div className="form-actions" style={{ marginTop: '1.5rem' }}>
          <button className="btn-ghost btn-sm" onClick={() => {
            setSettings({ ...settings, maintenanceMode: 'false', maintenanceMessage: 'We are currently under maintenance. Please check back soon.', maintenanceAllowedIPs: '' });
          }} disabled={loading}>Reset to Defaults</button>
          <button className="btn-dark btn-sm" onClick={handleSaveSettings} disabled={loading}>{loading ? 'Saving...' : 'Save Maintenance Settings'}</button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="detail-panel" style={{ marginTop: '1.5rem' }}>
        <div className="detail-header"><h3>Quick Actions</h3></div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200, padding: '1.25rem', background: 'var(--off-white)', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🛡️</div>
            {settings.maintenanceMode === 'true' ? (
              <><strong>Disable Maintenance</strong><p style={{ fontSize: '0.78rem', color: 'var(--muted)', margin: '0.5rem 0 1rem' }}>Bring the site back online</p><button className="btn-ghost btn-sm" onClick={() => handleQuickToggleMaintenance(false)} disabled={loading}>Disable Now</button></>
            ) : (
              <><strong>Enable Maintenance</strong><p style={{ fontSize: '0.78rem', color: 'var(--muted)', margin: '0.5rem 0 1rem' }}>Take the site down for updates</p><button className="btn-dark btn-sm" onClick={() => handleQuickToggleMaintenance(true)} disabled={loading}>Enable Now</button></>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 200, padding: '1.25rem', background: 'var(--off-white)', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔍</div>
            <strong>Test Maintenance Mode</strong><p style={{ fontSize: '0.78rem', color: 'var(--muted)', margin: '0.5rem 0 1rem' }}>Open the storefront in incognito to verify</p>
            <button className="btn-ghost btn-sm" onClick={() => window.open('/', '_blank')}>Open Storefront</button>
          </div>
          <div style={{ flex: 1, minWidth: 200, padding: '1.25rem', background: 'var(--off-white)', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📋</div>
            <strong>Check Status</strong><p style={{ fontSize: '0.78rem', color: 'var(--muted)', margin: '0.5rem 0 1rem' }}>View the current site status endpoint</p>
            <button className="btn-ghost btn-sm" onClick={async () => {
              try {
                const res = await settingsAPI.getMaintenanceStatus();
                const data = res.data?.data || res.data;
                toast.success(data?.underMaintenance !== undefined ? `Maintenance: ${data.underMaintenance ? 'ACTIVE' : 'INACTIVE'}` : 'Status checked successfully');
              } catch { toast.error('Failed to check maintenance status'); }
            }}>Check Status</button>
          </div>
        </div>
      </div>

      {/* Scheduled Maintenance */}
      <div className="detail-panel" style={{ marginTop: '1.5rem' }}>
        <div className="detail-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3>Scheduled Maintenance</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
              Schedule automatic maintenance windows. The scheduler checks every 30 seconds and auto-activates/deactivates maintenance mode.
            </p>
          </div>
          <button className="btn-dark btn-sm" onClick={() => { resetScheduleForm(); setShowScheduleModal(true); }}>+ Create Schedule</button>
        </div>

        {schedulesLoading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>
            <div className="spinner" style={{ width: 24, height: 24, margin: '0 auto 0.5rem' }} /><p>Loading schedules...</p>
          </div>
        ) : schedules.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📅</div>
            <p>No scheduled maintenance windows yet.</p>
            <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>Create a schedule to automatically enable/disable maintenance at specific times.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
            <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem' }}>Title</th>
                  <th style={{ padding: '0.75rem' }}>Type</th>
                  <th style={{ padding: '0.75rem' }}>Window</th>
                  <th style={{ padding: '0.75rem' }}>Status</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {schedules.map((s) => (
                  <tr key={s.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '0.75rem', fontWeight: 'bold' }}>
                      {s.title}
                      {s.message && <div style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 'normal', marginTop: '0.15rem' }}>{s.message}</div>}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      {s.isRecurring ? <span className="status-badge status-pending" style={{ fontSize: '0.7rem' }}>Recurring</span> :
                        <span className="status-badge" style={{ fontSize: '0.7rem', background: 'var(--off-white)' }}>One-time</span>}
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.85rem' }}>
                      {s.isRecurring ? (
                        <><div>{s.recurringDays || 'No days set'}</div><div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{s.timeStart} - {s.timeEnd}</div></>
                      ) : (
                        <><div>Start: {formatScheduleDate(s.startsAt)}</div>{s.endsAt && <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>End: {formatScheduleDate(s.endsAt)}</div>}</>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <button onClick={() => handleToggleSchedule(s)}
                        className={`status-badge ${s.isActive && !s.isCompleted ? 'status-active' : 'status-pending'}`}
                        style={{ border: 'none', cursor: 'pointer', fontSize: '0.75rem' }}>
                        {s.isCompleted ? 'Completed' : s.isActive ? 'Active' : 'Disabled'}
                      </button>
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button className="btn-ghost btn-sm" onClick={() => openEditSchedule(s)}>Edit</button>
                        <button className="btn-ghost btn-sm" style={{ color: 'red' }} onClick={() => handleDeleteSchedule(s.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ScheduleModal
        show={showScheduleModal}
        onClose={() => { setShowScheduleModal(false); resetScheduleForm(); }}
        editingSchedule={editingSchedule}
        scheduleForm={scheduleForm}
        setScheduleForm={setScheduleForm}
        loading={loading}
        handleCreateSchedule={handleCreateSchedule}
        handleUpdateSchedule={handleUpdateSchedule}
        resetScheduleForm={resetScheduleForm}
      />
    </div>
  );
}
