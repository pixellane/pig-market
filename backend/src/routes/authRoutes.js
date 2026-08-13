import express from 'express';
import { login } from '../controllers/authController.js';
import { loginRateLimiter } from '../middleware/rateLimit.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

router.post('/login', loginRateLimiter, asyncHandler(login));

export default router;
