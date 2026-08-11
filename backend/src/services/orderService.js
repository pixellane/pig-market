import prisma from '../utils/prismaClient.js';
import { Prisma } from '@prisma/client';
import { emitStockUpdates } from '../realtime/inventoryRealtime.js';

function toStockNumber(value) {
  if (value == null) return 0;
  if (typeof value === 'object' && typeof value.toNumber === 'function') return value.toNumber();
  return Number(value);
}

/** Lock product rows so concurrent checkouts see committed stock (prevents oversell). */
async function lockProductsForUpdate(tx, productIds) {
  const ids = [...new Set(productIds.filter(Boolean))].sort();
  if (!ids.length) return;
  await tx.$queryRaw`
    SELECT id FROM "Product"
    WHERE id IN (${Prisma.join(ids)})
    FOR UPDATE
  `;
}

export const orderService = {
  createOrder: async ({ customerName, address, contactNumber, items }) => {
    const { order, stockUpdates } = await prisma.$transaction(async (tx) => {
      const productIds = items.map((item) => item.productId);
      await lockProductsForUpdate(tx, productIds);

      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
      });

      if (products.length !== items.length) {
        throw new Error('One or more products not found');
      }

      const orderItems = items.map((item) => {
        const product = products.find((product) => product.id === item.productId);
        const quantityKg = item.quantityKg;
        if (product.stockKg.toNumber() < quantityKg) {
          throw new Error(`Insufficient stock for ${product.name}`);
        }
        const pricePerKg = product.pricePerKg;
        const subtotal = pricePerKg.mul(quantityKg);
        return {
          productId: item.productId,
          quantityKg,
          pricePerKg,
          subtotal,
        };
      });

      const totalAmount = orderItems.reduce((sum, item) => sum.add(item.subtotal), new Prisma.Decimal(0));

      const order = await tx.order.create({
        data: {
          customerName,
          address,
          contactNumber,
          totalAmount,
          items: {
            create: orderItems,
          },
        },
        include: { items: true },
      });
      await tx.orderStatusHistory.create({ data: { orderId: order.id, status: 'PENDING' } });

      const stockUpdates = [];
      for (const item of items) {
        const product = products.find((product) => product.id === item.productId);
        const newStockKg = product.stockKg.sub(item.quantityKg);
        await tx.product.update({
          where: { id: item.productId },
          data: { stockKg: newStockKg },
        });
        await tx.inventoryHistory.create({
          data: {
            productId: item.productId,
            orderId: order.id,
            changeKg: new Prisma.Decimal(item.quantityKg).neg(),
            previousStockKg: product.stockKg,
            newStockKg,
            reason: 'ORDER',
          },
        });
        stockUpdates.push({ productId: item.productId, stockKg: toStockNumber(newStockKg) });
      }

      return { order, stockUpdates };
    });

    emitStockUpdates(stockUpdates);
    return order;
  },

  getAll: async () => prisma.order.findMany({ include: { items: { include: { product: true } } }, orderBy: { createdAt: 'desc' } }),
  getById: async (id) => prisma.order.findUnique({ where: { id }, include: { items: { include: { product: true } }, statusHistory: { orderBy: { createdAt: 'asc' } } } }),
  updateStatus: async (id, status, adminId) => prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id } });
    if (!order) return null;
    const transitions = {
      PENDING: ['CONFIRMED'],
      CONFIRMED: ['PROCESSING'],
      PROCESSING: ['OUT_FOR_DELIVERY'],
      OUT_FOR_DELIVERY: ['DELIVERED'],
      DELIVERED: ['COMPLETED'],
      COMPLETED: [],
      CANCELLED: [],
    };
    if (status === order.status) return order;
    if (!transitions[order.status]?.includes(status)) throw new Error(`Invalid status transition from ${order.status} to ${status}`);
    const updated = await tx.order.update({ where: { id }, data: { status } });
    await tx.orderStatusHistory.create({ data: { orderId: id, status, adminId } });
    return updated;
  }),
  restoreOrder: async (id, adminId) => {
    const { result, stockUpdates } = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id },
        include: { items: true },
      });
      if (!order || order.status !== 'CANCELLED') {
        return { result: { count: 0 }, stockUpdates: [] };
      }

      const productIds = order.items.map((item) => item.productId);
      await lockProductsForUpdate(tx, productIds);

      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
      });

      for (const item of order.items) {
        const product = products.find((p) => p.id === item.productId);
        if (!product || product.stockKg.lt(item.quantityKg)) {
          throw new Error(`Insufficient stock for ${product ? product.name : 'Unknown Product'}`);
        }
      }

      const result = await tx.order.updateMany({
        where: { id, status: 'CANCELLED' },
        data: { status: 'PENDING' },
      });

      if (result.count === 0) {
        return { result: { count: 0 }, stockUpdates: [] };
      }

      await tx.orderStatusHistory.create({
        data: { orderId: id, status: 'PENDING', adminId },
      });

      const stockUpdates = [];
      for (const item of order.items) {
        const product = products.find((p) => p.id === item.productId);
        const newStockKg = product.stockKg.sub(item.quantityKg);
        await tx.product.update({
          where: { id: item.productId },
          data: { stockKg: newStockKg },
        });
        await tx.inventoryHistory.create({
          data: {
            productId: item.productId,
            orderId: order.id,
            changeKg: item.quantityKg.neg(),
            previousStockKg: product.stockKg,
            newStockKg,
            reason: 'RESTORE_ORDER',
            adminId,
          },
        });
        stockUpdates.push({ productId: item.productId, stockKg: toStockNumber(newStockKg) });
      }

      return { result, stockUpdates };
    });

    emitStockUpdates(stockUpdates);
    return result;
  },
  deletePermanently: async (id) => prisma.$transaction(async (tx) => {
    await tx.orderItem.deleteMany({ where: { orderId: id } });
    return tx.order.delete({ where: { id } });
  }),
  editOrder: async (id, contactNumber, data) => {
    const order = await prisma.order.findFirst({ where: { id, contactNumber } });
    if (!order) throw new Error('Order not found');
    if (!['PENDING', 'CONFIRMED'].includes(order.status)) {
      throw new Error('Order can no longer be edited');
    }
    return prisma.order.update({ where: { id }, data });
  },
  cancelOrder: async (id, contactNumber, adminId) => {
    const { order, stockUpdates } = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id, ...(contactNumber ? { contactNumber } : {}) },
        include: { items: true },
      });
      if (!order) throw new Error('Order not found');
      if (order.status === 'CANCELLED') return { order, stockUpdates: [] };
      if (contactNumber && !['PENDING', 'CONFIRMED'].includes(order.status)) {
        throw new Error('Order can no longer be cancelled');
      }
      if (order.status === 'DELIVERED') throw new Error('Delivered orders cannot be cancelled');

      // The conditional transition is the idempotency guard: stock is restored only once.
      const transition = await tx.order.updateMany({
        where: { id, status: { not: 'CANCELLED' } },
        data: { status: 'CANCELLED' },
      });
      if (transition.count === 0) return { order, stockUpdates: [] };
      await tx.orderStatusHistory.create({ data: { orderId: id, status: 'CANCELLED', adminId } });

      const stockUpdates = [];
      for (const item of order.items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        const newStockKg = product.stockKg.add(item.quantityKg);
        await tx.product.update({
          where: { id: item.productId },
          data: { stockKg: { increment: item.quantityKg } },
        });
        await tx.inventoryHistory.create({
          data: {
            productId: item.productId,
            orderId: order.id,
            changeKg: item.quantityKg,
            previousStockKg: product.stockKg,
            newStockKg,
            reason: 'CANCELLED_ORDER',
          },
        });
        stockUpdates.push({ productId: item.productId, stockKg: toStockNumber(newStockKg) });
      }
      const cancelled = await tx.order.findUnique({
        where: { id },
        include: { items: { include: { product: true } }, statusHistory: { orderBy: { createdAt: 'asc' } } },
      });
      return { order: cancelled, stockUpdates };
    });

    emitStockUpdates(stockUpdates);
    return order;
  },
  getByContact: async (contactNumber, { page = 1, pageSize = 10, status, from, to } = {}) => {
    const where = { contactNumber };
    if (status) where.status = status;
    if (from || to) where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(to);

    const skip = (page - 1) * pageSize;
    const [orders, total] = await Promise.all([
      prisma.order.findMany({ where, include: { items: { include: { product: true } } }, orderBy: { createdAt: 'desc' }, skip, take: pageSize }),
      prisma.order.count({ where }),
    ]);
    return { orders, total };
  },
};
