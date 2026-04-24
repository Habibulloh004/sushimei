"use client";

import { useEffect, useRef, useState } from 'react';
import { api } from '../api';

export type OrderEventType =
  | 'order.created'
  | 'order.status_changed'
  | 'order.courier_assigned'
  | 'order.offered'
  | 'order.offer_claimed'
  | 'order.offer_requested'
  | 'order.offer_declined';

export interface OrderEvent {
  type: OrderEventType | 'hello' | 'error';
  order_id?: string;
  spot_id?: string;
  status?: string;
  courier_id?: string;
  at?: string;
  message?: string;
}

export type OrderStreamStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'closed';

export interface UseOrderStreamOptions {
  /** Called for every order.* event. `hello` and `error` frames are filtered out. */
  onEvent?: (event: OrderEvent) => void;
  /** Disable the connection without unmounting the consumer (e.g. when unauthenticated). */
  enabled?: boolean;
  /**
   * Trailing debounce window (ms) applied to onEvent. Multiple server events
   * arriving in quick succession (e.g., PREPARING → READY → courier_assigned
   * all within ~1s) collapse into a single callback. Defaults to 250ms;
   * pass 0 to disable and fire the callback immediately.
   */
  debounceMs?: number;
}

const INITIAL_RECONNECT_MS = 1_000;
const MAX_RECONNECT_MS = 15_000;

function toWebSocketUrl(baseUrl: string, token: string): string {
  // baseUrl is like "http://localhost:9191/api/v1"; we want the matching ws endpoint.
  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    return '';
  }
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  // Append /ws to the existing path.
  url.pathname = url.pathname.replace(/\/$/, '') + '/ws';
  url.searchParams.set('token', token);
  return url.toString();
}

/**
 * Subscribes to the backend /ws realtime stream. Auto-reconnects with
 * exponential backoff (up to 15s) until disabled or unmounted.
 */
export function useOrderStream(options: UseOrderStreamOptions = {}): OrderStreamStatus {
  const { onEvent, enabled = true, debounceMs = 250 } = options;
  const [status, setStatus] = useState<OrderStreamStatus>('idle');
  const onEventRef = useRef(onEvent);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptRef = useRef(0);
  const manuallyClosedRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingEventRef = useRef<OrderEvent | null>(null);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  // Flush any pending debounced event when the component unmounts.
  useEffect(() => () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === 'undefined') return;

    manuallyClosedRef.current = false;

    const connect = () => {
      const token = api.getAccessToken();
      if (!token) {
        setStatus('idle');
        return;
      }
      const url = toWebSocketUrl(api.getBaseUrl(), token);
      if (!url) return;

      setStatus(attemptRef.current === 0 ? 'connecting' : 'reconnecting');

      let socket: WebSocket;
      try {
        socket = new WebSocket(url);
      } catch {
        scheduleReconnect();
        return;
      }
      socketRef.current = socket;

      socket.onopen = () => {
        attemptRef.current = 0;
        setStatus('connected');
      };

      socket.onmessage = (ev) => {
        try {
          const parsed = JSON.parse(ev.data) as OrderEvent;
          if (parsed.type === 'hello' || parsed.type === 'error') return;
          if (debounceMs <= 0) {
            onEventRef.current?.(parsed);
            return;
          }
          // Coalesce bursts: keep the latest event and fire once after the
          // window expires. Avoids hammering the backend when kitchen moves
          // an order through 3 statuses in under a second.
          pendingEventRef.current = parsed;
          if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = setTimeout(() => {
            const e = pendingEventRef.current;
            pendingEventRef.current = null;
            debounceTimerRef.current = null;
            if (e) onEventRef.current?.(e);
          }, debounceMs);
        } catch {
          // ignore malformed frames
        }
      };

      socket.onerror = () => {
        // onclose will handle reconnect; keep this quiet to avoid noisy logs.
      };

      socket.onclose = () => {
        socketRef.current = null;
        if (manuallyClosedRef.current) {
          setStatus('closed');
          return;
        }
        scheduleReconnect();
      };
    };

    const scheduleReconnect = () => {
      if (manuallyClosedRef.current) return;
      const nextAttempt = attemptRef.current + 1;
      attemptRef.current = nextAttempt;
      const delay = Math.min(INITIAL_RECONNECT_MS * Math.pow(2, nextAttempt - 1), MAX_RECONNECT_MS);
      setStatus('reconnecting');
      reconnectTimerRef.current = setTimeout(connect, delay);
    };

    connect();

    return () => {
      manuallyClosedRef.current = true;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      attemptRef.current = 0;
      const socket = socketRef.current;
      socketRef.current = null;
      if (socket && socket.readyState <= WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [enabled]);

  return status;
}
