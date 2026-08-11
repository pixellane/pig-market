#!/usr/bin/env node
import { PrismaClient } from '@prisma/client';

const API = process.env.API_BASE || 'http://localhost:5000/api';
const adminCreds = { email: 'admin@pigmarket.local', password: 'password123' };
const prisma = new PrismaClient();

async function run() {
  console.log('--- Order Restoration stock verification script started ---');

  // 1. Admin login
  console.log('1) Admin login');
  const loginResp = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(adminCreds)
  });
  const loginJson = await loginResp.json();
  const token = loginJson.token;
  if (!token) throw new Error('Unauthenticated (no token received)');
  const authHeaders = { Authorization: `Bearer ${token}` };

  // 2. Create product
  console.log('2) Create product');
  const productPayload = {
    name: 'Smoke Restore Test Pork',
    description: 'Product for testing stock verification on restoration',
    pricePerKg: 150.00,
    stockKg: 5.0,
    isActive: true,
  };
  const createProdResp = await fetch(`${API}/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify(productPayload)
  });
  if (createProdResp.status !== 201) {
    throw new Error(`Failed to create product: ${await createProdResp.text()}`);
  }
  const product = await createProdResp.json();
  const productId = product.id;
  console.log(`   Product created with ID: ${productId}, Stock: ${product.stockKg} kg`);

  // 3. Create customer order for 3.5 kg
  console.log('3) Creating customer order for 3.5 kg');
  const orderPayload = {
    customerName: 'Test Restore Buyer',
    address: '456 Restore St',
    contactNumber: '09170001111',
    items: [{ productId, quantityKg: 3.5 }]
  };
  const createOrderResp = await fetch(`${API}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderPayload)
  });
  if (createOrderResp.status !== 201) {
    throw new Error(`Failed to create order: ${await createOrderResp.text()}`);
  }
  const order = await createOrderResp.json();
  const orderId = order.id;
  console.log(`   Order created with ID: ${orderId}, total: ₱${order.totalAmount}`);

  // Verify stock is now 1.5 kg
  let checkProduct = await prisma.product.findUnique({ where: { id: productId } });
  console.log(`   Verified product stock is now: ${checkProduct.stockKg} kg`);
  if (Number(checkProduct.stockKg) !== 1.5) {
    throw new Error(`Expected product stock to be 1.5, got ${checkProduct.stockKg}`);
  }

  // 4. Cancel order from admin
  console.log('4) Cancelling order as admin');
  const cancelResp = await fetch(`${API}/orders/${orderId}/cancel`, {
    method: 'POST',
    headers: { ...authHeaders }
  });
  if (cancelResp.status !== 200) {
    throw new Error(`Failed to cancel order: ${await cancelResp.text()}`);
  }
  console.log('   Order cancelled successfully.');

  // Verify stock is restored to 5.0 kg
  checkProduct = await prisma.product.findUnique({ where: { id: productId } });
  console.log(`   Verified product stock is back to: ${checkProduct.stockKg} kg`);
  if (Number(checkProduct.stockKg) !== 5.0) {
    throw new Error(`Expected product stock to return to 5.0, got ${checkProduct.stockKg}`);
  }

  // 5. Manually update product stock to 2.0 kg
  console.log('5) Manually updating product stock to 2.0 kg (insufficient for 3.5 kg order)');
  const updateProdResp = await fetch(`${API}/products/${productId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify({ pricePerKg: 150.00, stockKg: 2.0 })
  });
  if (updateProdResp.status !== 200) {
    throw new Error(`Failed to update product stock: ${await updateProdResp.text()}`);
  }
  checkProduct = await prisma.product.findUnique({ where: { id: productId } });
  console.log(`   Verified product stock manually set to: ${checkProduct.stockKg} kg`);

  // 6. Attempt to restore cancelled order (should fail)
  console.log('6) Attempting to restore cancelled order (should fail due to insufficient stock)');
  const restoreFailResp = await fetch(`${API}/orders/${orderId}/restore`, {
    method: 'PUT',
    headers: { ...authHeaders }
  });
  const restoreFailBody = await restoreFailResp.json();
  console.log(`   Response status: ${restoreFailResp.status}`);
  console.log(`   Response body:`, restoreFailBody);
  
  if (restoreFailResp.status === 200) {
    throw new Error('Restoring the order mistakenly succeeded despite insufficient stock!');
  }
  if (!restoreFailBody.message || !restoreFailBody.message.includes('Insufficient stock')) {
    throw new Error(`Expected error message to contain 'Insufficient stock', got: ${JSON.stringify(restoreFailBody)}`);
  }
  console.log('   Restoration failed as expected.');

  // Verify order is still CANCELLED, and stock is still 2.0 kg
  const checkOrderFail = await prisma.order.findUnique({ where: { id: orderId } });
  if (checkOrderFail.status !== 'CANCELLED') {
    throw new Error(`Expected order status to remain CANCELLED, but got: ${checkOrderFail.status}`);
  }
  checkProduct = await prisma.product.findUnique({ where: { id: productId } });
  if (Number(checkProduct.stockKg) !== 2.0) {
    throw new Error(`Expected product stock to remain 2.0, but got: ${checkProduct.stockKg}`);
  }

  // 7. Manually update product stock back to 5.0 kg
  console.log('7) Manually updating product stock back to 5.0 kg');
  const updateProdBackResp = await fetch(`${API}/products/${productId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify({ pricePerKg: 150.00, stockKg: 5.0 })
  });
  if (updateProdBackResp.status !== 200) {
    throw new Error(`Failed to update product stock: ${await updateProdBackResp.text()}`);
  }
  checkProduct = await prisma.product.findUnique({ where: { id: productId } });
  console.log(`   Verified product stock is now: ${checkProduct.stockKg} kg`);

  // 8. Restore order (should succeed)
  console.log('8) Attempting to restore cancelled order (should succeed)');
  const restoreSuccessResp = await fetch(`${API}/orders/${orderId}/restore`, {
    method: 'PUT',
    headers: { ...authHeaders }
  });
  if (restoreSuccessResp.status !== 200) {
    throw new Error(`Restoration failed unexpectedly: ${await restoreSuccessResp.text()}`);
  }
  const restoredOrder = await restoreSuccessResp.json();
  console.log(`   Restored order status: ${restoredOrder.status}`);
  if (restoredOrder.status !== 'PENDING') {
    throw new Error(`Expected restored order status to be PENDING, got: ${restoredOrder.status}`);
  }

  // Verify stock is now 1.5 kg
  checkProduct = await prisma.product.findUnique({ where: { id: productId } });
  console.log(`   Verified product stock is reduced to: ${checkProduct.stockKg} kg`);
  if (Number(checkProduct.stockKg) !== 1.5) {
    throw new Error(`Expected stock to be 1.5 after restoration, got: ${checkProduct.stockKg}`);
  }

  // Verify InventoryHistory records include RESTORE_ORDER
  const history = await prisma.inventoryHistory.findMany({
    where: { productId },
    orderBy: { createdAt: 'desc' }
  });
  console.log('   Inventory history recorded for this product:');
  history.forEach(h => {
    console.log(`     - Reason: ${h.reason}, change: ${h.changeKg} kg, previous: ${h.previousStockKg} kg, new: ${h.newStockKg} kg`);
  });
  const restoreLog = history.find(h => h.reason === 'RESTORE_ORDER');
  if (!restoreLog) {
    throw new Error('Expected RESTORE_ORDER log entry in InventoryHistory, but none was found.');
  }

  // 9. Cleanup database
  console.log('9) Cleaning up database...');
  // To delete order, must first cancel it (if pending)
  await fetch(`${API}/orders/${orderId}/cancel`, {
    method: 'POST',
    headers: { ...authHeaders }
  });
  // Delete order
  const delOrderResp = await fetch(`${API}/orders/${orderId}`, {
    method: 'DELETE',
    headers: { ...authHeaders }
  });
  if (delOrderResp.status !== 204) {
    console.warn('   Failed to delete test order:', await delOrderResp.text());
  }

  // Delete product (using deactivation/delete endpoint or bypass delete if deactivate only)
  const delProductResp = await fetch(`${API}/products/${productId}`, {
    method: 'DELETE',
    headers: { ...authHeaders }
  });
  if (delProductResp.status !== 204) {
    console.warn('   Failed to delete product:', await delProductResp.text());
  }
  
  // Clean up inventory history as well so no orphaned rows remain
  await prisma.inventoryHistory.deleteMany({ where: { productId } });

  console.log('--- Cleanup complete. Verification script PASSED! ---');
  process.exit(0);
}

run().catch((err) => {
  console.error('--- Verification script FAILED! ---');
  console.error(err);
  process.exit(1);
});
