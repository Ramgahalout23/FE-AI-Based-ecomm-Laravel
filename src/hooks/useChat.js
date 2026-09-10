/**
 * useChat — React hook for managing live chat state and socket events.
 * Uses direct socket.io connection (same approach as admin ChatPanel).
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { chatAPI } from '../api/tickets';
import { connectSocket, onSocketEvent } from '../services/socketService';

function normalizeMsg(msg) {
  if (!msg) return msg;
  return {
    ...msg,
    isFromAdmin: msg.isFromAdmin !== undefined ? msg.isFromAdmin : !!msg.is_from_admin,
    createdAt: msg.createdAt || msg.created_at,
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
  const [chatMode, setChatMode] = useState('ai');
  const typingTimeoutRef = useRef(null);

  const sessionIdRef = useRef(
    localStorage.getItem('chatSessionId') || `anon-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  );

  // Persist session ID
  useEffect(() => {
    localStorage.setItem('chatSessionId', sessionIdRef.current);
  }, []);

  // Stable refs for callbacks — always up-to-date without re-creating callbacks
  const chatRef = useRef(null);
  const messagesRef = useRef([]);
  useEffect(() => { chatRef.current = chat; }, [chat]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  /** Initialize or resume an existing chat */
  const initChat = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sid = sessionIdRef.current;
      console.log('[Chat] initChat with sessionId:', sid);
      const res = await chatAPI.initChat(sid);
      const ticket = res.data?.data || res.data;
      console.log('[Chat] initChat response:', ticket?.id, 'chatMode:', ticket?.chatMode);
      setChat(ticket);
      chatRef.current = ticket;
      if (ticket?.chatMode) setChatMode(ticket.chatMode);
      const list = ticket?.messages || ticket?.ticketmessage || [];
      setMessages(Array.isArray(list) ? list.map(normalizeMsg) : []);
      return ticket;
    } catch (err) {
      console.error('[Chat] initChat failed:', err.message);
      const msg = err.response?.data?.message || 'Failed to start chat';
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /** Send a message — uses refs so it always works without re-creating */
  const sendMessage = useCallback(async (content) => {
    const chatId = chatRef.current?.id;
    const sid = sessionIdRef.current;
    console.log('[Chat] sendMessage called. chatId:', chatId, 'sessionId:', sid, 'content:', content?.substring(0, 30));

    if (!chatId) {
      console.warn('[Chat] sendMessage: no chatId — chat not initialized');
      return null;
    }
    if (!content?.trim()) {
      console.warn('[Chat] sendMessage: empty content');
      return null;
    }

    try {
      const res = await chatAPI.sendMessage(chatId, content.trim(), sid);
      const raw = res.data?.data || res.data;
      const newMsg = normalizeMsg(raw);
      console.log('[Chat] sendMessage success:', newMsg?.id);
      return newMsg;
    } catch (err) {
      console.error('[Chat] sendMessage failed:', err.response?.status, err.message);
      const msg = err.response?.data?.message || 'Failed to send message';
      setError(msg);
      return null;
    }
  }, []);

  /** Send typing indicator */
  const sendTyping = useCallback((isTyping) => {
    const chatId = chatRef.current?.id;
    if (!chatId) return;
    chatAPI.sendTyping(chatId, isTyping).catch(() => {});
  }, []);

  /** Handle incoming message from socket */
  const handleIncomingMessage = useCallback((data) => {
    const currentChatId = chatRef.current?.id;
    if (data.ticketId === currentChatId && data.message) {
      setMessages(prev => {
        const incoming = data.message;
        // Dedup 1: exact ID match
        if (prev.some(m => m.id === incoming.id)) return prev;
        // Dedup 2: optimistic temp message with same content from same sender
        // (socket arrives before replaceMessage completes)
        if (prev.some(m =>
          m.id?.startsWith('temp-') &&
          m.content === incoming.content &&
          m.isFromAdmin === incoming.isFromAdmin
        )) return prev;
        return [...prev, normalizeMsg(incoming)];
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
    const socket = connectSocket();
    if (!socket) return;

    const onConnect = () => setSocketConnected(true);
    const onDisconnect = () => setSocketConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    if (socket.connected) setSocketConnected(true);

    const unsubMsg = onSocketEvent('chat:message', handleIncomingMessage);
    const unsubTyping = onSocketEvent('chat:typing', handleTyping);
    const unsubAdminTyping = onSocketEvent('chat:admin:typing', handleTyping);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      unsubMsg();
      unsubTyping();
      unsubAdminTyping();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  /** Start a fresh conversation — close current ticket and create new one */
  const newConversation = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sid = sessionIdRef.current;
      console.log('[Chat] Starting new conversation, sessionId:', sid);
      const res = await chatAPI.startNewConversation(sid);
      const ticket = res.data?.data || res.data;
      console.log('[Chat] New conversation:', ticket?.id);
      setChat(ticket);
      chatRef.current = ticket;
      if (ticket?.chatMode) setChatMode(ticket.chatMode);
      const list = ticket?.messages || ticket?.ticketmessage || [];
      setMessages(Array.isArray(list) ? list.map(normalizeMsg) : []);
      setIsTyping(false);
      setIsAiTyping(false);
      setTypingName('');
      return ticket;
    } catch (err) {
      console.error('[Chat] newConversation failed:', err.message);
      const msg = err.response?.data?.message || 'Failed to start new conversation';
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /** Reset chat */
  const resetChat = useCallback(() => {
    setChat(null);
    chatRef.current = null;
    setMessages([]);
    setIsTyping(false);
    setTypingName('');
    setError(null);
  }, []);

  /** Add an optimistic message to the list */
  const addMessage = useCallback((msg) => {
    setMessages(prev => [...prev, msg]);
  }, []);

  /** Replace a temp message with the real server message */
  const replaceMessage = useCallback((tempId, realMsg) => {
    setMessages(prev => prev.map(m => m.id === tempId ? realMsg : m));
  }, []);

  /** Remove a temp message (on send failure) */
  const removeMessage = useCallback((tempId) => {
    setMessages(prev => prev.filter(m => m.id !== tempId));
  }, []);

  return {
    chat,
    messages,
    loading,
    error,
    isTyping,
    isAiTyping,
    typingName,
    chatMode,
    initChat,
    newConversation,
    sendMessage,
    sendTyping,
    resetChat,
    addMessage,
    replaceMessage,
    removeMessage,
    isSocketConnected: socketConnected,
  };
}
