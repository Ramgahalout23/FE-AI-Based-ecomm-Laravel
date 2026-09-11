/**
 * ChatPanel — Modern, responsive live chat admin center.
 * Features:
 * - Real-time two-way messaging via ticket-scoped rooms
 * - Immediate sidebar update & audio chime on incoming customer messages
 * - Unrestricted admin messaging (never locked when AI mode is active)
 * - Canned quick replies toolbar
 * - Fully responsive with mobile view toggle (Back to chats)
 * - Performance optimized: zero redundant renders, pure helper functions
 */

import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import {
  MessageCircle,
  Send,
  RefreshCw,
  Bot,
  Headphones,
  X,
  CheckCircle,
  Search,
  Trash2,
  Eraser,
  ImagePlus,
  ArrowLeft,
  Zap,
  CheckCheck,
} from 'lucide-react';
import { chatAPI } from '../../api/tickets';
import { formatTime } from '../../utils/formatters';
import toast from '../../utils/toast';
import { connectSocket, onSocketEvent } from '../../services/socketService';
import { playNotificationChime } from '../../hooks/useForegroundNotifications';

// ── Pure helpers (zero re-renders) ──
function getDisplayName(conv) {
  if (!conv) return 'Guest';
  const first = conv.user?.firstName || '';
  if (first.startsWith('Guest') && conv.user?.email?.includes('guest-')) {
    const m = conv.user.email.match(/guest-(?:anon-)?[\d]+-(\w+)@/);
    return m ? `Guest ${m[1]}` : `Guest ${first.split(' ')[1] || ''}`;
  }
  return `${first} ${conv.user?.lastName || ''}`.trim() || 'Guest Customer';
}

function getInitials(name) {
  if (!name) return 'G';
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
  return (
    c.startsWith('csat:') ||
    c.startsWith('csat ') ||
    c === 'csat:good' ||
    c === 'csat:bad' ||
    c === 'csat:neutral' ||
    c.startsWith('{"type":"csat"}') ||
    c === 'system:chat_closed'
  );
}

