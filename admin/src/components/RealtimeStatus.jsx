import React from 'react';
import { useAdminRealtime } from '../realtime/AdminRealtimeProvider.jsx';

export default function RealtimeStatus() {
  const { connectionStatus } = useAdminRealtime();

  const statusConfig = {
    connected: {
      color: 'bg-green-500',
      text: 'Real-time connected',
      icon: '●'
    },
    disconnected: {
      color: 'bg-red-500',
      text: 'Real-time disconnected',
      icon: '●'
    },
    error: {
      color: 'bg-orange-500',
      text: 'Real-time connection error',
      icon: '●'
    },
    disabled: {
      color: 'bg-gray-400',
      text: 'Real-time disabled',
      icon: '●'
    }
  };

  const config = statusConfig[connectionStatus] || statusConfig.disconnected;

  return (
    <div className="flex items-center gap-2 text-sm text-gray-600">
      <span className={`inline-block w-2 h-2 rounded-full ${config.color}`} />
      <span className="hidden sm:inline">{config.text}</span>
    </div>
  );
}