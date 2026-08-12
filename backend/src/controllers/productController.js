import { z } from 'zod';
import { productService } from '../services/productService.js';
import { generateProductDescription } from '../utils/productDescription.js';
import { orderService } from '../services/orderService.js';
import { aggregateProductBuyers } from '../utils/buyerStats.js';

const imagePath = z.string().regex(/^\/(images|uploads)\/[-A-Za-z0-9_./]+$/);
const booleanFromForm = z.preprocess((value) => {
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === '1' || value === 1) return true;
  if (value === 'false' || value === '0' || value === 0) return false;
  return value;
}, z.boolean());
const productSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  pricePerKg: z.coerce.number().positive(),
  stockKg: z.coerce.number().min(0),
  isActive: booleanFromForm.optional(),
  imageUrl: z.union([imagePath, z.string().url(), z.literal('')]).optional(),
});

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

export async function getProducts(req, res) {
  const products = await productService.findAll();
  res.json(products);
}

export async function getProductById(req, res) {
  const product = await productService.findById(req.params.id);
  if (!product) return res.status(404).json({ message: 'Product not found' });
  res.json(product);
}

export async function getFeaturedProduct(req, res) {
  const product = await productService.getFeaturedProduct();
  // Return 200 with null when no featured product found to avoid 404 responses
  // Frontends can handle a null payload and fall back to a sensible UI.
  res.json(product || null);
}

export async function createProduct(req, res) {
  const payload = productSchema.parse(req.body);
  payload.name = payload.name.trim();
  if (payload.description) payload.description = payload.description.trim();
  if (!payload.description) {
    payload.description = generateProductDescription(payload.name);
  }
  const product = await productService.create({
    ...payload,
    imageUrl: payload.imageUrl || '',
  }, req.admin?.adminId);
  res.status(201).json(product);
}

export async function updateProduct(req, res) {
  const payload = productSchema.partial().parse(req.body);
  if (payload.name) payload.name = payload.name.trim();
  if (payload.description) payload.description = payload.description.trim();
  // stockKg: 0 is valid and must be persisted — never drop it via a partial fallback
  const product = await productService.update(req.params.id, payload, req.admin?.adminId);
  if (!product) return res.status(404).json({ message: 'Product not found' });
  return res.json(product);
}

export async function deleteProduct(req, res) {
  await productService.delete(req.params.id);
  res.status(204).end();
}

export async function generateDescription(req, res) {
  const payload = z.object({ name: z.string().min(1) }).parse(req.body);
  res.json({ description: generateProductDescription(payload.name) });
}

export async function uploadProductImage(req, res) {
  if (!req.file) {
    return res.status(400).json({ message: 'Image file is required' });
  }

  if (!ALLOWED_MIME_TYPES.includes(req.file.mimetype)) {
    return res.status(400).json({ message: 'Invalid file type. Only JPG, JPEG, and PNG are allowed.' });
  }

  if (req.file.size > MAX_IMAGE_SIZE) {
    return res.status(400).json({ message: 'File size exceeds the limit of 5MB.' });
  }

  const product = await productService.uploadImage(req.params.id, req.file);
  if (!product) {
    return res.status(404).json({ message: 'Product not found' });
  }
  return res.status(200).json({ product, message: 'Image uploaded successfully' });
}

export async function regenerateDescriptions(req, res) {
  const payload = z.object({ ids: z.array(z.string().uuid()).optional() }).parse(req.body);
  const updated = await productService.regenerateDescriptions(payload.ids);
  res.json({ updatedCount: updated.length, products: updated });
}

export async function restockProduct(req, res) {
  const payload = z.object({ quantityKg: z.number().positive() }).parse(req.body);
  const product = await productService.restock(req.params.id, payload.quantityKg, req.admin?.adminId);
  if (!product) return res.status(404).json({ message: 'Product not found' });
  res.json(product);
}

export async function getInventoryHistory(req, res) {
  const product = await productService.findById(req.params.id);
  if (!product) return res.status(404).json({ message: 'Product not found' });
  res.json(await productService.getInventoryHistory(req.params.id));
}

export async function getProductBuyers(req, res) {
  const product = await productService.findById(req.params.id);
  if (!product) return res.status(404).json({ message: 'Product not found' });
  
  const orders = await orderService.getAll();
  const buyerData = aggregateProductBuyers(req.params.id, orders);
  
  res.json({
    product: {
      id: product.id,
      name: product.name,
    },
    ...buyerData,
  });
}
