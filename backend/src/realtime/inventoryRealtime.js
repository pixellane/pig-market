const STOCK_UPDATE_EVENT = 'stock:update';

let io = null;

export function initInventoryRealtime(socketServer) {
  io = socketServer;
}

export function emitStockUpdate(productId, stockKg) {
  if (!io || !productId) return;
  const payload = {
    productId: String(productId),
    stockKg: Number(stockKg),
  };
  if (!Number.isFinite(payload.stockKg)) return;
  io.emit(STOCK_UPDATE_EVENT, payload);
}

export function emitStockUpdates(updates = []) {
  for (const update of updates) {
    if (!update?.productId) continue;
    emitStockUpdate(update.productId, update.stockKg);
  }
}

export { STOCK_UPDATE_EVENT };
