import { z } from 'zod';
import { orderService } from '../services/orderService.js';
import { aggregateBuyers, aggregateProductPurchaseSummary } from '../utils/buyerStats.js';
import { emitOrderStatusChange, emitOrderUpdate } from '../realtime/adminRealtime.js';

const orderSchema = z.object({
  customerName: z.string().min(1),
  address: z.string().min(1),
  contactNumber: z.string().min(7),
  items: z.array(
    z.object({
      productId: z.string().uuid(),
      quantityKg: z.number().positive(),
    })
  ).min(1),
});

const orderContactSchema = z.object({
  customerName: z.string().min(1),
  address: z.string().min(1),
  contactNumber: z.string().min(7),
  currentContactNumber: z.string().min(7),
});

function withOrderNumbers(orders) {
  const chronological = [...orders].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  const numberById = new Map(chronological.map((order, index) => [order.id, index + 1]));
  return orders.map((order) => ({
    ...order,
    orderNumber: numberById.get(order.id),
  }));
}

export async function createOrder(req, res) {
  const payload = orderSchema.parse(req.body);
  const order = await orderService.createOrder(payload);
  res.status(201).json(order);
}

export async function getOrders(req, res) {
  const orders = await orderService.getAll();
  res.json(withOrderNumbers(orders));
}

import { normalizePhilippineNumber, isValidPhilippineNumber } from '../utils/contactUtils.js';

export async function getOrdersByCustomer(req, res) {
  const rawContact = req.query.contactNumber;
  if (!rawContact) return res.status(400).json({ message: 'contactNumber query required' });
  const normalized = normalizePhilippineNumber(String(rawContact));
  if (!normalized) return res.status(400).json({ message: 'Please provide a valid Philippine contact number (e.g. 09171234567).' });
  const page = parseInt(req.query.page || '1', 10);
  const pageSize = parseInt(req.query.pageSize || '10', 10);
  const status = typeof req.query.status === 'string' ? req.query.status.toUpperCase() : undefined;
  const from = req.query.from || undefined;
  const to = req.query.to || undefined;
  const [{ orders, total }, allOrders] = await Promise.all([
    orderService.getByContact(normalized, { page, pageSize, status, from, to }),
    orderService.getAll(),
  ]);
  const numberById = new Map(withOrderNumbers(allOrders).map((order) => [order.id, order.orderNumber]));
  res.json({
    orders: orders.map((order) => ({ ...order, orderNumber: numberById.get(order.id) })),
    total,
    page,
    pageSize,
  });
}

export async function exportOrdersByCustomer(req, res) {
  const rawContact = req.query.contactNumber;
  if (!rawContact) return res.status(400).json({ message: 'contactNumber query required' });
  const normalized = normalizePhilippineNumber(String(rawContact));
  if (!normalized) return res.status(400).json({ message: 'Please provide a valid Philippine contact number (e.g. 09171234567).' });
  const status = typeof req.query.status === 'string' ? req.query.status.toUpperCase() : undefined;
  const from = req.query.from || undefined;
  const to = req.query.to || undefined;
  const { orders } = await orderService.getByContact(normalized, { page: 1, pageSize: 1000000, status, from, to });

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="orders_${normalized}.csv"`);

  const header = 'orderId,customerName,createdAt,status,address,total,items\n';
  res.write(header);
  for (const o of orders) {
    const itemsStr = o.items.map(i => `${(i.product?.name||i.productId)} (${i.quantityKg}kg @ ₱${Number(i.pricePerKg).toFixed(2)})`).join(' | ');
    const safeAddress = (o.address || '').replace(/"/g, '""');
    const safeName = (o.customerName || '').replace(/"/g, '""');
    const line = [o.id, `"${safeName}"`, new Date(o.createdAt).toISOString(), o.status, `"${safeAddress}"`, Number(o.totalAmount).toFixed(2), `"${itemsStr.replace(/"/g,'""')}"`].join(',') + '\n';
    res.write(line);
  }
  res.end();
}

export async function getBuyers(req, res) {
  const orders = await orderService.getAll();
  res.json(aggregateBuyers(orders));
}

export async function getProductPurchaseSummary(req, res) {
  const orders = await orderService.getAll();
  res.json(aggregateProductPurchaseSummary(orders));
}

export async function getPublicBuyers(req, res) {
  const orders = await orderService.getAll();
  const buyers = aggregateBuyers(orders).map(({ customerName, orderCount, totalKg, totalPurchases, productNames }) => ({
    customerName,
    orderCount,
    totalKg,
    totalPurchases,
    productNames,
  }));
  res.json(buyers);
}

export async function getOrderById(req, res) {
  const order = await orderService.getById(req.params.id);
  if (!order) return res.status(404).json({ message: 'Order not found' });
  res.json(order);
}

