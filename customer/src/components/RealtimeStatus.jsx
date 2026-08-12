import React from 'react';
import { useInventoryRealtime } from '../realtime/InventoryRealtimeProvider.jsx';

export default function RealtimeStatus() {
  const { connectionStatus } = useInventoryRealtime();

  const statusConfig = {
    connected: {
      color: 'bg-green-500',
      text: 'Live updates active',
      icon: '●'
    },
    disconnected: {
      color: 'bg-red-500', 
      text: 'Live updates disconnected',
      icon: '●'
    },
    error: {
      color: 'bg-orange-500',
      text: 'Connection issues',
      icon: '●'
    },
    disabled: {
      color: 'bg-gray-400',
      text: 'Live updates unavailable',
      icon: '●'
    }
  };

  const config = statusConfig[connectionStatus] || statusConfig.disconnected;

  return (
    <div className="flex items-center gap-2 text-xs text-gray-500">
      <span className={`inline-block w-2 h-2 rounded-full ${config.color}`} />
      <span className="hidden md:inline">{config.text}</span>
    </div>
  );
}