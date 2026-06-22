import { useState, useCallback } from 'react';
import { adsAPI } from '../api/ads';
import toast from '../utils/toast';

export default function useAdAnalytics() {
  const [performanceReport, setPerformanceReport] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [presetPerformance, setPresetPerformance] = useState(null);
  const [presetPerformanceLoading, setPresetPerformanceLoading] = useState(false);
  // ── Comparison State ──
  const [compareCampaign1, setCompareCampaign1] = useState(null);
  const [compareCampaign2, setCompareCampaign2] = useState(null);
  const [compareResult, setCompareResult] = useState(null);
  const [compareLoading, setCompareLoading] = useState(false);

  const loadPerformanceReport = useCallback(async (days = 30) => {
    setAnalyticsLoading(true);
    try {
      const r = await adsAPI.getPerformanceReport({ days });
      setPerformanceReport(r.data?.data || r.data);
    } catch {
      toast.error('Failed to load analytics');
    }
    setAnalyticsLoading(false);
  }, []);

  const loadPresetPerformance = useCallback(async () => {
    setPresetPerformanceLoading(true);
    try {
      const r = await adsAPI.getBrandPresetPerformance();
      setPresetPerformance(r.data?.data || r.data);
    } catch { /* silent fail */ }
    setPresetPerformanceLoading(false);
  }, []);

  // ── Comparison ──

  const runComparison = async () => {
    if (!compareCampaign1 || !compareCampaign2) {
      toast.error('Select two campaigns to compare');
      return;
    }
    setCompareLoading(true);
    try {
      const r = await adsAPI.compareCampaigns(compareCampaign1.id, compareCampaign2.id);
      setCompareResult(r.data?.data || r.data);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Comparison failed');
    }
    setCompareLoading(false);
  };

  const clearComparison = () => {
    setCompareCampaign1(null);
    setCompareCampaign2(null);
    setCompareResult(null);
  };

  return {
    performanceReport, analyticsLoading,
    presetPerformance, presetPerformanceLoading,
    compareCampaign1, setCompareCampaign1,
    compareCampaign2, setCompareCampaign2,
    compareResult, compareLoading,
    loadPerformanceReport, loadPresetPerformance,
    runComparison, clearComparison,
  };
}
