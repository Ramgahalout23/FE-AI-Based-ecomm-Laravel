import { useState, useEffect } from 'react';
import {
  X, CheckCircle2, AlertCircle, RefreshCw, Copy, Check,
  Shield, Key, Eye, EyeOff, ExternalLink, Zap
} from 'lucide-react';
import toast from '../../../utils/toast';

export default function PlatformSettingsModal({ isOpen, onClose, adsAPI }) {
  const [activeTab, setActiveTab] = useState('meta');
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);
  const [showTokens, setShowTokens] = useState({});

  const [platforms, setPlatforms] = useState({
    meta: { configured: false, metaAccessToken: '', metaAdAccountId: '', metaPageId: '' },
    google: { configured: false, googleAdsClientId: '', googleAdsClientSecret: '', googleAdsDeveloperToken: '', googleAdsRefreshToken: '', googleAdsCustomerAccountId: '' },
    whatsapp: { configured: false, whatsappAccessToken: '', whatsappPhoneNumberId: '', whatsappBusinessAccountId: '' },
  });

  const [form, setForm] = useState({
    metaAccessToken: '',
    metaAdAccountId: '',
    metaPageId: '',
    googleAdsClientId: '',
    googleAdsClientSecret: '',
    googleAdsDeveloperToken: '',
    googleAdsRefreshToken: '',
    googleAdsCustomerAccountId: '',
    whatsappAccessToken: '',
    whatsappPhoneNumberId: '',
    whatsappBusinessAccountId: '',
  });

  const [webhookData, setWebhookData] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    loadStatus();
  }, [isOpen]);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const [statusRes, webhookRes] = await Promise.all([
        adsAPI.getPlatformConnections(),
        adsAPI.getWebhookStatus?.().catch(() => ({ data: {} })),
      ]);

      const data = statusRes.data?.data || {};
      setPlatforms(data);
      setWebhookData(webhookRes?.data?.data || null);

      // Populate editable form fields (if not masked or when user hasn't typed yet)
      setForm(prev => ({
        ...prev,
        metaAccessToken: data.meta?.metaAccessToken || '',
        metaAdAccountId: data.meta?.metaAdAccountId || '',
        metaPageId: data.meta?.metaPageId || '',
        googleAdsClientId: data.google?.googleAdsClientId || '',
        googleAdsClientSecret: data.google?.googleAdsClientSecret || '',
        googleAdsDeveloperToken: data.google?.googleAdsDeveloperToken || '',
        googleAdsRefreshToken: data.google?.googleAdsRefreshToken || '',
        googleAdsCustomerAccountId: data.google?.googleAdsCustomerAccountId || '',
        whatsappAccessToken: data.whatsapp?.whatsappAccessToken || '',
        whatsappPhoneNumberId: data.whatsapp?.whatsappPhoneNumberId || '',
        whatsappBusinessAccountId: data.whatsapp?.whatsappBusinessAccountId || '',
      }));
    } catch {
      toast.error('Failed to load platform credentials');
    }
    setLoading(false);
  };

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSave = async (platformName) => {
    setSaving(true);
    try {
      let credentials = {};
      if (platformName === 'meta') {
        credentials = {
          metaAccessToken: form.metaAccessToken,
          metaAdAccountId: form.metaAdAccountId,
          metaPageId: form.metaPageId,
        };
      } else if (platformName === 'google') {
        credentials = {
          googleAdsClientId: form.googleAdsClientId,
          googleAdsClientSecret: form.googleAdsClientSecret,
          googleAdsDeveloperToken: form.googleAdsDeveloperToken,
          googleAdsRefreshToken: form.googleAdsRefreshToken,
          googleAdsCustomerAccountId: form.googleAdsCustomerAccountId,
        };
      } else if (platformName === 'whatsapp') {
        credentials = {
          whatsappAccessToken: form.whatsappAccessToken,
          whatsappPhoneNumberId: form.whatsappPhoneNumberId,
          whatsappBusinessAccountId: form.whatsappBusinessAccountId,
        };
      }

      await adsAPI.configurePlatformCredentials({
        platform: platformName,
        credentials,
      });

      toast.success(`${platformName.toUpperCase()} credentials saved to database`);
      await loadStatus();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save credentials');
    }
    setSaving(false);
  };

  const handleTest = async (platformName) => {
    setTesting(true);
    setTestResult(null);
    try {
      let res;
      if (platformName === 'meta') {
        res = await adsAPI.testMetaConnection();
      } else if (platformName === 'google') {
        res = await adsAPI.testGoogleAdsConnection();
      } else if (platformName === 'whatsapp') {
        res = await adsAPI.testWhatsAppConnection();
      }

      const d = res.data?.data || {};
      setTestResult({ success: true, platform: platformName, data: d });
      toast.success(`${platformName.toUpperCase()} connection verified successfully!`);
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Connection test failed';
      setTestResult({ success: false, platform: platformName, error: errMsg });
      toast.error(errMsg);
    }
    setTesting(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div>
            <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
              <Shield size={18} className="text-indigo-600" /> Ad Platforms & API Connections
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Connect your Meta, Google, and WhatsApp credentials directly — no server edits needed.
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Platform Status Bar */}
        <div className="px-6 py-2.5 bg-gray-900 text-white flex items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-4">
            <span className="text-gray-400 font-medium">Platform Health:</span>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${platforms.meta?.configured ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span className="font-semibold text-gray-200">Meta Ads</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${platforms.google?.configured ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`} />
              <span className="font-semibold text-gray-200">Google Ads</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${platforms.whatsapp?.configured ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span className="font-semibold text-gray-200">WhatsApp</span>
            </div>
          </div>
          <button onClick={loadStatus} className="text-gray-400 hover:text-white flex items-center gap-1 text-[11px] transition-colors">
            <RefreshCw size={11} className={loading ? 'animate-spin' : ''} /> Reload
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 bg-gray-50 px-6 pt-2 gap-2">
          {[
            { id: 'meta', label: 'Meta (FB & IG)', badge: platforms.meta?.configured ? 'Connected' : 'Setup' },
            { id: 'google', label: 'Google Ads', badge: platforms.google?.configured ? 'Connected' : 'Setup' },
            { id: 'whatsapp', label: 'WhatsApp Cloud API', badge: platforms.whatsapp?.configured ? 'Connected' : 'Setup' },
            { id: 'webhooks', label: 'Platform Webhooks', badge: 'Live' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => { setActiveTab(t.id); setTestResult(null); }}
              className={`pb-2.5 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
                activeTab === t.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              {t.label}
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                t.badge === 'Connected' || t.badge === 'Live' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'
              }`}>
                {t.badge}
              </span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* META TAB */}
          {activeTab === 'meta' && (
            <div className="space-y-4">
              <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3.5 text-xs text-blue-900 flex items-start gap-2.5">
                <Zap size={16} className="text-blue-600 mt-0.5 shrink-0" />
                <div>
                  <span className="font-bold">Meta Marketing API Integration</span>
                  <p className="mt-0.5 text-blue-700">
                    Enables automated push of ad campaigns to Facebook & Instagram feeds, stories, and reels. Requires a System User permanent token with <code className="bg-blue-100 px-1 py-0.5 rounded">ads_management</code> permission.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    Meta Access Token (System User Permanent Token)
                  </label>
                  <div className="relative">
                    <input
                      type={showTokens.meta ? 'text' : 'password'}
                      value={form.metaAccessToken}
                      onChange={e => setForm({ ...form, metaAccessToken: e.target.value })}
                      placeholder="EAAB..."
                      className="w-full px-3 py-2 pr-10 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowTokens({ ...showTokens, meta: !showTokens.meta })}
                      className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
                    >
                      {showTokens.meta ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">Ad Account ID</label>
                    <input
                      value={form.metaAdAccountId}
                      onChange={e => setForm({ ...form, metaAdAccountId: e.target.value })}
                      placeholder="act_1234567890"
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">Facebook Page ID (Optional)</label>
                    <input
                      value={form.metaPageId}
                      onChange={e => setForm({ ...form, metaPageId: e.target.value })}
                      placeholder="e.g. 109283748291"
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {testResult && testResult.platform === 'meta' && (
                <div className={`p-3 rounded-xl border text-xs ${testResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'}`}>
                  {testResult.success ? (
                    <div className="space-y-1">
                      <div className="font-bold flex items-center gap-1.5">
                        <CheckCircle2 size={14} className="text-emerald-600" /> Meta API Connected!
                      </div>
                      <div className="text-[11px] text-emerald-800">
                        Account: <span className="font-semibold">{testResult.data.accountName}</span> ({testResult.data.accountId}) &bull; Currency: {testResult.data.currency} &bull; Status: {testResult.data.status}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <AlertCircle size={14} className="text-rose-600 shrink-0" />
                      <span>{testResult.error}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => handleTest('meta')}
                  disabled={testing}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <RefreshCw size={12} className={testing ? 'animate-spin' : ''} />
                  {testing ? 'Testing Connection…' : 'Test Meta Connection'}
                </button>
                <button
                  onClick={() => handleSave('meta')}
                  disabled={saving}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save Meta Credentials'}
                </button>
              </div>
            </div>
          )}

          {/* GOOGLE TAB */}
          {activeTab === 'google' && (
            <div className="space-y-4">
              <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-3.5 text-xs text-emerald-900 flex items-start gap-2.5">
                <Zap size={16} className="text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <span className="font-bold">Google Ads API Integration</span>
                  <p className="mt-0.5 text-emerald-700">
                    Enables launching YouTube video ads and Google Search campaigns directly. Set your OAuth 2.0 Client credentials and Developer Token.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Google Client ID</label>
                  <input
                    value={form.googleAdsClientId}
                    onChange={e => setForm({ ...form, googleAdsClientId: e.target.value })}
                    placeholder="xxxx.apps.googleusercontent.com"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Google Client Secret</label>
                  <input
                    type="password"
                    value={form.googleAdsClientSecret}
                    onChange={e => setForm({ ...form, googleAdsClientSecret: e.target.value })}
                    placeholder="GOCSPX-..."
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Developer Token</label>
                  <input
                    type="password"
                    value={form.googleAdsDeveloperToken}
                    onChange={e => setForm({ ...form, googleAdsDeveloperToken: e.target.value })}
                    placeholder="Developer token from MCC"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Customer Account ID (MCC or Sub-account)</label>
                  <input
                    value={form.googleAdsCustomerAccountId}
                    onChange={e => setForm({ ...form, googleAdsCustomerAccountId: e.target.value })}
                    placeholder="123-456-7890"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono text-xs"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="font-semibold text-gray-700 block mb-1">Refresh Token</label>
                  <input
                    type="password"
                    value={form.googleAdsRefreshToken}
                    onChange={e => setForm({ ...form, googleAdsRefreshToken: e.target.value })}
                    placeholder="1//0..."
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono text-xs"
                  />
                </div>
              </div>

              {testResult && testResult.platform === 'google' && (
                <div className={`p-3 rounded-xl border text-xs ${testResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'}`}>
                  {testResult.success ? (
                    <div className="font-bold flex items-center gap-1.5">
                      <CheckCircle2 size={14} className="text-emerald-600" /> Google Ads API Verified Successfully!
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <AlertCircle size={14} className="text-rose-600 shrink-0" />
                      <span>{testResult.error}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => handleTest('google')}
                  disabled={testing}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <RefreshCw size={12} className={testing ? 'animate-spin' : ''} />
                  {testing ? 'Testing Connection…' : 'Test Google Ads Connection'}
                </button>
                <button
                  onClick={() => handleSave('google')}
                  disabled={saving}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save Google Credentials'}
                </button>
              </div>
            </div>
          )}

          {/* WHATSAPP TAB */}
          {activeTab === 'whatsapp' && (
            <div className="space-y-4">
              <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-3.5 text-xs text-emerald-900 flex items-start gap-2.5">
                <Zap size={16} className="text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <span className="font-bold">WhatsApp Cloud API (Meta)</span>
                  <p className="mt-0.5 text-emerald-700">
                    Powers WhatsApp promotional broadcasts, automated cart reminders, and direct messaging campaigns without 3rd-party aggregators.
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Permanent Access Token</label>
                  <div className="relative">
                    <input
                      type={showTokens.whatsapp ? 'text' : 'password'}
                      value={form.whatsappAccessToken}
                      onChange={e => setForm({ ...form, whatsappAccessToken: e.target.value })}
                      placeholder="EAAB..."
                      className="w-full px-3 py-2 pr-10 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowTokens({ ...showTokens, whatsapp: !showTokens.whatsapp })}
                      className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
                    >
                      {showTokens.whatsapp ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">Phone Number ID</label>
                    <input
                      value={form.whatsappPhoneNumberId}
                      onChange={e => setForm({ ...form, whatsappPhoneNumberId: e.target.value })}
                      placeholder="e.g. 104928374829102"
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">Business Account ID (WABA)</label>
                    <input
                      value={form.whatsappBusinessAccountId}
                      onChange={e => setForm({ ...form, whatsappBusinessAccountId: e.target.value })}
                      placeholder="e.g. 204928374829105"
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono text-xs"
                    />
                  </div>
                </div>
              </div>

              {testResult && testResult.platform === 'whatsapp' && (
                <div className={`p-3 rounded-xl border text-xs ${testResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'}`}>
                  {testResult.success ? (
                    <div className="space-y-1">
                      <div className="font-bold flex items-center gap-1.5">
                        <CheckCircle2 size={14} className="text-emerald-600" /> WhatsApp Cloud API Verified!
                      </div>
                      <div className="text-[11px] text-emerald-800">
                        Phone: {testResult.data.display_phone_number || form.whatsappPhoneNumberId} &bull; Quality: {testResult.data.quality_rating || 'GREEN'} &bull; Status: {testResult.data.code_verification_status || 'VERIFIED'}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <AlertCircle size={14} className="text-rose-600 shrink-0" />
                      <span>{testResult.error}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => handleTest('whatsapp')}
                  disabled={testing}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <RefreshCw size={12} className={testing ? 'animate-spin' : ''} />
                  {testing ? 'Testing WhatsApp…' : 'Test WhatsApp Connection'}
                </button>
                <button
                  onClick={() => handleSave('whatsapp')}
                  disabled={saving}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save WhatsApp Credentials'}
                </button>
              </div>
            </div>
          )}

          {/* WEBHOOKS TAB */}
          {activeTab === 'webhooks' && (
            <div className="space-y-4">
              <div className="bg-purple-50/60 border border-purple-100 rounded-xl p-3.5 text-xs text-purple-900">
                <span className="font-bold">Real-time Platform Webhooks</span>
                <p className="mt-0.5 text-purple-700">
                  Copy these webhook callback URLs into your Meta Developer App and Google Ads console to automatically receive delivery confirmations, ad approval status updates, and inbound leads.
                </p>
              </div>

              <div className="space-y-3 text-xs">
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-800">Meta & WhatsApp Callback URL</span>
                    <button
                      onClick={() => copyToClipboard(webhookData?.meta?.callbackUrl || `${window.location.origin}/api/v1/webhooks/ads/meta`, 'metaUrl')}
                      className="text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1 text-[11px]"
                    >
                      {copiedKey === 'metaUrl' ? <Check size={12} /> : <Copy size={12} />}
                      {copiedKey === 'metaUrl' ? 'Copied' : 'Copy URL'}
                    </button>
                  </div>
                  <code className="block bg-white px-2.5 py-1.5 rounded-lg border border-gray-200 font-mono text-[11px] text-gray-700 break-all select-all">
                    {webhookData?.meta?.callbackUrl || `${window.location.origin}/api/v1/webhooks/ads/meta`}
                  </code>

                  <div className="flex items-center justify-between pt-1">
                    <span className="font-medium text-gray-600">Verify Token:</span>
                    <div className="flex items-center gap-2">
                      <code className="bg-gray-100 px-2 py-0.5 rounded font-mono text-gray-800 text-[11px]">
                        {webhookData?.meta?.verifyToken || 'antigravity_ads_webhook_secret'}
                      </code>
                      <button
                        onClick={() => copyToClipboard(webhookData?.meta?.verifyToken || 'antigravity_ads_webhook_secret', 'verifyToken')}
                        className="text-gray-500 hover:text-gray-800"
                      >
                        {copiedKey === 'verifyToken' ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-800">Google Ads Webhook Endpoint</span>
                    <button
                      onClick={() => copyToClipboard(webhookData?.google?.callbackUrl || `${window.location.origin}/api/v1/webhooks/ads/google`, 'googleUrl')}
                      className="text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1 text-[11px]"
                    >
                      {copiedKey === 'googleUrl' ? <Check size={12} /> : <Copy size={12} />}
                      {copiedKey === 'googleUrl' ? 'Copied' : 'Copy URL'}
                    </button>
                  </div>
                  <code className="block bg-white px-2.5 py-1.5 rounded-lg border border-gray-200 font-mono text-[11px] text-gray-700 break-all select-all">
                    {webhookData?.google?.callbackUrl || `${window.location.origin}/api/v1/webhooks/ads/google`}
                  </code>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50/50 text-xs">
          <span className="text-gray-400">Credentials stored securely in database with AES encryption.</span>
          <button onClick={onClose} className="px-4 py-2 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 transition-colors">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
