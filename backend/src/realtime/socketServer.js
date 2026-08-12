import { Server } from 'socket.io';
import { setSocketIO as setAdminSocketIO } from './adminRealtime.js';
import { setSocketIO as setInventorySocketIO } from './inventoryRealtime.js';

let io = null;

export function setupSocketIO(server) {
  console.log('🔗 Setting up Socket.IO server...');
  
  io = new Server(server, {
    cors: {
      origin: process.env.NODE_ENV === 'production' 
        ? process.env.FRONTEND_URLS?.split(',') || []
        : ["http://localhost:3000", "http://localhost:3001", "http://localhost:5173", "http://localhost:5174"],
      methods: ["GET", "POST"],
      credentials: true
    },
    transports: ['websocket', 'polling']
  });

  // Initialize real-time modules with the io instance
  setAdminSocketIO(io);
  setInventorySocketIO(io);

  io.on('connection', (socket) => {
    console.log(`👤 Client connected: ${socket.id}`);
    
    socket.on('disconnect', (reason) => {
      console.log(`👋 Client disconnected: ${socket.id} (${reason})`);
    });
  });

  console.log('✅ Socket.IO server initialized');
  return io;
}

export function getSocketIO() {
  return io;
}