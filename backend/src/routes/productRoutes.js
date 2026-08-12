import express from 'express';
import multer from 'multer';
import { getProducts, getFeaturedProduct, getProductById, createProduct, updateProduct, deleteProduct, generateDescription, uploadProductImage, regenerateDescriptions, restockProduct, getInventoryHistory, getProductBuyers } from '../controllers/productController.js';
import { protectAdmin } from '../middleware/authMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error('Invalid file type. Only JPG, JPEG, and PNG are allowed.'));
  },
});

router.get('/', asyncHandler(getProducts));
router.get('/featured', asyncHandler(getFeaturedProduct));
router.get('/:id', asyncHandler(getProductById));
router.get('/:id/buyers', protectAdmin, asyncHandler(getProductBuyers));
router.post('/generate-description', protectAdmin, asyncHandler(generateDescription));
router.post('/regenerate-descriptions', protectAdmin, asyncHandler(regenerateDescriptions));
router.post('/:id/restock', protectAdmin, asyncHandler(restockProduct));
router.get('/:id/inventory-history', protectAdmin, asyncHandler(getInventoryHistory));
router.post('/', protectAdmin, asyncHandler(createProduct));
router.put('/:id', protectAdmin, asyncHandler(updateProduct));
router.delete('/:id', protectAdmin, asyncHandler(deleteProduct));
router.post('/:id/image', protectAdmin, upload.single('image'), asyncHandler(uploadProductImage));

export default router;
