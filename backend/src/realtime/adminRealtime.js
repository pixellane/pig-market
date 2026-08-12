// Real-time events for admin panel synchronization
let io = null;

export const ADMIN_EVENTS = {
  ORDER_NEW: 'order:new',
  ORDER_STATUS: 'order:status', 
  ORDER_UPDATE: 'order:update',
  ORDER_DELETE: 'order:delete',
  PRODUCT_CREATE: 'product:create',
  PRODUCT_UPDATE: 'product:update',
  PRODUCT_DELETE: 'product:delete',
  DASHBOARD_STATS: 'dashboard:stats',
  SETTINGS_UPDATE: 'settings:update'
};

export function initAdminRealtime(socketServer) {
  io = socketServer;
}

export function setSocketIO(socketServer) {
  io = socketServer;
}

// Order events
export function emitNewOrder(order) {
  if (!io || !order) return;
  io.emit('order:new', {
    orderId: order.id,
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    contactNumber: order.contactNumber,
    status: order.status,
    totalAmount: order.totalAmount,
    totalKg: order.totalKg,
    items: order.items,
    createdAt: order.createdAt
  });
}

export function emitOrderStatusChange(order) {
  if (!io || !order) return;
  io.emit('order:status', {
    orderId: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    customerName: order.customerName,
    updatedAt: new Date().toISOString()
  });
}

export function emitOrderUpdate(order) {
  if (!io || !order) return;
  io.emit('order:update', {
    orderId: order.id,
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    contactNumber: order.contactNumber,
    status: order.status,
    totalAmount: order.totalAmount,
    totalKg: order.totalKg,
    items: order.items,
    updatedAt: new Date().toISOString()
  });
}

export function emitOrderDelete(orderId) {
  if (!io || !orderId) return;
  io.emit('order:delete', {
    orderId: orderId
  });
}

// Product events
export function emitProductCreate(product) {
  if (!io || !product) return;
  io.emit('product:create', {
    productId: product.id,
    name: product.name,
    description: product.description,
    pricePerKg: product.pricePerKg,
    stockKg: product.stockKg,
    imageUrl: product.imageUrl,
    isActive: product.isActive,
    createdAt: product.createdAt
  });
}

export function emitProductUpdate(product) {
  if (!io || !product) return;
  io.emit('product:update', {
    productId: product.id,
    name: product.name,
    description: product.description,
    pricePerKg: product.pricePerKg,
    stockKg: product.stockKg,
    imageUrl: product.imageUrl,
    isActive: product.isActive,
    updatedAt: new Date().toISOString()
  });
}

export function emitProductDelete(productId) {
  if (!io || !productId) return;
  io.emit('product:delete', {
    productId: productId
  });
}

// Dashboard stats events
export function emitDashboardStats(stats) {
  if (!io || !stats) return;
  io.emit('dashboard:stats', stats);
}

// Settings events
export function emitSettingsUpdate(settings) {
  if (!io || !settings) return;
  io.emit('settings:update', settings);
}