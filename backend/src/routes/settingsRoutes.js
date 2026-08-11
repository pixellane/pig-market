import express from 'express';
import { getStoreSettings, updateStoreSettings } from '../controllers/settingsController.js';
import { protectAdmin } from '../middleware/authMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

router.get('/', asyncHandler(getStoreSettings));
router.put('/', protectAdmin, asyncHandler(updateStoreSettings));

export default router;
