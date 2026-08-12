export function aggregateBuyers(orders) {
  const byContact = new Map();

  for (const order of orders) {
    // Skip cancelled orders
    if (order.status === 'CANCELLED') continue;
    
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
        productsPurchased: new Map(), // Track quantity per product
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
      if (productName) {
        buyer.productNames.add(productName);
        
        // Track quantity per product
        const currentQty = buyer.productsPurchased.get(productName) || 0;
        buyer.productsPurchased.set(productName, currentQty + Number(item.quantityKg));
      }
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
      productsPurchased: Object.fromEntries(
        Array.from(buyer.productsPurchased.entries()).map(([name, qty]) => [
          name,
          Number(qty.toFixed(1))
        ])
      ),
    }))
    .sort((a, b) => b.totalPurchases - a.totalPurchases);
}

export function aggregateProductPurchaseSummary(orders) {
  const productMap = new Map();

  for (const order of orders) {
    // Skip cancelled orders
    if (order.status === 'CANCELLED') continue;

    const contactKey = String(order.contactNumber || '').trim();
    if (!contactKey) continue;

    for (const item of order.items || []) {
      const productId = item.productId;
      const productName = item.product?.name;
      
      if (!productId || !productName) continue;

      // Get or create product entry
      let product = productMap.get(productId);
      if (!product) {
        product = {
          productId,
          productName,
          totalOrders: 0,
          orderIds: new Set(),
          totalKgSold: 0,
          totalSales: 0,
          buyerMap: new Map(),
        };
        productMap.set(productId, product);
      }

      // Track this order for total order count
      if (!product.orderIds.has(order.id)) {
        product.orderIds.add(order.id);
        product.totalOrders += 1;
      }

      // Add to product totals
      product.totalKgSold += Number(item.quantityKg);
      product.totalSales += Number(item.subtotal);

      // Get or create buyer entry for this product
      let buyer = product.buyerMap.get(contactKey);
      if (!buyer) {
        buyer = {
          customerName: order.customerName || 'Unknown Customer',
          contactNumber: contactKey,
          orderCount: 0,
          orderIds: new Set(),
          totalKg: 0,
          totalAmount: 0,
        };
        product.buyerMap.set(contactKey, buyer);
      }

      // Update buyer info (use most recent name)
      if (order.customerName) {
        buyer.customerName = order.customerName;
      }

      // Track orders for this buyer+product combination
      if (!buyer.orderIds.has(order.id)) {
        buyer.orderIds.add(order.id);
        buyer.orderCount += 1;
      }

      // Add to buyer totals for this product
      buyer.totalKg += Number(item.quantityKg);
      buyer.totalAmount += Number(item.subtotal);
    }
  }

  // Convert to final format and sort
  return Array.from(productMap.values())
    .map(product => ({
      productId: product.productId,
      productName: product.productName,
      totalBuyers: product.buyerMap.size,
      totalOrders: product.totalOrders,
      totalKgSold: Number(product.totalKgSold.toFixed(2)),
      totalSales: Number(product.totalSales.toFixed(2)),
      buyers: Array.from(product.buyerMap.values())
        .map(buyer => ({
          customerName: buyer.customerName,
          contactNumber: buyer.contactNumber,
          orderCount: buyer.orderCount,
          totalKg: Number(buyer.totalKg.toFixed(2)),
          totalAmount: Number(buyer.totalAmount.toFixed(2)),
        }))
        .sort((a, b) => b.totalAmount - a.totalAmount), // Sort buyers by amount spent on this product
    }))
    .sort((a, b) => b.totalSales - a.totalSales); // Sort products by total sales
}

export function aggregateProductBuyers(productId, orders) {
  const byContact = new Map();
  const orderSet = new Set(); // Track unique orders containing this product
  let totalKgSold = 0;
  let totalSales = 0;

  for (const order of orders) {
    // Skip cancelled orders
    if (order.status === 'CANCELLED') continue;

    const key = String(order.contactNumber || '').trim();
    if (!key) continue;

    // Find items for this specific product in this order
    const productItems = (order.items || []).filter(item => item.productId === productId);
    if (!productItems.length) continue;

    // Track this order as containing the product
    orderSet.add(order.id);

    let buyer = byContact.get(key);
    if (!buyer) {
      buyer = {
        contactNumber: key,
        customerName: order.customerName,
        totalKg: 0,
        totalAmount: 0,
      };
      byContact.set(key, buyer);
    }

    // Use the most recent customer name for this contact
    if (order.customerName) {
      buyer.customerName = order.customerName;
    }

    // Sum quantities and amounts for this product in this order
    for (const item of productItems) {
      const itemKg = Number(item.quantityKg);
      const itemAmount = Number(item.subtotal);
      
      buyer.totalKg += itemKg;
      buyer.totalAmount += itemAmount;
      totalKgSold += itemKg;
      totalSales += itemAmount;
    }
  }

  const buyers = Array.from(byContact.values())
    .map((buyer) => ({
      contactNumber: buyer.contactNumber,
      customerName: buyer.customerName || 'Unknown Customer',
      totalKg: Number(buyer.totalKg.toFixed(2)),
      totalAmount: Number(buyer.totalAmount.toFixed(2)),
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount);

  return {
    buyers,
    totalBuyers: buyers.length,
    totalOrders: orderSet.size, // Number of unique orders containing this product
    totalKgSold: Number(totalKgSold.toFixed(2)),
    totalSales: Number(totalSales.toFixed(2)),
  };
}
