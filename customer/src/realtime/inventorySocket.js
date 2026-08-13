import { io } from 'socket.io-client';
import { getSocketUrl } from '../utils/apiUrl.js';

export const STOCK_UPDATE_EVENT = 'stock:update';

function resolveSocketUrl() {
  const explicitSocketUrl = getSocketUrl();
  if (explicitSocketUrl) return explicitSocketUrl;
  return typeof window !== 'undefined' ? window.location.origin : '';
}

const listeners = new Set();
let socket = null;

function notify(payload) {
  if (!payload?.productId) return;
  const stockKg = Number(payload.stockKg);
  if (!Number.isFinite(stockKg)) return;
  const event = { productId: String(payload.productId), stockKg: Math.max(0, stockKg) };
  console.log('[inventorySocket] Stock update received:', event);
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
  if (!url) {
    console.warn('[inventorySocket] No socket URL resolved, real-time updates disabled');
    return null;
  }

  console.log('[inventorySocket] Connecting to:', url);
  socket = io(url, {
    path: '/socket.io',
    transports: ['polling', 'websocket'],
    timeout: 20000,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 8000,
    autoConnect: true,
  });

  socket.on(STOCK_UPDATE_EVENT, notify);
  socket.on('connect', () => {
    console.log('[inventorySocket] Connected to real-time inventory updates');
  });
  socket.on('connect_error', (error) => {
    console.warn('[inventorySocket] Connection failed, using REST fallback:', error);
  });
  socket.on('disconnect', (reason) => {
    console.warn('[inventorySocket] Disconnected:', reason);
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
