import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const orderRepository = {
  create: async (data) => prisma.order.create(data),
  findAll: async () => prisma.order.findMany({ include: { items: true }, orderBy: { createdAt: 'desc' } }),
  findById: async (id) => prisma.order.findUnique({ where: { id }, include: { items: true } }),
  updateStatus: async (id, status) => prisma.order.update({ where: { id }, data: { status } }),
};
