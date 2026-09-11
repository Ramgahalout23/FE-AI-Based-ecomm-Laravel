/**
 * ChatPanel — Luxury, High-Performance Admin Live Chat & Support Console.
 * Designed with UI/UX Pro Max standards:
 * - Fluid mobile-responsive layout (mobile view switching between list & chat)
 * - Zero window-level scrolling or overflow clipping (100dvh precision)
 * - Real-time O(1) socket room communication with audio chime alerts
 * - Unrestricted admin reply capability (human takeover in 1 click)
 * - Multi-criteria filter tabs: All, Active, Unread, Resolved
 * - Collapsible Customer Context drawer with user info and ticket metadata (slide-over on mobile)
 * - Canned quick response chips with icons
 * - THREVOLT Luxe design tokens (Ink, Gold, Surface, Royal Blue, Emerald)
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
  User,
  Clock,
  Tag,
  ShieldCheck,
  ChevronRight,
  Filter,
  Info,
  ExternalLink,
} from 'lucide-react';
import { chatAPI } from '../../api/tickets';
import { formatTime } from '../../utils/formatters';
import toast from '../../utils/toast';
import { connectSocket, onSocketEvent } from '../../services/socketService';
import { playNotificationChime } from '../../hooks/useForegroundNotifications';

// ── Helpers ──
function getDisplayName(conv) {
  if (!conv) return 'Guest Customer';
  const u = conv.user || conv.customer;
  const first = u?.firstName || u?.first_name || '';
  const last = u?.lastName || u?.last_name || '';

  if (first.startsWith('Guest') && u?.email?.includes('guest-')) {
    const m = u.email.match(/guest-(?:anon-)?[\d]+-(\w+)@/);
    return m ? `Guest #${m[1]}` : `Guest ${first.split(' ')[1] || ''}`;
  }
  const full = `${first} ${last}`.trim();
  return full || u?.email?.split('@')[0] || conv.subject || 'Guest Customer';
}

function getInitials(name) {
  if (!name) return 'G';
  const p = name.split(' ').filter(Boolean);
  return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : (p[0]?.[0] || 'G').toUpperCase();
}

function stringToColor(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  const palette = ['#2563EB', '#4F46E5', '#7C3AED', '#059669', '#0891B2', '#D97706', '#DC2626', '#1E293B'];
  return palette[Math.abs(h) % palette.length];
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

function StatusPill({ status }) {
  const styles = {
    OPEN: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    IN_PROGRESS: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    WAITING_CUSTOMER: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    RESOLVED: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20',
    CLOSED: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20',
  };
  const labels = {
    OPEN: 'Active',
    IN_PROGRESS: 'In Progress',
    WAITING_CUSTOMER: 'Waiting Customer',
    RESOLVED: 'Resolved',
    CLOSED: 'Closed',
  };
  const cls = styles[status] || styles.OPEN;
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] md:text-[11px] font-semibold border whitespace-nowrap ${cls}`}>
      {labels[status] || status || 'Active'}
    </span>
  );
}

const QUICK_REPLIES = [
  { icon: '👋', text: 'Hello! How may I assist you today?' },
  { icon: '🔍', text: 'Let me look up your order details right now.' },
  { icon: '📦', text: 'Your package is confirmed and preparing for dispatch.' },
  { icon: '🚚', text: 'Tracking shows delivery is scheduled in 2-3 business days.' },
  { icon: '🔄', text: 'We accept hassle-free returns within 7 days of delivery.' },
  { icon: '✅', text: 'I have marked this resolved for you. Have a great day!' },
];

// ── Memoized Conversation Card ──
const ConversationCard = memo(function ConversationCard({
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
  const avatarBg = stringToColor(name);
  const u = conv.user || conv.customer;
  const isGuest = u?.email?.includes('guest-') || !u?.lastName;

  return (
    <div
      onClick={() => onSelect(conv)}
      className={`group relative p-3 mx-2 my-1 rounded-xl cursor-pointer transition-all duration-150 border select-none ${
        active
          ? 'bg-zinc-900 text-white border-zinc-900 shadow-md dark:bg-zinc-800 dark:border-zinc-700'
          : 'bg-white hover:bg-slate-50 border-slate-200/80 text-zinc-900 dark:bg-zinc-900 dark:border-zinc-800 dark:hover:bg-zinc-800/60 dark:text-zinc-100'
      }`}
    >
      <div className="flex items-start gap-2.5">
        {/* Avatar with status indicator */}
        <div className="relative flex-shrink-0">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-xs"
            style={{ backgroundColor: active ? '#2563EB' : avatarBg }}
          >
            {getInitials(name)}
          </div>
          {unread && (
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-rose-500 ring-2 ring-white dark:ring-zinc-900 animate-pulse" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1 mb-0.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className={`text-sm truncate ${unread ? 'font-bold' : 'font-semibold'}`}>
                {name}
              </span>
              {isGuest && (
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.2 rounded flex-shrink-0 ${
                    active ? 'bg-zinc-800 text-zinc-300' : 'bg-slate-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                  }`}
                >
                  GUEST
                </span>
              )}
            </div>
            <span
              className={`text-[11px] flex-shrink-0 font-medium ${
                active ? 'text-zinc-300' : 'text-zinc-400'
              }`}
            >
              {conv.updatedAt ? formatTime(conv.updatedAt) : ''}
            </span>
          </div>

          <div
            className={`text-xs truncate ${
              active
                ? 'text-zinc-300'
                : unread
                ? 'font-semibold text-zinc-900 dark:text-white'
                : 'text-zinc-500 dark:text-zinc-400'
            }`}
          >
            {typing ? (
              <span className="text-blue-400 font-semibold italic animate-pulse">Customer is typing...</span>
            ) : (
              lastMsg || conv.subject || 'New conversation started'
            )}
          </div>

          <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100 dark:border-zinc-800/60">
            <span
              className={`text-[10px] font-mono ${
                active ? 'text-zinc-400' : 'text-zinc-400'
              }`}
            >
              #{conv.ticketNumber || conv.id?.slice(0, 8)}
            </span>

            <div className="flex items-center gap-1.5">
              {unread && unreadCount > 0 && (
                <span className="px-2 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-extrabold shadow-xs">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
              <StatusPill status={conv.status} />
            </div>
          </div>
        </div>

        {/* Delete action on desktop hover */}
        <button
          onClick={(e) => onDelete(e, conv.id)}
          className={`hidden sm:block opacity-0 group-hover:opacity-100 p-1 rounded-lg transition-all ${
            active
              ? 'hover:bg-zinc-800 text-zinc-400 hover:text-rose-400'
              : 'hover:bg-rose-50 text-zinc-400 hover:text-rose-600 dark:hover:bg-zinc-800'
          }`}
          title="Delete ticket"
        >
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
  const [filterTab, setFilterTab] = useState('ALL'); // 'ALL' | 'UNREAD' | 'ACTIVE' | 'RESOLVED'
  const [showCustomerDrawer, setShowCustomerDrawer] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [autoReply, setAutoReply] = useState({ enabled: true, timeout: 120, message: '' });
  const [showAutoReplyModal, setShowAutoReplyModal] = useState(false);
  const [savingAutoReply, setSavingAutoReply] = useState(false);
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
          if (vis.length > 0) lm[c.id] = vis[vis.length - 1].content;
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
      toast.success(`Global chat mode set to: ${m === 'ai' ? '🤖 AI Assistant' : '🎧 Live Agent'}`);
    } catch {
      toast.error('Failed to change chat mode');
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
      toast.success('Auto-reply configuration saved');
      setShowAutoReplyModal(false);
    } catch {
      toast.error('Failed to save auto-reply settings');
    } finally {
      setSavingAutoReply(false);
    }
  };

  const loadMessages = useCallback(async (id) => {
    setMessagesLoading(true);
    try {
      const res = await chatAPI.adminGetMessages(id);
      const data = res.data?.data;
      const msgs = data?.messages || (Array.isArray(data) ? data : []);
      setMessages(msgs);
      // If user profile is provided in response, enrich selectedChat
      if (data?.user && selectedChatRef.current?.id === id) {
        setSelectedChat(prev => (prev ? { ...prev, user: { ...prev.user, ...data.user } } : prev));
      }
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

    // On desktop, auto-focus input. On mobile, do not pop keyboard immediately so user can read first.
    if (typeof window !== 'undefined' && window.innerWidth >= 768) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [loadMessages]);

  const handleDeleteChat = useCallback(async (e, convId) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to permanently delete this chat ticket?')) return;
    try {
      await chatAPI.adminDeleteChat(convId);
      toast.success('Ticket deleted');
      if (selectedChat?.id === convId) {
        setSelectedChat(null);
        setMessages([]);
        setMobileView('list');
      }
      loadConversations(false);
    } catch {
      toast.error('Failed to delete ticket');
    }
  }, [selectedChat?.id, loadConversations]);

  const handleStatusChange = async (newStatus) => {
    if (!selectedChat) return;
    try {
      await chatAPI.updateChatStatus(selectedChat.id, newStatus);
      setSelectedChat(prev => (prev ? { ...prev, status: newStatus } : null));
      setConversations(prev =>
        prev.map(c => (c.id === selectedChat.id ? { ...c, status: newStatus } : c))
      );
      toast.success(`Ticket marked ${newStatus}`);
    } catch {
      toast.error('Failed to update status');
    }
  };

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
        // Ensure conversation displays as active/in-progress
        setConversations(prev =>
          prev.map(c => (c.id === selectedChat.id ? { ...c, status: 'IN_PROGRESS', updatedAt: new Date().toISOString() } : c))
        );
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
    try {
      await chatAPI.adminSendChatImage(selectedChat.id, imagePreview.file);
      setImagePreview(null);
      loadMessages(selectedChat.id);
    } catch {
      toast.error('Failed to upload image');
      setImagePreview(null);
    } finally {
      setUploading(false);
    }
  };

  const handleCancelPreview = () => {
    if (imagePreview?.url) URL.revokeObjectURL(imagePreview.url);
    setImagePreview(null);
  };

  const visibleMessages = useMemo(() => messages.filter(m => !isHiddenMessage(m)), [messages]);

  // ── Socket listener ──
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

      if (!incoming.isFromAdmin) {
        playNotificationChime();
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([200, 100, 200]);
        }
      }

      // Add to open conversation
      if (cur && data.ticketId === cur.id) {
        setMessages(p => {
          if (p.some(m => m.id === incoming.id)) return p;
          if (incoming.isFromAdmin && p.some(m => m.isFromAdmin && m.content === incoming.content)) return p;
          if (!incoming.isFromAdmin && p.some(m => !m.isFromAdmin && m.senderId === incoming.senderId && m.content === incoming.content && Math.abs(new Date(m.createdAt).getTime() - new Date(incoming.createdAt).getTime()) < 2000)) return p;
          return [...p, incoming];
        });
      }

      if (!incoming.isFromAdmin && (!cur || data.ticketId !== cur.id)) {
        setUnreadCounts(p => ({ ...p, [data.ticketId]: (p[data.ticketId] || 0) + 1 }));
      }

      setLastMessages(prev => ({ ...prev, [data.ticketId]: incoming.content }));

      setConversations(prev => {
        const index = prev.findIndex(c => c.id === data.ticketId);
        if (index !== -1) {
          const updated = [...prev];
          const existing = updated[index];
          updated.splice(index, 1);
          return [{ ...existing, status: existing.status === 'RESOLVED' ? 'OPEN' : existing.status, updatedAt: incoming.createdAt || new Date().toISOString() }, ...updated];
        }

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

  // Filtered conversations
  const filtered = useMemo(() => {
    return conversations.filter(c => {
      if (filterTab === 'UNREAD' && !(unreadCounts[c.id] > 0)) return false;
      if (filterTab === 'ACTIVE' && (c.status === 'RESOLVED' || c.status === 'CLOSED')) return false;
      if (filterTab === 'RESOLVED' && c.status !== 'RESOLVED' && c.status !== 'CLOSED') return false;

      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        getDisplayName(c).toLowerCase().includes(q) ||
        (c.user?.email || '').toLowerCase().includes(q) ||
        (lastMessages[c.id] || '').toLowerCase().includes(q) ||
        (c.ticketNumber || '').toLowerCase().includes(q)
      );
    });
  }, [conversations, filterTab, searchQuery, unreadCounts, lastMessages]);

  const totalUnreadCount = useMemo(() => {
    return Object.values(unreadCounts).reduce((a, b) => a + b, 0);
  }, [unreadCounts]);

  const activeCustomerName = selectedChat ? getDisplayName(selectedChat) : '';
  const activeCustomerBg = selectedChat ? stringToColor(activeCustomerName) : '#2563EB';

  return (
    <div className="flex flex-col h-[calc(100dvh-115px)] md:h-[calc(100dvh-170px)] max-h-[calc(100dvh-115px)] md:max-h-[920px] w-full bg-white dark:bg-zinc-900 rounded-xl md:rounded-2xl border border-slate-200/90 dark:border-zinc-800 shadow-xs overflow-hidden font-sans">
      {/* ── Top Header Navigation (Hidden on mobile when actively in a chat) ── */}
      <div
        className={`${
          mobileView === 'chat' ? 'hidden md:flex' : 'flex'
        } items-center justify-between px-3 md:px-5 py-2.5 md:py-3 border-b border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex-shrink-0`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-zinc-950 dark:bg-zinc-800 flex items-center justify-center text-white shadow-xs flex-shrink-0">
            <MessageCircle size={16} />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm md:text-base font-bold text-zinc-950 dark:text-white tracking-tight flex items-center gap-2 truncate">
              Support Console
              {totalUnreadCount > 0 && (
                <span className="px-2 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-extrabold animate-pulse">
                  {totalUnreadCount} unread
                </span>
              )}
            </h1>
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${socketConnected ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              <span className="truncate">{socketConnected ? 'Realtime' : 'Reconnecting...'}</span>
              <span>•</span>
              <span className="truncate">{conversations.length} chats</span>
            </div>
          </div>
        </div>

        {/* Global Chat Mode Toggle & Actions */}
        <div className="flex items-center gap-1.5 md:gap-3 flex-shrink-0">
          <div className="bg-slate-100 dark:bg-zinc-800 p-1 rounded-xl flex items-center gap-1">
            <button
              onClick={handleSwitchMode}
              disabled={modeLoading}
              className={`px-2.5 md:px-3 py-1 md:py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                chatMode === 'ai'
                  ? 'bg-white dark:bg-zinc-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400'
              }`}
            >
              <Bot size={13} /> <span className="hidden xs:inline">AI</span><span className="hidden sm:inline"> Assistant</span>
            </button>
            <button
              onClick={handleSwitchMode}
              disabled={modeLoading}
              className={`px-2.5 md:px-3 py-1 md:py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                chatMode === 'live'
                  ? 'bg-white dark:bg-zinc-700 text-emerald-600 dark:text-emerald-300 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400'
              }`}
            >
              <Headphones size={13} /> <span className="hidden xs:inline">Live</span><span className="hidden sm:inline"> Agent</span>
            </button>
          </div>

          <button
            onClick={() => setShowAutoReplyModal(true)}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800 transition"
          >
            <Zap size={13} className={autoReply.enabled ? 'text-amber-500' : 'text-zinc-400'} />
            Auto-Reply {autoReply.enabled ? 'ON' : 'OFF'}
          </button>

          <button
            onClick={() => loadConversations(true)}
            className="p-1.5 md:p-2 rounded-xl border border-slate-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition flex-shrink-0"
            title="Refresh conversations"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* ── Main Workspace ── */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* ── Left Sidebar (Conversations) ── */}
        <div
          className={`${
            mobileView === 'chat' ? 'hidden md:flex' : 'flex'
          } w-full md:w-80 lg:w-96 flex-col border-r border-slate-200/80 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/60 overflow-hidden flex-shrink-0`}
        >
          {/* Search Bar */}
          <div className="p-2.5 md:p-3 border-b border-slate-200/60 dark:border-zinc-800 flex-shrink-0">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search customer, ticket, email..."
                className="w-full pl-9 pr-8 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200/80 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 outline-none focus:border-blue-500 shadow-2xs transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-1 mt-2">
              {[
                { id: 'ALL', label: 'All' },
                { id: 'ACTIVE', label: 'Active' },
                { id: 'UNREAD', label: 'Unread' },
                { id: 'RESOLVED', label: 'Resolved' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setFilterTab(tab.id)}
                  className={`flex-1 py-1 rounded-lg text-[11px] font-bold transition ${
                    filterTab === tab.id
                      ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-2xs'
                      : 'text-zinc-500 hover:bg-slate-200/60 dark:text-zinc-400 dark:hover:bg-zinc-800'
                  }`}
                >
                  {tab.label}
                  {tab.id === 'UNREAD' && totalUnreadCount > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[9px]">
                      {totalUnreadCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto py-1 divide-y divide-slate-100/60 dark:divide-zinc-800/40">
            {loading ? (
              <div className="p-10 text-center text-zinc-400">
                <RefreshCw size={22} className="animate-spin mx-auto mb-2 text-blue-600" />
                <span className="text-xs font-medium">Syncing live conversations...</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-zinc-400">
                <MessageCircle size={32} className="mx-auto mb-2 opacity-25" />
                <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">No chats found</p>
                <p className="text-xs mt-1 text-zinc-500">
                  {searchQuery ? 'Try changing your search terms.' : 'Incoming customer messages will appear here.'}
                </p>
              </div>
            ) : (
              filtered.map(conv => (
                <ConversationCard
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

        {/* ── Right Chat Workspace ── */}
        <div
          className={`${
            mobileView === 'list' ? 'hidden md:flex' : 'flex'
          } flex-1 flex-col bg-white dark:bg-zinc-950 overflow-hidden min-w-0`}
        >
          {!selectedChat ? (
            /* Empty State (Desktop) */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/40 dark:bg-zinc-950">
              <div className="w-16 h-16 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-sm flex items-center justify-center mb-4 text-zinc-400">
                <MessageCircle size={32} className="text-blue-600" />
              </div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white mb-1">
                Select a conversation to reply
              </h2>
              <p className="text-xs text-zinc-500 max-w-sm mb-6">
                Pick an active customer conversation from the list to assist them, share order updates, or manage their support ticket.
              </p>
              <div className="grid grid-cols-2 gap-3 max-w-md w-full text-left">
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                  <div className="flex items-center gap-2 text-xs font-bold text-zinc-800 dark:text-zinc-200">
                    <Headphones size={15} className="text-emerald-500" /> Real-time Sync
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Direct websocket rooms ensure instantaneous delivery without page refreshing.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                  <div className="flex items-center gap-2 text-xs font-bold text-zinc-800 dark:text-zinc-200">
                    <Bot size={15} className="text-indigo-500" /> Hybrid AI Handoff
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Reply at any time — sending a message smoothly claims the chat as human agent.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="px-3 md:px-5 py-2.5 md:py-3 border-b border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <button
                    onClick={() => {
                      setMobileView('list');
                    }}
                    className="md:hidden p-2 -ml-1 rounded-xl text-zinc-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center justify-center flex-shrink-0"
                    title="Back to conversation list"
                  >
                    <ArrowLeft size={19} />
                  </button>

                  <div
                    className="w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-xs flex-shrink-0"
                    style={{ backgroundColor: activeCustomerBg }}
                  >
                    {getInitials(activeCustomerName)}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-sm font-bold text-zinc-950 dark:text-white truncate">
                        {activeCustomerName}
                      </span>
                      <StatusPill status={selectedChat.status} />
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 font-medium truncate">
                      <span>#{selectedChat.ticketNumber || selectedChat.id?.slice(0, 8)}</span>
                      <span>•</span>
                      <span className="truncate">{selectedChat.user?.email || 'Anonymous'}</span>
                    </div>
                  </div>
                </div>

                {/* Header Action Tools */}
                <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
                  <select
                    value={selectedChat.status}
                    onChange={e => handleStatusChange(e.target.value)}
                    className="text-[11px] md:text-xs font-semibold px-2 md:px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 outline-none cursor-pointer max-w-[105px] md:max-w-none"
                  >
                    <option value="OPEN">Active</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="WAITING_CUSTOMER">Waiting</option>
                    <option value="RESOLVED">Resolved</option>
                    <option value="CLOSED">Closed</option>
                  </select>

                  <button
                    onClick={() => setShowCustomerDrawer(!showCustomerDrawer)}
                    className={`p-1.5 md:p-2 rounded-xl border transition ${
                      showCustomerDrawer
                        ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-zinc-800 dark:border-zinc-600'
                        : 'border-slate-200 dark:border-zinc-700 text-zinc-500 hover:bg-slate-50 dark:hover:bg-zinc-800'
                    }`}
                    title="Customer details"
                  >
                    <Info size={16} />
                  </button>

                  <button
                    onClick={async () => {
                      if (!window.confirm('Clear all messages from this ticket?')) return;
                      try {
                        await chatAPI.adminClearMessages(selectedChat.id);
                        setMessages([]);
                        toast.success('Messages cleared');
                      } catch {
                        toast.error('Failed to clear messages');
                      }
                    }}
                    className="hidden sm:flex p-2 rounded-xl border border-slate-200 dark:border-zinc-700 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition"
                    title="Clear chat thread"
                  >
                    <Eraser size={16} />
                  </button>

                  <button
                    onClick={async () => {
                      try {
                        await chatAPI.updateChatStatus(selectedChat.id, 'RESOLVED');
                        toast.success('Conversation resolved');
                        loadConversations(false);
                        setSelectedChat(null);
                        setMobileView('list');
                      } catch {
                        toast.error('Failed to resolve');
                      }
                    }}
                    className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition"
                  >
                    <CheckCircle size={14} /> Resolve
                  </button>

                  <button
                    onClick={() => {
                      setSelectedChat(null);
                      setMobileView('list');
                    }}
                    className="p-1.5 md:p-2 rounded-xl text-zinc-400 hover:text-zinc-600 hover:bg-slate-100 dark:hover:bg-zinc-800"
                    title="Close conversation"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Chat Thread + Drawer Area */}
              <div className="flex flex-1 overflow-hidden relative">
                {/* Message Stream */}
                <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/50 dark:bg-zinc-950 min-w-0">
                  <div className="flex-1 overflow-y-auto p-3 md:p-6 space-y-3">
                    {messagesLoading ? (
                      <div className="h-full flex items-center justify-center text-zinc-400">
                        <RefreshCw size={24} className="animate-spin text-blue-600" />
                      </div>
                    ) : (
                      <>
                        <div className="text-center my-1">
                          <span className="px-3 py-0.5 rounded-full bg-white dark:bg-zinc-800 text-[10px] md:text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 border border-slate-200/80 dark:border-zinc-700 shadow-2xs">
                            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                          </span>
                        </div>

                        {visibleMessages.map((msg, idx) => {
                          const isAI = msg.senderId === 'ai-chatbot' || msg.senderName === 'AI Assistant';
                          const isMe = msg.isFromAdmin && !isAI;

                          return (
                            <div
                              key={`${msg.id || idx}`}
                              className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}
                            >
                              {!isMe && (
                                <div
                                  className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 shadow-2xs"
                                  style={{ backgroundColor: activeCustomerBg }}
                                >
                                  {getInitials(activeCustomerName)}
                                </div>
                              )}

                              <div className="max-w-[88%] md:max-w-[72%]">
                                {isAI && (
                                  <div className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 mb-1 pl-1 flex items-center gap-1">
                                    <Bot size={13} /> AI Bot Assistant
                                  </div>
                                )}

                                <div
                                  className={`p-3 md:p-3.5 rounded-2xl text-[13px] md:text-[13.5px] leading-relaxed break-words shadow-2xs border ${
                                    isMe
                                      ? 'bg-zinc-950 text-white border-zinc-950 dark:bg-blue-600 dark:border-blue-600 rounded-br-xs'
                                      : isAI
                                      ? 'bg-indigo-50/90 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-100 border-indigo-200/70 dark:border-indigo-800 rounded-bl-xs'
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
                                            className="max-w-full max-h-56 rounded-xl cursor-pointer hover:opacity-95 object-contain"
                                            loading="lazy"
                                            onClick={() => window.open(d.url, '_blank')}
                                          />
                                        );
                                      }
                                      if (d.message) {
                                        return (
                                          <div className="space-y-2">
                                            <div className="whitespace-pre-line">{d.message}</div>
                                            {Array.isArray(d.products) && d.products.length > 0 && (
                                              <div className="flex flex-wrap gap-2 pt-1 border-t border-indigo-200/50 dark:border-indigo-800/50">
                                                {d.products.slice(0, 3).map((p, pIdx) => (
                                                  <div key={pIdx} className="text-[11px] font-medium bg-white/80 dark:bg-zinc-800 px-2 py-1 rounded-lg border border-indigo-200/60 dark:border-zinc-700 flex items-center gap-1.5">
                                                    <span>🛍️</span>
                                                    <span className="truncate max-w-[140px]">{p.name || p.title}</span>
                                                    {p.price && <span className="font-bold text-emerald-600">₹{p.price}</span>}
                                                  </div>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      }
                                    } catch {}
                                    return <div className="whitespace-pre-line">{msg.content}</div>;
                                  })()}
                                </div>

                                <div
                                  className={`flex items-center gap-1 mt-1 text-[10px] font-medium text-zinc-400 ${
                                    isMe ? 'justify-end pr-1' : 'justify-start pl-1'
                                  }`}
                                >
                                  <span>{formatTime(msg.createdAt)}</span>
                                  {isMe && <CheckCheck size={13} className="text-blue-500" />}
                                </div>
                              </div>

                              {isMe && <div className="w-0.5" />}
                            </div>
                          );
                        })}

                        {typingUsers[selectedChat.id] && (
                          <div className="flex items-end gap-2">
                            <div
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 shadow-2xs"
                              style={{ backgroundColor: activeCustomerBg }}
                            >
                              {getInitials(activeCustomerName)}
                            </div>
                            <div className="bg-white dark:bg-zinc-900 px-3 py-2 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-2xs flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce" />
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce [animation-delay:0.2s]" />
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce [animation-delay:0.4s]" />
                              <span className="text-xs font-semibold text-zinc-500 ml-1">
                                {activeCustomerName} is typing...
                              </span>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Image Attachment Preview Bar */}
                  {imagePreview && (
                    <div className="p-3 bg-slate-100 dark:bg-zinc-900 border-t border-slate-200 dark:border-zinc-800 flex-shrink-0">
                      <div className="relative inline-block">
                        <img
                          src={imagePreview.url}
                          alt="Preview"
                          className="max-h-24 md:max-h-28 rounded-xl border border-slate-300 dark:border-zinc-700 shadow-xs"
                        />
                        {!uploading && (
                          <button
                            onClick={handleCancelPreview}
                            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-md hover:bg-rose-700"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={handleCancelPreview}
                          disabled={uploading}
                          className="px-3 py-1 rounded-lg border border-slate-300 dark:border-zinc-700 text-xs font-semibold text-zinc-600 dark:text-zinc-300"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSendImage}
                          disabled={uploading}
                          className="px-3.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5"
                        >
                          {uploading ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
                          {uploading ? 'Uploading...' : 'Send Attachment'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Canned Responses Toolbar */}
                  {!imagePreview && (
                    <div className="px-3 md:px-4 py-1.5 md:py-2 bg-white dark:bg-zinc-900 border-t border-slate-200/80 dark:border-zinc-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-shrink-0">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1 flex-shrink-0 mr-1">
                        <Zap size={11} className="text-amber-500" /> Quick:
                      </span>
                      {QUICK_REPLIES.map((reply, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            setInputValue(reply.text);
                            if (typeof window !== 'undefined' && window.innerWidth >= 768) {
                              inputRef.current?.focus();
                            }
                          }}
                          className="text-[11px] md:text-xs px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-300 border border-transparent whitespace-nowrap transition-all font-medium flex-shrink-0"
                        >
                          <span className="mr-1">{reply.icon}</span> {reply.text}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Message Input Box (Sticky at bottom) */}
                  {!imagePreview && (
                    <div className="p-2.5 md:p-3 bg-white dark:bg-zinc-900 border-t border-slate-200/80 dark:border-zinc-800 flex-shrink-0">
                      <div className="flex items-end gap-1.5 md:gap-2 bg-slate-50 dark:bg-zinc-800/80 rounded-2xl p-1.5 md:p-2 border border-slate-200 dark:border-zinc-700 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/10 transition">
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
                          className="p-2 text-zinc-400 hover:text-zinc-800 dark:hover:text-white rounded-xl transition flex-shrink-0"
                          title="Attach image or screenshot"
                        >
                          <ImagePlus size={18} />
                        </button>

                        <textarea
                          ref={inputRef}
                          value={inputValue}
                          onChange={e => setInputValue(e.target.value)}
                          onKeyDown={handleKeyDown}
                          placeholder="Type your response to the customer..."
                          rows={1}
                          className="flex-1 bg-transparent text-[13px] md:text-[13.5px] text-zinc-900 dark:text-white placeholder-zinc-400 resize-none outline-none py-1.5 px-2 max-h-32 leading-relaxed"
                        />

                        <button
                          type="button"
                          onClick={() => handleSend()}
                          disabled={!inputValue.trim() || sending}
                          className={`p-2.5 rounded-xl text-white transition shadow-xs flex-shrink-0 ${
                            inputValue.trim() && !sending
                              ? 'bg-blue-600 hover:bg-blue-700 cursor-pointer shadow-blue-500/25'
                              : 'bg-zinc-300 dark:bg-zinc-700 cursor-not-allowed opacity-60'
                          }`}
                        >
                          {sending ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Customer Details Drawer (Slide-over on mobile, docked right pane on desktop) ── */}
                {showCustomerDrawer && (
                  <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs md:relative md:inset-auto md:bg-transparent md:z-auto">
                    <div className="w-[85vw] max-w-sm md:w-72 h-full border-l border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 md:p-5 overflow-y-auto flex-shrink-0 shadow-2xl md:shadow-none animate-in slide-in-from-right duration-200">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                        <h3 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                          <Info size={14} className="text-blue-500" /> Customer Details
                        </h3>
                        <button
                          onClick={() => setShowCustomerDrawer(false)}
                          className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                        >
                          <X size={16} />
                        </button>
                      </div>

                      <div className="space-y-4 mt-4">
                        <div>
                          <div className="text-[11px] font-semibold text-zinc-400 mb-1">Customer</div>
                          <div className="text-sm font-bold text-zinc-900 dark:text-white">
                            {activeCustomerName}
                          </div>
                          <div className="text-xs text-zinc-500 truncate">
                            {selectedChat.user?.email || 'No email attached'}
                          </div>
                        </div>

                        <div>
                          <div className="text-[11px] font-semibold text-zinc-400 mb-1">Ticket Reference</div>
                          <div className="text-xs font-mono font-bold text-zinc-800 dark:text-zinc-200">
                            #{selectedChat.ticketNumber || selectedChat.id}
                          </div>
                          <div className="text-[11px] text-zinc-500 mt-0.5">
                            Started {formatTime(selectedChat.createdAt)}
                          </div>
                        </div>

                        <div>
                          <div className="text-[11px] font-semibold text-zinc-400 mb-1">Account Role</div>
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-300">
                            <ShieldCheck size={12} className="text-blue-500" />
                            {selectedChat.user?.role || 'CUSTOMER'}
                          </div>
                        </div>

                        <div>
                          <div className="text-[11px] font-semibold text-zinc-400 mb-1">Status</div>
                          <StatusPill status={selectedChat.status} />
                        </div>

                        <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 space-y-2">
                          <button
                            onClick={async () => {
                              try {
                                await chatAPI.updateChatStatus(selectedChat.id, 'RESOLVED');
                                toast.success('Conversation resolved');
                                loadConversations(false);
                                setSelectedChat(null);
                                setMobileView('list');
                                setShowCustomerDrawer(false);
                              } catch {
                                toast.error('Failed to resolve');
                              }
                            }}
                            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs"
                          >
                            <CheckCircle size={14} /> Close & Resolve Ticket
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Auto-Reply Settings Modal ── */}
      {showAutoReplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-zinc-950 dark:text-white flex items-center gap-2">
                <Zap size={18} className="text-amber-500" /> Live Chat Auto-Reply
              </h3>
              <button
                onClick={() => setShowAutoReplyModal(false)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-zinc-500 mb-4">
              When live mode is active, automatically send a polite reassurance to customers if an admin does not respond within the timeout period.
            </p>

            <div className="space-y-4">
              <label className="flex items-center gap-2.5 cursor-pointer text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                <input
                  type="checkbox"
                  checked={autoReply.enabled}
                  onChange={e => setAutoReply(p => ({ ...p, enabled: e.target.checked }))}
                  className="rounded accent-blue-600 w-4 h-4"
                />
                Enable automated fallback reply
              </label>

              <div>
                <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300 block mb-1.5">
                  Timeout before auto-reply triggers
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[60, 120, 180, 300].map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setAutoReply(p => ({ ...p, timeout: s }))}
                      className={`py-2 text-xs font-bold rounded-xl border transition ${
                        autoReply.timeout === s
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-slate-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-slate-200 dark:border-zinc-700'
                      }`}
                    >
                      {s < 60 ? `${s}s` : `${s / 60} min`}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300 block mb-1.5">
                  Message content
                </label>
                <textarea
                  value={autoReply.message}
                  onChange={e => setAutoReply(p => ({ ...p, message: e.target.value }))}
                  rows={3}
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none focus:border-blue-500"
                  placeholder="Thank you for your patience! Our support team is currently busy..."
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAutoReplyModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 text-xs font-bold text-zinc-600 dark:text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveAutoReplySettings}
                  disabled={savingAutoReply}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition"
                >
                  {savingAutoReply ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
