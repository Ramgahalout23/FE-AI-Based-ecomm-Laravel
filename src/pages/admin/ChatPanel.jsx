/**
 * ChatPanel — WhatsApp-style admin chat.
 * Performance-optimized: minimal re-renders, no full reloads on messages.
 */

import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { MessageCircle, Send, RefreshCw, Bot, Headphones, X, CheckCircle, Search, Trash2, Eraser, ImagePlus } from 'lucide-react';
import { chatAPI } from '../../api/tickets';
import { formatTime } from '../../utils/formatters';
import toast from '../../utils/toast';
import { io } from 'socket.io-client';

// ── Socket singleton ──
let adminSocket = null;
function getAdminSocket() {
  if (adminSocket?.connected) return adminSocket;
  if (adminSocket?.connecting) return adminSocket;
  const token = localStorage.getItem('adminToken');
  const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';
  if (!token) return null;
  adminSocket = io(socketUrl, { auth: { token }, transports: ['polling', 'websocket'], reconnection: true, reconnectionAttempts: 5, reconnectionDelay: 1000 });
  return adminSocket;
}

// ── Pure helpers (no re-renders) ──
function getDisplayName(conv) {
  const first = conv.user?.firstName || '';
  if (first.startsWith('Guest') && conv.user?.email?.includes('guest-')) {
    const m = conv.user.email.match(/guest-(?:anon-)?[\d]+-(\w+)@/);
    return m ? `Guest ${m[1]}` : `Guest ${first.split(' ')[1] || ''}`;
  }
  return `${first} ${conv.user?.lastName || ''}`.trim() || 'Guest';
}
function getInitials(name) {
  const p = name.split(' ').filter(Boolean);
  return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : (p[0]?.[0] || 'G').toUpperCase();
}
function stringToColor(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return ['#6366f1', '#8b5cf6', '#a855f7', '#ec4899', '#f43f5e', '#f97316', '#14b8a6', '#06b6d4'][Math.abs(h) % 8];
}
function isHiddenMessage(msg) {
  const c = (msg?.content || '').trim().toLowerCase();
  return c.startsWith('csat:') || c.startsWith('csat ') || c === 'csat:good' || c === 'csat:bad' || c === 'csat:neutral' || c.startsWith('{"type":"csat"}') || c === 'system:chat_closed';
}
// Sound removed per user request
function StatusBadge({ status }) {
  const map = { OPEN: { c: '#22c55e', b: '#dcfce7', l: 'Active' }, IN_PROGRESS: { c: '#2563eb', b: '#dbeafe', l: 'In Progress' }, WAITING_CUSTOMER: { c: '#f59e0b', b: '#fef3c7', l: 'Waiting' }, RESOLVED: { c: '#6b7280', b: '#f3f4f6', l: 'Resolved' }, CLOSED: { c: '#9ca3af', b: '#f9fafb', l: 'Closed' } };
  const s = map[status] || map.OPEN;
  return <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '0.65rem', fontWeight: 600, background: s.b, color: s.c }}>{s.l}</span>;
}

