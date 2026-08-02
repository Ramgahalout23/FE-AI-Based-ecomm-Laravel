import { useState, useEffect, useRef, useCallback } from 'react';
import { adminAPI } from '../../api/admin';
import { chatAPI } from '../../api/tickets';
import { onRealtimeEvent, connectRealtime } from '../../services/realtimeService';
import { formatDate } from '../../utils/formatters';
import { TICKET_STATUSES, ticketStatusLabel, ticketStatusClass, ticketPriorityLabel } from '../../utils/constants';
import Pagination from '../../components/admin/Pagination';
import ExportCSVModal from '../../components/admin/ExportCSVModal';
import { downloadBlob } from '../../utils/download';
import useInterval from '../../hooks/useInterval';
import toast from '../../utils/toast';

export default function SupportAdminPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chatTicket, setChatTicket] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const chatTicketIdRef = useRef(null);
  const threadRef = useRef(null);
  // Unread/new-chat badge — polls admin conversations.
  const [chatBadge, setChatBadge] = useState(0);
  // Tracks the last message id the admin has seen per ticket (session-only), so the
  // badge clears once a conversation is opened and reappears on new customer messages.
  const seenChatRef = useRef({});
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const pageSizeOptions = [10, 25, 50, 100];

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  // CSV Export
  const [showExportModal, setShowExportModal] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState(null);
  const [exportError, setExportError] = useState(null);

  const TICKET_COLUMNS = [
    { key: 'ticketNumber', label: 'Ticket #' },
    { key: 'customerName', label: 'Customer' },
    { key: 'customerEmail', label: 'Email' },
    { key: 'subject', label: 'Subject' },
    { key: 'description', label: 'Description' },
    { key: 'category', label: 'Category' },
    { key: 'priority', label: 'Priority' },
    { key: 'status', label: 'Status' },
    { key: 'createdAt', label: 'Created Date' },
  ];

  const handleExportCSV = async (selectedColumns) => {
    setExporting(true); setExportStatus('dispatching'); setExportError(null);
    try {
      const filters = { search: debouncedSearch || undefined, status: statusFilter !== 'ALL' ? statusFilter : undefined };
      Object.keys(filters).forEach(k => { if (filters[k] === undefined) delete filters[k]; });
      const dispatchRes = await adminAPI.dispatchExport({ type: 'tickets', filters, columns: selectedColumns });
      const jobId = dispatchRes.data?.data?.id;
      if (!jobId) throw new Error('No job ID returned');
      setExportStatus('processing');
      const poll = async () => {
        try {
          const statusRes = await adminAPI.checkExportStatus(jobId);
          const status = statusRes.data?.data?.status;
          if (status === 'completed') {
            const downloadRes = await adminAPI.downloadExport(jobId);
            const filename = statusRes.data?.data?.file_name || `tickets-export-${new Date().toISOString().slice(0, 10)}.csv`;
            downloadBlob(downloadRes, filename);
            setExportStatus('completed');
            toast.success('Tickets exported successfully');
            setTimeout(() => { setShowExportModal(false); setExportStatus(null); }, 1500);
          } else if (status === 'failed') {
            throw new Error(statusRes.data?.data?.error_message || 'Export failed');
          } else {
            setTimeout(poll, 1500);
          }
        } catch (pollErr) {
          console.error('Export poll error:', pollErr);
          if (!exportStatus || exportStatus === 'processing') {
            setExportStatus('failed'); setExportError(pollErr.response?.data?.message || pollErr.message || 'Export failed');
            toast.error('Export failed');
          }
        }
      };
      poll().catch(() => {});
    } catch (err) {
      console.error('Export failed:', err);
      setExportStatus('failed'); setExportError(err.response?.data?.message || err.message || 'Failed to export tickets');
      toast.error('Export failed');
    } finally { setExporting(false); }
  };

  const load = async (page = 1) => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: pageSize,
        search: debouncedSearch || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined
      };
      const r = await adminAPI.getSupportTickets(params);
      const data = r.data?.data || r.data;
      const list = data?.tickets || data?.items || data || [];
      setTickets(Array.isArray(list) ? list : []);
      const pag = r.data?.pagination || data?.pagination || (data?.total !== undefined ? { page: data.page, pages: data.total_pages, total: data.total, per_page: data.limit } : {});
      setCurrentPage(pag.page || page);
      setTotalPages(pag.pages || pag.totalPages || Math.ceil((pag.total || list.length) / pageSize) || 1);
      setTotalItems(pag.total || list.length);
    } catch (e) { setError('Failed to load support tickets'); console.warn('Failed to load support tickets:', e); } finally { setLoading(false); }
  };

  // Reset page when search or filter changes
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    } else {
      load(1);
    }
  }, [debouncedSearch, statusFilter, pageSize]);

  useEffect(() => {
    load(currentPage);
  }, [currentPage]);

  /**
   * Refresh the unread/new-chat badge.
   * A conversation counts as "needing attention" when the last message is from the
   * customer (or there are no messages yet) AND the admin hasn't seen that message
   * in this session. Admin replies/resolutions naturally clear it.
   */
  const refreshChatBadge = useCallback(async () => {
    try {
      const r = await chatAPI.getAdminConversations();
      const data = r.data?.data || r.data || [];
      const convos = Array.isArray(data) ? data : [];
      const count = convos.filter(t => {
        const msgs = Array.isArray(t.messages) ? t.messages : [];
        const last = msgs[msgs.length - 1];
        // Admin already has the latest word — nothing to flag.
        if (last?.is_from_admin) return false;
        const seen = seenChatRef.current[t.id];
        // Never opened this session → new conversation. Otherwise, only flag when
        // a customer message arrived after the admin last opened it.
        return seen === undefined || (last && seen !== last.id);
      }).length;
      setChatBadge(count);
    } catch {
      // Keep the last known badge value on transient failures.
    }
  }, []);

  useEffect(() => {
    refreshChatBadge();
  }, [refreshChatBadge]);

  // Poll every 30s so new customer chats surface while the page is open.
  useInterval(refreshChatBadge, 30000);

  const scrollThreadToBottom = useCallback(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  /**
   * Live chat:message subscription — append messages to the open thread and
   * refresh the badge immediately when a customer sends a new message.
   */
  useEffect(() => {
    connectRealtime().catch(() => {});

    const unsub = onRealtimeEvent('chat:message', (data) => {
      // Only append when the message belongs to the currently-open conversation.
      if (data?.ticketId === chatTicketIdRef.current && data?.message?.id) {
        setChatMessages(prev =>
          prev.some(m => m.id === data.message.id) ? prev : [...prev, data.message]
        );
        scrollThreadToBottom();
      }
      // A customer message (in any conversation) means the badge needs a refresh.
      if (data?.message && !data?.isAdmin) {
        refreshChatBadge();
      }
    });
    return () => unsub();
  }, [refreshChatBadge, scrollThreadToBottom]);

  const customerName = (t) =>
    [t.user?.firstName || t.user?.first_name, t.user?.lastName || t.user?.last_name].filter(Boolean).join(' ') || t.name || 'Guest';

  const chatTime = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return isNaN(d.getTime()) ? '' : d.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  useEffect(() => { scrollThreadToBottom(); }, [chatMessages, chatLoading, scrollThreadToBottom]);

  const openChat = async (ticket) => {
    chatTicketIdRef.current = ticket.id;
    setChatTicket(ticket);
    setChatMessages([]);
    setChatLoading(true);
    try {
      const r = await adminAPI.getAdminChatMessages(ticket.id);
      if (chatTicketIdRef.current !== ticket.id) return; // another conversation opened meanwhile
      const list = r.data?.data || r.data || [];
      const msgs = Array.isArray(list) ? list : [];
      setChatMessages(msgs);
      // Mark this conversation as seen up to its latest message.
      seenChatRef.current[ticket.id] = msgs[msgs.length - 1]?.id ?? null;
      refreshChatBadge();
    } catch {
      if (chatTicketIdRef.current === ticket.id) toast.error('Failed to load conversation');
    } finally {
      if (chatTicketIdRef.current === ticket.id) setChatLoading(false);
    }
  };

  const closeChat = () => {
    chatTicketIdRef.current = null;
    setChatTicket(null);
  };

  const sendChat = async () => {
    const text = chatInput.trim();
    if (!text || !chatTicket || sendingChat) return;
    setSendingChat(true);
    try {
      const r = await adminAPI.sendAdminChatMessage(chatTicket.id, text);
      // Ignore the response if the admin switched to a different conversation meanwhile.
      if (chatTicketIdRef.current !== chatTicket.id) return;
      const msg = r.data?.data || r.data;
      if (msg?.id) {
        setChatMessages(prev => [...prev, msg]);
        setChatInput('');
        // Our reply is now the latest message — refresh the badge.
        refreshChatBadge();
      }
    } catch { toast.error('Failed to send message'); } finally { setSendingChat(false); }
  };

  const resolveTicket = async (id) => {
    try {
      await adminAPI.updateSupportTicket(id, { status: 'RESOLVED' });
      setTickets(tickets.map(t => t.id === id ? { ...t, status: 'RESOLVED' } : t));
      setChatTicket(prev => prev && prev.id === id ? { ...prev, status: 'RESOLVED' } : prev);
      // Resolved tickets drop out of the OPEN/IN_PROGRESS poll, so refreshing the
      // badge naturally removes them from the count.
      refreshChatBadge();
      toast.success('Ticket marked as resolved');
    } catch { toast.error('Failed to resolve ticket'); }
  };

  return (
    <div>
      <div className="admin-header">
        <h2>
          Support Tickets
          {chatBadge > 0 && (
            <span className="chat-badge" title={`${chatBadge} conversation${chatBadge === 1 ? '' : 's'} need${chatBadge === 1 ? 's' : ''} a reply`}>
              {chatBadge > 9 ? '9+' : chatBadge} new
            </span>
          )}
        </h2>
        <p>Manage customer inquiries and help requests</p>
      </div>

      {error && <div className="admin-alert danger mb-4"><span className="admin-alert-icon">⚠️</span><div className="admin-alert-body"><div className="admin-alert-title">Error Loading Data</div><div>{error}</div></div></div>}
      <div className="table-card">
        <div className="table-toolbar">
          <input className="table-search" placeholder="Search tickets..." value={search} onChange={e => setSearch(e.target.value)} autoComplete="off" />
          <select className="table-filter" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="ALL">All Statuses</option>
            {TICKET_STATUSES.map(s => <option key={s} value={s}>{ticketStatusLabel(s)}</option>)}
          </select>
          <button className="btn-ghost btn-sm" onClick={() => setShowExportModal(true)}>📥 Export CSV</button>
          <span className="table-count">{totalItems} tickets</span>
        </div>
        <table className="admin-table">
          <thead><tr><th>ID</th><th>Customer</th><th>Subject</th><th>Priority</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7}><div className="loading-page" style={{ padding: '2rem' }}><div className="spinner" /></div></td></tr>
            ) : tickets.length === 0 ? (
              <tr><td colSpan={7}><div className="empty-state"><div className="empty-state-icon">📩</div><h3>No support tickets</h3></div></td></tr>
            ) : tickets.map(t => (
              <tr key={t.id}>
                <td><strong style={{ fontFamily: 'monospace' }}>#{t.id?.slice(0, 8)}</strong></td>
                <td>
                  <strong>{customerName(t)}</strong>
                  <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{t.user?.email || t.email || '—'}</div>
                </td>
                <td style={{ maxWidth: 300 }}><strong>{t.subject}</strong><div style={{ fontSize: '0.8rem', color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.message}</div></td>
                <td><span className="status-badge">{ticketPriorityLabel(t.priority)}</span></td>
                <td><span className={`status-badge ${ticketStatusClass(t.status)}`}>{ticketStatusLabel(t.status) || 'Open'}</span></td>
                <td style={{ fontSize: '0.82rem' }}>{formatDate(t.createdAt)}</td>
                <td>
                  <div className="row-actions">
                    <button className="btn-approve" onClick={() => openChat(t)}>Chat</button>
                    {t.status !== 'RESOLVED' && <button className="btn-view" onClick={() => resolveTicket(t.id)}>Resolve</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          onPageChange={setCurrentPage}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          pageSizeOptions={pageSizeOptions}
        />
      </div>

      <ExportCSVModal
        isOpen={showExportModal}
        onClose={() => { setShowExportModal(false); setExportStatus(null); setExportError(null); }}
        columns={TICKET_COLUMNS}
        onExport={handleExportCSV}
        exporting={exporting}
        exportStatus={exportStatus}
        exportError={exportError}
        filename={`tickets-export-${new Date().toISOString().slice(0, 10)}.csv`}
      />

      {chatTicket && (
        <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && closeChat()}>
          <div className="modal" style={{ maxWidth: 680 }}>
            <div className="modal-header">
              <h3>Chat with {customerName(chatTicket)}</h3>
              <button className="modal-close" onClick={closeChat}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '0.75rem', padding: '0.6rem 0.9rem', background: 'var(--off-white)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <strong>{chatTicket.subject}</strong>
                <span style={{ color: 'var(--muted)', fontFamily: 'monospace', fontSize: '0.78rem' }}>#{chatTicket.ticketNumber || chatTicket.ticket_number || chatTicket.id?.slice(0, 8)}</span>
                <span className="status-badge">{ticketPriorityLabel(chatTicket.priority)}</span>
                <span className={`status-badge ${ticketStatusClass(chatTicket.status)}`}>{ticketStatusLabel(chatTicket.status) || 'Open'}</span>
              </div>

              <div ref={threadRef} style={{ maxHeight: 380, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.6rem', padding: '0.25rem 0.1rem 0.5rem' }}>
                {chatLoading ? (
                  <div className="loading-page" style={{ padding: '2rem' }}><div className="spinner" /></div>
                ) : chatMessages.length === 0 ? (
                  <div className="empty-state"><div className="empty-state-icon">💬</div><h3>No messages yet</h3><p>Start the conversation with the customer.</p></div>
                ) : chatMessages.map(m => {
                  const mine = !!m.is_from_admin;
                  return (
                    <div key={m.id} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                      <div style={{ maxWidth: '78%' }}>
                        <div style={{
                          padding: '0.55rem 0.85rem',
                          borderRadius: 14,
                          fontSize: '0.88rem',
                          lineHeight: 1.45,
                          wordBreak: 'break-word',
                          background: mine ? '#111' : 'var(--off-white)',
                          color: mine ? '#fff' : '#1a1a1a',
                          borderBottomRightRadius: mine ? 4 : 14,
                          borderBottomLeftRadius: mine ? 14 : 4,
                        }}>
                          {m.content}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--muted)', marginTop: 3, textAlign: mine ? 'right' : 'left' }}>
                          {mine ? 'You' : customerName(chatTicket)} · {chatTime(m.created_at)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="form-group form-full" style={{ marginBottom: 0 }}>
                <textarea rows={3} value={chatInput} onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
                  placeholder="Type a message and press Enter..." disabled={chatTicket.status === 'RESOLVED'} />
              </div>
            </div>
            <div className="modal-footer">
              {chatTicket.status !== 'RESOLVED' && <button className="btn-view" onClick={() => resolveTicket(chatTicket.id)}>Resolve</button>}
              <button className="btn-ghost btn-sm" onClick={closeChat}>Close</button>
              <button className="btn-dark btn-sm" onClick={sendChat} disabled={sendingChat || !chatInput.trim() || chatTicket.status === 'RESOLVED'}>Send</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
