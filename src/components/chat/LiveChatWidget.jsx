/**
 * LiveChatWidget
 * Floating chat widget that appears at the bottom-right of the storefront.
 * Uses existing support ticket system for persistence and Socket.io for real-time messaging.
 */

import { X, Send, RefreshCw, Minus, MessageCircle, AlertCircle } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { formatTime } from '../../utils/formatters';

;
import useChat from '../../hooks/useChat';
import useAuthStore from '../../store/authStore';
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
  const { isAuthenticated, user } = useAuthStore();
  const {
    chat, messages, loading, error, isTyping, typingName,
    initChat, sendMessage, sendTyping, resetChat,
  } = useChat();

  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
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

  // Initialize chat when opened (for authenticated users)
  const handleOpen = useCallback(async () => {
    setIsOpen(true);
    setHasUnread(false);

    if (!isAuthenticated) return;

    if (!chat) {
      setChatLoading(true);
      await initChat();
      setChatLoading(false);
    }
  }, [isAuthenticated, chat, initChat]);

  // Send a message
  const handleSend = useCallback(async () => {
    if (!inputValue.trim()) return;

    const content = inputValue.trim();
    setInputValue('');
    setChatLoading(true);

    // Send typing indicator (stopped)
    sendTyping(false);

    const result = await sendMessage(content);
    setChatLoading(false);

    if (!result) {
      toast.error('Failed to send message');
    }
  }, [inputValue, sendMessage, sendTyping]);

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

  // If not authenticated, show login prompt
  const showLoginPrompt = !isAuthenticated;

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
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
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

      {/* ─── Chat Window ─── */}
      {isOpen && (
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
                background: '#22c55e',
                boxShadow: '0 0 8px rgba(34, 197, 94, 0.5)',
                animation: 'chatPulse 2s ease-in-out infinite',
              }} />
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700 }}>Live Support</div>
                <div style={{ fontSize: '11px', opacity: 0.7 }}>We typically reply in minutes</div>
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
            {/* Login Prompt */}
            {showLoginPrompt ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                textAlign: 'center',
                padding: '24px',
                gap: '16px',
              }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: '#e8e8e8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '28px',
                }}>
                  💬
                </div>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#1a1a1a', marginBottom: '4px' }}>
                    Chat with us!
                  </div>
                  <div style={{ fontSize: '13px', color: '#666', lineHeight: 1.4 }}>
                    Sign in to start a conversation with our support team.
                  </div>
                </div>
                <Link
                  to="/login"
                  style={{
                    display: 'inline-block',
                    padding: '10px 32px',
                    borderRadius: '10px',
                    background: '#1a1a1a',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: 600,
                    textDecoration: 'none',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#333'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#1a1a1a'; }}
                >
                  Sign In to Chat
                </Link>
              </div>
            ) : chatLoading && !chat ? (
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
                <div style={{ fontSize: '36px' }}>👋</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#1a1a1a' }}>
                  How can we help you today?
                </div>
                <div style={{ fontSize: '13px', color: '#666', lineHeight: 1.4 }}>
                  Send us a message and our team will get back to you shortly.
                </div>
              </div>
            ) : (
              <>
                {/* Date groups */}
                {Object.entries(groupMessagesByDate(messages)).map(([dateStr, msgs]) => (
                  <div key={dateStr}>
                    <div style={{
                      textAlign: 'center',
                      fontSize: '11px',
                      color: '#999',
                      margin: '8px 0',
                      fontWeight: 600,
                    }}>
                      {getDateLabel(dateStr)}
                    </div>
                    {msgs.map((msg) => (
                      <div
                        key={msg.id}
                        style={{
                          display: 'flex',
                          justifyContent: msg.isFromAdmin ? 'flex-start' : 'flex-end',
                          marginBottom: '4px',
                        }}
                      >
                        <div style={{
                          maxWidth: '80%',
                          padding: '8px 14px',
                          borderRadius: msg.isFromAdmin
                            ? '4px 16px 16px 16px'
                            : '16px 4px 16px 16px',
                          background: msg.isFromAdmin ? '#e8e8e8' : '#1a1a1a',
                          color: msg.isFromAdmin ? '#1a1a1a' : 'white',
                          fontSize: '14px',
                          lineHeight: 1.4,
                          wordBreak: 'break-word',
                        }}>
                          <div>{msg.content}</div>
                          <div style={{
                            fontSize: '10px',
                            opacity: 0.6,
                            marginTop: '4px',
                            textAlign: 'right',
                          }}>
                            {formatTime(msg.createdAt)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}

                {/* Typing indicator */}
                {isTyping && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'flex-start',
                    marginBottom: '4px',
                  }}>
                    <div style={{
                      padding: '10px 14px',
                      borderRadius: '4px 16px 16px 16px',
                      background: '#e8e8e8',
                      display: 'flex',
                      gap: '4px',
                      alignItems: 'center',
                    }}>
                      <span className="chat-dot-pulse" style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#888' }} />
                      <span className="chat-dot-pulse" style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#888' }} />
                      <span className="chat-dot-pulse" style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#888' }} />
                      <span style={{ fontSize: '10px', color: '#888', marginLeft: '4px' }}>
                        {typingName || 'Support'}
                      </span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* ── Input Area ── */}
          {!showLoginPrompt && (
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
