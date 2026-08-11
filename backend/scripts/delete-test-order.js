import { orderService } from '../src/services/orderService.js';
import prisma from '../src/utils/prismaClient.js';

const TEST_ORDER_ID = 'bf4fe5ff-f2cd-45f4-8a8a-246c6f218666';

async function main() {
  try {
    const order = await orderService.getById(TEST_ORDER_ID);
    if (!order) {
      console.log('Test order not found — nothing to delete.');
      process.exit(0);
    }
    console.log('Found order:', { id: order.id, customerName: order.customerName, contactNumber: order.contactNumber, status: order.status });
    if (order.customerName !== 'Test Buyer') {
      console.log('Order does not match expected test order customerName. Aborting to avoid accidental deletion.');
      process.exit(1);
    }

    // If order is not cancelled, cancel it to restore stock
    if (order.status !== 'CANCELLED') {
      console.log('Cancelling order to restore inventory...');
      await orderService.cancelOrder(TEST_ORDER_ID, undefined, 'script-admin');
      console.log('Cancelled');
    }

    // Delete permanently
    console.log('Deleting order permanently...');
    await orderService.deletePermanently(TEST_ORDER_ID);
    console.log('Deleted order', TEST_ORDER_ID);

    process.exit(0);
  } catch (err) {
    console.error('Error deleting test order:', err);
    process.exit(2);
  }
}

main();
