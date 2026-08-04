import { formatDateTime } from '../../../utils/formatters';
import PasswordInput from '../../../components/common/PasswordInput';
import toast from '../../../utils/toast';
import { adminAPI } from '../../../api/admin';

export default function IntegrationsTab({
  settings, setSettings, loading, handleSaveSettings,
  backups, backupsLoading, handleBackup, loadBackups,
  handleTestAIConnection, testingAI,
}) {
  const storageDriver = settings?.storage_driver || 'local';
  const usingS3 = storageDriver === 's3';

  const providers = {
    openai: { url: 'https://api.openai.com/v1', chatModel: 'gpt-4o', imageModel: 'dall-e-3' },
    groq: { url: 'https://api.groq.com/openai/v1', chatModel: 'llama-3.3-70b-versatile', imageModel: '' },
    together: { url: 'https://api.together.xyz/v1', chatModel: 'mistralai/Mixtral-8x22B-Instruct-v0.1', imageModel: '' },
    deepseek: { url: 'https://api.deepseek.com/v1', chatModel: 'deepseek-chat', imageModel: '' },
    openrouter: { url: 'https://openrouter.ai/api/v1', chatModel: 'openai/gpt-4o', imageModel: '' },
    anthropic: { url: 'https://api.anthropic.com/v1', chatModel: 'claude-3-5-sonnet-20241022', imageModel: '' },
  };

  const handleProviderChange = (provider) => {
    const preset = providers[provider];
    setSettings({
      ...settings,
      aiProvider: provider,
      aiProviderUrl: preset?.url || settings.aiProviderUrl,
      aiChatModel: preset?.chatModel || settings.aiChatModel,
      aiImageModel: preset?.imageModel || settings.aiImageModel,
    });
  };

  const handleDeleteBackup = async (filename) => {
    if (!window.confirm(`Are you sure you want to delete backup "${filename}"?`)) return;
    try {
      await adminAPI.deleteBackup(filename);
      toast.success('Backup deleted');
      if (loadBackups) loadBackups();
    } catch (err) {
      toast.error('Failed to delete backup');
    }
  };

  const handleDownloadBackup = async (filename) => {
    try {
      const res = await adminAPI.downloadBackup(filename);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error('Failed to download backup');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* ── AWS S3 Storage ── */}
      <div className="detail-panel">
        <div className="detail-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <h3>☁️ Cloud Storage (AWS S3)</h3>
            <span className={`status-badge ${usingS3 ? 'status-active' : 'status-pending'}`}>
              {usingS3 ? 'S3 Active' : 'Local Storage'}
            </span>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={usingS3}
              onChange={e => setSettings({ ...settings, storage_driver: e.target.checked ? 's3' : 'local' })}
            />
            <strong>Use AWS S3</strong>
          </label>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '1.5rem' }}>
          When enabled, all file, image, and video uploads (admin uploads, review images, banners, product images)
          will be stored on Amazon S3 instead of the local server.
          <strong> AWS credentials must be configured in your <code>.env</code> file.</strong>
        </p>

        <div className={`form-grid ${!usingS3 ? 'disabled-section' : ''}`}>
          <div className="form-group form-full">
            <label>Required .env Variables</label>
            <div style={{
              background: '#1a1a2e',
              borderRadius: 'var(--radius-md)',
              padding: '1rem',
              fontFamily: 'monospace',
              fontSize: '0.78rem',
              color: '#e2e8f0',
              lineHeight: '1.8',
            }}>
              AWS_ACCESS_KEY_ID=your_access_key<br />
              AWS_SECRET_ACCESS_KEY=your_secret_key<br />
              AWS_DEFAULT_REGION=ap-south-1<br />
              AWS_BUCKET=your-bucket-name<br />
              AWS_URL=https://your-bucket.s3.region.amazonaws.com
            </div>
            {!usingS3 && (
              <span style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.5rem', display: 'block' }}>
                Toggle S3 on above, then configure these values in your <code>.env</code> file and restart the server.
              </span>
            )}
          </div>
          <div className="form-group">
            <label>Current Driver</label>
            <input value={usingS3 ? 'Amazon S3' : 'Local Storage (public disk)'} disabled />
          </div>
        </div>

        {usingS3 && (
          <div className="admin-alert info" style={{ marginTop: '1rem' }}>
            <span className="admin-alert-icon">ℹ️</span>
            <div className="admin-alert-body">
              <div className="admin-alert-title">S3 Active — Affects All Uploads</div>
              <div>
                All file upload endpoints will now use S3. This includes: admin file uploads, review images,
                banner images, product images, and any other uploads using the storage system.
              </div>
            </div>
          </div>
        )}

        <div className="form-actions" style={{ marginTop: '1rem' }}>
          <button className="btn-dark btn-sm" onClick={handleSaveSettings} disabled={loading}>
            {loading ? 'Saving...' : 'Save Storage Settings'}
          </button>
        </div>
      </div>

      {/* ── Social Login ── */}
      <div className="detail-panel">
        <div className="detail-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <h3>🔑 Social Login</h3>
            <span className={`status-badge ${settings.googleLoginEnabled === 'true' || settings.facebookLoginEnabled === 'true' ? 'status-active' : 'status-pending'}`}>
              {settings.googleLoginEnabled === 'true' || settings.facebookLoginEnabled === 'true' ? 'Configured' : 'Not Setup'}
            </span>
          </div>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '1.5rem' }}>
          Configure OAuth providers to allow customers to sign in with their social accounts.
        </p>

        <div className="form-grid">
          <div className="form-group form-full" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <label style={{ fontWeight: 600, fontSize: '0.9rem' }}>Google OAuth</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={settings.googleLoginEnabled === 'true'}
                onChange={e => setSettings({ ...settings, googleLoginEnabled: e.target.checked ? 'true' : 'false' })}
              />
              <strong>Enable Google</strong>
            </label>
          </div>
          <div className="form-group">
            <label>Google Client ID</label>
            <input
              value={settings.googleClientId || ''}
              onChange={e => setSettings({ ...settings, googleClientId: e.target.value })}
              placeholder="xxxxxxxx.apps.googleusercontent.com"
              disabled={settings.googleLoginEnabled !== 'true'}
            />
          </div>
          <div className="form-group">
            <label>Google Client Secret</label>
            <PasswordInput
              value={settings.googleClientSecret || ''}
              onChange={e => setSettings({ ...settings, googleClientSecret: e.target.value })}
              placeholder="GOCSPX-..."
              disabled={settings.googleLoginEnabled !== 'true'}
              autoComplete="off"
            />
          </div>
        </div>

        <div className="form-grid" style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
          <div className="form-group form-full" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <label style={{ fontWeight: 600, fontSize: '0.9rem' }}>Facebook OAuth</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={settings.facebookLoginEnabled === 'true'}
                onChange={e => setSettings({ ...settings, facebookLoginEnabled: e.target.checked ? 'true' : 'false' })}
              />
              <strong>Enable Facebook</strong>
            </label>
          </div>
          <div className="form-group">
            <label>Facebook App ID</label>
            <input
              value={settings.facebookAppId || ''}
              onChange={e => setSettings({ ...settings, facebookAppId: e.target.value })}
              placeholder="123456789012345"
              disabled={settings.facebookLoginEnabled !== 'true'}
            />
          </div>
          <div className="form-group">
            <label>Facebook App Secret</label>
            <PasswordInput
              value={settings.facebookAppSecret || ''}
              onChange={e => setSettings({ ...settings, facebookAppSecret: e.target.value })}
              placeholder="xxxxxxxxxxxx"
              disabled={settings.facebookLoginEnabled !== 'true'}
              autoComplete="off"
            />
          </div>
        </div>

        <div className="form-actions" style={{ marginTop: '1rem' }}>
          <button className="btn-dark btn-sm" onClick={handleSaveSettings} disabled={loading}>
            {loading ? 'Saving...' : 'Save Social Login'}
          </button>
        </div>
      </div>

      {/* ── Ad Platform Credentials ── */}
      <div className="detail-panel">
        <div className="detail-header">
          <h3>📢 Ad Platform Credentials</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
            Manage access tokens and account IDs for advertising platforms.
          </p>
        </div>

        <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1rem' }}>
          <h4 style={{ fontSize: '0.9rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>📘</span> Meta (Facebook / Instagram Ads)
          </h4>
          <div className="form-grid">
            <div className="form-group">
              <label>Meta Access Token</label>
              <PasswordInput
                value={settings.metaAccessToken || ''}
                onChange={e => setSettings({ ...settings, metaAccessToken: e.target.value })}
                placeholder="EAAD..."
                autoComplete="off"
              />
            </div>
            <div className="form-group">
              <label>Ad Account ID</label>
              <input
                value={settings.metaAdAccountId || ''}
                onChange={e => setSettings({ ...settings, metaAdAccountId: e.target.value })}
                placeholder="act_123456789012345"
              />
            </div>
            <div className="form-group">
              <label>Page ID</label>
              <input
                value={settings.metaPageId || ''}
                onChange={e => setSettings({ ...settings, metaPageId: e.target.value })}
                placeholder="123456789012345"
              />
            </div>
          </div>
        </div>

        <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1rem' }}>
          <h4 style={{ fontSize: '0.9rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>💬</span> WhatsApp Business
          </h4>
          <div className="form-grid">
            <div className="form-group">
              <label>WhatsApp Access Token</label>
              <PasswordInput
                value={settings.whatsappAccessToken || ''}
                onChange={e => setSettings({ ...settings, whatsappAccessToken: e.target.value })}
                placeholder="EAAx..."
                autoComplete="off"
              />
            </div>
            <div className="form-group">
              <label>Phone Number ID</label>
              <input
                value={settings.whatsappPhoneNumberId || ''}
                onChange={e => setSettings({ ...settings, whatsappPhoneNumberId: e.target.value })}
                placeholder="123456789012345"
              />
            </div>
            <div className="form-group">
              <label>Business Account ID</label>
              <input
                value={settings.whatsappBusinessAccountId || ''}
                onChange={e => setSettings({ ...settings, whatsappBusinessAccountId: e.target.value })}
                placeholder="123456789012345"
              />
            </div>
          </div>
        </div>

        <div>
          <h4 style={{ fontSize: '0.9rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>🎯</span> Google Ads
          </h4>
          <div className="form-grid">
            <div className="form-group">
              <label>Client ID</label>
              <input
                value={settings.googleAdsClientId || ''}
                onChange={e => setSettings({ ...settings, googleAdsClientId: e.target.value })}
                placeholder="123456789012.apps.googleusercontent.com"
              />
            </div>
            <div className="form-group">
              <label>Client Secret</label>
              <PasswordInput
                value={settings.googleAdsClientSecret || ''}
                onChange={e => setSettings({ ...settings, googleAdsClientSecret: e.target.value })}
                placeholder="GOCSPX-..."
                autoComplete="off"
              />
            </div>
            <div className="form-group">
              <label>Developer Token</label>
              <PasswordInput
                value={settings.googleAdsDeveloperToken || ''}
                onChange={e => setSettings({ ...settings, googleAdsDeveloperToken: e.target.value })}
                placeholder="A9B8C7D6E5F4..."
                autoComplete="off"
              />
            </div>
            <div className="form-group">
              <label>Refresh Token</label>
              <PasswordInput
                value={settings.googleAdsRefreshToken || ''}
                onChange={e => setSettings({ ...settings, googleAdsRefreshToken: e.target.value })}
                placeholder="1//0c..."
                autoComplete="off"
              />
            </div>
            <div className="form-group form-full">
              <label>Customer Account ID</label>
              <input
                value={settings.googleAdsCustomerId || ''}
                onChange={e => setSettings({ ...settings, googleAdsCustomerId: e.target.value })}
                placeholder="123-456-7890"
              />
            </div>
          </div>
        </div>

        <div className="form-actions" style={{ marginTop: '1rem' }}>
          <button className="btn-dark btn-sm" onClick={handleSaveSettings} disabled={loading}>
            {loading ? 'Saving...' : 'Save Ad Platform Settings'}
          </button>
        </div>
      </div>

      {/* ── AI Provider Configuration ── */}
      <div className="detail-panel">
        <div className="detail-header">
          <h3>🤖 AI Provider Configuration</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
            Configure AI provider for content generation, product descriptions, and chatbot responses.
          </p>
        </div>
        <div className="form-grid">
          <div className="form-group">
            <label>Provider</label>
            <select
              value={settings.aiProvider || 'openai'}
              onChange={e => handleProviderChange(e.target.value)}
            >
              <option value="openai">OpenAI</option>
              <option value="groq">Groq</option>
              <option value="together">Together AI</option>
              <option value="deepseek">DeepSeek</option>
              <option value="openrouter">OpenRouter</option>
              <option value="anthropic">Anthropic</option>
              <option value="custom">Custom Provider</option>
            </select>
          </div>
          <div className="form-group">
            <label>API Key</label>
            <PasswordInput
              value={settings.aiProviderApiKey || settings.openaiApiKey || ''}
              onChange={e => setSettings({ ...settings, aiProviderApiKey: e.target.value, openaiApiKey: e.target.value })}
              placeholder={settings.aiProvider === 'openai' ? 'sk-proj-...' : 'Enter your API key'}
              autoComplete="off"
            />
          </div>
          <div className="form-group">
            <label>Base URL</label>
            <input
              value={settings.aiProviderUrl || 'https://api.openai.com/v1'}
              onChange={e => setSettings({ ...settings, aiProviderUrl: e.target.value })}
              placeholder="https://api.openai.com/v1"
            />
          </div>
          <div className="form-group">
            <label>Chat Model</label>
            <input
              value={settings.aiChatModel || 'gpt-4o'}
              onChange={e => setSettings({ ...settings, aiChatModel: e.target.value })}
              placeholder="gpt-4o"
            />
          </div>
          <div className="form-group">
            <label>Image Model</label>
            <input
              value={settings.aiImageModel || 'dall-e-3'}
              onChange={e => setSettings({ ...settings, aiImageModel: e.target.value })}
              placeholder="dall-e-3"
            />
          </div>
          <div className="form-group form-full">
            <label>Provider Reference</label>
            <div style={{
              background: 'var(--off-white)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem',
              fontSize: '0.75rem',
              lineHeight: '1.6',
              color: 'var(--muted)',
            }}>
              <strong>Supported providers & presets:</strong><br />
              • <strong>OpenAI</strong>: api.openai.com/v1 — gpt-4o / dall-e-3<br />
              • <strong>Groq</strong>: api.groq.com — llama-3.3-70b-versatile (free inference)<br />
              • <strong>Together AI</strong>: api.together.xyz — Mixtral-8x22B<br />
              • <strong>DeepSeek</strong>: api.deepseek.com — deepseek-chat<br />
              • <strong>OpenRouter</strong>: openrouter.ai — unified multi-provider<br />
              • <strong>Anthropic</strong>: api.anthropic.com — claude-3-5-sonnet (no image gen)
            </div>
          </div>
        </div>
        <div className="form-actions" style={{ marginTop: '1rem' }}>
          <button className="btn-ghost btn-sm" onClick={handleTestAIConnection} disabled={loading || testingAI}>
            {testingAI ? 'Testing...' : 'Test Connection'}
          </button>
          <button className="btn-dark btn-sm" onClick={handleSaveSettings} disabled={loading}>
            {loading ? 'Saving...' : 'Save AI Settings'}
          </button>
        </div>
      </div>

      {/* ── Backup Schedule ── */}
      <div className="detail-panel">
        <div className="detail-header">
          <h3>🔄 Backup Schedule</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
            Configure automatic database backup scheduling.
          </p>
        </div>
        <div className="form-grid">
          <div className="form-group">
            <label>Frequency</label>
            <select
              value={settings.backupFrequency || 'daily'}
              onChange={e => setSettings({ ...settings, backupFrequency: e.target.value })}
            >
              <option value="hourly">Hourly</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div className="form-group">
            <label>Time (UTC)</label>
            <input
              type="time"
              value={settings.backupTime || '02:00'}
              onChange={e => setSettings({ ...settings, backupTime: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Day of Week</label>
            <select
              value={settings.backupDayOfWeek || '0'}
              onChange={e => setSettings({ ...settings, backupDayOfWeek: e.target.value })}
            >
              <option value="0">Sunday</option>
              <option value="1">Monday</option>
              <option value="2">Tuesday</option>
              <option value="3">Wednesday</option>
              <option value="4">Thursday</option>
              <option value="5">Friday</option>
              <option value="6">Saturday</option>
            </select>
          </div>
          <div className="form-group">
            <label>Last Backup</label>
            <input
              value={settings.lastBackup ? formatDateTime(settings.lastBackup) : 'Never'}
              disabled
            />
          </div>
        </div>
        <div className="form-actions" style={{ marginTop: '1rem' }}>
          <button className="btn-dark btn-sm" onClick={handleSaveSettings} disabled={loading}>
            {loading ? 'Saving...' : 'Save Backup Schedule'}
          </button>
        </div>
      </div>

      {/* ── Backup History ── */}
      <div className="detail-panel">
        <div className="detail-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3>💾 Backup History</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
              View, download, or delete database backups.
            </p>
          </div>
          <button className="btn-dark btn-sm" onClick={handleBackup} disabled={loading}>
            {loading ? 'Backing up...' : 'Create Backup Now'}
          </button>
        </div>

        {backupsLoading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>
            <div className="spinner" style={{ width: 24, height: 24, margin: '0 auto 0.5rem' }} />
            <p>Loading backups...</p>
          </div>
        ) : backups.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💾</div>
            <p>No backups yet.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
            <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem' }}>Filename</th>
                  <th style={{ padding: '0.75rem' }}>Created</th>
                  <th style={{ padding: '0.75rem' }}>Size</th>
                  <th style={{ padding: '0.75rem' }}>Status</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {backups.map((b) => (
                  <tr key={b.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontSize: '0.8rem' }}>{b.filename || '—'}</td>
                    <td style={{ padding: '0.75rem', fontSize: '0.85rem' }}>{b.timestamp ? formatDateTime(b.timestamp) : '—'}</td>
                    <td style={{ padding: '0.75rem' }}>{b.size || '—'}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <span className={`status-badge ${b.status === 'success' ? 'status-active' : 'status-pending'}`}>
                        {b.status || 'Unknown'}
                      </span>
                      {b.error && <div style={{ fontSize: '0.75rem', color: 'red', marginTop: '0.25rem' }}>{b.error}</div>}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        {b.filename && (
                          <>
                            <button className="btn-ghost btn-sm" onClick={() => handleDownloadBackup(b.filename)}>
                              Download
                            </button>
                            <button className="btn-ghost btn-sm" style={{ color: 'red' }} onClick={() => handleDeleteBackup(b.filename)}>
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`
        .disabled-section {
          opacity: 0.5;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}
