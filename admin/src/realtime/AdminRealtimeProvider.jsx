import React, { createContext, useContext, useEffect, useCallback, useState } from 'react';
import { subscribeToAdminEvents, connectAdminSocket } from './adminSocket.js';

const AdminRealtimeContext = createContext();

export function AdminRealtimeProvider({ children }) {
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [eventListeners] = useState(new Map());

  // Subscribe to a specific event type
  const subscribe = useCallback((eventType, callback) => {
    if (!eventListeners.has(eventType)) {
      eventListeners.set(eventType, new Set());
    }
    eventListeners.get(eventType).add(callback);

    return () => {
      const listeners = eventListeners.get(eventType);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          eventListeners.delete(eventType);
        }
      }
    };
  }, [eventListeners]);

  // Generic event handler
  const handleEvent = useCallback((eventType, payload) => {
    const listeners = eventListeners.get(eventType);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(payload);
        } catch (err) {
          console.warn(`[AdminRealtime] Error in ${eventType} listener:`, err);
        }
      });
    }
  }, [eventListeners]);

  useEffect(() => {
    console.log('[AdminRealtime] Initializing admin real-time provider');

    // Connect socket and subscribe to all events
    const unsubscribe = subscribeToAdminEvents((eventType, payload) => {
      handleEvent(eventType, payload);
    });

    // Try to connect (async) and attach lifecycle listeners.
    // Ensure any listeners we add here are removed on cleanup to avoid duplicates
    // when StrictMode remounts components.
    let mounted = true;
    let socketRef = null;
    let handleConnect = null;
    let handleDisconnect = null;
    let handleError = null;

    connectAdminSocket()
      .then((socket) => {
        if (!mounted) return;
        if (!socket) {
          setConnectionStatus('disabled');
          return;
        }

        socketRef = socket;

        // Define handlers in outer scope so we can remove them on cleanup.
        handleConnect = () => setConnectionStatus('connected');
        handleDisconnect = () => setConnectionStatus('disconnected');
        handleError = () => setConnectionStatus('error');

        socketRef.on('connect', handleConnect);
        socketRef.on('disconnect', handleDisconnect);
        socketRef.on('connect_error', handleError);

        // Set initial status
        setConnectionStatus(socketRef.connected ? 'connected' : 'disconnected');
      })
      .catch((error) => {
        console.warn('[AdminRealtime] Connection setup failed:', error && error.message ? error.message : error);
        if (mounted) setConnectionStatus('error');
      });

    return () => {
      mounted = false;
      unsubscribe();
      // Remove lifecycle listeners we added to avoid duplicates across remounts
      try {
        if (socketRef) {
          if (handleConnect) socketRef.off('connect', handleConnect);
          if (handleDisconnect) socketRef.off('disconnect', handleDisconnect);
          if (handleError) socketRef.off('connect_error', handleError);
        }
      } catch (e) {
        // ignore cleanup errors
      }
    };
  }, [handleEvent]);

  const value = {
    subscribe,
    connectionStatus
  };

  return (
    <AdminRealtimeContext.Provider value={value}>
      {children}
    </AdminRealtimeContext.Provider>
  );
}

export function useAdminRealtime() {
  const context = useContext(AdminRealtimeContext);
  if (!context) {
    throw new Error('useAdminRealtime must be used within AdminRealtimeProvider');
  }
  return context;
}