import React, { createContext, useContext, useEffect, useCallback } from 'react';
import { connectInventorySocket } from './inventorySocket.js';

const OrderRealtimeContext = createContext();

export function OrderRealtimeProvider({ children }) {
  const [eventListeners] = React.useState(new Map());

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

  const handleEvent = useCallback((eventType, payload) => {
    const listeners = eventListeners.get(eventType);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(payload);
        } catch (err) {
          console.warn(`[OrderRealtime] Error in ${eventType} listener:`, err);
        }
      });
    }
  }, [eventListeners]);

  useEffect(() => {
    console.log('[OrderRealtime] Setting up order real-time updates');
    const socket = connectInventorySocket();
    
    if (socket) {
      // Listen for order status changes
      socket.on('order:status', (payload) => {
        console.log('[OrderRealtime] Order status update:', payload);
        handleEvent('order:status', payload);
      });

      // Listen for order updates
      socket.on('order:update', (payload) => {
        console.log('[OrderRealtime] Order update:', payload);
        handleEvent('order:update', payload);
      });

      // Listen for product updates (for product info in orders)
      socket.on('product:update', (payload) => {
        console.log('[OrderRealtime] Product update:', payload);
        handleEvent('product:update', payload);
      });

      return () => {
        socket.off('order:status');
        socket.off('order:update');
        socket.off('product:update');
      };
    }
  }, [handleEvent]);

  const value = {
    subscribe
  };

  return (
    <OrderRealtimeContext.Provider value={value}>
      {children}
    </OrderRealtimeContext.Provider>
  );
}

export function useOrderRealtime() {
  const context = useContext(OrderRealtimeContext);
  if (!context) {
    throw new Error('useOrderRealtime must be used within OrderRealtimeProvider');
  }
  return context;
}