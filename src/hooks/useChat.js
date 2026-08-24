/**
 * useChat — React hook for managing live chat state and socket events.
 * Uses direct socket.io connection (same approach as admin ChatPanel).
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { chatAPI } from '../api/tickets';

// ── Singleton store connection ──
let storeSocket = null;
let storeSocketListeners = {};

function getStoreSocket() {
  // Return existing connected socket
  if (storeSocket?.connected) return storeSocket;
  if (storeSocket?.connecting) return storeSocket;

  const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';
  const sessionId = localStorage.getItem('chatSessionId') || `anon-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  localStorage.setItem('chatSessionId', sessionId);

  try {
    storeSocket = io(socketUrl, {
      auth: { sessionId },
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 5000,
    });

    storeSocket.on('connect', () => {
      console.log('[Chat] Socket connected:', storeSocket.id);
    });

    storeSocket.on('disconnect', (reason) => {
      console.log('[Chat] Socket disconnected:', reason);
    });

    storeSocket.on('connect_error', (err) => {
      console.warn('[Chat] Socket connection error:', err.message);
    });

    // Re-register any pending listeners
    Object.entries(storeSocketListeners).forEach(([event, handlers]) => {
      handlers.forEach((handler) => {
        storeSocket.off(event, handler);
        storeSocket.on(event, handler);
      });
    });

    return storeSocket;
  } catch (error) {
    console.warn('[Chat] Failed to create socket:', error);
    return null;
  }
}

function onChatEvent(event, handler) {
  if (!storeSocketListeners[event]) storeSocketListeners[event] = [];
  storeSocketListeners[event].push(handler);

  if (storeSocket) {
    storeSocket.on(event, handler);
  }

  return () => {
    if (storeSocket) storeSocket.off(event, handler);
    if (storeSocketListeners[event]) {
      storeSocketListeners[event] = storeSocketListeners[event].filter((h) => h !== handler);
    }
  };
}

export default function useChat() {
  const [chat, setChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [typingName, setTypingName] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const typingTimeoutRef = useRef(null);

  const sessionIdRef = useRef(
    localStorage.getItem('chatSessionId') || `anon-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  );

  // Persist session ID
  useEffect(() => {
    localStorage.setItem('chatSessionId', sessionIdRef.current);
  }, []);

  /** Initialize or resume an existing chat */
  const initChat = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await chatAPI.initChat(sessionIdRef.current);
      const ticket = res.data?.data || res.data;
      setChat(ticket);
      const list = ticket?.messages || ticket?.ticketmessage || [];
      setMessages(Array.isArray(list) ? list.map(normalizeMsg) : []);
      return ticket;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to start chat';
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /** Send a message */
  const sendMessage = useCallback(async (content) => {
    if (!chat?.id || !content?.trim()) return null;
    try {
      const res = await chatAPI.sendMessage(chat.id, content.trim(), sessionIdRef.current);
      const newMsg = normalizeMsg(res.data?.data || res.data);
      // Don't add optimistically — socket will deliver it
      return newMsg;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to send message';
      setError(msg);
      return null;
    }
  }, [chat?.id]);

  /** Send typing indicator */
  const sendTyping = useCallback((isTyping) => {
    if (!chat?.id) return;
    chatAPI.sendTyping(chat.id, isTyping).catch(() => {});
  }, [chat?.id]);

  // Keep chat ref for socket callbacks
  const chatRef = useRef(null);
  useEffect(() => { chatRef.current = chat; }, [chat]);

  /** Handle incoming message from socket */
  const handleIncomingMessage = useCallback((data) => {
    if (data.ticketId === chatRef.current?.id && data.message) {
      setMessages(prev => {
        if (prev.some(m => m.id === data.message.id)) return prev;
        return [...prev, normalizeMsg(data.message)];
      });
    }
  }, []);

  /** Handle typing indicator from socket */
  const handleTyping = useCallback((data) => {
    if (data.ticketId === chatRef.current?.id) {
      const isAi = data.senderId === 'ai-chatbot';
      if (data.isTyping) {
        if (isAi) {
          setIsAiTyping(true);
        } else {
          setIsTyping(true);
          setTypingName(data.senderName || 'Someone');
        }
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          setIsTyping(false);
          setIsAiTyping(false);
          setTypingName('');
        }, 3000);
      } else {
        if (isAi) {
          setIsAiTyping(false);
        } else {
          setIsTyping(false);
          setTypingName('');
        }
      }
    }
  }, []);

  /** Connect socket and subscribe to events — once */
  useEffect(() => {
    const socket = getStoreSocket();
    if (!socket) return;

    const onConnect = () => setSocketConnected(true);
    const onDisconnect = () => setSocketConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    if (socket.connected) setSocketConnected(true);

    const unsubMsg = onChatEvent('chat:message', handleIncomingMessage);
    const unsubTyping = onChatEvent('chat:typing', handleTyping);
    const unsubAdminTyping = onChatEvent('chat:admin:typing', handleTyping);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      unsubMsg();
      unsubTyping();
      unsubAdminTyping();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  /** Reset chat */
  const resetChat = useCallback(() => {
    setChat(null);
    setMessages([]);
    setIsTyping(false);
    setTypingName('');
    setError(null);
  }, []);

  return {
    chat,
    messages,
    loading,
    error,
    isTyping,
    isAiTyping,
    typingName,
    initChat,
    sendMessage,
    sendTyping,
    resetChat,
    isSocketConnected: socketConnected,
  };
}

// ── Helpers ──

function normalizeMsg(msg) {
  if (!msg) return msg;
  return {
    ...msg,
    isFromAdmin: msg.isFromAdmin !== undefined ? msg.isFromAdmin : !!msg.is_from_admin,
    createdAt: msg.createdAt || msg.created_at,
  };
}
