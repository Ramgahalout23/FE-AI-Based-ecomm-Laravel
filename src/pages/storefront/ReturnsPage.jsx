import { Send, RefreshCw, Plus, ArrowLeft, RotateCcw, Clock, CheckCircle, XCircle, HelpCircle, FileText } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import SEOHead from '../../components/seo/SEOHead';
import Breadcrumb from '../../components/common/Breadcrumb';
import { returnsAPI } from '../../api/returns';
import { ordersAPI } from '../../api/orders';
import { useSettings } from '../../store/useSettings';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { showSuccess, showError } from '../../utils/toast';

const STATUS_CONFIG = {
  PENDING:    { icon: Clock,         label: 'Pending Review',    class: 'bg-amber-50 text-amber-700 border-amber-200',    dot: 'bg-amber-400' },
  APPROVED:   { icon: CheckCircle,   label: 'Approved',          class: 'bg-blue-50 text-blue-700 border-blue-200',        dot: 'bg-blue-500' },
  REJECTED:   { icon: XCircle,       label: 'Rejected',          class: 'bg-red-50 text-red-700 border-red-200',           dot: 'bg-red-500' },
  COMPLETED:  { icon: CheckCircle,   label: 'Completed',         class: 'bg-green-50 text-green-700 border-green-200',     dot: 'bg-green-500' },
};

const REASONS = [
  { value: 'defective',    label: 'Defective / Damaged Item' },
  { value: 'wrong_item',   label: 'Wrong Item Received' },
  { value: 'not_as_desc',  label: 'Not as Described' },
  { value: 'size_issue',   label: 'Size / Fit Issue' },
  { value: 'other',        label: 'Other' },
];

const RETURN_TYPES = [
  { value: '',          label: 'What would you like?', disabled: true },
  { value: 'exchange',  label: 'Exchange (same item, different size)', desc: 'For size issues' },
  { value: 'replacement', label: 'Replacement (same item, new unit)', desc: 'For defective or wrong items' },
];

