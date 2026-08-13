import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import prisma from '../utils/prismaClient.js';
import { productRepository } from '../repositories/productRepository.js';
import { generateProductDescription } from '../utils/productDescription.js';
import { emitStockUpdate } from '../realtime/inventoryRealtime.js';
import { emitProductCreate, emitProductUpdate, emitProductDelete } from '../realtime/adminRealtime.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolveProductUploadsDir() {
  const candidates = [
    path.resolve(process.cwd(), 'uploads', 'products'),
    path.resolve(process.cwd(), 'backend', 'uploads', 'products'),
    path.join(__dirname, '../../uploads/products'),
  ];

  for (const candidate of candidates) {
    try {
      fs.mkdirSync(candidate, { recursive: true });
      return candidate;
    } catch (error) {
      // Ignore invalid candidates and keep searching.
    }
  }

  return path.resolve(process.cwd(), 'uploads', 'products');
}

function toStockNumber(value) {
  if (value == null) return 0;
  if (typeof value === 'object' && typeof value.toNumber === 'function') return value.toNumber();
  return Number(value);
}

export const productService = {
  findAll: async () => productRepository.findMany(),
  findById: async (id) => productRepository.findById(id),
  create: async (data, adminId) => {
    const product = await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({ data });
      const initialStock = Number(data.stockKg || 0);
      if (initialStock > 0) {
        await tx.inventoryHistory.create({
          data: {
            productId: product.id,
            changeKg: initialStock,
            previousStockKg: 0,
            newStockKg: product.stockKg,
            reason: 'PRODUCT_CREATED',
            adminId,
          },
        });
      }
      return product;
    });
    emitStockUpdate(product.id, toStockNumber(product.stockKg));
    return product;
  },
  update: async (id, data, adminId) => {
    const product = await prisma.$transaction(async (tx) => {
      const previous = await tx.product.findUnique({ where: { id } });
      if (!previous) return null;
      const product = await tx.product.update({ where: { id }, data });
      if (data.stockKg !== undefined && Number(product.stockKg) !== Number(previous.stockKg)) {
        const changeKg = Number(product.stockKg) - Number(previous.stockKg);
        await tx.inventoryHistory.create({
          data: {
            productId: id,
            changeKg,
            previousStockKg: previous.stockKg,
            newStockKg: product.stockKg,
            reason: 'MANUAL_STOCK_UPDATE',
            adminId,
          },
        });
      }
      return product;
    });
    if (product && data.stockKg !== undefined) {
      emitStockUpdate(product.id, toStockNumber(product.stockKg));
    }
    return product;
  },
  restock: async (id, quantityKg, adminId) => {
    const product = await prisma.$transaction(async (tx) => {
      const previous = await tx.product.findUnique({ where: { id } });
      if (!previous) return null;
      const product = await tx.product.update({ where: { id }, data: { stockKg: { increment: quantityKg } } });
      await tx.inventoryHistory.create({
        data: {
          productId: id,
          changeKg: quantityKg,
          previousStockKg: previous.stockKg,
          newStockKg: product.stockKg,
          reason: 'RESTOCK',
          adminId,
        },
      });
      return product;
    });
    if (product) emitStockUpdate(product.id, toStockNumber(product.stockKg));
    return product;
  },
  getInventoryHistory: async (id) => prisma.inventoryHistory.findMany({
    where: { productId: id },
    include: { product: true, order: true },
    orderBy: { createdAt: 'desc' },
  }),
  getFeaturedProduct: async () => {
    const [topSale] = await prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        order: { status: { not: 'CANCELLED' } },
        product: { isActive: true },
      },
      _sum: { quantityKg: true },
      orderBy: { _sum: { quantityKg: 'desc' } },
      take: 1,
    });

    if (topSale?.productId) {
      const product = await prisma.product.findUnique({ where: { id: topSale.productId } });
      if (product) return product;
    }

    const bellyProduct = await prisma.product.findFirst({
      where: { isActive: true, name: { contains: 'belly', mode: 'insensitive' } },
      orderBy: { createdAt: 'asc' },
    });
    if (bellyProduct) return bellyProduct;

    return prisma.product.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    });
  },
  delete: async (id) => productRepository.deactivate(id),
  uploadImage: async (id, file) => {
    const existing = await productRepository.findById(id);
    if (!existing) return null;

    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const filename = `${id}-${Date.now()}${ext}`;
    const uploadsDir = resolveProductUploadsDir();

    await fs.promises.mkdir(uploadsDir, { recursive: true });

    const filePath = path.join(uploadsDir, filename);
    await fs.promises.writeFile(filePath, file.buffer);

    const imageUrl = `/uploads/products/${filename}`;
    return productRepository.update(id, { imageUrl });
  },
  regenerateDescriptions: async (ids) => {
    const products = ids && ids.length
      ? await Promise.all(ids.map((id) => productRepository.findById(id)))
      : await productRepository.findMany();
    const toUpdate = products.filter(Boolean);
    const updated = [];
    for (const p of toUpdate) {
      const description = generateProductDescription(p.name);
      const prod = await productRepository.update(p.id, { description });
      updated.push(prod);
    }
    return updated;
  },
};
