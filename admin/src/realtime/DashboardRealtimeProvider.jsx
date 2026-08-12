import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAdminRealtime } from './AdminRealtimeProvider.jsx';

const DashboardRealtimeContext = createContext();

export function DashboardRealtimeProvider({ children }) {
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    todayRevenue: 0,
    totalProducts: 0,
    lowStockProducts: 0,
    totalCustomers: 0
  });
  const { subscribe } = useAdminRealtime();

  useEffect(() => {
    // Listen for new orders to update stats
    const unsubscribeNewOrder = subscribe('order:new', (orderData) => {
      setStats(current => ({
        ...current,
        totalOrders: current.totalOrders + 1,
        pendingOrders: current.pendingOrders + 1,
        todayRevenue: current.todayRevenue + (orderData.totalAmount || 0)
      }));
    });

    // Listen for order status changes
    const unsubscribeOrderStatus = subscribe('order:status', (statusData) => {
      const { status, previousStatus } = statusData;
      
      setStats(current => {
        let newStats = { ...current };
        
        // Adjust pending count
        if (previousStatus === 'PENDING' && status !== 'PENDING') {
          newStats.pendingOrders = Math.max(0, current.pendingOrders - 1);
        } else if (previousStatus !== 'PENDING' && status === 'PENDING') {
          newStats.pendingOrders = current.pendingOrders + 1;
        }
        
        return newStats;
      });
    });

    // Listen for product changes
    const unsubscribeProductCreate = subscribe('product:create', (productData) => {
      setStats(current => ({
        ...current,
        totalProducts: current.totalProducts + 1,
        lowStockProducts: productData.stockKg <= 5 ? current.lowStockProducts + 1 : current.lowStockProducts
      }));
    });

    const unsubscribeProductDelete = subscribe('product:delete', (deleteData) => {
      setStats(current => ({
        ...current,
        totalProducts: Math.max(0, current.totalProducts - 1)
      }));
    });

    // Listen for stock updates
    const unsubscribeStock = subscribe('stock:update', (stockData) => {
      setStats(current => {
        // This is a simplified approach - in a real app you'd want to track which products
        // were previously low stock to accurately update the count
        return current;
      });
    });

    // Listen for dashboard stats updates from server
    const unsubscribeDashboard = subscribe('dashboard:stats', (dashboardData) => {
      setStats(current => ({
        ...current,
        ...dashboardData
      }));
    });

    return () => {
      unsubscribeNewOrder();
      unsubscribeOrderStatus();
      unsubscribeProductCreate();
      unsubscribeProductDelete();
      unsubscribeStock();
      unsubscribeDashboard();
    };
  }, [subscribe]);

  const value = {
    stats,
    setStats
  };

  return (
    <DashboardRealtimeContext.Provider value={value}>
      {children}
    </DashboardRealtimeContext.Provider>
  );
}

export function useDashboardRealtime() {
  const context = useContext(DashboardRealtimeContext);
  if (!context) {
    throw new Error('useDashboardRealtime must be used within DashboardRealtimeProvider');
  }
  return context;
}