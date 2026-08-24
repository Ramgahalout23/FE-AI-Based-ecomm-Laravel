/**
 * ChatPanel — Professional admin real-time chat panel.
 * Direct socket.io connection with typing indicators, online status, and modern UI.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, Send, RefreshCw, Bot, Headphones, X, CheckCircle, Phone, MoreVertical, ArrowLeft, Circle } from 'lucide-react';
import { chatAPI } from '../../api/tickets';
import { formatTime } from '../../utils/formatters';
import toast from '../../utils/toast';
import { io } from 'socket.io-client';

let adminSocket = null;

function getAdminSocket() {
  if (adminSocket?.connected) return adminSocket;
  const token = localStorage.getItem('adminToken');
  const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';
  if (!token) return null;
  adminSocket = io(socketUrl, { auth: { token }, transports: ['polling', 'websocket'], reconnection: true, reconnectionAttempts: 5, reconnectionDelay: 1000 });
  return adminSocket;
}

function StatusBadge({ status }) {
  const map = {
    OPEN: { color: '#22c55e', bg: '#dcfce7', label: 'Active' },
    IN_PROGRESS: { color: '#2563eb', bg: '#dbeafe', label: 'In Progress' },
    WAITING_CUSTOMER: { color: '#f59e0b', bg: '#fef3c7', label: 'Waiting' },
    RESOLVED: { color: '#6b7280', bg: '#f3f4f6', label: 'Resolved' },
    CLOSED: { color: '#9ca3af', bg: '#f9fafb', label: 'Closed' },
  };
  const s = map[status] || map.OPEN;
  return <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '0.65rem', fontWeight: 600, background: s.bg, color: s.color }}>{s.label}</span>;
}

function TypingIndicator({ name }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px' }}>
      <div style={{ display: 'flex', gap: '3px' }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#9ca3af', animation: `typingBounce 1.4s ease-in-out ${i * 0.2}s infinite` }} />
        ))}
      </div>
      <span style={{ fontSize: '12px', color: '#9ca3af', fontStyle: 'italic' }}>{name || 'Someone'} is typing...</span>
    </div>
  );
}

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
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef({});
  const selectedChatRef = useRef(null);
  // Keep ref in sync with state
  useEffect(() => { selectedChatRef.current = selectedChat; }, [selectedChat]);

  const loadConversations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await chatAPI.getAdminConversations({ page: 1, limit: 50 });
      const data = res.data?.data;
      const items = data?.items || data || [];
      setConversations(items);
      // Extract last messages
      const lm = {};
      items.forEach(c => {
        if (c.ticketmessage?.length > 0) {
          const last = c.ticketmessage[c.ticketmessage.length - 1];
          lm[c.id] = last.content;
        }
      });
      setLastMessages(lm);
    } catch (err) { console.warn(err); } finally { setLoading(false); }
  }, []);

  const loadChatMode = useCallback(async () => {
    try { const res = await chatAPI.getChatStats(); setChatMode(res.data?.data?.chatMode || 'ai'); } catch {}
  }, []);

  const handleSwitchMode = async () => {
    const newMode = chatMode === 'ai' ? 'live' : 'ai';
    setModeLoading(true);
    try { await chatAPI.setChatMode(newMode); setChatMode(newMode); toast.success(`Mode: ${newMode === 'ai' ? 'AI' : 'Live'}`); } catch { toast.error('Failed'); } finally { setModeLoading(false); }
  };

  const loadMessages = useCallback(async (ticketId) => {
    setMessagesLoading(true);
    try { const res = await chatAPI.adminGetMessages(ticketId); setMessages(res.data?.data?.messages || []); } catch { setMessages([]); } finally { setMessagesLoading(false); }
  }, []);

  const handleSelectChat = useCallback(async (conv) => {
    setSelectedChat(conv);
    await loadMessages(conv.id);
    inputRef.current?.focus();
  }, [loadMessages]);

  const handleSend = async () => {
    if (!inputValue.trim() || !selectedChat) return;
    setSending(true);
    const content = inputValue.trim();
    setInputValue('');
    try {
      const res = await chatAPI.adminSendMessage(selectedChat.id, content);
      // Optimistically add admin message on the right side
      const msgData = res.data?.data;
      if (msgData) {
        setMessages(prev => {
          if (prev.some(m => m.id === msgData.id)) return prev;
          return [...prev, { ...msgData, isFromAdmin: true }];
        });
      }
    } catch { toast.error('Failed'); setInputValue(content); } finally { setSending(false); }
  };

  const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } };

  // Socket — register listeners once, use refs for stale closures
  useEffect(() => {
    const socket = getAdminSocket();
    if (!socket) return;

    const onConnect = () => setSocketConnected(true);
    const onDisconnect = () => setSocketConnected(false);
    const onChatMessage = (data) => {
      const current = selectedChatRef.current;
      if (current && data.ticketId === current.id && data.message) {
        setMessages(prev => {
          const msg = data.message;
          if (!msg) return prev;
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
      loadConversations();
    };
    const onTyping = (data) => {
      if (data.isAdmin) return;
      setTypingUsers(prev => {
        const next = { ...prev };
        if (data.isTyping) {
          next[data.ticketId] = { name: data.senderName, timeout: Date.now() };
        } else {
          delete next[data.ticketId];
        }
        return next;
      });
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('chat:message', onChatMessage);
    socket.on('chat:typing', onTyping);
    if (socket.connected) setSocketConnected(true);

    return () => { socket.off('connect', onConnect); socket.off('disconnect', onDisconnect); socket.off('chat:message', onChatMessage); socket.off('chat:typing', onTyping); };
  }, []);

  useEffect(() => { loadConversations(); loadChatMode(); }, [loadConversations, loadChatMode]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Auto-clear typing after 3s
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setTypingUsers(prev => {
        const next = { ...prev };
        let changed = false;
        Object.entries(next).forEach(([k, v]) => { if (now - v.timeout > 3000) { delete next[k]; changed = true; } });
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 180px)', minHeight: '600px', background: '#f0f2f5', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
      {/* Left Panel — Conversations */}
      <div style={{ width: '340px', background: 'white', borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #f3f4f6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#111' }}>Live Chat</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                <Circle size={8} fill={socketConnected ? '#22c55e' : '#ef4444'} color={socketConnected ? '#22c55e' : '#ef4444'} />
                <span style={{ fontSize: '11px', color: socketConnected ? '#22c55e' : '#ef4444', fontWeight: 600 }}>{socketConnected ? 'Connected' : 'Disconnected'}</span>
              </div>
            </div>
            <button onClick={loadConversations} style={{ width: '36px', height: '36px', borderRadius: '10px', border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#f9fafb'; e.currentTarget.style.borderColor = '#d1d5db'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#e5e7eb'; }}>
              <RefreshCw size={15} />
            </button>
          </div>
          {/* Mode Toggle */}
          <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: '12px', padding: '3px', gap: '3px' }}>
            <button onClick={handleSwitchMode} disabled={modeLoading} style={{ flex: 1, padding: '10px 0', borderRadius: '10px', border: 'none', cursor: 'pointer', background: chatMode === 'ai' ? 'white' : 'transparent', boxShadow: chatMode === 'ai' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none', fontWeight: 700, fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: chatMode === 'ai' ? '#6366f1' : '#9ca3af', transition: 'all 0.2s' }}>
              <Bot size={16} /> AI {chatMode === 'ai' ? 'ON' : 'OFF'}
            </button>
            <button onClick={handleSwitchMode} disabled={modeLoading} style={{ flex: 1, padding: '10px 0', borderRadius: '10px', border: 'none', cursor: 'pointer', background: chatMode === 'live' ? 'white' : 'transparent', boxShadow: chatMode === 'live' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none', fontWeight: 700, fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: chatMode === 'live' ? '#22c55e' : '#9ca3af', transition: 'all 0.2s' }}>
              <Headphones size={16} /> Live {chatMode === 'live' ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        {/* Conversations */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center' }}><RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', color: '#d1d5db' }} /></div>
          ) : conversations.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}><MessageCircle size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} /><p style={{ fontWeight: 600 }}>No conversations</p><p style={{ fontSize: '12px' }}>Waiting for customers to start chatting</p></div>
          ) : (
            conversations.map((conv) => {
              const isActive = selectedChat?.id === conv.id;
              const hasTyping = typingUsers[conv.id];
              return (
                <div key={conv.id} onClick={() => handleSelectChat(conv)} style={{ padding: '14px 20px', cursor: 'pointer', background: isActive ? '#eff6ff' : 'transparent', borderLeft: isActive ? '3px solid #3b82f6' : '3px solid transparent', transition: 'all 0.15s' }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#f9fafb'; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flex: 1, minWidth: 0 }}>
                      <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'linear-gradient(135deg, #667eea, #764ba2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '14px', flexShrink: 0 }}>
                        {(conv.user?.firstName?.[0] || 'G').toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 600, fontSize: '13px', color: '#111' }}>{conv.user?.firstName} {conv.user?.lastName || 'Guest'}</span>
                          <span style={{ fontSize: '10px', color: '#9ca3af' }}>{conv.updatedAt ? formatTime(conv.updatedAt) : ''}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                          {hasTyping ? (
                            <span style={{ fontSize: '11px', color: '#6366f1', fontWeight: 500, fontStyle: 'italic' }}>typing...</span>
                          ) : (
                            <span style={{ fontSize: '12px', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>
                              {lastMessages[conv.id]?.substring(0, 40) || conv.subject || 'New conversation'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Panel — Chat */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#e5ddd5', backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23d1c4b8\' fill-opacity=\'0.15\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}>
        {!selectedChat ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center', color: '#6b7280' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                <MessageCircle size={36} color="#d1d5db" />
              </div>
              <p style={{ fontWeight: 700, fontSize: '16px', color: '#374151' }}>Select a conversation</p>
              <p style={{ fontSize: '13px', marginTop: '4px' }}>Click a chat on the left to start responding</p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div style={{ padding: '14px 20px', background: 'white', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #667eea, #764ba2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '14px' }}>
                  {(selectedChat.user?.firstName?.[0] || 'G').toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '14px' }}>{selectedChat.user?.firstName} {selectedChat.user?.lastName || 'Guest'}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#6b7280' }}>{selectedChat.user?.email}</span>
                    <StatusBadge status={selectedChat.status} />
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button onClick={() => { chatAPI.updateChatStatus(selectedChat.id, 'RESOLVED'); toast.success('Resolved'); loadConversations(); setSelectedChat(null); }}
                  style={{ padding: '8px 14px', borderRadius: '10px', border: '1px solid #dcfce7', background: '#f0fdf4', cursor: 'pointer', fontSize: '12px', fontWeight: 600, color: '#16a34a', display: 'flex', alignItems: 'center', gap: '4px', transition: 'all 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#dcfce7'} onMouseLeave={e => e.currentTarget.style.background = '#f0fdf4'}>
                  <CheckCircle size={13} /> Resolve
                </button>
                <button onClick={() => { setSelectedChat(null); setMessages([]); }}
                  style={{ width: '36px', height: '36px', borderRadius: '10px', border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {messagesLoading ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', color: '#9ca3af' }} /></div>
              ) : (
                <>
                  {/* Date separator */}
                  <div style={{ textAlign: 'center', margin: '8px 0 16px' }}>
                    <span style={{ background: 'rgba(0,0,0,0.06)', padding: '4px 12px', borderRadius: '8px', fontSize: '11px', color: '#6b7280', fontWeight: 500 }}>
                      {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                    </span>
                  </div>

                  {messages.map((msg, idx) => {
                    const isAdmin = msg.isFromAdmin;
                    const isAI = msg.senderId === 'ai-chatbot';
                    const showAvatar = idx === 0 || messages[idx - 1]?.isFromAdmin !== msg.isFromAdmin;
                    return (
                      <div key={`${msg.id}-${idx}`} style={{ display: 'flex', justifyContent: isAdmin ? 'flex-end' : 'flex-start', marginBottom: '2px', alignItems: 'flex-end', gap: '8px', flexDirection: isAdmin ? 'row-reverse' : 'row' }}>
                        {!isAdmin && showAvatar && (
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #667eea, #764ba2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '12px', flexShrink: 0 }}>
                            {(selectedChat.user?.firstName?.[0] || 'G').toUpperCase()}
                          </div>
                        )}
                        {!isAdmin && !showAvatar && <div style={{ width: '32px' }} />}
                        <div style={{ maxWidth: '65%' }}>
                          {isAI && (
                            <div style={{ fontSize: '10px', color: '#6366f1', fontWeight: 700, marginBottom: '2px', paddingLeft: '4px' }}>🤖 AI Assistant</div>
                          )}
                          <div style={{
                            padding: '10px 14px', borderRadius: isAdmin ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                            background: isAdmin ? '#dcf8c6' : 'white', color: '#111', fontSize: '14px', lineHeight: 1.5,
                            boxShadow: '0 1px 2px rgba(0,0,0,0.06)', wordBreak: 'break-word',
                          }}>
                            <div style={{ whiteSpace: 'pre-line' }}>{msg.content}</div>
                          </div>
                          <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px', paddingLeft: '4px', textAlign: isAdmin ? 'right' : 'left' }}>
                            {formatTime(msg.createdAt)} {isAdmin && '✓'}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Typing indicator */}
                  {typingUsers[selectedChat.id] && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #667eea, #764ba2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '12px' }}>
                        {(selectedChat.user?.firstName?.[0] || 'G').toUpperCase()}
                      </div>
                      <div style={{ background: 'white', padding: '10px 16px', borderRadius: '18px 18px 18px 4px', boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}>
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                          {[0, 1, 2].map(i => <div key={i} style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#9ca3af', animation: `typingBounce 1.4s ease-in-out ${i * 0.2}s infinite` }} />)}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div style={{ padding: '14px 20px', background: '#f0f2f5', borderTop: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', background: 'white', borderRadius: '12px', padding: '8px 12px', border: '1px solid #e5e7eb' }}>
                <textarea ref={inputRef} value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={handleKeyDown}
                  placeholder={chatMode === 'ai' ? 'AI is handling this chat...' : 'Type your reply...'}
                  rows={1} disabled={chatMode === 'ai'}
                  style={{ flex: 1, border: 'none', outline: 'none', fontSize: '14px', fontFamily: 'inherit', resize: 'none', lineHeight: 1.4, padding: '4px 0', background: 'transparent', color: chatMode === 'ai' ? '#9ca3af' : '#111' }} />
                <button onClick={handleSend} disabled={!inputValue.trim() || sending || chatMode === 'ai'}
                  style={{ width: '42px', height: '42px', borderRadius: '10px', border: 'none', cursor: inputValue.trim() && chatMode !== 'ai' ? 'pointer' : 'default', background: inputValue.trim() && chatMode !== 'ai' ? '#2563eb' : '#e5e7eb', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' }}>
                  {sending ? <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={16} />}
                </button>
              </div>
              {chatMode === 'ai' && <div style={{ textAlign: 'center', fontSize: '11px', color: '#9ca3af', marginTop: '6px' }}>AI is auto-responding • Switch to Live mode to reply manually</div>}
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
