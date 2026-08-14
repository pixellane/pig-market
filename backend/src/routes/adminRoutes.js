import express from 'express';
import { resetAllData } from '../controllers/adminController.js';
import { protectAdmin } from '../middleware/authMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

// Destructive action: protected and requires explicit confirmation on the body.
router.post('/reset-all', protectAdmin, asyncHandler(resetAllData));

export default router;
