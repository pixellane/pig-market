# Real-time Features Documentation

This document describes the real-time functionality implemented in the Fresh Pork Market application.

## Overview

The application uses Socket.IO for real-time communication between the server and clients. Real-time updates are provided for:
- Product inventory changes
- Order status updates
- Product CRUD operations
- Dashboard statistics
- Live connection status

## Architecture

### Backend (Socket.IO Server)
- **Location**: `backend/src/realtime/`
- **Server Setup**: `backend/src/realtime/socketServer.js`
- **Admin Events**: `backend/src/realtime/adminRealtime.js`
- **Customer Events**: `backend/src/realtime/customerRealtime.js`

### Frontend Real-time Providers

#### Customer App
- **Inventory Updates**: `customer/src/realtime/InventoryRealtimeProvider.jsx`
- **Order Updates**: `customer/src/realtime/OrderRealtimeProvider.jsx`
- **Connection Status**: `customer/src/components/RealtimeStatus.jsx`

#### Admin App  
- **Admin Events**: `admin/src/realtime/AdminRealtimeProvider.jsx`
- **Dashboard Stats**: `admin/src/realtime/DashboardRealtimeProvider.jsx`
- **Connection Status**: `admin/src/components/RealtimeStatus.jsx`

## Real-time Events

### Customer Events
| Event | Data | Description |
|-------|------|-------------|
| `stock:update` | `{ productId, stockKg }` | Product stock level changed |
| `order:status` | `{ orderId, status, previousStatus }` | Order status updated |
| `order:update` | `{ orderId, ...orderData }` | Order details updated |
| `product:update` | `{ productId, ...productData }` | Product information updated |

### Admin Events
| Event | Data | Description |
|-------|------|-------------|
| `order:new` | `{ ...orderData }` | New order created |
| `order:status` | `{ orderId, status, previousStatus }` | Order status changed |
| `order:update` | `{ orderId, ...orderData }` | Order updated |
| `order:delete` | `{ orderId }` | Order deleted |
| `product:create` | `{ ...productData }` | New product created |
| `product:update` | `{ productId, ...productData }` | Product updated |
| `product:delete` | `{ productId }` | Product deleted |
| `dashboard:stats` | `{ ...statsData }` | Dashboard statistics updated |
| `stock:update` | `{ productId, stockKg }` | Inventory level changed |

## Implementation Details

### Backend Integration
Real-time events are triggered from:
- `productService.js`: Product CRUD operations
- `orderService.js`: Order status updates  
- `inventoryService.js`: Stock level changes
- `buyerStats.js`: Customer statistics

### Frontend Integration

#### Customer App Pages with Real-time Updates
- **HomePage**: Live inventory updates
- **ProductPage**: Stock level changes
- **MyOrdersPage**: Order status updates
- **OrderDetailsPage**: Individual order updates

#### Admin App Pages with Real-time Updates  
- **OrdersPage**: New orders, status changes
- **ProductsPage**: Product CRUD, stock updates
- **DashboardPage**: Live statistics

### Connection Management
- **Auto-reconnection**: Clients automatically reconnect if disconnected
- **Connection Status**: Visual indicators show real-time connection state
- **Fallback**: Apps continue to work with REST API if real-time fails
- **Error Handling**: Graceful degradation when Socket.IO unavailable

## Configuration

### Backend Socket.IO Setup
```javascript
// In backend/src/app.js
const { setupSocketIO } = require('./realtime/socketServer.js');
setupSocketIO(server);
```

### Frontend Environment Variables
```bash
# Customer app (.env)
VITE_SOCKET_URL=http://localhost:5001

# Admin app (.env)  
VITE_SOCKET_URL=http://localhost:5001
```

## Testing

### Manual Testing
1. Start backend server with real-time enabled
2. Open customer and admin apps in different browsers
3. Perform actions in one app and observe updates in the other

### Automated Testing
```bash
# Run the real-time test script
node test-realtime.js

# With custom server URL
SOCKET_URL=http://localhost:5001 node test-realtime.js
```

## Performance Considerations

- **Event Batching**: Multiple rapid events are not batched (consider implementing if needed)
- **Room Management**: No user-specific rooms currently (all events broadcast to all connected clients)
- **Data Size**: Event payloads are kept minimal for performance
- **Reconnection**: Exponential backoff prevents connection storms

## Security

- **CORS**: Socket.IO server configured with appropriate CORS settings
- **Data Validation**: All event data is validated before broadcasting
- **No Authentication**: Current implementation doesn't require Socket.IO authentication
- **Rate Limiting**: Consider adding rate limiting for high-frequency events

## Troubleshooting

### Common Issues
1. **Connection Failed**: Check backend server is running and VITE_SOCKET_URL is correct
2. **Events Not Received**: Verify event names match exactly between client and server
3. **Multiple Connections**: Check that React components properly cleanup event listeners
4. **Stale Data**: Ensure event handlers update state correctly without mutations

### Debug Logging
Real-time providers include console logging for debugging:
```javascript
console.log('[AdminRealtime] Order status update:', payload);
```

### Connection Status
Visual connection status indicators show:
- 🟢 Connected: Real-time updates active
- 🔴 Disconnected: Using REST fallback
- 🟠 Error: Connection issues
- ⚫ Disabled: Real-time unavailable

## Future Enhancements

- **User-specific Rooms**: Send events only to relevant users
- **Event History**: Store and replay missed events
- **Bulk Operations**: Batch multiple related events
- **Push Notifications**: Integrate with browser notifications API
- **Admin Notifications**: Alert admins of critical events
- **Metrics**: Track real-time usage and performance