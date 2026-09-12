/**
 * LiveChatWidget
 * Floating chat widget that appears at the bottom-right of the storefront.
 * Uses existing support ticket system for persistence and Socket.io for real-time messaging.
 */

import { X, Send, RefreshCw, Minus, MessageCircle, AlertCircle, Bot, Headphones, ImagePlus, Bell, BellRing, Smile, Volume2, VolumeX, ShieldCheck } from 'lucide-react';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { formatTime, getImageUrl } from '../../utils/formatters';
import useChat from '../../hooks/useChat';
import usePushNotifications from '../../hooks/usePushNotifications';
import { playNotificationChime } from '../../hooks/useForegroundNotifications';
import toast from '../../utils/toast';
import EmojiPickerPopover from './EmojiPickerPopover';
import MessageText from './MessageText';
import ReadTicks from './ReadTicks';
import ImageLightbox from './ImageLightbox';
import OrderTrackingCard from './OrderTrackingCard';

// ─── Helpers ──────────────────────────────────────────────

function groupMessagesByDate(messages) {
  const groups = {};
  messages.forEach((msg) => {
    const date = new Date(msg.createdAt || Date.now()).toLocaleDateString();
    if (!groups[date]) groups[date] = [];
    groups[date].push(msg);
  });
  return groups;
}

function getDateLabel(dateStr) {
  const today = new Date().toLocaleDateString();
  const yesterday = new Date(Date.now() - 86400000).toLocaleDateString();
  if (dateStr === today) return 'Today';
  if (dateStr === yesterday) return 'Yesterday';
  return dateStr;
}

function isOnlyEmoji(text) {
  if (!text || typeof text !== 'string') return false;
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > 12) return false;
  const emojiRegex = /^(\p{Extended_Pictographic}|\p{Emoji_Presentation}|\p{Emoji_Modifier_Base}|\u200d|\ufe0f|\s)+$/u;
  return emojiRegex.test(trimmed);
}

// ─── Main Component ───────────────────────────────────────

/** One-character initials for the agent avatar stack. */
function initialsOf(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'S';
  return (parts.length >= 2 ? parts[0][0] + parts[1][0] : parts[0][0]).toUpperCase();
}