// ── Memoized conversation item — only re-renders when THIS conv changes ──
const ConversationItem = memo(function ConversationItem({ conv, active, unread, typing, name, lastMsg, unreadCount, onSelect, onDelete }) {
  const bg = stringToColor(name);
  return (
    <div onClick={() => onSelect(conv)} className="chat-conv-item"
      style={{ padding: '12px 16px', cursor: 'pointer', background: active ? '#eff6ff' : 'transparent', borderLeft: active ? '3px solid #3b82f6' : '3px solid transparent', transition: 'all 0.15s', position: 'relative' }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#f9fafb'; const btn = e.currentTarget.querySelector('.conv-delete-btn'); if (btn) btn.style.opacity = '1'; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; const btn = e.currentTarget.querySelector('.conv-delete-btn'); if (btn) btn.style.opacity = '0'; }}>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '14px' }}>{getInitials(name)}</div>
          {unread && <div style={{ position: 'absolute', top: 0, right: 0, width: '12px', height: '12px', borderRadius: '50%', background: '#ef4444', border: '2px solid white' }} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
            <span style={{ fontWeight: unread ? 700 : 600, fontSize: '13px', color: '#111' }}>{name}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {unread && <span style={{ minWidth: '18px', height: '18px', borderRadius: '9px', background: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 800, color: 'white', padding: '0 5px' }}>{unreadCount > 99 ? '99+' : unreadCount}</span>}
              <span style={{ fontSize: '10px', color: '#9ca3af', whiteSpace: 'nowrap' }}>{conv.updatedAt ? formatTime(conv.updatedAt) : ''}</span>
            </div>
          </div>
          <div style={{ fontSize: '12px', color: unread ? '#374151' : '#6b7280', fontWeight: unread ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {typing ? <span style={{ color: '#6366f1', fontStyle: 'italic' }}>typing...</span> : (lastMsg?.substring(0, 50) || conv.subject || 'New conversation')}
          </div>
        </div>
        <button className="conv-delete-btn" onClick={(e) => onDelete(e, conv.id)} style={{ opacity: 0, width: '28px', height: '28px', borderRadius: '6px', border: 'none', background: '#fef2f2', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#ef4444', transition: 'opacity 0.15s', position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }}>
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
});

export default function ChatPanel() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chatMode, setChatMode] = useState('ai');
  const [modeLoading, setModeLoading] = useState(false);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [sending, setSending] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});
  const [lastMessages, setLastMessages] = useState({});
  const [unreadCounts, setUnreadCounts] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [imagePreview, setImagePreview] = useState(null);
  const [autoReply, setAutoReply] = useState({ enabled: true, timeout: 120, message: '' });
  const [showAutoReplySettings, setShowAutoReplySettings] = useState(false);
  const [savingAutoReply, setSavingAutoReply] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const selectedChatRef = useRef(null);
  const conversationsRef = useRef([]);
  const loadingConvsRef = useRef(false);
  useEffect(() => { selectedChatRef.current = selectedChat; }, [selectedChat]);
  useEffect(() => { conversationsRef.current = conversations; }, [conversations]);

  const loadConversations = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const res = await chatAPI.getAdminConversations({ page: 1, limit: 50 });
      const items = res.data?.data?.items || res.data?.data || [];
      // Only update if we got real data — NEVER overwrite with empty array on failure
      if (Array.isArray(items) && items.length > 0) {
        setConversations(items);
        const lm = {};
        items.forEach(c => {
          const vis = (c.ticketmessage || []).filter(m => !isHiddenMessage(m));
          if (vis.length > 0) lm[c.id] = vis[0].content;
        });
        setLastMessages(lm);
      } else if (showSpinner) {
        // First load with no data — show empty state (don't hide on bg refresh)
        setConversations([]);
      }
      // If items is empty on background refresh, keep existing conversations
    } catch (err) {
      console.warn('[ChatPanel] loadConversations failed:', err?.message);
      // NEVER clear conversations on failure — keep what we have
    } finally { if (showSpinner) setLoading(false); }
  }, []);

  const loadChatMode = useCallback(async () => {
    try { const res = await chatAPI.getChatStats(); setChatMode(res.data?.data?.chatMode || 'ai'); } catch {}
  }, []);

  const handleSwitchMode = async () => {
    const m = chatMode === 'ai' ? 'live' : 'ai';
    setModeLoading(true);
    try { await chatAPI.setChatMode(m); setChatMode(m); toast.success(`Mode: ${m === 'ai' ? 'AI' : 'Live'}`); } catch { toast.error('Failed'); } finally { setModeLoading(false); }
  };

  const loadAutoReplySettings = useCallback(async () => {
    try { const res = await chatAPI.getAutoReplySettings(); if (res.data?.data) setAutoReply(res.data.data); } catch {}
  }, []);

  const saveAutoReplySettings = async () => {
    setSavingAutoReply(true);
    try {
      await chatAPI.updateAutoReplySettings(autoReply);
      toast.success('Auto-reply settings saved');
      setShowAutoReplySettings(false);
    } catch { toast.error('Failed to save'); } finally { setSavingAutoReply(false); }
  };

  const loadMessages = useCallback(async (id) => {
    setMessagesLoading(true);
    try { const res = await chatAPI.adminGetMessages(id); setMessages(res.data?.data?.messages || []); } catch { setMessages([]); } finally { setMessagesLoading(false); }
  }, []);

  const handleSelectChat = useCallback(async (conv) => {
    setSelectedChat(conv);
    setUnreadCounts(p => { const n = { ...p }; delete n[conv.id]; return n; });
    await loadMessages(conv.id);
    inputRef.current?.focus();
  }, [loadMessages]);

  const handleDeleteChat = useCallback(async (e, convId) => {
    e.stopPropagation();
    if (!window.confirm('Delete this chat permanently?')) return;
    try {
      await chatAPI.adminDeleteChat(convId);
      toast.success('Chat deleted');
      if (selectedChat?.id === convId) { setSelectedChat(null); setMessages([]); }
      loadConversations();
    } catch { toast.error('Failed'); }
  }, [selectedChat?.id, loadConversations]);

  const handleSend = async () => {
    if (!inputValue.trim() || !selectedChat) return;
    const content = inputValue.trim();
    setInputValue('');
    setSending(true);

    // Optimistic: show message instantly
    const tempId = `admin-temp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setMessages(p => [...p, { id: tempId, content, isFromAdmin: true, senderId: 'admin', senderName: 'You', createdAt: new Date().toISOString() }]);

    try {
      const res = await chatAPI.adminSendMessage(selectedChat.id, content);
      const d = res.data?.data;
      if (d) {
        // Replace optimistic with real message (dedup handles socket too)
        setMessages(p => p.map(m => m.id === tempId ? { ...d, isFromAdmin: true } : m));
      } else {
        // Remove optimistic on failure
        setMessages(p => p.filter(m => m.id !== tempId));
        setInputValue(content);
        toast.error('Failed');
      }
    } catch {
      setMessages(p => p.filter(m => m.id !== tempId));
      setInputValue(content);
      toast.error('Failed');
    } finally { setSending(false); }
  };

  const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); if (fileInputRef.current) fileInputRef.current.value = ''; return; }
    setImagePreview({ file, url: URL.createObjectURL(file), name: file.name });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSendImage = async () => {
    if (!imagePreview || !selectedChat) return;
    setUploading(true);
    setUploadProgress(0);
    try {
      await new Promise((resolve, reject) => {
        const fd = new FormData();
        fd.append('file', imagePreview.file);
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/v1/admin/chat/${selectedChat.id}/upload-image`);
        const token = localStorage.getItem('adminToken');
        if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.upload.onprogress = (e) => { if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100)); };
        xhr.onload = () => { if (xhr.status >= 200 && xhr.status < 300) resolve(); else reject(new Error('Upload failed')); };
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.send(fd);
      });
      setUploadProgress(100);
      setTimeout(() => { setImagePreview(null); setUploadProgress(0); }, 300);
    } catch { toast.error('Failed to upload image'); setImagePreview(null); setUploadProgress(0); }
    finally { setUploading(false); }
  };

  const handleCancelPreview = () => {
    if (imagePreview?.url) URL.revokeObjectURL(imagePreview.url);
    setImagePreview(null);
    setUploadProgress(0);
  };

  const visibleMessages = useMemo(() => messages.filter(m => !isHiddenMessage(m)), [messages]);

  // ── Socket: ONE listener, ultra-lean handler — ZERO API calls from here ──
  useEffect(() => {
    const socket = getAdminSocket();
    if (!socket) return;

    const onConnect = () => setSocketConnected(true);
    const onDisconnect = () => setSocketConnected(false);

    const onChatMessage = (data) => {
      const cur = selectedChatRef.current;

      // 1. Add to open chat — bulletproof dedup (only if viewing this ticket)
      if (cur && data.ticketId === cur.id && data.message) {
        setMessages(p => {
          const incoming = data.message;
          if (p.some(m => m.id === incoming.id)) return p;
          if (incoming.isFromAdmin && p.some(m => m.isFromAdmin && m.content === incoming.content)) return p;
          if (!incoming.isFromAdmin && p.some(m => !m.isFromAdmin && m.senderId === incoming.senderId && m.content === incoming.content && Math.abs(new Date(m.createdAt).getTime() - new Date(incoming.createdAt).getTime()) < 2000)) return p;
          return [...p, incoming];
        });
      }

      // 2. Unread count for messages outside open chat
      if (data.message && !data.message.isFromAdmin && (!cur || data.ticketId !== cur.id)) {
        setUnreadCounts(p => ({ ...p, [data.ticketId]: (p[data.ticketId] || 0) + 1 }));
      }

      // 3. Update last-message preview inline — NO API CALL
      if (data.message) {
        setLastMessages(prev => ({ ...prev, [data.ticketId]: data.message.content }));
        // Also update conversation in-place so sidebar shows latest
        setConversations(prev => prev.map(c => c.id === data.ticketId ? { ...c, updatedAt: new Date().toISOString() } : c));
      }
      // NOTE: For brand-new conversations, user clicks Refresh button to load them.
      // We do NOT call loadConversations from the socket handler to avoid freezes.
    };

    const onTyping = (d) => {
      if (d.isAdmin) return;
      setTypingUsers(p => {
        const n = { ...p };
        if (d.isTyping) n[d.ticketId] = { name: d.senderName, t: Date.now() };
        else delete n[d.ticketId];
        return n;
      });
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('chat:message', onChatMessage);
    socket.on('chat:typing', onTyping);
    if (socket.connected) setSocketConnected(true);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('chat:message', onChatMessage);
      socket.off('chat:typing', onTyping);
    };
  }, []);

  useEffect(() => { loadConversations(); loadChatMode(); loadAutoReplySettings(); }, [loadConversations, loadChatMode, loadAutoReplySettings]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [visibleMessages.length]);
  useEffect(() => {
    const i = setInterval(() => {
      setTypingUsers(p => {
        const now = Date.now();
        let changed = false;
        const n = { ...p };
        Object.entries(n).forEach(([k, v]) => { if (now - v.t > 3000) { delete n[k]; changed = true; } });
        return changed ? n : p;
      });
    }, 1000);
    return () => clearInterval(i);
  }, []);

  const filtered = useMemo(() => conversations.filter(c => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return getDisplayName(c).toLowerCase().includes(q) || (lastMessages[c.id] || '').toLowerCase().includes(q);
  }), [conversations, searchQuery, lastMessages]);

  const dName = selectedChat ? getDisplayName(selectedChat) : '';
  const aBg = selectedChat ? stringToColor(dName) : '#6366f1';

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 180px)', minHeight: '600px', background: '#f0f2f5', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
      {/* ── Left: Conversations ── */}
      <div style={{ width: '340px', background: 'white', borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 20px 12px', borderBottom: '1px solid #f3f4f6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#111' }}>Live Chat</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: socketConnected ? '#22c55e' : '#ef4444', boxShadow: socketConnected ? '0 0 6px rgba(34,197,94,0.4)' : '0 0 6px rgba(239,68,68,0.4)' }} />
                <span style={{ fontSize: '11px', color: socketConnected ? '#22c55e' : '#ef4444', fontWeight: 600 }}>{socketConnected ? 'Connected' : 'Disconnected'}</span>
              </div>
            </div>
            <button onClick={loadConversations} style={{ width: '36px', height: '36px', borderRadius: '10px', border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}><RefreshCw size={15} /></button>
          </div>
          <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: '12px', padding: '3px', gap: '3px', marginBottom: '12px' }}>
            <button onClick={handleSwitchMode} disabled={modeLoading} style={{ flex: 1, padding: '9px 0', borderRadius: '10px', border: 'none', cursor: 'pointer', background: chatMode === 'ai' ? 'white' : 'transparent', boxShadow: chatMode === 'ai' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none', fontWeight: 700, fontSize: '0.78rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', color: chatMode === 'ai' ? '#6366f1' : '#9ca3af', transition: 'all 0.2s' }}><Bot size={15} /> AI {chatMode === 'ai' ? 'ON' : 'OFF'}</button>
            <button onClick={handleSwitchMode} disabled={modeLoading} style={{ flex: 1, padding: '9px 0', borderRadius: '10px', border: 'none', cursor: 'pointer', background: chatMode === 'live' ? 'white' : 'transparent', boxShadow: chatMode === 'live' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none', fontWeight: 700, fontSize: '0.78rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', color: chatMode === 'live' ? '#22c55e' : '#9ca3af', transition: 'all 0.2s' }}><Headphones size={15} /> Live {chatMode === 'live' ? 'ON' : 'OFF'}</button>
          </div>
          {chatMode === 'live' && (
            <div style={{ marginBottom: '10px' }}>
              <button onClick={() => setShowAutoReplySettings(!showAutoReplySettings)} style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1px solid #e5e7eb', background: autoReply.enabled ? '#f0fdf4' : '#fafafa', cursor: 'pointer', fontSize: '11px', fontWeight: 600, color: autoReply.enabled ? '#16a34a' : '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>⚡ Auto-reply {autoReply.enabled ? 'ON' : 'OFF'}</span>
                <span style={{ fontSize: '10px', color: '#9ca3af' }}>{autoReply.timeout}s</span>
              </button>
              {showAutoReplySettings && (
                <div style={{ marginTop: '8px', padding: '12px', background: 'white', borderRadius: '10px', border: '1px solid #e5e7eb' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={autoReply.enabled} onChange={e => setAutoReply(p => ({ ...p, enabled: e.target.checked }))} style={{ width: '16px', height: '16px', accentColor: '#22c55e' }} />
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>Enable auto-reply</span>
                  </label>
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: '4px' }}>Timeout (seconds)</label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {[60, 120, 180, 300].map(s => (
                        <button key={s} onClick={() => setAutoReply(p => ({ ...p, timeout: s }))} style={{ flex: 1, padding: '6px', borderRadius: '6px', border: `1px solid ${autoReply.timeout === s ? '#3b82f6' : '#e5e7eb'}`, background: autoReply.timeout === s ? '#eff6ff' : 'white', color: autoReply.timeout === s ? '#2563eb' : '#6b7280', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>{s < 60 ? `${s / 60}m` : `${s / 60}m`}</button>
                      ))}
                    </div>
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: '4px' }}>Auto-reply message</label>
                    <textarea value={autoReply.message} onChange={e => setAutoReply(p => ({ ...p, message: e.target.value }))} rows={3} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px', resize: 'vertical', outline: 'none', fontFamily: 'inherit' }} placeholder="Thank you for your patience..." />
                  </div>
                  <button onClick={saveAutoReplySettings} disabled={savingAutoReply} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: 'none', background: '#2563eb', color: 'white', fontSize: '12px', fontWeight: 600, cursor: 'pointer', opacity: savingAutoReply ? 0.6 : 1 }}>{savingAutoReply ? 'Saving...' : 'Save'}</button>
                </div>
              )}
            </div>
          )}
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search conversations..." style={{ width: '100%', padding: '8px 12px 8px 32px', borderRadius: '10px', border: '1px solid #e5e7eb', fontSize: '13px', outline: 'none', background: '#f9fafb', color: '#111' }} />
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? <div style={{ padding: '3rem', textAlign: 'center' }}><RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', color: '#d1d5db' }} /></div>
            : filtered.length === 0 ? <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}><MessageCircle size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} /><p style={{ fontWeight: 600, fontSize: '14px' }}>{searchQuery ? 'No matches' : 'No conversations'}</p></div>
            : filtered.map(conv => (
              <ConversationItem
                key={conv.id}
                conv={conv}
                active={selectedChat?.id === conv.id}
                unread={unreadCounts[conv.id] > 0 && selectedChat?.id !== conv.id}
                typing={typingUsers[conv.id]}
                name={getDisplayName(conv)}
                lastMsg={lastMessages[conv.id]}
                unreadCount={unreadCounts[conv.id] || 0}
                onSelect={handleSelectChat}
                onDelete={handleDeleteChat}
              />
            ))}
        </div>
      </div>

      {/* ── Right: Chat ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#e5ddd5' }}>
        {!selectedChat ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center', color: '#6b7280' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}><MessageCircle size={36} color="#d1d5db" /></div>
              <p style={{ fontWeight: 700, fontSize: '16px', color: '#374151', margin: '0 0 4px' }}>Select a conversation</p>
              <p style={{ fontSize: '13px', margin: 0 }}>Click a chat on the left to start responding</p>
            </div>
          </div>
        ) : (<>
          <div style={{ padding: '12px 20px', background: 'white', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: aBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '14px' }}>{getInitials(dName)}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#111' }}>{dName}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                  <StatusBadge status={selectedChat.status} />
                  <span style={{ fontSize: '11px', color: '#9ca3af' }}>•</span>
                  <span style={{ fontSize: '11px', color: '#9ca3af' }}>{selectedChat.ticketNumber}</span>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <button onClick={async () => { if (!window.confirm('Clear all messages?')) return; try { await chatAPI.adminClearMessages(selectedChat.id); setMessages([]); toast.success('Cleared'); } catch { toast.error('Failed'); } }} title="Clear" style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}><Eraser size={14} /></button>
              <button onClick={() => { chatAPI.updateChatStatus(selectedChat.id, 'RESOLVED'); toast.success('Resolved'); loadConversations(); setSelectedChat(null); }} style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid #dcfce7', background: '#f0fdf4', cursor: 'pointer', fontSize: '12px', fontWeight: 600, color: '#16a34a', display: 'flex', alignItems: 'center', gap: '4px' }}><CheckCircle size={13} /> Resolve</button>
              <button onClick={() => { setSelectedChat(null); setMessages([]); }} style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}><X size={14} /></button>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 24px' }}>
            {messagesLoading ? <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}><RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', color: '#9ca3af' }} /></div>
            : <>
              <div style={{ textAlign: 'center', margin: '4px 0 12px' }}>
                <span style={{ background: 'rgba(255,255,255,0.9)', padding: '4px 12px', borderRadius: '8px', fontSize: '11px', color: '#6b7280', fontWeight: 500, boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}>
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                </span>
              </div>
              {visibleMessages.map((msg, idx) => {
                const isMe = msg.isFromAdmin;
                const isAI = msg.senderId === 'ai-chatbot';
                const prev = visibleMessages[idx - 1];
                const next = visibleMessages[idx + 1];
                const firstInGroup = !prev || prev.isFromAdmin !== msg.isFromAdmin;
                const lastInGroup = !next || next.isFromAdmin !== msg.isFromAdmin;
                const gap = firstInGroup ? '16px' : '2px';
                const bubbleR = isMe
                  ? `${firstInGroup && lastInGroup ? '18' : firstInGroup ? '18 18 4 18' : lastInGroup ? '18 4 18 18' : '4 18 18 4'}px`
                  : `${firstInGroup && lastInGroup ? '18' : firstInGroup ? '18 18 18 4' : lastInGroup ? '4 4 18 18' : '4 18 4 18'}px`;
                return (
                  <div key={`${msg.id}-${idx}`} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', marginTop: gap, alignItems: 'flex-end', gap: '6px' }}>
                    {!isMe && <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: aBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '10px', flexShrink: 0, visibility: lastInGroup ? 'visible' : 'hidden' }}>{getInitials(dName)}</div>}
                    <div style={{ maxWidth: '68%' }}>
                      {isAI && firstInGroup && <div style={{ fontSize: '10px', color: '#6366f1', fontWeight: 700, marginBottom: '2px', paddingLeft: '12px' }}>🤖 AI Assistant</div>}
                      <div style={{ padding: '7px 11px', borderRadius: bubbleR, background: isMe ? '#d9fdd3' : 'white', color: '#111', fontSize: '13.5px', lineHeight: 1.45, boxShadow: '0 1px 1px rgba(0,0,0,0.06)', wordBreak: 'break-word', overflow: 'hidden' }}>
                        {(() => { try { const d = JSON.parse(msg.content); if (d.type === 'image' && d.url) return <img src={d.url} alt="Shared" style={{ maxWidth: '100%', maxHeight: '240px', borderRadius: '8px', cursor: 'pointer' }} loading="lazy" onClick={() => window.open(d.url, '_blank')} />; } catch {} return <div style={{ whiteSpace: 'pre-line' }}>{msg.content}</div>; })()}
                      </div>
                      {lastInGroup && (
                        <div style={{ fontSize: '10px', color: '#8b96a0', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '3px', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                          {formatTime(msg.createdAt)}
                          {isMe && <span style={{ color: '#53bdeb', fontSize: '12px', letterSpacing: '-2px' }}>✓✓</span>}
                        </div>
                      )}
                    </div>
                    {isMe && <div style={{ width: '28px' }} />}
                  </div>
                );
              })}
              {typingUsers[selectedChat.id] && (
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', marginTop: '8px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: aBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '10px' }}>{getInitials(dName)}</div>
                  <div style={{ background: 'white', padding: '10px 14px', borderRadius: '18px 18px 18px 4px', boxShadow: '0 1px 2px rgba(0,0,0,0.06)', display: 'flex', gap: '4px', alignItems: 'center' }}>
                    {[0, 1, 2].map(i => <div key={i} style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#9ca3af', animation: `typingBounce 1.4s ease-in-out ${i * 0.2}s infinite` }} />)}
                    <span style={{ fontSize: '10px', color: '#9ca3af', marginLeft: '4px' }}>{dName} typing</span>
                  </div>
                </div>
              )}
            </>}
            <div ref={messagesEndRef} />
          </div>

          {imagePreview && (
            <div style={{ padding: '12px 20px', background: '#fafafa', borderTop: '1px solid #e5e7eb' }}>
              <div style={{ position: 'relative', display: 'inline-block', maxWidth: '100%' }}>
                <img src={imagePreview.url} alt="Preview" style={{ maxWidth: '100%', maxHeight: '180px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }} />
                {uploading && <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '4px', background: 'rgba(0,0,0,0.2)', borderRadius: '0 0 10px 10px', overflow: 'hidden' }}><div style={{ height: '100%', width: `${uploadProgress}%`, background: 'linear-gradient(90deg, #2563eb, #3b82f6)', borderRadius: '10px', transition: 'width 0.3s ease' }} /></div>}
                {!uploading && <button onClick={handleCancelPreview} style={{ position: 'absolute', top: '-8px', right: '-8px', width: '22px', height: '22px', borderRadius: '50%', background: '#ef4444', border: '2px solid white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}><X size={11} /></button>}
                <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>{imagePreview.name} • {(imagePreview.file.size / 1024).toFixed(0)} KB</div>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <button onClick={handleCancelPreview} disabled={uploading} style={{ flex: 1, padding: '9px', borderRadius: '8px', border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer', fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>Cancel</button>
                <button onClick={handleSendImage} disabled={uploading} style={{ flex: 1, padding: '9px', borderRadius: '8px', border: 'none', background: uploading ? '#6366f1' : '#2563eb', cursor: uploading ? 'wait' : 'pointer', fontSize: '12px', fontWeight: 600, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                  {uploading ? <><RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> {uploadProgress}%</> : <>📤 Send</>}
                </button>
              </div>
            </div>
          )}

          {!imagePreview && (
            <div style={{ padding: '12px 20px', background: '#f0f2f5', borderTop: '1px solid #e5e7eb' }}>
              {chatMode === 'ai' && <div style={{ textAlign: 'center', fontSize: '11px', color: '#9ca3af', marginBottom: '8px', padding: '6px', background: 'white', borderRadius: '8px', border: '1px solid #e5e7eb' }}>🤖 AI is auto-responding • Switch to <strong>Live</strong> mode to reply manually</div>}
              <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end', background: 'white', borderRadius: '12px', padding: '6px 8px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*" style={{ display: 'none' }} />
                <button onClick={() => fileInputRef.current?.click()} disabled={chatMode === 'ai' || uploading} style={{ width: '34px', height: '34px', borderRadius: '8px', border: '1px solid #e5e7eb', background: 'white', cursor: chatMode === 'ai' ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: chatMode === 'ai' ? '#d1d5db' : '#6b7280' }}>
                  {uploading ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <ImagePlus size={14} />}
                </button>
                <textarea ref={inputRef} value={inputValue} onChange={e => setInputValue(e.target.value)} onKeyDown={handleKeyDown}
                  placeholder={chatMode === 'ai' ? 'AI is handling this chat...' : 'Type your reply...'}
                  rows={1} disabled={chatMode === 'ai'}
                  style={{ flex: 1, border: 'none', outline: 'none', fontSize: '13.5px', fontFamily: 'inherit', resize: 'none', lineHeight: 1.4, padding: '6px 8px', background: 'transparent', color: chatMode === 'ai' ? '#9ca3af' : '#111' }} />
                <button onClick={handleSend} disabled={!inputValue.trim() || sending || chatMode === 'ai'}
                  style={{ width: '36px', height: '36px', borderRadius: '10px', border: 'none', cursor: inputValue.trim() && chatMode !== 'ai' ? 'pointer' : 'default', background: inputValue.trim() && chatMode !== 'ai' ? '#2563eb' : '#e5e7eb', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {sending ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={14} />}
                </button>
              </div>
            </div>
          )}
        </>)}
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}@keyframes typingBounce{0%,60%,100%{transform:translateY(0);opacity:.4}30%{transform:translateY(-4px);opacity:1}}`}</style>
    </div>
  );
}
