import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { LifeBuoy, Send, Loader2, Inbox, Clock, Tag } from 'lucide-react';
import SEOHead from '../../components/seo/SEOHead';
import Breadcrumb from '../../components/common/Breadcrumb';
import { useSettings } from '../../store/useSettings';
import { ticketsAPI } from '../../api/tickets';
import { TICKET_PRIORITIES, TICKET_CATEGORIES, ticketStatusLabel } from '../../utils/constants';
import { formatDate } from '../../utils/formatters';
import toast from '../../utils/toast';

const EMPTY_FORM = { subject: '', category: 'OTHER', priority: 'MEDIUM', orderId: '', message: '' };

// Chat-initiated tickets carry a CHAT- ticket-number prefix (see ChatController::init).
const isChatTicket = (ticket) =>
  typeof ticket?.ticket_number === 'string' && ticket.ticket_number.startsWith('CHAT-');

// Status badge styling — mirrors the storefront's soft pill badge language.
const STATUS_STYLES = {
  OPEN: 'bg-blue-50 text-blue-700 border-blue-100',
  IN_PROGRESS: 'bg-amber-50 text-amber-700 border-amber-100',
  WAITING_CUSTOMER: 'bg-purple-50 text-purple-700 border-purple-100',
  RESOLVED: 'bg-green-50 text-green-700 border-green-100',
  CLOSED: 'bg-gray-100 text-gray-600 border-gray-200',
};

const PRIORITY_STYLES = {
  LOW: 'bg-gray-50 text-gray-600 border-gray-200',
  MEDIUM: 'bg-blue-50 text-blue-700 border-blue-100',
  HIGH: 'bg-amber-50 text-amber-700 border-amber-100',
  URGENT: 'bg-red-50 text-red-700 border-red-100',
};

export default function SupportTicketsPage() {
  const { t } = useTranslation();
  const { getSetting } = useSettings();
  const storeName = getSetting('storeName', 'THREVOLT');

  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);

  const loadTickets = useCallback(async () => {
    setTicketsLoading(true);
    try {
      const r = await ticketsAPI.getUserTickets();
      const data = r.data?.data || r.data;
      const list = data?.tickets || data?.items || data || [];
      setTickets(Array.isArray(list) ? list : []);
    } catch {
      setTickets([]);
    } finally {
      setTicketsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.subject.trim() || !form.message.trim() || !form.category) {
      toast.error(t('support.required_fields'));
      return;
    }
    setSubmitting(true);
    try {
      await ticketsAPI.createTicket({
        subject: form.subject.trim(),
        category: form.category,
        priority: form.priority,
        message: form.message.trim(),
        orderId: form.orderId.trim() || undefined,
      });
      toast.success(t('support.ticket_created'));
      setForm(EMPTY_FORM);
      loadTickets();
    } catch (err) {
      const msg = err?.response?.data?.message || t('support.failed_create');
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const setField = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  return (
    <div className="page-content bg-white">
      <SEOHead
        title={`Support Tickets | ${storeName}`}
        description={`Contact ${storeName} support. Open a support ticket for help with orders, payments, shipping, returns, or product questions.`}
        noIndex={true}
      />

      {/* Hero */}
      <div className="bg-black text-white py-14 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Breadcrumb
            items={[{ label: t('nav.home'), href: '/' }, { label: t('support.title') }]}
            variant="dark"
            className="mb-6"
          />
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <LifeBuoy size={24} className="text-primary" />
            </div>
            <div>
              <h1 className="font-display text-3xl sm:text-4xl font-bold">{t('support.title')}</h1>
              <p className="text-gray-300 mt-2 max-w-2xl">{t('support.hero_desc')}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-5 gap-10">
          {/* ── New Ticket Form ── */}
          <div className="lg:col-span-3">
            <div className="bg-gray-50 p-6 sm:p-8 rounded-2xl">
              <div className="flex items-center gap-2 mb-6">
                <Tag className="w-5 h-5 text-black" />
                <h2 className="font-display text-xl sm:text-2xl font-bold text-black">{t('support.new_ticket')}</h2>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Subject */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('support.subject')} *</label>
                  <input
                    type="text"
                    value={form.subject}
                    onChange={setField('subject')}
                    maxLength={255}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-black transition-colors"
                    placeholder={t('support.subject_placeholder')}
                    autoComplete="off"
                  />
                </div>

                {/* Category + Priority */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('support.category')} *</label>
                    <select
                      value={form.category}
                      onChange={setField('category')}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:border-black transition-colors"
                    >
                      {TICKET_CATEGORIES.map((c) => (
                        <option key={c} value={c}>{ticketStatusLabel(c)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('support.priority')}</label>
                    <select
                      value={form.priority}
                      onChange={setField('priority')}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:border-black transition-colors"
                    >
                      {TICKET_PRIORITIES.map((p) => (
                        <option key={p} value={p}>{ticketStatusLabel(p)}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Order ID (optional) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('support.order_id')}</label>
                  <input
                    type="text"
                    value={form.orderId}
                    onChange={setField('orderId')}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-black transition-colors"
                    placeholder={t('support.order_placeholder')}
                    autoComplete="off"
                  />
                </div>

                {/* Message */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('support.message')} *</label>
                  <textarea
                    value={form.message}
                    onChange={setField('message')}
                    rows={6}
                    maxLength={5000}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-black transition-colors resize-none"
                    placeholder={t('support.message_placeholder')}
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-black text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  {submitting ? (
                    <><Loader2 size={18} className="animate-spin" /> {t('support.submitting')}</>
                  ) : (
                    <><Send size={18} /> {t('support.submit')}</>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* ── My Tickets ── */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <Inbox className="w-5 h-5 text-black" />
              <h2 className="font-display text-xl sm:text-2xl font-bold text-black">{t('support.my_tickets')}</h2>
            </div>

            {ticketsLoading ? (
              <div className="bg-gray-50 rounded-2xl p-10 flex flex-col items-center justify-center gap-3 text-gray-400">
                <Loader2 size={24} className="animate-spin" />
                <span className="text-sm">{t('support.loading')}</span>
              </div>
            ) : tickets.length === 0 ? (
              <div className="bg-gray-50 rounded-2xl p-10 text-center">
                <div className="w-12 h-12 mx-auto rounded-full bg-gray-200 flex items-center justify-center mb-3">
                  <Inbox size={20} className="text-gray-400" />
                </div>
                <p className="font-semibold text-gray-700">{t('support.no_tickets')}</p>
                <p className="text-sm text-gray-500 mt-1">{t('support.no_tickets_desc')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tickets.map((ticket) => (
                  <div key={ticket.id} className="bg-gray-50 rounded-2xl p-5 hover:bg-gray-100/70 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                            {ticket.ticket_number || t('support.ticket')}
                          </div>
                          {isChatTicket(ticket) && (
                            <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-black text-white">
                              {t('support.chat')}
                            </span>
                          )}
                        </div>
                        <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2">{ticket.subject}</h3>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${STATUS_STYLES[ticket.status] || STATUS_STYLES.OPEN}`}>
                        {ticketStatusLabel(ticket.status)}
                      </span>
                      <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${PRIORITY_STYLES[ticket.priority] || PRIORITY_STYLES.MEDIUM}`}>
                        {ticketStatusLabel(ticket.priority)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-3 text-xs text-gray-400">
                      <Clock size={13} />
                      {formatDate(ticket.created_at)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
