/**
 * Socket.io Client Service
 * Manages WebSocket connection for real-time updates.
 */

import { io } from 'socket.io-client';

// Extract just the origin (protocol + host + port)
function getSocketOrigin() {
  // Production default on threvolt.com — always target the Hostinger Node.js API backend
  if (typeof window !== 'undefined' && window.location.hostname.includes('threvolt.com')) {
    return 'https://api.threvolt.com';
  }

  const raw = import.meta.env.VITE_SOCKET_URL;
  if (raw && !raw.includes('onrender.com')) {
    try {
      return new URL(raw).origin;
    } catch {
      return raw;
    }
  }

  // Auto-detect from current page URL for local dev
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return 'http://localhost:3000';
  }

  const apiBase = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
  if (apiBase) {
    try {
      return new URL(apiBase).origin;
    } catch { /* ignore */ }
  }

  return 'https://api.threvolt.com';
}

const SOCKET_URL = getSocketOrigin();

let socket = null;
let lastUsedToken = undefined;
let listeners = {};

/**
 * Get auth token from localStorage (handles both admin and user tokens)
 */
function getToken() {
  const token = localStorage.getItem('adminToken') || localStorage.getItem('authToken');
  // Filter out non-JWT placeholder strings like 'logged-in'
  if (token && token !== 'logged-in' && token.includes('.')) {
    return token;
  }
  return null;
}

/**
 * Initialize or re-sync the socket connection with JWT authentication.
 */
export function connectSocket(force = false) {
  if (!SOCKET_URL) return null;

  const token = getToken();

  // If already connected with the same token and not forced, reuse existing connection
  if (socket && !force && (socket.connected || socket.connecting) && lastUsedToken === token) {
    return socket;
  }

  // If token changed or forced, disconnect old socket so we can re-authenticate
  if (socket && (lastUsedToken !== token || force)) {
    try {
      socket.disconnect();
    } catch { /* ignore */ }
    socket = null;
  }

  lastUsedToken = token;

  const sessionId = localStorage.getItem('chatSessionId') || `anon-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  localStorage.setItem('chatSessionId', sessionId);

  try {
    // Send both token (for admin/auth) and sessionId (for guest chat fallback)
    socket = io(SOCKET_URL, {
      auth: token ? { token, sessionId } : { sessionId },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected successfully to', SOCKET_URL, 'socketId:', socket.id);
    });

    socket.on('disconnect', (reason) => {
      if (reason !== 'transport close') {
        console.log('[Socket] Disconnected:', reason);
      }
    });

    socket.on('connect_error', (err) => {
      console.warn('[Socket] Connection warning:', err?.message || err);
    });

    socket.on('reconnect', (attempt) => {
      console.log('[Socket] Reconnected after', attempt, 'attempts');
    });

    // Re-attach all registered listeners to the new socket instance
    Object.entries(listeners).forEach(([event, handlers]) => {
      handlers.forEach((handler) => {
        socket.off(event, handler);
        socket.on(event, handler);
      });
    });

    return socket;
  } catch (err) {
    console.warn('[Socket] Failed to initialize socket connection:', err);
    return null;
  }
}

/**
 * Disconnect the socket connection (retains registered event handlers for future connects).
 */
export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
    lastUsedToken = undefined;
  }
}

/**
 * Subscribe to a socket event.
 * Returns an unsubscribe function.
 */
export function onSocketEvent(event, handler) {
  if (!listeners[event]) {
    listeners[event] = [];
  }
  if (!listeners[event].includes(handler)) {
    listeners[event].push(handler);
    if (socket) {
      socket.on(event, handler);
    }
  }

  // Return unsubscribe function
  return () => {
    if (socket) {
      socket.off(event, handler);
    }
    if (listeners[event]) {
      listeners[event] = listeners[event].filter((h) => h !== handler);
    }
  };
}

/**
 * Emit a socket event.
 */
export function emitSocketEvent(event, data) {
  if (socket?.connected) {
    socket.emit(event, data);
  }
}

/**
 * Check if socket is connected.
 */
export function isConnected() {
  return socket?.connected || false;
}

/**
 * Get the current socket ID.
 */
export function getSocketId() {
  return socket?.id || null;
}

export default {
  connectSocket,
  disconnectSocket,
  onSocketEvent,
  emitSocketEvent,
  isConnected,
  getSocketId,
};