export default function ReturnsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { getSetting } = useSettings();
  const storeName = getSetting('storeName', 'THREVOLT');

  const [activeTab, setActiveTab] = useState('requests');
  const [returnRequests, setReturnRequests] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // ── Form State ──
  const [formData, setFormData] = useState({ order_id: '', reason: '', return_type: '', description: '' });
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [retRes, ordRes] = await Promise.all([
        returnsAPI.getReturnRequests().catch(() => ({ data: { data: [] } })),
        ordersAPI.getUserOrders().catch(() => ({ data: { data: { orders: [] } } })),
      ]);

      setReturnRequests(retRes?.data?.data || []);
      // Backend paginates getUserOrders: { success, data: { current_page, data: [orders] } }
      const ordersBody = ordRes?.data?.data || {};
      const rawOrders = ordersBody?.data || ordersBody?.orders || ordersBody;
      setOrders(Array.isArray(rawOrders) ? rawOrders.filter(o => ['DELIVERED', 'SHIPPED'].includes(o.status)) : []);
    } catch (e) {
      console.warn('Failed to load return data:', e);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const errs = {};
    if (!formData.order_id) errs.order_id = 'Please select an order';
    if (!formData.reason) errs.reason = 'Please select a reason';
    if (!formData.return_type) errs.return_type = 'Please select what you would like';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const payload = {
        order_id: formData.order_id,
        reason: formData.reason,
        description: formData.description,
        return_type: formData.return_type,
      };

      await returnsAPI.createReturnRequest(payload);
      showSuccess(t('returns.request_submitted'));

      // Reset form & reload
      setFormData({ order_id: '', reason: '', return_type: '', description: '' });
      setFormErrors({});
      loadData();
      setActiveTab('requests');
    } catch (err) {
      const msg = err?.response?.data?.message || t('returns.failed_submit');
      showError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const cfg = STATUS_CONFIG[status] || { icon: HelpCircle, label: status, class: 'bg-gray-50 text-gray-600 border-gray-200', dot: 'bg-gray-400' };
    const Icon = cfg.icon;
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${cfg.class}`}>
        <Icon size={12} />
        {cfg.label}
      </span>
    );
  };

  return (
    <div className="page-content bg-white flex-1">
      <SEOHead
        title={`Returns | ${storeName}`}
        description={`Submit and track return requests at ${storeName}.`}
        noIndex={true}
      />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-12">
        <Breadcrumb
          items={[    {label: t('nav.home'), href: '/' },
    { label: t('profile.title'), href: '/profile' },
    { label: t('returns.title') },
          ]}
          variant="light"
          className="mb-4"
        />

        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate('/profile')}
            className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors shrink-0"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <span className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-0.5">{t('returns.support')}</span>
            <h1 className="font-display text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">{t('returns.title')}</h1>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6">
          {[
            { id: 'requests', label: t('returns.my_requests'), icon: FileText },
            { id: 'new',       label: t('returns.new_request'),  icon: Plus },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === tab.id
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon size={16} />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'new' && (
            <motion.div
              key="new"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {/* Form */}
              <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
                {/* Order Select */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">{t('returns.order')}</label>
                  {orders.length === 0 ? (
                    <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-500">
                      {t('returns.no_eligible_orders')}
                    </div>
                  ) : (
                    <select
                      value={formData.order_id}
                      onChange={(e) => setFormData((prev) => ({ ...prev, order_id: e.target.value }))}
                      className={`w-full border rounded-lg px-3 py-2.5 text-sm ${formErrors.order_id ? 'border-red-400' : 'border-gray-300'}`}
                    >
                      <option value="">{t('returns.select_order')}</option>
                      {orders.map((o) => (
                        <option key={o.id} value={o.id}>
                          #{o.id?.slice(0, 8)} — {formatCurrency(o.total || o.totalAmount)} ({formatDate(o.createdAt)})
                        </option>
                      ))}
                    </select>
                  )}
                  {formErrors.order_id && <p className="text-xs text-red-500 mt-1">{formErrors.order_id}</p>}
                </div>

                {/* Reason */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">{t('returns.reason')}</label>
                  <select
                    value={formData.reason}
                    onChange={(e) => setFormData((prev) => ({ ...prev, reason: e.target.value }))}
                    className={`w-full border rounded-lg px-3 py-2.5 text-sm ${formErrors.reason ? 'border-red-400' : 'border-gray-300'}`}
                  >
                    <option value="">{t('returns.select_reason')}</option>
                    {REASONS.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                  {formErrors.reason && <p className="text-xs text-red-500 mt-1">{formErrors.reason}</p>}
                </div>

                {/* Return Type (what the customer wants) */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">{t('returns.what_would_you_like')}</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {RETURN_TYPES.filter((rt) => rt.value).map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, return_type: type.value }))}
                        className={`text-left p-3 rounded-lg border-2 transition-all ${
                          formData.return_type === type.value
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        } ${formErrors.return_type ? 'border-red-400' : ''}`}
                      >
                        <div className="font-semibold text-sm text-gray-900">{type.label}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{type.desc}</div>
                      </button>
                    ))}
                  </div>
                  {formErrors.return_type && <p className="text-xs text-red-500 mt-1">{formErrors.return_type}</p>}
                </div>

                {/* Exchange info note */}
                {formData.return_type === 'exchange' && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                    <strong>Note:</strong> For size exchanges, you'll need to cover return shipping. We'll send the replacement once we receive the returned item. If the size is unavailable, store credit will be issued instead.
                  </div>
                )}

                {/* Replacement info note */}
                {formData.return_type === 'replacement' && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-xs text-green-800">
                    <strong>Note:</strong> For defective or wrong items, we'll arrange a free pickup and dispatch a replacement. No shipping charges for you.
                  </div>
                )}

                {/* Description */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Description <span className="text-gray-300 normal-case">(optional)</span></label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm resize-y"
                    placeholder="Provide more details — include photos/video links if possible (unboxing proof helps!)"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting || orders.length === 0}
                  className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white py-3 rounded-xl font-semibold text-sm hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <RefreshCw size={18} />
                  ) : (
                    <Send size={16} />
                  )}
                  {submitting ? t('returns.submitting') : t('returns.submit')}
                </button>
              </form>
            </motion.div>
          )}

          {activeTab === 'requests' && (
            <motion.div
              key="requests"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <RefreshCw size={24} />
                </div>
              ) : returnRequests.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <RotateCcw size={28} />
                  </div>
                  <h3 className="font-display text-lg font-bold text-gray-900 mb-1">{t('returns.no_requests')}</h3>
                  <p className="text-sm text-gray-500 mb-5">{t('returns.no_requests_desc')}</p>
                  <button
                    onClick={() => setActiveTab('new')}
                    className="inline-flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-gray-800 transition-colors"
                  >
                    <Plus size={16} />
                    {t('returns.new_request')}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {returnRequests.map((req) => (
                    <div key={req.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-all">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                            <RotateCcw size={16} />
                          </div>
                          <div>
                            <span className="font-semibold text-sm text-gray-900">Return Request</span>
                            <span className="text-xs text-gray-400 ml-2">#{req.id?.slice(0, 8)}</span>
                          </div>
                        </div>
                        {getStatusBadge(req.status)}
                      </div>

                      <div className="text-sm text-gray-600 ml-10 space-y-1">
                        <p><span className="font-medium text-gray-700">Reason:</span> {req.reason}</p>
                        {req.return_type && <p><span className="font-medium text-gray-700">Requested:</span> {req.return_type}</p>}
                        {req.description && <p><span className="font-medium text-gray-700">Details:</span> {req.description}</p>}
                        {req.admin_response && (
                          <p className="text-gray-500 italic mt-1">Admin: {req.admin_response}</p>
                        )}
                        {req.processed_at && (
                          <p className="text-xs text-gray-400 mt-1">Processed: {formatDate(req.processed_at)}</p>
                        )}
                      </div>

                      {/* Timeline dots */}
                      <div className="flex items-center gap-1.5 mt-3 ml-10">
                        {['PENDING', 'APPROVED', 'COMPLETED'].map((step) => {
                          const statusOrder = ['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED'];
                          const currentIdx = statusOrder.indexOf(req.status);
                          const stepIdx = statusOrder.indexOf(step);
                          const completed = stepIdx <= currentIdx && req.status !== 'REJECTED';
                          const rejected = req.status === 'REJECTED';
                          return (
                            <div key={step} className="flex items-center gap-0">
                              <div className={`w-2.5 h-2.5 rounded-full border-2 ${
                                completed && !rejected
                                  ? 'bg-green-500 border-green-500'
                                  : rejected
                                  ? stepIdx === 1 ? 'bg-red-500 border-red-500' : 'bg-gray-200 border-gray-200'
                                  : 'bg-white border-gray-300'
                              }`} />
                              {step !== 'COMPLETED' && (
                                <div className={`w-8 h-px ${
                                  (completed && !rejected) || (rejected && stepIdx < 1) ? 'bg-green-400' : 'bg-gray-200'
                                }`} />
                              )}
                            </div>
                          );
                        })}
                        <span className="text-[10px] text-gray-400 ml-1">{req.status}</span>
                      </div>

                      <p className="text-xs text-gray-400 mt-2 ml-10">{formatDate(req.created_at)}</p>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
