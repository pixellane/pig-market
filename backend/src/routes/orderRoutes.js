import express from 'express';
import { createOrder, getOrders, getOrderById, getCustomerOrderById, getBuyers, getProductPurchaseSummary, getPublicBuyers, updateOrderStatus, getOrdersByCustomer, exportOrdersByCustomer, editCustomerOrder, cancelCustomerOrder, cancelAdminOrder, restoreAdminOrder, deleteAdminOrder, deleteCustomerOrder, restoreCustomerOrder } from '../controllers/orderController.js';
import { protectAdmin } from '../middleware/authMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

router.post('/', asyncHandler(createOrder));
router.get('/mine/export', asyncHandler(exportOrdersByCustomer));
router.get('/mine', asyncHandler(getOrdersByCustomer));
router.get('/mine/:id', asyncHandler(getCustomerOrderById));
router.put('/mine/:id', asyncHandler(editCustomerOrder));
router.post('/mine/:id/cancel', asyncHandler(cancelCustomerOrder));
router.delete('/mine/:id', asyncHandler(deleteCustomerOrder));
router.put('/mine/:id/restore', asyncHandler(restoreCustomerOrder));
router.get('/', protectAdmin, asyncHandler(getOrders));
router.get('/buyers/public', asyncHandler(getPublicBuyers));
router.get('/buyers', protectAdmin, asyncHandler(getBuyers));
router.get('/product-summary', protectAdmin, asyncHandler(getProductPurchaseSummary));
router.get('/:id', protectAdmin, asyncHandler(getOrderById));
router.put('/:id/status', protectAdmin, asyncHandler(updateOrderStatus));
router.post('/:id/cancel', protectAdmin, asyncHandler(cancelAdminOrder));
router.put('/:id/restore', protectAdmin, asyncHandler(restoreAdminOrder));
router.delete('/:id', protectAdmin, asyncHandler(deleteAdminOrder));

export default router;
