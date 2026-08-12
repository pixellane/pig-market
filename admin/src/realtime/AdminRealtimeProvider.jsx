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

    // Try to connect (async)
    let mounted = true;
    connectAdminSocket()
      .then((socket) => {
        if (!mounted) return;
        
        if (socket) {
          const handleConnect = () => setConnectionStatus('connected');
          const handleDisconnect = () => setConnectionStatus('disconnected');
          const handleError = () => setConnectionStatus('error');

          socket.on('connect', handleConnect);
          socket.on('disconnect', handleDisconnect);
          socket.on('connect_error', handleError);

          // Set initial status
          setConnectionStatus(socket.connected ? 'connected' : 'disconnected');
        } else {
          setConnectionStatus('disabled');
        }
      })
      .catch((error) => {
        console.warn('[AdminRealtime] Connection setup failed:', error);
        if (mounted) setConnectionStatus('error');
      });

    return () => {
      mounted = false;
      unsubscribe();
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