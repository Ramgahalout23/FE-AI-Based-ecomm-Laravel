/**
 * useSocket — React hook for subscribing to socket events.
 * Automatically cleans up listeners on unmount.
 */

import { useState, useEffect, useCallback } from 'react';
import { onSocketEvent, connectSocket } from '../services/socketService';

/**
 * Subscribe to a socket event and call the handler when it fires.
 *
 * @param {string} event - The socket event name (e.g. 'order:statusUpdated')
 * @param {function} handler - Callback invoked with the event payload
 * @param {Array} deps - Optional dependency array for the handler (default: [handler])
 *
 * @example
 * useSocketEvent('order:statusUpdated', (data) => {
 *   console.log('Order updated:', data);
 * });
 */
export function useSocketEvent(event, handler, deps) {
  const stableHandler = useCallback(handler, deps || [handler]);

  useEffect(() => {
    const unsubscribe = onSocketEvent(event, stableHandler);
    return () => unsubscribe();
  }, [event, stableHandler]);
}

/**
 * Subscribe to order status update events.
 *
 * @param {function} onUpdate - Called with { orderId, orderNumber, status, previousStatus, userId, timestamp, summary }
 * @param {Array} deps - Dependency array
 */
export function useOrderStatusUpdates(onUpdate, deps = []) {
  useSocketEvent('order:statusUpdated', onUpdate, deps);
}

/**
 * Subscribe to order cancelled events.
 *
 * @param {function} onCancel - Called with { orderId, orderNumber, status, userId, timestamp, summary }
 * @param {Array} deps - Dependency array
 */
export function useOrderCancelled(onCancel, deps = []) {
  useSocketEvent('order:cancelled', onCancel, deps);
}

/**
 * Subscribe to new order created events.
 *
 * @param {function} onCreated - Called with { orderId, orderNumber, status, userId, timestamp, summary }
 * @param {Array} deps - Dependency array
 */
export function useOrderCreated(onCreated, deps = []) {
  useSocketEvent('order:created', onCreated, deps);
}

/**
 * Reactively track the WebSocket connection state.
 * Returns true when connected, false otherwise.
 * Re-renders the component on connect/disconnect.
 */
/**
 * Subscribe to review created events (for admin badge updates).
 *
 * @param {function} onCreated - Called with { reviewId, productId, userId, rating, title, timestamp }
 * @param {Array} deps - Dependency array
 */
export function useReviewCreated(onCreated, deps = []) {
  useSocketEvent('review:created', onCreated, deps);
}

/**
 * Reactively track the WebSocket connection state.
 * Returns true when connected, false otherwise.
 * Re-renders the component on connect/disconnect.
 */
export function useSocketConnection() {
  const [connected, setConnected] = useState(() => {
    const socket = connectSocket();
    return socket?.connected || false;
  });

  useEffect(() => {
    const socket = connectSocket();
    if (!socket) {
      setConnected(false);
      return;
    }

    setConnected(socket.connected);

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onConnectError = () => setConnected(false);
    const onReconnect = () => setConnected(true);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('reconnect', onReconnect);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('reconnect', onReconnect);
    };
  }, []);

  return connected;
}

export default { useSocketEvent, useOrderStatusUpdates, useOrderCancelled, useOrderCreated, useReviewCreated, useSocketConnection };
