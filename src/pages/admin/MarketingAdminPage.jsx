import { useState, useEffect, useCallback } from 'react';
import { marketingAPI } from '../../api/marketing';
import { campaignTemplatesAPI } from '../../api/campaignTemplates';
import toast from '../../utils/toast';
import { BarChart3, Users, Send, Eye, MousePointerClick, Plus, Trash2, Edit2, Play, X, Search, AlertTriangle, Activity, Download, Copy, Upload, Layout, FileText } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const TABS = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'campaigns', label: 'Campaigns', icon: Send },
  { id: 'subscribers', label: 'Subscribers', icon: Users },
  { id: 'templates', label: 'Templates', icon: Layout },
];

const CAMPAIGN_STATUS_COLORS = {
  DRAFT: 'bg-gray-100 text-gray-600',
  SCHEDULED: 'bg-blue-100 text-blue-600',
  SENDING: 'bg-yellow-100 text-yellow-600',
  SENT: 'bg-green-100 text-green-600',
  FAILED: 'bg-red-100 text-red-600',
  PAUSED: 'bg-orange-100 text-orange-600',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

const SUBSCRIBER_STATUS_COLORS = {
  SUBSCRIBED: 'bg-green-100 text-green-600',
  UNSUBSCRIBED: 'bg-gray-100 text-gray-500',
  BOUNCED: 'bg-red-100 text-red-600',
  COMPLAINED: 'bg-orange-100 text-orange-600',
};

export default function MarketingAdminPage() {
  const [tab, setTab] = useState('overview');
  const [, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);

  // Subscribers state
  const [subscribers, setSubscribers] = useState([]);
  const [subscribersLoading, setSubscribersLoading] = useState(false);
  const [subscriberPagination, setSubscriberPagination] = useState({ page: 1, total: 0, totalPages: 1 });
  const [subscriberSearch, setSubscriberSearch] = useState('');
  const [subscriberFilter, setSubscriberFilter] = useState('');

  // Campaigns state
  const [campaigns, setCampaigns] = useState([]);
  const [campaignsLoading, setCampaignsLoading] = useState(false);
  const [campaignPagination, setCampaignPagination] = useState({ page: 1, total: 0, totalPages: 1 });
  const [campaignSearch, setCampaignSearch] = useState('');

  // Campaign form modal
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [campaignForm, setCampaignForm] = useState({
    name: '',
    subject: '',
    preheader: '',
    fromName: '',
    contentHtml: '',
    scheduledAt: '',
  });
  const [sending, setSending] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  // Campaign analytics modal
  const [viewingCampaign, setViewingCampaign] = useState(null);
  const [campaignStats, setCampaignStats] = useState(null);
  const [campaignRecipients, setCampaignRecipients] = useState([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [recipientPagination, setRecipientPagination] = useState({ page: 1, total: 0, totalPages: 1 });
  const [recipientsLoading, setRecipientsLoading] = useState(false);

  // Subscriber add modal
  const [showSubscriberModal, setShowSubscriberModal] = useState(false);
  const [subscriberForm, setSubscriberForm] = useState({ email: '', name: '' });

  const [chartsReady, setChartsReady] = useState(false);

  // ── Templates state ──
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [templateForm, setTemplateForm] = useState({ templateId: '', name: '', subject: '', variables: '{}' });

  // ── CSV Import state ──
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [skipDuplicates, setSkipDuplicates] = useState(true);

  // ── Load Templates ──
  const loadTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    try {
      const r = await campaignTemplatesAPI.getTemplates({ limit: 50 });
      const data = r.data?.data || r.data || [];
      // Seed defaults if empty
      if (!Array.isArray(data) || data.length === 0) {
        await campaignTemplatesAPI.seedDefaults();
        const r2 = await campaignTemplatesAPI.getTemplates({ limit: 50 });
        setTemplates(r2.data?.data || r2.data || []);
      } else {
        setTemplates(data);
      }
    } catch { setTemplates([]); }
    setTemplatesLoading(false);
  }, []);

  // ── Load Dashboard ──
  const loadDashboard = useCallback(async () => {
    try {
      const r = await marketingAPI.getDashboard();
      setDashboard(r.data?.data || r.data);
    } catch {
      // Dashboard may not be available, fallback
    }
  }, []);

  // ── Load Subscribers ──
  const loadSubscribers = useCallback(async (page = 1, search = '', status = '') => {
    setSubscribersLoading(true);
    try {
      const params = { page, limit: 20 };
      if (search) params.search = search;
      if (status) params.status = status;
      const r = await marketingAPI.getSubscribers(params);
      const data = r.data?.data || r.data || [];
      const pagination = r.data?.pagination || {};
      setSubscribers(Array.isArray(data) ? data : []);
      setSubscriberPagination({
        page: pagination.page || page,
        total: pagination.total || 0,
        totalPages: pagination.totalPages || 1,
      });
    } catch {
      toast.error('Failed to load subscribers');
    }
    setSubscribersLoading(false);
  }, []);

  // ── Load Campaigns ──
  const loadCampaigns = useCallback(async (page = 1, search = '') => {
    setCampaignsLoading(true);
    try {
      const params = { page, limit: 20 };
      if (search) params.search = search;
      const r = await marketingAPI.getCampaigns(params);
      const data = r.data?.data || r.data || [];
      const pagination = r.data?.pagination || {};
      setCampaigns(Array.isArray(data) ? data : []);
      setCampaignPagination({
        page: pagination.page || page,
        total: pagination.total || 0,
        totalPages: pagination.totalPages || 1,
      });
    } catch {
      toast.error('Failed to load campaigns');
    }
    setCampaignsLoading(false);
  }, []);

  // ── Initial Load ──
  useEffect(() => {
    setLoading(true);
    Promise.all([loadDashboard(), loadSubscribers(), loadCampaigns(), loadTemplates()]).finally(() => setLoading(false));
  }, [loadDashboard, loadSubscribers, loadCampaigns, loadTemplates]);

  // ── Subscriber Search ──
  useEffect(() => {
    if (tab === 'subscribers') {
      const timer = setTimeout(() => loadSubscribers(1, subscriberSearch, subscriberFilter), 400);
      return () => clearTimeout(timer);
    }
  }, [subscriberSearch, subscriberFilter, tab, loadSubscribers]);

  // ── Campaign Search ──
  useEffect(() => {
    if (tab === 'campaigns') {
      const timer = setTimeout(() => loadCampaigns(1, campaignSearch), 400);
      return () => clearTimeout(timer);
    }
  }, [campaignSearch, tab, loadCampaigns]);

  useEffect(() => {
    if (tab === 'templates') {
      loadTemplates();
    }
  }, [tab, loadTemplates]);

  // ── Campaign CRUD ──
  const openNewCampaign = () => {
    setEditingCampaign(null);
    setPreviewMode(false);
    setCampaignForm({ name: '', subject: '', preheader: '', fromName: '', contentHtml: '', scheduledAt: '' });
    setShowCampaignModal(true);
  };

  const openEditCampaign = (campaign) => {
    setEditingCampaign(campaign);
    setPreviewMode(false);
    setCampaignForm({
      name: campaign.name || '',
      subject: campaign.subject || '',
      preheader: campaign.preheader || '',
      fromName: campaign.fromName || '',
      contentHtml: campaign.contentHtml || '',
      scheduledAt: campaign.scheduledAt ? new Date(campaign.scheduledAt).toISOString().slice(0, 16) : '',
    });
    setShowCampaignModal(true);
  };

  const handleSaveCampaign = async () => {
    if (!campaignForm.name || !campaignForm.subject || !campaignForm.contentHtml) {
      toast.error('Name, subject, and content are required');
      return;
    }
    setSending(true);
    try {
      const payload = {
        ...campaignForm,
        scheduledAt: campaignForm.scheduledAt
          ? new Date(campaignForm.scheduledAt).toISOString()
          : null,
      };
      if (editingCampaign) {
        await marketingAPI.updateCampaign(editingCampaign.id, payload);
        toast.success('Campaign updated');
      } else {
        await marketingAPI.createCampaign(payload);
        toast.success('Campaign created');
      }
      setShowCampaignModal(false);
      setPreviewMode(false);
      loadCampaigns(campaignPagination.page);
      loadDashboard();
    } catch (err) {
      console.error('Failed to save campaign:', err);
      toast.error('Failed to save campaign');
    }
    setSending(false);
  };

  const handleDeleteCampaign = async (id) => {
    if (!window.confirm('Are you sure you want to delete this campaign?')) return;
    try {
      await marketingAPI.deleteCampaign(id);
      toast.success('Campaign deleted');
      loadCampaigns(campaignPagination.page);
    } catch {
      toast.error('Failed to delete campaign');
    }
  };

  const handleDuplicateCampaign = async (id) => {
    try {
      const r = await marketingAPI.duplicateCampaign(id);
      const data = r.data?.data || r.data;
      toast.success(`Campaign duplicated: "${data?.name || 'Copy'}"`);
      loadCampaigns(campaignPagination.page);
      loadDashboard();
    } catch (err) {
      console.error('Failed to duplicate campaign:', err);
      toast.error('Failed to duplicate campaign');
    }
  };

  const handleSendCampaign = async (id) => {
    if (!window.confirm('Send this campaign to all active subscribers?')) return;
    try {
      const r = await marketingAPI.sendCampaign(id, {});
      const data = r.data?.data || r.data;
      toast.success(data?.message || 'Campaign sending initiated');
      loadCampaigns(campaignPagination.page);
    } catch {
      toast.error('Failed to send campaign');
    }
  };

  // ── Campaign Analytics ──

  const openCampaignAnalytics = async (campaign) => {
    setViewingCampaign(campaign);
    setAnalyticsLoading(true);
    setCampaignRecipients([]);
    try {
      const [statsRes, recipientsRes] = await Promise.all([
        marketingAPI.getCampaignStats(campaign.id),
        marketingAPI.getCampaignRecipients(campaign.id, { page: 1, limit: 20 }),
      ]);
      setCampaignStats(statsRes.data?.data || statsRes.data || null);
      const rcps = recipientsRes.data?.data || recipientsRes.data || [];
      setCampaignRecipients(Array.isArray(rcps) ? rcps : []);
      const pagination = recipientsRes.data?.pagination || {};
      setRecipientPagination({
        page: pagination.page || 1,
        total: pagination.total || 0,
        totalPages: pagination.totalPages || 1,
      });
    } catch {
      toast.error('Failed to load campaign analytics');
    }
    setAnalyticsLoading(false);
  };

  // Delay chart rendering in modal until after layout is computed — prevents recharts -1 width/height
  useEffect(() => {
    if (!viewingCampaign || analyticsLoading) {
      setChartsReady(false);
      return;
    }
    const raf = requestAnimationFrame(() => setChartsReady(true));
    return () => cancelAnimationFrame(raf);
  }, [viewingCampaign, analyticsLoading]);

  const closeCampaignAnalytics = () => {
    setViewingCampaign(null);
    setCampaignStats(null);
    setCampaignRecipients([]);
    setRecipientPagination({ page: 1, total: 0, totalPages: 1 });
  };

  const loadMoreRecipients = async () => {
    if (!viewingCampaign || recipientsLoading) return;
    const nextPage = recipientPagination.page + 1;
    if (nextPage > recipientPagination.totalPages) return;
    setRecipientsLoading(true);
    try {
      const res = await marketingAPI.getCampaignRecipients(viewingCampaign.id, { page: nextPage, limit: 20 });
      const newItems = res.data?.data || res.data || [];
      const pagination = res.data?.pagination || {};
      setCampaignRecipients((prev) => [...prev, ...(Array.isArray(newItems) ? newItems : [])]);
      setRecipientPagination({
        page: pagination.page || nextPage,
        total: pagination.total || 0,
        totalPages: pagination.totalPages || 1,
      });
    } catch {
      toast.error('Failed to load more recipients');
    }
    setRecipientsLoading(false);
  };

  // ── CSV Export Handlers ──

  const handleExportSubscribers = async () => {
    try {
      const res = await marketingAPI.exportSubscribersCSV();
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'subscribers.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Subscribers exported');
    } catch {
      toast.error('Failed to export subscribers');
    }
  };

  const handleExportRecipients = async () => {
    if (!viewingCampaign) return;
    try {
      const res = await marketingAPI.exportCampaignRecipientsCSV(viewingCampaign.id);
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `campaign-${viewingCampaign.id.substring(0, 8)}-recipients.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Recipients exported');
    } catch {
      toast.error('Failed to export recipients');
    }
  };

  // ── Subscriber CRUD ──
  const handleAddSubscriber = async () => {
    if (!subscriberForm.email) {
      toast.error('Email is required');
      return;
    }
    try {
      await marketingAPI.createSubscriber(subscriberForm);
      toast.success('Subscriber added');
      setShowSubscriberModal(false);
      setSubscriberForm({ email: '', name: '' });
      loadSubscribers(subscriberPagination.page, subscriberSearch, subscriberFilter);
      loadDashboard();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to add subscriber';
      toast.error(msg);
    }
  };

  // ── CSV Import ──
  const handleImportClick = () => {
    setImportFile(null);
    setImportResult(null);
    setSkipDuplicates(true);
    setShowImportModal(true);
  };

  const handleImportSubmit = async () => {
    if (!importFile) { toast.error('Please select a CSV file'); return; }
    setImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append('file', importFile);
      formData.append('skipDuplicates', skipDuplicates.toString());
      const r = await marketingAPI.importSubscribersCSV(formData);
      const result = r.data?.data || r.data;
      setImportResult(result);
      toast.success(`Imported ${result.imported} subscribers`);
      loadSubscribers(1, subscriberSearch, subscriberFilter);
      loadDashboard();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to import CSV';
      toast.error(msg);
    }
    setImporting(false);
  };

  // ── Campaign from Template ──
  const handleTemplateCampaign = async () => {
    if (!templateForm.templateId || !templateForm.name || !templateForm.subject) {
      toast.error('Template, name, and subject are required');
      return;
    }
    setSending(true);
    try {
      let variables = {};
      try { variables = JSON.parse(templateForm.variables || '{}'); } catch { variables = {}; }
      await marketingAPI.createCampaignFromTemplate({
        templateId: templateForm.templateId,
        name: templateForm.name,
        subject: templateForm.subject,
        variables,
      });
      toast.success('Campaign created from template!');
      setShowTemplatePicker(false);
      setTemplateForm({ templateId: '', name: '', subject: '', variables: '{}' });
      loadCampaigns(campaignPagination.page);
    } catch {
      toast.error('Failed to create campaign from template');
    }
    setSending(false);
  };

  const handleDeleteSubscriber = async (id) => {
    if (!window.confirm('Delete this subscriber?')) return;
    try {
      await marketingAPI.deleteSubscriber(id);
      toast.success('Subscriber deleted');
      loadSubscribers(subscriberPagination.page, subscriberSearch, subscriberFilter);
      loadDashboard();
    } catch {
      toast.error('Failed to delete subscriber');
    }
  };

  const subscriberStats = dashboard?.subscribers || { total: 0, subscribed: 0, unsubscribed: 0, bounced: 0, recentSignups: 0 };
  const campaignData = dashboard?.campaigns || { total: 0, recent: [] };
  const engagement = dashboard?.engagement || { totalSent: 0, totalOpened: 0, totalClicked: 0, openRate: 0, clickRate: 0 };

  // ── Computed chart data from campaignStats ──
  const barChartData = campaignStats
    ? [
        { name: 'Sent', value: campaignStats.sent || 0, fill: '#3b82f6' },
        { name: 'Opened', value: campaignStats.opened || 0, fill: '#8b5cf6' },
        { name: 'Clicked', value: campaignStats.clicked || 0, fill: '#f59e0b' },
        { name: 'Bounced', value: campaignStats.bounced || 0, fill: '#ef4444' },
        { name: 'Failed', value: campaignStats.failed || 0, fill: '#f87171' },
      ]
    : [];
  const pieData = campaignStats
    ? [
        { name: 'Sent', value: campaignStats.sent || 0, color: '#3b82f6' },
        { name: 'Opened', value: campaignStats.opened || 0, color: '#8b5cf6' },
        { name: 'Bounced', value: campaignStats.bounced || 0, color: '#ef4444' },
        { name: 'Failed', value: campaignStats.failed || 0, color: '#f87171' },
        { name: 'Unsubscribed', value: campaignStats.unsubscribed || 0, color: '#9ca3af' },
      ].filter((d) => d.value > 0)
    : [];
  const sendCount = campaignStats
    ? (campaignStats.sent || 0) + (campaignStats.opened || 0) + (campaignStats.clicked || 0)
    : 0;
  const openRate = sendCount > 0 ? Math.round(((campaignStats?.opened || 0) / sendCount) * 100) : 0;
  const clickRate = (campaignStats?.opened || 0) > 0 ? Math.round(((campaignStats?.clicked || 0) / (campaignStats?.opened || 0)) * 100) : 0;
  const bounceRate = sendCount > 0 ? Math.round(((campaignStats?.bounced || 0) / sendCount) * 100) : 0;

  return (
    <div className="max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display text-2xl font-bold text-text-primary">Marketing</h2>
          <p className="text-sm text-text-muted">Manage subscribers, campaigns, and marketing analytics</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
              tab === t.id
                ? 'bg-brand-black text-white shadow-lg'
                : 'bg-white text-text-muted border border-border hover:border-brand-black/30'
            }`}
            onClick={() => setTab(t.id)}
          >
            <t.icon size={16} />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Overview Tab ── */}
      {tab === 'overview' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-border shadow-soft">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Users size={20} />
                </div>
                <div className="text-xs font-semibold text-text-muted uppercase tracking-wider">Total Subscribers</div>
              </div>
              <div className="text-3xl font-bold text-text-primary font-display">{subscriberStats.total || 0}</div>
              <div className="text-xs text-text-muted mt-1">
                {subscriberStats.subscribed || 0} active · {subscriberStats.recentSignups || 0} new this month
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-border shadow-soft">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-green-100 text-green-600 flex items-center justify-center">
                  <Send size={20} />
                </div>
                <div className="text-xs font-semibold text-text-muted uppercase tracking-wider">Campaigns</div>
              </div>
              <div className="text-3xl font-bold text-text-primary font-display">{campaignData.total || 0}</div>
              <div className="text-xs text-text-muted mt-1">
                {(campaignData.recent || []).filter((c) => c.status === 'SENT').length} sent to date
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-border shadow-soft">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                  <Eye size={20} />
                </div>
                <div className="text-xs font-semibold text-text-muted uppercase tracking-wider">Open Rate</div>
              </div>
              <div className="text-3xl font-bold text-text-primary font-display">{engagement.openRate || 0}%</div>
              <div className="text-xs text-text-muted mt-1">
                {engagement.totalOpened || 0} opens from {engagement.totalSent || 0} sent
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-border shadow-soft">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                  <MousePointerClick size={20} />
                </div>
                <div className="text-xs font-semibold text-text-muted uppercase tracking-wider">Click Rate</div>
              </div>
              <div className="text-3xl font-bold text-text-primary font-display">{engagement.clickRate || 0}%</div>
              <div className="text-xs text-text-muted mt-1">
                {engagement.totalClicked || 0} clicks from {engagement.totalOpened || 0} opens
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white p-5 rounded-2xl border border-border shadow-soft">
            <h3 className="font-display font-bold text-text-primary mb-4">Quick Actions</h3>
            <div className="flex flex-wrap gap-3">
              <button
                className="flex items-center gap-2 px-4 py-2.5 bg-brand-black text-white rounded-xl text-sm font-semibold hover:bg-black transition-colors"
                onClick={openNewCampaign}
              >
                <Plus size={16} />
                New Campaign
              </button>
              <button
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-border rounded-xl text-sm font-semibold hover:border-brand-black/30 transition-colors"
                onClick={() => { setShowSubscriberModal(true); }}
              >
                <Users size={16} />
                Add Subscriber
              </button>
              <button
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-border rounded-xl text-sm font-semibold hover:border-brand-black/30 transition-colors"
                onClick={() => setTab('campaigns')}
              >
                <Send size={16} />
                View Campaigns
              </button>
            </div>
          </div>

          {/* Recent Campaigns */}
          <div className="bg-white p-5 rounded-2xl border border-border shadow-soft">
            <h3 className="font-display font-bold text-text-primary mb-4">Recent Campaigns</h3>
            {(campaignData.recent || []).length > 0 ? (
              <div className="space-y-3">
                {(campaignData.recent || []).slice(0, 5).map((c) => (
                  <div key={c.id} className="flex items-center justify-between p-3 rounded-xl bg-surface border border-border/50">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-text-primary truncate">{c.name}</div>
                      <div className="text-xs text-text-muted mt-0.5">{c.subject}</div>
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${CAMPAIGN_STATUS_COLORS[c.status] || 'bg-gray-100 text-gray-500'}`}>
                        {c.status}
                      </span>
                      <span className="text-xs text-text-muted">
                        {c._count?.campaignrecipient || 0} recipients
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-text-muted text-sm">
                <Send size={32} className="mx-auto mb-2 opacity-30" />
                <p>No campaigns yet. Create your first campaign!</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Campaigns Tab ── */}
      {tab === 'campaigns' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                className="w-full pl-9 pr-4 py-2.5 border border-border rounded-xl text-sm bg-white focus:outline-none focus:border-brand-black transition-colors"
                placeholder="Search campaigns..."
                value={campaignSearch}
                onChange={(e) => setCampaignSearch(e.target.value)}
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-2.5 bg-brand-black text-white rounded-xl text-sm font-semibold hover:bg-black transition-colors ml-3" onClick={openNewCampaign}>
              <Plus size={16} />
              New Campaign
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-border shadow-soft overflow-hidden">
            {campaignsLoading ? (
              <div className="p-8 text-center text-text-muted">Loading campaigns...</div>
            ) : campaigns.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-surface/50">
                      <th className="text-left p-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Name</th>
                      <th className="text-left p-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Subject</th>
                      <th className="text-center p-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Status</th>
                      <th className="text-center p-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Sent</th>
                      <th className="text-center p-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Opened</th>
                      <th className="text-center p-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Clicked</th>
                      <th className="text-right p-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.map((c) => (
                      <tr key={c.id} className="border-b border-border/50 hover:bg-surface/50 transition-colors">
                        <td className="p-4">
                          <div className="font-semibold text-sm text-text-primary">{c.name}</div>
                          <div className="text-xs text-text-muted mt-0.5">{c.fromName || 'Store'} · {c.type}</div>
                        </td>
                        <td className="p-4 text-sm text-text-muted max-w-[200px] truncate">{c.subject}</td>
                        <td className="p-4 text-center">
                          <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${CAMPAIGN_STATUS_COLORS[c.status] || 'bg-gray-100 text-gray-500'}`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="p-4 text-center text-sm text-text-primary font-semibold">{c.sentCount || 0}</td>
                        <td className="p-4 text-center text-sm text-text-primary">{c.openedCount || 0}</td>
                        <td className="p-4 text-center text-sm text-text-primary">{c.clickedCount || 0}</td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {(c.status === 'DRAFT' || c.status === 'SCHEDULED' || c.status === 'PAUSED') && (
                              <>
                                <button
                                  className="p-2 text-text-muted hover:text-brand-black transition-colors rounded-lg hover:bg-surface"
                                  onClick={() => openEditCampaign(c)}
                                  title="Edit"
                                >
                                  <Edit2 size={15} />
                                </button>
                                <button
                                  className="p-2 text-green-600 hover:text-green-700 transition-colors rounded-lg hover:bg-green-50"
                                  onClick={() => handleSendCampaign(c.id)}
                                  title="Send"
                                >
                                  <Play size={15} />
                                </button>
                              </>
                            )}
                            {c.status === 'SENT' && (
                              <button
                                className="p-2 text-blue-600 hover:text-blue-700 transition-colors rounded-lg hover:bg-blue-50"
                                onClick={() => openCampaignAnalytics(c)}
                                title="View Analytics"
                              >
                                <Eye size={15} />
                              </button>
                            )}
                            <button
                              className="p-2 text-text-muted hover:text-brand-black transition-colors rounded-lg hover:bg-surface"
                              onClick={() => handleDuplicateCampaign(c.id)}
                              title="Duplicate"
                            >
                              <Copy size={15} />
                            </button>
                            <button
                              className="p-2 text-red-500 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50"
                              onClick={() => handleDeleteCampaign(c.id)}
                              title="Delete"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center text-text-muted">
                <Send size={40} className="mx-auto mb-3 opacity-20" />
                <p className="font-semibold">No campaigns yet</p>
                <p className="text-sm mt-1">Create your first email campaign to get started</p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {campaignPagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              {Array.from({ length: campaignPagination.totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  className={`w-8 h-8 rounded-lg text-sm font-semibold ${
                    p === campaignPagination.page
                      ? 'bg-brand-black text-white'
                      : 'bg-white border border-border text-text-muted hover:border-brand-black/30'
                  }`}
                  onClick={() => loadCampaigns(p, campaignSearch)}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Templates Tab ── */}
      {tab === 'templates' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-lg text-text-primary">Campaign Templates</h3>
            <button className="flex items-center gap-2 px-4 py-2.5 bg-brand-black text-white rounded-xl text-sm font-semibold hover:bg-black transition-colors" onClick={() => { setShowTemplatePicker(true); }}>
              <Plus size={16} />
              Use Template
            </button>
          </div>
          {templatesLoading ? (
            <div className="p-8 text-center text-text-muted">Loading templates...</div>
          ) : templates.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((tpl) => (
                <div key={tpl.id} className="bg-white rounded-2xl border border-border shadow-soft overflow-hidden hover:shadow-card transition-all group">
                  <div className="h-36 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                    <Layout size={40} className="text-text-muted opacity-40 group-hover:opacity-60 transition-opacity" />
                  </div>
                  <div className="p-4">
                    <h4 className="font-semibold text-sm text-text-primary truncate">{tpl.name}</h4>
                    <p className="text-xs text-text-muted mt-1 line-clamp-2 h-8">{tpl.description || 'No description'}</p>
                    <div className="flex items-center gap-2 mt-3">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-surface text-text-muted uppercase">{tpl.category}</span>
                      {tpl.isDefault && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-600">Default</span>}
                    </div>
                    <button className="mt-3 w-full px-3 py-2 bg-brand-black text-white rounded-xl text-xs font-semibold hover:bg-black transition-colors opacity-0 group-hover:opacity-100" onClick={() => {
                      setTemplateForm({
                        templateId: tpl.id,
                        name: tpl.name + ' Campaign',
                        subject: tpl.name,
                        variables: '{}',
                      });
                      setShowTemplatePicker(true);
                    }}>
                      Use This Template
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-border shadow-soft p-12 text-center text-text-muted">
              <Layout size={40} className="mx-auto mb-3 opacity-20" />
              <p className="font-semibold">No templates yet</p>
              <p className="text-sm mt-1">Templates will be pre-loaded automatically or you can create your own.</p>
              <button className="mt-4 px-6 py-2.5 bg-brand-black text-white rounded-xl text-sm font-semibold" onClick={loadTemplates}>Reload Templates</button>
            </div>
          )}
        </div>
      )}

      {/* ── Subscribers Tab ── */}
      {tab === 'subscribers' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  className="w-full pl-9 pr-4 py-2.5 border border-border rounded-xl text-sm bg-white focus:outline-none focus:border-brand-black transition-colors"
                  placeholder="Search subscribers..."
                  value={subscriberSearch}
                  onChange={(e) => setSubscriberSearch(e.target.value)}
                />
              </div>
              <select
                className="px-3 py-2.5 border border-border rounded-xl text-sm bg-white focus:outline-none focus:border-brand-black"
                value={subscriberFilter}
                onChange={(e) => setSubscriberFilter(e.target.value)}
              >
                <option value="">All Status</option>
                <option value="SUBSCRIBED">Subscribed</option>
                <option value="UNSUBSCRIBED">Unsubscribed</option>
                <option value="BOUNCED">Bounced</option>
              </select>
            </div>
            <button
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-border rounded-xl text-sm font-semibold hover:border-brand-black/30 transition-colors ml-2"
              onClick={handleExportSubscribers}
            >
              <Download size={16} />
              Export CSV
            </button>
            <button
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-border rounded-xl text-sm font-semibold hover:border-brand-black/30 transition-colors ml-2"
              onClick={handleImportClick}
            >
              <Upload size={16} />
              Import CSV
            </button>
            <button
              className="flex items-center gap-2 px-4 py-2.5 bg-brand-black text-white rounded-xl text-sm font-semibold hover:bg-black transition-colors ml-3"
              onClick={() => setShowSubscriberModal(true)}
            >
              <Plus size={16} />
              Add Subscriber
            </button>
          </div>

          {/* Stats bar */}
          <div className="flex gap-4 mb-4 text-xs">
            <span className="font-semibold text-text-muted">Total: <strong className="text-text-primary">{subscriberStats.total || 0}</strong></span>
            <span className="text-green-600 font-semibold">Active: <strong>{subscriberStats.subscribed || 0}</strong></span>
            <span className="text-gray-500 font-semibold">Unsubscribed: <strong>{subscriberStats.unsubscribed || 0}</strong></span>
            <span className="text-red-600 font-semibold">Bounced: <strong>{subscriberStats.bounced || 0}</strong></span>
          </div>

          <div className="bg-white rounded-2xl border border-border shadow-soft overflow-hidden">
            {subscribersLoading ? (
              <div className="p-8 text-center text-text-muted">Loading subscribers...</div>
            ) : subscribers.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-surface/50">
                      <th className="text-left p-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Email</th>
                      <th className="text-left p-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Name</th>
                      <th className="text-center p-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Status</th>
                      <th className="text-center p-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Source</th>
                      <th className="text-right p-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Joined</th>
                      <th className="text-right p-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscribers.map((s) => (
                      <tr key={s.id} className="border-b border-border/50 hover:bg-surface/50 transition-colors">
                        <td className="p-4 text-sm font-medium text-text-primary">{s.email}</td>
                        <td className="p-4 text-sm text-text-muted">{s.name || '—'}</td>
                        <td className="p-4 text-center">
                          <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${SUBSCRIBER_STATUS_COLORS[s.status] || 'bg-gray-100 text-gray-500'}`}>
                            {s.status}
                          </span>
                        </td>
                        <td className="p-4 text-center text-xs text-text-muted">{s.source || '—'}</td>
                        <td className="p-4 text-right text-xs text-text-muted">
                          {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : '—'}
                        </td>
                        <td className="p-4 text-right">
                          <button
                            className="p-2 text-red-500 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50"
                            onClick={() => handleDeleteSubscriber(s.id)}
                            title="Delete"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center text-text-muted">
                <Users size={40} className="mx-auto mb-3 opacity-20" />
                <p className="font-semibold">No subscribers yet</p>
                <p className="text-sm mt-1">Subscribers will appear when they sign up via the newsletter form</p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {subscriberPagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              {Array.from({ length: subscriberPagination.totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  className={`w-8 h-8 rounded-lg text-sm font-semibold ${
                    p === subscriberPagination.page
                      ? 'bg-brand-black text-white'
                      : 'bg-white border border-border text-text-muted hover:border-brand-black/30'
                  }`}
                  onClick={() => loadSubscribers(p, subscriberSearch, subscriberFilter)}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Campaign Modal ── */}
      {showCampaignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => { setShowCampaignModal(false); setPreviewMode(false); }}>
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl m-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h3 className="font-display font-bold text-lg text-text-primary">
                {editingCampaign ? 'Edit Campaign' : 'New Campaign'}
              </h3>
              <button className="p-2 hover:bg-surface rounded-lg transition-colors" onClick={() => { setShowCampaignModal(false); setPreviewMode(false); }}>
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="form-group">
                <label className="text-sm font-semibold text-text-primary block mb-1.5">Campaign Name</label>
                <input
                  className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:border-brand-black"
                  placeholder="e.g. Summer Sale Announcement"
                  value={campaignForm.name}
                  onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="text-sm font-semibold text-text-primary block mb-1.5">Subject Line</label>
                  <input
                    className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:border-brand-black"
                    placeholder="Don't miss our summer sale!"
                    value={campaignForm.subject}
                    onChange={(e) => setCampaignForm({ ...campaignForm, subject: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="text-sm font-semibold text-text-primary block mb-1.5">Preheader (optional)</label>
                  <input
                    className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:border-brand-black"
                    placeholder="Short preview text..."
                    value={campaignForm.preheader}
                    onChange={(e) => setCampaignForm({ ...campaignForm, preheader: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="text-sm font-semibold text-text-primary block mb-1.5">From Name</label>
                <input
                  className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:border-brand-black"
                  placeholder="Your Store Name"
                  value={campaignForm.fromName}
                  onChange={(e) => setCampaignForm({ ...campaignForm, fromName: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="text-sm font-semibold text-text-primary block mb-1.5">Schedule (optional)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="datetime-local"
                    className="flex-1 px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:border-brand-black"
                    value={campaignForm.scheduledAt}
                    min={new Date().toISOString().slice(0, 16)}
                    onChange={(e) => setCampaignForm({ ...campaignForm, scheduledAt: e.target.value })}
                  />
                  {campaignForm.scheduledAt && (
                    <button
                      className="p-2 text-text-muted hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                      onClick={() => setCampaignForm({ ...campaignForm, scheduledAt: '' })}
                      title="Clear schedule"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-text-muted mt-1.5">
                  {campaignForm.scheduledAt
                    ? `Campaign will be sent on ${new Date(campaignForm.scheduledAt).toLocaleString()}`
                    : 'Leave empty to create as draft. Set a date to schedule automatic delivery.'}
                </p>
              </div>

              {/* HTML / Preview Toggle */}
              <div className="flex items-center gap-2 border-b border-border pb-3">
                <button
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    !previewMode
                      ? 'bg-brand-black text-white shadow-sm'
                      : 'bg-white text-text-muted border border-border hover:border-brand-black/30'
                  }`}
                  onClick={() => setPreviewMode(false)}
                >
                  HTML
                </button>
                <button
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    previewMode
                      ? 'bg-brand-black text-white shadow-sm'
                      : 'bg-white text-text-muted border border-border hover:border-brand-black/30'
                  }`}
                  onClick={() => setPreviewMode(true)}
                >
                  <Eye size={15} />
                  Preview
                </button>
              </div>

              {previewMode ? (
                <div className="form-group">
                  <label className="text-sm font-semibold text-text-primary block mb-1.5">
                    Email Preview
                  </label>
                  <div className="bg-white rounded-xl border border-border overflow-hidden">
                    {/* Simulated email client header */}
                    <div className="px-5 py-4 border-b border-border bg-surface/30 space-y-1.5">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-semibold text-text-muted w-14 shrink-0">From:</span>
                        <span className="text-text-primary">{campaignForm.fromName || 'Your Store'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-semibold text-text-muted w-14 shrink-0">Subject:</span>
                        <span className="text-text-primary font-medium">{campaignForm.subject || '(no subject)'}</span>
                      </div>
                      {campaignForm.preheader && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-semibold text-text-muted w-14 shrink-0">Preheader:</span>
                          <span className="text-text-muted text-xs">{campaignForm.preheader}</span>
                        </div>
                      )}
                    </div>
                    {/* Iframe preview */}
                    <div className="bg-white">
                      {campaignForm.contentHtml ? (
                        <iframe
                          title="Email preview"
                          srcDoc={`
                            <!DOCTYPE html>
                            <html>
                            <head>
                              <meta charset="utf-8">
                              <meta name="viewport" content="width=device-width, initial-scale=1">
                              <style>
                                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; color: #1a1a1a; }
                                img { max-width: 100%; height: auto; }
                                a { color: #2563eb; }
                                ${!campaignForm.contentHtml.includes('<style') && !campaignForm.contentHtml.includes('<link') ? 'table { max-width: 100%; } td { word-break: break-word; }' : ''}
                              </style>
                            </head>
                            <body>
                              ${campaignForm.contentHtml}
                            </body>
                            </html>
                          `}
                          sandbox="allow-same-origin"
                          className="w-full"
                          style={{ height: '420px', border: 'none' }}
                        />
                      ) : (
                        <div className="flex items-center justify-center h-64 text-text-muted text-sm">
                          <div className="text-center">
                            <Send size={32} className="mx-auto mb-2 opacity-20" />
                            <p>Enter HTML content to see a preview</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-[11px] text-text-muted mt-1.5">
                    This is a simulated preview. The actual email may render differently depending on the email client.
                  </p>
                </div>
              ) : (
                <div className="form-group">
                  <label className="text-sm font-semibold text-text-primary block mb-1.5">
                    Email Content (HTML)
                  </label>
                  <textarea
                    className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:border-brand-black font-mono"
                    rows={12}
                    placeholder="<h1>Your email content here...</h1>"
                    value={campaignForm.contentHtml}
                    onChange={(e) => setCampaignForm({ ...campaignForm, contentHtml: e.target.value })}
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-border bg-surface/50">
              <button
                className="px-4 py-2.5 border border-border rounded-xl text-sm font-semibold hover:bg-surface transition-colors"
                onClick={() => { setShowCampaignModal(false); setPreviewMode(false); }}
              >
                Cancel
              </button>
              <button
                className="px-6 py-2.5 bg-brand-black text-white rounded-xl text-sm font-semibold hover:bg-black transition-colors disabled:opacity-50"
                disabled={sending}
                onClick={handleSaveCampaign}
              >
                {sending ? 'Saving...' : editingCampaign ? 'Update Campaign' : 'Create Campaign'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Campaign Analytics Modal ── */}
      {viewingCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={closeCampaignAnalytics}>
          <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto shadow-2xl m-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-white z-10">
              <div className="flex-1 min-w-0">
                <h3 className="font-display font-bold text-lg text-text-primary truncate">{viewingCampaign.name}</h3>
                <p className="text-sm text-text-muted truncate mt-0.5">{viewingCampaign.subject}</p>
              </div>
              <div className="flex items-center gap-3 ml-4">
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase whitespace-nowrap ${CAMPAIGN_STATUS_COLORS[viewingCampaign.status] || 'bg-gray-100 text-gray-500'}`}>
                  {viewingCampaign.status}
                </span>
                <button className="p-2 hover:bg-surface rounded-lg transition-colors" onClick={closeCampaignAnalytics}>
                  <X size={18} />
                </button>
              </div>
            </div>

            {analyticsLoading ? (
              <div className="p-12 text-center text-text-muted">
                <Activity size={32} className="mx-auto mb-3 animate-spin opacity-40" />
                <p>Loading campaign analytics...</p>
              </div>
            ) : campaignStats ? (
              <div className="p-6 space-y-8">
                {/* KPI Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                  <div className="bg-surface p-4 rounded-xl border border-border/50 text-center">
                    <Send size={18} className="mx-auto mb-1.5 text-blue-500" />
                    <div className="text-xl font-bold text-text-primary">{campaignStats.sent || 0}</div>
                    <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mt-0.5">Sent</div>
                  </div>
                  <div className="bg-surface p-4 rounded-xl border border-border/50 text-center">
                    <Eye size={18} className="mx-auto mb-1.5 text-purple-500" />
                    <div className="text-xl font-bold text-text-primary">{campaignStats.opened || 0}</div>
                    <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mt-0.5">Opened</div>
                  </div>
                  <div className="bg-surface p-4 rounded-xl border border-border/50 text-center">
                    <MousePointerClick size={18} className="mx-auto mb-1.5 text-amber-500" />
                    <div className="text-xl font-bold text-text-primary">{campaignStats.clicked || 0}</div>
                    <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mt-0.5">Clicked</div>
                  </div>
                  <div className="bg-surface p-4 rounded-xl border border-border/50 text-center">
                    <AlertTriangle size={18} className="mx-auto mb-1.5 text-red-500" />
                    <div className="text-xl font-bold text-text-primary">{campaignStats.bounced || 0}</div>
                    <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mt-0.5">Bounced</div>
                  </div>
                  <div className="bg-surface p-4 rounded-xl border border-border/50 text-center">
                    <X size={18} className="mx-auto mb-1.5 text-red-400" />
                    <div className="text-xl font-bold text-text-primary">{campaignStats.failed || 0}</div>
                    <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mt-0.5">Failed</div>
                  </div>
                  <div className="bg-surface p-4 rounded-xl border border-border/50 text-center">
                    <Users size={18} className="mx-auto mb-1.5 text-gray-400" />
                    <div className="text-xl font-bold text-text-primary">{campaignStats.unsubscribed || 0}</div>
                    <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mt-0.5">Unsub'd</div>
                  </div>
                  <div className="bg-surface p-4 rounded-xl border border-border/50 text-center">
                    <AlertTriangle size={18} className="mx-auto mb-1.5 text-orange-400" />
                    <div className="text-xl font-bold text-text-primary">{campaignStats.complained || 0}</div>
                    <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mt-0.5">Complaints</div>
                  </div>
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Bar Chart — Engagement Metrics */}
                  <div className="bg-white p-5 rounded-xl border border-border shadow-soft">
                    <h4 className="font-display font-bold text-sm text-text-primary mb-4">Engagement Breakdown</h4>
                    {chartsReady ? (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barChartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                          <Tooltip
                            contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                          />
                          <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={48}>
                            {barChartData.map((entry, idx) => (
                              <Cell key={idx} fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    ) : <div style={{ height: 256 }} />}
                  </div>

                  {/* Pie Chart — Delivery Status Distribution */}
                  <div className="bg-white p-5 rounded-xl border border-border shadow-soft">
                    <h4 className="font-display font-bold text-sm text-text-primary mb-4">Delivery Distribution</h4>
                    {chartsReady ? (
                    <div className="h-64">
                      {pieData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={pieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={55}
                              outerRadius={85}
                              paddingAngle={3}
                              dataKey="value"
                            >
                              {pieData.map((entry, idx) => (
                                <Cell key={idx} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                            />
                            <Legend
                              wrapperStyle={{ fontSize: '11px' }}
                              iconType="circle"
                              iconSize={8}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full text-text-muted text-sm">
                          No delivery data available
                        </div>
                      )}
                    </div>
                    ) : <div style={{ height: 256 }} />}
                  </div>
                </div>

                {/* Rate Metrics */}
                <div className="bg-white p-5 rounded-xl border border-border shadow-soft">
                  <h4 className="font-display font-bold text-sm text-text-primary mb-4">Performance Rates</h4>
                  <div className="grid grid-cols-3 gap-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-purple-600 font-display">{openRate}%</div>
                      <div className="text-xs text-text-muted mt-1">Open Rate</div>
                      <div className="w-full bg-gray-100 rounded-full h-2 mt-2">
                        <div className="bg-purple-500 h-2 rounded-full transition-all duration-500" style={{ width: `${Math.min(openRate, 100)}%` }} />
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-amber-600 font-display">{clickRate}%</div>
                      <div className="text-xs text-text-muted mt-1">Click Rate (of opens)</div>
                      <div className="w-full bg-gray-100 rounded-full h-2 mt-2">
                        <div className="bg-amber-500 h-2 rounded-full transition-all duration-500" style={{ width: `${Math.min(clickRate, 100)}%` }} />
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-red-600 font-display">{bounceRate}%</div>
                      <div className="text-xs text-text-muted mt-1">Bounce Rate</div>
                      <div className="w-full bg-gray-100 rounded-full h-2 mt-2">
                        <div className="bg-red-500 h-2 rounded-full transition-all duration-500" style={{ width: `${Math.min(bounceRate, 100)}%` }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recipients List */}
                <div className="bg-white rounded-xl border border-border shadow-soft overflow-hidden">
                  <div className="px-5 py-4 border-b border-border bg-surface/50 flex items-center justify-between">
                    <div>
                      <h4 className="font-display font-bold text-sm text-text-primary">Recipients</h4>
                      <p className="text-xs text-text-muted mt-0.5">
                        Showing {Math.min(campaignRecipients.length, recipientPagination.total)} of {recipientPagination.total} recipients
                      </p>
                    </div>
                    <button
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-border rounded-lg text-xs font-semibold hover:border-brand-black/30 hover:bg-surface transition-colors"
                      onClick={handleExportRecipients}
                    >
                      <Download size={13} />
                      Export CSV
                    </button>
                  </div>
                  {campaignRecipients.length > 0 ? (
                    <>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="text-left p-3 text-[10px] font-semibold text-text-muted uppercase tracking-wider">Email</th>
                              <th className="text-left p-3 text-[10px] font-semibold text-text-muted uppercase tracking-wider">Name</th>
                              <th className="text-center p-3 text-[10px] font-semibold text-text-muted uppercase tracking-wider">Status</th>
                              <th className="text-center p-3 text-[10px] font-semibold text-text-muted uppercase tracking-wider">Sent</th>
                              <th className="text-center p-3 text-[10px] font-semibold text-text-muted uppercase tracking-wider">Opened</th>
                              <th className="text-center p-3 text-[10px] font-semibold text-text-muted uppercase tracking-wider">Clicked</th>
                            </tr>
                          </thead>
                          <tbody>
                            {campaignRecipients.map((r) => (
                              <tr key={r.id} className="border-b border-border/50 hover:bg-surface/50 transition-colors">
                                <td className="p-3 text-sm text-text-primary">{r.subscriber?.email || '—'}</td>
                                <td className="p-3 text-sm text-text-muted">{r.subscriber?.name || '—'}</td>
                                <td className="p-3 text-center">
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                    r.status === 'OPENED' ? 'bg-purple-100 text-purple-600' :
                                    r.status === 'CLICKED' ? 'bg-amber-100 text-amber-600' :
                                    r.status === 'BOUNCED' ? 'bg-red-100 text-red-600' :
                                    r.status === 'FAILED' ? 'bg-red-100 text-red-600' :
                                    r.status === 'SENT' ? 'bg-blue-100 text-blue-600' :
                                    'bg-gray-100 text-gray-500'
                                  }`}>
                                    {r.status}
                                  </span>
                                </td>
                                <td className="p-3 text-center text-xs text-text-muted">
                                  {r.sentAt ? new Date(r.sentAt).toLocaleDateString() : '—'}
                                </td>
                                <td className="p-3 text-center text-xs text-text-muted">
                                  {r.openedAt ? new Date(r.openedAt).toLocaleDateString() : '—'}
                                </td>
                                <td className="p-3 text-center text-xs text-text-muted">
                                  {r.clickedAt ? new Date(r.clickedAt).toLocaleDateString() : '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {/* Load More */}
                      {recipientPagination.page < recipientPagination.totalPages && (
                        <div className="px-5 py-4 border-t border-border text-center">
                          <button
                            className="px-6 py-2.5 bg-white border border-border rounded-xl text-sm font-semibold hover:border-brand-black/30 hover:bg-surface transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={loadMoreRecipients}
                            disabled={recipientsLoading}
                          >
                            {recipientsLoading ? (
                              <span className="flex items-center gap-2">
                                <Activity size={14} className="animate-spin" />
                                Loading...
                              </span>
                            ) : (
                              `Load More (${recipientPagination.total - campaignRecipients.length} remaining)`
                            )}
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="p-8 text-center text-text-muted text-sm">
                      <Send size={24} className="mx-auto mb-2 opacity-30" />
                      <p>No recipient data available yet</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-text-muted text-sm">
                <Activity size={24} className="mx-auto mb-2 opacity-30" />
                <p>No analytics available for this campaign</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Template Picker Modal ── */}
      {showTemplatePicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => { setShowTemplatePicker(false); setTemplateForm({ templateId: '', name: '', subject: '', variables: '{}' }); }}>
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-y-auto shadow-2xl m-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-white z-10">
              <h3 className="font-display font-bold text-lg text-text-primary">Create Campaign from Template</h3>
              <button className="p-2 hover:bg-surface rounded-lg transition-colors" onClick={() => { setShowTemplatePicker(false); setTemplateForm({ templateId: '', name: '', subject: '', variables: '{}' }); }}><X size={18} /></button>
            </div>

            {/* Template Selection */}
            {!templateForm.templateId ? (
              <div className="p-6">
                <p className="text-sm text-text-muted mb-4">Choose a pre-built template to get started:</p>
                {templatesLoading ? (
                  <div className="p-6 text-center text-text-muted">Loading templates...</div>
                ) : templates.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {templates.map((tpl) => (
                      <button
                        key={tpl.id}
                        className="text-left p-4 rounded-xl border border-border hover:border-brand-black/50 hover:shadow-md transition-all bg-white"
                        onClick={() => setTemplateForm({ ...templateForm, templateId: tpl.id, name: tpl.name + ' Campaign', subject: tpl.name })}
                      >
                        <div className="w-full h-32 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-3xl mb-3">
                          <Layout size={28} className="text-text-muted" />
                        </div>
                        <h4 className="font-semibold text-sm text-text-primary truncate">{tpl.name}</h4>
                        <p className="text-xs text-text-muted mt-1 line-clamp-2">{tpl.description || 'No description'}</p>
                        <span className="inline-block mt-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-surface text-text-muted uppercase">{tpl.category}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center text-text-muted">
                    <FileText size={32} className="mx-auto mb-2 opacity-30" />
                    <p>No templates available</p>
                  </div>
                )}
              </div>
            ) : (
              /* Campaign Settings */
              <div className="p-6 space-y-4">
                <div className="bg-surface/50 rounded-xl p-4 border border-border/50 mb-4">
                  <p className="text-xs font-semibold text-text-muted">Selected Template: <strong className="text-text-primary">{templates.find((t) => t.id === templateForm.templateId)?.name}</strong></p>
                </div>
                <div className="form-group">
                  <label className="text-sm font-semibold text-text-primary block mb-1.5">Campaign Name *</label>
                  <input className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:border-brand-black" value={templateForm.name} onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="text-sm font-semibold text-text-primary block mb-1.5">Subject Line *</label>
                  <input className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:border-brand-black" value={templateForm.subject} onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="text-sm font-semibold text-text-primary block mb-1.5">Variables (JSON)</label>
                  <textarea className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:border-brand-black font-mono" rows={4} value={templateForm.variables} onChange={(e) => setTemplateForm({ ...templateForm, variables: e.target.value })} placeholder='{"storeName": "My Store", "userName": "Customer"}' />
                  <p className="text-[11px] text-text-muted mt-1">Custom variables to replace in the template. Check each template for available variables.</p>
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <button className="px-4 py-2.5 border border-border rounded-xl text-sm font-semibold hover:bg-surface transition-colors" onClick={() => setTemplateForm({ ...templateForm, templateId: '' })}>← Back to Templates</button>
                  <button className="px-4 py-2.5 bg-brand-black text-white rounded-xl text-sm font-semibold hover:bg-black transition-colors disabled:opacity-50 ml-auto" disabled={sending} onClick={handleTemplateCampaign}>{sending ? 'Creating...' : 'Create Campaign'}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CSV Import Modal ── */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => { setShowImportModal(false); setImportResult(null); }}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl m-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h3 className="font-display font-bold text-lg text-text-primary">Import Subscribers from CSV</h3>
              <button className="p-2 hover:bg-surface rounded-lg transition-colors" onClick={() => { setShowImportModal(false); setImportResult(null); }}><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              {importResult ? (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <p className="text-sm font-semibold text-green-700 mb-2">✅ Import Complete</p>
                    <div className="text-sm text-green-600 space-y-1">
                      <p>Imported: <strong>{importResult.imported}</strong></p>
                      <p>Skipped: <strong>{importResult.skipped}</strong></p>
                      <p>Errors: <strong>{importResult.errors}</strong></p>
                      <p>Total rows: <strong>{importResult.total}</strong></p>
                    </div>
                  </div>
                  {importResult.errorRows?.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                      <p className="text-xs font-semibold text-red-700 mb-2">Errors ({importResult.errorRows.length}):</p>
                      <div className="max-h-24 overflow-y-auto">
                        {importResult.errorRows.map((e, i) => (
                          <p key={i} className="text-xs text-red-600">Row {e.row}: {e.reason}</p>
                        ))}
                      </div>
                    </div>
                  )}
                  <button className="w-full px-4 py-2.5 bg-brand-black text-white rounded-xl text-sm font-semibold hover:bg-black transition-colors" onClick={() => { setShowImportModal(false); setImportResult(null); }}>Done</button>
                </div>
              ) : (
                <>
                  <div className="form-group">
                    <label className="text-sm font-semibold text-text-primary block mb-1.5">CSV File *</label>
                    <input type="file" accept=".csv" className="w-full px-3 py-2.5 border border-border rounded-xl text-sm file:mr-3 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:bg-brand-black file:text-white file:text-xs file:font-semibold hover:file:bg-black" onChange={(e) => setImportFile(e.target.files[0])} />
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="skipDups" checked={skipDuplicates} onChange={(e) => setSkipDuplicates(e.target.checked)} className="rounded border-border" />
                    <label htmlFor="skipDups" className="text-xs text-text-muted">Skip duplicate emails (overwrite if unchecked)</label>
                  </div>
                  <div className="bg-surface/50 rounded-xl p-4 border border-border/50">
                    <p className="text-xs font-semibold text-text-muted mb-2">CSV Format Requirements:</p>
                    <p className="text-xs text-text-muted font-mono">email,name,phone,tags,source</p>
                    <p className="text-xs text-text-muted mt-2">Only <strong className="text-text-primary">email</strong> is required. Other columns are optional.</p>
                  </div>
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button className="px-4 py-2.5 border border-border rounded-xl text-sm font-semibold hover:bg-surface transition-colors" onClick={() => { setShowImportModal(false); setImportResult(null); }}>Cancel</button>
                    <button className="px-6 py-2.5 bg-brand-black text-white rounded-xl text-sm font-semibold hover:bg-black transition-colors disabled:opacity-50" disabled={!importFile || importing} onClick={handleImportSubmit}>
                      {importing ? 'Importing...' : 'Import CSV'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Subscriber Modal ── */}
      {showSubscriberModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowSubscriberModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl m-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h3 className="font-display font-bold text-lg text-text-primary">Add Subscriber</h3>
              <button className="p-2 hover:bg-surface rounded-lg transition-colors" onClick={() => setShowSubscriberModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="form-group">
                <label className="text-sm font-semibold text-text-primary block mb-1.5">Email *</label>
                <input
                  className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:border-brand-black"
                  placeholder="customer@example.com"
                  type="email"
                  value={subscriberForm.email}
                  onChange={(e) => setSubscriberForm({ ...subscriberForm, email: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="text-sm font-semibold text-text-primary block mb-1.5">Name (optional)</label>
                <input
                  className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:border-brand-black"
                  placeholder="John Doe"
                  value={subscriberForm.name}
                  onChange={(e) => setSubscriberForm({ ...subscriberForm, name: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-border bg-surface/50">
              <button
                className="px-4 py-2.5 border border-border rounded-xl text-sm font-semibold hover:bg-surface transition-colors"
                onClick={() => setShowSubscriberModal(false)}
              >
                Cancel
              </button>
              <button
                className="px-6 py-2.5 bg-brand-black text-white rounded-xl text-sm font-semibold hover:bg-black transition-colors"
                onClick={handleAddSubscriber}
              >
                Add Subscriber
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
