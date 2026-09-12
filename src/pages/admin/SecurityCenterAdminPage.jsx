import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Lock,
  Unlock,
  Radio,
  Key,
  Laptop,
  Smartphone,
  Tablet,
  Search,
  Plus,
  Trash2,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  Sliders,
  LogOut,
  Copy,
  Check,
  ChevronRight,
  Clock,
  Filter,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from '../../utils/toast';
import { securityAPI } from '../../api/security';

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
      } catch (err) {
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
      } catch (err) {
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
    } catch (err) {
      toast.error('Failed to toggle rule');
    }
  };

  const handleTestIp = async (e) => {
    e.preventDefault();
    if (!testIpInput.trim()) return;
    try {
      const res = await securityAPI.testFirewallIp(testIpInput.trim());
      setTestIpResult(res.data?.data || res.data);
    } catch (err) {
      toast.error('Failed to simulate IP firewall rule');
    }
  };

  // ── Tab 3 Actions: Active Sessions ──
  const handleTerminateSession = async (sessionId) => {
    try {
      await securityAPI.terminateSession(sessionId);
      toast.success('Session terminated');
      fetchTabData();
    } catch (err) {
      toast.error('Failed to terminate session');
    }
  };

  const handleTerminateAllOther = () => {
    executeWithPinProtection('terminate_all_sessions', async () => {
      try {
        const res = await securityAPI.terminateAllOtherSessions();
        toast.success(res.data?.message || 'Terminated other sessions');
        fetchTabData();
      } catch (err) {
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
    } catch (err) {
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
      } catch (err) {
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
    <div className="min-h-screen bg-[#09090b] text-white p-4 md:p-8 font-sans antialiased selection:bg-white selection:text-black">
      {/* ── Top Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center shadow-lg shadow-white/10">
              <ShieldAlert size={22} className="text-black" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
                Security Center
                <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-white/10 text-white/80 border border-white/10">
                  Enterprise Shield
                </span>
              </h1>
              <p className="text-xs text-zinc-400 mt-0.5">
                Live IP firewall, brute-force defense, session governance, and e-commerce threat radar.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchTabData}
            disabled={refreshing}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-white/90 transition-all hover:border-white/20 active:scale-95 disabled:opacity-50"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Syncing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* ── KPI Summary Cards (Black & White Monochromatic) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 my-6">
        {/* IP Firewall Card */}
        <div
          onClick={() => setActiveTab('firewall')}
          className="group cursor-pointer p-4 rounded-xl bg-[#121214] border border-white/10 hover:border-white/25 transition-all relative overflow-hidden shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase">IP Firewall</span>
            <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-white/70 group-hover:text-white transition-colors">
              <Shield size={14} />
            </div>
          </div>
          <div className="text-2xl font-bold text-white mt-2 tracking-tight">
            {metrics?.firewall?.totalRules ?? 0} <span className="text-xs font-normal text-zinc-400">Rules</span>
          </div>
          <div className="text-[11px] text-zinc-400 mt-1 flex items-center justify-between">
            <span>{metrics?.firewall?.blacklisted ?? 0} Blocked | {metrics?.firewall?.whitelisted ?? 0} Allowed</span>
            <span className="text-[9px] text-zinc-500 font-mono">{metrics?.firewall?.totalBlockedHits ?? 0} hits</span>
          </div>
        </div>

        {/* Brute Force Card */}
        <div
          onClick={() => setActiveTab('bruteForce')}
          className="group cursor-pointer p-4 rounded-xl bg-[#121214] border border-white/10 hover:border-white/25 transition-all relative overflow-hidden shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase">Brute Force</span>
            <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-white/70 group-hover:text-white transition-colors">
              <Lock size={14} />
            </div>
          </div>
          <div className="text-2xl font-bold text-white mt-2 tracking-tight flex items-center gap-2">
            {metrics?.bruteForce?.lockedCount ?? 0} <span className="text-xs font-normal text-zinc-400">Locked</span>
            {(metrics?.bruteForce?.lockedCount ?? 0) > 0 && (
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            )}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">
            {metrics?.bruteForce?.failed24h ?? 0} failed attempts (24h)
          </div>
        </div>

        {/* Active Sessions Card */}
        <div
          onClick={() => setActiveTab('sessions')}
          className="group cursor-pointer p-4 rounded-xl bg-[#121214] border border-white/10 hover:border-white/25 transition-all relative overflow-hidden shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase">Active Sessions</span>
            <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-white/70 group-hover:text-white transition-colors">
              <Laptop size={14} />
            </div>
          </div>
          <div className="text-2xl font-bold text-white mt-2 tracking-tight">
            {metrics?.sessions?.activeCount ?? 0} <span className="text-xs font-normal text-zinc-400">Active</span>
          </div>
          <div className="text-[11px] text-zinc-400 mt-1 flex items-center gap-1">
            <span className="text-white font-medium hover:underline">View & Terminate &rarr;</span>
          </div>
        </div>

        {/* Master PIN Card */}
        <div
          onClick={() => setActiveTab('policies')}
          className="group cursor-pointer p-4 rounded-xl bg-[#121214] border border-white/10 hover:border-white/25 transition-all relative overflow-hidden shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase">Master PIN</span>
            <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-white/70 group-hover:text-white transition-colors">
              <Key size={14} />
            </div>
          </div>
          <div className="text-2xl font-bold text-white mt-2 tracking-tight flex items-center gap-2">
            {metrics?.masterPin?.isEnforced ? 'Enforced' : 'Off'}
            <span className={`w-2 h-2 rounded-full ${metrics?.masterPin?.isEnforced ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">
            {metrics?.masterPin?.actionsCount ?? 6} sensitive actions guarded
          </div>
        </div>

        {/* Threat Radar Card */}
        <div
          onClick={() => setActiveTab('fraudRadar')}
          className="group cursor-pointer p-4 rounded-xl bg-[#121214] border border-white/10 hover:border-white/25 transition-all relative overflow-hidden shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase">Threat Radar</span>
            <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-white/70 group-hover:text-white transition-colors">
              <Radio size={14} />
            </div>
          </div>
          <div className="text-2xl font-bold text-white mt-2 tracking-tight flex items-center gap-2">
            {metrics?.fraudRadar?.totalAlerts ?? 0} <span className="text-xs font-normal text-zinc-400">Alerts</span>
            <span
              className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-bold ${
                metrics?.fraudRadar?.systemStatus === 'CRITICAL'
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : metrics?.fraudRadar?.systemStatus === 'ATTENTION'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-white/10 text-white/90 border border-white/10'
              }`}
            >
              {metrics?.fraudRadar?.systemStatus ?? 'SAFE'}
            </span>
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">
            E-Commerce Anomaly Scanner
          </div>
        </div>
      </div>

      {/* ── Navigation Tabs ── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-white/10 scrollbar-none mb-6">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                isActive ? 'text-white' : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="security-tab-pill"
                  className="absolute inset-0 rounded-lg bg-white/10 border border-white/15"
                  transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                />
              )}
              <Icon size={15} className="relative z-10" />
              <span className="relative z-10">{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="relative z-10 text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-white text-black leading-none ml-1">
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
          {/* Rate Limiting Active Banner */}
          <div className="p-4 rounded-xl bg-red-950/20 border border-red-900/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0 text-red-400 mt-0.5">
                <AlertTriangle size={17} />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-red-200">Brute-Force Rate Limiting Active</h4>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Accounts and IP addresses are automatically locked for{' '}
                  <span className="text-white font-medium">
                    {lockoutData.policies?.lockoutMinutes || 15} minutes
                  </span>{' '}
                  after{' '}
                  <span className="text-white font-medium">
                    {lockoutData.policies?.maxAttempts || 5} failed password attempts
                  </span>.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchTabData}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white text-xs font-medium border border-white/10 transition-colors"
              >
                Refresh Lockouts
              </button>
              {(lockoutData.lockedTargets?.length || 0) > 0 && (
                <button
                  onClick={handleClearAllLockouts}
                  className="px-3 py-1.5 rounded-lg bg-red-600/80 hover:bg-red-600 text-white text-xs font-medium transition-colors"
                >
                  Clear All Lockouts
                </button>
              )}
            </div>
          </div>

          {/* Table: Currently Locked Targets */}
          <div className="rounded-xl bg-[#121214] border border-white/10 overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Lock size={16} /> Currently Locked Targets
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">Offending accounts or IPs under active cooldown lock</p>
              </div>
              <span className="text-xs font-mono text-zinc-400">
                {filteredLockouts.length} Locked
              </span>
            </div>

            {filteredLockouts.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3">
                  <ShieldCheck size={24} />
                </div>
                <h4 className="text-sm font-semibold text-white">No accounts or IP addresses are currently locked</h4>
                <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
                  System is safe. Login velocity and authentication streams are within normal thresholds.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/5 border-b border-white/10 text-zinc-400 text-[11px] font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Identifier (Email / User)</th>
                      <th className="py-3 px-4">Origin IP</th>
                      <th className="py-3 px-4">Failed Attempts</th>
                      <th className="py-3 px-4">Last Attempt Time</th>
                      <th className="py-3 px-4">Lockout Remaining</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-zinc-300">
                    {filteredLockouts.map((target) => {
                      const remainingMs = Math.max(0, new Date(target.expiresAt).getTime() - Date.now());
                      const remainingMin = Math.ceil(remainingMs / 60000);
                      return (
                        <tr key={target.id || target.identifier} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3.5 px-4 font-mono font-medium text-white">{target.identifier}</td>
                          <td className="py-3.5 px-4 font-mono text-zinc-400">{target.originIp}</td>
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-300 font-mono font-bold">
                              {target.failedAttempts} attempts
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-zinc-400">
                            {new Date(target.lastAttemptAt).toLocaleString()}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1.5 text-amber-300 font-mono">
                              <Clock size={12} /> {remainingMin} min remaining
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right space-x-2">
                            <button
                              onClick={() => handleUnlockTarget(target.identifier)}
                              className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-white font-medium transition-colors"
                            >
                              Unlock Target
                            </button>
                            <button
                              onClick={() => handleQuickBlacklist(target.originIp)}
                              className="px-2.5 py-1 rounded bg-red-600/30 hover:bg-red-600/50 text-red-300 font-medium transition-colors"
                            >
                              Blacklist IP
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Table: Recent Failed Login Attempts Stream */}
          <div className="rounded-xl bg-[#121214] border border-white/10 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white">Recent Failed Login Attempts Stream</h3>
                <p className="text-xs text-zinc-400 mt-0.5">Real-time authentication log inspecting failed password tries</p>
              </div>

              <div className="relative w-full sm:w-72">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search IP, identifier, or device..."
                  value={lockoutSearch}
                  onChange={(e) => setLockoutSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-black border border-white/10 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30"
                />
              </div>
            </div>

            {filteredAttempts.length === 0 ? (
              <div className="py-10 text-center text-xs text-zinc-500">
                No recent failed login attempts found in stream.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/5 border-b border-white/10 text-zinc-400 text-[11px] font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Time</th>
                      <th className="py-3 px-4">Target Identifier</th>
                      <th className="py-3 px-4">IP Address</th>
                      <th className="py-3 px-4">User Agent / Device</th>
                      <th className="py-3 px-4">Failure Reason</th>
                      <th className="py-3 px-4 text-right">Quick Block</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-zinc-300">
                    {filteredAttempts.map((attempt) => (
                      <tr key={attempt.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-4 text-zinc-400 font-mono whitespace-nowrap">
                          {new Date(attempt.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="py-3 px-4 font-mono font-medium text-white">{attempt.targetIdentifier}</td>
                        <td className="py-3 px-4 font-mono text-zinc-400">
                          <div className="flex items-center gap-1.5">
                            <span>{attempt.ipAddress}</span>
                            <button
                              onClick={() => copyToClipboard(attempt.ipAddress)}
                              className="text-zinc-500 hover:text-white"
                              title="Copy IP"
                            >
                              {copiedIp === attempt.ipAddress ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-zinc-400 max-w-xs truncate" title={attempt.userAgent}>
                          {attempt.browser || 'Unknown'} on {attempt.os || 'Device'}
                        </td>
                        <td className="py-3 px-4 text-red-400 font-mono text-[11px]">{attempt.reason}</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleQuickBlacklist(attempt.ipAddress)}
                            className="px-2.5 py-1 rounded bg-white/5 hover:bg-red-600/30 text-white/80 hover:text-red-300 border border-white/10 hover:border-red-500/30 font-medium transition-colors"
                          >
                            Blacklist IP
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 2: IP FIREWALL RULES ── */}
      {activeTab === 'firewall' && (
        <div className="space-y-6">
          {/* Top Controls & Test Tool */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* IP Test Tool Card */}
            <div className="lg:col-span-1 p-4 rounded-xl bg-[#121214] border border-white/10">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                <Shield size={14} /> Live IP Rule Simulator
              </h4>
              <p className="text-xs text-zinc-500 mt-1">
                Enter an IP address to test if it passes through the firewall or matches a blacklist rule.
              </p>
              <form onSubmit={handleTestIp} className="mt-3 flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. 192.168.1.100"
                  value={testIpInput}
                  onChange={(e) => setTestIpInput(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-lg bg-black border border-white/10 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30 font-mono"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-white text-black text-xs font-semibold hover:bg-zinc-200 transition-colors"
                >
                  Test
                </button>
              </form>

              {testIpResult && (
                <div
                  className={`mt-3 p-2.5 rounded-lg text-xs font-mono border ${
                    testIpResult.allowed
                      ? 'bg-emerald-950/30 border-emerald-900/40 text-emerald-300'
                      : 'bg-red-950/30 border-red-900/40 text-red-300'
                  }`}
                >
                  <div className="font-bold flex items-center gap-1.5">
                    {testIpResult.allowed ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                    {testIpResult.allowed ? 'TRAFFIC ALLOWED' : 'TRAFFIC BLOCKED (403)'}
                  </div>
                  <div className="text-[11px] mt-1 text-zinc-400">{testIpResult.reason}</div>
                </div>
              )}
            </div>

            {/* Firewall Rules Controls Card */}
            <div className="lg:col-span-2 p-4 rounded-xl bg-[#121214] border border-white/10 flex flex-col justify-between">
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-white">Firewall Access Rules</h4>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Explicit IP addresses or CIDR subnets allowed or denied by the server gateway.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAddRuleModal(true)}
                    className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-white text-black text-xs font-bold hover:bg-zinc-200 transition-all active:scale-95 shrink-0"
                  >
                    <Plus size={14} /> Add Firewall Rule
                  </button>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-white/5">
                <div className="flex items-center gap-1 bg-black p-1 rounded-lg border border-white/10">
                  {['ALL', 'BLACKLIST', 'WHITELIST'].map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setFirewallFilter(filter)}
                      className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                        firewallFilter === filter ? 'bg-white/15 text-white' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>

                <div className="relative w-full sm:w-60">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Search IP or reason..."
                    value={firewallSearch}
                    onChange={(e) => setFirewallSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1 rounded-lg bg-black border border-white/10 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Rules Table */}
          <div className="rounded-xl bg-[#121214] border border-white/10 overflow-hidden shadow-sm">
            {filteredRules.length === 0 ? (
              <div className="py-14 text-center">
                <Shield size={32} className="mx-auto text-zinc-600 mb-2" />
                <h4 className="text-sm font-semibold text-white">No firewall rules found</h4>
                <p className="text-xs text-zinc-500 mt-1">
                  Add an IP or subnet to whitelist trusted networks or block malicious traffic.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/5 border-b border-white/10 text-zinc-400 text-[11px] font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">IP Address / Range</th>
                      <th className="py-3 px-4">Reason</th>
                      <th className="py-3 px-4">Added By</th>
                      <th className="py-3 px-4">Expires</th>
                      <th className="py-3 px-4">Hits Blocked</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-zinc-300">
                    {filteredRules.map((rule) => (
                      <tr key={rule.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              rule.type === 'BLACKLIST'
                                ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            }`}
                          >
                            {rule.type}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-white">{rule.ip}</td>
                        <td className="py-3.5 px-4 text-zinc-300">{rule.reason}</td>
                        <td className="py-3.5 px-4 text-zinc-400">{rule.addedBy}</td>
                        <td className="py-3.5 px-4 text-zinc-400 font-mono text-[11px]">
                          {rule.expiresAt ? new Date(rule.expiresAt).toLocaleDateString() : 'Permanent'}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-zinc-300 font-semibold">{rule.hits || 0}</td>
                        <td className="py-3.5 px-4">
                          <button
                            onClick={() => handleToggleRule(rule.id)}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              rule.status === 'ACTIVE'
                                ? 'bg-white/15 text-white hover:bg-white/20'
                                : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'
                            }`}
                          >
                            {rule.status}
                          </button>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleDeleteRule(rule.id, rule.ip)}
                            className="p-1.5 rounded text-zinc-400 hover:text-red-400 hover:bg-white/5 transition-colors"
                            title="Delete Rule"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 3: ACTIVE SESSIONS ── */}
      {activeTab === 'sessions' && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-[#121214] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Laptop size={16} /> Active Authenticated Sessions
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Current active administrative and customer sessions across desktop and mobile devices.
              </p>
            </div>
            <button
              onClick={handleTerminateAllOther}
              className="px-3.5 py-2 rounded-lg bg-red-600/80 hover:bg-red-600 text-white text-xs font-bold transition-all"
            >
              Terminate All Other Sessions
            </button>
          </div>

          <div className="rounded-xl bg-[#121214] border border-white/10 overflow-hidden shadow-sm">
            {sessions.length === 0 ? (
              <div className="py-12 text-center text-xs text-zinc-500">
                No active session records found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/5 border-b border-white/10 text-zinc-400 text-[11px] font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">User & Email</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Device & Browser</th>
                      <th className="py-3 px-4">IP Address</th>
                      <th className="py-3 px-4">Last Active</th>
                      <th className="py-3 px-4">Session Created</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-zinc-300">
                    {sessions.map((sess) => (
                      <tr key={sess.sessionId} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-white flex items-center gap-2">
                            {sess.name || sess.email}
                            {sess.isCurrent && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-white text-black uppercase">
                                This Device
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-zinc-400">{sess.email}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/10 text-white/90">
                            {sess.role}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="text-zinc-200 font-medium">{sess.browser}</div>
                          <div className="text-[11px] text-zinc-500">{sess.os}</div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-zinc-400">{sess.ipAddress}</td>
                        <td className="py-3.5 px-4 text-zinc-300">
                          {new Date(sess.lastActiveAt).toLocaleTimeString()}
                        </td>
                        <td className="py-3.5 px-4 text-zinc-400">
                          {new Date(sess.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {!sess.isCurrent && (
                            <button
                              onClick={() => handleTerminateSession(sess.sessionId)}
                              className="px-2.5 py-1 rounded bg-white/5 hover:bg-red-600/30 text-zinc-300 hover:text-red-300 border border-white/10 transition-colors"
                            >
                              Terminate
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 4: E-COMMERCE THREAT RADAR ── */}
      {activeTab === 'fraudRadar' && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-[#121214] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Radio size={16} /> E-Commerce Anomaly Radar
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Heuristic detection of card-testing bursts, checkout velocity spikes, and credential stuffing.
              </p>
            </div>
            <div className="flex items-center gap-1 bg-black p-1 rounded-lg border border-white/10">
              {['ALL', 'OPEN', 'INVESTIGATING', 'RESOLVED'].map((f) => (
                <button
                  key={f}
                  onClick={() => setAnomalyFilter(f)}
                  className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                    anomalyFilter === f ? 'bg-white/15 text-white' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-[#121214] border border-white/10 overflow-hidden shadow-sm">
            {filteredAnomalies.length === 0 ? (
              <div className="py-14 text-center">
                <CheckCircle2 size={36} className="mx-auto text-emerald-400 mb-2" />
                <h4 className="text-sm font-semibold text-white">No active fraud or checkout anomalies detected</h4>
                <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                  Payment gateways, order flows, and checkout endpoints are functioning smoothly.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/5 border-b border-white/10 text-zinc-400 text-[11px] font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Severity</th>
                      <th className="py-3 px-4">Anomaly Type</th>
                      <th className="py-3 px-4">Target / Entity</th>
                      <th className="py-3 px-4">Risk Score</th>
                      <th className="py-3 px-4">Description</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Quick Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-zinc-300">
                    {filteredAnomalies.map((anom) => (
                      <tr key={anom.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              anom.severity === 'CRITICAL'
                                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                : anom.severity === 'HIGH'
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'bg-white/10 text-white/80'
                            }`}
                          >
                            {anom.severity}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-white font-semibold">{anom.type}</td>
                        <td className="py-3.5 px-4 font-mono text-zinc-300">{anom.target}</td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-white rounded-full"
                                style={{ width: `${anom.riskScore}%` }}
                              />
                            </div>
                            <span className="font-mono text-zinc-300">{anom.riskScore}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-zinc-300 max-w-sm">{anom.description}</td>
                        <td className="py-3.5 px-4">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                            {anom.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-1.5">
                          {anom.status !== 'RESOLVED' && (
                            <button
                              onClick={() => handleUpdateAnomalyStatus(anom.id, 'RESOLVED')}
                              className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-white text-[11px] font-medium transition-colors"
                            >
                              Resolve
                            </button>
                          )}
                          {anom.status !== 'DISMISSED' && (
                            <button
                              onClick={() => handleUpdateAnomalyStatus(anom.id, 'DISMISSED')}
                              className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white text-[11px] transition-colors"
                            >
                              Dismiss
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 5: POLICIES & MASTER PIN ── */}
      {activeTab === 'policies' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Master PIN Configuration Card */}
          <div className="p-6 rounded-xl bg-[#121214] border border-white/10 space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Key size={16} /> Master PIN Protection
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Require a secondary cryptographic PIN for high-risk operations like database backup deletions,
                  flushing firewall rules, or terminating all admin sessions.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={policies.masterPinEnforced}
                  onChange={(e) => setPolicies({ ...policies, masterPinEnforced: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-white peer-checked:after:bg-black"></div>
              </label>
            </div>

            <form onSubmit={handleUpdateMasterPin} className="space-y-3 pt-3 border-t border-white/5">
              <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Set / Change Master PIN</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="password"
                  placeholder="Current PIN (if set)"
                  value={pinForm.currentPin}
                  onChange={(e) => setPinForm({ ...pinForm, currentPin: e.target.value })}
                  className="px-3 py-2 rounded-lg bg-black border border-white/10 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30"
                />
                <input
                  type="password"
                  placeholder="New PIN (4-8 digits)"
                  value={pinForm.newPin}
                  onChange={(e) => setPinForm({ ...pinForm, newPin: e.target.value })}
                  className="px-3 py-2 rounded-lg bg-black border border-white/10 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30"
                />
                <input
                  type="password"
                  placeholder="Confirm New PIN"
                  value={pinForm.confirmPin}
                  onChange={(e) => setPinForm({ ...pinForm, confirmPin: e.target.value })}
                  className="px-3 py-2 rounded-lg bg-black border border-white/10 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 rounded-lg bg-white text-black text-xs font-bold hover:bg-zinc-200 transition-colors"
              >
                Update Master PIN
              </button>
            </form>

            <div className="pt-3 border-t border-white/5">
              <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
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
                    <label key={act.id} className="flex items-center gap-2.5 text-xs text-zinc-300 cursor-pointer">
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
                        className="rounded border-zinc-700 bg-black text-white focus:ring-0"
                      />
                      <span>{act.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Rate Limiting & Auth Policies Card */}
          <div className="p-6 rounded-xl bg-[#121214] border border-white/10 space-y-6 flex flex-col justify-between">
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sliders size={16} /> Brute-Force & Session Governance
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Tune thresholds for automatic lockout triggers and idle session timeouts.
                </p>
              </div>

              {/* Max attempts slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-300">Max Failed Login Attempts Before Lockout</span>
                  <span className="font-mono font-bold text-white">{policies.bruteForceMaxAttempts} tries</span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="15"
                  value={policies.bruteForceMaxAttempts}
                  onChange={(e) => setPolicies({ ...policies, bruteForceMaxAttempts: Number(e.target.value) })}
                  className="w-full accent-white"
                />
              </div>

              {/* Lockout duration slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-300">Lockout Duration (Cooldown Period)</span>
                  <span className="font-mono font-bold text-white">{policies.bruteForceLockoutMinutes} minutes</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="60"
                  step="5"
                  value={policies.bruteForceLockoutMinutes}
                  onChange={(e) => setPolicies({ ...policies, bruteForceLockoutMinutes: Number(e.target.value) })}
                  className="w-full accent-white"
                />
              </div>

              {/* Session Inactivity Timeout */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-300">Idle Session Inactivity Timeout</span>
                  <span className="font-mono font-bold text-white">{policies.sessionTimeoutMinutes} minutes</span>
                </div>
                <input
                  type="range"
                  min="15"
                  max="240"
                  step="15"
                  value={policies.sessionTimeoutMinutes}
                  onChange={(e) => setPolicies({ ...policies, sessionTimeoutMinutes: Number(e.target.value) })}
                  className="w-full accent-white"
                />
              </div>

              {/* 2FA Policies */}
              <div className="pt-3 border-t border-white/5 space-y-3">
                <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Two-Factor Authentication</h4>
                <div className="space-y-2">
                  <label className="flex items-center justify-between text-xs text-zinc-300 cursor-pointer">
                    <span>Require 2FA for Administrators</span>
                    <input
                      type="checkbox"
                      checked={policies.require2FAForAdmin}
                      onChange={(e) => setPolicies({ ...policies, require2FAForAdmin: e.target.checked })}
                      className="rounded border-zinc-700 bg-black text-white focus:ring-0"
                    />
                  </label>
                  <label className="flex items-center justify-between text-xs text-zinc-300 cursor-pointer">
                    <span>Require 2FA for Staff / Managers</span>
                    <input
                      type="checkbox"
                      checked={policies.require2FAForStaff}
                      onChange={(e) => setPolicies({ ...policies, require2FAForStaff: e.target.checked })}
                      className="rounded border-zinc-700 bg-black text-white focus:ring-0"
                    />
                  </label>
                </div>
              </div>
            </div>

            <button
              onClick={handleSavePolicies}
              className="w-full py-2.5 rounded-lg bg-white text-black text-xs font-bold hover:bg-zinc-200 transition-all active:scale-[0.99]"
            >
              Save Security Policies
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL: ADD FIREWALL RULE ── */}
      <AnimatePresence>
        {showAddRuleModal && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#121214] border border-white/15 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Shield size={18} /> Add Firewall Rule
                </h3>
                <button
                  onClick={() => setShowAddRuleModal(false)}
                  className="text-zinc-400 hover:text-white text-xs"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddRuleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">IP Address or CIDR Range</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 203.0.113.42 or 10.0.0.0/24"
                    value={newRule.ip}
                    onChange={(e) => setNewRule({ ...newRule, ip: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-black border border-white/10 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/40 font-mono"
                  />
                  <p className="text-[10px] text-zinc-500 mt-1">Supports IPv4, IPv6, and CIDR subnet notations.</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">Rule Policy</label>
                    <select
                      value={newRule.type}
                      onChange={(e) => setNewRule({ ...newRule, type: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-black border border-white/10 text-xs text-white focus:outline-none focus:border-white/40"
                    >
                      <option value="BLACKLIST">BLACKLIST (Block)</option>
                      <option value="WHITELIST">WHITELIST (Allow)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">Rule Expiration</label>
                    <select
                      value={newRule.expiresHours}
                      onChange={(e) => setNewRule({ ...newRule, expiresHours: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-black border border-white/10 text-xs text-white focus:outline-none focus:border-white/40"
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
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Reason / Note</label>
                  <input
                    type="text"
                    placeholder="e.g. Malicious scraper or office VPN"
                    value={newRule.reason}
                    onChange={(e) => setNewRule({ ...newRule, reason: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-black border border-white/10 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/40"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddRuleModal(false)}
                    className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-medium text-zinc-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-white text-black text-xs font-bold hover:bg-zinc-200 transition-colors"
                  >
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
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#121214] border border-white/15 rounded-2xl w-full max-w-sm p-6 shadow-2xl text-center space-y-4"
            >
              <div className="w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center mx-auto">
                <Key size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Master PIN Required</h3>
                <p className="text-xs text-zinc-400 mt-1">
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
                  className="w-full text-center tracking-[0.4em] text-lg font-bold py-2.5 rounded-lg bg-black border border-white/15 text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/50"
                />

                {pinPromptError && (
                  <p className="text-xs text-red-400 font-medium">{pinPromptError}</p>
                )}

                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPinModal(false);
                      setPendingPinAction(null);
                    }}
                    className="flex-1 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-medium text-zinc-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 rounded-lg bg-white text-black text-xs font-bold hover:bg-zinc-200 transition-colors"
                  >
                    Confirm
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
