import prisma from '../utils/prismaClient.js';

export const productRepository = {
  findMany: async () => prisma.product.findMany({ where: { isActive: true } }),
  findById: async (id) => prisma.product.findUnique({ where: { id } }),
  create: async (data) => prisma.product.create({ data }),
  update: async (id, data) => prisma.product.update({ where: { id }, data }),
  deactivate: async (id) => prisma.product.update({ where: { id }, data: { isActive: false } }),
};
