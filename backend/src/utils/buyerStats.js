export function aggregateBuyers(orders) {
  const byContact = new Map();

  for (const order of orders) {
    const key = String(order.contactNumber || '').trim();
    if (!key) continue;

    let buyer = byContact.get(key);
    if (!buyer) {
      buyer = {
        contactNumber: key,
        customerName: order.customerName,
        address: order.address,
        orderCount: 0,
        totalKg: 0,
        totalPurchases: 0,
        productNames: new Set(),
      };
      byContact.set(key, buyer);
    }

    if (order.customerName && (!buyer.customerName || buyer.orderCount === 0)) {
      buyer.customerName = order.customerName;
    }
    if (order.address && buyer.orderCount === 0) {
      buyer.address = order.address;
    }

    buyer.orderCount += 1;
    buyer.totalPurchases += Number(order.totalAmount);

    for (const item of order.items || []) {
      buyer.totalKg += Number(item.quantityKg);
      const productName = item.product?.name;
      if (productName) buyer.productNames.add(productName);
    }
  }

  return Array.from(byContact.values())
    .map((buyer) => ({
      contactNumber: buyer.contactNumber,
      customerName: buyer.customerName,
      address: buyer.address,
      orderCount: buyer.orderCount,
      totalKg: Number(buyer.totalKg.toFixed(2)),
      totalPurchases: Number(buyer.totalPurchases.toFixed(2)),
      productNames: Array.from(buyer.productNames),
    }))
    .sort((a, b) => b.totalPurchases - a.totalPurchases);
}
