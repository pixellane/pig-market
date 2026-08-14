import prisma from '../utils/prismaClient.js';

let resetInProgress = false;

export async function resetAllData(req, res) {
  const { confirmation } = req.body || {};
  if (confirmation !== 'RESET ALL DATA') {
    return res.status(400).json({ message: 'Missing or invalid confirmation text.' });
  }

  if (resetInProgress) return res.status(409).json({ message: 'Reset already in progress.' });
  resetInProgress = true;

  try {
    // Perform a single transaction that deletes transactional data.
    const result = await prisma.$transaction(async (tx) => {
      const orderItems = await tx.orderItem.deleteMany({});
      const statusHistory = await tx.orderStatusHistory.deleteMany({});
      // Only delete inventory history entries that are tied to orders. Preserve restocks/manual updates.
      const inventoryHistory = await tx.inventoryHistory.deleteMany({ where: { orderId: { not: null } } });
      const orders = await tx.order.deleteMany({});

      return {
        orderItems: orderItems.count ?? orderItems,
        orderStatusHistory: statusHistory.count ?? statusHistory,
        inventoryHistory: inventoryHistory.count ?? inventoryHistory,
        orders: orders.count ?? orders,
      };
    });

    resetInProgress = false;
    return res.json({ message: 'Reset completed successfully.', summary: result });
  } catch (err) {
    resetInProgress = false;
    console.error('[adminController] resetAllData failed:', err && err.message ? err.message : String(err));
    return res.status(500).json({ message: 'Reset failed. No changes were applied.' });
  }
}

export default { resetAllData };
