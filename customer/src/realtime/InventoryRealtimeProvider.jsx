import { createContext, useContext, useEffect } from 'react';
import { useCart } from '../contexts/CartContext.jsx';
import { connectInventorySocket, subscribeStockUpdates } from './inventorySocket.js';

const InventoryRealtimeContext = createContext({
  subscribe: subscribeStockUpdates,
});

export function InventoryRealtimeProvider({ children }) {
  const { applyLiveStock } = useCart();

  useEffect(() => {
    connectInventorySocket();
    const unsubscribe = subscribeStockUpdates(({ productId, stockKg }) => {
      applyLiveStock?.(productId, stockKg);
    });
    return unsubscribe;
  }, [applyLiveStock]);

  return (
    <InventoryRealtimeContext.Provider value={{ subscribe: subscribeStockUpdates }}>
      {children}
    </InventoryRealtimeContext.Provider>
  );
}

export function useInventoryRealtime() {
  return useContext(InventoryRealtimeContext);
}
