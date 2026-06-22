/**
 * useChat — React hook for managing live chat state and socket events.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { chatAPI } from '../api/tickets';
import { onSocketEvent, isConnected } from '../services/socketService';

export default function useChat() {
  const [chat, setChat] = useState(null);           // Current chat ticket
  const [messages, setMessages] = useState([]);      // Messages array
  const [loading, setLoading] = useState(false);      // Loading state
  const [error, setError] = useState(null);           // Error state
  const [isTyping, setIsTyping] = useState(false);    // Someone is typing
  const [typingName, setTypingName] = useState('');   // Who is typing
  const typingTimeoutRef = useRef(null);

  /** Initialize or resume an existing chat */
  const initChat = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await chatAPI.initChat();
      const ticket = res.data?.data || res.data;
      setChat(ticket);
      setMessages(ticket?.ticketmessage || []);
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
      const res = await chatAPI.sendMessage(chat.id, content.trim());
      const newMsg = res.data?.data || res.data;
      setMessages(prev => [...prev, newMsg]);
      return newMsg;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to send message';
      setError(msg);
      return null;
    }
  }, [chat?.id]);

  /** Send typing indicator */
  const sendTyping = useCallback((isUserTyping) => {
    if (!chat?.id) return;
    chatAPI.sendTyping(chat.id, isUserTyping).catch(() => {});
  }, [chat?.id]);

  /** Handle incoming message from socket */
  const handleIncomingMessage = useCallback((data) => {
    // Only handle messages for the current chat
    if (data.ticketId === chat?.id && data.message) {
      setMessages(prev => {
        // Avoid duplicates
        if (prev.some(m => m.id === data.message.id)) return prev;
        return [...prev, data.message];
      });
    }
  }, [chat?.id]);

  /** Handle typing indicator from socket */
  const handleTyping = useCallback((data) => {
    if (data.ticketId === chat?.id) {
      if (data.isTyping) {
        setIsTyping(true);
        setTypingName(data.senderName || 'Someone');
        // Auto-clear typing after 3 seconds
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          setIsTyping(false);
          setTypingName('');
        }, 3000);
      } else {
        setIsTyping(false);
        setTypingName('');
      }
    }
  }, [chat?.id]);

  /** Subscribe to socket events */
  useEffect(() => {
    const unsubMessage = onSocketEvent('chat:message', handleIncomingMessage);
    const unsubTyping = onSocketEvent('chat:typing', handleTyping);
    const unsubAdminTyping = onSocketEvent('chat:admin:typing', handleTyping);

    return () => {
      unsubMessage();
      unsubTyping();
      unsubAdminTyping();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [handleIncomingMessage, handleTyping]);

  /** Close/reset the chat */
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
    typingName,
    initChat,
    sendMessage,
    sendTyping,
    resetChat,
    isSocketConnected: isConnected(),
  };
}
