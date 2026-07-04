/**
 * Socket.io Client Service
 * Manages WebSocket connection for real-time updates.
 */

import { io } from 'socket.io-client';

// Extract just the origin (protocol + host + port) to avoid path-based namespace issues
// Note: Only connect if VITE_SOCKET_URL is explicitly set (Laravel-only mode doesn't run socket.io)
function getSocketOrigin() {
  const raw = import.meta.env.VITE_SOCKET_URL;
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.origin;
  } catch {
    return raw;
  }
}

const SOCKET_URL = getSocketOrigin();

let socket = null;
let listeners = {};

/**
 * Get auth token from localStorage (handles both admin and user tokens)
 */
function getToken() {
  return localStorage.getItem('adminToken') || localStorage.getItem('authToken');
}

/**
 * Initialize the socket connection with JWT authentication.
 * Call this once when the app loads (or when user logs in).
 */
export function connectSocket() {
  // Don't reconnect if already connected or connecting
  if (socket?.connected) return socket;
  if (socket?.connecting) return socket;

  // No socket.io server configured — silently skip
  if (!SOCKET_URL) return null;

  const token = getToken();
  if (!token) return null;

  try {
    // Suppress socket.io-client's internal debug logging
    // Use polling first, then websocket — avoids raw WS error spam in console
    socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 3000,
      reconnectionDelayMax: 10000,
      timeout: 5000,
    });

    socket.on('connect', () => {
      console.debug('[Socket] Connected:', socket.id);
    });

    socket.on('disconnect', (reason) => {
      if (reason !== 'transport close') {
        console.debug('[Socket] Disconnected:', reason);
      }
    });

    socket.on('connect_error', () => {
      // Silently handled — no console noise
    });

    socket.on('reconnect', (attempt) => {
      console.debug('[Socket] Reconnected after', attempt, 'attempts');
    });

    // Register any pending listeners
    Object.entries(listeners).forEach(([event, handlers]) => {
      handlers.forEach((handler) => {
        socket.off(event, handler);
        socket.on(event, handler);
      });
    });

    return socket;
  } catch (error) {
    console.warn('[Socket] Failed to create connection:', error);
    return null;
  }
}

/**
 * Disconnect the socket connection.
 */
export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
    listeners = {};
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
  listeners[event].push(handler);

  if (socket) {
    socket.on(event, handler);
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
