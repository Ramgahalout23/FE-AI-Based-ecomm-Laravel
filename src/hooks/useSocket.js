/**
 * useSocket — React hook for subscribing to socket events.
 * Automatically cleans up listeners on unmount.
 */

import { useState, useEffect, useCallback } from 'react';
import { onRealtimeEvent, connectRealtime, isRealtimeConnected } from '../services/realtimeService';
import { isConnected as isSocketConnected, onSocketEvent, connectSocket } from '../services/socketService';

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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- deps is a caller-supplied array, not statically known
  const stableHandler = useCallback(handler, deps || [handler]);

  useEffect(() => {
    const unsubscribe = onRealtimeEvent(event, stableHandler);
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
 * Subscribe to review created events (for admin badge updates).
 *
 * @param {function} onCreated - Called with { reviewId, productId, userId, rating, title, timestamp }
 * @param {Array} deps - Dependency array
 */
export function useReviewCreated(onCreated, deps = []) {
  useSocketEvent('review:created', onCreated, deps);
}

/**
 * Reactively track the realtime connection state.
 * Returns true when connected, false otherwise.
 */
export function useSocketConnection() {
  const checkStatus = useCallback(() => {
    return isSocketConnected() || isRealtimeConnected();
  }, []);

  const [connected, setConnected] = useState(() => {
    connectSocket();
    return checkStatus();
  });

  useEffect(() => {
    connectSocket();
    const unsubConnect = onSocketEvent('connect', () => setConnected(true));
    const unsubDisconnect = onSocketEvent('disconnect', () => setConnected(checkStatus()));

    const interval = setInterval(() => {
      setConnected(checkStatus());
    }, 2000);

    return () => {
      clearInterval(interval);
      if (typeof unsubConnect === 'function') unsubConnect();
      if (typeof unsubDisconnect === 'function') unsubDisconnect();
    };
  }, [checkStatus]);

  return connected;
}

export default { useSocketEvent, useOrderStatusUpdates, useOrderCancelled, useOrderCreated, useReviewCreated, useSocketConnection };
