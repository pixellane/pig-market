import express from 'express';
import { login } from '../controllers/authController.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

router.post('/login', asyncHandler(login));

export default router;
