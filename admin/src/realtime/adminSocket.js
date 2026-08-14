// Import socket.io-client with named import
import { io } from 'socket.io-client';

function getSocketIO() {
  return io;
}

function resolveSocketUrl() {
  if (typeof window === 'undefined') return null;

  // 1) Use explicit socket URL if configured (highest priority)
  const socketEnv = import.meta.env.VITE_SOCKET_URL;
  if (socketEnv) {
    return socketEnv;
  }

  // 2) Derive socket origin from the API base URL if configured
  const apiBase = import.meta.env.VITE_API_BASE_URL;
  if (apiBase) {
    return apiBase.replace(/\/api\/?$/, '');
  }

  // 3) In production builds DO NOT fall back to window.location.origin (Vercel origin).
  //    Use the explicit production backend URL to avoid connecting back to the Vercel frontend.
  if (import.meta.env.MODE === 'production') {
    return 'https://pig-market.onrender.com';
  }

  // 4) Local development fallback: map localhost origin to backend dev port
  const origin = window.location.origin;
  if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
    return origin.replace(/:\d+/, ':5001');
  }

  // 5) Non-production fallback: use current origin
  return origin;
}

const listeners = new Set();
let socket = null;

function notify(event, payload) {
  // Use debug-level logging for frequent event payloads to avoid spamming
  // production logs. Developers can enable debug logs in DEV.
  if (import.meta.env.DEV) {
    console.log(`[adminSocket] Received ${event}:`, payload);
  } else {
    console.debug && console.debug(`[adminSocket] Received ${event}`);
  }
  listeners.forEach((listener) => {
    try {
      listener(event, payload);
    } catch (err) {
      console.warn('[adminSocket] listener error', err);
    }
  });
}

export async function connectAdminSocket() {
  if (typeof window === 'undefined') return null;
  if (socket) return socket;

  const socketIOClient = getSocketIO();
  if (!socketIOClient) {
    console.warn('[adminSocket] Socket.IO client not available');
    return null;
  }

  const url = resolveSocketUrl();
  if (!url) {
    console.warn('[adminSocket] No socket URL resolved, real-time updates disabled');
    return null;
  }

  if (import.meta.env.DEV) console.log('[adminSocket] Connecting to:', url);
  else console.info('[adminSocket] Connecting to admin socket');
  const transports = import.meta.env.PROD ? ['websocket'] : ['polling', 'websocket'];

  socket = socketIOClient(url, {
    path: '/socket.io',
    transports,
    timeout: 20000,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 8000,
    autoConnect: true,
  });

  // Admin-specific events
  socket.on('order:new', (payload) => notify('order:new', payload));
  socket.on('order:status', (payload) => notify('order:status', payload));
  socket.on('order:update', (payload) => notify('order:update', payload));
  socket.on('order:delete', (payload) => notify('order:delete', payload));
  socket.on('product:create', (payload) => notify('product:create', payload));
  socket.on('product:update', (payload) => notify('product:update', payload));
  socket.on('product:delete', (payload) => notify('product:delete', payload));
  socket.on('dashboard:stats', (payload) => notify('dashboard:stats', payload));
  
  // Inventory events (reuse from customer app)
  socket.on('stock:update', (payload) => notify('stock:update', payload));

  socket.on('connect', () => {
    console.info('[adminSocket] Connected to admin real-time updates');
  });

  socket.on('connect_error', (error) => {
    const msg = error && error.message ? error.message : String(error);
    // Log concise message in production; include full error object in DEV.
    console.warn('[adminSocket] Connection failed:', msg);
    if (import.meta.env.DEV) console.warn('[adminSocket] connect_error detail:', error);
  });

  socket.on('disconnect', (reason) => {
    if (import.meta.env.DEV) {
      console.warn('[adminSocket] Disconnected:', reason);
    } else {
      console.info('[adminSocket] Disconnected');
    }
  });

  return socket;
}

export function subscribeToAdminEvents(callback) {
  if (typeof callback !== 'function') return () => {};
  
  listeners.add(callback);
  
  // Ensure socket is connected
  connectAdminSocket().catch(console.error);
  
  return () => {
    listeners.delete(callback);
  };
}

export function disconnectAdminSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  listeners.clear();
}