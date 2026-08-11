import { io } from 'socket.io-client';

export const STOCK_UPDATE_EVENT = 'stock:update';

function resolveSocketUrl() {
  const explicit = import.meta.env.VITE_SOCKET_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, '');

  const apiBase = import.meta.env.VITE_API_BASE_URL?.trim();
  if (apiBase) return apiBase.replace(/\/api\/?$/, '');

  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return 'http://localhost:5001';
  }

  return typeof window !== 'undefined' ? window.location.origin : '';
}

const listeners = new Set();
let socket = null;

function notify(payload) {
  if (!payload?.productId) return;
  const stockKg = Number(payload.stockKg);
  if (!Number.isFinite(stockKg)) return;
  const event = { productId: String(payload.productId), stockKg: Math.max(0, stockKg) };
  listeners.forEach((listener) => {
    try {
      listener(event);
    } catch (err) {
      console.warn('[inventorySocket] listener error', err);
    }
  });
}

export function connectInventorySocket() {
  if (typeof window === 'undefined') return null;
  if (socket) return socket;

  const url = resolveSocketUrl();
  if (!url) return null;

  socket = io(url, {
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 8000,
    autoConnect: true,
  });

  socket.on(STOCK_UPDATE_EVENT, notify);
  socket.on('connect_error', () => {
    // Storefront continues via REST fallback — no hard failure.
  });

  return socket;
}

export function disconnectInventorySocket() {
  if (!socket) return;
  socket.off(STOCK_UPDATE_EVENT, notify);
  socket.disconnect();
  socket = null;
}

export function subscribeStockUpdates(listener) {
  if (typeof listener !== 'function') return () => {};
  listeners.add(listener);
  connectInventorySocket();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && socket) {
      // Keep connection briefly unused — reconnect is cheap; avoid StrictMode thrash.
    }
  };
}