function StatusBadge({ status }) {
  const map = {
    OPEN: { c: 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/40', l: 'Active' },
    IN_PROGRESS: { c: 'text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-950/40', l: 'In Progress' },
    WAITING_CUSTOMER: { c: 'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950/40', l: 'Waiting' },
    RESOLVED: { c: 'text-zinc-600 bg-zinc-100 border-zinc-200 dark:text-zinc-400 dark:bg-zinc-800', l: 'Resolved' },
    CLOSED: { c: 'text-zinc-500 bg-zinc-100 border-zinc-200 dark:text-zinc-500 dark:bg-zinc-900', l: 'Closed' },
  };
  const s = map[status] || map.OPEN;
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${s.c}`}>
      {s.l}
    </span>
  );
}

// ── Quick canned replies for fast admin workflow ──
const QUICK_REPLIES = [
  '👋 Hi! How can I help you today?',
  '🔍 Let me check your order details right away.',
  '📦 Your order is confirmed and will ship shortly.',
  '✅ We have resolved this for you. Anything else?',
  '🙏 Thank you for contacting THREVOLT support!',
];

// ── Memoized conversation list item ──
const ConversationItem = memo(function ConversationItem({
  conv,
  active,
  unread,
  typing,
  name,
  lastMsg,
  unreadCount,
  onSelect,
  onDelete,
}) {
  const bg = stringToColor(name);
  return (
    <div
      onClick={() => onSelect(conv)}
      className={`group relative flex items-center gap-3 px-4 py-3 cursor-pointer transition-all border-l-4 ${
        active
          ? 'bg-blue-50/80 dark:bg-zinc-800/80 border-blue-600'
          : 'bg-transparent hover:bg-slate-50 dark:hover:bg-zinc-800/40 border-transparent'
      }`}
    >
      <div className="relative flex-shrink-0">
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm"
          style={{ backgroundColor: bg }}
        >
          {getInitials(name)}
        </div>
        {unread && (
          <span className="absolute top-0 right-0 w-3 h-3 rounded-full bg-rose-500 ring-2 ring-white dark:ring-zinc-900 animate-pulse" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline mb-0.5">
          <span className={`text-sm truncate ${unread ? 'font-bold text-zinc-900 dark:text-white' : 'font-semibold text-zinc-800 dark:text-zinc-200'}`}>
            {name}
          </span>
          <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
            {unread && (
              <span className="min-w-[18px] h-[18px] rounded-full bg-rose-500 text-white text-[10px] font-extrabold flex items-center justify-center px-1">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
            <span className="text-[11px] text-zinc-400 font-medium">
              {conv.updatedAt ? formatTime(conv.updatedAt) : ''}
            </span>
          </div>
        </div>
        <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
          {typing ? (
            <span className="text-indigo-600 dark:text-indigo-400 italic font-medium animate-pulse">typing...</span>
          ) : (
            lastMsg?.substring(0, 50) || conv.subject || 'New conversation'
          )}
        </div>
      </div>

      <button
        onClick={(e) => onDelete(e, conv.id)}
        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all flex-shrink-0"
        title="Delete conversation"
      >
        <Trash2 size={14} />
      </button>
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

  // Responsive state for mobile view
  const [mobileView, setMobileView] = useState('list'); // 'list' | 'chat'

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const selectedChatRef = useRef(null);
  const conversationsRef = useRef([]);

  useEffect(() => { selectedChatRef.current = selectedChat; }, [selectedChat]);
  useEffect(() => { conversationsRef.current = conversations; }, [conversations]);

  const loadConversations = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const res = await chatAPI.getAdminConversations({ page: 1, limit: 50 });
      const items = res.data?.data?.items || res.data?.data || [];
      if (Array.isArray(items) && items.length > 0) {
        setConversations(items);
        const lm = {};
        items.forEach(c => {
          const vis = (c.ticketmessage || []).filter(m => !isHiddenMessage(m));
          if (vis.length > 0) lm[c.id] = vis[0].content;
        });
        setLastMessages(lm);
      } else if (showSpinner) {
        setConversations([]);
      }
    } catch (err) {
      console.warn('[ChatPanel] loadConversations failed:', err?.message);
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, []);

  const loadChatMode = useCallback(async () => {
    try {
      const res = await chatAPI.getChatStats();
      setChatMode(res.data?.data?.chatMode || 'ai');
    } catch {}
  }, []);

  const handleSwitchMode = async () => {
    const m = chatMode === 'ai' ? 'live' : 'ai';
    setModeLoading(true);
    try {
      await chatAPI.setChatMode(m);
      setChatMode(m);
      toast.success(`Global chat mode: ${m === 'ai' ? 'AI Assistant' : 'Live Agent'}`);
    } catch {
      toast.error('Failed to change mode');
    } finally {
      setModeLoading(false);
    }
  };

  const loadAutoReplySettings = useCallback(async () => {
    try {
      const res = await chatAPI.getAutoReplySettings();
      if (res.data?.data) setAutoReply(res.data.data);
    } catch {}
  }, []);

  const saveAutoReplySettings = async () => {
    setSavingAutoReply(true);
    try {
      await chatAPI.updateAutoReplySettings(autoReply);
      toast.success('Auto-reply settings updated');
      setShowAutoReplySettings(false);
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSavingAutoReply(false);
    }
  };

  const loadMessages = useCallback(async (id) => {
    setMessagesLoading(true);
    try {
      const res = await chatAPI.adminGetMessages(id);
      setMessages(res.data?.data?.messages || []);
    } catch {
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  const handleSelectChat = useCallback(async (conv) => {
    const socket = connectSocket();
    if (socket && selectedChatRef.current?.id && selectedChatRef.current.id !== conv.id) {
      socket.emit('chat:leave', selectedChatRef.current.id);
    }

    setSelectedChat(conv);
    setMobileView('chat');
    setUnreadCounts(p => { const n = { ...p }; delete n[conv.id]; return n; });

    if (socket && conv.id) {
      socket.emit('chat:join', conv.id);
    }
    await loadMessages(conv.id);
    setTimeout(() => inputRef.current?.focus(), 150);
  }, [loadMessages]);

  const handleDeleteChat = useCallback(async (e, convId) => {
    e.stopPropagation();
    if (!window.confirm('Delete this chat permanently?')) return;
    try {
      await chatAPI.adminDeleteChat(convId);
      toast.success('Chat deleted');
      if (selectedChat?.id === convId) {
        setSelectedChat(null);
        setMessages([]);
        setMobileView('list');
      }
      loadConversations();
    } catch {
      toast.error('Failed to delete chat');
    }
  }, [selectedChat?.id, loadConversations]);

  const handleSend = async (customText = null) => {
    const textToSend = typeof customText === 'string' ? customText : inputValue;
    if (!textToSend.trim() || !selectedChat) return;
    const content = textToSend.trim();
    setInputValue('');
    setSending(true);

    const tempId = `admin-temp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setMessages(p => [
      ...p,
      {
        id: tempId,
        content,
        isFromAdmin: true,
        senderId: 'admin',
        senderName: 'You',
        createdAt: new Date().toISOString(),
      },
    ]);

    try {
      const res = await chatAPI.adminSendMessage(selectedChat.id, content);
      const d = res.data?.data;
      if (d) {
        setMessages(p => p.map(m => (m.id === tempId ? { ...d, isFromAdmin: true } : m)));
        setLastMessages(prev => ({ ...prev, [selectedChat.id]: content }));
      } else {
        setMessages(p => p.filter(m => m.id !== tempId));
        setInputValue(content);
        toast.error('Failed to deliver message');
      }
    } catch {
      setMessages(p => p.filter(m => m.id !== tempId));
      setInputValue(content);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
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
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error('Upload failed'));
        };
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.send(fd);
      });
      setUploadProgress(100);
      setTimeout(() => {
        setImagePreview(null);
        setUploadProgress(0);
      }, 300);
      loadMessages(selectedChat.id);
    } catch {
      toast.error('Failed to upload image');
      setImagePreview(null);
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  const handleCancelPreview = () => {
    if (imagePreview?.url) URL.revokeObjectURL(imagePreview.url);
    setImagePreview(null);
    setUploadProgress(0);
  };

  const visibleMessages = useMemo(() => messages.filter(m => !isHiddenMessage(m)), [messages]);

  // ── Socket listener: bulletproof message routing & real-time updates ──
  useEffect(() => {
    const socket = connectSocket();
    if (!socket) return;

    const onConnect = () => {
      setSocketConnected(true);
      if (selectedChatRef.current?.id) {
        socket.emit('chat:join', selectedChatRef.current.id);
      }
    };
    const onDisconnect = () => setSocketConnected(false);

    const onChatMessage = (data) => {
      const cur = selectedChatRef.current;
      const incoming = data?.message;
      if (!incoming) return;

      // Play audio chime for incoming customer message
      if (!incoming.isFromAdmin) {
        playNotificationChime();
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([200, 100, 200]);
        }
      }

      // 1. Add to open chat with deduplication
      if (cur && data.ticketId === cur.id) {
        setMessages(p => {
          if (p.some(m => m.id === incoming.id)) return p;
          if (incoming.isFromAdmin && p.some(m => m.isFromAdmin && m.content === incoming.content)) return p;
          if (!incoming.isFromAdmin && p.some(m => !m.isFromAdmin && m.senderId === incoming.senderId && m.content === incoming.content && Math.abs(new Date(m.createdAt).getTime() - new Date(incoming.createdAt).getTime()) < 2000)) return p;
          return [...p, incoming];
        });
      }

      // 2. Unread count for outside open chat
      if (!incoming.isFromAdmin && (!cur || data.ticketId !== cur.id)) {
        setUnreadCounts(p => ({ ...p, [data.ticketId]: (p[data.ticketId] || 0) + 1 }));
      }

      // 3. Update preview and ensure conversation is present in sidebar list
      setLastMessages(prev => ({ ...prev, [data.ticketId]: incoming.content }));

      setConversations(prev => {
        const index = prev.findIndex(c => c.id === data.ticketId);
        if (index !== -1) {
          const updated = [...prev];
          const existing = updated[index];
          updated.splice(index, 1);
          return [{ ...existing, updatedAt: incoming.createdAt || new Date().toISOString() }, ...updated];
        }

        // New customer conversation: add immediately to sidebar!
        const newConv = {
          id: data.ticketId,
          ticketNumber: data.ticketNumber || `#${data.ticketId.slice(0, 8)}`,
          status: 'OPEN',
          subject: 'Live Chat Support',
          user: data.customer || {
            id: data.userId,
            firstName: incoming.senderName || 'Customer',
            lastName: '',
            email: '',
          },
          ticketmessage: [incoming],
          createdAt: incoming.createdAt || new Date().toISOString(),
          updatedAt: incoming.createdAt || new Date().toISOString(),
        };
        return [newConv, ...prev];
      });
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
    const unsubChatMessage = onSocketEvent('chat:message', onChatMessage);
    const unsubTyping = onSocketEvent('chat:typing', onTyping);
    if (socket.connected) onConnect();

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      unsubChatMessage();
      unsubTyping();
    };
  }, []);

  useEffect(() => {
    loadConversations();
    loadChatMode();
    loadAutoReplySettings();
  }, [loadConversations, loadChatMode, loadAutoReplySettings]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [visibleMessages.length]);

  // Clean stale typing indicators
  useEffect(() => {
    const i = setInterval(() => {
      setTypingUsers(p => {
        const now = Date.now();
        let changed = false;
        const n = { ...p };
        Object.entries(n).forEach(([k, v]) => {
          if (now - v.t > 3000) {
            delete n[k];
            changed = true;
          }
        });
        return changed ? n : p;
      });
    }, 1000);
    return () => clearInterval(i);
  }, []);

  const filtered = useMemo(() => {
    return conversations.filter(c => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        getDisplayName(c).toLowerCase().includes(q) ||
        (lastMessages[c.id] || '').toLowerCase().includes(q) ||
        (c.ticketNumber || '').toLowerCase().includes(q)
      );
    });
  }, [conversations, searchQuery, lastMessages]);

  const dName = selectedChat ? getDisplayName(selectedChat) : '';
  const aBg = selectedChat ? stringToColor(dName) : '#6366f1';

  return (
    <div className="flex h-[calc(100vh-140px)] min-h-[580px] bg-slate-100 dark:bg-zinc-950 rounded-2xl overflow-hidden border border-slate-200 dark:border-zinc-800 shadow-xl">
      {/* ── Left: Conversations Sidebar ── */}
      <div
        className={`${
          mobileView === 'chat' ? 'hidden md:flex' : 'flex'
        } w-full md:w-80 lg:w-96 bg-white dark:bg-zinc-900 border-r border-slate-200 dark:border-zinc-800 flex-col flex-shrink-0`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-100 dark:border-zinc-800/80">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white tracking-tight">Live Chat</h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    socketConnected ? 'bg-emerald-500 ring-2 ring-emerald-200 dark:ring-emerald-950' : 'bg-rose-500'
                  }`}
                />
                <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                  {socketConnected ? 'Real-time Connected' : 'Connecting...'}
                </span>
              </div>
            </div>
            <button
              onClick={() => loadConversations(true)}
              className="p-2 rounded-xl border border-slate-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition"
              title="Refresh conversations"
            >
              <RefreshCw size={15} />
            </button>
          </div>

          {/* Mode Switcher */}
          <div className="flex bg-slate-100 dark:bg-zinc-800/60 p-1 rounded-xl gap-1 mb-3">
            <button
              onClick={handleSwitchMode}
              disabled={modeLoading}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                chatMode === 'ai'
                  ? 'bg-white dark:bg-zinc-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400'
              }`}
            >
              <Bot size={14} /> AI Assistant
            </button>
            <button
              onClick={handleSwitchMode}
              disabled={modeLoading}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                chatMode === 'live'
                  ? 'bg-white dark:bg-zinc-700 text-emerald-600 dark:text-emerald-300 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400'
              }`}
            >
              <Headphones size={14} /> Live Agent
            </button>
          </div>

          {/* Auto-reply quick toggle button */}
          {chatMode === 'live' && (
            <div className="mb-3">
              <button
                onClick={() => setShowAutoReplySettings(!showAutoReplySettings)}
                className={`w-full px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center justify-between transition ${
                  autoReply.enabled
                    ? 'bg-emerald-50/60 border-emerald-200 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-400'
                    : 'bg-slate-50 border-slate-200 text-zinc-500 dark:bg-zinc-800 dark:border-zinc-700'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Zap size={13} className={autoReply.enabled ? 'text-emerald-500' : 'text-zinc-400'} />
                  Auto-reply {autoReply.enabled ? 'Enabled' : 'Disabled'}
                </span>
                <span className="text-[10px] text-zinc-400">{autoReply.timeout}s</span>
              </button>

              {showAutoReplySettings && (
                <div className="mt-2 p-3 bg-slate-50 dark:bg-zinc-800/80 rounded-xl border border-slate-200 dark:border-zinc-700 space-y-2.5">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-zinc-700 dark:text-zinc-200">
                    <input
                      type="checkbox"
                      checked={autoReply.enabled}
                      onChange={e => setAutoReply(p => ({ ...p, enabled: e.target.checked }))}
                      className="rounded accent-emerald-600"
                    />
                    Enable automated fallback reply
                  </label>
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 block mb-1">
                      Response timeout
                    </label>
                    <div className="grid grid-cols-4 gap-1">
                      {[60, 120, 180, 300].map(s => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setAutoReply(p => ({ ...p, timeout: s }))}
                          className={`py-1 text-[11px] font-bold rounded-lg border transition ${
                            autoReply.timeout === s
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 border-slate-200 dark:border-zinc-600'
                          }`}
                        >
                          {s < 60 ? `${s}s` : `${s / 60}m`}
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea
                    value={autoReply.message}
                    onChange={e => setAutoReply(p => ({ ...p, message: e.target.value }))}
                    rows={2}
                    className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 outline-none"
                    placeholder="Auto-reply message..."
                  />
                  <button
                    onClick={saveAutoReplySettings}
                    disabled={savingAutoReply}
                    className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition"
                  >
                    {savingAutoReply ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Search bar */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search chats by name or ID..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-100 dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 text-xs border border-transparent focus:border-blue-500 outline-none transition"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-zinc-800/60">
          {loading ? (
            <div className="p-8 text-center text-zinc-400">
              <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-zinc-300" />
              <span className="text-xs">Loading conversations...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-zinc-400">
              <MessageCircle size={36} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">
                {searchQuery ? 'No matching conversations' : 'No active chats'}
              </p>
              <p className="text-xs mt-1">Incoming customer messages will appear here in real-time.</p>
            </div>
          ) : (
            filtered.map(conv => (
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
            ))
          )}
        </div>
      </div>

      {/* ── Right: Active Chat Pane ── */}
      <div
        className={`${
          mobileView === 'list' ? 'hidden md:flex' : 'flex'
        } flex-1 flex-col bg-slate-50 dark:bg-zinc-950 overflow-hidden`}
      >
        {!selectedChat ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white dark:bg-zinc-900 shadow-sm border border-slate-200 dark:border-zinc-800 flex items-center justify-center mb-4 text-zinc-400">
              <MessageCircle size={32} />
            </div>
            <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200 mb-1">Select a Conversation</h3>
            <p className="text-xs text-zinc-500 max-w-sm">
              Choose a customer chat from the list on the left to review messages, assist customers, or send updates.
            </p>
          </div>
        ) : (
          <>
            {/* Chat Pane Header */}
            <div className="px-4 py-3 bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-3">
                {/* Mobile Back Button */}
                <button
                  onClick={() => setMobileView('list')}
                  className="md:hidden p-2 -ml-1 rounded-xl text-zinc-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
                  aria-label="Back to conversations"
                >
                  <ArrowLeft size={18} />
                </button>

                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm"
                  style={{ backgroundColor: aBg }}
                >
                  {getInitials(dName)}
                </div>

                <div>
                  <div className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                    {dName}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <StatusBadge status={selectedChat.status} />
                    <span className="text-[11px] text-zinc-400 font-medium">
                      Ticket #{selectedChat.ticketNumber || selectedChat.id?.slice(0, 8)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={async () => {
                    if (!window.confirm('Clear all messages in this ticket?')) return;
                    try {
                      await chatAPI.adminClearMessages(selectedChat.id);
                      setMessages([]);
                      toast.success('Messages cleared');
                    } catch {
                      toast.error('Failed to clear messages');
                    }
                  }}
                  title="Clear chat history"
                  className="p-2 rounded-xl text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition"
                >
                  <Eraser size={16} />
                </button>
                <button
                  onClick={async () => {
                    try {
                      await chatAPI.updateChatStatus(selectedChat.id, 'RESOLVED');
                      toast.success('Conversation resolved');
                      loadConversations();
                      setSelectedChat(null);
                      setMobileView('list');
                    } catch {
                      toast.error('Failed to resolve');
                    }
                  }}
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 dark:text-emerald-300 rounded-xl text-xs font-bold border border-emerald-200 dark:border-emerald-800 transition flex items-center gap-1.5"
                >
                  <CheckCircle size={14} /> Resolve
                </button>
                <button
                  onClick={() => {
                    setSelectedChat(null);
                    setMobileView('list');
                  }}
                  className="p-2 rounded-xl text-zinc-400 hover:text-zinc-600 hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 bg-slate-50/60 dark:bg-zinc-950">
              {messagesLoading ? (
                <div className="h-full flex items-center justify-center text-zinc-400">
                  <RefreshCw size={24} className="animate-spin" />
                </div>
              ) : (
                <>
                  <div className="text-center my-2">
                    <span className="px-3 py-1 bg-white/80 dark:bg-zinc-800/80 rounded-full text-[11px] font-medium text-zinc-500 shadow-xs border border-slate-200/60 dark:border-zinc-700/60">
                      {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                  </div>

                  {visibleMessages.map((msg, idx) => {
                    const isMe = msg.isFromAdmin;
                    const isAI = msg.senderId === 'ai-chatbot';
                    const prev = visibleMessages[idx - 1];
                    const next = visibleMessages[idx + 1];
                    const firstInGroup = !prev || prev.isFromAdmin !== msg.isFromAdmin;
                    const lastInGroup = !next || next.isFromAdmin !== msg.isFromAdmin;

                    return (
                      <div
                        key={`${msg.id || idx}`}
                        className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}
                      >
                        {!isMe && (
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 shadow-xs ${
                              lastInGroup ? 'opacity-100' : 'opacity-0'
                            }`}
                            style={{ backgroundColor: aBg }}
                          >
                            {getInitials(dName)}
                          </div>
                        )}

                        <div className="max-w-[80%] md:max-w-[70%]">
                          {isAI && firstInGroup && (
                            <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold mb-1 pl-1 flex items-center gap-1">
                              <Bot size={12} /> AI Assistant Reply
                            </div>
                          )}

                          <div
                            className={`p-3 rounded-2xl text-sm leading-relaxed break-words shadow-xs border ${
                              isMe
                                ? 'bg-blue-600 text-white border-blue-600 rounded-br-xs'
                                : 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border-slate-200 dark:border-zinc-800 rounded-bl-xs'
                            }`}
                          >
                            {(() => {
                              try {
                                const d = JSON.parse(msg.content);
                                if (d.type === 'image' && d.url) {
                                  return (
                                    <img
                                      src={d.url}
                                      alt="Attachment"
                                      className="max-w-full max-h-60 rounded-lg cursor-pointer hover:opacity-95"
                                      loading="lazy"
                                      onClick={() => window.open(d.url, '_blank')}
                                    />
                                  );
                                }
                                if (d.message) {
                                  return <div className="whitespace-pre-line">{d.message}</div>;
                                }
                              } catch {}
                              return <div className="whitespace-pre-line">{msg.content}</div>;
                            })()}
                          </div>

                          {lastInGroup && (
                            <div
                              className={`flex items-center gap-1 mt-1 text-[10px] font-medium text-zinc-400 ${
                                isMe ? 'justify-end' : 'justify-start pl-1'
                              }`}
                            >
                              <span>{formatTime(msg.createdAt)}</span>
                              {isMe && <CheckCheck size={13} className="text-blue-500" />}
                            </div>
                          )}
                        </div>

                        {isMe && <div className="w-1" />}
                      </div>
                    );
                  })}

                  {typingUsers[selectedChat.id] && (
                    <div className="flex items-end gap-2">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                        style={{ backgroundColor: aBg }}
                      >
                        {getInitials(dName)}
                      </div>
                      <div className="bg-white dark:bg-zinc-900 px-3 py-2 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" />
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.2s]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.4s]" />
                        <span className="text-[11px] text-zinc-400 ml-1">{dName} is typing...</span>
                      </div>
                    </div>
                  )}
                </>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Image Preview Overlay */}
            {imagePreview && (
              <div className="p-4 bg-slate-100 dark:bg-zinc-900 border-t border-slate-200 dark:border-zinc-800">
                <div className="relative inline-block max-w-full">
                  <img
                    src={imagePreview.url}
                    alt="Preview"
                    className="max-h-36 rounded-xl border border-slate-200 dark:border-zinc-700 shadow-sm"
                  />
                  {!uploading && (
                    <button
                      onClick={handleCancelPreview}
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-md hover:bg-rose-700 transition"
                    >
                      <X size={13} />
                    </button>
                  )}
                  {uploading && (
                    <div className="absolute inset-x-0 bottom-0 h-1 bg-blue-200 rounded-b-xl overflow-hidden">
                      <div
                        className="h-full bg-blue-600 transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  )}
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handleCancelPreview}
                    disabled={uploading}
                    className="px-4 py-1.5 rounded-xl border border-slate-300 dark:border-zinc-700 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-slate-200/50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendImage}
                    disabled={uploading}
                    className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
                  >
                    {uploading ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
                    {uploading ? `Uploading ${uploadProgress}%` : 'Send Image'}
                  </button>
                </div>
              </div>
            )}

            {/* Quick Canned Replies Bar */}
            {!imagePreview && (
              <div className="px-4 py-2 bg-white/90 dark:bg-zinc-900/90 border-t border-slate-200/80 dark:border-zinc-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1 flex-shrink-0 mr-1">
                  <Zap size={12} className="text-amber-500" /> Quick:
                </span>
                {QUICK_REPLIES.map((reply, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setInputValue(reply);
                      inputRef.current?.focus();
                    }}
                    className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-zinc-700 whitespace-nowrap transition border border-transparent hover:border-blue-200"
                  >
                    {reply}
                  </button>
                ))}
              </div>
            )}

            {/* Message Input Bar */}
            {!imagePreview && (
              <div className="p-3 md:p-4 bg-white dark:bg-zinc-900 border-t border-slate-200 dark:border-zinc-800">
                <div className="flex items-end gap-2 bg-slate-50 dark:bg-zinc-800/80 rounded-2xl p-2 border border-slate-200 dark:border-zinc-700/80 focus-within:border-blue-500 transition">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageSelect}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="p-2 text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-white rounded-xl hover:bg-white dark:hover:bg-zinc-700 transition"
                    title="Attach image"
                  >
                    <ImagePlus size={18} />
                  </button>

                  <textarea
                    ref={inputRef}
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your message to the customer (Enter to send)..."
                    rows={1}
                    className="flex-1 bg-transparent text-sm text-zinc-900 dark:text-white placeholder-zinc-400 resize-none outline-none py-1.5 px-2 max-h-32"
                  />

                  <button
                    type="button"
                    onClick={() => handleSend()}
                    disabled={!inputValue.trim() || sending}
                    className={`p-2.5 rounded-xl text-white transition shadow-sm ${
                      inputValue.trim() && !sending
                        ? 'bg-blue-600 hover:bg-blue-700 cursor-pointer shadow-blue-500/20'
                        : 'bg-zinc-300 dark:bg-zinc-700 cursor-not-allowed opacity-60'
                    }`}
                  >
                    {sending ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
