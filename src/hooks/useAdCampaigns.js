import { useState, useEffect, useCallback } from 'react';
import { adsAPI } from '../api/ads';
import toast from '../utils/toast';
import { useConfirm } from '../contexts/ConfirmContext';

export default function useAdCampaigns(search) {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [platformFilter, setPlatformFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });
  const [stats, setStats] = useState(null);
  const [staleCampaigns, setStaleCampaigns] = useState([]);
  const [syncingAll, setSyncingAll] = useState(false);

  // ── Modal State ──
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: '', platform: 'INSTAGRAM', objective: '', budget: '',
    startDate: '', endDate: '', creativeUrl: '', creativeType: 'IMAGE',
    landingUrl: '', notes: '', creativeFileName: '', creativeFileSize: 0,
    carouselUrls: [],
    // ── Advanced targeting ──
    ageMin: '', ageMax: '', gender: 'ALL', locations: [], interests: [],
    keywords: [], devices: [], placements: [],
    // ── Budget & bidding ──
    budgetType: 'TOTAL', dailyBudget: '', budgetPacing: 'STANDARD',
    bidStrategy: 'LOWEST_COST', bidAmount: '',
    // ── Scheduling & frequency ──
    scheduleDays: [], scheduleHours: [], frequencyCap: '', frequencyCapPeriod: 'DAY',
    // ── Creative text ──
    headline: '', primaryText: '', callToAction: 'SHOP_NOW',
    // ── Tracking & UTM ──
    isTrackingEnabled: true, utmSource: '', utmMedium: '', utmCampaign: '', utmContent: '',
    // ── KPI targets ──
    targetCtr: '', targetCpc: '', targetRoas: '',
  });
  const [modalLoading, setModalLoading] = useState(false);

  // ── Detail Panel State ──
  const [campaignDetail, setCampaignDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [campaignProducts, setCampaignProducts] = useState([]);

  const loadCampaigns = useCallback(async (page = 1, platform = '') => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (platform && platform !== 'all') params.platform = platform;
      if (search) params.search = search;
      const r = await adsAPI.getCampaigns(params);
      // New format: { success, data: { data: [...items], current_page, last_page, total } }
      const responseData = r.data?.data || r.data || {};
      const list = responseData?.data || responseData?.items || [];
      setCampaigns(Array.isArray(list) ? list : []);
      setPagination({
        page: responseData.current_page || page,
        total: responseData.total || 0,
        totalPages: responseData.last_page || 1,
      });

      // Detect stale campaigns (not synced in 24h)
      const pushed = (Array.isArray(list) ? list : []).filter(
        c => c.platformCampaignId && (c.platform === 'FACEBOOK' || c.platform === 'INSTAGRAM' || c.platform === 'GOOGLE')
      );
      const stale = pushed.filter(c => {
        const ts = c.lastSyncedAt || c.syncedAt;
        if (!ts) return true;
        return (Date.now() - new Date(ts).getTime()) / (1000 * 60 * 60) >= 24;
      });
      setStaleCampaigns(stale);
    } catch {
      toast.error('Failed to load campaigns');
    }
    setLoading(false);
  }, [search]);

  const loadStats = useCallback(async () => {
    try {
      const r = await adsAPI.getStats({});
      setStats(r.data?.data || r.data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    loadCampaigns(1, platformFilter);
    loadStats();
  }, [platformFilter, loadCampaigns, loadStats]);

  // ── Campaign CRUD ──

  const openNew = () => {
    setEditing(null);
    setForm({
      name: '', platform: 'INSTAGRAM', objective: '', budget: '',
      startDate: '', endDate: '', creativeUrl: '', creativeType: 'IMAGE',
      landingUrl: '', notes: '', creativeFileName: '', creativeFileSize: 0,
      carouselUrls: [], ageMin: '', ageMax: '', gender: 'ALL', locations: [], interests: [],
      keywords: [], devices: [], placements: [],
      budgetType: 'TOTAL', dailyBudget: '', budgetPacing: 'STANDARD',
      bidStrategy: 'LOWEST_COST', bidAmount: '',
      scheduleDays: [], scheduleHours: [], frequencyCap: '', frequencyCapPeriod: 'DAY',
      headline: '', primaryText: '', callToAction: 'SHOP_NOW',
      isTrackingEnabled: true, utmSource: '', utmMedium: '', utmCampaign: '', utmContent: '',
      targetCtr: '', targetCpc: '', targetRoas: '',
    });
    setShowModal(true);
  };

  const openEdit = (c) => {
    setEditing(c);
    let carouselUrls = [];
    if (c.creativeType === 'CAROUSEL' && c.creativeUrl) {
      try { carouselUrls = JSON.parse(c.creativeUrl); } catch { carouselUrls = c.creativeUrl ? [c.creativeUrl] : []; }
    }
    setForm({
      name: c.name || '',
      platform: c.platform || 'INSTAGRAM',
      objective: c.objective || '',
      budget: c.budget || '',
      startDate: c.startDate ? new Date(c.startDate).toISOString().slice(0, 16) : '',
      endDate: c.endDate ? new Date(c.endDate).toISOString().slice(0, 16) : '',
      creativeUrl: c.creativeUrl || '',
      creativeType: c.creativeType || 'IMAGE',
      landingUrl: c.landingUrl || '',
      notes: c.notes || '',
      creativeFileName: c.creativeFileName || '',
      creativeFileSize: c.creativeFileSize || 0,
      carouselUrls,
      // ── Advanced targeting ──
      ageMin: c.ageMin ?? '', ageMax: c.ageMax ?? '', gender: c.gender || 'ALL',
      locations: c.locations || [], interests: c.interests || [],
      keywords: c.keywords || [], devices: c.devices || [], placements: c.placements || [],
      // ── Budget & bidding ──
      budgetType: c.budgetType || 'TOTAL', dailyBudget: c.dailyBudget ?? '',
      budgetPacing: c.budgetPacing || 'STANDARD', bidStrategy: c.bidStrategy || 'LOWEST_COST',
      bidAmount: c.bidAmount ?? '',
      // ── Scheduling & frequency ──
      scheduleDays: c.scheduleDays || [], scheduleHours: c.scheduleHours || [],
      frequencyCap: c.frequencyCap ?? '', frequencyCapPeriod: c.frequencyCapPeriod || 'DAY',
      // ── Creative text ──
      headline: c.headline || '', primaryText: c.primaryText || '', callToAction: c.callToAction || 'SHOP_NOW',
      // ── Tracking & UTM ──
      isTrackingEnabled: c.isTrackingEnabled ?? true,
      utmSource: c.utmSource || '', utmMedium: c.utmMedium || '',
      utmCampaign: c.utmCampaign || '', utmContent: c.utmContent || '',
      // ── KPI targets ──
      targetCtr: c.targetCtr ?? '', targetCpc: c.targetCpc ?? '', targetRoas: c.targetRoas ?? '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name) { toast.error('Campaign name is required'); return; }
    setModalLoading(true);
    try {
      const payload = {
        ...form,
        budget: form.budget ? parseFloat(form.budget) : null,
        startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
        endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
        // Serialize carousel URLs into creativeUrl for the backend
        creativeUrl: form.creativeType === 'CAROUSEL' && form.carouselUrls?.length
          ? JSON.stringify(form.carouselUrls)
          : form.creativeUrl,
        // Don't send carouselUrls as-is to the backend
        carouselUrls: undefined,
        // Normalize advanced fields for the backend
        ageMin: form.ageMin ? Number(form.ageMin) : null,
        ageMax: form.ageMax ? Number(form.ageMax) : null,
        dailyBudget: form.dailyBudget ? Number(form.dailyBudget) : null,
        bidAmount: form.bidAmount ? Number(form.bidAmount) : null,
        frequencyCap: form.frequencyCap ? Number(form.frequencyCap) : null,
        targetCtr: form.targetCtr ? Number(form.targetCtr) : null,
        targetCpc: form.targetCpc ? Number(form.targetCpc) : null,
        targetRoas: form.targetRoas ? Number(form.targetRoas) : null,
        isTrackingEnabled: !!form.isTrackingEnabled,
      };
      if (editing) {
        await adsAPI.updateCampaign(editing.id, payload);
        toast.success('Campaign updated');
      } else {
        await adsAPI.createCampaign(payload);
        toast.success('Campaign created');
      }
      setShowModal(false);
      loadCampaigns(pagination.page, platformFilter);
      loadStats();
    } catch {
      toast.error('Failed to save campaign');
    }
    setModalLoading(false);
  };

  const confirm = useConfirm();

  const handleDelete = async (id) => {
    if (!(await confirm({ title: 'Delete ad campaign?', message: 'This campaign will be permanently removed.', confirmLabel: 'Delete' }))) return;
    try {
      await adsAPI.deleteCampaign(id);
      toast.success('Campaign deleted');
      loadCampaigns(pagination.page, platformFilter);
      loadStats();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const handleDuplicate = async (c) => {
    try {
      await adsAPI.createCampaign({
        name: `${c.name} (Copy)`,
        platform: c.platform,
        objective: c.objective,
        budget: c.budget,
        startDate: c.startDate,
        endDate: c.endDate,
        creativeUrl: c.creativeUrl,
        creativeType: c.creativeType,
        landingUrl: c.landingUrl,
        notes: c.notes,
      });
      toast.success('Campaign duplicated');
      loadCampaigns(pagination.page, platformFilter);
      loadStats();
    } catch {
      toast.error('Failed to duplicate');
    }
  };

  const handleBulkStatusChange = async (ids, status) => {
    let success = 0, failed = 0;
    for (const id of ids) {
      try {
        await adsAPI.updateCampaign(id, { status });
        success++;
      } catch { failed++; }
    }
    toast.success(`${success} updated${failed ? `, ${failed} failed` : ''}`);
    loadCampaigns(pagination.page, platformFilter);
    loadStats();
  };

  // ── Detail ──

  const openDetail = async (c) => {
    setDetailLoading(true);
    setCampaignDetail(null);
    try {
      const r = await adsAPI.getCampaignById(c.id);
      setCampaignDetail(r.data?.data || r.data || c);
    } catch {
      setCampaignDetail(c);
    }
    setDetailLoading(false);
  };

  const closeDetail = () => {
    setCampaignDetail(null);
    setCampaignProducts([]);
  };

  return {
    // State
    campaigns, loading, stats, platformFilter, setPlatformFilter,
    pagination, staleCampaigns, syncingAll, setSyncingAll,
    showModal, setShowModal, editing, form, setForm, modalLoading,
    campaignDetail, detailLoading, campaignProducts,

    // Actions
    loadCampaigns, loadStats,
    openNew, openEdit, handleSave, handleDelete, handleDuplicate,
    handleBulkStatusChange,
    openDetail, closeDetail,
  };
}