export default function LiveChatWidget() {
  const {
    chat, messages, markAllRead, error, isTyping, isAiTyping, typingName, chatMode,
    initChat, newConversation, sendMessage,
    addMessage, replaceMessage, removeMessage,
  } = useChat();

  const { supported: pushSupported, permission: pushPermission, isSubscribed: pushSubscribed, subscribe: subscribePush } = usePushNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [isReelActive, setIsReelActive] = useState(false);
  const [isMobileMenuActive, setIsMobileMenuActive] = useState(false);
  const [isCartDrawerActive, setIsCartDrawerActive] = useState(false);
  const [suggestions, setSuggestions] = useState([]);

  const [proactiveNudge, setProactiveNudge] = useState(false);
  const [proactiveDismissed, setProactiveDismissed] = useState(false);
  // Professional visibility: button fades in after delay, auto-hides nudge
  const [buttonVisible, setButtonVisible] = useState(false);
  const [nudgeVisible, setNudgeVisible] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [imagePreview, setImagePreview] = useState(null); // { file, url, name }
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  // Chat sounds are nice once and unbearable on the tenth ping — remembered per device.
  const [soundOn, setSoundOn] = useState(() => {
    try {
      return localStorage.getItem('chatSound') !== 'off';
    } catch {
      return true;
    }
  });
  const [lightbox, setLightbox] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimerRef = useRef(null);
  const lastMessageCountRef = useRef(0);
  const unreadCountRef = useRef(0);

  /**
   * Private agent notes never reach this component — the API filters them out and
   * the socket keeps them out of the ticket room. Filtering again here is a cheap
   * belt-and-braces guard: a note leaking to a customer is the one bug in this
   * feature that cannot be undone, and ruling it out costs one array pass.
   */
  const visibleMessages = useMemo(() => messages.filter((m) => !m.isInternal), [messages]);

  /**
   * Who the customer is actually talking to. Derived from real replies rather than
   * invented avatars: until an agent has written, the only identity we can honestly
   * show is the AI assistant (or the support desk in live mode).
   */
  const agentName = useMemo(() => {
    for (let i = visibleMessages.length - 1; i >= 0; i -= 1) {
      const m = visibleMessages[i];
      if (m.isFromAdmin && m.senderId !== 'ai-chatbot' && m.senderName) return m.senderName;
    }
    return null;
  }, [visibleMessages]);

  const hasHumanAgent = !!agentName;
  const isLiveMode = chatMode === 'live';

  const toggleSound = useCallback(() => {
    setSoundOn((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('chatSound', next ? 'on' : 'off');
      } catch {
        /* storage unavailable (private mode) — the toggle still works this session */
      }
      if (next) playNotificationChime();
      return next;
    });
  }, []);

  // Reading the agent's replies is what generates their ✓✓ — report it whenever the
  // thread is on screen with unread agent messages, and again when the tab returns.
  useEffect(() => {
    if (!isOpen) return undefined;
    markAllRead();
    const onVisible = () => {
      if (!document.hidden) markAllRead();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [isOpen, messages, markAllRead]);

  // Auto-scroll to bottom on new messages (safe for mobile keyboard)
  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      requestAnimationFrame(() => {
        try {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } catch {
          /* ignore scroll errors */
        }
      });
    }
  }, [messages, isOpen]);

  // Listen for open-live-chat custom events, SW notification clicks, and ?openChat=true URL param
  useEffect(() => {
    const triggerOpen = () => {
      setIsOpen(true);
      setHasUnread(false);
      unreadCountRef.current = 0;
      setProactiveNudge(false);
      setNudgeVisible(false);
    };

    // 1. Auto-open if launched from notification click URL (e.g. /?openChat=true or #chat)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('openChat') === 'true' || window.location.hash === '#chat') {
        triggerOpen();
      }
    }

    // 2. DOM CustomEvent from foreground toast clicks
    window.addEventListener('open-live-chat', triggerOpen);

    // 3. Service Worker message from notificationclick on mobile lockscreen / desktop
    const handleSWMessage = (event) => {
      if (event.data?.type === 'OPEN_LIVE_CHAT') {
        triggerOpen();
      }
    };
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSWMessage);
    }

    return () => {
      window.removeEventListener('open-live-chat', triggerOpen);
      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSWMessage);
      }
    };
  }, []);

  // Reactive auto-initialization: Whenever widget opens and chat is not yet loaded, load it immediately
  useEffect(() => {
    if (isOpen && !chat && !chatLoading) {
      setChatLoading(true);
      initChat().finally(() => setChatLoading(false));
    }
  }, [isOpen, chat, chatLoading, initChat]);

  // Track unread messages when widget is minimized — count + sound + vibration
  useEffect(() => {
    const prevCount = lastMessageCountRef.current;
    const newCount = messages.length;
    if (newCount > prevCount) {
      const newUnread = newCount - prevCount;
      // Only notify for messages NOT from the current user (admin/AI replies)
      const lastMsg = messages[messages.length - 1];
      if (lastMsg && (lastMsg.isFromAdmin || lastMsg.senderId === 'ai-chatbot')) {
        if (!isOpen) {
          unreadCountRef.current += newUnread;
          setHasUnread(true);
          if (soundOn) playNotificationChime();
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate([200, 100, 200]);
          }
        }
      }
    }
    lastMessageCountRef.current = newCount;
  }, [messages, isOpen, soundOn]);

  // Hide the chat icon while the fullscreen reel player is open
  useEffect(() => {
    const checkReel = () => {
      const active = document.body.getAttribute('data-reel-player') === 'active';
      setIsReelActive(active);
      if (active) setIsOpen(false);
    };
    checkReel();
    const observer = new MutationObserver(checkReel);
    observer.observe(document.body, { attributes: true, attributeFilter: ['data-reel-player'] });
    return () => observer.disconnect();
  }, []);

  // Hide the chat icon while the mobile menu drawer is open
  useEffect(() => {
    const checkMenu = () => {
      const active = document.body.getAttribute('data-mobile-menu') === 'open';
      setIsMobileMenuActive(active);
      if (active) setIsOpen(false);
    };
    checkMenu();
    const observer = new MutationObserver(checkMenu);
    observer.observe(document.body, { attributes: true, attributeFilter: ['data-mobile-menu'] });
    return () => observer.disconnect();
  }, []);

  // Hide the chat icon while the cart drawer is open
  useEffect(() => {
    const checkCart = () => {
      const active = document.body.getAttribute('data-cart-drawer') === 'open';
      setIsCartDrawerActive(active);
      if (active) setIsOpen(false);
    };
    checkCart();
    const observer = new MutationObserver(checkCart);
    observer.observe(document.body, { attributes: true, attributeFilter: ['data-cart-drawer'] });
    return () => observer.disconnect();
  }, []);

  // ── Smart Visibility: Delay button, then show nudge smartly ──

  const location = useLocation();
  const isHomepage = location.pathname === '/';

  // Show chat button: immediately on homepage, 8s delay on other pages
  useEffect(() => {
    const delay = isHomepage ? 1000 : 8000;
    const timer = setTimeout(() => setButtonVisible(true), delay);
    return () => clearTimeout(timer);
  }, [isHomepage]);

  // Show nudge 5 seconds AFTER button appears (so user notices button first)
  useEffect(() => {
    if (!buttonVisible || isOpen || proactiveDismissed) return;
    const timer = setTimeout(() => {
      setNudgeVisible(true);
      setProactiveNudge(true);
    }, 5000);
    return () => clearTimeout(timer);
  }, [buttonVisible, isOpen, proactiveDismissed, isHomepage]);

  // Auto-hide nudge after 8 seconds if not clicked
  useEffect(() => {
    if (!nudgeVisible || isOpen) return;
    const timer = setTimeout(() => {
      setNudgeVisible(false);
      setProactiveNudge(false);
    }, 8000);
    return () => clearTimeout(timer);
  }, [nudgeVisible, isOpen]);

  // Exit intent: show nudge only if button is visible and not dismissed
  useEffect(() => {
    if (!buttonVisible || isOpen || proactiveDismissed) return;
    const handleMouseLeave = (e) => {
      if (e.clientY < 0) {
        setProactiveNudge(true);
        setNudgeVisible(true);
      }
    };
    document.addEventListener('mouseleave', handleMouseLeave);
    return () => document.removeEventListener('mouseleave', handleMouseLeave);
  }, [buttonVisible, isOpen, proactiveDismissed]);



  // Handle image file selection — show preview
  const handleImageSelect = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); if (fileInputRef.current) fileInputRef.current.value = ''; return; }
    const url = URL.createObjectURL(file);
    setImagePreview({ file, url, name: file.name });
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  // Send image with progress
  const handleSendImage = useCallback(async () => {
    if (!imagePreview || !chat?.id) return;
    setUploading(true);
    setUploadProgress(0);
    const sessionId = localStorage.getItem('chatSessionId');
    try {
      await new Promise((resolve, reject) => {
        const fd = new FormData();
        fd.append('file', imagePreview.file);
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/v1/chat/${chat.id}/upload-image`);
        if (sessionId) xhr.setRequestHeader('X-Session-ID', sessionId);
        xhr.upload.onprogress = (e) => { if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100)); };
        xhr.onload = () => { if (xhr.status >= 200 && xhr.status < 300) resolve(); else reject(new Error('Upload failed')); };
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.send(fd);
      });
      setUploadProgress(100);
      setTimeout(() => { setImagePreview(null); setUploadProgress(0); }, 300);
    } catch { toast.error('Failed to upload image'); setImagePreview(null); setUploadProgress(0); }
    finally { setUploading(false); }
  }, [imagePreview, chat?.id]);

  const handleCancelPreview = useCallback(() => {
    if (imagePreview?.url) URL.revokeObjectURL(imagePreview.url);
    setImagePreview(null);
    setUploadProgress(0);
  }, [imagePreview]);

  // Initialize chat when opened — opens instantly, loads in background
  const handleOpen = useCallback(async () => {
    setIsOpen(true);
    setHasUnread(false);
    unreadCountRef.current = 0;
    setProactiveNudge(false);
    setNudgeVisible(false);

    // If chat already exists, just open — no loading needed
    if (chat) return;

    // Fire init in background — window is already open
    setChatLoading(true);
    initChat().finally(() => setChatLoading(false));
  }, [chat, initChat]);

  // Insert emoji at cursor position
  const handleInsertEmoji = useCallback((emoji) => {
    const textarea = inputRef.current;
    if (!textarea) {
      setInputValue((prev) => prev + emoji);
      return;
    }
    const start = textarea.selectionStart ?? inputValue.length;
    const end = textarea.selectionEnd ?? inputValue.length;
    const updated = inputValue.substring(0, start) + emoji + inputValue.substring(end);
    setInputValue(updated);
    setTimeout(() => {
      textarea.focus();
      const newPos = start + emoji.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  }, [inputValue]);

  // Send a message — refs handle chatId, so deps are minimal
  const handleSend = useCallback(async (text) => {
    const msg = text || inputValue.trim();
    if (!msg) return;

    setInputValue('');
    setSuggestions([]);
    setShowEmojiPicker(false);

    // Optimistic: show message instantly
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    addMessage({
      id: tempId,
      content: msg,
      isFromAdmin: false,
      senderId: 'guest',
      createdAt: new Date().toISOString(),
    });

    try {
      const result = await sendMessage(msg);

      if (result) {
        replaceMessage(tempId, result);
      } else {
        removeMessage(tempId);
        const ticket = await initChat();
        if (ticket?.id) {
          const retry = await sendMessage(msg);
          if (retry) addMessage(retry);
          else toast.error('Failed to send message');
        } else {
          toast.error('Failed to connect to chat');
        }
      }
    } catch (err) {
      console.error('[Chat] handleSend error:', err);
      removeMessage(tempId);
      toast.error('Failed to send message');
    }
  }, [inputValue, sendMessage, initChat, addMessage, replaceMessage, removeMessage]);

  // Parse AI structured response from message content
  const parseAiMessage = (msg) => {
    // Handle image messages
    try {
      const data = JSON.parse(msg.content);
      if (data.type === 'image' && data.url) {
        return { text: '', suggestions: [], products: [], order: null, imageUrl: data.url };
      }
    } catch {
      /* not JSON image */
    }
    // Handle AI structured messages
    if (msg.senderId !== 'ai-chatbot') return { text: msg.content, suggestions: [], products: [], order: null, imageUrl: null };
    try {
      const data = JSON.parse(msg.content);
      return {
        text: data.message || msg.content,
        suggestions: data.suggestions || [],
        products: data.products || [],
        // Present when the bot answered an order lookup — rendered as a visual
        // tracker instead of the text summary.
        order: data.order || null,
        imageUrl: null,
      };
    } catch {
      return { text: msg.content, suggestions: [], products: [], order: null, imageUrl: null };
    }
  };

  // Handle input change
  const handleInputChange = useCallback((e) => {
    setInputValue(e.target.value);
  }, []);

  // Handle key press (Enter to send)
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  // Cleanup typing timer
  useEffect(() => {
    const timer = typingTimerRef.current;
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, []);

  return (
    <>
      {/* ─── Floating Button ─── */}
      <button
        onClick={() => { if (isOpen) { setIsOpen(false); } else { handleOpen(); } }}
        className="chat-float-btn"
        style={{
          position: 'fixed',
          right: '16px',
          zIndex: 9999,
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #1a1a1a, #333)',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 24px rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.15)',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease, opacity 0.25s ease, scale 0.25s ease',
          opacity: (!buttonVisible || isReelActive || isMobileMenuActive || isCartDrawerActive) ? 0 : 1,
          pointerEvents: (!buttonVisible || isReelActive || isMobileMenuActive || isCartDrawerActive) ? 'none' : 'auto',
          scale: (!buttonVisible || isReelActive || isMobileMenuActive || isCartDrawerActive) ? 0.75 : 1,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.08)';
          e.currentTarget.style.boxShadow = '0 6px 32px rgba(0,0,0,0.35)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.3)';
        }}
        aria-label={isOpen ? 'Close live chat' : 'Open live chat'}
      >
        {isOpen ? (
          <X size={22} color="white" />
        ) : (
          <MessageCircle size={22} color="white" />
        )}

        {/* Unread badge with count */}
        {hasUnread && !isOpen && (
          <span style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            minWidth: '20px',
            height: '20px',
            borderRadius: '10px',
            background: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '11px',
            fontWeight: 800,
            color: 'white',
            padding: '0 5px',
            boxShadow: '0 2px 8px rgba(239, 68, 68, 0.5)',
            animation: 'chatPulse 1.5s ease-in-out infinite',
          }}>
            {unreadCountRef.current > 99 ? '99+' : unreadCountRef.current || '!'}
          </span>
        )}
      </button>

      {/* ─── Nudge: speech bubble FROM the chat button ─── */}
      {proactiveNudge && nudgeVisible && buttonVisible && !isOpen && !proactiveDismissed && !isReelActive && !isMobileMenuActive && !isCartDrawerActive && (
        <div
          className="cw-nudge"
          onClick={() => { setProactiveDismissed(false); setProactiveNudge(false); handleOpen(); }}
          style={{
            position: 'fixed', zIndex: 9998,
            right: '16px', bottom: '152px',
            display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
            background: 'linear-gradient(135deg, #1a1a1a, #2d2d2d)',
            borderRadius: '16px', padding: '10px 16px',
            boxShadow: '0 6px 24px rgba(0,0,0,0.25)',
            border: '1px solid rgba(255,255,255,0.06)',
            whiteSpace: 'nowrap',
            transition: 'all 0.25s cubic-bezier(0.16,1,0.3,1)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.35)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,0,0,0.25)'; }}
        >
          <span style={{ fontSize: '14px' }}>👋</span>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'white', lineHeight: 1.3 }}>
            Need help?
          </span>
          {/* Tail pointing down to chat button */}
          <div style={{
            position: 'absolute', right: '16px', bottom: '-6px',
            width: 0, height: 0,
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderTop: '6px solid #1a1a1a',
          }} />
          {/* Dismiss X */}
          <button onClick={(e) => { e.stopPropagation(); setProactiveDismissed(true); }} style={{
            marginLeft: '4px', width: '16px', height: '16px', borderRadius: '50%',
            background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '9px', color: 'rgba(255,255,255,0.5)', padding: 0, lineHeight: 1,
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.3)'; e.currentTarget.style.color = '#ef4444'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
          >✕</button>
        </div>
      )}

      {/* ─── Chat Window ─── */}
      {isOpen && !isReelActive && !isMobileMenuActive && (
        <div className="chat-float-window"
        style={{
          position: 'fixed',
          right: '12px',
          bottom: '84px',
          zIndex: 9999,
          width: 'calc(100vw - 24px)',
          maxWidth: '380px',
          height: 'min(540px, calc(100dvh - 100px))',
          background: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 8px 40px rgba(0,0,0,0.18), 0 2px 12px rgba(0,0,0,0.08)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'chatSlideUp 0.25s ease-out',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}>
          <style>{`
            @keyframes chatSlideUp {
              from { opacity: 0; transform: translateY(16px); }
              to { opacity: 1; transform: translateY(0); }
            }
            .cw-nudge {
              animation: nudgeFromIcon 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
            }
            @keyframes nudgeFromIcon {
              0% { opacity: 0; transform: scale(0.5) translateX(20px); }
              100% { opacity: 1; transform: scale(1) translateX(0); }
            }
            @media (min-width: 1024px) {
              .cw-nudge {
                bottom: 96px !important;
                right: 88px !important;
              }
            }
          `}</style>

          {/* ── Header ── */}
          <div style={{
            // Layered ink gradient with a warm gold thread along the bottom edge — reads
            // as a brand surface rather than a plain black bar.
            background: 'linear-gradient(150deg, #151312 0%, #262321 55%, #1c1a18 100%)',
            color: 'white',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            flexShrink: 0,
            borderBottom: '1px solid rgba(176, 141, 79, 0.35)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '11px', minWidth: 0 }}>
              {/* Overlapping identity chips. The human agent moves to the front only
                  once they have actually introduced themselves — we never invent a
                  face for someone who has not spoken. */}
              <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                <span
                  style={{
                    width: '34px', height: '34px', borderRadius: '50%',
                    background: hasHumanAgent ? 'linear-gradient(135deg, #4b4741, #2c2926)' : 'rgba(255,255,255,0.10)',
                    border: '1.5px solid rgba(255,255,255,0.30)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
                    fontSize: '12px', fontWeight: 700, letterSpacing: '0.2px',
                  }}
                >
                  {hasHumanAgent ? initialsOf(agentName) : <Bot size={16} />}
                </span>
                <span
                  style={{
                    width: '30px', height: '30px', borderRadius: '50%', marginLeft: '-10px',
                    background: 'linear-gradient(135deg, #B08D4F, #8B6914)',
                    border: '1.5px solid rgba(20,19,18,0.6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1,
                  }}
                  aria-hidden="true"
                >
                  {isLiveMode ? <Headphones size={14} /> : <Bot size={14} />}
                </span>
                <span
                  aria-hidden="true"
                  style={{
                    width: '9px', height: '9px', marginLeft: '-6px', borderRadius: '50%', zIndex: 3,
                    background: isLiveMode ? '#22c55e' : '#818cf8',
                    boxShadow: '0 0 0 2px #1f1d1b',
                  }}
                />
              </div>

              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0 }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {hasHumanAgent ? agentName : isLiveMode ? 'Live Support' : 'THREVOLT Assistant'}
                  </span>
                  <ShieldCheck size={13} style={{ color: '#C9A96E', flexShrink: 0 }} aria-label="Verified support channel" />
                </div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.75)', display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0 }}>
                  <span
                    aria-hidden="true"
                    style={{
                      width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', flexShrink: 0,
                      animation: 'chatPulse 2.4s ease-in-out infinite',
                    }}
                  />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {isLiveMode ? 'Online now · usually replies in under 2 minutes' : 'Instant answers · a human can take over any time'}
                  </span>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexShrink: 0 }}>
              <button
                type="button"
                onClick={toggleSound}
                aria-pressed={soundOn}
                title={soundOn ? 'Mute chat sounds' : 'Unmute chat sounds'}
                aria-label={soundOn ? 'Mute chat sounds' : 'Unmute chat sounds'}
                style={{
                  background: 'none',
                  border: 'none',
                  color: soundOn ? '#C9A96E' : 'rgba(255,255,255,0.55)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  borderRadius: '6px',
                  transition: 'all 0.2s',
                }}
              >
                {soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
              </button>
              {pushSupported && (
                <button
                  onClick={async () => {
                    if (!pushSubscribed) {
                      const ok = await subscribePush();
                      if (ok) toast.success('🔔 Chat notifications enabled!');
                    }
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: pushSubscribed ? '#34d399' : 'rgba(255,255,255,0.6)',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    borderRadius: '6px',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'white';
                    e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = pushSubscribed ? '#34d399' : 'rgba(255,255,255,0.6)';
                    e.currentTarget.style.background = 'none';
                  }}
                  title={pushSubscribed ? 'Notifications Active' : 'Enable Reply Alerts'}
                  aria-label="Toggle notifications"
                >
                  {pushSubscribed ? <BellRing size={16} /> : <Bell size={16} />}
                </button>
              )}
              <button
                onClick={async () => {
                  if (window.confirm('Start a new conversation? Current chat will be closed.')) {
                    await newConversation();
                  }
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255,255,255,0.6)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  borderRadius: '6px',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'white';
                  e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
                  e.currentTarget.style.background = 'none';
                }}
                title="New Conversation"
              >
                <RefreshCw size={16} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255,255,255,0.6)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  borderRadius: '6px',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'white';
                  e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
                  e.currentTarget.style.background = 'none';
                }}
                aria-label="Close chat"
              >
                <Minus size={18} />
              </button>
            </div>
          </div>

          {/* ── Push Notification Banner ── */}
          {pushSupported && !pushSubscribed && pushPermission !== 'denied' && (
            <div
              onClick={async () => {
                const ok = await subscribePush();
                if (ok) toast.success('🔔 You will be alerted on your lock screen when support replies!');
              }}
              style={{
                background: 'rgba(16, 185, 129, 0.12)',
                borderBottom: '1px solid rgba(16, 185, 129, 0.2)',
                padding: '7px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '11px',
                color: '#065f46',
                cursor: 'pointer',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <BellRing size={13} />
                <span>Notify me when an agent replies</span>
              </span>
              <span style={{ fontWeight: 700, textDecoration: 'underline' }}>Enable</span>
            </div>
          )}

          {/* ── Messages Area ── */}
          <div
            // Dropping a screenshot anywhere in the thread attaches it — the fastest
            // path for "this is what arrived damaged".
            onDragOver={(e) => {
              if (!e.dataTransfer?.types?.includes('Files')) return;
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={(e) => {
              if (e.currentTarget.contains(e.relatedTarget)) return;
              setDragActive(false);
            }}
            onDrop={(e) => {
              if (!e.dataTransfer?.files?.length) return;
              e.preventDefault();
              setDragActive(false);
              const file = e.dataTransfer.files[0];
              if (!file.type.startsWith('image/')) {
                toast.error('Only images can be attached');
                return;
              }
              if (file.size > 5 * 1024 * 1024) {
                toast.error('Image must be under 5 MB');
                return;
              }
              setImagePreview({ file, url: URL.createObjectURL(file), name: file.name });
            }}
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px',
              background: dragActive ? '#f1efe9' : '#f8f9fa',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              position: 'relative',
              transition: 'background 0.15s ease',
              outline: dragActive ? '2px dashed #B08D4F' : '2px dashed transparent',
              outlineOffset: '-8px',
            }}
          >
            {dragActive && (
              <div
                aria-hidden="true"
                style={{
                  position: 'sticky', top: 0, zIndex: 5, alignSelf: 'center',
                  background: '#1a1a1a', color: 'white', borderRadius: '999px',
                  padding: '5px 14px', fontSize: '11px', fontWeight: 700,
                  display: 'flex', alignItems: 'center', gap: '6px',
                  boxShadow: '0 6px 18px rgba(0,0,0,0.22)',
                }}
              >
                <ImagePlus size={13} /> Drop to attach the image
              </div>
            )}
            {!chat && !error ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                gap: '12px',
                padding: '24px',
                textAlign: 'center',
              }}>
                <div style={{
                  width: '48px', height: '48px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, #1a1a1a, #333)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <MessageCircle size={22} color="white" />
                </div>
                <div>
                  <p style={{ fontSize: '15px', fontWeight: 600, color: '#1a1a1a', margin: 0 }}>Hi there! 👋</p>
                  <p style={{ fontSize: '13px', color: '#999', margin: '4px 0 0' }}>How can we help you today?</p>
                </div>
                {chatLoading && (
                  <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                    <span className="chat-dot-pulse" style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ccc' }} />
                    <span className="chat-dot-pulse" style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ccc' }} />
                    <span className="chat-dot-pulse" style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ccc' }} />
                  </div>
                )}
              </div>
            ) : error && !chat ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                padding: '24px',
                textAlign: 'center',
                gap: '12px',
              }}>
                <AlertCircle size={32} color="#ef4444" />
                <div style={{ fontSize: '14px', color: '#666' }}>{error}</div>
                <button
                  onClick={() => { setChatLoading(true); initChat().finally(() => setChatLoading(false)); }}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    background: 'white',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                >
                  Try Again
                </button>
              </div>
            ) : messages.length === 0 ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                textAlign: 'center',
                padding: '20px 16px',
                gap: '12px',
              }}>
                <div style={{ fontSize: '36px' }}>{chatMode === 'ai' ? '🤖' : '👋'}</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#1a1a1a' }}>
                  {chatMode === 'ai' ? 'Ask THREVOLT Assistant!' : 'How can we help you today?'}
                </div>
                <div style={{ fontSize: '13px', color: '#666', lineHeight: 1.4, maxWidth: '280px' }}>
                  {chatMode === 'ai'
                    ? 'Instant help with tracking, orders, sizing, and styling.'
                    : 'Send us a message and our support team will reply shortly.'}
                </div>

                {/* Quick Starter Prompts */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', width: '100%', marginTop: '6px' }}>
                  {[
                    { label: '📦 Track Order', prompt: 'I want to track my order status.' },
                    { label: '📏 Size Guide', prompt: 'Can you help me choose the right size?' },
                    { label: '🔄 Returns Help', prompt: 'What is your return and exchange policy?' },
                    { label: '👤 Live Agent', prompt: 'Can I speak with a human support agent?' },
                  ].map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSend(chip.prompt)}
                      style={{
                        padding: '9px 10px',
                        borderRadius: '10px',
                        border: '1px solid #e5e7eb',
                        background: '#ffffff',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#374151',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.15s ease',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = '#1a1a1a';
                        e.currentTarget.style.background = '#f9fafb';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = '#e5e7eb';
                        e.currentTarget.style.background = '#ffffff';
                      }}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {/* Date groups */}                {Object.entries(groupMessagesByDate(visibleMessages)).map(([dateStr, msgs]) => (
                  <div key={dateStr}>
                    <div style={{ textAlign: 'center', fontSize: '11px', color: '#999', margin: '8px 0', fontWeight: 600 }}>
                      {getDateLabel(dateStr)}
                    </div>
                    {msgs.map((msg, mi) => {
                      const parsed = parseAiMessage(msg);
                      const isAI = msg.senderId === 'ai-chatbot';
                      const inbound = !!msg.isFromAdmin;

                      // WhatsApp-style grouping: consecutive messages from the same
                      // author weld their adjacent corners and only the last one in a
                      // run carries the timestamp, so a burst reads as one block.
                      const prevMsg = msgs[mi - 1];
                      const nextMsg = msgs[mi + 1];
                      const sameAsPrev =
                        !!prevMsg &&
                        !!prevMsg.isFromAdmin === inbound &&
                        (prevMsg.senderId === 'ai-chatbot') === isAI;
                      const sameAsNext =
                        !!nextMsg &&
                        !!nextMsg.isFromAdmin === inbound &&
                        (nextMsg.senderId === 'ai-chatbot') === isAI;

                      const radius = inbound
                        ? `4px 16px 16px ${sameAsNext ? '4px' : '16px'}`
                        : `16px 4px ${sameAsNext ? '4px' : '16px'} 16px`;

                      return (
                        <div key={msg.id} style={{ marginBottom: sameAsNext ? '3px' : '10px' }}>
                          <div style={{ display: 'flex', justifyContent: inbound ? 'flex-start' : 'flex-end', alignItems: 'flex-end', gap: '7px' }}>
                            {/* Agent identity chip — shown once per run, not on every line. */}
                            {inbound && !sameAsNext && (
                              <span
                                aria-hidden="true"
                                style={{
                                  width: '26px', height: '26px', borderRadius: '50%', flexShrink: 0,
                                  background: isAI ? 'linear-gradient(135deg, #B08D4F, #8B6914)' : 'linear-gradient(135deg, #4b4741, #2c2926)',
                                  color: 'white', fontSize: '10px', fontWeight: 700,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}
                              >
                                {isAI ? <Bot size={13} /> : initialsOf(msg.senderName || agentName)}
                              </span>
                            )}
                            {inbound && sameAsNext && <span style={{ width: '26px', flexShrink: 0 }} aria-hidden="true" />}

                            <div style={{
                              maxWidth: '80%', padding: '8px 13px', borderRadius: radius,
                              background: inbound ? (isAI ? '#faf6ec' : '#eceae6') : '#1a1a1a',
                              color: inbound ? '#1a1a1a' : 'white',
                              border: inbound ? (isAI ? '1px solid rgba(176,141,79,0.28)' : '1px solid #e2e0dc') : '1px solid #1a1a1a',
                              fontSize: '14px', lineHeight: 1.45, wordBreak: 'break-word', overflowWrap: 'anywhere',
                            }}>
                              {!sameAsPrev && isAI && (
                                <div style={{ fontSize: '10px', color: '#8B6914', fontWeight: 700, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <Bot size={11} /> AI Assistant
                                </div>
                              )}
                              {!sameAsPrev && inbound && !isAI && (
                                <div style={{ fontSize: '10px', color: '#2f6b52', fontWeight: 700, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                                  {msg.senderName || agentName || 'Support'} · Support
                                </div>
                              )}
                              {/* Image message — opens in an in-chat lightbox, not a new tab */}
                              {parsed.imageUrl ? (
                                <div style={{ margin: parsed.text ? '0 0 4px' : 0 }}>
                                  <img
                                    src={getImageUrl(parsed.imageUrl)}
                                    alt="Image shared in this chat"
                                    style={{ maxWidth: '100%', borderRadius: '8px', cursor: 'zoom-in' }}
                                    loading="lazy"
                                    onClick={() => setLightbox({ src: getImageUrl(parsed.imageUrl), alt: 'Image shared in this chat' })}
                                  />
                                  {parsed.text && (
                                    <MessageText text={parsed.text} variant={inbound ? 'light' : 'dark'} className={isOnlyEmoji(parsed.text) ? 'text-[26px] leading-tight' : 'mt-1 text-sm'} />
                                  )}
                                </div>
                              ) : (
                                <MessageText
                                  text={parsed.text}
                                  variant={inbound ? 'light' : 'dark'}
                                  className={isOnlyEmoji(parsed.text) ? 'text-[26px] leading-tight' : 'text-sm'}
                                />
                              )}
                              {!sameAsNext && (
                                <div style={{ fontSize: '10px', opacity: 0.65, marginTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                                  <span>{formatTime(msg.createdAt)}</span>
                                  {!inbound && <ReadTicks read={!!msg.isRead} variant="dark" />}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Visual order tracker for bot order lookups */}
                          {parsed.order && (
                            <div style={{ marginTop: '6px', maxWidth: '88%' }}>
                              <OrderTrackingCard order={parsed.order} />
                            </div>
                          )}
                          {/* Product Cards */}
                          {parsed.products.length > 0 && (
                            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', padding: '6px 0', marginTop: '6px' }}>
                              {parsed.products.map((p, i) => (
                                <a key={i} href={`/products/${p.slug}`} target="_blank" rel="noopener noreferrer" style={{
                                  minWidth: '160px', maxWidth: '180px', borderRadius: '12px', border: '1px solid #e5e7eb', background: 'white', textDecoration: 'none', color: '#1a1a1a', flexShrink: 0, overflow: 'hidden', transition: 'box-shadow 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                                }}
                                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)'}
                                onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)'}
                                >
                                  {/* Product Image */}
                                  {p.image ? (
                                    <div style={{ width: '100%', height: '120px', background: '#f3f4f6', overflow: 'hidden' }}>
                                      <img src={p.image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                                    </div>
                                  ) : (
                                    <div style={{ width: '100%', height: '80px', background: 'linear-gradient(135deg, #667eea20, #764ba220)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>🛍️</div>
                                  )}
                                  <div style={{ padding: '10px' }}>
                                    {/* Name + Category */}
                                    <div style={{ fontWeight: 700, fontSize: '12px', marginBottom: '2px', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.name}</div>
                                    <div style={{ color: '#9ca3af', fontSize: '10px', marginBottom: '6px' }}>{p.category}</div>
                                    {/* Price + Old Price */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                                      <span style={{ fontWeight: 800, fontSize: '14px', color: '#111' }}>₹{p.price}</span>
                                      {p.oldPrice && <span style={{ fontSize: '11px', color: '#9ca3af', textDecoration: 'line-through' }}>₹{p.oldPrice}</span>}
                                      {p.oldPrice && <span style={{ fontSize: '10px', fontWeight: 700, color: '#dc2626', background: '#fef2f2', padding: '1px 5px', borderRadius: '4px' }}>{Math.round((1 - p.price / p.oldPrice) * 100)}% OFF</span>}
                                    </div>
                                    {/* Rating */}
                                    {p.rating && (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginBottom: '6px' }}>
                                        <span style={{ fontSize: '11px', color: '#f59e0b' }}>{'★'.repeat(Math.round(p.rating))}</span>
                                        <span style={{ fontSize: '10px', color: '#9ca3af' }}>{p.rating}/5</span>
                                      </div>
                                    )}
                                    {/* Sizes */}
                                    {p.sizes && p.sizes.length > 0 && (
                                      <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap', marginBottom: '4px' }}>
                                        {p.sizes.map((s, si) => (
                                          <span key={si} style={{ padding: '2px 6px', borderRadius: '4px', border: '1px solid #e5e7eb', fontSize: '9px', fontWeight: 600, color: '#6b7280' }}>{s}</span>
                                        ))}
                                      </div>
                                    )}
                                    {/* Stock Status */}
                                    <div style={{ fontSize: '10px', fontWeight: 600, color: p.inStock !== false ? '#16a34a' : '#dc2626' }}>
                                      {p.inStock !== false ? '✅ In Stock' : '❌ Out of Stock'}
                                    </div>
                                  </div>
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}

                {/* Typing indicator — names the person doing the typing, WhatsApp-style */}
                {(isTyping || isAiTyping) && (
                  <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '4px', gap: '7px', alignItems: 'flex-end' }}>
                    <span
                      aria-hidden="true"
                      style={{
                        width: '26px', height: '26px', borderRadius: '50%', flexShrink: 0,
                        background: isAiTyping ? 'linear-gradient(135deg, #B08D4F, #8B6914)' : 'linear-gradient(135deg, #4b4741, #2c2926)',
                        color: 'white', fontSize: '10px', fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      {isAiTyping ? <Bot size={13} /> : initialsOf(typingName || agentName)}
                    </span>
                    <div
                      aria-live="polite"
                      style={{
                        padding: '9px 13px', borderRadius: '4px 16px 16px 16px', background: '#eceae6',
                        border: '1px solid #e2e0dc', display: 'flex', gap: '4px', alignItems: 'center',
                      }}
                    >
                      <span className="chat-dot-pulse" style={{ width: '6px', height: '6px', borderRadius: '50%', background: isAiTyping ? '#B08D4F' : '#888' }} />
                      <span className="chat-dot-pulse" style={{ width: '6px', height: '6px', borderRadius: '50%', background: isAiTyping ? '#B08D4F' : '#888' }} />
                      <span className="chat-dot-pulse" style={{ width: '6px', height: '6px', borderRadius: '50%', background: isAiTyping ? '#B08D4F' : '#888' }} />
                      <span style={{ fontSize: '11px', color: isAiTyping ? '#8B6914' : '#555', marginLeft: '4px', fontWeight: 600 }}>
                        {isAiTyping ? 'AI Assistant is typing…' : `${typingName || agentName || 'Support'} is typing…`}
                      </span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </>
            )}
          </div>



          {/* ── Suggestion Chips ── */}
          {suggestions.length > 0 && (
            <div style={{ padding: '0 16px 8px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {suggestions.map((s, i) => (
                <button key={i} onClick={() => handleSend(s)} style={{
                  padding: '6px 12px', borderRadius: '20px', border: '1px solid #e5e7eb', background: 'white',
                  fontSize: '12px', fontWeight: 500, color: '#374151', cursor: 'pointer', transition: 'all 0.2s',
                  whiteSpace: 'nowrap',
                }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#f3f4f6'; e.currentTarget.style.borderColor = '#d1d5db'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#e5e7eb'; }}
                >{s}</button>
              ))}
            </div>
          )}

          {/* ── Image Preview Overlay ── */}
          {imagePreview && (
            <div style={{ borderTop: '1px solid #e8e8e8', padding: '12px 16px', background: '#fafafa', flexShrink: 0 }}>
              <div style={{ position: 'relative', display: 'inline-block', maxWidth: '100%' }}>
                <img src={imagePreview.url} alt="Preview" style={{ maxWidth: '100%', maxHeight: '160px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }} />
                {/* Progress bar */}
                {uploading && (
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '4px', background: 'rgba(0,0,0,0.2)', borderRadius: '0 0 12px 12px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${uploadProgress}%`, background: 'linear-gradient(90deg, #6366f1, #8b5cf6)', borderRadius: '12px', transition: 'width 0.3s ease', boxShadow: '0 0 8px rgba(99,102,241,0.5)' }} />
                  </div>
                )}
                {/* Cancel button */}
                {!uploading && (
                  <button onClick={handleCancelPreview} style={{ position: 'absolute', top: '-8px', right: '-8px', width: '24px', height: '24px', borderRadius: '50%', background: '#ef4444', border: '2px solid white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', boxShadow: '0 2px 6px rgba(239,68,68,0.3)' }}>
                    <X size={12} />
                  </button>
                )}
                {/* File name + size */}
                <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>{imagePreview.name}</span>
                  <span>{(imagePreview.file.size / 1024).toFixed(0)} KB</span>
                </div>
              </div>
              {/* Send / Cancel buttons */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <button onClick={handleCancelPreview} disabled={uploading}
                  style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: '#6b7280', transition: 'all 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                  onMouseLeave={e => e.currentTarget.style.background = 'white'}>Cancel</button>
                <button onClick={handleSendImage} disabled={uploading}
                  style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', background: uploading ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'linear-gradient(135deg, #1a1a1a, #333)', cursor: uploading ? 'wait' : 'pointer', fontSize: '13px', fontWeight: 600, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
                  onMouseEnter={e => { if (!uploading) e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.25)'; }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)'; }}>
                  {uploading ? (<><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Sending {uploadProgress}%</>) : (<>📤 Send Image</>)}
                </button>
              </div>
            </div>
          )}

          {/* ── Input Area ── */}
          {!imagePreview && (
            <div style={{
              borderTop: '1px solid #e8e8e8',
              padding: '12px 16px',
              background: 'white',
              flexShrink: 0,
              display: 'flex',
              gap: '6px',
              alignItems: 'flex-end',
              position: 'relative',
            }}>
              {showEmojiPicker && (
                <EmojiPickerPopover
                  onSelect={handleInsertEmoji}
                  onClose={() => setShowEmojiPicker(false)}
                />
              )}
              {/* WhatsApp-style Emoji button */}
              <button
                type="button"
                onClick={() => setShowEmojiPicker(prev => !prev)}
                disabled={uploading}
                style={{
                  width: '36px', height: '36px', borderRadius: '10px',
                  border: showEmojiPicker ? '1px solid #1a1a1a' : '1px solid #ddd',
                  background: showEmojiPicker ? '#f3f4f6' : 'white', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  color: showEmojiPicker ? '#1a1a1a' : '#6b7280', transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#1a1a1a'; e.currentTarget.style.color = '#1a1a1a'; }}
                onMouseLeave={e => {
                  if (!showEmojiPicker) {
                    e.currentTarget.style.borderColor = '#ddd';
                    e.currentTarget.style.color = '#6b7280';
                  }
                }}
                title="Insert emoji"
                aria-label="Insert emoji"
              >
                <Smile size={18} />
              </button>
              <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*" style={{ display: 'none' }} />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                style={{
                  width: '36px', height: '36px', borderRadius: '10px', border: '1px solid #ddd',
                  background: uploading ? '#f3f4f6' : 'white', cursor: uploading ? 'wait' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  color: '#6b7280', transition: 'all 0.2s',
                }}
                onMouseEnter={e => { if (!uploading) { e.currentTarget.style.borderColor = '#1a1a1a'; e.currentTarget.style.color = '#1a1a1a'; } }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#ddd'; e.currentTarget.style.color = '#6b7280'; }}
                aria-label="Upload image"
                title="Attach image"
              >
                {uploading ? <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <ImagePlus size={16} />}
              </button>
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Type your message..."
                rows={1}
                style={{
                  flex: 1,
                  border: '1px solid #ddd',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  resize: 'none',
                  outline: 'none',
                  lineHeight: 1.4,
                  maxHeight: '100px',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => { e.target.style.borderColor = '#1a1a1a'; }}
                onBlur={(e) => { e.target.style.borderColor = '#ddd'; }}
              />
              <button
                onClick={() => handleSend()}
                disabled={!inputValue.trim()}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  border: 'none',
                  background: inputValue.trim() ? '#1a1a1a' : '#e8e8e8',
                  color: inputValue.trim() ? 'white' : '#999',
                  cursor: inputValue.trim() ? 'pointer' : 'default',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (inputValue.trim()) {
                    e.currentTarget.style.background = '#333';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = inputValue.trim() ? '#1a1a1a' : '#e8e8e8';
                }}
                aria-label="Send message"
              >
                <Send size={16} />
              </button>
            </div>
          )}
        </div>
      )}

      <style>{`
        .chat-float-btn {
          bottom: 84px;
        }
        .chat-float-window {
          bottom: 84px;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes chatPulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
        .chat-dot-pulse { animation: chatPulse 1.2s ease-in-out infinite; }
        .chat-dot-pulse:nth-child(2) { animation-delay: 0.2s; }
        .chat-dot-pulse:nth-child(3) { animation-delay: 0.4s; }

        @media (min-width: 1024px) {
          .chat-float-btn {
            bottom: 24px;
            right: 24px;
          }
          .chat-float-window {
            right: 24px !important;
            bottom: 92px !important;
            width: 380px !important;
            height: 560px !important;
            max-height: calc(100dvh - 120px) !important;
          }
          .cw-nudge {
            right: 24px !important;
            bottom: 92px !important;
          }
        }
      `}</style>

      {/* Attachment preview stays inside the chat instead of hijacking a new tab */}
      {lightbox && (
        <ImageLightbox
          src={lightbox.src}
          alt={lightbox.alt}
          caption="Shared in this chat"
          onClose={() => setLightbox(null)}
        />
      )}
    </>
  );
}