export async function getCustomerOrderById(req, res) {
  const rawContact = req.query.contactNumber;
  const normalized = normalizePhilippineNumber(String(rawContact || ''));
  if (!normalized) return res.status(400).json({ message: 'Please provide a valid Philippine contact number (e.g. 09171234567).' });
  const order = await orderService.getById(req.params.id);
  if (!order) return res.status(404).json({ message: 'Order not found' });
  if (order.contactNumber !== normalized) {
    return res.status(403).json({ message: 'Unauthorized: You are not authorized to view this order.' });
  }
  const allOrders = await orderService.getAll();
  res.json({ ...order, orderNumber: withOrderNumbers(allOrders).find((item) => item.id === order.id)?.orderNumber });
}

export async function updateOrderStatus(req, res) {
  const status = z.string().min(1).parse(req.body.status);
  try {
    const order = await orderService.updateStatus(req.params.id, status, req.admin?.adminId);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    emitOrderStatusChange(order);
    res.json(order);
  } catch (err) {
    if (err.message?.startsWith('Invalid status transition')) return res.status(400).json({ message: err.message });
    throw err;
  }
}

export async function editCustomerOrder(req, res) {
  const payload = orderContactSchema.parse(req.body);
  const currentNormalized = normalizePhilippineNumber(String(payload.currentContactNumber || ''));
  const newNormalized = normalizePhilippineNumber(String(payload.contactNumber || ''));
  if (!currentNormalized || !newNormalized) return res.status(400).json({ message: 'Please provide valid Philippine contact numbers.' });
  const order = await orderService.getById(req.params.id);
  if (!order) return res.status(404).json({ message: 'Order not found' });
  if (order.contactNumber !== currentNormalized) {
    return res.status(403).json({ message: 'Unauthorized: You are not authorized to edit this order.' });
  }
  const updatedOrder = await orderService.editOrder(req.params.id, currentNormalized, {
    customerName: payload.customerName,
    address: payload.address,
    contactNumber: newNormalized,
  });
  res.json(updatedOrder);
}

export async function cancelCustomerOrder(req, res) {
  const raw = req.body.contactNumber;
  const normalized = normalizePhilippineNumber(String(raw || ''));
  if (!normalized) return res.status(400).json({ message: 'Please provide a valid Philippine contact number (e.g. 09171234567).' });
  const order = await orderService.getById(req.params.id);
  if (!order) return res.status(404).json({ message: 'Order not found' });
  if (order.contactNumber !== normalized) {
    return res.status(403).json({ message: 'Unauthorized: You are not authorized to cancel this order.' });
  }
  res.json(await orderService.cancelOrder(req.params.id, normalized));
}

export async function cancelAdminOrder(req, res) {
  res.json(await orderService.cancelOrder(req.params.id, undefined, req.admin?.adminId));
}

export async function restoreAdminOrder(req, res) {
  const result = await orderService.restoreOrder(req.params.id, req.admin?.adminId);
  if (!result.count) return res.status(409).json({ message: 'Only cancelled orders can be restored' });
  const order = await orderService.getById(req.params.id);
  res.json(order);
}

export async function deleteAdminOrder(req, res) {
  const order = await orderService.getById(req.params.id);
  if (!order) return res.status(404).json({ message: 'Order not found' });
  if (!['COMPLETED', 'CANCELLED'].includes(order.status)) {
    return res.status(409).json({ message: 'Only completed or cancelled orders can be permanently deleted' });
  }
  await orderService.deletePermanently(req.params.id);
  res.status(204).end();
}

export async function deleteCustomerOrder(req, res) {
  const raw = req.body.contactNumber;
  const normalized = normalizePhilippineNumber(String(raw || ''));
  if (!normalized) return res.status(400).json({ message: 'Please provide a valid Philippine contact number (e.g. 09171234567).' });
  
  const order = await orderService.getById(req.params.id);
  if (!order) return res.status(404).json({ message: 'Order not found' });
  if (order.contactNumber !== normalized) {
    return res.status(403).json({ message: 'Unauthorized: You are not authorized to delete this order.' });
  }
  if (!['CANCELLED', 'COMPLETED'].includes(order.status)) {
    return res.status(409).json({ message: 'Only cancelled or completed orders can be permanently deleted' });
  }
  
  await orderService.deletePermanently(req.params.id);
  res.status(204).end();
}

export async function restoreCustomerOrder(req, res) {
  const raw = req.body.contactNumber;
  const normalized = normalizePhilippineNumber(String(raw || ''));
  if (!normalized) return res.status(400).json({ message: 'Please provide a valid Philippine contact number (e.g. 09171234567).' });
  
  const order = await orderService.getById(req.params.id);
  if (!order) return res.status(404).json({ message: 'Order not found' });
  if (order.contactNumber !== normalized) {
    return res.status(403).json({ message: 'Unauthorized: You are not authorized to restore this order.' });
  }
  
  const result = await orderService.restoreOrder(req.params.id);
  if (!result.count) return res.status(409).json({ message: 'Only cancelled orders can be restored' });
  const restoredOrder = await orderService.getById(req.params.id);
  res.json(restoredOrder);
}
