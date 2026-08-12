#!/usr/bin/env node
/**
 * Real-time functionality test script
 * This script helps test that all real-time events are working properly
 */

const io = require('socket.io-client');

const SERVER_URL = process.env.SOCKET_URL || 'http://localhost:5001';

console.log('🔄 Testing real-time functionality...');
console.log(`📡 Connecting to: ${SERVER_URL}`);

const socket = io(SERVER_URL, {
  transports: ['websocket', 'polling'],
  reconnection: false
});

// Test events to listen for
const expectedEvents = [
  'stock:update',
  'order:new', 
  'order:status',
  'order:update',
  'order:delete',
  'product:create',
  'product:update', 
  'product:delete',
  'dashboard:stats'
];

const receivedEvents = new Set();

socket.on('connect', () => {
  console.log('✅ Connected to server');
  
  // Set up event listeners
  expectedEvents.forEach(eventName => {
    socket.on(eventName, (data) => {
      console.log(`📨 Received ${eventName}:`, JSON.stringify(data, null, 2));
      receivedEvents.add(eventName);
    });
  });

  // Simulate some test data (would normally come from API operations)
  console.log('🧪 To test real-time events:');
  console.log('1. Create/update/delete products via admin panel');
  console.log('2. Create/update orders via customer app');
  console.log('3. Watch for real-time updates in both apps');
  console.log('');
  console.log('📊 Expected events:', expectedEvents.join(', '));
  console.log('');
  console.log('⏱️  Listening for 30 seconds...');

  // Auto-disconnect after 30 seconds
  setTimeout(() => {
    console.log('\\n📈 Test Results:');
    console.log(`✅ Received ${receivedEvents.size}/${expectedEvents.length} expected event types`);
    
    const missedEvents = expectedEvents.filter(e => !receivedEvents.has(e));
    if (missedEvents.length > 0) {
      console.log('❌ Missed events:', missedEvents.join(', '));
    } else {
      console.log('🎉 All expected event types received!');
    }
    
    socket.disconnect();
    process.exit(0);
  }, 30000);
});

socket.on('connect_error', (error) => {
  console.log('❌ Connection failed:', error.message);
  console.log('💡 Make sure the backend server is running on', SERVER_URL);
  process.exit(1);
});

socket.on('disconnect', (reason) => {
  console.log('🔌 Disconnected:', reason);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\\n🛑 Test interrupted');
  socket.disconnect();
  process.exit(0);
});