import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Lock,
  Radio,
  Key,
  Laptop,
  Search,
  Plus,
  Trash2,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Sliders,
  Copy,
  Check,
  Clock,
  X,
  Smartphone,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from '../../utils/toast';
import { securityAPI } from '../../api/security';
import AdminPageShell from '../../components/admin/AdminPageShell';

export default function SecurityCenterAdminPage() {
  const [activeTab, setActiveTab] = useState('bruteForce');
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Tab 1: Brute Force & Lockouts State
  const [lockoutData, setLockoutData] = useState({ lockedTargets: [], recentAttempts: [], policies: {} });
  const [lockoutSearch, setLockoutSearch] = useState('');

  // Tab 2: IP Firewall State
  const [firewallRules, setFirewallRules] = useState([]);
  const [firewallSearch, setFirewallSearch] = useState('');
  const [firewallFilter, setFirewallFilter] = useState('ALL');
  const [showAddRuleModal, setShowAddRuleModal] = useState(false);
  const [newRule, setNewRule] = useState({ ip: '', type: 'BLACKLIST', reason: '', expiresHours: '0' });
  const [testIpInput, setTestIpInput] = useState('');
  const [testIpResult, setTestIpResult] = useState(null);

  // Tab 3: Active Sessions State
  const [sessions, setSessions] = useState([]);

  // Tab 4: E-Commerce Threat Radar State
  const [anomalies, setAnomalies] = useState([]);
  const [anomalyFilter, setAnomalyFilter] = useState('ALL');

  // Tab 5: Security Policies & Master PIN State
  const [policies, setPolicies] = useState({
    bruteForceMaxAttempts: 5,
    bruteForceLockoutMinutes: 15,
    bruteForceScope: 'ACCOUNT_AND_IP',
    sessionTimeoutMinutes: 60,
    require2FAForAdmin: false,
    require2FAForStaff: false,
    masterPinEnforced: true,
    masterPinProtectedActions: [],
  });
  const [pinForm, setPinForm] = useState({ currentPin: '', newPin: '', confirmPin: '' });
  const [showPinModal, setShowPinModal] = useState(false);
  const [pendingPinAction, setPendingPinAction] = useState(null);
  const [pinPromptValue, setPinPromptValue] = useState('');
  const [pinPromptError, setPinPromptError] = useState('');
  const [copiedIp, setCopiedIp] = useState(null);

  // Fetch overview metrics
  const fetchMetrics = useCallback(async () => {
    try {
      const res = await securityAPI.getMetrics();
      const payload = res.data?.data || res.data;
      if (payload) setMetrics(payload);
    } catch (err) {
      console.warn('Failed to load security metrics:', err);
    }
  }, []);

  // Fetch data depending on active tab
  const fetchTabData = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchMetrics();

      if (activeTab === 'bruteForce') {
        const res = await securityAPI.getLockoutData();
        const payload = res.data?.data || res.data;
        if (payload) setLockoutData(payload);
      } else if (activeTab === 'firewall') {
        const res = await securityAPI.getFirewallRules();
        const payload = res.data?.data || res.data || [];
        setFirewallRules(Array.isArray(payload) ? payload : []);
      } else if (activeTab === 'sessions') {
        const res = await securityAPI.getActiveSessions();
        const payload = res.data?.data || res.data || [];
        setSessions(Array.isArray(payload) ? payload : []);
      } else if (activeTab === 'fraudRadar') {
        const res = await securityAPI.getFraudAnomalies();
        const payload = res.data?.data || res.data || [];
        setAnomalies(Array.isArray(payload) ? payload : []);
      } else if (activeTab === 'policies') {
        const res = await securityAPI.getPolicies();
        const payload = res.data?.data || res.data;
        if (payload) setPolicies(payload);
      }
    } catch (err) {
      console.warn('Error fetching tab data:', err);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [activeTab, fetchMetrics]);

  useEffect(() => {
    fetchTabData();
  }, [fetchTabData]);

  // Master PIN verification wrapper for sensitive actions
  const executeWithPinProtection = (actionName, callback) => {
    if (policies.masterPinEnforced && policies.masterPinProtectedActions?.includes(actionName)) {
      setPendingPinAction(() => callback);
      setPinPromptValue('');
      setPinPromptError('');
      setShowPinModal(true);
    } else {
      callback();
    }
  };

  const handleVerifyPinSubmit = async (e) => {
    e.preventDefault();
    setPinPromptError('');
    if (!pinPromptValue) {
      setPinPromptError('Enter your Master PIN');
      return;
    }
    try {
      await securityAPI.verifyMasterPin(pinPromptValue);
      setShowPinModal(false);
      if (pendingPinAction) {
        pendingPinAction();
        setPendingPinAction(null);
      }
      toast.success('PIN confirmed');
    } catch (err) {
      setPinPromptError(err.response?.data?.message || 'Invalid Master PIN');
    }
  };

  // ── Tab 1 Actions: Brute Force ──
  const handleUnlockTarget = async (target) => {
    try {
      await securityAPI.unlockTarget(target);
      toast.success(`Unlocked target: ${target}`);
      fetchTabData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to unlock target');
    }
  };

  const handleClearAllLockouts = () => {
    executeWithPinProtection('clear_all_lockouts', async () => {
      try {
        const res = await securityAPI.clearAllLockouts();
        toast.success(res.data?.message || 'All lockouts cleared');
        fetchTabData();
      } catch {
        toast.error('Failed to clear lockouts');
      }
    });
  };

  const handleQuickBlacklist = async (ip, reason = 'Repeated failed login attempts') => {
    try {
      await securityAPI.addFirewallRule({ ip, type: 'BLACKLIST', reason, expiresHours: 72 });
      toast.success(`IP ${ip} blacklisted in Firewall`);
      fetchTabData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to blacklist IP');
    }
  };

  // ── Tab 2 Actions: IP Firewall ──
  const handleAddRuleSubmit = async (e) => {
    e.preventDefault();
    if (!newRule.ip.trim()) {
      toast.error('Enter an IP address or CIDR subnet');
      return;
    }
    try {
      await securityAPI.addFirewallRule({
        ip: newRule.ip.trim(),
        type: newRule.type,
        reason: newRule.reason || 'Added via Security Center',
        expiresHours: newRule.expiresHours === '0' ? undefined : Number(newRule.expiresHours),
      });
      toast.success(`Rule added for ${newRule.ip}`);
      setShowAddRuleModal(false);
      setNewRule({ ip: '', type: 'BLACKLIST', reason: '', expiresHours: '0' });
      fetchTabData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add firewall rule');
    }
  };

  const handleDeleteRule = (id, ip) => {
    executeWithPinProtection('flush_firewall_rules', async () => {
      try {
        await securityAPI.deleteFirewallRule(id);
        toast.success(`Deleted rule for ${ip}`);
        fetchTabData();
      } catch {
        toast.error('Failed to delete rule');
      }
    });
  };

  const handleToggleRule = async (id) => {
    try {
      const res = await securityAPI.toggleFirewallRule(id);
      const rule = res.data?.data || res.data;
      toast.success(`Rule ${rule.status.toLowerCase()}`);
      fetchTabData();
    } catch {
      toast.error('Failed to toggle rule');
    }
  };

  const handleTestIp = async (e) => {
    e.preventDefault();
    if (!testIpInput.trim()) return;
    try {
      const res = await securityAPI.testFirewallIp(testIpInput.trim());
      setTestIpResult(res.data?.data || res.data);
    } catch {
      toast.error('Failed to simulate IP firewall rule');
    }
  };

  // ── Tab 3 Actions: Active Sessions ──
  const handleTerminateSession = async (sessionId) => {
    try {
      await securityAPI.terminateSession(sessionId);
      toast.success('Session terminated');
      fetchTabData();
    } catch {
      toast.error('Failed to terminate session');
    }
  };

  const handleTerminateAllOther = () => {
    executeWithPinProtection('terminate_all_sessions', async () => {
      try {
        const res = await securityAPI.terminateAllOtherSessions();
        toast.success(res.data?.message || 'Terminated other sessions');
        fetchTabData();
      } catch {
        toast.error('Failed to terminate sessions');
      }
    });
  };

  // ── Tab 4 Actions: Threat Radar ──
  const handleUpdateAnomalyStatus = async (id, status) => {
    try {
      await securityAPI.updateAnomalyStatus(id, status);
      toast.success(`Anomaly marked as ${status}`);
      fetchTabData();
    } catch {
      toast.error('Failed to update status');
    }
  };

  // ── Tab 5 Actions: Policies & PIN ──
  const handleSavePolicies = async () => {
    executeWithPinProtection('change_security_policy', async () => {
      try {
        await securityAPI.updatePolicies(policies);
        toast.success('Security policies updated successfully');
        fetchTabData();
      } catch {
        toast.error('Failed to save security policies');
      }
    });
  };

  const handleUpdateMasterPin = async (e) => {
    e.preventDefault();
    if (!pinForm.newPin || pinForm.newPin.length < 4) {
      toast.error('New Master PIN must be at least 4 digits');
      return;
    }
    if (pinForm.newPin !== pinForm.confirmPin) {
      toast.error('New PINs do not match');
      return;
    }
    try {
      await securityAPI.updateMasterPin({
        newPin: pinForm.newPin,
        currentPin: pinForm.currentPin || undefined,
      });
      toast.success('Master PIN updated successfully');
      setPinForm({ currentPin: '', newPin: '', confirmPin: '' });
      fetchTabData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update Master PIN');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedIp(text);
    setTimeout(() => setCopiedIp(null), 2000);
  };

  // Filtered lists
  const filteredLockouts = useMemo(() => {
    const targets = lockoutData.lockedTargets || [];
    if (!lockoutSearch.trim()) return targets;
    const q = lockoutSearch.toLowerCase();
    return targets.filter(
      (t) => t.identifier?.toLowerCase().includes(q) || t.originIp?.toLowerCase().includes(q),
    );
  }, [lockoutData.lockedTargets, lockoutSearch]);

  const filteredAttempts = useMemo(() => {
    const attempts = lockoutData.recentAttempts || [];
    if (!lockoutSearch.trim()) return attempts;
    const q = lockoutSearch.toLowerCase();
    return attempts.filter(
      (a) =>
        a.targetIdentifier?.toLowerCase().includes(q) ||
        a.ipAddress?.toLowerCase().includes(q) ||
        a.reason?.toLowerCase().includes(q),
    );
  }, [lockoutData.recentAttempts, lockoutSearch]);

  const filteredRules = useMemo(() => {
    let list = firewallRules;
    if (firewallFilter !== 'ALL') {
      list = list.filter((r) => r.type === firewallFilter);
    }
    if (firewallSearch.trim()) {
      const q = firewallSearch.toLowerCase();
      list = list.filter((r) => r.ip?.toLowerCase().includes(q) || r.reason?.toLowerCase().includes(q));
    }
    return list;
  }, [firewallRules, firewallFilter, firewallSearch]);

  const filteredAnomalies = useMemo(() => {
    if (anomalyFilter === 'ALL') return anomalies;
    return anomalies.filter((a) => a.status === anomalyFilter);
  }, [anomalies, anomalyFilter]);

  const tabs = [
    { id: 'bruteForce', label: 'Brute Force & Lockouts', icon: Lock, badge: metrics?.bruteForce?.lockedCount },
    { id: 'firewall', label: 'IP Firewall Rules', icon: Shield, badge: metrics?.firewall?.totalRules },
    { id: 'sessions', label: 'Active Sessions', icon: Laptop, badge: metrics?.sessions?.activeCount },
    { id: 'fraudRadar', label: 'E-Commerce Threat Radar', icon: Radio, badge: metrics?.fraudRadar?.totalAlerts },
    { id: 'policies', label: 'Security Policies & PIN', icon: Key },
  ];

  return (
    <AdminPageShell
      title="Security Center"
      subtitle="IP firewall gateway, brute-force lockout defense, active session governance, and e-commerce threat radar"
      loading={loading}
      page="security"
    >
      <div className="space-y-6">
        {/* ── Top Header Actions ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Active Protection Engine
            </span>
          </div>
          <button
            onClick={fetchTabData}
            disabled={refreshing}
            className="btn-ghost btn-sm flex items-center gap-2"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh Status'}
          </button>
        </div>

        {/* ── Stat Cards (Clean White / Clear Visibility) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* IP Firewall */}
          <div
            onClick={() => setActiveTab('firewall')}
            className={`cursor-pointer bg-white p-5 rounded-2xl border transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 ${
              activeTab === 'firewall' ? 'border-[#1a1a1a] ring-1 ring-[#1a1a1a]' : 'border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">IP Firewall</span>
              <div className="w-9 h-9 rounded-xl bg-gray-100 text-gray-800 flex items-center justify-center">
                <Shield size={16} />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 mt-2 font-display">
              {metrics?.firewall?.totalRules ?? 0} <span className="text-xs font-normal text-gray-500">Rules</span>
            </div>
            <div className="text-xs text-gray-500 mt-1 flex items-center justify-between">
              <span>{metrics?.firewall?.blacklisted ?? 0} Blocked | {metrics?.firewall?.whitelisted ?? 0} Allowed</span>
              <span className="font-mono text-[11px] font-semibold text-gray-700">{metrics?.firewall?.totalBlockedHits ?? 0} hits</span>
            </div>
          </div>

          {/* Brute Force */}
          <div
            onClick={() => setActiveTab('bruteForce')}
            className={`cursor-pointer bg-white p-5 rounded-2xl border transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 ${
              activeTab === 'bruteForce' ? 'border-[#1a1a1a] ring-1 ring-[#1a1a1a]' : 'border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Brute Force</span>
              <div className="w-9 h-9 rounded-xl bg-gray-100 text-gray-800 flex items-center justify-center">
                <Lock size={16} />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 mt-2 font-display flex items-center gap-2">
              {metrics?.bruteForce?.lockedCount ?? 0} <span className="text-xs font-normal text-gray-500">Locked</span>
              {(metrics?.bruteForce?.lockedCount ?? 0) > 0 && (
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
              )}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {metrics?.bruteForce?.failed24h ?? 0} failed attempts (24h)
            </div>
          </div>

          {/* Active Sessions */}
          <div
            onClick={() => setActiveTab('sessions')}
            className={`cursor-pointer bg-white p-5 rounded-2xl border transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 ${
              activeTab === 'sessions' ? 'border-[#1a1a1a] ring-1 ring-[#1a1a1a]' : 'border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Active Sessions</span>
              <div className="w-9 h-9 rounded-xl bg-gray-100 text-gray-800 flex items-center justify-center">
                <Laptop size={16} />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 mt-2 font-display">
              {metrics?.sessions?.activeCount ?? 0} <span className="text-xs font-normal text-gray-500">Active</span>
            </div>
            <div className="text-xs text-blue-600 font-medium mt-1 hover:underline">
              View & Terminate &rarr;
            </div>
          </div>

          {/* Master PIN */}
          <div
            onClick={() => setActiveTab('policies')}
            className={`cursor-pointer bg-white p-5 rounded-2xl border transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 ${
              activeTab === 'policies' ? 'border-[#1a1a1a] ring-1 ring-[#1a1a1a]' : 'border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Master PIN</span>
              <div className="w-9 h-9 rounded-xl bg-gray-100 text-gray-800 flex items-center justify-center">
                <Key size={16} />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 mt-2 font-display flex items-center gap-2">
              {metrics?.masterPin?.isEnforced ? 'Enforced' : 'Off'}
              <span className={`w-2.5 h-2.5 rounded-full ${metrics?.masterPin?.isEnforced ? 'bg-emerald-500' : 'bg-gray-400'}`} />
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {metrics?.masterPin?.actionsCount ?? 6} sensitive actions guarded
            </div>
          </div>

          {/* Threat Radar */}
          <div
            onClick={() => setActiveTab('fraudRadar')}
            className={`cursor-pointer bg-white p-5 rounded-2xl border transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 ${
              activeTab === 'fraudRadar' ? 'border-[#1a1a1a] ring-1 ring-[#1a1a1a]' : 'border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Threat Radar</span>
              <div className="w-9 h-9 rounded-xl bg-gray-100 text-gray-800 flex items-center justify-center">
                <Radio size={16} />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 mt-2 font-display flex items-center gap-2">
              {metrics?.fraudRadar?.totalAlerts ?? 0} <span className="text-xs font-normal text-gray-500">Alerts</span>
              <span
                className={`text-[10px] uppercase px-2 py-0.5 rounded font-bold ${
                  metrics?.fraudRadar?.systemStatus === 'CRITICAL'
                    ? 'status-badge status-danger'
                    : metrics?.fraudRadar?.systemStatus === 'ATTENTION'
                    ? 'status-badge status-warning'
                    : 'status-badge status-active'
                }`}
              >
                {metrics?.fraudRadar?.systemStatus ?? 'SAFE'}
              </span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              E-Commerce Anomaly Scanner
            </div>
          </div>
        </div>

        {/* ── Segmented Navigation Tabs ── */}
        <div className="bg-white p-1.5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                  isActive
                    ? 'bg-[#1a1a1a] text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Icon size={15} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full leading-none ml-1 ${
                      isActive ? 'bg-white text-black' : 'bg-[#1a1a1a] text-white'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── TAB 1: BRUTE FORCE & LOCKOUTS ── */}
        {activeTab === 'bruteForce' && (
          <div className="space-y-6">
            {/* Banner */}
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-amber-950">Brute-Force Rate Limiting Active</h4>
                  <p className="text-xs text-amber-800 mt-0.5">
                    Accounts and IP addresses are automatically locked for{' '}
                    <strong>{lockoutData.policies?.lockoutMinutes || 15} minutes</strong> after{' '}
                    <strong>{lockoutData.policies?.maxAttempts || 5} failed password attempts</strong>.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={fetchTabData} className="btn-ghost btn-sm bg-white border border-amber-200">
                  Refresh Lockouts
                </button>
                {(lockoutData.lockedTargets?.length || 0) > 0 && (
                  <button onClick={handleClearAllLockouts} className="btn-danger btn-sm">
                    Clear All Lockouts
                  </button>
                )}
              </div>
            </div>

            {/* Currently Locked Targets Card */}
            <div className="table-card">
              <div className="table-toolbar">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <Lock size={16} /> Currently Locked Targets
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Target emails or IP addresses currently under automatic cooldown lock
                  </p>
                </div>
                <span className="table-count font-bold">
                  {filteredLockouts.length} Locked
                </span>
              </div>

              {filteredLockouts.length === 0 ? (
                <div className="empty-state py-12">
                  <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3 border border-emerald-100">
                    <ShieldCheck size={28} />
                  </div>
                  <h4 className="text-sm font-bold text-gray-900">No accounts or IP addresses are currently locked</h4>
                  <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                    Your storefront and admin login velocity are completely normal. No brute-force attacks active.
                  </p>
                </div>
              ) : (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Identifier (Email / User)</th>
                      <th>Origin IP</th>
                      <th>Failed Attempts</th>
                      <th>Last Attempt Time</th>
                      <th>Lockout Remaining</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLockouts.map((target) => {
                      const remainingMs = Math.max(0, new Date(target.expiresAt).getTime() - Date.now());
                      const remainingMin = Math.ceil(remainingMs / 60000);
                      return (
                        <tr key={target.id || target.identifier}>
                          <td data-label="Identifier" className="font-mono font-bold text-gray-900">{target.identifier}</td>
                          <td data-label="Origin IP" className="font-mono text-gray-600">{target.originIp}</td>
                          <td data-label="Failed Attempts">
                            <span className="status-badge status-danger font-mono font-bold">
                              {target.failedAttempts} attempts
                            </span>
                          </td>
                          <td data-label="Last Attempt" className="text-gray-600">
                            {new Date(target.lastAttemptAt).toLocaleString()}
                          </td>
                          <td data-label="Cooldown">
                            <span className="status-badge status-warning inline-flex items-center gap-1 font-mono">
                              <Clock size={11} /> {remainingMin}m remaining
                            </span>
                          </td>
                          <td data-label="Actions" style={{ textAlign: 'right' }}>
                            <div className="inline-flex gap-2">
                              <button
                                onClick={() => handleUnlockTarget(target.identifier)}
                                className="btn-dark btn-sm"
                              >
                                Unlock Target
                              </button>
                              <button
                                onClick={() => handleQuickBlacklist(target.originIp)}
                                className="btn-danger btn-sm"
                              >
                                Blacklist IP
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Recent Failed Login Attempts Stream */}
            <div className="table-card">
              <div className="table-toolbar flex-wrap">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Recent Failed Login Attempts Stream</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Live authentication audit log tracking failed password attempts</p>
                </div>
                <div className="search-input" style={{ width: 280 }}>
                  <span className="search-icon"><Search size={14} /></span>
                  <input
                    type="text"
                    placeholder="Search IP, email, device..."
                    value={lockoutSearch}
                    onChange={(e) => setLockoutSearch(e.target.value)}
                  />
                </div>
              </div>

              {filteredAttempts.length === 0 ? (
                <div className="empty-state py-8 text-gray-400 text-xs">
                  No failed login attempts recorded in recent stream.
                </div>
              ) : (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Target Identifier</th>
                      <th>IP Address</th>
                      <th>Device & Browser</th>
                      <th>Reason</th>
                      <th style={{ textAlign: 'right' }}>Quick Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAttempts.map((attempt) => (
                      <tr key={attempt.id}>
                        <td data-label="Time" className="font-mono text-gray-600 text-xs">
                          {new Date(attempt.timestamp).toLocaleTimeString()}
                        </td>
                        <td data-label="Target" className="font-bold text-gray-900 font-mono">
                          {attempt.targetIdentifier}
                        </td>
                        <td data-label="IP Address" className="font-mono text-gray-600">
                          <div className="inline-flex items-center gap-1.5">
                            <span>{attempt.ipAddress}</span>
                            <button
                              onClick={() => copyToClipboard(attempt.ipAddress)}
                              className="text-gray-400 hover:text-gray-900"
                              title="Copy IP"
                            >
                              {copiedIp === attempt.ipAddress ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                            </button>
                          </div>
                        </td>
                        <td data-label="Device" className="text-gray-600">
                          {attempt.browser || 'Unknown'} on {attempt.os || 'Device'}
                        </td>
                        <td data-label="Reason">
                          <span className="status-badge status-danger text-xs font-mono">{attempt.reason}</span>
                        </td>
                        <td data-label="Action" style={{ textAlign: 'right' }}>
                          <button
                            onClick={() => handleQuickBlacklist(attempt.ipAddress)}
                            className="btn-ghost btn-sm text-red-600 hover:bg-red-50 border border-red-200"
                          >
                            Blacklist IP
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 2: IP FIREWALL RULES ── */}
        {activeTab === 'firewall' && (
          <div className="space-y-6">
            {/* Top Cards: Simulator & Action */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Simulator Card */}
              <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm lg:col-span-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                  <Shield size={15} className="text-gray-900" /> Live IP Rule Simulator
                </h4>
                <p className="text-xs text-gray-500 mt-1">
                  Type any IP to test whether the firewall allows or drops the request.
                </p>
                <form onSubmit={handleTestIp} className="mt-3 flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. 192.168.1.100"
                    value={testIpInput}
                    onChange={(e) => setTestIpInput(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl border border-gray-300 text-xs font-mono text-gray-900 focus:outline-none focus:border-black"
                  />
                  <button type="submit" className="btn-dark btn-sm">
                    Test
                  </button>
                </form>

                {testIpResult && (
                  <div
                    className={`mt-3 p-3 rounded-xl text-xs border ${
                      testIpResult.allowed
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        : 'bg-red-50 border-red-200 text-red-900'
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1.5">
                      {testIpResult.allowed ? <CheckCircle2 size={15} className="text-emerald-600" /> : <XCircle size={15} className="text-red-600" />}
                      {testIpResult.allowed ? 'TRAFFIC ALLOWED' : 'TRAFFIC BLOCKED (403)'}
                    </div>
                    <div className="text-[11px] mt-1 opacity-90">{testIpResult.reason}</div>
                  </div>
                )}
              </div>

              {/* Action Banner */}
              <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm lg:col-span-2 flex flex-col justify-between">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">Firewall Rules & CIDR Subnets</h4>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Active blacklists and whitelists checked in $O(1)$ memory without database lag.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAddRuleModal(true)}
                    className="btn-dark btn-sm flex items-center gap-1.5 shrink-0"
                  >
                    <Plus size={15} /> Add Firewall Rule
                  </button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
                    {['ALL', 'BLACKLIST', 'WHITELIST'].map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setFirewallFilter(filter)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                          firewallFilter === filter ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                        }`}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>

                  <div className="search-input" style={{ width: 240 }}>
                    <span className="search-icon"><Search size={13} /></span>
                    <input
                      type="text"
                      placeholder="Search IP or reason..."
                      value={firewallSearch}
                      onChange={(e) => setFirewallSearch(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Rules Table */}
            <div className="table-card">
              {filteredRules.length === 0 ? (
                <div className="empty-state py-12">
                  <Shield size={32} className="mx-auto text-gray-300 mb-2" />
                  <h4 className="text-sm font-bold text-gray-900">No firewall rules found</h4>
                  <p className="text-xs text-gray-500 mt-1">
                    Add an IP or subnet to whitelist trusted networks or block malicious traffic.
                  </p>
                </div>
              ) : (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>IP Address / Subnet</th>
                      <th>Reason</th>
                      <th>Added By</th>
                      <th>Expiration</th>
                      <th>Hits Blocked</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRules.map((rule) => (
                      <tr key={rule.id}>
                        <td data-label="Type">
                          <span
                            className={`status-badge ${
                              rule.type === 'BLACKLIST' ? 'status-danger' : 'status-active'
                            }`}
                          >
                            {rule.type}
                          </span>
                        </td>
                        <td data-label="IP / CIDR" className="font-mono font-bold text-gray-900">{rule.ip}</td>
                        <td data-label="Reason" className="text-gray-600">{rule.reason}</td>
                        <td data-label="Added By" className="text-gray-500">{rule.addedBy}</td>
                        <td data-label="Expiration" className="font-mono text-gray-600 text-xs">
                          {rule.expiresAt ? new Date(rule.expiresAt).toLocaleDateString() : 'Permanent'}
                        </td>
                        <td data-label="Hits" className="font-mono font-bold text-gray-900">{rule.hits || 0}</td>
                        <td data-label="Status">
                          <button
                            onClick={() => handleToggleRule(rule.id)}
                            className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              rule.status === 'ACTIVE'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-gray-200 text-gray-600'
                            }`}
                          >
                            {rule.status}
                          </button>
                        </td>
                        <td data-label="Actions" style={{ textAlign: 'right' }}>
                          <button
                            onClick={() => handleDeleteRule(rule.id, rule.ip)}
                            className="text-gray-400 hover:text-red-600 p-1"
                            title="Delete Rule"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 3: ACTIVE SESSIONS ── */}
        {activeTab === 'sessions' && (
          <div className="space-y-6">
            <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Laptop size={17} /> Active Authenticated Sessions
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Currently active administrative and staff sessions across desktop and mobile browsers.
                </p>
              </div>
              <button
                onClick={handleTerminateAllOther}
                className="btn-danger btn-sm shrink-0"
              >
                Terminate All Other Sessions
              </button>
            </div>

            <div className="table-card">
              {sessions.length === 0 ? (
                <div className="empty-state py-10 text-gray-400 text-xs">
                  No active session records found.
                </div>
              ) : (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>User & Account</th>
                      <th>Role</th>
                      <th>Device & Browser</th>
                      <th>IP Address</th>
                      <th>Last Active</th>
                      <th>Session Created</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((sess) => (
                      <tr key={sess.sessionId}>
                        <td data-label="User">
                          <div className="font-bold text-gray-900 flex items-center gap-2">
                            {sess.name || sess.email}
                            {sess.isCurrent && (
                              <span className="status-badge status-active text-[10px]">
                                This Device
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 font-mono">{sess.email}</div>
                        </td>
                        <td data-label="Role">
                          <span className="status-badge status-info">{sess.role}</span>
                        </td>
                        <td data-label="Device">
                          <div className="font-medium text-gray-900">{sess.browser}</div>
                          <div className="text-xs text-gray-500">{sess.os}</div>
                        </td>
                        <td data-label="IP Address" className="font-mono text-gray-600">{sess.ipAddress}</td>
                        <td data-label="Last Active" className="text-gray-700">
                          {new Date(sess.lastActiveAt).toLocaleTimeString()}
                        </td>
                        <td data-label="Created" className="text-gray-500 text-xs">
                          {new Date(sess.createdAt).toLocaleDateString()}
                        </td>
                        <td data-label="Action" style={{ textAlign: 'right' }}>
                          {!sess.isCurrent && (
                            <button
                              onClick={() => handleTerminateSession(sess.sessionId)}
                              className="btn-ghost btn-sm text-red-600 hover:bg-red-50 border border-red-200"
                            >
                              Terminate
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 4: E-COMMERCE THREAT RADAR ── */}
        {activeTab === 'fraudRadar' && (
          <div className="space-y-6">
            <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Radio size={17} /> E-Commerce Threat & Fraud Radar
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Algorithmic scanner detecting checkout velocity, card-testing bots, and credential stuffing.
                </p>
              </div>
              <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
                {['ALL', 'OPEN', 'INVESTIGATING', 'RESOLVED'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setAnomalyFilter(f)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                      anomalyFilter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="table-card">
              {filteredAnomalies.length === 0 ? (
                <div className="empty-state py-12">
                  <CheckCircle2 size={36} className="mx-auto text-emerald-600 mb-2" />
                  <h4 className="text-sm font-bold text-gray-900">No active fraud or checkout anomalies detected</h4>
                  <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                    Checkout velocity, payment gateways, and authentication streams are completely normal.
                  </p>
                </div>
              ) : (
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Severity</th>
                      <th>Anomaly Type</th>
                      <th>Target / Entity</th>
                      <th>Risk Score</th>
                      <th>Description</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAnomalies.map((anom) => (
                      <tr key={anom.id}>
                        <td data-label="Severity">
                          <span
                            className={`status-badge ${
                              anom.severity === 'CRITICAL' || anom.severity === 'HIGH'
                                ? 'status-danger'
                                : 'status-warning'
                            }`}
                          >
                            {anom.severity}
                          </span>
                        </td>
                        <td data-label="Type" className="font-bold text-gray-900 font-mono text-xs">{anom.type}</td>
                        <td data-label="Target" className="font-mono text-gray-600">{anom.target}</td>
                        <td data-label="Risk Score">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-gray-200 h-2 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-red-600 rounded-full"
                                style={{ width: `${anom.riskScore}%` }}
                              />
                            </div>
                            <span className="font-mono font-bold text-xs text-gray-900">{anom.riskScore}</span>
                          </div>
                        </td>
                        <td data-label="Description" className="text-gray-700 max-w-sm text-xs">{anom.description}</td>
                        <td data-label="Status">
                          <span className="status-badge status-info text-xs">{anom.status}</span>
                        </td>
                        <td data-label="Actions" style={{ textAlign: 'right' }}>
                          <div className="inline-flex gap-1.5">
                            {anom.status !== 'RESOLVED' && (
                              <button
                                onClick={() => handleUpdateAnomalyStatus(anom.id, 'RESOLVED')}
                                className="btn-dark btn-sm"
                              >
                                Resolve
                              </button>
                            )}
                            {anom.status !== 'DISMISSED' && (
                              <button
                                onClick={() => handleUpdateAnomalyStatus(anom.id, 'DISMISSED')}
                                className="btn-ghost btn-sm"
                              >
                                Dismiss
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 5: POLICIES & MASTER PIN ── */}
        {activeTab === 'policies' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Master PIN Configuration Card */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <Key size={17} /> Master Security PIN
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Require a secondary PIN code before executing high-risk operations (e.g. database backup deletion,
                    flushing firewall rules, or terminating all admin sessions).
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={policies.masterPinEnforced}
                    onChange={(e) => setPolicies({ ...policies, masterPinEnforced: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1a1a1a]"></div>
                </label>
              </div>

              <form onSubmit={handleUpdateMasterPin} className="space-y-3 pt-3 border-t border-gray-100">
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Set / Change Master PIN</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="password"
                    placeholder="Current PIN (if set)"
                    value={pinForm.currentPin}
                    onChange={(e) => setPinForm({ ...pinForm, currentPin: e.target.value })}
                    className="px-3 py-2 rounded-xl border border-gray-300 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-black"
                  />
                  <input
                    type="password"
                    placeholder="New PIN (4-8 digits)"
                    value={pinForm.newPin}
                    onChange={(e) => setPinForm({ ...pinForm, newPin: e.target.value })}
                    className="px-3 py-2 rounded-xl border border-gray-300 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-black"
                  />
                  <input
                    type="password"
                    placeholder="Confirm New PIN"
                    value={pinForm.confirmPin}
                    onChange={(e) => setPinForm({ ...pinForm, confirmPin: e.target.value })}
                    className="px-3 py-2 rounded-xl border border-gray-300 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-black"
                  />
                </div>
                <button type="submit" className="btn-dark btn-sm w-full">
                  Update Master PIN
                </button>
              </form>

              <div className="pt-3 border-t border-gray-100">
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Protected High-Risk Actions
                </h4>
                <div className="space-y-2">
                  {[
                    { id: 'backup_delete', label: 'Deleting database backups & snapshots' },
                    { id: 'audit_logs_purge', label: 'Purging system & activity audit logs' },
                    { id: 'terminate_all_sessions', label: 'Terminating all active admin sessions' },
                    { id: 'flush_firewall_rules', label: 'Deleting or flushing IP firewall rules' },
                    { id: 'bulk_user_delete', label: 'Bulk banning or deleting user accounts' },
                    { id: 'change_security_policy', label: 'Modifying security policy parameters' },
                  ].map((act) => {
                    const checked = policies.masterPinProtectedActions?.includes(act.id);
                    return (
                      <label key={act.id} className="flex items-center gap-2.5 text-xs text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const current = policies.masterPinProtectedActions || [];
                            const updated = e.target.checked
                              ? [...current, act.id]
                              : current.filter((x) => x !== act.id);
                            setPolicies({ ...policies, masterPinProtectedActions: updated });
                          }}
                          className="rounded border-gray-300 text-black focus:ring-0"
                        />
                        <span>{act.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Rate Limiting & Auth Policies Card */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-6 flex flex-col justify-between">
              <div className="space-y-5">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <Sliders size={17} /> Brute-Force & Session Governance
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Tune thresholds for automatic lockout triggers and idle session timeouts.
                  </p>
                </div>

                {/* Max attempts slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-gray-700">Max Failed Login Attempts Before Lockout</span>
                    <span className="font-mono font-bold text-gray-900">{policies.bruteForceMaxAttempts} tries</span>
                  </div>
                  <input
                    type="range"
                    min="3"
                    max="15"
                    value={policies.bruteForceMaxAttempts}
                    onChange={(e) => setPolicies({ ...policies, bruteForceMaxAttempts: Number(e.target.value) })}
                    className="w-full accent-black"
                  />
                </div>

                {/* Lockout duration slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-gray-700">Lockout Duration (Cooldown Period)</span>
                    <span className="font-mono font-bold text-gray-900">{policies.bruteForceLockoutMinutes} minutes</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="60"
                    step="5"
                    value={policies.bruteForceLockoutMinutes}
                    onChange={(e) => setPolicies({ ...policies, bruteForceLockoutMinutes: Number(e.target.value) })}
                    className="w-full accent-black"
                  />
                </div>

                {/* Session Inactivity Timeout */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-gray-700">Idle Session Inactivity Timeout</span>
                    <span className="font-mono font-bold text-gray-900">{policies.sessionTimeoutMinutes} minutes</span>
                  </div>
                  <input
                    type="range"
                    min="15"
                    max="240"
                    step="15"
                    value={policies.sessionTimeoutMinutes}
                    onChange={(e) => setPolicies({ ...policies, sessionTimeoutMinutes: Number(e.target.value) })}
                    className="w-full accent-black"
                  />
                </div>

                {/* 2FA Policies */}
                <div className="pt-3 border-t border-gray-100 space-y-3">
                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Two-Factor Authentication</h4>
                  <div className="space-y-2">
                    <label className="flex items-center justify-between text-xs text-gray-700 cursor-pointer">
                      <span>Require 2FA for Administrators</span>
                      <input
                        type="checkbox"
                        checked={policies.require2FAForAdmin}
                        onChange={(e) => setPolicies({ ...policies, require2FAForAdmin: e.target.checked })}
                        className="rounded border-gray-300 text-black focus:ring-0"
                      />
                    </label>
                    <label className="flex items-center justify-between text-xs text-gray-700 cursor-pointer">
                      <span>Require 2FA for Staff / Managers</span>
                      <input
                        type="checkbox"
                        checked={policies.require2FAForStaff}
                        onChange={(e) => setPolicies({ ...policies, require2FAForStaff: e.target.checked })}
                        className="rounded border-gray-300 text-black focus:ring-0"
                      />
                    </label>
                  </div>
                </div>
              </div>

              <button
                onClick={handleSavePolicies}
                className="btn-dark w-full py-2.5"
              >
                Save Security Policies
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── MODAL: ADD FIREWALL RULE ── */}
      <AnimatePresence>
        {showAddRuleModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-gray-200 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Shield size={18} /> Add Firewall Rule
                </h3>
                <button
                  onClick={() => setShowAddRuleModal(false)}
                  className="text-gray-400 hover:text-gray-900 p-1"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAddRuleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">IP Address or CIDR Range</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 203.0.113.42 or 10.0.0.0/24"
                    value={newRule.ip}
                    onChange={(e) => setNewRule({ ...newRule, ip: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-mono text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-black"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">Supports IPv4, IPv6, and CIDR subnet notations.</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Rule Policy</label>
                    <select
                      value={newRule.type}
                      onChange={(e) => setNewRule({ ...newRule, type: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:border-black bg-white"
                    >
                      <option value="BLACKLIST">BLACKLIST (Block)</option>
                      <option value="WHITELIST">WHITELIST (Allow)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Expiration</label>
                    <select
                      value={newRule.expiresHours}
                      onChange={(e) => setNewRule({ ...newRule, expiresHours: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:border-black bg-white"
                    >
                      <option value="0">Permanent (Never)</option>
                      <option value="1">1 Hour</option>
                      <option value="24">24 Hours</option>
                      <option value="72">3 Days</option>
                      <option value="168">7 Days</option>
                      <option value="720">30 Days</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Reason / Note</label>
                  <input
                    type="text"
                    placeholder="e.g. Malicious scraper or office VPN"
                    value={newRule.reason}
                    onChange={(e) => setNewRule({ ...newRule, reason: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-black"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowAddRuleModal(false)}
                    className="btn-ghost btn-sm"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-dark btn-sm">
                    Apply Rule
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL: MASTER PIN PROMPT ── */}
      <AnimatePresence>
        {showPinModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-gray-200 rounded-2xl w-full max-w-sm p-6 shadow-2xl text-center space-y-4"
            >
              <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-900 flex items-center justify-center mx-auto border border-gray-200">
                <Key size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Master PIN Required</h3>
                <p className="text-xs text-gray-500 mt-1">
                  This action is protected. Enter your 4-8 digit security PIN to authenticate.
                </p>
              </div>

              <form onSubmit={handleVerifyPinSubmit} className="space-y-4">
                <input
                  type="password"
                  autoFocus
                  placeholder="••••"
                  maxLength={8}
                  value={pinPromptValue}
                  onChange={(e) => setPinPromptValue(e.target.value)}
                  className="w-full text-center tracking-[0.4em] text-lg font-bold py-2.5 rounded-xl border border-gray-300 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-black"
                />

                {pinPromptError && (
                  <p className="text-xs text-red-600 font-semibold">{pinPromptError}</p>
                )}

                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPinModal(false);
                      setPendingPinAction(null);
                    }}
                    className="btn-ghost btn-sm flex-1"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-dark btn-sm flex-1">
                    Confirm
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AdminPageShell>
  );
}
