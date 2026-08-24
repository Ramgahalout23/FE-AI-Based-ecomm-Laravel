/**
 * LiveChatWidget
 * Floating chat widget that appears at the bottom-right of the storefront.
 * Uses existing support ticket system for persistence and Socket.io for real-time messaging.
 */

import { X, Send, RefreshCw, Minus, MessageCircle, AlertCircle, Bot, Headphones } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { formatTime } from '../../utils/formatters';
import useChat from '../../hooks/useChat';
import { chatAPI } from '../../api/tickets';
import toast from '../../utils/toast';

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

// ─── Main Component ───────────────────────────────────────

export default function LiveChatWidget() {
  const {
    chat, messages, error, isTyping, isAiTyping, typingName,
    initChat, sendMessage, sendTyping, isSocketConnected,
  } = useChat();

  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [isReelActive, setIsReelActive] = useState(false);
  const [isMobileMenuActive, setIsMobileMenuActive] = useState(false);
  const [chatMode, setChatMode] = useState('ai'); // 'ai' or 'live'
  const [suggestions, setSuggestions] = useState([]);

  const [welcomeLoaded, setWelcomeLoaded] = useState(false);
  const [proactiveNudge, setProactiveNudge] = useState(false);
  const [proactiveDismissed, setProactiveDismissed] = useState(false);
  const [csatRating, setCsatRating] = useState(null); // null | 'good' | 'bad'
  const [csatSubmitted, setCsatSubmitted] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimerRef = useRef(null);
  const lastMessageCountRef = useRef(0);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages, isOpen]);

  // Track unread messages when widget is minimized
  useEffect(() => {
    if (!isOpen && messages.length > lastMessageCountRef.current) {
      setHasUnread(true);
    }
    lastMessageCountRef.current = messages.length;
  }, [messages.length, isOpen]);

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

  // Fetch chat mode on mount
  useEffect(() => {
    chatAPI.getChatMode()
      .then(res => {
        const mode = res.data?.data?.mode || 'ai';
        setChatMode(mode);
      })
      .catch(() => {});
  }, []);

  // ── Proactive Triggers ──

  // Timer trigger: show nudge after 30 seconds on site
  useEffect(() => {
    if (isOpen || proactiveDismissed) return;
    const timer = setTimeout(() => {
      setProactiveNudge(true);
    }, 30000);
    return () => clearTimeout(timer);
  }, [isOpen, proactiveDismissed]);

  // Exit intent: show nudge when mouse leaves viewport top
  useEffect(() => {
    if (isOpen || proactiveDismissed) return;
    const handleMouseLeave = (e) => {
      if (e.clientY < 0) setProactiveNudge(true);
    };
    document.addEventListener('mouseleave', handleMouseLeave);
    return () => document.removeEventListener('mouseleave', handleMouseLeave);
  }, [isOpen, proactiveDismissed]);

  // Load welcome message with suggestions
  useEffect(() => {
    if (chatMode === 'ai' && !welcomeLoaded) {
      chatAPI.getWelcomeMessage()
        .then(res => {
          const data = res.data?.data;
          if (data?.suggestions) setSuggestions(data.suggestions);
          setWelcomeLoaded(true);
        })
        .catch(() => {});
    }
  }, [chatMode, welcomeLoaded]);



  // Initialize chat when opened — works for everyone
  const handleOpen = useCallback(async () => {
    setIsOpen(true);
    setHasUnread(false);
    setProactiveNudge(false);

    if (!chat) {
      setChatLoading(true);
      await initChat();
      setChatLoading(false);
    }
  }, [chat, initChat]);

  // Send a message
  const handleSend = useCallback(async (text) => {
    const msg = text || inputValue.trim();
    if (!msg) return;

    setInputValue('');
    setSuggestions([]);
    setChatLoading(true);
    sendTyping(false);

    const result = await sendMessage(msg);
    setChatLoading(false);

    if (!result) {
      toast.error('Failed to send message');
    }
  }, [inputValue, sendMessage, sendTyping]);

  // Parse AI structured response from message content
  const parseAiMessage = (msg) => {
    if (msg.senderId !== 'ai-chatbot') return { text: msg.content, suggestions: [], products: [] };
    try {
      const data = JSON.parse(msg.content);
      return {
        text: data.message || msg.content,
        suggestions: data.suggestions || [],
        products: data.products || [],
      };
    } catch {
      return { text: msg.content, suggestions: [], products: [] };
    }
  };

  // Handle typing indicator
  const handleInputChange = useCallback((e) => {
    setInputValue(e.target.value);

    // Throttled typing indicator
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    sendTyping(e.target.value.length > 0);
    typingTimerRef.current = setTimeout(() => {
      sendTyping(false);
    }, 2000);
  }, [sendTyping]);

  // Handle key press (Enter to send)
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  // Cleanup typing timer
  useEffect(() => {
    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    };
  }, []);

  // Chat works for everyone — auth is optional (for order tracking)
  const showLoginPrompt = false;

  return (
    <>
      {/* ─── Floating Button ─── */}
      <button
        onClick={handleOpen}
        className="chat-float-btn"
        style={{
          position: 'fixed',
          right: '24px',
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
          opacity: (isReelActive || isMobileMenuActive) ? 0 : 1,
          pointerEvents: (isReelActive || isMobileMenuActive) ? 'none' : 'auto',
          scale: (isReelActive || isMobileMenuActive) ? 0.75 : 1,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.08)';
          e.currentTarget.style.boxShadow = '0 6px 32px rgba(0,0,0,0.35)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.3)';
        }}
        aria-label="Open live chat"
      >
        {isOpen ? (
          <X size={22} color="white" />
        ) : (
          <MessageCircle size={22} color="white" />
        )}

        {/* Unread badge */}
        {hasUnread && !isOpen && (
          <span style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            width: '18px',
            height: '18px',
            borderRadius: '50%',
            background: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '10px',
            fontWeight: 700,
            color: 'white',
            boxShadow: '0 2px 6px rgba(239, 68, 68, 0.4)',
          }}>
            !
          </span>
        )}
      </button>

      {/* ─── Proactive Nudge Banner ─── */}
      {proactiveNudge && !isOpen && !proactiveDismissed && !isReelActive && !isMobileMenuActive && (
        <div style={{
          position: 'fixed', right: '24px', bottom: '92px', zIndex: 9998,
          background: 'white', borderRadius: '16px', padding: '16px 20px',
          boxShadow: '0 8px 40px rgba(0,0,0,0.15)', maxWidth: '280px',
          animation: 'chatSlideUp 0.3s ease-out',
          border: '1px solid #e5e7eb',
        }}>
          <button onClick={() => setProactiveDismissed(true)} style={{
            position: 'absolute', top: '8px', right: '8px', background: 'none', border: 'none',
            cursor: 'pointer', color: '#9ca3af', fontSize: '16px', padding: '2px',
          }}>×</button>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#1a1a1a', marginBottom: '6px' }}>
            Need help? 🤝
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280', lineHeight: 1.4, marginBottom: '10px' }}>
            Chat with us for instant help with sizing, orders, or recommendations!
          </div>
          <button onClick={() => { setProactiveDismissed(false); setProactiveNudge(false); handleOpen(); }} style={{
            width: '100%', padding: '8px', borderRadius: '8px', border: 'none',
            background: '#1a1a1a', color: 'white', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
          }}>Start Chat</button>
        </div>
      )}

      {/* ─── Chat Window ─── */}
      {isOpen && !isReelActive && !isMobileMenuActive && (
        <div className="chat-float-window"
        style={{
          position: 'fixed',
          right: '24px',
          bottom: '92px',
          zIndex: 9999,
          width: '360px',
          maxWidth: 'calc(100vw - 48px)',
          height: '520px',
          maxHeight: 'calc(100vh - 140px)',
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
          `}</style>

          {/* ── Header ── */}
          <div style={{
            background: 'linear-gradient(135deg, #1a1a1a, #2d2d2d)',
            color: 'white',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: chatMode === 'ai' ? '#6366f1' : '#22c55e',
                boxShadow: chatMode === 'ai' ? '0 0 8px rgba(99, 102, 241, 0.5)' : '0 0 8px rgba(34, 197, 94, 0.5)',
                animation: 'chatPulse 2s ease-in-out infinite',
              }} />
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {chatMode === 'ai' ? <><Bot size={14} /> AI Assistant</> : <><Headphones size={14} /> Live Support</>}
                </div>
                <div style={{ fontSize: '11px', opacity: 0.7 }}>
                  {chatMode === 'ai' ? 'Instant replies 24/7' : 'We typically reply in minutes'}
                </div>
              </div>
            </div>
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

          {/* ── Messages Area ── */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            background: '#f8f9fa',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}>
            {chatLoading && !chat ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                gap: '8px',
                color: '#666',
                fontSize: '14px',
              }}>
                <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} />
                Starting chat...
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
                padding: '24px',
                gap: '12px',
              }}>
                <div style={{ fontSize: '36px' }}>{chatMode === 'ai' ? '🤖' : '👋'}</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#1a1a1a' }}>
                  {chatMode === 'ai' ? 'Ask me anything!' : 'How can we help you today?'}
                </div>
                <div style={{ fontSize: '13px', color: '#666', lineHeight: 1.4 }}>
                  {chatMode === 'ai'
                    ? 'I can help with product recommendations, order tracking, sizing, and more.'
                    : 'Send us a message and our team will get back to you shortly.'}
                </div>
              </div>
            ) : (
              <>
                {/* Date groups */}                {Object.entries(groupMessagesByDate(messages)).map(([dateStr, msgs]) => (
                  <div key={dateStr}>
                    <div style={{ textAlign: 'center', fontSize: '11px', color: '#999', margin: '8px 0', fontWeight: 600 }}>
                      {getDateLabel(dateStr)}
                    </div>
                    {msgs.map((msg) => {
                      const parsed = parseAiMessage(msg);
                      return (
                        <div key={msg.id} style={{ marginBottom: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: msg.isFromAdmin ? 'flex-start' : 'flex-end' }}>
                            <div style={{
                              maxWidth: '80%', padding: '8px 14px', borderRadius: msg.isFromAdmin ? '4px 16px 16px 16px' : '16px 4px 16px 16px',
                              background: msg.isFromAdmin ? '#e8e8e8' : '#1a1a1a',
                              color: msg.isFromAdmin ? '#1a1a1a' : 'white',
                              fontSize: '14px', lineHeight: 1.4, wordBreak: 'break-word',
                            }}>
                              {msg.senderId === 'ai-chatbot' && (
                                <div style={{ fontSize: '10px', color: '#6366f1', fontWeight: 700, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  🤖 AI Assistant
                                </div>
                              )}
                              <div style={{ whiteSpace: 'pre-line' }}>{parsed.text}</div>
                              <div style={{ fontSize: '10px', opacity: 0.6, marginTop: '4px', textAlign: 'right' }}>
                                {formatTime(msg.createdAt)}
                              </div>
                            </div>
                          </div>
                          {/* Product Cards */}
                          {parsed.products.length > 0 && (
                            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', padding: '4px 0', marginTop: '4px' }}>
                              {parsed.products.map((p, i) => (
                                <a key={i} href={`/products/${p.slug}`} target="_blank" rel="noopener noreferrer" style={{
                                  minWidth: '140px', padding: '10px', borderRadius: '10px', border: '1px solid #e5e7eb', background: 'white', textDecoration: 'none', color: '#1a1a1a', fontSize: '12px', flexShrink: 0,
                                }}>
                                  <div style={{ fontWeight: 700, marginBottom: '2px' }}>{p.name}</div>
                                  <div style={{ color: '#666', fontSize: '11px' }}>{p.category}</div>
                                  <div style={{ fontWeight: 700, color: '#1a1a1a', marginTop: '4px' }}>₹{p.price}</div>
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}

                {/* Typing indicator */}
                {(isTyping || isAiTyping) && (
                  <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '4px' }}>
                    <div style={{
                      padding: '10px 14px', borderRadius: '4px 16px 16px 16px', background: '#e8e8e8',
                      display: 'flex', gap: '4px', alignItems: 'center',
                    }}>
                      <span className="chat-dot-pulse" style={{ width: '6px', height: '6px', borderRadius: '50%', background: isAiTyping ? '#6366f1' : '#888' }} />
                      <span className="chat-dot-pulse" style={{ width: '6px', height: '6px', borderRadius: '50%', background: isAiTyping ? '#6366f1' : '#888' }} />
                      <span className="chat-dot-pulse" style={{ width: '6px', height: '6px', borderRadius: '50%', background: isAiTyping ? '#6366f1' : '#888' }} />
                      <span style={{ fontSize: '10px', color: isAiTyping ? '#6366f1' : '#888', marginLeft: '4px', fontWeight: 600 }}>
                        {isAiTyping ? 'AI is typing...' : (typingName || 'Support')}
                      </span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* ── CSAT Rating (after 3+ messages) ── */}
          {messages.length >= 3 && !csatSubmitted && (
            <div style={{ padding: '0 16px 8px' }}>
              <div style={{
                padding: '12px 16px', borderRadius: '12px', background: 'white',
                border: '1px solid #e5e7eb', textAlign: 'center',
              }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
                  Was this helpful?
                </div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                  <button onClick={async () => { setCsatRating('good'); setCsatSubmitted(true); try { await chatAPI.submitCsat(chat?.id, 'good'); } catch {} }} style={{
                    padding: '6px 16px', borderRadius: '8px', border: '1px solid #dcfce7',
                    background: '#f0fdf4', cursor: 'pointer', fontSize: '12px', fontWeight: 600, color: '#16a34a',
                  }}>👍 Yes</button>
                  <button onClick={async () => { setCsatRating('bad'); setCsatSubmitted(true); try { await chatAPI.submitCsat(chat?.id, 'bad'); } catch {} }} style={{
                    padding: '6px 16px', borderRadius: '8px', border: '1px solid #fecaca',
                    background: '#fef2f2', cursor: 'pointer', fontSize: '12px', fontWeight: 600, color: '#dc2626',
                  }}>👎 No</button>
                </div>
              </div>
            </div>
          )}
          {csatSubmitted && (
            <div style={{ padding: '0 16px 8px' }}>
              <div style={{ textAlign: 'center', fontSize: '12px', color: '#6b7280', padding: '8px' }}>
                {csatRating === 'good' ? '🎉 Glad we could help!' : '😔 Sorry about that. Let us improve!'}
              </div>
            </div>
          )}

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

          {/* ── Input Area ── */}
          {(
            <div style={{
              borderTop: '1px solid #e8e8e8',
              padding: '12px 16px',
              background: 'white',
              flexShrink: 0,
              display: 'flex',
              gap: '8px',
              alignItems: 'flex-end',
            }}>
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
                onClick={handleSend}
                disabled={!inputValue.trim() || chatLoading}
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
                {chatLoading ? (
                  <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <Send size={16} />
                )}
              </button>
            </div>
          )}
        </div>
      )}

      <style>{`
        .chat-float-btn {
          bottom: 88px;
        }
        .chat-float-window {
          bottom: 156px !important;
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
          }
          .chat-float-window {
            bottom: 92px !important;
          }
        }
      `}</style>
    </>
  );
}
